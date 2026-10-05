-- Jenius Edu - tabel Laporan Guru bulanan
create table if not exists public.teacher_reports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  bulan text not null,
  pencapaian text not null default '',
  catatan text not null default '',
  rekomendasi text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_id, bulan)
);

alter table public.teacher_reports enable row level security;

drop policy if exists "teacher_reports_select_own" on public.teacher_reports;
create policy "teacher_reports_select_own"
on public.teacher_reports for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "teacher_reports_insert_own" on public.teacher_reports;
create policy "teacher_reports_insert_own"
on public.teacher_reports for insert
to authenticated
with check (teacher_id = auth.uid());

drop policy if exists "teacher_reports_update_own" on public.teacher_reports;
create policy "teacher_reports_update_own"
on public.teacher_reports for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

drop policy if exists "teacher_reports_delete_own" on public.teacher_reports;
create policy "teacher_reports_delete_own"
on public.teacher_reports for delete
to authenticated
using (teacher_id = auth.uid());

create or replace function public.set_teacher_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_reports_updated_at on public.teacher_reports;
create trigger teacher_reports_updated_at
before update on public.teacher_reports
for each row execute function public.set_teacher_reports_updated_at();
