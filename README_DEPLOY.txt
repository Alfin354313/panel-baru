JENIUS EDU - SUPABASE ONLINE

Versi ini menghubungkan panel ke Supabase:
- Login admin via Supabase Auth
- students -> tabel students
- payments -> tabel payments
- invoices -> tabel invoices
- expenses -> tabel expenses
- Invoice tetap dapat dicetak/disimpan PDF dan dikirim via WhatsApp
- Jika ada data versi localStorage lama dan database masih kosong, data lama akan dimigrasikan satu kali setelah login.

Vercel Environment Variables yang diperlukan:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Jangan memasukkan secret/service_role key ke frontend.

PENTING:
1. Pastikan project Vercel terhubung ke repository yang berisi index.html dan folder api/.
2. Setelah commit/deploy, login menggunakan akun admin yang dibuat di Supabase Authentication.
3. Jika data lama tersimpan di browser yang sama, login pertama dapat memigrasikannya ke Supabase jika database masih kosong.
