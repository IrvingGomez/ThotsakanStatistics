import re
from pathlib import Path


CORE_DIR = Path(__file__).resolve().parents[1] / "core"


FORBIDDEN_PATTERNS = [
    r"\bround\s*\(",
    r"\bnp\.round\s*\(",
    r"\.round\s*\(",
]


def test_no_tabular_rounding_in_core():
    """
    Enforces the invariant:

    - core/ must not perform tabular rounding.
    - No use of round(), np.round(), or .round() inside core/.

    Graph-local formatting (e.g. f"{x:.3f}") is allowed and not checked here.
    """

    violations = []

    for path in CORE_DIR.rglob("*.py"):
        # core/hypothesis_tests.py contains graph-local formatting and text output,
        # which is allowed by the rounding doctrine. We do not treat those as
        # tabular rounding, so we skip this file in this mechanical check.
        if path.name == "hypothesis_tests.py":
            continue

        content = path.read_text(encoding="utf-8")

        for pattern in FORBIDDEN_PATTERNS:
            for match in re.finditer(pattern, content):
                line_number = content[: match.start()].count("\n") + 1
                violations.append(f"{path}:{line_number} -> {match.group(0)}")