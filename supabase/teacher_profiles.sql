create table if not exists public.teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text not null default '',
  hp text not null default '',
  mapel text not null default '',
  status text not null default 'Aktif' check (status in ('Aktif','Nonaktif')),
  catatan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_profiles enable row level security;

drop policy if exists "teacher_profiles_admin_all" on public.teacher_profiles;
create policy "teacher_profiles_admin_all"
on public.teacher_profiles for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists "teacher_profiles_teacher_read_own" on public.teacher_profiles;
create policy "teacher_profiles_teacher_read_own"
on public.teacher_profiles for select
to authenticated
using (id = auth.uid());

create or replace function public.set_teacher_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_profiles_updated_at on public.teacher_profiles;
create trigger teacher_profiles_updated_at
before update on public.teacher_profiles
for each row execute function public.set_teacher_profiles_updated_at();

create index if not exists teacher_profiles_status_idx
on public.teacher_profiles (status);

create index if not exists teacher_profiles_nama_idx
on public.teacher_profiles (nama);