-- Jalankan setelah parent_portal.sql dan teacher_reports.sql.
begin;
create table if not exists public.parent_report_publications (
 report_id uuid primary key references public.teacher_reports(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 teacher_id uuid not null references auth.users(id) on delete cascade,
 bulan text not null,pencapaian text not null,catatan text not null,rekomendasi text not null,
 published_at timestamptz not null default now()
);
create table if not exists public.parent_announcements (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 150),
 body text not null check(length(body) between 1 and 5000),created_at timestamptz not null default now()
);
alter table public.parent_report_publications enable row level security;
alter table public.parent_announcements enable row level security;
revoke all on public.parent_report_publications,public.parent_announcements from anon,authenticated;
create or replace function public.jenius_publish_report(target_report uuid,publish boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.teacher_reports%rowtype;
begin
 if auth.uid() is null or public.jenius_role() not in ('admin','guru') or public.jenius_role() is null then raise exception 'Akses ditolak.'; end if;
 select * into r from public.teacher_reports where id=target_report for update;
 if not found or (public.jenius_role()<>'admin' and r.teacher_id<>auth.uid()) then raise exception 'Laporan tidak ditemukan atau bukan milik Anda.'; end if;
 if publish is null then raise exception 'Pilih tindakan publikasi.'; end if;
 if publish then
 insert into public.parent_report_publications(report_id,student_id,teacher_id,bulan,pencapaian,catatan,rekomendasi)
 values(r.id,r.student_id,r.teacher_id,r.bulan,coalesce(r.pencapaian,''),coalesce(r.catatan,''),coalesce(r.rekomendasi,''))
 on conflict(report_id) do update set student_id=excluded.student_id,teacher_id=excluded.teacher_id,bulan=excluded.bulan,pencapaian=excluded.pencapaian,catatan=excluded.catatan,rekomendasi=excluded.rekomendasi,published_at=now();
 else delete from public.parent_report_publications where report_id=r.id; end if;
 return publish;
end $$;
create or replace function public.jenius_announcement_create(announcement_title text,announcement_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or public.jenius_role() is distinct from 'admin' then raise exception 'Hanya Admin.'; end if;
 insert into public.parent_announcements(title,body) values(trim(announcement_title),trim(announcement_body)) returning id into result;return result;
end $$;
create or replace function public.jenius_announcement_delete(announcement_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.jenius_role() is distinct from 'admin' then raise exception 'Hanya Admin.'; end if;
 delete from public.parent_announcements where id=announcement_id;return found;
end $$;
create or replace function public.jenius_parent_updates()
returns jsonb language plpgsql security definer set search_path='' as $$
declare child uuid;reports jsonb:='[]'::jsonb;announcements jsonb:='[]'::jsonb;
begin
 if auth.uid() is null then raise exception 'Silakan login.'; end if;
 if public.jenius_role() is distinct from 'admin' then
 select l.student_id into child from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid();
 if child is null then return jsonb_build_object('reports',reports,'announcements',announcements); end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.bulan desc,q.published_at desc),'[]'::jsonb) into reports from
 (select report_id,bulan,pencapaian,catatan,rekomendasi,published_at from public.parent_report_publications where student_id=child order by bulan desc,published_at desc limit 24) q;
 end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) into announcements from (select id,title,body,created_at from public.parent_announcements order by created_at desc limit 30) q;
 return jsonb_build_object('reports',reports,'announcements',announcements);
end $$;
revoke all on function public.jenius_publish_report(uuid,boolean),public.jenius_announcement_create(text,text),public.jenius_announcement_delete(uuid),public.jenius_parent_updates() from public,anon;
grant execute on function public.jenius_publish_report(uuid,boolean),public.jenius_announcement_create(text,text),public.jenius_announcement_delete(uuid),public.jenius_parent_updates() to authenticated;
commit;
