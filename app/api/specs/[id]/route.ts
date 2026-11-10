import { requireUser } from "@/lib/auth";
import { specs } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";

export const DELETE = route(async (_request: Request, context: RouteContext<"/api/specs/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const { deletedCount } = await (await specs()).deleteOne({ _id: parseObjectId(id), userId: user.id });
  if (!deletedCount) throw new HttpError(404, "找不到這份規格");
  return Response.json({ ok: true });
});
