import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { registerTools } from "./tools.js";
import { oauthRouter } from "./oauth/routes.js";
import { requireBearer } from "./oauth/middleware.js";
import { loadClients } from "./oauth/store.js";

function buildMcpServer(): McpServer {
  const server = new McpServer(
    { name: "brain", version: "0.1.0" },
    {
      instructions:
        "This server exposes Drew's Obsidian brain vault — the durable source of truth for " +
        "household, projects, and personal context. Start with brain_search; fall back to " +
        "brain_list_notes only when browsing structure.",
    },
  );
  registerTools(server);
  return server;
}

async function main() {
  await loadClients();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true); // behind cloudflared
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/healthz", (_req, res) => res.json({ ok: true, vault: config.vaultPath }));

  // OAuth 2.1 authorization server + discovery metadata.
  app.use(oauthRouter);

  // MCP endpoint. Stateless: a fresh server and transport per request, which
  // keeps this safe to scale horizontally and avoids session affinity.
  app.post("/mcp", requireBearer, async (req, res) => {
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[mcp] request failed", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // Stateless mode has no server-initiated stream and no session to delete.
  const methodNotAllowed = (_req: express.Request, res: express.Response) =>
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed; this server is stateless." },
      id: null,
    });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  app.listen(config.port, () => {
    console.log(`[brain-mcp] listening on :${config.port}`);
    console.log(`[brain-mcp] public url   ${config.publicUrl}`);
    console.log(`[brain-mcp] vault        ${config.vaultPath}`);
    console.log(`[brain-mcp] write tools  ${config.allowWrite ? "ENABLED" : "disabled"}`);
  });
}

main().catch((err) => {
  console.error("[brain-mcp] fatal:", err);
  process.exit(1);
});
