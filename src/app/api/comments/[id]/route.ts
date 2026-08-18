import { proxyBackendRequest } from "@/lib/backend-api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyBackendRequest(`/api/comments/${id}`, request, {
    method: "PUT",
    body,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyBackendRequest(`/api/comments/${id}`, request, {
    method: "DELETE",
  });
}
