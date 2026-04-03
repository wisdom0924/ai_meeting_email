import type { TranscriptBlock } from "@/types";

const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;

function uniqEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const k = e.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(e.trim());
  }
  return out;
}

/** 회의록·전사·메모에서 글자만 모읍니다. */
export function collectMeetingPlainText(
  summary: string,
  details: unknown,
  fullTranscript: TranscriptBlock[],
  transcript: string
): string {
  const parts: string[] = [];
  if (summary) parts.push(summary);

  if (details != null) {
    if (typeof details === "string") {
      parts.push(details);
    } else if (typeof details === "object") {
      try {
        parts.push(JSON.stringify(details));
      } catch {
        parts.push(String(details));
      }
    }
  }

  for (const b of fullTranscript) {
    if (b.text) parts.push(b.text);
  }
  if (transcript) parts.push(transcript);

  return parts.join("\n");
}

export function extractEmailsFromText(text: string): string[] {
  if (!text) return [];
  const m = text.match(EMAIL_RE);
  return m ? uniqEmails(m) : [];
}

/** meta["참석자"] 등 한 덩어리에서 이메일만 뽑습니다. */
export function emailsFromAttendeeField(raw: unknown): string[] {
  if (raw == null) return [];
  const s = String(raw).trim();
  return s ? extractEmailsFromText(s) : [];
}

export type SuggestedRecipient = { email: string; label: string };

/** 본문 이메일 + 상세 회의록 참석자 필드 기반 추천 (캘린더 연동 전까지) */
export function buildSuggestedRecipients(
  summary: string,
  details: unknown,
  fullTranscript: TranscriptBlock[],
  transcript: string
): SuggestedRecipient[] {
  const blob = collectMeetingPlainText(
    summary,
    details,
    fullTranscript,
    transcript
  );
  const fromBody = extractEmailsFromText(blob);

  let fromMeta: string[] = [];
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const meta = (details as { meta?: Record<string, unknown> }).meta;
    if (meta && typeof meta === "object") {
      fromMeta = emailsFromAttendeeField(meta["참석자"]);
    }
  }

  const ordered = uniqEmails([...fromMeta, ...fromBody]);
  return ordered.map((email) => ({ email, label: email }));
}
