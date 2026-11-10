import { requireUser } from "@/lib/auth";
import { sources } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";

export const DELETE = route(async (_request: Request, context: RouteContext<"/api/sources/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await sources();
  const { deletedCount } = await collection.deleteOne({ _id: parseObjectId(id), userId: user.id });
  if (!deletedCount) throw new HttpError(404, "找不到這筆資料");
  return Response.json({ ok: true });
});
