"use client";

import PromptsServerSection from "@/components/PromptsServerSection";
import type { PromptRow } from "@/lib/prompt-row";

type PromptSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  serverEnabled: boolean;
  isLoggedIn: boolean;
  hasUnsavedSelection: boolean;
  activePromptName: string | null;
  selectedPromptName: string | null;
  promptList: PromptRow[];
  selectedId: string | null;
  activePromptId: string | null;
  loadingList: boolean;
  deleting: boolean;
  saving: boolean;
  saveMessage: string | null;
  promptName: string;
  summaryPrompt: string;
  detailsPrompt: string;
  onPromptNameChange: (value: string) => void;
  onSummaryPromptChange: (value: string) => void;
  onDetailsPromptChange: (value: string) => void;
  onSelectRow: (row: PromptRow) => void;
  onNewPrompt: () => void;
  onDeletePrompt: () => void;
  onReset: () => void;
  onSave: () => void;
  onClearSaveMessage: () => void;
};

export default function PromptSettingsModal({
  open,
  onClose,
  serverEnabled,
  isLoggedIn,
  hasUnsavedSelection,
  activePromptName,
  selectedPromptName,
  promptList,
  selectedId,
  activePromptId,
  loadingList,
  deleting,
  saving,
  saveMessage,
  promptName,
  summaryPrompt,
  detailsPrompt,
  onPromptNameChange,
  onSummaryPromptChange,
  onDetailsPromptChange,
  onSelectRow,
  onNewPrompt,
  onDeletePrompt,
  onReset,
  onSave,
  onClearSaveMessage,
}: PromptSettingsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h2 id="prompt-settings-title" className="text-xl font-bold text-gray-900">
            AI 프롬프트 설정
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p>AI가 회의록을 작성할 때 사용하는 프롬프트(지시어)를 수정할 수 있습니다.</p>
            <p>요약본과 상세 회의록 각각에 대해 AI에게 어떤 식으로 작성할지 알려주세요.</p>
          </div>

          {serverEnabled && (
            <div className="flex flex-col gap-4">
              {hasUnsavedSelection ? (
                <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      선택됨
                    </span>
                    <span>
                      <strong className="font-semibold">{selectedPromptName}</strong>
                      {" "}프롬프트를 편집 중이에요.
                    </span>
                  </div>
                  {activePromptName && (
                    <p className="text-xs text-blue-800/90 pl-1">
                      AI 분석에는 아직{" "}
                      <strong>{activePromptName}</strong>이(가) 적용되어 있어요.
                      저장하기를 누르면 바뀝니다.
                    </p>
                  )}
                </div>
              ) : activePromptName ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                  <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    사용 중
                  </span>
                  <span>
                    AI 분석에{" "}
                    <strong className="font-semibold">{activePromptName}</strong>
                    {" "}프롬프트가 적용되어 있어요.
                  </span>
                </div>
              ) : (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  목록에서 프롬프트를 고른 뒤, 저장하기를 누르면 AI 분석에 적용돼요.
                </p>
              )}
              <div className="flex flex-col md:flex-row gap-4">
                <PromptsServerSection
                  items={promptList}
                  selectedId={selectedId}
                  activeId={activePromptId}
                  loadingList={loadingList}
                  onSelect={onSelectRow}
                  onNew={onNewPrompt}
                  onDelete={onDeletePrompt}
                  deleting={deleting}
                />
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-gray-900 text-sm">이름</label>
                    <input
                      type="text"
                      value={promptName}
                      onChange={(e) => {
                        onClearSaveMessage();
                        onPromptNameChange(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                      placeholder="이 프롬프트를 부를 이름"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-gray-900 text-sm">요약 프롬프트 (Summary)</label>
                    <textarea
                      value={summaryPrompt}
                      onChange={(e) => {
                        onClearSaveMessage();
                        onSummaryPromptChange(e.target.value);
                      }}
                      className="w-full h-28 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none text-sm"
                      placeholder="요약본을 위한 프롬프트를 입력하세요..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-gray-900 text-sm">상세 회의록 프롬프트 (Details)</label>
                    <textarea
                      value={detailsPrompt}
                      onChange={(e) => {
                        onClearSaveMessage();
                        onDetailsPromptChange(e.target.value);
                      }}
                      className="w-full h-28 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none text-sm"
                      placeholder="상세 회의록에 포함되어야 할 내용이나 강조할 점을 입력하세요..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!serverEnabled && (
            <>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-900 text-sm">요약 프롬프트 (Summary)</label>
                <textarea
                  value={summaryPrompt}
                  onChange={(e) => onSummaryPromptChange(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none"
                  placeholder="요약본을 위한 프롬프트를 입력하세요..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-900 text-sm">상세 회의록 프롬프트 (Details)</label>
                <textarea
                  value={detailsPrompt}
                  onChange={(e) => onDetailsPromptChange(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none"
                  placeholder="상세 회의록에 포함되어야 할 내용이나 강조할 점을 입력하세요..."
                />
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                {isLoggedIn
                  ? "서버에서 프롬프트 목록을 불러오지 못했어요. 백엔드(localhost:8000)가 켜져 있는지 확인해 주세요."
                  : "로그인하면 프롬프트 목록을 서버에 저장할 수 있어요. 지금은 이 기기 안에만 저장돼요."}
              </p>
            </>
          )}
        </div>

        {saveMessage && (
          <div
            className="mx-6 mb-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
            aria-live="polite"
          >
            ✓ {saveMessage}
          </div>
        )}

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            기본값으로 복구
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => void onSave()}
              disabled={saving}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? "저장 중…" : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
