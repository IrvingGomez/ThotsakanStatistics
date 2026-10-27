# Interaction Contract

Rules every analysis tab (Common Distributions, Descriptive, Inference, Graphical, Hypothesis, and later Regression) follows, so the app behaves the same everywhere. Written after the professor's review of the Estimation tabs. Each rule fixes a bug or inconsistency that was observed in the code. The decisions behind the rules, with dates, are in [`decisions.md`](decisions.md).

**Scope:** the app is an *analysis tool* in the style of jamovi / JASP — it reports numbers and draws plots; the user decides. A guided-teaching layer is later work (see [`design.md`](design.md)).

## 1. Options

1. **Hidden means not sent.** Whether a control is visible and whether its value goes into the request come from the *same* condition. A hidden option never leaks into a request or produces a warning. (Bugs this prevents: the "KDE is not drawn on the ECDF" warning, Inference bootstrap flags sent while hidden in Regions mode.)
2. **Show an option only when it applies.** A parameter appears only when the choice that needs it is ticked (weights column ↔ Weighted mean, trim/winsor fractions ↔ their means, deviation estimator ↔ a normality-based interval, bootstrap B ↔ any bootstrap option).
3. **Never force an input.** An optional input may be left empty and then simply produces nothing (e.g. empty quantile probabilities → no quantile rows). No error for "I don't want this".
4. **Sensible defaults ticked.** Check-groups start with the common choices ticked so the user does not have to click to get a result; the user can untick.
5. **Request options vs display options.** Options that change the calculation (column, estimators, α, B…) are *request* options. Options that only change what is shown (which rows, consistency column, zoom) are *display* options and **never re-run the calculation or show a loading state**.

## 2. Running

6. **Results update automatically** on every change, after a short pause (about 250 ms; longer, about 700 ms, while bootstrap is on). There are no Run/Update buttons — only Reset, which shows the result for the defaults straight away. Heavy work is made cheaper instead (each endpoint computes only what it returns) and a burst of changes collapses into one request.
7. One wording for the "settings changed" state, one for computing, one for error with Retry. Use the shared status component; do not write per-tab messages.

## 3. Results

8. **Adding a method adds rows.** Choosing bootstrap *adds* a "Mean – Bootstrap (B=…)" row next to the normal-theory row so methods can be compared; it never replaces another method's result.
9. **The program reports; the user decides.** Show statistic, p-value, α, degrees of freedom, and the region/plot. Never print "Reject H₀" / "Fail to reject H₀", and never gate numbers behind a click.
10. **Warnings are specific.** A warning appears only for the plot or result it applies to. State that belongs to another plot type is ignored, not warned about.

## 4. Naming and controls

11. **One display-name map** (`frontend/src/labels.ts`) for estimators and statistics. Values sent to the backend stay as they are (including `"… (bias corrected)"` strings that live in professor-verified `core/`); only the displayed label changes.
12. **α is one control.** Always "Significance level α" (with a derived "= 95 % confidence" readout), always the shared `DualInput` (slider + text), always `alpha` on the wire. Trim fractions and Gamma/Beta shape parameters are different quantities and keep their own names.
13. **Same plot, same encoding everywhere.** Discrete probabilities are bars (as in Common Distributions), not lollipops.

## 5. Layout and states

14. Left panel = inputs only (what to show first, then one Settings section); center = tables at the top, plots below, export; right = formulas.
15. **Right panel:** the formulas, definitions and procedures of what is on screen — only what was chosen, copied from `backend/core/` — then a closing "Values" section (estimates, cut-offs, constants). No lessons, no reflection prompts, no teaching flow.
16. Empty, loading, error and warning states use the shared status components, not per-tab emoji or ad-hoc boxes.
17. Colors, spacing and text sizes come from shared tokens (`style.css` variables and `plot/theme.ts`) — no per-chart hex literals. Small text is 14 px; nothing, plots included, is under 12 px. Within a tab a color has one meaning (see `plot/theme.ts`).

## Shared building blocks (new files; do not change existing component interfaces)

`components/CheckboxTree.tsx` · `components/notebook/NotebookParts.tsx` (Section, Row, Formula, ResultCard) · `components/StatusBanner.tsx` (also `EmptyState`) · `components/ResultTable.tsx` · `components/ResultSection.tsx` · `components/MathFormula.tsx` · `plot/theme.ts` · `labels.ts`

## Rule of change

If a tab needs behavior this contract does not allow, ask Irving Gomez first; once he agrees, record the decision in `decisions.md`, change the contract, then the tab.
