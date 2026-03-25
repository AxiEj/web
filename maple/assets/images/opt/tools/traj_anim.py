"""
traj_anim.py  —  MAPLE trajectory animator (ray-cast CPK renderer)
===================================================================
Produces an animated GIF from a MAPLE multi-frame XYZ trajectory using
a software ray-caster that exactly replicates VMD CPK rendering:

  • Atom spheres    : radius = 0.5 × VdW (VMD CPK default sphere scale)
  • Bond cylinders  : radius = 0.15 Å  (VMD CPK default bond radius)
  • Lighting        : Phong model — ambient + diffuse + specular highlight
  • Colors          : Jmol/CPK standard (from OpenBabel elementtable.h)
  • Bond detection  : per-frame, OpenBabel ConnectTheDots algorithm
                      bond if  0.4 Å < d < Rcov_i + Rcov_j + 0.45 Å
  • Background      : white (VMD presentation style)

Requires:  numpy  pillow

Usage:
    python traj_anim.py traj.xyz
    python traj_anim.py traj.xyz --fps 10 --every 2 --out movie.gif
    python traj_anim.py traj.xyz --width 600 --height 600
"""

import argparse
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ── Element data ──────────────────────────────────────────────────────────────
# (hex_color, vdw_radius_Å, cov_radius_Å)
# Colors: Jmol CPK standard (OpenBabel elementtable.h / Blue Obelisk)
# VdW:    Bondi 1964 (same as VMD)
# Cov:    Cordero 2008 doi:10.1039/b801115j

_ELEM = {
    "H" : ("#FFFFFF", 1.10, 0.31),
    "HE": ("#D9FFFF", 1.40, 0.28),
    "LI": ("#CC80FF", 1.82, 1.28),
    "BE": ("#C2FF00", 1.53, 0.96),
    "B" : ("#FFB5B5", 1.92, 0.84),
    "C" : ("#909090", 1.70, 0.76),
    "N" : ("#3050F8", 1.55, 0.71),
    "O" : ("#FF0D0D", 1.52, 0.66),
    "F" : ("#90E050", 1.47, 0.57),
    "NE": ("#B3E3F5", 1.54, 0.58),
    "NA": ("#AB5CF2", 2.27, 1.66),
    "MG": ("#8AFF00", 1.73, 1.41),
    "AL": ("#BFA6A6", 1.84, 1.21),
    "SI": ("#F0C8A0", 2.10, 1.11),
    "P" : ("#FF8000", 1.80, 1.07),
    "S" : ("#FFFF30", 1.80, 1.05),
    "CL": ("#1FF01F", 1.75, 1.02),
    "AR": ("#80D1E3", 1.88, 1.06),
    "K" : ("#8F40D4", 2.75, 2.03),
    "CA": ("#3DFF00", 2.31, 1.76),
    "MN": ("#9C7AC7", 2.05, 1.61),
    "FE": ("#E06633", 2.05, 1.32),
    "CO": ("#F090A0", 2.00, 1.26),
    "NI": ("#50D050", 2.00, 1.24),
    "CU": ("#C88033", 2.00, 1.32),
    "ZN": ("#7D80B0", 2.10, 1.22),
    "BR": ("#A62929", 1.83, 1.20),
    "I" : ("#940094", 1.98, 1.39),
}
_DEF_COLOR = "#FF69B4"
_DEF_VDW   = 1.50
_DEF_RCOV  = 0.77

def _hex_to_rgb01(h):
    h = h.lstrip("#")
    return np.array([int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)]) / 255.0

def _edata(sym):
    d = _ELEM.get(sym.upper(), (_DEF_COLOR, _DEF_VDW, _DEF_RCOV))
    return _hex_to_rgb01(d[0]), d[1], d[2]

# VMD CPK parameters
SPHERE_SCALE  = 0.50   # sphere radius = SPHERE_SCALE × VdW
BOND_RADIUS   = 0.15   # cylinder radius in Å

# Bond detection (OpenBabel ConnectTheDots)
BOND_TOL = 0.45
BOND_MIN = 0.40

# Phong lighting
AMBIENT   = 0.35
DIFFUSE   = 0.65
SPECULAR  = 0.45
SHININESS = 40.0

# Light direction (normalized), from upper-left-front
_LIGHT = np.array([0.6, 0.8, 1.0])
_LIGHT = _LIGHT / np.linalg.norm(_LIGHT)


# ── XYZ parser ────────────────────────────────────────────────────────────────

def parse_xyz(path):
    frames = []
    with open(path) as fh:
        lines = fh.readlines()
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1; continue
        try:
            n = int(s)
        except ValueError:
            i += 1; continue
        comment = lines[i+1].strip() if i+1 < len(lines) else ""
        atoms, coords = [], []
        for j in range(i+2, i+2+n):
            if j >= len(lines): break
            p = lines[j].split()
            if len(p) < 4: continue
            atoms.append(p[0].capitalize())
            coords.append([float(p[1]), float(p[2]), float(p[3])])
        if len(atoms) == n:
            frames.append({"atoms": atoms,
                           "coords": np.array(coords, dtype=np.float64),
                           "comment": comment})
        i += 2 + n
    return frames

def _label(comment, step_idx):
    ms = re.search(r"[Ss]tep[:\s]+(\d+)", comment)
    step = int(ms.group(1)) if ms else step_idx + 1
    me = re.search(r"[Ee]nergy[:\s]+([-\d.]+)", comment)
    if me:
        return f"Step {step}   E = {float(me.group(1)):.5f} Eh"
    return f"Step {step}"


# ── Bond detection ────────────────────────────────────────────────────────────

def detect_bonds(atoms, coords):
    bonds = []
    n = len(atoms)
    rcov = [_edata(a)[2] for a in atoms]
    for i in range(n):
        for j in range(i+1, n):
            d = np.linalg.norm(coords[i] - coords[j])
            if BOND_MIN < d < rcov[i] + rcov[j] + BOND_TOL:
                bonds.append((i, j))
    return bonds


# ── Ray-casting core ──────────────────────────────────────────────────────────

def _make_rays(W, H, cam_pos, target, fov_deg=30.0):
    """
    Return ray origin (shared) and per-pixel direction array (H, W, 3).
    Camera looks from cam_pos toward target, up = +Y.
    """
    forward = target - cam_pos
    forward /= np.linalg.norm(forward)
    right = np.cross(forward, np.array([0.0, 1.0, 0.0]))
    if np.linalg.norm(right) < 1e-6:
        right = np.array([1.0, 0.0, 0.0])
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)

    half_h = np.tan(np.radians(fov_deg / 2.0))
    half_w = half_h * (W / H)

    # pixel grid in [-1, 1] NDC
    u = np.linspace(-half_w, half_w, W)
    v = np.linspace( half_h, -half_h, H)   # flip Y
    uu, vv = np.meshgrid(u, v)              # (H, W)

    dirs = (forward[None, None, :]
            + uu[:, :, None] * right[None, None, :]
            + vv[:, :, None] * up[None, None, :])
    norms = np.linalg.norm(dirs, axis=2, keepdims=True)
    dirs /= norms
    return cam_pos.copy(), dirs            # (3,), (H, W, 3)


def _phong(normal, color):
    """
    Phong shading.  normal: (..., 3) unit vectors.  color: (3,) float.
    Returns (... , 3) RGB in [0,1].  NaN pixels (no hit) → 0.
    """
    diff = np.clip(np.nan_to_num(np.einsum("...i,i->...", normal, _LIGHT)), 0.0, 1.0)
    view = np.array([0.0, 0.0, 1.0])
    refl = 2.0 * diff[..., None] * np.nan_to_num(normal) - _LIGHT[None, None, :]
    spec = np.clip(np.einsum("...i,i->...", refl, view), 0.0, 1.0) ** SHININESS
    shading = AMBIENT + DIFFUSE * diff + SPECULAR * spec
    return np.clip(shading[..., None] * color[None, None, :], 0.0, 1.0)


def render_frame(atoms, coords, bonds, W, H):
    """
    Ray-cast one frame.  Returns (H, W, 3) uint8 RGB.
    """
    # Center molecule
    coords = coords - coords.mean(axis=0)

    # Camera: positioned along +Z at a distance so the molecule fits
    extent = np.linalg.norm(coords, axis=1).max()
    max_r  = max(_edata(a)[1] * SPHERE_SCALE for a in atoms)
    cam_dist = (extent + max_r) / np.tan(np.radians(25.0)) * 1.15
    cam_pos  = np.array([0.0, 0.0, cam_dist])
    target   = np.zeros(3)

    ro, rd = _make_rays(W, H, cam_pos, target, fov_deg=50.0)
    # rd: (H, W, 3)

    # Buffers
    depth  = np.full((H, W), np.inf)
    color  = np.ones((H, W, 3), dtype=np.float64)   # white background

    # Precompute per-element data
    elem_colors = [_edata(a)[0] for a in atoms]
    elem_radii  = [_edata(a)[1] * SPHERE_SCALE for a in atoms]

    # ── Sphere intersections ─────────────────────────────────────────────────
    for idx, (c_rgb, r) in enumerate(zip(elem_colors, elem_radii)):
        center = coords[idx]                    # (3,)
        oc = ro - center                        # (3,)
        # quadratic: t^2 + 2 b t + c_q = 0
        b  = np.einsum("i,hwi->hw", oc, rd)    # (H, W)
        cq = np.dot(oc, oc) - r * r
        disc = b * b - cq                       # (H, W)
        hit  = disc >= 0.0
        t    = np.where(hit, -b - np.sqrt(np.maximum(disc, 0.0)), np.inf)
        # only front face, closer than current depth
        mask = hit & (t > 0.0) & (t < depth)
        depth = np.where(mask, t, depth)
        # hit point & normal
        pts    = ro + t[..., None] * rd          # (H, W, 3)
        normal = (pts - center) / r              # (H, W, 3)  unit normals
        shaded = _phong(normal, c_rgb)           # (H, W, 3)
        color  = np.where(mask[..., None], shaded, color)

    # ── Bond cylinder intersections ──────────────────────────────────────────
    for i, j in bonds:
        _ray_cylinder(ro, rd, coords[i], coords[j], BOND_RADIUS,
                      elem_colors[i], elem_colors[j], depth, color)

    img = (np.clip(color, 0.0, 1.0) * 255).astype(np.uint8)
    return img


def _ray_cylinder(ro, rd, p0, p1, r, col0, col1, depth, color):
    """
    Ray-cylinder intersection for a finite cylinder from p0 to p1.
    Two-color: each half uses the atom color of the nearest endpoint.
    Writes to depth and color buffers in-place.
    """
    ax  = p1 - p0
    L   = np.linalg.norm(ax)
    if L < 1e-6:
        return
    ax_n = ax / L
    mid  = (p0 + p1) * 0.5

    # Project ray and origin-to-p0 onto plane perpendicular to cylinder axis
    # rd_perp = rd - (rd·ax_n) ax_n,  dp_perp = (ro-p0) - ((ro-p0)·ax_n) ax_n
    rd_a  = np.einsum("hwi,i->hw", rd, ax_n)          # (H,W)
    rd_p  = rd - rd_a[..., None] * ax_n               # (H,W,3)

    dp    = ro - p0
    dp_a  = np.dot(dp, ax_n)
    dp_p  = dp - dp_a * ax_n                          # (3,)

    a_q = np.einsum("hwi,hwi->hw", rd_p, rd_p)        # (H,W)
    b_q = np.einsum("hwi,i->hw",   rd_p, dp_p)
    c_q = np.dot(dp_p, dp_p) - r * r

    disc = b_q * b_q - a_q * c_q
    valid = (disc >= 0.0) & (a_q > 1e-12)
    disc  = np.maximum(disc, 0.0)

    t = np.where(valid, (-b_q - np.sqrt(disc)) / np.maximum(a_q, 1e-12), np.inf)

    # Height check: hit point must be within [0, L] along axis
    hit_pt = ro + t[..., None] * rd                   # (H,W,3)
    proj   = np.einsum("hwi,i->hw", hit_pt - p0, ax_n)
    mask   = valid & (t > 0.0) & (t < depth) & (proj >= 0.0) & (proj <= L)

    # Normal on cylinder surface
    foot   = p0 + np.nan_to_num(proj)[..., None] * ax_n
    raw_n  = np.nan_to_num(hit_pt) - foot
    nlen   = np.linalg.norm(raw_n, axis=-1, keepdims=True)
    normal = raw_n / np.where(nlen > 1e-12, nlen, 1.0)

    # Two-color: first half (proj < L/2) → col0, second half → col1
    half   = proj < (L * 0.5)
    c_rgb  = np.where(half[..., None],
                      np.array(col0)[None, None, :],
                      np.array(col1)[None, None, :])   # (H,W,3)

    shaded = _phong(normal, np.ones(3))  # compute shading without color first
    # recompute properly per-pixel color × shading
    diff   = np.clip(np.einsum("hwi,i->hw", normal, _LIGHT), 0.0, 1.0)
    view   = np.array([0.0, 0.0, 1.0])
    refl   = 2.0 * diff[..., None] * normal - _LIGHT
    spec   = np.clip(np.einsum("hwi,i->hw", refl, view), 0.0, 1.0) ** SHININESS
    shading = (AMBIENT + DIFFUSE * diff + SPECULAR * spec)[..., None]
    shaded  = np.clip(shading * c_rgb, 0.0, 1.0)

    color[:] = np.where(mask[..., None], shaded, color)
    depth[:] = np.where(mask, t, depth)


# ── GIF builder ───────────────────────────────────────────────────────────────

def build_gif(frames, outpath, every=1, fps=8, width=480, height=480):
    sel   = frames[::every]
    n_sel = len(sel)

    pil_frames = []
    for k, frame in enumerate(sel):
        atoms  = frame["atoms"]
        coords = frame["coords"]
        bonds  = detect_bonds(atoms, coords)         # per-frame!
        img_arr = render_frame(atoms, coords, bonds, width, height)
        img = Image.fromarray(img_arr)

        # Label
        draw  = ImageDraw.Draw(img)
        label = _label(frame["comment"], k * every)
        draw.text((8, 6), label, fill=(40, 40, 40))

        pil_frames.append(img)
        print(f"\r  Rendering frame {k+1}/{n_sel}", end="", flush=True)

    print()
    duration_ms = int(1000 / fps)
    pil_frames[0].save(
        outpath,
        save_all=True,
        append_images=pil_frames[1:],
        loop=0,
        duration=duration_ms,
        optimize=False,
    )
    print(f"  Saved: {outpath}  ({n_sel} frames @ {fps} fps)")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="MAPLE trajectory → animated GIF (ray-cast CPK, VMD style)"
    )
    parser.add_argument("traj",  help="Multi-frame XYZ trajectory file")
    parser.add_argument("--every",  type=int, default=1,   metavar="N")
    parser.add_argument("--fps",    type=int, default=8)
    parser.add_argument("--out",    default=None,          metavar="FILE")
    parser.add_argument("--outdir", default=None,          metavar="DIR")
    parser.add_argument("--width",  type=int, default=480)
    parser.add_argument("--height", type=int, default=480)
    args = parser.parse_args()

    if not os.path.isfile(args.traj):
        sys.exit(f"Error: not found: {args.traj}")

    print(f"Parsing: {args.traj}")
    frames = parse_xyz(args.traj)
    if not frames:
        sys.exit("Error: no frames found.")
    print(f"  {len(frames)} frames found")

    basename = os.path.splitext(os.path.basename(args.traj))[0]
    if args.out:
        outpath = args.out
    else:
        d = args.outdir or os.path.dirname(os.path.abspath(args.traj))
        outpath = os.path.join(d, basename + ".gif")
    if args.outdir and not args.out:
        os.makedirs(args.outdir, exist_ok=True)

    build_gif(frames, outpath,
              every=args.every, fps=args.fps,
              width=args.width, height=args.height)
    print("Done.")


if __name__ == "__main__":
    main()
