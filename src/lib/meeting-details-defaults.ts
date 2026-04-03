/** YYYY-MM-DD (사용자 기기 로컬 기준 오늘) */
function formatTodayMeetingDateNumeric(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** meta["회의 일시"]가 비어 있으면 오늘 날짜(년-월-일, 숫자 형식)로 채웁니다. */
export function withDefaultMeetingDateTime(details: unknown): unknown {
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

  meta["회의 일시"] = formatTodayMeetingDateNumeric();
  return { ...d, meta };
}
