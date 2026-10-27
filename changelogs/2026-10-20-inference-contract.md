# 2026-10-20 — Statistical Inference follows the interaction contract

## Controls
- Estimate is a radio group ("Intervals" / "Confidence regions") instead of a dropdown.
- Explanatory prose removed: the sentence under Estimate, the regions note, and the "no correction across rows" α hint.
- An estimator list load failure is a warning in the results banner instead of amber text in the controls.

## Results (center)
- Sections use the shared `ResultSection`; the zoom button sits in the section actions and its note is muted (no amber).
- The "Lines show interval bounds…" and region explanation paragraphs are removed; short axis-scale notes stay.
- The empty state is the shared `EmptyState`.

## Notebook (right)
- The "Statistical inference" heading and the status banner are removed; status shows only in the center panel.
- Interval cards and the region summary use the shared `Section` ("Confidence intervals", "Prediction intervals", "Joint confidence regions") without subtitles or the contour explanation.
