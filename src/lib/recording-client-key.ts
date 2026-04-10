/** 예전: 브라우저당 키 하나(계정 바꿔도 같은 키 → 녹음이 섞임) */
const LEGACY_STORAGE_KEY = "ai_meeting_recordings_client_key";
const ANON_SLOT_KEY = "ai_meeting_recordings_v2:anon";

/** localStorage 금지·용량 초과 시에도 이 탭 세션 안에서는 같은 키를 씁니다. */
let memoryFallbackKey: string | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 로그인 시에는 Supabase user id 를 키로 써서 계정과 1:1로 맞춥니다.
 * 비로그인일 때만 브라우저(anon)별 임의 키를 씁니다.
 */
export function getOrCreateRecordingClientKey(userId: string | null): string {
  if (typeof window === "undefined") return "";
  if (userId) {
    return userId;
  }
  try {
    const existing = window.localStorage.getItem(ANON_SLOT_KEY);
    if (existing && existing.length >= 8) return existing;

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && legacy.length >= 8) {
      window.localStorage.setItem(ANON_SLOT_KEY, legacy);
      return legacy;
    }

    const next = randomId();
    window.localStorage.setItem(ANON_SLOT_KEY, next);
    return next;
  } catch {
    if (!memoryFallbackKey) {
      memoryFallbackKey = randomId();
    }
    return memoryFallbackKey;
  }
}
