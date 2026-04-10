/**
 * Supabase 공개 URL + 브라우저에 노출 가능한 키( Publishable 또는 레거시 anon ).
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 * @see https://supabase.com/docs/guides/api/api-keys
 */
export function getPublicSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getPublishableSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getPublicSupabaseUrl() && getPublishableSupabaseKey());
}
