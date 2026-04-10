import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseUrl } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

/**
 * 서버 전용 고권한 키 (Storage·DB 등).
 * - 권장: 대시보드 **Settings → API → Legacy API keys** 의 **service_role** (긴 문자열, 보통 `eyJ`로 시작)
 * - `sb_publishable_...` 는 넣으면 안 됨 (권한 부족·오류)
 * - `SUPABASE_SECRET_KEY`(sb_secret_...) 는 프로젝트에 따라 함께 지원
 */
function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""
  );
}

/** Storage·RLS 우회 등 서버 전용 작업용(service_role). 브라우저에 절대 노출하지 않습니다. */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = getPublicSupabaseUrl();
  const key = getServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_SECRET_KEY)가 없습니다."
    );
  }

  if (process.env.NODE_ENV === "development" && key.startsWith("sb_publishable_")) {
    console.warn(
      "[Supabase] SUPABASE_SERVICE_ROLE_KEY에 publishable 키가 들어 있는 것 같아요. Legacy의 service_role(eyJ…) 또는 secret(sb_secret_…)을 쓰세요."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getPublicSupabaseUrl() && getServiceRoleKey());
}
