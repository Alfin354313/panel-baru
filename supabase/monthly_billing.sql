-- Apply after teacher_profiles.sql and teacher_salaries.sql.
-- Jakarta dates: current-month student bills; prior-month unpaid salary drafts.
-- Existing payments and salary records are never overwritten.
begin;
alter table public.payments add column if not exists due_date date;
alter table public.payments add column if not exists auto_generated boolean not null default false;
create unique index if not exists payments_auto_month_unique
 on public.payments(student_id,bulan) where auto_generated;
create or replace function public.jenius_generate_monthly_records()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 local_day date := (now() at time zone 'Asia/Jakarta')::date;
 month_key text := to_char(local_day,'YYYY-MM');
 previous_month date := (date_trunc('month',local_day)-interval '1 month')::date;
begin
 perform pg_advisory_xact_lock(739214610);
 insert into public.payments(student_id,bulan,jumlah,metode,status,due_date,auto_generated)
 select s.id,month_key,s.biaya,'','Belum',date_trunc('month',local_day)::date+6,true
 from public.students s
 where coalesce(s.biaya,0)>0
 and coalesce(to_jsonb(s)->>'status','Aktif')<>'Nonaktif'
 and not exists(select 1 from public.payments p where p.student_id=s.id and p.bulan=month_key)
 on conflict do nothing;
 -- Completed previous month only. No payment confirmation or current-month salary creation.
 -- Uses the application's existing formula: attended meetings x 12,500 + 50,000 bonus.
 insert into public.teacher_salaries(teacher_id,teacher_name,bulan,jumlah_pertemuan,tarif_pertemuan,total_pertemuan,bonus,total_gaji,status,catatan)
 select a.teacher_id,coalesce(t.nama,''),to_char(previous_month,'YYYY-MM'),count(*)::int,
 12500,count(*)*12500,50000,count(*)*12500+50000,'Belum Dibayar','Draft otomatis — periksa tarif, bonus, dan potongan sebelum membayar.'
 from public.teacher_attendance a
 left join public.teacher_profiles t on t.id=a.teacher_id
 where a.tanggal>=previous_month and a.tanggal<date_trunc('month',local_day)::date
 and a.status='Hadir'
 group by a.teacher_id,t.nama
 on conflict(teacher_id,bulan) do nothing;
end;
$$;
revoke all on function public.jenius_generate_monthly_records() from public,anon,authenticated;
create or replace function public.jenius_sync_monthly_records()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then
  raise exception 'Hanya admin yang dapat menyinkronkan tagihan';
 end if;
 perform public.jenius_generate_monthly_records();
end;
$$;
revoke all on function public.jenius_sync_monthly_records() from public,anon;
grant execute on function public.jenius_sync_monthly_records() to authenticated;
commit;

-- Enable pg_cron in Supabase (Integrations / Cron) before running this section.
create extension if not exists pg_cron;
-- Runs at 00:05 Jakarta every day: catches new students without duplicating invoices.
select cron.schedule('jenius-monthly-records','5 17 * * *',
 'select public.jenius_generate_monthly_records();');
