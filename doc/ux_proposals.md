# UX Proposals (not yet built)

Design ideas that haven't been implemented. Adopted items were removed. Checked against `DataTab.tsx` and `DescriptiveNotebook.tsx` on 2026-10-13.

## Data tab: scaling to large datasets

The tab works for small and medium files but struggles with 100+ columns, high-cardinality categories, or very many rows.

**Already adopted:** per-column filter blocks; a value search box when a column has more than 10 values, with at most 50 unselected values shown; a separate "Remove dataset" button.

| Area | Problem | Proposal |
|---|---|---|
| Column types | One toggle chip per column becomes a wall of chips with 100+ columns | Fixed-height scrollable list with a "Search columns…" box, bulk reclassify via checkboxes, Numeric / Categorical groups |
| Data preview | Only the first 50 filtered rows are shown; wide tables lose context | Pagination (or virtual scrolling), a column-visibility menu, a sticky header and index column |
| Upload | "Parsing…" has no progress; the drop zone disappears after loading | A progress bar (chunked parse), drop-anywhere with "Replace current dataset?" |
| Summary chips | Raw numbers like `1450239` | `toLocaleString()` → `1,450,239`; compact `1.45M` for huge tables |

```text
 Dataset · sales_data_2026.csv          [ Display precision ⌄ ] [ 🗑 Remove dataset ]
 ┌ ROWS (RAW) ┐ ┌ ROWS (FILT) ┐ ┌ NUMERIC ┐ ┌ CATEGORICAL ┐
 │ 1,450,239  │ │ 1,450,239   │ │ 105     │ │ 42          │
 ┌ COLUMN TYPES ─────────────────┐  ┌ CATEGORY FILTERS ───────────────┐
 │ [🔍 Search columns…         ] │  │ [+ Add Filter]   [Clear all]    │
 │ transaction_id  [Categorical] │  │ ┌ region ─────────────────────┐ │
 │ amount          [Numeric    ] │  │ │ NA (42k) ×  EU (12k) ×      │ │
 │ … + 143 more (scrolls)        │  │ │ [🔍 Search values…]         │ │
 └───────────────────────────────┘  └─────────────────────────────────┘
 DATA PREVIEW — showing 1–50 of 1,450,239 filtered rows
 | # | transaction_id | amount | state | …(+143 columns) |
 [|< First] [< Prev]   Page 1 of 29,005   [Next >] [Last >|]
```

## Descriptive Statistics tab: visual polish

**Already adopted:** a collapsible Formula Reference; panels stack below 1200 px.

- **Controls:** replace hard borders with subtle background groups and spacing, and make "Run Analysis" a solid accent-color button.
- **Observation:** put the histogram and box plot in slightly raised cards with enough height. Add zebra striping or row hover to the tables and stronger category sub-headers (Central Tendency, Dispersion, …).
- **Notebook:** colour-coded callouts or icons for the Shape / Spread / Centre interpretations (e.g. flag extreme skewness), so they stand apart from raw numbers.
- **Loading:** skeleton loaders or a subtle pulse instead of the spinner overlay.
