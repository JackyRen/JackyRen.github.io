---
title: 我如何用不到 1GB 内存搭起 Hermes Kanban，并把工作 offload 到其他节点
description: 记录一次把 Hermes 中央线程做轻、把真实执行交给 Boxd offload 节点的实践：Kanban 卡片、worker profile、systemd dispatcher 与可验证交付。
date: 2026-05-20
author: Jacky Ren
keywords: [Hermes, Kanban, Agent, Infrastructure]
lang: zh
originalLang: zh
canonicalId: hermes-kanban-offload-under-1gb
sidebar:
  label: 我如何用不到 1GB 内存搭起 Hermes Kanban，并把工作 offload 到其他节点
---

<div class="article-meta">
  <span>发布日期: 2026-05-20</span>
  <span>作者: Jacky Ren</span>
  <span>关键词: Hermes、 Kanban、 Agent、 Infrastructure</span>
</div>

最近我的Hermes agent 工作流里碰到一个很烦的问题：一个 agent 很容易被长任务拖住, 常常有十几分钟，甚至1个小时的长任务，包含几十个tool use，例如改站点、跑浏览器测试、处理 OCR 文件、等 CI，都要一个线程挂在那里，内存、成本和注意力都会被一起占住。

后来我看到了hermes kanban, 感觉很有趣， 中央 Hermes 不再亲自做所有重活，只做一个轻量的 boss：拆任务、盯状态、做验收。吃 CPU、IO、浏览器和文档处理资源的活，交给其他节点上的 worker team。PS：worker哪儿来的呢，免费的一大把，就算是自己的笔记本电脑都可以

最后的结果很朴素：中央编排侧长期维持在不到 1GB 内存的量级里，长任务也不会把对话线程一直卡在 pending 状态。

## 问题：别让一个 agent 扛所有事

一开始我也会直接在一个会话里让 agent 做完所有步骤：改代码、装依赖、跑 build、查错误、再修、再提交。小任务这样很顺手。任务一长，问题就出来了：

- 会话被占住，主线程只能等；
- 构建、浏览器、OCR 这类任务会把资源峰值拉高；
- 中途失败时，状态散在聊天记录和临时输出里；
- 多个任务并行时，很难看清谁在做、卡在哪里、要不要重试。

我想要的更像一个工程队：老板不搬砖，老板派工；工人做完后交证据；失败了，卡片上能看到原因和下次该从哪里接。

## 架构：中央 Hermes + Kanban + offload teams

现在的结构大概是这样：

<figure class="offload-diagram" style="margin: 1.5rem 0; padding: 1rem; border-radius: 18px; background: #0f172a; border: 1px solid rgba(148,163,184,.35); overflow: hidden;">
  <svg role="img" aria-label="Hermes Kanban offload architecture" viewBox="0 0 760 430" width="100%" style="display:block; max-width: 760px; height: auto; margin: 0 auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#cbd5e1"/></marker>
      <marker id="arrow-soft" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#94a3b8"/></marker>
    </defs>
    <rect x="1" y="1" width="758" height="428" rx="18" fill="#0f172a"/>
    <rect x="230" y="24" width="300" height="82" rx="14" fill="#111827" stroke="#38bdf8" stroke-width="2"/>
<text x="248" y="52" fill="#e5edf7" font-size="16" font-weight="700">Central Hermes</text>
<text x="248" y="74" fill="#e5edf7" font-size="13" font-weight="500">轻量 boss</text>
<text x="248" y="96" fill="#e5edf7" font-size="13" font-weight="500">计划 / 派工 / 验收</text>
    <line x1="380" y1="106" x2="380" y2="148" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <text x="398" y="134" fill="#cbd5e1" font-size="13">dispatch</text>
    <rect x="230" y="155" width="300" height="88" rx="14" fill="#111827" stroke="#a78bfa" stroke-width="2"/>
<text x="248" y="183" fill="#e5edf7" font-size="16" font-weight="700">Kanban cards</text>
<text x="248" y="205" fill="#e5edf7" font-size="13" font-weight="500">durable task state</text>
<text x="248" y="227" fill="#e5edf7" font-size="13" font-weight="500">依赖 / 重试 / block reason</text>
    <path d="M380 243 L380 257 L135 257 L135 272" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <path d="M380 243 L380 272" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <path d="M380 243 L380 257 L625 257 L625 272" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <rect x="35" y="275" width="200" height="82" rx="14" fill="#111827" stroke="#93c5fd" stroke-width="2"/>
<text x="53" y="303" fill="#e5edf7" font-size="16" font-weight="700">blog worker</text>
<text x="53" y="325" fill="#e5edf7" font-size="13" font-weight="500">博客 / 运维 / PR</text>
<rect x="280" y="275" width="200" height="82" rx="14" fill="#111827" stroke="#93c5fd" stroke-width="2"/>
<text x="298" y="303" fill="#e5edf7" font-size="16" font-weight="700">frontend worker</text>
<text x="298" y="325" fill="#e5edf7" font-size="13" font-weight="500">React / 浏览器验证</text>
<rect x="525" y="275" width="200" height="82" rx="14" fill="#111827" stroke="#93c5fd" stroke-width="2"/>
<text x="543" y="303" fill="#e5edf7" font-size="16" font-weight="700">document worker</text>
<text x="543" y="325" fill="#e5edf7" font-size="13" font-weight="500">OCR / 文档流水线</text>
    <path d="M135 357 C135 398 625 398 625 357" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#arrow-soft)"/>
    <text x="304" y="407" fill="#94a3b8" font-size="13">evidence back</text>
  </svg>
  <figcaption style="margin-top: .75rem; color: #64748b; font-size: .9rem; text-align: center;">中央 Hermes 只负责编排和验收；Kanban 保存任务状态；worker team 在各自节点上执行并回传证据。</figcaption>
</figure>

中央 Hermes 的职责很轻：把目标写成 Kanban card，草拟验收标准，必要时拆出 parent/child 依赖，然后等 worker 回传结果。卡片是 durable state，不是临时聊天窗口里的几行字。任务正文、评论、运行记录、block 原因、完成 handoff 和后续依赖都在里面。

这个变化很直接。长任务不再要求中央线程一直 pending。中央把工作派出去后，可以继续处理别的事；worker 在自己的节点上完成构建、测试或部署验证，再把证据写回卡片。

## offload 节点不是远程 shell

我这里说的 offload 节点，不是“中央 agent ssh 过去跑几条命令”。每个节点都有自己的 Hermes runtime、本地 Kanban dispatcher、profile、workspace 和日志。

拿博客节点来说，worker 使用自己的本地 Hermes home，通过 user systemd 的 `hermes-kanban-dispatcher.service` 持续接任务。验收时我会看 `TERMINAL_ENV=local` 这类运行证据，确认任务是在 offload 主机本地执行，而不是中央机器包装出来的远程步骤。

这点对我很重要。博客修改、Node build、浏览器 demo、OCR 文档处理，消耗的是 worker 节点的 CPU、磁盘、网络和依赖环境。中央 Hermes 只保留编排和验收上下文，不把所有运行时负担揽到自己身上。

目前我按能力拆了几个 worker lane。对外只需要理解成能力分组，不需要暴露真实域名或主机名：

- blog worker：博客修改、维护、app-node 操作、部署验证；
- frontend worker：React、浏览器 demo、前端交互验证；
- document worker：OCR、PDF、扫描件和文档流水线。

这比“所有任务都塞给一个万能 agent”好维护得多。每个 worker profile 可以有自己的工具、依赖、凭据边界和运行习惯。

## 为什么不直接加内存

首先加内存是没有止境的，比如编译一个软件需要的内存非常大，但仅仅是运行一小会儿，所以offload是必然的。

既然我拿了一个内存不大的VPS来长期运行hermes，就试试看它的极限在哪里。

作为一个长期在线的中央编排层， Hermes 只管任务图、卡片状态和少量决策，它就不该因为某个build、Playwright 浏览器或 OCR pipeline 而内存飙升。中央越薄，越适合常驻；worker 越独立，越适合按任务扩容、失败和重试。

这也改了我看 agent 成本的方式。以前我会问：“这个 agent 能不能把所有事情做完？”现在我更关心：“这个系统能不能把任务拆对，交给正确节点，并留下能验收的证据？”

## Kanban 卡片承载的是工程状态

Hermes Kanban 对我最有用的地方，是把 agent 工作变成了可复查的工程状态。

一张卡片里可以写清楚目标和验收标准草案、workspace、谁 claim 了任务、parent/child dependency、最大运行时间、retry 限制、失败时的 blocker，以及完成时的 changed files、commands、build result、PR URL。

这样一来，“agent 做了什么”不用再靠翻聊天记录还原。比如一个博客任务，worker 应该能报告：改了哪个 Markdown 文件、在哪个 branch、跑了什么 build、commit 是什么、有没有打开 PR。如果需要人工 review，它应该 block 在 `review-required`，而不是假装已经完成。

这里有个反直觉的教训：验收标准别写得太死。中央节点有时会根据 profile 偏好、memory 和上下文做合理推断，顺手补全验收细节；这很省事，但也可能把“我真正说过的话”和“系统推断出的严格要求”混在一起。所以我现在更愿意叫它验收标准草案。worker 留证据，人类 review 时可以放宽、修正，或者删掉没必要的条款。

parent/child 依赖也很关键。中央可以先创建几个并行调研或实现任务，再创建一个依赖它们的汇总任务。父任务完成后，子任务才进入 ready。这样 agent 协作更像一个小型 CI/任务系统，而不是几段互相不知道进度的对话。

## 有 Kanban 和没 Kanban，体感差在哪里

我后来拿一份1个星期的hermes的历史数据库做了对比。样本包括 3 个 profile、2,607 个 session、47,292 条 message、20,217 次工具调用，有 285 个 session 出现 3 次以上用户发言打断，690 次用户在 2 分钟内又接着回复 agent 或tooluse结果。

最累的是权限 review churn。同一类命令反复被标成潜在危险，哪怕它们在当时的上下文里其实是安全的，也需要人一次次确认、放行、再确认。单次询问没什么，重复多了就会把注意力切碎。

通知配置错了也会制造噪音，比如把不重要的自动化事件都推到人面前。但这和“短 session 等于人工打断”不是一回事。Kanban 要解决的是边界问题：能安全执行的小步骤留在 worker 的边界内，需要人判断的事情，写成明确的 block reason。

换成 Kanban 之后，我要的不是让 agent 永远不问我，而是把“该问”和“不该问”分开：

- 没有 Kanban：状态在聊天里。中断之后，要重新翻记录、回忆目标、判断哪些命令已经跑过。
- 有 Kanban：状态在卡片里。任务正文、workspace、run、block reason、comment 和 handoff 都在同一个地方。
- 没有 Kanban：长任务让主线程 pending。构建、浏览器、OCR 或 CI 等待期间，人和中央 agent 都被挂住。
- 有 Kanban：长任务被 offload 到 worker 节点。中央只看卡片状态和验收证据，可以继续处理别的事情。
- 没有 Kanban：权限确认和安全边界混在主对话里。安全命令也可能被反复要求人工放行，真正危险的操作反而淹在确认噪音里。
- 有 Kanban：worker 在明确边界内执行，遇到凭据、发布、不可逆操作或产品判断时才 block，并把需要人决定的点写清楚。
- 没有 Kanban：并行任务会变成多条聊天线索。
- 有 Kanban：parent/child dependency 和 assignee 把并行工作变成任务图。谁在做、谁卡住、谁完成了，都能查。

这次博客任务本身也是一个小例子：本地 Kanban board 上只有 6 张卡，但已经能看到 3 张完成卡、1 条 parent/child dependency、9 条评论，以及明确的 blocked/unblocked 流程。第一篇文章的 card 交付了 branch、commit、build 和 PR；这篇对比文章先因为 hard-redacted baseline export 定位错误而 block，后来拿到 sanitized usage export 后继续分析。这个过程如果只发生在聊天里，很容易变成“刚才卡在哪里来着”；放进 Kanban，它就是一条可以恢复的工程记录。

所以我现在对 Kanban 的评价不是“它让 agent 更聪明”，而是“它让 agent 的工作更不消耗人”。旧流程里累人的，是长 pending 和权限 review churn 叠在一起；新流程的目标，是把长任务交给 worker，把安全边界前置，把少数需要人判断的事情变成清楚的 block reason，完成交付则变成 handoff。

## 我学到的几件事

第一，中央 agent 要少做事。它越像项目经理，系统越稳；它越像全职工人，就越容易被长任务拖死。

第二，worker handoff 要具体。只说“完成了”没有意义；要写清楚命令、文件、路径、验证结果和风险。代码变更最好走 branch/PR，让 review 成为流程的一部分。

第三，offload 节点要证明自己是在本地执行。`TERMINAL_ENV=local`、本地 `HERMES_HOME`、systemd dispatcher 这些证据听起来琐碎，但它们能避免架构滑回“中央其实还在扛活”的假分布式。

第四，失败应该被系统接住。max-runtime、retry、blocked reason、comment thread 都不是装饰；它们让长任务失败后有地方落脚，而不是让人重新翻聊天记录猜发生了什么。

## 结尾

这套 Hermes Kanban + offload nodes 给我的感觉，不是“造了一个更大的 agent”，而是把 agent 放进了一个更像工程组织的运行环境里。

中央 Hermes 保持轻量，负责任务图和验收；Boxd 上的各个 worker team 负责真实执行；Kanban 卡片保存 durable state；长任务离开中央线程，失败和重试也有明确边界。

对个人项目来说，这已经够用了：不到 1GB 的中央编排层，加上可以按能力拆分的 offload 节点，就能让博客、前端 demo、OCR 和部署验证同时推进，我也不再是哪个被通知淹没的疲惫的瓶颈。
