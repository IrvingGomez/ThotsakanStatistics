# Data Tab Large Dataset Redesign (Mockup)

> **Status: design proposal (undated), partly adopted.** This wireframe illustrates the recommendations in [`data_tab_large_data_ux_review.md`](data_tab_large_data_ux_review.md); that page lists which parts exist in the app today. Pagination, shown at the bottom, is not implemented.

A text wireframe of the proposed layout and interactivity for `DataTab` with large datasets.

```text
================================================================================
 Dataset                                      [ Display precision: [3 dec ⌄] ]
 Upload a CSV file to use across all          [ 🗑 Remove dataset            ]
 analysis tabs. · sales_data_2026.csv
================================================================================
                               SUMMARY CARDS
+---------------+  +---------------+  +---------------+  +---------------+
| ROWS (RAW)    |  | ROWS (FILT)   |  | NUMERIC COLS  |  | CATEGORICAL C |
| 1,450,239     |  | 1,450,239     |  | 105           |  | 42            |
+---------------+  +---------------+  +---------------+  +---------------+

================================================================================
                              CONTROLS SECTION
+------------------------------------+  +------------------------------------+
| COLUMN TYPES                       |  | CATEGORY FILTERS                   |
| ---------------------------------- |  | ---------------------------------- |
| [ 🔍 Search columns...           ] |  | [ + Add Filter ]   [ Clear all ]   |
|                                    |  |                                    |
| transaction_id       [Categorical] |  | +-- region ----------------------+ |
| amount               [Numeric    ] |  | | NA (42k) x  EU (12k) x         | |
| state                [Categorical] |  | | [🔍 Search 'region' values...] | |
| location_lat         [Numeric    ] |  | +--------------------------------+ |
| ... + 143 more.                    |  |                                    |
|                                    |  | +-- payment_method ---------------+|
|                                    |  | | [🔍 Search 'payment_method'...]||
|                                    |  | +--------------------------------+ |
+------------------------------------+  +------------------------------------+
    └─ Scrollable container (Max H)         └─ Scrollable container (Max H)
       Quick search filters list               Searchable combobox per filter

================================================================================
                                DATA PREVIEW
 DATA PREVIEW      Showing 1 to 50 of 1,450,239 filtered rows (1,450,239 total)
+------------------------------------------------------------------------------+
| #   | transaction_id | amount  | state | ...(+ 143 columns)...               |
|-----|----------------|---------|-------|-------------------------------------|
| 1   | 100421         | 420.50  | TX    | ...                                 |
| 2   | 100422         | 15.00   | CA    | ...                                 |
| 3   | 100423         | 1,320.9 | NY    | ...                                 |
| ... | ...            | ...     | ...   | ...                                 |
| 50  | 100470         | 45.00   | FL    | ...                                 |
+------------------------------------------------------------------------------+
 [ |< First ]  [ < Prev ]   Page 1 of 29,005   [ Next > ]  [ Last >| ]
```

## Key Interactive Flows Illustrated

1. **The numbers:** grouped formatting (`1,450,239`) makes the summary cards readable in under a second.
2. **Column-type search:** to fix `location_lat` in a 150-column dataset, the user types "loc"; the scrollable list filters down and they flip the toggle.
3. **High-cardinality filters:** unique values are not all rendered automatically. The user adds a filter block for `region`; for `state` (50 values) they use the searchable field instead of a 50-button wall.
4. **Pagination:** `Next` / page jumps let the user explore deep into the dataset.

The structure keeps the clean look of the existing Data tab while applying patterns that scale.
