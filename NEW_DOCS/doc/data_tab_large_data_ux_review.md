# Data Tab UX/UI Review: Scaling for Large Datasets

> **Status: design proposal (undated), partly adopted.** Checked on 2026-10-13 against `frontend/src/features/data/DataTab.tsx`:
> - **Adopted:** filters are added per column as removable blocks; value lists get a search box when a column has more than 10 values and show at most 50 unselected values ("+ N more (use search)"); "Remove dataset" has its own button.
> - **Not adopted:** the data preview still shows only the first 50 filtered rows (no pagination or virtualization).
> - Other items (column-type search and bulk actions, number formatting in summary chips, progress bar) were not re-verified one by one.
>
> Upload is now also sent to the backend; the browser-side parse is used for the preview and filter UI.

## Overview
The Data Tab works well for small-to-medium datasets but has usability and performance bottlenecks for "large scale" data (100+ columns, high-cardinality categorical columns, or millions of rows).

Below are the UX constraints observed at the time of the review and recommendations for research-heavy workloads.

---

## 1. Column Type Reclassification (The "Wall of Chips")
### State at review time
The UI renders a flex-wrapped toggle button for every column to switch between numeric and categorical.
**The problem:** with 100+ or 500+ columns this becomes an overwhelming wall of chips that fills the viewport.

### Recommendations
* **Searchable list:** a fixed-height, scrollable, virtualized list instead of a flat wrap layout.
* **Search input:** a "Search columns..." box that filters the list instantly.
* **Bulk actions:** checkboxes to reclassify several columns at once ("Set all selected to Categorical").
* **Group by type:** a "Numeric Columns" / "Categorical Columns" dual list so current assignments are obvious.

---

## 2. Category Filters (Cardinality & Limit Constraints)
### State at review time
Editable filters were limited to the first 3 categorical columns (`slice(0, 3)`), and every unique value was rendered as an inline toggle button.
**The problem:** users could not filter by a 4th column, and a column with 1,000+ unique values (zip codes, names) rendered 1,000 buttons, lagging the DOM.

### Recommendations
* **Dynamic filter builder:** an "Add Filter" action that adds a rule block per column *(adopted in simplified form)*.
* **Combobox dropdowns:** searchable, virtualized selection of categorical values instead of inline buttons *(partly adopted: search box + 50-value cap)*.
* **Frequency visibility:** if inline lists stay, show only the most frequent values as chips and keep the rest behind a search.

---

## 3. Data Preview Table (Exploration Limitations)
### State at review time (unchanged)
Only the first 50 rows are shown (`filteredRows.slice(0, 50)`), and every column is rendered.
**The problem:** users cannot see rows 51+, and scrolling horizontally past many columns without a sticky reference loses context.

### Recommendations
* **Pagination / virtualization:** a pagination footer (rows per page, next, previous, last) or a virtual scroller for 10,000+ rows.
* **Column visibility manager:** a "View Columns" dropdown to hide/show columns.
* **Sticky context:** sticky `<thead>` for vertical scrolling and a sticky index/identifier column for horizontal scrolling.

---

## 4. File Upload & Processing State
### State at review time
An `animate-pulse` "Parsing…" text while reading; the dataset removal button was tucked inside the precision control block.
**The problem:** a large CSV can take seconds to parse, and "Parsing…" without progress limits trust. Hiding the drop zone after loading removes the obvious way to load a different file.

### Recommendations
* **Determinate progress bar:** report percentage or rows parsed if parsing in chunks.
* **Global drag-and-drop:** accept file drops anywhere, prompting "Replace current dataset?".
* **Clearer "Start Over" action:** put "Remove dataset" / "Upload New" in the top-right header area as a distinct action.

---

## 5. Summary Chips & Number Formatting
### State at review time
`Rows (raw)` showed raw numbers like `1450239`.
**The problem:** large raw numbers are hard to read at a glance.

### Recommendations
* **Locale strings:** `.toLocaleString()` → `1,450,239`.
* **Compact notation:** for very large tables, `Intl.NumberFormat` with `notation: "compact"` (`1.45M`).
