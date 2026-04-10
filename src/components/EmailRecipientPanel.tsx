"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

export type EmailRecipientPanelHandle = {
  getResolvedEmails: () => { to: string[]; cc: string[] };
};

function uniqLower(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const t = e.trim();
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** 쉼표·세미콜론·줄바꿈 등이 섞인 문자열에서 이메일 주소를 추출합니다. */
function parseEmailsFromInput(raw: string): string[] {
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = raw.match(re);
  if (!found) return [];
  return uniqLower(found);
}

const inputClass =
  "w-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 border-0 border-b border-gray-300 pb-2 pt-0.5 focus:outline-none focus:border-blue-500 focus:ring-0";

const EmailRecipientPanel = forwardRef<
  EmailRecipientPanelHandle,
  Record<string, unknown>
>(function EmailRecipientPanel(_props, ref) {
  const [toText, setToText] = useState("");
  const [ccText, setCcText] = useState("");

  const getResolvedEmails = useCallback(() => {
    return {
      to: parseEmailsFromInput(toText),
      cc: parseEmailsFromInput(ccText),
    };
  }, [toText, ccText]);

  useImperativeHandle(ref, () => ({ getResolvedEmails }), [getResolvedEmails]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <header className="px-4 py-3.5 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">
          이메일 받는 사람
        </h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          받는 사람과 참조에 메일 주소를 적어 주세요. 여러 명이면 쉼표(,)로
          나열할 수 있어요.
        </p>
      </header>

      <div className="px-4 py-4 space-y-0 divide-y divide-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 pb-3 pt-1">
          <span
            className="inline-flex shrink-0 items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm select-none"
            title="받는 사람"
          >
            받는 사람(T)
          </span>
          <input
            type="text"
            className={inputClass}
            placeholder="example@company.com, 다른사람@mail.com"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            aria-label="받는 사람"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 pb-3 pt-3">
          <span
            className="inline-flex shrink-0 items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm select-none"
            title="참조"
          >
            참조(C)
          </span>
          <input
            type="text"
            className={inputClass}
            placeholder="참조로 넣을 주소 (없으면 비워 두세요)"
            value={ccText}
            onChange={(e) => setCcText(e.target.value)}
            aria-label="참조"
            autoComplete="off"
          />
        </div>
      </div>
    </section>
  );
});

export default EmailRecipientPanel;
