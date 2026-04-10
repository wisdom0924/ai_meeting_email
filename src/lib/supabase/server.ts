import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseUrl, getPublishableSupabaseKey } from "@/lib/supabase/env";

/**
 * 서버 컴포넌트 · 서버 액션 · Route Handler에서 사용하는 Supabase 클라이언트.
 * 쿠키 기반 세션을 읽고, 필요 시 setAll 시도(서버 컴포넌트에서는 실패할 수 있음 → 미들웨어가 갱신).
 */
export async function createClient() {
  const url = getPublicSupabaseUrl();
  const key = getPublishableSupabaseKey();

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY(또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)가 필요합니다."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component 등에서 setAll이 막힐 수 있음. 미들웨어에서 세션 갱신을 권장.
        }
      },
    },
  });
}
