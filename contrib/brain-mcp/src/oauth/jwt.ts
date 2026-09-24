import { SignJWT, jwtVerify } from "jose";
import { config, RESOURCE_URI } from "../config.js";

const key = new TextEncoder().encode(config.jwtSecret);

export async function issueAccessToken(clientId: string, resource: string): Promise<string> {
  return new SignJWT({ client_id: clientId })
    .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
    .setIssuer(config.publicUrl)
    // Audience binding. Claude always sends `resource` on /authorize, and we
    // echo it here so a token minted for a different resource cannot be
    // replayed against this server.
    .setAudience(resource)
    .setSubject(clientId)
    .setIssuedAt()
    .setExpirationTime(`${config.accessTokenTtlSeconds}s`)
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<{ client_id: string }> {
  const { payload } = await jwtVerify(token, key, {
    issuer: config.publicUrl,
    // Exact match against our canonical resource URI.
    audience: RESOURCE_URI,
    algorithms: ["HS256"],
  });
  return { client_id: String(payload.client_id ?? payload.sub) };
}
