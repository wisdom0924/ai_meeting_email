"use client";

import {
  Fragment,
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { TranscriptBlock } from "@/types";

/** 안쪽 스크롤·리사이즈 없이 줄 수만큼 높이 확장 (페이지는 바깥 한 번만 스크롤) */
function AutosizeTextarea({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const value = props.value ?? "";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      {...props}
      className={`${className} resize-none overflow-hidden`}
    />
  );
}

const valueTextareaClass =
  "w-full min-h-[1.75rem] bg-transparent border-0 p-0 text-gray-900 outline-none focus:bg-white/40 rounded-sm " +
  "placeholder:text-gray-300";

interface TranscriptPanelProps {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  fullTranscript: TranscriptBlock[];
  summary?: string;
  /** 요약 탭: textarea와 부모 state 동기화 (엔터·줄바꿈 반영) */
  onSummaryChange: (next: string) => void;
  details?: any;
  /** 상세 탭: 값만 수정 (라벨·소제목은 DOM에서 고정) */
  onDetailsChange: (next: any) => void;
}

/** 녹음 타이머 등으로 부모가 자주 리렌더돼도, 요약 문자열이 같으면 다시 그리지 않음 → textarea 줄바꿈 유지 */
const SummaryTabBody = memo(function SummaryTabBody({
  summary,
  onSummaryChange,
}: {
  summary: string;
  onSummaryChange: (next: string) => void;
}) {
  return (
    <AutosizeTextarea
      className="block w-full min-h-[12rem] cursor-text rounded-none border-0 bg-transparent p-0 pb-8 font-light leading-relaxed text-gray-700 outline-none transition-colors focus:bg-gray-50 focus:ring-0 whitespace-pre-wrap"
      value={summary}
      onChange={(e) => onSummaryChange(e.target.value)}
      spellCheck={false}
      aria-label="요약 편집"
    />
  );
});

function DetailsTabEditor({
  details,
  onDetailsChange,
}: {
  details: any;
  onDetailsChange: (next: any) => void;
}) {
  if (typeof details === "string") {
    return (
      <AutosizeTextarea
        className={`${valueTextareaClass} min-h-[16rem] font-medium leading-relaxed whitespace-pre-wrap`}
        value={details}
        onChange={(e) => onDetailsChange(e.target.value)}
        spellCheck={false}
        aria-label="상세 회의록(텍스트)"
      />
    );
  }

  const d = details;
  const meta = (d.meta && typeof d.meta === "object" ? d.meta : {}) as Record<
    string,
    unknown
  >;
  const actionItems = Array.isArray(d.actionItems) ? d.actionItems : [];
  const agendas = Array.isArray(d.agendas) ? d.agendas : [];

  return (
    <>
      <input
        type="text"
        className="mb-8 w-full border-0 bg-transparent text-2xl font-bold tracking-tight text-gray-900 outline-none focus:bg-gray-50/80"
        value={d.title ?? ""}
        onChange={(e) => onDetailsChange({ ...d, title: e.target.value })}
        aria-label="회의 제목"
      />

      <div className="mb-10 border-l-2 border-gray-900 bg-gray-50 p-6 rounded-none">
        <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
          {Object.keys(meta).map((key) => (
            <Fragment key={key}>
              <span className="select-none pt-0.5 text-gray-500 shrink-0">
                {key}
              </span>
              <AutosizeTextarea
                className={`${valueTextareaClass} min-h-[2.75rem]`}
                value={meta[key] == null ? "" : String(meta[key])}
                onChange={(e) =>
                  onDetailsChange({
                    ...d,
                    meta: { ...meta, [key]: e.target.value },
                  })
                }
                aria-label={key}
              />
            </Fragment>
          ))}
        </div>
      </div>

      {actionItems.length > 0 && (
        <div className="mb-12">
          <h4 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
            <span className="text-xl" aria-hidden>
              ✅
            </span>
            To Do List
          </h4>
          <div className="space-y-3 border-l-2 border-green-500 bg-green-50/30 p-6 rounded-none">
            {actionItems.map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-3 pb-4 border-b border-green-100 last:border-0 last:pb-0">
                <AutosizeTextarea
                  className={`${valueTextareaClass} flex-1 min-w-0 font-medium`}
                  value={item.task ?? ""}
                  placeholder="할 일 내용"
                  onChange={(e) => {
                    const next = [...actionItems];
                    next[idx] = { ...next[idx], task: e.target.value };
                    onDetailsChange({ ...d, actionItems: next });
                  }}
                  aria-label={`할 일 ${idx + 1}`}
                />
                <div className="flex items-center gap-2 text-sm shrink-0">
                  <span className="text-gray-400">담당:</span>
                  <input
                    type="text"
                    className="w-20 md:w-24 bg-transparent border-b border-gray-300 px-1 py-0.5 text-gray-700 outline-none focus:border-gray-900 placeholder:text-gray-400 text-center"
                    value={item.assignee ?? ""}
                    placeholder="지정 안됨"
                    onChange={(e) => {
                      const next = [...actionItems];
                      next[idx] = { ...next[idx], assignee: e.target.value };
                      onDetailsChange({ ...d, actionItems: next });
                    }}
                    aria-label={`할 일 ${idx + 1} 담당자`}
                  />
                  <span className="text-gray-400 ml-1 md:ml-2">기한:</span>
                  <input
                    type="text"
                    className="w-24 md:w-28 bg-transparent border-b border-gray-300 px-1 py-0.5 text-gray-700 outline-none focus:border-gray-900 placeholder:text-gray-400 text-center"
                    value={item.deadline ?? ""}
                    placeholder="기한 없음"
                    onChange={(e) => {
                      const next = [...actionItems];
                      next[idx] = { ...next[idx], deadline: e.target.value };
                      onDetailsChange({ ...d, actionItems: next });
                    }}
                    aria-label={`할 일 ${idx + 1} 기한`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-12 space-y-12">
        {agendas.map((agenda: any, idx: number) => (
          <div key={idx}>
            <div className="mb-4 flex items-baseline gap-2">
              <span className="select-none text-lg font-medium text-gray-400">
                {idx + 1}.
              </span>
              <input
                type="text"
                className="min-w-0 flex-1 border-0 bg-transparent text-lg font-medium text-gray-900 outline-none focus:bg-gray-50/80"
                value={agenda.title ?? ""}
                onChange={(e) => {
                  const next = agendas.map((a: any, i: number) =>
                    i === idx ? { ...a, title: e.target.value } : a
                  );
                  onDetailsChange({ ...d, agendas: next });
                }}
                aria-label={`안건 ${idx + 1} 제목`}
              />
            </div>

            <div className="mb-4 flex items-start gap-2">
              <span className="w-24 flex-shrink-0 select-none pt-0.5 text-gray-500">
                Discussion
              </span>
              <AutosizeTextarea
                className={`${valueTextareaClass} min-h-[4rem] flex-1`}
                value={
                  Array.isArray(agenda.discussions)
                    ? agenda.discussions.join("\n")
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  const lines =
                    raw === "" ? [] : raw.split("\n");
                  const next = agendas.map((a: any, i: number) =>
                    i === idx ? { ...a, discussions: lines } : a
                  );
                  onDetailsChange({ ...d, agendas: next });
                }}
                spellCheck={false}
                aria-label={`안건 ${idx + 1} 논의`}
              />
            </div>

            <div className="mb-4 flex items-start gap-2">
              <span className="w-24 flex-shrink-0 select-none pt-0.5 text-gray-500">
                Decisions
              </span>
              <AutosizeTextarea
                className={`${valueTextareaClass} min-h-[3rem] flex-1 whitespace-pre-line font-medium`}
                value={agenda.decisions ?? ""}
                onChange={(e) => {
                  const next = agendas.map((a: any, i: number) =>
                    i === idx ? { ...a, decisions: e.target.value } : a
                  );
                  onDetailsChange({ ...d, agendas: next });
                }}
                spellCheck={false}
                aria-label={`안건 ${idx + 1} 결정`}
              />
            </div>

            <div className="flex items-start gap-2">
              <span className="w-24 flex-shrink-0 select-none pt-0.5 text-gray-500">
                Action Items
              </span>
              <AutosizeTextarea
                className={`${valueTextareaClass} min-h-[3rem] flex-1`}
                value={agenda.actions ?? ""}
                onChange={(e) => {
                  const next = agendas.map((a: any, i: number) =>
                    i === idx ? { ...a, actions: e.target.value } : a
                  );
                  onDetailsChange({ ...d, agendas: next });
                }}
                spellCheck={false}
                aria-label={`안건 ${idx + 1} 액션`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-12">
        <h4 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
          <span className="text-xl" aria-hidden>
            📌
          </span>
          Memo Summary
        </h4>
        <div className="border-l-2 border-yellow-400 bg-yellow-50 p-6 rounded-none">
          <AutosizeTextarea
            className={`${valueTextareaClass} min-h-[5rem] text-gray-800 whitespace-pre-line leading-relaxed`}
            value={d.memoSummary ?? ""}
            onChange={(e) =>
              onDetailsChange({ ...d, memoSummary: e.target.value })
            }
            spellCheck={false}
            aria-label="메모 요약"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-8">
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
          <span className="select-none text-gray-500">Next Meeting</span>
          <AutosizeTextarea
            className={`${valueTextareaClass} min-h-[2.75rem]`}
            value={d.nextMeeting ?? ""}
            onChange={(e) =>
              onDetailsChange({ ...d, nextMeeting: e.target.value })
            }
            aria-label="다음 회의"
          />
          <span className="select-none text-gray-500">Notes</span>
          <AutosizeTextarea
            className={`${valueTextareaClass} min-h-[3.5rem]`}
            value={d.additionalNotes ?? ""}
            onChange={(e) =>
              onDetailsChange({ ...d, additionalNotes: e.target.value })
            }
            aria-label="추가 노트"
          />
        </div>
      </div>
    </>
  );
}

export default function TranscriptPanel({
  isRecording,
  isTranscribing,
  transcript,
  fullTranscript,
  summary,
  onSummaryChange,
  details,
  onDetailsChange,
}: TranscriptPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "transcript" | "summary" | "details"
  >("transcript");

  return (
    <section className="h-full flex flex-col bg-white">
      {/* 탭 네비게이션 */}
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

      {/* 탭 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12">
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
          <div className="h-full">
            {details ? (
              <div className="text-gray-800 font-light text-sm md:text-base leading-relaxed h-full pb-8">
                <div className="text-xs text-gray-400 mb-8 uppercase tracking-widest flex items-center gap-2 cursor-default select-none">
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

                <DetailsTabEditor
                  details={details}
                  onDetailsChange={onDetailsChange}
                />
              </div>
            ) : (
              <div className="text-gray-400 font-light flex h-full items-center justify-center">
                Detailed notes will appear here...
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
