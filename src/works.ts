import { copiesAtMyLibraries } from "./libraries";
import type { BookResult, Work } from "./types";

export interface RankedResults {
  works: Work[];
  // Records that matched the search somewhere other than their title.
  others: BookResult[];
}

// Groups records into works and ranks them by how many libraries hold them.
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
    // Name the work after the best-held edition whose own title matches the search.
    const byHoldings = [...editions].sort((a, b) => b.libraries.length - a.libraries.length);
    const named = byHoldings.find((e) => !matchTitle || titleMatches({ ...e, uniformTitle: null })) ?? byHoldings[0]!;
    editions.sort(
      (a, b) => copiesAtMyLibraries(b).copies - copiesAtMyLibraries(a).copies || year(b.date) - year(a.date),
    );
    return {
      title: named.title,
      author: named.author,
      editions,
      libraryCount: new Set(editions.flatMap((e) => e.libraries)).size,
    };
  });
  works.sort((a, b) => b.libraryCount - a.libraryCount);

  return { works, others };
}

// The same edition is sometimes catalogued twice; records sharing an ISBN are merged.
function mergeDuplicates(records: BookResult[]): BookResult[] {
  const merged: BookResult[] = [];
  for (const record of records) {
    const twin = merged.find((m) => m.identifiers.some((id) => record.identifiers.includes(id)));
    if (twin) {
      twin.libraries = [...new Set([...twin.libraries, ...record.libraries])];
      twin.holdings = [...twin.holdings, ...record.holdings];
    } else {
      merged.push({ ...record });
    }
  }
  return merged;
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
