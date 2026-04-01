# Coding Rules  
## Thotsakan Statistics – Himmapan Lab

This document defines coding conventions and non-negotiable rules for contributors.

These rules exist to:

- Preserve architectural discipline
- Prevent technical debt
- Maintain clarity for student collaboration
- Ensure long-term scalability

Follow these rules strictly.

---

# 1. Architectural Discipline

## 1.1 Layer Boundaries

The project follows a strict layered structure:

```
UI → Controllers → Core
```

### Core
- Contains statistical logic only.
- Must not import from `controllers`, `ui`, or `state`.
- Must not format output for presentation.
- Must not access application state.

### Controllers
- May import from `core`.
- Must not implement statistical formulas.
- Must not import UI modules.
- Responsible for parsing, validation, and formatting.

### UI
- Must call controllers only.
- Must not import from `core`.
- Must not perform statistical computation.

### State
- Contains data only.
- No statistical logic.
- No UI logic.
- No controller logic.

Violations of these rules are considered design errors.

---

# 2. Naming Conventions

## 2.1 File Names

- Use lowercase with underscores.
- Be descriptive.
- Examples:
  - `ci_mean.py`
  - `inference_controller.py`
  - `graphical_analysis.py`

Avoid vague names like:
- `utils2.py`
- `misc.py`
- `helpers.py`

---

## 2.2 Function Names

- Use clear, explicit names.
- Prefer `ci_mean_bootstrap` over `compute_ci`.
- Avoid abbreviations unless standard (e.g., `ci`, `pi`, `df`).

---

## 2.3 Variables

- Use descriptive variable names.
- Avoid single-letter variables except in mathematical contexts.
- Avoid shadowing built-ins (`list`, `dict`, `sum`, etc.).

---

# 3. Estimator Selection Contract

This is critical for this project.

## Rule:

**The Core must not silently choose estimators if the user has options.**

If the UI allows selection of:
- Mean estimator
- Deviation estimator
- Bootstrap vs analytic
- Robust vs classical

Then:

- The Controller decides which estimator to use.
- The Core receives that decision explicitly.
- The Core does not override user choices.

Never hard-code classical defaults when configurability exists.

---

# 4. Formatting, Rounding, and Precision

## 4.1 Layer responsibilities

- **Core**  
  - Returns raw numerical results (full precision).  
  - Must not round or format values for display.  
  - Must not know about decimal digits, display precision, or UI preferences.

- **Controllers**  
  - Are the only place where numerical results are prepared for presentation.  
  - May apply rounding / formatting **via a dedicated helper**, not ad-hoc `round(...)`.  
  - Must not hard-code decimal digits for general results (no `round(x, 4)` scattered around).

- **UI**  
  - Displays already-formatted values.  
  - Must not perform statistical computation or additional rounding on Core results.

## 4.2 Default precision policy

- The project uses a **default display precision of 4 decimal digits**.
- This default is configuration, not math:
  - It must **not** be baked into Core logic.
  - It must **not** be enforced by global magic constants in random modules.
- The default precision will eventually be **user-configurable** (e.g. via the Data tab).
- Controllers must respect a single source of truth for precision (e.g. `state.display_precision`), rather than local constants.

## 4.3 No rounding in Core

Core functions must never round or format output.

**Forbidden in `core/`:**

```python
return round(ci_lower, 4), round(ci_upper, 4)
sigma_hat = np.round(sigma_hat, 4)
```

Required:

```python
return ci_lower, ci_upper
sigma_hat = ...
```

If tests require rounded output, adjust the tests to compare with tolerances (e.g. `pytest.approx`) instead of exact rounded values.

## 4.4 Presentation helpers (Controllers only)

Controllers must use a shared formatting helper instead of raw `round(...)` calls spread across the codebase.

Example pattern (location to be used later):

```python
from controllers.utils.formatting import format_number

def run_ci_mean(..., state):
    ci_lower, ci_upper = core_ci_mean(...)
    return {
        "ci_lower": format_number(ci_lower, state.display_precision),
        "ci_upper": format_number(ci_upper, state.display_precision),
    }
```

Rules:

- Do not invent new rounding approaches in random controllers.
- Do not manipulate pd.options.display.precision globally.
- All numeric display formatting should go through the shared helper.

## 4.5 Hard-coded digits are technical debt

Hard-coded digits such as:

```python
round(value, 4)
f"{value:.4f}"
```

are acceptable only in **very narrow, explicitly commented cases** (e.g. debug logs).

If you must keep a fixed precision somewhere, annotate it:

```python
# INTENTIONAL_FIXED_ROUNDING: debug only
debug_str = f"{value:.4f}"
```

All user-facing numerical output (tables, intervals, summaries) must obey the central display-precision setting.

---
# 5. Error Handling

In Core:
- Raise meaningful Python exceptions.
- Do not suppress errors silently.

In Controllers:
- Catch predictable errors.
- Convert them into user-friendly messages if needed.

# 6. Imports

Import order:
1. Standard library
2. Third-party libraries
3. Local project modules

Example:
```python
import numpy as np
import pandas as pd

from core.estimation.inference import ci_mean
```

Avoid circular imports.

---

# 7. Avoid Quick Fixes

Do NOT:
- Patch logic inside UI because “it works”
- Add conditional hacks to bypass architecture
- Duplicate statistical logic in multiple places

If something feels like a shortcut, it probably violates architecture.

---

# 8. Testing Mindset

When adding features:
- Test the Core function directly.
- Test the Controller separately.
- Then test the UI integration.
Debug from bottom to top.

---

# 9. Code Clarity

This is an educational project.

Prefer:
- Readability over cleverness
- Explicitness over abstraction
- Simplicity over premature optimization

Students should be able to understand the code.

---

# 10. When Unsure

If unsure about:
- Layer placement
- Estimator logic
- Architectural implications
Ask before implementing.

Architectural integrity is more important than speed of development.