"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "signin" | "signup";

export default function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const urlError = searchParams.get("error");
  const displayError = (() => {
    if (message) return message;
    if (!urlError) return null;
    if (urlError === "auth") {
      return "로그인 정보가 올바르지 않아요. 다시 시도해 주세요.";
    }
    try {
      return decodeURIComponent(urlError);
    } catch {
      return urlError;
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    
    try {
      const trimmedEmail = email.trim();
      const endpoint = mode === "signup" ? "/api/signup" : "/api/login";
      
      // FastAPI 서버로 요청 보내기!
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 서버에서 에러가 났을 때 (예: 비밀번호 틀림, 이미 있는 이메일 등)
        setMessage(data.detail || "오류가 발생했습니다.");
        return;
      }

      // 성공했을 때
      if (mode === "signup") {
        setMessage("가입이 완료되었습니다! 이제 로그인해 주세요.");
        setMode("signin"); // 가입 성공하면 로그인 화면으로 바꿔주기
        setPassword(""); // 비밀번호 칸 비워주기
      } else {
        // 로그인 성공! (임시로 브라우저에 회원 번호 저장)
        localStorage.setItem("user_id", data.user_id.toString());
        localStorage.setItem("user_email", data.email);
        
        // 페이지를 완전히 새로고침하면서 메인 화면으로 넘기기
        window.location.href = "/";
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "알 수 없는 오류예요.");
    } finally {
      setLoading(false);
    }
  };

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
