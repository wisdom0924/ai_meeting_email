import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseUrl, getPublishableSupabaseKey } from "@/lib/supabase/env";

function copyCookiesToRedirect(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

/**
 * 요청마다 Supabase Auth 세션(토큰)을 갱신합니다.
 * Supabase URL/키가 있으면 로그인하지 않은 사용자는 /login 으로 보냅니다.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = getPublicSupabaseUrl();
  const key = getPublishableSupabaseKey();

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/auth/");

  if (!user && !isPublic && !isApi) {
    const next = request.nextUrl.clone();
    next.pathname = "/login";
    const redirectResponse = NextResponse.redirect(next);
    copyCookiesToRedirect(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const next = request.nextUrl.clone();
    next.pathname = "/";
    const redirectResponse = NextResponse.redirect(next);
    copyCookiesToRedirect(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}
