# Tooling decisions

What is wired in, what was declined, and why. A tool that is installed but not
understood is worse than no tool, because it produces output nobody reads.

---

## Adopted

| Tool | Where | What it actually catches |
|---|---|---|
| **ESLint** (`max-lines`, `jsx-a11y`) | `npm run lint` | File-size drift, accessibility mistakes at the JSX level |
| **TypeScript** | `npm run typecheck` | Missing translation keys, wrong RPC arities, dead branches |
| **Vitest** + Testing Library | `npm test`, 134 tests | Logic, component contracts, the queue/reject decision |
| **Playwright** + **axe-core** | `npm run gate:e2e`, 20 tests | Real DOM, both themes, RTL, WCAG 2.2 AA |
| **knip** | `npm run knip` | Dead files, unused deps. Found `StatCard.tsx` dead after MetricCard replaced it |
| **gitleaks** | CI | Secret in any commit, not just the working tree |
| **Semgrep** | CI + `npm run security:semgrep` | Generic classes plus **our own invariants** — see below |
| **Trivy** | CI | Vulnerabilities, secrets, and **misconfiguration** in `vercel.json` and the workflows |
| **Lighthouse CI** | `npm run lighthouse` | Perf/a11y/best-practices/SEO budgets |
| **k6** | `npm run load:test` | Latency under 10 concurrent users and a 50-VU spike |
| **Dependabot** | `.github/dependabot.yml` | Grouped weekly bumps |

### Semgrep carries our invariants, not just generic rules

The registry rulesets are the boring half. The custom rules in `.semgrep.yml`
encode things only this project knows:

- no client write to `current_stock` or `balance`
- no `dangerouslySetInnerHTML`
- no `eval` / `Function` (the shipping CSP forbids them anyway)
- no `service_role`-shaped token in the bundle
- no translated label baked onto a data structure in `src/lib/`

**These were tested against deliberate violations before being trusted.** That
mattered: two of the five rules had a parse error and were being *silently skipped*
while the scan reported success — a rule that does nothing while looking like it
works is worse than no rule. Both failures were the same cause: an object-literal
pattern such as `update({..., current_stock: $V, ...})` does not parse in Semgrep.
They now match the call and inspect the argument text with `metavariable-regex`.

The fixture used to prove them was deleted after the check; the rules are verified
by the fact that they were seen to fire, not by the fact that they look correct.

### Measured results

| Metric | Result |
|---|---|
| Lighthouse performance | 100 (login, signup, privacy) |
| Lighthouse accessibility | 100 |
| Lighthouse best-practices | 100 |
| Lighthouse SEO | 91 |
| k6 p95 latency, 50-VU spike | ~28 ms against a 2000 ms budget |
| k6 failure rate | 0 % |
| Semgrep | 0 findings across 82 rules, 160 files |

---

## Declined

### Cypress

**Redundant.** Playwright already covers E2E and axe, is already wired into CI,
and is already the browser that `.lighthouseci` needs. Running two E2E frameworks
means two suites, two browsers to install, and two places a test can be added —
for identical coverage. If there were a Cypress-specific capability the project
needed, that would be a reason; there is not.

### ZAP as a gate

**Added, but scheduled and non-blocking.** `.github/workflows/security-scan.yml`
runs a baseline scan weekly. It is not on pull requests because it needs a live
URL and takes minutes, and a security job that slows every commit is a security job
that gets skipped. `fail_action` is `false` until `.zap/rules.tsv` can be tuned
from a real report; guessing the suppress list in advance would either hide
something real or leave the job permanently red.

### Trivy for container images

**Nothing to scan.** The deployable artefact is static files on Vercel. `misconfig`
against `vercel.json` and the workflow files is the useful scanner here, and that
is what `trivy.yaml` enables.

### Context7 / agent-skill registries

An MCP/docs-retrieval concern, not a codebase change. Nothing to commit.

### Sentry

Already a dependency and already wired in `main.tsx` and `ErrorBoundary`.
`VITE_SENTRY_DSN` is empty, so it is inert. Set the DSN to turn it on; remove the
dependency if you would rather not.

---

## The design-resource list: a direct conflict

Ten component/design resources were suggested. Nine of them conflict with the
design system that was explicitly requested in the previous instruction, so this is
worth stating rather than quietly doing half of both.

The system being applied says, in its own header:

> Design thesis: Analysts scan numbers faster than words; the interface must vanish
> behind the data.
> **What it rejects: Decorative dashboards with inflated padding and unnecessary
> gradients.**

The suggested resources are, in the main, the opposite tradition:

| Resource | Character |
|---|---|
| Aceternity UI | Animated gradients, glow, 3D cards, spotlight effects |
| ReactBits | Animated text, animated backgrounds, cursor effects |
| threeui | WebGL / 3D components |
| SmoothUI | Elaborate motion primitives |
| amicro | Micro-interaction button gallery |
| Morphicons | Animated icon set |
| 21st.dev, Inspora, bestdesignsonx, bencho | Component marketplaces and inspiration directories |

Adopting those visuals would mean the design system is no longer the design system.
Two mutually exclusive visual languages cannot both be "applied to the whole
platform".

**What was taken:** the one idea that composes rather than conflicts — motion is
already tokenised (`--ease-snappy`, `--ease-spring`, `--dur-*`) and buttons already
have a press response (`active:scale-[.98]`). That is the useful part of the
micro-interaction galleries, without the gradient/glow layer they wrap it in.

**What was not:** gradients, glows, 3D, animated backgrounds, cursor effects,
scroll-jacking.

### If you want the other direction

That is a legitimate product decision, but it should be made explicitly, because it
means replacing `docs/DESIGN-SYSTEM.md` rather than adding to it. Say the word and:

1. Pick the system (Aceternity and ReactBits are the strongest of the list).
2. Rewrite the token layer in `src/index.css` — colours, radius, elevation, motion.
3. Update `docs/DESIGN-SYSTEM.md` to record the new thesis and what it rejects.
4. Re-run `npm run gate:all`. The axe suite will hold the accessibility line
   through the change, which is the main risk with animated component libraries.

Until then, mixing them would produce exactly the outcome the current system was
chosen to avoid: a back office that is decorative where it should be dense.
