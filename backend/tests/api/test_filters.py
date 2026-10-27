import io

import pandas as pd

from api.deps import apply_filters

# A blank cell makes pandas read a numeric category as float, so its values print as "1.0"
# while the Data tab sends the CSV text "1".
CSV = "x,g\n1,1\n2,1\n3,2\n4,\n5,1\n6,2\n"


def test_numeric_category_with_a_blank_cell_matches_the_csv_text():
    df = pd.read_csv(io.StringIO(CSV))
    assert apply_filters(df, {"g": ["1"]})["x"].tolist() == [1, 2, 5]


def test_text_categories_match_exactly():
    df = pd.DataFrame({"x": [1, 2, 3], "g": ["a", "b", "a"]})
    assert apply_filters(df, {"g": ["a"]})["x"].tolist() == [1, 3]


def test_no_filters_keeps_every_row():
    df = pd.read_csv(io.StringIO(CSV))
    assert len(apply_filters(df, None)) == len(apply_filters(df, {"g": []})) == 6
