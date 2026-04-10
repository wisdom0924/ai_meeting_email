import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessMeetingRecording } from "@/lib/meeting-recording-access";
import { isUndefinedColumnError } from "@/lib/supabase-postgres-errors";
import type { TranscriptBlock } from "@/types";
import { isValidClientKeyForApi } from "@/lib/client-key-validation";

type RouteContext = { params: Promise<{ id: string }> };

function isTranscriptBlocks(v: unknown): v is TranscriptBlock[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as TranscriptBlock).id === "string" &&
      typeof (item as TranscriptBlock).text === "string" &&
      typeof (item as TranscriptBlock).time === "string"
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
    }

    const { id } = await context.params;
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

    const supabase = getSupabaseAdmin();
    let { data: row, error: fetchError } = await supabase
      .from("meeting_recordings")
      .select(
        "id, client_key, user_id, ai_processed_at, ai_transcript_blocks, ai_summary, ai_details"
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError && isUndefinedColumnError(fetchError)) {
      const minimal = await supabase
        .from("meeting_recordings")
        .select("id, client_key, user_id")
        .eq("id", id)
        .maybeSingle();
      if (minimal.error || !minimal.data) {
        return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
      }
      if (!canAccessMeetingRecording(minimal.data, user, clientKey)) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
      return NextResponse.json(
        { error: "저장된 분석 결과가 없습니다." },
        { status: 404 }
      );
    }

    if (fetchError || !row) {
      return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canAccessMeetingRecording(row, user, clientKey)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (!row.ai_processed_at || !isTranscriptBlocks(row.ai_transcript_blocks)) {
      return NextResponse.json(
        { error: "저장된 분석 결과가 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transcriptBlocks: row.ai_transcript_blocks,
      summary: row.ai_summary ?? "",
      details: row.ai_details ?? null,
      processedAt: row.ai_processed_at,
    });
  } catch (e) {
    console.error("recordings result GET:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const clientKey = typeof body.client_key === "string" ? body.client_key.trim() : "";
    const transcriptBlocks = body.transcriptBlocks;
    const summary = typeof body.summary === "string" ? body.summary : "";
    const details = body.details === undefined ? null : body.details;

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

    if (!isTranscriptBlocks(transcriptBlocks)) {
      return NextResponse.json({ error: "transcriptBlocks 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from("meeting_recordings")
      .select("id, client_key, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json({ error: "녹음을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canAccessMeetingRecording(row, user, clientKey)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const processedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("meeting_recordings")
      .update({
        ai_processed_at: processedAt,
        ai_transcript_blocks: transcriptBlocks,
        ai_summary: summary,
        ai_details: details,
      })
      .eq("id", id);

    if (updateError) {
      if (isUndefinedColumnError(updateError)) {
        return NextResponse.json({
          ok: true,
          processedAt: null,
          cacheSkipped: true,
        });
      }
      console.error("meeting_recordings ai cache update:", updateError);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, processedAt });
  } catch (e) {
    console.error("recordings result PATCH:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
