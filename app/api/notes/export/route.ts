import { requireUser } from "@/lib/auth";
import { notes } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { markdownDownload, noteToMarkdown, notesToMarkdown, pdfDownload } from "@/lib/markdown";
import { toNote } from "@/lib/notes";
import { notesToPdf } from "@/lib/pdf";

// ?id=... 下載單篇，不帶 id 下載全部；?format=pdf 下載 PDF，其他為 Markdown。
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const isPdf = params.get("format") === "pdf";
  const collection = await notes();

  if (id) {
    const doc = await collection.findOne({ _id: parseObjectId(id), userId: user.id });
    if (!doc) throw new HttpError(404, "找不到這篇筆記");
    const note = toNote(doc);
    return isPdf ? pdfDownload(await notesToPdf([note], note.title), note.title) : markdownDownload(noteToMarkdown(note), note.title);
  }

  const docs = await collection.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
  const all = docs.map(toNote);
  const title = "JargonBridge 筆記";
  return isPdf ? pdfDownload(await notesToPdf(all, title), title) : markdownDownload(notesToMarkdown(all), title);
});
