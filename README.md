# Career Graph 🚀
### Production-Grade Living Portfolio, Graph-Led Career Intelligence & Evidence-Backed Resume Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-58%2F58%20Passed-success.svg?style=flat)]()

**Career Graph** is an evidence-led career intelligence platform that connects your GitHub repositories, code commits, and verified projects into a dynamic, interactive knowledge graph. It transforms verified work into a **Living Portfolio**, an **Interactive Living Career Graph with Telemetry**, a **Resume Intelligence Engine with AI Polish**, a **Thought Lineage & Idea Incubator**, and an automated **Recruiter Matching Engine**.

---

## 🌟 Key Features

### 1. 🕸️ Interactive Living Career Graph with Flow Telemetry
- **Focus + Dim Neighborhood Isolation**: Clicking any node dims unrelated entities to 12% opacity, keeping the selected node and its direct 1st-degree connections 100% illuminated with thickened links and enhanced glows.
- **Flowing Animated Edges**: Continuous animated dash patterns (`stroke-dashoffset`) convey electrical current and data telemetry between verified nodes instead of static lines.
- **Growth Journey Replay ("Replay Your Journey")**: An interactive timeline player control that chronologically reconstructs the career graph step-by-step in the exact order projects and skills were built.
- **Trajectory Diff Mode ("Before vs. Now")**: Interactive 6-month delta toggle highlighting newly created competencies and elevated domain depth with glowing green halos and `+NEW` indicators.
- **Mobile Responsive List View Fallback**: Auto-adapting searchable card view below 480px with seamless canvas-to-list switching.
- **Orbital Depth & Mastery Rings**: Visual depth scaling where mastered domains feature rotating orbital rings, skills scale with verified evidence items, and projects scale by architecture complexity.
- **Cross-Domain Multi-Disciplinary Bridges**: Multi-tone linear gradient edges and glowing halos highlighting projects that bridge $\ge 2$ technical domains.

### 2. 🧠 Resume Intelligence Engine (Representation over Generation)
- **Professional Identity Model**: Automatically computes primary domains, emerging horizons, evidence strength, research orientation, project style, and trajectory directly from your Career Graph.
- **Interactive Inline Resume Editing & AI Polish**: Edit summary statements and bullet points in real-time with one-click AI polishing that normalizes action verbs and optimizes impact.
- **Resume Strategy Engine**: Curates role-specific context for target positions (*AI / ML Engineer*, *Backend Systems Engineer*, *Research Engineer*, *Full Stack*) with high-signal positioning theses.
- **Modular Block Representation**: Clean block-based architecture (`IdentityBlock`, `ProfessionalSignatureBlock`, `PositioningBlock`, `SelectedWorkBlock`, `TechnicalDepthBlock`, `CurrentTrajectoryBlock`, `ExperienceBlock`, `EducationBlock`, `CertificationsBlock`).
- **5 Visual Layout Personalities with Custom Motion Signatures**:
  - `Modern`: Balanced, recruiter-friendly cards with scale-up motion.
  - `Technical`: Monospace architecture accents with terminal-snap slide transitions.
  - `Editorial`: Elegant serif typography, research framing, and vertical drift animations.
  - `Research`: Methodology-focused with empirical proof callouts and optical blur dissolves.
  - `Executive`: Systems-impact and trajectory-first layout with accent bar sweeps.
- **Dynamic Recruiter Critic & Gap Analysis**:
  - 10-second attention breakdown modeling what recruiters notice first.
  - Empirical 6-Dimensional Readiness Scores (*Role Relevance*, *Evidence Coverage*, *Differentiation*, *Technical Depth*, *Clarity & Scannability*, *Claim Verification*).
  - *"What does my resume fail to communicate?"* analysis with **1-Click "Improve Representation"** execution.
- **Anti-Fabrication & Fact Validator**: Blocks hallucinations and unevidenced percentage claims, replacing them with verified database evidence.

### 3. 💡 Ideas Living Collective Entity & Thought Lineage
- **Collective Entity Lifecycle**: Track concepts across maturity stages (`EARLY`, `MID`, `MATURE`) with potential impact ratings.
- **Incremental Thought Lineage**: Log dated engineering notes, pivots, and research references as concepts evolve.
- **Trajectory Auto-Drafter**: Auto-senses candidate graph momentum and emerging technical domains to draft new system concepts.

### 4. 🌐 Living Portfolio & Credentials Management
- **Interactive Project Case Study Explorer**: Deep architectural narratives exploring Problem Statements & Goals, Key Technical Decisions, Empirically Verified Claims, and Retrospectives.
- **Live GitHub Activity Heatmap**: Interactive commit density heatmap computed directly from verified repository artifacts.
- **Skill Freshness & Decay Telemetry**: Visual indicators reflecting active maintenance vs. dormant competencies.
- **Comprehensive Credentials Editor**: Built-in modal UI to add, edit, and delete Work Experiences, Educations, Certifications, and Social/Portfolio links with live cache synchronization.
- **Problem-Solving Profile**: Analytical archetype detection based on confirmed skill usage patterns.
- **Shareable Public Identity (`/p/[username]`)**:
  - Full living portfolio view with verified evidence badges.
  - **15-Second Recruiter Fast Skim Mode** (`?mode=recruiter`) for quick executive evaluations.

### 5. 🎯 Recruiter Intelligence Match & Review Queue
- **Role-Based Evaluation**: Compares confirmed capabilities against target criteria.
- **Human-in-the-Loop Review Queue**: Confirm, reject, or adjust weights on detected technologies before they impact graph scores.

### 6. 💻 Standalone CLI Tool
- Inspect profile and capabilities from the terminal: `python cli.py profile`
- List and create incubator ideas: `python cli.py ideas list` / `python cli.py ideas create`
- Generate ASCII/plain-text resumes tailored to target roles: `python cli.py resume generate`

---

## 🏛️ System Architecture

```
                                  ┌───────────────────────────┐
                                  │    GitHub Repositories    │
                                  │  (Commits, PRs, Readmes)  │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FastAPI Backend Engine (Python 3.12 / 3.13)                                            │
│                                                                                         │
│  ┌───────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   Analyzer & Parser   │──▶│  Graph Inference Engine │──▶│   Relational Database   │  │
│  │ (Skills/Domains/Claim)│   │(Scores, Trajectory, ML) │   │ (Resumes, History, Ev.) │  │
│  └───────────────────────┘   └─────────────────────────┘   └────────────┬────────────┘  │
│                                                                         │               │
│  ┌───────────────────────────────────────────────────────────────────┐  │               │
│  │ Resume & Intelligence Layer                                       │◀─┘               │
│  │ (Identity Model, Strategy Curation, Fact Validator, Critic Engine)│                  │
│  └───────────────────────────────────────────────────────────────────┘                  │
└───────────────────────────────────────────────┬─────────────────────────────────────────┘
                                                │ REST API
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js 16 + React 19 Frontend                                                          │
│                                                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────────┐  │
│  │ D3 Living Graph     │   │   Living Portfolio View │   │ Resume Intelligence View  │  │
│  │ (Telemetry, Replay) │   │  (Credentials, Skim Mode│   │ (5 Styles, AI Polish)     │  │
│  └─────────────────────┘   └─────────────────────────┘   └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Python**: 3.12+ (or 3.13+)
- **Node.js**: 18+ (Node 20+ recommended)
- **Git**

---

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be live at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup (Next.js 16 + React 19)

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

### 3. Running the CLI Tool

```bash
cd backend

# View profile overview
python cli.py profile

# List ideas and thought lineage
python cli.py ideas list

# Generate an ASCII resume for a role
python cli.py resume generate --role "Backend Systems Engineer"
```

---

## 🧪 Test Suites & Quality Assurance

Career Graph is validated with comprehensive automated test suites across both layers:

### Backend Pytest Suite (19/19 Tests Passing)
```bash
cd backend
python -m pytest tests/ -v
```

Tests verify:
- JWT Bearer Authentication & 401 unauthenticated security rejection
- Nested UUID & DateTime JSON serialization across resume creation & updates
- Public portfolio identifier scoping & demo isolation
- Idea maturity persistence, lineage notes, and auto-drafting
- Dynamic 6-dimensional recruiter candidate critique
- Full CRUD operations for Work Experience, Education, Certifications, and Social Links
- Dual-variant vector resume generation & AI grammar improvements

### Frontend Vitest Suite (39/39 Tests Passing)
```bash
cd frontend
npx vitest run --pool=threads
```

Tests verify:
- `CareerGraphView`: Flow telemetry, focus/dim isolation, growth journey replay, and cross-domain legend
- `ResumeView`: Block rendering, 5 layout switches, interactive editing, certifications, and AI polish
- `PortfolioView`: Case studies, credentials management, proof links, and public link sharing
- `CandidateIntelligence`: Role matching, evidence drawers, and breakdown scoring
- `ReviewQueue`: Human-in-the-loop technology confirmation & rejection with compound keying
- `GitHubAuthModal`: PAT authentication & sync workflows

---

## 🛡️ Security & Privacy
- **Strict Default Posture**: `ALLOW_ANONYMOUS_DEV_LOGIN` is disabled by default. Protected endpoints require valid JWT authentication.
- **Public Portfolio Scoping**: Only exact verified usernames are publicly discoverable unless explicitly configured in demo mode.
- **Evidence Verification**: Skills, claims, and resume bullets link directly to deterministic commit SHA references.

---

## 📄 License
MIT License. Built for engineers seeking authentic, evidence-backed representation.
