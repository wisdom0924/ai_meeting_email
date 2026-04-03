/** Make·노션 등 평문 전송용: 흔한 마크다운 기호만 제거합니다. */
export function stripBasicMarkdown(input: string): string {
  if (input == null || input === "") return input;
  let s = input;
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*\*/g, "");
  s = s.replace(/__/g, "");
  return s;
}

export function deepStripBasicMarkdown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return stripBasicMarkdown(value);
  if (Array.isArray(value)) return value.map(deepStripBasicMarkdown);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepStripBasicMarkdown(v);
    }
    return out;
  }
  return value;
}
