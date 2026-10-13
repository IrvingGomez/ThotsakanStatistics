# Descriptive Statistics UX/UI Analysis & Recommendations

> **Status: design proposal (undated).** Not every recommendation has been implemented. Checked on 2026-10-13: the **Formula Reference** in the Notebook is now a collapsible `<details>` section (recommendation 3 adopted). The other items were not re-verified one by one. The tab's Notebook text interprets results; it does not render KaTeX formulas.

## Current Structure Overview
The Descriptive Statistics view is composed of three panels, exposed by `DescriptiveTab.tsx` as LabBench slots:
1. **Left Panel (`DescriptiveControls.tsx`)**: inputs for variable selection, advanced options (quantiles, trimming, winsorizing, weights), and the primary "Run Analysis" action.
2. **Center Panel (`DescriptiveObservation.tsx`)**: the computed results, including tables of statistics grouped by category (Quantiles, Central Tendency, Dispersion, Shape) and charts (Histogram and Box Plot).
3. **Right Panel (`DescriptiveNotebook.tsx`)**: a dynamic interpretation guide with natural-language analysis of Shape, Spread, Centre, Bias Correction, and a Formula Reference.

## Identified Issues & Inconsistencies

* **Visual Hierarchy Breakdown**: the layout relies heavily on prominent borders, which creates visual clutter and traps content in boxes. This prevents the user's eyes from scanning naturally across the panels.
* **Low Contrast Call-to-Action**: the "Run Analysis" button lacks the visual distinction necessary to separate it from standard inputs or secondary actions.
* **Information Density in Results**: the central panel gives equal visual weight to tables and charts. The tables lack row striping or sufficient padding, making rows hard to read when scanning many metrics.
* **Squished Visualizations**: the Histogram and Box Plot appear too compressed, likely lacking sufficient height or container constraints.
* **Interpretation Panel Clarity**: the Notebook uses generic text elements and standard bullet points. The visual distinction between automatic interpretations and raw data summaries is weak. The static "Formula Reference" occupied valuable vertical space *(since addressed: now collapsible)*.
* **Loading States**: the loading state was a static overlay with a spinner emoji — functional, but lacking polish.

## Proposed Improvements & Recommendations

### 1. Refine the Controls Panel (Left)
* **Reduce Border Clutter**: replace strong outer borders with subtle background variations for distinct control groups. Use spacing to group related items (Variables vs. Advanced Options) rather than hard divider lines.
* **Emphasize the Primary CTA**: give the "Run Analysis" button the primary accent color as a solid fill.

### 2. Enhance the Observation Panel (Center)
* **Card-Based Visualization**: wrap the Histogram and Box Plot in slightly elevated cards to separate them from the tables.
* **Table Scannability**: add subtle zebra striping or hover highlighting. Emphasize category sub-headers (Central Tendency, Dispersion, …).

### 3. Upgrade the Notebook Panel (Right)
* **Visual Callouts**: turn the "Shape", "Spread" and "Centre" interpretations into color-coded callouts or add iconography (e.g. highlight extreme skewness).
* **Collapsible Formula Reference**: put the Formula Reference in a `<details>` / `<summary>` accordion *(adopted)*.

### 4. General Polish (Parent Layout)
* **Responsive Degradation**: the three panels should reflow into a single stacked column on smaller viewports — Controls, then Observation, then Notebook. *(LabBench now stacks below 1200 px.)*
* **Loading Animation**: use a subtle pulsing animation or skeleton loaders for charts and tables to improve perceived performance.
