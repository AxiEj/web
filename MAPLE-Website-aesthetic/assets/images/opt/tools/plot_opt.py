"""
plot_opt.py  —  Standard figure generator for MAPLE OPT documentation
======================================================================
Reads real MAPLE optimization output files and produces publication-ready
PNG figures for the documentation.

Usage:
    python plot_opt.py lbfgs_water.out
    python plot_opt.py lbfgs_water.out rfo_water.out   # comparison plot
    python plot_opt.py *.out

MAPLE output file format (example):
  Each iteration block contains lines like:
    Energy:                  -76.402341   ...
    Maximum Force:             0.001234   0.000450   Yes/No
    RMS Force:                 0.000812   0.000300   Yes/No
    Maximum Displacement:      0.003210   0.001800   Yes/No
    RMS Displacement:          0.002100   0.001200   Yes/No
"""

import argparse
import os
import re
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# ──────────────────────────────────────────────
# Style constants  (edit here to change globally)
# ──────────────────────────────────────────────
FIG_W        = 3.5          # inches
FIG_H        = 2.8          # inches
DPI          = 150
FONT_FAMILY  = "sans-serif"
FONT_AXIS    = 9            # axis label pt
FONT_TICK    = 8            # tick label pt
FONT_LEGEND  = 8            # legend pt
LINEWIDTH    = 1.5
MARKERSIZE   = 3.5

COLOR = {
    "lbfgs"    : "#2563EB",   # blue
    "rfo"      : "#EA580C",   # orange
    "sd"       : "#16A34A",   # green
    "maxf"     : "#2563EB",
    "rmsf"     : "#9333EA",
    "threshold": "#94A3B8",   # gray dashed
}

plt.rcParams.update({
    "font.family"       : FONT_FAMILY,
    "font.size"         : FONT_TICK,
    "axes.labelsize"    : FONT_AXIS,
    "axes.labelweight"  : "normal",
    "xtick.labelsize"   : FONT_TICK,
    "ytick.labelsize"   : FONT_TICK,
    "legend.fontsize"   : FONT_LEGEND,
    "legend.framealpha" : 0.85,
    "legend.edgecolor"  : "#CBD5E1",
    "axes.spines.top"   : False,
    "axes.spines.right" : False,
    "axes.linewidth"    : 0.8,
    "xtick.major.width" : 0.8,
    "ytick.major.width" : 0.8,
    "figure.dpi"        : DPI,
    "savefig.dpi"       : DPI,
    "savefig.bbox"      : "tight",
    "savefig.pad_inches": 0.08,
})

HERE = os.path.dirname(os.path.abspath(__file__))

# ──────────────────────────────────────────────
# Parser for MAPLE .out files
# ──────────────────────────────────────────────
RE_ENERGY  = re.compile(r"Energy:\s+([-\d.]+)")
RE_MAXF    = re.compile(r"Maximum Force:\s+([\d.]+)\s+([\d.]+)")
RE_RMSF    = re.compile(r"RMS Force:\s+([\d.]+)\s+([\d.]+)")
RE_MAXDP   = re.compile(r"Maximum Displacement:\s+([\d.]+)\s+([\d.]+)")
RE_RMSDP   = re.compile(r"RMS Displacement:\s+([\d.]+)\s+([\d.]+)")


def parse_maple_out(path):
    """
    Parse a MAPLE optimization .out file.

    Returns dict with arrays:
        iters, energy, max_force, rms_force, max_disp, rms_disp,
        maxf_thresh, rmsf_thresh, maxdp_thresh, rmsdp_thresh
    """
    energies, maxf, rmsf, maxdp, rmsdp = [], [], [], [], []
    maxf_th = rmsf_th = maxdp_th = rmsdp_th = None

    with open(path) as f:
        for line in f:
            m = RE_ENERGY.search(line)
            if m:
                energies.append(float(m.group(1)))
                continue
            m = RE_MAXF.search(line)
            if m:
                maxf.append(float(m.group(1)))
                maxf_th = float(m.group(2))
                continue
            m = RE_RMSF.search(line)
            if m:
                rmsf.append(float(m.group(1)))
                rmsf_th = float(m.group(2))
                continue
            m = RE_MAXDP.search(line)
            if m:
                maxdp.append(float(m.group(1)))
                maxdp_th = float(m.group(2))
                continue
            m = RE_RMSDP.search(line)
            if m:
                rmsdp.append(float(m.group(1)))
                rmsdp_th = float(m.group(2))
                continue

    n = min(len(energies), len(maxf), len(rmsf), len(maxdp), len(rmsdp))
    if n == 0:
        raise ValueError(f"No iteration data found in {path}")

    return {
        "iters"      : np.arange(1, n + 1),
        "energy"     : np.array(energies[:n]),
        "max_force"  : np.array(maxf[:n]),
        "rms_force"  : np.array(rmsf[:n]),
        "max_disp"   : np.array(maxdp[:n]),
        "rms_disp"   : np.array(rmsdp[:n]),
        "maxf_thresh": maxf_th,
        "rmsf_thresh": rmsf_th,
        "maxdp_thresh": maxdp_th,
        "rmsdp_thresh": rmsdp_th,
    }


def _method_from_path(path):
    # Try to read method from file content.
    # Match lines like:  #opt(method=lbfgs)  or  method : lbfgs
    # but NOT  lbfgs : True  (flag lines where the value is a boolean)
    _KNOWN = {"lbfgs", "rfo", "sdcg", "sd", "cg"}
    try:
        with open(path) as f:
            for line in f:
                m = re.search(r"method\s*[:=]\s*(\w+)", line, re.IGNORECASE)
                if m:
                    candidate = m.group(1).lower()
                    if candidate in _KNOWN:
                        return candidate
                # Also catch bare keyword lines like  "lbfgs          : True"
                m2 = re.match(r"\s*(\w+)\s*:\s*True\b", line, re.IGNORECASE)
                if m2 and m2.group(1).lower() in _KNOWN:
                    return m2.group(1).lower()
    except Exception:
        pass
    # Fall back to path (order matters: sdcg before sd/cg)
    path_lower = os.path.normpath(path).lower()
    for m in ("lbfgs", "rfo", "sdcg", "sd", "cg"):
        if f"{os.sep}{m}{os.sep}" in path_lower or os.path.basename(path_lower).startswith(f"{m}"):
            return m
    return "opt"


# ──────────────────────────────────────────────
# Figure functions
# ──────────────────────────────────────────────
def _savefig(fig, outdir, fname):
    fpath = os.path.join(outdir, fname)
    fig.savefig(fpath)
    plt.close(fig)
    print(f"  Saved: {fpath}")
    return fpath


def fig_energy_vs_iter(data, method="lbfgs", label=None, outdir=HERE):
    """Energy relative to minimum value (Ha) vs iteration."""
    iters  = data["iters"]
    E      = data["energy"]
    E_rel  = E - E.min()   # Ha, always >= 0 at the global minimum
    color  = COLOR.get(method, COLOR["lbfgs"])
    label  = label or method.upper()

    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))
    ax.plot(iters, E_rel, color=color, lw=LINEWIDTH,
            marker="o", ms=MARKERSIZE,
            label=label, clip_on=False)
    ax.set_xlabel("Iteration")
    ax.set_ylabel("ΔE / Ha")
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter("%.4f"))
    ax.legend(loc="upper right")
    ax.set_xlim(left=1)
    # No bottom=0 clamp: non-monotonic methods (CG, SD) show true behaviour

    return _savefig(fig, outdir, f"energy_vs_iter_{method}.png")


def fig_force_vs_iter(data, method="lbfgs", label=None, outdir=HERE):
    """Max force and RMS force (Eh/Å) vs iteration, log scale."""
    iters  = data["iters"]
    maxf   = data["max_force"]
    rmsf   = data["rms_force"]
    label  = label or method.upper()

    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))
    ax.semilogy(iters, maxf, color=COLOR["maxf"], lw=LINEWIDTH,
                marker="o", ms=MARKERSIZE, label="Max Force")
    ax.semilogy(iters, rmsf, color=COLOR["rmsf"], lw=LINEWIDTH,
                linestyle="--", marker="s", ms=MARKERSIZE,
                label="RMS Force")

    if data["maxf_thresh"]:
        ax.axhline(data["maxf_thresh"], color=COLOR["threshold"], lw=1.0,
                   linestyle=":", label=f"Max thresh ({data['maxf_thresh']:.2e})")
    if data["rmsf_thresh"]:
        ax.axhline(data["rmsf_thresh"], color=COLOR["threshold"], lw=1.0,
                   linestyle="-.", label=f"RMS thresh ({data['rmsf_thresh']:.2e})")

    ax.set_xlabel("Iteration")
    ax.set_ylabel("Force / Eh·Å⁻¹")
    ax.legend(loc="upper right")
    ax.set_xlim(left=1)

    return _savefig(fig, outdir, f"force_vs_iter_{method}.png")


def fig_comparison(datasets, labels=None, outdir=HERE, outname="energy_comparison.png"):
    """Overlay relative-energy curves in Ha from multiple methods."""
    # Colour palette: method-specific first, then distinct fallbacks
    _METHOD_COLORS = [
        COLOR.get("lbfgs"), COLOR.get("rfo"), COLOR.get("sd"),
        "#DB2777", "#0891B2", "#D97706", "#7C3AED", "#059669",
    ]
    _LINESTYLES = ["-", "--", "-.", ":"]
    _MARKERS    = ["o", "s", "^", "D", "v", "P", "X", "*"]

    # Build a deduplicated label list so duplicate methods get a suffix
    method_count: dict = {}
    resolved_labels = []
    for i, (data, path) in enumerate(datasets):
        method = _method_from_path(path)
        if labels and i < len(labels):
            resolved_labels.append(labels[i])
        else:
            count = method_count.get(method, 0)
            method_count[method] = count + 1
            suffix = f" ({count + 1})" if count > 0 else ""
            resolved_labels.append(method.upper() + suffix)

    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))

    for i, (data, path) in enumerate(datasets):
        E_rel = data["energy"] - data["energy"].min()
        color = _METHOD_COLORS[i % len(_METHOD_COLORS)]
        ls    = _LINESTYLES[i % len(_LINESTYLES)]
        mk    = _MARKERS[i % len(_MARKERS)]
        ax.plot(data["iters"], E_rel, color=color, lw=LINEWIDTH,
                marker=mk, ms=MARKERSIZE,
                label=resolved_labels[i], linestyle=ls)

    ax.set_xlabel("Iteration")
    ax.set_ylabel("ΔE / Ha")
    ax.legend(loc="upper right")
    ax.set_xlim(left=1)

    return _savefig(fig, outdir, outname)


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Generate MAPLE OPT figures from real output files"
    )
    parser.add_argument("files", nargs="+", metavar="FILE",
                        help="MAPLE optimization .out file(s)")
    parser.add_argument("--outdir", default=HERE, metavar="DIR",
                        help="Output directory for PNG files (default: script directory)")
    parser.add_argument("--compare", action="store_true",
                        help="Also generate a comparison overlay plot")
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    datasets = []

    for path in args.files:
        print(f"Parsing: {path}")
        try:
            data   = parse_maple_out(path)
            method = _method_from_path(path)
            print(f"  {len(data['iters'])} iterations found")
            fig_energy_vs_iter(data, method=method, outdir=args.outdir)
            fig_force_vs_iter(data, method=method, outdir=args.outdir)
            datasets.append((data, path))
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)

    if args.compare and len(datasets) >= 2:
        fig_comparison(datasets, outdir=args.outdir)

    print("Done.")


if __name__ == "__main__":
    main()
