import reflex as rx
from Try_reflex.state import LabState


def panel_1_controls() -> rx.Component:
    """Thotsakan's Hands: Sliders and Inputs"""
    return rx.card(
        rx.vstack(
            rx.heading("The Control Room", size="5", color_scheme="orange"),
            rx.divider(),

            # MEAN CONTROL
            rx.text("Mean", font_weight="bold"),
            rx.hstack(
                rx.slider(value=[LabState.mean], min_value=-5, max_value=5,
                          on_change=LabState.set_mean_from_slider, width="100%"),
                rx.input(value=LabState.mean.to_string(),
                         on_change=LabState.set_mean_from_input, width="80px"),
            ),

            # STDEV CONTROL
            rx.text("Standard Deviation", font_weight="bold", margin_top="4"),
            rx.hstack(
                rx.slider(value=[LabState.stdev], min_value=0.1, max_value=5, step=0.1,
                          on_change=LabState.set_stdev_from_slider, width="100%"),
                rx.input(value=LabState.stdev.to_string(),
                         on_change=LabState.set_stdev_from_input, width="80px"),
            ),

            # MODE TOGGLE
            rx.text("Mode", font_weight="bold", margin_top="4"),
            rx.radio(["PDF", "CDF"], value=LabState.mode,
                     on_change=LabState.set_mode_value, direction="row"),

            rx.divider(margin_top="4"),

            # PROBABILITY QUERY
            rx.text("Probability Query", font_weight="bold"),
            rx.text("P( a < X < b )", size="2", color="gray"),
            rx.hstack(
                rx.vstack(
                    rx.text("a", size="1"),
                    rx.input(value=LabState.query_a.to_string(),
                             on_change=LabState.set_query_a_from_input, width="80px"),
                    spacing="1",
                ),
                rx.text("<  X  <", font_weight="bold", padding_top="20px"),
                rx.vstack(
                    rx.text("b", size="1"),
                    rx.input(value=LabState.query_b.to_string(),
                             on_change=LabState.set_query_b_from_input, width="80px"),
                    spacing="1",
                ),
                align_items="center",
                spacing="2",
            ),

            rx.divider(margin_top="4"),

            # RESET BUTTON
            rx.button("Reset Lab", on_click=LabState.reset_lab,
                      margin_top="2", width="100%", color_scheme="red"),

            width="100%",
            spacing="3",
        ),
        width="25%",
        height="100%",
    )
