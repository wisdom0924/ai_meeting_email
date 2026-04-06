import type { TranscriptBlock } from "@/types";
import type { StoredContact, StoredGroup } from "@/types/email-recipients";

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

/**
 * 요약·상세 회의록·전사 + (선택) 사용자 메모장 텍스트를 한 덩어리로 모읍니다.
 * 메모는 AI 분석 전에도 넣을 수 있어 추천 수신자에 즉시 반영됩니다.
 */
export function collectMeetingPlainText(
  summary: string,
  details: unknown,
  fullTranscript: TranscriptBlock[],
  transcript: string,
  userMemosPlain?: string
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

  const memos = userMemosPlain?.trim();
  if (memos) parts.push(memos);

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

export type SuggestedRecipient = {
  email: string;
  label: string;
  /** 자주 쓰는 주소에 저장된 이름이 회의 텍스트에 있을 때 */
  fromSavedNameMatch?: boolean;
};

/** 한글·한자·가나 등: 글에 그 이름 문자열이 포함되면 매칭 */
const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u;

function labelAppearsInMeetingText(label: string, text: string): boolean {
  const t = label.trim();
  if (t.length < 2) return false;
  if (CJK_RE.test(t)) {
    return text.includes(t);
  }
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp(`\\b${escaped}\\b`, "iu").test(text);
  } catch {
    return text.toLowerCase().includes(t.toLowerCase());
  }
}

function paletteEmailEntries(
  contacts: StoredContact[],
  groups: StoredGroup[]
): { email: string; label: string }[] {
  const out: { email: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const c of contacts) {
    const email = c.email.trim();
    if (!email) continue;
    const k = email.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      email: c.email,
      label: (c.label || email).trim(),
    });
  }
  for (const g of groups) {
    for (const m of g.members) {
      const email = m.email.trim();
      if (!email) continue;
      const k = email.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        email: m.email,
        label: (m.label || email).trim(),
      });
    }
  }
  return out;
}

/**
 * 회의 텍스트에 이메일은 없지만 이름만 있을 때,
 * 자주 쓰는 주소·그룹 구성원의 표시 이름(label)이 글 안에 나오면 해당 주소를 추천합니다.
 * (label이 비어 있거나 이메일과 동일하면 이름 매칭에서 제외)
 */
export function buildNameMatchedSuggestedRecipients(
  plainText: string,
  contacts: StoredContact[],
  groups: StoredGroup[]
): SuggestedRecipient[] {
  if (!plainText.trim()) return [];
  const entries = paletteEmailEntries(contacts, groups);
  const out: SuggestedRecipient[] = [];
  const seen = new Set<string>();
  for (const { email, label } of entries) {
    if (label.toLowerCase() === email.toLowerCase()) continue;
    if (!labelAppearsInMeetingText(label, plainText)) continue;
    const k = email.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ email, label, fromSavedNameMatch: true });
  }
  return out;
}

/** 텍스트에서 찾은 주소 + 이름 매칭 주소를 합칩니다. 같은 이메일이면 표시 이름은 주소록 쪽을 우선합니다. */
export function mergeSuggestedRecipients(
  fromEmails: SuggestedRecipient[],
  fromNames: SuggestedRecipient[]
): SuggestedRecipient[] {
  const map = new Map<string, SuggestedRecipient>();
  const order: string[] = [];

  const pushOrder = (email: string) => {
    const k = email.toLowerCase();
    if (!order.includes(k)) order.push(k);
  };

  for (const s of fromEmails) {
    const k = s.email.toLowerCase();
    map.set(k, { ...s });
    pushOrder(s.email);
  }
  for (const s of fromNames) {
    const k = s.email.toLowerCase();
    const ex = map.get(k);
    const preferLabel =
      s.fromSavedNameMatch &&
      s.label.trim() &&
      s.label.toLowerCase() !== s.email.toLowerCase();
    if (ex) {
      if (preferLabel) {
        map.set(k, {
          ...ex,
          label: s.label,
          fromSavedNameMatch: true,
        });
      }
    } else {
      map.set(k, s);
      pushOrder(s.email);
    }
  }
  return order.map((k) => map.get(k)!);
}

/** 본문 이메일 + 상세 회의록 참석자 필드 기반 추천 (캘린더 연동 전까지) */
export function buildSuggestedRecipients(
  summary: string,
  details: unknown,
  fullTranscript: TranscriptBlock[],
  transcript: string,
  userMemosPlain?: string
): SuggestedRecipient[] {
  const blob = collectMeetingPlainText(
    summary,
    details,
    fullTranscript,
    transcript,
    userMemosPlain
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
