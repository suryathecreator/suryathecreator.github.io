# Where your content lives

Everything personal is in five places. Nothing else needs editing.

| What | File |
| --- | --- |
| Name, Chinese name, affiliation, research-interest sentence, links (GitHub / Scholar / CV / Email), navigation labels, section titles + their Chinese annotations, Google Analytics ID | `site.config.yml` |
| Short bio paragraphs (homepage) | `src/content/about.md` |
| Latest News (one line per update, grouped automatically by year + month) | `src/content/news.yml` |
| Publications (BibTeX; `selected={true}` shows on the homepage) | `src/content/publications/papers.bib` |
| Education / academic timeline (also takes research positions) | `src/content/timeline.yml` |
| The "Personal" page | `src/pages/personal.astro` |

Assets:

- Portrait — `public/images/portrait.jpg` (square, 640×640; replace the file to change it).
- CV — `public/files/cv.pdf` (currently your `Resume_SuryaDuraivenkatesh (6).pdf`).
- UW logo — `public/images/logos/uw.png` (your W mark, background made transparent).

## Publication fields

Beyond standard BibTeX, three extra fields are read:

```bibtex
venue_short = {NeurIPS}                 % the only venue label shown
paper = {...}  code = {...}  website = {...}   % tiny links
selected = {true}                       % show on the homepage
```

The venue line renders as `NeurIPS · Conference on Neural Information Processing Systems 2026`.
No "Conference"/"Journal"/"Preprint" badges are shown anywhere.

## News format

```yaml
- date: 2026-09      # YYYY-MM (the day is never displayed)
  text: "One line. **bold** and [links](https://…) work."
```

## Appearance

Fixed: Classic theme, light mode, no picker and no dark toggle. Colors, type
scale, and rules live in `src/styles/ink.css`.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` (unchanged). One knob in
`astro.config.mjs`:

- user site (repo `suryathecreator.github.io`) → `base: '/'` ← current setting
- project site (repo `homepage`) → `base: '/homepage'`

All internal links go through `withBase()`, so either works.

## Archived template files

`.archive/` holds the original Lumina pages/components that this homepage no
longer uses (blog, projects, team, gallery, the theme system, …). It is
git-ignored and safe to delete once you're happy.
