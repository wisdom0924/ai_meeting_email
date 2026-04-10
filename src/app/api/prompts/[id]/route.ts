import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import type { PromptRow } from "@/lib/prompt-row";
import { isValidClientKeyForApi } from "@/lib/client-key-validation";

type RouteContext = { params: Promise<{ id: string }> };

function canAccessRow(
  row: { client_key: string | null },
  clientKey: string | null
): boolean {
  if (row.client_key == null) return true;
  return clientKey != null && row.client_key === clientKey;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const clientKeyRaw = searchParams.get("client_key")?.trim() ?? "";
    if (
      clientKeyRaw !== "" &&
      (clientKeyRaw.length < 8 || !isValidClientKeyForApi(clientKeyRaw))
    ) {
      return NextResponse.json({ error: "유효한 client_key가 필요합니다." }, { status: 400 });
    }
    const clientKey = clientKeyRaw === "" ? null : clientKeyRaw;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("prompts")
      .select(
        "id, created_at, updated_at, name, summary_prompt, details_prompt, client_key, source"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("prompts get:", error);
      return NextResponse.json({ error: "불러오지 못했습니다." }, { status: 500 });
    }
    if (!data || !canAccessRow(data, clientKey)) {
      return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ prompt: data as PromptRow });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const rawPatchKey =
      typeof body.client_key === "string" ? body.client_key.trim() : "";
    const clientKey =
      rawPatchKey.length >= 8 && isValidClientKeyForApi(rawPatchKey)
        ? rawPatchKey
        : null;

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("prompts")
      .select("id, client_key, source")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    }
    if (!canAccessRow(existing, clientKey)) {
      return NextResponse.json({ error: "수정할 수 없습니다." }, { status: 403 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.summary_prompt === "string") patch.summary_prompt = body.summary_prompt;
    if (typeof body.details_prompt === "string") patch.details_prompt = body.details_prompt;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("prompts")
      .update(patch)
      .eq("id", id)
      .select(
        "id, created_at, updated_at, name, summary_prompt, details_prompt, client_key, source"
      )
      .single();

    if (error) {
      console.error("prompts patch:", error);
      return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ prompt: data as PromptRow });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const clientKey = searchParams.get("client_key")?.trim() ?? "";

    if (!clientKey || clientKey.length < 8 || !isValidClientKeyForApi(clientKey)) {
      return NextResponse.json({ error: "유효한 client_key가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("prompts")
      .select("id, client_key, source")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    }
    if (existing.source === "seed") {
      return NextResponse.json({ error: "기본 프롬프트는 삭제할 수 없습니다." }, { status: 403 });
    }
    if (!canAccessRow(existing, clientKey)) {
      return NextResponse.json({ error: "삭제할 수 없습니다." }, { status: 403 });
    }

    const { error } = await supabase.from("prompts").delete().eq("id", id);

    if (error) {
      console.error("prompts delete:", error);
      return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
