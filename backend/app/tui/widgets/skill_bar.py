from textual.widgets import Static
from rich.panel import Panel
from rich.text import Text

class SkillBarWidget(Static):
    """Renders a competency / skill mastery bar in terminal."""
    def __init__(self, skill_name: str, domain: str, score: float = 0.85, **kwargs):
        super().__init__(**kwargs)
        self.skill_name = skill_name
        self.domain = domain
        self.score = max(0.0, min(1.0, score))

    def render(self) -> Panel:
        pct = int(self.score * 100)
        filled = int(self.score * 20)
        unfilled = 20 - filled
        bar = "█" * filled + "░" * unfilled

        content = Text()
        content.append(f"{self.skill_name:<20}", style="bold #F8FAFC")
        content.append(f" {bar} ", style="bold #38BDF8")
        content.append(f"{pct}%  ", style="bold #10B981")
        content.append(f"({self.domain})", style="#94A3B8")
        return Panel(content, border_style="#232942", style="on #171B2C")
