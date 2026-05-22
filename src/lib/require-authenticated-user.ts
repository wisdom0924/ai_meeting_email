import { NextResponse } from "next/server";

/**
 * 유료/민감 API(Gemini, AssemblyAI 등)용: 로그인 세션이 있을 때만 통과.
 * 이제 Supabase를 쓰지 않으므로, 무조건 통과시키거나 localStorage 토큰 등을 검사해야 합니다.
 * (현재는 임시로 무조건 통과시키도록 수정)
 */
export async function requireAuthenticatedUserForApi(): Promise<
  { ok: true; user: any } | { ok: false; response: NextResponse }
> {
  // 임시로 무조건 통과 (나중에 FastAPI 토큰 검사로 바꿀 수 있음)
  return { ok: true, user: { id: "temp-user" } };
}
