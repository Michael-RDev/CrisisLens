# CrisisLens

CrisisLens is an AI-assisted crisis intelligence platform that turns fragmented global risk signals into actionable country-level insight through an interactive operations dashboard.

## Inspiration

Crisis response teams usually work across scattered spreadsheets, delayed reports, and disconnected tools. We wanted to build a single command center that helps teams move from reactive updates to proactive decisions by combining geospatial context, risk analytics, and AI-assisted investigation.

## What it does

CrisisLens gives users a live strategic view of crisis conditions across countries and projects.

At its core, the platform combines an interactive 3D globe with a single-column operations dashboard so users can keep geographic context and decision panels aligned even in constrained viewports. Teams can drill into country-level prioritization, outlier detection, agent state, and OCI monitoring, then run scenario simulations to project multi-quarter outcomes before acting. The product also supports computer-vision and agent overlays that map model output back to geography, includes Databricks Genie chat for natural-language analysis in-context, and now supports voice-driven country navigation so commands like "go to canada" can directly select the target country.

## How we built it

We built CrisisLens on a pnpm monorepo architecture to keep product, data, and model workflows in one versioned system with clear ownership boundaries. The frontend is a Next.js 14 App Router application on React 18 and strict TypeScript, giving us component-level composability with type-safe contracts across routes, panels, and domain logic. Tailwind CSS provides a utility-first design system that lets us ship layout and interaction changes quickly without accumulating heavy custom CSS surface area, and `react-globe.gl` plus Three.js delivers hardware-accelerated geospatial rendering for high-context country exploration.

On the application layer, we use App Router API handlers as contract-oriented service facades, then isolate external dependencies behind provider abstractions for Databricks, Genie, and CV workflows. That separation gives us a pragmatic adapter pattern: local mockability during fast iteration, but production-shaped interfaces for future hardening. Our data pipeline is script-driven and reproducible, combining raw CSV intelligence with custom ML scoring artifacts into normalized JSON snapshots consumed by the dashboard, so model outputs stay operationally accessible in the UI.

We leaned into test-driven iteration for unstable surfaces, especially layout and interaction paths. Vitest covers deterministic business logic and utility behavior, while Playwright validates end-to-end user journeys and regression-prone UI constraints like viewport overflow and panel composition. The result is a full-stack workflow that is modular, typed, and integration-ready, while still optimized for rapid product experimentation.

## Challenges we ran into

One major challenge was responsive layout behavior, especially preventing globe panel overflow when users zoomed out, which required stricter container constraints and a simpler dashboard structure. We also had to keep interaction behavior consistent across pointer controls, hand controls, and voice commands, which pushed us to centralize parsing and selection utilities. Another recurring issue was data contract stability, since schema drift between generated artifacts and frontend types can quickly break runtime assumptions. Finally, we had to carefully balance local mocked providers with production-oriented API contracts so development stayed fast without losing architectural realism.

## Accomplishments that we're proud of

We are especially proud of integrating Databricks Genie directly into the dashboard workflow so users can run natural-language analysis without leaving operational context. We are also proud of the custom ML model integration into the frontend data pipeline, where country-level scoring artifacts flow into live dashboard panels. Beyond integrations, we built a robust simulation and prioritization layer that helps teams reason about impact across multiple quarters, and we backed that with meaningful test coverage that catches logic regressions and layout failures before release.

## What we learned

We learned that crisis-tech products need strong contracts between data, models, and UI from day one. Clean provider boundaries made integrations safer, and TDD-style iteration was especially valuable for complex dashboard regressions. We also learned that usability details, like responsive behavior and voice shortcuts, can be as important as core model quality in real operational settings.

## What's next for CrisisLens

Next, we plan to expand voice controls from simple country selection to broader dashboard command workflows so users can drive more of the interface hands-free. We also want to harden production integrations for Databricks and backend services with stronger observability and error-handling paths, while adding automated ML artifact validation and drift monitoring in CI to protect model-to-UI reliability. On the product side, we intend to introduce richer simulation authoring so users can compare intervention plans side by side and add collaboration features such as saved views, shareable scenario reports, and team annotations.
