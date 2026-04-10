-- prompts: anon/authenticated 가 PostgREST로 직접 테이블을 만지지 못하게 합니다.
-- 앱은 Next API(service_role)만 사용하므로 동작은 동일합니다.

drop policy if exists "prompts_select_public" on public.prompts;
drop policy if exists "prompts_insert_public" on public.prompts;
drop policy if exists "prompts_update_public" on public.prompts;
drop policy if exists "prompts_delete_public" on public.prompts;

-- 정책 없음 → anon/authenticated 는 RLS로 차단. service_role 은 RLS 우회.
