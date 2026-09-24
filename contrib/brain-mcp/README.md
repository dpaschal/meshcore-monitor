# brain-mcp

A remote MCP server that exposes the Obsidian brain vault on **neuron** to
claude.ai, so cloud Claude sessions (phone, web, Claude Code on the web) can
read it. Local stdio MCP servers can't do this — they only exist for sessions
running on the same machine.

## Why it needs OAuth

claude.ai custom connectors won't accept a bearer token you hand them. The
server has to be a real OAuth 2.1 authorization server:

- **Dynamic Client Registration** — Claude assumes it isn't pre-registered, so
  `POST /register` is mandatory and must accept public clients
  (`token_endpoint_auth_method: "none"`).
- **PKCE S256** — required on every authorization.
- **Audience binding** — Claude always sends `resource` on `/authorize`. That
  value goes into the JWT `aud` claim and is exact-match verified on every MCP
  request. This is what stops a token minted elsewhere being replayed here.

The alternative is an authless server, which would put the entire vault behind
a guessable URL. Not an option for this content.

Authentication for the human is a single password on the consent screen. One
user, one vault — a full IdP would be overkill.

## Tools

| Tool | Mode | Notes |
|---|---|---|
| `brain_search` | read | ripgrep across all `.md`. Start here — far cheaper than listing + reading. |
| `brain_read_note` | read | Full content of one note by vault-relative path. |
| `brain_list_notes` | read | Browse structure, optionally scoped to a subfolder. |
| `brain_recent_notes` | read | What changed lately, newest first. |
| `brain_append_note` | write | Appends only. Never destroys content. |
| `brain_write_note` | write | Replaces a whole note. Destructive. |

Write tools are **not registered at all** unless `BRAIN_ALLOW_WRITE=true`.
Start read-only.

All paths are confined to the vault root, including after symlink resolution.
`../` escapes are refused.

## Setup order

### 1. Build and push the image

```bash
cd contrib/brain-mcp
podman build -t ghcr.io/dpaschal/brain-mcp:0.1.0 .   # or buildah / nix / kaniko
podman push ghcr.io/dpaschal/brain-mcp:0.1.0
```

Only the *build* uses a container tool — the service itself runs in k8s.

### 2. Create the Cloudflare tunnel

Zero Trust dashboard → Networks → Tunnels → Create. Add a public hostname,
e.g. `brain.yourdomain.com`, pointing at:

```
http://brain-mcp.brain.svc.cluster.local:80
```

Copy the `--token ey...` value. Do **not** put Cloudflare Access in front of
this hostname — Claude can't complete an Access challenge, and the OAuth
server below is the actual gate.

### 3. Fill in secrets

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
# edit k8s/secrets.yaml — see the comments in it for generating values
kubectl apply -f k8s/secrets.yaml
```

### 4. Edit the deployment

In `k8s/brain-mcp.yaml`, set:

- `image:` — your registry path
- `BRAIN_PUBLIC_URL` — `https://brain.yourdomain.com`, **no trailing slash**,
  exactly matching the Cloudflare hostname
- `hostPath.path` — the real vault directory on neuron
- `nodeSelector` — confirm the hostname matches the node

### 5. Deploy

```bash
kubectl apply -f k8s/brain-mcp.yaml
kubectl -n brain rollout status deploy/brain-mcp deploy/cloudflared
curl -s https://brain.yourdomain.com/healthz
curl -s https://brain.yourdomain.com/.well-known/oauth-protected-resource
```

### 6. Add the connector

claude.ai → Settings → Connectors → **Add custom connector**. URL:

```
https://brain.yourdomain.com/mcp
```

Leave the advanced OAuth client ID/secret fields blank — DCR handles it. You'll
be redirected to the consent screen; enter the vault password. Then enable the
connector in the chats you want it in.

## Going read-write

Two changes, both in `k8s/brain-mcp.yaml`, and they must agree:

1. `BRAIN_ALLOW_WRITE` → `"true"`
2. the `vault` volumeMount `readOnly` → `false`

Changing only the env var leaves the mount read-only and every write fails with
`EROFS`.

## Local development

```bash
npm install && npm run build
BRAIN_VAULT_PATH=/path/to/vault \
BRAIN_PUBLIC_URL=http://localhost:8080 \
BRAIN_JWT_SECRET=$(head -c 32 /dev/urandom | base64) \
BRAIN_AUTH_PASSWORD=devpassword \
BRAIN_STATE_PATH=/tmp/brain-clients.json \
BRAIN_ALLOW_WRITE=true \
npm start
```

Then `npx @modelcontextprotocol/inspector` against `http://localhost:8080/mcp`.

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `BRAIN_PUBLIC_URL` | yes | — | Public base URL, no trailing slash. Must match Cloudflare exactly. |
| `BRAIN_JWT_SECRET` | yes | — | HS256 signing key. 32+ random bytes. Rotating it invalidates all tokens. |
| `BRAIN_AUTH_PASSWORD` | yes | — | Typed on the consent screen. |
| `BRAIN_VAULT_PATH` | no | `/vault` | Vault root inside the container. |
| `BRAIN_STATE_PATH` | no | `/state/clients.json` | Registered OAuth clients. Must persist. |
| `BRAIN_ALLOW_WRITE` | no | `false` | Exactly `"true"` to register write tools. |
| `BRAIN_TOKEN_TTL` | no | `2592000` | Access token lifetime, seconds (30d). |
| `PORT` | no | `8080` | |

## Verified

Built and smoke-tested end to end before commit: discovery metadata, DCR, the
401 challenge with `WWW-Authenticate`, the full authorize → code → token flow
with PKCE, `tools/list`, `brain_search`, and these rejections —

- wrong consent password → 401
- bad PKCE verifier → `invalid_grant`
- authorization code replay → `invalid_grant`
- garbage / empty / payload-tampered token → 401
- token signed with a foreign secret → 401
- **valid signature, wrong `aud` → 401**
- `../../../../etc/passwd` → refused by path confinement

Not yet exercised against the real claude.ai connector flow — that needs the
tunnel up.
