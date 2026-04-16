import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { isUndefinedColumnError } from "@/lib/supabase-postgres-errors";
import { isValidClientKeyForApi } from "@/lib/client-key-validation";
import { MAX_AUDIO_UPLOAD_BYTES } from "@/lib/audio-upload-limits";

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

function parseRecordedAt(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
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

    const buildListQuery = (select: string) => {
      let q = supabase
        .from("meeting_recordings")
        .select(select)
        .order("created_at", { ascending: false })
        .limit(50);
      if (user) {
        q = q.eq("user_id", user.id);
      } else {
        if (!clientKey || clientKey.length < 8 || !isValidClientKeyForApi(clientKey)) {
          return null;
        }
        q = q.eq("client_key", clientKey).is("user_id", null);
      }
      return q;
    };

    const q1 = buildListQuery(
      "id, created_at, recorded_at, original_filename, mime_type, storage_path, ai_processed_at"
    );
    if (!q1) {
      return NextResponse.json(
        { error: "유효한 client_key가 필요합니다." },
        { status: 400 }
      );
    }

    const first = await q1;
    let rows: unknown[] | null = (first.data as unknown[] | null) ?? null;
    let listError = first.error;

    if (listError && isUndefinedColumnError(listError)) {
      // recorded_at 컬럼만 없는 DB라면 ai_processed_at 은 그대로 읽어 버튼 활성화를 유지한다.
      const q2 = buildListQuery(
        "id, created_at, original_filename, mime_type, storage_path, ai_processed_at"
      );
      if (!q2) {
        return NextResponse.json({ error: "client_key가 필요합니다." }, { status: 400 });
      }
      const second = await q2;
      listError = second.error;
      if (!listError && Array.isArray(second.data)) {
        rows = second.data.map((row) => ({
          ...(row as unknown as Record<string, unknown>),
          recorded_at:
            (row as unknown as Record<string, unknown>).created_at ?? null,
        }));
      } else {
        rows = (second.data as unknown[] | null) ?? null;
      }
    }

    if (listError && isUndefinedColumnError(listError)) {
      // ai 캐시 컬럼도 없는 구 스키마면 버튼은 비활성(기존 동작 유지).
      const q3 = buildListQuery(
        "id, created_at, original_filename, mime_type, storage_path"
      );
      if (!q3) {
        return NextResponse.json({ error: "client_key가 필요합니다." }, { status: 400 });
      }
      const third = await q3;
      listError = third.error;
      if (!listError && Array.isArray(third.data)) {
        rows = third.data.map((row) => ({
          ...(row as unknown as Record<string, unknown>),
          recorded_at:
            (row as unknown as Record<string, unknown>).created_at ?? null,
          ai_processed_at: null,
        }));
      } else {
        rows = (third.data as unknown[] | null) ?? null;
      }
    }

    if (listError) {
      console.error("recordings list:", listError);
      return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ recordings: rows ?? [] });
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
    const recordedAt = parseRecordedAt(formData.get("recorded_at"));

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json({ error: "파일이 허용 크기를 초과했습니다." }, { status: 400 });
    }
    if (!clientKey || clientKey.length < 8 || !isValidClientKeyForApi(clientKey)) {
      return NextResponse.json(
        { error: "유효한 client_key가 필요합니다." },
        { status: 400 }
      );
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

    const insertBase = {
      storage_path: storagePath,
      original_filename: originalFilename || `recording.${ext}`,
      mime_type: mimeType,
      client_key: clientKey,
      user_id: user?.id ?? null,
    };

    const selectFull =
      "id, created_at, recorded_at, original_filename, mime_type, storage_path";
    const selectLegacy =
      "id, created_at, original_filename, mime_type, storage_path";

    type RecordingRowOut = {
      id: string;
      created_at: string;
      recorded_at: string | null;
      original_filename: string;
      mime_type: string;
      storage_path: string;
    };

    let insertPayload: Record<string, unknown> = recordedAt
      ? { ...insertBase, recorded_at: recordedAt }
      : insertBase;

    const firstInsert = await supabase
      .from("meeting_recordings")
      .insert(insertPayload)
      .select(selectFull)
      .single();

    let insertError = firstInsert.error;
    let row: RecordingRowOut | null = null;

    if (!insertError && firstInsert.data) {
      const d = firstInsert.data;
      row = {
        ...d,
        recorded_at: d.recorded_at ?? d.created_at ?? null,
      };
    } else if (insertError && isUndefinedColumnError(insertError)) {
      const secondInsert = await supabase
        .from("meeting_recordings")
        .insert(insertBase)
        .select(selectLegacy)
        .single();
      insertError = secondInsert.error;
      if (!insertError && secondInsert.data) {
        const d = secondInsert.data;
        row = {
          ...d,
          recorded_at: d.created_at ?? null,
        };
      }
    }

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
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
