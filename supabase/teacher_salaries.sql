-- Jenius Edu - Sistem Gaji Guru
-- Dasar gaji: jumlah pertemuan Hadir x Rp12.500 + bonus + komponen tambahan - potongan.

create table if not exists public.teacher_salaries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  teacher_name text not null default '',
  bulan text not null,
  tarif_pertemuan numeric(12,2) not null default 12500,
  jumlah_pertemuan integer not null default 0,
  total_pertemuan numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 50000,
  total_tambahan numeric(12,2) not null default 0,
  total_potongan numeric(12,2) not null default 0,
  total_gaji numeric(12,2) not null default 0,
  status text not null default 'Belum Dibayar',
  tanggal_bayar date,
  catatan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, bulan)
);

create table if not exists public.teacher_salary_items (
  id uuid primary key default gen_random_uuid(),
  salary_id uuid not null references public.teacher_salaries(id) on delete cascade,
  nama_item text not null,
  tipe text not null default 'Tambahan' check (tipe in ('Tambahan','Potongan')),
  nominal numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.teacher_salaries enable row level security;
alter table public.teacher_salary_items enable row level security;

drop policy if exists "teacher_salaries_admin_all" on public.teacher_salaries;
create policy "teacher_salaries_admin_all"
on public.teacher_salaries for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists "teacher_salary_items_admin_all" on public.teacher_salary_items;
create policy "teacher_salary_items_admin_all"
on public.teacher_salary_items for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create or replace function public.set_teacher_salaries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_salaries_updated_at on public.teacher_salaries;
create trigger teacher_salaries_updated_at
before update on public.teacher_salaries
for each row execute function public.set_teacher_salaries_updated_at();

create index if not exists teacher_salaries_bulan_idx
on public.teacher_salaries (bulan);

create index if not exists teacher_salary_items_salary_id_idx
on public.teacher_salary_items (salary_id);
