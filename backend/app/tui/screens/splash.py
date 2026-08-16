from textual.screen import Screen
from textual.containers import Center, Middle
from textual.widgets import Static, Header, Footer
from textual.app import ComposeResult
from rich.text import Text
from rich.panel import Panel

BANNER = r"""
   ____                              ____                 _     
  / ___|__ _ _ __ ___  ___ _ __     / ___|_ __ __ _ _ __ | |__  
 | |   / _` | '__/ _ \/ _ \ '__|   | |  _| '__/ _` | '_ \| '_ \ 
 | |__| (_| | | |  __/  __/ |      | |_| | | | (_| | |_) | | | |
  \____\__,_|_|  \___|\___|_|       \____|_|  \__,_| .__/|_| |_|
                                                   |_|          
"""

class SplashScreen(Screen):
    """Boot sequence & splash animation."""
    BINDINGS = [
        ("enter", "continue", "Enter Dashboard"),
        ("space", "continue", "Enter Dashboard"),
        ("q", "quit", "Quit"),
    ]

    def __init__(self, reduced_motion: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.reduced_motion = reduced_motion
        self.char_index = 0
        self.full_title = "CAREER GRAPH — LIVING TECHNICAL DOSSIER & CLI NAVIGATOR"

    def compose(self) -> ComposeResult:
        yield Header()
        with Center():
            with Middle():
                yield Static(id="splash-banner")
                yield Static(id="splash-status")
                yield Static(
                    "[bold #10B981]Press [ENTER] to explore interactive career graph & dossier[/bold #10B981]\n"
                    "[dim #64748B]Use arrow keys or (1-5) to navigate · 'q' to exit[/dim #64748B]",
                    id="splash-hint"
                )
        yield Footer()

    def on_mount(self) -> None:
        banner_widget = self.query_one("#splash-banner", Static)
        text = Text(BANNER, style="bold #38BDF8")
        banner_widget.update(Panel(text, border_style="#3B82F6", style="on #0F121D"))
        
        status_widget = self.query_one("#splash-status", Static)
        if self.reduced_motion:
            status_widget.update(Text(self.full_title, style="bold #F8FAFC"))
        else:
            status_widget.update(Text("Initializing Career Graph...", style="italic #94A3B8"))
            self.set_timer(0.4, self._start_typing)

    def _start_typing(self) -> None:
        self.char_index = 0
        self.set_interval(0.025, self._type_next_char)

    def _type_next_char(self) -> None:
        if self.char_index <= len(self.full_title):
            typed = self.full_title[:self.char_index]
            status_widget = self.query_one("#splash-status", Static)
            status_widget.update(Text(f"> {typed}█", style="bold #38BDF8"))
            self.char_index += 1

    def action_continue(self) -> None:
        self.app.switch_screen("dashboard")

    def action_quit(self) -> None:
        self.app.exit()
