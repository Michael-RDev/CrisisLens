# AGENTS.md

## Purpose
This file gives Codex (and other coding agents) a source-of-truth guide for working in this repository quickly and safely.

## Development Approach (TDD First)
- We use TDD by default for feature work and bug fixes.
- Workflow:
  - `Red`: add/update a failing test first (Vitest for logic/helpers, Playwright for user flows/API contracts).
  - `Green`: implement the minimal code change to pass.
  - `Refactor`: clean up while keeping tests green.
- Minimum validation before handoff:
  - `npm run test`
  - `npm run test:unit`
  - `npm run test:e2e` (or targeted `test:e2e:ui` / `test:e2e:api` while iterating)

## Commit Convention
- Use Conventional Commits for all git commit messages.
- Format: `<type>(<optional scope>): <description>`
- Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`.
- Keep the subject concise and imperative (example: `feat(landing): add hero CTA and footer`).
- If a change is breaking, include `!` after type/scope and note `BREAKING CHANGE:` in the body.

## Repository Snapshot
- Project: `CrisisLens`
- Frontend: Next.js 14 (App Router), React 18, TypeScript, Three.js via `react-globe.gl`
- Tests: Vitest unit tests + Playwright e2e tests
- Backend (current code): minimal Flask app in `api/main.py`
- Data pipeline: CSV aggregation script in `scripts/generate-country-metrics.mjs`

## Important Reality Checks
- `README.md` describes a FastAPI + ML training workflow, but current backend code is Flask (`api/main.py`).
- `models/train_model.py` is currently incomplete (file content is only `from`), so documented model training/export steps are not usable as-is.
- `npm run test` runs lint + typecheck only. Unit tests are separate (`npm run test:unit`).

## Setup

### Frontend setup
```bash
npm install
npm run generate:data
npm run dev
```

App URL: `http://localhost:3000`

### Python/backend setup (only if touching backend)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python api/main.py
```

Backend URL: `http://127.0.0.1:9777`

## Core Dev Commands
- `npm run dev`: start Next.js dev server
- `npm run build`: production build (also validates types/lint during build)
- `npm run lint`: ESLint (`next/core-web-vitals` + `next/typescript`)
- `npm run typecheck`: TypeScript compile check, no emit
- `npm run test:unit`: run Vitest tests
- `npm run test:e2e`: run Playwright end-to-end tests (auto-starts local app server)
- `npm run test:e2e:headed`: run Playwright e2e tests in headed mode
- `npm run test:e2e:ui`: run only dashboard UI Playwright tests
- `npm run test:e2e:api`: run only API contract Playwright tests
- `npm run playwright:install`: install Chromium for Playwright
- `npm run test`: lint + typecheck
- `npm run test:all`: lint + typecheck + unit + e2e
- `npm run generate:data`: regenerate `public/data/country-metrics.json` and `public/data/snapshot.json` from CSVs in `data/`

## Recommended Validation Before Finishing Changes
Run this sequence for frontend changes:
```bash
npm run test:unit
npm run test
npm run build
```

For UI-flow changes, also run:
```bash
npm run test:e2e
```

For backend-only changes, there is no formal Python test/lint setup in-repo yet; at minimum run:
```bash
python api/main.py
```
and hit `/` and `/health`.

## Testing and Linting Details
- Unit tests live in:
  - `tests/lib/metrics.test.ts`
  - `tests/components/summary-utils.test.ts`
  - `tests/lib/cv-globe-bridge.test.ts`
  - `tests/lib/globe-picking.test.ts`
- Playwright e2e tests live in:
  - `tests/e2e/landing.spec.js`
  - `tests/e2e/dashboard.spec.js`
  - `tests/e2e/api-routes.spec.js`
- Playwright config: `playwright.config.mjs`
- Playwright note: e2e scripts use `npx playwright ...`; first run requires network access to fetch package/browsers if they are not already installed.
- Vitest config: `vitest.config.ts` (Node environment, alias `@ -> repo root`)
- ESLint config: `.eslintrc.json`
- TypeScript config: `tsconfig.json` (strict mode enabled)

## Architecture Map (High-Value Files)
- App shell + landing route (`/`): `app/layout.tsx`, `app/page.tsx`
- Dashboard route (`/dashboard`): `app/dashboard/page.tsx`
- Main dashboard UI: `components/GlobeDashboard.tsx`
- 3D globe + hand controls: `components/Globe3D.tsx`
- API route stubs:
  - `app/api/globe/heatmap/route.ts`
  - `app/api/country/[iso3]/route.ts`
  - `app/api/project/[project_id]/route.ts`
  - `app/api/agent/country/[iso3]/route.ts`
  - `app/api/genie/query/route.ts`
  - `app/api/cv/detect/route.ts`
- Frontend API client/types: `lib/api/crisiswatch.ts`
- Domain helpers/types: `lib/types.ts`, `lib/metrics.ts`, `lib/countries.ts`
- Integration seams (mock providers):
  - `lib/databricks/client.ts`
  - `lib/databricks/genie.ts`
  - `lib/cv/provider.ts`
  - `lib/cv/globeBridge.ts`

## Data Pipeline Notes
- `data/` is gitignored and contains large CSV inputs required by `npm run generate:data`.
- Generated artifacts consumed by the app:
  - `public/data/country-metrics.json`
  - `public/data/snapshot.json`
- If changes affect `lib/types.ts` metrics fields or API projections, regenerate data and run full validation.

## Environment Variables
- Optional: `NEXT_PUBLIC_GLOBE_WS_URL`
  - Used by `components/GlobeDashboard.tsx` for WebSocket anomaly/highlight events.
  - If unset, WebSocket subscription is skipped.

## Implementation Guardrails
- Preserve API response shapes used by `lib/api/crisiswatch.ts` unless updating both server routes and client types together.
- Keep globe-related browser APIs in client components (`"use client"`). `Globe3D` is loaded dynamically with `ssr: false` for SSR safety.
- Prefer extending provider interfaces (`DatabricksProvider`, `GenieClient`, `CVCountryDetector`) rather than wiring external services directly into UI components.
- When touching metric formulas, update corresponding unit tests in `tests/lib/metrics.test.ts`.
- Styling policy: use Tailwind utility classes by default for component/page styling.
- Use `app/globals.css` only when necessary for true global/base styles or hard-to-express third-party selectors (for example, canvas internals or browser-wide resets).

## Code Style
- Keep components small and composable; extract logic/helpers instead of growing monolithic UI files.
- Prefer explicit domain types for API payloads/state over `Record<string, unknown>` shapes.
- Remove unused CSS hook class names after Tailwind migration; avoid adding non-semantic class tokens when utilities already express the style.
- Avoid duplicate state updates/effects and keep side effects contained in `useEffect`/callbacks with clear cleanup.

## Known Gaps (Do Not Assume Implemented)
- No Python linting (`ruff`/`flake8`) or Python test suite configured.
- Backend described in docs is ahead of backend code currently in repository.
