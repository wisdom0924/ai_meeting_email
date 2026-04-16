import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessMeetingRecording } from "@/lib/meeting-recording-access";
import { isUndefinedColumnError } from "@/lib/supabase-postgres-errors";
import type { TranscriptBlock } from "@/types";
import { isValidClientKeyForApi } from "@/lib/client-key-validation";
import { withDefaultMeetingDateTime } from "@/lib/meeting-details-defaults";

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

    const selectWithRecorded =
      "id, client_key, user_id, recorded_at, created_at, ai_processed_at, ai_transcript_blocks, ai_summary, ai_details";
    const selectWithoutRecorded =
      "id, client_key, user_id, created_at, ai_processed_at, ai_transcript_blocks, ai_summary, ai_details";

    let { data: row, error: fetchError } = await supabase
      .from("meeting_recordings")
      .select(selectWithRecorded)
      .eq("id", id)
      .maybeSingle();

    // recorded_at 마이그레이션 전 DB: /api/recordings GET 과 동일하게 한 단계 줄여서 다시 읽는다.
    if (fetchError && isUndefinedColumnError(fetchError)) {
      const retry = await supabase
        .from("meeting_recordings")
        .select(selectWithoutRecorded)
        .eq("id", id)
        .maybeSingle();
      if (!retry.error && retry.data) {
        row = {
          ...(retry.data as Record<string, unknown>),
          recorded_at: null,
        } as typeof row;
        fetchError = null;
      } else {
        fetchError = retry.error;
      }
    }

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

    const anchorIso =
      row.recorded_at && String(row.recorded_at).trim()
        ? row.recorded_at
        : row.created_at;
    const transcriptBlocks = row.ai_transcript_blocks;
    const detailsRaw = row.ai_details ?? null;
    const detailsOut =
      detailsRaw && typeof detailsRaw === "object"
        ? withDefaultMeetingDateTime(detailsRaw, anchorIso)
        : detailsRaw;

    return NextResponse.json({
      transcriptBlocks,
      summary: row.ai_summary ?? "",
      details: detailsOut,
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
