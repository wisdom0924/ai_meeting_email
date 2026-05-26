"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "signin" | "signup";

export default function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState(""); // 닉네임 입력칸
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const urlError = searchParams.get("error");

  // 원래 있던 화면이 스스로 인증 여부를 확인하는 마법! 🧙‍♂️
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // 회원가입 모드이고, "인증 메일을 확인해달라"는 메시지가 떠 있을 때만 작동해요!
    if (mode === "signup" && successMessage === "가입하신 이메일로 인증 메일을 확인해주세요!") {
      interval = setInterval(async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${apiUrl}/api/check-verification?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          
          if (data.is_verified) {
            // 인증이 완료된 걸 확인하면 로그인 화면으로 짠! 하고 바꿔줍니다.
            setMode("signin");
            setSuccessMessage("이메일 인증이 완료되었습니다! 이제 로그인해 주세요. 🎉");
            clearInterval(interval); // 확인하는 작업 종료
          }
        } catch (err) {
          // 에러가 나도 티내지 않고 조용히 넘어갑니다.
        }
      }, 3000); // 3초마다 한 번씩 몰래 확인해요!
    }

    return () => clearInterval(interval);
  }, [mode, successMessage, email]);

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
    setSuccessMessage(null);
    setLoading(true);
    
    try {
      const trimmedEmail = email.trim();
      
      // 회원가입일 때 비밀번호가 서로 같은지 확인해요!
      if (mode === "signup" && password !== passwordConfirm) {
        setMessage("비밀번호가 서로 다릅니다. 다시 확인해 주세요!");
        setLoading(false);
        return;
      }

      const endpoint = mode === "signup" ? "/api/signup" : "/api/login";
      
      // FastAPI 서버로 요청 보내기!
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const requestBody = mode === "signup" 
        ? { email: trimmedEmail, password: password, nickname: nickname }
        : { email: trimmedEmail, password: password };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // 서버에서 에러가 났을 때 (예: 비밀번호 틀림, 이미 있는 이메일 등)
        const data = await response.json();
        setMessage(data.detail || "오류가 발생했습니다.");
        return;
      }

      const data = await response.json();

      // 성공했을 때
      if (mode === "signup") {
        setSuccessMessage("가입하신 이메일로 인증 메일을 확인해주세요!");
        setPassword(""); // 비밀번호 칸 비워주기
        setPasswordConfirm(""); // 비밀번호 확인 칸도 비워주기
      } else {
        // 로그인 성공! (임시로 브라우저에 회원 번호 저장)
        localStorage.setItem("user_id", data.user_id.toString());
        localStorage.setItem("user_email", data.email);
        if (data.nickname) {
          localStorage.setItem("user_nickname", data.nickname);
        }
        
        // JWT 입장권(토큰) 저장하기! (이게 있어야 다른 기능을 쓸 수 있어요)
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
        }
        
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
              setSuccessMessage(null);
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
              setSuccessMessage(null);
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
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="you@example.com"
          />
        </div>

        {/* 비밀번호와 비밀번호 확인, 닉네임은 항상 보여줌 (단, 회원가입 모드일 때만 확인과 닉네임 표시) */}
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

        {mode === "signup" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-password-confirm" className="text-xs font-medium text-gray-700">
                비밀번호 확인
              </label>
              <input
                id="auth-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2"
                placeholder="비밀번호를 한 번 더 입력해 주세요"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-nickname" className="text-xs font-medium text-gray-700">
                닉네임
              </label>
              <input
                id="auth-nickname"
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2"
                placeholder="멋진 닉네임을 지어주세요"
              />
            </div>
          </>
        )}

        {displayError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{displayError}</p>
        )}

        {successMessage && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">{successMessage}</p>
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
