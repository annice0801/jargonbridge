import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { pocketLogs, pockets } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { toPocketCard, toSrs } from "@/lib/pockets";
import { pocketInputSchema } from "@/lib/schemas";
import { schedule } from "@/lib/srs";

const patchSchema = z.union([
  // day 是使用者當地日期，用來記每日打卡。
  z.object({ grade: z.enum(["again", "good", "easy"]), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ card: pocketInputSchema }),
]);

export const PATCH = route(async (request: Request, context: RouteContext<"/api/pocket/[id]">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const _id = parseObjectId(id);
  const body = patchSchema.parse(await request.json());
  const collection = await pockets();

  let update;
  if ("grade" in body) {
    const doc = await collection.findOne({ _id, userId: user.id });
    if (!doc) throw new HttpError(404, "找不到這張口袋卡");
    const next = schedule(toSrs(doc), body.grade, new Date());
    update = { ...next, dueAt: new Date(next.dueAt) };
    await (await pocketLogs()).updateOne({ userId: user.id, day: body.day }, { $inc: { reviews: 1 } }, { upsert: true });
  } else {
    update = body.card;
  }

  const doc = await collection.findOneAndUpdate(
    { _id, userId: user.id },
    { $set: { ...update, updatedAt: new Date() }, $unset: { box: "", mastered: "" } },
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
