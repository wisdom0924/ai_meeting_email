"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useAuthStore } from "@/store/auth-store";
import RecipientField from "@/components/email/RecipientField";
import { parseEmailsFromInput } from "@/lib/email-input-utils";

export type EmailRecipientPanelHandle = {
  getResolvedEmails: () => { to: string[]; cc: string[] };
  refreshEmailFavorites: () => void;
};

const EmailRecipientPanel = forwardRef<
  EmailRecipientPanelHandle,
  Record<string, unknown>
>(function EmailRecipientPanel(_props, ref) {
  const [toText, setToText] = useState("");
  const [ccText, setCcText] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const loadFavorites = useCallback(async () => {
    setFavorites([]);
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const getResolvedEmails = useCallback(() => {
    return {
      to: parseEmailsFromInput(toText),
      cc: parseEmailsFromInput(ccText),
    };
  }, [toText, ccText]);

  useImperativeHandle(
    ref,
    () => ({
      getResolvedEmails,
      refreshEmailFavorites: () => void loadFavorites(),
    }),
    [getResolvedEmails, loadFavorites]
  );

  const hint =
    !isLoggedIn
      ? "로그인하면 전송에 쓴 주소가 저장되고, 아래에서 자동완성으로 고를 수 있어요. (기능 준비 중)"
      : "저장된 주소는 입력할 때 목록에서 고를 수 있어요. 전송할 때마다 받는 사람·참조 주소가 갱신됩니다. (기능 준비 중)";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="px-4 py-3.5 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">
          이메일 받는 사람
        </h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          받는 사람과 참조에 메일 주소를 적어 주세요. 여러 명이면 쉼표(,)로
          나열할 수 있어요.
        </p>
        {hint && (
          <p className="text-xs text-blue-700/90 mt-2 leading-relaxed">{hint}</p>
        )}
      </header>

      <div className="px-4 py-4 space-y-0 divide-y divide-gray-200">
        <div className="pb-3 pt-1">
          <RecipientField
            badge="받는 사람(T)"
            badgeTitle="받는 사람"
            ariaLabel="받는 사람"
            suggestionListId="email-recipient-to-suggestions"
            placeholder="example@company.com, 다른사람@mail.com"
            value={toText}
            onChange={setToText}
            favorites={favorites}
            suggestionsOpenUpward
          />
        </div>

        <div className="pb-3 pt-3">
          <RecipientField
            badge="참조(C)"
            badgeTitle="참조"
            ariaLabel="참조"
            suggestionListId="email-recipient-cc-suggestions"
            placeholder="참조로 넣을 주소 (없으면 비워 두세요)"
            value={ccText}
            onChange={setCcText}
            favorites={favorites}
            suggestionsOpenUpward
          />
        </div>
      </div>
    </section>
  );
});

export default EmailRecipientPanel;
