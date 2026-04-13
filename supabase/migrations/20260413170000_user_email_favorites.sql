-- 로그인 사용자별 이메일 즐겨찾기(자동완성용). 클라이언트는 JWT로 본인 행만 접근.

create table if not exists public.user_email_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_email_favorites_email_nonempty check (length(trim(email)) > 0),
  constraint user_email_favorites_user_email_key unique (user_id, email)
);

create index if not exists user_email_favorites_user_last_used_idx
  on public.user_email_favorites (user_id, last_used_at desc);

comment on table public.user_email_favorites is
  '로그인 사용자가 전송에 사용한 메일 주소를 저장해 자동완성에 활용합니다.';

alter table public.user_email_favorites enable row level security;

create policy "user_email_favorites_select_own"
  on public.user_email_favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_email_favorites_insert_own"
  on public.user_email_favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_email_favorites_update_own"
  on public.user_email_favorites for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_email_favorites_delete_own"
  on public.user_email_favorites for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_email_favorites to authenticated;
