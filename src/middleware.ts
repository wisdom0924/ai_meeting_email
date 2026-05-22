import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 이전 백엔드 관련 미들웨어는 지우고, 그냥 통과시켜줍니다.
  // (임시로 클라이언트 측에서 localStorage로 로그인 상태를 확인할 거예요!)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
