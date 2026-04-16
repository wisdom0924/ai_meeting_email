import type { TranscriptBlock } from "@/types";

function resolveRecordedDate(recordedAt?: string | Date | null): Date {
  if (recordedAt instanceof Date && !Number.isNaN(recordedAt.getTime())) {
    return recordedAt;
  }
  if (typeof recordedAt === "string" && recordedAt.trim()) {
    const parsed = new Date(recordedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

/** AssemblyAI `words` 항목 (밀리초 오프셋) */
type AlignWord = { text: string; start: number; charStart: number; charEnd: number };

function parseAssemblyWords(words: unknown): Array<{ text: string; start: number }> | null {
  if (!Array.isArray(words) || words.length === 0) return null;
  const out: Array<{ text: string; start: number }> = [];
  for (const w of words) {
    if (!w || typeof w !== "object") return null;
    const o = w as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : null;
    const start = typeof o.start === "number" && Number.isFinite(o.start) ? o.start : null;
    if (text == null || start == null) return null;
    out.push({ text, start });
  }
  return out;
}

/**
 * 전사 본문과 단어 배열이 같은 문자열을 이루는지 검사해, 각 단어의 글자 구간을 잡습니다.
 * (형태가 맞지 않으면 null → 호출 측에서 문장-only 타임스탬프로 폴백)
 */
function alignWordsToText(
  words: Array<{ text: string; start: number }>,
  text: string
): AlignWord[] | null {
  let charIdx = 0;
  const out: AlignWord[] = [];
  for (const w of words) {
    while (charIdx < text.length && /\s/.test(text[charIdx])) charIdx++;
    if (text.slice(charIdx, charIdx + w.text.length) !== w.text) {
      return null;
    }
    out.push({
      text: w.text,
      start: w.start,
      charStart: charIdx,
      charEnd: charIdx + w.text.length,
    });
    charIdx += w.text.length;
  }
  while (charIdx < text.length && /\s/.test(text[charIdx])) charIdx++;
  if (charIdx !== text.length) return null;
  return out;
}

function splitSentenceParts(text: string): string[] {
  const sentences = text
    .split(". ")
    .filter((s) => s.trim().length > 0)
    .map((s) => s + (s.endsWith(".") ? "" : "."));
  return sentences.length > 0 ? sentences : [text];
}

/** 녹음 시작(또는 기준) 시각 + 음성 파일 안에서의 오프셋(ms) → 벽시계 시각 문자열 */
function formatWallTimeFromOffset(
  anchor: Date,
  offsetMs: number
): string {
  return new Date(anchor.getTime() + offsetMs).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 전사 텍스트를 문장 단위 블록으로 나눕니다.
 * `words`가 있으면(AssemblyAI) 문장이 **음성에서 시작된 시각**에 맞춰 타임스탬프를 붙입니다.
 * 없거나 맞춤에 실패하면 기존처럼 기준 시각 하나만 씁니다.
 */
export function buildTranscriptBlocksFromText(
  text: string,
  recordedAt?: string | Date | null,
  words?: unknown
): TranscriptBlock[] {
  const anchor = resolveRecordedDate(recordedAt ?? null);
  const parsed = parseAssemblyWords(words);
  /** AssemblyAI 본문과 단어 배열은 공백만 다를 때가 많아 한 줄로 맞춥니다. */
  const flatText = text.replace(/\s+/g, " ").trim();
  const aligned =
    parsed && flatText ? alignWordsToText(parsed, flatText) : null;

  const sentences = splitSentenceParts(flatText || text);
  const parts = sentences.length > 0 ? sentences : [text];
  const base = Date.now();

  if (!aligned || aligned.length === 0) {
    const recordedTime = anchor.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return parts.map((t, index) => ({
      id: `${base}-${index}`,
      text: t,
      time: recordedTime,
    }));
  }

  let textOffset = 0;
  return parts.map((part, index) => {
    const sentStart = textOffset;
    const sentEnd = textOffset + part.length;
    const first = aligned.find((w) => w.charEnd > sentStart && w.charStart < sentEnd);
    const startMs = first?.start ?? aligned[0].start;
    textOffset += part.length;
    if (index < parts.length - 1) textOffset += 2;

    return {
      id: `${base}-${index}`,
      text: part,
      time: formatWallTimeFromOffset(anchor, startMs),
    };
  });
}
