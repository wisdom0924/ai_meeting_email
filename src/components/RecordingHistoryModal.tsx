"use client";

import { useEffect } from "react";
import CloudRecordingsPanel from "@/components/CloudRecordingsPanel";
import type { TranscriptBlock } from "@/types";

type RecordingHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  clientKey: string;
  refreshVersion: number;
  memosForAi: string;
  summaryPrompt: string | null;
  detailsPrompt: string | null;
  onProcessed: (payload: {
    transcriptBlocks: TranscriptBlock[];
    summary: string;
    details: unknown;
  }) => void;
  onBusyChange?: (busy: boolean) => void;
};

export default function RecordingHistoryModal({
  open,
  onClose,
  ...panelProps
}: RecordingHistoryModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className="relative z-[1] flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recording-history-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h2
            id="recording-history-title"
            className="text-lg font-bold text-gray-900"
          >
            Recording History
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <CloudRecordingsPanel {...panelProps} variant="dialog" />
        </div>
      </div>
    </div>
  );
}
