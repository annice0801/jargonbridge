import { requireUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { route } from "@/lib/http";
import { AUDIENCES, type AudienceId } from "@/lib/options";
import { buildSystem, describeStyle, translationSchema } from "@/lib/prompts";
import { objectIdString, styleSchema } from "@/lib/schemas";
import { loadSources } from "@/lib/tracks";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(8000),
  direction: z.enum(["to-professional", "to-plain"]),
  targetRole: z.string().trim().min(1).max(60),
  style: styleSchema,
  sourceIds: z.array(objectIdString).default([]),
  audience: z.enum(AUDIENCES.map((item) => item.id) as [AudienceId, ...AudienceId[]]).default("interview"),
});

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = bodySchema.parse(await request.json());
  const docs = await loadSources(user.id, body.sourceIds.map((id) => new ObjectId(id)));
  const audience = AUDIENCES.find((item) => item.id === body.audience)!;
  const direction = body.direction === "to-professional" ? "這段是口語，請翻成專業說法" : "這段是專業說法，請翻成白話";

  const translation = await generate({
    schema: translationSchema,
    system: buildSystem("translate", docs),
    messages: [
      {
        role: "user",
        content: `目標職位：${body.targetRole}\n溝通對象：${audience.label}。${audience.guide}\n${describeStyle(body.style)}\n${direction}。\n\n<learner_text>\n${body.text}\n</learner_text>`,
      },
    ],
  });
  return Response.json({ translation });
});
