-- Jalankan setelah parent_updates.sql.
begin;
alter table public.parent_announcements add column if not exists image_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('parent-announcements','parent-announcements',false,5242880,array['image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png'];

create or replace function public.jenius_can_read_announcement_image(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 public.jenius_role()='admin' or
 (exists(select 1 from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid())
 and exists(select 1 from public.parent_announcements a where a.image_path=object_name))
 );
$$;
revoke all on function public.jenius_can_read_announcement_image(text) from public,anon;
grant execute on function public.jenius_can_read_announcement_image(text) to authenticated;

drop policy if exists parent_announcement_image_read on storage.objects;
create policy parent_announcement_image_read on storage.objects for select to authenticated
using(bucket_id='parent-announcements' and public.jenius_can_read_announcement_image(name));
drop policy if exists parent_announcement_image_upload on storage.objects;
create policy parent_announcement_image_upload on storage.objects for insert to authenticated
with check(bucket_id='parent-announcements' and public.jenius_role()='admin');
drop policy if exists parent_announcement_image_delete on storage.objects;
create policy parent_announcement_image_delete on storage.objects for delete to authenticated
using(bucket_id='parent-announcements' and public.jenius_role()='admin');

create or replace function public.jenius_announcement_create_image(announcement_title text,announcement_body text,announcement_image text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or public.jenius_role() is distinct from 'admin' then raise exception 'Hanya Admin.';end if;
 if announcement_image is not null and not exists(
 select 1 from storage.objects where bucket_id='parent-announcements' and name=announcement_image
 ) then raise exception 'Gambar belum berhasil diunggah.';end if;
 if nullif(trim(announcement_body),'') is null and announcement_image is null then raise exception 'Isi teks atau unggah gambar.';end if;
 insert into public.parent_announcements(title,body,image_path)
 values(trim(announcement_title),coalesce(nullif(trim(announcement_body),''),'Poster / brosur terlampir.'),announcement_image) returning id into result;
 return result;
end $$;
revoke all on function public.jenius_announcement_create_image(text,text,text) from public,anon;
grant execute on function public.jenius_announcement_create_image(text,text,text) to authenticated;
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
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) into announcements from (select id,title,body,created_at,image_path from public.parent_announcements order by created_at desc limit 30) q;
 return jsonb_build_object('reports',reports,'announcements',announcements);
end $$;

commit;
