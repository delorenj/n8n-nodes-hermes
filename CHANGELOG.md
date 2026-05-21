# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Initial release of `n8n-nodes-hermes`.
- `HermesApi` credential type (`apiUrl` + `apiKey` bearer token).
- `Hermes` node exposing five resources via a Resource dropdown:
  - **Chat** — `POST /v1/chat/completions`.
  - **Response** — `POST/GET/DELETE /v1/responses[/{id}]` with `previous_response_id` and named-conversation chaining.
  - **Run** — `POST /v1/runs`, `GET /v1/runs/{id}`, `POST /v1/runs/{id}/stop`, `GET /v1/runs/{id}/events`.
  - **Job** — full CRUD + `pause`, `resume`, `run` lifecycle on `/api/jobs[/{id}/...]`.
  - **System** — `health`, `healthDetailed`, `capabilities`, `models`.
- **Raw Mode** for ad-hoc requests to any Hermes API server endpoint with Bearer auth applied.
- `usableAsTool: true` so the node can be wired into n8n AI Agent steps.
- Schema-driven parameter routing: parameters declare `in: body|query|path|header` and are dispatched accordingly. `splitAsArray` converts comma-separated strings into arrays.
- Vitest test suite covering schema invariants, request builders, credential shape, and node execute() behavior.
- Example workflows under `examples/`.
