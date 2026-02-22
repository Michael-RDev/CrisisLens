# CrisisLens

CrisisLens is a monorepo with:
- `apps/web`: Next.js 14 command-center frontend (landing + dashboard, globe, mock API seams)
- `apps/ml`: Python ML training/artifact workspace

## Repository Layout

- `apps/web/app`: Next.js App Router pages and API routes
- `apps/web/components`: UI components (landing, dashboard, globe)
- `apps/web/lib`: domain logic, API client types, adapters
- `apps/web/tests`: Vitest + Playwright tests
- `apps/web/scripts`: data generation scripts
- `apps/web/data`: CSV inputs for frontend data generation
- `apps/ml/models`: model training code + generated artifacts
- `docs`: handoff and supporting documentation

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.10+ (only for ML workspace tasks)

## Web App Quickstart

From repo root:

```bash
pnpm install
pnpm run generate:data
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Routes:
- `/`: landing page
- `/dashboard`: command-center UI

## Web Commands

All root commands delegate to `apps/web`:

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:unit
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run test:e2e:api
pnpm run test:all
pnpm run playwright:install
pnpm run generate:data
```

## ML Workspace Notes (`apps/ml`)

- Python dependencies are listed in `apps/ml/requirements.txt`.
- Model artifacts currently consumed by web data generation live under `apps/ml/models/artifacts`.
- `apps/ml/models/train_model.py` uses relative paths and expects local ML data setup that is not included in this repository by default.
- This repo currently does not include a fully wired production Python API service.

## Data Flow

- `pnpm run generate:data` reads CSVs from `apps/web/data`
- It generates:
  - `apps/web/public/data/country-metrics.json`
  - `apps/web/public/data/project-profiles.json`
  - `apps/web/public/data/snapshot.json`
- It also merges ML enrichment from:
  - `apps/ml/models/artifacts/gold_country_scores.json`

## Environment Variables

- `NEXT_PUBLIC_GLOBE_WS_URL` (optional): enables websocket highlight/anomaly events in the dashboard globe.

## Additional Docs

- `AGENTS.md`: repository operating rules for coding agents
- `docs/LLM_GUIDE.md`: LLM-specific workflow and guardrails
- `docs/CONTEXT_HANDOFF.md`: implementation and architecture context
- `apps/web/FRONTEND_STATUS.md`: current frontend implementation status
