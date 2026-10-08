-- Pilot Portal Orang Tua: hanya SATU murid, dipilih Admin secara eksplisit.
begin;
create table if not exists public.parent_pilot (
 singleton boolean primary key default true check(singleton),
 student_id uuid not null references public.students(id) on delete cascade
);
create table if not exists public.parent_links (
 user_id uuid primary key references auth.users(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.parent_invites (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 code_hash text not null unique,
 expires_at timestamptz not null default now()+interval '24 hours',
 used_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.parent_pilot enable row level security;
alter table public.parent_links enable row level security;
alter table public.parent_invites enable row level security;
revoke all on public.parent_pilot,public.parent_links,public.parent_invites from anon,authenticated;

create or replace function public.jenius_parent_invite(target_student uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare token text; pilot uuid; student_name text;
begin
 if auth.uid() is null or public.jenius_role() is distinct from 'admin' then raise exception 'Hanya Admin dapat membuat undangan.'; end if;
 select nama into student_name from public.students where id=target_student;
 if not found then raise exception 'Murid tidak ditemukan.'; end if;
 -- First invitation fixes the pilot; further invitations must refer to the same child.
 insert into public.parent_pilot(singleton,student_id) values(true,target_student) on conflict(singleton) do nothing;
 select student_id into pilot from public.parent_pilot where singleton for update;
 if pilot<>target_student then raise exception 'Uji coba dibatasi satu murid. Pilih murid uji coba yang sama.'; end if;
 update public.parent_invites set expires_at=now() where student_id=pilot and used_by is null;
 token:=replace(gen_random_uuid()::text,'-','');
 insert into public.parent_invites(student_id,code_hash) values(pilot,encode(sha256(convert_to(token,'UTF8')),'hex'));
 return jsonb_build_object('nama',student_name,'code',token,'expires_at',now()+interval '24 hours');
end $$;

create or replace function public.jenius_parent_claim(invitation_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare invitation public.parent_invites%rowtype; existing uuid;
begin
 if auth.uid() is null then raise exception 'Silakan login terlebih dahulu.'; end if;
 if public.jenius_role() in ('admin','guru') then raise exception 'Gunakan akun orang tua terpisah dari akun Admin/Guru.'; end if;
 if length(trim(invitation_code))<>32 then raise exception 'Kode undangan tidak valid atau kedaluwarsa.'; end if;
 select * into invitation from public.parent_invites where code_hash=encode(sha256(convert_to(lower(trim(invitation_code)),'UTF8')),'hex') for update;
 if not found or invitation.expires_at<=now() or invitation.used_by is not null then raise exception 'Kode undangan tidak valid atau kedaluwarsa.'; end if;
 if not exists(select 1 from public.parent_pilot where student_id=invitation.student_id) then raise exception 'Uji coba belum aktif.'; end if;
 select student_id into existing from public.parent_links where user_id=auth.uid();
 if existing is not null and existing<>invitation.student_id then raise exception 'Akun sudah terhubung ke murid lain.'; end if;
 insert into public.parent_links(user_id,student_id) values(auth.uid(),invitation.student_id) on conflict(user_id) do nothing;
 update public.parent_invites set used_by=auth.uid() where id=invitation.id;
 return jsonb_build_object('linked',true);
end $$;

create or replace function public.jenius_parent_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
declare child uuid; profile jsonb; bills jsonb; attendance jsonb:='[]'::jsonb;
begin
 if auth.uid() is null then raise exception 'Silakan login terlebih dahulu.'; end if;
 select l.student_id into child from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid();
 if child is null then return jsonb_build_object('linked',false); end if;
 select jsonb_build_object('nama',s.nama,'jenjang',to_jsonb(s)->>'jenjang','kelas',to_jsonb(s)->>'kelas') into profile from public.students s where s.id=child;
 select coalesce(jsonb_agg(jsonb_build_object('bulan',q.bulan,'jumlah',q.jumlah,'status',to_jsonb(q)->>'status') order by q.bulan desc),'[]'::jsonb) into bills from (select * from public.payments where student_id=child order by bulan desc limit 24) q;
 if to_regclass('public.teacher_attendance') is not null then
 execute 'select coalesce(jsonb_agg(jsonb_build_object(''tanggal'',to_jsonb(q)->>''tanggal'',''status'',to_jsonb(q)->>''status'') order by to_jsonb(q)->>''tanggal'' desc),''[]''::jsonb) from (select * from public.teacher_attendance where student_id=$1 order by tanggal desc limit 60) q' into attendance using child;
 end if;
 return jsonb_build_object('linked',true,'student',profile,'payments',bills,'attendance',attendance);
end $$;
revoke all on function public.jenius_parent_invite(uuid),public.jenius_parent_claim(text),public.jenius_parent_dashboard() from public,anon;
grant execute on function public.jenius_parent_invite(uuid),public.jenius_parent_claim(text),public.jenius_parent_dashboard() to authenticated;
commit;
