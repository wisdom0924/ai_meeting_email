"use client";

import type { PromptRow } from "@/lib/prompt-row";

type PromptsServerSectionProps = {
  items: PromptRow[];
  selectedId: string | null;
  loadingList: boolean;
  onSelect: (row: PromptRow) => void;
  onNew: () => void;
  onDelete: () => void;
  deleting: boolean;
};

export default function PromptsServerSection({
  items,
  selectedId,
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
        서버에 저장된 프롬프트예요. 녹음이 끝나면 그때 쓰던 설정이 목록에
        자동으로 하나 더 생겨요.
      </p>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {loadingList && items.length === 0 ? (
          <p className="text-xs text-gray-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500">목록이 비어 있어요.</p>
        ) : (
          items.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row)}
              className={`w-full text-left rounded-lg px-2 py-2 text-xs transition-colors ${
                row.id === selectedId
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              <span className="line-clamp-2 font-medium">{row.name}</span>
              <span className="block text-[10px] opacity-80 mt-0.5">
                {row.source === "seed"
                  ? "기본"
                  : row.source === "recording_end"
                    ? "녹음 시점 저장"
                    : "직접 만든 프롬프트"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
