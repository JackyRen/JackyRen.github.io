# JackyRen.github.io

A fast bilingual personal site and blog for Jacky Ren, built with Astro and deployed as a GitHub Pages user site.

- Root homepage: `https://jackyren.github.io/`
- Blog archive: `/blog/`
- Language-specific posts: `/blog/zh/<slug>/` and `/blog/en/<slug>/`

The blog keeps language metadata in each Markdown file so readers and maintainers can see which version is the original and which version is translated.

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by Astro, usually localhost on port 4321.

## Build and preview

```bash
npm ci
npm run build
npm run preview
```

`npm run build` runs `astro check` first, then creates the static production build in `dist/`.

## GitHub Pages deployment

This repo includes `.github/workflows/deploy.yml`, which builds the Astro site with Node 22 and deploys `dist/` to GitHub Pages whenever `main` changes. The Astro config uses:

```js
site: 'https://jackyren.github.io'
```

There is intentionally no `base: '/blog'` because this is a user site served from the domain root. Blog routes remain under `/blog/`, so the same structure can work later behind a custom domain such as `jacky.ren/blog`.

## Project structure

```text
.
├── .github/workflows/deploy.yml  # GitHub Pages deployment
├── astro.config.mjs              # Astro site configuration
├── package.json                  # npm scripts and dependencies
├── src/content.config.ts         # Typed content collection schema
├── public/                       # Static assets served as-is
├── src/
│   ├── components/               # Reusable UI components
│   ├── content/blog/             # Markdown posts grouped by language
│   │   ├── zh/
│   │   └── en/
│   ├── layouts/                  # Shared page layout
│   ├── lib/                      # Blog helpers
│   ├── pages/                    # File-based routes
│   │   ├── index.astro           # Root homepage
│   │   └── blog/                 # Blog archive and post routes
│   └── styles/                   # Global CSS
└── tsconfig.json                 # TypeScript configuration
```

## Writing bilingual posts

Add Markdown files under `src/content/blog/zh/` or `src/content/blog/en/` with frontmatter like:

```md
---
title: 我的新文章
description: 用于卡片和 metadata 的简短摘要。
pubDate: 2026-05-20
tags: [notes, projects]
lang: zh
originalLang: zh
canonicalId: my-new-post
---

正文内容。
```

For a translation, keep the same `canonicalId`, set `lang` to the translated language, keep `originalLang` as the source language, and set `translationOf` to the source content id. Example:

```md
---
title: My New Post
description: A short summary for cards and metadata.
pubDate: 2026-05-20
tags: [notes, projects]
lang: en
originalLang: zh
translationOf: zh/my-new-post
canonicalId: my-new-post
---
```
