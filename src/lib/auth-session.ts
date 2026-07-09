/** 로그인 세션 — localStorage(프론트 상태) + cookie(미들웨어 검사) 동기화 */

const TOKEN_KEY = "access_token";
const USER_ID_KEY = "user_id";
const USER_EMAIL_KEY = "user_email";
const USER_NICKNAME_KEY = "user_nickname";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24; // 24시간 (백엔드 JWT와 동일)

export type AuthSession = {
  accessToken: string;
  userId: number;
  email: string;
  nickname: string | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setAuthCookie(token: string): void {
  if (!isBrowser()) return;
  // JWT는 쿠키에 그대로 저장 (미들웨어·API 라우트에서 읽음)
  // HTTPS(서버 마이크용)에서는 Secure를 붙여 브라우저가 쿠키를 더 잘 유지하게 합니다.
  const secure =
    window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function clearAuthCookie(): void {
  if (!isBrowser()) return;
  // Secure 쿠키는 Secure 플래그로 지워야 함
  const secure =
    window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax${secure}`;
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

/** 미들웨어가 쓰는 access_token 쿠키 값 */
export function getAuthCookieToken(): string | null {
  if (!isBrowser()) return null;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${TOKEN_KEY}=`)) continue;
    const value = trimmed.slice(TOKEN_KEY.length + 1);
    return value.length > 0 ? decodeURIComponent(value) : null;
  }
  return null;
}

export function saveAuthSession(session: AuthSession): void {
  if (!isBrowser()) return;

  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(USER_ID_KEY, String(session.userId));
  localStorage.setItem(USER_EMAIL_KEY, session.email);
  if (session.nickname) {
    localStorage.setItem(USER_NICKNAME_KEY, session.nickname);
  } else {
    localStorage.removeItem(USER_NICKNAME_KEY);
  }

  setAuthCookie(session.accessToken);
}

export function readAuthSession(): AuthSession | null {
  if (!isBrowser()) return null;

  const accessToken = localStorage.getItem(TOKEN_KEY);
  const userIdRaw = localStorage.getItem(USER_ID_KEY);
  const email = localStorage.getItem(USER_EMAIL_KEY);

  if (!accessToken || !userIdRaw || !email) return null;

  const userId = parseInt(userIdRaw, 10);
  if (Number.isNaN(userId)) return null;

  return {
    accessToken,
    userId,
    email,
    nickname: localStorage.getItem(USER_NICKNAME_KEY),
  };
}

/** localStorage → 쿠키 동기화 포함 (로그인 페이지 마이그레이션용) */
export function syncAuthSessionFromStorage(): AuthSession | null {
  const session = readAuthSession();
  if (session) {
    setAuthCookie(session.accessToken);
  }
  return session;
}

/** @deprecated syncAuthSessionFromStorage 사용 */
export function loadAuthSession(): AuthSession | null {
  return syncAuthSessionFromStorage();
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NICKNAME_KEY);
  clearAuthCookie();
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY) || getAuthCookieToken();
}

/** 미들웨어·글쓰기와 동일하게 쿠키 기준으로 로그인 여부 판단 */
export function hasAuthCookie(): boolean {
  return getAuthCookieToken() !== null;
}

/** 글쓰기 등 보호 기능에 실제로 사용 가능한 세션인지 (부수 효과 없음) */
export function canWriteContent(): boolean {
  return readAuthSession() !== null && hasAuthCookie();
}
