import { promises as fs } from "node:fs";
import * as path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { config } from "../config.js";

export interface RegisteredClient {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method: string;
  created_at: number;
}

export interface AuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: "S256";
  resource: string;
  expires_at: number;
}

const clients = new Map<string, RegisteredClient>();
const codes = new Map<string, AuthCode>();

export async function loadClients(): Promise<void> {
  try {
    const raw = await fs.readFile(config.statePath, "utf8");
    for (const c of JSON.parse(raw) as RegisteredClient[]) clients.set(c.client_id, c);
    console.log(`[oauth] loaded ${clients.size} registered client(s)`);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
    console.log("[oauth] no client store yet; starting empty");
  }
}

async function persistClients(): Promise<void> {
  await fs.mkdir(path.dirname(config.statePath), { recursive: true });
  await fs.writeFile(config.statePath, JSON.stringify([...clients.values()], null, 2), "utf8");
}

export async function registerClient(input: {
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
}): Promise<RegisteredClient> {
  const client: RegisteredClient = {
    client_id: randomUUID(),
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    // Claude registers as a public client (no secret) — required by the MCP
    // authorization spec, not a fallback.
    token_endpoint_auth_method: input.token_endpoint_auth_method ?? "none",
    created_at: Date.now(),
  };
  clients.set(client.client_id, client);
  await persistClients();
  return client;
}

export function getClient(id: string): RegisteredClient | undefined {
  return clients.get(id);
}

export function issueCode(
  data: Omit<AuthCode, "code" | "expires_at">,
  ttlMs = 5 * 60_000,
): string {
  const code = randomBytes(32).toString("base64url");
  codes.set(code, { ...data, code, expires_at: Date.now() + ttlMs });
  return code;
}

/** Single-use: consuming a code removes it whether or not it was still valid. */
export function consumeCode(code: string): AuthCode | undefined {
  const entry = codes.get(code);
  if (!entry) return undefined;
  codes.delete(code);
  if (entry.expires_at < Date.now()) return undefined;
  return entry;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of codes) if (v.expires_at < now) codes.delete(k);
}, 60_000).unref();
