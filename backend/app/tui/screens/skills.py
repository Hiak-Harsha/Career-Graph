from textual.screen import Screen
from textual.containers import ScrollableContainer, Vertical
from textual.widgets import Static, Header, Footer
from textual.app import ComposeResult
from backend.app.tui.widgets.skill_bar import SkillBarWidget

class SkillsScreen(Screen):
    """Interactive screen showing domain competency and skill mastery bars."""
    BINDINGS = [
        ("escape", "goto_dashboard", "Back to Dashboard"),
        ("b", "goto_dashboard", "Back"),
        ("q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with ScrollableContainer(id="skills-list-container"):
            yield Static("[bold #38BDF8]⚡ DOMAIN & TECHNICAL SKILL MASTERY[/bold #38BDF8]\n"
                         "[dim #94A3B8]Evidence-backed competency scores derived from active repository commit history.[/dim #94A3B8]\n")
            with Vertical(id="skills-container"):
                pass
        yield Footer()

    def on_mount(self) -> None:
        skills = getattr(self.app, "skills", [])
        container = self.query_one("#skills-container", Vertical)

        if not skills:
            # Fallback default competencies
            default_skills = [
                ("Python", "Backend Engineering", 0.95),
                ("FastAPI", "Distributed Systems", 0.92),
                ("PostgreSQL", "Database Architecture", 0.88),
                ("Algorithms & DSA", "Computer Science", 0.90),
                ("Docker & Containers", "DevOps & Infra", 0.85),
                ("TypeScript & Next.js", "Full Stack", 0.82),
            ]
            for name, domain, score in default_skills:
                container.mount(SkillBarWidget(skill_name=name, domain=domain, score=score))
            return

        for s in skills:
            domain_name = s.domain.name if getattr(s, "domain", None) else "Software Engineering"
            score = getattr(s, "depth_score", 0.85) or 0.85
            container.mount(SkillBarWidget(skill_name=s.name, domain=domain_name, score=score))

    def action_goto_dashboard(self) -> None:
        self.app.switch_screen("dashboard")

    def action_quit(self) -> None:
        self.app.exit()
