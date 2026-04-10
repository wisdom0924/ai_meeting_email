/**
 * 마이그레이션을 아직 적용하지 않은 DB에서 없는 컬럼을 SELECT/UPDATE 할 때
 * Postgres 오류 코드 42703 (undefined_column) 등이 난다.
 */
export function isUndefinedColumnError(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  if (String(error.code) === "42703") return true;
  const m = (error.message ?? "").toLowerCase();
  return m.includes("does not exist") && m.includes("column");
}
