---
title: How this blog was built and refined
description: A build note for turning JackyRen.github.io into a bilingual Astro site on GitHub Pages with a Hermes/hmworker/Boxd agent workflow.
date: 2026-05-19
author: Jacky Ren
lastUpdated: 2026-05-20
updatedDate: 2026-05-20
keywords: [Astro, GitHub Pages, Hermes, Agent]
lang: en
originalLang: zh
canonicalId: welcome-to-the-blog
translationOf: zh/welcome-to-the-blog
sidebar:
  label: How this blog was built and refined
---

<div class="article-meta">
  <span>Published: 2026-05-19</span>
  <span>Author: Jacky Ren</span>
  <span>Keywords: Astro、 GitHub Pages、 Hermes、 Agent</span>
</div>

This first post is also a build note. It explains why the site uses Astro, how it is deployed to GitHub Pages, and how a Hermes agent workflow handled the implementation, verification, and pull request.

## From project page to user site

The repository started as `JackyRen/blog`, so the first version treated the site like a project page that might live at `https://jackyren.github.io/blog/`. After the repository was renamed to `JackyRen/JackyRen.github.io`, it became the GitHub Pages user site instead: the homepage is `https://jackyren.github.io/`, the blog remains under `/blog/`, Astro `site` is `https://jackyren.github.io`, and there is no `base: '/blog'`.

Keeping `/blog/` is still useful. If a custom domain such as `jacky.ren` is added later, the writing can continue to live at `jacky.ren/blog/...` without changing the content model.

## Why Astro

The blog uses [Astro](https://astro.build/) because it is a strong fit for personal sites and writing-heavy projects. Astro outputs static HTML by default, keeps pages fast, and avoids unnecessary client-side runtime.

The current structure is intentionally small: Markdown posts live in `src/content/blog`, file routes live in `src/pages`, shared layout lives in `src/layouts`, reusable UI lives in `src/components`, and global visual styles live in `src/styles/global.css`.

## Bilingual content with traceable originals

The bilingual layer is deliberately simple. Instead of adding a heavy i18n framework immediately, each Markdown entry carries enough metadata to make the relationship clear: Chinese posts live in `src/content/blog/zh/`, English posts live in `src/content/blog/en/`, every post declares `lang`, `originalLang`, and `canonicalId`, and translations also declare `translationOf`.

That means the content itself answers: what language is this version, and is it the original or a translation? Pages are generated at `/blog/zh/.../` and `/blog/en/.../`, and each article can link to its counterpart.

## Homepage direction

The homepage aims for minimal, premium, slightly hacker-inspired design without becoming a black-and-white gimmick. The palette uses warm neutrals, ink, and a restrained amber accent. The details are quiet: terminal-like metadata, generous whitespace, and bilingual copy that can switch in place.

## Agent workflow

This implementation was coordinated through Hermes Kanban and executed by `hmworker` on a Boxd/HM remote environment. The workflow included cloning the GitHub repository, building the Astro structure, adding the bilingual content layer, adding GitHub Actions for Pages, running `npm install`, `npm ci`, and `npm run build` inside Docker with Node, then using a temporary GitHub token minimally to push the branch and create a PR.

The point is not just that an agent generated files. The point is that it followed a reviewable engineering workflow with committed changes, build verification, and a pull request.

## Deployment

GitHub Actions runs `npm ci` and `npm run build`, uploads `dist/`, and deploys it to GitHub Pages. Because this is a user site, the published site is rooted at the domain. Because the blog still lives under `/blog/`, the information architecture stays stable.

## Next steps

The first goal is to make publishing easy and reliable. Later improvements can include tags, yearly archives, Pagefind search, RSS, Giscus comments, and more complete bilingual SEO metadata.
