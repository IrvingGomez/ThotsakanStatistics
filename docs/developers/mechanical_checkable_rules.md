# Mechanically Checkable Rules Extracted from Project Docs

- RULE_ID: LAYER_DEPENDENCY_DOWNWARD_ONLY
  - Source: "The project follows a strict layered structure: `UI → Controllers → Core`" and "Dependencies flow **downward only**." (docs/project/architecture.md)
  - Invariant: Files under `ui/` may import from `controllers/` (and optionally `state/`), files under `controllers/` may import from `core/` (and optionally `state/`), and files under `core/` must not import from `controllers/`, `ui/`, or `state/`.
  - Detection strategy: AST import graph check by top-level package prefixes and deny edges `core -> {controllers,ui,state}`, `controllers -> ui`, `ui -> core`.

- RULE_ID: CORE_NO_HIGHER_LAYER_IMPORTS
  - Source: "Core ... Must not import from `controllers`, `ui`, or `state`." (docs/developers/coding_rules.md)
  - Invariant: No `import`/`from ... import ...` in `core/**/*.py` may reference modules rooted at `controllers`, `ui`, or `state`.
  - Detection strategy: `rg -n "^(from|import)\s+(controllers|ui|state)(\.|\s|$)|^from\s+(controllers|ui|state)\." core`

- RULE_ID: CONTROLLERS_NO_UI_IMPORTS
  - Source: "Controllers ... Must not import UI modules." and "No direct imports from `ui.tabs`." (docs/developers/coding_rules.md, docs/project/constitution.md)
  - Invariant: No `controllers/**/*.py` import may reference `ui` (at minimum deny `ui.tabs`).
  - Detection strategy: `rg -n "^(from|import)\s+ui(\.|\s|$)|^from\s+ui\." controllers`

- RULE_ID: UI_NO_CORE_IMPORTS
  - Source: "UI ... Must not import from `core`." and "No direct imports from `core`." (docs/developers/coding_rules.md, docs/project/constitution.md)
  - Invariant: No `ui/**/*.py` import may reference modules rooted at `core`.
  - Detection strategy: `rg -n "^(from|import)\s+core(\.|\s|$)|^from\s+core\." ui`

- RULE_ID: CORE_NO_GRADIO
  - Source: "Core ... Do NOT import Gradio" and "No Gradio usage." (docs/developers/feature_workflow.md, docs/project/constitution.md)
  - Invariant: `core/**/*.py` must not import or reference `gradio`/`gr`.
  - Detection strategy: `rg -n "\b(import\s+gradio|from\s+gradio\s+import|\bgr\.)" core`

- RULE_ID: STATE_DATA_ONLY_NO_LOGIC
  - Source: "State ... Contains data only. No statistical logic. No UI logic. No controller logic." (docs/developers/coding_rules.md)
  - Invariant: `state/**/*.py` must not import from `core`, `controllers`, or `ui`.
  - Detection strategy: `rg -n "^(from|import)\s+(core|controllers|ui)(\.|\s|$)|^from\s+(core|controllers|ui)\." state`

- RULE_ID: NO_ROUNDING_IN_CORE
  - Source: "Core functions must never round or format output." and forbidden examples using `round(...)` and `np.round(...)` in `core/`. (docs/developers/coding_rules.md)
  - Invariant: No rounding/formatting calls are allowed in `core/**/*.py` for presentation (`round`, `np.round`, `ndarray.round`, format specs like `:.4f`, `%0.4f`).
  - Detection strategy: `rg -n "\bround\(|np\.round\(|\.round\(|:\.[0-9]+f\b|%\.[0-9]+f" core` plus AST allowlist for numeric algorithmic internal rounding if explicitly justified.

- RULE_ID: CONTROLLERS_ONLY_ROUNDING_LAYER
  - Source: "Controllers are the only place where numerical results are prepared for presentation." (docs/developers/coding_rules.md)
  - Invariant: Any user-facing rounding/number-formatting should appear only in `controllers/` (and helper module under controllers).
  - Detection strategy: Search outside controllers for formatting tokens: `rg -n "\bround\(|np\.round\(|:\.[0-9]+f\b|format\(" core ui state`

- RULE_ID: CONTROLLERS_USE_SHARED_FORMATTING_HELPER
  - Source: "Controllers must use a shared formatting helper instead of raw `round(...)` calls spread across the codebase." (docs/developers/coding_rules.md)
  - Invariant: In `controllers/**/*.py`, raw `round(...)`/ad-hoc f-string precision is disallowed for user-facing values; formatting must route through designated helper (e.g., `controllers.utils.formatting`).
  - Detection strategy: AST rule in controllers: flag `round()` and f-strings with float precision unless line has approved exception marker.

- RULE_ID: NO_HARDCODED_DIGITS_FOR_USER_OUTPUT
  - Source: "Must not hard-code decimal digits for general results" and hard-coded digits are allowed only in narrow explicitly commented cases with `# INTENTIONAL_FIXED_ROUNDING: ...`. (docs/developers/coding_rules.md)
  - Invariant: For user-facing code paths, disallow literals like `round(x, 4)` / `f"{x:.4f}"` unless adjacent comment includes `INTENTIONAL_FIXED_ROUNDING`.
  - Detection strategy: `rg -n "round\([^\n]*,[[:space:]]*[0-9]+\)|:\.[0-9]+f\}" controllers ui core state` and require nearby marker comment.

- RULE_ID: NO_GLOBAL_DISPLAY_PRECISION_SIDE_EFFECTS
  - Source: "Do not manipulate `pd.options.display.precision` globally." (docs/developers/coding_rules.md)
  - Invariant: Codebase must not set global pandas display precision.
  - Detection strategy: `rg -n "pd\.options\.display\.precision|pandas\.options\.display\.precision"`

- RULE_ID: PRECISION_SINGLE_SOURCE_OF_TRUTH
  - Source: "Controllers must respect a single source of truth for precision (e.g. `state.display_precision`), rather than local constants." (docs/developers/coding_rules.md)
  - Invariant: Controller formatting calls must derive precision from central state/config object, not local numeric constants.
  - Detection strategy: AST dataflow check on formatting helper calls; heuristic grep to flag direct integer precision literals in controller formatting.

- RULE_ID: CORE_NO_APP_STATE_ACCESS
  - Source: "Core ... Must not access application state." and "No access to AppState." (docs/developers/coding_rules.md, docs/project/constitution.md)
  - Invariant: `core/**/*.py` must not import from `state` nor reference known app-state globals/singletons.
  - Detection strategy: import grep + symbol denylist (`AppState`, `state.`) in core.

- RULE_ID: NO_SILENT_ESTIMATOR_SELECTION
  - Source: "The Core must not silently choose estimators if the user has options." and "Core receives explicit parameters and does not override them." (docs/developers/coding_rules.md, docs/project/constitution.md)
  - Invariant: Core APIs that depend on estimator/strategy must expose explicit parameters (e.g., estimator choice, ddof, CI strategy) and must not hard-code hidden defaults when configurable.
  - Detection strategy: AST/API lint: for targeted core functions, require parameter presence; plus grep for hard-coded estimator defaults (`ddof=1`, fixed strategy strings) where function lacks corresponding argument.

- RULE_ID: BOOTSTRAP_ONLY_WHEN_EXPLICIT
  - Source: "Bootstrap-based intervals are used only when explicitly requested, and the bootstrap method ... must be encoded as a parameter." (docs/project/constitution.md)
  - Invariant: Any function that can do analytic and bootstrap CI/PI must take an explicit strategy/method parameter; bootstrap path cannot be implicit default.
  - Detection strategy: AST rule on CI/PI entrypoints: if bootstrap routines called, verify presence/use of strategy parameter.

- RULE_ID: EXPLICIT_INTERVAL_STRATEGY_PARAMETERS
  - Source: "The CI/PI strategy (analytic t-based, asymptotic normal, bootstrap, etc.) must always be explicit." (docs/project/constitution.md)
  - Invariant: Public controller/core interval APIs include explicit strategy argument; no branch on hidden constants/global flags.
  - Detection strategy: AST signature checks + grep for strategy conditionals using undeclared globals.

- RULE_ID: RANDOM_PROCEDURES_REQUIRE_SEED
  - Source: "All random procedures accept a seed." (docs/project/constitution.md)
  - Invariant: Functions in core that use randomness (`np.random`, `random`, bootstrap/simulation samplers) must include optional seed or rng parameter.
  - Detection strategy: AST: detect RNG calls and verify enclosing function signature has `seed`/`rng` parameter.

- RULE_ID: NO_HIDDEN_GLOBAL_STATE
  - Source: "Hidden global state" listed as a forbidden anti-pattern. (docs/project/constitution.md)
  - Invariant: Statistical behavior must not depend on mutable module-level globals.
  - Detection strategy: AST: flag writes to module-level mutable variables used by core/controllers execution paths.

- RULE_ID: CORE_RAISES_EXPLICIT_EXCEPTIONS
  - Source: "Raise meaningful Python exceptions." and "Raise explicit Python exceptions on invalid input." (docs/developers/coding_rules.md, docs/project/constitution.md)
  - Invariant: Core input validation failures should raise explicit exception types; no silent pass/default on invalid input.
  - Detection strategy: AST/grep for empty `except`, `pass` in exception handlers, and invalid-input branches returning sentinel instead of raising.

- RULE_ID: CONTROLLERS_CATCH_PREDICTABLE_ERRORS
  - Source: "In Controllers: Catch predictable errors. Convert them into user-friendly messages if needed." (docs/developers/coding_rules.md)
  - Invariant: Controller boundary functions should catch known validation/value errors from core and map to structured/UI-safe errors.
  - Detection strategy: AST scan for top-level controller entrypoints missing expected exception mapping (project-specific lint).

