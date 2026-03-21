# Contributing to the MAPLE Website

Thank you for your interest in contributing to the MAPLE documentation website.

## Project Structure

```
index.html                Root-level main pages (top-nav layout)
assets/css/styles.css     Shared stylesheet
assets/images/            Logo and news images
functions/                Feature documentation (solvent, constrain)
setup/                    Input file setup documentation (settings, coordinates)
tasks/                    Task documentation, organized by type:
  singlepoint.html
  opt/                    Geometry optimization methods
  ts/                     Transition state search methods
  scan/                   PES scan methods
  irc/                    IRC methods
```

## Navigation Patterns

The site uses two navigation patterns:

- **Top navigation bar** (`header.top-nav`): Used by all root-level main pages
- **Sidebar navigation** (`aside.navigation-section`): Used by sub-pages in `functions/`, `setup/`, `tasks/`

## Adding a New Page

1. Copy the HTML skeleton from an existing page at the same directory depth.
2. Update the `<link rel="stylesheet" href="...">` path relative to the new file's location:
   - Root level: `assets/css/styles.css`
   - 1 level deep (e.g., `functions/`, `tasks/`): `../assets/css/styles.css`
   - 2 levels deep (e.g., `tasks/opt/`): `../../assets/css/styles.css`
3. Update all navigation `href` and logo `src` paths using the same relative depth pattern.
4. Add a link to the new page from `documentation.html` or `home1.html`.

## Naming Conventions

- Directory names: lowercase (`tasks/`, not `Tasks/`)
- File names: lowercase with underscores (`opt_lbfgs.html`, not `opt_LBFGS.html`)
- Use `.html` extension (not `.htm`)

## Styling

All pages share `assets/css/styles.css`. Do not add per-page stylesheets. If a new CSS class is needed, add it to the shared stylesheet.
