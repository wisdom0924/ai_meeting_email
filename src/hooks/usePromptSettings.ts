"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_DETAILS_PROMPT,
  SELECTED_PROMPT_ID_KEY,
} from "@/lib/prompts";
import type { PromptRow } from "@/lib/prompt-row";
import { isUsableRecordingClientKey } from "@/lib/recording-client-key";
import {
  createPrompt,
  deletePrompt,
  fetchPrompts,
  updatePrompt,
} from "@/lib/prompts-api";
import { useAuthStore } from "@/store/auth-store";

type UsePromptSettingsOptions = {
  clientKey?: string;
  promptsRefreshVersion?: number;
  onActivePromptsChange?: (summary: string | null, details: string | null) => void;
};

export function usePromptSettings({
  clientKey = "",
  promptsRefreshVersion = 0,
  onActivePromptsChange,
}: UsePromptSettingsOptions) {
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [detailsPrompt, setDetailsPrompt] = useState("");
  const [promptName, setPromptName] = useState("");

  const [serverEnabled, setServerEnabled] = useState(false);
  const [promptList, setPromptList] = useState<PromptRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { isLoggedIn } = useAuthStore();

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
    serverEnabled && selectedId !== null && selectedId !== activePromptId;

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
    if (!serverEnabled) {
      const savedSummary = localStorage.getItem("summaryPrompt");
      const savedDetails = localStorage.getItem("detailsPrompt");
      const isOldJsonFormat = savedDetails?.includes("JSON 형식이어야 합니다");
      setSummaryPrompt(savedSummary || DEFAULT_SUMMARY_PROMPT);
      setDetailsPrompt(
        isOldJsonFormat
          ? DEFAULT_DETAILS_PROMPT
          : savedDetails || DEFAULT_DETAILS_PROMPT
      );
    }
  }, [serverEnabled]);

  const clearSaveMessage = useCallback(() => setSaveMessage(null), []);

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

  return {
    summaryPrompt,
    setSummaryPrompt,
    detailsPrompt,
    setDetailsPrompt,
    promptName,
    setPromptName,
    serverEnabled,
    promptList,
    selectedId,
    activePromptId,
    loadingList,
    saving,
    deleting,
    saveMessage,
    isLoggedIn,
    activePromptName,
    selectedPromptName,
    hasUnsavedSelection,
    loadPromptsFromServer,
    clearSaveMessage,
    handleSave,
    handleReset,
    handleSelectRow,
    handleNewPrompt,
    handleDeletePrompt,
  };
}
