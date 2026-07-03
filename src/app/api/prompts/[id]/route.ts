import { NextResponse } from "next/server";
import { requireAuthenticatedUserForApi } from "@/lib/require-authenticated-user";
import { proxyPromptsRequest } from "@/lib/prompts-api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuthenticatedUserForApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.client_key !== "string") {
    return NextResponse.json(
      { error: "client_key가 필요합니다." },
      { status: 400 }
    );
  }

  return proxyPromptsRequest(`/api/prompts/${id}`, auth.token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuthenticatedUserForApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const clientKey = searchParams.get("client_key") ?? "";

  if (!clientKey) {
    return NextResponse.json(
      { error: "client_key가 필요합니다." },
      { status: 400 }
    );
  }

  const query = new URLSearchParams({ client_key: clientKey });
  return proxyPromptsRequest(
    `/api/prompts/${id}?${query.toString()}`,
    auth.token,
    { method: "DELETE" }
  );
}
