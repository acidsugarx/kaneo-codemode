#!/usr/bin/env bash
# kaneo-codemode installer — no defaults: instance URL and API key are required input.
# Usage:            KANEO_API_URL=<url> KANEO_API_KEY=<key> bash install.sh
# Interactive (tty): bash install.sh   (asks for both)
# Manual dest:       KANEODEST=<skills-dir> bash install.sh
set -euo pipefail

B="${KANEO_API_URL:-}"
KEY="${KANEO_API_KEY:-}"

if [ -z "$B" ] || [ -z "$KEY" ]; then
  if [ -t 0 ]; then
    [ -z "$B" ] && { printf 'Kaneo instance URL (e.g. https://kaneo.example.com): '; read -r B; }
    [ -z "$KEY" ] && { printf 'Kaneo API key (Settings → Account → Developer): '; read -rs KEY; printf '\n'; }
  fi
  [ -z "$B" ] || [ -z "$KEY" ] && { echo "ERROR: KANEO_API_URL and KANEO_API_KEY required (env or interactive)" >&2; exit 1; }
fi

B="${B%%/}"; B="${B%/api}"

mkdir -p "$HOME/.config/kaneo"
printf '%s\n' "$B" > "$HOME/.config/kaneo/url"
printf '%s' "$KEY" > "$HOME/.config/kaneo/key"
chmod 600 "$HOME/.config/kaneo/key"

SRC="$(cd "$(dirname "$0")" && pwd)"
# marker dir -> skill dir (installed only when the harness is present; first entry always installed)
DESTS=("$HOME/.agents/skills/kaneo:~/.agents/skills — omp, pi shared, agents-skills standard")
[ -d "$HOME/.claude" ]         && DESTS+=("$HOME/.claude/skills/kaneo:~/.claude/skills — Claude Code")
[ -d "$HOME/.codex" ]          && DESTS+=("$HOME/.codex/skills/kaneo:~/.codex/skills — Codex CLI")
[ -d "$HOME/.config/opencode" ] && DESTS+=("$HOME/.config/opencode/skills/kaneo:~/.config/opencode/skills — OpenCode")
[ -d "$HOME/.pi" ]             && DESTS+=("$HOME/.pi/agent/skills/kaneo:~/.pi/agent/skills — pi coding agent")
[ -d "$HOME/.cursor" ]         && DESTS+=("$HOME/.cursor/skills/kaneo:~/.cursor/skills — Cursor")
[ -d "$HOME/.gemini" ]         && DESTS+=("$HOME/.gemini/skills/kaneo:~/.gemini/skills — Gemini CLI")
[ -n "${KANEODEST:-}" ]        && DESTS+=("${KANEODEST%/}/kaneo:KANEODEST — manual")

ENDPOINTS="$(curl -sSf "$B/api/openapi" -H "Authorization: Bearer $KEY" | jq -r '.paths|to_entries[]|.key as $p|.value|to_entries[]|select(.value.operationId)|"\(.key|ascii_upcase) \($p) — \(.value.summary // "-") [\(.value.operationId)]"' | sort)"

for entry in "${DESTS[@]}"; do
  d="${entry%%:*}"; label="${entry#*:}"
  mkdir -p "$d"
  cp "$SRC/SKILL.md" "$SRC/sdk.mjs" "$d/"
  { printf '# Kaneo API endpoints — %s — %s ops\n\nInstance: %s (also in ~/.config/kaneo/url). Regenerate:\n`curl -sS "$(cat ~/.config/kaneo/url)/api/openapi" -H "Authorization: Bearer $(cat ~/.config/kaneo/key)" | jq -r '"'"'.paths|to_entries[]|.key as $p|.value|to_entries[]|select(.value.operationId)|"\\(.key|ascii_upcase) \\($p) — \\(.value.summary // \\"-\\") [\\(.value.operationId)]"'"'"' | sort`\n\n```\n' "$(date +%F)" "$(printf '%s\n' "$ENDPOINTS" | wc -l | tr -d ' ')" "$B"; printf '%s\n```\n' "$ENDPOINTS"; } > "$d/endpoints.md"
  echo "installed -> $d  ($label)"
done

echo "verify:"
curl -sSf "$B/api/workspace" -H "Authorization: Bearer $KEY" | jq -r '.[] | "  \(.name) (\(.role))"'
