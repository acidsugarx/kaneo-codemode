# One-prompt install (paste to any agent)

Агент сам спросит у юзера URL инстанса и API-ключ, если они не подставлены. Замените `<URL>` (инстанс Kaneo) и `<KEY>` (Settings → Account → Developer) — или оставь плейсхолдеры, агент спросит.

```text
Установи kaneo code-mode — обвязку Kaneo без MCP: код напрямую против REST API.
Параметры: инстанс <URL>, API-ключ <KEY>. Если какой-то не дан — спроси у меня, не выдумывай.
1. Склонируй репозиторий https://github.com/acidsugarx/kaneo-codemode (или скопируй файлы) в ~/CODES/h/kaneo-codemode.
2. Запусти: KANEO_API_URL=<URL> KANEO_API_KEY=<KEY> bash ~/CODES/h/kaneo-codemode/install.sh
   Скрипт: запишет URL+ключ в ~/.config/kaneo/{url,key} (600), скопирует SKILL.md+sdk.mjs в скилл-каталоги
   обнаруженных harness'ов (~/.agents/skills — omp/pi/стандарт; ~/.claude/skills; ~/.codex/skills;
   ~/.config/opencode/skills; ~/.pi/agent/skills; ~/.cursor/skills; ~/.gemini/skills — те, что есть),
   сгенерирует endpoints.md из /api/openapi, проверит доступ списком workspace'ов.
   Нет env — скрипт интерактивно спросит оба значения в tty.
3. Если harness использует другой каталог скиллов — положи туда SKILL.md+sdk.mjs+endpoints.md
   (или запусти с KANEODEST=<каталог>).
4. Проверь: JS (eval или node) `import(homedir()+"/.agents/skills/kaneo/sdk.mjs")`, вызови get("/workspace")
   и get("/project",{workspaceId:<id>}) — покажи имена проектов. Python-only harness: те же endpoints через
   requests с заголовком Authorization: Bearer <ключ>, база <URL>/api.
5. endpoints.md рядом со скиллом — полный список операций API; после апгрейда Kaneo перегенерируй
   командой из его шапки.
Ничего не спрашивай кроме отсутствующих параметров; в конце покажи результат проверки.
```

## English variant

The agent asks the user for the instance URL and API key when not substituted.

```text
Install kaneo code-mode — a no-MCP wrapper for Kaneo: code runs directly against the REST API.
Parameters: instance <URL>, API key <KEY>. If either is missing, ask me; never guess.
1. Clone https://github.com/acidsugarx/kaneo-codemode (or copy the files) to ~/CODES/h/kaneo-codemode.
2. Run: KANEO_API_URL=<URL> KANEO_API_KEY=<KEY> bash ~/CODES/h/kaneo-codemode/install.sh
   It writes URL+key to ~/.config/kaneo/{url,key} (600), copies SKILL.md+sdk.mjs into the skill dirs of
   every detected harness (~/.agents/skills — omp/pi/standard; ~/.claude/skills; ~/.codex/skills;
   ~/.config/opencode/skills; ~/.pi/agent/skills; ~/.cursor/skills; ~/.gemini/skills — whichever exist),
   regenerates endpoints.md from /api/openapi, and verifies by listing workspaces.
   Without env vars the script asks for both interactively in a tty.
3. If your harness uses a different skills dir, put SKILL.md+sdk.mjs+endpoints.md there
   (or rerun with KANEODEST=<dir>).
4. Verify: run JS (eval or node) importing homedir()+"/.agents/skills/kaneo/sdk.mjs", call get("/workspace")
   and get("/project",{workspaceId:<id>}) — report project names. Python-only harness: same endpoints via
   requests with header Authorization: Bearer <key>, base <URL>/api.
5. endpoints.md next to the skill is the full API operation index; regenerate after a Kaneo upgrade
   (command in its header).
Ask nothing except missing parameters; finish with verification output.
```

## Notes for the installing agent

- Key is a secret: file mode 600, never echo into logs or commit it.
- `sdk.mjs` needs Node 18+ (global fetch) or Bun; no other deps.
- The skill is read-only tooling: nothing writes to Kaneo until the host agent calls a mutation endpoint.
