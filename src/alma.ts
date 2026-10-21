import type { BookResult, Holding, SearchResponse } from "./types";

// Alma SRU endpoint: https://<host>/view/sru/<INSTITUTION_CODE>
const ALMA_SRU_URL = "https://gegnir.alma.exlibrisgroup.com/view/sru/354ILC_ALM";

// Printed standalone books only: RDA content type text (MARC 336), media type
// unmediated (MARC 337), and bibliographic level monograph (leader/07).
const BOOK_FILTER = "alma.content_type_code=txt and alma.media_type_code=n and alma.bib_level=m";

// The most Alma returns per request.
const MAX_RECORDS = 50;

export async function search(q: string): Promise<SearchResponse> {
  q = q.trim();
  if (!q) throw new Error("Enter a search term");

  const sru = new URL(ALMA_SRU_URL);
  sru.search = new URLSearchParams({
    version: "1.2",
    operation: "searchRetrieve",
    recordSchema: "marcxml",
    maximumRecords: String(MAX_RECORDS),
    query: `alma.all_for_ui="${q.replaceAll('"', " ")}" and ${BOOK_FILTER}`,
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
    language: controlField(record, "008")?.slice(35, 38).trim() || null,
    literaryForm: controlField(record, "008")?.[33] ?? "",
    bibLevel: record.match(/<leader>([^<]*)</)?.[1]?.[7] ?? "",
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
