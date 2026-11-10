import * as cheerio from "cheerio";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { HttpError } from "./http";
import { assertPublicUrl } from "./url-guard";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_SOURCE_CHARS = 200_000;
const MIN_URL_CHARS = 200;
const MAX_REDIRECTS = 5;

const normalize = (text: string) =>
  text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

async function pdfToText(buffer: Uint8Array): Promise<string> {
  const { text } = await extractText(await getDocumentProxy(buffer), { mergePages: true });
  return normalize(text);
}

export async function fileToText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new HttpError(413, "檔案不能超過 15 MB");
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  let text: string;
  if (name.endsWith(".pdf")) {
    text = await pdfToText(new Uint8Array(buffer));
  } else if (name.endsWith(".docx")) {
    text = normalize((await mammoth.extractRawText({ buffer })).value);
  } else if (/\.(txt|md|markdown|csv|json)$/.test(name)) {
    text = normalize(buffer.toString("utf8"));
  } else {
    throw new HttpError(415, "目前支援 PDF、DOCX、TXT、MD、CSV、JSON");
  }
  if (!text) throw new HttpError(422, "這個檔案讀不到文字，可能是掃描圖檔，請改貼文字");
  return text;
}

async function fetchPublic(raw: string): Promise<{ response: Response; url: URL }> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current).catch((error: Error) => {
      throw new HttpError(400, error.message);
    });
    // 轉址要一跳一跳檢查，否則公開網址可以轉去內網。
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "JargonBridge/1.0", accept: "text/html,application/pdf,text/plain;q=0.9,*/*;q=0.5" },
    }).catch(() => {
      throw new HttpError(502, "連不上這個網址");
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) throw new HttpError(502, `網址回應 ${response.status}，可能需要登入，請改貼文字`);
    return { response, url };
  }
  throw new HttpError(502, "網址轉址次數過多");
}

async function readCapped(response: Response): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    size += value.length;
    if (size > MAX_FILE_BYTES) {
      await reader.cancel();
      throw new HttpError(413, "網址內容超過 15 MB");
    }
    chunks.push(value);
  }
}

export async function urlToText(raw: string): Promise<{ title: string; text: string; origin: string }> {
  const { response, url } = await fetchPublic(raw);
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  const body = await readCapped(response);

  let title = decodeURIComponent(url.pathname.split("/").pop() ?? "") || url.hostname;
  let text: string;
  if (type.includes("pdf") || url.pathname.toLowerCase().endsWith(".pdf")) {
    text = await pdfToText(new Uint8Array(body));
  } else if (type.includes("html")) {
    const $ = cheerio.load(body.toString("utf8"));
    title = $("title").first().text().trim() || title;
    $("script,style,noscript,svg,nav,footer,header,aside,form,iframe").remove();
    const main = $("main,article").first();
    text = normalize((main.length ? main : $("body")).text());
  } else if (type.startsWith("text/") || type.includes("json")) {
    text = normalize(body.toString("utf8"));
  } else {
    throw new HttpError(415, `不支援這種網址內容（${type || "未知格式"}）`);
  }
  if (text.length < MIN_URL_CHARS) {
    throw new HttpError(422, "這個網址抓不到足夠內容，可能需要登入或由 JavaScript 產生，請改貼文字");
  }
  return { title, text, origin: url.toString() };
}
