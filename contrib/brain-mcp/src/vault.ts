import { promises as fs } from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);
const VAULT = path.resolve(config.vaultPath);

/**
 * Resolve a vault-relative path and refuse anything that escapes the vault.
 * This is the only place paths are turned into absolute paths — every fs call
 * in this file goes through it.
 */
export function safeResolve(relPath: string): string {
  if (typeof relPath !== "string" || relPath.length === 0) {
    throw new Error("Path must be a non-empty string");
  }
  if (relPath.includes("\0")) throw new Error("Path contains a null byte");

  const abs = path.resolve(VAULT, relPath);
  const rel = path.relative(VAULT, abs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `Path escapes the vault: ${relPath}. Paths must be relative to the vault root.`,
    );
  }
  return abs;
}

/** Reject symlinks that point outside the vault (checked after resolution). */
async function assertRealPathInVault(abs: string): Promise<void> {
  try {
    const real = await fs.realpath(abs);
    const rel = path.relative(VAULT, real);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("Path resolves outside the vault via a symlink");
    }
  } catch (err: unknown) {
    // ENOENT is fine for writes to new files; anything else re-throws.
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
  }
}

export interface NoteMeta {
  path: string;
  bytes: number;
  modified: string;
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue; // .obsidian, .git, .trash
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

export async function listNotes(subdir = "", limit = 200): Promise<NoteMeta[]> {
  const base = subdir ? safeResolve(subdir) : VAULT;
  await assertRealPathInVault(base);
  const files = await walk(base);
  const metas = await Promise.all(
    files.map(async (f) => {
      const st = await fs.stat(f);
      return {
        path: path.relative(VAULT, f),
        bytes: st.size,
        modified: st.mtime.toISOString(),
      };
    }),
  );
  metas.sort((a, b) => a.path.localeCompare(b.path));
  return metas.slice(0, limit);
}

export async function recentNotes(limit = 25): Promise<NoteMeta[]> {
  const all = await listNotes("", Number.MAX_SAFE_INTEGER);
  all.sort((a, b) => b.modified.localeCompare(a.modified));
  return all.slice(0, limit);
}

export async function readNote(relPath: string, maxBytes = 200_000): Promise<string> {
  const abs = safeResolve(relPath);
  await assertRealPathInVault(abs);
  const st = await fs.stat(abs);
  if (st.size > maxBytes) {
    const fh = await fs.open(abs, "r");
    try {
      const buf = Buffer.alloc(maxBytes);
      await fh.read(buf, 0, maxBytes, 0);
      return buf.toString("utf8") + `\n\n[truncated: note is ${st.size} bytes]`;
    } finally {
      await fh.close();
    }
  }
  return fs.readFile(abs, "utf8");
}

export interface SearchHit {
  path: string;
  line: number;
  text: string;
}

/**
 * Full-text search via ripgrep. Returns at most `limit` hits.
 * `query` is passed as a fixed string (-F) unless `regex` is true.
 */
export async function searchVault(
  query: string,
  opts: { regex?: boolean; limit?: number; caseSensitive?: boolean } = {},
): Promise<SearchHit[]> {
  const limit = opts.limit ?? 50;
  const args = [
    "--json",
    "--glob", "*.md",
    "--glob", "!.obsidian/**",
    "--max-count", String(Math.min(limit, 20)),
    opts.caseSensitive ? "--case-sensitive" : "--ignore-case",
  ];
  if (!opts.regex) args.push("--fixed-strings");
  args.push("--", query, VAULT);

  let stdout = "";
  try {
    ({ stdout } = await execFileAsync("rg", args, {
      maxBuffer: 16 * 1024 * 1024,
      timeout: 20_000,
    }));
  } catch (err: unknown) {
    // rg exits 1 when there are no matches; that is not an error for us.
    const e = err as { code?: number; stdout?: string };
    if (e.code === 1) return [];
    throw err;
  }

  const hits: SearchHit[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    let evt: any;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== "match") continue;
    hits.push({
      path: path.relative(VAULT, evt.data.path.text),
      line: evt.data.line_number,
      text: String(evt.data.lines.text ?? "").trimEnd().slice(0, 400),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

export async function writeNote(relPath: string, content: string): Promise<NoteMeta> {
  if (!relPath.endsWith(".md")) throw new Error("Note path must end in .md");
  const abs = safeResolve(relPath);
  await assertRealPathInVault(abs);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
  const st = await fs.stat(abs);
  return { path: path.relative(VAULT, abs), bytes: st.size, modified: st.mtime.toISOString() };
}

export async function appendNote(relPath: string, content: string): Promise<NoteMeta> {
  if (!relPath.endsWith(".md")) throw new Error("Note path must end in .md");
  const abs = safeResolve(relPath);
  await assertRealPathInVault(abs);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const sep = content.startsWith("\n") ? "" : "\n";
  await fs.appendFile(abs, sep + content, "utf8");
  const st = await fs.stat(abs);
  return { path: path.relative(VAULT, abs), bytes: st.size, modified: st.mtime.toISOString() };
}
