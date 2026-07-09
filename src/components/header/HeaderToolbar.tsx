"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";

type HeaderToolbarProps = {
  onGuideOpen: () => void;
  onPromptSettingsOpen: () => void;
  onRefresh?: () => void;
  onSendExternal?: () => void;
  isSending?: boolean;
  onRecordingHistory?: () => void;
};

export default function HeaderToolbar({
  onGuideOpen,
  onPromptSettingsOpen,
  onRefresh,
  onSendExternal,
  isSending,
  onRecordingHistory,
}: HeaderToolbarProps) {
  const { isLoggedIn, email: userEmail, nickname: userNickname, clearSession } =
    useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (!window.confirm("로그아웃할까요?")) return;
    setSigningOut(true);
    try {
      clearSession();
      window.location.href = "/login";
    } catch {
      alert("로그아웃 중 오류가 났어요.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          window.location.href = "/";
        }}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">AI MEETING</h1>
      </a>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/board"
          className="p-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
          title="회의록 공유 게시판"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span className="hidden sm:inline ml-1.5 text-xs font-bold">공유방</span>
        </Link>
        <button
          type="button"
          onClick={onGuideOpen}
          className="p-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          title="사용방법"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="hidden sm:inline ml-1.5 text-xs font-medium">사용방법</span>
        </button>
        {onRecordingHistory && (
          <button
            type="button"
            onClick={onRecordingHistory}
            className="p-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            title="Recording History"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="hidden sm:inline ml-1.5 text-xs font-medium">히스토리</span>
          </button>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            title="새로고침"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
        )}
        {onSendExternal && (
          <button
            onClick={onSendExternal}
            disabled={isSending}
            className={`p-2 text-sm font-medium text-white rounded-lg flex items-center justify-center transition-colors ${isSending ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            title="외부 전송"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            )}
          </button>
        )}
        {isLoggedIn && (
          <div className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 sm:max-w-xs">
            {userNickname || userEmail ? (
              <span
                className="truncate text-xs text-gray-600"
                title={userNickname || userEmail || undefined}
              >
                {userNickname ? `${userNickname}님` : userEmail}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:px-3"
              title="로그아웃"
            >
              {signingOut ? "나가는 중…" : "로그아웃"}
            </button>
          </div>
        )}
        <button
          onClick={onPromptSettingsOpen}
          className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
          title="프롬프트 설정"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
    </header>
  );
}
