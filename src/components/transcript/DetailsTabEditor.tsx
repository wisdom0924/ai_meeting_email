"use client";

import { Fragment } from "react";
import AutosizeTextarea from "@/components/transcript/AutosizeTextarea";

export const valueTextareaClass =
  "block w-full min-h-[1.75rem] bg-transparent border-0 p-0 text-gray-900 outline-none focus:bg-white/40 rounded-sm " +
  "placeholder:text-gray-300";

type DetailsTabEditorProps = {
  details: unknown;
  onDetailsChange: (next: unknown) => void;
};

export default function DetailsTabEditor({
  details,
  onDetailsChange,
}: DetailsTabEditorProps) {
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

  const d = details as Record<string, unknown>;
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
        value={(d.title as string) ?? ""}
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
            {actionItems.map((item: Record<string, unknown>, idx: number) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-3 pb-4 border-b border-green-100 last:border-0 last:pb-0">
                <AutosizeTextarea
                  className={`${valueTextareaClass} flex-1 min-w-0 font-medium`}
                  value={(item.task as string) ?? ""}
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
                    value={(item.assignee as string) ?? ""}
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
                    value={(item.deadline as string) ?? ""}
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
        {agendas.map((agenda: Record<string, unknown>, idx: number) => (
          <div key={idx}>
            <div className="mb-4 flex items-baseline gap-2">
              <span className="select-none text-lg font-medium text-gray-400">
                {idx + 1}.
              </span>
              <input
                type="text"
                className="min-w-0 flex-1 border-0 bg-transparent text-lg font-medium text-gray-900 outline-none focus:bg-gray-50/80"
                value={(agenda.title as string) ?? ""}
                onChange={(e) => {
                  const next = agendas.map((a: Record<string, unknown>, i: number) =>
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
                className={`${valueTextareaClass} min-h-[2rem] flex-1`}
                value={
                  Array.isArray(agenda.discussions)
                    ? (agenda.discussions as string[]).join("\n")
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  const lines = raw === "" ? [] : raw.split("\n");
                  const next = agendas.map((a: Record<string, unknown>, i: number) =>
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
                className={`${valueTextareaClass} min-h-[2rem] flex-1 whitespace-pre-line font-medium`}
                value={(agenda.decisions as string) ?? ""}
                onChange={(e) => {
                  const next = agendas.map((a: Record<string, unknown>, i: number) =>
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
                className={`${valueTextareaClass} min-h-[2rem] flex-1`}
                value={(agenda.actions as string) ?? ""}
                onChange={(e) => {
                  const next = agendas.map((a: Record<string, unknown>, i: number) =>
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

      {d.memoSummary ? (
        <div className="mb-12">
          <h4 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
            <span className="text-xl" aria-hidden>
              📌
            </span>
            Memo Summary
          </h4>
          <div className="border-l-2 border-yellow-400 bg-yellow-50 px-4 py-1.5 rounded-none flex items-center">
            <AutosizeTextarea
              className="block w-full bg-transparent border-0 p-0 text-gray-800 text-sm font-medium outline-none focus:bg-yellow-100/50 resize-none overflow-hidden whitespace-pre-line leading-snug"
              value={(d.memoSummary as string) ?? ""}
              onChange={(e) =>
                onDetailsChange({ ...d, memoSummary: e.target.value })
              }
              spellCheck={false}
              aria-label="메모 요약"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4 border-t border-gray-100 pt-8">
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
          <span className="select-none text-gray-500">Next Meeting</span>
          <AutosizeTextarea
            className={`${valueTextareaClass} min-h-[2.75rem]`}
            value={(d.nextMeeting as string) ?? ""}
            onChange={(e) =>
              onDetailsChange({ ...d, nextMeeting: e.target.value })
            }
            aria-label="다음 회의"
          />
          <span className="select-none text-gray-500">Notes</span>
          <AutosizeTextarea
            className={`${valueTextareaClass} min-h-[3.5rem]`}
            value={(d.additionalNotes as string) ?? ""}
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
