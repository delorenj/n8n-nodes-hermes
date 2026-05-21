# n8n-nodes-hermes

[n8n](https://n8n.io/) community nodes for the [Hermes Agent](https://github.com/NousResearch/hermes-agent) API server by [Nous Research](https://nousresearch.com).

Control your Hermes instance from n8n workflows — send chat completions, kick off agentic runs, manage scheduled cron jobs, and stitch Hermes into automation pipelines alongside Slack, Discord, webhooks, databases, and anything else n8n can talk to.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-hermes)](https://www.npmjs.com/package/n8n-nodes-hermes)
[![License: BSD-3-Clause](https://img.shields.io/badge/License-BSD--3--Clause-blue.svg)](LICENSE)
![n8n community node](https://img.shields.io/badge/n8n-community_node-ff6d5a?logo=n8n)

> **Designed as a sibling to** [`n8n-nodes-openclaw`](https://www.npmjs.com/package/n8n-nodes-openclaw). Hermes is the NousResearch successor to OpenClaw, but its HTTP surface differs (no `/tools/invoke`; it speaks OpenAI-compatible Chat Completions, Responses, and an async Runs + Jobs API). This package mirrors openclaw's ergonomics where it can and exposes Hermes' actual REST endpoints where they differ.

## Installation

### Community Nodes (recommended)

1. Open **Settings → Community Nodes** in your n8n instance
2. Click **Install a community node**
3. Enter `n8n-nodes-hermes`
4. Click **Install**

### Manual Installation

```bash
# In your n8n custom nodes directory
cd ~/.n8n/custom
npm install n8n-nodes-hermes
```

Or link from source:

```bash
git clone https://github.com/delorenj/n8n-nodes-hermes.git
cd n8n-nodes-hermes
npm install
npm run build

# Link into n8n
mkdir -p ~/.n8n/custom/node_modules
ln -s "$(pwd)" ~/.n8n/custom/node_modules/n8n-nodes-hermes
```

Then restart n8n.

## Setup

### 1. Enable the Hermes API server

In `~/.hermes/.env`:

```bash
API_SERVER_ENABLED=true
API_SERVER_PORT=8642
API_SERVER_KEY=change-me
```

Then start the gateway: `hermes gateway`.

### 2. Add credentials in n8n

1. Go to **Settings → Credentials → Add Credential**
2. Search for **Hermes API**
3. Enter:
   - **API URL** — e.g. `http://127.0.0.1:8642` (or your remote Hermes instance)
   - **API Key** — the value of `API_SERVER_KEY` from your `.env`

## Available Resources

The Hermes node exposes five resources via a Resource dropdown, each with operations:

| Resource | Operations | What it does |
|----------|-----------|--------------|
| **Chat** | `complete` | `POST /v1/chat/completions` — single-shot OpenAI-style chat with Hermes |
| **Response** | `create`, `get`, `delete` | `POST/GET/DELETE /v1/responses[/{id}]` — multi-turn responses with server-side state, named conversations, and `previous_response_id` chaining |
| **Run** | `create`, `get`, `stop`, `events` | `POST /v1/runs`, `GET /v1/runs/{id}`, `POST /v1/runs/{id}/stop`, `GET /v1/runs/{id}/events` — async agentic runs with progress observability |
| **Job** | `list`, `create`, `get`, `update`, `delete`, `pause`, `resume`, `run` | `/api/jobs[/{id}/...]` — full CRUD + lifecycle for Hermes cron jobs |
| **System** | `health`, `healthDetailed`, `capabilities`, `models` | `/health`, `/health/detailed`, `/v1/capabilities`, `/v1/models` — liveness, capability discovery, model listing |

### Raw Mode

Every node call supports **Raw Mode** — toggle it on to send an arbitrary HTTP request to any path on the Hermes API server (e.g. plugin endpoints, future surfaces). You provide method, path, body, and query directly. Bearer auth is still applied from the credential.

## Examples

Pre-built workflow files live in [`examples/`](examples/). Import any of them via **Workflows → Import from File** in n8n:

- **Chat Completion** — minimal "send a prompt, get an answer" workflow
- **Create Run** — start an agentic run and poll its status
- **Schedule Cron Job** — register a Hermes cron job from n8n (e.g. nightly summary)
- **List Jobs** — fetch all scheduled jobs into n8n

## CLI commands not in the API

The `hermes` CLI exposes commands that the API server does **not**, including `hermes gateway start/stop/status`, `hermes profile create`, `hermes update`, and `hermes doctor`. Use n8n's built-in **Execute Command** node for those — for example:

```
hermes gateway status
```

## How It Works

For typed resources, the node looks up an operation in [`tool-schemas/`](tool-schemas/), resolves `{pathParams}`, routes parameters into body/query/headers based on each parameter's `in` declaration, and sends the request with `Authorization: Bearer <apiKey>`. Raw Mode bypasses the dispatcher and forwards your input directly.

The full Hermes API reference is at [hermes-agent.nousresearch.com/docs/user-guide/features/api-server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server).

## Development

```bash
git clone https://github.com/delorenj/n8n-nodes-hermes.git
cd n8n-nodes-hermes
npm install
npm run build
npm test
```

### Project Structure

```
src/
  credentials/
    HermesApi.credentials.ts   # Hermes API credential type
  nodes/Hermes/
    Hermes.node.ts             # Node class with execute()
    requestBuilder.ts          # Pure request-construction helpers
    toolSchemas.ts             # Loads JSON schemas as typed exports
    hermes.svg                 # Node icon
tool-schemas/                  # JSON schema files (chat, response, run, job, system)
tests/                         # vitest unit tests
examples/                      # Importable n8n workflow files
```

### Running tests

```bash
npm test                       # unit tests
npm run lint                   # eslint
npm run typecheck              # tsc --noEmit
npm run knip                   # unused exports / dependencies
```

### Adding a new operation

1. Edit the relevant JSON in `tool-schemas/` — add the operation to `operations` and any new fields to `parameters`. Use `displayOptions.show.action` to scope fields to the new operation.
2. Run `npm test` — `toolSchemas.test.ts` validates structural invariants (every action has an operation, path tokens have matching params, etc.) so most schema mistakes fail fast.
3. Run `npm run build` and reload your n8n instance.

## License

[BSD-3-Clause](LICENSE)

## Links

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the upstream AI agent
- [Hermes API Server docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n-nodes-openclaw](https://www.npmjs.com/package/n8n-nodes-openclaw) — sibling package for OpenClaw
