# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static documentation website for MAPLE (Molecular Algorithm for Protein and Ligand Exploration), a computational chemistry software package. Built with plain HTML, CSS, and minimal vanilla JavaScript — no frameworks or build system.

**Repository:** `git@github.com:Carlo8910/MAPLE-Website.git` (branch: `main`)

## Development

No build step. Open `index.html` in a browser or serve locally:

```bash
python3 -m http.server 8000
```

No tests, linters, or CI/CD pipelines are configured.

## Architecture

### Directory Layout

```
index.html + 8 other root pages   Main site pages (top-nav layout)
assets/css/styles.css              Single shared stylesheet
assets/images/                     Logo (logo.jpg) and news images (image.png)
functions/                         Feature docs (solvent, constrain)
setup/                             Input file setup docs (settings, coordinates)
tasks/                             Task docs by type:
  singlepoint.html                   (1 level deep)
  opt/                               Optimization methods (2 levels deep)
  ts/                                Transition state methods (2 levels deep)
  scan/                              PES scan methods (2 levels deep)
  irc/                               IRC methods (2 levels deep)
```

### Two Navigation Patterns

1. **Top-nav bar** (`header.top-nav`): Root-level pages use a horizontal nav bar with links to all main sections. Includes brand logo + site name.
2. **Sidebar** (`aside.navigation-section`): Sub-pages in `functions/`, `setup/`, `tasks/` use a left sidebar with logo and nav links.

Some pages (e.g., `tasks/irc/irc.html`) combine top-nav with a doc-tree sidebar.

### Path Conventions

All paths are relative. The depth from root determines the prefix:

| Location | Stylesheet | Logo | Root pages |
|---|---|---|---|
| Root | `assets/css/styles.css` | `assets/images/logo.jpg` | `general.html` |
| 1 level deep | `../assets/css/styles.css` | `../assets/images/logo.jpg` | `../general.html` |
| 2 levels deep | `../../assets/css/styles.css` | `../../assets/images/logo.jpg` | `../../general.html` |

## Adding New Pages

1. Copy an existing page at the same directory depth
2. Adjust all `href`/`src` paths for the correct relative depth
3. Add links from `documentation.html` (doc tree) or `home1.html` (user guide hub)
4. Lowercase directory and file names with underscores (e.g., `opt_lbfgs.html`)
5. Use `.html` extension (not `.htm`)
