# agentech.dev

## Overview

This is the site of agentech, a company that builds tools for agents and their teams. It is a static site generated with Astro from markdown files in `src/content/`. There is no client-side JavaScript. Every HTML page has a markdown counterpart produced from the exact same source.

## Installation

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
```

## Configuration

- `astro.config.mjs` — site URL, trailing-slash and build format settings.
- `wrangler.toml` — Cloudflare Workers deployment: worker entrypoint and the `dist/` assets binding.
- `worker/index.ts` — request pipeline: markdown mirrors, AI-bot variants, security headers.
- `src/content.config.ts` — content collection schemas (`title`, `date` for blog posts, optional `description`).

## Usage

```sh
pnpm run dev      # local dev server
pnpm run build    # static build to dist/
pnpm run check    # type checking
pnpm run deploy   # build and deploy to Cloudflare Workers
```

Example: get any page as markdown.

```sh
curl -H "Accept: text/markdown" https://agentech.dev/surfaced
```

## Site map

- `/` — home, with an index of all pages
- `/surfaced` — our first product
- `/surfaced/docs` — product documentation
- `/blog` — blog index
- `/llms.txt` — curated context file listing every page
- `/llms-full.txt` — full text of every page in one document
- `/sitemap.md` — machine-readable sitemap in markdown
- `/sitemap.xml` — sitemap in XML
- `/feed.xml` — Atom feed of the blog

## Markdown mirrors

Every page URL serves HTML by default. To get the markdown that the page was built from:

- append `.md` to any page path (for example `/surfaced.md`),
- or send `Accept: text/markdown` and the server returns the markdown directly.

Known AI crawlers are served agent-oriented `.ai.md` variants when present.

## Conventions

- All content lives in `src/content/pages/` and `src/content/blog/` as markdown with frontmatter (`title`, `date` for blog posts, optional `description`).
- Pages render through `src/layouts/Base.astro`; keep markup semantic and free of scripts.
- Styling is one small stylesheet, `src/styles/global.css`.
