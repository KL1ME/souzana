# Souzana Klimentidi Law Office Website

Professional website for Souzana Klimentidi, a law office based in Athens. The project presents practice areas, team profiles, legal insights, media appearances, privacy information, and a contact flow in a polished Greek-language experience.

## Live site

- [GitHub Pages](https://kl1me.github.io/souzana/)

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Static export for GitHub Pages

## Content areas

- Home page with hero, practice preview, team introduction, and call-to-action sections
- Practice areas
- Team
- Insights with individual article pages
- Media appearances
- Contact and privacy pages

## Project structure

- `app/`: routes, metadata, and page composition
- `components/`: layout, sections, forms, and UI primitives
- `lib/content.ts`: centralized site copy and structured content
- `public/`: images and static assets

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages build

```bash
npm ci
GITHUB_PAGES=true npm run build
```
