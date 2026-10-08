-- Jalankan setelah parent_portal.sql dan tabel teacher_notes tersedia.
begin;
create table if not exists public.parent_lesson_materials (
 note_id uuid primary key references public.teacher_notes(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 tanggal date not null, materi text not null
);
alter table public.parent_lesson_materials enable row level security;
revoke all on public.parent_lesson_materials from anon,authenticated;
create or replace function public.jenius_sync_lesson_material()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Only new notes or edits after installation are published. Internal fields are excluded.
 if new.tanggal is null or nullif(trim(new.materi),'') is null then
 delete from public.parent_lesson_materials where note_id=new.id;
 else
 insert into public.parent_lesson_materials(note_id,student_id,tanggal,materi)
 values(new.id,new.student_id,new.tanggal,new.materi)
 on conflict(note_id) do update set student_id=excluded.student_id,tanggal=excluded.tanggal,materi=excluded.materi;
 end if;
 return new;
end $$;
revoke all on function public.jenius_sync_lesson_material() from public,anon,authenticated;
drop trigger if exists jenius_sync_lesson_material on public.teacher_notes;
create trigger jenius_sync_lesson_material after insert or update of student_id,tanggal,materi
 on public.teacher_notes for each row execute function public.jenius_sync_lesson_material();
create or replace function public.jenius_parent_lessons()
returns jsonb language plpgsql security definer set search_path='' as $$
declare child uuid; result jsonb;
begin
 if auth.uid() is null then raise exception 'Silakan login.';end if;
 select l.student_id into child from public.parent_links l
 join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid();
 if child is null then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.tanggal desc,q.note_id),'[]'::jsonb) into result
 from (select note_id,tanggal,materi from public.parent_lesson_materials where student_id=child order by tanggal desc,note_id limit 60) q;
 return result;
end $$;
revoke all on function public.jenius_parent_lessons() from public,anon;
grant execute on function public.jenius_parent_lessons() to authenticated;
commit;
