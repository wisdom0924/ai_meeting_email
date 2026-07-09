"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Memo } from "@/types";
import Header from "@/components/Header";
import RecordingHistoryModal from "@/components/RecordingHistoryModal";
import HomeWorkspace from "@/components/home/HomeWorkspace";
import { type EmailRecipientPanelHandle } from "@/components/EmailRecipientPanel";
import { withDefaultMeetingDateTime } from "@/lib/meeting-details-defaults";
import { useAuthStore } from "@/store/auth-store";
import { useMeetingPipeline } from "@/hooks/useMeetingPipeline";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useMeetingActions } from "@/hooks/useMeetingActions";

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const memosRef = useRef<Memo[]>([]);
  useEffect(() => {
    memosRef.current = memos;
  }, [memos]);

  const [isSending, setIsSending] = useState(false);
  const [recordingClientKey, setRecordingClientKey] = useState("");
  const [serverListVersion, setServerListVersion] = useState(0);
  const [promptListVersion, setPromptListVersion] = useState(0);
  const [promptSnapshot, setPromptSnapshot] = useState<{
    summary: string | null;
    details: string | null;
  }>({ summary: null, details: null });
  const [serverProcessing, setServerProcessing] = useState(false);
  const [recordingHistoryOpen, setRecordingHistoryOpen] = useState(false);

  const { userId, accessToken, isHydrated } = useAuthStore();
  const recordingClientKeyRef = useRef("");
  const isRecordingRef = useRef(false);
  const emailRecipientsRef = useRef<EmailRecipientPanelHandle>(null);

  useEffect(() => {
    recordingClientKeyRef.current = recordingClientKey;
  }, [recordingClientKey]);

  useEffect(() => {
    if (!isHydrated || !userId) return;
    setRecordingClientKey(String(userId));
    setServerListVersion((v) => v + 1);
  }, [isHydrated, userId]);

  useEffect(() => {
    setPromptSnapshot({
      summary: localStorage.getItem("summaryPrompt"),
      details: localStorage.getItem("detailsPrompt"),
    });
  }, []);

  const handleActivePromptsChange = useCallback(
    (summary: string | null, details: string | null) => {
      setPromptSnapshot({ summary, details });
    },
    []
  );

  const memosForAi = useMemo(
    () =>
      memos
        .filter((m) => m.type !== "system")
        .map((m) => `[${m.time}] ${m.text}`)
        .join("\n"),
    [memos]
  );

  const pipeline = useMeetingPipeline({
    userId,
    accessToken,
    recordingClientKeyRef,
    memosRef,
    isRecordingRef,
    setMemos,
    setServerListVersion,
    setPromptListVersion,
  });

  const recording = useAudioRecording({
    processAudioBlob: pipeline.processAudioBlob,
    setMemos,
    onRecordingStart: () => {
      pipeline.setTranscript("");
      pipeline.setSummary("");
      pipeline.setDetails(null);
    },
    onMicError: (message) => pipeline.setTranscript(message),
  });

  useEffect(() => {
    isRecordingRef.current = recording.isRecording;
  }, [recording.isRecording]);

  const actions = useMeetingActions({
    memos,
    setMemos,
    fullTranscript: pipeline.fullTranscript,
    transcript: pipeline.transcript,
    summary: pipeline.summary,
    details: pipeline.details,
    emailRecipientsRef,
    setIsSending,
  });

  const handleAddMemo = actions.handleAddMemo;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-gray-50 text-gray-900 font-sans">
      <Header
        onRefresh={actions.handleRefresh}
        onSendExternal={() => void actions.handleSendExternal()}
        isSending={isSending}
        onRecordingHistory={() => setRecordingHistoryOpen(true)}
        clientKey={recordingClientKey}
        promptsRefreshVersion={promptListVersion}
        onActivePromptsChange={handleActivePromptsChange}
      />

      <RecordingHistoryModal
        open={recordingHistoryOpen}
        onClose={() => setRecordingHistoryOpen(false)}
        clientKey={recordingClientKey}
        refreshVersion={serverListVersion}
        memosForAi={memosForAi}
        summaryPrompt={promptSnapshot.summary}
        detailsPrompt={promptSnapshot.details}
        onBusyChange={setServerProcessing}
        onProcessed={({ transcriptBlocks, summary: nextSummary, details: nextDetails }) => {
          setRecordingHistoryOpen(false);
          pipeline.setFullTranscript(transcriptBlocks);
          pipeline.setSummary(nextSummary || "");
          pipeline.setDetails(
            nextDetails != null
              ? withDefaultMeetingDateTime(nextDetails)
              : null
          );
          pipeline.resetPipelineState();
        }}
      />

      <HomeWorkspace
        isRecording={recording.isRecording}
        recordingTime={recording.recordingTime}
        audioLevel={recording.audioLevel}
        isTranscribing={pipeline.isTranscribing}
        serverProcessing={serverProcessing}
        memos={memos}
        transcript={pipeline.transcript}
        fullTranscript={pipeline.fullTranscript}
        summary={pipeline.summary}
        details={pipeline.details}
        pipelineError={pipeline.pipelineError}
        pipelineFailureKind={pipeline.pipelineFailureKind}
        retryPipelineLabel={pipeline.retryPipelineLabel}
        emailRecipientsRef={emailRecipientsRef}
        onToggleRecord={() => void recording.handleToggleRecord()}
        onAddMemo={handleAddMemo}
        onAudioFileSelected={(file) => void pipeline.handleAudioFileSelected(file)}
        onSummaryChange={pipeline.setSummary}
        onDetailsChange={pipeline.setDetails}
        onShareToBoard={actions.handleShareToBoard}
        onRetryPipeline={() => void pipeline.handleRetryPipeline()}
      />
    </div>
  );
}
