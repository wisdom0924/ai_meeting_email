import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseUrl, getPublishableSupabaseKey } from "@/lib/supabase/env";

/**
 * 클라이언트 컴포넌트 전용 Supabase 클라이언트(싱글톤 캐시).
 */
export function createClient() {
  const url = getPublicSupabaseUrl();
  const key = getPublishableSupabaseKey();

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY(또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)가 필요합니다."
    );
  }

  return createBrowserClient(url, key);
}
