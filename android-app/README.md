# Jenius Edu Android — 0.1.1 preview

Aplikasi Android berbasis WebView untuk website produksi `https://panel-baru-jenius-edu.vercel.app`. Langsung membuka halaman login website, tanpa halaman pilihan panel maupun toolbar native tambahan. Pilihan Admin, Guru dan Orang Tua tersedia di login website. Memerlukan Android 8.0+ dan internet. Tidak menyertakan kredensial, service-role key, atau salinan data murid.

## Build

Buka folder ini di Android Studio (JDK 17, Android SDK 35), atau jalankan build deterministik tanpa Gradle:

```bash
export ANDROID_SDK_ROOT=/lokasi/android-sdk
./build-preview.sh
```

Dibutuhkan JDK 17, Python 3, zip, Android platform 35 dan build-tools 35.0.0. Hasil: `build/Jenius-Edu-0.1.1-preview.apk`. Skrip memverifikasi tanda tangan APK dan mencetak metadata paket. Simpan `build/preview.keystore` secara pribadi jika akan memperbarui APK percobaan ini; jangan masukkan kunci ke Git. Kunci ini khusus preview dengan password standar debug, bukan kunci distribusi produksi. APK final perlu kunci rilis milik pengelola.

## Perilaku

- Website produksi memakai login, RLS, serta Supabase yang sudah ada.
- Sesi disimpan oleh WebView. Akhiri sesi dari menu Keluar website; akun yang masih login dapat langsung kembali ke dashboard. Tombol kembali menutup aplikasi saat tidak ada riwayat.
- Navigasi luar aplikasi hanya membuka HTTPS, tel, mailto, atau WhatsApp lewat aplikasi eksternal.
- Pemilih file memakai Android document picker, tanpa izin akses seluruh penyimpanan.
- Unduhan HTTPS memakai DownloadManager; blob/data maksimal 15 MiB disimpan melalui dialog pilih lokasi.
- Cetak laporan memakai Android PrintManager (pilih Simpan sebagai PDF). Jendela kuitansi dibuka di WebView terpisah; tombol kembali menutupnya.
- HTTP/cleartext dan mixed-content diblokir. Kesalahan SSL dibatalkan. Tidak ada JavascriptInterface yang dapat memanggil kode native secara langsung.

## Uji di HP sebelum distribusi

1. Pasang APK, pastikan langsung tampil login tanpa toolbar tambahan, uji pilihan Admin/Guru/Orang Tua, lalu logout.
2. Uji absensi, catatan, laporan, dan simpan ulang tanpa data ganda.
3. Unggah poster/gambar dari document picker.
4. Cetak kuitansi/laporan ke PDF, unduh PDF/blob dan backup JSON.
5. Buka WhatsApp, uji tombol kembali pada popup dan halaman utama.
6. Uji jaringan putus dan pemulihannya; verifikasi keyboard dan orientasi.

APK preview belum diuji di perangkat atau emulator Android. Build dan verifikasi tanda tangan tidak membuktikan seluruh integrasi WebView berjalan di semua HP. Browser modern dan Android System WebView terbaru disarankan.
