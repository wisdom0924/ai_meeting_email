import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 유료/민감 API(Gemini, AssemblyAI 등)용: 로그인 세션(쿠키)이 있을 때만 통과.
 */
export async function requireAuthenticatedUserForApi(): Promise<
  { ok: true; token: string } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "이 기능을 쓰려면 로그인이 필요해요." },
        { status: 401 }
      ),
    };
  }

  return { ok: true, token };
}
