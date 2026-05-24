#!/usr/bin/env bash
# vmd_traj_gif.sh — Render a multi-frame XYZ trajectory to GIF via VMD + ffmpeg
#
# Quick-config (edit the USER CONFIG block below, or pass CLI flags):
#   bash vmd_traj_gif.sh traj.xyz
#   bash vmd_traj_gif.sh traj.xyz --out movie.gif --fps 24 --width 600 --height 600
#   bash vmd_traj_gif.sh traj.xyz --every 2 --style Licorice --bg black
#   bash vmd_traj_gif.sh --help
#
# Requirements: vmd, ffmpeg
#   - vmd    : must be in PATH, or set  VMD=/path/to/vmd  before running
#   - ffmpeg : must be in PATH
#
# VMD representation styles (--style):
#   CPK  Lines  Licorice  VDW  DynamicBonds  Tube  NewCartoon  QuickSurf  ...

set -euo pipefail

# ════════════════════════════════════════════════════════════════════
# USER CONFIG — change these defaults to suit your environment
# ════════════════════════════════════════════════════════════════════

# Path to vmd executable (leave empty to auto-detect from PATH)
VMD_EXE=""

# Output resolution
DEFAULT_WIDTH=600
DEFAULT_HEIGHT=600

# Animation speed (frames per second in the final GIF)
DEFAULT_FPS=24

# VMD representation style
DEFAULT_STYLE="CPK"

# Background color: white | black
DEFAULT_BG="white"

# Render every Nth frame (1 = all frames, 2 = every other frame, …)
DEFAULT_EVERY=1

# ════════════════════════════════════════════════════════════════════

# ── Argument defaults (from USER CONFIG) ──────────────────────────
TRAJ=""
OUT=""
FPS=$DEFAULT_FPS
WIDTH=$DEFAULT_WIDTH
HEIGHT=$DEFAULT_HEIGHT
EVERY=$DEFAULT_EVERY
STYLE=$DEFAULT_STYLE
BG=$DEFAULT_BG
KEEP_FRAMES=0

# ── Help ──────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") TRAJ.xyz [OPTIONS]

Options:
  --out FILE        Output GIF path  (default: <traj>.gif next to input)
  --fps N           Frames per second (default: $DEFAULT_FPS)
  --width  N        Frame width  in px (default: $DEFAULT_WIDTH)
  --height N        Frame height in px (default: $DEFAULT_HEIGHT)
  --every  N        Render every Nth trajectory frame (default: $DEFAULT_EVERY)
  --style  NAME     VMD representation style (default: $DEFAULT_STYLE)
                    e.g. CPK, Licorice, VDW, DynamicBonds, Lines
  --bg     COLOR    Background color: white | black (default: $DEFAULT_BG)
  --keep-frames     Keep per-frame TGA files next to the GIF
  -h, --help        Show this help

Environment variables:
  VMD=/path/to/vmd  Override VMD executable (also editable in USER CONFIG)
EOF
  exit 0
}

# ── Argument parsing ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)    OUT="$2";    shift 2 ;;
    --fps)    FPS="$2";    shift 2 ;;
    --width)  WIDTH="$2";  shift 2 ;;
    --height) HEIGHT="$2"; shift 2 ;;
    --every)  EVERY="$2";  shift 2 ;;
    --style)  STYLE="$2";  shift 2 ;;
    --bg)     BG="$2";     shift 2 ;;
    --keep-frames) KEEP_FRAMES=1; shift ;;
    -h|--help) usage ;;
    -*) echo "Unknown option: $1  (use --help for usage)" >&2; exit 1 ;;
    *)  TRAJ="$1"; shift ;;
  esac
done

# ── Validate inputs ───────────────────────────────────────────────
[[ -z "$TRAJ" ]] && { echo "Error: no trajectory file specified. Use --help for usage." >&2; exit 1; }
[[ -f "$TRAJ" ]] || { echo "Error: file not found: $TRAJ" >&2; exit 1; }

# Numeric checks
for VAR_NAME in FPS WIDTH HEIGHT EVERY; do
  VAL="${!VAR_NAME}"
  [[ "$VAL" =~ ^[0-9]+$ && "$VAL" -gt 0 ]] || {
    echo "Error: --${VAR_NAME,,} must be a positive integer (got: '$VAL')" >&2; exit 1
  }
done

[[ "$BG" == "white" || "$BG" == "black" ]] || {
  echo "Error: --bg must be 'white' or 'black' (got: '$BG')" >&2; exit 1
}

# ── Locate executables ────────────────────────────────────────────
# VMD: CLI flag > env var > USER CONFIG > PATH
VMD="${VMD:-${VMD_EXE:-$(command -v vmd 2>/dev/null || true)}}"
if [[ -z "$VMD" ]]; then
  cat >&2 <<EOF
Error: 'vmd' not found.
  Option 1 — add vmd to PATH
  Option 2 — set env var:   VMD=/path/to/vmd bash vmd_traj_gif.sh ...
  Option 3 — edit VMD_EXE= in the USER CONFIG block at the top of this script
EOF
  exit 1
fi
[[ -x "$VMD" ]] || { echo "Error: VMD executable not runnable: $VMD" >&2; exit 1; }

if ! command -v ffmpeg &>/dev/null; then
  echo "Error: 'ffmpeg' not found. Install it and make sure it is in PATH." >&2
  exit 1
fi

# ── Paths ─────────────────────────────────────────────────────────
TRAJ_ABS="$(realpath "$TRAJ")"
TRAJ_DIR="$(dirname  "$TRAJ_ABS")"
TRAJ_BASE="$(basename "$TRAJ_ABS" .xyz)"
[[ -z "$OUT" ]] && OUT="${TRAJ_DIR}/${TRAJ_BASE}.gif"

# Warn if output will overwrite an existing file
[[ -f "$OUT" ]] && echo "Warning: output file exists and will be overwritten: $OUT"

TMPDIR_FRAMES="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_FRAMES"' EXIT

# ── Summary ───────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Trajectory : $TRAJ_ABS"
echo "  Output GIF : $OUT"
echo "  Resolution : ${WIDTH}x${HEIGHT} @ ${FPS} fps"
echo "  Frames     : every ${EVERY}"
echo "  VMD style  : $STYLE  (bg: $BG)"
echo "  VMD        : $VMD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── VMD Tcl script ────────────────────────────────────────────────
TCL_SCRIPT="${TMPDIR_FRAMES}/render.tcl"
cat > "$TCL_SCRIPT" << TCLEOF
# Auto-generated by vmd_traj_gif.sh

display resize $WIDTH $HEIGHT
display reposition 0 0
color Display Background $BG
display depthcue off
display projection Orthographic
display distance -8.0
axes location Off

mol new {$TRAJ_ABS} type xyz waitfor all

mol delrep 0 top
mol representation $STYLE
mol color Element
mol addrep top

display resetview

set nframes [molinfo top get numframes]
set every   $EVERY
set fidx    0

for {set f 0} {\$f < \$nframes} {incr f \$every} {
    molinfo top set frame \$f
    mol bondsrecalc all
    display update
    set padded [format "%06d" \$fidx]
    render TachyonInternal ${TMPDIR_FRAMES}/frame_\${padded}.tga
    incr fidx
}

quit
TCLEOF

# ── Run VMD headless ──────────────────────────────────────────────
echo "Running VMD (headless)..."
VMD_LOG="${TMPDIR_FRAMES}/vmd.log"
"$VMD" -dispdev text -e "$TCL_SCRIPT" > "$VMD_LOG" 2>&1 || true

# Show non-Info lines (errors/warnings); suppress grep's non-zero exit
{ grep -v "^Info)" "$VMD_LOG" | grep -v "^$"; } || true

FRAME_COUNT=$(find "$TMPDIR_FRAMES" -name "frame_*.tga" | wc -l)
if [[ "$FRAME_COUNT" -eq 0 ]]; then
  echo "" >&2
  echo "Error: VMD produced no frames. Full VMD log:" >&2
  cat "$VMD_LOG" >&2
  exit 1
fi
echo "  Rendered $FRAME_COUNT frame(s)"

# ── Optionally keep frames ─────────────────────────────────────────
if [[ "$KEEP_FRAMES" -eq 1 ]]; then
  FRAMES_OUT_DIR="${TRAJ_DIR}/${TRAJ_BASE}_frames"
  mkdir -p "$FRAMES_OUT_DIR"
  cp "$TMPDIR_FRAMES"/frame_*.tga "$FRAMES_OUT_DIR/"
  echo "  Frames saved to: $FRAMES_OUT_DIR"
fi

# ── Assemble GIF with ffmpeg (two-pass palette) ───────────────────
echo "Assembling GIF with ffmpeg..."
PALETTE="${TMPDIR_FRAMES}/palette.png"
FRAME_PATTERN="${TMPDIR_FRAMES}/frame_%06d.tga"

# Pass 1: build optimal 256-colour palette
ffmpeg -y -loglevel warning \
  -framerate "$FPS" -f image2 -vcodec targa \
  -i "$FRAME_PATTERN" \
  -vf "scale=${WIDTH}:${HEIGHT}:flags=lanczos,palettegen=max_colors=256:stats_mode=full" \
  "$PALETTE"

# Pass 2: encode GIF using palette
ffmpeg -y -loglevel warning \
  -framerate "$FPS" -f image2 -vcodec targa \
  -i "$FRAME_PATTERN" \
  -i "$PALETTE" \
  -lavfi "scale=${WIDTH}:${HEIGHT}:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5" \
  "$OUT"

echo ""
echo "Done.  GIF saved: $OUT"
