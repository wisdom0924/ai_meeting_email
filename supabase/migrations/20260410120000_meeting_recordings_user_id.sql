-- 로그인한 사용자별로 클라우드 녹음을 분리하기 위한 소유자 컬럼
alter table public.meeting_recordings
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists meeting_recordings_user_id_created_at_idx
  on public.meeting_recordings (user_id, created_at desc);

comment on column public.meeting_recordings.user_id is
  '로그인 상태로 업로드한 경우 auth.users.id; 비로그인 업로드는 null';
