import { z } from "zod";
import { generate } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { specs, type SpecDoc } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { buildSystem, specSchema } from "@/lib/prompts";
import { toSpecRecord } from "@/lib/specs";

export const GET = route(async () => {
  const user = await requireUser();
  const docs = await (await specs()).find({ userId: user.id }).sort({ createdAt: -1 }).limit(100).toArray();
  return Response.json({ specs: docs.map(toSpecRecord) });
});

const createSchema = z.object({
  input: z.string().trim().min(10, "請多貼一點客戶對話或需求內容").max(12000),
  audience: z.string().trim().max(60).default("工程團隊"),
});

// 一鍵把混亂的客戶對話轉成標準 PRD / Jira 規格書。
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  const input = body.input.replaceAll("</customer_input>", "<\\/customer_input>");
  const spec = await generate({
    schema: specSchema,
    system: buildSystem("spec", []),
    messages: [{ role: "user", content: `規格的讀者：${body.audience}\n請把下面的內容整理成標準 PRD / Jira 規格。\n<customer_input>\n${input}\n</customer_input>` }],
    maxTokens: 16000,
  });
  if (spec.userStories.length === 0) throw new HttpError(422, "這段內容整理不出需求，請補充客戶想要解決的問題");

  const doc: Omit<SpecDoc, "_id"> = { userId: user.id, title: spec.title, input: body.input, audience: body.audience, spec, createdAt: new Date() };
  const { insertedId } = await (await specs()).insertOne(doc as SpecDoc);
  return Response.json({ spec: toSpecRecord({ ...doc, _id: insertedId }) }, { status: 201 });
});
