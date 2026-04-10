import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPublicSupabaseUrl, getPublishableSupabaseKey } from "@/lib/supabase/env";

/** `next=//evil.com` 같은 오픈 리다이렉트를 막고, 같은 사이트 안의 경로만 허용 */
function safeRedirectUrl(request: Request, nextRaw: string | null): URL {
  const base = new URL(request.url);
  const fallback = new URL("/", base);
  if (!nextRaw || !nextRaw.startsWith("/") || nextRaw.startsWith("//")) {
    return fallback;
  }
  try {
    const resolved = new URL(nextRaw, base);
    if (resolved.origin !== base.origin) return fallback;
    return resolved;
  } catch {
    return fallback;
  }
}

/**
 * 이메일 확인·OAuth 등 PKCE code 를 세션으로 바꿉니다.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");

  const url = getPublicSupabaseUrl();
  const key = getPublishableSupabaseKey();

  if (!url || !key) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
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
          // Route Handler 외부에서는 set 이 막힐 수 있음
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(safeRedirectUrl(request, nextRaw));
}
