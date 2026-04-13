import type { SupabaseClient } from "@supabase/supabase-js";

/** 중복 제거·소문자 정규화(저장용). */
export function normalizeEmailList(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const t = e.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * 전송에 사용한 받는 사람·참조 주소를 사용자별 즐겨찾기에 반영합니다.
 * 로그인하지 않았으면 아무 것도 하지 않습니다.
 */
export async function recordEmailsAsFavorites(
  supabase: SupabaseClient,
  emails: string[]
): Promise<void> {
  const normalized = normalizeEmailList(emails);
  if (normalized.length === 0) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date().toISOString();
  const rows = normalized.map((email) => ({
    user_id: user.id,
    email,
    last_used_at: now,
  }));

  const { error } = await supabase.from("user_email_favorites").upsert(rows, {
    onConflict: "user_id,email",
  });

  if (error) {
    console.error("recordEmailsAsFavorites", error);
  }
}
