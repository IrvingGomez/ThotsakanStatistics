# Contributing to Thotsakan Statistics  
## Himmapan Lab

Thank you for contributing to Thotsakan Statistics.

This project is part of the **Himmapan Lab** ecosystem and is built on strict architectural and statistical discipline.

Contributions are welcome — architectural integrity is mandatory.

---

# 1. Before You Start

If you are new to the project, read in this order:

1. [Developer Documentation](docs/developers/README.md)
2. [Architecture Overview](docs/project/architecture.md)
3. [Constitution (Structural & Mathematical Rules)](docs/project/constitution.md)
4. [Governance & Lifecycle Policy](docs/project/governance.md)
5. [Feature Workflow](docs/developers/feature_workflow.md)
6. [Coding Rules](docs/developers/coding_rules.md)

Do not begin implementing before understanding these documents.

---

# 2. Development Setup

## Install runtime dependencies

```
pip install -r requirements.txt
```

## Install development dependencies

```
pip install -r requirements-dev.txt
```

## Run tests

```
pytest -q
```

All tests must pass before submitting changes.

---

# 3. Contribution Workflow

## 3.1 Create a Branch

Do not work directly on `main`.

```
git checkout -b feature/short-description
```

Examples:

- `feature/bootstrap-ci`
- `feature/new-visualization`
- `fix/controller-validation`

---

## 3.2 Follow Architectural Order

Always implement in this order:

   Core → Controller → UI

Never begin with the UI.

---

## 3.3 Add Tests

At minimum:

- Ensure imports still work
- Add a basic test for new statistical logic

All new features should include test coverage.

---

## 3.4 Run Tests Before Committing

```
pytest -q
```

Fix all failures before pushing.

---

## 3.5 Submit a Pull Request

Include:

- Clear description of the change
- Explanation of where changes were made
- Version classification (PATCH / MINOR / MAJOR if relevant)

Small, focused pull requests are preferred.

---

# 4. Non-Negotiable Rules

Architectural and statistical rules are defined in:

- `docs/project/constitution.md`

Versioning and lifecycle rules are defined in:

- `docs/project/governance.md`

If your contribution violates these documents, it will require revision.

---

# 5. Reporting Issues

When reporting a bug, include:

- Description of the problem
- Steps to reproduce
- Expected behavior
- Observed behavior

Clear reports improve project quality.

---

# Final Reminder

This is an educational and long-term project.

We are building:

- Reproducible statistical tools
- Clean architectural systems
- Sustainable academic infrastructure

Clarity and discipline take precedence over speed.