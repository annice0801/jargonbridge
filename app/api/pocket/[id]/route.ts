import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { pockets } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { applyFeedback } from "@/lib/leitner";
import { toLeitner, toPocketCard } from "@/lib/pockets";
import { pocketInputSchema } from "@/lib/schemas";

const patchSchema = z.union([
  z.object({ feedback: z.enum(["review", "mastered"]) }),
  z.object({ card: pocketInputSchema }),
]);

export const PATCH = route(async (request: Request, context: RouteContext<"/api/pocket/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const _id = parseObjectId(id);
  const body = patchSchema.parse(await request.json());
  const collection = await pockets();

  let update;
  if ("feedback" in body) {
    const doc = await collection.findOne({ _id, userId: user.id });
    if (!doc) throw new HttpError(404, "找不到這張口袋卡");
    const next = applyFeedback(toLeitner(doc), body.feedback, new Date());
    update = { ...next, dueAt: new Date(next.dueAt) };
  } else {
    update = body.card;
  }

  const doc = await collection.findOneAndUpdate(
    { _id, userId: user.id },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) throw new HttpError(404, "找不到這張口袋卡");
  return Response.json({ card: toPocketCard(doc) });
});

export const DELETE = route(async (_request: Request, context: RouteContext<"/api/pocket/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const collection = await pockets();
  const { deletedCount } = await collection.deleteOne({ _id: parseObjectId(id), userId: user.id });
  if (!deletedCount) throw new HttpError(404, "找不到這張口袋卡");
  return Response.json({ ok: true });
});
