import reflex as rx
from Try_reflex.state import LabState


def panel_3_notebook() -> rx.Component:
    """Thotsakan's Brain: Stats and Lessons"""
    return rx.card(
        rx.vstack(
            rx.heading("Lab Notebook", size="5", color_scheme="orange"),
            rx.divider(),

            rx.callout(
                rx.text(
                    "Currently observing a Normal Distribution with mean = ",
                    LabState.mean,
                    " and stdev = ",
                    LabState.stdev,
                    ".",
                ),
                icon="info",
                color_scheme="blue",
            ),

            # Summary Stats
            rx.heading("Summary", size="4", margin_top="4"),
            rx.text("Variance: ", LabState.variance),
            rx.text("Z-Score Area (1 sigma): ", LabState.prob_1sigma),
            rx.text("Z-Score Area (2 sigma): ", LabState.prob_2sigma),
            rx.text("Z-Score Area (3 sigma): ", LabState.prob_3sigma),

            rx.divider(margin_top="4"),

            # Query Result (highlighted)
            rx.heading("Query Result", size="4"),
            rx.callout(
                rx.text(
                    "P(", LabState.query_a, " < X < ", LabState.query_b,
                    ") = ", LabState.query_result,
                ),
                icon="calculator",
                color_scheme="orange",
            ),

            rx.divider(margin_top="4"),

            # The Lesson
            rx.heading("The Lesson", size="4"),
            rx.text(
                "Notice how decreasing the Standard Deviation makes the curve "
                "taller and thinner, concentrating the probability around the mean?"
            ),

            width="100%",
            spacing="3",
        ),
        width="25%",
        height="100%",
    )
