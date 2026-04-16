# Project Guidelines

## Stack And Scope

- This workspace is an Astro 5 site with React islands, Tailwind CSS, Framer Motion, and Astro Content Collections.
- Prefer Astro for page data loading and templating, and React components for client-side interaction/animation.

## Architecture

- Routes live in `src/pages/`; shared page shell is `src/layouts/Layout.astro`.
- Interactive UI lives in `src/components/` as `.tsx` components.
- Content source of truth is Markdown in `src/content/` with schemas in `src/content/config.ts`.
- Global visual system is defined by `tailwind.config.mjs` and `src/styles/globals.css`.

## Build And Run

- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`
- There is currently no dedicated test script; use `npm run build` as the baseline validation step.

## Conventions

- Keep component names in PascalCase (`src/components/*.tsx`).
- Keep content filenames in kebab-case under their collection folders (`src/content/blog/*.md`, `src/content/daily-log/*.md`, etc.).
- Follow collection schemas strictly in frontmatter; do not introduce undeclared fields.
- Daily log dates should remain ISO-like (`YYYY-MM-DD`) to avoid routing and parsing issues.
- When adding React components in Astro pages, ensure proper hydration directives (for example `client:load`) where interactivity is required.

## Project-Specific Guardrails

- Keep Framer Motion SSR compatibility config in `astro.config.mjs` (`vite.ssr.external` includes `framer-motion`).
- Be careful with Markdown-to-HTML rendering (`marked` + injected HTML); treat content as trusted source or sanitize before broader use.
- Do not move content files outside `src/content/<collection>/` or collection queries may break.

## Link, Do Not Duplicate

- Content model and schema details: `CONTENT_QUICK_CARD.md`, `CONTENT_COLLECTIONS_GUIDE.md`
- Blog workflows and card behavior: `BLOG_QUICK_START.md`, `BLOG_DEEP_DIVE.md`, `EXPANDABLE_BLOG_GUIDE.md`
- Visual language and theme usage: `GENSHIN_UI_GUIDE.md`, `QUICK_REFERENCE.md`
- Setup/status context: `SETUP_REPORT.md`, `PROJECT_COMPLETION_REPORT.md`
- Content folder quick reference: `src/content/README.md`
