import { proxyBackendRequest } from "@/lib/backend-api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyBackendRequest(`/api/boards/${id}/comments`, request);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyBackendRequest(`/api/boards/${id}/comments`, request, {
    method: "POST",
    body,
  });
}
