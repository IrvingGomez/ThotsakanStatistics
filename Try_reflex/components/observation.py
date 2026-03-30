import reflex as rx
from Try_reflex.state import LabState

def panel_2_observation() -> rx.Component:
    """Thotsakan's Eyes: The Plotly Graph"""
    return rx.card(
        rx.vstack(
            rx.heading("Observation Deck", size="5", color_scheme="orange"),
            rx.divider(),
            rx.plotly(data=LabState.distribution_plot, height="400px", width="100%"),
            width="100%",
        ),
        width="50%",
        height="600px",
    )
