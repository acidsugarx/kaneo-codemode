// Kaneo API SDK — code-mode helper, portable Node 18+ / Bun (no runtime-specific APIs).
// No defaults: instance URL and key come from env or config files written by install.sh.
//   URL: KANEO_API_URL env, else first line of ~/.config/kaneo/url
//   Key: KANEO_API_KEY env, else first line of ~/.config/kaneo/key (mode 600)
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";

async function readCfg(name) {
  try {
    return (await readFile(homedir() + "/.config/kaneo/" + name, "utf8")).trim();
  } catch {
    return "";
  }
}

async function baseUrl() {
  let b = process.env.KANEO_API_URL || (await readCfg("url"));
  if (!b) throw new Error("No instance URL: set KANEO_API_KEY-style env KANEO_API_URL or run install.sh (writes ~/.config/kaneo/url)");
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
