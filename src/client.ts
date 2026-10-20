import { search } from "./alma";
import type { BookResult, Format, Work } from "./types";
import { MY_LIBRARIES } from "./libraries";
import { rankWorks } from "./works";

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const list = document.querySelector<HTMLUListElement>("#results")!;
const others = document.querySelector<HTMLDetailsElement>("#others")!;
const dialog = document.querySelector<HTMLDialogElement>("#edition-dialog")!;

// Borgarbókasafnið's leitir.is view; append "alma<MMS ID>" to link to a record.
const LEITIR_PERMALINK = "https://borgarbokasafn.leitir.is/permalink/354ILC_ALM/l6asbj/alma";

// Editions shown before the rest are folded away.
const VISIBLE_EDITIONS = 3;

const FORMAT_LABELS: Record<Format, string> = {
  book: "Book",
  ebook: "eBook",
  audiobook: "Audiobook",
  film: "Film",
  music: "Music",
  score: "Score",
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = new FormData(form);
  const q = String(fields.get("q") ?? "");
  const index = String(fields.get("index") ?? "any");

  status.textContent = "Searching…";
  list.replaceChildren();
  others.hidden = true;

  try {
    const data = await search(q, index, String(fields.get("format") ?? "book"));
    const ranked = rankWorks(data.results, q, index === "any" || index === "title");

    const shown = data.results.length < data.total ? ` (showing the first ${data.results.length})` : "";
    status.textContent = `${data.total} record(s)${shown}, ${plural(ranked.works.length, "work")}`;
    list.append(...ranked.works.map(renderWork));

    const summary = document.createElement("summary");
    summary.textContent = `Also mentioned in (${ranked.others.length})`;
    const otherList = document.createElement("ul");
    otherList.append(...ranked.others.map(renderOther));
    others.replaceChildren(summary, otherList);
    others.hidden = ranked.others.length === 0;
  } catch (err) {
    status.textContent = `Search failed: ${(err as Error).message}`;
  }
});

function renderWork(work: Work): HTMLLIElement {
  const li = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = work.title;

  const meta = document.createElement("div");
  meta.className = "meta";
  const format = work.editions[0]!.format;
  meta.textContent = [
    format ? FORMAT_LABELS[format] : "Other",
    work.author,
    plural(work.editions.length, "edition"),
    work.libraryCount ? `held by ${plural(work.libraryCount, "library", "libraries")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const editions = document.createElement("ul");
  editions.className = "editions";
  editions.append(...work.editions.slice(0, VISIBLE_EDITIONS).map((e) => renderEdition(e, work)));
  li.append(title, meta, editions);

  const rest = work.editions.slice(VISIBLE_EDITIONS);
  if (rest.length) {
    const more = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = plural(rest.length, "more edition");
    const restList = document.createElement("ul");
    restList.className = "editions";
    restList.append(...rest.map((e) => renderEdition(e, work)));
    more.append(summary, restList);
    li.append(more);
  }
  return li;
}

function renderEdition(edition: BookResult, work: Work): HTMLLIElement {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "edition";
  button.addEventListener("click", () => showEdition(edition));
  button.textContent = [
    edition.date,
    edition.title !== work.title ? edition.title : null,
    edition.publisher,
    edition.contributors.join("; "),
    edition.libraries.length ? plural(edition.libraries.length, "library", "libraries") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const mine = edition.holdings.filter((h) => h.library in MY_LIBRARIES);
  const copies = mine.reduce((n, h) => n + h.copies, 0);
  const available = mine.reduce((n, h) => n + h.copies - h.onLoan, 0);
  li.append(button, ` (${available} of ${copies} available)`);
  return li;
}

function showEdition(edition: BookResult): void {
  const heading = document.createElement("h2");
  heading.textContent = edition.title;
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = [edition.author, edition.publisher, edition.date].filter(Boolean).join(" · ");
  const header = [heading, meta];
  if (edition.mmsId) {
    const link = document.createElement("a");
    link.href = `${LEITIR_PERMALINK}${edition.mmsId}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open in Borgarbókasafnið's catalogue";
    const linkLine = document.createElement("p");
    linkLine.append(link);
    header.push(linkLine);
  }

  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  for (const label of ["Library", "Location", "Call number", "Available"]) {
    head.append(Object.assign(document.createElement("th"), { textContent: label }));
  }
  const body = table.createTBody();
  for (const [code, name] of Object.entries(MY_LIBRARIES)) {
    const holdings = edition.holdings.filter((h) => h.library === code);
    if (!holdings.length) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      Object.assign(row.insertCell(), { colSpan: 3, textContent: "No copies" });
    }
    for (const h of holdings) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      row.insertCell().textContent = h.location;
      row.insertCell().textContent = h.callNumber;
      row.insertCell().textContent = `${h.copies - h.onLoan} of ${h.copies}`;
    }
  }

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.addEventListener("click", () => dialog.close());

  const scroller = document.createElement("div");
  scroller.className = "table-scroll";
  scroller.append(table);
  dialog.replaceChildren(...header, scroller, close);
  dialog.showModal();
}

function renderOther(record: BookResult): HTMLLIElement {
  const li = document.createElement("li");
  li.textContent = [record.title, record.author, record.date].filter(Boolean).join(" · ");
  return li;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
