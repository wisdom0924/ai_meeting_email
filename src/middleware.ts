import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";

/** 로그인 없이 접근 불가한 경로 */
function requiresAuth(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/board/write") return true;
  if (/^\/board\/\d+\/edit\/?$/.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // 이미 로그인한 사용자가 로그인 페이지 접근 → 메인으로
  if (pathname === LOGIN_PATH && token) {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  if (requiresAuth(pathname) && !token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/board/write", "/board/:path/edit"],
};
