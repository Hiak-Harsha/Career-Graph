from textual.app import App
from textual.binding import Binding
from backend.app.tui.theme import TUI_CSS
from backend.app.tui.screens.splash import SplashScreen
from backend.app.tui.screens.dashboard import DashboardScreen
from backend.app.tui.screens.projects import ProjectsScreen
from backend.app.tui.screens.skills import SkillsScreen
from backend.app.tui.screens.resume_preview import ResumePreviewScreen
from backend.app.tui.screens.ideas import IdeasScreen

from backend.app.database import SessionLocal
from backend.app.models import User, Project, Skill, Idea, Claim
from backend.app.main import compute_candidate_professional_identity, build_featured_resume

class CareerGraphTUI(App):
    """Full-featured interactive TUI portfolio & resume navigator."""
    CSS = TUI_CSS
    TITLE = "Career Graph Portfolio Navigator"

    BINDINGS = [
        Binding("q", "quit", "Quit", show=True),
        Binding("?", "help", "Help", show=True),
    ]

    SCREENS = {
        "splash": lambda: SplashScreen(),
        "dashboard": lambda: DashboardScreen(),
        "projects": lambda: ProjectsScreen(),
        "skills": lambda: SkillsScreen(),
        "resume": lambda: ResumePreviewScreen(),
        "ideas": lambda: IdeasScreen(),
    }

    def __init__(self, reduced_motion: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.reduced_motion = reduced_motion
        self.db = SessionLocal()

        # Load user and graph context
        self.user = self.db.query(User).first()
        if self.user:
            self.identity = compute_candidate_professional_identity(self.user, self.db)
            self.projects = self.db.query(Project).filter(Project.user_id == self.user.id).all()
            self.skills = self.db.query(Skill).all()
            self.ideas = self.db.query(Idea).filter(Idea.user_id == self.user.id).all()
            self.claims = self.db.query(Claim).filter(Claim.user_id == self.user.id).all()
            try:
                self.featured_rep = build_featured_resume(self.user, self.db)
            except Exception:
                self.featured_rep = None
        else:
            self.identity = None
            self.projects = []
            self.skills = []
            self.ideas = []
            self.claims = []
            self.featured_rep = None

    def on_mount(self) -> None:
        self.push_screen(SplashScreen(reduced_motion=self.reduced_motion))

    def on_unmount(self) -> None:
        if self.db:
            self.db.close()


def run_tui(reduced_motion: bool = False) -> None:
    """Entry point function to launch the TUI navigator."""
    app = CareerGraphTUI(reduced_motion=reduced_motion)
    app.run()
