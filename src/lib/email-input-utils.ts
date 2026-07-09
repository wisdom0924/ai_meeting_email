export function uniqLower(emails: string[]): string[] {
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
export function parseEmailsFromInput(raw: string): string[] {
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = raw.match(re);
  if (!found) return [];
  return uniqLower(found);
}

/** 마지막으로 입력 중인 한 덩어리(쉼표 뒤)와 그 앞 문자열 */
export function splitLastSegment(raw: string): { prefix: string; segment: string } {
  const m = /^([\s\S]*[,;\n]\s*)([^\n,;]*)$/.exec(raw);
  if (m) return { prefix: m[1], segment: m[2] };
  return { prefix: "", segment: raw };
}

export function filterSuggestions(favorites: string[], segment: string): string[] {
  const s = segment.trim().toLowerCase();
  if (!s) return favorites.slice(0, 8);
  return favorites
    .filter((e) => e.toLowerCase().startsWith(s))
    .slice(0, 8);
}

export const emailInputClass =
  "w-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 border-0 border-b border-gray-300 pb-2 pt-0.5 focus:outline-none focus:border-blue-500 focus:ring-0";
