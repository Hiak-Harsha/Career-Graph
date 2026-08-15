# Career Graph 🚀
### Production-Grade Living Portfolio & Evidence-Backed Career Intelligence

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passed-success.svg?style=flat)]()

**Career Graph** is an evidence-led career intelligence platform that connects your GitHub repositories, code commits, and verified projects into a dynamic, interactive knowledge graph. It transforms verified work into a **Living Portfolio**, an **ATS & Visual Vector Resume Builder**, and an automated **Recruiter Matching Engine**.

---

## 🌟 Key Features

### 1. 🕸️ Interactive D3 Career Graph
- **Force-Directed Knowledge Graph**: Live graph topology connecting projects, technical domains, and verified skills.
- **Node Inspection Drawers**: Click any node to drill down into underlying git commits, PR references, and confidence metrics.
- **Physics Controls & Filters**: Custom gravity, link distance, charge tuning, and domain filtering.

### 2. 📄 Dual-Variant Vector Resume Builder
- **100% Vector Text ATS PDF**: Directly renders selectable, searchable vector PDFs formatted to standard ATS margins and typography (zero screenshot PNG bloat).
- **Executive Visual PDF**: Modern styled executive resume with proof badges and clickable evidence links.
- **Inline Customization & Persistence**: Real-time summary editing, bullet point tweaking, project selection, and full database persistence (`GET`/`POST`/`PUT`/`DELETE` `/api/resumes`).
- **AI Bullet & Summary Polishing**: One-click AI enhancement to refine technical impact and metric clarity.
- **ATS Plain Text Preview**: Instant copy-paste plain text generator for job application portals.

### 3. 🌐 Living Portfolio
- **Verified Technical Artifacts**: Showcase your work with complexity ratings, architecture tags, and repository links.
- **Problem-Solving Profile**: Analytical archetype detection based on confirmed skill usage patterns.
- **Skill Progression Bars**: Real-time exposure, depth, activity, and recency tracking.
- **Shareable Identity**: Instant clipboard link sharing for recruiters and peers.

### 4. 🎯 Recruiter Intelligence Match
- **Role-Based Evaluation**: Compares confirmed capabilities against target criteria (Software Engineer, ML Engineer, Backend Architect, Research Engineer).
- **Evidence-Backed Claims**: Validates each skill claim against concrete commits and releases.

### 5. 🛡️ Human-in-the-Loop Review Queue
- **AI Skill & Domain Proposals**: Review unconfirmed skills detected from your repositories before they impact your graph scores.
- **Audit Trails**: Confirm, reject, or adjust weights on detected technologies.

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
└───────────────────────────────────────────────┬─────────────────────────┼───────────────┘
                                                │ REST API                │
                                                ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js 16 + React 19 Frontend                                                          │
│                                                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────────┐  │
│  │  D3.js Career Graph │   │   Living Portfolio View │   │ Dual Vector Resume Engine │  │
│  │  (Force Simulation) │   │  (Artifacts, Progress)  │   │  (ATS & Visual jsPDF)     │  │
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

### Backend Setup (FastAPI)

1. Navigate to the root directory and activate the Python virtual environment:
   ```bash
   # Windows PowerShell
   .\backend\.venv\Scripts\Activate.ps1

   # Linux / macOS
   source backend/.venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Configure environment variables (optional for local mock testing):
   ```bash
   cp .env.example .env
   ```

4. Start the FastAPI backend server:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```
   API will be available at: `http://localhost:8000`  
   Interactive Swagger docs: `http://localhost:8000/docs`

---

### Frontend Setup (Next.js 16 / React 19)

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Frontend will be available at: `http://localhost:3000`

---

## 🧪 Testing & Verification

### Backend Automated Test Suite
Run 13 unit tests covering Auth, Sync, Resume CRUD, AI Polishing, and Recruiter Matching:
```bash
pytest backend/tests/test_api.py -v
```
*Result: 13/13 passed, 0 deprecation warnings.*

### Frontend Vitest Suite
Run 18 component and utility tests covering Graph View, Review Queue, Resume Builder, and Living Portfolio:
```bash
cd frontend
npm test
```
*Result: 18/18 passed.*

### TypeScript & Production Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📂 Project Structure

```
career-graph/
├── backend/
│   ├── app/
│   │   ├── analyzer.py       # Technical skill & domain extraction engine
│   │   ├── auth.py           # GitHub OAuth & secure session management
│   │   ├── config.py         # App configuration & environment validation
│   │   ├── database.py       # SQLAlchemy session & DB connection
│   │   ├── main.py           # FastAPI REST API endpoints
│   │   ├── models.py         # Relational database models (Resumes, Projects, Claims)
│   │   └── schemas.py        # Pydantic v2 validation schemas
│   ├── tests/
│   │   └── test_api.py       # Backend Pytest test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router (Dashboard & OAuth Callbacks)
│   │   ├── components/
│   │   │   ├── career/       # Problem-Solving profile & Trajectory tables
│   │   │   ├── domains/      # Domain cards & inspection drawers
│   │   │   ├── evidence/     # Evidence proof drawer & citation viewers
│   │   │   ├── graph/        # D3 Force-directed Career Graph
│   │   │   ├── portfolio/    # Living Portfolio presentation view
│   │   │   ├── projects/     # Project artifact cards
│   │   │   ├── recruiter/    # Candidate intelligence & criteria match
│   │   │   ├── resume/       # Dual-variant ATS & Visual Resume builder
│   │   │   ├── review/       # Unconfirmed skill review queue
│   │   │   └── ui/           # Sidebar navigation, modals, icons
│   │   ├── hooks/            # useCareerGraph, useResume, useRecruiter
│   │   ├── types/            # TypeScript interfaces & domain types
│   │   └── utils/            # pdfExport.ts (Vector ATS & Visual PDF)
│   └── package.json
├── career-graph.zip          # Production distribution archive
└── README.md
```

---

## 📜 License

MIT License. Designed and engineered for production-grade developer career intelligence.
