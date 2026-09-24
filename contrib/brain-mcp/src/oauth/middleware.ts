import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { verifyAccessToken } from "./jwt.js";

/**
 * Bearer auth for the MCP endpoint.
 *
 * On failure we must return 401 with a WWW-Authenticate header pointing at the
 * protected-resource metadata — that is how Claude discovers where to start the
 * OAuth dance.
 */
export async function requireBearer(req: Request, res: Response, next: NextFunction) {
  const challenge =
    `Bearer realm="brain", ` +
    `resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource"`;

  const header = req.header("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(header.trim());
  if (!match) {
    res.setHeader("WWW-Authenticate", challenge);
    return res.status(401).json({
      error: "unauthorized",
      error_description: "Missing bearer token",
    });
  }

  try {
    const claims = await verifyAccessToken(match[1]);
    (req as Request & { clientId?: string }).clientId = claims.client_id;
    return next();
  } catch (err) {
    res.setHeader("WWW-Authenticate", `${challenge}, error="invalid_token"`);
    return res.status(401).json({
      error: "invalid_token",
      error_description: err instanceof Error ? err.message : "Token verification failed",
    });
  }
}
