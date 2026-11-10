import { requireUser } from "@/lib/auth";
import { tracks } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { markdownDownload, pdfDownload, trackToMarkdown } from "@/lib/markdown";
import { trackToPdf } from "@/lib/pdf";
import { toTrack } from "@/lib/tracks";

export const GET = route(async (request: Request, context: RouteContext<"/api/tracks/[id]/export">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const isPdf = new URL(request.url).searchParams.get("format") === "pdf";
  const collection = await tracks();
  const doc = await collection.findOne({ _id: parseObjectId(id), userId: user.id });
  if (!doc) throw new HttpError(404, "找不到這條學習路徑");
  const track = toTrack(doc);
  const filename = `${doc.title} 學習紀錄`;
  return isPdf ? pdfDownload(await trackToPdf(track), filename) : markdownDownload(trackToMarkdown(track), filename);
});
