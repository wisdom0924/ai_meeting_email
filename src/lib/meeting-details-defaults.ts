/** YYYY-MM-DD */
function formatLocalDateNumericFromDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYY-MM-DD (사용자 기기 로컬 기준 오늘) */
function formatTodayMeetingDateNumeric(): string {
  return formatLocalDateNumericFromDate(new Date());
}

function meetingDateFromRecordedIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatLocalDateNumericFromDate(d);
}

/**
 * meta["회의 일시"]가 비어 있으면 채웁니다.
 * `fallbackRecordedAtIso`가 있으면 그 날짜(로컬 기준), 없으면 오늘 날짜를 씁니다.
 */
export function withDefaultMeetingDateTime(
  details: unknown,
  fallbackRecordedAtIso?: string | null
): unknown {
  if (
    details == null ||
    typeof details !== "object" ||
    Array.isArray(details)
  ) {
    return details;
  }

  const d = details as Record<string, unknown>;
  const meta =
    d.meta && typeof d.meta === "object" && !Array.isArray(d.meta)
      ? { ...(d.meta as Record<string, unknown>) }
      : {};

  const raw = meta["회의 일시"];
  if (raw != null && String(raw).trim() !== "") {
    return details;
  }

  let fallback = formatTodayMeetingDateNumeric();
  if (typeof fallbackRecordedAtIso === "string" && fallbackRecordedAtIso.trim()) {
    const fromRec = meetingDateFromRecordedIso(fallbackRecordedAtIso.trim());
    if (fromRec) fallback = fromRec;
  }

  meta["회의 일시"] = fallback;
  return { ...d, meta };
}
