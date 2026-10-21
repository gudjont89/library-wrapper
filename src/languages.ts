// MARC language codes (https://www.loc.gov/marc/languages/) with a display name and,
// where the language has an obvious home country, that country's ISO code for a flag.
const LANGUAGES: Record<string, { name: string; country?: string }> = {
  ice: { name: "Icelandic", country: "IS" },
  eng: { name: "English", country: "GB" },
  dan: { name: "Danish", country: "DK" },
  nor: { name: "Norwegian", country: "NO" },
  nob: { name: "Norwegian Bokmål", country: "NO" },
  nno: { name: "Norwegian Nynorsk", country: "NO" },
  swe: { name: "Swedish", country: "SE" },
  fin: { name: "Finnish", country: "FI" },
  fao: { name: "Faroese", country: "FO" },
  ger: { name: "German", country: "DE" },
  fre: { name: "French", country: "FR" },
  spa: { name: "Spanish", country: "ES" },
  ita: { name: "Italian", country: "IT" },
  por: { name: "Portuguese", country: "PT" },
  dut: { name: "Dutch", country: "NL" },
  pol: { name: "Polish", country: "PL" },
  cze: { name: "Czech", country: "CZ" },
  slo: { name: "Slovak", country: "SK" },
  hun: { name: "Hungarian", country: "HU" },
  rus: { name: "Russian", country: "RU" },
  ukr: { name: "Ukrainian", country: "UA" },
  est: { name: "Estonian", country: "EE" },
  lav: { name: "Latvian", country: "LV" },
  lit: { name: "Lithuanian", country: "LT" },
  gre: { name: "Greek", country: "GR" },
  tur: { name: "Turkish", country: "TR" },
  heb: { name: "Hebrew", country: "IL" },
  vie: { name: "Vietnamese", country: "VN" },
  tha: { name: "Thai", country: "TH" },
  chi: { name: "Chinese", country: "CN" },
  jpn: { name: "Japanese", country: "JP" },
  kor: { name: "Korean", country: "KR" },
  ara: { name: "Arabic", country: "EG" },
  lat: { name: "Latin" },
  epo: { name: "Esperanto" },
};

// A flag emoji, or the upper-cased code for languages without one (e.g. "ARA").
export function languageMark(code: string): { mark: string; name: string; isFlag: boolean } {
  const language = LANGUAGES[code];
  const country = language?.country;
  const mark = country
    ? String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : code.toUpperCase();
  return { mark, name: language?.name ?? code, isFlag: Boolean(country) };
}
