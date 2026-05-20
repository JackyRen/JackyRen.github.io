---
title: Keeping Hermes Kanban under 1GB with offloaded workers
description: A practical note on keeping the central Hermes thread light while worker teams handle builds, browser checks, OCR, and reviewable handoffs through Kanban cards.
pubDate: 2026-05-20
tags: [Hermes, Kanban, Agent, Infrastructure]
lang: en
originalLang: zh
translationOf: zh/hermes-kanban-offload-under-1gb
canonicalId: hermes-kanban-offload-under-1gb
---

I recently hit an annoying limit in my Hermes agent workflow: one agent can get pinned by long-running work too easily. A site change, browser test, OCR pass, CI wait, or dependency issue can turn into dozens of tool calls and keep one thread pending for ten minutes, sometimes close to an hour. Memory, cost, and attention all get tied up at once.

Then I tried Hermes Kanban, and the model clicked for me. The central Hermes no longer has to do every heavy task itself. It can act more like a lightweight boss: split work, watch state, and review the result. CPU, IO, browser, and document-heavy tasks go to worker teams on other nodes. The workers do not need to be exotic machines. A spare laptop can be useful.

The result is plain but useful: the central orchestration side stays in the sub-1GB memory range for long-running use, and long tasks no longer keep the main conversation thread stuck in pending state.

## The problem: one agent should not carry everything

At first I also asked one session to finish the whole chain: edit code, install dependencies, run the build, inspect errors, fix them, and submit the change. That feels great for small jobs. Once the work gets longer, the weak spots show up:

- the main session is occupied while everything waits;
- builds, browsers, and OCR can create large resource spikes;
- when something fails halfway through, state is scattered across chat history and temporary output;
- with several tasks running at once, it is hard to tell who is doing what, where things are blocked, and whether a retry is safe.

What I wanted was closer to a small engineering crew. The boss assigns work instead of doing all the manual labor. Workers return evidence when they finish. If something fails, the card says why and where the next attempt should resume.

## The shape: central Hermes, Kanban, and offload teams

The current setup looks roughly like this:

<figure class="offload-diagram" style="margin: 1.5rem 0; padding: 1rem; border-radius: 18px; background: #0f172a; border: 1px solid rgba(148,163,184,.35); overflow: hidden;">
  <svg role="img" aria-label="Hermes Kanban offload architecture" viewBox="0 0 760 430" width="100%" style="display:block; max-width: 760px; height: auto; margin: 0 auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#cbd5e1"/></marker>
      <marker id="arrow-soft" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#94a3b8"/></marker>
    </defs>
    <rect x="1" y="1" width="758" height="428" rx="18" fill="#0f172a"/>
    <rect x="230" y="24" width="300" height="82" rx="14" fill="#111827" stroke="#38bdf8" stroke-width="2"/>
<text x="248" y="52" fill="#e5edf7" font-size="16" font-weight="700">Central Hermes</text>
<text x="248" y="74" fill="#e5edf7" font-size="13" font-weight="500">lightweight boss</text>
<text x="248" y="96" fill="#e5edf7" font-size="13" font-weight="500">plan / dispatch / review</text>
    <line x1="380" y1="106" x2="380" y2="148" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <text x="398" y="134" fill="#cbd5e1" font-size="13">dispatch</text>
    <rect x="230" y="155" width="300" height="88" rx="14" fill="#111827" stroke="#a78bfa" stroke-width="2"/>
<text x="248" y="183" fill="#e5edf7" font-size="16" font-weight="700">Kanban cards</text>
<text x="248" y="205" fill="#e5edf7" font-size="13" font-weight="500">durable task state</text>
<text x="248" y="227" fill="#e5edf7" font-size="13" font-weight="500">deps / retries / blockers</text>
    <path d="M380 243 L380 257 L135 257 L135 272" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <path d="M380 243 L380 272" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <path d="M380 243 L380 257 L625 257 L625 272" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)"/>
    <rect x="35" y="275" width="200" height="82" rx="14" fill="#111827" stroke="#93c5fd" stroke-width="2"/>
<text x="53" y="303" fill="#e5edf7" font-size="16" font-weight="700">blog worker</text>
<text x="53" y="325" fill="#e5edf7" font-size="13" font-weight="500">blog / ops / PR</text>
<rect x="280" y="275" width="200" height="82" rx="14" fill="#111827" stroke="#93c5fd" stroke-width="2"/>
<text x="298" y="303" fill="#e5edf7" font-size="16" font-weight="700">frontend worker</text>
<text x="298" y="325" fill="#e5edf7" font-size="13" font-weight="500">React / browser checks</text>
<rect x="525" y="275" width="200" height="82" rx="14" fill="#111827" stroke="#93c5fd" stroke-width="2"/>
<text x="543" y="303" fill="#e5edf7" font-size="16" font-weight="700">document worker</text>
<text x="543" y="325" fill="#e5edf7" font-size="13" font-weight="500">OCR / document pipeline</text>
    <path d="M135 357 C135 398 625 398 625 357" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#arrow-soft)"/>
    <text x="304" y="407" fill="#94a3b8" font-size="13">evidence back</text>
  </svg>
  <figcaption style="margin-top: .75rem; color: #64748b; font-size: .9rem; text-align: center;">Central Hermes handles orchestration and review; Kanban keeps durable task state; worker teams run the heavy work and return evidence.</figcaption>
</figure>

The central Hermes has a light job: write the goal into a Kanban card, draft acceptance criteria, split parent and child dependencies when needed, then wait for workers to report back. The card is durable state, not a few lines buried in a temporary chat window. The task body, comments, run history, block reasons, completion handoff, and follow-up dependencies all live there.

This changes the feel immediately. Long tasks no longer require the central thread to stay pending. Once the central Hermes sends the work out, it can handle other things. A worker runs the build, test, or deployment check on its own node, then writes the evidence back to the card.

## An offload node is not a remote shell

When I say offload node, I do not mean "the central agent connects to another machine and runs a few commands." Each node has its own Hermes runtime, local Kanban dispatcher, profile, workspace, and logs.

For a blog worker, for example, the worker runs from its own local Hermes environment and receives tasks through a user-level dispatcher service. During review I check execution evidence such as a local terminal environment marker, so I can tell the work ran on the offload node itself rather than being wrapped as a remote command from the central machine.

That distinction matters to me. Blog edits, Node builds, browser demos, and OCR document processing should consume the worker node's CPU, disk, network, and dependency environment. The central Hermes keeps orchestration and review context. It should not inherit the whole runtime burden.

Right now I split workers by capability. Publicly, these are just role-based lanes, not real machine names:

- blog worker: blog changes, maintenance, app-node operations, and deployment verification;
- frontend worker: React work, browser demos, and front-end interaction checks;
- document worker: OCR, PDFs, scans, and document pipelines.

That is much easier to maintain than stuffing every job into one universal agent. Each worker profile can have its own tools, dependencies, credential boundary, and operating habits.

## Why not just add more memory?

Adding memory does not end the problem. Some tasks, such as compiling a large project, may need a lot of memory for a short burst. Offload is the natural fit for that kind of work.

I also wanted to see how far a small always-on VPS could go as the long-lived Hermes coordinator. If the central Hermes only handles the task graph, card state, and small decisions, it should not spike because one build, Playwright run, or OCR pipeline got heavy. The thinner the central layer, the better it is as a resident process. The more independent the workers are, the easier they are to scale, fail, and retry by task.

This changed how I think about agent cost. I used to ask, "Can this agent finish everything?" Now I care more about a different question: "Can this system split the work correctly, route it to the right node, and leave enough evidence to review?"

## Kanban cards hold engineering state

The most useful part of Hermes Kanban is that it turns agent work into reviewable engineering state.

A card can contain the goal, draft acceptance criteria, workspace, claimant, parent/child dependencies, maximum runtime, retry limits, blockers, changed files, commands, build result, and PR URL.

That means I do not have to reconstruct "what did the agent do?" from chat history. For a blog task, the worker should be able to report which Markdown file changed, which branch it used, what build it ran, which commit it produced, and whether it opened a PR. If the change needs human review, it should block with `review-required` instead of pretending the work is done.

One lesson surprised me: do not make acceptance criteria too rigid. The central node sometimes fills in details from profile preferences, memory, and surrounding context. That can be convenient, but it can also blur the line between what I actually asked for and what the system inferred as a strict rule. I now prefer to treat those criteria as a draft. Workers leave evidence; a human reviewer can loosen, correct, or delete clauses that do not matter.

Parent/child dependencies are just as important. The central Hermes can create several parallel research or implementation tasks, then create a synthesis task that depends on them. Child tasks only become ready after their parents finish. Agent collaboration starts to feel like a small CI/task system rather than a handful of unrelated conversations.

## How Kanban changes the feel

I later compared this against one week of Hermes history. The sample covered 3 profiles, 2,607 sessions, 47,292 messages, and 20,217 tool calls. In 285 sessions, the user interrupted more than three times. In 690 cases, the user replied to the agent or a tool result again within two minutes.

The most tiring part was permission review churn. The same kinds of commands kept getting marked as potentially dangerous, even when they were safe in the immediate context, so a human had to confirm, allow, and confirm again. One prompt is fine. Repeated prompts chop attention into pieces.

Bad notification settings can add noise too, especially when low-value automation events get pushed to a human. But that is not the same as saying every short session means human interruption. Kanban is aimed at a boundary problem: safe small steps should stay inside the worker's boundary; decisions that need a human should become clear block reasons.

After moving work into Kanban, I am not trying to make agents stop asking questions forever. I want them to separate "ask" from "do not ask":

- Without Kanban, state lives in the chat. After an interruption, someone has to reread the thread, remember the goal, and work out which commands already ran.
- With Kanban, state lives on the card. The task body, workspace, run, block reason, comments, and handoff are in one place.
- Without Kanban, long tasks keep the main thread pending. The human and central agent both wait through builds, browser runs, OCR, or CI.
- With Kanban, long tasks move to worker nodes. The central Hermes watches card state and review evidence, then continues with other work.
- Without Kanban, permission prompts and safety boundaries mix into the main conversation. Safe commands may still ask for repeated approval, while genuinely dangerous actions can get lost in the noise.
- With Kanban, workers execute inside defined boundaries. They block only for credentials, publication, irreversible operations, or product judgment, and they write down the decision needed.
- Without Kanban, parallel work becomes several chat threads.
- With Kanban, parent/child dependencies and assignees turn parallel work into a task graph. You can see who is working, who is blocked, and who has finished.

This blog workflow was a small example. The local Kanban board had only six cards, but it already showed three completed cards, one parent/child dependency, nine comments, and a clear blocked/unblocked flow. The first article card delivered a branch, commit, build, and PR. The comparison section blocked once because a redacted baseline export was in the wrong place, then resumed after a sanitized usage export was available. In chat, that would easily become "where were we stuck again?" In Kanban, it is recoverable engineering history.

So my take is not "Kanban makes agents smarter." It makes agent work less draining for the human. The old flow became tiring when long pending tasks and permission review churn piled up together. The new flow moves long work to workers, puts safety boundaries up front, turns rare human decisions into clear block reasons, and makes completed work a handoff.

## A few things I learned

First, the central agent should do less. The more it behaves like a project manager, the steadier the system feels. The more it behaves like a full-time worker, the easier it is to pin down with long tasks.

Second, worker handoffs have to be specific. "Done" is not evidence. A useful handoff names commands, files, paths, verification results, and risks. Code changes should usually go through a branch and PR, so review becomes part of the process.

Third, offload nodes should prove the work ran locally. Local terminal evidence, a local Hermes environment, and a dispatcher service sound like small details, but they keep the architecture from sliding back into fake distribution where the central machine is still carrying the work.

Fourth, failure needs somewhere to land. Maximum runtime, retries, block reasons, and comment threads are not decoration. They let a long task fail without forcing someone to dig through chat logs and guess what happened.

## Closing

Hermes Kanban plus offload nodes does not feel like building a bigger agent. It feels like putting agents inside a more engineering-shaped operating model.

The central Hermes stays light and owns the task graph and review. Worker teams do the real execution. Kanban cards keep durable state. Long tasks leave the central thread, and failure or retry has a clear boundary.

For personal projects, that is already enough. A sub-1GB central coordinator plus role-based offload nodes can move blog work, front-end demos, OCR, and deployment verification forward at the same time. I am no longer the tired bottleneck buried under notifications.
