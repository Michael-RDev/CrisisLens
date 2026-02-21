# CrisisLens Context Handoff (Full)

## Project Goal
Build a Tier-4 humanitarian operations frontend (Next.js) for the CrisisWatch AI technical spec that:
- visualizes global crisis state on an interactive 3D globe,
- supports country drill-down and analyst workflows,
- is ready to plug into Databricks Agent Bricks, Databricks Genie, and future CV-based pointing interaction,
- is demo-stable (tested build/lint/typecheck) and easy to extend.

## Product Direction
- Primary UX: command-center dashboard with 3D globe + side intelligence panels.
- Globe behavior from spec:
  - spin/orbit/zoom,
  - click country for drill-down,
  - hover country for quick context,
  - support future highlight pushes from Genie and anomaly events,
  - support future CV pointer -> country selection.
- Visual direction:
  - modern orange/blue analytical theme,
  - clearer hierarchy, animated panel transitions, and clean control affordances.

## Current Stack
- Framework: Next.js 14 + React 18 + TypeScript.
- Globe rendering: `react-globe.gl` (Three.js based).
- Motion: `framer-motion`.
- Data prep: local CSV aggregation script -> JSON snapshot.
- Unit tests: `vitest`.

## Current App Surface
- Route: `/` serves the operations dashboard.
- Main component: `apps/web/components/GlobeDashboard.tsx`.
- Globe component: `apps/web/components/Globe3D.tsx`.
- Global style: `apps/web/app/globals.css`.

## API Seams Implemented (Spec-aligned stubs)
- `GET /api/globe/heatmap`
- `GET /api/country/{iso3}`
- `GET /api/project/{project_id}`
- `POST /api/genie/query`
- `GET /api/agent/country/{iso3}`
- `POST /api/cv/detect`

These are currently mock/local-backed seams, intentionally designed for easy replacement with production Databricks integrations.

## Data & Domain Modules
- Country metrics types/helpers:
  - `apps/web/lib/types.ts`
  - `apps/web/lib/metrics.ts`
- Country catalog (all countries, ISO3, optional ccn3/latlng):
  - `apps/web/lib/countries.ts`
- CV selection bridge helpers:
  - `apps/web/lib/cv/globeBridge.ts`

## Globe Interaction Status
Implemented and working:
- Country polygons rendered on sphere (not point-only markers).
- Country click -> selects ISO3 + opens detail panel context.
- Hover -> country context in footer.
- Search/jump -> camera animates to selected country.
- Highlight support -> selected + highlighted polygon altitude/color treatment.

Important improvement made:
- Jump/search uses full country catalog (`apps/web/lib/countries.ts`), not only countries with metrics.
  - This prevents missing-country behavior (e.g. Germany) in jump UX.

## CV Readiness Status
Implemented scaffolding:
- `apps/web/lib/cv/globeBridge.ts`
  - `normalizeIso3`
  - `shouldApplyCVDetection`
- Dashboard consumes CV detection result and applies ISO3 selection if confidence threshold passes.

What remains for real CV interaction:
- Stream real pointer coordinates / detections from MediaPipe pipeline.
- Convert pointer to country selection events and route through existing `setSelectedIso3` path.

## Genie / Agent / WebSocket Readiness
- Genie query pathway exists and can return `highlight_iso3`.
- Dashboard applies highlight list to globe.
- WebSocket hook exists in API client and dashboard uses `NEXT_PUBLIC_GLOBE_WS_URL` when set.

What remains:
- Replace mocks with real Databricks endpoints, auth, and query outputs.

## Design Changes Made
- Added animated hero/KPI/card transitions using Framer Motion.
- Added tab-like top navigation strip for cleaner, non-boilerplate control framing.
- Maintained orange/blue scheme and polished cards/input/button styles.

## Testing & Validation Status
Commands run successfully:
- `pnpm run test:unit`
- `pnpm run test` (lint + typecheck)
- `pnpm run build`
- `pnpm run dev` startup verified

Unit test files:
- `apps/web/tests/lib/metrics.test.ts`
- `apps/web/tests/components/summary-utils.test.ts`
- `apps/web/tests/lib/cv-globe-bridge.test.ts`
- `apps/web/tests/lib/globe-picking.test.ts`

## Known Constraints / Caveats
- Globe textures currently reference public URLs from unpkg examples.
  - If external access is restricted in deployment, replace with local files under `public/`.
- API routes are stubs/mocks and need secure server-side production wiring.

## Next Recommended Work
1. Production Databricks wiring
- Agent provider auth + endpoint calls.
- Genie trusted-asset query proxy with citations.

2. CV integration
- Add browser-side pointer event ingestion endpoint/path.
- Map pointer stream to real-time country targeting.

3. Data consistency
- Ensure all ISO3 mappings in metric pipeline are complete and normalized.
- Add country-level fallback handling for missing metric rows in side panel visualizations.

4. E2E stability
- Add Playwright suite for click-hover-jump-drilldown flows.

## Quick File Map
- App shell/layout: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`
- Dashboard UI: `apps/web/components/GlobeDashboard.tsx`
- 3D globe: `apps/web/components/Globe3D.tsx`
- Country catalog: `apps/web/lib/countries.ts`
- Metrics helpers: `apps/web/lib/metrics.ts`
- CV bridge: `apps/web/lib/cv/globeBridge.ts`
- API client: `apps/web/lib/api/crisiswatch.ts`
- API routes: `apps/web/app/api/**`
- Status tracker: `apps/web/FRONTEND_STATUS.md`
