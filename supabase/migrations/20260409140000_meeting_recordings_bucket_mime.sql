-- 일부 브라우저/코덱(ogg 등) 대비 — 기존 버킷에 허용 MIME 추가
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct e)
  from unnest(
    coalesce(allowed_mime_types, array[]::text[])
    || array['audio/ogg', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'application/octet-stream']::text[]
  ) as e
)
where id = 'meeting-recordings';
