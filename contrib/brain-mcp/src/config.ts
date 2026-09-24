function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  /** Absolute path to the Obsidian vault inside the container. */
  vaultPath: process.env.BRAIN_VAULT_PATH ?? "/vault",

  /** Public base URL this server is reached at, no trailing slash. e.g. https://brain.example.com */
  publicUrl: req("BRAIN_PUBLIC_URL").replace(/\/+$/, ""),

  /** HS256 signing secret for issued access tokens. 32+ random bytes, base64. */
  jwtSecret: req("BRAIN_JWT_SECRET"),

  /** Password the human types on the consent screen to authorize a client. */
  authPassword: req("BRAIN_AUTH_PASSWORD"),

  /** Where registered OAuth clients are persisted. Put this on the PVC. */
  statePath: process.env.BRAIN_STATE_PATH ?? "/state/clients.json",

  port: Number(process.env.PORT ?? 8080),

  /** Write tools are only registered when this is exactly "true". */
  allowWrite: process.env.BRAIN_ALLOW_WRITE === "true",

  accessTokenTtlSeconds: Number(process.env.BRAIN_TOKEN_TTL ?? 60 * 60 * 24 * 30),
} as const;

/** The canonical resource identifier Claude will request and we must put in `aud`. */
export const RESOURCE_URI = `${config.publicUrl}/mcp`;
