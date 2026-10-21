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
  // MARC language code from 008/35-37, e.g. "ice", "eng".
  language: string | null;
  // MARC leader/07: m = standalone book, a = part of a book, b = journal article, s = serial.
  bibLevel: string;
  holdings: Holding[];
  // Available electronically (Alma AVE field), e.g. eBooks on Rafbókasafnið.
  online: boolean;
}

export interface Holding {
  library: string;
  location: string;
  callNumber: string;
  copies: number;
  onLoan: number;
}

export interface Work {
  title: string;
  author: string | null;
  // Most copies at MY_LIBRARIES first, then newest first.
  editions: BookResult[];
}

export interface SearchResponse {
  total: number;
  results: BookResult[];
}
