# Installed & Recommended Agent Skills

## Installed

| Skill | Source | Purpose |
|-------|--------|---------|
| `matrixscan-batch-web` | scandit/skills | Barcode scanning integration guide (Scandit SDK) |

## Recommended Installations

### High Priority
```bash
npx skills add addyosmani/agent-skills -g -y
```
Contains 25 production-grade engineering skills including:
- `frontend-ui-engineering` — Component architecture, design systems, WCAG 2.1 AA
- `security-and-hardening` — OWASP Top 10, auth patterns, secrets management
- `performance-optimization` — Core Web Vitals, bundle analysis, anti-patterns
- `code-review-and-quality` — Five-axis review, change sizing
- `test-driven-development` — Red-green-refactor, test pyramid
- `shipping-and-launch` — Pre-launch checklists, staged rollouts

### Medium Priority
```bash
npx skills add mattpocock/skills -g -y
```
Contains practical engineering skills:
- `grill-me` — Relentless interview about plan/design before coding
- `tdd` — Test-driven development with red-green-refactor
- `diagnosing-bugs` — Disciplined debugging loop
- `improve-codebase-architecture` — Scan for deepening opportunities
- `code-review` — Two-axis review (standards + spec)

### For This Project
```bash
npx skills add mvanhorn/last30days-skill -g -y
```
Research skill for finding latest patterns, library comparisons, and community consensus on barcode scanning, POS UX, etc.

## Skills Already Available in This Repo

| Skill | Location | Purpose |
|-------|----------|---------|
| `audit` | .agents/skills/audit/ | Technical quality checks |
| `audit-website` | .agents/skills/audit-website/ | Website health audit |
| `frontend-design` | .agents/skills/frontend-design/ | Production-grade frontend |
| `webapp-testing` | .agents/skills/webapp-testing/ | Playwright testing |
| `deploy-to-vercel` | .agents/skills/deploy-to-vercel/ | Vercel deployment |
| `git-commit` | .agents/skills/git-commit/ | Conventional commits |

## Usage

These skills are invoked automatically when relevant tasks come up, or manually:
- `/audit` — Run full technical audit
- `/frontend-design` — Get design guidance for new components
- `/webapp-testing` — Set up Playwright E2E tests
- `/deploy-to-vercel` — Deploy to production
