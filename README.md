# Souzana Klimentidi Law Office Website

Professional website for Klimentidi – Tsilivaraki & Associates, a law firm based in Kalamata and Athens. The project presents practice areas, team profiles, legal insights, and media appearances in a Greek-language experience.

## Live site

- [GitHub Pages](https://kl1me.github.io/souzana/)

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Static export for GitHub Pages

## Content areas

- Home page with hero, practice preview, and team introduction
- Practice areas
- Team
- Insights with individual article pages
- Media appearances

## Project structure

- `app/`: routes, metadata, and page composition
- `components/`: layout, sections, and UI primitives
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
