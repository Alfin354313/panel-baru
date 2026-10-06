-- Jenius Edu - RLS hardening
-- Jalankan di Supabase SQL Editor setelah backup database.
-- Aman dijalankan ulang. Tidak menghapus data.

begin;

-- Helper role: otorisasi hanya dari auth.users.raw_app_meta_data / JWT app_metadata.
create or replace function public.jenius_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(coalesce(auth.jwt()->'app_metadata'->>'role',''));
$$;

revoke all on function public.jenius_role() from public;
grant execute on function public.jenius_role() to authenticated;

-- Aktifkan RLS pada seluruh tabel yang digunakan frontend.
alter table if exists public.students enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.teacher_notes enable row level security;
alter table if exists public.teacher_schedules enable row level security;
alter table if exists public.teacher_attendance enable row level security;
alter table if exists public.teacher_reports enable row level security;
alter table if exists public.teacher_profiles enable row level security;
alter table if exists public.teacher_salaries enable row level security;
alter table if exists public.teacher_salary_items enable row level security;

-- Tabel inti: hanya admin dapat menulis.
drop policy if exists "students_admin_all" on public.students;
create policy "students_admin_all" on public.students for all to authenticated
using (public.jenius_role()='admin') with check (public.jenius_role()='admin');
-- Guru perlu daftar siswa minimum untuk catatan/jadwal/absensi/laporan.
drop policy if exists "students_teacher_read" on public.students;
create policy "students_teacher_read" on public.students for select to authenticated
using (public.jenius_role()='guru');

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments for all to authenticated
using (public.jenius_role()='admin') with check (public.jenius_role()='admin');

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all" on public.expenses for all to authenticated
using (public.jenius_role()='admin') with check (public.jenius_role()='admin');

drop policy if exists "invoices_admin_all" on public.invoices;
create policy "invoices_admin_all" on public.invoices for all to authenticated
using (public.jenius_role()='admin') with check (public.jenius_role()='admin');

-- Data operasional guru: guru hanya baris miliknya; admin dapat membaca rekap.
drop policy if exists "teacher_notes_own_all" on public.teacher_notes;
create policy "teacher_notes_own_all" on public.teacher_notes for all to authenticated
using (public.jenius_role()='guru' and teacher_id=auth.uid())
with check (public.jenius_role()='guru' and teacher_id=auth.uid());
drop policy if exists "teacher_notes_admin_read" on public.teacher_notes;
create policy "teacher_notes_admin_read" on public.teacher_notes for select to authenticated
using (public.jenius_role()='admin');

drop policy if exists "teacher_schedules_own_all" on public.teacher_schedules;
create policy "teacher_schedules_own_all" on public.teacher_schedules for all to authenticated
using (public.jenius_role()='guru' and teacher_id=auth.uid())
with check (public.jenius_role()='guru' and teacher_id=auth.uid());
drop policy if exists "teacher_schedules_admin_read" on public.teacher_schedules;
create policy "teacher_schedules_admin_read" on public.teacher_schedules for select to authenticated
using (public.jenius_role()='admin');

drop policy if exists "teacher_attendance_own_all" on public.teacher_attendance;
create policy "teacher_attendance_own_all" on public.teacher_attendance for all to authenticated
using (public.jenius_role()='guru' and teacher_id=auth.uid())
with check (public.jenius_role()='guru' and teacher_id=auth.uid());
drop policy if exists "teacher_attendance_admin_read" on public.teacher_attendance;
create policy "teacher_attendance_admin_read" on public.teacher_attendance for select to authenticated
using (public.jenius_role()='admin');

-- Ganti policy laporan lama agar authenticated non-guru tidak mendapat akses.
drop policy if exists "teacher_reports_select_own" on public.teacher_reports;
drop policy if exists "teacher_reports_insert_own" on public.teacher_reports;
drop policy if exists "teacher_reports_update_own" on public.teacher_reports;
drop policy if exists "teacher_reports_delete_own" on public.teacher_reports;
drop policy if exists "teacher_reports_own_all" on public.teacher_reports;
create policy "teacher_reports_own_all" on public.teacher_reports for all to authenticated
using (public.jenius_role()='guru' and teacher_id=auth.uid())
with check (public.jenius_role()='guru' and teacher_id=auth.uid());
drop policy if exists "teacher_reports_admin_read" on public.teacher_reports;
create policy "teacher_reports_admin_read" on public.teacher_reports for select to authenticated
using (public.jenius_role()='admin');

-- Profil guru.
drop policy if exists "teacher_profiles_admin_all" on public.teacher_profiles;
create policy "teacher_profiles_admin_all" on public.teacher_profiles for all to authenticated
using (public.jenius_role()='admin') with check (public.jenius_role()='admin');
drop policy if exists "teacher_profiles_teacher_read_own" on public.teacher_profiles;
create policy "teacher_profiles_teacher_read_own" on public.teacher_profiles for select to authenticated
using (public.jenius_role()='guru' and id=auth.uid());

-- Gaji hanya admin pada UI saat ini.
drop policy if exists "teacher_salaries_admin_all" on public.teacher_salaries;
create policy "teacher_salaries_admin_all" on public.teacher_salaries for all to authenticated
using (public.jenius_role()='admin') with check (public.jenius_role()='admin');
drop policy if exists "teacher_salary_items_admin_all" on public.teacher_salary_items;
create policy "teacher_salary_items_admin_all" on public.teacher_salary_items for all to authenticated
using (
  public.jenius_role()='admin'
  and exists(select 1 from public.teacher_salaries s where s.id=salary_id)
)
with check (
  public.jenius_role()='admin'
  and exists(select 1 from public.teacher_salaries s where s.id=salary_id)
);

-- Perketat RPC akun guru: SECURITY DEFINER wajib memeriksa app_metadata server-side.
create or replace function public.get_teacher_accounts()
returns table (id uuid,email text,nama text,hp text,mapel text,status text,catatan text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt()->'app_metadata'->>'role','')) <> 'admin' then
    raise exception 'Hanya admin yang dapat melihat data akun guru';
  end if;
  return query
  select u.id,coalesce(u.email,'')::text,coalesce(p.nama,'')::text,
         coalesce(p.hp,'')::text,coalesce(p.mapel,'')::text,
         coalesce(p.status,'Aktif')::text,coalesce(p.catatan,'')::text
  from auth.users u
  left join public.teacher_profiles p on p.id=u.id
  where lower(coalesce(u.raw_app_meta_data->>'role',''))='guru'
  order by coalesce(p.nama,''),u.email;
end;
$$;
revoke all on function public.get_teacher_accounts() from public;
grant execute on function public.get_teacher_accounts() to authenticated;

commit;
