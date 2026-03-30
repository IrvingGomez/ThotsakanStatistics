import reflex as rx
from Try_reflex.components.controls import panel_1_controls
from Try_reflex.components.observation import panel_2_observation
from Try_reflex.components.notebook import panel_3_notebook

def index() -> rx.Component:
    """The main lab bench layout"""
    return rx.container(
        rx.heading("Thotsakan Statistics Lab", size="8", margin_bottom="6", text_align="center"),
        # The 3 panels arranged horizontally
        rx.hstack(
            panel_1_controls(),
            panel_2_observation(),
            panel_3_notebook(),
            width="100%",
            align_items="stretch",
            spacing="4" # Gap between panels
        ),
        size="4", # Max width container
        padding="4",
    )

app = rx.App(theme=rx.theme(appearance="light", accent_color="orange"))
app.add_page(index, title="Thotsakan Lab")
