import type { TranscriptBlock } from "@/types";

export function buildTranscriptBlocksFromText(text: string): TranscriptBlock[] {
  const nowTime = new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sentences = text
    .split(". ")
    .filter((s) => s.trim().length > 0)
    .map((s) => s + (s.endsWith(".") ? "" : "."));
  const parts = sentences.length > 0 ? sentences : [text];
  const base = Date.now();
  return parts.map((t, index) => ({
    id: `${base}-${index}`,
    text: t,
    time: nowTime,
  }));
}
