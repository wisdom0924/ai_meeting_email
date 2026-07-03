import { API_URL, apiFetch } from "@/lib/api-client";
import type { PromptRow } from "@/lib/prompt-row";
import { SELECTED_PROMPT_ID_KEY } from "@/lib/prompts";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
  };
  return data.detail || data.error || fallback;
}

export async function fetchPrompts(clientKey: string): Promise<PromptRow[]> {
  const res = await apiFetch(
    `${API_URL}/api/prompts?client_key=${encodeURIComponent(clientKey)}`
  );
  if (!res.ok) {
    throw new Error(await parseError(res, "프롬프트 목록을 불러오지 못했어요."));
  }
  const data = (await res.json()) as { prompts?: PromptRow[] };
  return data.prompts ?? [];
}

export async function createPrompt(body: {
  name: string;
  summary_prompt: string;
  details_prompt: string;
  client_key: string;
  source: "user" | "recording_end";
}): Promise<PromptRow> {
  const res = await apiFetch(`${API_URL}/api/prompts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "저장에 실패했어요."));
  }
  const data = (await res.json()) as { prompt?: PromptRow };
  if (!data.prompt) {
    throw new Error("저장 응답 형식이 올바르지 않아요.");
  }
  return data.prompt;
}

export async function updatePrompt(
  id: string,
  body: {
    client_key: string;
    name: string;
    summary_prompt: string;
    details_prompt: string;
  }
): Promise<PromptRow> {
  const res = await apiFetch(`${API_URL}/api/prompts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "저장에 실패했어요."));
  }
  const data = (await res.json()) as { prompt?: PromptRow };
  if (!data.prompt) {
    throw new Error("저장 응답 형식이 올바르지 않아요.");
  }
  return data.prompt;
}

export async function deletePrompt(
  id: string,
  clientKey: string
): Promise<void> {
  const query = new URLSearchParams({ client_key: clientKey });
  const res = await apiFetch(`${API_URL}/api/prompts/${id}?${query.toString()}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "삭제하지 못했어요."));
  }
}

/**
 * 분석 시작 시 프롬프트 자동 저장을 건너뛸지 판단합니다.
 * 이미 선택한 서버 프롬프트와 요약·상세 내용이 같으면 중복 저장하지 않습니다.
 */
export async function shouldSkipAutoPromptSnapshot(
  clientKey: string,
  summary: string,
  details: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const selectedId = localStorage.getItem(SELECTED_PROMPT_ID_KEY);
  if (!selectedId) return false;

  try {
    const list = await fetchPrompts(clientKey);
    const selected = list.find((p) => p.id === selectedId);
    if (!selected) return false;
    return (
      selected.summary_prompt === summary &&
      selected.details_prompt === details
    );
  } catch {
    return false;
  }
}
