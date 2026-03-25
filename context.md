# Project Context: Thotsakan Statistics

## 1) What this project is

**Thotsakan Statistics** is an interactive statistics laboratory application built by **Himmapan Lab** for engineering education.

- Current app version in code: **0.1.2** (`ui/version.py`)
- License: **MIT**
- Main runtime UI stack: **Gradio**

Primary goals:
1. Help students/instructors run statistics workflows interactively.
2. Provide a structured codebase for student contributors.

---

## 2) Current functional scope

Implemented feature areas (from code and UI wiring):

- **Data tab**: dataset upload, summary, variable typing, category filters, type reclassification.
- **Estimation tab**:
  - Descriptive statistics
  - Statistical inference (confidence/prediction intervals, confidence regions)
  - Graphical analysis
- **Hypothesis testing tab**:
  - One-sample t-test
  - Two-sample t-test (Welch option)
  - Equal-variance tests (Bartlett/Levene)
  - One-way ANOVA
  - Table/figure download support
- **Linear regression tab**:
  - Formula-based or column-based model setup
  - Optional CI/PI display
  - Multiple plot types

In progress / scaffolded:
- **Probability tab** is present in UI but currently marked as “Building.”

---

## 3) Architecture at a glance

The project enforces a strict layered dependency direction:

`UI -> Controllers -> Core`

Directory responsibilities:

- `app.py`: process entry point (builds and launches Gradio app).
- `ui/`: presentation (layout, tabs, assets, styles).
- `controllers/`: orchestration, input validation, dispatch, display formatting.
- `core/`: statistical/math computations and plotting logic.
- `state/`: shared app data (`AppState`) only.
- `datasets/`: practice datasets.
- `tests/`: minimal structural/guardrail tests.
- `docs/`: user, developer, project-governance, and theory docs.

---

## 4) Key architectural rules (project doctrine)

From project docs (`docs/project/*`):

- Keep dependency flow one-way: **UI → Controllers → Core**.
- **Core must not depend on UI/controllers/state**.
- **Rounding is presentation-level**; core should keep full numerical precision.
- Estimator/strategy choices should be explicit (no silent overrides).
- Reproducibility is required for random procedures (seed-aware behavior).

These constraints are part of the project’s constitutional/governance documents and are treated as non-negotiable.

---

## 5) Runtime and dependencies

Runtime dependencies (`requirements.txt`):
- gradio, numpy, pandas, matplotlib, scipy, statsmodels, seaborn, tabulate, pingouin

Dev/test dependencies (`requirements-dev.txt`):
- pytest

Entry point:
- `python app.py`

---

## 6) How data flows through the app

Typical execution path:
1. User loads data in UI.
2. UI stores/updates shared state (`AppState`).
3. UI actions call controller functions.
4. Controllers validate/transform parameters and call core computations.
5. Core returns raw/statistical outputs (tables/figures/values).
6. Controllers format outputs for presentation/export.
7. UI renders result artifacts.

---

## 7) Testing and quality posture

Current tests are lightweight and focus on guardrails:
- Import integrity across core/controllers/ui (`tests/test_imports.py`)
- A policy check intended to prevent tabular rounding in `core/` (`tests/test_no_tabular_rounding_in_core.py`)

Changelog and docs explicitly note that deeper statistical correctness tests are planned for future releases.

---

## 8) Repository maturity snapshot

Based on docs + changelog:

- Version line is early-stage (`0.1.x`) with strong documentation/governance emphasis.
- Architecture and contribution discipline are unusually explicit for an educational project.
- Probability module expansion and broader validation/tests are listed as near-term roadmap items.

---

## 9) Fast onboarding checklist

1. Create and activate virtual env.
2. `pip install -r requirements.txt`
3. `python app.py`
4. (Contributors) `pip install -r requirements-dev.txt`
5. Run `pytest -q`
6. Read docs in this order:
   - `docs/project/constitution.md`
   - `docs/project/architecture.md`
   - `docs/project/governance.md`
   - `docs/developers/README.md`

---

## 10) Suggested next context docs (optional)

If you want deeper team onboarding, add:
- `CONTEXT_ARCHITECTURE_DECISIONS.md` (major design rationale)
- `CONTEXT_STATISTICAL_CONTRACTS.md` (explicit estimator/CI/PI invariants)
- `CONTEXT_RELEASE_PLAYBOOK.md` (release checklist + CI expectations)
