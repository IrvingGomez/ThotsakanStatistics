# 2026-10-27 — v1 review fixes and documentation

## Fixes
- **Common Distributions:** a density that is infinite at the edge of its range (Beta with α or β < 1, Gamma with α < 1, Chi-squared with k = 1) is drawn as 0 at that point, so the rest of the curve stays visible; the instant preview draws a finite edge density (e.g. Beta(1, 1) at 0) instead of 0.
- **Inference:** with a weights column, rows missing a value or a weight are dropped together (the weights no longer fail on a length mismatch); an unknown weights column is a 400. Reset shows the result for the defaults straight away. Confidence-region labels and legend are 12 px.
- **Data:** one filter for every tab; a numeric category read as `1.0` matches the Data tab's `"1"` (filters on such a column used to match no rows outside Descriptive). On upload, a column with at least 80 % numbers is read as numbers and its other cells as missing, as the Data tab already did.
- **Backend:** every router gets its URL prefix in `main.py`.

## Documentation
- `doc/` renamed to `docs/`.
- New `docs/decisions.md`: every decision taken on this branch, dated, by Irving Gomez.
- `design.md` describes the analysis tool and its three panels; the guided-teaching layer is listed as later work. The interaction contract records Reset, the order in the center and right panels, and that a contract change needs Irving's approval. `architecture.md`, `roadmap.md`, `README.md`, `AGENT.md` and `CONTRIBUTING.md` match the code.
- `roadmap.md` holds the one backlog after v1; `ux_proposals.md` (folded into it) and the finished 2026-10-19 plan are removed.

## Before the deploy (agents, CI, branches)
- `AGENT.md` is now `AGENTS.md` (read by most AI coding tools); new `CLAUDE.md` points Claude Code to it.
- New `.github/workflows/tests.yml`: backend `pytest` and frontend tests + build on every pull request into `dev` or `main`.
- `main` will hold the released app and `dev` the next release; the old Gradio app is archived under the tag `gradio-final`. `docker.yml` also publishes `:main`, `:latest` and `:1.0.0`-style images.
- Deploy moved forward to Wednesday 28 October 2026.
