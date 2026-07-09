"use client";

import { memo } from "react";
import AutosizeTextarea from "@/components/transcript/AutosizeTextarea";

/** 녹음 타이머 등으로 부모가 자주 리렌더돼도, 요약 문자열이 같으면 다시 그리지 않음 → textarea 줄바꿈 유지 */
const SummaryTabBody = memo(function SummaryTabBody({
  summary,
  onSummaryChange,
}: {
  summary: string;
  onSummaryChange: (next: string) => void;
}) {
  return (
    <AutosizeTextarea
      className="block w-full min-h-[12rem] cursor-text rounded-none border-0 bg-transparent p-0 pb-8 font-light leading-relaxed text-gray-700 outline-none transition-colors focus:bg-gray-50 focus:ring-0 whitespace-pre-wrap"
      value={summary}
      onChange={(e) => onSummaryChange(e.target.value)}
      spellCheck={false}
      aria-label="요약 편집"
    />
  );
});

export default SummaryTabBody;
