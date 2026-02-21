# CrisisLens

Humanitarian crisis intelligence platform — ML model + REST API backend with a Next.js 3D globe frontend.

---

## Backend (Python / FastAPI)

Model + REST API for the Geo-Insight challenge:

- scores countries where humanitarian need severity and funding coverage are most mismatched
- estimates pooled-fund coverage gaps
- flags unusually high/low beneficiary-to-budget ratios on cluster-level response units
- returns comparable projects for benchmarking

### 1) Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Train + export artifacts

```bash
python models/train_model.py --data-dir data --artifact-dir artifacts
```

This generates:

- `artifacts/country_scores.csv`
- `artifacts/project_scores.csv`
- `artifacts/model_bundle.joblib`

### 3) Run REST API

```bash
uvicorn api.main:app --reload
```

Open:

- http://127.0.0.1:8000/docs

### API Endpoints

- `GET /health`
- `GET /countries/overlooked?year=2026&limit=30`
- `GET /map/overlooked?year=2026`
- `GET /projects/anomalies?year=2026&anomalies_only=true&limit=50`
- `GET /projects/{project_id}`
- `GET /projects/{project_id}/comparables?k=5`
- `POST /projects/score`

#### Example score request

```json
{
  "year": 2026,
  "iso3": "AFG",
  "cluster": "Health",
  "budget_usd": 2500000,
  "estimated_beneficiaries": 600000
}
```

---

## Frontend (Next.js / Three.js)

Next.js frontend with a **react-globe.gl / Three.js 3D spinnable globe** (country polygons, not point markers), country drilldown, layer switching, and integration-ready seams for Databricks Agent, Databricks Genie, WebSocket anomaly events, and CV country detection.

### Quick Start

```bash
npm install
npm run generate:data
npm run dev
```

Open `http://localhost:3000`.

### Scripts

- `npm run generate:data` builds `public/data/country-metrics.json` + `public/data/snapshot.json` from `data/*.csv`.
- `npm run lint` runs Next.js lint rules.
- `npm run typecheck` runs TypeScript checks.
- `npm run build` builds production assets.
- `npm run test` runs lint + typecheck.

### Key Paths

- `app/page.tsx`: dashboard entry page.
- `components/GlobeDashboard.tsx`: command-center dashboard and integration panels.
- `components/Globe3D.tsx`: Three.js globe renderer (orbit, zoom, click/hover select, pulse highlights).
- `lib/api/crisiswatch.ts`: typed frontend API client for REST + WebSocket.
- `app/api/globe/heatmap/route.ts`: spec-style heatmap payload endpoint.
- `app/api/country/[iso3]/route.ts`: spec-style country drilldown endpoint.
- `app/api/project/[project_id]/route.ts`: spec-style project detail endpoint.
- `app/api/agent/country/[iso3]/route.ts`: backend seam for Databricks Agent country state.
- `app/api/genie/query/route.ts`: backend seam for Databricks Genie NLQ.
- `app/api/cv/detect/route.ts`: backend seam for CV country detection.
- `scripts/generate-country-metrics.mjs`: CSV aggregation pipeline.
- `lib/databricks/client.ts`: Databricks Agent adapter contract.
- `lib/databricks/genie.ts`: Databricks Genie adapter contract.
- `lib/cv/provider.ts`: CV detector adapter contract.
- `FRONTEND_STATUS.md`: implementation status and remaining work.

### Data + Integration Notes

- The UI currently renders from pre-aggregated local JSON for speed and demo stability.
- Databricks, Genie, WebSocket push events, and CV integrations are intentionally abstracted so you can swap in real providers without refactoring UI components.
- Regenerate data whenever source CSVs change.
