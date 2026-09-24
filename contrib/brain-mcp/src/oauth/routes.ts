import { Router, type Request, type Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { config, RESOURCE_URI } from "../config.js";
import { consumeCode, getClient, issueCode, registerClient } from "./store.js";
import { issueAccessToken } from "./jwt.js";

export const oauthRouter = Router();

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function pkceMatches(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return constantTimeEquals(computed, challenge);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// ---------------------------------------------------------------------------
// Discovery metadata
// ---------------------------------------------------------------------------

oauthRouter.get("/.well-known/oauth-authorization-server", (_req, res) => {
  res.json({
    issuer: config.publicUrl,
    authorization_endpoint: `${config.publicUrl}/authorize`,
    token_endpoint: `${config.publicUrl}/token`,
    registration_endpoint: `${config.publicUrl}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["brain.read", "brain.write"],
  });
});

oauthRouter.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: RESOURCE_URI,
    authorization_servers: [config.publicUrl],
    bearer_methods_supported: ["header"],
  });
});

// ---------------------------------------------------------------------------
// Dynamic client registration (RFC 7591) — Claude assumes it is not
// pre-registered, so this endpoint is mandatory.
// ---------------------------------------------------------------------------

oauthRouter.post("/register", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const redirectUris: unknown = body.redirect_uris;

  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return res.status(400).json({
      error: "invalid_redirect_uri",
      error_description: "redirect_uris must be a non-empty array",
    });
  }
  for (const uri of redirectUris) {
    if (typeof uri !== "string" || !/^https:\/\//i.test(uri)) {
      return res.status(400).json({
        error: "invalid_redirect_uri",
        error_description: `redirect_uri must be an https URL: ${String(uri)}`,
      });
    }
  }

  const client = await registerClient({
    client_name: typeof body.client_name === "string" ? body.client_name : undefined,
    redirect_uris: redirectUris as string[],
    token_endpoint_auth_method: "none",
  });

  console.log(`[oauth] registered client ${client.client_id} (${client.client_name ?? "unnamed"})`);

  return res.status(201).json({
    client_id: client.client_id,
    client_id_issued_at: Math.floor(client.created_at / 1000),
    redirect_uris: client.redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
});

// ---------------------------------------------------------------------------
// Authorization endpoint
// ---------------------------------------------------------------------------

interface AuthzParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
  resource?: string;
}

function validateAuthzParams(q: Record<string, unknown>): AuthzParams | { error: string } {
  const client_id = String(q.client_id ?? "");
  const redirect_uri = String(q.redirect_uri ?? "");
  const code_challenge = String(q.code_challenge ?? "");
  const code_challenge_method = String(q.code_challenge_method ?? "");

  const client = getClient(client_id);
  if (!client) return { error: "Unknown client_id. Re-register the connector." };
  if (!client.redirect_uris.includes(redirect_uri)) {
    return { error: "redirect_uri does not match any registered URI for this client." };
  }
  if (code_challenge_method !== "S256") {
    return { error: "code_challenge_method must be S256." };
  }
  if (!code_challenge) return { error: "code_challenge is required." };

  return {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state: q.state === undefined ? undefined : String(q.state),
    resource: q.resource === undefined ? undefined : String(q.resource),
  };
}

oauthRouter.get("/authorize", (req: Request, res: Response) => {
  const parsed = validateAuthzParams(req.query as Record<string, unknown>);
  if ("error" in parsed) return res.status(400).send(escapeHtml(parsed.error));

  const client = getClient(parsed.client_id)!;
  const hidden = (name: string, value: string | undefined) =>
    value === undefined ? "" : `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;

  res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize access to brain</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 26rem; margin: 4rem auto; padding: 0 1rem; }
  .card { border: 1px solid #8884; border-radius: 12px; padding: 1.5rem; }
  h1 { font-size: 1.15rem; margin: 0 0 .25rem; }
  p { color: #888; font-size: .9rem; margin: .25rem 0 1.25rem; }
  label { display: block; font-size: .85rem; margin-bottom: .35rem; }
  input[type=password] { width: 100%; padding: .6rem; border-radius: 8px; border: 1px solid #8886;
    background: transparent; color: inherit; font-size: 1rem; box-sizing: border-box; }
  button { margin-top: 1rem; width: 100%; padding: .65rem; border: 0; border-radius: 8px;
    background: #c96442; color: #fff; font-size: 1rem; cursor: pointer; }
</style></head><body>
<div class="card">
  <h1>Authorize access to your brain</h1>
  <p><strong>${escapeHtml(client.client_name ?? "An application")}</strong> is requesting access to your Obsidian vault.</p>
  <form method="POST" action="/authorize">
    ${hidden("client_id", parsed.client_id)}
    ${hidden("redirect_uri", parsed.redirect_uri)}
    ${hidden("code_challenge", parsed.code_challenge)}
    ${hidden("code_challenge_method", parsed.code_challenge_method)}
    ${hidden("state", parsed.state)}
    ${hidden("resource", parsed.resource)}
    <label for="pw">Vault password</label>
    <input id="pw" type="password" name="password" autocomplete="current-password" autofocus required>
    <button type="submit">Authorize</button>
  </form>
</div></body></html>`);
});

oauthRouter.post("/authorize", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const parsed = validateAuthzParams(body);
  if ("error" in parsed) return res.status(400).send(escapeHtml(parsed.error));

  const password = String(body.password ?? "");
  if (!constantTimeEquals(password, config.authPassword)) {
    console.warn("[oauth] failed authorize attempt");
    return res.status(401).type("html").send(
      `<p>Incorrect password. <a href="javascript:history.back()">Try again</a>.</p>`,
    );
  }

  const code = issueCode({
    client_id: parsed.client_id,
    redirect_uri: parsed.redirect_uri,
    code_challenge: parsed.code_challenge,
    code_challenge_method: "S256",
    // Bind the code to the requested resource so the token inherits it.
    resource: parsed.resource ?? RESOURCE_URI,
  });

  const target = new URL(parsed.redirect_uri);
  target.searchParams.set("code", code);
  if (parsed.state !== undefined) target.searchParams.set("state", parsed.state);
  return res.redirect(302, target.toString());
});

// ---------------------------------------------------------------------------
// Token endpoint
// ---------------------------------------------------------------------------

oauthRouter.post("/token", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (String(body.grant_type ?? "") !== "authorization_code") {
    return res.status(400).json({
      error: "unsupported_grant_type",
      error_description: "Only authorization_code is supported",
    });
  }

  const entry = consumeCode(String(body.code ?? ""));
  if (!entry) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Authorization code is unknown, expired, or already used",
    });
  }

  if (String(body.client_id ?? "") !== entry.client_id) {
    return res.status(400).json({ error: "invalid_grant", error_description: "client_id mismatch" });
  }
  if (String(body.redirect_uri ?? "") !== entry.redirect_uri) {
    return res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
  }

  const verifier = String(body.code_verifier ?? "");
  if (!verifier || !pkceMatches(verifier, entry.code_challenge)) {
    return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
  }

  // If the client re-states `resource` at the token endpoint it must agree
  // with what it asked for at /authorize.
  const requested = body.resource === undefined ? entry.resource : String(body.resource);
  if (requested !== entry.resource) {
    return res.status(400).json({
      error: "invalid_target",
      error_description: "resource does not match the authorization request",
    });
  }

  const accessToken = await issueAccessToken(entry.client_id, entry.resource);
  console.log(`[oauth] issued access token to client ${entry.client_id}`);

  return res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: config.accessTokenTtlSeconds,
    scope: config.allowWrite ? "brain.read brain.write" : "brain.read",
  });
});
