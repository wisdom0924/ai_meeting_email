-- Saved AI prompts (요약/상세 지시문). anon 키로 공개 읽기·쓰기 (데모용).

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  summary_prompt text not null,
  details_prompt text not null,
  client_key text,
  source text not null default 'user'
    check (source in ('seed', 'user', 'recording_end'))
);

create index if not exists prompts_client_created_idx
  on public.prompts (client_key, created_at desc);

create or replace function public.set_prompts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompts_set_updated_at on public.prompts;
create trigger prompts_set_updated_at
  before update on public.prompts
  for each row
  execute procedure public.set_prompts_updated_at();

alter table public.prompts enable row level security;

-- 공개 읽기·쓰기 (anon + authenticated). 프로덕션에서는 auth 기반으로 좁히는 것이 안전합니다.
create policy "prompts_select_public"
  on public.prompts for select
  to anon, authenticated
  using (true);

create policy "prompts_insert_public"
  on public.prompts for insert
  to anon, authenticated
  with check (true);

create policy "prompts_update_public"
  on public.prompts for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "prompts_delete_public"
  on public.prompts for delete
  to anon, authenticated
  using (true);

-- 초기 seed (기본 프롬프트 — 앱의 DEFAULT_* 와 동일하게 유지)
insert into public.prompts (name, summary_prompt, details_prompt, client_key, source)
select
  '기본',
  '회의 내용을 500자 내외로 자연스럽게 요약한 줄글 텍스트. (중요한 논의 사항, 결정된 사항, 액션 아이템 중심)',
  '회의의 전체적인 흐름과 안건별 세부 논의 사항을 상세하게 정리한 텍스트.',
  null,
  'seed'
where not exists (select 1 from public.prompts p where p.source = 'seed');
