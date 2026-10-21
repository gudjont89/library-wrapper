import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { search } from "./alma";
import type { BookResult, Work } from "./types";
import { languageMark } from "./languages";
import { copiesAtMyLibraries, MY_LIBRARIES } from "./libraries";
import { rankWorks } from "./works";

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const list = document.querySelector<HTMLUListElement>("#results")!;
const others = document.querySelector<HTMLDetailsElement>("#others")!;
const dialog = document.querySelector<HTMLDialogElement>("#edition-dialog")!;

// Windows browsers have no flag emoji; this loads a flag font where needed.
polyfillCountryFlagEmojis();

// Borgarbókasafnið's leitir.is view; append "alma<MMS ID>" to link to a record.
const LEITIR_PERMALINK = "https://borgarbokasafn.leitir.is/permalink/354ILC_ALM/l6asbj/alma";

// Editions shown before the rest are folded away.
const VISIBLE_EDITIONS = 3;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = new FormData(form);
  const q = String(fields.get("q") ?? "");

  status.textContent = "Searching…";
  list.replaceChildren();
  others.hidden = true;

  try {
    const data = await search(q);
    const ranked = rankWorks(data.results, q);

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
  meta.textContent = [
    work.author,
    plural(work.editions.length, "edition"),
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
  ]
    .filter(Boolean)
    .join(" · ");

  if (edition.language) {
    const { mark, name, isFlag } = languageMark(edition.language);
    const language = document.createElement("span");
    language.className = isFlag ? "language" : "language code";
    language.textContent = mark;
    // Shown by a CSS tooltip; the native title tooltip can't be styled.
    language.dataset.name = name;
    language.setAttribute("role", "img");
    language.setAttribute("aria-label", name);
    li.append(language, " ");
  }

  const { copies, available } = copiesAtMyLibraries(edition);
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
    for (const [i, h] of holdings.entries()) {
      const row = body.insertRow();
      // Name the library only on its first line.
      row.insertCell().textContent = i === 0 ? name : "";
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
