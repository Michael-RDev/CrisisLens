# CrisisLens LLM Guide

## Purpose
This document is the fast operational guide for LLM coding agents working in this repository.

## Repository Shape
- Monorepo root:
  - `apps/web`: Next.js frontend (primary active product surface)
  - `apps/ml`: Python ML code and artifacts
- JavaScript/TypeScript package manager: `pnpm` (workspace root scripts delegate to `apps/web`)

## Command Policy
- Use `pnpm` for all JS/TS workflows.
- Standard commands from repo root:
  - `pnpm run dev`
  - `pnpm run generate:data`
  - `pnpm run test`
  - `pnpm run test:unit`
  - `pnpm run test:e2e`
  - `pnpm run build`

## Test-First Workflow
- Follow TDD by default:
  - Red: add/update failing test
  - Green: minimal implementation
  - Refactor: improve while keeping tests green
- Minimum validation before handoff:
  - `pnpm run test`
  - `pnpm run test:unit`
  - `pnpm run build`
- For UI behavior changes, include:
  - `pnpm run test:e2e` (or targeted e2e scripts while iterating)

## Styling Rules
- Use Tailwind utility classes by default.
- Use `apps/web/app/globals.css` only for true global/base styles or selectors that utilities cannot cleanly express (for example third-party canvas internals).

## Source-of-Truth Files
- `AGENTS.md`: detailed operational rules and guardrails for agents.
- `README.md`: user-facing setup and project overview.
- `docs/CONTEXT_HANDOFF.md`: architecture, status, and near-term priorities.
- `apps/web/FRONTEND_STATUS.md`: current frontend feature/status snapshot.

## Documentation Update Policy
When changing architecture, commands, paths, or workflows:
1. Update implementation first.
2. Sync `README.md`, `AGENTS.md`, and relevant docs in `docs/`.
3. Verify commands in docs are executable from the stated directory.
4. Call out known constraints clearly instead of assuming missing pieces are implemented.

## ML Workspace Reality Check
- `apps/ml` currently has no formal lint/test automation in repo.
- `apps/ml/models/train_model.py` has environment-specific path assumptions and may require local data setup not committed in this repository.
- Treat ML docs as implementation-constrained: verify from code before relying on older narrative docs.
