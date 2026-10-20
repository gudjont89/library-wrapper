export interface BookResult {
  mmsId: string | null;
  title: string;
  creators: string[];
  publisher: string | null;
  date: string | null;
  identifiers: string[];
}

export interface SearchResponse {
  total: number;
  results: BookResult[];
}
