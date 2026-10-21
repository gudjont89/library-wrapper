import { copiesAtMyLibraries } from "./libraries";
import type { BookResult, Work } from "./types";

export interface RankedResults {
  works: Work[];
  // Records that matched the search somewhere other than their title.
  others: BookResult[];
}

// Groups records into works and ranks works and editions by their copies at
// MY_LIBRARIES, then by newest edition.
// With `matchTitle`, only records whose title contains every search word count
// as main results; the rest go to `others`.
export function rankWorks(records: BookResult[], query: string, matchTitle: boolean): RankedResults {
  const words = normalize(query).split(" ").filter(Boolean);
  const titleMatches = (r: BookResult) => {
    const title = ` ${normalize(`${r.title} ${r.uniformTitle ?? ""}`)} `;
    return words.every((w) => title.includes(` ${w} `));
  };

  const groups = new Map<string, BookResult[]>();
  const others: BookResult[] = [];
  for (const record of mergeDuplicates(records)) {
    if (matchTitle && !titleMatches(record)) {
      others.push(record);
      continue;
    }
    const key = `${authorKey(record.author)}|${normalize(record.uniformTitle ?? record.title.split(":")[0]!)}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  // Map preserves insertion order and sort is stable, so ties keep Alma's order.
  const works = [...groups.values()].map((editions): Work => {
    editions.sort((a, b) => copies(b) - copies(a) || year(b.date) - year(a.date));
    // Name the work after its first edition whose own title matches the search.
    const named = editions.find((e) => !matchTitle || titleMatches({ ...e, uniformTitle: null })) ?? editions[0]!;
    return { title: named.title, author: named.author, editions };
  });
  const workCopies = (w: Work) => w.editions.reduce((n, e) => n + copies(e), 0);
  const newest = (w: Work) => Math.max(...w.editions.map((e) => year(e.date)));
  works.sort((a, b) => workCopies(b) - workCopies(a) || newest(b) - newest(a));

  return { works, others };
}

// The same edition is sometimes catalogued twice; records sharing an ISBN are merged.
function mergeDuplicates(records: BookResult[]): BookResult[] {
  const merged: BookResult[] = [];
  for (const record of records) {
    const twin = merged.find((m) => m.identifiers.some((id) => record.identifiers.includes(id)));
    if (twin) {
      twin.holdings = [...twin.holdings, ...record.holdings];
    } else {
      merged.push({ ...record });
    }
  }
  return merged;
}

function copies(edition: BookResult): number {
  return copiesAtMyLibraries(edition).copies;
}

// First four-digit year in a date like "1986-1987" or "okt. 1994"; undated sorts last.
function year(date: string | null): number {
  return Number(date?.match(/\d{4}/)?.[0] ?? 0);
}

// Word order is ignored so that "Laxness, Halldór" and "Halldór Laxness" match:
// Icelandic names are catalogued uninverted, foreign records often invert them.
function authorKey(author: string | null): string {
  return normalize(author ?? "").split(" ").sort().join(" ");
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
