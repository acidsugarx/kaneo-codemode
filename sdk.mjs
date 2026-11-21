// Kaneo API SDK — code-mode helper, portable Node 18+ / Bun (no runtime-specific APIs).
// No defaults: instance URL and key come from env or config files written by install.sh.
//   URL: KANEO_API_URL env, else first line of ~/.config/kaneo/url
//   Key: KANEO_API_KEY env, else first line of ~/.config/kaneo/key (mode 600)
// Code-mode: `api.search(q)` / `api.describe(op)` = progressive discovery over the instance
// OpenAPI spec (cached 24h in ~/.cache/kaneo/openapi.json) — pull only the endpoint you need
// instead of reading the whole endpoints.md index.
import { homedir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";

async function readCfg(name) {
  try {
    return (await readFile(homedir() + "/.config/kaneo/" + name, "utf8")).trim();
  } catch {
    return "";
  }
}

async function baseUrl() {
  let b = process.env.KANEO_API_URL || (await readCfg("url"));
  if (!b) throw new Error("No instance URL: set KANEO_API_URL env or run install.sh (writes ~/.config/kaneo/url)");
  b = b.replace(/\/+$/, "").replace(/\/api$/, "");
  return b + "/api";
}

async function key() {
  const k = process.env.KANEO_API_KEY || (await readCfg("key"));
  if (!k) throw new Error("No API key: set KANEO_API_KEY env or run install.sh (writes ~/.config/kaneo/key)");
  return k;
}

export async function k(method, path, opts = {}) {
  const url = new URL((await baseUrl()) + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await key()}`,
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Kaneo ${res.status} ${method} ${path}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

export const get = (path, query) => k("GET", path, { query });
export const post = (path, body) => k("POST", path, { body });
export const patch = (path, body) => k("PATCH", path, { body });
export const del = (path) => k("DELETE", path);

// ---- progressive discovery -------------------------------------------------

const SPEC_TTL_MS = 24 * 60 * 60 * 1000;

async function loadSpec({ refresh = false } = {}) {
  const cache = homedir() + "/.cache/kaneo/openapi.json";
  if (!refresh) {
    try {
      const c = JSON.parse(await readFile(cache, "utf8"));
      if (Date.now() - c.fetchedAt < SPEC_TTL_MS) return c.spec;
    } catch {}
  }
  const spec = await k("GET", "/openapi");
  try {
    await mkdir(homedir() + "/.cache/kaneo", { recursive: true });
    await writeFile(cache, JSON.stringify({ fetchedAt: Date.now(), spec }));
  } catch {}
  return spec;
}

function* ops(spec) {
  for (const [p, item] of Object.entries(spec.paths ?? {})) {
    for (const [m, op] of Object.entries(item)) {
      if (op && typeof op === "object" && op.operationId) {
        yield { method: m.toUpperCase(), path: p, op };
      }
    }
  }
}

function score(o, q) {
  const hay = `${o.op.operationId} ${o.op.summary ?? ""} ${o.path}`.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const w of words) {
    const i = hay.indexOf(w);
    if (i < 0) return 0;
    s += (o.op.operationId?.toLowerCase().includes(w) ? 3 : 0) + (i < 20 ? 2 : 1);
  }
  return s;
}

export async function search(query, { limit = 15, refresh = false } = {}) {
  const spec = await loadSpec({ refresh });
  const ranked = [...ops(spec)]
    .map((o) => ({ o, s: score(o, query ?? "") }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
  return ranked.map(({ o }) => `${o.method} ${o.path} — ${o.op.summary ?? "-"} [${o.op.operationId}]`);
}

function shape(schema, spec, depth = 0) {
  if (!schema) return "unknown";
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    const def = (spec.components?.schemas ?? {})[name];
    return depth >= 2 ? name : shape(def, spec, depth);
  }
  if (schema.type === "array") return `${shape(schema.items, spec, depth + 1)}[]`;
  if (schema.type === "object" || schema.properties) {
    if (depth >= 2) return "object";
    const req = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties ?? {})
      .map(([n, p]) => `${n}${req.has(n) ? "" : "?"}: ${shape(p, spec, depth + 1)}`)
      .join("; ");
    return `{ ${fields} }`;
  }
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  return schema.type ?? "unknown";
}

export async function describe(target, { refresh = false } = {}) {
  const spec = await loadSpec({ refresh });
  const t = target.trim();
  let found;
  for (const o of ops(spec)) {
    if (o.op.operationId === t || `${o.method} ${o.path}` === t || o.path === t) {
      found = o;
      break;
    }
  }
  if (!found) throw new Error(`Operation not found: ${target} (call search() first)`);
  const { method, path, op } = found;
  const lines = [`${method} ${path} — ${op.summary ?? ""} [${op.operationId}]`];
  for (const p of op.parameters ?? []) {
    lines.push(`  ${p.in} ${p.name}${p.required ? "" : "?"}: ${shape(p.schema, spec)}${p.description ? ` // ${p.description}` : ""}`);
  }
  const body = op.requestBody?.content?.["application/json"]?.schema;
  if (body) lines.push(`  body: ${shape(body, spec)}`);
  return lines.join("\n");
}

export const api = { search, describe, loadSpec };
