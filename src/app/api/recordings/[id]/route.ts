import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessMeetingRecording } from "@/lib/meeting-recording-access";
import { isValidClientKeyForApi } from "@/lib/client-key-validation";

const BUCKET = "meeting-recordings";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/recordings/[id]?client_key=...
 * DB 행 삭제 후 Storage 오브젝트 제거(실패해도 목록에서는 사라짐).
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
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
    if (!user && clientKey && !isValidClientKeyForApi(clientKey)) {
      return NextResponse.json({ error: "client_key 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const { id } = await context.params;

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from("meeting_recordings")
      .select("id, storage_path, client_key, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canAccessMeetingRecording(row, user, clientKey)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const storagePath = row.storage_path;

    const { error: deleteError } = await supabase.from("meeting_recordings").delete().eq("id", id);

    if (deleteError) {
      console.error("meeting_recordings delete:", deleteError);
      return NextResponse.json({ error: "녹음을 삭제하지 못했습니다." }, { status: 500 });
    }

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (storageError) {
      console.warn("meeting-recordings storage remove:", storageError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
