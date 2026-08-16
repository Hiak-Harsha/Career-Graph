from textual.screen import Screen
from textual.containers import ScrollableContainer, Vertical
from textual.widgets import Static, Header, Footer
from textual.app import ComposeResult
from backend.app.tui.widgets.project_card import ProjectCardWidget

class ProjectsScreen(Screen):
    """Interactive screen listing engineering projects and verified claims."""
    BINDINGS = [
        ("escape", "goto_dashboard", "Back to Dashboard"),
        ("b", "goto_dashboard", "Back"),
        ("q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with ScrollableContainer(id="projects-list-container"):
            yield Static("[bold #38BDF8]📦 VERIFIED ENGINEERING PROJECTS & REPOSITORIES[/bold #38BDF8]\n"
                         "[dim #94A3B8]Each repository contains verified commit hashes and empirical claims.[/dim #94A3B8]\n")
            with Vertical(id="projects-container"):
                pass
        yield Footer()

    def on_mount(self) -> None:
        projects = getattr(self.app, "projects", [])
        container = self.query_one("#projects-container", Vertical)

        if not projects:
            container.mount(Static("[italic #94A3B8]No projects synced yet. Run `python cli.py sync` to import GitHub repos.[/italic #94A3B8]"))
            return

        for p in projects:
            skills = [s.name for s in getattr(p, "skills", [])]
            claims = [c.claim for c in getattr(p, "claims", [])]
            widget = ProjectCardWidget(
                title=p.title,
                description=p.description or "Engineered verified technical implementation.",
                technologies=skills,
                claims=claims,
                repo_url=p.repository_url or ""
            )
            container.mount(widget)

    def action_goto_dashboard(self) -> None:
        self.app.switch_screen("dashboard")

    def action_quit(self) -> None:
        self.app.exit()
