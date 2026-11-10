import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({
    user: { email: user.email, name: user.name, picture: user.picture, isOwner: user.isOwner },
  });
});
