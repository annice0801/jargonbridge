import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { notes } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { toNote } from "@/lib/notes";

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    note: z.string().max(20000),
  })
  .partial();

export const PATCH = route(async (request: Request, context: RouteContext<"/api/notes/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const body = patchSchema.parse(await request.json());
  const collection = await notes();
  const doc = await collection.findOneAndUpdate(
    { _id: parseObjectId(id), userId: user.id },
    { $set: { ...body, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) throw new HttpError(404, "找不到這篇筆記");
  return Response.json({ note: toNote(doc) });
});

export const DELETE = route(async (_request: Request, context: RouteContext<"/api/notes/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await notes();
  const { deletedCount } = await collection.deleteOne({ _id: parseObjectId(id), userId: user.id });
  if (!deletedCount) throw new HttpError(404, "找不到這篇筆記");
  return Response.json({ ok: true });
});
