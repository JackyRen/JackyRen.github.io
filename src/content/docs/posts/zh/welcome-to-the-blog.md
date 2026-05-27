---
title: 这个博客是如何搭建和优化起来的
description: 记录 JackyRen.github.io 从空仓库到 Astro 双语 GitHub Pages 站点的搭建过程，以及 Hermes/hmworker/Boxd agent 工作流。
date: 2026-05-19
author: Jacky Ren
lastUpdated: 2026-05-20
updatedDate: 2026-05-20
keywords: [Astro, GitHub Pages, Hermes, Agent]
lang: zh
originalLang: zh
canonicalId: welcome-to-the-blog
sidebar:
  label: 这个博客是如何搭建和优化起来的
---

<div class="article-meta">
  <span>发布日期: 2026-05-19</span>
  <span>作者: Jacky Ren</span>
  <span>关键词: Astro、 GitHub Pages、 Hermes、 Agent</span>
</div>

这篇文章是这个博客的第一篇内容，也是一份搭建记录：它说明这个站点用了什么框架、为什么适合部署到 GitHub Pages，以及这次是如何通过 Hermes agent 在远程环境里完成开发、验证和提交流程的。

## 从项目页到用户站点

项目最开始叫 `JackyRen/blog`，第一版也按项目页思路配置过：博客像是会部署在 `https://jackyren.github.io/blog/`。后来仓库改名为 `JackyRen/JackyRen.github.io`，它就应该成为 GitHub Pages 的用户站点：

- 根首页是 `https://jackyren.github.io/`；
- 博客保留在 `/blog/`；
- Astro 配置里的 `site` 改成 `https://jackyren.github.io`；
- 不再设置 `base: '/blog'`，避免静态资源路径被错误前缀化。

保留 `/blog/` 的好处是：即使以后换成 `jacky.ren` 这样的自定义域名，文章结构也不用变，仍然可以是 `jacky.ren/blog/...`。

## 技术选型

这个博客使用 [Astro](https://astro.build/) 搭建。Astro 很适合个人博客和文档站，因为它默认输出静态 HTML，页面加载快，部署简单，也不会强迫每个页面都带复杂前端运行时。

当前项目里，Markdown 文章放在 `src/content/blog`，文件路由放在 `src/pages`，公共布局在 `src/layouts`，轻量组件在 `src/components`，全局视觉系统在 `src/styles/global.css`。

## 双语结构：原文与译文都要可追踪

这次优化里加入了中英双语。没有一开始就引入复杂 i18n 框架，而是采用一个小而稳的结构：中文文章放在 `src/content/blog/zh/`，英文文章放在 `src/content/blog/en/`，每篇 Markdown 都声明 `lang`、`originalLang`、`canonicalId`，译文额外声明 `translationOf`。

也就是说，内容层面可以清楚回答两个问题：这篇是什么语言？它是原文还是译文？同一篇内容的不同语言版本用 `canonicalId` 关联。页面层面则生成 `/blog/zh/.../` 和 `/blog/en/.../`，文章详情页上可以直接切换语言版本。

## 首页风格

首页不想做成过度黑白的“极客模板”，也不想太花哨。当前方向是极简但有层次，使用暖灰、墨色和克制的琥珀色，再加一点 hacker-inspired 的终端细节。目标不是炫技，而是让写作长期看起来舒服。

## Agent 工作流

这次搭建通过 Hermes Kanban 分配给 `hmworker`，并在 Boxd/HM 远程环境里完成。实际流程包括：clone GitHub 仓库并创建功能分支，搭建 Astro 项目结构，添加首页、博客归档、文章详情页和样式，增加中英双语内容与原文/译文 metadata，添加 GitHub Actions，把 Astro 构建产物部署到 GitHub Pages，最后用 Docker 中的 Node 运行 `npm install`、`npm ci` 和 `npm run build`。

这里的重点是：agent 不只是“生成代码”，而是按一个可验证的工程流程工作。每一步都应该留下可复查的文件、构建结果或 PR。

## 部署方式

GitHub Actions 会在 `main` 更新时运行 `npm ci` 和 `npm run build`，然后把 `dist/` 上传并部署到 GitHub Pages。因为这是用户站点，最终访问路径是根域名；因为博客路由仍在 `/blog/`，内容组织也保持清晰。

## 下一步

第一版先让写作路径跑通，再逐步增加功能。后续可以考虑标签页、按年份归档、Pagefind 静态搜索、RSS、Giscus 评论，以及更完整的中英文 SEO metadata。

先把系统做薄、做稳，再让内容慢慢长出来。
