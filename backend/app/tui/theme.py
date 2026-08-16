"""Design tokens and CSS theme for Career Graph TUI mirrored from frontend/src/app/globals.css."""

BG_PRIMARY = "#06080F"
BG_SURFACE = "#0F121D"
BG_CARD = "#171B2C"
BORDER_SUBTLE = "#232942"
ACCENT_PRIMARY = "#3B82F6"
ACCENT_CYAN = "#38BDF8"
ACCENT_EMERALD = "#10B981"
ACCENT_AMBER = "#F59E0B"
TEXT_PRIMARY = "#F8FAFC"
TEXT_SECONDARY = "#94A3B8"
TEXT_MUTED = "#64748B"

TUI_CSS = """
Screen {
    background: #06080F;
    color: #F8FAFC;
}

Header {
    background: #0F121D;
    color: #38BDF8;
    dock: top;
    height: 1;
}

Footer {
    background: #0F121D;
    color: #94A3B8;
    dock: bottom;
    height: 1;
}

#splash-container {
    align: center middle;
    width: 100%;
    height: 100%;
}

#splash-card {
    width: 68;
    height: auto;
    border: round #38BDF8;
    background: #0F121D;
    padding: 1 2;
    align: center middle;
}

#splash-title {
    text-align: center;
    color: #38BDF8;
    text-style: bold;
}

#splash-subtitle {
    text-align: center;
    color: #94A3B8;
    margin-bottom: 1;
}

.dashboard-grid {
    layout: grid;
    grid-size: 2 2;
    grid-gutter: 1;
    padding: 1;
    height: 100%;
}

.panel-card {
    background: #0F121D;
    border: round #232942;
    padding: 1;
    height: 100%;
}

.panel-card:focus {
    border: round #38BDF8;
}

.panel-title {
    color: #38BDF8;
    text-style: bold;
    margin-bottom: 1;
}

.project-item {
    background: #171B2C;
    border: solid #232942;
    margin-bottom: 1;
    padding: 1;
}

.project-item:hover {
    border: solid #38BDF8;
}

.achievement-pill {
    background: #171B2C;
    border-left: thick #10B981;
    padding: 0 1;
    margin-bottom: 1;
}

.skill-row {
    height: 1;
    margin-bottom: 1;
}

.keybind-hint {
    color: #64748B;
    text-style: italic;
}
"""
