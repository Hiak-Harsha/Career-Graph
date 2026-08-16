# Career Graph 🚀
### Production-Grade Living Portfolio & Evidence-Backed Career Intelligence

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-52%2F52%20Passed-success.svg?style=flat)]()

**Career Graph** is an evidence-led career intelligence platform that connects your GitHub repositories, code commits, and verified projects into a dynamic, interactive knowledge graph. It transforms verified work into a **Living Portfolio**, a **Resume Intelligence Engine**, and an automated **Recruiter Matching Engine**.

---

## 🌟 Key Features

### 1. 🧠 Resume Intelligence Engine (Representation over Generation)
- **Professional Identity Model**: Automatically computes primary domains, emerging horizons, evidence strength, research orientation, project style, and trajectory directly from your Career Graph.
- **Resume Strategy Engine**: Curates role-specific context for target positions (*AI / ML Engineer*, *Backend Systems Engineer*, *Research Engineer*, *Full Stack*) with high-signal positioning theses.
- **Modular Block Representation**: Clean block-based architecture (`IdentityBlock`, `ProfessionalSignatureBlock`, `PositioningBlock`, `SelectedWorkBlock`, `TechnicalDepthBlock`, `CurrentTrajectoryBlock`, `ExperienceBlock`, `EducationBlock`).
- **5 Visual Layout Personalities**:
  - `Modern`: Balanced, recruiter-friendly cards with clean hierarchy.
  - `Technical`: Monospace architecture accents and engineering-focused badges.
  - `Editorial`: Elegant serif typography, research framing, and classic dividers.
  - `Research`: Methodology-focused with empirical proof callouts.
  - `Executive`: Systems-impact and trajectory-first layout.
- **Recruiter Critic & Gap Analysis**:
  - 10-second attention breakdown modeling what recruiters notice first.
  - Multidimensional Readiness Scores (*Role Relevance*, *Technical Depth*, *Evidence Strength*, *Clarity & Conciseness*).
  - *"What does my resume fail to communicate?"* analysis with **1-Click "Improve Representation"** execution.
- **Anti-Fabrication & Fact Validator**: Blocks hallucinations and unevidenced percentage claims ("improved performance by 40%"), replacing them with verified database evidence.

### 2. 🕸️ Interactive D3 Career Graph
- **Force-Directed Knowledge Graph**: Live graph topology connecting projects, technical domains, and verified skills.
- **Node Inspection Drawers**: Click any node to drill down into underlying git commits, PR references, and confidence metrics.
- **Physics Controls & Filters**: Custom gravity, link distance, charge tuning, and domain filtering.

### 3. 📄 Dual-Variant Vector Resume Builder & ATS Preview
- **100% Vector Text ATS PDF**: Renders selectable, searchable vector PDFs formatted to standard ATS margins and typography (zero screenshot PNG bloat).
- **Visual Vector PDF**: Personality-styled modern visual PDF with typography hierarchy and proof indicators.
- **ATS Plain Text Preview**: Instant copy-paste plain text generator for job application portals.

### 4. 🌐 Living Portfolio
- **Verified Technical Artifacts**: Showcase your work with complexity ratings, architecture tags, and repository links.
- **Problem-Solving Profile**: Analytical archetype detection based on confirmed skill usage patterns.
- **Skill Progression Bars**: Real-time exposure, depth, activity, and recency tracking.
- **Shareable Identity**: Instant clipboard link sharing for recruiters and peers (`/p/[username]`).

### 5. 🎯 Recruiter Intelligence Match & Review Queue
- **Role-Based Evaluation**: Compares confirmed capabilities against target criteria.
- **Human-in-the-Loop Review Queue**: Confirm, reject, or adjust weights on detected technologies before they impact graph scores.

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
│  │ Resume Intelligence Layer                                         │◀─┘               │
│  │ (Identity Model, Strategy Curation, Fact Validator, Critic Engine)│                  │
│  └───────────────────────────────────────────────────────────────────┘                  │
└───────────────────────────────────────────────┬─────────────────────────────────────────┘
                                                │ REST API
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js 16 + React 19 Frontend                                                          │
│                                                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────────┐  │
│  │  D3.js Career Graph │   │   Living Portfolio View │   │ Resume Intelligence View  │  │
│  │  (Force Simulation) │   │  (Artifacts, Progress)  │   │ (5 Personalities, Drawer) │  │
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

3. Run the development backend server:
   ```bash
   python -m uvicorn backend.app.main:app --reload --port 8000
   ```

---

### Frontend Setup (Next.js)

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

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Test Suites

### Backend Tests (Pytest)
```bash
# 15/15 tests passing
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_api.py -v
```

### Frontend Tests (Vitest)
```bash
# 37/37 tests passing
cd frontend
npm test
```

### Production Build & Typecheck
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 🔒 Security & Anti-Fabrication Safeguards
- **OAuth CSRF Protection**: Strict state nonce verification with timestamped expiration.
- **Repository URL Validation**: Enforces exact GitHub URL format and hostname checks.
- **Rate-Limiting & Idempotency**: Sync rate limits per user ID and global SHA-256 caching for LLM analyses.
- **Zero Fabricated Metrics**: Regex and database cross-validation prevents unauthorized synthetic percentage claims.

---

## 📄 License
MIT License. Created for verifiable career acceleration.
