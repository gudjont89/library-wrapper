import type { BookResult, Format, Holding, SearchResponse } from "./types";

// Alma SRU endpoint: https://<host>/view/sru/<INSTITUTION_CODE>
const ALMA_SRU_URL = "https://gegnir.alma.exlibrisgroup.com/view/sru/354ILC_ALM";

const SEARCH_INDEXES: Record<string, string> = {
  any: "alma.all_for_ui",
  title: "alma.title",
  author: "alma.creator",
  subject: "alma.subjects",
  isbn: "alma.isbn",
};

// SRU clauses on RDA content type (MARC 336) and media type (MARC 337).
const FORMAT_FILTERS: Record<Format, string> = {
  book: "alma.content_type_code=txt and alma.media_type_code=n and alma.bib_level=m",
  ebook: "alma.content_type_code=txt and alma.media_type_code=c",
  audiobook: "alma.content_type_code=spw",
  film: "alma.content_type_code=tdi",
  music: "alma.content_type_code=prm",
  score: "alma.content_type_code=ntm",
};

// The most Alma returns per request.
const MAX_RECORDS = 50;

export async function search(q: string, indexName = "any", format = "book"): Promise<SearchResponse> {
  q = q.trim();
  if (!q) throw new Error("Enter a search term");

  const index = SEARCH_INDEXES[indexName];
  if (!index) throw new Error("Unknown search index");

  const filter = FORMAT_FILTERS[format as Format];
  if (!filter) throw new Error("Unknown format");

  const sru = new URL(ALMA_SRU_URL);
  sru.search = new URLSearchParams({
    version: "1.2",
    operation: "searchRetrieve",
    recordSchema: "marcxml",
    maximumRecords: String(MAX_RECORDS),
    query: `${index}="${q.replaceAll('"', " ")}" and ${filter}`,
  }).toString();

  const upstream = await fetch(sru);
  if (!upstream.ok) throw new Error(`Alma returned ${upstream.status}`);

  return parseSru(await upstream.text());
}

function parseSru(xml: string): SearchResponse {
  const total = Number(xml.match(/<numberOfRecords>(\d+)</)?.[1] ?? 0);
  const records = xml.match(/<record xmlns="http:\/\/www\.loc\.gov\/MARC21\/slim">[\s\S]*?<\/record>/g) ?? [];
  return { total, results: records.map(parseRecord) };
}

function parseRecord(record: string): BookResult {
  const fields = dataFields(record);
  const field = (tag: string) => fields.filter((f) => f.tag === tag);
  const sub = (tag: string, code: string) => field(tag).flatMap((f) => f.subfields[code] ?? []);

  // Prefer the RDA publication statement (264 ind2=1), fall back to the older 260.
  const publication = field("264").find((f) => f.ind2 === "1") ?? field("260")[0];

  return {
    mmsId: controlField(record, "001"),
    title: tidy([...sub("245", "a"), ...sub("245", "b")].join(" ")) || "(untitled)",
    uniformTitle: tidy(sub("240", "a")[0] ?? sub("130", "a")[0] ?? "") || null,
    author: tidy(sub("100", "a")[0] ?? sub("110", "a")[0] ?? "") || null,
    contributors: [...field("700"), ...field("710")]
      .filter((f) => !f.subfields.e?.some((role) => role.startsWith("útgefandi")))
      .flatMap((f) => f.subfields.a ?? [])
      .map(tidy),
    publisher: publication?.subfields.b?.map(tidy).join("; ") || null,
    date: tidy(publication?.subfields.c?.[0] ?? "") || controlField(record, "008")?.slice(7, 11).trim() || null,
    identifiers: sub("020", "a"),
    format: detectFormat(sub("336", "b"), sub("337", "b")),
    bibLevel: record.match(/<leader>([^<]*)</)?.[1]?.[7] ?? "",
    libraries: [...new Set(sub("AVA", "b"))],
    holdings: field("AVA").map(parseHolding),
  };
}

// Alma's AVA field: one per library location holding physical copies.
function parseHolding(ava: DataField): Holding {
  const first = (code: string) => ava.subfields[code]?.[0] ?? "";
  return {
    library: first("b"),
    location: first("c"),
    callNumber: first("d"),
    copies: Number(first("f")) || 0,
    onLoan: Number(first("g")) || 0,
  };
}

function detectFormat(content: string[], media: string[]): Format | null {
  if (content.includes("spw")) return "audiobook";
  if (content.includes("tdi")) return "film";
  if (content.includes("prm")) return "music";
  if (content.includes("ntm")) return "score";
  if (content.includes("txt")) {
    if (media.includes("c")) return "ebook";
    if (media.includes("n")) return "book";
  }
  return null;
}

interface DataField {
  tag: string;
  ind2: string;
  subfields: Record<string, string[]>;
}

function dataFields(record: string): DataField[] {
  return [...record.matchAll(/<datafield([^>]*)>([\s\S]*?)<\/datafield>/g)].map((m) => {
    const subfields: Record<string, string[]> = {};
    for (const s of m[2]!.matchAll(/<subfield code="([^"]*)">([\s\S]*?)<\/subfield>/g)) {
      (subfields[s[1]!] ??= []).push(decodeXml(s[2]!.trim()));
    }
    return { tag: attr(m[1]!, "tag"), ind2: attr(m[1]!, "ind2"), subfields };
  });
}

function controlField(record: string, tag: string): string | null {
  const m = record.match(new RegExp(`<controlfield tag="${tag}">([\\s\\S]*?)</controlfield>`));
  return m ? decodeXml(m[1]!) : null;
}

function attr(attrs: string, name: string): string {
  return attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
}

// Strip trailing ISBD punctuation, e.g. "We have always lived in the castle /",
// and the brackets cataloguers put around supplied text, e.g. "[1963]".
function tidy(s: string): string {
  return s.replace(/[[\]]/g, "").replace(/\s*[/:;,.]\s*$/, "").trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
