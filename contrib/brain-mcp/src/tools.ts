import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "./config.js";
import {
  appendNote,
  listNotes,
  readNote,
  recentNotes,
  searchVault,
  writeNote,
} from "./vault.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function ok(text: string, structured?: Record<string, unknown>): ToolResult {
  return structured
    ? { content: [{ type: "text", text }], structuredContent: structured }
    : { content: [{ type: "text", text }] };
}

function fail(err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
}

function renderNoteList(notes: Array<{ path: string; bytes: number; modified: string }>): string {
  if (notes.length === 0) return "No notes found.";
  return notes
    .map((n) => `- ${n.path}  (${n.bytes} bytes, modified ${n.modified.slice(0, 16).replace("T", " ")})`)
    .join("\n");
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "brain_search",
    {
      title: "Search the brain",
      description:
        "Full-text search across every markdown note in the Obsidian vault. Returns matching " +
        "lines with their note path and line number. Use this first when looking for anything " +
        "in the vault — it is much cheaper than listing and reading notes.",
      inputSchema: {
        query: z.string().min(1).describe("Text to search for, e.g. 'XG-100M' or 'mortgage balance'"),
        regex: z.boolean().optional().describe("Treat query as a regular expression (default false)"),
        caseSensitive: z.boolean().optional().describe("Match case exactly (default false)"),
        limit: z.number().int().min(1).max(200).optional().describe("Max hits to return (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, regex, caseSensitive, limit }) => {
      try {
        const hits = await searchVault(query, { regex, caseSensitive, limit });
        if (hits.length === 0) return ok(`No matches for "${query}".`);
        const text = hits.map((h) => `${h.path}:${h.line}\n    ${h.text}`).join("\n");
        return ok(`${hits.length} match(es) for "${query}":\n\n${text}`, { hits });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "brain_read_note",
    {
      title: "Read a note",
      description:
        "Read the full markdown content of one note, by its path relative to the vault root " +
        "(e.g. 'projects/meshcore.md'). Paths come from brain_search or brain_list_notes.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path, e.g. 'areas/radio/XG-100M.md'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ path: relPath }) => {
      try {
        const content = await readNote(relPath);
        return ok(content, { path: relPath, content });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "brain_list_notes",
    {
      title: "List notes",
      description:
        "List note paths in the vault, optionally scoped to a subfolder. Prefer brain_search " +
        "when you are looking for content rather than browsing structure.",
      inputSchema: {
        subdir: z.string().optional().describe("Vault-relative folder, e.g. 'projects'. Omit for the whole vault."),
        limit: z.number().int().min(1).max(2000).optional().describe("Max notes to return (default 200)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ subdir, limit }) => {
      try {
        const notes = await listNotes(subdir ?? "", limit ?? 200);
        return ok(renderNoteList(notes), { notes });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "brain_recent_notes",
    {
      title: "Recently modified notes",
      description:
        "List the most recently modified notes, newest first. Use this to find out what changed " +
        "in the vault lately.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional().describe("How many notes (default 25)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ limit }) => {
      try {
        const notes = await recentNotes(limit ?? 25);
        return ok(renderNoteList(notes), { notes });
      } catch (err) {
        return fail(err);
      }
    },
  );

  if (!config.allowWrite) {
    console.log("[tools] write tools disabled (set BRAIN_ALLOW_WRITE=true to enable)");
    return;
  }

  server.registerTool(
    "brain_append_note",
    {
      title: "Append to a note",
      description:
        "Append markdown to the end of a note, creating it if it does not exist. This is the " +
        "safe way to add to the brain — it never overwrites existing content. Prefer it over " +
        "brain_write_note unless you intend to replace a whole note.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path ending in .md"),
        content: z.string().min(1).describe("Markdown to append"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ path: relPath, content }) => {
      try {
        const meta = await appendNote(relPath, content);
        return ok(`Appended ${content.length} chars to ${meta.path} (now ${meta.bytes} bytes).`, { ...meta });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "brain_write_note",
    {
      title: "Write a note",
      description:
        "Create a note, or REPLACE the entire contents of an existing one. Destructive — the " +
        "previous content is lost. Read the note first, and prefer brain_append_note when adding.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path ending in .md"),
        content: z.string().describe("Full markdown content to write"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ path: relPath, content }) => {
      try {
        const meta = await writeNote(relPath, content);
        return ok(`Wrote ${meta.path} (${meta.bytes} bytes).`, { ...meta });
      } catch (err) {
        return fail(err);
      }
    },
  );
}
