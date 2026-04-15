"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_SUMMARY_PROMPT, DEFAULT_DETAILS_PROMPT } from "@/lib/prompts";
import PromptsCloudSection from "@/components/PromptsCloudSection";
import type { PromptRow } from "@/lib/prompt-row";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const SELECTED_PROMPT_ID_KEY = "ai_meeting_selected_prompt_id";

export interface HeaderProps {
  onRefresh?: () => void;
  onSendExternal?: () => void;
  isSending?: boolean;
  /** 클라우드에 올린 과거 녹음 목록 모달 */
  onRecordingHistory?: () => void;
  /** Supabase 프롬프트 목록·저장용(브라우저 client_key). 없으면 예전처럼 로컬만 사용 */
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
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [detailsPrompt, setDetailsPrompt] = useState("");
  const [promptName, setPromptName] = useState("");

  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [promptList, setPromptList] = useState<PromptRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setAuthEnabled(isSupabaseBrowserConfigured());
  }, []);

  useEffect(() => {
    if (!authEnabled) {
      setUserEmail(null);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setUserEmail(session?.user?.email?.trim() || null);
      }
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email?.trim() || null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [authEnabled]);

  const handleSignOut = async () => {
    if (!authEnabled) return;
    if (!window.confirm("로그아웃할까요?")) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
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
    onActivePromptsChange?.(nextSummary, nextDetails);
  }, [onActivePromptsChange]);

  const applyRow = useCallback(
    (row: PromptRow) => {
      setSelectedId(row.id);
      setPromptName(row.name);
      setSummaryPrompt(row.summary_prompt);
      setDetailsPrompt(row.details_prompt);
      localStorage.setItem("summaryPrompt", row.summary_prompt);
      localStorage.setItem("detailsPrompt", row.details_prompt);
      localStorage.setItem(SELECTED_PROMPT_ID_KEY, row.id);
      onActivePromptsChange?.(row.summary_prompt, row.details_prompt);
    },
    [onActivePromptsChange]
  );

  const loadPromptsFromCloud = useCallback(async () => {
    if (!clientKey || clientKey.length < 8) {
      setCloudEnabled(false);
      applyLocalDefaults();
      return;
    }
    setLoadingList(true);
    try {
      const res = await fetch(
        `/api/prompts?client_key=${encodeURIComponent(clientKey)}`
      );
      if (res.status === 503) {
        setCloudEnabled(false);
        applyLocalDefaults();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setCloudEnabled(false);
        applyLocalDefaults();
        return;
      }
      setCloudEnabled(true);
      const list = (data.prompts || []) as PromptRow[];
      setPromptList(list);
      const savedId = localStorage.getItem(SELECTED_PROMPT_ID_KEY);
      const bySaved = savedId ? list.find((p) => p.id === savedId) : undefined;
      const bySeed = list.find((p) => p.source === "seed");
      const row = bySaved || bySeed || list[0];
      if (row) {
        applyRow(row);
      } else {
        applyLocalDefaults();
      }
    } catch {
      setCloudEnabled(false);
      applyLocalDefaults();
    } finally {
      setLoadingList(false);
    }
  }, [clientKey, applyLocalDefaults, applyRow]);

  useEffect(() => {
    void loadPromptsFromCloud();
  }, [loadPromptsFromCloud, promptsRefreshVersion]);

  useEffect(() => {
    if (!cloudEnabled) {
      const savedSummary = localStorage.getItem("summaryPrompt");
      const savedDetails = localStorage.getItem("detailsPrompt");
      const isOldJsonFormat = savedDetails?.includes("JSON 형식이어야 합니다");
      setSummaryPrompt(savedSummary || DEFAULT_SUMMARY_PROMPT);
      setDetailsPrompt(
        isOldJsonFormat ? DEFAULT_DETAILS_PROMPT : savedDetails || DEFAULT_DETAILS_PROMPT
      );
    }
  }, [cloudEnabled]);

  const handleSave = async () => {
    localStorage.setItem("summaryPrompt", summaryPrompt);
    localStorage.setItem("detailsPrompt", detailsPrompt);
    onActivePromptsChange?.(summaryPrompt, detailsPrompt);

    if (cloudEnabled && clientKey) {
      setSaving(true);
      try {
        if (!selectedId) {
          const res = await fetch("/api/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: promptName.trim() || "이름 없음",
              summary_prompt: summaryPrompt,
              details_prompt: detailsPrompt,
              client_key: clientKey,
              source: "user",
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || "저장에 실패했어요.");
            return;
          }
          await loadPromptsFromCloud();
          if (data.prompt) applyRow(data.prompt as PromptRow);
        } else {
          const res = await fetch(`/api/prompts/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_key: clientKey,
              name: promptName.trim() || "이름 없음",
              summary_prompt: summaryPrompt,
              details_prompt: detailsPrompt,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || "저장에 실패했어요.");
            return;
          }
          await loadPromptsFromCloud();
          if (data.prompt) applyRow(data.prompt as PromptRow);
        }
      } catch {
        alert("저장 중 오류가 났어요.");
        return;
      } finally {
        setSaving(false);
      }
    }

    setIsModalOpen(false);
    alert("프롬프트가 저장되었습니다.");
  };

  const handleReset = () => {
    setSummaryPrompt(DEFAULT_SUMMARY_PROMPT);
    setDetailsPrompt(DEFAULT_DETAILS_PROMPT);
  };

  const handleSelectRow = (row: PromptRow) => {
    applyRow(row);
  };

  const handleNewPrompt = async () => {
    if (!cloudEnabled || !clientKey) return;
    setSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `새 프롬프트 ${new Date().toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`,
          summary_prompt: summaryPrompt || DEFAULT_SUMMARY_PROMPT,
          details_prompt: detailsPrompt || DEFAULT_DETAILS_PROMPT,
          client_key: clientKey,
          source: "user",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "만들지 못했어요.");
        return;
      }
      await loadPromptsFromCloud();
      if (data.prompt) applyRow(data.prompt as PromptRow);
    } catch {
      alert("만들기 중 오류가 났어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!cloudEnabled || !selectedId || !clientKey) return;
    const row = promptList.find((p) => p.id === selectedId);
    if (!row || row.source === "seed") return;
    if (!window.confirm(`"${row.name}" 프롬프트를 삭제할까요?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/prompts/${selectedId}?client_key=${encodeURIComponent(clientKey)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "삭제하지 못했어요.");
        return;
      }
      await loadPromptsFromCloud();
    } catch {
      alert("삭제 중 오류가 났어요.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AI MEETING</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
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
          {authEnabled && (
            <div className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 sm:max-w-xs">
              {userEmail ? (
                <span
                  className="truncate text-xs text-gray-600"
                  title={userEmail}
                >
                  {userEmail}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">AI 프롬프트 설정</h2>
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

              {cloudEnabled && (
                <div className="flex flex-col md:flex-row gap-4">
                  <PromptsCloudSection
                    items={promptList}
                    selectedId={selectedId}
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
                        onChange={(e) => setPromptName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                        placeholder="이 프롬프트를 부를 이름"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-bold text-gray-900 text-sm">요약 프롬프트 (Summary)</label>
                      <textarea 
                        value={summaryPrompt}
                        onChange={(e) => setSummaryPrompt(e.target.value)}
                        className="w-full h-28 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none text-sm"
                        placeholder="요약본을 위한 프롬프트를 입력하세요..."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-bold text-gray-900 text-sm">상세 회의록 프롬프트 (Details)</label>
                      <textarea 
                        value={detailsPrompt}
                        onChange={(e) => setDetailsPrompt(e.target.value)}
                        className="w-full h-28 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none text-sm"
                        placeholder="상세 회의록에 포함되어야 할 내용이나 강조할 점을 입력하세요..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {!cloudEnabled && (
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
                    Supabase가 연결되지 않았을 때는 이 기기 안에만 저장돼요. 서버에
                    SUPABASE_SERVICE_ROLE_KEY 등을 넣으면 목록·클라우드 저장을 쓸 수
                    있어요.
                  </p>
                </>
              )}
            </div>

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
    </>
  );
}
