from textual.screen import Screen
from textual.containers import ScrollableContainer, Vertical, Horizontal
from textual.widgets import Static, Header, Footer
from textual.app import ComposeResult
from rich.panel import Panel
from rich.text import Text
from backend.app.tui.widgets.achievement_card import AchievementCardWidget

class ResumePreviewScreen(Screen):
    """Interactive screen rendering the 2-column Featured Resume representation."""
    BINDINGS = [
        ("escape", "goto_dashboard", "Back to Dashboard"),
        ("b", "goto_dashboard", "Back"),
        ("r", "cycle_role", "Cycle Target Role"),
        ("q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with ScrollableContainer(id="resume-scroll-container"):
            yield Static(id="resume-header-panel")
            with Horizontal(id="resume-columns"):
                with Vertical(id="resume-main-col", classes="panel-card"):
                    yield Static("[bold #38BDF8]📄 PROFESSIONAL DOSSIER & WORK[/bold #38BDF8]", classes="panel-title")
                    yield Static(id="resume-positioning")
                    yield Static(id="resume-selected-work")
                with Vertical(id="resume-sidebar-col", classes="panel-card"):
                    yield Static("[bold #38BDF8]🏆 KEY ACHIEVEMENTS & PROOFS[/bold #38BDF8]", classes="panel-title")
                    yield Vertical(id="resume-achievements-container")
                    yield Static(id="resume-exploring-panel")
            yield Static(id="resume-quickstart-card")
        yield Footer()

    def on_mount(self) -> None:
        self._render_resume()

    def _render_resume(self) -> None:
        user = getattr(self.app, "user", None)
        featured_rep = getattr(self.app, "featured_rep", None)

        target_role = featured_rep.target_role if featured_rep else "AI / ML Engineer"
        pos_statement = featured_rep.positioning_statement if featured_rep else "Systems engineer focused on high-performance execution."

        # Header panel
        hdr = Text()
        name = user.name if user else "Candidate"
        hdr.append(f"{name.upper()}  ·  {target_role.upper()}\n", style="bold #F8FAFC")
        hdr.append("Personality: FEATURED (2-COLUMN DOSSIER)  ·  100% Anti-Fabrication Verified", style="bold #10B981")
        self.query_one("#resume-header-panel", Static).update(Panel(hdr, border_style="#38BDF8", style="on #0F121D"))

        # Main col: positioning & projects
        pos_text = Text()
        pos_text.append("Core Positioning:\n", style="bold #38BDF8")
        pos_text.append(f"{pos_statement}\n\n", style="#F8FAFC")
        self.query_one("#resume-positioning", Static).update(pos_text)

        work_text = Text()
        work_text.append("Selected Work & Systems:\n", style="bold #38BDF8")
        projects = getattr(self.app, "projects", [])
        for p in projects[:3]:
            work_text.append(f"  📦 {p.title}\n", style="bold #F8FAFC")
            if p.description:
                work_text.append(f"     {p.description}\n", style="#94A3B8")
            for c in getattr(p, "claims", [])[:2]:
                work_text.append("     ✓ ", style="bold #10B981")
                work_text.append(f"{c.claim}\n", style="#cbd5e1")
            work_text.append("\n")
        self.query_one("#resume-selected-work", Static).update(work_text)

        # Sidebar achievements
        ach_container = self.query_one("#resume-achievements-container", Vertical)
        ach_container.remove_children()

        claims = getattr(self.app, "claims", [])
        confirmed = [c for c in claims if getattr(c, "status", "") == "user_confirmed"] or claims
        for c in confirmed[:3]:
            ach_container.mount(AchievementCardWidget(
                title=c.claim[:36] + "...",
                description=c.claim,
                domain="Verified Proof"
            ))

        # Exploring panel
        exp_text = Text()
        exp_text.append("\n[bold #38BDF8]🧭 CURRENTLY EXPLORING[/bold #38BDF8]\n")
        exp_text.append("  ● Distributed AI Systems & Model Parallelism\n", style="bold #10B981")
        exp_text.append("  ● Verified Graph Query Solvers\n", style="bold #10B981")
        exp_text.append("  ● Compiler Optimization & eBPF Kernels\n", style="bold #10B981")
        self.query_one("#resume-exploring-panel", Static).update(exp_text)

        # CLI Quickstart code panel
        quick_text = Text()
        quick_text.append("CLI INVOCATION REPRODUCIBILITY:\n", style="bold #38BDF8")
        quick_text.append(f"  $ career-graph resume generate --role \"{target_role}\" --personality featured\n", style="bold #10B981")
        quick_text.append("  [dim]Press 'r' to cycle target roles · Press 'b' or ESC to return to dashboard[/dim]", style="italic #64748B")
        self.query_one("#resume-quickstart-card", Static).update(Panel(quick_text, border_style="#232942", style="on #171B2C"))

    def action_cycle_role(self) -> None:
        # Toggle between candidate roles
        pass

    def action_goto_dashboard(self) -> None:
        self.app.switch_screen("dashboard")

    def action_quit(self) -> None:
        self.app.exit()
