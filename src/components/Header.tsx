"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_SUMMARY_PROMPT, DEFAULT_DETAILS_PROMPT, SELECTED_PROMPT_ID_KEY } from "@/lib/prompts";
import Link from "next/link";
import PromptsServerSection from "@/components/PromptsServerSection";
import type { PromptRow } from "@/lib/prompt-row";
import { isUsableRecordingClientKey } from "@/lib/recording-client-key";
import {
  createPrompt,
  deletePrompt,
  fetchPrompts,
  updatePrompt,
} from "@/lib/prompts-api";
import { useAuthStore } from "@/store/auth-store";

export interface HeaderProps {
  onRefresh?: () => void;
  onSendExternal?: () => void;
  isSending?: boolean;
  /** 서버에 올린 과거 녹음 목록 모달 */
  onRecordingHistory?: () => void;
  /** 서버 프롬프트 목록·저장용(사용자 ID). 없으면 예전처럼 로컬만 사용 */
  clientKey?: string;
  /** 녹음 종료 시 스냅샷 저장 후 목록 새로고침 */
  promptsRefreshVersion?: number;
  onActivePromptsChange?: (summary: string | null, details: string | null) => void;
}

export default function Header({
  onRefresh,
  onSendExternal,
  isSending,
  onRecordingHistory,
  clientKey = "",
  promptsRefreshVersion = 0,
  onActivePromptsChange,
}: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [detailsPrompt, setDetailsPrompt] = useState("");
  const [promptName, setPromptName] = useState("");

  const [serverEnabled, setServerEnabled] = useState(false);
  const [promptList, setPromptList] = useState<PromptRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** AI 분석(녹음·파일)에 실제로 적용 중인 프롬프트 ID */
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { isLoggedIn, email: userEmail, nickname: userNickname, clearSession } =
    useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_PROMPT_ID_KEY);
    if (saved) setActivePromptId(saved);
  }, []);

  const activePromptName = useMemo(() => {
    if (!activePromptId) return null;
    return promptList.find((p) => p.id === activePromptId)?.name ?? null;
  }, [activePromptId, promptList]);

  const selectedPromptName = useMemo(() => {
    if (!selectedId) return null;
    return promptList.find((p) => p.id === selectedId)?.name ?? null;
  }, [selectedId, promptList]);

  const hasUnsavedSelection =
    serverEnabled &&
    selectedId !== null &&
    selectedId !== activePromptId;

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

  const applyLocalDefaults = useCallback(() => {
    const savedSummary = localStorage.getItem("summaryPrompt");
    const savedDetails = localStorage.getItem("detailsPrompt");
    const isOldJsonFormat = savedDetails?.includes("JSON 형식이어야 합니다");
    const nextSummary = savedSummary || DEFAULT_SUMMARY_PROMPT;
    const nextDetails = isOldJsonFormat
      ? DEFAULT_DETAILS_PROMPT
      : savedDetails || DEFAULT_DETAILS_PROMPT;
    setSummaryPrompt(nextSummary);
    setDetailsPrompt(nextDetails);
    setPromptName("로컬 편집");
    setActivePromptId(null);
    onActivePromptsChange?.(nextSummary, nextDetails);
  }, [onActivePromptsChange]);

  const previewRow = useCallback((row: PromptRow) => {
    setSelectedId(row.id);
    setPromptName(row.name);
    setSummaryPrompt(row.summary_prompt);
    setDetailsPrompt(row.details_prompt);
  }, []);

  /** 저장하기 후 AI 분석에 실제 적용 */
  const activatePrompt = useCallback(
    (opts: { id: string; summary: string; details: string }) => {
      localStorage.setItem("summaryPrompt", opts.summary);
      localStorage.setItem("detailsPrompt", opts.details);
      localStorage.setItem(SELECTED_PROMPT_ID_KEY, opts.id);
      setActivePromptId(opts.id);
      setSelectedId(opts.id);
      onActivePromptsChange?.(opts.summary, opts.details);
    },
    [onActivePromptsChange]
  );

  const loadPromptsFromServer = useCallback(async () => {
    if (!isUsableRecordingClientKey(clientKey, isLoggedIn)) {
      setServerEnabled(false);
      applyLocalDefaults();
      return;
    }
    setLoadingList(true);
    try {
      const list = await fetchPrompts(clientKey);
      setServerEnabled(true);
      setPromptList(list);
      const savedActiveId = localStorage.getItem(SELECTED_PROMPT_ID_KEY);
      const activeRow = savedActiveId
        ? list.find((p) => p.id === savedActiveId)
        : undefined;
      if (activeRow) {
        setActivePromptId(savedActiveId);
      } else if (savedActiveId) {
        localStorage.removeItem(SELECTED_PROMPT_ID_KEY);
        setActivePromptId(null);
      }
      const bySeed = list.find((p) => p.source === "seed");
      const previewTarget = activeRow || bySeed || list[0];
      if (previewTarget) {
        previewRow(previewTarget);
      } else {
        applyLocalDefaults();
      }
    } catch {
      setServerEnabled(false);
      applyLocalDefaults();
    } finally {
      setLoadingList(false);
    }
  }, [clientKey, isLoggedIn, applyLocalDefaults, previewRow]);

  useEffect(() => {
    void loadPromptsFromServer();
  }, [loadPromptsFromServer, promptsRefreshVersion]);

  useEffect(() => {
    if (isModalOpen) {
      void loadPromptsFromServer();
    } else {
      setSaveMessage(null);
    }
  }, [isModalOpen, loadPromptsFromServer]);

  useEffect(() => {
    if (!serverEnabled) {
      const savedSummary = localStorage.getItem("summaryPrompt");
      const savedDetails = localStorage.getItem("detailsPrompt");
      const isOldJsonFormat = savedDetails?.includes("JSON 형식이어야 합니다");
      setSummaryPrompt(savedSummary || DEFAULT_SUMMARY_PROMPT);
      setDetailsPrompt(
        isOldJsonFormat ? DEFAULT_DETAILS_PROMPT : savedDetails || DEFAULT_DETAILS_PROMPT
      );
    }
  }, [serverEnabled]);

  const handleSave = async () => {
    if (serverEnabled && clientKey) {
      setSaving(true);
      try {
        let savedId = selectedId;
        if (!selectedId) {
          const prompt = await createPrompt({
            name: promptName.trim() || "이름 없음",
            summary_prompt: summaryPrompt,
            details_prompt: detailsPrompt,
            client_key: clientKey,
            source: "user",
          });
          savedId = prompt.id;
        } else {
          await updatePrompt(selectedId, {
            client_key: clientKey,
            name: promptName.trim() || "이름 없음",
            summary_prompt: summaryPrompt,
            details_prompt: detailsPrompt,
          });
        }
        if (!savedId) {
          alert("저장에 실패했어요.");
          return;
        }
        activatePrompt({
          id: savedId,
          summary: summaryPrompt,
          details: detailsPrompt,
        });
        await loadPromptsFromServer();
        setSaveMessage("저장되었습니다. AI 분석에 적용되었어요.");
      } catch (err) {
        alert(err instanceof Error ? err.message : "저장 중 오류가 났어요.");
        return;
      } finally {
        setSaving(false);
      }
    } else {
      localStorage.setItem("summaryPrompt", summaryPrompt);
      localStorage.setItem("detailsPrompt", detailsPrompt);
      onActivePromptsChange?.(summaryPrompt, detailsPrompt);
      setSaveMessage("저장되었습니다.");
    }
  };

  const handleReset = () => {
    setSummaryPrompt(DEFAULT_SUMMARY_PROMPT);
    setDetailsPrompt(DEFAULT_DETAILS_PROMPT);
  };

  const handleSelectRow = (row: PromptRow) => {
    setSaveMessage(null);
    previewRow(row);
  };

  const handleNewPrompt = async () => {
    if (!serverEnabled || !clientKey) return;
    setSaving(true);
    try {
      const prompt = await createPrompt({
        name: `새 프롬프트 ${new Date().toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`,
        summary_prompt: summaryPrompt || DEFAULT_SUMMARY_PROMPT,
        details_prompt: detailsPrompt || DEFAULT_DETAILS_PROMPT,
        client_key: clientKey,
        source: "user",
      });
      await loadPromptsFromServer();
      previewRow(prompt);
    } catch (err) {
      alert(err instanceof Error ? err.message : "만들기 중 오류가 났어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!serverEnabled || !selectedId || !clientKey) return;
    const row = promptList.find((p) => p.id === selectedId);
    if (!row || row.source === "seed") return;
    if (!window.confirm(`"${row.name}" 프롬프트를 삭제할까요?`)) return;
    setDeleting(true);
    try {
      const wasActive = selectedId === activePromptId;
      await deletePrompt(selectedId, clientKey);
      if (wasActive) {
        localStorage.removeItem(SELECTED_PROMPT_ID_KEY);
        setActivePromptId(null);
      }
      await loadPromptsFromServer();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 중 오류가 났어요.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
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
            onClick={() => setIsGuideOpen(true)}
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
              className={`p-2 text-sm font-medium text-white rounded-lg flex items-center justify-center transition-colors ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
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
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
            title="프롬프트 설정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </header>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setIsModalOpen(false)}
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
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-900"
              >
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
                    onSelect={handleSelectRow}
                    onNew={handleNewPrompt}
                    onDelete={handleDeletePrompt}
                    deleting={deleting}
                  />
                  <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="flex flex-col gap-2">
                      <label className="font-bold text-gray-900 text-sm">이름</label>
                      <input
                        type="text"
                        value={promptName}
                        onChange={(e) => {
                          setSaveMessage(null);
                          setPromptName(e.target.value);
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
                          setSaveMessage(null);
                          setSummaryPrompt(e.target.value);
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
                          setSaveMessage(null);
                          setDetailsPrompt(e.target.value);
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
                      onChange={(e) => setSummaryPrompt(e.target.value)}
                      className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none"
                      placeholder="요약본을 위한 프롬프트를 입력하세요..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-gray-900 text-sm">상세 회의록 프롬프트 (Details)</label>
                    <textarea 
                      value={detailsPrompt}
                      onChange={(e) => setDetailsPrompt(e.target.value)}
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
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                기본값으로 복구
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? "저장 중…" : "저장하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
              <h2 id="guide-title" className="text-lg font-bold text-gray-900">
                사용방법
              </h2>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="text-gray-400 hover:text-gray-900"
                aria-label="사용방법 닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5 text-sm text-gray-700 space-y-4 leading-relaxed">
              <section className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">0. 시작 전에 먼저</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-gray-600">
                  <li>브라우저에서 마이크 권한을 허용해 주세요.</li>
                  <li>회의가 끝난 뒤에는 분석 버튼을 눌러야 요약/회의록이 만들어져요.</li>
                  <li>결과를 다시 보고 싶으면 히스토리에서 같은 녹음을 선택하면 돼요.</li>
                  <li>AI 분석 방식을 바꾸려면 ⚙️ 프롬프트 설정에서 고른 뒤 저장하기를 눌러 주세요.</li>
                </ul>
              </section>

              <section className="rounded-lg border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">1-1. 직접 녹음하기</h3>
                <ol className="mt-2 list-decimal pl-5 space-y-1">
                  <li>녹음 시작 버튼을 눌러요.</li>
                  <li>회의가 끝나면 녹음을 종료해요.</li>
                  <li>화면에 생긴 항목에서 AI 분석 버튼을 눌러요.</li>
                  <li>잠시 기다리면 요약본과 상세 회의록이 자동으로 채워져요.</li>
                </ol>
              </section>

              <section className="rounded-lg border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">1-2. 녹음한 파일 올리기</h3>
                <ol className="mt-2 list-decimal pl-5 space-y-1">
                  <li>파일 업로드 버튼으로 녹음 파일을 선택해요.</li>
                  <li>업로드가 끝나면 목록에 파일이 보여요.</li>
                  <li>그 줄에서 AI 분석 버튼을 눌러 결과를 만들어요.</li>
                  <li>이후에는 히스토리에서 AI 분석 불러오기로 다시 꺼내 볼 수 있어요.</li>
                </ol>
              </section>

              <section className="rounded-lg border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">1-3. 채팅창(메모창) 기능</h3>
                <ol className="mt-2 list-decimal pl-5 space-y-1">
                  <li>왼쪽 아래 입력칸에 중요한 말을 짧게 적어요.</li>
                  <li>전송 버튼(종이비행기)을 누르면 메모가 말풍선처럼 쌓여요.</li>
                  <li>이 메모는 AI가 요약할 때 참고해서 더 정확한 회의록을 만들어요.</li>
                  <li>한 줄에 한 가지씩 적으면 나중에 읽기 쉬워요.</li>
                </ol>
              </section>

              <section className="rounded-lg border border-violet-100 bg-violet-50 p-4">
                <h3 className="font-semibold text-gray-900">2. 프롬프트 저장 방법 (⚙️)</h3>
                <p className="mt-1 text-xs text-violet-900/90">
                  AI가 요약·상세 회의록을 쓰는 방식(지시문)을 저장해 두는 기능이에요.
                  <strong className="font-medium"> 로그인</strong>해야 서버에 목록이
                  저장돼요. (비로그인은 이 기기에만 임시 저장)
                </p>

                <h4 className="mt-3 text-sm font-semibold text-gray-900">
                  2-1. 설정 창 여는 법
                </h4>
                <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
                  <li>화면 오른쪽 위 <strong>⚙️(톱니바퀴)</strong> 버튼을 눌러요.</li>
                  <li>「AI 프롬프트 설정」창이 열리면 왼쪽에 저장된 목록이 보여요.</li>
                </ol>

                <h4 className="mt-3 text-sm font-semibold text-gray-900">
                  2-2. 새 프롬프트 만들어 저장하기
                </h4>
                <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
                  <li>왼쪽 위 <strong>새로 만들기</strong>를 눌러요.</li>
                  <li>오른쪽에서 <strong>이름</strong>, <strong>요약 프롬프트</strong>,{" "}
                    <strong>상세 회의록 프롬프트</strong>를 적어요.</li>
                  <li>맨 아래 <strong>저장하기</strong>를 눌러요.</li>
                  <li>
                    초록색으로{" "}
                    <strong>「저장되었습니다. AI 분석에 적용되었어요.»</strong>{" "}
                    가 뜨고, 목록에 <strong>「사용 중」</strong>이 붙으면 성공이에요.
                  </li>
                </ol>

                <h4 className="mt-3 text-sm font-semibold text-gray-900">
                  2-3. 이미 있는 프롬프트 고쳐서 저장하기
                </h4>
                <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
                  <li>왼쪽 목록에서 고칠 프롬프트를 눌러요. → <strong>「선택됨」</strong></li>
                  <li>오른쪽 내용을 수정해요.</li>
                  <li><strong>저장하기</strong>를 눌러요. → 서버에 저장 + <strong>「사용 중」</strong></li>
                  <li>창은 그대로 열려 있어요. 확인 후 <strong>X</strong> 또는 <strong>취소</strong>로 닫으면 돼요.</li>
                </ol>

                <h4 className="mt-3 text-sm font-semibold text-gray-900">
                  2-4. 다른 프롬프트 골라서 쓰기
                </h4>
                <ol className="mt-1 list-decimal pl-5 space-y-1 text-gray-700">
                  <li>목록에서 쓰고 싶은 프롬프트를 눌러요. (아직 <strong>선택됨</strong>만 표시)</li>
                  <li>내용을 바꿀 필요 없으면 그대로 <strong>저장하기</strong>만 눌러요.</li>
                  <li>그러면 그 프롬프트가 <strong>사용 중</strong>이 되고, 다음 AI 분석부터 적용돼요.</li>
                </ol>

                <p className="mt-3 text-xs text-violet-800/90 rounded-lg bg-violet-100/60 px-3 py-2">
                  <strong>알아두면 좋아요</strong>
                  <br />
                  · 목록만 누르고 저장 안 하면 AI 분석 방식은 안 바뀌어요.
                  <br />
                  · <strong>삭제</strong>로 지울 수 있어요. (기본 프롬프트는 삭제 불가)
                  <br />
                  · 이미 쓰는 프롬프트와 내용이 같으면, 분석할 때 목록에 같은 이름이 또 생기지 않아요.
                </p>
              </section>

              <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h3 className="font-semibold text-gray-900">3. 이메일 전송 방법</h3>
                <ol className="mt-2 list-decimal pl-5 space-y-1 text-gray-700">
                  <li>먼저 AI 분석이 끝났는지 확인해요.</li>
                  <li>
                    화면 아래쪽 이메일 영역에서 받는 사람·참조 주소를 적거나
                    확인해요. (요약·회의록은 위쪽에 보여요.)
                  </li>
                  <li>오른쪽 위 전송(종이비행기) 버튼을 눌러요.</li>
                  <li>전송이 끝나면 뜨는 안내 창을 확인해요.</li>
                </ol>
              </section>

              <section className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <h3 className="font-semibold text-gray-900">자주 막히는 경우</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-amber-900">
                  <li>목록이 비어 있으면 새로고침을 눌러 다시 불러와 보세요.</li>
                  <li>분석 불러오기가 비활성화면, 그 녹음을 아직 분석하지 않은 상태예요.</li>
                  <li>오류가 계속 뜨면 잠시 후 다시 시도하거나 인터넷 연결을 확인해 주세요.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
