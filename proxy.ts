import { NextResponse, type NextRequest } from "next/server";

// 練習室需要登入：沒有登入 Cookie 就先導到登入頁。Cookie 是否有效由 API 再檢查。
export function proxy(request: NextRequest) {
  if (request.cookies.has("jb_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/coach/:path*"],
};
