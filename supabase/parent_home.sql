-- Tambahan ringkasan & kuitansi. Jalankan setelah parent_portal.sql.
begin;
create or replace function public.jenius_parent_home()
returns jsonb language plpgsql security definer set search_path='' as $$
declare child uuid; unpaid numeric; unpaid_count bigint; attendance_count bigint:=0; present_count bigint:=0; receipts jsonb; month_start date:=date_trunc('month',timezone('Asia/Bangkok',now()))::date;
begin
 if auth.uid() is null then raise exception 'Silakan login.'; end if;
 select l.student_id into child from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid();
 if child is null then raise exception 'Akun belum terhubung dengan murid.'; end if;
 select coalesce(sum(jumlah),0),count(*) into unpaid,unpaid_count from public.payments p where student_id=child and coalesce(to_jsonb(p)->>'status','')<>'Lunas';
 if to_regclass('public.teacher_attendance') is not null then
 execute 'select count(*),count(*) filter(where status=''Hadir'') from public.teacher_attendance where student_id=$1 and tanggal>=$2 and tanggal<($2+interval ''1 month'')' into attendance_count,present_count using child,month_start;
 end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.bulan desc),'[]'::jsonb) into receipts from (select id,bulan,jumlah from public.payments p where student_id=child and to_jsonb(p)->>'status'='Lunas' order by bulan desc,id limit 24) q;
 return jsonb_build_object('month',to_char(month_start,'YYYY-MM'),'unpaid_total',unpaid,'unpaid_count',unpaid_count,'attendance_total',attendance_count,'present_count',present_count,'receipts',receipts);
end $$;
create or replace function public.jenius_parent_receipt(target_payment uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare child uuid; payment public.payments%rowtype; student_name text; invoice jsonb:=null;
begin
 if auth.uid() is null then raise exception 'Silakan login.'; end if;
 select l.student_id into child from public.parent_links l join public.parent_pilot p on p.student_id=l.student_id where l.user_id=auth.uid();
 if child is null then raise exception 'Akun belum terhubung dengan murid.'; end if;
 select * into payment from public.payments p where id=target_payment and student_id=child and to_jsonb(p)->>'status'='Lunas';
 if not found then raise exception 'Kuitansi tidak tersedia untuk pembayaran ini.'; end if;
 select nama into student_name from public.students where id=child;
 if to_regclass('public.invoices') is not null then
 select jsonb_build_object('nomor',to_jsonb(i)->>'nomor_invoice','tanggal',to_jsonb(i)->>'tanggal_invoice') into invoice from public.invoices i where payment_id=payment.id order by to_jsonb(i)->>'tanggal_invoice' desc nulls last,to_jsonb(i)->>'id' limit 1;
 end if;
 return jsonb_build_object('nama',student_name,'payment_id',payment.id,'bulan',payment.bulan,'jumlah',payment.jumlah,'status','Lunas','tanggal_bayar',to_jsonb(payment)->>'tanggal_bayar','metode',to_jsonb(payment)->>'metode','invoice',invoice);
end $$;
revoke all on function public.jenius_parent_home(),public.jenius_parent_receipt(uuid) from public,anon;
grant execute on function public.jenius_parent_home(),public.jenius_parent_receipt(uuid) to authenticated;
commit;
