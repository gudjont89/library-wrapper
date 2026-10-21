import type { BookResult } from "./types";

// Libraries listed in an edition's popup, by Alma library code, in display order.
export const MY_LIBRARIES: Record<string, string> = {
  BBAAA: "Borgarbókasafnið Grófinni",
  BBFAA: "Borgarbókasafnið Spönginni",
  BBGAA: "Borgarbókasafnið Gerðubergi",
  BBKAA: "Borgarbókasafnið Kringlunni",
  BBLAA: "Borgarbókasafnið Klébergi",
  BBRAA: "Borgarbókasafnið Árbæ",
  BBSAA: "Borgarbókasafnið Sólheimum",
  BBUAA: "Borgarbókasafnið Úlfarsárdal",
  SELAA: "Bókasafn Seltjarnarness",
  MOSAA: "Bókasafn Mosfellsbæjar",
};

// Copies of an edition across MY_LIBRARIES, and how many of them are not on loan.
export function copiesAtMyLibraries(edition: BookResult): { copies: number; available: number } {
  const mine = edition.holdings.filter((h) => h.library in MY_LIBRARIES);
  return {
    copies: mine.reduce((n, h) => n + h.copies, 0),
    available: mine.reduce((n, h) => n + h.copies - h.onLoan, 0),
  };
}
