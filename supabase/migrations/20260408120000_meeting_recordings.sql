-- Meeting audio files in Storage + metadata (accessed only via Next.js service role)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meeting-recordings',
  'meeting-recordings',
  false,
  524288000,
  array[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;

create table if not exists public.meeting_recordings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  storage_path text not null unique,
  original_filename text,
  mime_type text,
  client_key text not null
);

create index if not exists meeting_recordings_client_key_created_at_idx
  on public.meeting_recordings (client_key, created_at desc);

alter table public.meeting_recordings enable row level security;

-- RLS 켜두고 정책은 두지 않음: anon/인증 사용자는 접근 불가, 서비스 롤(서버)만 사용
