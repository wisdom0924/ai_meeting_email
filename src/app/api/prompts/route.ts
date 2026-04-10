import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import type { PromptRow } from "@/lib/prompt-row";
import { isValidClientKeyForApi } from "@/lib/client-key-validation";

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase가 설정되지 않았습니다.", prompts: [] as PromptRow[] },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientKey = searchParams.get("client_key")?.trim();

    if (!clientKey || clientKey.length < 8 || !isValidClientKeyForApi(clientKey)) {
      return NextResponse.json({ error: "유효한 client_key가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("prompts")
      .select(
        "id, created_at, updated_at, name, summary_prompt, details_prompt, client_key, source"
      )
      .or(`client_key.is.null,client_key.eq.${clientKey}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("prompts list:", error);
      return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ prompts: (data ?? []) as PromptRow[] });
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

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const summary_prompt =
      typeof body.summary_prompt === "string" ? body.summary_prompt : "";
    const details_prompt =
      typeof body.details_prompt === "string" ? body.details_prompt : "";
    const rawKey =
      typeof body.client_key === "string" ? body.client_key.trim() : "";
    const clientKey =
      rawKey.length >= 8 && isValidClientKeyForApi(rawKey) ? rawKey : null;
    const sourceRaw = typeof body.source === "string" ? body.source : "user";
    const source =
      sourceRaw === "recording_end" || sourceRaw === "seed" || sourceRaw === "user"
        ? sourceRaw
        : "user";

    if (!name) {
      return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
    }

    if (source === "seed") {
      return NextResponse.json({ error: "seed는 API로 만들 수 없습니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("prompts")
      .insert({
        name,
        summary_prompt,
        details_prompt,
        client_key: clientKey,
        source: source === "recording_end" ? "recording_end" : "user",
      })
      .select(
        "id, created_at, updated_at, name, summary_prompt, details_prompt, client_key, source"
      )
      .single();

    if (error) {
      console.error("prompts insert:", error);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ prompt: data as PromptRow });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
