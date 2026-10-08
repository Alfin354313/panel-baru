-- Jalankan setelah security_hardening.sql. Tidak mengubah data operasional.
begin;
create table if not exists public.data_operation_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null,
 action text not null check(action in ('BACKUP','RESTORE','ARCHIVE','DOWNLOAD_ARCHIVE')),
 detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.data_archives (
 id uuid primary key default gen_random_uuid(), label text not null,
 created_by uuid not null, created_at timestamptz not null default now(),
 payload jsonb not null
);
alter table public.data_operation_logs enable row level security;
alter table public.data_archives enable row level security;
revoke all on public.data_operation_logs, public.data_archives from anon, authenticated;
grant select on public.data_operation_logs to authenticated;
drop policy if exists data_operations_admin_read on public.data_operation_logs;
create policy data_operations_admin_read on public.data_operation_logs for select to authenticated using(public.jenius_role()='admin');
-- Semua operasi melalui RPC: pemeriksaan role juga berlaku saat RLS dilewati definer.
create or replace function public.jenius_data_tables() returns text[]
language sql immutable set search_path = '' as $$
 select array['students','teacher_profiles','payments','expenses','invoices','teacher_notes','teacher_schedules','teacher_attendance','teacher_reports','teacher_salaries','teacher_salary_items']::text[];
$$;
create or replace function public.jenius_data_admin() returns void
language plpgsql set search_path = '' as $$
begin
 if auth.uid() is null or public.jenius_role() is distinct from 'admin' then
  raise exception 'Hanya Admin dapat mengelola backup dan arsip' using errcode='42501';
 end if;
end;
$$;
create or replace function public.jenius_backup() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare t text; rows jsonb; data jsonb := '{}'; missing jsonb := '[]'; result jsonb;
begin
 perform public.jenius_data_admin();
 -- Lock seluruh tabel lebih dahulu supaya snapshot tidak terpotong di tengah perubahan.
 foreach t in array public.jenius_data_tables() loop
  if to_regclass(format('public.%I',t)) is not null then
   execute format('lock table public.%I in share mode',t);
  elsif t = any(array['students','payments','expenses','invoices']) then
   raise exception 'Tabel inti % belum tersedia',t;
  end if;
 end loop;
 foreach t in array public.jenius_data_tables() loop
  if to_regclass(format('public.%I',t)) is null then
   missing := missing || jsonb_build_array(t);
  else
   execute format('select coalesce(jsonb_agg(to_jsonb(r) order by r.id),''[]''::jsonb) from public.%I r',t) into rows;
   data := data || jsonb_build_object(t,rows);
  end if;
 end loop;
 result := jsonb_build_object('format','jenius-data-backup','version',1,'scope','full','created_at',now(),'source',jsonb_build_object('database',current_database()),'tables',data,'missing_tables',missing);
 insert into public.data_operation_logs(user_id,action,detail) values(auth.uid(),'BACKUP',jsonb_build_object('missing_tables',missing));
 return result;
end;
$$;
create or replace function public.jenius_restore(payload jsonb, dry_run boolean default true) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare t text; rows jsonb; rowdata jsonb; columns_sql text; select_sql text; names text[];
 existing jsonb; incoming jsonb; total int; added int; skipped int; actual int; summary jsonb := '{}';
begin
 perform public.jenius_data_admin();
 if dry_run is null then raise exception 'dry_run wajib diisi'; end if;
 if payload->>'format' is distinct from 'jenius-data-backup' or payload->>'version' is distinct from '1' or jsonb_typeof(payload->'tables') is distinct from 'object' then
  raise exception 'Format backup tidak didukung';
 end if;
 if pg_column_size(payload)>52428800 then raise exception 'Backup melebihi batas 50 MB'; end if;
 if not exists(select 1 from jsonb_object_keys(payload->'tables')) then raise exception 'Backup kosong'; end if;
 for t in select jsonb_object_keys(payload->'tables') loop
  if not t = any(public.jenius_data_tables()) then raise exception 'Tabel tidak diizinkan: %',t; end if;
 end loop;
 foreach t in array public.jenius_data_tables() loop
  if payload->'tables' ? t then
   if to_regclass(format('public.%I',t)) is null then raise exception 'Tabel % belum tersedia di tujuan',t; end if;
   execute format('lock table public.%I in share row exclusive mode',t);
  end if;
 end loop;
 foreach t in array public.jenius_data_tables() loop
  if not (payload->'tables' ? t) then continue; end if;
  rows := payload->'tables'->t;
  if jsonb_typeof(rows) is distinct from 'array' then raise exception 'Data % harus berupa array',t; end if;
  select array_agg(a.attname order by a.attnum),string_agg(format('%I',a.attname),',' order by a.attnum),string_agg(format('r.%I',a.attname),',' order by a.attnum)
   into names,columns_sql,select_sql from pg_catalog.pg_attribute a where a.attrelid=to_regclass(format('public.%I',t)) and a.attnum>0 and not a.attisdropped and a.attgenerated='';
  total := jsonb_array_length(rows); added:=0; skipped:=0;
  if exists(select 1 from jsonb_array_elements(rows) r where jsonb_typeof(r) is distinct from 'object' or nullif(r->>'id','') is null) then raise exception 'Baris % harus memiliki ID',t; end if;
  if (select count(distinct r->>'id') from jsonb_array_elements(rows) r) <> total then raise exception 'ID duplikat dalam %',t; end if;
  for rowdata in select value from jsonb_array_elements(rows) loop
   if exists(select 1 from jsonb_object_keys(rowdata) k where not k=any(names)) or exists(select 1 from unnest(names) k where not rowdata ? k) then
    raise exception 'Kolom backup % tidak cocok dengan skema tujuan',t;
   end if;
  end loop;
  -- Casting oleh PostgreSQL memvalidasi tipe data bahkan untuk dry run.
  for incoming in execute format('select to_jsonb(r) from jsonb_populate_recordset(null::public.%I,$1) r',t) using rows loop
   execute format('select to_jsonb(r) from public.%I r where r.id::text=$1',t) into existing using incoming->>'id';
   if existing is not null then
    if existing is distinct from incoming then raise exception 'Konflik ID pada tabel %. Restore dibatalkan; data lama tidak ditimpa.',t; end if;
    skipped:=skipped+1;
   else added:=added+1;
   end if;
  end loop;
  if not dry_run then
   execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I,$1) r where not exists(select 1 from public.%I old where old.id=r.id)',t,columns_sql,select_sql,t,t) using rows;
   get diagnostics actual = row_count;
   if actual<>added then raise exception 'Jumlah restore % tidak sesuai',t; end if;
  end if;
  summary:=summary||jsonb_build_object(t,jsonb_build_object('total',total,'new',added,'existing',skipped));
 end loop;
 if not dry_run then insert into public.data_operation_logs(user_id,action,detail) values(auth.uid(),'RESTORE',summary); end if;
 return jsonb_build_object('dry_run',dry_run,'tables',summary);
 -- FK, NOT NULL, CHECK, UNIQUE divalidasi saat insert. Kegagalan membatalkan seluruh RPC.
end;
$$;
create or replace function public.jenius_archive(label text, period_year integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb; result uuid; t text; rows jsonb; data jsonb := '{}';
begin
 perform public.jenius_data_admin();
 if label is null or length(trim(label)) not between 1 and 100 then raise exception 'Nama arsip wajib 1–100 karakter'; end if;
 if period_year is null or period_year not between 2000 and extract(year from now())::int then raise exception 'Tahun arsip tidak valid'; end if;
 snapshot:=public.jenius_backup();
 -- Master murid/guru disertakan untuk mempertahankan hubungan data; transaksi dipilih per tahun.
 foreach t in array public.jenius_data_tables() loop
  if not (snapshot->'tables' ? t) then continue; end if;
  if t in ('students','teacher_profiles','teacher_schedules') then rows:=snapshot->'tables'->t;
  elsif t in ('invoices','teacher_salary_items') then continue;
  else
   select coalesce(jsonb_agg(r),'[]'::jsonb) into rows from jsonb_array_elements(snapshot->'tables'->t) r
    where left(coalesce(r->>'bulan',r->>'tanggal',r->>'created_at',''),4)=period_year::text;
  end if;
  data:=data||jsonb_build_object(t,rows);
 end loop;
 select coalesce(jsonb_agg(r),'[]'::jsonb) into rows from jsonb_array_elements(coalesce(snapshot->'tables'->'invoices','[]')) r
  where exists(select 1 from jsonb_array_elements(data->'payments') p where p->>'id'=r->>'payment_id');
 data:=data||jsonb_build_object('invoices',rows);
 if snapshot->'tables' ? 'teacher_salary_items' then
  select coalesce(jsonb_agg(r),'[]'::jsonb) into rows from jsonb_array_elements(snapshot->'tables'->'teacher_salary_items') r
   where exists(select 1 from jsonb_array_elements(coalesce(data->'teacher_salaries','[]')) s where s->>'id'=r->>'salary_id');
  data:=data||jsonb_build_object('teacher_salary_items',rows);
 end if;
 snapshot:=snapshot||jsonb_build_object('scope','archive-copy','period_year',period_year,'tables',data);
 insert into public.data_archives(label,created_by,payload) values(trim(label),auth.uid(),snapshot) returning id into result;
 insert into public.data_operation_logs(user_id,action,detail) values(auth.uid(),'ARCHIVE',jsonb_build_object('id',result,'year',period_year,'label',trim(label)));
 return result;
end;
$$;
create or replace function public.jenius_archive_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 perform public.jenius_data_admin();
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'created_at',created_at,'year',payload->'period_year') order by created_at desc),'[]') from public.data_archives);
end;
$$;
create or replace function public.jenius_archive_download(archive_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 perform public.jenius_data_admin();
 select payload into result from public.data_archives where id=archive_id;
 if result is null then raise exception 'Arsip tidak ditemukan'; end if;
 insert into public.data_operation_logs(user_id,action,detail) values(auth.uid(),'DOWNLOAD_ARCHIVE',jsonb_build_object('id',archive_id));
 return result;
end;
$$;
revoke all on function public.jenius_data_tables(), public.jenius_data_admin(), public.jenius_backup(), public.jenius_restore(jsonb,boolean), public.jenius_archive(text,integer), public.jenius_archive_list(), public.jenius_archive_download(uuid) from public, anon, authenticated;
grant execute on function public.jenius_backup(), public.jenius_restore(jsonb,boolean), public.jenius_archive(text,integer), public.jenius_archive_list(), public.jenius_archive_download(uuid) to authenticated;
commit;
