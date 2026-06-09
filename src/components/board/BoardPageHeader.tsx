"use client";

import BoardWriteButton from "@/components/board/BoardWriteButton";

export default function BoardPageHeader() {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-gray-200 pb-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          회의록 공유방 🤝
        </h1>
        <p className="mt-2 text-sm text-gray-500 md:text-base">
          다른 사람들과 회의 내용을 나누고 댓글로 의견을 나눠보세요!
        </p>
      </div>
      <BoardWriteButton />
    </div>
  );
}
