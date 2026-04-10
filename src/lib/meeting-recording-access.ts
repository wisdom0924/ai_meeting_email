import type { User } from "@supabase/supabase-js";

type RecordingAccessRow = {
  user_id: string | null;
  client_key: string;
};

/** 로그인 소유 행은 세션 사용자만, 비로그인 업로드 행은 같은 client_key 일 때만 허용 */
export function canAccessMeetingRecording(
  row: RecordingAccessRow,
  user: User | null,
  clientKey: string
): boolean {
  if (row.user_id != null) {
    return user != null && row.user_id === user.id;
  }
  return clientKey.length >= 8 && row.client_key === clientKey;
}
