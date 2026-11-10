import { requireUser } from "@/lib/auth";
import { decks } from "@/lib/db";
import { toDeck } from "@/lib/decks";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { deckToMarkdown, markdownDownload, pdfDownload } from "@/lib/markdown";
import { deckToPdf } from "@/lib/pdf";

export const GET = route(async (request: Request, context: RouteContext<"/api/decks/[id]/export">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const isPdf = new URL(request.url).searchParams.get("format") === "pdf";
  const collection = await decks();
  const doc = await collection.findOne({ _id: parseObjectId(id), userId: user.id });
  if (!doc) throw new HttpError(404, "找不到這副知識卡");
  const deck = toDeck(doc);
  const filename = `${deck.title} 知識卡`;
  return isPdf ? pdfDownload(await deckToPdf(deck), filename) : markdownDownload(deckToMarkdown(deck), filename);
});
