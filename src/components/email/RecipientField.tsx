"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emailInputClass,
  filterSuggestions,
  splitLastSegment,
} from "@/lib/email-input-utils";

export type RecipientFieldProps = {
  badge: string;
  badgeTitle: string;
  ariaLabel: string;
  suggestionListId: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  favorites: string[];
  suggestionsOpenUpward?: boolean;
};

export default function RecipientField({
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
          className={emailInputClass}
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
