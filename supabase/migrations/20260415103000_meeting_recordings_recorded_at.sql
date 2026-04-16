alter table public.meeting_recordings
  add column if not exists recorded_at timestamptz;

update public.meeting_recordings
set recorded_at = created_at
where recorded_at is null;

alter table public.meeting_recordings
  alter column recorded_at set default now();

create index if not exists meeting_recordings_client_key_recorded_at_idx
  on public.meeting_recordings (client_key, recorded_at desc);
