import { deleteSession } from "@/lib/auth";
import { route } from "@/lib/http";

export const POST = route(async () => {
  await deleteSession();
  return Response.json({ ok: true });
});
