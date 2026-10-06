-- Jenius Edu security hardening.
-- Run after the application tables exist. This migration is intentionally
-- idempotent and only creates policies for tables that are present.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.is_guru()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'guru', false);
$$;

-- Never expose application tables to anonymous clients.
-- Authenticated access is then controlled by RLS policies below.
--
-- Existing permissive policies are removed for these security-sensitive
-- tables before the replacement policies are created. PostgreSQL combines
-- permissive policies with OR, so leaving an old broad policy in place could
-- silently bypass the restrictions defined below.
do $
declare
  t text;
  p record;
begin
  foreach t in array array[
    'students','payments','expenses','invoices',
    'teacher_profiles','teacher_notes','teacher_schedules',
    'teacher_attendance','teacher_reports',
    'teacher_salaries','teacher_salary_items'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon', t);
      execute format('revoke all on table public.%I from authenticated', t);

      for p in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = t
      loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end $;

-- Students: admin CRUD, guru read-only.
do $$
begin
  if to_regclass('public.students') is not null then
    grant select, insert, update, delete on public.students to authenticated;

    drop policy if exists "students_admin_select" on public.students;
    drop policy if exists "students_admin_insert" on public.students;
    drop policy if exists "students_admin_update" on public.students;
    drop policy if exists "students_admin_delete" on public.students;
    drop policy if exists "students_guru_select" on public.students;

    create policy "students_admin_select" on public.students for select to authenticated using (public.is_admin());
    create policy "students_admin_insert" on public.students for insert to authenticated with check (public.is_admin());
    create policy "students_admin_update" on public.students for update to authenticated using (public.is_admin()) with check (public.is_admin());
    create policy "students_admin_delete" on public.students for delete to authenticated using (public.is_admin());
    create policy "students_guru_select" on public.students for select to authenticated using (public.is_guru());
  end if;
end $$;

-- Financial data: admin only.
do $$
declare
  t text;
begin
  foreach t in array array['payments','expenses','invoices'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('drop policy if exists "admin_select" on public.%I', t);
      execute format('drop policy if exists "admin_insert" on public.%I', t);
      execute format('drop policy if exists "admin_update" on public.%I', t);
      execute format('drop policy if exists "admin_delete" on public.%I', t);
      execute format('create policy "admin_select" on public.%I for select to authenticated using (public.is_admin())', t);
      execute format('create policy "admin_insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
      execute format('create policy "admin_update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
      execute format('create policy "admin_delete" on public.%I for delete to authenticated using (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- Teacher-owned tables: guru may only operate on rows whose teacher_id is auth.uid().
do $$
declare
  t text;
begin
  foreach t in array array['teacher_notes','teacher_schedules','teacher_attendance','teacher_reports'] loop
    -- Only create teacher-owned policies when the table actually has
    -- the ownership column. Otherwise RLS remains enabled with no
    -- authenticated policy, which is fail-closed rather than permissive.
    if to_regclass('public.' || t) is not null
       and exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = t
           and column_name = 'teacher_id'
       ) then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('drop policy if exists "guru_select_own" on public.%I', t);
      execute format('drop policy if exists "guru_insert_own" on public.%I', t);
      execute format('drop policy if exists "guru_update_own" on public.%I', t);
      execute format('drop policy if exists "guru_delete_own" on public.%I', t);
      execute format('create policy "guru_select_own" on public.%I for select to authenticated using (public.is_guru() and teacher_id = auth.uid())', t);
      execute format('create policy "guru_insert_own" on public.%I for insert to authenticated with check (public.is_guru() and teacher_id = auth.uid())', t);
      execute format('create policy "guru_update_own" on public.%I for update to authenticated using (public.is_guru() and teacher_id = auth.uid()) with check (public.is_guru() and teacher_id = auth.uid())', t);
      execute format('create policy "guru_delete_own" on public.%I for delete to authenticated using (public.is_guru() and teacher_id = auth.uid())', t);
    end if;
  end loop;
end $$;

-- Admin may read attendance/reports for management screens only where the
-- application already needs it. Do not grant admin write access here.
do $$
begin
  if to_regclass('public.teacher_attendance') is not null then
    drop policy if exists "admin_select" on public.teacher_attendance;
    create policy "admin_select" on public.teacher_attendance
      for select to authenticated using (public.is_admin());
  end if;

  if to_regclass('public.teacher_reports') is not null then
    drop policy if exists "admin_select" on public.teacher_reports;
    create policy "admin_select" on public.teacher_reports
      for select to authenticated using (public.is_admin());
  end if;
end $$;

-- Teacher profiles: admin CRUD, guru read own profile.
do $$
begin
  if to_regclass('public.teacher_profiles') is not null then
    grant select, insert, update, delete on public.teacher_profiles to authenticated;

    drop policy if exists "teacher_profiles_admin_all" on public.teacher_profiles;
    drop policy if exists "teacher_profiles_teacher_read_own" on public.teacher_profiles;

    create policy "teacher_profiles_admin_all"
      on public.teacher_profiles for all to authenticated
      using (public.is_admin()) with check (public.is_admin());

    create policy "teacher_profiles_teacher_read_own"
      on public.teacher_profiles for select to authenticated
      using (public.is_guru() and id = auth.uid());
  end if;
end $$;

-- Salary data: admin only.
do $$
declare
  t text;
begin
  foreach t in array array['teacher_salaries','teacher_salary_items'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('drop policy if exists "admin_all" on public.%I', t);
      execute format('create policy "admin_all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- SECURITY DEFINER function: keep execution restricted to authenticated users
-- and avoid inheriting an unsafe search_path.
do $$
begin
  if to_regprocedure('public.get_teacher_accounts()') is not null then
    execute 'alter function public.get_teacher_accounts() set search_path = public, pg_temp';
    execute 'revoke all on function public.get_teacher_accounts() from public';
    execute 'grant execute on function public.get_teacher_accounts() to authenticated';
  end if;
end $$;

-- Prevent future public-schema tables/functions from accidentally receiving
-- broad default privileges. Run as the database owner/postgres role.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;
