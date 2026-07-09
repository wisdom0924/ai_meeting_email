"use client";

import { useState, useEffect } from "react";
import { usePromptSettings } from "@/hooks/usePromptSettings";
import HeaderToolbar from "@/components/header/HeaderToolbar";
import PromptSettingsModal from "@/components/header/PromptSettingsModal";
import UserGuideModal from "@/components/header/UserGuideModal";

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

  const {
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
    setPromptName,
    setSummaryPrompt,
    setDetailsPrompt,
    loadPromptsFromServer,
    clearSaveMessage,
    handleSave,
    handleReset,
    handleSelectRow,
    handleNewPrompt,
    handleDeletePrompt,
  } = usePromptSettings({
    clientKey,
    promptsRefreshVersion,
    onActivePromptsChange,
  });

  useEffect(() => {
    if (isModalOpen) {
      void loadPromptsFromServer();
    } else {
      clearSaveMessage();
    }
  }, [isModalOpen, loadPromptsFromServer, clearSaveMessage]);

  return (
    <>
      <HeaderToolbar
        onGuideOpen={() => setIsGuideOpen(true)}
        onPromptSettingsOpen={() => setIsModalOpen(true)}
        onRefresh={onRefresh}
        onSendExternal={onSendExternal}
        isSending={isSending}
        onRecordingHistory={onRecordingHistory}
      />

      <PromptSettingsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serverEnabled={serverEnabled}
        isLoggedIn={isLoggedIn}
        hasUnsavedSelection={hasUnsavedSelection}
        activePromptName={activePromptName}
        selectedPromptName={selectedPromptName}
        promptList={promptList}
        selectedId={selectedId}
        activePromptId={activePromptId}
        loadingList={loadingList}
        deleting={deleting}
        saving={saving}
        saveMessage={saveMessage}
        promptName={promptName}
        summaryPrompt={summaryPrompt}
        detailsPrompt={detailsPrompt}
        onPromptNameChange={setPromptName}
        onSummaryPromptChange={setSummaryPrompt}
        onDetailsPromptChange={setDetailsPrompt}
        onSelectRow={handleSelectRow}
        onNewPrompt={() => void handleNewPrompt()}
        onDeletePrompt={() => void handleDeletePrompt()}
        onReset={handleReset}
        onSave={handleSave}
        onClearSaveMessage={clearSaveMessage}
      />

      <UserGuideModal open={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
