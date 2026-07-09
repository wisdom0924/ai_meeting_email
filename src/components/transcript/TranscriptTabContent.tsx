"use client";

import { useState } from "react";
import { TranscriptBlock } from "@/types";
import PipelineErrorBanner from "@/components/PipelineErrorBanner";
import SummaryTabBody from "@/components/transcript/SummaryTabBody";
import DetailsTabEditor from "@/components/transcript/DetailsTabEditor";

interface TranscriptTabContentProps {
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

export default function TranscriptTabContent({
  isRecording,
  isTranscribing,
  transcript,
  fullTranscript,
  summary,
  onSummaryChange,
  details,
  onDetailsChange,
  onShareToBoard,
  pipelineError,
  onRetryPipeline,
  retryPipelineLabel,
}: TranscriptTabContentProps) {
  const [activeTab, setActiveTab] = useState<
    "transcript" | "summary" | "details"
  >("transcript");

  return (
    <section className="h-full flex flex-col bg-white">
      <div className="flex items-center px-8 md:px-12 pt-8 border-b border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={() => setActiveTab("transcript")}
          className={`pb-4 px-2 text-sm font-medium transition-all mr-6 ${
            activeTab === "transcript"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
          }`}
        >
          Transcript
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`pb-4 px-2 text-sm font-medium transition-all mr-6 ${
            activeTab === "summary"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`pb-4 px-2 text-sm font-medium transition-all ${
            activeTab === "details"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
          }`}
        >
          Details
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 md:p-12 relative">
        {activeTab === "transcript" && (
          <div className="h-full">
            {!isRecording &&
              fullTranscript.length === 0 &&
              !isTranscribing && (
                <div className="text-gray-400 font-light flex h-full items-center justify-center">
                  Waiting for recording to start...
                </div>
              )}

            <div className="space-y-6 text-gray-800 font-light leading-relaxed pb-8">
              {pipelineError ? (
                <PipelineErrorBanner
                  message={pipelineError}
                  onRetry={onRetryPipeline}
                  retryLabel={retryPipelineLabel}
                  retrying={isTranscribing}
                />
              ) : null}

              {fullTranscript.map((block) => (
                <div key={block.id} className="flex gap-4 group">
                  <div className="text-xs text-gray-400 font-mono pt-1 min-w-[5.25rem] flex-shrink-0 tabular-nums">
                    {block.time}
                  </div>
                  <p className="flex-1 text-gray-800 group-hover:text-black transition-colors">
                    {block.text}
                  </p>
                </div>
              ))}

              {transcript && (
                <div className="flex gap-4 items-start py-4">
                  <div className="text-xs text-gray-400 font-mono pt-1 w-12 flex-shrink-0 flex gap-1">
                    <span
                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                  <p className="flex-1 text-gray-400 animate-pulse">
                    {transcript}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "summary" && (
          <div className="h-full">
            {summary ? (
              <SummaryTabBody
                summary={summary}
                onSummaryChange={onSummaryChange}
              />
            ) : (
              <div className="text-gray-400 font-light flex h-full items-center justify-center">
                Summary will appear here after recording...
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div className="min-h-full flex flex-col">
            {details ? (
              <div className="text-gray-800 font-light text-sm md:text-base leading-relaxed flex-1 pb-8 flex flex-col">
                <div className="text-xs text-gray-400 mb-8 uppercase tracking-widest flex items-center gap-2 cursor-default select-none shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                  항목 이름은 고정 · 오른쪽만 편집
                </div>

                <div className="flex-1">
                  <DetailsTabEditor
                    details={details}
                    onDetailsChange={onDetailsChange}
                  />
                </div>

                {onShareToBoard && (
                  <div className="mt-12 flex justify-end border-t border-gray-200 pt-6 shrink-0 sticky bottom-0 bg-white pb-4 z-10">
                    <button
                      type="button"
                      onClick={onShareToBoard}
                      className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                      </svg>
                      게시판에 공유하기
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 font-light flex h-full items-center justify-center flex-1">
                Detailed notes will appear here...
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
