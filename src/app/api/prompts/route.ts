import { NextResponse } from "next/server";
import { requireAuthenticatedUserForApi } from "@/lib/require-authenticated-user";
import { proxyPromptsRequest } from "@/lib/prompts-api-proxy";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUserForApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientKey = searchParams.get("client_key") ?? "";

  if (!clientKey) {
    return NextResponse.json(
      { error: "client_key가 필요합니다." },
      { status: 400 }
    );
  }

  const query = new URLSearchParams({ client_key: clientKey });
  return proxyPromptsRequest(`/api/prompts?${query.toString()}`, auth.token);
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUserForApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.client_key !== "string") {
    return NextResponse.json(
      { error: "client_key가 필요합니다." },
      { status: 400 }
    );
  }

  return proxyPromptsRequest("/api/prompts", auth.token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
