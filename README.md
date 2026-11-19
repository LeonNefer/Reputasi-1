# CoolSmartGames

Website multi-halaman CoolSmartGames untuk orang tua memantau latihan anak, meninjau jawaban yang benar atau keliru, membaca penjelasan soal, serta menyimpan catatan untuk dibahas bersama.

## Menjalankan website

Website memakai HTML, CSS, dan JavaScript module tanpa bundler. Jalankan server statis dari folder proyek:

    python -m http.server 8000

Buka http://localhost:8000 di browser. Di Windows, tersedia juga server pratinjau lokal:

    powershell -ExecutionPolicy Bypass -File .\serve-preview.ps1

Server tersebut membuka http://127.0.0.1:8123 dan hanya menerima koneksi dari komputer ini. Jangan membuka index.html langsung melalui file://, karena modul JavaScript perlu dilayani melalui HTTP.

## Menghubungkan Supabase

Saat ini belum ada proyek Supabase yang tersambung ke workspace ini, jadi website membuka pratinjau demo sampai kredensial proyek dimasukkan.

1. Buat atau pilih proyek Supabase.
2. Salin Project URL dan publishable key dari Project Settings → API Keys ke supabase-config.js.
3. Jalankan isi supabase/schema.sql melalui SQL Editor proyek.
4. Di Authentication → URL Configuration, atur Site URL untuk alamat utama website dan tambahkan alamat lokal serta produksi ke daftar Redirect URLs.
5. Daftar melalui halaman masuk. Jika konfirmasi email aktif, buka tautan konfirmasi sebelum masuk.
6. Setelah masuk, buka menu Karakter anak untuk membuat profil anak.

Publishable key memang dipakai pada browser. Jangan masukkan service_role atau secret key ke website.

## Data belajar

Tabel learning_sessions dan question_attempts menjadi sumber ringkasan, jawaban, penjelasan, serta catatan orang tua. Dashboard memberi akun orang tua akses baca berdasarkan kepemilikan profil anak; orang tua hanya dapat mengubah kolom parent_note pada jawaban anaknya sendiri.

Hasil sesi sebaiknya dikirim dari backend tepercaya milik aplikasi belajar. Schema tidak memberi browser orang tua izin untuk membuat atau mengubah nilai latihan. Catatan orang tua dapat disimpan langsung melalui kebijakan Row Level Security.

Pratinjau demo memakai contoh data dan penyimpanan browser lokal; data tersebut tidak berasal dari Supabase.
