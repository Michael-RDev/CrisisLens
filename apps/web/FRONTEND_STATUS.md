# CrisisLens Web Status

## Scope
This file tracks the current state of `apps/web` after the monorepo migration.

## Implemented
- Next.js 14 App Router frontend with two primary routes:
  - `/` landing page
  - `/dashboard` operations command center
- Interactive 3D globe (`react-globe.gl` + Three.js) with:
  - polygon hover/select
  - search/jump-to-country
  - layer-driven coloring
  - optional hand-control overlay
- Dashboard panels for:
  - global KPI summary
  - country drilldown
  - OCI leaderboard and rankings
  - funding what-if simulation
  - mock Databricks Agent/Genie/CV integrations
- API seam routes in `apps/web/app/api/**` for local/mock-backed workflows.
- Tailwind-first styling with minimal global CSS for cross-cutting and canvas-specific selectors.

## Data Pipeline
- Source CSV inputs: `apps/web/data`
- Generation script: `apps/web/scripts/generate-country-metrics.mjs`
- Generated artifacts:
  - `apps/web/public/data/country-metrics.json`
  - `apps/web/public/data/project-profiles.json`
  - `apps/web/public/data/snapshot.json`
- ML score merge source:
  - `apps/ml/models/artifacts/gold_country_scores.json`

## Test Status (web)
Validated successfully from repo root using pnpm workspace scripts:
- `pnpm run test` (lint + typecheck)
- `pnpm run test:unit`
- `pnpm run test:e2e:ui`
- `pnpm run build`

## Known Constraints
- API routes are currently local/mock-oriented seams, not production service integrations.
- Globe textures use public URLs and should be localized under `apps/web/public` for locked-down deployments.
- E2E in constrained environments may require elevated permission for local port binding.

## Next Priorities
1. Replace mock providers with production Databricks/Genie/CV integrations behind existing interfaces.
2. Add broader Playwright coverage for end-to-end analyst workflows.
3. Improve asset hardening by moving external texture dependencies into local static files.
