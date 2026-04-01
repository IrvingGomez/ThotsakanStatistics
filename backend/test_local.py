import pandas as pd
from services.descriptive import compute_descriptive_statistics, build_histogram, _advanced_id
import sys

df = pd.DataFrame({'A': [1.0, 2.0, 3.0, 4.0, 5.0], 'B': ['M', 'F', 'M', 'F', 'M']})
series = df['A']

stats_df = compute_descriptive_statistics(series, quantile_probs=[0.25, 0.5, 0.75])
print("Columns:", stats_df.columns.tolist())
for _, row in stats_df.iterrows():
    measure = str(row["Measure"])
    adv = _advanced_id(measure)
    if "Variance" in measure or "Std" in measure:
        print(f"Measure: '{measure}' -> advancedId: {adv}")
