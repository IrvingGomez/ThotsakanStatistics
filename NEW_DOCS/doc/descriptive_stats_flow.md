# Data Flow (Original Gradio App): Data Tab to Descriptive Statistics

> **Legacy reference.** This page describes the professor's original **Gradio** app (`ThotsakanStatistics/`, branch `main`), not the React + FastAPI app. All file paths below (`state/app_state.py`, `ui/…`, `controllers/…`) are relative to `ThotsakanStatistics/`. It is kept because the React app was ported from this flow. Differences in the React app: uploads are CSV only and held in a backend session (not a global `AppState`), filters are sent with each request and applied server-side, and the Data tab does not accept Excel files.

## 1. Global State Management (`AppState`)
The Gradio app relies on a centralized state object, `AppState` (`state/app_state.py`). It is created once when the app launches (`ui/layout.py`) and passed to all tabs. It is the single source of truth for the data and holds:
- `state.df`: the raw, unmodified dataset.
- `state.filtered_df`: the dataset after applying filters.
- `state.numeric_cols` & `state.categorical_cols`: the columns classified by data type.

## 2. Data Upload & Modification (The Data Tab)
When a user interacts with the **Data Tab** (`ui/tabs/data_tab.py` & `controllers/data_controller.py`):
1. **Upload**: uploading a CSV/Excel file triggers `on_file_upload`. The app reads the file and populates `state.df` and `state.filtered_df`, and infers which columns are numeric and which are categorical.
2. **Filtering**: category filters (max 3 at a time) are applied by `apply_category_filters`, which stores the subset in `state.filtered_df`. `state.df` stays untouched so the user can revert.
3. **Reclassification**: the "Fix Variable Type" tools move columns between `state.numeric_cols` and `state.categorical_cols` when automatic inference is wrong.

## 3. Data Consumption (Estimation Tab > Descriptive Statistics)
When a user opens **Descriptive Statistics** (`ui/tabs/estimation/descriptive_tab.py`):
1. **Fetching columns**: "Refresh Numeric Columns" reads `state.numeric_cols` and fills the "Select Numeric Variable" and "Weights Column" dropdowns.
2. **Running the stats**: after configuring Quantiles, Trimmed Mean and Winsorized Limits, the user clicks "Run Descriptive Statistics":
   - The GUI calls `run_descriptive_statistics` in `controllers/estimation/descriptive_controller.py`.
   - The controller uses `state.filtered_df` if filters are active, otherwise `state.df`.
   - It extracts the requested column, silently dropping missing (`NaN`) values.
   - If a weights column is chosen, it extracts and binds those weights to the data points.
3. **Computation & display**: the data goes to `core.estimation.descriptive`. The summary table is formatted with `state.display_precision` and shown in a `gr.Dataframe`.
4. **Export**: the table is stored as `state.export_table`, so "Download Table as CSV" exports exactly what the user just generated.

### Summary of the Flow
**File Upload** ➔ `state.df` & `state.filtered_df` & `state.numeric_cols` ➔ **Filters / type fixes** (modify `state.filtered_df` / lists) ➔ **Descriptive Stats tab** reads `state.numeric_cols` for dropdowns ➔ runs on `state.filtered_df` (or `state.df`) ➔ displays results and saves `state.export_table` for download.

---

## Elements Accessible via the Gradio GUI

### Data Tab
*   **File input**: upload CSV or Excel (`gr.File`).
*   **Status**: upload success/failure (`gr.Textbox`).
*   **Previews**:
    *   "Show Preview" checkbox (raw dataframe) (`gr.Checkbox`).
    *   "Show Dataset Summary" checkbox (descriptive summary and variable types) (`gr.Checkbox`).
*   **Filtering**:
    *   "Filter Data" accordion (`gr.Accordion`).
    *   Dropdown to select up to 3 categorical columns (`gr.Dropdown`).
    *   Dynamic dropdowns for the categories of each chosen column (Filter 1–3) (`gr.Dropdown`).
    *   "Apply Filter" button (`gr.Button`) and filter status (`gr.Textbox`).
    *   Preview and summary checkboxes for the *filtered* dataset (`gr.Checkbox`).
*   **Reclassification**:
    *   "Fix Variable Type" accordion (`gr.Accordion`).
    *   "Reclassify Numeric Column as Categorical" dropdown + button.
    *   "Reclassify Categorical Column as Numeric" dropdown + button.
    *   Status textbox (`gr.Textbox`).
*   **Outputs**: dataframes for the CSV preview, descriptive summary and variable types, for raw and filtered data (`gr.Dataframe`).

### Estimation Tab > Descriptive Statistics
*   **Variable selection**:
    *   "Refresh Numeric Columns" button (`gr.Button`).
    *   "Select Numeric Variable" dropdown (from `state.numeric_cols`) (`gr.Dropdown`).
    *   "Weights Column (optional)" dropdown (`gr.Dropdown`).
*   **Parameters**:
    *   "Quantiles" (default `0.25, 0.5, 0.75`) (`gr.Textbox`).
    *   "Trimmed Mean α" (default `0.1`) (`gr.Textbox`).
    *   "Winsorized Limits" (default `0.1, 0.1`) (`gr.Textbox`).
*   **Execution**: "Run Descriptive Statistics" button (`gr.Button`).
*   **Outputs & export**:
    *   Statistics table (`gr.Dataframe`).
    *   "Filename" input (appears after running) (`gr.Textbox`).
    *   "Download Table as CSV" button (`gr.Button`).
    *   Download link (`gr.File`).
