import reflex as rx
import numpy as np
import scipy.stats as stats
import plotly.graph_objects as go


class LabState(rx.State):
    """The central state of the simulation."""
    mean: float = 0.0
    stdev: float = 1.0
    mode: str = "PDF"
    query_a: float = -1.0
    query_b: float = 1.0

    # --- Explicit setters (no auto-generated setters) ---
    def set_mode_value(self, value: str):
        self.mode = value

    def reset_lab(self):
        self.mean = 0.0
        self.stdev = 1.0
        self.mode = "PDF"
        self.query_a = -1.0
        self.query_b = 1.0

    # --- Slider handlers (receive list[float]) ---
    def set_mean_from_slider(self, value: list[float]):
        self.mean = value[0]

    def set_stdev_from_slider(self, value: list[float]):
        self.stdev = max(0.1, value[0])

    # --- Input handlers (receive str, clamped) ---
    def set_mean_from_input(self, value: str):
        try:
            self.mean = max(-5.0, min(5.0, float(value)))
        except ValueError:
            pass

    def set_stdev_from_input(self, value: str):
        try:
            self.stdev = max(0.1, min(5.0, float(value)))
        except ValueError:
            pass

    def set_query_a_from_input(self, value: str):
        try:
            self.query_a = float(value)
        except ValueError:
            pass

    def set_query_b_from_input(self, value: str):
        try:
            self.query_b = float(value)
        except ValueError:
            pass

    # --- Computed vars ---
    @rx.var
    def variance(self) -> str:
        return f"{self.stdev ** 2:.2f}"

    @rx.var
    def query_result(self) -> str:
        safe_stdev = max(self.stdev, 0.01)
        p = stats.norm.cdf(self.query_b, self.mean, safe_stdev) - \
            stats.norm.cdf(self.query_a, self.mean, safe_stdev)
        return f"{p * 100:.2f}%"

    @rx.var
    def prob_1sigma(self) -> str:
        safe_stdev = max(self.stdev, 0.01)
        p = stats.norm.cdf(self.mean + safe_stdev, self.mean, safe_stdev) - \
            stats.norm.cdf(self.mean - safe_stdev, self.mean, safe_stdev)
        return f"{p * 100:.1f}%"

    @rx.var
    def prob_2sigma(self) -> str:
        safe_stdev = max(self.stdev, 0.01)
        p = stats.norm.cdf(self.mean + 2 * safe_stdev, self.mean, safe_stdev) - \
            stats.norm.cdf(self.mean - 2 * safe_stdev, self.mean, safe_stdev)
        return f"{p * 100:.1f}%"

    @rx.var
    def prob_3sigma(self) -> str:
        safe_stdev = max(self.stdev, 0.01)
        p = stats.norm.cdf(self.mean + 3 * safe_stdev, self.mean, safe_stdev) - \
            stats.norm.cdf(self.mean - 3 * safe_stdev, self.mean, safe_stdev)
        return f"{p * 100:.1f}%"

    # --- The Plotly figure ---
    @rx.var
    def distribution_plot(self) -> go.Figure:
        safe_stdev = max(self.stdev, 0.01)
        x = np.linspace(self.mean - 4 * safe_stdev, self.mean + 4 * safe_stdev, 400)

        if self.mode == "PDF":
            y = stats.norm.pdf(x, loc=self.mean, scale=safe_stdev)
            title = "Probability Density Function (PDF)"
        else:
            y = stats.norm.cdf(x, loc=self.mean, scale=safe_stdev)
            title = "Cumulative Distribution Function (CDF)"

        # Main curve (orange)
        fig = go.Figure(data=go.Scatter(
            x=x, y=y, fill='tozeroy', line_color='#FF9D00',
            fillcolor='rgba(255, 157, 0, 0.2)', name='Distribution',
        ))

        # Shaded query region (blue) — only on PDF mode
        if self.mode == "PDF":
            mask = (x >= self.query_a) & (x <= self.query_b)
            x_shade = x[mask]
            if len(x_shade) > 0:
                y_shade = stats.norm.pdf(x_shade, loc=self.mean, scale=safe_stdev)
                fig.add_trace(go.Scatter(
                    x=x_shade, y=y_shade, fill='tozeroy',
                    fillcolor='rgba(65, 105, 225, 0.35)', line_color='royalblue',
                    name=f'P({self.query_a} < X < {self.query_b})',
                ))

        # Spread lines at mean +/- sigma
        fig.add_vline(x=self.mean, line_dash="solid", line_color="gray", line_width=1)
        fig.add_vline(x=self.mean - safe_stdev, line_dash="dash", line_color="#FF9D00", line_width=1.5,
                      annotation_text="-1 sigma", annotation_position="top left")
        fig.add_vline(x=self.mean + safe_stdev, line_dash="dash", line_color="#FF9D00", line_width=1.5,
                      annotation_text="+1 sigma", annotation_position="top right")

        fig.update_layout(
            title=title,
            template="plotly_white",
            height=400,
            xaxis_title="Values",
            yaxis_title="Probability",
            margin=dict(l=20, r=20, t=50, b=20),
            showlegend=False,
        )
        return fig
