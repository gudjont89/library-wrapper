import type { BookResult, Env, SearchResponse } from "./types";

const SEARCH_INDEXES: Record<string, string> = {
  any: "alma.all_for_ui",
  title: "alma.title",
  author: "alma.creator",
  subject: "alma.subjects",
  isbn: "alma.isbn",
};

const MAX_RECORDS = 20;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/search") {
      return handleSearch(url, env);
    }
    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;

async function handleSearch(url: URL, env: Env): Promise<Response> {
  const q = url.searchParams.get("q")?.trim();
  if (!q) return json({ error: "Missing query parameter 'q'" }, 400);

  const index = SEARCH_INDEXES[url.searchParams.get("index") ?? "any"];
  if (!index) return json({ error: "Unknown search index" }, 400);

  const sru = new URL(env.ALMA_SRU_URL);
  sru.search = new URLSearchParams({
    version: "1.2",
    operation: "searchRetrieve",
    recordSchema: "dc",
    maximumRecords: String(MAX_RECORDS),
    query: `${index}="${q.replaceAll('"', " ")}"`,
  }).toString();

  const upstream = await fetch(sru, {
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!upstream.ok) {
    return json({ error: `Alma returned ${upstream.status}` }, 502);
  }

  return json(parseSru(await upstream.text()));
}

function parseSru(xml: string): SearchResponse {
  const total = Number(firstTag(xml, "numberOfRecords") ?? 0);
  const records = xml.match(/<record>[\s\S]*?<\/record>/g) ?? [];
  return { total, results: records.map(parseRecord) };
}

function parseRecord(record: string): BookResult {
  return {
    mmsId: firstTag(record, "recordIdentifier"),
    title: firstTag(record, "dc:title") ?? "(untitled)",
    creators: [...allTags(record, "dc:creator"), ...allTags(record, "dc:contributor")],
    publisher: firstTag(record, "dc:publisher"),
    date: firstTag(record, "dc:date"),
    identifiers: allTags(record, "dc:identifier"),
  };
}

function allTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => decodeXml(m[1]!.trim()));
}

function firstTag(xml: string, tag: string): string | null {
  return allTags(xml, tag)[0] ?? null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
