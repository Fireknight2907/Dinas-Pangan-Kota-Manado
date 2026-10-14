<template>
  <!-- ===================================================================================
       APLIKASI MOBILE DINAS PANGAN KOTA MANADO - SIPATOKAAN
       Framework: Vue 3 + Ionic Framework + Capacitor
       Mode Tampilan:
       1. Publik: Beranda Harga Pangan Masyarakat (Gambar 2)
       2. Login: Portal Utama Login Petugas Mobile (Gambar 4)
       3. Petugas: Modul Penetapan Harga & Dashboard Staf (Gambar 3 - 768w Responsive)
       =================================================================================== -->
  <ion-page class="mobile-page-container">

    <!-- ===============================================================================
         MODE 1: HALAMAN LOGIN PETUGAS MOBILE (SESUAI GAMBAR 4)
         =============================================================================== -->
    <div v-if="tampilanMode === 'login'" class="mobile-login-screen">
      <!-- Tombol Kembali -->
      <button class="btn-back-to-public" @click="tampilanMode = 'publik'">
        ← Kembali ke Beranda
      </button>

      <div class="mobile-login-card">
        <!-- Logo & Brand Header -->
        <div class="mobile-login-brand">
          <div class="mobile-login-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 class="mobile-login-title">SI PATOKAAN</h2>
            <p class="mobile-login-subtitle">PORTAL UTAMA</p>
          </div>
        </div>

        <!-- Sambutan -->
        <div class="mobile-welcome-text">
          <h3>Selamat Datang</h3>
          <p>Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        <!-- Form Login Mobile -->
        <form @submit.prevent="eksekusiLogin" class="mobile-login-form">
          <div class="m-input-group">
            <label>EMAIL / USERNAME</label>
            <div class="m-input-icon-box">
              <span class="m-icon">👤</span>
              <input 
                type="text" 
                v-model="loginInput.email" 
                required 
                placeholder="Masukkan email atau username"
              />
            </div>
          </div>

          <div class="m-input-group">
            <label>PASSWORD</label>
            <div class="m-input-icon-box">
              <span class="m-icon">🔒</span>
              <input 
                :type="lihatPassword ? 'text' : 'password'" 
                v-model="loginInput.password" 
                required 
                placeholder="Masukkan password"
              />
              <button type="button" class="btn-eye" @click="lihatPassword = !lihatPassword">
                {{ lihatPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>

          <div class="m-options-row">
            <label class="m-remember">
              <input type="checkbox" v-model="loginInput.ingatSaya" />
              <span>Ingat saya</span>
            </label>
            <a href="#" class="m-forgot" @click.prevent="alertLupaPassword">Lupa password?</a>
          </div>

          <button type="submit" class="btn-m-submit" :disabled="sedangLogin">
            {{ sedangLogin ? 'Memproses...' : 'Masuk Sekarang' }}
          </button>
        </form>
      </div>
    </div>


    <!-- ===============================================================================
         MODE 2: MODUL PETUGAS / STAF BIDANG DISTRIBUSI & CADANGAN (SESUAI GAMBAR 3)
         =============================================================================== -->
    <div v-else-if="tampilanMode === 'petugas'" class="mobile-staff-module">
      <ion-header class="ion-no-border mobile-staff-header">
        <!-- Top bar Petugas -->
        <div class="staff-header-top">
          <div class="staff-header-brand">
            <div class="staff-logo-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b1e1e" stroke-width="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 class="staff-header-name">Bidang Distribusi & Cadangan</h2>
              <p class="staff-header-sub">Penetapan Harga Pangan</p>
            </div>
          </div>

          <div class="staff-header-user">
            <div class="notif-bell-icon">
              🔔
              <span class="red-dot"></span>
            </div>
            <div class="staff-avatar-mini" title="Roni Tilaar">
              {{ (userAktif?.nama ? userAktif.nama.charAt(0) : 'R').toUpperCase() }}
            </div>
            <button class="btn-logout-mini" @click="eksekusiLogout" title="Keluar">
              Keluar
            </button>
          </div>
        </div>

        <!-- Tab Toggle Modul Petugas -->
        <div class="staff-segmented-bar">
          <button 
            :class="['staff-segment-btn', menuPetugas === 'tetapkan' ? 'active' : '']"
            @click="menuPetugas = 'tetapkan'"
          >
            Tetapkan Harga
          </button>
          <button 
            :class="['staff-segment-btn', menuPetugas === 'dashboard' ? 'active' : '']"
            @click="menuPetugas = 'dashboard'"
          >
            Dashboard
          </button>
        </div>
      </ion-header>

      <ion-content class="mobile-staff-content">
        <!-- SUB-VIEW A: FORMULIR PENETAPAN HARGA & DAFTAR (GAMBAR 3 RESPONSIVE) -->
        <div v-if="menuPetugas === 'tetapkan'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Penetapan Harga Pangan</h1>
            <p class="staff-view-desc">
              Tetapkan harga acuan untuk jenis pangan yang ditetapkan admin, lalu terbitkan ke halaman masyarakat
            </p>
          </div>

          <!-- Alert jika berhasil simpan -->
          <div v-if="pesanSuksesMobile" class="staff-success-banner">
            {{ pesanSuksesMobile }}
          </div>

          <!-- FORMULIR PENETAPAN HARGA -->
          <div class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">+</span>
              <h3>Formulir Penetapan Harga</h3>
            </div>

            <form @submit.prevent="simpanHargaPetugas('Terbit')" class="staff-entry-form">
              <div class="s-field">
                <label>Jenis Pangan (ditetapkan admin)</label>
                <input 
                  type="text" 
                  v-model="formPenetapan.nama_komoditas" 
                  required 
                  placeholder="Contoh: Beras Medium"
                  list="daftarOpsiKomoditas"
                />
                <datalist id="daftarOpsiKomoditas">
                  <option value="Beras Medium" />
                  <option value="Beras Premium" />
                  <option value="Minyak Goreng Kemasan" />
                  <option value="Gula Pasir" />
                  <option value="Telur Ayam" />
                  <option value="Daging Ayam" />
                  <option value="Daging Sapi" />
                  <option value="Bawang Merah" />
                  <option value="Bawang Putih" />
                </datalist>
              </div>

              <div class="s-row-two">
                <div class="s-field">
                  <label>Satuan</label>
                  <input type="text" v-model="formPenetapan.satuan" required placeholder="kg" />
                </div>
                <div class="s-field">
                  <label>Harga (Rp)</label>
                  <input type="number" v-model="formPenetapan.harga" required min="0" placeholder="13500" />
                </div>
              </div>

              <div class="s-field">
                <label>Pasar</label>
                <select v-model="formPenetapan.nama_pasar" class="s-select-market">
                  <option value="Pasar Tradisional Bahu">Pasar Tradisional Bahu</option>
                  <option value="Pasar Bersehati Karombasan">Pasar Bersehati Karombasan</option>
                  <option value="Pasar Tradisional Tuminting">Pasar Tradisional Tuminting</option>
                  <option value="Pasar Bersehati Sario">Pasar Bersehati Sario</option>
                </select>
              </div>

              <div class="s-button-stack">
                <button type="submit" class="btn-publish-action">
                  <span>✈️</span> Terbitkan ke Halaman Masyarakat
                </button>
                <button type="button" class="btn-draft-action" @click="simpanHargaPetugas('Draft')">
                  Simpan sebagai Draft
                </button>
              </div>
            </form>
          </div>

          <!-- DAFTAR HARGA SAAT INI (STACKED BELOW FORM SESUAI GAMBAR 3) -->
          <div class="staff-list-panel">
            <h3 class="panel-heading-text">Daftar Harga Saat Ini</h3>

            <div class="prices-items-stack">
              <div v-for="item in semuaKomoditas" :key="item.id" class="price-stack-row">
                <div class="price-info-left">
                  <div class="item-main-title">
                    <strong>{{ item.nama_komoditas }}</strong>
                    <span class="unit-text"> / {{ item.satuan || 'kg' }}</span>
                  </div>
                  <div class="item-sub-meta">
                    {{ item.nama_pasar }} · {{ item.tanggal_penetapan || '14 Oktober 2026' }}
                  </div>
                </div>

                <div class="price-info-right">
                  <div class="price-nominal-red">{{ formatRupiah(item.harga) }}</div>
                  <span 
                    :class="['status-badge-tag', item.status === 'Draft' ? 'is-draft' : 'is-terbit']"
                    @click="ubahStatusItem(item)"
                    title="Klik untuk ubah status"
                  >
                    {{ item.status || 'Terbit' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- SUB-VIEW B: DASHBOARD STATS PETUGAS -->
        <div v-if="menuPetugas === 'dashboard'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Dashboard Petugas</h1>
            <p class="staff-view-desc">Ringkasan status komoditas & Gerakan Pangan Murah</p>
          </div>

          <div class="staff-stats-grid">
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.harga_ditetapkan }}</div>
              <div class="stat-lbl">Harga Ditetapkan</div>
              <div class="stat-sub">terbit ke publik</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.draft_harga }}</div>
              <div class="stat-lbl">Draft Harga</div>
              <div class="stat-sub">belum terbit</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.gpm_terjadwal }}</div>
              <div class="stat-lbl">GPM Terjadwal</div>
              <div class="stat-sub">kegiatan mendatang</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.gpm_selesai }}</div>
              <div class="stat-lbl">GPM Selesai</div>
              <div class="stat-sub">bulan ini</div>
            </div>
          </div>
        </div>

      </ion-content>
    </div>


    <!-- ===============================================================================
         MODE 3: TAMPILAN BERANDA PUBLIK MOBILE (SESUAI GAMBAR 2)
         =============================================================================== -->
    <div v-else class="mobile-public-screen">
      <!-- 1. Header Utama Mobile -->
      <ion-header :translucent="false" class="ion-no-border mobile-main-header">
        <div class="mobile-top-bar">
          <div class="brand-left">
            <div class="logo-box-maroon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div class="brand-title-wrap">
              <h1 class="brand-name">SIPATOKAAN</h1>
              <p class="brand-agency">Dinas Pangan Kota Manado</p>
            </div>
          </div>

          <div class="header-actions-right">
            <!-- Tombol Login Petugas Mobile -->
            <button class="btn-login-mobile" @click="bukaLoginMobile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              <span>Login</span>
            </button>
          </div>
        </div>

        <!-- 2. Tab Navigasi Mobile -->
        <div class="mobile-tab-navigation">
          <button 
            :class="['mobile-tab-item', tabAktif === 'harga' ? 'active' : '']"
            @click="tabAktif = 'harga'"
          >
            Harga Pangan
          </button>
          <button 
            :class="['mobile-tab-item', tabAktif === 'gpm' ? 'active' : '']"
            @click="tabAktif = 'gpm'"
          >
            Gerakan Pangan Murah
          </button>
        </div>
      </ion-header>

      <!-- 3. Konten Utama Beranda Publik -->
      <ion-content :fullscreen="true" class="mobile-content-area">
        <!-- Hero Banner Maroon -->
        <div class="mobile-hero-card">
          <div class="hero-badge-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            <span>Pemantauan Harga Pangan</span>
          </div>

          <h2 class="hero-title-text">Harga Pangan Kota Manado</h2>

          <p class="hero-desc-text">
            Informasi terkini harga produsen dan konsumen komoditas pangan di pasar Kota Manado. Data diperbarui rutin oleh Dinas Pangan untuk transparansi dan stabilisasi harga.
          </p>

          <div class="hero-update-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Pembaruan terakhir: Selasa, 22 September 2026</span>
          </div>
        </div>

        <!-- 4. Filter Kategori Chips -->
        <div class="mobile-chips-scroll">
          <button
            v-for="kat in daftarKategoriList"
            :key="kat.key"
            :class="['mobile-chip-btn', kategoriAktif === kat.key ? 'active' : '']"
            @click="pilihKategori(kat.key)"
          >
            <span v-if="kat.icon" class="chip-emoji">{{ kat.icon }}</span>
            <span>{{ kat.label }}</span>
            <span class="chip-number">{{ statistik[kat.key] ?? 0 }}</span>
          </button>
        </div>

        <!-- 5. Search Bar & Dropdown -->
        <div class="mobile-search-section">
          <div class="mobile-search-box">
            <input
              type="text"
              v-model="kataKunciPencarian"
              @input="filterDataLokal"
              placeholder="Cari komoditas: beras, cabai, daging, ikan..."
              class="mobile-search-input"
            />
            <button v-if="kataKunciPencarian" class="btn-clear-mobile" @click="resetPencarian">✕</button>
          </div>

          <div class="mobile-select-box">
            <select v-model="pasarAktif" @change="muatData" class="mobile-native-select">
              <option value="Semua">Semua Kategori</option>
              <option v-for="(p, i) in daftarPasar" :key="i" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <!-- 6. Subheader Info Row -->
        <div class="mobile-info-summary-row">
          <span class="info-found-text">{{ komoditasTerfilter.length }} komoditas ditemukan</span>
          <span class="info-unit-text">Harga per kg</span>
        </div>

        <!-- 7. Grid 2 Kolom Kartu Komoditas -->
        <div class="mobile-commodity-2col-grid">
          <div 
            v-for="item in komoditasTerfilter" 
            :key="item.id" 
            class="mobile-item-card"
          >
            <div class="item-header-row">
              <span class="unit-label">SATUAN {{ item.satuan || 'KG' }}</span>
              <span class="market-pill-tag" :title="item.nama_pasar">
                {{ item.nama_pasar }}
              </span>
            </div>

            <h3 class="item-name-heading">{{ item.nama_komoditas }}</h3>

            <div class="item-price-tag">
              {{ formatRupiah(item.harga) }}
            </div>

            <div class="item-footer-row">
              <span class="item-date-text">
                Ditetapkan {{ item.tanggal_penetapan || '8 Oktober 2026' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 8. Footer Mobile -->
        <div class="mobile-source-footer">
          <p>Sumber: Dinas Pangan Kota Manado</p>
        </div>
      </ion-content>
    </div>

  </ion-page>
</template>

<script setup lang="ts">
// ===================================================================================
// LOGIKA SCRIPT (VUE 3 COMPOSITION API & OOP SERVICE MOBILE)
// ===================================================================================

import { ref, computed, onMounted } from 'vue';
import { IonPage, IonHeader, IonContent } from '@ionic/vue';
import { 
  hargaPanganMobileService, 
  ItemHargaPangan, 
  StatistikKategori,
  StatistikDashboardMobile
} from '../services/HargaPanganService';

// Mode Tampilan Mobile: 'publik', 'login', 'petugas'
const tampilanMode = ref<'publik' | 'login' | 'petugas'>('publik');
const userAktif = ref(hargaPanganMobileService.ambilUser());

// Tab Navigasi Publik ('harga' | 'gpm')
const tabAktif = ref('harga');

// State Filter Kategori & Pasar
const kategoriAktif = ref('Semua');
const pasarAktif = ref('Semua');
const kataKunciPencarian = ref('');

// State Data dari Backend / Supabase
const semuaKomoditas = ref<ItemHargaPangan[]>([]);
const daftarPasar = ref<string[]>([]);
const statistik = ref<StatistikKategori>({
  Semua: 9,
  'Bahan Pokok': 4,
  Hewani: 3,
  Sayuran: 2,
  Buah: 0,
  Lainnya: 0
});

// State Dashboard Petugas Mobile
const menuPetugas = ref<'tetapkan' | 'dashboard'>('tetapkan');
const statsDashboard = ref<StatistikDashboardMobile>({
  harga_ditetapkan: 2,
  draft_harga: 1,
  gpm_terjadwal: 2,
  gpm_selesai: 1
});
const pesanSuksesMobile = ref('');

// Form Penetapan Harga Petugas Mobile (Gambar 3)
const formPenetapan = ref({
  nama_komoditas: '',
  satuan: 'kg',
  harga: '',
  nama_pasar: 'Pasar Tradisional Bahu',
  status: 'Terbit'
});

// State Login Mobile (Gambar 4)
const loginInput = ref({
  email: 'roni@manado.go.id',
  password: 'password123',
  ingatSaya: true
});
const lihatPassword = ref(false);
const sedangLogin = ref(false);

// Daftar Kategori Filter
const daftarKategoriList = [
  { key: 'Semua', label: 'Semua', icon: '' },
  { key: 'Bahan Pokok', label: 'Bahan Pokok', icon: '' },
  { key: 'Hewani', label: 'Hewani', icon: '' },
  { key: 'Sayuran', label: 'Sayuran', icon: '🥬' },
  { key: 'Buah', label: 'Buah', icon: '🍊' },
  { key: 'Lainnya', label: 'Lainnya', icon: '' }
];

// Lifecycle: Ambil data saat awal dibuka
onMounted(async () => {
  await muatData();
  await muatStatsDashboard();
});

const muatData = async () => {
  try {
    const data = await hargaPanganMobileService.ambilSemua(kategoriAktif.value, pasarAktif.value, kataKunciPencarian.value);
    semuaKomoditas.value = data;

    const stat = await hargaPanganMobileService.ambilStatistik();
    statistik.value = stat;

    const pasar = await hargaPanganMobileService.ambilDaftarPasar();
    daftarPasar.value = pasar;
  } catch (error) {
    console.error('Error saat muat data mobile:', error);
  }
};

const muatStatsDashboard = async () => {
  try {
    const stats = await hargaPanganMobileService.ambilStatistikDashboard();
    statsDashboard.value = stats;
  } catch (e) {
    console.error(e);
  }
};

const pilihKategori = (kategori: string) => {
  kategoriAktif.value = kategori;
  muatData();
};

const resetPencarian = () => {
  kataKunciPencarian.value = '';
  muatData();
};

const filterDataLokal = () => {
  muatData();
};

// Filter data komoditas publik (hanya yang Terbit atau semua fallback)
const komoditasTerfilter = computed(() => {
  return semuaKomoditas.value.filter(item => item.status !== 'Draft');
});

// Format Rupiah
const formatRupiah = (nominal: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(nominal).replace('IDR', 'Rp');
};

// ─────────────────────────────────────────────
// OPERASI LOGIN & LOGOUT MOBILE
// ─────────────────────────────────────────────
const bukaLoginMobile = () => {
  if (userAktif.value) {
    tampilanMode.value = 'petugas';
  } else {
    tampilanMode.value = 'login';
  }
};

const eksekusiLogin = async () => {
  sedangLogin.value = true;
  try {
    const hasil = await hargaPanganMobileService.login(loginInput.value.email, loginInput.value.password);
    userAktif.value = hasil.pengguna;
    tampilanMode.value = 'petugas';
    await muatData();
    await muatStatsDashboard();
  } catch (err: any) {
    alert('Login gagal: ' + err.message);
  } finally {
    sedangLogin.value = false;
  }
};

const eksekusiLogout = () => {
  hargaPanganMobileService.keluar();
  userAktif.value = null;
  tampilanMode.value = 'publik';
};

const alertLupaPassword = () => {
  alert('Silakan hubungi administrator Dinas Pangan Kota Manado.');
};

// ─────────────────────────────────────────────
// OPERASI PETUGAS MOBILE (TETAPKAN HARGA)
// ─────────────────────────────────────────────
const simpanHargaPetugas = async (status: 'Terbit' | 'Draft') => {
  if (!formPenetapan.value.nama_komoditas || !formPenetapan.value.harga) {
    alert('Nama komoditas dan harga wajib diisi!');
    return;
  }

  try {
    await hargaPanganMobileService.tambah({
      nama_komoditas: formPenetapan.value.nama_komoditas,
      kategori: 'Bahan Pokok',
      satuan: formPenetapan.value.satuan,
      harga: parseFloat(formPenetapan.value.harga),
      nama_pasar: formPenetapan.value.nama_pasar,
      tanggal_penetapan: '14 Oktober 2026',
      status: status
    });

    pesanSuksesMobile.value = status === 'Terbit' 
      ? '✅ Harga berhasil diterbitkan ke masyarakat!' 
      : '📝 Harga disimpan sebagai draft!';
    setTimeout(() => pesanSuksesMobile.value = '', 3500);

    formPenetapan.value.nama_komoditas = '';
    formPenetapan.value.harga = '';

    await muatData();
    await muatStatsDashboard();
  } catch (e: any) {
    alert('Gagal menyimpan harga: ' + e.message);
  }
};

const ubahStatusItem = async (item: ItemHargaPangan) => {
  const statusBaru = item.status === 'Terbit' ? 'Draft' : 'Terbit';
  if (item.id) {
    await hargaPanganMobileService.perbarui(item.id, { status: statusBaru });
    await muatData();
    await muatStatsDashboard();
  }
};
</script>

<style scoped>
/* ===================================================================================
   STYLING MOBILE VIEW LENGKAP: PUBLIK, LOGIN, DAN PETUGAS (GAMBAR 2, 3, 4)
   =================================================================================== */

.mobile-page-container {
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* =======================================================
   1. LOGIN SCREEN MOBILE (SESUAI GAMBAR 4)
   ======================================================= */
.mobile-login-screen {
  min-height: 100vh;
  background: url('/login-bg.png') no-repeat center center;
  background-size: cover;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 16px;
  position: relative;
}

.btn-back-to-public {
  position: absolute;
  top: 18px;
  left: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #8b1e1e;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  backdrop-filter: blur(4px);
}

.mobile-login-card {
  background: linear-gradient(145deg, rgba(163, 29, 29, 0.94) 0%, rgba(130, 20, 20, 0.97) 100%);
  backdrop-filter: blur(12px);
  border-radius: 18px;
  padding: 28px 20px;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 15px 35px rgba(80, 10, 10, 0.4);
}

.mobile-login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.mobile-login-logo {
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-login-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}

.mobile-login-subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.8px;
  margin: 0;
  opacity: 0.85;
}

.mobile-welcome-text h3 {
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0 0 4px 0;
}

.mobile-welcome-text p {
  font-size: 0.82rem;
  opacity: 0.85;
  margin: 0 0 20px 0;
}

.mobile-login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.m-input-group label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  display: block;
  opacity: 0.9;
}

.m-input-icon-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  padding: 0 10px;
}

.m-input-icon-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  padding: 10px 8px;
  font-size: 0.85rem;
}

.m-input-icon-box input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.btn-eye {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.m-options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
}

.m-remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
}

.m-forgot {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}

.btn-m-submit {
  background: linear-gradient(180deg, #c52222 0%, #9e1414 100%);
  color: #ffffff;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.92rem;
  margin-top: 6px;
  box-shadow: 0 4px 14px rgba(80, 10, 10, 0.35);
}

/* =======================================================
   2. PETUGAS MOBILE SCREEN (SESUAI GAMBAR 3)
   ======================================================= */
.mobile-staff-module {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.mobile-staff-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.staff-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px 16px;
}

.staff-header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.staff-logo-box {
  width: 34px;
  height: 34px;
  background: #ffffff;
  border: 1.5px solid #8b1e1e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.staff-header-name {
  font-size: 0.92rem;
  font-weight: 800;
  color: #111827;
  margin: 0;
}

.staff-header-sub {
  font-size: 0.72rem;
  color: #6b7280;
  margin: 0;
}

.staff-header-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-bell-icon {
  position: relative;
  font-size: 1.1rem;
}

.red-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 7px;
  height: 7px;
  background-color: #dc2626;
  border-radius: 50%;
}

.staff-avatar-mini {
  width: 32px;
  height: 32px;
  background-color: #8b1e1e;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
}

.btn-logout-mini {
  background: #fee2e2;
  color: #991b1b;
  border: none;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 8px;
  border-radius: 6px;
}

.staff-segmented-bar {
  display: flex;
  padding: 6px 16px 10px 16px;
  gap: 8px;
}

.staff-segment-btn {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  font-weight: 700;
  font-size: 0.82rem;
}

.staff-segment-btn.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.mobile-staff-content {
  --background: #f8fafc;
}

.staff-view-container {
  padding: 16px 14px 40px 14px;
}

.staff-heading-area {
  margin-bottom: 16px;
}

.staff-view-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 6px 0;
}

.staff-view-desc {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

.staff-success-banner {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 14px;
}

.staff-form-panel {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}

.plus-icon-red {
  color: #8b1e1e;
  font-weight: 800;
  font-size: 1.2rem;
}

.panel-title-row h3 {
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  margin: 0;
}

.staff-entry-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.s-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.s-field label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
}

.s-field input, .s-select-market {
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.85rem;
  outline: none;
}

.s-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.s-select-market {
  background-color: #ffffff;
  border-color: #fecaca;
}

.s-button-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.btn-publish-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background-color: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 11px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.86rem;
}

.btn-draft-action {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #4b5563;
  padding: 9px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8rem;
}

/* Panel Daftar Harga Stacked (Gambar 3) */
.staff-list-panel {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
}

.panel-heading-text {
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 14px 0;
}

.prices-items-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-stack-row {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-main-title {
  font-size: 0.88rem;
  margin-bottom: 2px;
}

.item-main-title strong {
  color: #111827;
}

.unit-text {
  color: #6b7280;
  font-size: 0.78rem;
}

.item-sub-meta {
  font-size: 0.7rem;
  color: #6b7280;
}

.price-info-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.price-nominal-red {
  font-size: 1rem;
  font-weight: 800;
  color: #8b1e1e;
}

.status-badge-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.is-terbit {
  background: #dcfce7;
  color: #15803d;
}

.is-draft {
  background: #fef3c7;
  color: #b45309;
}

.staff-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-box-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.stat-val {
  font-size: 1.8rem;
  font-weight: 800;
  color: #111827;
}

.stat-lbl {
  font-size: 0.85rem;
  font-weight: 700;
  color: #374151;
}

.stat-sub {
  font-size: 0.72rem;
  color: #9ca3af;
}

/* =======================================================
   3. BERANDA PUBLIK MOBILE (GAMBAR 2)
   ======================================================= */
.mobile-public-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.mobile-main-header {
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
}

.mobile-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px 16px;
}

.brand-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-box-maroon {
  width: 36px;
  height: 36px;
  background-color: #8b1e1e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title-wrap {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  line-height: 1.1;
  margin: 0;
}

.brand-agency {
  font-size: 0.72rem;
  color: #6b7280;
  margin: 2px 0 0 0;
}

.header-actions-right {
  display: flex;
  align-items: center;
}

.btn-login-mobile {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}

.mobile-tab-navigation {
  display: flex;
  padding: 6px 16px 10px 16px;
  gap: 12px;
}

.mobile-tab-item {
  border: none;
  background: transparent;
  font-size: 0.88rem;
  font-weight: 600;
  color: #4b5563;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.mobile-tab-item.active {
  background-color: #e5a7a7;
  color: #661616;
}

.mobile-content-area {
  --background: #f8fafc;
}

.mobile-hero-card {
  margin: 12px 14px 16px 14px;
  background-color: #8b1e1e;
  color: #ffffff;
  border-radius: 12px;
  padding: 20px 16px;
  box-shadow: 0 4px 12px rgba(139, 30, 30, 0.2);
}

.hero-badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.72rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.hero-title-text {
  font-size: 1.45rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.hero-desc-text {
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
}

.hero-update-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.85);
}

.mobile-chips-scroll {
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding: 0 14px 14px 14px;
  scrollbar-width: none;
}

.mobile-chips-scroll::-webkit-scrollbar {
  display: none;
}

.mobile-chip-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 20px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.mobile-chip-btn.active {
  background-color: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.chip-number {
  background-color: #e5e7eb;
  color: #374151;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 700;
}

.mobile-chip-btn.active .chip-number {
  background-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.mobile-search-section {
  display: flex;
  gap: 8px;
  padding: 0 14px 12px 14px;
}

.mobile-search-box {
  flex: 2;
  position: relative;
}

.mobile-search-input {
  width: 100%;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.8rem;
  background-color: #ffffff;
  outline: none;
}

.btn-clear-mobile {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 0.85rem;
}

.mobile-select-box {
  flex: 1;
}

.mobile-native-select {
  width: 100%;
  height: 100%;
  border: 1.5px solid #1f2937;
  border-radius: 8px;
  padding: 9px 8px;
  font-size: 0.78rem;
  background-color: #1f2937;
  color: #ffffff;
  font-weight: 600;
  outline: none;
}

.mobile-info-summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 16px 12px 16px;
  font-size: 0.76rem;
  color: #6b7280;
  font-weight: 500;
}

.mobile-commodity-2col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 14px 20px 14px;
}

.mobile-item-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
}

.item-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 4px;
}

.unit-label {
  font-size: 0.64rem;
  font-weight: 700;
  color: #6b7280;
  white-space: nowrap;
}

.market-pill-tag {
  font-size: 0.6rem;
  font-weight: 700;
  background-color: #fee2e2;
  color: #991b1b;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 95px;
}

.item-name-heading {
  font-size: 0.92rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 6px 0;
  line-height: 1.2;
}

.item-price-tag {
  font-size: 1.15rem;
  font-weight: 800;
  color: #8b1e1e;
  margin-bottom: 8px;
}

.item-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed #f1f5f9;
  padding-top: 6px;
  margin-top: auto;
}

.item-date-text {
  font-size: 0.64rem;
  color: #9ca3af;
}

.mobile-source-footer {
  text-align: center;
  padding: 24px 14px 40px 14px;
  color: #9ca3af;
  font-size: 0.74rem;
}
</style>
