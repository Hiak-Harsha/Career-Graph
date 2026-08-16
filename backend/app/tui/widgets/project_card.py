from textual.widgets import Static
from rich.panel import Panel
from rich.text import Text
from typing import List

class ProjectCardWidget(Static):
    """Renders a project card with technology chips and verified claims."""
    def __init__(self, title: str, description: str, technologies: List[str], claims: List[str], repo_url: str = "", **kwargs):
        super().__init__(**kwargs)
        self.proj_title = title
        self.proj_description = description
        self.technologies = technologies
        self.claims = claims
        self.repo_url = repo_url

    def render(self) -> Panel:
        content = Text()
        content.append(f"📦 {self.proj_title}\n", style="bold #38BDF8")
        if self.technologies:
            tech_str = " ".join([f"[{t}]" for t in self.technologies[:4]])
            content.append(f"{tech_str}\n", style="bold #3B82F6")
        if self.proj_description:
            content.append(f"{self.proj_description}\n\n", style="#94A3B8")
        if self.claims:
            for c in self.claims[:2]:
                content.append("  ✓ ", style="bold #10B981")
                content.append(f"{c}\n", style="#F8FAFC")
        return Panel(content, border_style="#232942", style="on #171B2C")
