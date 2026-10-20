import type { BookResult, SearchResponse } from "./types";

// Alma SRU endpoint: https://<host>/view/sru/<INSTITUTION_CODE>
const ALMA_SRU_URL = "https://gegnir.alma.exlibrisgroup.com/view/sru/354ILC_ALM";

const SEARCH_INDEXES: Record<string, string> = {
  any: "alma.all_for_ui",
  title: "alma.title",
  author: "alma.creator",
  subject: "alma.subjects",
  isbn: "alma.isbn",
};

const MAX_RECORDS = 20;

export async function search(q: string, indexName = "any"): Promise<SearchResponse> {
  q = q.trim();
  if (!q) throw new Error("Enter a search term");

  const index = SEARCH_INDEXES[indexName];
  if (!index) throw new Error("Unknown search index");

  const sru = new URL(ALMA_SRU_URL);
  sru.search = new URLSearchParams({
    version: "1.2",
    operation: "searchRetrieve",
    recordSchema: "dc",
    maximumRecords: String(MAX_RECORDS),
    query: `${index}="${q.replaceAll('"', " ")}"`,
  }).toString();

  const upstream = await fetch(sru);
  if (!upstream.ok) throw new Error(`Alma returned ${upstream.status}`);

  return parseSru(await upstream.text());
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
