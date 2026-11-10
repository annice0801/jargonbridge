import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { CATEGORIES, type CategoryId } from "@/lib/options";
import { sources, type SourceDoc } from "@/lib/db";
import { fileToText, MAX_SOURCE_CHARS, urlToText } from "@/lib/extract";
import { HttpError, route } from "@/lib/http";
import type { SourceSummary } from "@/lib/types";

function toSummary(doc: Pick<SourceDoc, "_id" | "title" | "category" | "kind" | "origin" | "charCount" | "createdAt"> & { preview?: string }): SourceSummary {
  return {
    id: doc._id.toString(),
    title: doc.title,
    category: doc.category,
    kind: doc.kind,
    origin: doc.origin,
    charCount: doc.charCount,
    preview: doc.preview ?? "",
    createdAt: doc.createdAt.toISOString(),
  };
}

export const GET = route(async () => {
  const user = await requireUser();
  const collection = await sources();
  const docs = await collection
    .aggregate<SourceDoc & { preview: string }>([
      { $match: { userId: user.id } },
      { $sort: { createdAt: -1 } },
      { $addFields: { preview: { $substrCP: ["$content", 0, 140] } } },
      { $project: { content: 0 } },
    ])
    .toArray();
  return Response.json({ sources: docs.map(toSummary) });
});

const categorySchema = z.enum(CATEGORIES.map((item) => item.id) as [CategoryId, ...CategoryId[]]);

// 同一個 endpoint 接受三種輸入：url、file 或貼上的 text（multipart/form-data）。
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const form = await request.formData().catch(() => {
    throw new HttpError(400, "請用 form-data 上傳");
  });
  const category = categorySchema.parse(form.get("category"));
  const givenTitle = String(form.get("title") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const pasted = String(form.get("text") ?? "").trim();
  const file = form.get("file");

  let kind: SourceDoc["kind"];
  let title: string;
  let origin: string;
  let content: string;
  if (file instanceof File && file.size > 0) {
    kind = "file";
    title = givenTitle || file.name;
    origin = file.name;
    content = await fileToText(file);
  } else if (url) {
    const page = await urlToText(url);
    kind = "url";
    title = givenTitle || page.title;
    origin = page.origin;
    content = page.text;
  } else if (pasted) {
    kind = "text";
    title = givenTitle || pasted.slice(0, 20);
    origin = "貼上文字";
    content = pasted;
  } else {
    throw new HttpError(400, "請提供網址、檔案或文字");
  }

  if (content.length > MAX_SOURCE_CHARS) {
    throw new HttpError(413, `內容有 ${content.length.toLocaleString()} 字，超過單筆 ${MAX_SOURCE_CHARS.toLocaleString()} 字上限，請拆開上傳`);
  }

  const collection = await sources();
  const doc = { userId: user.id, title, category, kind, origin, content, charCount: content.length, createdAt: new Date() };
  const { insertedId } = await collection.insertOne(doc as SourceDoc);
  return Response.json(
    { source: toSummary({ ...doc, _id: insertedId, preview: content.slice(0, 140) }) },
    { status: 201 },
  );
});
