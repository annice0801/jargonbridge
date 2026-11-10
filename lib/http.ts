import { ObjectId } from "mongodb";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function route<C>(handler: (request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Next.js 內部用例外傳遞訊號（例如動態路由判斷），不能當成錯誤吞掉。
      unstable_rethrow(error);
      if (error instanceof HttpError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return Response.json({ error: "輸入內容不正確", issues: error.issues }, { status: 400 });
      }
      if (error instanceof SyntaxError) {
        return Response.json({ error: "請求內容不是合法的 JSON" }, { status: 400 });
      }
      console.error(error);
      return Response.json({ error: "伺服器發生錯誤，請稍後再試" }, { status: 500 });
    }
  };
}

export function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new HttpError(404, "找不到這筆資料");
  return new ObjectId(id);
}
