import { requireUser } from "@/lib/auth";
import { tracks } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { toTrack } from "@/lib/tracks";

export const GET = route(async (_request: Request, context: RouteContext<"/api/tracks/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await tracks();
  const doc = await collection.findOne({ _id: parseObjectId(id), userId: user.id });
  if (!doc) throw new HttpError(404, "找不到這條學習路徑");
  return Response.json({ track: toTrack(doc) });
});

export const DELETE = route(async (_request: Request, context: RouteContext<"/api/tracks/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await tracks();
  const { deletedCount } = await collection.deleteOne({ _id: parseObjectId(id), userId: user.id });
  if (!deletedCount) throw new HttpError(404, "找不到這條學習路徑");
  return Response.json({ ok: true });
});
