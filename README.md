# CrisisLens

CrisisLens is a monorepo with a Next.js command-center UI and a Python ML workspace.

## Repository Layout

- `apps/web`: Next.js 14 app (App Router), React 18, TypeScript, Three.js globe, API routes, and tests.
- `apps/ml`: Python model training code and model artifacts.

## Prerequisites

- Node.js 20+
- `pnpm` (workspace package manager)
- Python 3.10+

## Web App (apps/web)

### Install

```bash
pnpm install
```

### Run locally

```bash
pnpm run generate:data
pnpm run dev
```

Open `http://localhost:3000`.

### Common commands

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:unit
pnpm run test:e2e
pnpm run test:all
```

All root scripts delegate to `apps/web`.

## ML Workspace (apps/ml)

### Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r apps/ml/requirements.txt
```

### Train (current script entry)

```bash
python apps/ml/models/train_model.py
```

## Notes

- Frontend tests live in `apps/web/tests` (Vitest + Playwright).
- Web data generation script lives at `apps/web/scripts/generate-country-metrics.mjs`.
- Optional env var: `NEXT_PUBLIC_GLOBE_WS_URL` for real-time globe highlights.
