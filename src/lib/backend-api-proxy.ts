import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SERVER_API_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

/**
 * 브라우저 → Next.js → FastAPI 프록시.
 * 공유방처럼 브라우저가 백엔드를 직접 치면 CORS·HTTPS 인증서 문제로
 * "Failed to fetch"가 날 수 있어, 같은 사이트(/api/...)로 받게 합니다.
 */
export async function proxyBackendRequest(
  path: string,
  request: Request,
  init?: RequestInit
): Promise<NextResponse> {
  try {
    const headers = new Headers(init?.headers);
    const incomingAuth = request.headers.get("Authorization");
    if (incomingAuth) {
      headers.set("Authorization", incomingAuth);
    } else {
      const cookieStore = await cookies();
      const token = cookieStore.get("access_token")?.value;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    if (
      init?.body &&
      !headers.has("Content-Type") &&
      typeof init.body === "string"
    ) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${SERVER_API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    const contentType = res.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "백엔드 서버에 연결할 수 없습니다." },
      { status: 503 }
    );
  }
}
