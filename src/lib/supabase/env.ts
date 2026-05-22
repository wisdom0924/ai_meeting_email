/**
 * Supabase 공개 URL + 브라우저에 노출 가능한 키( Publishable 또는 레거시 anon ).
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 * @see https://supabase.com/docs/guides/api/api-keys
 */
export function getPublicSupabaseUrl(): string {
  return "";
}

export function getPublishableSupabaseKey(): string {
  return "";
}

// 우리는 이제 Supabase를 쓰지 않고 FastAPI를 쓰기 때문에 무조건 false를 반환합니다.
export function isSupabaseBrowserConfigured(): boolean {
  return false;
}
