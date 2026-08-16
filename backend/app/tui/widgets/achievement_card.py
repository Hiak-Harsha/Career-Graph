from textual.widgets import Static
from rich.panel import Panel
from rich.text import Text

class AchievementCardWidget(Static):
    """Renders a verified achievement proof card."""
    def __init__(self, title: str, description: str, domain: str = "Systems", **kwargs):
        super().__init__(**kwargs)
        self.ach_title = title
        self.ach_description = description
        self.domain = domain

    def render(self) -> Panel:
        content = Text()
        content.append("● ", style="bold #10B981")
        content.append(f"{self.ach_title}\n", style="bold #F8FAFC")
        content.append(f"{self.ach_description}\n", style="#94A3B8")
        content.append(f"Domain: {self.domain} · Verified Evidence Attached", style="italic #38BDF8")
        return Panel(content, border_style="#232942", style="on #171B2C")
