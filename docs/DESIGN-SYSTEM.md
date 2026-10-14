# Design system adoption

Source: `01-saas-analytics` (Steel Blue & Teal, Reference Build 01), applied from
`design-systems/systems/01-saas-analytics/`. This file records **what was applied,
what was deliberately not, and what was found to be wrong in the source.**

---

## 1. Applied

### Tokens

| Token group | Where | Notes |
|---|---|---|
| Colour | `src/index.css` | Full set, dark `:root` and `[data-theme="light"]` |
| Radius (2/4/6/8/12/16) | `tailwind.config.js` | **Replaces** the scale, not extends — see §3 |
| Spacing (8pt linear) | Tailwind default | 4/8/12/16/24/32, already correct |
| Elevation | `tailwind.config.js` | Themed via `--shadow-*` |
| Motion | `tailwind.config.js` + `src/index.css` | `ease-snappy`/`smooth`/`spring`, `duration-fast`/`med`/`slow` |
| Typography | `tailwind.config.js`, `index.html` | Inter + JetBrains Mono, 14px base, 1.4 line-height |

Recolouring was **not** done. The system's own step 2 says to change `--primary`,
`--secondary`, `--tertiary`, `--quaternary` and `--positive`; Managiha keeps the
steel-blue/teal identity because it has no brand palette of its own yet. When one
exists, those five values in both theme blocks are the only edit.

### Theming

Dark is the default, per the system. Light is the `[data-theme="light"]` variant.
Switching is pure CSS: one attribute on `<html>`, zero JavaScript involved in
painting. That is the system's own Token Layer rule.

An inline script in `index.html` applies the stored choice before first paint.
It is the one piece of theming JavaScript this needs, and it must be inline and
synchronous: anything deferred runs after the first frame, so a user who chose
light sees a dark flash on every load.

### Signature components

| Component | File | Notes |
|---|---|---|
| Metric Card | `src/components/ui/MetricCard.tsx` | delta + sparkline + tabular-nums |
| Sparkline | `src/components/ui/Sparkline.tsx` | bars, not a line — see §4 |
| Skeleton / Skeleton Grid | `src/components/ui/Spinner.tsx` | shimmer, from `index.css` |
| Chips | `src/components/ui/Chip.tsx` | `Chip` + `ChipGroup`; used for the two closed-set product filters |
| Sortable header | `src/components/ui/SortableHeader.tsx` | `aria-sort` on the `<th>`; state owned by `useTableSort` |
| Dense data table | existing `ProductsTable`, `SuppliersTable` | already compact; sorting added, see §5 |

### UX Principles

Each is enforced by construction rather than by review:

| Principle | Rule | How it is enforced |
|---|---|---|
| Information Scent | Every metric card needs delta + sparkline | `series` and `delta` are **required props**; a card without trend context cannot be constructed |
| Weber-Fechner | Colour-coded deltas, never sign alone | The delta renders arrow **and** colour **and** sign |
| Stroop | Label and value share a colour family | Both use one foreground token; only the delta is coloured |
| Pascal's Wager | Skeletons before data, never a zero flash | While loading the value is a skeleton. It never renders "0" |
| Fitts's Law | 44px touch targets | Buttons `h-11`; the theme toggle is `h-11 w-11` |
| Jakob's Law | nav left, metrics top, tables below | Dashboard leads with the metric row |
| Zeigarnik | Active nav item persistently highlighted | `NavLink` active state |
| Hick's Law | Max 8 top-level nav items | 7 (6 main + settings) |
| Miller's Law | Max 6 metric cards per row | 4 |

### Engineering, Accessibility, Security, Performance

| Rule | Status |
|---|---|
| Use CSS variables only | Done. No hex in `tailwind.config.js` |
| Tabular numerals on all numbers | Done via `.tnum` |
| 8pt grid | Done (Tailwind default scale) |
| Respect reduced motion | Done. `--dur-*` set to `0s` under `prefers-reduced-motion`, which disables every transition that reads them in one place |
| 4.5:1 contrast | Done and **measured**. axe asserts it in both themes |
| 2px focus ring, 2px offset | Done, one global `:focus-visible` rule |
| Keyboard nav, semantic HTML | Done; `Tabs` implements the full WAI-ARIA pattern |
| CSP headers | Done in `vercel.json`; verified against the built bundle |
| RLS policies | Done. 23 policies, per-operation, `TO authenticated` |
| Skeleton first | Done |
| Debounce inputs at 300ms | Done; was already 300ms |
| Virtual scrolling for 100+ rows | **Not needed.** Server-side pagination caps every table at 20 DOM rows, so the condition cannot arise |

---

## 2. Deliberately not applied

| Item | Reason |
|---|---|
| **"Architecture: single file, zero build step"** | The system is a reference HTML file. Managiha is a React/TS/Vite application. The principle is about the reference format, not a product rule. |
| **`.agent-tool` elements** | The system's own README excludes these: they are reading tools for the reference, not UI patterns. |
| **Pricing section** | Not a product surface. Billing is out of scope. |
| **Date Range Picker component** | The reports pages use plain from/to inputs. Adopting the preset-chip picker is real work with no verified user need yet; it is a candidate, not a miss. |
| **Chart Tooltip component** | There are no charts, and decorative charts are explicitly out of scope. |
| **Copy-as-Markdown buttons** | Reference tooling. |
| **Decorative component libraries** (Aceternity, ReactBits, threeui, SmoothUI, and the marketplace/inspiration lists) | These were suggested, and they are the opposite tradition to this system: animated gradients, glow, 3D, animated backgrounds, cursor effects. The system's own header rejects "unnecessary gradients". Adopting them would mean this file is replaced rather than extended, and possibly the token layer with it. Declined as a set; the one transferable idea, tokenised motion and a press response on buttons, was already in place. Full reasoning in `docs/TOOLING.md`. |

---

## 3. What was wrong in the source system

Worth recording, since a design system that is silently wrong is worse than one
that is visibly incomplete.

### 3.1 Dark-mode primary fails contrast as a button

The system sets `--primary` and `--primary-solid` to the same `#3b82f6` in dark
mode, with `--on-primary: #fff`. White on `#3b82f6` measures **3.67:1**, below the
4.5:1 it requires for button text.

The two roles genuinely differ, and the system conflates them:

- `--primary` is for text and accents **on** a dark surface, where `#3b82f6`
  measures 5.15:1 and is correct.
- `--primary-solid` is for **fills** under white text, and must be darker.

Fixed by darkening only the fill: `--primary-solid: #2563eb` (5.12:1 with white).
Found by the axe suite on its first dark-mode run, not by reading the CSS.

### 3.2 The reference build shipped a self-contradicting metric card

Documented in the system's own audit log (issue #4): the Churn Rate card showed
`+0.3pp` with a down-arrow while the data table on the same page showed churn
improving. The system caught and fixed it, which is to its credit, and it is the
reason `DashboardMetrics` computes the delta, the arrow and the sparkline from one
series so they cannot disagree.

### 3.3 `radius` needs replacing, not extending

Not a defect, an observation that shaped the implementation. `theme.extend` in
Tailwind merges, so keeping the radius scale under `extend` would have left
`rounded-3xl` (24px) available and a soft decorative corner could have crept back
into a near-square system. The scale is declared at theme level so the rule is
enforceable rather than aspirational.

---

## 4. Judgement calls

**Sparkline as bars, not a line.** The system says "sparkline bars". At 8-16
samples and 32px of height a line is mostly interpolation the reader has to undo,
while bars read as discrete days, which is what the values are. A flat series
renders as a level mid-height band rather than as nothing, because "no change" is
itself information.

**`goodDirection`.** The system's rule is "green for positive, red for negative".
That is wrong for balances: money owed rising is more trade *and* more risk, and
colouring it would be the interface asserting an opinion the product does not
hold. `goodDirection` therefore accepts `"neutral"`, and both money metrics use it.
Low-stock and out-of-stock counts do have a right answer, so those are coloured.

**Trend data is reconstructed, not snapshotted.** The system requires a sparkline;
a sparkline needs history. `get_dashboard_trends` derives past stock value from the
append-only movement ledger rather than adding a daily snapshot table, because a
snapshot would be a second source of truth for something already derivable and
would drift the first time a ledger row was written by a path that forgot to
snapshot.

---

## 5. Closed since the first pass

- **Chips.** Built as `Chip` + `ChipGroup` and applied to the two product filters
  that are short closed sets — stock status (4 options) and archive state (2).
  Search, category and supplier stay selects, because each is an open set that
  grows with the shop and a chip row would either truncate or wrap to several
  lines. The chips are `h-11` against the select's 36px, which matters on the
  phone this is used on.
- **Sort indicators.** Built as `SortableHeader` with state in `useTableSort`.
  Products sorts by name, stock and price; the carnet by balance, descending by
  default. `aria-sort` is set on the `<th>` rather than the button, so the column
  reads as sortable while walking the table instead of only when tabbing to the
  control. The arrows are vertical, so RTL needs no mirrored variant.

  Server-side pagination made this more than a UI change: `order(key)` on a
  non-unique column leaves tied rows in an order Postgres may vary between the
  two range queries either side of a page boundary. Both queries now tie-break on
  `id`.
- **Sidebar group labels.** Seven flat items became two labelled groups, split by
  how often the owner touches each screen rather than by what the screens are.
  Labels are hidden on the collapsed rail, where they would be clipped to
  nothing. `nav.mainGroup` turned out to be in use already, as the `<nav>`
  `aria-label`.
- **Lighthouse run.** Now measured, not configured-and-hoped: the budget file was
  also broken — `module.exports` in an ESM package — so it had never loaded at
  all. Renamed to `lighthouserc.cjs`. Against the built output: **100 / 100 / 100 /
  91** for performance, accessibility, best-practices and SEO, on all three
  public routes.

## 6. Still open

- **Avatar cells.** The system specifies them in dense tables. Product thumbnails
  occupy that slot already and an avatar with no image source would be a
  placeholder rendered for its own sake.
- **Date Range Picker.** The reports pages use plain from/to inputs. A candidate,
  not a miss — see §2.
