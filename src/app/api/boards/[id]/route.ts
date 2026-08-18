import { proxyBackendRequest } from "@/lib/backend-api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const path = query
    ? `/api/boards/${id}?${query}`
    : `/api/boards/${id}`;
  return proxyBackendRequest(path, request);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyBackendRequest(`/api/boards/${id}`, request, {
    method: "PUT",
    body,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyBackendRequest(`/api/boards/${id}`, request, {
    method: "DELETE",
  });
}
