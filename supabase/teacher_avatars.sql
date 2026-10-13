-- Run once in Supabase SQL Editor before choosing teacher avatars.
alter table public.teacher_profiles
  add column if not exists avatar_style text
  check (avatar_style is null or avatar_style in ('male','female','hijab'));
