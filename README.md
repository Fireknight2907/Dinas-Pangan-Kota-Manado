# Dinas-Pangan-Kota-Manado (SI PATOKAAN)

**Sistem Informasi Pengendalian Pangan Terpadu Kota Manado (SI PATOKAAN)**  
Dinas Pangan Pemerintah Kota Manado.  
Aplikasi ini memantau perkembangan harga komoditas pangan harian, verifikasi berjenjang (Staf ➔ Kabid ➔ Publik), tren inflasi pangan untuk Kepala Dinas, serta pendaftaran tiket antrean digital Gerakan Pangan Murah (GPM) bagi masyarakat Kota Manado.

---

### Platform & Arsitektur Sistem:
1. **Website Portal Publik & Dashboard Petugas**: React + Vite (Tailwind / Modern CSS)
2. **Aplikasi Mobile Android**: Vue 3 + Ionic Framework + Capacitor (File APK siap pasang: `DinasPanganManado.apk`)
3. **Database & API**: 
   - **Mode Cloud (Aktif Saat Ini)**: PostgreSQL / Supabase REST API (Sinkronisasi langsung real-time Web & Mobile).
   - **Mode On-Premise (Server Mandiri)**: Node.js Express API + PostgreSQL Lokal (`sipatokaan_db`).

---

## 🛠️ PANDUAN 1: SETUP MENGGUNAKAN SUPABASE CLOUD (DEFAULT)

Gunakan panduan ini jika Anda menggunakan layanan Supabase Cloud baru:

### 1. Inisialisasi Database di Supabase
1. Buka [Dashboard Supabase](https://supabase.com/dashboard) dan buat proyek baru.
2. Buka menu **SQL Editor**, salin seluruh isi file berikut:
   📄 **`backend/database/setup_lengkap_supabase.sql`**
3. Klik tombol **Run**. Seluruh tabel (`pengguna`, `harga_pangan`, `acara_gpm`, `pendaftar_gpm`), aturan keamanan RLS, fungsi RPC login aman (`rpc_login_pengguna`), serta data awal komoditas & akun dinas akan otomatis terpasang.

### 2. Konfigurasi Kunci Lingkungan (.env)
Buka dan sesuaikan kredensial di file `.env` masing-masing modul:
* **Website (`website/.env`):**
  ```env
  VITE_SUPABASE_URL=https://PROYEK_ANDA.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_KUNCI_ANON_ANDA
  ```
* **Mobile (`mobile/.env`):**
  ```env
  VITE_SUPABASE_URL=https://PROYEK_ANDA.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_KUNCI_ANON_ANDA
  ```
* **Backend (`backend/.env`):**
  ```env
  PORT=3000
  URL_SUPABASE=https://PROYEK_ANDA.supabase.co
  KUNCI_SUPABASE=sb_publishable_KUNCI_ANON_ANDA
  KUNCI_JWT=kunci_rahasia_dinas_pangan_manado_2026
  ```

---

## 🏢 PANDUAN 2: SETUP LOKAL / SERVER MANDIRI DINAS (TANPA SUPABASE)

Gunakan panduan ini jika aplikasi hendak diserahkan ke pihak klien / Dinas Pangan untuk di-install pada server lokal kantor (*on-premise*) tanpa ketergantungan pada pihak ketiga (Supabase Cloud):

### Prasyarat Perangkat Lunak di Komputer Server:
* **Node.js LTS** (v18 atau lebih baru) ➔ [Unduh di nodejs.org](https://nodejs.org/)
* **PostgreSQL** (v14/v15/v16) atau **pgAdmin 4** ➔ [Unduh di postgresql.org](https://www.postgresql.org/)

---

### Langkah 1: Pasang & Buat Database PostgreSQL Lokal
1. Buka terminal atau jalankan skrip pembantu otomatis:
   * Klik dua kali file **`setup_app.bat`** di folder utama.
   * Pilih menu **`[2] Inisialisasi Database PostgreSQL Mandiri`**.
2. **Atau Secara Manual via pgAdmin 4:**
   * Buka pgAdmin 4, buat basis data baru bernama: `sipatokaan_db`.
   * Buka Query Tool pada database `sipatokaan_db`.
   * Salin dan jalankan seluruh isi file:
     📄 **`backend/database/setup_postgresql_mandiri.sql`**
   * *Skrip ini akan otomatis membuat tabel, master pasar, master kecamatan, akun petugas resmi, serta 15 komoditas harga awal.*

---

### Langkah 2: Konfigurasi & Jalankan Server Backend Mandiri
1. Buka berkas **`backend/.env`**, sesuaikan konfigurasi port dan kunci lokal:
   ```env
   PORT=3000
   KUNCI_JWT=kunci_rahasia_dinas_pangan_manado_2026
   ```
2. Jalankan server API backend:
   * Lewat `setup_app.bat`: Pilih menu **`[4] Jalankan Server API Backend Mandiri`**.
   * Atau lewat terminal:
     ```bash
     cd backend
     npm install
     node server.js
     ```
   * Server API backend akan aktif berjalan di `http://localhost:3000` (atau IP jaringan kantor, misal: `http://192.168.1.100:3000`).

---

### Langkah 3: Mengarahkan Website Portal ke Server Lokal
1. Buka berkas **`website/.env`**, arahkan ke alamat API server lokal:
   ```env
   VITE_API_ROOT=http://localhost:3000/api
   ```
   *(Jika website dibuka dari komputer lain di jaringan LAN kantor, ganti `localhost` dengan IP komputer server, misal: `http://192.168.1.100:3000/api`)*.
2. Kompilasi aset website siap saji:
   ```bash
   cd website
   npm run build
   ```
3. Folder produksi `website/dist` siap diunggah ke web server lokal (Nginx, Apache, IIS, atau hosting intranet pemkot).

---

### Langkah 4: Mengarahkan Aplikasi Android APK ke Server Kantor
Ada 2 cara mudah untuk menghubungkan aplikasi Android ke server lokal kantor:

* **Cara A (Sangat Mudah — Langsung dari Layar HP Tanpa Koding):**
  1. Buka aplikasi SI PATOKAAN di HP Android.
  2. Klik ikon atau menu **Pengaturan Server** (di beranda / pojok layar).
  3. Masukkan alamat IP komputer server kantor Anda, contoh:
     `http://192.168.1.100:3000`
  4. Klik **Simpan & Uji Koneksi**. Aplikasi HP akan langsung terhubung ke database lokal kantor secara real-time!

* **Cara B (Build Ulang APK dengan Default IP Server Kantor Baru):**
  1. Buka berkas `mobile/src/services/ServerConfig.ts`, sesuaikan IP bawaan:
     ```typescript
     export const DEFAULT_HOST_LAN = '192.168.1.100'; // Ganti dengan IP komputer server Anda
     export const DEFAULT_PORT = '3000';
     ```
  2. Buka terminal dan kompilasi APK baru:
     ```bash
     cd mobile
     npm run build
     npx cap copy android
     cd android
     ./gradlew.bat assembleDebug
     ```
  3. Salin berkas APK hasil kompilasi:
     `mobile/android/app/build/outputs/apk/debug/app-debug.apk` ➔ Bagikan file APK ke perangkat petugas dinas.

---

## 👥 AKUN BAWAAN RESMI (LOGIN SISTEM)

Semua akun dinas di bawah ini memiliki kata sandi awal default: **`12345678`**

| Peran | Nama Akun | Username | Hak Akses Utama |
|---|---|---|---|
| **Superadmin** | Super Administrator | `superadmin` | Akses penuh seluruh modul, kelola master pasar/wilayah, tambah/hapus pengguna, hard reset sandi. |
| **Administrator** | Regina / Edrick | `regina` / `edrick` | Kelola master data, kelola pengguna dinas, monitoring kegiatan GPM. |
| **Kepala Bidang** | Mareta | `mareta` | **Verifikasi Harga Pangan**, persetujuan/penerbitan draf dari staf, penyelesaian & arsip acara GPM. |
| **Staf Petugas** | Effrend | `effrend` | **Input Data Harga Pangan Harian** (mengajukan draf ke Kabid), verifikasi pendaftaran tiket GPM warga. |
| **Kepala Dinas** | Pimpinan Dinas Pangan | `kadis` | Monitoring visual eksekutif, grafik tren fluktuasi komoditas pangan, laporan rekapitulasi inflasi. |

---

## 🔒 FITUR KEAMANAN & KEPATUHAN PRIVASI (UU PDP NO. 27 TAHUN 2022)

Sistem telah dilengkapi modul penguatan keamanan yang tetap aktif baik di Cloud maupun On-Premise:
1. **Perlindungan Data Pribadi NIK (Zero-Data Exposure):**
   - Saat masyarakat mendaftar tiket GPM, formulir input NIK **tetap terbuka dan jelas** agar warga tidak salah ketik.
   - Pengecekan duplikasi NIK dilakukan secara terisolasi (`cekNikTerdaftar`), sehingga **tidak pernah mengunduh daftar NIK warga lain** ke memori browser atau log jaringan.
2. **Perlindungan Brute-Force (Rate Limiting):**
   - Batas toleransi maksimal 5 kali percobaan login gagal. Jika dilanggar, form login terkunci selama 5 menit secara otomatis.
3. **Pencegahan Pemalsuan Hak Akses (Role Double-Check):**
   - Sistem selalu memvalidasi status hak akses ke server (`verifikasiHakAdminServer()`) sebelum mengizinkan aksi administratif, mencegah manipulasi peran melalui DevTools.
4. **Masa Berlaku Sesi (Token Expiry):**
   - Sesi login memiliki batas kedaluwarsa 8 jam dan otomatis membersihkan penyimpanan saat habis masa berlakunya.
