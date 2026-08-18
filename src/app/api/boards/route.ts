import { proxyBackendRequest } from "@/lib/backend-api-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const path = query ? `/api/boards?${query}` : "/api/boards";
  return proxyBackendRequest(path, request);
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyBackendRequest("/api/boards", request, {
    method: "POST",
    body,
  });
}
