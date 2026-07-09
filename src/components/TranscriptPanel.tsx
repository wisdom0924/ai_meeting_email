"use client";

import { TranscriptBlock } from "@/types";
import TranscriptTabContent from "@/components/transcript/TranscriptTabContent";

interface TranscriptPanelProps {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  fullTranscript: TranscriptBlock[];
  summary?: string;
  onSummaryChange: (next: string) => void;
  details?: unknown;
  onDetailsChange: (next: unknown) => void;
  onShareToBoard?: () => void;
  pipelineError?: string | null;
  onRetryPipeline?: () => void;
  retryPipelineLabel?: string;
}

export default function TranscriptPanel(props: TranscriptPanelProps) {
  return <TranscriptTabContent {...props} />;
}
