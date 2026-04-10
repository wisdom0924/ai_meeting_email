-- 클라우드 녹음별 AI 분석 결과 캐시 (불러오기 시 재분석 비용 절감)

alter table public.meeting_recordings
  add column if not exists ai_processed_at timestamptz,
  add column if not exists ai_transcript_blocks jsonb,
  add column if not exists ai_summary text,
  add column if not exists ai_details jsonb;

comment on column public.meeting_recordings.ai_processed_at is
  '저장된 전사·요약·상세가 있을 때 마지막으로 갱신한 시각';
comment on column public.meeting_recordings.ai_transcript_blocks is
  '전사 블록 배열 (id, text, time)';
comment on column public.meeting_recordings.ai_summary is '요약 텍스트';
comment on column public.meeting_recordings.ai_details is '상세 회의록 JSON';
