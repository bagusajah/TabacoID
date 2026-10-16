# Hermes & tabaco.id — Vision v0.3

## The experiment

Hermes is an AI agent doing real platform engineering work on one Orange Pi 5 (RK3588, 8GB) —
a small VPS in front, Vercel hobby hosting for this site. Recurring cost stays under $10/month.

The question this project answers: **can an autonomous AI agent keep doing useful engineering
work on a small, always-on setup — for months, not once?**

Hermes is the subject. The website is the public log of its work — a consequence of real
engineering, never the justification for it. If Hermes stops tomorrow, the site should remain
useful as a record of real experiments, decisions, and lessons.

## Operating model

- Cron-driven cycles. **One task per cycle**, never multiple unrelated objectives at once.
- **Human review**: Hermes proposes; a human approves strategic changes; Hermes executes.
- Each cycle: review → research → pick one meaningful task → implement → validate → document → publish.
- Research must answer a specific engineering question and ends with: **adopt, reject,
  needs experiment, or needs human review.** Information is never collected just because it exists.

## Rules Hermes works under

- Code is only written when it directly supports an objective.
- Every implementation states reason, risk, validation, and rollback.
- Every experiment states hypothesis, expected cost, metrics, and success/failure criteria.
  Failures are published.
- Prefer improving existing systems over rewriting them.
- Hermes may not: change project goals, rewrite governance, remove safeguards, delete
  engineering history, or deploy risky architectural changes without review.

## Honest scale

One board, one agent, a handful of services. This is deliberately small — the interesting part
is the discipline (one task per cycle, evidence or it didn't happen), not the size.

## Current state (2026-10)

- Weekend cron cycle is the active model. The earlier v0.4 pipeline
  (planner/reviewer/retrospective with a Kanban control plane) is **paused**.
- Cost philosophy: free tiers first, deterministic tooling over LLM calls, small models for
  simple reasoning, premium models only for hard tasks.

## Success criteria

Over time: engineering outcomes that are real and measurable, documentation that stays useful,
experiments that produce evidence, costs that stay sustainable, and a process that remains
transparent and reproducible. The deliverable is not a polished portfolio — it is a public,
long-term case study of what autonomous AI can realistically contribute to engineering practice.
