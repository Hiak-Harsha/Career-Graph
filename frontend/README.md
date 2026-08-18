# Career Graph Frontend

Production Next.js 16 (App Router + Turbopack) frontend for **Career Graph** — the evidence-backed career intelligence and living professional identity platform.

---

## 1. Architecture & Capabilities

- **Framework**: Next.js 16 with Turbopack bundler, React 19, TypeScript.
- **Design System**: Modular CSS design tokens (`src/app/globals.css`), CSS Modules, zero ad-hoc styling utility sprawl, responsive layouts.
- **Views**:
  - `Overview / Graph`: Interactive Force Graph and Strata capability layer visualizations.
  - `Work`: Selected work, Thought Lineage (`Ideas`), and Evidence Store with commit hashes.
  - `Development`: Emerging domain trajectories, Skill depth metrics, and chronological Timeline.
  - `Profiles & Representation`:
    - **Living Portfolio**: Public view (`/p/[username]`) with verified case studies and proof drawers.
    - **Resume Engine**: Dual-format (ATS Clean vector representation & Visual Editorial) with 10-second Recruiter Critique, Proof inspection, and 1-Click Gap Repair.
    - **Recruiter Match**: 4-Dimension mathematical role-fit scoring (`35% capability`, `30% evidence`, `20% recency`, `15% depth`), custom JD decomposition, and "Why We Think This" explainability cards.
    - **Review Queue**: Staged review system ensuring zero unconfirmed AI inferences become profile facts.

---

## 2. Environment Configuration

Create `.env.local` inside `frontend/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 3. Development & Verification

### Install Dependencies
```bash
npm install
```

### Run Local Dev Server
```bash
npm run dev
# App will run at http://localhost:3000
```

### TypeScript Typecheck
```bash
npx tsc --noEmit
```

### Run Frontend Unit Tests
```bash
npx vitest run
```

### Production Build
```bash
npm run build
```

