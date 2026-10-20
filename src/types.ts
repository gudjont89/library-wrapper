export type Format = "book" | "ebook" | "audiobook" | "film" | "music" | "score";

export interface BookResult {
  mmsId: string | null;
  title: string;
  uniformTitle: string | null;
  author: string | null;
  contributors: string[];
  publisher: string | null;
  date: string | null;
  identifiers: string[];
  format: Format | null;
  // MARC leader/07: m = standalone book, a = part of a book, b = journal article, s = serial.
  bibLevel: string;
  // Codes of libraries holding a physical copy.
  libraries: string[];
}

export interface Work {
  title: string;
  author: string | null;
  // Most-held edition first.
  editions: BookResult[];
  libraryCount: number;
}

export interface SearchResponse {
  total: number;
  results: BookResult[];
}
