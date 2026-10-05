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

create or replace function public.get_teacher_accounts()
returns table (
  id uuid,
  email text,
  nama text,
  hp text,
  mapel text,
  status text,
  catatan text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt()->'app_metadata'->>'role') <> 'admin' then
    raise exception 'Hanya admin yang dapat melihat data akun guru';
  end if;

  return query
  select
    u.id,
    coalesce(u.email,'')::text,
    coalesce(p.nama,'')::text,
    coalesce(p.hp,'')::text,
    coalesce(p.mapel,'')::text,
    coalesce(p.status,'Aktif')::text,
    coalesce(p.catatan,'')::text
  from auth.users u
  left join public.teacher_profiles p on p.id=u.id
  where coalesce(u.raw_app_meta_data->>'role','')='guru'
  order by coalesce(p.nama,''), u.email;
end;
$$;

revoke all on function public.get_teacher_accounts() from public;
grant execute on function public.get_teacher_accounts() to authenticated;

create index if not exists teacher_profiles_status_idx
on public.teacher_profiles (status);

create index if not exists teacher_profiles_nama_idx
on public.teacher_profiles (nama);