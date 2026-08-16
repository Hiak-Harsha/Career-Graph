from textual.screen import Screen
from textual.containers import ScrollableContainer, Vertical
from textual.widgets import Static, Header, Footer
from textual.app import ComposeResult
from rich.panel import Panel
from rich.text import Text

class IdeasScreen(Screen):
    """Interactive screen showing project ideas & thought lineage timeline."""
    BINDINGS = [
        ("escape", "goto_dashboard", "Back to Dashboard"),
        ("b", "goto_dashboard", "Back"),
        ("q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with ScrollableContainer(id="ideas-list-container"):
            yield Static("[bold #38BDF8]💡 THOUGHT LINEAGE & ARCHITECTURAL IDEAS[/bold #38BDF8]\n"
                         "[dim #94A3B8]Evolutionary ideas connecting graph momentum to next engineering milestones.[/dim #94A3B8]\n")
            with Vertical(id="ideas-container"):
                pass
        yield Footer()

    def on_mount(self) -> None:
        ideas = getattr(self.app, "ideas", [])
        container = self.query_one("#ideas-container", Vertical)

        if not ideas:
            default_ideas = [
                ("Unified LLM Cache & Deduplication Layer", "EXPLORATION", "High-throughput token deduplication engine for multi-agent workflows."),
                ("Distributed Consensus Visualizer", "IN_PROGRESS", "Interactive web tool for observing Raft election edge cases."),
                ("Kernel eBPF Trace Analyzer", "COMPLETED", "Lightweight diagnostic probe for Linux socket buffer latency."),
            ]
            for title, stage, desc in default_ideas:
                content = Text()
                content.append(f"💡 {title}\n", style="bold #38BDF8")
                content.append(f"Stage: [{stage}]  ·  Maturity: Active Momentum\n", style="bold #10B981")
                content.append(f"{desc}", style="#94A3B8")
                container.mount(Static(Panel(content, border_style="#232942", style="on #171B2C")))
            return

        for idea in ideas:
            content = Text()
            content.append(f"💡 {idea.title}\n", style="bold #38BDF8")
            status_style = "bold #10B981" if idea.status == "COMPLETED" else "bold #38BDF8"
            content.append(f"Status: [{idea.status}]  ·  Domain: {getattr(idea.domain, 'name', 'Engineering')}\n", style=status_style)
            if idea.description:
                content.append(f"{idea.description}\n", style="#94A3B8")
            container.mount(Static(Panel(content, border_style="#232942", style="on #171B2C")))

    def action_goto_dashboard(self) -> None:
        self.app.switch_screen("dashboard")

    def action_quit(self) -> None:
        self.app.exit()
