import { search } from "./alma";
import type { BookResult, Format } from "./types";

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const list = document.querySelector<HTMLUListElement>("#results")!;

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

  status.textContent = "Searching…";
  list.replaceChildren();

  try {
    const data = await search(
      String(fields.get("q") ?? ""),
      String(fields.get("index") ?? "any"),
      String(fields.get("format") ?? "book"),
    );
    status.textContent = `${data.total} result(s)`;
    list.append(...data.results.map(renderResult));
  } catch (err) {
    status.textContent = `Search failed: ${(err as Error).message}`;
  }
});

function renderResult(book: BookResult): HTMLLIElement {
  const li = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = book.title;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = [
    book.format ? FORMAT_LABELS[book.format] : "Other",
    book.creators.join("; "),
    book.publisher,
    book.date,
  ]
    .filter(Boolean)
    .join(" · ");

  li.append(title, meta);
  return li;
}
