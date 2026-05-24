# Documentation Figure Tools

Scripts for generating the figures and animations used in the MAPLE documentation site.
Both scripts live in `assets/images/opt/` alongside the PNG/GIF output they produce.

**Dependencies**

```bash
pip install numpy matplotlib Pillow
```

---

## plot_opt.py — Convergence figures

Reads one or more MAPLE `.out` files and produces PNG figures showing energy and
force convergence per iteration.

### Usage

```bash
# Single run → energy_vs_iter_lbfgs.png + force_vs_iter_lbfgs.png
python plot_opt.py lbfgs_run.out

# Multiple runs → one figure pair per file
python plot_opt.py lbfgs_run.out rfo_run.out

# Add a comparison overlay (any number of files) → energy_comparison.png
python plot_opt.py lbfgs_run.out rfo_run.out sd_run.out --compare

# Write output elsewhere
python plot_opt.py lbfgs_run.out --outdir /path/to/output/
```

### Input format

Standard MAPLE optimization output. Each iteration block must contain:

```
Energy:                  -120.402341
Maximum Force:             0.001234   0.000450   No
RMS Force:                 0.000812   0.000300   No
Maximum Displacement:      0.003210   0.001800   No
RMS Displacement:          0.002100   0.001200   No
```

The second numeric column on force/displacement lines is the convergence threshold,
drawn as a dashed reference line on the force plot.

### Method detection & output naming

The method is read from `method=<name>` inside the file first, then inferred from
the filename. Output files are named `energy_vs_iter_<method>.png` and
`force_vs_iter_<method>.png`.

| Filename contains | Method | Colour |
|---|---|---|
| `lbfgs` | `lbfgs` | Blue |
| `rfo` | `rfo` | Orange |
| `sd`, `cg`, `sdcg` | `sd` | Green |
| (other) | `opt` | Blue |

### Comparison plot (`--compare`)

Works with **any number of input files** (≥ 2). Duplicate methods get a numbered
suffix in the legend (e.g. `LBFGS`, `LBFGS (2)`). Each curve gets a distinct
colour, line style, and marker automatically.

---

## traj_anim.py — Trajectory animation

Reads a MAPLE multi-frame XYZ trajectory and exports an animated GIF. Atoms are
rendered with CPK colours and sizes scaled by van-der-Waals radii.

### Usage

```bash
# Basic → opt.gif next to the input file
python traj_anim.py opt.traj

# Thin frames, adjust speed
python traj_anim.py opt.traj --every 3 --fps 10

# Specify output path
python traj_anim.py opt.traj --out ../../assets/images/opt/opt_lbfgs.gif
```

### Options

| Option | Default | Description |
|---|---|---|
| `--every N` | `1` | Use every Nth frame. Reduces file size for long runs. |
| `--fps N` | `8` | Playback speed (frames per second). |
| `--out FILE` | `<input>.gif` | Explicit output path. |
| `--outdir DIR` | input directory | Output directory; filename from input basename. |

### Input format

Standard multi-frame XYZ (as written by MAPLE with `write_traj=True`):

```
22
Energy: -120.3456  Step: 1
C   -0.778  -1.068   0.321
H    0.028  -0.678  -1.458
...
22
Energy: -120.3891  Step: 2
...
```

`Step:` and `Energy:` in the comment line are shown as a per-frame title.
Any valid multi-frame XYZ works (ASE, ORCA, etc.).

### Recommended settings

| Trajectory length | `--every` | `--fps` |
|---|---|---|
| < 50 frames | 1 | 6–8 |
| 50–200 frames | 2–3 | 8–10 |
| > 200 frames | 5–10 | 10 |

### Embedding the GIF in a doc page

Place the `.gif` in `assets/images/opt/` and use a `<figure>` block:

```html
<figure class="doc-figure">
  <img src="../../assets/images/opt/opt_lbfgs.gif"
       alt="L-BFGS geometry optimisation trajectory">
  <figcaption>Fig. 3 — L-BFGS trajectory (22-atom molecule, UMA model)</figcaption>
</figure>
```
