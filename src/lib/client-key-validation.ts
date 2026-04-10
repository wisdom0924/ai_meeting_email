/**
 * API에 넘기는 client_key / PostgREST 필터에 끼워 넣기 전 검증.
 * 쉼표·괄호 등으로 .or() 필터를 깨뜨리는 입력을 막습니다.
 */
const CLIENT_KEY_RE = /^[a-zA-Z0-9_.-]{8,200}$/;

export function isValidClientKeyForApi(s: string): boolean {
  return CLIENT_KEY_RE.test(s);
}
