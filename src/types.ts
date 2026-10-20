export type Format = "book" | "ebook" | "audiobook" | "film" | "music" | "score";

export interface BookResult {
  mmsId: string | null;
  title: string;
  creators: string[];
  publisher: string | null;
  date: string | null;
  identifiers: string[];
  format: Format | null;
}

export interface SearchResponse {
  total: number;
  results: BookResult[];
}
