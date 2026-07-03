"use client";

import type { PromptRow } from "@/lib/prompt-row";

type PromptsServerSectionProps = {
  items: PromptRow[];
  selectedId: string | null;
  /** AI 분석에 실제로 적용 중인 프롬프트 ID */
  activeId: string | null;
  loadingList: boolean;
  onSelect: (row: PromptRow) => void;
  onNew: () => void;
  onDelete: () => void;
  deleting: boolean;
};

export default function PromptsServerSection({
  items,
  selectedId,
  activeId,
  loadingList,
  onSelect,
  onNew,
  onDelete,
  deleting,
}: PromptsServerSectionProps) {
  const selected = items.find((p) => p.id === selectedId);
  const canDelete = Boolean(selected && selected.source !== "seed");

  return (
    <div className="md:w-[240px] shrink-0 border border-gray-100 rounded-lg bg-gray-50/80 p-3 flex flex-col gap-2 max-h-[320px]">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onNew}
          className="flex-1 rounded-lg bg-white border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100"
        >
          새로 만들기
        </button>
        <button
          type="button"
          disabled={!canDelete || deleting}
          onClick={onDelete}
          className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          {deleting ? "삭제 중…" : "삭제"}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">
        목록에서 고르면 오른쪽에 미리 보여요. 저장하기를 눌러야 AI 분석에
        적용돼요.
      </p>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {loadingList && items.length === 0 ? (
          <p className="text-xs text-gray-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500">목록이 비어 있어요.</p>
        ) : (
          items.map((row) => {
            const isSelected = row.id === selectedId;
            const isActive = row.id === activeId;
            const showSelectedBadge = isSelected && !isActive;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row)}
                className={`w-full text-left rounded-lg px-2 py-2 text-xs transition-colors ${
                  isSelected
                    ? "bg-gray-900 text-white"
                    : isActive
                      ? "bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span className="flex items-start gap-1.5 min-w-0">
                  <span className="line-clamp-2 font-medium flex-1">{row.name}</span>
                  {showSelectedBadge && (
                    <span className="shrink-0 rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      선택됨
                    </span>
                  )}
                  {isActive && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        isSelected
                          ? "bg-emerald-400 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      사용 중
                    </span>
                  )}
                </span>
                <span className="block text-[10px] opacity-80 mt-0.5">
                  {row.source === "seed"
                    ? "기본"
                    : row.source === "recording_end"
                      ? "녹음 시점 저장"
                      : "직접 만든 프롬프트"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
