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
        <!-- Logo& Brand Header -->
        <div class="mobile-login-brand">
          <div class="mobile-login-logo">
            <img src="/logodinaspangan.png" alt="LogoSIPATOKAAN" class="mobile-logo-img" />
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
          <div class="m-login-hint-badge">
            💡 Contoh akun: <strong>effrend</strong> / Sandi: <strong>12345678</strong>
          </div>
        </div>

        <!-- Form Login Mobile -->
        <form @submit.prevent="eksekusiLogin" class="mobile-login-form">
          <div class="m-input-group">
            <label>NAMA PENGGUNA / EMAIL</label>
            <div class="m-input-icon-box">
              <span class="m-icon">👤</span>
              <input 
                type="text" 
                v-model="loginInput.email" 
                required 
                placeholder="Masukan nama pengguna atau email"
              />
            </div>
          </div>

          <div class="m-input-group">
            <label>KATA SANDI</label>
            <div class="m-input-icon-box">
              <span class="m-icon">🔒</span>
              <input 
                :type="lihatPassword ? 'text' : 'password'" 
                v-model="loginInput.password" 
                required 
                placeholder="Masukan kata sandi"
              />
              <button type="button" class="btn-eye" @click="lihatPassword = !lihatPassword">
                {{ lihatPassword ? '👁️' : '🙈' }}
              </button>
            </div>
          </div>

          <div class="m-options-row">
            <label class="m-remember">
              <input type="checkbox" v-model="loginInput.ingatSaya" />
              <span>Ingat saya</span>
            </label>
            <a href="#" class="m-forgot" @click.prevent="alertLupaPassword">Lupa kata sandi?</a>
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
              <img src="/logodinaspangan.png" alt="LogoSIPATOKAAN" class="staff-logo-img" />
            </div>
            <div>
              <h2 class="staff-header-name">Bidang Distribusi & Cadangan</h2>
              <p class="staff-header-sub">Penetapan Harga Pangan</p>
            </div>
          </div>

          <div class="staff-header-user">
            <!-- Indikator Koneksi Web -->
            <button 
              type="button" 
              class="btn-server-status" 
              :class="statusKoneksi.online ? 'is-online' : 'is-offline'" 
              @click="bukaModalServer"
              title="Koneksi Website & Backend"
            >
              <span class="status-pulse-dot"></span>
              <span class="status-label-short">{{ statusKoneksi.online ? 'Web Online' : 'Offline' }}</span>
            </button>

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
            Kelola GPM & Pindai
          </button>
          <button 
            :class="['staff-segment-btn', menuPetugas === 'dashboard' ? 'active' : '']"
            @click="menuPetugas = 'dashboard'"
          >
            Beranda
          </button>
        </div>
      </ion-header>

      <ion-content class="mobile-staff-content">
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
          <ion-refresher-content pulling-text="Tarik ke bawah untuk memperbarui..." refreshing-spinner="crescent" refreshing-text="Menyinkronkan data dari web..."></ion-refresher-content>
        </ion-refresher>
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
          <div class="staff-form-panel" id="formPenetapanPanel">
            <div class="panel-title-row">
              <span class="plus-icon-red">{{ idDiedit ? '✏️' : '+' }}</span>
              <h3>{{ idDiedit ? 'Ubah Penetapan Harga' : 'Formulir Penetapan Harga' }}</h3>
              <button v-if="idDiedit" type="button" class="btn-cancel-edit-pill" @click="batalEditItem">
                ✕ Batal
              </button>
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
                  <label>Satuan (Kuantitas & Unit)</label>
                  <div style="display: flex; gap: 6px;">
                    <input 
                      type="text" 
                      inputmode="numeric"
                      pattern="[0-9]*"
                      v-model="formPenetapan.satuanJumlah" 
                      @keydown="hanyaBolehAngka"
                      @input="formPenetapan.satuanJumlah = (($event.target as HTMLInputElement).value || '').replace(/[^0-9]/g, '')"
                      required 
                      placeholder="1" 
                      style="width: 50%;"
                    />
                    <select v-model="formPenetapan.satuanUnit" class="s-select-market" style="width: 50%;">
                      <option value="KG">KG</option>
                      <option value="Gram">Gram</option>
                    </select>
                  </div>
                </div>
                <div class="s-field">
                  <label>Harga Acuan (Rp)</label>
                  <input 
                    type="text" 
                    inputmode="numeric"
                    pattern="[0-9]*"
                    v-model="formPenetapan.harga" 
                    @keydown="hanyaBolehAngka"
                    @input="formPenetapan.harga = (($event.target as HTMLInputElement).value || '').replace(/[^0-9]/g, '')"
                    required 
                    placeholder="13500 (angka saja)" 
                  />
                  <small v-if="formPenetapan.harga" style="color: #059669; font-weight: 600; font-size: 0.72rem; margin-top: 2px; display: block;">
                    Terformat: {{ formatRupiah(parseInt(formPenetapan.harga, 10)) }}
                  </small>
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
                <!-- Staf: 1 tombol harus verifikasi lewat Kepala Bidang (Ajukan Harga / Ajukan Perubahan Harga) -->
                <button 
                  v-if="!isKabid" 
                  type="submit" 
                  class="btn-publish-action" 
                  style="background: #8b1e1e; color: #ffffff; width: 100%; justify-content: center; font-weight: 700; padding: 14px; border-radius: 8px; border: none; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;"
                >
                  <span>📨</span> {{ idDiedit ? 'Ajukan Perubahan Harga' : 'Ajukan Harga' }}
                </button>
                <button 
                  v-if="!isKabid && idDiedit" 
                  type="button" 
                  class="btn-draft-action" 
                  @click="batalEditItem" 
                  style="background: #f1f5f9; color: #475569; width: 100%; justify-content: center; font-weight: 600; padding: 10px; margin-top: 6px; border-radius: 8px; border: 1px solid #cbd5e1;"
                >
                  ✕ Batal Ubah
                </button>

                <!-- Kabid / Admin: Memiliki tombol Terbitkan langsung dan Simpan Draf -->
                <template v-if="isKabid">
                  <button type="submit" class="btn-publish-action">
                    <span>🚀</span> {{ idDiedit ? 'Simpan & Terbitkan ke Masyarakat' : 'Terbitkan ke Halaman Masyarakat' }}
                  </button>
                  <button type="button" class="btn-draft-action" @click="simpanHargaPetugas('Draft')">
                    {{ idDiedit ? 'Simpan Perubahan Draf' : 'Simpan sebagai Draf' }}
                  </button>
                  <button 
                    v-if="idDiedit" 
                    type="button" 
                    class="btn-draft-action" 
                    @click="batalEditItem" 
                    style="background: #f1f5f9; color: #475569; width: 100%; justify-content: center; font-weight: 600; padding: 10px; margin-top: 6px; border-radius: 8px; border: 1px solid #cbd5e1;"
                  >
                    ✕ Batal Ubah
                  </button>
                </template>
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
                    <span class="unit-text"> / {{ formatSatuanTampil(item.satuan) }}</span>
                  </div>
                  <div class="item-sub-meta">
                    {{ item.nama_pasar }} · {{ item.tanggal_penetapan || '14 Oktober 2026' }}
                  </div>
                </div>

                <div class="price-info-right">
                  <div class="price-nominal-red">{{ formatRupiah(item.harga) }}</div>
                  <div class="item-actions-row">
                    <!-- Status Badge: Kabid bisa toggle status (Setujui/Tarik), Staf hanya melihat status -->
                    <span 
                      v-if="isKabid"
                      :class="['status-badge-tag', item.status === 'Draft' ? 'is-draft' : 'is-terbit']"
                      @click="ubahStatusItem(item)"
                      :title="item.status === 'Draft' ? 'Klik untuk Setujui & Terbitkan' : 'Klik untuk Tarik ke Draf'"
                      style="cursor: pointer;"
                    >
                      {{ item.status === 'Draft' ? '⏳ Setujui' : '↩️ Tarik' }}
                    </span>
                    <span 
                      v-else
                      :class="['status-badge-tag', item.status === 'Draft' ? 'is-draft' : 'is-terbit']"
                      style="cursor: default;"
                    >
                      {{ item.status === 'Draft' ? 'Draf' : (item.status || 'Terbit') }}
                    </span>

                    <!-- Tombol Edit: BISA diklik oleh Staf maupun Kabid untuk semua data (baik Draft maupun Terbit) -->
                    <button type="button" class="btn-mini-action edit" @click.stop="mulaiEditItem(item)" title="Edit harga dan keterangan">
                      ✏️ Edit
                    </button>

                    <!-- Tombol Hapus: HANYA untuk Kabid / Admin -->
                    <button 
                      v-if="isKabid" 
                      type="button" 
                      class="btn-mini-action delete" 
                      @click.stop="hapusItem(item)" 
                      title="Hapus komoditas"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- SUB-VIEW B: DASHBOARD STATS PETUGAS -->
        <div v-if="menuPetugas === 'dashboard'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Beranda Petugas</h1>
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
              <div class="stat-lbl">Draf Harga</div>
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
            <h1 class="staff-view-title">Pengelolaan GPM & Pindai Kode QR</h1>
            <p class="staff-view-desc">
              Pindai Kode QR antrean masyarakat, pantau pendaftar, dan jadwal lokasi GPM
            </p>
          </div>

          <!-- Sub-Nav Tab Petugas GPM Mobile -->
          <div class="m-gpm-subnav">
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'scan' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'scan'"
            >
              📷 Pindai QR
            </button>
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'antrean' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'antrean'"
            >
              📋 Antrean ({{ pendaftarGPMList.length }})
            </button>
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'buat' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'buat'"
            >
              📍 Tambah GPM
            </button>
            <button 
              :class="['m-gpm-nav-btn', subMenuPetugasGPM === 'riwayat' ? 'active' : '']"
              @click="subMenuPetugasGPM = 'riwayat'"
            >
              📜 Riwayat ({{ daftarRiwayatGPM.length }})
            </button>
          </div>

          <!-- TAB 1: SCAN QR CODE MOBILE -->
          <div v-if="subMenuPetugasGPM === 'scan'" class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">📷</span>
              <h3>Pindai Kode QR Antrean Tiket</h3>
            </div>
            <p style="font-size: 0.82rem; color: #64748b; margin: 4px 0 12px 0;">
              Masukan kode QR tiket masyarakat untuk memverifikasi kehadiran:
            </p>

            <!-- Tombol Buka / Tutup Kamera Pemindai Mobile -->
            <div style="margin-bottom: 14px;">
              <button 
                v-if="!kameraAktifMobile" 
                type="button" 
                @click="mulaiScanKameraMobile"
                style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; font-size: 0.95rem; font-weight: 700; background: #8b1e1e; color: #ffffff; border-radius: 8px; border: none; box-shadow: 0 4px 12px rgba(139,30,30,0.25); cursor: pointer;"
              >
                📷 Buka Kamera Pemindai (Scan QR Langsung)
              </button>
              <button 
                v-else 
                type="button" 
                @click="hentikanScanKameraMobile"
                style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; font-weight: 700; background: #475569; color: #ffffff; border-radius: 8px; border: none; cursor: pointer;"
              >
                ✕ Tutup Kamera
              </button>
            </div>

            <!-- Viewfinder Kamera Scanner Mobile -->
            <div v-if="kameraAktifMobile" style="margin-bottom: 16px; background: #0f172a; border-radius: 12px; overflow: hidden; padding: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
              <div id="mobileQrReader" style="width: 100%; border-radius: 8px; overflow: hidden;"></div>
              <p style="text-align: center; color: #cbd5e1; font-size: 0.74rem; margin: 6px 0 2px 0;">
                Arahkan kamera ke layar HP warga atau tiket fisik antrean
              </p>
            </div>

            <!-- Pemisah Pilihan Manual -->
            <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0;">
              <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
              <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">Atau Ketik Kode Manual</span>
              <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            </div>

            <form @submit.prevent="pindaiBarcodeMobile()" class="m-scan-input-wrap">
              <input 
                type="text" 
                v-model="inputBarcodePetugas"
                placeholder="Contoh: GPM-TIKA-001-A9F2"
                class="m-scan-input"
              />
              <button type="submit" class="btn-m-scan-action" :disabled="sedangScanBarcode">
                {{ sedangScanBarcode ? '...' : 'Pindai' }}
              </button>
            </form>

            <!-- Quick sample chips -->
            <div class="m-quick-chips">
              <span style="font-size: 0.72rem; color: #888;">Uji coba kode tiket:</span>
              <button type="button" class="m-chip-pill" @click="pindaiBarcodeMobile('GPM-TIKA-001-A9F2')">Meity (#001)</button>
              <button type="button" class="m-chip-pill" @click="pindaiBarcodeMobile('GPM-TIKA-002-C4B8')">Frangky (#002)</button>
              <button type="button" class="m-chip-pill" @click="pindaiBarcodeMobile('GPM-TIKA-003-X8Q1')">Grace (#003)</button>
            </div>

            <div v-if="pesanScanErrorPetugas" class="m-error-alert">
              ⚠️  {{ pesanScanErrorPetugas }}
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
                  <span class="m-info-lbl">Kode QR / Barcode</span>
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
            <div class="panel-title-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="plus-icon-red">📋</span>
                <h3 style="margin: 0;">Antrean: {{ acaraGPMDipilih?.nama_acara || 'GPM' }}</h3>
              </div>
              <span class="m-event-quota">Total: {{ pendaftarGPMList.length }} warga</span>
            </div>

            <!-- Tombol Aksi Mobile: Unduh CSV & Selesaikan GPM (Khusus Kepala Bidang) -->
            <div class="m-antrean-action-bar">
              <button 
                type="button" 
                class="btn-m-export-csv"
                @click="unduhRekapAktifMobile"
              >
                📥 Unduh Rekap (CSV)
              </button>
              <button 
                v-if="isKabid && acaraGPMDipilih"
                type="button" 
                class="btn-m-close-gpm"
                :disabled="sedangSelesaikanAcaraMobile"
                @click="selesaikanAcaraMobile"
              >
                {{ sedangSelesaikanAcaraMobile ? 'Memproses...' : '🔒 Selesaikan Kegiatan GPM' }}
              </button>
            </div>

            <div v-if="pendaftarGPMList.length === 0" style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.88rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; margin-top: 10px;">
              Belum ada pendaftar nomor antrean untuk acara ini.
            </div>
            <div v-else class="m-queue-items-list">
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
              <span class="plus-icon-red">📍</span>
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
                <label>Komoditas Pangan yang Disediakan (Pilih dari Data Harga)</label>
                <!-- Box Dropdown Multi-Select -->
                <div 
                  @click="dropdownGPMKomoditasBuka = !dropdownGPMKomoditasBuka"
                  style="min-height: 44px; border: 1.5px solid #d1d5db; border-radius: 8px; padding: 8px 10px; background: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: space-between;"
                >
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; flex: 1;">
                    <span v-if="!formGPMBaru.komoditas_tersedia" style="color: #94a3b8; font-size: 0.82rem;">
                      📋 Sentuh untuk mencentang komoditas...
                    </span>
                    <span 
                      v-else
                      v-for="(k, idx) in formGPMBaru.komoditas_tersedia.split(',').map(s => s.trim()).filter(Boolean)" 
                      :key="idx"
                      style="background: #fee2e2; color: #991b1b; font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;"
                    >
                      ✓ {{ k }}
                      <span @click.stop="toggleKomoditasGPM(k)" style="color: #dc2626; margin-left: 2px;">✕</span>
                    </span>
                  </div>
                  <span style="font-size: 0.8rem; color: #64748b; font-weight: bold; margin-left: 6px;">
                    {{ dropdownGPMKomoditasBuka ? '▲' : '▼' }}
                  </span>
                </div>

                <!-- Popover Checklist -->
                <div 
                  v-if="dropdownGPMKomoditasBuka"
                  style="border: 1.5px solid #8b1e1e; border-radius: 8px; background: #ffffff; padding: 10px; margin-top: 6px; max-height: 220px; overflow-y: auto; box-shadow: 0 4px 14px rgba(0,0,0,0.12);"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">
                    <span style="font-size: 0.78rem; font-weight: 800; color: #8b1e1e;">Centang Komoditas</span>
                    <button 
                      type="button" 
                      @click="formGPMBaru.komoditas_tersedia = ''" 
                      style="background: none; border: none; color: #dc2626; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                    >
                      Reset
                    </button>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr; gap: 6px;">
                    <label 
                      v-for="(item, idx) in daftarKomoditasPilihanGPM" 
                      :key="idx"
                      style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.8rem; cursor: pointer;"
                    >
                      <input 
                        type="checkbox" 
                        :checked="formGPMBaru.komoditas_tersedia.split(',').map(s => s.trim()).includes(item)" 
                        @change="toggleKomoditasGPM(item)"
                        style="accent-color: #8b1e1e; width: 16px; height: 16px; cursor: pointer;"
                      />
                      <span>{{ item }}</span>
                    </label>
                  </div>
                  <button 
                    type="button" 
                    @click="dropdownGPMKomoditasBuka = false"
                    style="width: 100%; margin-top: 8px; background: #8b1e1e; color: #ffffff; border: none; padding: 6px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer;"
                  >
                    ✓ Selesai
                  </button>
                </div>
              </div>
              <button type="submit" class="btn-publish-action" :disabled="sedangSimpanGPMBaru">
                <span>📍</span> {{ sedangSimpanGPMBaru ? 'Menyimpan...' : 'Terbitkan Acara ke Peta' }}
              </button>
            </form>
          </div>

          <!-- TAB 4: RIWAYAT GPM (VIEW STAF & KABID, HAPUS KHUSUS KABID) -->
          <div v-if="subMenuPetugasGPM === 'riwayat'" class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">📜</span>
              <h3>Riwayat Kegiatan GPM (Selesai)</h3>
            </div>
            <p style="font-size: 0.78rem; color: #64748b; margin: 0 0 12px 0;">
              Arsip kegiatan GPM yang telah diselesaikan. {{ isKabid ? 'Kepala Bidang dapat mengunduh rekap dan menghapus arsip riwayat.' : 'Staf dapat melihat dan mengunduh rekapitulasi data.' }}
            </p>

            <div v-if="daftarRiwayatGPM.length === 0" style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.88rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
              Belum ada riwayat kegiatan GPM yang diselesaikan.
            </div>

            <div v-else class="m-history-cards-wrap">
              <div v-for="acara in daftarRiwayatGPM" :key="acara.id" class="m-history-event-card">
                <div class="m-history-card-top">
                  <span class="m-history-tag-done">✓ Selesai</span>
                  <strong class="m-history-card-title">{{ acara.nama_acara }}</strong>
                  <span class="m-history-card-loc">📍 {{ acara.lokasi }} ({{ acara.kecamatan }})</span>
                  <span class="m-history-card-date">📅 {{ acara.tanggal }} · {{ acara.jam_mulai }} - {{ acara.jam_selesai }} WITA</span>
                </div>

                <div class="m-history-card-stats">
                  <div>
                    <span class="lbl">Kuota</span>
                    <strong>{{ acara.kuota_maksimal || 250 }}</strong>
                  </div>
                  <div>
                    <span class="lbl">Mendaftar</span>
                    <strong>{{ acara.antrean_terisi || 0 }}</strong>
                  </div>
                </div>

                <div class="m-history-card-actions">
                  <button 
                    type="button" 
                    class="btn-m-hist-csv"
                    @click="unduhRekapRiwayatMobile(acara)"
                  >
                    📥 Unduh CSV
                  </button>
                  <button 
                    type="button" 
                    class="btn-m-hist-view"
                    @click="toggleLihatRiwayatAntrean(acara)"
                  >
                    {{ riwayatTerbukaId === acara.id ? 'Tutup Antrean' : '👁️ Antrean' }}
                  </button>
                  <button 
                    v-if="isKabid"
                    type="button" 
                    class="btn-m-hist-del"
                    @click="hapusRiwayatMobile(acara)"
                  >
                    🗑️ Hapus
                  </button>
                </div>

                <!-- Accordion Detail Antrean untuk Riwayat Ini -->
                <div v-if="riwayatTerbukaId === acara.id" class="m-history-detail-accordion">
                  <h4 style="font-size: 0.82rem; margin: 8px 0 6px 0; color: #334155;">Daftar Pendaftar Terarsip:</h4>
                  <div v-if="!detailRiwayatPendaftar[acara.id] || detailRiwayatPendaftar[acara.id].length === 0" style="font-size: 0.78rem; color: #94a3b8; font-style: italic;">
                    Tidak ada pendaftar tersimpan untuk kegiatan ini.
                  </div>
                  <div v-else class="m-history-queue-list">
                    <div v-for="p in detailRiwayatPendaftar[acara.id]" :key="p.id" class="m-hist-queue-row">
                      <span class="q-num">#{{ String(p.nomor_antrean).padStart(3, '0') }}</span>
                      <div class="q-info">
                        <strong>{{ p.nama_pendaftar }}</strong>
                        <span>{{ p.nomor_telepon }} · <code>{{ p.kode_barcode }}</code></span>
                      </div>
                      <span :class="['m-status-tag', p.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu']">
                        {{ p.status_kehadiran }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
              <img src="/logodinaspangan.png" alt="LogoSIPATOKAAN" class="public-logo-img" />
            </div>
            <div class="brand-title-wrap">
              <h1 class="brand-name">SIPATOKAAN</h1>
              <p class="brand-agency">Dinas Pangan Kota Manado</p>
            </div>
          </div>

          <div class="header-actions-right">
            <!-- Tombol Login Petugas Mobile -->
            <!-- Indikator Koneksi Web -->
            <button 
              type="button" 
              class="btn-server-status" 
              :class="statusKoneksi.online ? 'is-online' : 'is-offline'" 
              @click="bukaModalServer"
              title="Koneksi Website & Backend"
            >
              <span class="status-pulse-dot"></span>
              <span class="status-label-short">{{ statusKoneksi.online ? 'Web Online' : 'Offline' }}</span>
            </button>

            <button class="btn-login-mobile" @click="bukaLoginMobile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              <span>Masuk</span>
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
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
          <ion-refresher-content pulling-text="Tarik ke bawah untuk memperbarui..." refreshing-spinner="crescent" refreshing-text="Menyinkronkan data dari web..."></ion-refresher-content>
        </ion-refresher>
        <!-- KONTEN A: HARGA PANGAN -->
        <div v-if="tabAktif === 'harga'">
          <!-- HeroBanner Maroon -->
          <div class="mobile-hero-card">
            <div class="hero-badge-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              <span>Pemantauan Harga Pangan</span>
            </div>

            <h2 class="hero-title-text">Harga Pangan Kota Manado</h2>

            <p class="hero-desc-text">
              Informasi terkini harga produsen dan konsumen komoditas pangan di pasar Kota Manado Data diperbarui rutin oleh Dinas Pangan untuk transparansi dan stabilisasi harga.
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
                <option value="Semua">Semua Pasar</option>
                <option v-for="(p, i) in daftarPasar" :key="i" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>

          <!-- 6. Subheader InfoRow -->
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
                <span class="unit-label">SATUAN {{ formatSatuanTampil(item.satuan) }}</span>
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
          <!-- HeroBanner GPM Mobile -->
          <div class="mobile-hero-card gpm-hero-theme">
            <div class="hero-badge-tag">
              <span>🎟️ </span>
              <span>Antrean Daring GPM Manado</span>
            </div>
            <h2 class="hero-title-text">Gerakan Pangan Murah</h2>
            <p class="hero-desc-text">
              Dapatkan komoditas pangan pokok berkualitas dengan harga terjangkau langsung dari produsen untuk stabilisasi pasokan dan harga di Kota Manado. <strong>Masyarakat tak perlu masuk akun (cukup nama & no. HP).</strong>
            </p>
            <div class="hero-update-date">
              <span>📍  {{ daftarAcaraGPM.length }} Lokasi Pelaksanaan Tersedia</span>
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
                📱 <strong>Petunjuk:</strong> Tunjukkan Kode QR ini ke petugas Dinas Pangan di lokasi GPM saat giliran Anda dipanggil untuk dipindai.
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
                <span>🗺️ Titik Lokasi Peta GPM di Kota Manado</span>
                <span style="font-size: 0.75rem; color: #8b1e1e; font-weight: bold;">(Interaktif)</span>
              </div>
              
              <!-- Peta Leaflet Interaktif -->
              <div id="petaGpmMobile" class="m-leaflet-map-box"></div>

              <div class="m-map-body-graphic">
                <div 
                  v-for="acara in daftarAcaraGPM" 
                  :key="acara.id" 
                  :class="['m-map-grid-pin', acaraGPMDipilih?.id === acara.id ? 'active' : '']"
                  @click="pilihAcaraGpm(acara)"
                >
                  <span class="pin-icon">📍</span>
                  <div class="pin-info-wrap">
                    <strong class="pin-name">{{ acara.nama_acara }}</strong>
                    <span class="pin-sub">{{ acara.lokasi }} ({{ acara.kecamatan }})</span>
                  </div>
                  <span v-if="acaraGPMDipilih?.id === acara.id" class="pin-badge-selected">Dipilih ✓</span>
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
                <p>📍  {{ acaraGPMDipilih.lokasi }} (Kec. {{ acaraGPMDipilih.kecamatan }})</p>
                <p>📅 {{ acaraGPMDipilih.tanggal }} · ⏰ {{ acaraGPMDipilih.jam_mulai }} - {{ acaraGPMDipilih.jam_selesai }} WITA</p>
              </div>
              <div class="m-event-commodities">
                <strong>🌾 Komoditas Pangan Murah:</strong>
                <p>{{ acaraGPMDipilih.komoditas_tersedia }}</p>
              </div>

              <!-- Form Ambil Antrean (Tanpa Login) -->
              <form @submit.prevent="ambilNomorAntreanMobile" class="m-queue-form">
                <h4 class="m-form-heading">🎟️  Formulir Ambil Nomor Antrean</h4>
                <p class="m-form-subheading">Masyarakat tidak perlu masuk akun, cukup isi nama dan nomor HP:</p>

                <div v-if="pesanErrorGPM" class="m-error-alert">
                  ⚠️  {{ pesanErrorGPM }}
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
                  {{ sedangDaftarGPM ? 'Memproses...' : '🎟️  Dapatkan Nomor Antrean & Kode QR' }}
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

    <!-- ===============================================================================
         MODAL PENGATURAN KONEKSI SERVER & WEBSITE
         =============================================================================== -->
    <div v-if="tampilkanModalServer" class="server-config-modal-overlay" @click.self="tampilkanModalServer = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">🌐</span>
            <div>
              <h3 class="server-m-title">Koneksi Server & Web</h3>
              <p class="server-m-sub">Sinkronisasi data HP dan Website Dinas Pangan</p>
            </div>
          </div>
          <button type="button" class="btn-close-server-modal" @click="tampilkanModalServer = false">✕</button>
        </div>

        <div class="server-modal-body">
          <!-- Status Banner -->
          <div :class="['server-status-banner', statusKoneksi.online ? 'is-online' : 'is-offline']">
            <div class="server-status-icon">
              {{ statusKoneksi.online ? '🟢' : '🔴' }}
            </div>
            <div class="server-status-details">
              <strong>{{ statusKoneksi.online ? 'Terhubung ke Website & Backend' : 'Server Belum Terhubung' }}</strong>
              <p>{{ statusKoneksi.pesan }}</p>
              <div v-if="statusKoneksi.online" class="server-latency-text">
                Respon Server: {{ statusKoneksi.latency }}ms · Status: OK 200
              </div>
            </div>
          </div>

          <!-- Petunjuk Cepat -->
          <div class="server-hint-box">
            💡 <strong>Panduan:</strong> Pastikan backend server <code>node backend/server.js</code> sedang menyala di laptop/PC dan HP terhubung ke Wi-Fi yang sama.
          </div>

          <!-- Form Input Alamat IP Server -->
          <div class="server-form-group">
            <label>ALAMAT IP / URL SERVER BACKEND</label>
            <div class="server-input-wrapper">
              <input 
                type="text" 
                v-model="inputUrlServer" 
                placeholder="http://192.168.0.201:3000"
                class="server-input-field"
              />
              <button 
                type="button" 
                class="btn-test-conn" 
                :disabled="sedangUjiKoneksi"
                @click="lakukanUjiKoneksi"
              >
                {{ sedangUjiKoneksi ? 'Menguji...' : 'Uji Koneksi' }}
              </button>
            </div>
          </div>

          <!-- Pilihan Preset Cepat -->
          <div class="server-presets-section">
            <span class="presets-label">Pilihan Cepat Alamat Server:</span>
            <div class="presets-chips">
              <button 
                type="button" 
                class="btn-preset-chip is-cloud" 
                @click="pilihPreset(VERCEL_HOST)"
              >
                ☁️ Vercel Hosting (Online)
              </button>
              <button 
                type="button" 
                class="btn-preset-chip" 
                @click="pilihPreset(`http://${DEFAULT_HOST_LAN}:${DEFAULT_PORT}`)"
              >
                💻 IP Laptop Ini ({{ DEFAULT_HOST_LAN }})
              </button>
              <button 
                type="button" 
                class="btn-preset-chip" 
                @click="pilihPreset('http://10.0.2.2:3000')"
              >
                📱 Emulator Android (10.0.2.2)
              </button>
              <button 
                type="button" 
                class="btn-preset-chip" 
                @click="pilihPreset('http://localhost:3000')"
              >
                🌐  Localhost (localhost:3000)
              </button>
            </div>
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="tampilkanModalServer = false">
            Batal
          </button>
          <button type="button" class="btn-save-server" @click="simpanKonfigurasiServer" :disabled="sedangUjiKoneksi">
            💾 Simpan & Hubungkan
          </button>
        </div>
      </div>
    </div>

  </ion-page>
</template>

<script setup lang="ts">
// ===================================================================================
// LOGIKA SCRIPT (VUE 3 COMPOSITION API & OOP SERVICE MOBILE)
// ===================================================================================

import { ref, computed, onMounted, nextTick, watch } from 'vue';
import L from 'leaflet';
import { Html5Qrcode } from 'html5-qrcode';
import { IonPage, IonHeader, IonContent, IonRefresher, IonRefresherContent } from '@ionic/vue';
import { 
  getServerBaseUrl, 
  setServerBaseUrl, 
  ujiKoneksiBackend, 
  DEFAULT_HOST_LAN, 
  DEFAULT_PORT,
  VERCEL_HOST 
} from '../services/ServerConfig';
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


// ─── LEAFLET MAP MOBILE GPM ───────────────────────────────
let mapInstance: L.Map | null = null;
let markers: L.Marker[] = [];

const inisialisasiPetaGpm = () => {
  nextTick(() => {
    const el = document.getElementById('petaGpmMobile');
    if (!el) return;

    if (mapInstance) {
      try {
        mapInstance.remove();
      } catch (err) {}
      mapInstance = null;
    }

    // Bersihkan _leaflet_id agar Leaflet tidak memicu error container already initialized
    if ((el as any)._leaflet_id) {
      delete (el as any)._leaflet_id;
    }

    try {
      // Buat Peta Leaflet Berpusat di Kota Manado
      mapInstance = L.map(el, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false
      }).setView([1.482, 124.842], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapInstance);

      markers = [];
      const dataAcara = (daftarAcaraGPM.value && daftarAcaraGPM.value.length > 0)
        ? daftarAcaraGPM.value
        : [
            { id: '1', nama_acara: 'GPM Lapangan Sparta Tikala', lokasi: 'Depan Kantor Walikota Manado', kecamatan: 'Tikala', latitude: 1.4878, longitude: 124.8427 },
            { id: '2', nama_acara: 'GPM Pelataran Bersehati Karombasan', lokasi: 'Pasar Bersehati Karombasan', kecamatan: 'Wanea', latitude: 1.4647, longitude: 124.8415 }
          ];

      dataAcara.forEach((acara: any) => {
        const lat = acara.latitude || (acara.nama_acara.includes('Tikala') ? 1.4878 : 1.4647);
        const lng = acara.longitude || (acara.nama_acara.includes('Tikala') ? 124.8427 : 124.8415);

        const customPin = L.divIcon({
          className: 'gpm-pin-wrap',
          html: `<div style="background:#8b1e1e;color:#ffffff;border-radius:20px;padding:5px 9px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:3px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;white-space:nowrap;">📍 ${acara.nama_acara.replace('GPM ', '')}</div>`,
          iconSize: [130, 32],
          iconAnchor: [65, 16]
        });

        const marker = L.marker([lat, lng], { icon: customPin }).addTo(mapInstance!);
        marker.bindPopup(`<b>${acara.nama_acara}</b><br>${acara.lokasi}<br><i>Ketuk untuk memilih lokasi</i>`);
        marker.on('click', () => {
          pilihAcaraGpm(acara);
        });
        markers.push(marker);
      });

      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, 300);
      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, 700);
    } catch (e) {
      console.warn('Gagal memuat peta Leaflet mobile:', e);
    }
  });
};

const pilihAcaraGpm = async (acara: ItemAcaraGPM) => {
  acaraGPMDipilih.value = acara;
  try {
    const res = await gpmMobileService.ambilPendaftarAcara(acara.id);
    pendaftarGPMList.value = res.data || [];
  } catch (e) {}
  if (mapInstance) {
    const lat = acara.latitude || (acara.nama_acara.includes('Tikala') ? 1.4878 : 1.4647);
    const lng = acara.longitude || (acara.nama_acara.includes('Tikala') ? 124.8427 : 124.8415);
    try {
      mapInstance.setView([lat, lng], 14, { animate: true });
    } catch (e) {}
  }
};

// Mode Tampilan Mobile: 'publik', 'login', 'petugas'
const tampilanMode = ref<'publik' | 'login' | 'petugas'>('publik');
const userAktif = ref(hargaPanganMobileService.ambilUser());

// Tab Navigasi Publik ('harga' | 'gpm')
const tabAktif = ref('harga');

// Konfigurasi Koneksi Server & Website (Sinkronisasi HP <-> Web)
const tampilkanModalServer = ref(false);
const inputUrlServer = ref(getServerBaseUrl());
const sedangUjiKoneksi = ref(false);
const statusKoneksi = ref({
  online: false,
  pesan: 'Memeriksa koneksi ke website...',
  url: getServerBaseUrl(),
  latency: 0
});

const cekKoneksiServer = async (tampilkanToast = false) => {
  const hasil = await ujiKoneksiBackend();
  statusKoneksi.value = {
    online: hasil.sukses,
    pesan: hasil.pesan,
    url: getServerBaseUrl(),
    latency: hasil.latencyMs || 0
  };
  if (tampilkanToast && hasil.sukses) {
    alert(`✅ ${hasil.pesan}`);
  }
};

const bukaModalServer = () => {
  inputUrlServer.value = getServerBaseUrl();
  tampilkanModalServer.value = true;
  cekKoneksiServer(false);
};

const pilihPreset = (url: string) => {
  inputUrlServer.value = url;
};

const lakukanUjiKoneksi = async () => {
  if (!inputUrlServer.value.trim()) return;
  sedangUjiKoneksi.value = true;
  try {
    const hasil = await ujiKoneksiBackend(inputUrlServer.value.trim());
    statusKoneksi.value = {
      online: hasil.sukses,
      pesan: hasil.pesan,
      url: inputUrlServer.value.trim(),
      latency: hasil.latencyMs || 0
    };
  } finally {
    sedangUjiKoneksi.value = false;
  }
};

const simpanKonfigurasiServer = async () => {
  if (!inputUrlServer.value.trim()) return;
  sedangUjiKoneksi.value = true;
  try {
    setServerBaseUrl(inputUrlServer.value.trim());
    await cekKoneksiServer(false);
    await muatData();
    await muatStatsDashboard();
    await muatDataGPM();
    tampilkanModalServer.value = false;
    alert(statusKoneksi.value.online 
      ? '✅ Berhasil terhubung ke server website! Data kini tersinkronisasi langsung.' 
      : '⚠️  Alamat server disimpan, namun server belum merespon. Pastikan backend di PC sudah berjalan.');
  } finally {
    sedangUjiKoneksi.value = false;
  }
};

const handleRefresh = async (event: any) => {
  await cekKoneksiServer(false);
  await Promise.all([
    muatData(),
    muatStatsDashboard(),
    muatDataGPM()
  ]);
  if (event && event.target && typeof event.target.complete === 'function') {
    event.target.complete();
  }
};

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
const subMenuPetugasGPM = ref<'scan' | 'antrean' | 'buat' | 'riwayat'>('scan');
const daftarRiwayatGPM = ref<ItemAcaraGPM[]>([]);
const detailRiwayatPendaftar = ref<{ [key: string]: any[] }>({});
const riwayatTerbukaId = ref<string | null>(null);
const sedangSelesaikanAcaraMobile = ref(false);
// ─── KAMERA SCANNER QR MOBILE (Capacitor Android & Safari iOS) ──────
const kameraAktifMobile = ref(false);
let html5QrMobileScanner: Html5Qrcode | null = null;

const mulaiScanKameraMobile = async () => {
  kameraAktifMobile.value = true;
  pesanScanErrorPetugas.value = '';
  setTimeout(async () => {
    try {
      const el = document.getElementById('mobileQrReader');
      if (!el) return;
      html5QrMobileScanner = new Html5Qrcode("mobileQrReader");
      await html5QrMobileScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText: string) => {
          hentikanScanKameraMobile();
          inputBarcodePetugas.value = decodedText;
          pindaiBarcodeMobile(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      pesanScanErrorPetugas.value = "Gagal mengakses kamera: " + (err.message || 'Pastikan izin akses kamera diberikan.');
      kameraAktifMobile.value = false;
    }
  }, 300);
};

const hentikanScanKameraMobile = async () => {
  if (html5QrMobileScanner) {
    try {
      await html5QrMobileScanner.stop();
      html5QrMobileScanner.clear();
    } catch (e) {}
    html5QrMobileScanner = null;
  }
  kameraAktifMobile.value = false;
};

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
const dropdownGPMKomoditasBuka = ref(false);

const daftarKomoditasPilihanGPM = computed(() => {
  const dariHarga = semuaKomoditas.value.map(k => k.nama_komoditas ? k.nama_komoditas.trim() : '').filter(Boolean);
  const bawaan = [
    'Beras SPHP 5kg',
    'Beras Premium 5kg',
    'Beras Medium 5kg',
    'Minyakita 1L',
    'Minyak Goreng Kemasan 1L',
    'Gula Pasir 1kg',
    'Telur Ayam 1 Baki',
    'Daging Ayam 1 KG',
    'Daging Sapi 1 KG',
    'Bawang Merah 1 KG',
    'Bawang Putih 1 KG',
    'Cabai Rawit 1 KG'
  ];
  return Array.from(new Set([...dariHarga, ...bawaan]));
});

const toggleKomoditasGPM = (nama: string) => {
  let list = formGPMBaru.value.komoditas_tersedia
    ? formGPMBaru.value.komoditas_tersedia.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const idx = list.indexOf(nama);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(nama);
  }
  formGPMBaru.value.komoditas_tersedia = list.join(', ');
};

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

// ID Komoditas sedang diedit
const idDiedit = ref<string | null>(null);

// Form Penetapan Harga Petugas Mobile (Gambar 3)
const formPenetapan = ref({
  nama_komoditas: '',
  satuanJumlah: '1',
  satuanUnit: 'KG',
  harga: '',
  nama_pasar: 'Pasar Tradisional Bahu',
  status: 'Terbit'
});

// Hak Akses Kedinasan Mobile (Staf vs Kepala Bidang)
const isKabid = computed(() => {
  const p = (userAktif.value?.peran || '').toLowerCase();
  return p === 'kabid' || p === 'kepala bidang' || p === 'admin';
});
const isStaf = computed(() => {
  const p = (userAktif.value?.peran || '').toLowerCase();
  return p === 'staf' || p === 'petugas';
});

// State Login Mobile (Gambar 4)
const loginInput = ref({
  email: 'effrend',
  password: '',
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

watch(tabAktif, (baru) => {
  if (baru === 'gpm') {
    setTimeout(inisialisasiPetaGpm, 200);
  }
});

watch(daftarAcaraGPM, () => {
  if (tabAktif.value === 'gpm') {
    inisialisasiPetaGpm();
  }
});

onMounted(async () => {
  await cekKoneksiServer(false);
  await muatData();
  await muatStatsDashboard();
  await muatDataGPM();

  if (tabAktif.value === 'gpm') {
    setTimeout(inisialisasiPetaGpm, 300);
  }

  // Sinkronisasi otomatis saat HP kembali dibuka (Focus)
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      muatData();
      muatStatsDashboard();
      muatDataGPM();
    });
  }

  // Polling berkala setiap 15 detik agar perubahan di web otomatis tampil di HP
  setInterval(() => {
    muatData();
    muatStatsDashboard();
  }, 15000);

});

// ===================== METHOD GPM MOBILE =====================
const muatDataGPM = async () => {
  try {
    const [dataAktif, dataRiwayat] = await Promise.all([
      gpmMobileService.ambilSemuaAcara('Aktif'),
      gpmMobileService.ambilRiwayatAcara()
    ]);
    daftarAcaraGPM.value = dataAktif;
    daftarRiwayatGPM.value = dataRiwayat;

    if (dataAktif.length > 0) {
      if (!acaraGPMDipilih.value || !dataAktif.some(a => a.id === acaraGPMDipilih.value?.id)) {
        acaraGPMDipilih.value = dataAktif[0];
      }
      const targetId = acaraGPMDipilih.value ? acaraGPMDipilih.value.id : dataAktif[0].id;
      const res = await gpmMobileService.ambilPendaftarAcara(targetId);
      pendaftarGPMList.value = res.data || [];
    } else {
      acaraGPMDipilih.value = null;
      pendaftarGPMList.value = [];
    }
  } catch (err) {
    console.error('Error muat GPM:', err);
  }
};

// Selesaikan Kegiatan GPM (Khusus Kepala Bidang & Admin)
const selesaikanAcaraMobile = async () => {
  if (!isKabid.value) {
    alert('Hanya Kepala Bidang yang memiliki hak akses untuk menyelesaikan kegiatan GPM.');
    return;
  }
  if (!acaraGPMDipilih.value) return;
  const nama = acaraGPMDipilih.value.nama_acara;
  const ok = confirm(
    `Konfirmasi Selesaikan Kegiatan:\n\nApakah Anda yakin ingin menyelesaikan "${nama}"?\n\n- Kegiatan akan diarsipkan ke menu Riwayat GPM.\n- Pendaftaran daring masyarakat otomatis ditutup.`
  );
  if (!ok) return;

  sedangSelesaikanAcaraMobile.value = true;
  try {
    await gpmMobileService.selesaikanAcara(acaraGPMDipilih.value.id);
    alert(`✅ Kegiatan "${nama}" resmi diselesaikan dan diarsipkan ke menu Riwayat GPM.`);
    await muatDataGPM();
    subMenuPetugasGPM.value = 'riwayat';
  } catch (err: any) {
    alert('Gagal menyelesaikan kegiatan: ' + (err.message || 'Terjadi kesalahan'));
  } finally {
    sedangSelesaikanAcaraMobile.value = false;
  }
};

// Hapus Riwayat GPM (Khusus Kepala Bidang & Admin)
const hapusRiwayatMobile = async (acara: ItemAcaraGPM) => {
  if (!isKabid.value) {
    alert('Hanya Kepala Bidang yang berhak menghapus riwayat kegiatan GPM.');
    return;
  }
  const ok = confirm(
    `Hapus Riwayat Kegiatan GPM:\n\nApakah Anda yakin ingin menghapus data riwayat "${acara.nama_acara}" beserta seluruh antreannya?\n\nTindakan ini tidak dapat dibatalkan.`
  );
  if (!ok) return;

  try {
    await gpmMobileService.hapusAcara(acara.id);
    alert(`🗑️ Riwayat kegiatan "${acara.nama_acara}" berhasil dihapus.`);
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal menghapus riwayat: ' + (err.message || 'Terjadi kesalahan'));
  }
};

// Unduh Rekap Data Kegiatan Aktif ke CSV
const unduhRekapAktifMobile = () => {
  if (!acaraGPMDipilih.value) return;
  gpmMobileService.eksporKeCSV(acaraGPMDipilih.value, pendaftarGPMList.value);
};

// Unduh Rekap Data Kegiatan Riwayat ke CSV
const unduhRekapRiwayatMobile = async (acara: ItemAcaraGPM) => {
  try {
    let pendaftar = detailRiwayatPendaftar.value[acara.id];
    if (!pendaftar) {
      const res = await gpmMobileService.ambilPendaftarAcara(acara.id);
      pendaftar = res.data || [];
      detailRiwayatPendaftar.value[acara.id] = pendaftar;
    }
    gpmMobileService.eksporKeCSV(acara, pendaftar);
  } catch (err: any) {
    alert('Gagal mengunduh file CSV: ' + err.message);
  }
};

// Buka/Tutup Accordion Antrean Riwayat
const toggleLihatRiwayatAntrean = async (acara: ItemAcaraGPM) => {
  if (riwayatTerbukaId.value === acara.id) {
    riwayatTerbukaId.value = null;
    return;
  }
  riwayatTerbukaId.value = acara.id;
  if (!detailRiwayatPendaftar.value[acara.id]) {
    try {
      const res = await gpmMobileService.ambilPendaftarAcara(acara.id);
      detailRiwayatPendaftar.value[acara.id] = res.data || [];
    } catch (e) {}
  }
};

watch(menuPetugas, async (baru) => {
  if (baru === 'gpm') {
    await muatDataGPM();
  }
});

watch(subMenuPetugasGPM, async (baru) => {
  if (baru !== 'scan' && kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
  }
  if (baru === 'antrean') {
    await muatDataGPM();
  }
});

const ambilNomorAntreanMobile = async () => {
  if (!acaraGPMDipilih.value) return;
  if (!formAntreanGPM.value.nama_lengkap.trim() || !formAntreanGPM.value.nomor_telepon.trim()) {
    pesanErrorGPM.value = 'Nama lengkap dan nomor telepon wajib diisi!';
  
  }

  // Validasi Nama: Hanya huruf dan spasi, dilarang simbol/angka
  const regexNama = /^[a-zA-Z\s'.]+$/;
  if (!regexNama.test(formAntreanGPM.value.nama_lengkap.trim())) {
    pesanErrorGPM.value = 'Nama lengkap hanya boleh berisi huruf dan spasi (tanpa angka atau simbol)!';
  
  }

  // Validasi Nomor Telepon: Hanya angka, minimal > 10 digit (11-15 digit)
  const telp = formAntreanGPM.value.nomor_telepon.trim();
  const regexTelp = /^[0-9]+$/;
  if (!regexTelp.test(telp)) {
    pesanErrorGPM.value = 'Nomor telepon hanya boleh berisi angka!';
  
  }
  if (telp.length <= 10) {
    pesanErrorGPM.value = 'Nomor telepon harus lebih dari 10 digit (minimal 11 digit, contoh: 081234567890)!';
  
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
    pesanScanErrorPetugas.value = 'Silakan masukan kode tiket!';
  
  }
  sedangScanBarcode.value = true;
  pesanScanErrorPetugas.value = '';
  hasilScanPetugas.value = null;
  try {
    const data = await gpmMobileService.scanBarcode(code);
    hasilScanPetugas.value = data;
  } catch (err: any) {
    pesanScanErrorPetugas.value = err.message || 'Kode tiket tidak ditemukan';
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

// -------------------------------------------------------------
// OPERASI LOGIN & LOGOUT MOBILE
// -------------------------------------------------------------
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
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal masuk: ' + err.message);
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
  alert('Silakan hubungi administrator Dinas Pangan Kota Manado');
};

// -------------------------------------------------------------
// OPERASI PETUGAS MOBILE (TETAPKAN HARGA)
// -------------------------------------------------------------

// Format tampilan satuan agar bersih dari tanda garis miring atau teks anomali
const formatSatuanTampil = (satuan?: string) => {
  if (!satuan) return '1 KG';
  let s = String(satuan).replace(/[\/]+/g, '').trim();
  if (!s) return '1 KG';
  if (/^kg$|^kilogram$/i.test(s)) return '1 KG';
  if (/^gram$|^gr$|^g$/i.test(s)) return '1 Gram';
  const match = s.match(/^(\d+)\s*(kg|kilogram|gram|gr|g)$/i);
  if (match) {
    const angka = match[1];
    const unit = /^(gram|gr|g)$/i.test(match[2].trim()) ? 'Gram' : 'KG';
    return `${angka} ${unit}`;
  }
  return s;
};

// Mengurai nilai satuan lama menjadi komponen angka kuantitas dan pilihan unit (KG / Gram)
const uraiSatuan = (satuan?: string) => {
  if (!satuan) return { jumlah: '1', unit: 'KG' };
  const str = String(satuan).replace(/[\/]+/g, '').trim();
  const digitMatch = str.match(/\d+/);
  const jumlah = digitMatch ? digitMatch[0] : '1';
  const isGram = /\b(gram|gr|g)\b/i.test(str) && !/\b(kg|kilogram)\b/i.test(str);
  return {
    jumlah,
    unit: isGram ? 'Gram' : 'KG'
  };
};

// Memastikan input hanya menerima angka bulat positif (0-9) dan navigasi keyboard
const hanyaBolehAngka = (e: KeyboardEvent) => {
  if ([
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
  ].includes(e.key)) {
    return;
  }
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

const mulaiEditItem = (item: ItemHargaPangan) => {
  idDiedit.value = item.id || null;
  const parsed = uraiSatuan(item.satuan);
  formPenetapan.value = {
    nama_komoditas: item.nama_komoditas,
    satuanJumlah: parsed.jumlah,
    satuanUnit: parsed.unit,
    harga: String(item.harga ? Math.round(item.harga) : '').replace(/[^0-9]/g, ''),
    nama_pasar: item.nama_pasar,
    status: item.status || 'Terbit'
  };
  const el = document.getElementById('formPenetapanPanel');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const batalEditItem = () => {
  idDiedit.value = null;
  formPenetapan.value = {
    nama_komoditas: '',
    satuanJumlah: '1',
    satuanUnit: 'KG',
    harga: '',
    nama_pasar: daftarPasar.value[0] || 'Pasar Tradisional Bahu',
    status: 'Terbit'
  };
};

const hapusItem = async (item: ItemHargaPangan) => {
  if (!isKabid.value) {
    alert('Akses Ditolak: Hanya Kepala Bidang yang memiliki kewenangan untuk menghapus komoditas pangan.');
    return;
  }
  if (!item.id) return;
  if (!confirm(`Hapus data harga untuk "${item.nama_komoditas}"?`)) return;
  try {
    await hargaPanganMobileService.hapus(item.id);
    pesanSuksesMobile.value = `🗑️  Data ${item.nama_komoditas} berhasil dihapus!`;
    setTimeout(() => pesanSuksesMobile.value = '', 3500);
    if (idDiedit.value === item.id) {
      batalEditItem();
    }
    await muatData();
    await muatStatsDashboard();
  } catch (e: any) {
    alert('Gagal menghapus: ' + e.message);
  }
};

const simpanHargaPetugas = async (statusOverride?: string) => {
  if (!formPenetapan.value.nama_komoditas.trim()) {
    alert('Nama komoditas pangan wajib diisi!');
    return;
  }

  const hargaAngka = parseInt(String(formPenetapan.value.harga).replace(/[^0-9]/g, ''), 10);
  if (!hargaAngka || hargaAngka <= 0) {
    alert('Besaran harga acuan wajib diisi dengan angka bulat positif lebih dari 0!');
    return;
  }

  const kuantitas = parseInt(String(formPenetapan.value.satuanJumlah).replace(/[^0-9]/g, ''), 10) || 1;
  const unit = formPenetapan.value.satuanUnit === 'Gram' ? 'Gram' : 'KG';
  const satuanGabungan = `${kuantitas} ${unit}`;

  // Staf selalu menghasilkan status 'Draft' untuk verifikasi Kabid; Kabid dapat menentukan langsung 'Terbit' atau 'Draft'
  const status = isKabid.value ? ((statusOverride as any) || 'Terbit') : 'Draft';

  try {
    if (idDiedit.value) {
      await hargaPanganMobileService.perbarui(idDiedit.value, {
        nama_komoditas: formPenetapan.value.nama_komoditas.trim(),
        satuan: satuanGabungan,
        harga: hargaAngka,
        nama_pasar: formPenetapan.value.nama_pasar,
        status: status,
        tanggal_penetapan: '14 Oktober 2026'
      });
      pesanSuksesMobile.value = isKabid.value
        ? (status === 'Terbit' ? `✅ Perubahan "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diterbitkan ke masyarakat!` : `📝 Perubahan "${formPenetapan.value.nama_komoditas}" disimpan sebagai draf!`)
        : `📨 Perubahan "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan ke Kepala Bidang untuk diverifikasi!`;
      batalEditItem();
    } else {
      await hargaPanganMobileService.tambah({
        nama_komoditas: formPenetapan.value.nama_komoditas.trim(),
        kategori: 'Bahan Pokok',
        satuan: satuanGabungan,
        harga: hargaAngka,
        nama_pasar: formPenetapan.value.nama_pasar,
        tanggal_penetapan: '14 Oktober 2026',
        status: status
      });
      pesanSuksesMobile.value = isKabid.value
        ? (status === 'Terbit' ? `✅ Harga "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diterbitkan ke masyarakat!` : '📝 Harga disimpan sebagai draf!')
        : `📨 Pengajuan harga "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan ke Kepala Bidang untuk diverifikasi!`;
      formPenetapan.value.nama_komoditas = '';
      formPenetapan.value.satuanJumlah = '1';
      formPenetapan.value.satuanUnit = 'KG';
      formPenetapan.value.harga = '';
    }

    setTimeout(() => pesanSuksesMobile.value = '', 3500);

    await muatData();
    await muatStatsDashboard();
  } catch (e: any) {
    alert('Gagal menyimpan harga: ' + e.message);
  }
};

const ubahStatusItem = async (item: ItemHargaPangan) => {
  const statusBaru = item.status === 'Draft' ? 'Terbit' : 'Draft';
  if (item.id) {
    await hargaPanganMobileService.perbarui(item.id, { status: statusBaru });
    pesanSuksesMobile.value = statusBaru === 'Terbit'
      ? `✅ "${item.nama_komoditas}" diterbitkan ke halaman masyarakat!`
      : `📝 "${item.nama_komoditas}" diubah menjadi draf.`;
    setTimeout(() => pesanSuksesMobile.value = '', 3000);
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
  background: 
    linear-gradient(135deg, rgba(15, 23, 42, 0.45) 0%, rgba(30, 10, 10, 0.55) 100%),
    url('/login-bg.jpg') center/cover no-repeat;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: max(24px, env(safe-area-inset-top, 32px) + 24px) 16px max(24px, env(safe-area-inset-bottom, 20px)) 16px;
  position: relative;
}

.btn-back-to-public {
  position: absolute;
  top: max(16px, env(safe-area-inset-top, 28px) + 12px);
  left: 16px;
  background: #ffffff;
  color: #8b1e1e;
  border: 1px solid #fee2e2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  z-index: 10;
}

.m-login-hint-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.76rem;
  margin-top: 8px;
  color: #fff;
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

.mobile-login-logo{
  width: 40px;
  height: 40px;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.mobile-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  padding-top: max(8px, env(safe-area-inset-top, 28px));
  position: relative;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.btn-cancel-edit-pill {
  margin-left: auto;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.item-actions-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.btn-mini-action {
  border: none;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.btn-mini-action.edit {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.btn-mini-action.delete {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
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
  padding: 2px;
  flex-shrink: 0;
}

.staff-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  background-color: #ffffff !important;
  color: #0f172a !important;
  -webkit-appearance: none;
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
  padding-top: max(8px, env(safe-area-inset-top, 28px));
  position: relative;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
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
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
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
  background-color: #ffffff !important;
  color: #0f172a !important;
  outline: none;
  -webkit-appearance: none;
}

.mobile-search-input::placeholder {
  color: #94a3b8 !important;
  opacity: 1;
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
  background-color: #ffffff !important;
  color: #0f172a !important;
  -webkit-appearance: none;
}

.m-scan-input::placeholder {
  color: #94a3b8 !important;
  opacity: 1;
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

.gpm-pin-wrap {
  background: transparent !important;
  border: none !important;
}

.m-leaflet-map-box {
  width: 100%;
  height: 220px;
  min-height: 220px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  z-index: 1;
  background: #f1f5f9;
  position: relative;
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

.m-event-info{
  font-size: 0.8rem;
  color: #475569;
  margin-bottom: 8px;
}

.m-event-infop {
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
  padding: 11px 14px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  box-sizing: border-box;
  background-color: #ffffff !important;
  color: #0f172a !important;
  -webkit-appearance: none;
}

.m-input-text::placeholder {
  color: #94a3b8 !important;
  opacity: 1;
}

.m-input-text:focus {
  border-color: #8b1e1e !important;
  outline: none;
  background-color: #ffffff !important;
  color: #0f172a !important;
  box-shadow: 0 0 0 3px rgba(139, 30, 30, 0.12);
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

/* ===================================================================================
   KOMPONEN KONEKSI SERVER BACKEND & WEBSITE (SINKRONISASI HP <-> WEB)
   =================================================================================== */

.btn-server-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-server-status:hover {
  background: rgba(255, 255, 255, 0.25);
}

.btn-server-status.is-online {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(34, 197, 94, 0.2);
}

.btn-server-status.is-offline {
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(239, 68, 68, 0.15);
}

.status-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
}

.btn-server-status.is-online .status-pulse-dot {
  background: #22c55e;
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.status-label-short {
  letter-spacing: 0.2px;
}

/* Modal Pengaturan Server */
.server-config-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.server-config-modal-card {
  background: #ffffff;
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: modal-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.server-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #8b1e1e;
  color: #ffffff;
}

.server-modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.server-icon-pulse {
  font-size: 1.6rem;
}

.server-m-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.server-m-sub {
  margin: 2px 0 0 0;
  font-size: 0.72rem;
  opacity: 0.88;
}

.btn-close-server-modal {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  opacity: 0.85;
}

.btn-close-server-modal:hover {
  opacity: 1;
}

.server-modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.server-status-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.84rem;
}

.server-status-banner.is-online {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.server-status-banner.is-offline {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.server-status-icon {
  font-size: 1.2rem;
  line-height: 1;
  margin-top: 1px;
}

.server-status-details strong {
  display: block;
  font-size: 0.88rem;
  margin-bottom: 2px;
}

.server-status-details p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
}

.server-latency-text {
  margin-top: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #15803d;
}

.server-hint-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.76rem;
  color: #475569;
  line-height: 1.4;
}

.server-hint-box code {
  background: #e2e8f0;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.74rem;
  color: #0f172a;
}

.server-form-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  color: #475569;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.server-input-wrapper {
  display: flex;
  gap: 8px;
}

.server-input-field {
  flex: 1;
  padding: 9px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.84rem;
  font-family: monospace;
  box-sizing: border-box;
}

.server-input-field:focus {
  border-color: #8b1e1e;
  outline: none;
}

.btn-test-conn {
  background: #334155;
  color: #ffffff;
  border: none;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.btn-test-conn:hover {
  background: #1e293b;
}

.server-presets-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.presets-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
}

.presets-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.btn-preset-chip {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-preset-chip:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.server-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.btn-cancel-server {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
}

.btn-save-server {
  background: #8b1e1e;
  border: none;
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.84rem;
  cursor: pointer;
}

.btn-save-server:hover {
  background: #701616;
}
.btn-preset-chip.is-cloud {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
  font-weight: 700;
}
.btn-preset-chip.is-cloud:hover {
  background: #dbeafe;
}

/* Action Bar & Riwayat GPM Mobile */
.m-antrean-action-bar {
  display: flex;
  gap: 8px;
  margin: 10px 0 14px 0;
  flex-wrap: wrap;
}

.btn-m-export-csv {
  flex: 1;
  background: #0284c7;
  color: #ffffff;
  border: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-m-close-gpm {
  flex: 1;
  background: #dc2626;
  color: #ffffff;
  border: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-m-close-gpm:disabled {
  opacity: 0.6;
}

.m-history-cards-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-history-event-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
}

.m-history-card-top {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.m-history-tag-done {
  align-self: flex-start;
  background: #e2e8f0;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
}

.m-history-card-title {
  font-size: 0.95rem;
  color: #0f172a;
}

.m-history-card-loc, .m-history-card-date {
  font-size: 0.78rem;
  color: #64748b;
}

.m-history-card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 10px;
  text-align: center;
}

.m-history-card-stats .lbl {
  display: block;
  font-size: 0.68rem;
  color: #64748b;
  text-transform: uppercase;
}

.m-history-card-stats strong {
  font-size: 0.95rem;
  color: #0f172a;
}

.m-history-card-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-m-hist-csv {
  flex: 1;
  background: #0284c7;
  color: #ffffff;
  border: none;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-hist-view {
  flex: 1;
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-hist-del {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.m-history-detail-accordion {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #cbd5e1;
}

.m-history-queue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.m-hist-queue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #ffffff;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.76rem;
}

.m-hist-queue-row .q-num {
  font-weight: 800;
  color: #8b1e1e;
}

.m-hist-queue-row .q-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

</style>
