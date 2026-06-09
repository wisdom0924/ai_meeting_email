import { clearAuthSession, getAccessToken } from "@/lib/auth-session";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function redirectToLogin(message?: string): void {
  if (typeof window === "undefined") return;

  clearAuthSession();
  const params = new URLSearchParams();
  if (message) params.set("error", message);
  const query = params.toString();
  window.location.href = query ? `/login?${query}` : "/login";
}

/** 공통 fetch — Authorization 헤더 + 401(토큰 만료) 처리 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (
    !headers.has("Content-Type") &&
    options.body &&
    typeof options.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    redirectToLogin("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    throw new ApiError("로그인이 만료되었거나 필요합니다.", 401);
  }

  return response;
}

/** JSON 응답 + 공통 에러 메시지 추출 */
export async function apiJson<T>(
  url: string,
  options: RequestInit = {},
  fallbackMessage = "요청에 실패했습니다."
): Promise<T> {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      detail?: string;
      error?: string;
    };
    throw new ApiError(
      data.detail || data.error || fallbackMessage,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

/** 로그인 없이도 볼 수 있는 API — Authorization 헤더 없이 요청 */
export async function publicJson<T>(
  url: string,
  options: RequestInit = {},
  fallbackMessage = "요청에 실패했습니다."
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      detail?: string;
      error?: string;
    };
    throw new ApiError(
      data.detail || data.error || fallbackMessage,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
