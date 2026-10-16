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
            :class="['staff-segment-btn', menuPetugas === 'gpm' ? 'active' : '']"
            @click="menuPetugas = 'gpm'"
          >
            Kelola GPM & Scan
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

        <!-- SUB-VIEW C: PENGELOLAAN GPM & SCAN QR CODE OLEH PETUGAS -->
        <div v-if="menuPetugas === 'gpm'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Pengelolaan GPM & Scan QR Code</h1>
            <p class="staff-view-desc">
              Pindai QR Code antrean masyarakat, pantau pendaftar, dan jadwal lokasi GPM
            </p>
          </div>

          <!-- Sub-Nav Tab Petugas GPM Mobile -->
          <div class="m-gpm-subnav">
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'scan' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'scan'"
            >
              📷 Scan QR Code
            </button>
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'antrean' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'antrean'"
            >
              📋 Data Antrean
            </button>
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'buat' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'buat'"
            >
              📍 Tambah GPM
            </button>
          </div>

          <!-- TAB 1: SCAN QR CODE MOBILE -->
          <div v-if="subMenuPetugasGPM === 'scan'" class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">📷</span>
              <h3>Scan QR Code Antrean Tiket</h3>
            </div>
            <p style="font-size: 0.82rem; color: #64748b; margin: 4px 0 12px 0;">
              Masukkan kode QR tiket masyarakat untuk memverifikasi kehadiran:
            </p>

            <form @submit.prevent="pindaiBarcodeMobile()" class="m-scan-input-wrap">
              <input 
                type="text" 
                v-model="inputBarcodePetugas"
                placeholder="Contoh: GPM-TIKA-001-A9F2"
                class="m-scan-input"
              />
              <button type="submit" class="btn-m-scan-action" :disabled="sedangScanBarcode">
                {{ sedangScanBarcode ? '...' : 'Scan' }}
              </button>
            </form>

            <!-- Quick sample chips -->
            <div class="m-quick-chips">
              <span style="font-size: 0.72rem; color: #888;">Uji coba barcode:</span>
              <button type="button" class="m-chip-pill" @click="pindaiBarcodeMobile('GPM-TIKA-001-A9F2')">Meity (#001)</button>
              <button type="button" class="m-chip-pill" @click="pindaiBarcodeMobile('GPM-TIKA-002-C4B8')">Frangky (#002)</button>
              <button type="button" class="m-chip-pill" @click="pindaiBarcodeMobile('GPM-TIKA-003-X8Q1')">Grace (#003)</button>
            </div>

            <div v-if="pesanScanErrorPetugas" class="m-error-alert">
              ⚠️ {{ pesanScanErrorPetugas }}
            </div>

            <!-- HASIL SCAN PROFIL PENDAFTAR -->
            <div v-if="hasilScanPetugas" class="m-scan-profile-result">
              <div class="m-profile-header">
                <span style="font-size: 0.8rem; font-weight: 700; color: #2e7d32;">
                  ✓ DATA PENDAFTAR DITEMUKAN
                </span>
                <span class="m-badge-queue">
                  #{{ String(hasilScanPetugas.nomor_antrean).padStart(3, '0') }}
                </span>
              </div>

              <div class="m-profile-info-grid">
                <div>
                  <span class="m-info-lbl">Nama Lengkap</span>
                  <strong class="m-info-val">{{ hasilScanPetugas.nama_pendaftar }}</strong>
                </div>
                <div>
                  <span class="m-info-lbl">No. HP / WA</span>
                  <strong class="m-info-val">{{ hasilScanPetugas.nomor_telepon }}</strong>
                </div>
                <div style="grid-column: 1 / -1;">
                  <span class="m-info-lbl">Kode Barcode</span>
                  <code class="m-info-barcode">{{ hasilScanPetugas.kode_barcode }}</code>
                </div>
                <div style="grid-column: 1 / -1;">
                  <span class="m-info-lbl">Status Kehadiran</span>
                  <span :class="['m-status-tag', hasilScanPetugas.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu']">
                    {{ hasilScanPetugas.status_kehadiran === 'Hadir' ? '✓ Hadir / Terverifikasi' : '⏳ Menunggu Verifikasi' }}
                  </span>
                </div>
              </div>

              <div v-if="hasilScanPetugas.status_kehadiran === 'Hadir'" class="m-verified-box">
                ✅ Pendaftar telah diverifikasi hadir di lokasi GPM.
              </div>
              <button 
                v-else 
                class="btn-m-verify-confirm" 
                @click="verifikasiKehadiranMobile"
              >
                ✅ Konfirmasi Kehadiran & Layani Antrean
              </button>
            </div>
          </div>

          <!-- TAB 2: DATA ANTREAN MASYARAKAT -->
          <div v-if="subMenuPetugasGPM === 'antrean'" class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">📋</span>
              <h3>Daftar Orang yang Ambil Nomor ({{ pendaftarGPMList.length }})</h3>
            </div>

            <div class="m-queue-items-list">
              <div v-for="item in pendaftarGPMList" :key="item.id" class="m-queue-item-row">
                <div class="m-queue-number-badge">
                  #{{ String(item.nomor_antrean).padStart(3, '0') }}
                </div>
                <div class="m-queue-meta">
                  <strong>{{ item.nama_pendaftar }}</strong>
                  <div style="font-size: 0.76rem; color: #64748b;">
                    📱 {{ item.nomor_telepon }} · <code>{{ item.kode_barcode }}</code>
                  </div>
                </div>
                <div>
                  <span :class="['m-status-tag', item.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu']">
                    {{ item.status_kehadiran }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: TAMBAH TITIK LOKASI GPM BARU -->
          <div v-if="subMenuPetugasGPM === 'buat'" class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">📍</span>
              <h3>Jadwalkan Lokasi GPM Baru</h3>
            </div>

            <form @submit.prevent="simpanAcaraGPMBaruMobile" class="staff-entry-form">
              <div class="s-field">
                <label>Nama Acara Gerakan Pangan Murah</label>
                <input type="text" v-model="formGPMBaru.nama_acara" required placeholder="Contoh: GPM Malalayang" />
              </div>
              <div class="s-field">
                <label>Lokasi / Alamat</label>
                <input type="text" v-model="formGPMBaru.lokasi" required placeholder="Contoh: Lapangan Bantik" />
              </div>
              <div class="s-field">
                <label>Kecamatan di Manado</label>
                <select v-model="formGPMBaru.kecamatan" class="s-select-market">
                  <option value="Wenang">Wenang</option>
                  <option value="Tikala">Tikala</option>
                  <option value="Wanea">Wanea</option>
                  <option value="Sario">Sario</option>
                  <option value="Malalayang">Malalayang</option>
                  <option value="Tuminting">Tuminting</option>
                  <option value="Singkil">Singkil</option>
                  <option value="Mapanget">Mapanget</option>
                  <option value="Paal Dua">Paal Dua</option>
                </select>
              </div>
              <div class="s-row-two">
                <div class="s-field">
                  <label>Tanggal Pelaksanaan</label>
                  <input type="date" v-model="formGPMBaru.tanggal" required />
                </div>
                <div class="s-field">
                  <label>Kuota Antrean</label>
                  <input type="number" v-model="formGPMBaru.kuota_maksimal" required />
                </div>
              </div>
              <div class="s-field">
                <label>Komoditas Pangan yang Disediakan</label>
                <input type="text" v-model="formGPMBaru.komoditas_tersedia" placeholder="Beras SPHP, Minyakita, Gula Pasir" />
              </div>
              <button type="submit" class="btn-publish-action" :disabled="sedangSimpanGPMBaru">
                <span>📍</span> {{ sedangSimpanGPMBaru ? 'Menyimpan...' : 'Terbitkan Acara ke Peta' }}
              </button>
            </form>
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
        <!-- KONTEN A: HARGA PANGAN -->
        <div v-if="tabAktif === 'harga'">
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
        </div>

        <!-- KONTEN B: GERAKAN PANGAN MURAH (GPM) PUBLIK (TANPA LOGIN) -->
        <div v-else-if="tabAktif === 'gpm'" class="mobile-gpm-public-section">
          <!-- Hero Banner GPM Mobile -->
          <div class="mobile-hero-card gpm-hero-theme">
            <div class="hero-badge-tag">
              <span>🎟️</span>
              <span>Antrean Online GPM Manado</span>
            </div>
            <h2 class="hero-title-text">Gerakan Pangan Murah</h2>
            <p class="hero-desc-text">
              Daftarkan diri Anda untuk mendapatkan nomor antrean dan QR Code resmi kegiatan Gerakan Pangan Murah di Kota Manado. <strong>Tanpa login.</strong>
            </p>
            <div class="hero-update-date">
              <span>📍 {{ daftarAcaraGPM.length }} Lokasi Pelaksanaan Tersedia</span>
            </div>
          </div>

          <!-- TIKET ANTREAN HASIL JIKA SUDAH DAFTAR -->
          <div v-if="tiketGPMHasil" class="mobile-ticket-display-card">
            <div class="m-ticket-top">
              <h3 style="margin:0; font-size: 1.1rem; font-weight: 800;">TIKET ANTREAN RESMI GPM</h3>
              <p style="margin:2px 0 0 0; font-size: 0.8rem; opacity: 0.9;">Dinas Pangan Kota Manado</p>
            </div>
            <div class="m-ticket-body">
              <div class="m-ticket-queue-box">
                <span class="m-ticket-queue-label">NOMOR ANTREAN ANDA</span>
                <div class="m-ticket-queue-num">
                  #{{ String(tiketGPMHasil.tiket.nomor_antrean).padStart(3, '0') }}
                </div>
                <span class="m-ticket-badge-wait">⏳ Menunggu Verifikasi di Lokasi</span>
              </div>

              <!-- Barcode Generator Mobile -->
              <BarcodeGenerator :value="tiketGPMHasil.tiket.kode_barcode" :height="70" />

              <div class="m-ticket-meta-box">
                <p><span>Nama Pendaftar:</span> <strong>{{ tiketGPMHasil.tiket.nama_pendaftar }}</strong></p>
                <p><span>No. HP/WA:</span> <strong>{{ tiketGPMHasil.tiket.nomor_telepon }}</strong></p>
                <p><span>Acara:</span> <strong>{{ tiketGPMHasil.acara.nama_acara }}</strong></p>
                <p><span>Tempat:</span> <strong>{{ tiketGPMHasil.acara.lokasi }}</strong></p>
                <p><span>Waktu:</span> <strong>{{ tiketGPMHasil.acara.tanggal }} ({{ tiketGPMHasil.acara.jam }})</strong></p>
              </div>

              <div class="m-ticket-instruction">
                📱 <strong>Petunjuk:</strong> Tunjukkan QR Code ini ke petugas Dinas Pangan di lokasi GPM saat giliran Anda dipanggil untuk dipindai (scan).
              </div>

              <button class="btn-m-take-new" @click="tiketGPMHasil = null">
                ➕ Ambil Antrean Lain
              </button>
            </div>
          </div>

          <!-- JIKA BELUM ADA TIKET: PETA SEBARAN & FORM PENDAFTARAN -->
          <div v-else class="mobile-gpm-selection-flow">
            <!-- Peta Sebaran Lokasi GPM Visual Card -->
            <div class="m-map-visual-card">
              <div class="m-map-header">
                <span>🗺️ Titik Lokasi GPM di Kota Manado</span>
                <span style="font-size: 0.75rem; color: #8b1e1e; font-weight: bold;">(Ketuk titik)</span>
              </div>
              <div class="m-map-body-graphic">
                <div 
                  v-for="acara in daftarAcaraGPM" 
                  :key="acara.id" 
                  :class="['m-map-grid-pin', acaraGPMDipilih?.id === acara.id ? 'active' : '']"
                  @click="acaraGPMDipilih = acara"
                >
                  <span class="pin-icon">📍</span>
                  <div class="pin-info-wrap">
                    <strong class="pin-name">{{ acara.nama_acara }}</strong>
                    <span class="pin-sub">{{ acara.lokasi }} ({{ acara.kecamatan }})</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Kartu Detail Acara GPM yang Dipilih -->
            <div v-if="acaraGPMDipilih" class="m-selected-event-card">
              <div class="m-event-header">
                <h3 class="m-event-title">{{ acaraGPMDipilih.nama_acara }}</h3>
                <span class="m-event-quota">Sisa {{ acaraGPMDipilih.sisa_kuota ?? 247 }} kuota</span>
              </div>
              <div class="m-event-info">
                <p>📍 {{ acaraGPMDipilih.lokasi }} (Kec. {{ acaraGPMDipilih.kecamatan }})</p>
                <p>📅 {{ acaraGPMDipilih.tanggal }} · ⏰ {{ acaraGPMDipilih.jam_mulai }} - {{ acaraGPMDipilih.jam_selesai }} WITA</p>
              </div>
              <div class="m-event-commodities">
                <strong>🌾 Komoditas Pangan Murah:</strong>
                <p>{{ acaraGPMDipilih.komoditas_tersedia }}</p>
              </div>

              <!-- Form Ambil Antrean (Tanpa Login) -->
              <form @submit.prevent="ambilNomorAntreanMobile" class="m-queue-form">
                <h4 class="m-form-heading">🎟️ Formulir Ambil Nomor Antrean</h4>
                <p class="m-form-subheading">Masyarakat tidak perlu login, cukup isi nama dan no. HP:</p>

                <div v-if="pesanErrorGPM" class="m-error-alert">
                  ⚠️ {{ pesanErrorGPM }}
                </div>

                <div class="m-input-group-mobile">
                  <label>NAMA LENGKAP</label>
                  <input 
                    type="text" 
                    required 
                    v-model="formAntreanGPM.nama_lengkap" 
                    placeholder="Budi Santoso"
                    class="m-input-text"
                    @input="formAntreanGPM.nama_lengkap = formAntreanGPM.nama_lengkap.replace(/[^a-zA-Z\s'.]/g, '')"
                  />
                </div>

                <div class="m-input-group-mobile">
                  <label>NOMOR TELEPON / WHATSAPP</label>
                  <input 
                    type="tel" 
                    required 
                    v-model="formAntreanGPM.nomor_telepon" 
                    placeholder="081234567890"
                    class="m-input-text"
                    @input="formAntreanGPM.nomor_telepon = formAntreanGPM.nomor_telepon.replace(/[^0-9]/g, '')"
                  />
                </div>

                <button type="submit" class="btn-m-get-queue" :disabled="sedangDaftarGPM">
                  {{ sedangDaftarGPM ? 'Memproses...' : '🎟️ Dapatkan Nomor Antrean & QR Code' }}
                </button>
              </form>
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
import BarcodeGenerator from '../components/BarcodeGenerator.vue';
import { 
  gpmMobileService, 
  ItemAcaraGPM, 
  ItemPendaftarGPM, 
  HasilTiketGPM,
  StatistikGPM
} from '../services/GPMService';

// Mode Tampilan Mobile: 'publik', 'login', 'petugas'
const tampilanMode = ref<'publik' | 'login' | 'petugas'>('publik');
const userAktif = ref(hargaPanganMobileService.ambilUser());

// Tab Navigasi Publik ('harga' | 'gpm')
const tabAktif = ref('harga');

// State GPM Mobile (Publik & Petugas)
const daftarAcaraGPM = ref<ItemAcaraGPM[]>([]);
const acaraGPMDipilih = ref<ItemAcaraGPM | null>(null);
const formAntreanGPM = ref({
  nama_lengkap: '',
  nomor_telepon: ''
});
const sedangDaftarGPM = ref(false);
const pesanErrorGPM = ref('');
const tiketGPMHasil = ref<HasilTiketGPM | null>(null);

// State Petugas GPM
const subMenuPetugasGPM = ref<'scan' | 'antrean' | 'buat'>('scan');
const inputBarcodePetugas = ref('');
const sedangScanBarcode = ref(false);
const hasilScanPetugas = ref<ItemPendaftarGPM | null>(null);
const pesanScanErrorPetugas = ref('');
const pendaftarGPMList = ref<ItemPendaftarGPM[]>([]);
const formGPMBaru = ref({
  nama_acara: '',
  lokasi: '',
  kecamatan: 'Wenang',
  tanggal: new Date().toISOString().split('T')[0],
  jam_mulai: '08:00',
  jam_selesai: '13:00',
  kuota_maksimal: 250,
  komoditas_tersedia: 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg'
});
const sedangSimpanGPMBaru = ref(false);

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
const menuPetugas = ref<'tetapkan' | 'dashboard' | 'gpm'>('tetapkan');
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
  await muatDataGPM();
});

// ===================== METHOD GPM MOBILE =====================
const muatDataGPM = async () => {
  try {
    const data = await gpmMobileService.ambilSemuaAcara('Aktif');
    daftarAcaraGPM.value = data;
    if (data.length > 0 && !acaraGPMDipilih.value) {
      acaraGPMDipilih.value = data[0];
      const res = await gpmMobileService.ambilPendaftarAcara(data[0].id);
      pendaftarGPMList.value = res.data || [];
    }
  } catch (err) {
    console.error('Error muat GPM:', err);
  }
};

const ambilNomorAntreanMobile = async () => {
  if (!acaraGPMDipilih.value) return;
  if (!formAntreanGPM.value.nama_lengkap.trim() || !formAntreanGPM.value.nomor_telepon.trim()) {
    pesanErrorGPM.value = 'Nama lengkap dan nomor telepon wajib diisi!';
    return;
  }

  // Validasi Nama: Hanya huruf dan spasi, dilarang simbol/angka
  const regexNama = /^[a-zA-Z\s'.]+$/;
  if (!regexNama.test(formAntreanGPM.value.nama_lengkap.trim())) {
    pesanErrorGPM.value = 'Nama lengkap hanya boleh berisi huruf dan spasi (tanpa angka atau simbol)!';
    return;
  }

  // Validasi Nomor Telepon: Hanya angka, minimal > 10 digit (11-15 digit)
  const telp = formAntreanGPM.value.nomor_telepon.trim();
  const regexTelp = /^[0-9]+$/;
  if (!regexTelp.test(telp)) {
    pesanErrorGPM.value = 'Nomor telepon hanya boleh berisi angka!';
    return;
  }
  if (telp.length <= 10) {
    pesanErrorGPM.value = 'Nomor telepon harus lebih dari 10 digit (minimal 11 digit, contoh: 081234567890)!';
    return;
  }

  sedangDaftarGPM.value = true;
  pesanErrorGPM.value = '';
  try {
    const hasil = await gpmMobileService.ambilNomorAntrean(
      acaraGPMDipilih.value.id,
      formAntreanGPM.value.nama_lengkap,
      formAntreanGPM.value.nomor_telepon
    );
    tiketGPMHasil.value = hasil;
    formAntreanGPM.value.nama_lengkap = '';
    formAntreanGPM.value.nomor_telepon = '';
    await muatDataGPM();
  } catch (err: any) {
    pesanErrorGPM.value = err.message || 'Gagal mendaftar antrean';
  } finally {
    sedangDaftarGPM.value = false;
  }
};

const pindaiBarcodeMobile = async (barcodeOverride?: string) => {
  const code = barcodeOverride || inputBarcodePetugas.value;
  if (!code.trim()) {
    pesanScanErrorPetugas.value = 'Silakan masukkan barcode!';
    return;
  }
  sedangScanBarcode.value = true;
  pesanScanErrorPetugas.value = '';
  hasilScanPetugas.value = null;
  try {
    const data = await gpmMobileService.scanBarcode(code);
    hasilScanPetugas.value = data;
  } catch (err: any) {
    pesanScanErrorPetugas.value = err.message || 'Barcode tidak ditemukan';
  } finally {
    sedangScanBarcode.value = false;
  }
};

const verifikasiKehadiranMobile = async () => {
  if (!hasilScanPetugas.value) return;
  try {
    await gpmMobileService.verifikasiKehadiran(hasilScanPetugas.value.kode_barcode);
    hasilScanPetugas.value.status_kehadiran = 'Hadir';
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal verifikasi: ' + err.message);
  }
};

const simpanAcaraGPMBaruMobile = async () => {
  if (!formGPMBaru.value.nama_acara || !formGPMBaru.value.lokasi) {
    alert('Nama acara dan lokasi wajib diisi!');
    return;
  }
  sedangSimpanGPMBaru.value = true;
  try {
    await gpmMobileService.tambahAcara(formGPMBaru.value);
    alert('Acara GPM baru berhasil dijadwalkan!');
    formGPMBaru.value = {
      nama_acara: '',
      lokasi: '',
      kecamatan: 'Wenang',
      tanggal: new Date().toISOString().split('T')[0],
      jam_mulai: '08:00',
      jam_selesai: '13:00',
      kuota_maksimal: 250,
      komoditas_tersedia: 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg'
    };
    subMenuPetugasGPM.value = 'scan';
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal menambah acara: ' + err.message);
  } finally {
    sedangSimpanGPMBaru.value = false;
  }
};

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

/* =======================================================
   4. MODUL GPM MOBILE (PUBLIK & PETUGAS)
   ======================================================= */
.mobile-gpm-subnav {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.m-gpm-nav-btn {
  flex: 1;
  padding: 8px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
}

.m-gpm-nav-btn.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.m-gpm-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.m-scan-input-wrap {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.m-scan-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid #cbd5e1;
  font-family: monospace;
  font-weight: 700;
  font-size: 0.9rem;
}

.btn-m-scan-action {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
}

.m-quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.m-chip-pill {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.72rem;
  font-family: monospace;
  font-weight: 600;
}

.m-scan-profile-result {
  background: #f8fafc;
  border: 2px solid #22c55e;
  border-radius: 10px;
  padding: 14px;
  margin-top: 14px;
}

.m-profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.m-badge-queue {
  font-size: 1.3rem;
  font-weight: 900;
  color: #8b1e1e;
}

.m-profile-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.m-info-lbl {
  font-size: 0.7rem;
  color: #64748b;
  display: block;
}

.m-info-val {
  font-size: 0.88rem;
  color: #0f172a;
}

.m-info-barcode {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.82rem;
}

.m-status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
}

.m-status-tag.hadir {
  background: #dcfce7;
  color: #15803d;
}

.m-status-tag.menunggu {
  background: #fef3c7;
  color: #b45309;
}

.btn-m-verify-confirm {
  width: 100%;
  background: #16a34a;
  color: #ffffff;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.88rem;
}

.m-verified-box {
  background: #dcfce7;
  color: #15803d;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

.m-queue-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.m-queue-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.m-queue-number-badge {
  font-size: 1.1rem;
  font-weight: 900;
  color: #8b1e1e;
  min-width: 45px;
}

.m-queue-meta {
  flex: 1;
}

/* GPM Public Mobile */
.mobile-gpm-public-section {
  padding-bottom: 30px;
}

.gpm-hero-theme {
  background: linear-gradient(135deg, #741616 0%, #8b1e1e 100%) !important;
}

.mobile-ticket-display-card {
  margin: 14px;
  background: #ffffff;
  border-radius: 14px;
  border: 2px solid #8b1e1e;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(139, 30, 30, 0.15);
}

.m-ticket-top {
  background: #8b1e1e;
  color: #ffffff;
  padding: 12px;
  text-align: center;
}

.m-ticket-body {
  padding: 16px;
  text-align: center;
}

.m-ticket-queue-box {
  background: #fef2f2;
  border: 1.5px dashed #8b1e1e;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.m-ticket-queue-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: #8b1e1e;
  letter-spacing: 0.5px;
}

.m-ticket-queue-num {
  font-size: 2.8rem;
  font-weight: 900;
  color: #8b1e1e;
  line-height: 1;
  margin: 4px 0;
}

.m-ticket-badge-wait {
  display: inline-block;
  background: #fef3c7;
  color: #b45309;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.m-ticket-meta-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: left;
  font-size: 0.82rem;
  margin: 12px 0;
}

.m-ticket-meta-box p {
  margin: 4px 0;
  display: flex;
  justify-content: space-between;
}

.m-ticket-meta-box span {
  color: #64748b;
}

.m-ticket-instruction {
  background: #e0f2fe;
  border-left: 3px solid #0284c7;
  padding: 8px 10px;
  font-size: 0.76rem;
  text-align: left;
  color: #0369a1;
  border-radius: 4px;
  margin-bottom: 14px;
}

.btn-m-take-new {
  width: 100%;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #334155;
}

.m-map-visual-card {
  margin: 14px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 14px;
}

.m-map-header {
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.m-map-body-graphic {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-map-grid-pin {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.m-map-grid-pin.active {
  background: #fef2f2;
  border-color: #8b1e1e;
}

.pin-icon {
  font-size: 1.3rem;
}

.pin-info-wrap {
  display: flex;
  flex-direction: column;
}

.pin-name {
  font-size: 0.88rem;
  color: #0f172a;
}

.pin-sub {
  font-size: 0.75rem;
  color: #64748b;
}

.m-selected-event-card {
  margin: 0 14px 20px 14px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
}

.m-event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.m-event-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #8b1e1e;
}

.m-event-quota {
  background: #dcfce7;
  color: #15803d;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.m-event-info {
  font-size: 0.8rem;
  color: #475569;
  margin-bottom: 8px;
}

.m-event-info p {
  margin: 2px 0;
}

.m-event-commodities {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  padding: 8px 10px;
  font-size: 0.78rem;
  color: #92400e;
  border-radius: 4px;
  margin-bottom: 14px;
}

.m-queue-form {
  border-top: 1px dashed #e2e8f0;
  padding-top: 12px;
}

.m-form-heading {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.m-form-subheading {
  margin: 2px 0 12px 0;
  font-size: 0.76rem;
  color: #64748b;
}

.m-input-group-mobile {
  margin-bottom: 10px;
}

.m-input-group-mobile label {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  color: #475569;
  margin-bottom: 4px;
}

.m-input-text {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.88rem;
  box-sizing: border-box;
}

.btn-m-get-queue {
  width: 100%;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.92rem;
  margin-top: 8px;
}

.m-error-alert {
  background: #fee2e2;
  color: #991b1b;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.78rem;
  margin-bottom: 10px;
}
</style>
