# Dinas-Pangan-Kota-Manado (SIPATOKAAN)

Sistem Informasi Pengendalian Pangan Terpadu Kota Manado (SIPATOKAAN).
Proyek ini memantau perkembangan harga komoditas pangan harian dan pendaftaran antrean Gerakan Pangan Murah (GPM) bagi masyarakat Kota Manado.

### Platform yang Digunakan:
1. **Website Portal Publik & Dashboard Petugas**: React + Vite
2. **Aplikasi Mobile (Android)**: Vue 3 + Ionic Framework + Capacitor
3. **Database Cloud**: PostgreSQL / Supabase REST API (sinkronisasi real-time Web & Mobile)

---

## Notes Pindah Hosting & Ganti Domain

Panduan praktis langkah demi langkah jika suatu saat sistem dipindahkan ke hosting baru, domain resmi pemkot (misalnya `pangan.manadokota.go.id`), atau akun database baru:

### 1. Jika Ganti Akun / URL Database (Supabase)
Jika Anda membuat project Supabase baru atau pindah database:
- **Jalankan Skrip Database:**
  Buka Dashboard Supabase baru -> buka menu **SQL Editor** -> copy seluruh isi file `backend/database/setup_lengkap_supabase.sql` -> klik **Run**. Semua tabel, relasi, akun petugas, dan data komoditas awal langsung terpasang.
- **Ganti URL & API Key di Website:**
  Buka file `website/src/services/SupabaseClient.js`:
  ```javascript
  export const SUPABASE_CONFIG = {
    url: 'https://PROJECT_BARU.supabase.co',
    anonKey: 'KUNCI_ANON_KEY_BARU'
  };
  ```
- **Ganti URL & API Key di Mobile:**
  Buka file `mobile/src/services/ServerConfig.ts`:
  ```typescript
  export const SUPABASE_CONFIG = {
    url: 'https://PROJECT_BARU.supabase.co',
    anonKey: 'KUNCI_ANON_KEY_BARU'
  };
  ```

---

### 2. Jika Ganti Hosting / Domain Website
Jika website dipindahkan dari Vercel ke hosting cPanel, VPS, atau domain dinas resmi:
- **Ubah Alamat Server di Aplikasi Mobile:**
  Buka file `mobile/src/services/ServerConfig.ts`, cari baris:
  ```typescript
  export const VERCEL_HOST = 'https://domain-baru-anda.manadokota.go.id';
  ```
  Ganti dengan alamat domain website Anda yang baru.
- **Build Ulang Website:**
  Buka terminal pada folder website:
  ```bash
  cd website
  npm run build
  ```
  File hasil produksi siap pakai berada di folder `website/dist`. Cukup upload seluruh isi folder `dist` tersebut ke `public_html` di cPanel atau server web hosting baru Anda.

---

### 3. Langkah Update ke File APK Android (Setelah Ganti Domain/Database)
Setiap kali ada perubahan URL atau domain, aplikasi Android wajib di-sinkronkan dan di-compile ulang agar perubahannya aktif:
1. Buka terminal di folder mobile:
   ```bash
   cd mobile
   npm run build
   npx cap sync android
   ```
2. Compile file APK baru:
   ```bash
   cd android
   ./gradlew.bat assembleDebug
   ```
3. File APK terbaru akan otomatis terbuat di:
   `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

---

### Akun Bawaan Petugas (Login Awal)
- **Admin**: `edrick` / `12345678` atau `regina` / `12345678`
- **Kepala Bidang (Kabid)**: `mareta` / `12345678` (Kewenangan verifikasi draf, setujui/terbitkan, tarik, ubah, dan hapus harga)
- **Staf Petugas**: `effrend` / `12345678` (Kewenangan input data harga & ajukan draf ke Kabid, edit harga, tanpa hak hapus)
- **Kepala Dinas (Kadis)**: `kadis` / `12345678` (Monitoring & grafik tren pangan)
