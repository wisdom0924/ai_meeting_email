import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "meeting-recordings";

/** 브라우저가 `audio/webm;codecs=opus` 처럼 보내면 Storage 허용 MIME과 불일치 → 업로드 실패할 수 있음 */
function normalizeAudioMimeType(raw: string): string {
  const base = raw.split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (base === "audio/x-m4a") return "audio/mp4";
  // 녹음·다운로드된 webm 이 오디오만 있어도 OS/브라우저가 video/webm 으로 주는 경우가 있음.
  // Supabase Storage 버킷은 보통 audio/webm 만 허용하고 video/webm 은 거절함.
  if (base === "video/webm") return "audio/webm";
  return base || "audio/webm";
}

function extFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("aac")) return "aac";
  return "webm";
}

/** 브라우저가 type을 비우거나 application/octet-stream 으로 보낼 때 파일명으로 추정 */
function guessMimeFromFilename(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
  };
  return map[ext] ?? null;
}

function resolveAudioMimeType(blob: Blob, originalFilename: string | undefined): string {
  const raw = blob.type?.split(";")[0]?.trim().toLowerCase() || "";
  if (raw && raw !== "application/octet-stream") {
    return normalizeAudioMimeType(raw);
  }
  const fromName = originalFilename ? guessMimeFromFilename(originalFilename) : null;
  return normalizeAudioMimeType(fromName || "audio/webm");
}

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase가 설정되지 않았습니다.", recordings: [] },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientKey = searchParams.get("client_key")?.trim() ?? "";

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("meeting_recordings")
      .select("id, created_at, original_filename, mime_type, storage_path")
      .order("created_at", { ascending: false })
      .limit(50);

    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      if (!clientKey || clientKey.length < 8) {
        return NextResponse.json({ error: "client_key가 필요합니다." }, { status: 400 });
      }
      query = query.eq("client_key", clientKey).is("user_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("recordings list:", error);
      return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ recordings: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;
    const clientKey = (formData.get("client_key") as string | null)?.trim();
    const originalFilename = (formData.get("original_filename") as string | null)?.trim();

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
    }
    if (!clientKey || clientKey.length < 8) {
      return NextResponse.json({ error: "client_key가 필요합니다." }, { status: 400 });
    }

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (user && clientKey !== user.id) {
      return NextResponse.json(
        { error: "로그인한 계정과 client_key가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    const mimeType = resolveAudioMimeType(audio, originalFilename);
    const ext = extFromMime(mimeType);
    const id = crypto.randomUUID();
    const storagePath = `${clientKey}/${id}.${ext}`;

    const buffer = Buffer.from(await audio.arrayBuffer());
    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("storage upload:", uploadError);
      return NextResponse.json(
        {
          error: "파일 업로드에 실패했습니다.",
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data: row, error: insertError } = await supabase
      .from("meeting_recordings")
      .insert({
        storage_path: storagePath,
        original_filename: originalFilename || `recording.${ext}`,
        mime_type: mimeType,
        client_key: clientKey,
        user_id: user?.id ?? null,
      })
      .select("id, created_at, original_filename, mime_type, storage_path")
      .single();

    if (insertError) {
      console.error("meeting_recordings insert:", insertError);
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json(
        {
          error: "기록 저장에 실패했습니다.",
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ recording: row });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "서버 오류", details: message }, { status: 500 });
  }
}
