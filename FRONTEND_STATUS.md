# CrisisLens Frontend Status

## Implemented In This Pass
- Upgraded the Next.js frontend into a Tier-4-style operations console with a real **Three.js WebGL globe**:
  - 3D spinnable/orbitable globe with zoom, click select, hover details, and highlight pulsing.
  - Country polygon rendering on globe surface (countries are actual regions now, not point markers).
  - Metric layer coloring applied across all available country polygons with consistent fallback color.
  - Globe layer switching (`Severity`, `In-Need Rate`, `Funding Gap`, `Coverage`).
  - Replaced unstable `three-globe` polygon event chaining with explicit Three.js raycasting for hover/click country interaction (runtime-safe on installed package version).
  - Replaced custom globe wiring with `react-globe.gl` for robust built-in polygon click/hover handling.
  - Added animated camera jump-to-country on selection/search (`pointOfView` transition).
  - KPI strip for global totals and funding status.
  - Country detail panel with derived indicators (`inNeedPct`, `coveragePct`, `fundingGap`, `fundingGapPct`).
  - Ranking panel that re-sorts by selected layer for presentation scenarios.
- Added integration-ready interaction surfaces:
  - `Databricks Agent` panel (country-scoped risk/narrative fetch).
  - `Databricks Genie` NLQ panel (question + answer flow).
  - `CV Mode` panel that detects ISO3 from incoming frame payload and auto-focuses the country.
- Added shared metric helpers in `lib/metrics.ts` so UI logic and future backend logic use the same formulas.
- Added API route stubs to decouple UI from provider internals:
  - `app/api/agent/country/[iso3]/route.ts`
  - `app/api/genie/query/route.ts`
  - `app/api/cv/detect/route.ts`
  - `app/api/globe/heatmap/route.ts` (spec-aligned heatmap payload)
  - `app/api/country/[iso3]/route.ts` (spec-aligned country drill-down payload)
  - `app/api/project/[project_id]/route.ts` (spec-aligned project detail payload)
- Added typed frontend API client for spec endpoints and WebSocket subscription hook:
  - `lib/api/crisiswatch.ts`
- Enhanced mock adapters for realistic end-to-end demo behavior while keeping swap-in contracts intact:
  - `lib/databricks/client.ts`
  - `lib/databricks/genie.ts`
  - `lib/cv/provider.ts`
- Refreshed styling in `app/globals.css` for responsive desktop/mobile presentation.
- Updated overall visual style to a stronger orange/blue modern UI direction.
- Added framer-motion animation wrappers for hero/KPI/main cards.
- Improved query ergonomics:
  - Country jump box with autocomplete + one-click select.
  - Genie quick-template chips for frequent analyst questions.
- Hardened client loading:
  - `Globe3D` now loads via `next/dynamic` with `ssr: false` to avoid `window is not defined` server runtime failures.
- Added unit test harness and tests:
  - `vitest` setup in `vitest.config.ts`
  - `tests/lib/metrics.test.ts`
  - `tests/components/summary-utils.test.ts`
  - `tests/lib/cv-globe-bridge.test.ts`
- Added CV interaction bridge utility for future webcam/MediaPipe integration:
  - `lib/cv/globeBridge.ts` (confidence gating + ISO normalization before globe selection)
- Added globe polygon picking utility and tests for click reliability:
  - `lib/globe/picking.ts`
  - `tests/lib/globe-picking.test.ts`
- Added explicit body class hook in layout:
  - `app/layout.tsx` now sets `className="app-body"` on `<body>`.

## Verified
- `npm run generate:data`
- `npm run test:unit`
- `npm run test` (lint + typecheck)
- `npm run build`
- `npm run dev` startup check (HTTP 200 on `/`, no runtime crash after fix)
- Dev HTML stylesheet linkage check confirmed:
  - `/_next/static/css/app/layout.css?...` present in rendered page markup.
- Runtime smoke after globe refactor:
  - App compiles and serves with globe component loaded (no unhandled runtime exception in dev logs).

## Ready For Databricks Integration
- UI already calls stable internal API routes (`/api/globe/heatmap`, `/api/country/:iso3`, `/api/project/:id`, `/api/agent/...`, `/api/genie/query`, `/api/cv/detect`).
- WebSocket event integration is plumbed behind `NEXT_PUBLIC_GLOBE_WS_URL` and supports anomaly/highlight event handling in the globe.
- To connect real services, replace mock internals behind these contracts:
  - `DatabricksProvider` in `lib/databricks/client.ts`
  - `GenieClient` in `lib/databricks/genie.ts`
  - `CVCountryDetector` in `lib/cv/provider.ts`

## Remaining Work
- Wire Databricks auth and workspace endpoint config through secure server-side environment variables.
- Implement production provider classes that call Databricks Agent and Genie endpoints.
- Add server-side request validation and auth guards on API routes.
- Connect real CV model inference endpoint (camera/image stream -> ISO3 + confidence).
- Align severity/priority scoring with final analytics model once approved.
- Add end-to-end tests (Playwright) for demo stability and regression protection.

## Note
- The technical spec PDF exists at `docs/CrisisWatch_AI_Technical_Spec.pdf` and was used as project context previously in this repo, but direct text extraction utilities are not available in this environment; implementation was aligned to the current data schema and existing spec-derived pipeline/files in-repo.
