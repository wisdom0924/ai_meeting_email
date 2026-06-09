"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

function LockIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-amber-700"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

/**
 * 게시판 글쓰기 버튼
 * - 헤더(Header)와 같은 isLoggedIn 기준 사용
 * - 비로그인: 기본값 = 노란 버튼 + 자물쇠 (로딩 중에도 표시)
 */
export default function BoardWriteButton() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const href = isLoggedIn
    ? "/board/write"
    : "/login?redirect=/board/write";

  if (isLoggedIn) {
    return (
      <Link
        href={href}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 sm:w-auto"
      >
        새 글 작성
      </Link>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <Link
        href={href}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100 sm:w-auto"
      >
        <LockIcon />
        새 글 작성
      </Link>
      <p className="text-center text-xs text-gray-500 sm:text-right">
        로그인 후 작성할 수 있어요
      </p>
    </div>
  );
}
