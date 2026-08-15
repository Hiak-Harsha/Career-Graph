# Career Graph — Full Rebuild Task Tracker

## Phase 0 — Repo Hygiene & Dead Code Cleanup
- [x] Audit top-level duplicate components and confirm zero remaining imports
- [x] Relocate `ReviewQueue` logic to `src/components/review/ReviewQueue.tsx` and `ReviewQueue.module.css`
- [x] Delete `components/DomainCard.tsx`, `ProjectCard.tsx`, `Sidebar.tsx`, `SkillBadge.tsx`, `ReviewQueue.tsx`, `components.module.css`
- [x] Remove default Next.js starter assets from `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`)
- [x] Catalog all inline `style={{...}}` occurrences across `frontend/src` for Phase 1 migration
- [x] Verify clean Next.js build (`npm run build` exits 0 with zero errors)

## Phase 1 — Design System Enforcement & Branding
- [x] Add `lucide-react` and `framer-motion` to `package.json`
- [x] Replace text/emoji symbols with consistent Lucide icons across all components
- [x] Add minimal SVG brand mark for "Career Graph" + "Core" status badge + `favicon.svg`
- [x] Migrate cataloged inline `style={{...}}` instances to CSS modules (100% clean, only dynamic % progress bars remain)
- [x] Add explicit typographic scale tokens (`--text-xs` to `--text-5xl`) in `globals.css`
- [x] Add view transitions and staggered card motion with Framer Motion
- [x] Restyle `app/auth/callback/page.tsx` using CSS modules and design tokens
- [x] Verify Next.js build (`npm run build` exits 0 with zero errors)

## Phase 2 — Surface Invisible Analytical Data
- [x] Build "Problem-Solving Profile" component on DashboardView (`problemSolving` data)
- [x] Build "Skill Progress" view (`skillsProgress` grouped by domain with progress bars)
- [x] Wire `ReviewQueue` into navigation with pending badge count and action handlers
- [x] Map all backend response fields to verify zero orphaned analytical metrics

## Phase 3 — Flagship Interactive Career Graph
- [x] Replace `GraphPlaceholder` with interactive D3 force-directed node graph
- [x] Connect node clicks to `EvidenceDrawer` (projects) and `DomainDrawer` (domains)
- [x] Add pill filter controls, zoom/pan controls, and empty state
- [x] Verify Next.js build (`npm run build` exits 0 with zero errors)

## Phase 4 — Resume Builder Depth
- [x] Build "ATS Preview" modal (formatting-stripped plain text export view)
- [x] Implement "Evidence View" inline citation chips linking to `EvidenceDrawer`
- [x] Add reliable client/server PDF generation replacing raw print fallback
- [x] Verify role-specific selection changes
- [x] Verify Next.js build (`npm run build` exits 0 with zero errors)

## Phase 5 — Testing & QA Loop
- [x] Add Vitest + React Testing Library for frontend component/hook tests (15/15 tests passing)
- [x] Set up Vitest test environment with JSDOM and CSS module mock
- [x] Verify backend pytest suite (10/10 tests passing)
- [x] Verify manual QA: keyboard accessibility, drawer dismissals, responsive layouts, empty states
- [x] Verify production build (`npm run build` exits 0 with zero errors)
