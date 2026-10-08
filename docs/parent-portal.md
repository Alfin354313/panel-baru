# Portal Orang Tua — uji coba satu murid

Aktifkan dengan menyalin seluruh `supabase/parent_portal.sql` ke Supabase SQL Editor dan Run. SQL backup yang sudah dipasang tidak perlu dijalankan ulang. Migrasi ini belum dijalankan oleh Codex di database produksi.

Admin login ke Panel Pengelola utama, buka **Murid → Lita → Undangan Orang Tua → Buat kode undangan**. Tidak perlu login Admin di Portal Orang Tua. Orang tua tetap daftar/login di `/orang-tua.html`. Jika nama Lita tidak persis sama atau ada duplikasi, periksa pilihan sebelum melanjutkan. Undangan pertama mengunci uji coba ke satu ID murid; murid kedua ditolak oleh database. Membuat kode baru membatalkan kode sebelumnya yang belum digunakan. Kode tidak dikirim otomatis.

Orang tua membuka halaman yang sama, Daftar dengan email/password, konfirmasi email jika diaktifkan, lalu login dan masukkan kode. Di Supabase Authentication > URL Configuration, tambahkan URL produksi `/orang-tua.html` sebagai Redirect URL. Enable email signup dan pengiriman email harus tersedia. Admin/Guru tidak dipakai sebagai akun orang tua. Sesi portal disimpan terpisah dari panel utama.

Setelah terhubung, orang tua melihat nama/kelas anak, 24 catatan pembayaran dan 60 catatan absensi terbaru. Orang tua tidak mendapat akses tabel langsung dan tidak bisa memilih ID murid dari browser untuk membaca anak lain. Kode acak 128 bit hanya disimpan sebagai SHA-256 dan berlaku 24 jam sekali pakai. Catatan internal guru, nomor HP, honor guru, dan data anak lain tidak diekspor ke portal. Laporan perkembangan dan PDF belum masuk tahap uji coba ini.

Belum ada penghapusan hubungan/revokasi melalui UI. Jika uji coba perlu dihentikan, administrator database dapat menghapus isi `parent_pilot`; dashboard kemudian tidak memberikan data murid sampai diaktifkan lagi. Jangan mengubah pilot tanpa meninjau hubungan yang sudah ada.

Backup aplikasi versi sebelumnya belum mencakup tabel `parent_pilot`, `parent_links`, dan `parent_invites`; gunakan backup database untuk hubungan portal. Setelah uji coba, integrasikan tabel hubungan ke alur backup/restore dan tambahkan pengaturan/revokasi akses sebelum memperluas ke semua murid.

Validasi lokal: `PGLITE_MODULE=/tmp/jenius-db-test/node_modules/@electric-sql/pglite node tests/parent-portal.cjs`. Tes database membuktikan pembatasan pilot, akses hubungan, proyeksi data dan penolakan undangan invalid/expired/replayed. Login email, data Lita produksi, dan UX browser perlu dicoba setelah migrasi oleh pemilik database.

## Perkembangan, laporan, dan pengumuman
Jalankan `supabase/parent_updates.sql` setelah migrasi portal awal. Guru membuka Laporan, memeriksa pencapaian/catatan/rekomendasi, lalu Publikasikan ke Orang Tua. Portal menampilkan salinan eksplisit; perubahan berikutnya harus dipublikasikan ulang. Tarik dari Portal menghentikan tampilan laporan. Catatan Mengajar internal tidak dibagikan otomatis. Admin membuat/menghapus pengumuman umum melalui menu Pengumuman di bawah Backup & Arsip. Laporan bisa dicetak dan disimpan sebagai PDF melalui browser. Tidak ada jadwal belajar. Data publikasi dan pengumuman belum termasuk backup aplikasi lama.

## Ringkasan, pemulihan password, dan kuitansi
Jalankan `supabase/parent_home.sql` setelah migrasi portal awal. Total tunggakan memakai seluruh catatan pembayaran belum lunas, tidak hanya daftar 24 baris. Absensi dihitung bulan kalender zona Asia/Bangkok. Kuitansi dibaca ulang dari server dan hanya untuk pembayaran Lunas milik anak terhubung. Nomor invoice ditampilkan jika tersedia; tanggal pembayaran tidak dibuat-buat bila belum dicatat. Cetak/Simpan PDF menggunakan browser.

Lupa password: isi email di form login lalu tekan Lupa password. Tambahkan URL preview `/orang-tua.html?recovery=1` ke Supabase Redirect URLs; setelah merge tambahkan juga URL produksi yang sama. Email dikirim oleh Supabase, bukan Codex. Klik tautan email untuk membuka form password baru, isi dan ulangi password, lalu login kembali. Tautan tidak valid/expired menampilkan pesan, tidak mengirim password ke pihak lain. Pengiriman email, callback valid/expired dan cetak browser tetap perlu uji manual.
