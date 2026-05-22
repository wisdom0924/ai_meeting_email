"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export type EmailRecipientPanelHandle = {
  getResolvedEmails: () => { to: string[]; cc: string[] };
  refreshEmailFavorites: () => void;
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

/** 마지막으로 입력 중인 한 덩어리(쉼표 뒤)와 그 앞 문자열 */
function splitLastSegment(raw: string): { prefix: string; segment: string } {
  const m = /^([\s\S]*[,;\n]\s*)([^\n,;]*)$/.exec(raw);
  if (m) return { prefix: m[1], segment: m[2] };
  return { prefix: "", segment: raw };
}

function filterSuggestions(favorites: string[], segment: string): string[] {
  const s = segment.trim().toLowerCase();
  if (!s) return favorites.slice(0, 8);
  return favorites
    .filter((e) => e.toLowerCase().startsWith(s))
    .slice(0, 8);
}

const inputClass =
  "w-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 border-0 border-b border-gray-300 pb-2 pt-0.5 focus:outline-none focus:border-blue-500 focus:ring-0";

type RecipientFieldProps = {
  badge: string;
  badgeTitle: string;
  ariaLabel: string;
  suggestionListId: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  favorites: string[];
  /** 맨 아래 줄 등에서 목록이 잘리지 않게 입력란 위로 펼칩니다 */
  suggestionsOpenUpward?: boolean;
};

function RecipientField({
  badge,
  badgeTitle,
  ariaLabel,
  suggestionListId,
  placeholder,
  value,
  onChange,
  favorites,
  suggestionsOpenUpward = false,
}: RecipientFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { prefix, segment } = useMemo(
    () => splitLastSegment(value),
    [value]
  );
  const matches = useMemo(
    () => filterSuggestions(favorites, segment),
    [favorites, segment]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [matches.join("|")]);

  const applyPick = useCallback(
    (email: string) => {
      onChange(prefix + email);
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [onChange, prefix]
  );

  const showList = open && matches.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (e.key === "ArrowDown" && matches.length > 0) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[activeIndex];
      if (pick) applyPick(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
      <span
        className="inline-flex shrink-0 items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm select-none"
        title={badgeTitle}
      >
        {badge}
      </span>
      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (matches.length > 0) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 180);
          }}
          aria-label={ariaLabel}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? suggestionListId : undefined}
          aria-autocomplete="list"
        />
        {showList && (
          <ul
            id={suggestionListId}
            role="listbox"
            className={`absolute left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg ${
              suggestionsOpenUpward
                ? "bottom-full mb-1"
                : "top-full mt-1"
            }`}
          >
            {matches.map((email, idx) => (
              <li key={email} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`flex w-full px-3 py-2 text-left hover:bg-blue-50 ${
                    idx === activeIndex ? "bg-blue-50" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyPick(email)}
                >
                  {email}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const EmailRecipientPanel = forwardRef<
  EmailRecipientPanelHandle,
  Record<string, unknown>
>(function EmailRecipientPanel(_props, ref) {
  const [toText, setToText] = useState("");
  const [ccText, setCcText] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const loadFavorites = useCallback(async () => {
    // FastAPI 서버에 자주 쓰는 이메일 저장하는 기능은 나중에 추가할 예정입니다.
    setLoggedIn(!!localStorage.getItem("user_id"));
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
    !loggedIn
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
