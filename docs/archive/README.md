# Archive

Historical documents, kept because the reasoning is still worth reading and the
mistakes are worth not repeating. **None of this is current** — if the archive and
[PROJECT.md](../PROJECT.md) disagree, PROJECT.md is right.

These are not maintained. They are here as the paper trail.

| Document | What it was |
|---|---|
| `PRD.md` | The original product specification, written before any code |
| `PLAN.md` | The research-based execution plan |
| `lovable-prompt.md` | The build brief handed to the first implementation pass |
| `PRODUCTION-PLAN.md` | The pre-launch hardening plan |
| `STATUS.md` | An implementation audit against the PRD. Accurate when written; its counts (57 tests, migrations 00000–00006, "image upload not built") are long superseded |
| `ROADMAP-NEXT.md` | The plan for the last stretch of work, plus the six defects that work found. Complete; the summary lives in PROJECT.md |
| `LATER.md` | Parked ideas. Several have since shipped (lot history in the UI, the translated privacy policy, margins, the 250-line rule) |
| `DESIGN-stripe.md` | A design study that was not adopted |
| `ChatGPT Research.md`, `Claude Research.md`, `Preplexity Research.md` | Market and competitor research from three different models, used to shape the product |
| `audit/` | The codebase, barcode, and UX audits, and the sprint plan that came from them |

## Why keep them

Two reasons.

The first is that they explain decisions the current code cannot. `DATABASE.md`
will tell you that `product_lots` has no write policy; `AUDIT/01-CODEBASE-AUDIT.md`
will tell you what was wrong before it did.

The second is less comfortable and more useful. `STATUS.md` opens with a verdict
table of what was and was not built, explicitly listing gaps rather than hiding
them, and `ROADMAP-NEXT.md` ends with a list of defects that four rounds of code
review had missed and one run of SQL had found. A project that keeps its wrong
predictions around is easier to trust than one that only keeps the ones that
worked out.

## Reading order, if you are curious

1. `PRD.md` — what it was supposed to be
2. `audit/01-CODEBASE-AUDIT.md` — what was actually there
3. `AUDIT/03-UX-RESEARCH.md` — what the market looked like
4. `STATUS.md` — the honest gap list at that point
5. `ROADMAP-NEXT.md` — what was left, and what breaking it open revealed
