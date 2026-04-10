import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseUrl, getPublishableSupabaseKey } from "@/lib/supabase/env";

/**
 * 유료/민감 API(Gemini, AssemblyAI 등)용: 로그인 세션이 있을 때만 통과.
 * Supabase URL·브라우저 키가 없으면 인증 자체가 불가능하므로 503.
 */
export async function requireAuthenticatedUserForApi(): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
  if (!getPublicSupabaseUrl() || !getPublishableSupabaseKey()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "이 기능은 로그인과 Supabase 설정이 필요합니다. .env에 NEXT_PUBLIC_SUPABASE_URL과 키를 넣어 주세요.",
        },
        { status: 503 }
      ),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "로그인이 필요합니다. 상단에서 로그인한 뒤 다시 시도해 주세요.",
          },
          { status: 401 }
        ),
      };
    }
    return { ok: true, user };
  } catch (e) {
    console.error("requireAuthenticatedUserForApi:", e);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "인증을 확인하지 못했습니다." },
        { status: 500 }
      ),
    };
  }
}
