export interface BookResult {
  mmsId: string | null;
  title: string;
  uniformTitle: string | null;
  author: string | null;
  contributors: string[];
  publisher: string | null;
  date: string | null;
  identifiers: string[];
  // Page count and height in cm parsed from MARC 300; null when absent or unparseable.
  pages: number | null;
  heightCm: number | null;
  // MARC language code from 008/35-37, e.g. "ice", "eng".
  language: string | null;
  // MARC 008/33 for books: d = drama, f = novel, j = short stories, 0 = non-fiction, | = not coded.
  literaryForm: string;
  // MARC leader/07: m = standalone book, a = part of a book, b = journal article, s = serial.
  bibLevel: string;
  holdings: Holding[];
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
