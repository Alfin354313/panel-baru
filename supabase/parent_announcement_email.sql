begin;
create table if not exists public.parent_email_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false
);
create table if not exists public.parent_announcement_deliveries(
 announcement_id uuid references public.parent_announcements(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 sent_at timestamptz,
 primary key(announcement_id,user_id)
);
alter table public.parent_email_preferences enable row level security;
alter table public.parent_announcement_deliveries enable row level security;
revoke all on public.parent_email_preferences,public.parent_announcement_deliveries from anon,authenticated;
grant all on public.parent_announcement_deliveries to service_role;
create or replace function public.jenius_parent_email_preference(enable_email boolean default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare result boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid()) then raise exception 'Akun belum terhubung.';end if;
 if enable_email is not null then
 insert into public.parent_email_preferences(user_id,enabled) values(auth.uid(),enable_email)
 on conflict(user_id) do update set enabled=excluded.enabled;
 end if;
 select enabled into result from public.parent_email_preferences where user_id=auth.uid();
 return coalesce(result,false);
end $$;
revoke all on function public.jenius_parent_email_preference(boolean) from public,anon;
grant execute on function public.jenius_parent_email_preference(boolean) to authenticated;
create or replace function public.jenius_announcement_email_targets(target_announcement uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('id',a.id,'title',a.title,'body',a.body,'recipients',
 coalesce((select jsonb_agg(jsonb_build_object('user_id',u.id,'email',u.email))
 from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id
 join auth.users u on u.id=l.user_id
 join public.parent_email_preferences pref on pref.user_id=u.id and pref.enabled
 where u.email_confirmed_at is not null and u.email is not null
 and not exists(select 1 from public.parent_announcement_deliveries d where d.announcement_id=a.id and d.user_id=u.id and d.sent_at is not null)),'[]'::jsonb))
 into result from public.parent_announcements a where a.id=target_announcement;
 return result;
end $$;
revoke all on function public.jenius_announcement_email_targets(uuid) from public,anon,authenticated;
grant execute on function public.jenius_announcement_email_targets(uuid) to service_role;
commit;
