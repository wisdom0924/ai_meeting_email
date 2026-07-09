export function toSafeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

export function buildMeetingMemoFileName(title: string, meetingDate: string): string {
  const safeTitle = toSafeFileNamePart(title);
  const safeDate = toSafeFileNamePart(meetingDate);
  if (safeTitle) {
    return `${safeTitle}_${safeDate}_회의메모.txt`;
  }
  return `${safeDate}_회의메모.txt`;
}

export function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function toIsoFromFileLastModified(lastModified: number): string | null {
  if (!Number.isFinite(lastModified) || lastModified <= 0) return null;
  const d = new Date(lastModified);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function getDefaultMeetingDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
