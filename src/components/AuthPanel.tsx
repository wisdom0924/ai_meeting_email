"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env";

type Mode = "signin" | "signup";

const getFriendlyResendErrorMessage = (rawMessage: string) => {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("security purposes")) {
    return "방금 메일을 보냈기 때문에 잠시 후 다시 시도해 주세요. (너무 짧은 간격 재요청 제한)";
  }
  if (lower.includes("rate limit")) {
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }
  return rawMessage;
};

/** Supabase는 중복 이메일 가입 시 에러 대신 identities 가 빈 user 를 주는 경우가 많음 (이메일 유추 방지) */
const isNewEmailPasswordSignup = (user: { identities?: unknown[] } | null) =>
  Boolean(user && Array.isArray(user.identities) && user.identities.length > 0);

const looksLikeExistingEmailSignupError = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already registered") ||
    lower.includes("email address is already registered") ||
    lower.includes("email already registered") ||
    (lower.includes("already") && lower.includes("registered")) ||
    lower.includes("user already exists") ||
    (lower.includes("already") && lower.includes("in use"))
  );
};

export default function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = useMemo(() => isSupabaseBrowserConfigured(), []);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const urlError = searchParams.get("error");
  const displayError = (() => {
    if (message) return message;
    if (!urlError) return null;
    if (urlError === "config") {
      return "Supabase 주소·키가 아직 설정되지 않았어요. .env 를 확인해 주세요.";
    }
    if (urlError === "auth") {
      return "로그인 링크가 올바르지 않아요. 다시 시도해 주세요.";
    }
    try {
      return decodeURIComponent(urlError);
    } catch {
      return urlError;
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setMessage("Supabase 설정이 필요합니다.");
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const trimmedEmail = email.trim();
      const emailRedirectTo = `${origin}/auth/callback`;

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo,
          },
        });
        if (error) {
          if (looksLikeExistingEmailSignupError(error.message)) {
            const { error: resendError } = await supabase.auth.resend({
              type: "signup",
              email: trimmedEmail,
              options: { emailRedirectTo },
            });
            if (resendError) {
              setMessage(getFriendlyResendErrorMessage(resendError.message));
              return;
            }
            setMessage(
              "이 이메일은 이미 가입 대기 상태예요. 인증 메일을 다시 보냈어요. 메일함/스팸함을 확인해 주세요."
            );
            return;
          }
          setMessage(error.message);
          return;
        }
        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }
        // 이메일 확인 전: 신규 가입은 identities 가 채워짐. 빈 identities 는 '이미 있는 이메일'에 대한 숨김 응답일 때가 많음 → 인증 메일 재발송
        if (!isNewEmailPasswordSignup(data.user ?? null)) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: trimmedEmail,
            options: { emailRedirectTo },
          });
          if (resendError) {
            setMessage(getFriendlyResendErrorMessage(resendError.message));
            return;
          }
          setMessage(
            "이 이메일로 가입을 시도한 적이 있어요. 인증 메일을 다시 보냈어요. 메일함/스팸함을 확인해 주세요."
          );
          return;
        }
        setMessage(
          "가입 메일을 보냈어요. 메일함에서 링크를 누르면 로그인이 완료돼요. (스팸함도 확인해 보세요)"
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "알 수 없는 오류예요.");
    } finally {
      setLoading(false);
    }
  };

  if (!configured) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center shadow-sm">
        <p className="text-sm font-medium text-amber-900">
          아직 Supabase 연결 정보가 없어요.
        </p>
        <p className="mt-2 text-xs text-amber-800 leading-relaxed">
          프로젝트 루트에 <code className="rounded bg-amber-100 px-1">.env</code> 에{" "}
          <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> 과{" "}
          <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
          를 넣어 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-gray-900 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">AI 회의록 마법사</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "signin" ? "계정으로 로그인해 주세요" : "새 계정을 만들어 주세요"}
        </p>
      </div>

      <div className="mb-4 flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage(null);
          }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-xs font-medium text-gray-700">
            이메일
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2"
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-xs font-medium text-gray-700">
            비밀번호
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2"
            placeholder="6자 이상"
          />
        </div>

        {displayError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{displayError}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex items-center justify-center rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : mode === "signin" ? (
            "로그인"
          ) : (
            "가입하기"
          )}
        </button>
      </form>
    </div>
  );
}
