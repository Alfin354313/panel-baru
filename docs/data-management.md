# Backup, Restore & Arsip — tahap pertama

## Aktivasi

1. Review branch/PR dan preview terlebih dahulu. Jangan merge sebelum UI disetujui.
2. Pastikan `supabase/security_hardening.sql` sudah terpasang (`jenius_role`).
3. Jalankan `supabase/data_management.sql` melalui Supabase SQL Editor pada project panel yang sama. Migrasi dapat diulang dan tidak menghapus data operasional.
4. Setelah deployment frontend, masuk sebagai Admin dan pilih **Backup & Arsip**. Di mobile tombol ada di **Menu**.
5. Unduh backup, simpan file, lalu gunakan **Periksa file**. Pada database yang tidak berubah semua baris harus tercatat “sudah ada”.

Migrasi belum dijalankan pada produksi oleh perubahan kode ini. Akun Guru ditolak di server meskipun memanggil RPC langsung. Tidak ada secret/service-role key di frontend.

## Cakupan backup

11 tabel aplikasi: students, teacher_profiles, payments, expenses, invoices, teacher_notes, teacher_schedules, teacher_attendance, teacher_reports, teacher_salaries, teacher_salary_items. Tabel opsional yang belum dibuat ditampilkan sebagai `missing_tables`. Empat tabel inti wajib tersedia. Tidak menggunakan array UI atau pagination PostgREST sehingga tidak berhenti pada batas 1.000 baris.

Snapshot dibuat dalam satu RPC dengan lock baca seluruh tabel selama ekspor. Lock timeout 5 detik; jika database sedang sibuk operasi gagal daripada menghasilkan snapshot parsial. Untuk database besar, gunakan backup PostgreSQL/Supabase karena ukuran respons dan timeout infrastruktur tetap berlaku.

Backup ini **bukan backup seluruh project Supabase**: tidak menyertakan Auth (akun/password/role), Storage, skema, kebijakan RLS, fungsi, audit_logs, data_operation_logs, atau data_archives. Unduh arsip terpisah bila perlu menyimpannya di luar database.

File JSON berisi payload dan SHA-256 untuk mendeteksi kerusakan file; checksum bukan tanda tangan dan bukan bukti file berasal dari sumber tepercaya. File berisi data personal/keuangan dan tidak dienkripsi otomatis.

## Restore

Batas file 50 MB. Gunakan backup dari project dan skema yang sama. Akun guru dan skema harus sudah tersedia. File harus memiliki kolom yang cocok dengan skema tujuan.

- **Periksa file**: checksum, format, tipe data, tabel/kolom, duplikasi ID dan konflik dengan baris yang sudah ada. Tidak menulis data.
- **Restore**: membuat unduhan backup kondisi saat ini lebih dahulu, kemudian hanya menambahkan ID yang belum ada. Browser menyiapkan unduhan; pastikan file benar-benar tersimpan.
- ID yang identik dilewati. ID yang sama dengan isi berbeda ditolak; tidak ada overwrite atau penghapusan.
- Constraint FK, UNIQUE, CHECK dan NOT NULL diperiksa saat insert. Pemeriksaan awal bukan jaminan constraint lintas tabel sudah valid.
- Semua insert dan pencatatan log ada dalam transaksi RPC yang sama. Kegagalan tabel terakhir pun membatalkan insert sebelumnya.
- ID tetap dipertahankan sehingga hubungan invoice/pembayaran/murid/gaji tetap sama.

Restore tidak membatalkan edit pada baris yang masih ada. Recovery penuh ke suatu waktu memerlukan backup database Supabase/PostgreSQL dan prosedur tersendiri.

## Arsip

Arsip adalah **salinan per tahun kalender**, bukan tahun ajaran dan bukan pemindahan/penghapusan data. Murid, profil guru dan jadwal disertakan sebagai data pendukung; transaksi/absensi/laporan/catatan/gaji dipilih berdasarkan `bulan`, `tanggal`, atau `created_at`. Invoice mengikuti pembayaran yang dipilih; komponen gaji mengikuti gaji. Arsip dapat diunduh dan diperiksa melalui alur restore yang sama.

Data sumber tetap tampil di panel dan laporan keuangan. Tahap berikutnya untuk pembersihan/menyembunyikan data aktif belum diimplementasikan; perlu aturan retensi per modul. Belum ada penghapusan permanen.

## Pengujian

`tests/data-management.cjs` memakai PostgreSQL embedded PGlite pada fixture lokal, bukan database pengguna:

```
npm install --prefix /tmp/jenius-db-test @electric-sql/pglite --ignore-scripts
PGLITE_MODULE=/tmp/jenius-db-test/node_modules/@electric-sql/pglite node tests/data-management.cjs
node --check js/data-management.js
node --check js/admin.js
```

Uji: migrasi dua kali, penolakan Guru, ekspor 1.500 siswa, dry-run, restore berulang, arsip dengan invoice terkait, konflik ID, duplikasi, skema tidak cocok, rollback karena FK, dan recovery sesudah rollback. Integrasi Supabase asli dan tampilan dengan akun Admin tetap perlu diuji di preview sesudah migrasi.
