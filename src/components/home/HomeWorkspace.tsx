"use client";

import RecordPanel from "@/components/RecordPanel";
import TranscriptPanel from "@/components/TranscriptPanel";
import EmailRecipientPanel, {
  type EmailRecipientPanelHandle,
} from "@/components/EmailRecipientPanel";
import type { Memo, TranscriptBlock } from "@/types";

type HomeWorkspaceProps = {
  isRecording: boolean;
  recordingTime: number;
  audioLevel: number;
  isTranscribing: boolean;
  serverProcessing: boolean;
  memos: Memo[];
  transcript: string;
  fullTranscript: TranscriptBlock[];
  summary: string;
  details: unknown;
  pipelineError: string | null;
  pipelineFailureKind: string | null;
  retryPipelineLabel: string;
  emailRecipientsRef: React.RefObject<EmailRecipientPanelHandle | null>;
  onToggleRecord: () => void;
  onAddMemo: (text: string) => void;
  onAudioFileSelected: (file: File) => void;
  onSummaryChange: (next: string) => void;
  onDetailsChange: (next: unknown) => void;
  onShareToBoard: () => void;
  onRetryPipeline?: () => void;
};

export default function HomeWorkspace({
  isRecording,
  recordingTime,
  audioLevel,
  isTranscribing,
  serverProcessing,
  memos,
  transcript,
  fullTranscript,
  summary,
  details,
  pipelineError,
  pipelineFailureKind,
  retryPipelineLabel,
  emailRecipientsRef,
  onToggleRecord,
  onAddMemo,
  onAudioFileSelected,
  onSummaryChange,
  onDetailsChange,
  onShareToBoard,
  onRetryPipeline,
}: HomeWorkspaceProps) {
  return (
    <main className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden p-4 md:p-6 gap-6">
      <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <RecordPanel
            isRecording={isRecording}
            recordingTime={recordingTime}
            onToggleRecord={onToggleRecord}
            memos={memos}
            onAddMemo={onAddMemo}
            audioLevel={audioLevel}
            onAudioFileSelected={onAudioFileSelected}
            uploadBusy={isTranscribing}
          />
          <div className="p-4 border-t border-gray-100 shrink-0">
            <p className="text-xs text-gray-500 leading-relaxed">
              녹음을 끝내거나 파일을 올리면 음성이 서버에 저장돼요. 과거
              녹음은 오른쪽 위
              <span className="font-medium text-gray-700"> 히스토리 </span>
              버튼에서 볼 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-4">
        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <TranscriptPanel
            isRecording={isRecording}
            isTranscribing={isTranscribing || serverProcessing}
            transcript={transcript}
            fullTranscript={fullTranscript}
            summary={summary}
            onSummaryChange={onSummaryChange}
            details={details}
            onDetailsChange={onDetailsChange}
            onShareToBoard={onShareToBoard}
            pipelineError={pipelineError}
            onRetryPipeline={
              pipelineError && pipelineFailureKind ? onRetryPipeline : undefined
            }
            retryPipelineLabel={retryPipelineLabel}
          />
        </div>
        <div className="shrink-0 w-full">
          <EmailRecipientPanel ref={emailRecipientsRef} />
        </div>
      </div>
    </main>
  );
}
