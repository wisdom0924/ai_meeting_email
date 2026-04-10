import { NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/assemblyai-transcribe";
import { analyzeMeetingContent } from "@/lib/gemini-analyze";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessMeetingRecording } from "@/lib/meeting-recording-access";
import { buildTranscriptBlocksFromText } from "@/lib/transcript-blocks";
import { withDefaultMeetingDateTime } from "@/lib/meeting-details-defaults";
import { isUndefinedColumnError } from "@/lib/supabase-postgres-errors";

const BUCKET = "meeting-recordings";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const clientKey = typeof body.client_key === "string" ? body.client_key.trim() : "";
    const memos = typeof body.memos === "string" ? body.memos : "";
    const summaryPrompt =
      typeof body.summaryPrompt === "string" ? body.summaryPrompt : null;
    const detailsPrompt =
      typeof body.detailsPrompt === "string" ? body.detailsPrompt : null;

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user && (!clientKey || clientKey.length < 8)) {
      return NextResponse.json({ error: "client_key가 필요합니다." }, { status: 400 });
    }

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

    const { data: file, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(row.storage_path);

    if (dlError || !file) {
      console.error("storage download:", dlError);
      return NextResponse.json({ error: "파일을 불러오지 못했습니다." }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { text } = await transcribeAudioBuffer(buffer);
    const transcriptBlocks = buildTranscriptBlocksFromText(text);

    const analyzed = await analyzeMeetingContent({
      text,
      memos: memos || null,
      summaryPrompt,
      detailsPrompt,
    });

    const rawDetails = analyzed.details ?? null;
    const detailsOut =
      rawDetails && typeof rawDetails === "object"
        ? withDefaultMeetingDateTime(rawDetails)
        : rawDetails;

    const processedAt = new Date().toISOString();
    const { error: cacheError } = await supabase
      .from("meeting_recordings")
      .update({
        ai_processed_at: processedAt,
        ai_transcript_blocks: transcriptBlocks,
        ai_summary: analyzed.summary ?? "",
        ai_details: detailsOut,
      })
      .eq("id", id);

    if (cacheError) {
      if (!isUndefinedColumnError(cacheError)) {
        console.error("meeting_recordings ai cache (process):", cacheError);
      }
    }

    return NextResponse.json({
      text,
      transcriptBlocks,
      summary: analyzed.summary ?? "",
      details: detailsOut,
    });
  } catch (error) {
    console.error("recordings process:", error);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}
