# Pemberitahuan pengumuman

Jalankan supabase/parent_announcement_email.sql setelah migrasi pengumuman. Tambahkan env Vercel server-only: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ANNOUNCEMENT_EMAIL_FROM (alamat pengirim domain terverifikasi), PARENT_PORTAL_URL (URL HTTPS portal produksi). SUPABASE_URL dan SUPABASE_ANON_KEY mengikuti konfigurasi aplikasi. Jangan gunakan prefix NEXT_PUBLIC untuk secret.

Orang tua mengaktifkan pemberitahuan email di portal; default mati. Akun harus terhubung dan email dikonfirmasi. Admin memilih Kirim pemberitahuan email setelah publikasi atau tombol Kirim Email pada pengumuman terbit. Maksimal 20 penerima per permintaan; ulangi untuk penerima tersisa. Pengiriman yang berhasil dicatat agar tidak dikirim ulang. Idempotency key penyedia melindungi percobaan ulang singkat jika pencatatan gagal. Jika pencatatan terus gagal, jangan mengulang setelah jendela idempotency penyedia tanpa pemeriksaan.

WhatsApp hanya membuka draft pesan; admin memilih penerima dan menekan Kirim. Poster dilihat melalui tautan portal; file tidak otomatis dilampirkan ke WhatsApp/email. Tidak ada pesan percobaan yang dikirim oleh agent. Pengiriman email perlu pengujian nyata setelah konfigurasi diaktifkan. Tabel preferensi dan pengiriman belum termasuk backup aplikasi.
