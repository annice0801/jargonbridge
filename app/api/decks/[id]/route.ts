import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { decks } from "@/lib/db";
import { toDeck } from "@/lib/decks";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { objectIdString } from "@/lib/schemas";

export const GET = route(async (_request: Request, context: RouteContext<"/api/decks/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await decks();
  const doc = await collection.findOne({ _id: parseObjectId(id), userId: user.id });
  if (!doc) throw new HttpError(404, "找不到這副知識卡");
  return Response.json({ deck: toDeck(doc) });
});

// cardId 限定為 ObjectId 字串，才能安全地當成 progress 的欄位名稱。
const progressSchema = z.object({
  cardId: objectIdString,
  status: z.enum(["known", "learning", "new"]),
});

export const PATCH = route(async (request: Request, context: RouteContext<"/api/decks/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const { cardId, status } = progressSchema.parse(await request.json());
  const collection = await decks();
  const field = `progress.${cardId}`;
  const doc = await collection.findOneAndUpdate(
    { _id: parseObjectId(id), userId: user.id, "chapters.cards.id": cardId },
    status === "new"
      ? { $unset: { [field]: "" }, $set: { updatedAt: new Date() } }
      : { $set: { [field]: status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) throw new HttpError(404, "找不到這張卡片");
  return Response.json({ deck: toDeck(doc) });
});

export const DELETE = route(async (_request: Request, context: RouteContext<"/api/decks/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await decks();
  const { deletedCount } = await collection.deleteOne({ _id: parseObjectId(id), userId: user.id });
  if (!deletedCount) throw new HttpError(404, "找不到這副知識卡");
  return Response.json({ ok: true });
});
