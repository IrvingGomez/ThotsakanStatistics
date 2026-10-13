# Documentation Index

Every document in `doc/`, grouped by purpose. Each page links only to pages "below" it in this index structure, so there are no circular references.

## Start here

| Document | Read it for |
|---|---|
| [`identity.md`](identity.md) | Product vision, UX pillars, anti-features. Read before proposing a feature. |
| [`context.md`](context.md) | Architecture overview, current scope, data flow, onboarding checklist |

## Architecture reference

| Document | Read it for |
|---|---|
| [`frontend_backend_interaction.md`](frontend_backend_interaction.md) | Request lifecycle, sessions, the full endpoint table, filters, error codes |
| [`folder_duties.md`](folder_duties.md) | What every folder and file is responsible for, and what it must not do |
| [`DESIGN_PROPOSAL.md`](DESIGN_PROPOSAL.md) | UI layout, panel slot pattern, DualInput, theme, performance budget |

## Setup and operations

| Document | Read it for |
|---|---|
| [`AUTH.md`](AUTH.md) | Google sign-in setup, `.env` variables, production checklist, troubleshooting |

## Status and planning

| Document | Read it for |
|---|---|
| [`migration_plan.md`](migration_plan.md) | Authoritative feature status table and phase-by-phase migration history |
| [`known_issues.md`](known_issues.md) | Open defects and documentation gaps, with evidence |

## Design reviews and proposals (not yet implemented)

| Document | Status |
|---|---|
| [`descriptive_stats_ux_review.md`](descriptive_stats_ux_review.md) | UX review of the Descriptive Statistics tab — proposal |
| [`data_tab_large_data_ux_review.md`](data_tab_large_data_ux_review.md) | Data tab scaling review — proposal |
| [`data_tab_redesign_mockup.md`](data_tab_redesign_mockup.md) | Wireframe for the Data tab redesign — proposal |

## Historical records

| Document | What it is |
|---|---|
| [`code_review.md`](code_review.md) | Code review from 2026-04-22, annotated with the current status of each finding |
| [`descriptive_stats_flow.md`](descriptive_stats_flow.md) | How the original **Gradio** app moves data from the Data tab to Descriptive Statistics (migration reference) |

Dated change notes live in the top-level `changelogs/` folder.
