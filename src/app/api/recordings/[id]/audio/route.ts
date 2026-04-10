import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessMeetingRecording } from "@/lib/meeting-recording-access";

const BUCKET = "meeting-recordings";
/** 서명 URL 유효 시간(초) — 브라우저에서 재생하기에 충분히 길게 */
const SIGNED_URL_EXPIRES = 60 * 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/recordings/[id]/audio?client_key=...
 * 해당 녹음 파일의 임시 재생 URL(JSON)을 돌려줍니다. client_key가 행과 일치할 때만 허용합니다.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientKey = searchParams.get("client_key")?.trim() ?? "";

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user && (!clientKey || clientKey.length < 8)) {
      return NextResponse.json({ error: "client_key가 필요합니다." }, { status: 400 });
    }

    const { id } = await context.params;

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from("meeting_recordings")
      .select("id, storage_path, client_key, mime_type, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canAccessMeetingRecording(row, user, clientKey)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRES);

    if (signError || !signed?.signedUrl) {
      console.error("createSignedUrl:", signError);
      return NextResponse.json(
        { error: "재생 주소를 만들지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      mime_type: row.mime_type,
      expires_in: SIGNED_URL_EXPIRES,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
