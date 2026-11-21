---
name: kaneo
description: Work with Kaneo — tasks, projects, workspaces, labels, comments, time entries, admin — by writing composed code against the instance REST API instead of MCP tools. Use when user mentions Kaneo or a Kaneo board (задачи/доска/прогоны).
---

# Kaneo code-mode

REST + Bearer key, no MCP server. Full API — **all OpenAPI operations**, index in `endpoints.md` next to this file. MCP packages expose only ~41 tools; this covers everything incl. admin, time entries, custom fields, notifications.

## Instance & auth

No hardcoded URL. Resolution (sdk does it automatically):

- URL: `KANEO_API_URL` env → `~/.config/kaneo/url` → error
- Key: `KANEO_API_KEY` env → `~/.config/kaneo/key` (600) → error
- Actual instance URL: `cat ~/.config/kaneo/url` (written by install.sh); endpoints.md header repeats it.

## Pattern

`sdk.mjs` sits next to this file. One code cell = one plan: import, compose calls (loop, filter, chain), print only the final shape — intermediate data stays out of the transcript.

Harness with JS eval / node:

```js
import { homedir } from "node:os";
const { get, post, patch } = await import(homedir() + "/.agents/skills/kaneo/sdk.mjs");
const ws = await get("/workspace");                       // [{id, name, slug, role}]
const projects = await get("/project", { workspaceId: ws[0].id });
const board = await get(`/task/tasks/${projects[0].id}`, { page: 1, limit: 50 });
// board = { data: { name, columns: [{ id, slug, name, tasks: [...] }] }, pagination }
```

### Progressive discovery — не читай весь индекс

262 операции. Не знаешь точный эндпоинт — `api.search()`, потом `api.describe()` только для нужного:

```js
const { api, get, post } = await import(homedir() + "/.agents/skills/kaneo/sdk.mjs");
await api.search("comment task");        // → "POST /comment/{taskId} — Create task comment [createTaskComment]"
await api.describe("createTaskComment"); // → path/query/body с типами, enums, required
await post(`/comment/${taskId}`, { content: "…" });
```

Спека OpenAPI кэшируется 24ч в `~/.cache/kaneo/openapi.json`; `{ refresh: true }` — принудительно обновить. `endpoints.md` — офлайн-дамп того же индекса.

Harness with only bash: same endpoints via curl — `curl -sS "$(cat ~/.config/kaneo/url)/api/..." -H "Authorization: Bearer $(cat ~/.config/kaneo/key)"`.

- omp JS eval: print via `console.log(...)` — `log()` is silent there.
- Adjust the skill dir path to the harness (`~/.claude/skills/kaneo`, `~/.codex/skills/kaneo`, `~/.config/opencode/skills/kaneo`, `~/.pi/agent/skills/kaneo`, …).

## Key facts

- Base: `<instance>/api`; auth `Authorization: Bearer <key>`.
- IDs, not names: workspace/project/task IDs from URLs `/dashboard/workspace/WS/project/PR/board`.
- Errors: JSON `{message, code}`; 404 = нет доступа ИЛИ не существует; не ретраить мутации вслепую.
- Pagination: `page`/`limit`; tasks вложены в колонки (`data.columns[].tasks`), не плоским массивом; `projects[i].columns` уже содержит колонки проекта.
- Ticket keys (`KAN-12`) → `/task/by-ticket-id/…` (see endpoints.md) or search `/search`.
- Status changes: сначала получить колонки проекта — их slugs это валидные статусы.
- Custom field values не приходят в list/get task — отдельные endpoints (see endpoints.md).

## Writing changes

Mutations (`post`/`patch`/`del`) — plain REST; проверяй результат чтением. `del` без подтверждения пользователя не звать.

## Endpoint reference

`endpoints.md` — полный индекс (regenerate command внутри файла). Формат: `METHOD /path — summary [operationId]`.
