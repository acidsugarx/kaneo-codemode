# kaneo-codemode

Kaneo без MCP: агент пишет код против REST API (Bearer-ключ), а не дёргает 41 типизированный тул. Code-mode паттерн ([Cloudflare Code Mode](https://developers.cloudflare.com/agents/tools/codemode/) идея) — локально, без воркеров и лишних хопов.

Покрывает **все** операции инстанса: задачи, проекты, labels, комментарии, time entries, custom fields, notifications, admin — против ~41 у MCP-пакетов. Промежуточные данные остаются внутри одной ячейки кода, в транскрипт падает только финальная форма.

Без хардкода инстанса: URL и ключ задаются при установке, хранятся в `~/.config/kaneo/`.

## Install

Вставь агенту одну строку — полную инструкцию он сам фетчит с GitHub:

```text
install kaneo-codemode — fetch and follow https://raw.githubusercontent.com/acidsugarx/kaneo-codemode/main/INSTALL.md ; ask me for the Kaneo instance URL and API key
```

## Состав

| Файл | Что |
|---|---|
| `sdk.mjs` | fetch-обёртка `k/get/post/patch/del` (Node 18+/Bun, без зависимостей) |
| `SKILL.md` | скилл для агента: когда звать, паттерн, проверенные факты API |
| `install.sh` | установка в скилл-каталоги harness'ов + конфиг + генерация endpoints.md + верификация |
| `INSTALL.md` | полная инструкция для агента (RU/EN), фетчится по raw-URL |

## Установка

### Агентом (любой harness)

Промпт выше, или скорми агенту напрямую содержимое `INSTALL.md` (raw: https://raw.githubusercontent.com/acidsugarx/kaneo-codemode/main/INSTALL.md).

### Руками

```bash
KANEO_API_URL=https://kaneo.example.com KANEO_API_KEY=<ключ> bash install.sh
```

Без env-переменных в tty скрипт спросит URL и ключ интерактивно. Ключ — Settings → Account → Developer в Kaneo.

Поддерживаемые скилл-каталоги (ставится во все обнаруженные): `~/.agents/skills` (omp, pi, agents-skills standard), `~/.claude/skills` (Claude Code), `~/.codex/skills` (Codex CLI), `~/.config/opencode/skills` (OpenCode), `~/.pi/agent/skills` (pi), `~/.cursor/skills` (Cursor), `~/.gemini/skills` (Gemini CLI). Ручной каталог: `KANEODEST=<dir> bash install.sh`.

## Использование (любой JS eval / node)

```js
import { homedir } from "node:os";
const { get } = await import(homedir() + "/.agents/skills/kaneo/sdk.mjs");
const ws = await get("/workspace");
const projects = await get("/project", { workspaceId: ws[0].id });
```

Полный список операций — `endpoints.md` (генерируется установщиком, команда перегенерации в шапке файла).

## Конфиг

- `~/.config/kaneo/url` + `~/.config/kaneo/key` (600) — пишет install.sh
- Override: `KANEO_API_URL`, `KANEO_API_KEY` env

## Почему не MCP

- 41 схема тула в каждом контексте сессии против скилл-карточки по требованию.
+композиция: N зависимых вызовов одним куском кода, loops/фильтрация на месте.
- Официальный `@kaneo/mcp` закрывает подмножество; встроенный `/api/mcp` — OAuth 2.1, API-ключ не принимает.
