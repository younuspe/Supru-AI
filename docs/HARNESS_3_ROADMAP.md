# Harness 3 Product & Architecture Roadmap

> **Status:** product direction, not a promise that every item below will ship exactly as written.
>
> Execution is tracked in [roadmap issue #133](https://github.com/giuliastro/harness-remote/issues/133). Issues and PRs are canonical for implementation scope; this document is canonical for product direction and sequencing rationale.

## 1. Vision

Harness Remote started as a companion for controlling coding agents away from the primary workstation. Remote control remains useful, but it is no longer a sufficient product identity.

Harness should evolve into a **local-first control plane for running AI coding work across the user's machines**.

Codex, Claude Code, OpenCode, OMP, PI and future ACP-compatible agents remain execution engines. Harness owns the workflow above them:

- machines;
- projects and repositories;
- available agents and capabilities;
- tasks, runs and workspaces;
- human attention;
- results and Git lifecycle.

The target hierarchy is:

```text
fleet → machine → project → task → agent run → backend
```

A representative end state is:

```text
3 machines
5 projects
8 active agent runs
2 need attention
```

## 2. Positioning

Vendor-native products will provide excellent experiences for their own agents. Generic multi-agent orchestration is also an established category.

Therefore neither of these is enough by itself:

> use your coding agent from your phone

> one control plane for all coding agents

The sharper proposition is:

> **Run and supervise AI coding work across your machines, from anywhere, while execution and credentials stay on them.**

Remote access becomes a capability of the control plane rather than the category definition.

## 3. Market decision — August 2026

The August 2026 market review changed the sequencing materially.

Observed category facts:

- leading open orchestrators already provide multi-agent boards, worktree-per-task execution, diffs and PR flows;
- worktree isolation and parallel task execution are becoming table stakes;
- mobile orchestration already has entrants;
- vendor apps increasingly supervise concurrent long-running agents;
- ACP adoption makes “support many agents” progressively less defensible as proprietary engineering;
- leading tools reach a useful state from a single command, making setup friction disqualifying rather than cosmetic.

The strongest currently identified underserved position is **multi-machine, vendor-neutral, local-first fleet management**.

That is a wedge hypothesis, not a permanent moat and not yet a proven demand signal. Before making fleet work the largest investment, Harness should validate that a meaningful number of users actually run coding agents across multiple machines.

The compounding advantage should come from the graph Harness can build above the fleet:

> machines × projects × agents × capabilities × tasks × attention × results

## 4. Defensibility

No individual UI component is a moat. Defensibility should come from several layers compounding together.

### Agent neutrality

One workflow should survive changes in agent or vendor.

### Local-first execution

Credentials, source code and agent runtimes stay on execution machines by default.

### Machine/project/task graph

Harness should know where repositories live, which agents are available, which work is running and where results belong.

### Durable task lifecycle

The unit of value should move beyond a chat session:

```text
start → work → attention → verify → review → PR → finish
```

### Universal attention

Questions, permissions, failures and review-ready work should become normalized operational concepts rather than backend-specific UI details.

### Open protocol leverage

ACP and generic adapters should make additional agents cheaper to support. Backend compatibility is infrastructure, not the primary growth story.

## 5. Architecture direction

Evolve the existing `bridge/`; do not casually replace it with a greenfield system.

The machine primitive is the Universal Daemon:

```text
Harness clients
      │
      ▼
Fleet control
      │
      ├── Machine A daemon
      │     ├ AgentHost[codex]
      │     ├ AgentHost[claude]
      │     └ AgentHost[opencode]
      │
      ├── Machine B daemon
      │     ├ AgentHost[codex]
      │     └ AgentHost[omp]
      │
      └── later machines…
```

The daemon now provides stable machine identity, multiple agent-host representation, project/task foundations and fleet-safe ownership boundaries. Machine-scoped identifiers should continue to be designed so a second or third machine can be added without redefining the model.

## 6. Current implementation status

As of August 13, 2026:

- ✅ **#147 — One-command startup** is complete.
- ✅ **#143 — Universal Daemon** is complete as an implementation milestone. Its architecture and mechanics are well covered by tests, but a real ACP-backed harness still needs to be run end to end before heterogeneous daemon compatibility is described as validated.
- 🟡 **#145 — Create work** has most backend foundations complete: project discovery, normalized tasks, isolated worktrees, agent launch, persisted task/run linkage, restart reconciliation, safe cleanup, result inspection and explicit finish semantics. The major remaining closure gap is the task-first client UX.
- ✅ **#163 — Finish-work result and safe finalization primitives** is complete through #164.
- ⏳ Full review/tests/PR lifecycle remains ahead.
- ⏳ **#146 — Multi-machine Fleet** remains the next major differentiating product milestone after the task workflow is exposed cleanly to users and fleet demand is validated.

The important distinction is that task/worktree/finish support now exists as **backend/API capability**, but the product should not claim a complete task-first workflow until the client exposes it end to end.

## 7. Execution sequencing

The roadmap has two dependency tracks, but **not an assumption of parallel maintainer capacity**. When capacity conflicts, Product/Adoption work wins.

### Primary track — Product / Adoption

#### Completed foundation — #147 + #143

One-command startup and the Universal Daemon established the adoption/runtime base:

- low-friction startup;
- stable machine identity;
- multiple heterogeneous local agent hosts;
- isolated host health/failure;
- backward-compatible single-backend paths;
- fleet-safe machine boundaries.

The architecture/mechanics are implemented, but real heterogeneous multi-host validation still requires at least one reachable ACP-backed harness environment. Test doubles are evidence for the architecture, not proof of real harness compatibility.

#### Current — finish #145 as a product workflow

The backend loop already supports:

```text
project → task → isolated worktree → agent → run → result → finish
```

The immediate product gap is exposing that loop cleanly in the client:

- choose a known project;
- enter a task;
- choose an agent;
- prepare/start the isolated task;
- open the resulting run/session;
- inspect the result and finish safely.

Several tasks should eventually be usable concurrently in separate worktrees. Explicit agent selection is enough initially. `Auto` routing remains later.

#### Finish-work expansion — review / tests / PR

The first backend finish primitives are complete, but the competitive loop is not:

```text
run → diff → tests/checks → review → PR → CI visibility → finish
```

Next slices should add these incrementally without coupling the core task model to one forge too early.

#### Later — Multi-machine Fleet (#146)

Before implementation becomes the largest roadmap investment, validate demand cheaply with existing users/contributors:

- do they run coding agents on more than one machine?
- which combinations: workstation/laptop/server/VM?
- would one control surface materially change their workflow?

If demand is validated, Harness should aggregate multiple machine daemons while keeping code and credentials local.

Initial placement can be explicit:

```text
Task       Fix issue #200
Machine    Workstation
Agent      Codex
Workspace  New worktree
```

Automatic machine selection comes later.

#### Later — Coordinate

Only after task/fleet fundamentals are reliable:

- `Auto` agent selection;
- `Auto` machine selection;
- availability/capability/cost/rate-limit/workload-aware routing;
- parallel implementation/review patterns;
- optional E2E relay/self-hosted relay;
- later team/RBAC/audit surfaces.

### Secondary track — Attention

Completed foundations:

- #130 — session UI extraction;
- #131 — normalized `AgentRun`.

Current dependency chain:

```text
#141 Track A mechanics → #142 Attention Plane → #132 Inbox component
#141 Track B real-harness compatibility → backend-specific ACP permission policy
```

#### #141 Track A

Implement hold/expose/answer mechanics using controlled ACP doubles.

The duration contract must remain **parameterized**:

- configurable deadline;
- pluggable expiry/fallback policy;
- reconnect behavior;
- no duplicate/resurrected requests.

Track A proves mechanics, not that real agents can wait indefinitely.

#### #141 Track B

When real ACP-backed environments are reachable, measure Codex, Claude Code, OMP and PI behavior and produce per-backend GO/PARTIAL/NO-GO results.

#### #142 Attention Plane

Build persistent, event-first, backend-neutral attention state. It may proceed without the full Track B matrix; only backend-specific deferred-permission policy remains gated on real evidence.

#### #132 Agent Inbox

The Inbox can ship as a component after #142 for the active connection. It should not become the main product story merely because it exists.

Once daemon/task/fleet work creates meaningful concurrent activity, the same mobile-friendly ordered list can become a strong fleet-level “Needs You” surface.

## 8. Zero-config principles

Setup is part of the product.

- the shortest path should be obvious and measured;
- the user should not need to understand one host/port/server process per backend;
- non-loopback exposure must remain authenticated;
- agent/provider credentials must never be printed or centralized;
- unusual environments retain explicit advanced overrides;
- future pairing should simplify authentication without weakening it.

## 9. Security principles

- credentials remain on execution machines;
- source code does not need to be centralized;
- filesystem roots stay explicit;
- no unauthenticated non-loopback exposure;
- machine identity/pairing must preserve or strengthen authentication;
- deferred permissions ship only where real protocol evidence supports them;
- future relay design should not require plaintext access to source, prompts or output;
- LAN/VPN/self-hosted paths remain valid.

## 10. What not to optimize for

Do not prioritize:

- raw harness count as a growth metric;
- another generic kanban board;
- worktrees marketed as unique differentiation;
- a polished Inbox built on incomplete attention data;
- smart routing before reliable task launch;
- a hosted cloud backend before local value is excellent;
- a greenfield rewrite without implementation evidence;
- multi-machine implementation before demand is validated.

## 11. Validation gates

The roadmap should remain falsifiable.

Before the multi-agent daemon is described as validated:

- run at least one real ACP-backed harness end to end against it. Test doubles validate architecture and mechanics; they are not evidence of real harness compatibility.

Before #146 becomes the largest build:

- validate real multi-machine demand.

Before backend-specific deferred permission behavior ships:

- validate deferred approval behavior against real ACP-backed harness environments rather than only test doubles.

Before hosted relay or automatic routing:

- prove that users value the local task/fleet graph enough for routing/connectivity to compound rather than distract.

## 12. Current priority order

Status lives in §6; this section expresses ordering only.

```text
PRIMARY
#147  One-command startup
  ↓
#143  Universal Daemon
  ↓
#145  Expose task launch + worktree + result/finish as an end-to-end client workflow
  ↓
       Diff / tests / review / PR / CI lifecycle
  ↓
#146  Multi-machine Fleet (after demand validation)
  ↓
       Auto machine + agent routing / orchestration

SECONDARY / NON-BLOCKING
#141 Track A → #142 → #132
#141 Track B ─────────→ ACP permission policy
```

## 13. Success test

Harness is succeeding when users describe it as **the place they run and manage agent work**, not merely the app they use to remote into one coding session.

The strongest product test is not whether Harness supports the most agents. It is whether one workflow remains useful as the user changes agents, projects and machines while local execution stays under their control.
