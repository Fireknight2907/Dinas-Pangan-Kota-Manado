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

          <!-- [CEK-06] Peringatan lockout -->
          <div v-if="sisaWaktuLockoutMobile > 0" class="m-lockout-alert">
            🔒 Akses dikunci — coba lagi dalam
            <strong>{{ Math.floor(sisaWaktuLockoutMobile / 60) }}:{{ String(sisaWaktuLockoutMobile % 60).padStart(2, '0') }}</strong>
          </div>

          <button type="submit" class="btn-m-submit" :disabled="sedangLogin || sisaWaktuLockoutMobile > 0">
            {{ sedangLogin ? 'Memproses...' : (sisaWaktuLockoutMobile > 0 ? '🔒 Dikunci' : 'Masuk Sekarang') }}
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
            <div class="staff-brand-details">
              <div class="staff-brand-title-line">
                <h2 class="staff-header-name">SI PATOKAAN</h2>
                <!-- Indikator Status Online ditempatkan menyatu rapi dengan judul -->
                <button 
                  type="button" 
                  class="btn-server-status-pill" 
                  :class="statusKoneksi.online ? 'is-online' : 'is-offline'" 
                  @click="bukaModalServer"
                  title="Status Koneksi Sistem"
                >
                  <span class="status-pulse-dot"></span>
                  <span class="status-label-short">{{ statusKoneksi.online ? 'Online' : 'Offline' }}</span>
                </button>
              </div>
              <div class="staff-header-sub-row">
                <span class="user-role-badge" :class="'role-' + peranAktif.toLowerCase()">
                  {{ formatPeranLengkap(peranAktif) }}
                </span>
                <span class="user-greeting-name">{{ userAktif?.nama || 'Petugas' }}</span>
              </div>
            </div>
          </div>

          <div class="staff-header-user">
            <!-- Tombol Notifikasi Dinamis Mobile -->
            <button
              type="button"
              class="btn-notif-mobile"
              @click="modalNotifMobileBuka = true"
              title="Notifikasi Sistem"
              style="position: relative; background: none; border: none; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #1e293b;"
            >
              <span style="font-size: 1.15rem;">🔔</span>
              <span v-if="daftarNotifMobile.length > 0" class="red-dot" style="position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background: #dc2626; border-radius: 50%; border: 1.5px solid #fff;"></span>
            </button>

            <!-- Profil User Button -->
            <div class="staff-avatar-mini" @click="bukaModalProfil" :title="'Profil ' + (userAktif?.nama || 'Petugas')">
              <img v-if="userAktif?.foto_profil" :src="userAktif.foto_profil" class="avatar-img-fit" alt="Avatar" />
              <span v-else>{{ (userAktif?.nama ? userAktif.nama.charAt(0) : 'P').toUpperCase() }}</span>
            </div>

            <!-- Tombol Keluar (Logout) -->
            <button class="btn-logout-mini" @click="eksekusiLogout" title="Keluar">
              Keluar
            </button>
          </div>
        </div>

        <!-- Dynamic Role-Based Segmented Bar -->
        <div class="staff-segmented-bar">
          <button 
            v-for="menu in daftarMenuTersedia"
            :key="menu.id"
            :class="['staff-segment-btn', menuPetugas === menu.id ? 'active' : '']"
            @click="gantiMenuPetugas(menu.id)"
          >
            <span class="segment-icon">{{ menu.icon }}</span>
            <span class="segment-text">{{ menu.label }}</span>
          </button>
        </div>
      </ion-header>

      <ion-content class="mobile-staff-content">
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
          <ion-refresher-content pulling-text="Tarik ke bawah untuk memperbarui..." refreshing-spinner="crescent" refreshing-text="Menyinkronkan data dari web..."></ion-refresher-content>
        </ion-refresher>
        <!-- SUB-VIEW A: FORMULIR PENETAPAN HARGA & DAFTAR (KHUSUS STAF / PENETAPAN) -->
        <div v-if="menuPetugas === 'input-harga' || menuPetugas === 'tetapkan'" class="staff-view-container">
          <div class="staff-heading-area" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h1 class="staff-view-title">Penetapan Harga Pangan</h1>
              <p class="staff-view-desc">
                Tetapkan harga acuan untuk jenis pangan yang diawasi, lalu ajukan untuk verifikasi
              </p>
            </div>
            <button
              type="button"
              class="btn-m-super-csv"
              style="background: #166534; color: #ffffff; padding: 6px 12px; font-size: 0.78rem; border-radius: 6px;"
              @click="unduhLaporanPanganKabid"
            >
              📥 Unduh CSV
            </button>
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
                <label>Komoditas / Varian Resmi (Master Admin)</label>
                <select
                  class="s-select-market"
                  :value="formPenetapan.nama_komoditas"
                  @change="pilihKomoditasMasterStaf(($event.target as HTMLSelectElement).value)"
                  required
                >
                  <option value="">-- Pilih Komoditas / Varian Resmi --</option>
                  <optgroup
                    v-for="grup in grupKomoditasDropdownMobile"
                    :key="grup.kelompok"
                    :label="`🌾 ${grup.kelompok}`"
                  >
                    <option
                      v-for="k in grup.items"
                      :key="k.nama_komoditas"
                      :value="k.nama_komoditas"
                    >
                      {{ k.nama_komoditas }} ({{ k.satuan_bawaan }})
                    </option>
                  </optgroup>
                  <optgroup
                    v-if="formPenetapan.nama_komoditas && !daftarMasterKomoditas.some(k => k.nama_komoditas.toLowerCase() === formPenetapan.nama_komoditas.toLowerCase())"
                    label="Data Sebelumnya"
                  >
                    <option :value="formPenetapan.nama_komoditas">{{ formPenetapan.nama_komoditas }}</option>
                  </optgroup>
                </select>
                <small style="color: #64748b; font-size: 0.7rem; margin-top: 3px; display: block;">
                  Kategori ({{ formPenetapan.kategori }}) & satuan otomatis mengikuti Master Komoditas Admin.
                </small>
              </div>

              <div class="s-row-two">
                <div class="s-field">
                  <label>Satuan Resmi (Per 1 • Master Admin)</label>
                  <select v-model="formPenetapan.satuan" class="s-select-market" :disabled="Boolean(formPenetapan.nama_komoditas)">
                    <option v-for="s in Array.from(new Set([...daftarSatuan, formPenetapan.satuan].filter(Boolean)))" :key="s" :value="s">
                      {{ s }}
                    </option>
                  </select>
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
                  <option v-for="p in Array.from(new Set([...daftarPasar, formPenetapan.nama_pasar].filter(Boolean)))" :key="p" :value="p">
                    {{ p }}
                  </option>
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
                    {{ item.nama_pasar }} · {{ item.tanggal_penetapan || '-' }}
                  </div>
                </div>

                <div class="price-info-right">
                  <div class="price-nominal-red">{{ formatRupiah(item.harga) }}</div>
                  <div class="item-actions-row">
                    <!-- Status Badge: Kabid bisa toggle status (Setujui/Tarik), Staf hanya melihat status -->
                    <span 
                      v-if="isKabid"
                      :class="['status-badge-tag', (item.status || '').toLowerCase() === 'draft' ? 'is-draft' : 'is-terbit']"
                      @click="ubahStatusItem(item)"
                      :title="(item.status || '').toLowerCase() === 'draft' ? 'Klik untuk Setujui & Terbitkan' : 'Klik untuk Tarik ke Draf'"
                      style="cursor: pointer;"
                    >
                      {{ (item.status || '').toLowerCase() === 'draft' ? '⏳ Setujui' : '↩️ Tarik' }}
                    </span>
                    <span 
                      v-else
                      :class="['status-badge-tag', (item.status || '').toLowerCase() === 'draft' ? 'is-draft' : 'is-terbit']"
                      style="cursor: default;"
                    >
                      {{ (item.status || '').toLowerCase() === 'draft' ? 'Draf' : (item.status || 'Terbit') }}
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

        <!-- SUB-VIEW B: DASHBOARD STATS & BERANDA PERAN RESMI -->
        <div v-if="menuPetugas === 'dashboard'" class="staff-view-container">
          <!-- Role Welcome Hero Banner -->
          <div class="m-role-banner" :class="'banner-' + peranAktif.toLowerCase()">
            <div class="m-role-banner-avatar">
              <img v-if="userAktif?.foto_profil" :src="userAktif.foto_profil" alt="Avatar" class="avatar-fit-circle" />
              <span v-else>{{ (userAktif?.nama ? userAktif.nama.charAt(0) : 'P').toUpperCase() }}</span>
            </div>
            <div class="m-role-banner-info">
              <span class="m-role-chip">{{ formatPeranLengkap(peranAktif) }}</span>
              <h2 class="m-role-banner-title">Selamat Datang, {{ userAktif?.nama || 'Petugas' }}</h2>
              <p class="m-role-banner-bidang">{{ (peranAktif === 'Admin' ? 'Admin' : (peranAktif === 'Superadmin' ? 'Superadmin' : userAktif?.bidang)) || 'Dinas Pangan Kota Manado' }}</p>
            </div>
          </div>

          <div class="staff-stats-grid">
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.harga_ditetapkan }}</div>
              <div class="stat-lbl">Harga Terbit</div>
              <div class="stat-sub">aktif di website</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.draft_harga }}</div>
              <div class="stat-lbl">Draf Harga</div>
              <div class="stat-sub">menunggu persetujuan</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.gpm_terjadwal }}</div>
              <div class="stat-lbl">GPM Terjadwal</div>
              <div class="stat-sub">kegiatan mendatang</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ statsDashboard.gpm_selesai }}</div>
              <div class="stat-lbl">GPM Selesai</div>
              <div class="stat-sub">terarsip resmi</div>
            </div>
          </div>

          <!-- Modul Menu Cepat Sesuai Hak Akses Peran Pengguna -->
          <div class="m-qa-panel">
            <h3 class="m-qa-title">Akses Cepat Modul Kedinasan:</h3>
            <div class="m-qa-grid">
              <!-- Menu Cepat Khusus Staf -->
              <template v-if="isStaf">
                <button type="button" class="m-qa-card" @click="menuPetugas = 'input-harga'">
                  <span class="m-qa-icon">📝</span>
                  <div class="m-qa-detail">
                    <strong>Masukan Data Pangan</strong>
                    <small>Input harga komoditas pangan</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'kelola-gpm'; subMenuPetugasGPM = 'scan'">
                  <span class="m-qa-icon">📷</span>
                  <div class="m-qa-detail">
                    <strong>Pindai QR Tiket GPM</strong>
                    <small>Verifikasi kehadiran antrean</small>
                  </div>
                </button>
              </template>

              <!-- Menu Cepat Khusus Kabid -->
              <template v-if="isKabid">
                <button type="button" class="m-qa-card m-qa-primary" @click="menuPetugas = 'verif-harga'">
                  <span class="m-qa-icon">✅</span>
                  <div class="m-qa-detail">
                    <strong>Verifikasi Harga Pangan</strong>
                    <small>{{ statsDashboard.draft_harga }} draf perlu verifikasi</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'laporan'">
                  <span class="m-qa-icon">📑</span>
                  <div class="m-qa-detail">
                    <strong>Laporan Bidang Pangan</strong>
                    <small>Rekap harga & unduh CSV</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'kelola-gpm'">
                  <span class="m-qa-icon">🎟️</span>
                  <div class="m-qa-detail">
                    <strong>Kelola Acara GPM</strong>
                    <small>Selesaikan & arsipkan acara</small>
                  </div>
                </button>
              </template>

              <!-- Menu Cepat Khusus Admin -->
              <template v-if="isAdmin">
                <button type="button" class="m-qa-card m-qa-primary" @click="menuPetugas = 'kelola-user'">
                  <span class="m-qa-icon">👥</span>
                  <div class="m-qa-detail">
                    <strong>Kelola Pengguna Sistem</strong>
                    <small>Atur peran & reset kata sandi</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'master-data'">
                  <span class="m-qa-icon">🏛️</span>
                  <div class="m-qa-detail">
                    <strong>Master Pasar & Wilayah</strong>
                    <small>Kelola pasar dan kecamatan</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'cek-gpm'">
                  <span class="m-qa-icon">🔍</span>
                  <div class="m-qa-detail">
                    <strong>Supervisi Menu Cek GPM</strong>
                    <small>Pantau kuota & pendaftar</small>
                  </div>
                </button>
              </template>

              <!-- Menu Cepat Khusus Kadis -->
              <template v-if="isKadis">
                <button type="button" class="m-qa-card m-qa-primary" @click="menuPetugas = 'grafik-pangan'">
                  <span class="m-qa-icon">📈</span>
                  <div class="m-qa-detail">
                    <strong>Grafik Tren Fluktuasi</strong>
                    <small>Analisis pergerakan komoditas</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'laporan-gpm'">
                  <span class="m-qa-icon">📋</span>
                  <div class="m-qa-detail">
                    <strong>Laporan Eksekutif GPM</strong>
                    <small>Rekapitulasi ketercapaian kuota</small>
                  </div>
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW C: PENGELOLAAN GPM & SCAN QR CODE OLEH PETUGAS -->
        <div v-if="menuPetugas === 'gpm' || menuPetugas === 'kelola-gpm'" class="staff-view-container">
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
              Masukan atau pindai kode QR tiket masyarakat untuk verifikasi kehadiran. Tiket acara yang melewati jam selesai WITA terkunci otomatis.
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

              <button 
                type="button" 
                @click="bukaModalManualMobile"
                :disabled="daftarAcaraGPM.length === 0"
                :style="{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px',
                  marginTop: '8px',
                  fontWeight: '700',
                  background: daftarAcaraGPM.length === 0 ? '#94a3b8' : '#059669',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: daftarAcaraGPM.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: daftarAcaraGPM.length === 0 ? 'none' : '0 3px 10px rgba(5,150,105,0.25)'
                }"
              >
                {{ daftarAcaraGPM.length === 0 ? '🚫 Tidak Ada Acara GPM Aktif' : '➕ Tambah Manual (Di Tempat)' }}
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
                placeholder="Contoh: GPM-WEB-001-A9F2"
                class="m-scan-input"
              />
              <button type="submit" class="btn-m-scan-action" :disabled="sedangScanBarcode">
                {{ sedangScanBarcode ? '...' : 'Pindai' }}
              </button>
            </form>

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

              <div v-if="hasilScanPetugas.acara" class="m-scan-event-strip">
                <strong>{{ hasilScanPetugas.acara.nama_acara }}</strong>
                <span>📍 {{ hasilScanPetugas.acara.lokasi }} · 📅 {{ hasilScanPetugas.acara.tanggal }} ({{ hasilScanPetugas.acara.jam_mulai || '08:00' }} - {{ hasilScanPetugas.acara.jam_selesai || '14:00' }} WITA)</span>
              </div>

              <div class="m-profile-info-grid">
                <div>
                  <span class="m-info-lbl">Nama Lengkap</span>
                  <strong class="m-info-val">{{ gpmMobileService.parseDataPendaftar(hasilScanPetugas).nama_bersih }}</strong>
                </div>
                <div>
                  <span class="m-info-lbl">NIK (16 Digit)</span>
                  <strong class="m-info-val">{{ gpmMobileService.parseDataPendaftar(hasilScanPetugas).nik || '-' }}</strong>
                </div>
                <div>
                  <span class="m-info-lbl">Jalur Pendaftaran</span>
                  <div>
                    <span :class="['m-jalur-tag', gpmMobileService.parseDataPendaftar(hasilScanPetugas).jalur_pendaftaran === 'Langsung' ? 'jalur-langsung' : 'jalur-daring']">
                      {{ gpmMobileService.parseDataPendaftar(hasilScanPetugas).jalur_pendaftaran === 'Langsung' ? '📍 Langsung' : '🌐 Daring' }}
                    </span>
                  </div>
                </div>
                <div>
                  <span class="m-info-lbl">No. HP / WA</span>
                  <strong class="m-info-val">{{ gpmMobileService.parseDataPendaftar(hasilScanPetugas).nomor_telepon }}</strong>
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

              <!-- Kunci Verifikasi QR jika Acara Sudah Lewat Jam / Selesai -->
              <div
                v-if="hasilScanPetugas.acara?.terkunci_waktu || (hasilScanPetugas.acara?.status || '').toLowerCase() === 'selesai'"
                class="m-gpm-locked-banner locked-ended"
                style="margin-top: 10px;"
              >
                <span class="m-lock-ico">🔒</span>
                <div>
                  <strong>Tiket QR Terkunci (Acara Telah Berakhir)</strong>
                  <p>Jadwal GPM telah melewati jam tutup ({{ hasilScanPetugas.acara?.jam_selesai || '-' }} WITA) atau berstatus Selesai. Status kehadiran tidak dapat diubah lagi.</p>
                </div>
              </div>
              <div v-else-if="hasilScanPetugas.status_kehadiran === 'Hadir'" class="m-verified-box">
                <div>✅ Pendaftar telah diverifikasi hadir di lokasi GPM.</div>
                <button
                  type="button"
                  class="btn-m-cancel-hadir"
                  @click="verifikasiKehadiranMobile('Menunggu')"
                >
                  ↩ Batalkan Kehadiran
                </button>
              </div>
              <button 
                v-else 
                type="button"
                class="btn-m-verify-confirm" 
                @click="verifikasiKehadiranMobile('Hadir')"
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
                <h3 style="margin: 0;">Antrean: {{ acaraGPMDipilih?.nama_acara || 'Belum Ada Acara Aktif' }}</h3>
              </div>
              <span class="m-event-quota">Total: {{ pendaftarGPMList.length }} warga</span>
            </div>

            <!-- Pilih Acara Aktif jika lebih dari 1 -->
            <div v-if="daftarAcaraGPM.length > 1" class="s-field" style="margin: 10px 0;">
              <label>Pilih Lokasi Kegiatan GPM Aktif</label>
              <select
                class="s-select-market"
                :value="acaraGPMDipilih?.id || ''"
                @change="pilihAcaraGpmById(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="a in daftarAcaraGPM" :key="a.id" :value="a.id">
                  {{ a.nama_acara }} ({{ a.tanggal }} · Sisa {{ a.sisa_kuota ?? 0 }}/{{ a.kuota_maksimal }})
                </option>
              </select>
            </div>

            <!-- Strip Status Kuota & Auto-Close WITA -->
            <div v-if="acaraGPMDipilih && statusAcaraDipilihMobile" class="m-antrean-quota-strip">
              <div class="m-aqs-top">
                <span :class="['m-gpm-status-pill', 'st-' + statusAcaraDipilihMobile.kode.toLowerCase().replace(/\s+/g, '-')]">
                  {{ statusAcaraDipilihMobile.label }}
                </span>
                <span class="m-aqs-time">⏱️ Auto-close {{ acaraGPMDipilih.jam_selesai }} WITA</span>
              </div>
              <div class="m-aqs-nums">
                <span>Terisi: <strong>{{ statusAcaraDipilihMobile.terisi }} / {{ statusAcaraDipilihMobile.kuotaMaks }}</strong></span>
                <span>Sisa: <strong>{{ statusAcaraDipilihMobile.sisaKuota }}</strong></span>
                <span>Hadir: <strong>{{ statusAcaraDipilihMobile.totalHadir }}</strong></span>
              </div>
              <div class="m-gpm-progress-track">
                <div
                  class="m-gpm-progress-fill"
                  :class="{ full: statusAcaraDipilihMobile.kuotaPenuh }"
                  :style="{ width: statusAcaraDipilihMobile.persenTerisi + '%' }"
                ></div>
              </div>
            </div>

            <!-- Tombol Aksi Mobile: Unduh CSV, Tambah Manual, Atur Kuota (Kabid), & Selesaikan Lebih Awal -->
            <div class="m-antrean-action-bar">
              <button 
                type="button" 
                class="btn-m-export-csv"
                :disabled="!acaraGPMDipilih"
                @click="unduhRekapAktifMobile"
              >
                📥 Unduh Rekap (CSV)
              </button>
              <button 
                type="button" 
                class="btn-m-tambah-manual"
                :disabled="!acaraGPMDipilih || !statusAcaraDipilihMobile?.bisaDaftar"
                @click="bukaModalManualMobile"
              >
                {{ statusAcaraDipilihMobile?.kuotaPenuh ? '🚫 Kuota Penuh' : '➕ Tambah Manual (Di Tempat)' }}
              </button>
              <button
                v-if="isKabid && acaraGPMDipilih && !statusAcaraDipilihMobile?.sudahBerakhir"
                type="button"
                class="btn-m-ubah-kuota"
                @click="bukaModalUbahKuotaMobile(acaraGPMDipilih)"
              >
                🔧 Atur / Tambah Kuota
              </button>
              <button 
                v-if="isKabid && acaraGPMDipilih"
                type="button" 
                class="btn-m-close-gpm"
                :disabled="sedangSelesaikanAcaraMobile"
                @click="selesaikanAcaraMobile"
              >
                {{ sedangSelesaikanAcaraMobile ? 'Memproses...' : '🔒 Selesaikan Lebih Awal' }}
              </button>
            </div>

            <div v-if="pendaftarGPMList.length === 0" style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.88rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; margin-top: 10px;">
              Belum ada pendaftar nomor antrean untuk acara ini.
            </div>
            <template v-else>
              <div style="margin: 10px 0;">
                <input
                  v-model="cariAntreanMobile"
                  type="text"
                  placeholder="🔍 Cari Nama, NIK, No. HP, atau Nomor Antrean..."
                  style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; box-sizing: border-box;"
                />
              </div>
              <div class="m-queue-items-list">
              <div
                v-for="item in pendaftarGPMList.filter(i => {
                  if (!cariAntreanMobile.trim()) return true;
                  const q = cariAntreanMobile.toLowerCase().trim();
                  return (
                    (i.nama_pendaftar || '').toLowerCase().includes(q) ||
                    String(i.nik || '').toLowerCase().includes(q) ||
                    (i.nomor_telepon || '').includes(q) ||
                    (i.kode_barcode || '').toLowerCase().includes(q) ||
                    String(i.nomor_antrean || '').includes(q)
                  );
                })"
                :key="item.id"
                class="m-queue-item-row"
              >
                <div class="m-queue-number-badge">
                  #{{ String(gpmMobileService.parseDataPendaftar(item).nomor_antrean || item.nomor_antrean).padStart(3, '0') }}
                </div>
                <div class="m-queue-meta">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <strong>{{ gpmMobileService.parseDataPendaftar(item).nama_bersih }}</strong>
                    <span :class="['m-jalur-tag', gpmMobileService.parseDataPendaftar(item).jalur_pendaftaran === 'Langsung' ? 'jalur-langsung' : 'jalur-daring']">
                      {{ gpmMobileService.parseDataPendaftar(item).jalur_pendaftaran === 'Langsung' ? '📍 Langsung' : '🌐 Daring' }}
                    </span>
                  </div>
                  <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                    NIK: {{ gpmMobileService.parseDataPendaftar(item).nik || '-' }} · 📱 {{ gpmMobileService.parseDataPendaftar(item).nomor_telepon }}
                  </div>
                  <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
                    <code>{{ gpmMobileService.parseDataPendaftar(item).kode_barcode }}</code>
                  </div>
                </div>
                <div class="m-queue-right-col">
                  <span :class="['m-status-tag', item.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu']">
                    {{ item.status_kehadiran === 'Hadir' ? '✓ Hadir' : 'Menunggu' }}
                  </span>
                  <button
                    v-if="!statusAcaraDipilihMobile?.sudahBerakhir"
                    type="button"
                    :class="['btn-m-toggle-hadir', item.status_kehadiran === 'Hadir' ? 'batal' : 'hadirkan']"
                    @click="ubahStatusPendaftarDiListMobile(item)"
                  >
                    {{ item.status_kehadiran === 'Hadir' ? '↩ Batal' : '✓ Hadirkan' }}
                  </button>
                </div>
              </div>
            </div>
            </template>
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
                <label>Kecamatan di Manado (Master Data Supabase)</label>
                <select v-model="formGPMBaru.kecamatan" class="s-select-market" required>
                  <option v-for="kec in daftarKecamatanPilihanFormGPM" :key="kec" :value="kec">
                    {{ kec }}
                  </option>
                </select>
              </div>
              <div class="s-row-two">
                <div class="s-field">
                  <label>Tanggal Pelaksanaan</label>
                  <input type="date" v-model="formGPMBaru.tanggal" required />
                </div>
                <div class="s-field">
                  <label>Kuota Antrean (Min. 1)</label>
                  <input type="number" min="1" v-model.number="formGPMBaru.kuota_maksimal" required />
                </div>
              </div>
              <div class="s-row-two">
                <div class="s-field">
                  <label>Jam Mulai (WITA)</label>
                  <input type="time" v-model="formGPMBaru.jam_mulai" required />
                </div>
                <div class="s-field">
                  <label>Jam Selesai / Auto-Close (WITA)</label>
                  <input type="time" v-model="formGPMBaru.jam_selesai" required />
                </div>
              </div>
              <div class="m-autoclose-hint">
                ⏱️ Acara otomatis terkunci & berpindah ke Riwayat pada pukul <strong>{{ formGPMBaru.jam_selesai || '14:00' }} WITA</strong>.
              </div>

              <!-- Preset Titik Peta Manado + Koordinat GPS -->
              <div class="s-field">
                <label>Preset Titik Peta Kota Manado (Klik untuk isi Koordinat)</label>
                <div class="m-preset-loc-chips">
                  <button
                    v-for="preset in PRESET_LOKASI_MANADO_MOBILE"
                    :key="preset.label"
                    type="button"
                    class="m-preset-loc-btn"
                    @click="terapkanPresetLokasiMobile(preset)"
                  >
                    📍 {{ preset.label }}
                  </button>
                </div>
              </div>
              <div class="s-row-two">
                <div class="s-field">
                  <label>Latitude Peta</label>
                  <input type="number" step="0.0001" v-model.number="formGPMBaru.latitude" required />
                </div>
                <div class="s-field">
                  <label>Longitude Peta</label>
                  <input type="number" step="0.0001" v-model.number="formGPMBaru.longitude" required />
                </div>
              </div>

              <div class="s-field">
                <label>Komoditas Pangan yang Disediakan (Master Komoditas Supabase)</label>
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
                    <span style="font-size: 0.78rem; font-weight: 800; color: #8b1e1e;">Centang Komoditas ({{ daftarKomoditasPilihanGPM.length }})</span>
                    <button 
                      type="button" 
                      @click="formGPMBaru.komoditas_tersedia = ''" 
                      style="background: none; border: none; color: #dc2626; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                    >
                      Reset
                    </button>
                  </div>
                  <div v-if="daftarKomoditasPilihanGPM.length === 0" style="font-size: 0.78rem; color: #94a3b8; padding: 8px 0;">
                    Belum ada data Master Komoditas di Supabase. Tambahkan lewat menu Master Data.
                  </div>
                  <div v-else style="display: grid; grid-template-columns: 1fr; gap: 6px;">
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
                <span>📍</span> {{ sedangSimpanGPMBaru ? 'Menyimpan ke Supabase...' : 'Terbitkan Acara ke Peta' }}
              </button>
            </form>
          </div>

          <!-- TAB 4: RIWAYAT GPM (VIEW STAF & KABID, HAPUS KHUSUS KABID) -->
          <div v-if="subMenuPetugasGPM === 'riwayat'" class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">📜</span>
              <h3>Riwayat Kegiatan GPM (Selesai / Auto-Close)</h3>
            </div>
            <p style="font-size: 0.78rem; color: #64748b; margin: 0 0 12px 0;">
              Arsip kegiatan GPM yang selesai otomatis (melewati jam WITA) atau ditutup Kepala Bidang. {{ isKabid ? 'Kepala Bidang dapat mengunduh rekap dan menghapus arsip riwayat.' : 'Staf dapat melihat dan mengunduh rekapitulasi data.' }}
            </p>

            <div v-if="daftarRiwayatGPM.length === 0" style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.88rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
              Belum ada riwayat kegiatan GPM yang diselesaikan.
            </div>

            <div v-else class="m-history-cards-wrap">
              <div v-for="acara in daftarRiwayatGPM" :key="acara.id" class="m-history-event-card">
                <div class="m-history-card-top">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="m-history-tag-done">✓ Selesai</span>
                    <span :class="['m-crowd-badge', 'crowd-' + jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).kelasAntusiasme]">
                      {{ jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).labelAntusiasme }} ({{ jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).persenTerisi }}%)
                    </span>
                  </div>
                  <strong class="m-history-card-title">{{ acara.nama_acara }}</strong>
                  <span class="m-history-card-loc">📍 {{ acara.lokasi }} ({{ acara.kecamatan }})</span>
                  <span class="m-history-card-date">📅 {{ jadwalGPMMobileService.formatTanggalID(acara.tanggal) }} · {{ acara.jam_mulai }} - {{ acara.jam_selesai }} WITA</span>
                </div>

                <div class="m-history-card-stats m-history-3col">
                  <div>
                    <span class="lbl">Kuota</span>
                    <strong>{{ acara.kuota_maksimal ?? 0 }}</strong>
                  </div>
                  <div>
                    <span class="lbl">Mendaftar</span>
                    <strong>{{ acara.antrean_terisi ?? 0 }}</strong>
                  </div>
                  <div>
                    <span class="lbl">Hadir</span>
                    <strong>{{ acara.total_hadir ?? 0 }}</strong>
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
                      <span class="q-num">#{{ String(gpmMobileService.parseDataPendaftar(p).nomor_antrean || p.nomor_antrean).padStart(3, '0') }}</span>
                      <div class="q-info">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                          <strong>{{ gpmMobileService.parseDataPendaftar(p).nama_bersih }}</strong>
                          <span :class="['m-jalur-tag', gpmMobileService.parseDataPendaftar(p).jalur_pendaftaran === 'Langsung' ? 'jalur-langsung' : 'jalur-daring']">
                            {{ gpmMobileService.parseDataPendaftar(p).jalur_pendaftaran }}
                          </span>
                        </div>
                        <span style="font-size: 0.74rem; color: #64748b;">NIK: {{ gpmMobileService.parseDataPendaftar(p).nik || '-' }} · {{ gpmMobileService.parseDataPendaftar(p).nomor_telepon }} · <code>{{ gpmMobileService.parseDataPendaftar(p).kode_barcode }}</code></span>
                      </div>
                      <span :class="['m-status-tag', p.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu']">
                        {{ p.status_kehadiran === 'Hadir' ? '✓ Hadir' : 'Menunggu' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW D: VERIFIKASI HARGA PANGAN (KHUSUS KABID) -->
        <div v-if="menuPetugas === 'verif-harga'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Verifikasi Penetapan Harga Pangan</h1>
            <p class="staff-view-desc">Tinjau usulan harga dari staf, terbitkan ke publik atau lakukan penyesuaian</p>
          </div>

          <!-- Alert jika berhasil simpan/verif -->
          <div v-if="pesanSuksesMobile" class="staff-success-banner">
            {{ pesanSuksesMobile }}
          </div>

          <!-- Filter Status Tab -->
          <div class="m-verif-tabs">
            <button :class="['m-verif-tab', filterStatusVerif === 'Draft' ? 'active' : '']" @click="filterStatusVerif = 'Draft'">
              ⏳ Menunggu ({{ komoditasDraft.length }})
            </button>
            <button :class="['m-verif-tab', filterStatusVerif === 'Terbit' ? 'active' : '']" @click="filterStatusVerif = 'Terbit'">
              ✓ Terbit ({{ komoditasTerbit.length }})
            </button>
            <button :class="['m-verif-tab', filterStatusVerif === 'Semua' ? 'active' : '']" @click="filterStatusVerif = 'Semua'">
              Semua ({{ semuaKomoditas.length }})
            </button>
          </div>

          <!-- Daftar Kartu Komoditas Verifikasi -->
          <div v-if="komoditasVerifTampil.length === 0" class="m-empty-box">
            Tidak ada komoditas dengan status {{ filterStatusVerif }}.
          </div>

          <div v-else class="m-verif-cards-list">
            <div 
              v-for="item in komoditasVerifTampil" 
              :key="item.id" 
              class="m-verif-card" 
              :class="'border-' + ((item.status || '').toLowerCase() === 'draft' ? 'draft' : 'terbit')"
            >
              <div class="m-verif-top">
                <span :class="['m-badge-status', (item.status || '').toLowerCase() === 'draft' ? 'badge-draft' : 'badge-terbit']">
                  {{ (item.status || '').toLowerCase() === 'draft' ? '⏳ Menunggu Verifikasi' : '✓ Diterbitkan ke Publik' }}
                </span>
                <span class="m-verif-date">📅 {{ item.tanggal_penetapan || 'Hari ini' }}</span>
              </div>

              <div class="m-verif-main">
                <h4 class="m-verif-name">{{ item.nama_komoditas }}</h4>
                <div class="m-verif-detail-row">
                  <span>📦 {{ item.kategori || 'Bahan Pokok' }}</span>
                  <span>📍 {{ item.nama_pasar }}</span>
                  <span>⚖️ {{ formatSatuanTampil(item.satuan) }}</span>
                </div>
                <div class="m-verif-price">
                  {{ formatRupiah(item.harga) }} <small>/ {{ formatSatuanTampil(item.satuan) }}</small>
                </div>
              </div>

              <div class="m-verif-actions">
                <button 
                  v-if="(item.status || '').toLowerCase() === 'draft'" 
                  class="btn-m-approve" 
                  @click="eksekusiVerifikasiHarga(item.id!, 'Terbit')"
                >
                  ✓ Setujui & Terbitkan
                </button>
                <button 
                  v-else 
                  class="btn-m-unpublish" 
                  @click="eksekusiVerifikasiHarga(item.id!, 'Draft')"
                >
                  ↺ Tarik ke Draf
                </button>
                <button class="btn-m-edit" @click="bukaModalEditKabid(item)">
                  ✏️ Edit
                </button>
                <button class="btn-m-del" @click="hapusItem(item)">
                  🗑️ Hapus
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW E: LAPORAN RESMI BIDANG PANGAN (KHUSUS KABID) -->
        <div v-if="menuPetugas === 'laporan'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Laporan Bidang Pangan</h1>
            <p class="staff-view-desc">Rekapitulasi penetapan komoditas dan stabilitas harga pasar Kota Manado</p>
          </div>

          <!-- Summary Metrics -->
          <div class="staff-stats-grid">
            <div class="stat-box-card">
              <div class="stat-val">{{ semuaKomoditas.length }}</div>
              <div class="stat-lbl">Komoditas Terdata</div>
              <div class="stat-sub">seluruh pasar</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ daftarPasar.length }}</div>
              <div class="stat-lbl">Pasar Tradisional</div>
              <div class="stat-sub">lokasi verifikasi</div>
            </div>
          </div>

          <!-- Tombol Unduh Laporan CSV -->
          <div class="m-export-box">
            <button class="btn-m-export-csv" @click="unduhLaporanPanganKabid">
              📥 Unduh Laporan Resmi (CSV / Excel)
            </button>
            <p class="export-hint">File CSV terformat rapi sesuai standar dinas, kompatibel langsung dengan Microsoft Excel.</p>
          </div>

          <!-- Tabel Rekap Data Komoditas -->
          <div class="m-report-table-card">
            <h3 style="font-size: 0.92rem; margin: 0 0 10px 0; color: #1e293b;">Daftar Rekapitulasi Komoditas:</h3>
            <div class="m-report-rows">
              <div v-for="(item, idx) in semuaKomoditas" :key="item.id || idx" class="m-report-row">
                <div class="m-rep-num">{{ idx + 1 }}</div>
                <div class="m-rep-info">
                  <strong>{{ item.nama_komoditas }}</strong>
                  <span>{{ item.nama_pasar }} · {{ item.kategori }}</span>
                  <span class="m-rep-badge" :class="(item.status || '').toLowerCase() === 'draft' ? 'draft' : 'terbit'">{{ item.status || 'Terbit' }}</span>
                </div>
                <div class="m-rep-price">
                  <strong>{{ formatRupiah(item.harga) }}</strong>
                  <span>/ {{ formatSatuanTampil(item.satuan) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW F: SUPERVISI MENU CEK GPM (KHUSUS ADMIN) -->
        <div v-if="menuPetugas === 'cek-gpm'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Supervisi Gerakan Pangan Murah (GPM)</h1>
            <p class="staff-view-desc">Pemantauan kuota riil, status waktu WITA, pendaftaran antrean masyarakat, dan pengawasan lokasi</p>
          </div>

          <div v-if="semuaAcaraGPMAktif.length === 0" class="m-empty-box">
            Tidak ada kegiatan GPM aktif saat ini.
          </div>

          <div v-else class="m-supervisi-cards">
            <div v-for="acara in semuaAcaraGPMAktif" :key="acara.id" class="m-supervisi-card">
              <div class="m-super-header">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="m-super-badge">📍 {{ acara.kecamatan }}</span>
                  <span :class="['m-gpm-status-pill', 'st-' + acara.statusOperasional.kode.toLowerCase().replace(/\s+/g, '-')]">
                    {{ acara.statusOperasional.label }}
                  </span>
                </div>
                <h3>{{ acara.nama_acara }}</h3>
                <p class="m-super-loc">🏢 {{ acara.lokasi }}</p>
                <p class="m-super-time">📅 {{ jadwalGPMMobileService.formatTanggalID(acara.tanggal) }} · {{ acara.jam_mulai }} - {{ acara.jam_selesai }} WITA</p>
              </div>

              <div class="m-super-quota-section">
                <div class="quota-progress-labels">
                  <span>Keterisian Kuota: <strong>{{ acara.statusOperasional.terisi }} / {{ acara.statusOperasional.kuotaMaks }}</strong></span>
                  <span>{{ acara.statusOperasional.persenTerisi }}%</span>
                </div>
                <div class="quota-progress-bar">
                  <div class="quota-progress-fill" :style="{ width: acara.statusOperasional.persenTerisi + '%' }"></div>
                </div>
              </div>

              <div class="m-super-stats-row">
                <div class="super-stat-col">
                  <span class="lbl">Total Kuota</span>
                  <strong>{{ acara.statusOperasional.kuotaMaks }}</strong>
                </div>
                <div class="super-stat-col">
                  <span class="lbl">Terdaftar</span>
                  <strong>{{ acara.statusOperasional.terisi }}</strong>
                </div>
                <div class="super-stat-col">
                  <span class="lbl">Sisa Kuota</span>
                  <strong>{{ acara.statusOperasional.sisaKuota }}</strong>
                </div>
              </div>

              <div class="m-super-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-m-super-csv" style="flex: 1; background: #8b1e1e;" @click="bukaDetailWargaMobile(acara)">
                  👥 Data Warga ({{ acara.statusOperasional.terisi }})
                </button>
                <button
                  v-if="isKabid"
                  type="button"
                  class="btn-m-super-csv"
                  style="flex: 1; background: #1d4ed8;"
                  @click="bukaModalUbahKuotaMobile(acara)"
                >
                  🔧 Atur Kuota
                </button>
                <button type="button" class="btn-m-super-csv" style="flex: 1;" @click="unduhRekapAcaraMobile(acara)">
                  📥 Unduh CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW G: MASTER KOMODITAS, SATUAN, PASAR & WILAYAH (KHUSUS ADMIN & SUPERADMIN) -->
        <div v-if="menuPetugas === 'master-data'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Master Komoditas, Satuan & Wilayah</h1>
            <p class="staff-view-desc">Kelola Master Komoditas (Induk, Varian & Sinonim), Satuan per 1 unit, Pasar, dan Kecamatan di Supabase</p>
          </div>

          <!-- Master Komoditas Resmi (Induk, Varian & Sinonim Pencarian) -->
          <div class="staff-form-panel" style="margin-bottom: 16px;">
            <div class="panel-title-row">
              <span class="plus-icon-red">🌾</span>
              <h3>Master Komoditas Resmi ({{ daftarMasterKomoditas.length }})</h3>
            </div>
            <p style="font-size: 0.74rem; color: #64748b; margin: 0 0 10px 0;">
              Kelompokkan varian komoditas (contoh Induk <strong>Beras</strong> → <strong>Beras SPHP</strong>, <strong>Beras Medium</strong>, <strong>Beras Premium</strong>) agar pencarian warga pintar & staf tidak salah ketik.
            </p>

            <div class="m-mk-form-grid">
              <div class="s-field">
                <label>Komoditas Induk</label>
                <input
                  type="text"
                  list="mDatalistKelompokInduk"
                  v-model="formKomoditasMasterMobile.kelompok_komoditas"
                  placeholder="Beras, Cabai, Minyak Goreng..."
                />
                <datalist id="mDatalistKelompokInduk">
                  <option v-for="kel in daftarKelompokIndukMasterMobile" :key="kel" :value="kel" />
                </datalist>
              </div>
              <div class="s-field">
                <label>Nama Varian Resmi *</label>
                <input
                  type="text"
                  v-model="formKomoditasMasterMobile.nama_komoditas"
                  placeholder="Contoh: Beras Superwin"
                />
              </div>
              <div class="s-row-two">
                <div class="s-field">
                  <label>Kategori</label>
                  <select v-model="formKomoditasMasterMobile.kategori" class="s-select-market">
                    <option value="Bahan Pokok">Bahan Pokok</option>
                    <option value="Hewani">Hewani</option>
                    <option value="Sayuran">Sayuran</option>
                    <option value="Buah">Buah</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div class="s-field">
                  <label>Satuan Bawaan</label>
                  <select v-model="formKomoditasMasterMobile.satuan_bawaan" class="s-select-market">
                    <option v-for="s in daftarSatuan" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>
              <div class="s-field">
                <label>Prioritas Tampil Publik</label>
                <select v-model.number="formKomoditasMasterMobile.prioritas_tampil" class="s-select-market">
                  <option :value="10">10 — Sangat Utama (Beras)</option>
                  <option :value="15">15 — Utama (Minyak Goreng)</option>
                  <option :value="20">20 — Pokok (Gula / Cabai / Bawang)</option>
                  <option :value="30">30 — Penting (Telur / Daging / Ikan)</option>
                  <option :value="50">50 — Standar</option>
                  <option :value="70">70 — Tambahan</option>
                </select>
              </div>
              <div class="s-field">
                <label>Sinonim Pencarian (pisahkan koma)</label>
                <input
                  type="text"
                  v-model="formKomoditasMasterMobile.kata_kunci"
                  placeholder="Contoh: beras biasa, beras bulog, rica"
                />
              </div>
              <button type="button" class="btn-m-add" style="width: 100%; padding: 10px;" @click="tambahMasterKomoditasBaru">
                ➕ Tambah Master Komoditas
              </button>
            </div>

            <div class="m-mk-groups-list">
              <div v-for="grup in grupKomoditasDropdownMobile" :key="grup.kelompok" class="m-mk-group-card">
                <div class="m-mk-group-head">
                  <strong>🌾 {{ grup.kelompok }}</strong>
                  <span>{{ grup.items.length }} varian</span>
                </div>
                <div class="m-mk-items">
                  <div v-for="k in grup.items" :key="k.nama_komoditas" class="m-mk-item-row">
                    <div>
                      <div class="m-mk-item-name">{{ k.nama_komoditas }}</div>
                      <div class="m-mk-item-meta">{{ k.kategori }} • {{ k.satuan_bawaan }} • P{{ k.prioritas_tampil }}</div>
                      <div v-if="k.kata_kunci" class="m-mk-item-syn">🔍 {{ k.kata_kunci }}</div>
                    </div>
                    <button type="button" class="btn-m-chip-del" @click="hapusMasterKomoditas(k.nama_komoditas)">✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Master Satuan Pangan (Terkunci per 1) -->
          <div class="staff-form-panel">
            <div class="panel-title-row">
              <span class="plus-icon-red">⚖️</span>
              <h3>Master Satuan Pangan — Per 1 Unit ({{ daftarSatuan.length }})</h3>
            </div>
            <p style="font-size: 0.74rem; color: #64748b; margin: 0 0 8px 0;">
              Ketik nama satuan saja (contoh: <strong>KG</strong>, <strong>Liter</strong>, <strong>Baki</strong>, <strong>Ikat</strong>). Sistem otomatis mengunci format per 1 unit.
            </p>
            <div class="m-inline-add-row">
              <input type="text" v-model="inputSatuanBaru" placeholder="Contoh: Liter, Baki, Ikat, Ekor..." @keyup.enter="tambahSatuanBaru" />
              <button type="button" class="btn-m-add" @click="tambahSatuanBaru">+ Tambah</button>
            </div>
            <div class="m-master-list">
              <div v-for="sat in daftarSatuan" :key="sat" class="m-master-chip">
                <span>⚖️ {{ sat }}</span>
                <button type="button" class="btn-m-chip-del" @click="hapusSatuan(sat)">✕</button>
              </div>
            </div>
          </div>

          <!-- Master Pasar Tradisional & Titik Peta Interaktif (Leaflet + Auto-Isi Alamat) -->
          <AdminMasterPasarMobile
            :daftar-pasar-lengkap="daftarPasarLengkap"
            :daftar-kecamatan="daftarKecamatan"
            @data-berubah="handleDataPasarBerubahMobile"
            @pesan-sukses="tampilkanPesanSuksesMobile"
          />

          <!-- Master Kecamatan -->
          <div class="staff-form-panel" style="margin-top: 16px;">
            <div class="panel-title-row">
              <span class="plus-icon-red">🗺️</span>
              <h3>Master Kecamatan Kota Manado ({{ daftarKecamatan.length }})</h3>
            </div>
            <div class="m-inline-add-row">
              <input type="text" v-model="inputKecamatanBaru" placeholder="Nama kecamatan baru..." @keyup.enter="tambahKecamatanBaru" />
              <button type="button" class="btn-m-add" @click="tambahKecamatanBaru">+ Tambah</button>
            </div>
            <div class="m-master-list">
              <div v-for="kec in daftarKecamatan" :key="kec" class="m-master-chip chip-kecamatan">
                <span>🏛️ {{ kec }}</span>
                <button type="button" class="btn-m-chip-del" @click="hapusKecamatan(kec)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW H: KELOLA PENGGUNA SISTEM (KHUSUS ADMIN) -->
        <div v-if="menuPetugas === 'kelola-user'" class="staff-view-container">
          <div class="staff-heading-area">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div>
                <h1 class="staff-view-title">Kelola Pengguna</h1>
                <p class="staff-view-desc">Manajemen akun staf, kabid, kadis, dan hak akses sistem</p>
              </div>
              <button type="button" class="btn-m-add-user" @click="modalTambahUserBuka = true">
                + Tambah
              </button>
            </div>
          </div>

          <div class="m-user-cards-list">
            <div v-for="user in daftarSemuaPengguna" :key="user.id" class="m-user-card">
              <div class="m-user-card-head">
                <div class="m-user-avatar">
                  <img v-if="user.foto_profil" :src="user.foto_profil" alt="Avatar" class="avatar-fit-circle" />
                  <span v-else>{{ (user.nama ? user.nama.charAt(0) : 'U').toUpperCase() }}</span>
                </div>
                <div class="m-user-head-info">
                  <div class="m-user-title-row">
                    <h4>{{ user.nama }}</h4>
                    <span class="user-role-badge" :class="'role-' + (user.peran || 'Staf').toLowerCase()">
                      {{ formatPeranLengkap(user.peran) }}
                    </span>
                  </div>
                  <span class="m-user-sub">{{ user.username }} · {{ user.email }}</span>
                  <span class="m-user-bidang">{{ user.bidang || 'Dinas Pangan Kota Manado' }}</span>
                </div>
              </div>

              <div class="m-user-role-selector-row">
                <label>Ubah Peran Akses:</label>
                <select :value="user.peran" @change="eksekusiUbahPeran(user, ($event.target as any).value)" class="m-role-select">
                  <option value="Admin">Admin</option>
                  <option value="Superadmin">Superadmin</option>
                  <option value="Kabid">Kabid (Kepala Bidang)</option>
                  <option value="Staf">Staf (Petugas Pangan)</option>
                  <option value="Kadis">Kadis (Kepala Dinas)</option>
                </select>
              </div>

              <div class="m-user-card-actions">
                <button type="button" class="btn-m-u-pwd" @click="bukaModalResetSandi(user)">
                  🔑 Reset Sandi
                </button>
                <button type="button" class="btn-m-u-edit" @click="bukaModalUbahUsername(user)">
                  ✏️ Username
                </button>
                <button type="button" class="btn-m-u-edit" @click="bukaModalUbahEmail(user)">
                  ✉️ Email
                </button>
                <button 
                  v-if="userAktif?.id !== user.id" 
                  type="button" 
                  class="btn-m-u-del" 
                  @click="eksekusiHapusUser(user)"
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW I: GRAFIK TREN PANGAN (KHUSUS KADIS — 100% DATA RIIL RIWAYAT SUPABASE) -->
        <div v-if="menuPetugas === 'grafik-pangan'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Grafik Tren Fluktuasi Harga</h1>
            <p class="staff-view-desc">Monitoring visual pergerakan dan stabilitas harga komoditas pangan Kota Manado dari riwayat resmi database</p>
          </div>

          <!-- Filter Selector Kadis -->
          <div class="staff-form-panel">
            <div class="m-kadis-filter-grid">
              <div class="s-field">
                <label>Komoditas Pangan</label>
                <select v-model="komoditasTren" @change="muatTrenKadis" :disabled="daftarKomoditasTersediaKadis.length === 0">
                  <option v-if="daftarKomoditasTersediaKadis.length === 0" value="">Belum ada data komoditas di database</option>
                  <option v-for="k in daftarKomoditasTersediaKadis" :key="String(k)" :value="k">{{ k }}</option>
                </select>
              </div>

              <div class="s-field">
                <label>Pasar Pantauan</label>
                <select v-model="pasarTren" @change="muatTrenKadis">
                  <option value="Semua">Semua Pasar</option>
                  <option v-for="p in daftarPasarTersediaKadis" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>

              <div class="s-field">
                <label>Rentang Periode</label>
                <select v-model="periodeTren" @change="muatTrenKadis">
                  <option value="7hari">7 Hari Terakhir</option>
                  <option value="30hari">30 Hari Terakhir</option>
                  <option value="3bulan">3 Bulan Terakhir</option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="sedangMuatTrenMobile" class="staff-form-panel" style="margin-top: 14px; text-align: center; color: #64748b; font-size: 0.85rem;">
            ⏳ Memuat riwayat fluktuasi harga dari basis data Supabase...
          </div>

          <div v-else-if="!dataTren || !dataTren.adaData" class="staff-form-panel" style="margin-top: 14px; text-align: center; color: #64748b;">
            <div style="font-size: 1.6rem; margin-bottom: 6px;">📉</div>
            <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Belum Ada Data Harga / Riwayat</strong>
            <p style="margin: 0; font-size: 0.8rem;">
              Grafik menampilkan 100% catatan harga resmi dari database (tanpa simulasi/dummy). Pilih komoditas atau pasar lain.
            </p>
          </div>

          <template v-else>
            <!-- Metric Cards -->
            <div class="staff-stats-grid" style="margin-top: 14px;">
              <div class="stat-box-card">
                <div class="stat-val" style="font-size: 1.15rem;">{{ formatRupiah(dataTren.hargaTerkini) }}</div>
                <div class="stat-lbl">Harga Terkini</div>
                <div class="stat-sub">
                  <span :class="['m-trend-tag', 'trend-' + dataTren.statusTren.toLowerCase()]">
                    {{ dataTren.statusTren === 'Naik' ? '▲' : dataTren.statusTren === 'Turun' ? '▼' : '●' }} {{ dataTren.persentase }}% ({{ dataTren.statusTren }})
                  </span>
                </div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="font-size: 1.15rem;">{{ formatRupiah(dataTren.rataRata) }}</div>
                <div class="stat-lbl">Rata-Rata Periode</div>
                <div class="stat-sub">dari {{ dataTren.titikData.length }} catatan</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="font-size: 1.15rem;">{{ formatRupiah(dataTren.hargaTertinggi) }}</div>
                <div class="stat-lbl">Harga Tertinggi</div>
                <div class="stat-sub">puncak fluktuasi</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="font-size: 1.15rem;">{{ formatRupiah(dataTren.hargaTerendah) }}</div>
                <div class="stat-lbl">Harga Terendah</div>
                <div class="stat-sub">titik minimum</div>
              </div>
            </div>

            <!-- SVG Interactive Line & Point Chart (100% Riil) -->
            <div class="staff-form-panel" style="margin-top: 14px;">
              <div class="panel-title-row" style="justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="plus-icon-red">📈</span>
                  <h3>Pergerakan Harga {{ dataTren.namaKomoditas }}</h3>
                </div>
                <span :style="{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: dataTren.sumber === 'riwayat' ? '#dcfce7' : '#fef3c7',
                  color: dataTren.sumber === 'riwayat' ? '#166534' : '#92400e'
                }">
                  {{ dataTren.sumber === 'riwayat' ? `Riwayat Resmi (${dataTren.jumlahCatatan})` : `Harga Terkini (${dataTren.jumlahCatatan})` }}
                </span>
              </div>

              <p v-if="dataTren.titikData.length === 1" style="font-size: 0.76rem; color: #475569; background: #f8fafc; padding: 8px 10px; border-radius: 6px; margin: 6px 0 10px 0;">
                ℹ️ Baru terdapat 1 catatan harga resmi pada rentang ini. Garis tren akan terbentuk otomatis saat ada pembaruan harga berikutnya.
              </p>

              <div class="m-svg-chart-container">
                <svg viewBox="0 0 500 220" class="m-svg-chart">
                  <line x1="56" y1="30" x2="480" y2="30" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="56" y1="80" x2="480" y2="80" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="56" y1="130" x2="480" y2="130" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="56" y1="180" x2="480" y2="180" stroke="#e2e8f0" stroke-width="1" />

                  <text x="50" y="34" text-anchor="end" font-size="9" fill="#64748b" font-weight="600">
                    {{ Math.round(dataTren.hargaTertinggi / 1000) }}k
                  </text>
                  <text x="50" y="109" text-anchor="end" font-size="9" fill="#64748b" font-weight="600">
                    {{ Math.round(((dataTren.hargaTertinggi + dataTren.hargaTerendah) / 2) / 1000) }}k
                  </text>
                  <text x="50" y="184" text-anchor="end" font-size="9" fill="#64748b" font-weight="600">
                    {{ Math.round(dataTren.hargaTerendah / 1000) }}k
                  </text>

                  <polyline
                    v-if="dataTren.titikData.length >= 2"
                    fill="none"
                    stroke="#8b1e1e"
                    stroke-width="3.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :points="hitungTitikSVG(dataTren.titikData)"
                  />

                  <g v-for="(titik, idx) in hitungKoordinatTitik(dataTren.titikData)" :key="idx">
                    <circle :cx="titik.x" :cy="titik.y" r="5" fill="#8b1e1e" stroke="#ffffff" stroke-width="2" />
                    <text
                      v-if="dataTren.titikData.length <= 7 || idx === 0 || idx === dataTren.titikData.length - 1 || idx % Math.ceil(dataTren.titikData.length / 6) === 0"
                      :x="titik.x"
                      :y="titik.y - 10"
                      text-anchor="middle"
                      font-size="10"
                      font-weight="700"
                      fill="#1e293b"
                    >
                      {{ (titik.harga / 1000).toFixed(1) }}k
                    </text>
                    <text
                      v-if="dataTren.titikData.length <= 7 || idx === 0 || idx === dataTren.titikData.length - 1 || idx % Math.ceil(dataTren.titikData.length / 6) === 0"
                      :x="titik.x"
                      y="200"
                      text-anchor="middle"
                      font-size="9.5"
                      fill="#64748b"
                    >
                      {{ titik.tanggal }}
                    </text>
                  </g>
                </svg>
              </div>

              <!-- Rincian Catatan Riwayat Riil -->
              <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
                <div
                  v-for="(t, i) in [...dataTren.titikData].reverse()"
                  :key="i"
                  style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.78rem;"
                >
                  <div>
                    <strong style="color: #0f172a; display: block;">{{ t.pasar }}</strong>
                    <span style="color: #64748b; font-size: 0.72rem;">{{ t.tanggalLengkap }}</span>
                  </div>
                  <div style="text-align: right;">
                    <strong style="color: #8b1e1e; display: block;">{{ formatRupiah(t.harga) }}</strong>
                    <span :style="{ fontSize: '0.7rem', fontWeight: '700', color: t.selisih > 0 ? '#dc2626' : t.selisih < 0 ? '#166534' : '#64748b' }">
                      {{ t.selisih > 0 ? `▲ +${formatRupiah(t.selisih)}` : t.selisih < 0 ? `▼ ${formatRupiah(t.selisih)}` : '▬ Tetap' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- SUB-VIEW J: LAPORAN EKSEKUTIF GPM (KHUSUS KADIS) -->
        <div v-if="menuPetugas === 'laporan-gpm'" class="staff-view-container">
          <div class="staff-heading-area" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h1 class="staff-view-title">Laporan Eksekutif GPM</h1>
              <p class="staff-view-desc">Rekapitulasi pencapaian stabilisasi pasokan dan serapan kuota masyarakat</p>
            </div>
            <button
              type="button"
              class="btn-m-super-csv"
              style="background: #166534; color: #fff; padding: 7px 12px; font-size: 0.8rem;"
              @click="unduhLaporanEksekutifGPM"
            >
              📥 Unduh Laporan (CSV)
            </button>
          </div>

          <div class="staff-stats-grid">
            <div class="stat-box-card">
              <div class="stat-val">{{ daftarRekapGPMKadis.length }}</div>
              <div class="stat-lbl">Kegiatan Terlaksana</div>
              <div class="stat-sub">rekapitulasi berkala</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ totalKuotaGPMKadis }}</div>
              <div class="stat-lbl">Target Kuota</div>
              <div class="stat-sub">paket pangan murah</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val">{{ totalTerlayaniGPMKadis }}</div>
              <div class="stat-lbl">Warga Terlayani</div>
              <div class="stat-sub">penerima manfaat</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val" style="color: #16a34a;">{{ persentaseSerapanKadis }}%</div>
              <div class="stat-lbl">Tingkat Penyerapan</div>
              <div class="stat-sub">realisasi serapan</div>
            </div>
          </div>

          <div class="m-supervisi-cards" style="margin-top: 14px;">
            <div v-for="rekap in daftarRekapGPMKadis" :key="rekap.id" class="m-supervisi-card">
              <div class="m-super-header">
                <span class="m-super-badge">📍 {{ rekap.kecamatan }}</span>
                <h3>{{ rekap.nama_acara }}</h3>
                <p class="m-super-loc">🏢 {{ rekap.lokasi }}</p>
                <p class="m-super-time">📅 {{ rekap.tanggal }} · Status: <strong>{{ rekap.status }}</strong></p>
              </div>

              <div class="m-super-stats-row" style="margin-top: 10px;">
                <div class="super-stat-col">
                  <span class="lbl">Target Kuota</span>
                  <strong>{{ rekap.target_kuota }}</strong>
                </div>
                <div class="super-stat-col">
                  <span class="lbl">Terdaftar</span>
                  <strong style="color: #1d4ed8;">{{ rekap.terdaftar }}</strong>
                </div>
                <div class="super-stat-col">
                  <span class="lbl">Terlayani</span>
                  <strong style="color: #16a34a;">{{ rekap.terlayani }}</strong>
                </div>
              </div>

              <div style="margin-top: 12px; background: #f8fafc; padding: 10px; border-radius: 6px;">
                <span style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">🌾 Komoditas Disediakan:</span>
                <p style="margin: 0; font-size: 0.8rem; color: #334155;">{{ rekap.komoditas_tersedia || '-' }}</p>
              </div>

              <div class="m-super-actions" style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-m-super-csv" style="flex: 1; background: #8b1e1e;" @click="bukaDetailWargaMobile(rekap)">
                  👥 Buka Data Warga ({{ rekap.terdaftar }})
                </button>
                <button type="button" class="btn-m-super-csv" style="flex: 1;" @click="unduhRekapAcaraMobile(rekap)">
                  📥 Unduh CSV
                </button>
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

        <!-- 2. Tab Navigasi Mobile (3 Menu Publik: Harga Pangan, GPM, Daftar Pasar) -->
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
            GPM
          </button>
          <button 
            :class="['mobile-tab-item', tabAktif === 'pasar' ? 'active' : '']"
            @click="tabAktif = 'pasar'"
          >
            Daftar Pasar
          </button>
        </div>
      </ion-header>

      <!-- 3. Konten Utama Beranda Publik -->
      <ion-content :fullscreen="true" class="mobile-content-area">
        <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
          <ion-refresher-content pulling-text="Tarik ke bawah untuk memperbarui..." refreshing-spinner="crescent" refreshing-text="Menyinkronkan data dari web..."></ion-refresher-content>
        </ion-refresher>
        <!-- KONTEN A: HARGA PANGAN PUBLIK (100% DATA RIIL DB, MULTI-PASAR, SORTIR & RIWAYAT) -->
        <div v-if="tabAktif === 'harga'">
          <!-- HeroBanner Maroon -->
          <div class="mobile-hero-card">
            <div class="hero-badge-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              <span>Pemantauan Harga Pangan Real-Time</span>
            </div>

            <h2 class="hero-title-text">Harga Pangan Kota Manado</h2>

            <p class="hero-desc-text">
              Bandingkan harga pangan antar pasar tradisional Kota Manado, temukan pasar termurah hingga termahal, dan lihat riwayat perubahan harga resmi dari Dinas Pangan.
            </p>

            <div class="hero-update-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Pembaruan: {{ infoPembaruanTerakhirPublik }}</span>
            </div>
          </div>

          <!-- 4. Filter Kategori Chips (Hitungan Riil dari DB) -->
          <div class="mobile-chips-scroll">
            <button
              v-for="kat in daftarKategoriList"
              :key="kat.key"
              :class="['mobile-chip-btn', kategoriAktif === kat.key ? 'active' : '']"
              @click="pilihKategori(kat.key)"
            >
              <span v-if="kat.icon" class="chip-emoji">{{ kat.icon }}</span>
              <span>{{ kat.label }}</span>
              <span class="chip-number">{{ statistikPublikRiil[kat.key] ?? 0 }}</span>
            </button>
          </div>

          <!-- 4b. Filter Cepat Kelompok Komoditas Induk (Murni dari Data Terbit DB) -->
          <div v-if="daftarKelompokIndukPublik.length > 0" class="m-parent-scroll">
            <button
              type="button"
              :class="['m-parent-pill', kelompokAktifPublik === 'Semua' ? 'active' : '']"
              @click="pilihKelompokIndukPublik('Semua')"
            >
              Semua Jenis
            </button>
            <button
              v-for="k in daftarKelompokIndukPublik"
              :key="k.kelompok"
              type="button"
              :class="['m-parent-pill', kelompokAktifPublik === k.kelompok ? 'active' : '']"
              @click="pilihKelompokIndukPublik(kelompokAktifPublik === k.kelompok ? 'Semua' : k.kelompok)"
            >
              <span>{{ k.kelompok }}</span>
              <span v-if="k.jumlahVarian > 1" class="m-parent-badge">{{ k.jumlahVarian }}</span>
            </button>
          </div>

          <!-- 5. Search Bar Pintar, Multi-Select Pasar, Sub-Varian & 3 Mode Tampilan -->
          <div class="mobile-search-section m-enhanced-controls">
            <div class="mobile-search-box">
              <input
                type="text"
                v-model="kataKunciPencarian"
                @input="varianAktifPublik = 'Semua'"
                placeholder="Cari komoditas/varian/pasar: beras biasa, rica, bahu..."
                class="mobile-search-input"
              />
              <button v-if="kataKunciPencarian" class="btn-clear-mobile" @click="resetPencarian">✕</button>
            </div>

            <!-- Bar Chip Sub-Varian Otomatis (muncul saat cari "beras" atau pilih induk ber-varian) -->
            <div v-if="tampilkanBarSubVarianPublik" class="m-subvariant-panel">
              <div class="m-subvar-head">
                <span>✨ {{ daftarSubVarianPublik.length }} varian ditemukan</span>
                <button
                  v-if="modeTampilanPublik !== 'matriks'"
                  type="button"
                  class="m-btn-jump-matrix"
                  @click="modeTampilanPublik = 'matriks'"
                >
                  📊 Bandingkan di Tabel
                </button>
              </div>
              <div class="m-subvar-scroll">
                <button
                  type="button"
                  :class="['m-subvar-chip', varianAktifPublik === 'Semua' ? 'active' : '']"
                  @click="varianAktifPublik = 'Semua'"
                >
                  Semua Varian
                </button>
                <button
                  v-for="v in daftarSubVarianPublik"
                  :key="v.kunci"
                  type="button"
                  :class="['m-subvar-chip', varianAktifPublik === v.kunci ? 'active' : '']"
                  @click="varianAktifPublik = varianAktifPublik === v.kunci ? 'Semua' : v.kunci"
                >
                  <span>{{ v.nama_komoditas }}</span>
                  <span class="m-subvar-price">{{ formatRupiah(v.hargaMin) }}</span>
                </button>
              </div>
            </div>

            <div class="m-filter-row-2">
              <!-- Tombol Multi-Select Pasar -->
              <button
                type="button"
                :class="['m-multi-market-btn', pasarTerpilihPublik.length > 0 ? 'has-pick' : '']"
                @click="modalPilihPasarBuka = true"
              >
                <span>📍 {{ labelTombolPasarPublik }}</span>
                <span class="m-chev">▼</span>
              </button>

              <!-- Dropdown Urutkan (Adil per Satuan Standar) -->
              <select v-model="urutanPublik" class="m-sort-select" aria-label="Urutkan harga">
                <option value="prioritas">⭐ Prioritas Masyarakat</option>
                <option value="termurah">💰 Termurah → Termahal</option>
                <option value="termahal">📈 Termahal → Termurah</option>
                <option value="terpopuler">🔥 Paling Dilihat</option>
                <option value="abjad">🔤 Nama (A–Z)</option>
              </select>
            </div>

            <!-- Pill Pasar Terpilih (jika ada) -->
            <div v-if="pasarTerpilihPublik.length > 0" class="m-picked-markets-bar">
              <span v-for="p in pasarTerpilihPublik" :key="p" class="m-picked-chip">
                📍 {{ p }}
                <button type="button" @click="togglePasarPublik(p)">✕</button>
              </span>
              <button type="button" class="m-clear-picked-btn" @click="pasarTerpilihPublik = []">
                Semua Pasar
              </button>
            </div>

            <!-- Mode Toggle: Ringkasan | Tabel Banding | Semua Pasar -->
            <div class="m-mode-toggle-row">
              <button
                type="button"
                :class="['m-mode-btn', modeTampilanPublik === 'ringkasan' ? 'active' : '']"
                @click="modeTampilanPublik = 'ringkasan'"
              >
                🧩 Ringkasan
              </button>
              <button
                type="button"
                :class="['m-mode-btn', modeTampilanPublik === 'matriks' ? 'active' : '']"
                @click="modeTampilanPublik = 'matriks'"
              >
                📊 Tabel Banding
              </button>
              <button
                type="button"
                :class="['m-mode-btn', modeTampilanPublik === 'semua-pasar' ? 'active' : '']"
                @click="modeTampilanPublik = 'semua-pasar'"
              >
                🏪 Semua Pasar
              </button>
            </div>
          </div>

          <!-- 6. Subheader InfoRow -->
          <div class="mobile-info-summary-row">
            <span class="info-found-text">
              Menampilkan {{ totalTampilPublik }} komoditas
            </span>
          </div>

          <!-- 7. Status Loading / Error / Kosong / Daftar Kartu / Matriks -->
          <div v-if="sedangMemuatPublik && dataHargaPublikRiil.length === 0" class="m-pub-state-box">
            Memuat data harga pangan resmi dari basis data...
          </div>

          <div v-else-if="errorMuatPublik" class="m-pub-state-box is-err">
            <p>⚠️ {{ errorMuatPublik }}</p>
            <button type="button" class="m-pub-retry-btn" @click="muatData">🔄 Muat Ulang</button>
          </div>

          <div v-else-if="totalTampilPublik === 0" class="m-pub-state-box">
            <p>Tidak ada komoditas terverifikasi yang cocok dengan filter saat ini.</p>
            <button type="button" class="m-pub-retry-btn" @click="resetFilterPublik">Atur Ulang Filter</button>
          </div>

          <!-- MODE MATRIKS: TABEL PERBANDINGAN VARIAN × PASAR -->
          <div v-else-if="modeTampilanPublik === 'matriks'" class="m-matrix-wrap">
            <div class="m-matrix-card">
              <div class="m-matrix-legend">
                <span class="m-leg-cheap">🟢 Termurah</span>
                <span class="m-leg-exp">🔴 Termahal</span>
                <span>— = Tidak tercatat</span>
              </div>
              <div class="m-matrix-scroll">
                <table class="m-matrix-table">
                  <thead>
                    <tr>
                      <th class="m-mx-sticky">Komoditas / Varian</th>
                      <th v-for="pasar in matriksPerbandinganPublik.daftarKolomPasar" :key="pasar" class="m-mx-num">
                        📍 {{ pasar }}
                      </th>
                      <th class="m-mx-num">Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="baris in matriksPerbandinganPublik.daftarBarisMatriks" :key="baris.kunci">
                      <td class="m-mx-sticky" @click="grupDetailDipilih = baris">
                        <div class="m-mx-name">{{ baris.nama_komoditas }}</div>
                        <div class="m-mx-sub">{{ baris.kelompok }} • {{ baris.satuanUtama }}</div>
                        <div v-if="baris.tanggalPenetapanTerbaru" class="m-mx-sub" style="font-size: 0.65rem; color: #64748b;">
                          {{ baris.tanggalPenetapanTerbaru }}
                        </div>
                        <div
                          v-if="baris.delta && baris.delta.selisih !== 0"
                          class="m-mx-sub"
                          :style="{ fontSize: '0.65rem', fontWeight: 700, color: baris.delta.selisih > 0 ? '#dc2626' : '#15803d' }"
                        >
                          {{ baris.delta.selisih > 0 ? '▲ +' : '▼ -' }}{{ formatRupiah(Math.abs(baris.delta.selisih)) }}
                        </div>
                      </td>
                      <td
                        v-for="pasar in matriksPerbandinganPublik.daftarKolomPasar"
                        :key="pasar"
                        :class="[
                          'm-mx-cell',
                          baris.selPerPasar[pasar]?.posisi === 'termurah' ? 'is-cheap' : '',
                          baris.selPerPasar[pasar]?.posisi === 'termahal' ? 'is-exp' : ''
                        ]"
                        @click="grupDetailDipilih = baris"
                      >
                        <template v-if="baris.selPerPasar[pasar]">
                          <div class="m-mx-val">{{ formatRupiah(baris.selPerPasar[pasar].harga) }}</div>
                          <span v-if="baris.selPerPasar[pasar].posisi === 'termurah'" class="m-mx-tag cheap">Termurah</span>
                          <span v-else-if="baris.selPerPasar[pasar].posisi === 'termahal'" class="m-mx-tag exp">Termahal</span>
                        </template>
                        <span v-else class="m-mx-empty">—</span>
                      </td>
                      <td class="m-mx-avg" @click="grupDetailDipilih = baris">
                        <div class="m-mx-avg-val">{{ formatRupiah(baris.hargaRataRata) }}</div>
                        <span class="m-mx-hist">Riwayat →</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- MODE 1: KARTU KOMODITAS TERKELOMPOK (SMART CARDS) -->
          <div v-else-if="modeTampilanPublik === 'ringkasan'" class="m-smart-cards-stack">
            <div
              v-for="grup in daftarRingkasanPublik"
              :key="grup.kunci"
              class="m-smart-card"
              @click="grupDetailDipilih = grup"
            >
              <div class="m-sc-top">
                <span class="unit-label">SATUAN {{ grup.satuanUtama }} • {{ grup.kategori }}</span>
                <span
                  v-if="grup.deltaTerbaru && grup.deltaTerbaru.selisih > 0"
                  class="m-delta-pill up"
                >
                  ▲ +{{ formatRupiah(grup.deltaTerbaru.selisih) }}
                </span>
                <span
                  v-else-if="grup.deltaTerbaru && grup.deltaTerbaru.selisih < 0"
                  class="m-delta-pill down"
                >
                  ▼ -{{ formatRupiah(Math.abs(grup.deltaTerbaru.selisih)) }}
                </span>
                <span v-else class="m-delta-pill stable">• Stabil</span>
              </div>

              <h3 class="m-sc-title">{{ grup.nama_komoditas }}</h3>

              <div class="m-sc-price">
                <template v-if="grup.adaPerbedaanHarga">
                  {{ formatRupiah(grup.hargaMin) }} <span class="m-price-sep">–</span> {{ formatRupiah(grup.hargaMax) }}
                </template>
                <template v-else>
                  {{ formatRupiah(grup.hargaMin) }}
                </template>
              </div>

              <div class="m-sc-compare-box">
                <template v-if="grup.adaPerbedaanHarga">
                  <div class="m-sc-cmp-line cheap">
                    <span>🟢 Termurah</span>
                    <span class="m-sc-market-name">{{ grup.pasarTermurah.nama_pasar }}</span>
                    <strong>{{ formatRupiah(grup.pasarTermurah.harga) }}</strong>
                  </div>
                  <div class="m-sc-cmp-line exp">
                    <span>🔴 Termahal</span>
                    <span class="m-sc-market-name">{{ grup.pasarTermahal.nama_pasar }}</span>
                    <strong>{{ formatRupiah(grup.pasarTermahal.harga) }}</strong>
                  </div>
                </template>
                <div v-else-if="grup.jumlahPasar > 1" class="m-sc-single-info">
                  📍 Harga seragam di <strong>{{ grup.jumlahPasar }} pasar</strong> terpilih
                </div>
                <div v-else class="m-sc-single-info">
                  <span class="market-pill-tag">📍 {{ grup.pasarTermurah.nama_pasar }}</span>
                  <span v-if="grup.pasarTermurah.perluKonversi" class="m-sc-conv">
                    ≈ {{ formatRupiah(grup.pasarTermurah.hargaStandar) }}/{{ grup.labelStandar }}
                  </span>
                </div>
              </div>

              <div class="m-sc-footer">
                <span class="item-date-text">Ditetapkan {{ grup.tanggalPenetapanTerbaru }}</span>
                <span class="m-sc-cta">Riwayat & Pasar →</span>
              </div>
            </div>
          </div>

          <!-- MODE 2: DAFTAR SEMUA PASAR (GRID 2 KOLOM DENGAN BADGE TERMURAH/TERMAHAL) -->
          <div v-else class="mobile-commodity-2col-grid">
            <div
              v-for="item in daftarSemuaPasarPublik"
              :key="item.id"
              :class="[
                'mobile-item-card m-flat-clickable',
                item.posisiPasar === 'termurah' ? 'm-flat-cheap' : item.posisiPasar === 'termahal' ? 'm-flat-exp' : ''
              ]"
              @click="grupDetailDipilih = item.grupKomoditas"
            >
              <div class="item-header-row">
                <span class="unit-label">{{ item.satuan }}</span>
                <span class="market-pill-tag" :title="item.nama_pasar">
                  {{ item.nama_pasar }}
                </span>
              </div>

              <h3 class="item-name-heading">{{ item.nama_komoditas }}</h3>

              <div v-if="item.posisiPasar === 'termurah' || item.posisiPasar === 'termahal'" class="m-flat-pos-row">
                <span v-if="item.posisiPasar === 'termurah'" class="m-flat-badge-cheap">🏆 Termurah</span>
                <span v-else class="m-flat-badge-exp">⬆️ Termahal</span>
              </div>

              <div class="item-price-tag">
                {{ formatRupiah(item.harga) }}
              </div>

              <div v-if="item.perluKonversi" class="m-flat-conv-hint">
                ≈ {{ formatRupiah(item.hargaStandar) }}/{{ item.labelStandar }}
              </div>

              <div class="item-footer-row" style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                <span class="item-date-text">
                  <template v-if="item.delta && item.delta.selisih !== 0">
                    <span :style="{ color: item.delta.selisih > 0 ? '#dc2626' : '#15803d', fontWeight: 700 }">
                      {{ item.delta.selisih > 0 ? '▲ +' : '▼ -' }}{{ formatRupiah(Math.abs(item.delta.selisih)) }}
                    </span>
                  </template>
                  <template v-else>
                    Ditetapkan {{ item.tanggal_penetapan || '-' }}
                  </template>
                </span>
                <span class="item-date-text" style="font-weight: 700; color: #8b1e1e;">Riwayat →</span>
              </div>
            </div>
          </div>
        </div>

        <!-- KONTEN B: GERAKAN PANGAN MURAH (GPM) PUBLIK (TANPA LOGIN, 100% RIIL DB) -->
        <div v-else-if="tabAktif === 'gpm'" class="mobile-gpm-public-section">
          <!-- HeroBanner GPM Mobile -->
          <div class="mobile-hero-card gpm-hero-theme">
            <div class="hero-badge-tag">
              <span>🎟️</span>
              <span>Antrean Daring GPM Manado</span>
            </div>
            <h2 class="hero-title-text">Gerakan Pangan Murah</h2>
            <p class="hero-desc-text">
              Dapatkan komoditas pangan pokok berkualitas dengan harga terjangkau di Kota Manado. <strong>Cukup isi NIK 16 digit & nama tanpa perlu login.</strong>
            </p>
            <div class="hero-update-date" style="display: flex; gap: 10px; flex-wrap: wrap;">
              <span>📍 {{ semuaAcaraGPMAktif.length }} Jadwal Aktif</span>
              <span>•</span>
              <span>📜 {{ semuaRiwayatGPMPublik.length }} Riwayat Terlaksana</span>
            </div>
          </div>

          <!-- Sub-Tab Publik GPM: Jadwal Aktif vs Riwayat Terlaksana -->
          <div class="m-gpm-pub-tabs">
            <button
              type="button"
              :class="['m-gpm-pub-tab', subTabGPMPublik === 'aktif' ? 'active' : '']"
              @click="subTabGPMPublik = 'aktif'"
            >
              📍 Jadwal Aktif
              <span class="m-gpm-pub-count">{{ semuaAcaraGPMAktif.length }}</span>
            </button>
            <button
              type="button"
              :class="['m-gpm-pub-tab', subTabGPMPublik === 'riwayat' ? 'active' : '']"
              @click="subTabGPMPublik = 'riwayat'"
            >
              📜 Riwayat Terlaksana
              <span class="m-gpm-pub-count">{{ semuaRiwayatGPMPublik.length }}</span>
            </button>
          </div>

          <!-- ERROR MUAT DATA GPM RIIL -->
          <div v-if="errorMuatGPMPublik" class="m-error-alert" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span>⚠️ {{ errorMuatGPMPublik }}</span>
            <button type="button" class="m-btn-retry-small" @click="muatDataGPM">🔄 Ulangi</button>
          </div>

          <!-- ═══ SUB-TAB 1: JADWAL GPM AKTIF & AMBIL ANTREAN ═══ -->
          <template v-if="subTabGPMPublik === 'aktif'">
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
                  📱 <strong>Petunjuk:</strong> Tiket ini adalah <strong>bukti nomor antrean &amp; alokasi kuota</strong> (bukan bukti pembayaran) dan tidak dapat dipindahtangankan. Tunjukkan Kode QR ini ke petugas Dinas Pangan di lokasi GPM sebelum jam selesai berakhir (tiket otomatis terkunci setelah jam tutup WITA).
                </div>

                <button type="button" class="btn-m-take-new" @click="tiketGPMHasil = null">
                  ← Kembali ke Daftar Jadwal GPM
                </button>
              </div>
            </div>

            <!-- JIKA BELUM ADA TIKET: FILTER, PETA SEBARAN & FORM PENDAFTARAN -->
            <div v-else class="mobile-gpm-selection-flow">
              <!-- Bar Filter Kecamatan, Urutan Deterministik & GPS Terdekat -->
              <div class="m-gpm-filter-bar">
                <select v-model="kecamatanFilterGPMPublik" class="m-gpm-filter-select">
                  <option value="Semua">🏘️ Semua Kecamatan</option>
                  <option v-for="kec in daftarKecamatanGPMPublik" :key="kec" :value="kec">
                    Kec. {{ kec }}
                  </option>
                </select>
                <select v-model="modeUrutanGPMPublik" class="m-gpm-filter-select">
                  <option value="otomatis">⭐ Otomatis (Prioritas & Kuota)</option>
                  <option value="kuota-terbanyak">🎟️ Sisa Kuota Terbanyak</option>
                  <option value="terdekat">📍 Terdekat dari Lokasi Saya</option>
                </select>
                <button
                  type="button"
                  :class="['m-gpm-gps-btn', posisiUserGPM ? 'active' : '']"
                  :disabled="sedangCariLokasiGPM"
                  @click="cariLokasiUserGPM"
                >
                  {{ sedangCariLokasiGPM ? '📡 Mencari GPS...' : (posisiUserGPM ? '📍 GPS Aktif (Terdekat)' : '📍 Urutkan Terdekat (GPS)') }}
                </button>
              </div>

              <!-- Empty State jika 0 acara aktif (TIDAK ADA DATA DUMMY) -->
              <div v-if="daftarAcaraGPMPublikAktif.length === 0" class="m-gpm-empty-card">
                <div class="m-gpm-empty-ico">📭</div>
                <h4>Belum Ada Jadwal GPM Aktif</h4>
                <p v-if="kecamatanFilterGPMPublik !== 'Semua'">
                  Tidak ditemukan kegiatan GPM aktif di Kecamatan <strong>{{ kecamatanFilterGPMPublik }}</strong>.
                </p>
                <p v-else>
                  Saat ini belum ada kegiatan Gerakan Pangan Murah yang sedang dibuka pendaftarannya. Anda dapat melihat tingkat keramaian pada riwayat kegiatan sebelumnya.
                </p>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
                  <button
                    v-if="kecamatanFilterGPMPublik !== 'Semua'"
                    type="button"
                    class="m-gpm-empty-btn secondary"
                    @click="kecamatanFilterGPMPublik = 'Semua'"
                  >
                    Tampilkan Semua Kecamatan
                  </button>
                  <button
                    type="button"
                    class="m-gpm-empty-btn"
                    @click="subTabGPMPublik = 'riwayat'"
                  >
                    📜 Lihat Riwayat Terlaksana ({{ semuaRiwayatGPMPublik.length }})
                  </button>
                </div>
              </div>

              <template v-else>
                <!-- Peta Sebaran Lokasi GPM Visual Card -->
                <div class="m-map-visual-card">
                  <div class="m-map-header">
                    <span>🗺️ Titik Lokasi GPM Aktif ({{ daftarAcaraGPMPublikAktif.length }})</span>
                    <span style="font-size: 0.72rem; color: #8b1e1e; font-weight: 700;">Auto-Close WITA</span>
                  </div>
                  
                  <!-- Peta Leaflet Interaktif (100% Data Riil DB) -->
                  <div id="petaGpmMobile" class="m-leaflet-map-box"></div>

                  <div class="m-map-body-graphic">
                    <div 
                      v-for="acara in daftarAcaraGPMPublikAktif" 
                      :key="acara.id" 
                      :class="[
                        'm-map-grid-pin',
                        acaraGPMDipilih?.id === acara.id ? 'active' : '',
                        acara.statusOperasional.kuotaPenuh ? 'is-full' : ''
                      ]"
                      @click="pilihAcaraGpm(acara)"
                    >
                      <div class="pin-top-row">
                        <span :class="['m-gpm-status-pill', 'st-' + acara.statusOperasional.kode.toLowerCase().replace(/\s+/g, '-')]">
                          {{ acara.statusOperasional.label }}
                        </span>
                        <span :class="['m-pin-quota-pill', acara.statusOperasional.kuotaPenuh ? 'full' : '']">
                          {{ acara.statusOperasional.kuotaPenuh ? 'HABIS' : `Sisa ${acara.statusOperasional.sisaKuota}/${acara.statusOperasional.kuotaMaks}` }}
                        </span>
                      </div>
                      <div class="pin-info-wrap">
                        <strong class="pin-name">{{ acara.nama_acara }}</strong>
                        <span class="pin-sub">📍 {{ acara.lokasi }} (Kec. {{ acara.kecamatan }})</span>
                        <span class="pin-time-sub">
                          📅 {{ jadwalGPMMobileService.formatTanggalID(acara.tanggal) }} · ⏰ {{ acara.jam_mulai }}–{{ acara.jam_selesai }} WITA
                          <template v-if="acara.jarakKm !== null && acara.jarakKm !== undefined"> · 🧭 {{ acara.jarakKm }} km</template>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Kartu Detail Acara GPM yang Dipilih -->
                <div v-if="acaraGPMDipilihTeranalisis" class="m-selected-event-card">
                  <div class="m-event-header">
                    <div>
                      <span :class="['m-gpm-status-pill', 'st-' + acaraGPMDipilihTeranalisis.statusOperasional.kode.toLowerCase().replace(/\s+/g, '-')]">
                        {{ acaraGPMDipilihTeranalisis.statusOperasional.label }}
                      </span>
                      <h3 class="m-event-title" style="margin-top: 6px;">{{ acaraGPMDipilihTeranalisis.nama_acara }}</h3>
                    </div>
                    <span :class="['m-event-quota', acaraGPMDipilihTeranalisis.statusOperasional.kuotaPenuh ? 'quota-habis' : '']">
                      {{ acaraGPMDipilihTeranalisis.statusOperasional.kuotaPenuh
                        ? 'Kuota Habis'
                        : `Sisa ${acaraGPMDipilihTeranalisis.statusOperasional.sisaKuota} / ${acaraGPMDipilihTeranalisis.statusOperasional.kuotaMaks}` }}
                    </span>
                  </div>

                  <div class="m-event-info">
                    <p>📍 {{ acaraGPMDipilihTeranalisis.lokasi }} (Kec. {{ acaraGPMDipilihTeranalisis.kecamatan }})</p>
                    <p>📅 {{ jadwalGPMMobileService.formatTanggalID(acaraGPMDipilihTeranalisis.tanggal) }} · ⏰ {{ acaraGPMDipilihTeranalisis.jam_mulai }} - {{ acaraGPMDipilihTeranalisis.jam_selesai }} WITA</p>
                    <p style="font-size: 0.75rem; color: #64748b;">⏱️ {{ acaraGPMDipilihTeranalisis.statusOperasional.keteranganWaktu }} · Otomatis ditutup pukul {{ acaraGPMDipilihTeranalisis.jam_selesai }} WITA</p>
                  </div>

                  <!-- Progress Kuota Riil -->
                  <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #475569; margin-bottom: 4px;">
                      <span>Antrean Terisi: <strong>{{ acaraGPMDipilihTeranalisis.statusOperasional.terisi }} / {{ acaraGPMDipilihTeranalisis.statusOperasional.kuotaMaks }}</strong></span>
                      <strong>{{ acaraGPMDipilihTeranalisis.statusOperasional.persenTerisi }}%</strong>
                    </div>
                    <div class="m-gpm-progress-track">
                      <div
                        class="m-gpm-progress-fill"
                        :class="{ full: acaraGPMDipilihTeranalisis.statusOperasional.kuotaPenuh }"
                        :style="{ width: acaraGPMDipilihTeranalisis.statusOperasional.persenTerisi + '%' }"
                      ></div>
                    </div>
                  </div>

                  <div class="m-event-commodities" v-if="acaraGPMDipilihTeranalisis.komoditas_tersedia">
                    <strong>🌾 Komoditas Pangan Murah:</strong>
                    <p>{{ acaraGPMDipilihTeranalisis.komoditas_tersedia }}</p>
                  </div>

                  <!-- KONDISI 1: TERKUNCI OTOMATIS KARENA SUDAH LEWAT JAM WITA / SELESAI -->
                  <div v-if="acaraGPMDipilihTeranalisis.statusOperasional.sudahBerakhir" class="m-gpm-locked-banner locked-ended">
                    <span class="m-lock-ico">🔒</span>
                    <div>
                      <strong>Kegiatan GPM Telah Berakhir</strong>
                      <p>Pendaftaran antrean otomatis ditutup karena jadwal telah melewati pukul {{ acaraGPMDipilihTeranalisis.jam_selesai }} WITA.</p>
                      <button type="button" class="m-gpm-empty-btn" style="margin-top: 8px;" @click="subTabGPMPublik = 'riwayat'">
                        📜 Lihat Statistik di Riwayat
                      </button>
                    </div>
                  </div>

                  <!-- KONDISI 2: TERKUNCI OTOMATIS KARENA KUOTA HABIS -->
                  <div v-else-if="acaraGPMDipilihTeranalisis.statusOperasional.kuotaPenuh" class="m-gpm-locked-banner locked-full">
                    <span class="m-lock-ico">🚫</span>
                    <div>
                      <strong>Kuota Antrean Telah Habis</strong>
                      <p>Seluruh kuota antrean ({{ acaraGPMDipilihTeranalisis.statusOperasional.terisi }} / {{ acaraGPMDipilihTeranalisis.statusOperasional.kuotaMaks }}) telah terisi penuh. Silakan pilih lokasi GPM lain yang masih tersedia.</p>
                    </div>
                  </div>

                  <!-- KONDISI 3: FORMULIR AMBIL ANTREAN AKTIF (TANPA LOGIN) -->
                  <form v-else @submit.prevent="ambilNomorAntreanMobile" class="m-queue-form">
                    <h4 class="m-form-heading">🎟️ Formulir Ambil Nomor Antrean</h4>
                    <p class="m-form-subheading">Masyarakat tidak perlu masuk akun, cukup isi NIK (16 digit) dan nama lengkap:</p>

                    <div v-if="pesanErrorGPM" class="m-error-alert">
                      ⚠️ {{ pesanErrorGPM }}
                    </div>

                    <div class="m-input-group-mobile">
                      <label>NOMOR INDUK KEPENDUDUKAN (NIK) <span style="color: #ef4444;">* (Wajib 16 Digit)</span></label>
                      <input 
                        type="text" 
                        required 
                        maxlength="16"
                        v-model="formAntreanGPM.nik" 
                        placeholder="Contoh: 7171012345678901"
                        class="m-input-text"
                        @input="formAntreanGPM.nik = formAntreanGPM.nik.replace(/[^0-9]/g, '').slice(0, 16)"
                      />
                      <small :style="{ color: formAntreanGPM.nik?.length === 16 ? '#16a34a' : '#64748b', fontSize: '0.74rem', marginTop: '3px', display: 'block' }">
                        {{ formAntreanGPM.nik?.length || 0 }}/16 digit {{ formAntreanGPM.nik?.length > 0 && formAntreanGPM.nik?.length < 16 ? `(Kurang ${16 - formAntreanGPM.nik.length} digit)` : '' }}
                      </small>
                    </div>

                    <div class="m-input-group-mobile">
                      <label>NAMA LENGKAP <span style="color: #ef4444;">*</span></label>
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
                      <label>NOMOR TELEPON / WHATSAPP <span style="color: #64748b; font-weight: normal;">(Opsional)</span></label>
                      <input 
                        type="tel" 
                        v-model="formAntreanGPM.nomor_telepon" 
                        placeholder="081234567890 (Boleh kosong)"
                        class="m-input-text"
                        @input="formAntreanGPM.nomor_telepon = formAntreanGPM.nomor_telepon.replace(/[^0-9]/g, '').slice(0, 15)"
                      />
                    </div>

                    <button type="submit" class="btn-m-get-queue" :disabled="sedangDaftarGPM">
                      {{ sedangDaftarGPM ? 'Memproses...' : '🎟️ Dapatkan Nomor Antrean & Kode QR' }}
                    </button>
                  </form>
                </div>
              </template>
            </div>
          </template>

          <!-- ═══ SUB-TAB 2: RIWAYAT GPM TERLAKSANA (STATISTIK AGREGAT PUBLIK, TANPA DATA PRIBADI) ═══ -->
          <div v-else class="m-gpm-pub-history-wrap">
            <!-- Filter Kecamatan Riwayat -->
            <div class="m-gpm-filter-bar" style="margin-bottom: 10px;">
              <select v-model="kecamatanFilterGPMPublik" class="m-gpm-filter-select" style="flex: 1;">
                <option value="Semua">🏘️ Semua Kecamatan</option>
                <option v-for="kec in daftarKecamatanGPMPublik" :key="kec" :value="kec">
                  Kec. {{ kec }}
                </option>
              </select>
            </div>

            <!-- Ringkasan KPI Agregat -->
            <div class="m-gpm-hist-kpi-grid">
              <div class="m-hist-kpi-box">
                <span class="lbl">Terlaksana</span>
                <strong>{{ ringkasanRiwayatGPMPublik.totalKegiatan }}</strong>
              </div>
              <div class="m-hist-kpi-box">
                <span class="lbl">Total Pendaftar</span>
                <strong>{{ ringkasanRiwayatGPMPublik.totalTerdaftar }}</strong>
              </div>
              <div class="m-hist-kpi-box">
                <span class="lbl">Hadir Terverif</span>
                <strong>{{ ringkasanRiwayatGPMPublik.totalHadir }}</strong>
              </div>
              <div class="m-hist-kpi-box">
                <span class="lbl">Rata Keramaian</span>
                <strong>{{ ringkasanRiwayatGPMPublik.rataKeramaian }}%</strong>
              </div>
            </div>

            <div class="m-gpm-privacy-strip">
              🛡️ Transparansi Publik: Menampilkan rekap statistik keramaian & antusiasme tiap lokasi GPM tanpa menampilkan data pribadi warga (UU PDP).
            </div>

            <div v-if="daftarRiwayatGPMPublik.length === 0" class="m-gpm-empty-card">
              <div class="m-gpm-empty-ico">📜</div>
              <h4>Belum Ada Riwayat GPM Terlaksana</h4>
              <p>Arsip kegiatan GPM yang telah selesai akan tampil otomatis di sini beserta indikator tingkat keramaiannya.</p>
            </div>

            <div v-else class="m-pub-hist-list">
              <div v-for="acara in daftarRiwayatGPMPublik" :key="acara.id" class="m-pub-hist-card">
                <div class="m-pub-hist-top">
                  <span class="m-history-tag-done">✓ Terlaksana</span>
                  <span :class="['m-crowd-badge', 'crowd-' + acara.statusOperasional.kelasAntusiasme]">
                    {{ acara.statusOperasional.labelAntusiasme }}
                  </span>
                </div>
                <h4 class="m-pub-hist-title">{{ acara.nama_acara }}</h4>
                <p class="m-pub-hist-meta">📍 {{ acara.lokasi }} (Kec. {{ acara.kecamatan }})</p>
                <p class="m-pub-hist-meta">📅 {{ jadwalGPMMobileService.formatTanggalID(acara.tanggal) }} · ⏰ {{ acara.jam_mulai }}–{{ acara.jam_selesai }} WITA</p>

                <div style="margin: 8px 0;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #475569; margin-bottom: 4px;">
                    <span>Keterisian Antrean</span>
                    <strong>{{ acara.statusOperasional.terisi }} / {{ acara.statusOperasional.kuotaMaks }} ({{ acara.statusOperasional.persenTerisi }}%)</strong>
                  </div>
                  <div class="m-gpm-progress-track">
                    <div
                      class="m-gpm-progress-fill"
                      :class="{ full: acara.statusOperasional.persenTerisi >= 90 }"
                      :style="{ width: acara.statusOperasional.persenTerisi + '%' }"
                    ></div>
                  </div>
                </div>

                <div class="m-pub-hist-stats">
                  <div>
                    <span class="lbl">Kuota</span>
                    <strong>{{ acara.statusOperasional.kuotaMaks }}</strong>
                  </div>
                  <div>
                    <span class="lbl">Mendaftar</span>
                    <strong>{{ acara.statusOperasional.terisi }}</strong>
                  </div>
                  <div>
                    <span class="lbl">Hadir</span>
                    <strong>{{ acara.statusOperasional.totalHadir }}</strong>
                  </div>
                </div>

                <div v-if="acara.komoditas_tersedia" class="m-pub-hist-kom">
                  <strong>🌾 Komoditas:</strong> {{ acara.komoditas_tersedia }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- KONTEN C: DAFTAR PASAR & PETA LOKASI PUBLIK (100% DATA RIIL ADMIN SUPABASE) -->
        <DaftarPasarMobile
          v-else-if="tabAktif === 'pasar'"
          :daftar-harga-terbit="dataHargaPublikRiil"
          @lihat-harga-pasar="lihatHargaDariDaftarPasarMobile"
        />

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

    <!-- ===============================================================================
         MODAL 1: PROFIL PETUGAS & GANTI KATA SANDI MANDIRI (SEMUA ROLE)
         =============================================================================== -->
    <div v-if="modalProfilBuka" class="server-config-modal-overlay" @click.self="modalProfilBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">👤</span>
            <div>
              <h3 class="server-m-title">Profil Pengguna</h3>
              <p class="server-m-sub">{{ userAktif?.nama }} · {{ formatPeranLengkap(peranAktif) }}</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalProfilBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <div class="m-profile-info-box">
            <div class="m-profile-avatar-large">
              <img v-if="userAktif?.foto_profil" :src="userAktif.foto_profil" alt="Avatar" class="avatar-fit-circle" />
              <span v-else>{{ (userAktif?.nama ? userAktif.nama.charAt(0) : 'P').toUpperCase() }}</span>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 1rem; color: #1e293b;">{{ userAktif?.nama }}</h4>
              <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b;">{{ userAktif?.username }} · {{ userAktif?.email }}</p>
              <span class="user-role-badge" :class="'role-' + peranAktif.toLowerCase()" style="margin-top: 4px; display: inline-block;">
                {{ formatPeranLengkap(peranAktif) }}
              </span>
            </div>
          </div>

          <div class="s-field" style="margin-top: 14px;">
            <label>Foto Profil Pengguna:</label>
            <input type="file" ref="inputFotoMobileRef" accept="image/*" style="display: none;" @change="handlePilihBerkasFotoMobile" />
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button type="button" class="btn-m-add" style="flex: 1; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;" @click="pilihFotoDariPerangkat">
                📁 Unggah Foto (Galeri)
              </button>
              <button type="button" class="btn-m-add" style="flex: 1; background: #8b1e1e; color: #fff;" @click="eksekusiGantiFotoProfil">
                Simpan Foto
              </button>
            </div>
            <input type="text" v-model="inputFotoProfilUrl" placeholder="Atau tempel URL gambar..." />
          </div>

          <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
            <h4 style="margin: 0 0 10px 0; font-size: 0.88rem; color: #1e293b;">🔑 Ganti Kata Sandi Pribadi</h4>
            <div class="s-field" style="margin-bottom: 8px;">
              <label>Kata Sandi Lama</label>
              <input type="password" v-model="formSandiMandiri.sandiLama" placeholder="Masukan kata sandi saat ini" />
            </div>
            <div class="s-field" style="margin-bottom: 8px;">
              <label>Kata Sandi Baru (Minimal 8 Karakter)</label>
              <input type="password" v-model="formSandiMandiri.sandiBaru" placeholder="Minimal 8 karakter" />
            </div>
            <div class="s-field">
              <label>Konfirmasi Kata Sandi Baru</label>
              <input type="password" v-model="formSandiMandiri.konfirmasi" placeholder="Ulangi kata sandi baru" />
            </div>
          </div>
        </div>

        <div class="server-modal-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-cancel-server" style="background: #fee2e2; color: #991b1b; font-weight: 700; border: 1px solid #fecaca;" @click="modalProfilBuka = false; eksekusiLogout()">
            🚪 Keluar (Logout)
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-cancel-server" @click="modalProfilBuka = false">Tutup</button>
            <button type="button" class="btn-save-server" @click="eksekusiGantiSandiMandiri">
              💾 Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL 2: TAMBAH PENGGUNA BARU (KHUSUS ADMIN)
         =============================================================================== -->
    <div v-if="modalTambahUserBuka" class="server-config-modal-overlay" @click.self="modalTambahUserBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">➕</span>
            <div>
              <h3 class="server-m-title">Tambah Pengguna Baru</h3>
              <p class="server-m-sub">Daftarkan akun staf, kabid, kadis, atau admin baru</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalTambahUserBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Nama Lengkap</label>
            <input type="text" v-model="formPenggunaBaru.nama" placeholder="Contoh: Budi Santoso" />
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Nama Pengguna (Username)</label>
            <input type="text" v-model="formPenggunaBaru.username" placeholder="Contoh: budi" />
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Alamat Email (Opsional)</label>
            <input type="email" v-model="formPenggunaBaru.email" placeholder="contoh@manado.go.id (Otomatis jika kosong)" />
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Peran Hak Akses</label>
            <select v-model="formPenggunaBaru.peran" class="m-role-select" style="width: 100%;">
              <option value="Admin">Admin</option>
              <option value="Superadmin">Superadmin</option>
              <option value="Kabid">Kabid (Kepala Bidang)</option>
              <option value="Staf">Staf (Petugas Pangan)</option>
              <option value="Kadis">Kadis (Kepala Dinas)</option>
            </select>
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Bidang / Bagian Kedinasan</label>
            <input type="text" v-model="formPenggunaBaru.bidang" placeholder="Contoh: Bidang Distribusi & Cadangan" />
          </div>
          <div class="s-field">
            <label>Kata Sandi Awal (Minimal 8 Karakter)</label>
            <input type="password" v-model="formPenggunaBaru.kata_sandi" placeholder="Minimal 8 karakter" />
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="modalTambahUserBuka = false">Batal</button>
          <button type="button" class="btn-save-server" @click="tambahPenggunaBaru">
            ✓ Daftarkan Pengguna
          </button>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL 3: HARD RESET SANDI OLEH ADMIN (KHUSUS ADMIN)
         =============================================================================== -->
    <div v-if="modalResetSandiBuka" class="server-config-modal-overlay" @click.self="modalResetSandiBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">🔑</span>
            <div>
              <h3 class="server-m-title">Reset Kata Sandi Pengguna</h3>
              <p class="server-m-sub">Target: {{ targetResetUser?.nama }} ({{ targetResetUser?.username }})</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalResetSandiBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <p style="font-size: 0.8rem; color: #64748b; margin: 0 0 10px 0;">
            Sebagai Administrator, Anda dapat mengatur ulang kata sandi pengguna tanpa perlu mengetahui kata sandi lama mereka.
          </p>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Kata Sandi Baru (Minimal 8 Karakter)</label>
            <input type="password" v-model="inputSandiResetBaru" placeholder="Minimal 8 karakter baru" />
          </div>
          <div class="s-field">
            <label>Konfirmasi Kata Sandi Baru</label>
            <input type="password" v-model="konfirmasiSandiResetBaru" placeholder="Ulangi kata sandi baru" />
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="modalResetSandiBuka = false">Batal</button>
          <button type="button" class="btn-save-server" @click="eksekusiResetSandi">
            🔑 Simpan Reset Sandi
          </button>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL 4: UBAH USERNAME OLEH ADMIN (KHUSUS ADMIN)
         =============================================================================== -->
    <div v-if="modalUbahUsernameBuka" class="server-config-modal-overlay" @click.self="modalUbahUsernameBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">✏️</span>
            <div>
              <h3 class="server-m-title">Ubah Username Pengguna</h3>
              <p class="server-m-sub">Target: {{ targetUbahUsername?.nama }}</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalUbahUsernameBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <div class="s-field">
            <label>Username Baru</label>
            <input type="text" v-model="inputUsernameBaru" placeholder="Masukan username baru (huruf kecil)" />
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="modalUbahUsernameBuka = false">Batal</button>
          <button type="button" class="btn-save-server" @click="eksekusiUbahUsername">
            ✓ Simpan Username
          </button>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL 4B: UBAH EMAIL OLEH ADMIN (KHUSUS ADMIN)
         =============================================================================== -->
    <div v-if="modalUbahEmailBuka" class="server-config-modal-overlay" @click.self="modalUbahEmailBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">✉️</span>
            <div>
              <h3 class="server-m-title">Ubah Email Pengguna</h3>
              <p class="server-m-sub">Target: {{ targetUbahEmail?.nama }} ({{ targetUbahEmail?.username }})</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalUbahEmailBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <div class="s-field">
            <label>Alamat Email Baru</label>
            <input type="email" v-model="inputEmailBaru" placeholder="contoh@manado.go.id" />
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="modalUbahEmailBuka = false">Batal</button>
          <button type="button" class="btn-save-server" @click="eksekusiUbahEmail">
            ✓ Simpan Email
          </button>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL 5: EDIT HARGA OLEH KABID (KHUSUS KABID)
         =============================================================================== -->
    <div v-if="modalEditKabidBuka" class="server-config-modal-overlay" @click.self="modalEditKabidBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">✏️</span>
            <div>
              <h3 class="server-m-title">Penyesuaian Harga oleh Kabid</h3>
              <p class="server-m-sub">Ubah besaran harga atau komoditas sebelum diterbitkan</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalEditKabidBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Komoditas / Varian Resmi (Master Admin)</label>
            <select
              class="m-role-select"
              style="width: 100%;"
              :value="formEditKabid.nama_komoditas"
              @change="pilihKomoditasMasterKabid(($event.target as HTMLSelectElement).value)"
            >
              <option value="">-- Pilih Komoditas / Varian Resmi --</option>
              <optgroup
                v-for="grup in grupKomoditasDropdownMobile"
                :key="grup.kelompok"
                :label="`🌾 ${grup.kelompok}`"
              >
                <option v-for="k in grup.items" :key="k.nama_komoditas" :value="k.nama_komoditas">
                  {{ k.nama_komoditas }} ({{ k.satuan_bawaan }})
                </option>
              </optgroup>
              <optgroup
                v-if="formEditKabid.nama_komoditas && !daftarMasterKomoditas.some(k => k.nama_komoditas.toLowerCase() === formEditKabid.nama_komoditas.toLowerCase())"
                label="Data Sebelumnya"
              >
                <option :value="formEditKabid.nama_komoditas">{{ formEditKabid.nama_komoditas }}</option>
              </optgroup>
            </select>
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Kategori</label>
            <select v-model="formEditKabid.kategori" class="m-role-select" style="width: 100%;">
              <option value="Bahan Pokok">Bahan Pokok</option>
              <option value="Hewani">Hewani</option>
              <option value="Sayuran">Sayuran</option>
              <option value="Buah">Buah</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Satuan Resmi (Terkunci per 1 • Master Admin)</label>
            <select v-model="formEditKabid.satuan" class="m-role-select" style="width: 100%;">
              <option v-for="s in Array.from(new Set([...daftarSatuan, formEditKabid.satuan].filter(Boolean)))" :key="s" :value="s">
                {{ s }}
              </option>
            </select>
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Harga Acuan (Rp)</label>
            <input type="text" v-model="formEditKabid.harga" @keypress="hanyaBolehAngka" />
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Pasar Tradisional</label>
            <select v-model="formEditKabid.nama_pasar" class="m-role-select" style="width: 100%;">
              <option v-for="p in daftarPasar" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="s-field">
            <label>Status Publikasi</label>
            <select v-model="formEditKabid.status" class="m-role-select" style="width: 100%;">
              <option value="Terbit">Terbitkan Langsung ke Publik</option>
              <option value="Draft">Simpan Sebagai Draf</option>
            </select>
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="modalEditKabidBuka = false">Batal</button>
          <button type="button" class="btn-save-server" @click="simpanEditKabid">
            💾 Simpan Penyesuaian
          </button>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL TAMBAH PENDAFTAR MANUAL (DI TEMPAT / WALK-IN TANPA HP)
         =============================================================================== -->
    <div v-if="modalTambahManualMobile.buka" class="server-config-modal-overlay" @click.self="modalTambahManualMobile.buka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">➕</span>
            <div>
              <h3 class="server-m-title">Pendaftaran Manual di Lokasi GPM</h3>
              <p class="server-m-sub">Warga yang hadir di lokasi tanpa membawa HP</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalTambahManualMobile.buka = false">✕</button>
        </div>

        <form @submit.prevent="simpanPendaftarManualMobile">
          <div class="server-modal-body">
            <div v-if="modalTambahManualMobile.pesanError" class="m-error-alert" style="margin-bottom: 12px;">
              ⚠️ {{ modalTambahManualMobile.pesanError }}
            </div>

            <div class="s-field" style="margin-bottom: 10px;">
              <label>Lokasi Acara GPM <span style="color: #ef4444;">*</span></label>
              <select v-model="modalTambahManualMobile.acaraId" class="m-role-select" style="width: 100%;" required>
                <option v-for="a in daftarAcaraGPM" :key="a.id" :value="a.id">
                  {{ a.nama_acara }} ({{ (a.sisa_kuota ?? 0) > 0 ? `Sisa ${a.sisa_kuota} kuota` : 'KUOTA HABIS' }})
                </option>
              </select>
              <small style="color: #64748b; font-size: 0.72rem; display: block; margin-top: 3px;">
                Pendaftaran langsung di lokasi tetap mengikuti batas kuota & jam tutup WITA. Jika kuota penuh, Kepala Bidang dapat menambah kuota.
              </small>
            </div>

            <div class="s-field" style="margin-bottom: 10px;">
              <label>NIK <span style="color: #ef4444;">* (Wajib 16 Digit)</span></label>
              <input 
                type="text" 
                maxlength="16" 
                required 
                v-model="modalTambahManualMobile.nik" 
                placeholder="Contoh: 7171012345678901" 
                @input="modalTambahManualMobile.nik = modalTambahManualMobile.nik.replace(/[^0-9]/g, '').slice(0, 16)"
              />
              <small :style="{ color: modalTambahManualMobile.nik.length === 16 ? '#16a34a' : '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '2px' }">
                {{ modalTambahManualMobile.nik.length }}/16 digit {{ modalTambahManualMobile.nik.length > 0 && modalTambahManualMobile.nik.length < 16 ? `(Kurang ${16 - modalTambahManualMobile.nik.length} digit)` : '' }}
              </small>
            </div>

            <div class="s-field" style="margin-bottom: 10px;">
              <label>Nama Lengkap Warga <span style="color: #ef4444;">*</span></label>
              <input 
                type="text" 
                required 
                v-model="modalTambahManualMobile.nama" 
                placeholder="Masukkan nama lengkap warga"
                @input="modalTambahManualMobile.nama = modalTambahManualMobile.nama.replace(/[^a-zA-Z\s'.]/g, '')"
              />
            </div>

            <div class="s-field" style="margin-bottom: 12px;">
              <label>Nomor Telepon / WhatsApp <span style="color: #64748b; font-weight: normal;">(Opsional)</span></label>
              <input 
                type="tel" 
                v-model="modalTambahManualMobile.telepon" 
                placeholder="Contoh: 081234567890 (Boleh kosong)" 
                @input="modalTambahManualMobile.telepon = modalTambahManualMobile.telepon.replace(/[^0-9]/g, '').slice(0, 15)"
              />
            </div>

            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 600; color: #334155; cursor: pointer;">
                <input type="checkbox" v-model="modalTambahManualMobile.langsungHadir" />
                <span>Langsung Tandai Hadir & Verifikasi</span>
              </label>
            </div>
          </div>

          <div class="server-modal-footer">
            <button type="button" class="btn-cancel-server" @click="modalTambahManualMobile.buka = false">
              Batal
            </button>
            <button type="submit" class="btn-save-server" :disabled="modalTambahManualMobile.sedangKirim" style="background: #059669;">
              {{ modalTambahManualMobile.sedangKirim ? 'Menyimpan...' : '💾 Simpan Warga' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL ATUR / TAMBAH KUOTA ACARA GPM (KHUSUS KABID & SUPERADMIN)
         =============================================================================== -->
    <div v-if="modalUbahKuotaMobile.buka && modalUbahKuotaMobile.acara" class="server-config-modal-overlay" @click.self="modalUbahKuotaMobile.buka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">🔧</span>
            <div>
              <h3 class="server-m-title">Atur / Tambah Kuota GPM</h3>
              <p class="server-m-sub">{{ modalUbahKuotaMobile.acara.nama_acara }}</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalUbahKuotaMobile.buka = false">✕</button>
        </div>

        <form @submit.prevent="simpanUbahKuotaMobile">
          <div class="server-modal-body">
            <div v-if="modalUbahKuotaMobile.pesanError" class="m-error-alert" style="margin-bottom: 12px;">
              ⚠️ {{ modalUbahKuotaMobile.pesanError }}
            </div>

            <div class="m-kuota-info-box">
              <div><span>Kuota Saat Ini:</span> <strong>{{ modalUbahKuotaMobile.acara.kuota_maksimal }}</strong></div>
              <div><span>Sudah Terdaftar:</span> <strong>{{ modalUbahKuotaMobile.acara.antrean_terisi ?? 0 }}</strong></div>
              <div><span>Sisa Kuota:</span> <strong>{{ modalUbahKuotaMobile.acara.sisa_kuota ?? 0 }}</strong></div>
            </div>

            <div class="s-field" style="margin-top: 12px;">
              <label>Tambah Cepat dari Kuota Saat Ini:</label>
              <div class="m-quick-add-kuota-row">
                <button type="button" @click="tambahCepatKuotaMobile(25)">+25</button>
                <button type="button" @click="tambahCepatKuotaMobile(50)">+50</button>
                <button type="button" @click="tambahCepatKuotaMobile(100)">+100</button>
                <button type="button" @click="tambahCepatKuotaMobile(200)">+200</button>
              </div>
            </div>

            <div class="s-field" style="margin-top: 10px;">
              <label>Total Kuota Maksimal Baru <span style="color: #ef4444;">*</span></label>
              <input
                type="number"
                required
                :min="Math.max(1, modalUbahKuotaMobile.acara.antrean_terisi || 0)"
                v-model="modalUbahKuotaMobile.kuotaBaru"
                placeholder="Masukkan total kuota baru"
              />
              <small style="color: #64748b; font-size: 0.72rem; display: block; margin-top: 3px;">
                Minimal {{ Math.max(1, modalUbahKuotaMobile.acara.antrean_terisi || 0) }} (tidak boleh kurang dari warga yang sudah terdaftar).
              </small>
            </div>
          </div>

          <div class="server-modal-footer">
            <button type="button" class="btn-cancel-server" @click="modalUbahKuotaMobile.buka = false">
              Batal
            </button>
            <button type="submit" class="btn-save-server" :disabled="modalUbahKuotaMobile.sedangSimpan" style="background: #1d4ed8;">
              {{ modalUbahKuotaMobile.sedangSimpan ? 'Menyimpan...' : '💾 Simpan Kuota Baru' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL DETAIL WARGA PENDAFTAR GPM (MOBILE)
         =============================================================================== -->
    <div v-if="modalDetailWargaMobile.buka && modalDetailWargaMobile.acara" class="server-config-modal-overlay" @click.self="modalDetailWargaMobile.buka = false">
      <div class="server-config-modal-card" style="max-height: 85vh; display: flex; flex-direction: column;">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">👥</span>
            <div>
              <h3 class="server-m-title">Data Warga Pendaftar</h3>
              <p class="server-m-sub">{{ modalDetailWargaMobile.acara.nama_acara }}</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalDetailWargaMobile.buka = false">✕</button>
        </div>

        <div class="server-modal-body" style="overflow-y: auto; flex: 1;">
          <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 12px; font-size: 0.8rem; color: #475569;">
            <div>📍 {{ modalDetailWargaMobile.acara.lokasi }} ({{ modalDetailWargaMobile.acara.kecamatan }})</div>
            <div style="margin-top: 2px;">📅 {{ modalDetailWargaMobile.acara.tanggal }}</div>
            <div style="margin-top: 6px; display: flex; gap: 8px; font-weight: 700;">
              <span style="color: #1e40af;">Terdaftar: {{ pendaftarAcaraMobileTersaring.length }}</span>
              <span style="color: #166534;">Hadir: {{ pendaftarAcaraMobileTersaring.filter(p => p.status_kehadiran === 'Hadir').length }}</span>
            </div>
          </div>

          <div class="s-field" style="margin-bottom: 12px;">
            <input 
              type="text" 
              v-model="modalDetailWargaMobile.pencarian" 
              placeholder="🔍 Cari Nama atau NIK 16 digit..." 
            />
          </div>

          <div v-if="pendaftarAcaraMobileTersaring.length === 0" style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.82rem;">
            Tidak ditemukan data warga pendaftar.
          </div>

          <div v-else style="display: flex; flex-direction: column; gap: 8px;">
            <div 
              v-for="(w, idx) in pendaftarAcaraMobileTersaring" 
              :key="w.id || idx" 
              style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;"
            >
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong style="color: #1e293b; font-size: 0.88rem;">{{ w.nama_pendaftar || w.nama_bersih || '-' }}</strong>
                  <div style="font-size: 0.76rem; color: #64748b; font-family: monospace; margin-top: 1px;">
                    NIK: <strong>{{ w.nik || '-' }}</strong>
                  </div>
                  <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">
                    📞 {{ w.nomor_telepon || '-' }} · Antrean: <strong>#{{ String(w.nomor_antrean || idx + 1).padStart(3, '0') }}</strong>
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                  <span 
                    style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;"
                    :style="w.status_kehadiran === 'Hadir' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'"
                  >
                    {{ w.status_kehadiran === 'Hadir' ? 'Hadir' : 'Menunggu' }}
                  </span>
                  <span 
                    style="padding: 1px 5px; border-radius: 3px; font-size: 0.68rem; font-weight: 600;"
                    :style="(w.jalur_pendaftaran || '').toLowerCase() === 'langsung' ? 'background: #f0fdf4; color: #166534;' : 'background: #eff6ff; color: #1e40af;'"
                  >
                    {{ w.jalur_pendaftaran || 'Daring' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="server-modal-footer" style="display: flex; gap: 8px;">
          <button type="button" class="btn-cancel-server" style="flex: 1;" @click="modalDetailWargaMobile.buka = false">
            Tutup
          </button>
          <button 
            type="button" 
            class="btn-save-server" 
            style="flex: 1; background: #166534;"
            @click="unduhRekapAcaraMobile(modalDetailWargaMobile.acara)"
          >
            📥 Unduh CSV
          </button>
        </div>
      </div>
    </div>

    <!-- ===============================================================================
         MODAL NOTIFIKASI DINAMIS SISTEM (MOBILE)
         =============================================================================== -->
    <div v-if="modalNotifMobileBuka" class="server-config-modal-overlay" @click.self="modalNotifMobileBuka = false">
      <div class="server-config-modal-card" style="max-height: 80vh; display: flex; flex-direction: column;">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">🔔</span>
            <div>
              <h3 class="server-m-title">Pemberitahuan Sistem</h3>
              <p class="server-m-sub">Respon aktivitas riil basis data sesuai peran Anda</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalNotifMobileBuka = false">✕</button>
        </div>

        <div class="server-modal-body" style="overflow-y: auto; flex: 1;">
          <div v-if="daftarNotifMobile.length === 0" style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
            Belum ada pemberitahuan baru
          </div>

          <div v-else style="display: flex; flex-direction: column; gap: 10px;">
            <div 
              v-for="notif in daftarNotifMobile" 
              :key="notif.id"
              @click="bukaNotifTarget(notif.target)"
              style="padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer;"
            >
              <div style="font-weight: 700; font-size: 0.86rem; color: #1e293b;">{{ notif.judul }}</div>
              <div style="font-size: 0.78rem; color: #475569; margin-top: 3px; line-height: 1.35;">{{ notif.pesan }}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                <span style="font-size: 0.7rem; color: #94a3b8;">{{ notif.waktu }}</span>
                <span v-if="notif.target" style="font-size: 0.72rem; color: #8b1e1e; font-weight: 700;">Buka Modul →</span>
              </div>
            </div>
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" style="width: 100%;" @click="modalNotifMobileBuka = false">
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL MULTI-SELECT WILAYAH PASAR (PUBLIK MOBILE) -->
    <div v-if="modalPilihPasarBuka" class="m-market-picker-overlay" @click.self="modalPilihPasarBuka = false">
      <div class="m-market-picker-sheet">
        <div class="m-mp-header">
          <div>
            <h4>📍 Pilih Pasar untuk Dibandingkan</h4>
            <p>Centang 2 atau lebih pasar untuk melihat termurah & termahal</p>
          </div>
          <button type="button" class="m-mp-close" @click="modalPilihPasarBuka = false">✕</button>
        </div>

        <div class="m-mp-quick-row">
          <button type="button" @click="pasarTerpilihPublik = [...daftarPasarPublikDB]">Pilih Semua</button>
          <button type="button" @click="pasarTerpilihPublik = []">Reset (Semua Pasar)</button>
        </div>

        <div class="m-mp-list">
          <div v-if="daftarPasarPublikDB.length === 0" class="m-mp-empty">
            Belum ada data pasar terverifikasi di basis data.
          </div>
          <label
            v-for="pasar in daftarPasarPublikDB"
            :key="pasar"
            :class="['m-mp-item', pasarTerpilihPublik.includes(pasar) ? 'checked' : '']"
          >
            <input
              type="checkbox"
              :checked="pasarTerpilihPublik.includes(pasar)"
              @change="togglePasarPublik(pasar)"
            />
            <span>{{ pasar }}</span>
          </label>
        </div>

        <div class="m-mp-footer">
          <button type="button" class="m-mp-apply-btn" @click="modalPilihPasarBuka = false">
            ✓ Terapkan ({{ pasarTerpilihPublik.length === 0 ? 'Semua Pasar' : `${pasarTerpilihPublik.length} Pasar` }})
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DETAIL KOMODITAS: PERBANDINGAN PASAR & GRAFIK RIWAYAT RIIL -->
    <ModalDetailHargaMobile
      :grup-komoditas="grupDetailDipilih"
      :pasar-terpilih-awal="pasarTerpilihPublik"
      @tutup="grupDetailDipilih = null"
    />

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
import ModalDetailHargaMobile from '../components/ModalDetailHargaMobile.vue';
import DaftarPasarMobile from '../components/DaftarPasarMobile.vue';
import AdminMasterPasarMobile from '../components/AdminMasterPasarMobile.vue';
import {
  analisisHargaMobileService,
  type GrupKomoditasAnalisis,
  type JenisUrutanHarga,
  type ModeTampilanHarga
} from '../services/AnalisisHargaService';
import {
  riwayatHargaMobileService,
  type CatatanRiwayatHarga
} from '../services/RiwayatHargaService';
import {
  masterDataMobileService,
  type ItemMasterKomoditas,
  type ItemMasterPasar
} from '../services/MasterDataService';
import { 
  gpmMobileService, 
  ItemAcaraGPM, 
  ItemPendaftarGPM, 
  HasilTiketGPM,
  StatistikGPM
} from '../services/GPMService';
import {
  jadwalGPMMobileService,
  type AcaraGPMTeranalisis,
  type ModeUrutanGPM
} from '../services/JadwalGPMService';
import { 
  penggunaMobileService, 
  PeranPengguna, 
  AkunPengguna, 
  MenuItemResmi 
} from '../services/PenggunaService';
import { 
  laporanMobileService, 
  DataTrenKomoditas, 
  ItemRekapGPM 
} from '../services/LaporanService';


// ─── LEAFLET MAP MOBILE GPM (100% DATA RIIL DB, TANPA PIN DUMMY) ──
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

    const dataAcara = daftarAcaraGPMPublikAktif.value;
    if (!dataAcara || dataAcara.length === 0) return;

    try {
      const pusatAwal = acaraGPMDipilih.value && dataAcara.some(a => a.id === acaraGPMDipilih.value?.id)
        ? acaraGPMDipilih.value
        : dataAcara[0];
      const centerLat = Number(pusatAwal?.latitude) || 1.482;
      const centerLng = Number(pusatAwal?.longitude) || 124.842;

      mapInstance = L.map(el, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false
      }).setView([centerLat, centerLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapInstance);

      markers = [];
      dataAcara.forEach((acara) => {
        const lat = Number(acara.latitude) || 1.4883;
        const lng = Number(acara.longitude) || 124.8436;
        const st = acara.statusOperasional;
        const warnaBg = st.kuotaPenuh ? '#64748b' : (st.sedangBerlangsung ? '#15803d' : '#8b1e1e');
        const labelRingkas = acara.nama_acara.replace(/^GPM\s+/i, '').slice(0, 18);

        const customPin = L.divIcon({
          className: 'gpm-pin-wrap',
          html: `<div style="background:${warnaBg};color:#ffffff;border-radius:20px;padding:4px 9px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;white-space:nowrap;">📍 ${labelRingkas} (${st.sisaKuota})</div>`,
          iconSize: [148, 30],
          iconAnchor: [74, 15]
        });

        const marker = L.marker([lat, lng], { icon: customPin }).addTo(mapInstance!);
        marker.bindPopup(
          `<b>${acara.nama_acara}</b><br>${acara.lokasi} (Kec. ${acara.kecamatan})<br>` +
          `<b>${st.label}</b> · Sisa ${st.sisaKuota}/${st.kuotaMaks}<br>` +
          `⏰ ${acara.jam_mulai}–${acara.jam_selesai} WITA`
        );
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
  pesanErrorGPM.value = '';
  try {
    const res = await gpmMobileService.ambilPendaftarAcara(acara.id);
    pendaftarGPMList.value = res.data || [];
  } catch (e) {}
  if (mapInstance) {
    const lat = Number(acara.latitude) || 1.4883;
    const lng = Number(acara.longitude) || 124.8436;
    try {
      mapInstance.setView([lat, lng], 14, { animate: true });
    } catch (e) {}
  }
};

const pilihAcaraGpmById = async (id: string) => {
  const target = daftarAcaraGPM.value.find(a => String(a.id) === String(id));
  if (target) {
    await pilihAcaraGpm(target);
  }
};

// Mode Tampilan Mobile: 'publik', 'login', 'petugas'
const tampilanMode = ref<'publik' | 'login' | 'petugas'>('publik');
const userAktif = ref<AkunPengguna | null>(penggunaMobileService.ambilUserSesi() || (hargaPanganMobileService.ambilUser() as any));

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

// State GPM Mobile (Publik & Petugas — 100% Data Riil Supabase + Realtime Auto-Close WITA)
const semuaAcaraGPM = ref<ItemAcaraGPM[]>([]);
const daftarAcaraGPM = ref<ItemAcaraGPM[]>([]);
const acaraGPMDipilih = ref<ItemAcaraGPM | null>(null);
const subTabGPMPublik = ref<'aktif' | 'riwayat'>('aktif');
const kecamatanFilterGPMPublik = ref('Semua');
const modeUrutanGPMPublik = ref<ModeUrutanGPM>('otomatis');
const posisiUserGPM = ref<{ lat: number; lng: number } | null>(null);
const sedangCariLokasiGPM = ref(false);
const waktuSekarangGPMMs = ref(Date.now());
const errorMuatGPMPublik = ref('');
const formAntreanGPM = ref({
  nik: '',
  nama_lengkap: '',
  nomor_telepon: ''
});
const sedangDaftarGPM = ref(false);
const pesanErrorGPM = ref('');
const tiketGPMHasil = ref<HasilTiketGPM | null>(null);

// Modal Tambah Pendaftar Manual Mobile (Di Tempat / Walk-In Tanpa HP — Tunduk Kuota & WITA)
const modalTambahManualMobile = ref({
  buka: false,
  acaraId: '',
  nama: '',
  nik: '',
  telepon: '',
  langsungHadir: true,
  sedangKirim: false,
  pesanError: ''
});

// Modal Atur / Tambah Kuota Acara GPM (Khusus Kepala Bidang & Superadmin)
const modalUbahKuotaMobile = ref<{
  buka: boolean;
  acara: ItemAcaraGPM | null;
  kuotaBaru: string;
  sedangSimpan: boolean;
  pesanError: string;
}>({
  buka: false,
  acara: null,
  kuotaBaru: '',
  sedangSimpan: false,
  pesanError: ''
});

// Preset Koordinat Titik GPM Populer Kota Manado untuk Formulir Mobile
const PRESET_LOKASI_MANADO_MOBILE = [
  { label: 'Lap. Sparta Tikala', lokasi: 'Lapangan Sparta Tikala', kecamatan: 'Tikala', lat: 1.4878, lng: 124.8427 },
  { label: 'Pasar Bersehati', lokasi: 'Pelataran Pasar Bersehati Karombasan', kecamatan: 'Wanea', lat: 1.4647, lng: 124.8415 },
  { label: 'Lap. Bantik Malalayang', lokasi: 'Lapangan Bantik Malalayang', kecamatan: 'Malalayang', lat: 1.4545, lng: 124.8124 },
  { label: 'Taman Berkat Boulevard', lokasi: 'Taman Berkat Jalan Piere Tendean', kecamatan: 'Sario', lat: 1.4776, lng: 124.8351 },
  { label: 'Kantor Kec. Mapanget', lokasi: 'Pelataran Kantor Kecamatan Mapanget', kecamatan: 'Mapanget', lat: 1.5208, lng: 124.9062 },
  { label: 'Pasar Tuminting', lokasi: 'Pelataran Pasar Tuminting', kecamatan: 'Tuminting', lat: 1.5056, lng: 124.8467 }
];

// Computed GPM Publik & Operasional Deterministik (via JadwalGPMMobileService OOP)
const semuaAcaraGPMAktif = computed<AcaraGPMTeranalisis[]>(() =>
  jadwalGPMMobileService.urutkanAcaraAktif(semuaAcaraGPM.value, {
    modeUrutan: 'otomatis',
    kecamatan: 'Semua',
    posisiUser: posisiUserGPM.value,
    waktuSekarangMs: waktuSekarangGPMMs.value
  })
);

const daftarAcaraGPMPublikAktif = computed<AcaraGPMTeranalisis[]>(() =>
  jadwalGPMMobileService.urutkanAcaraAktif(semuaAcaraGPM.value, {
    modeUrutan: modeUrutanGPMPublik.value,
    kecamatan: kecamatanFilterGPMPublik.value,
    posisiUser: posisiUserGPM.value,
    waktuSekarangMs: waktuSekarangGPMMs.value
  })
);

const semuaRiwayatGPMPublik = computed<AcaraGPMTeranalisis[]>(() =>
  jadwalGPMMobileService.urutkanRiwayatSelesai(semuaAcaraGPM.value, {
    kecamatan: 'Semua',
    waktuSekarangMs: waktuSekarangGPMMs.value
  })
);

const daftarRiwayatGPMPublik = computed<AcaraGPMTeranalisis[]>(() =>
  jadwalGPMMobileService.urutkanRiwayatSelesai(semuaAcaraGPM.value, {
    kecamatan: kecamatanFilterGPMPublik.value,
    waktuSekarangMs: waktuSekarangGPMMs.value
  })
);

const daftarKecamatanGPMPublik = computed<string[]>(() =>
  jadwalGPMMobileService.ekstrakKecamatanUnik(semuaAcaraGPM.value)
);

const ringkasanRiwayatGPMPublik = computed(() => {
  const list = daftarRiwayatGPMPublik.value;
  const totalKegiatan = list.length;
  const totalTerdaftar = list.reduce((acc, a) => acc + a.statusOperasional.terisi, 0);
  const totalHadir = list.reduce((acc, a) => acc + a.statusOperasional.totalHadir, 0);
  const rataKeramaian = totalKegiatan > 0
    ? Math.round(list.reduce((acc, a) => acc + a.statusOperasional.persenTerisi, 0) / totalKegiatan)
    : 0;
  return { totalKegiatan, totalTerdaftar, totalHadir, rataKeramaian };
});

const acaraGPMDipilihTeranalisis = computed<AcaraGPMTeranalisis | null>(() => {
  const kandidat = acaraGPMDipilih.value;
  if (!kandidat) {
    return daftarAcaraGPMPublikAktif.value[0] || null;
  }
  const segar = semuaAcaraGPM.value.find(a => String(a.id) === String(kandidat.id)) || kandidat;
  return {
    ...segar,
    statusOperasional: jadwalGPMMobileService.hitungStatusOperasional(segar, waktuSekarangGPMMs.value),
    jarakKm: posisiUserGPM.value
      ? jadwalGPMMobileService.hitungJarakKm(posisiUserGPM.value.lat, posisiUserGPM.value.lng, segar.latitude, segar.longitude)
      : null
  };
});

const statusAcaraDipilihMobile = computed(() =>
  acaraGPMDipilih.value
    ? jadwalGPMMobileService.hitungStatusOperasional(acaraGPMDipilih.value, waktuSekarangGPMMs.value)
    : null
);

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
  jam_selesai: '14:00',
  latitude: 1.4878,
  longitude: 124.8427,
  kuota_maksimal: 250,
  komoditas_tersedia: '',
  deskripsi: ''
});
const sedangSimpanGPMBaru = ref(false);
const dropdownGPMKomoditasBuka = ref(false);
const cariAntreanMobile = ref('');

const daftarKecamatanPilihanFormGPM = computed<string[]>(() => {
  if (daftarKecamatan.value.length > 0) return daftarKecamatan.value;
  return [
    'Wenang', 'Tikala', 'Wanea', 'Sario', 'Malalayang',
    'Tuminting', 'Singkil', 'Mapanget', 'Paal Dua', 'Bunaken', 'Bunaken Kepulauan'
  ];
});

const daftarKomoditasPilihanGPM = computed(() => {
  const dariMaster = daftarMasterKomoditas.value
    .map(k => (k.nama_komoditas ? k.nama_komoditas.trim() : ''))
    .filter(Boolean);
  const dariHarga = semuaKomoditas.value
    .map(k => (k.nama_komoditas ? k.nama_komoditas.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set([...dariMaster, ...dariHarga])).sort((a, b) => a.localeCompare(b, 'id-ID'));
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

// State Filter Kategori, Kelompok Induk, Sub-Varian & Pasar (Publik + Multi-Select & Sortir)
const kategoriAktif = ref('Semua');
const kelompokAktifPublik = ref('Semua');
const varianAktifPublik = ref('Semua');
const pasarAktif = ref('Semua');
const kataKunciPencarian = ref('');
const pasarTerpilihPublik = ref<string[]>([]);
const modalPilihPasarBuka = ref(false);
const urutanPublik = ref<JenisUrutanHarga>('prioritas');
const modeTampilanPublik = ref<ModeTampilanHarga>('ringkasan');
const grupDetailDipilih = ref<GrupKomoditasAnalisis | null>(null);

// State Data Riil Portal Publik (100% dari DB, bebas dummy) + Master Komoditas
const dataHargaPublikRiil = ref<ItemHargaPangan[]>([]);
const riwayatPublikTerbaru = ref<CatatanRiwayatHarga[]>([]);
const daftarMasterKomoditas = ref<ItemMasterKomoditas[]>([]);
const sedangMemuatPublik = ref(false);
const errorMuatPublik = ref('');

// State Data dari Backend / Supabase (untuk modul petugas)
const semuaKomoditas = ref<ItemHargaPangan[]>([]);
const daftarPasar = ref<string[]>([]);
const daftarPasarLengkap = ref<ItemMasterPasar[]>([]);
const statistik = ref<StatistikKategori>({
  Semua: 0,
  'Bahan Pokok': 0,
  Hewani: 0,
  Sayuran: 0,
  Buah: 0,
  Lainnya: 0
});

const petaMasterKomoditas = computed(() =>
  analisisHargaMobileService.buatPetaMasterKomoditas(daftarMasterKomoditas.value)
);

const grupKomoditasDropdownMobile = computed(() =>
  masterDataMobileService.kelompokkanKomoditasUntukDropdown(daftarMasterKomoditas.value)
);

const daftarKelompokIndukMasterMobile = computed(() =>
  Array.from(new Set(daftarMasterKomoditas.value.map((k) => k.kelompok_komoditas).filter(Boolean)))
);

const daftarPasarPublikDB = computed(() =>
  analisisHargaMobileService.ekstrakDaftarPasarUnik(dataHargaPublikRiil.value)
);

const infoPembaruanTerakhirPublik = computed(() =>
  analisisHargaMobileService.ambilPembaruanTerakhir(dataHargaPublikRiil.value)
);

const petaDeltaPublik = computed(() =>
  analisisHargaMobileService.buatPetaDeltaTerbaru(riwayatPublikTerbaru.value)
);

const statistikPublikRiil = computed(() =>
  analisisHargaMobileService.hitungStatistikKategori(
    dataHargaPublikRiil.value,
    pasarTerpilihPublik.value,
    modeTampilanPublik.value
  )
);

const daftarKelompokIndukPublik = computed(() =>
  analisisHargaMobileService.ekstrakKelompokInduk(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    petaMaster: petaMasterKomoditas.value
  })
);

const daftarSubVarianPublik = computed(() =>
  analisisHargaMobileService.ekstrakSubVarian(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pencarian: kataKunciPencarian.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    kelompokAktif: kelompokAktifPublik.value,
    petaMaster: petaMasterKomoditas.value
  })
);

const tampilkanBarSubVarianPublik = computed(() => {
  const aktifCariAtauKelompok =
    kelompokAktifPublik.value !== 'Semua' ||
    kataKunciPencarian.value.trim() !== '' ||
    varianAktifPublik.value !== 'Semua';
  return (
    aktifCariAtauKelompok &&
    (daftarSubVarianPublik.value.length >= 2 ||
      (varianAktifPublik.value !== 'Semua' && daftarSubVarianPublik.value.length >= 1))
  );
});

const daftarRingkasanPublik = computed(() =>
  analisisHargaMobileService.kelompokkanPerKomoditas(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pencarian: kataKunciPencarian.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    kelompokAktif: kelompokAktifPublik.value,
    varianAktif: varianAktifPublik.value,
    urutkan: urutanPublik.value,
    petaDelta: petaDeltaPublik.value,
    petaMaster: petaMasterKomoditas.value
  })
);

const matriksPerbandinganPublik = computed(() =>
  analisisHargaMobileService.susunMatriksPerbandinganPasar(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pencarian: kataKunciPencarian.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    kelompokAktif: kelompokAktifPublik.value,
    varianAktif: varianAktifPublik.value,
    urutkan: urutanPublik.value,
    petaDelta: petaDeltaPublik.value,
    petaMaster: petaMasterKomoditas.value
  })
);

const daftarSemuaPasarPublik = computed(() =>
  analisisHargaMobileService.susunDaftarSemuaPasar(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pencarian: kataKunciPencarian.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    kelompokAktif: kelompokAktifPublik.value,
    varianAktif: varianAktifPublik.value,
    urutkan: urutanPublik.value,
    petaDelta: petaDeltaPublik.value,
    petaMaster: petaMasterKomoditas.value
  })
);

const totalTampilPublik = computed(() => {
  if (modeTampilanPublik.value === 'semua-pasar') return daftarSemuaPasarPublik.value.length;
  if (modeTampilanPublik.value === 'matriks') return matriksPerbandinganPublik.value.daftarBarisMatriks.length;
  return daftarRingkasanPublik.value.length;
});

const labelTombolPasarPublik = computed(() => {
  if (pasarTerpilihPublik.value.length === 0) return `Semua Pasar (${daftarPasarPublikDB.value.length})`;
  if (pasarTerpilihPublik.value.length === 1) return pasarTerpilihPublik.value[0];
  return `${pasarTerpilihPublik.value.length} Pasar Dipilih`;
});

const togglePasarPublik = (namaPasar: string) => {
  if (pasarTerpilihPublik.value.includes(namaPasar)) {
    pasarTerpilihPublik.value = pasarTerpilihPublik.value.filter((p) => p !== namaPasar);
  } else {
    pasarTerpilihPublik.value = [...pasarTerpilihPublik.value, namaPasar];
  }
};

const pilihKelompokIndukPublik = (kelompok: string) => {
  kelompokAktifPublik.value = kelompok;
  varianAktifPublik.value = 'Semua';
};

const resetFilterPublik = () => {
  kategoriAktif.value = 'Semua';
  kelompokAktifPublik.value = 'Semua';
  varianAktifPublik.value = 'Semua';
  kataKunciPencarian.value = '';
  pasarTerpilihPublik.value = [];
  urutanPublik.value = 'prioritas';
};

// ─── ROLE-BASED ACCESS CONTROL (RBAC) & MULTI-USER STATE MOBILE ───
const peranAktif = computed<PeranPengguna>(() => {
  return penggunaMobileService.normalisasiPeran(userAktif.value?.peran);
});

const isSuperadmin = computed(() => peranAktif.value === 'Superadmin');
const isAdmin = computed(() => peranAktif.value === 'Admin' || isSuperadmin.value);
const isKabid = computed(() => peranAktif.value === 'Kabid' || isSuperadmin.value);
const isStaf = computed(() => peranAktif.value === 'Staf' || isSuperadmin.value);
const isKadis = computed(() => peranAktif.value === 'Kadis' || isSuperadmin.value);

const formatPeranLengkap = (peran?: string | null) => {
  const p = penggunaMobileService.normalisasiPeran(peran);
  if (p === 'Superadmin') return 'Superadmin';
  if (p === 'Admin') return 'Admin';
  if (p === 'Kabid') return 'Kepala Bidang';
  if (p === 'Kadis') return 'Kepala Dinas';
  return 'Staf Pangan';
};

const daftarMenuTersedia = computed<MenuItemResmi[]>(() => {
  return penggunaMobileService.ambilDaftarMenu(peranAktif.value);
});

// Menu Petugas yang sedang aktif (default: 'dashboard')
const menuPetugas = ref<string>('dashboard');

const gantiMenuPetugas = (idMenu: string) => {
  menuPetugas.value = idMenu;
  if (idMenu === 'kelola-user' || idMenu === 'master-data') {
    muatSemuaPengguna();
  }
  if (idMenu === 'grafik-pangan') {
    muatTrenKadis();
  }
  if (idMenu === 'laporan-gpm') {
    muatRekapGPMKadis();
  }
};

const statsDashboard = ref<StatistikDashboardMobile>({
  harga_ditetapkan: 0,
  draft_harga: 0,
  gpm_terjadwal: 0,
  gpm_selesai: 0
});
const pesanSuksesMobile = ref('');

// ID Komoditas sedang diedit
const idDiedit = ref<string | null>(null);

// Form Penetapan Harga Petugas Mobile (Komoditas & Satuan terkunci dari Master Admin)
const formPenetapan = ref({
  nama_komoditas: '',
  kategori: 'Bahan Pokok',
  satuan: '1 KG',
  harga: '',
  nama_pasar: 'Pasar Tradisional Bahu',
  status: 'Terbit',
  prioritas_tampil: 50
});

// ─── ADMIN: KELOLA PENGGUNA & MASTER DATA ──────────────────────────
const daftarSemuaPengguna = ref<AkunPengguna[]>([]);
const modalTambahUserBuka = ref(false);
const formPenggunaBaru = ref({
  nama: '',
  username: '',
  email: '',
  kata_sandi: '',
  peran: 'Staf' as PeranPengguna,
  bidang: 'Bidang Cadangan dan Distribusi Pangan'
});

const modalResetSandiBuka = ref(false);
const targetResetUser = ref<AkunPengguna | null>(null);
const inputSandiResetBaru = ref('');
const konfirmasiSandiResetBaru = ref('');

const modalUbahUsernameBuka = ref(false);
const targetUbahUsername = ref<AkunPengguna | null>(null);
const inputUsernameBaru = ref('');

const modalUbahEmailBuka = ref(false);
const targetUbahEmail = ref<AkunPengguna | null>(null);
const inputEmailBaru = ref('');

const formKomoditasMasterMobile = ref({
  kelompok_komoditas: '',
  nama_komoditas: '',
  kategori: 'Bahan Pokok',
  satuan_bawaan: '1 KG',
  kata_kunci: '',
  prioritas_tampil: 50
});
const inputSatuanBaru = ref('');
const daftarSatuan = ref<string[]>(['1 KG', '1 Liter']);
const inputPasarBaru = ref('');
const inputKecamatanBaru = ref('');
const daftarKecamatan = ref<string[]>([]);

// ─── KABID: VERIFIKASI HARGA & LAPORAN ────────────────────────────
const filterStatusVerif = ref<'Semua' | 'Draft' | 'Terbit'>('Draft');
const modalEditKabidBuka = ref(false);
const formEditKabid = ref({
  id: '',
  nama_komoditas: '',
  kategori: 'Bahan Pokok',
  satuan: '1 KG',
  harga: '',
  nama_pasar: '',
  status: 'Terbit',
  prioritas_tampil: 50
});

// ─── KADIS: GRAFIK PANGAN & LAPORAN EKSEKUTIF GPM (100% DATA RIIL) ──
const komoditasTren = ref('');
const periodeTren = ref('7hari');
const pasarTren = ref('Semua');
const dataTren = ref<DataTrenKomoditas | null>(null);
const sedangMuatTrenMobile = ref(false);
const daftarRekapGPMKadis = ref<ItemRekapGPM[]>([]);

// State Modal Detail Pendaftar Warga (Mobile)
const modalDetailWargaMobile = ref<{ buka: boolean; acara: any; pencarian: string }>({
  buka: false,
  acara: null,
  pencarian: ''
});
const modalNotifMobileBuka = ref(false);
const inputFotoMobileRef = ref<HTMLInputElement | null>(null);

interface NotifMobileItem {
  id: string;
  judul: string;
  pesan: string;
  waktu: string;
  target?: string;
}
const daftarNotifMobile = ref<NotifMobileItem[]>([]);

// Computed Komoditas & Pasar Lengkap untuk Grafik Kadis (100% dari Database Supabase)
const daftarKomoditasTersediaKadis = computed(() => {
  return Array.from(new Set(semuaKomoditas.value.map((i: any) => i.nama_komoditas).filter(Boolean)));
});
const daftarPasarTersediaKadis = computed(() => {
  return Array.from(new Set([
    ...daftarPasar.value,
    ...semuaKomoditas.value.map((i: any) => i.nama_pasar).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, 'id-ID'));
});

// Computed Pendaftar Tersaring untuk Modal Detail Warga Mobile
const pendaftarAcaraMobileTersaring = computed(() => {
  if (!modalDetailWargaMobile.value.acara) return [];
  const acaraId = String(modalDetailWargaMobile.value.acara.id);
  const list = detailRiwayatPendaftar.value[acaraId]
    ? detailRiwayatPendaftar.value[acaraId]
    : pendaftarGPMList.value.filter(p => String(p.acara_id) === acaraId);
  const q = modalDetailWargaMobile.value.pencarian.trim().toLowerCase();
  if (!q) return list;
  return list.filter(p => {
    const parsed = gpmMobileService.parseDataPendaftar(p);
    const nama = (parsed.nama_bersih || p.nama_pendaftar || '').toLowerCase();
    const nik = (parsed.nik || '').toLowerCase();
    const telp = (parsed.nomor_telepon || '').toLowerCase();
    return nama.includes(q) || nik.includes(q) || telp.includes(q);
  });
});

// Computed Statistik Ringkasan Eksekutif GPM Kadis
const totalKuotaGPMKadis = computed(() => {
  return daftarRekapGPMKadis.value.reduce((acc, r) => acc + (r.target_kuota || 0), 0);
});
const totalTerlayaniGPMKadis = computed(() => {
  return daftarRekapGPMKadis.value.reduce((acc, r) => acc + (r.terlayani || 0), 0);
});
const persentaseSerapanKadis = computed(() => {
  if (totalKuotaGPMKadis.value === 0) return '0.0';
  return ((totalTerlayaniGPMKadis.value / totalKuotaGPMKadis.value) * 100).toFixed(1);
});

// ─── PROFIL MANDIRI & GANTI KATA SANDI PRIBADI (SEMUA ROLE) ────────
const modalProfilBuka = ref(false);
const formSandiMandiri = ref({
  sandiLama: '',
  sandiBaru: '',
  konfirmasi: ''
});
const inputFotoProfilUrl = ref('');

// State Login Mobile (Gambar 4 — Tanpa Pre-Fill / Hint Akun Default)
const loginInput = ref({
  email: '',
  password: '',
  ingatSaya: false // Default: Centang MATI sesuai instruksi pimpinan
});
const lihatPassword = ref(false);
const sedangLogin = ref(false);

// [CEK-06 FIX] Brute-force protection — maks 5 percobaan, lockout 5 menit
const MAKS_PERCOBAAN_LOGIN = 5;
const DURASI_LOCKOUT_LOGIN_MS = 5 * 60 * 1000;
const KUNCI_LOCKOUT_MOBILE = 'sipatokaan_mobile_lockout';
const sisaWaktuLockoutMobile = ref(0);
let timerLockoutMobile: ReturnType<typeof setInterval> | null = null;

const bacaStatusLockoutMobile = () => {
  try {
    const raw = sessionStorage.getItem(KUNCI_LOCKOUT_MOBILE);
    if (!raw) return { percobaan: 0, lockoutSampai: null as number | null };
    return JSON.parse(raw);
  } catch { return { percobaan: 0, lockoutSampai: null as number | null }; }
};
const simpanStatusLockoutMobile = (data: { percobaan: number; lockoutSampai: number | null }) => {
  sessionStorage.setItem(KUNCI_LOCKOUT_MOBILE, JSON.stringify(data));
};
const mulaiHitungMundurLockout = (sampai: number) => {
  if (timerLockoutMobile) clearInterval(timerLockoutMobile);
  timerLockoutMobile = setInterval(() => {
    const sisa = Math.ceil((sampai - Date.now()) / 1000);
    if (sisa <= 0) {
      sisaWaktuLockoutMobile.value = 0;
      simpanStatusLockoutMobile({ percobaan: 0, lockoutSampai: null });
      if (timerLockoutMobile) clearInterval(timerLockoutMobile);
    } else {
      sisaWaktuLockoutMobile.value = sisa;
    }
  }, 1000);
};

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

watch([tabAktif, subTabGPMPublik, tiketGPMHasil], ([tab, sub, tiket]) => {
  if (tab === 'gpm' && sub === 'aktif' && !tiket) {
    setTimeout(inisialisasiPetaGpm, 220);
  }
});

watch(daftarAcaraGPMPublikAktif, (daftarBaru) => {
  if (daftarBaru.length > 0 && (!acaraGPMDipilih.value || !daftarBaru.some(a => a.id === acaraGPMDipilih.value?.id))) {
    acaraGPMDipilih.value = daftarBaru[0];
  }
  if (tabAktif.value === 'gpm' && subTabGPMPublik.value === 'aktif' && !tiketGPMHasil.value) {
    inisialisasiPetaGpm();
  }
});

onMounted(async () => {
  await cekKoneksiServer(false);
  await muatData();
  await muatDataGPM();
  await muatStatsDashboard();

  if (userAktif.value) {
    const menus = penggunaMobileService.ambilDaftarMenu(userAktif.value.peran);
    if (!menus.some(m => m.id === menuPetugas.value)) {
      menuPetugas.value = menus[0]?.id || 'dashboard';
    }
    muatSemuaPengguna();
    muatTrenKadis();
    muatRekapGPMKadis();
    muatNotifikasiDinamisMobile();
  }

  if (tabAktif.value === 'gpm' && subTabGPMPublik.value === 'aktif') {
    setTimeout(inisialisasiPetaGpm, 300);
  }

  // Sinkronisasi otomatis saat HP kembali dibuka (Focus)
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      waktuSekarangGPMMs.value = Date.now();
      muatData();
      muatDataGPM();
      muatStatsDashboard();
    });
  }

  // Polling berkala setiap 15 detik: sinkron data harga, auto-close waktu WITA & status kuota GPM
  setInterval(() => {
    waktuSekarangGPMMs.value = Date.now();
    muatData();
    muatDataGPM();
    muatStatsDashboard();
  }, 15000);

});

// ===================== METHOD GPM MOBILE =====================
const muatDataGPM = async () => {
  errorMuatGPMPublik.value = '';
  try {
    const semuaData = await gpmMobileService.ambilSemuaAcara('Semua');
    semuaAcaraGPM.value = Array.isArray(semuaData) ? semuaData : [];
    waktuSekarangGPMMs.value = Date.now();

    const dataAktif = jadwalGPMMobileService.urutkanAcaraAktif(semuaAcaraGPM.value, {
      modeUrutan: 'otomatis',
      kecamatan: 'Semua',
      posisiUser: posisiUserGPM.value,
      waktuSekarangMs: waktuSekarangGPMMs.value
    });
    const dataRiwayat = jadwalGPMMobileService.urutkanRiwayatSelesai(semuaAcaraGPM.value, {
      kecamatan: 'Semua',
      waktuSekarangMs: waktuSekarangGPMMs.value
    });

    daftarAcaraGPM.value = dataAktif;
    daftarRiwayatGPM.value = dataRiwayat;

    if (dataAktif.length > 0) {
      const idSebelumnya = acaraGPMDipilih.value?.id;
      const cocok = idSebelumnya ? dataAktif.find(a => String(a.id) === String(idSebelumnya)) : null;
      acaraGPMDipilih.value = cocok || dataAktif[0];

      const res = await gpmMobileService.ambilPendaftarAcara(acaraGPMDipilih.value.id);
      pendaftarGPMList.value = res.data || [];
    } else {
      acaraGPMDipilih.value = null;
      pendaftarGPMList.value = [];
    }

    muatStatsDashboard();
    if (userAktif.value) {
      muatRekapGPMKadis();
      muatNotifikasiDinamisMobile();
    }
  } catch (err: any) {
    console.error('Error muat GPM:', err);
    errorMuatGPMPublik.value = err?.message || 'Gagal memuat jadwal GPM dari basis data Supabase.';
  }
};

// Deteksi GPS Lokasi Pengguna untuk Urutan "Terdekat"
const cariLokasiUserGPM = () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    alert('Perangkat atau browser Anda tidak mendukung layanan GPS.');
    return;
  }
  sedangCariLokasiGPM.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      posisiUserGPM.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      modeUrutanGPMPublik.value = 'terdekat';
      sedangCariLokasiGPM.value = false;
    },
    (err) => {
      sedangCariLokasiGPM.value = false;
      alert('Gagal mengakses lokasi GPS: ' + (err.message || 'Pastikan izin lokasi diaktifkan.'));
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
};

// Terapkan Preset Koordinat Peta Kota Manado pada Form Tambah Acara Mobile
const terapkanPresetLokasiMobile = (preset: { label: string; lokasi: string; kecamatan: string; lat: number; lng: number }) => {
  if (!formGPMBaru.value.lokasi.trim()) {
    formGPMBaru.value.lokasi = preset.lokasi;
  }
  if (daftarKecamatanPilihanFormGPM.value.includes(preset.kecamatan)) {
    formGPMBaru.value.kecamatan = preset.kecamatan;
  }
  formGPMBaru.value.latitude = preset.lat;
  formGPMBaru.value.longitude = preset.lng;
};

// Buka & Simpan Modal Atur / Tambah Kuota (Khusus Kabid & Superadmin)
const bukaModalUbahKuotaMobile = (acara: ItemAcaraGPM) => {
  if (!isKabid.value) {
    alert('Hanya Kepala Bidang / Superadmin yang berhak mengubah kuota kegiatan GPM.');
    return;
  }
  modalUbahKuotaMobile.value = {
    buka: true,
    acara,
    kuotaBaru: String(acara.kuota_maksimal || 1),
    sedangSimpan: false,
    pesanError: ''
  };
};

const tambahCepatKuotaMobile = (tambahan: number) => {
  const dasar = parseInt(modalUbahKuotaMobile.value.kuotaBaru || String(modalUbahKuotaMobile.value.acara?.kuota_maksimal || 0), 10) || 0;
  modalUbahKuotaMobile.value.kuotaBaru = String(dasar + tambahan);
};

const simpanUbahKuotaMobile = async () => {
  const m = modalUbahKuotaMobile.value;
  if (!m.acara) return;
  const angka = parseInt(String(m.kuotaBaru || 0), 10);
  const minimal = Math.max(1, Number(m.acara.antrean_terisi) || 0);
  if (!Number.isFinite(angka) || angka < minimal) {
    m.pesanError = `Kuota baru minimal ${minimal} (tidak boleh lebih kecil dari pendaftar saat ini).`;
    return;
  }

  m.sedangSimpan = true;
  m.pesanError = '';
  try {
    await gpmMobileService.ubahKuotaAcara(m.acara.id, angka);
    const nama = m.acara.nama_acara;
    m.buka = false;
    pesanSuksesMobile.value = `✅ Kuota "${nama}" berhasil diperbarui menjadi ${angka} antrean.`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4500);
    await muatDataGPM();
  } catch (err: any) {
    m.pesanError = err?.message || 'Gagal memperbarui kuota acara GPM.';
  } finally {
    m.sedangSimpan = false;
  }
};

// Selesaikan Lebih Awal Kegiatan GPM (Khusus Kepala Bidang & Superadmin)
const selesaikanAcaraMobile = async () => {
  if (!isKabid.value) {
    alert('Hanya Kepala Bidang yang memiliki hak akses untuk menyelesaikan kegiatan GPM.');
    return;
  }
  if (!acaraGPMDipilih.value) return;
  const nama = acaraGPMDipilih.value.nama_acara;
  const ok = confirm(
    `Konfirmasi Selesaikan Lebih Awal:\n\nApakah Anda yakin ingin menutup "${nama}" sebelum jam selesai WITA?\n\n- Kegiatan akan diarsipkan ke Riwayat GPM (Publik & Petugas).\n- Pendaftaran dan verifikasi tiket QR otomatis dikunci.`
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

// Hapus Riwayat GPM (Khusus Kepala Bidang & Superadmin)
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
  if (baru === 'gpm' || baru === 'kelola-gpm' || baru === 'cek-gpm') {
    await muatDataGPM();
  }
  if (baru === 'verif-harga' || baru === 'dashboard' || baru === 'input-harga' || baru === 'laporan') {
    await muatData();
    await muatStatsDashboard();
  }
});

watch(subMenuPetugasGPM, async (baru) => {
  if (baru !== 'scan' && kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
  }
  if (baru === 'antrean' || baru === 'riwayat') {
    await muatDataGPM();
  }
});

const ambilNomorAntreanMobile = async () => {
  const targetAcara = acaraGPMDipilihTeranalisis.value;
  if (!targetAcara) return;

  if (targetAcara.statusOperasional.sudahBerakhir) {
    pesanErrorGPM.value = `Pendaftaran ditutup: Kegiatan GPM telah berakhir pada pukul ${targetAcara.jam_selesai} WITA.`;
    return;
  }
  if (targetAcara.statusOperasional.kuotaPenuh) {
    pesanErrorGPM.value = `Kuota antrean telah habis (${targetAcara.statusOperasional.terisi}/${targetAcara.statusOperasional.kuotaMaks}).`;
    return;
  }

  // 1. Validasi NIK 16 Digit (Wajib)
  const nik = (formAntreanGPM.value.nik || '').replace(/[^0-9]/g, '').trim();
  if (!nik) {
    pesanErrorGPM.value = 'Nomor Induk Kependudukan (NIK) wajib diisi!';
    return;
  }
  if (nik.length !== 16) {
    pesanErrorGPM.value = `NIK harus tepat 16 digit angka! (Saat ini: ${nik.length} digit)`;
    return;
  }

  // 2. Validasi Nama Lengkap: Hanya huruf dan spasi, min 3 karakter
  const nama = formAntreanGPM.value.nama_lengkap.trim();
  if (!nama) {
    pesanErrorGPM.value = 'Nama lengkap wajib diisi!';
    return;
  }
  const regexNama = /^[a-zA-Z\s'.]+$/;
  if (!regexNama.test(nama)) {
    pesanErrorGPM.value = 'Nama lengkap hanya boleh berisi huruf dan spasi (tanpa angka atau simbol)!';
    return;
  }
  if (nama.length < 3) {
    pesanErrorGPM.value = 'Nama lengkap minimal 3 karakter!';
    return;
  }

  // 3. Validasi Nomor Telepon (Opsional)
  const telp = formAntreanGPM.value.nomor_telepon.trim();
  if (telp) {
    const regexTelp = /^[0-9]+$/;
    if (!regexTelp.test(telp)) {
      pesanErrorGPM.value = 'Nomor telepon hanya boleh berisi angka!';
      return;
    }
    if (telp.length < 10 || telp.length > 15) {
      pesanErrorGPM.value = 'Nomor telepon harus antara 10-15 digit jika diisi!';
      return;
    }
  }

  sedangDaftarGPM.value = true;
  pesanErrorGPM.value = '';
  try {
    const hasil = await gpmMobileService.ambilNomorAntrean(
      targetAcara.id,
      nama,
      telp || '-',
      nik,
      'Daring'
    );
    tiketGPMHasil.value = hasil;
    formAntreanGPM.value.nik = '';
    formAntreanGPM.value.nama_lengkap = '';
    formAntreanGPM.value.nomor_telepon = '';
    await muatDataGPM();
  } catch (err: any) {
    pesanErrorGPM.value = err.message || 'Gagal mendaftar antrean';
    await muatDataGPM();
  } finally {
    sedangDaftarGPM.value = false;
  }
};

// Handlers Pendaftaran Manual di Lokasi GPM untuk Petugas (Walk-In Tanpa HP — Tunduk Kuota & WITA)
const bukaModalManualMobile = () => {
  if (daftarAcaraGPM.value.length === 0) {
    alert('Tidak ada kegiatan GPM aktif yang dapat menerima pendaftaran manual saat ini.');
    return;
  }
  modalTambahManualMobile.value = {
    buka: true,
    acaraId: acaraGPMDipilih.value?.id || (daftarAcaraGPM.value[0]?.id ? String(daftarAcaraGPM.value[0].id) : ''),
    nama: '',
    nik: '',
    telepon: '',
    langsungHadir: true,
    sedangKirim: false,
    pesanError: ''
  };
};

const simpanPendaftarManualMobile = async () => {
  const m = modalTambahManualMobile.value;
  if (!m.acaraId) {
    m.pesanError = 'Silakan pilih kegiatan GPM!';
    return;
  }
  const nik = (m.nik || '').replace(/[^0-9]/g, '').trim();
  if (!nik) {
    m.pesanError = 'Nomor Induk Kependudukan (NIK) wajib diisi!';
    return;
  }
  if (nik.length !== 16) {
    m.pesanError = `NIK harus tepat 16 digit angka! (Saat ini: ${nik.length} digit)`;
    return;
  }
  const nama = (m.nama || '').trim();
  if (!nama || nama.length < 3) {
    m.pesanError = 'Nama lengkap wajib diisi minimal 3 karakter!';
    return;
  }
  if (!/^[a-zA-Z\s'.]+$/.test(nama)) {
    m.pesanError = 'Nama hanya boleh berupa huruf dan spasi!';
    return;
  }
  const telp = (m.telepon || '').trim();
  if (telp) {
    if (!/^[0-9]+$/.test(telp) || telp.length < 10 || telp.length > 15) {
      m.pesanError = 'Nomor telepon harus antara 10-15 digit jika diisi!';
      return;
    }
  }

  m.sedangKirim = true;
  m.pesanError = '';
  try {
    const res = await gpmMobileService.tambahPendaftarManual(
      m.acaraId,
      nama,
      telp || '-',
      nik,
      m.langsungHadir
    );
    m.buka = false;
    pesanSuksesMobile.value = `Warga "${nama}" berhasil didaftarkan langsung (Antrean #${res.tiket.nomor_antrean})${m.langsungHadir ? ' dan otomatis diverifikasi Hadir!' : '!'}`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4500);
    await muatDataGPM();
  } catch (err: any) {
    m.pesanError = err.message || 'Gagal mendaftarkan warga secara manual.';
  } finally {
    m.sedangKirim = false;
  }
};

const pindaiBarcodeMobile = async (barcodeOverride?: string) => {
  const code = barcodeOverride || inputBarcodePetugas.value;
  if (!code.trim()) {
    pesanScanErrorPetugas.value = 'Silakan masukan kode tiket!';
    return;
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

const verifikasiKehadiranMobile = async (statusTarget: 'Hadir' | 'Menunggu' = 'Hadir') => {
  if (!hasilScanPetugas.value) return;
  try {
    await gpmMobileService.verifikasiKehadiran(hasilScanPetugas.value.kode_barcode, statusTarget);
    hasilScanPetugas.value.status_kehadiran = statusTarget;
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal verifikasi: ' + (err.message || 'Terjadi kesalahan'));
  }
};

const ubahStatusPendaftarDiListMobile = async (item: ItemPendaftarGPM) => {
  const statusTarget: 'Hadir' | 'Menunggu' = item.status_kehadiran === 'Hadir' ? 'Menunggu' : 'Hadir';
  try {
    await gpmMobileService.verifikasiKehadiran(item.kode_barcode, statusTarget);
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal mengubah status kehadiran: ' + (err.message || 'Terjadi kesalahan'));
  }
};

const simpanAcaraGPMBaruMobile = async () => {
  if (!formGPMBaru.value.nama_acara.trim() || !formGPMBaru.value.lokasi.trim()) {
    alert('Nama acara dan lokasi wajib diisi!');
    return;
  }
  sedangSimpanGPMBaru.value = true;
  try {
    await gpmMobileService.tambahAcara(formGPMBaru.value);
    alert('✅ Acara GPM baru berhasil diterbitkan ke Supabase & Peta Publik!');
    formGPMBaru.value = {
      nama_acara: '',
      lokasi: '',
      kecamatan: daftarKecamatanPilihanFormGPM.value[0] || 'Wenang',
      tanggal: new Date().toISOString().split('T')[0],
      jam_mulai: '08:00',
      jam_selesai: '14:00',
      latitude: 1.4878,
      longitude: 124.8427,
      kuota_maksimal: 250,
      komoditas_tersedia: '',
      deskripsi: ''
    };
    subMenuPetugasGPM.value = 'antrean';
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal menambah acara: ' + (err.message || 'Periksa kembali jadwal & kuota.'));
  } finally {
    sedangSimpanGPMBaru.value = false;
  }
};

const muatData = async () => {
  sedangMemuatPublik.value = true;
  errorMuatPublik.value = '';
  try {
    // 1. Muat data publik TERBIT 100% riil dari basis data (tanpa data dummy) + ringkasan riwayat
    try {
      const [publikTerbit, hasilRiwayat] = await Promise.all([
        hargaPanganMobileService.ambilPublikTerbit(),
        riwayatHargaMobileService.ambilRiwayatPublikTerbaru(400)
      ]);
      dataHargaPublikRiil.value = Array.isArray(publikTerbit) ? publikTerbit : [];
      riwayatPublikTerbaru.value = Array.isArray(hasilRiwayat?.data) ? hasilRiwayat.data : [];
    } catch (errPub: any) {
      errorMuatPublik.value = errPub?.message || 'Gagal terhubung ke basis data harga pangan.';
      dataHargaPublikRiil.value = [];
    }

    // 2. Ambil seluruh data komoditas pangan (Terbit + Draft) untuk panel petugas/verifikasi Kabid & Superadmin
    const data = await hargaPanganMobileService.ambilSemua();
    semuaKomoditas.value = Array.isArray(data) ? data : [];

    statistik.value = statistikPublikRiil.value;

    // 3. Muat Master Data (Komoditas Terstruktur, Satuan terkunci per 1, Pasar lengkap + titik peta, Kecamatan) langsung dari Supabase
    const [komoditasMaster, satuanMaster, pasarLengkapMaster, kecMaster] = await Promise.all([
      masterDataMobileService.ambilDaftarKomoditas().catch(() => []),
      masterDataMobileService.ambilDaftarSatuan(),
      masterDataMobileService.ambilDaftarPasarLengkap().catch(() => []),
      masterDataMobileService.ambilDaftarKecamatan()
    ]);
    daftarMasterKomoditas.value = Array.isArray(komoditasMaster) ? komoditasMaster : [];
    daftarSatuan.value = satuanMaster;
    daftarPasarLengkap.value = Array.isArray(pasarLengkapMaster) ? pasarLengkapMaster : [];
    const namaPasarMaster = daftarPasarLengkap.value.map((p) => p.nama_pasar);
    daftarPasar.value = namaPasarMaster.length > 0 ? namaPasarMaster : daftarPasarPublikDB.value;
    daftarKecamatan.value = kecMaster;
    if (satuanMaster.length > 0 && !formPenetapan.value.satuan) {
      formPenetapan.value.satuan = satuanMaster[0];
    }
    if (daftarPasar.value.length > 0 && !daftarPasar.value.includes(formPenetapan.value.nama_pasar)) {
      formPenetapan.value.nama_pasar = daftarPasar.value[0];
    }
    if (daftarKecamatan.value.length > 0 && !daftarKecamatan.value.includes(formGPMBaru.value.kecamatan)) {
      formGPMBaru.value.kecamatan = daftarKecamatan.value[0];
    }
  } catch (error) {
    console.error('Error saat muat data mobile:', error);
  } finally {
    sedangMemuatPublik.value = false;
  }
};

const muatStatsDashboard = async () => {
  try {
    const list = semuaKomoditas.value || [];
    const terbit = list.filter(i => (i.status || 'Terbit').toLowerCase() === 'terbit').length;
    const draft = list.filter(i => (i.status || '').toLowerCase() === 'draft').length;

    statsDashboard.value = {
      harga_ditetapkan: terbit,
      draft_harga: draft,
      gpm_terjadwal: semuaAcaraGPMAktif.value.length,
      gpm_selesai: semuaRiwayatGPMPublik.value.length
    };
  } catch (e) {
    console.error(e);
  }
};

const pilihKategori = (kategori: string) => {
  kategoriAktif.value = kategori;
  kelompokAktifPublik.value = 'Semua';
  varianAktifPublik.value = 'Semua';
};

const resetPencarian = () => {
  kataKunciPencarian.value = '';
  varianAktifPublik.value = 'Semua';
};

const filterDataLokal = () => {
  // Tersaring otomatis & reaktif via komoditasTerfilter
};

// Filter data komoditas publik (hanya yang berstatus Terbit dan cocok dengan filter pencarian/kategori warga)
const komoditasTerfilter = computed(() => {
  let list = semuaKomoditas.value.filter(item => (item.status || 'Terbit').toLowerCase() !== 'draft');
  if (kategoriAktif.value && kategoriAktif.value !== 'Semua') {
    list = list.filter(item => (item.kategori || '').toLowerCase() === kategoriAktif.value.toLowerCase());
  }
  if (pasarAktif.value && pasarAktif.value !== 'Semua') {
    list = list.filter(item => (item.nama_pasar || '').toLowerCase() === pasarAktif.value.toLowerCase());
  }
  if (kataKunciPencarian.value && kataKunciPencarian.value.trim() !== '') {
    const k = kataKunciPencarian.value.toLowerCase().trim();
    list = list.filter(item =>
      (item.nama_komoditas || '').toLowerCase().includes(k) ||
      (item.nama_pasar || '').toLowerCase().includes(k)
    );
  }
  return list;
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
  // [CEK-06] Cek lockout sebelum proses login
  const statusLockout = bacaStatusLockoutMobile();
  if (statusLockout.lockoutSampai && Date.now() < statusLockout.lockoutSampai) {
    const sisa = Math.ceil((statusLockout.lockoutSampai - Date.now()) / 1000);
    sisaWaktuLockoutMobile.value = sisa;
    mulaiHitungMundurLockout(statusLockout.lockoutSampai);
    alert(`🔒 Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(sisa / 60)} menit.`);
    return;
  }

  sedangLogin.value = true;
  try {
    const hasil = await hargaPanganMobileService.login(loginInput.value.email, loginInput.value.password, loginInput.value.ingatSaya);
    // Reset lockout saat berhasil
    simpanStatusLockoutMobile({ percobaan: 0, lockoutSampai: null });
    sisaWaktuLockoutMobile.value = 0;
    userAktif.value = hasil.pengguna;
    tampilanMode.value = 'petugas';

    // Arahkan ke menu default pertama sesuai hak akses peran pengguna
    const menus = penggunaMobileService.ambilDaftarMenu(hasil.pengguna?.peran);
    menuPetugas.value = menus[0]?.id || 'dashboard';

    await muatData();
    await muatStatsDashboard();
    await muatDataGPM();
    muatSemuaPengguna();
    muatTrenKadis();
    muatRekapGPMKadis();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    // [CEK-06] Tambah hitungan percobaan gagal
    const st = bacaStatusLockoutMobile();
    const percobaan = (st.percobaan || 0) + 1;
    if (percobaan >= MAKS_PERCOBAAN_LOGIN) {
      const lockoutSampai = Date.now() + DURASI_LOCKOUT_LOGIN_MS;
      simpanStatusLockoutMobile({ percobaan, lockoutSampai });
      sisaWaktuLockoutMobile.value = Math.ceil(DURASI_LOCKOUT_LOGIN_MS / 1000);
      mulaiHitungMundurLockout(lockoutSampai);
      alert(`🔒 Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 5 menit.`);
    } else {
      simpanStatusLockoutMobile({ percobaan, lockoutSampai: null });
      const sisa = MAKS_PERCOBAAN_LOGIN - percobaan;
      alert('Gagal masuk: ' + (err.message || 'Terjadi kesalahan') + `\n(${sisa} percobaan tersisa)`);
    }
  } finally {
    sedangLogin.value = false;
  }
};

const eksekusiLogout = () => {
  hargaPanganMobileService.keluar();
  penggunaMobileService.logout();
  userAktif.value = null;
  tampilanMode.value = 'publik';
};

const alertLupaPassword = () => {
  alert('Silakan hubungi administrator Dinas Pangan Kota Manado');
};

// -------------------------------------------------------------
// OPERASI PETUGAS MOBILE (TETAPKAN HARGA)
// -------------------------------------------------------------

// Format tampilan satuan terkunci per 1 unit (1 KG, 1 Liter, 1 Baki, dst.)
const formatSatuanTampil = (satuan?: string) => analisisHargaMobileService.normalisasiSatuan(satuan);

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

// Auto-isi kategori, satuan bawaan & prioritas saat memilih varian dari Master Komoditas Admin
const pilihKomoditasMasterStaf = (namaKomoditas: string) => {
  const master = daftarMasterKomoditas.value.find(
    (k) => k.nama_komoditas.toLowerCase() === String(namaKomoditas || '').toLowerCase()
  );
  if (master) {
    formPenetapan.value.nama_komoditas = master.nama_komoditas;
    formPenetapan.value.kategori = master.kategori || 'Bahan Pokok';
    formPenetapan.value.satuan = formatSatuanTampil(master.satuan_bawaan) || daftarSatuan.value[0] || '1 KG';
    formPenetapan.value.prioritas_tampil = Number(master.prioritas_tampil) || 50;
  } else {
    formPenetapan.value.nama_komoditas = namaKomoditas;
  }
};

const pilihKomoditasMasterKabid = (namaKomoditas: string) => {
  const master = daftarMasterKomoditas.value.find(
    (k) => k.nama_komoditas.toLowerCase() === String(namaKomoditas || '').toLowerCase()
  );
  if (master) {
    formEditKabid.value.nama_komoditas = master.nama_komoditas;
    formEditKabid.value.kategori = master.kategori || formEditKabid.value.kategori;
    formEditKabid.value.satuan = formatSatuanTampil(master.satuan_bawaan) || formEditKabid.value.satuan;
    formEditKabid.value.prioritas_tampil = Number(master.prioritas_tampil) || 50;
  } else {
    formEditKabid.value.nama_komoditas = namaKomoditas;
  }
};

const mulaiEditItem = (item: ItemHargaPangan) => {
  idDiedit.value = item.id || null;
  formPenetapan.value = {
    nama_komoditas: item.nama_komoditas,
    kategori: item.kategori || 'Bahan Pokok',
    satuan: formatSatuanTampil(item.satuan) || daftarSatuan.value[0] || '1 KG',
    harga: String(item.harga ? Math.round(item.harga) : '').replace(/[^0-9]/g, ''),
    nama_pasar: item.nama_pasar,
    status: item.status || 'Terbit',
    prioritas_tampil: Number(item.prioritas_tampil) || 50
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
    kategori: 'Bahan Pokok',
    satuan: daftarSatuan.value[0] || '1 KG',
    harga: '',
    nama_pasar: daftarPasar.value[0] || 'Pasar Tradisional Bahu',
    status: 'Terbit',
    prioritas_tampil: 50
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
    alert('Silakan pilih nama komoditas resmi terlebih dahulu!');
    return;
  }

  const hargaAngka = parseInt(String(formPenetapan.value.harga).replace(/[^0-9]/g, ''), 10);
  if (!hargaAngka || hargaAngka <= 0) {
    alert('Besaran harga acuan wajib diisi dengan angka bulat positif lebih dari 0!');
    return;
  }

  const satuanGabungan = formatSatuanTampil(formPenetapan.value.satuan || daftarSatuan.value[0] || '1 KG');
  const masterCocok = daftarMasterKomoditas.value.find(
    (k) => k.nama_komoditas.toLowerCase() === formPenetapan.value.nama_komoditas.trim().toLowerCase()
  );
  const prioritasFinal = Number(masterCocok?.prioritas_tampil || formPenetapan.value.prioritas_tampil) || 50;

  // Staf selalu menghasilkan status 'Draft' untuk verifikasi Kabid; Kabid dapat menentukan langsung 'Terbit' atau 'Draft'
  const status = isKabid.value ? ((statusOverride as any) || 'Terbit') : 'Draft';
  const tglKini = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const kategoriOtomatis =
    masterCocok?.kategori ||
    formPenetapan.value.kategori ||
    (() => {
      const n = formPenetapan.value.nama_komoditas.toLowerCase();
      if (n.includes('ayam') || n.includes('sapi') || n.includes('telur') || n.includes('ikan') || n.includes('daging')) return 'Hewani';
      if (n.includes('bawang') || n.includes('cabai') || n.includes('rica') || n.includes('tomat') || n.includes('sayur')) return 'Sayuran';
      if (n.includes('pisang') || n.includes('pepaya') || n.includes('jeruk') || n.includes('apel') || n.includes('buah')) return 'Buah';
      return 'Bahan Pokok';
    })();

  try {
    if (idDiedit.value) {
      // Arsipkan baris lama agar tanggal penetapan sebelumnya tidak tertimpa, lalu simpan sebagai data baru
      await hargaPanganMobileService.perbarui(idDiedit.value, { status: 'Arsip' });
      await hargaPanganMobileService.tambah({
        nama_komoditas: formPenetapan.value.nama_komoditas.trim(),
        kategori: kategoriOtomatis,
        satuan: satuanGabungan,
        harga: hargaAngka,
        nama_pasar: formPenetapan.value.nama_pasar,
        tanggal_penetapan: tglKini,
        status: status,
        prioritas_tampil: prioritasFinal
      });
      pesanSuksesMobile.value = isKabid.value
        ? (status === 'Terbit' ? `✅ Perubahan "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diterbitkan sebagai data baru!` : `📝 Perubahan "${formPenetapan.value.nama_komoditas}" disimpan sebagai draf baru!`)
        : `📨 Perubahan "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan sebagai data baru ke Kepala Bidang!`;
      batalEditItem();
    } else {
      await hargaPanganMobileService.tambah({
        nama_komoditas: formPenetapan.value.nama_komoditas.trim(),
        kategori: kategoriOtomatis,
        satuan: satuanGabungan,
        harga: hargaAngka,
        nama_pasar: formPenetapan.value.nama_pasar,
        tanggal_penetapan: tglKini,
        status: status,
        prioritas_tampil: prioritasFinal
      });
      pesanSuksesMobile.value = isKabid.value
        ? (status === 'Terbit' ? `✅ Harga "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diterbitkan ke masyarakat!` : '📝 Harga disimpan sebagai draf!')
        : `📨 Pengajuan harga "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan ke Kepala Bidang untuk diverifikasi!`;
      formPenetapan.value.nama_komoditas = '';
      formPenetapan.value.kategori = 'Bahan Pokok';
      formPenetapan.value.satuan = daftarSatuan.value[0] || '1 KG';
      formPenetapan.value.harga = '';
      formPenetapan.value.prioritas_tampil = 50;
    }

    setTimeout(() => pesanSuksesMobile.value = '', 3500);

    await muatData();
    await muatStatsDashboard();
  } catch (e: any) {
    alert('Gagal menyimpan harga: ' + e.message);
  }
};

const ubahStatusItem = async (item: ItemHargaPangan) => {
  const statusBaru = (item.status || '').toLowerCase() === 'draft' ? 'Terbit' : 'Draft';
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

// ─────────────────────────────────────────────────────────────
// METODE KABID: VERIFIKASI HARGA & LAPORAN BIDANG
// ─────────────────────────────────────────────────────────────
const komoditasDraft = computed(() => semuaKomoditas.value.filter(k => (k.status || '').toLowerCase() === 'draft'));
const komoditasTerbit = computed(() => semuaKomoditas.value.filter(k => (k.status || 'Terbit').toLowerCase() === 'terbit'));
const komoditasVerifTampil = computed(() => {
  if (filterStatusVerif.value === 'Draft') return komoditasDraft.value;
  if (filterStatusVerif.value === 'Terbit') return komoditasTerbit.value;
  return semuaKomoditas.value;
});

const eksekusiVerifikasiHarga = async (id: string, statusBaru: 'Terbit' | 'Draft') => {
  try {
    await hargaPanganMobileService.verifikasiHarga(id, statusBaru);
    pesanSuksesMobile.value = statusBaru === 'Terbit'
      ? '✅ Harga berhasil disetujui & diterbitkan ke masyarakat!'
      : '↺ Harga berhasil ditarik kembali ke draf verifikasi.';
    setTimeout(() => pesanSuksesMobile.value = '', 3500);
    await muatData();
    await muatStatsDashboard();
  } catch (err: any) {
    alert('Gagal memperbarui status verifikasi: ' + (err.message || 'Terjadi kesalahan'));
  }
};

const bukaModalEditKabid = (item: ItemHargaPangan) => {
  formEditKabid.value = {
    id: item.id || '',
    nama_komoditas: item.nama_komoditas,
    kategori: item.kategori || 'Bahan Pokok',
    satuan: formatSatuanTampil(item.satuan) || daftarSatuan.value[0] || '1 KG',
    harga: String(item.harga ? Math.round(item.harga) : '').replace(/[^0-9]/g, ''),
    nama_pasar: item.nama_pasar,
    status: (item.status as any) || 'Terbit',
    prioritas_tampil: Number(item.prioritas_tampil) || 50
  };
  modalEditKabidBuka.value = true;
};

const simpanEditKabid = async () => {
  if (!formEditKabid.value.nama_komoditas.trim()) {
    alert('Nama komoditas wajib diisi!');
    return;
  }
  const hargaAngka = parseInt(String(formEditKabid.value.harga).replace(/[^0-9]/g, ''), 10);
  if (!hargaAngka || hargaAngka <= 0) {
    alert('Besaran harga wajib berupa angka lebih dari 0!');
    return;
  }
  const satuan = formatSatuanTampil(formEditKabid.value.satuan || daftarSatuan.value[0] || '1 KG');
  const masterCocok = daftarMasterKomoditas.value.find(
    (k) => k.nama_komoditas.toLowerCase() === formEditKabid.value.nama_komoditas.trim().toLowerCase()
  );
  const prioritasFinal = Number(masterCocok?.prioritas_tampil || formEditKabid.value.prioritas_tampil) || 50;

  try {
    await hargaPanganMobileService.perbarui(formEditKabid.value.id, {
      nama_komoditas: formEditKabid.value.nama_komoditas.trim(),
      kategori: formEditKabid.value.kategori,
      satuan: satuan,
      harga: hargaAngka,
      nama_pasar: formEditKabid.value.nama_pasar,
      status: formEditKabid.value.status,
      prioritas_tampil: prioritasFinal
    });
    modalEditKabidBuka.value = false;
    alert('✅ Perubahan harga pangan berhasil disimpan oleh Kepala Bidang!');
    await muatData();
    await muatStatsDashboard();
  } catch (err: any) {
    alert('Gagal menyimpan: ' + err.message);
  }
};

const ambilNamaPenandatanganMobile = (peranTarget: 'Kabid' | 'Kadis'): string => {
  if (peranAktif.value === peranTarget && userAktif.value?.nama?.trim()) {
    return userAktif.value.nama.trim();
  }
  const pejabatDB = daftarSemuaPengguna.value.find(
    u => penggunaMobileService.normalisasiPeran(u.peran) === peranTarget && u.nama?.trim()
  );
  return pejabatDB ? pejabatDB.nama.trim() : '';
};

const unduhLaporanPanganKabid = () => {
  laporanMobileService.eksporLaporanHargaCSV(semuaKomoditas.value, {
    nama: ambilNamaPenandatanganMobile('Kabid')
  });
};

// ─────────────────────────────────────────────────────────────
// METODE ADMIN: KELOLA PENGGUNA & MASTER PASAR / WILAYAH
// ─────────────────────────────────────────────────────────────
const muatSemuaPengguna = async () => {
  try {
    daftarSemuaPengguna.value = await penggunaMobileService.ambilSemuaPengguna();
  } catch (e) {
    console.warn('Gagal memuat daftar pengguna dari Supabase:', e);
    daftarSemuaPengguna.value = [];
  }
  try {
    daftarKecamatan.value = await masterDataMobileService.ambilDaftarKecamatan();
  } catch (_) {}
};

const tambahPenggunaBaru = async () => {
  if (!formPenggunaBaru.value.nama.trim() || !formPenggunaBaru.value.username.trim() || !formPenggunaBaru.value.kata_sandi) {
    alert('Nama lengkap, username, dan kata sandi wajib diisi!');
    return;
  }
  if (formPenggunaBaru.value.kata_sandi.length < 8) {
    alert('Kata sandi awal pengguna minimal 8 karakter demi keamanan!');
    return;
  }
  try {
    await penggunaMobileService.adminTambahPengguna(userAktif.value?.id || '', formPenggunaBaru.value);
    modalTambahUserBuka.value = false;
    formPenggunaBaru.value = {
      nama: '',
      username: '',
      email: '',
      kata_sandi: '',
      peran: 'Staf',
      bidang: 'Bidang Cadangan dan Distribusi Pangan'
    };
    await muatSemuaPengguna();
    alert('✅ Pengguna baru resmi ditambahkan ke sistem!');
  } catch (e: any) {
    alert('Gagal menambah pengguna: ' + e.message);
  }
};

const bukaModalResetSandi = (user: AkunPengguna) => {
  targetResetUser.value = user;
  inputSandiResetBaru.value = '';
  konfirmasiSandiResetBaru.value = '';
  modalResetSandiBuka.value = true;
};

const eksekusiResetSandi = async () => {
  if (!targetResetUser.value) return;
  if (!inputSandiResetBaru.value || inputSandiResetBaru.value.length < 8) {
    alert('Kata sandi baru minimal 8 karakter!');
    return;
  }
  if (inputSandiResetBaru.value !== konfirmasiSandiResetBaru.value) {
    alert('Konfirmasi kata sandi tidak cocok!');
    return;
  }
  try {
    await penggunaMobileService.adminResetPassword(
      userAktif.value?.id || '',
      targetResetUser.value.id,
      inputSandiResetBaru.value
    );
    modalResetSandiBuka.value = false;
    await muatSemuaPengguna();
    alert(`✅ Kata sandi untuk "${targetResetUser.value.nama}" berhasil diperbarui!`);
  } catch (e: any) {
    alert('Gagal mereset kata sandi: ' + e.message);
  }
};

const bukaModalUbahUsername = (user: AkunPengguna) => {
  targetUbahUsername.value = user;
  inputUsernameBaru.value = user.username;
  modalUbahUsernameBuka.value = true;
};

const eksekusiUbahUsername = async () => {
  if (!targetUbahUsername.value) return;
  const baru = inputUsernameBaru.value.trim().toLowerCase();
  if (!baru) {
    alert('Username baru tidak boleh kosong!');
    return;
  }
  try {
    await penggunaMobileService.adminUbahUsername(
      userAktif.value?.id || '',
      targetUbahUsername.value.id,
      baru
    );
    modalUbahUsernameBuka.value = false;
    await muatSemuaPengguna();
    alert(`✅ Username berhasil diperbarui menjadi "${baru}"!`);
  } catch (e: any) {
    alert('Gagal mengubah username: ' + e.message);
  }
};

const bukaModalUbahEmail = (user: AkunPengguna) => {
  targetUbahEmail.value = user;
  inputEmailBaru.value = user.email || `${user.username}@manado.go.id`;
  modalUbahEmailBuka.value = true;
};

const eksekusiUbahEmail = async () => {
  if (!targetUbahEmail.value) return;
  const baru = inputEmailBaru.value.trim().toLowerCase();
  if (!baru) {
    alert('Alamat email baru tidak boleh kosong!');
    return;
  }
  try {
    await penggunaMobileService.adminUbahEmail(
      userAktif.value?.id || '',
      targetUbahEmail.value.id,
      baru
    );
    modalUbahEmailBuka.value = false;
    await muatSemuaPengguna();
    alert(`✅ Email berhasil diperbarui menjadi "${baru}"!`);
  } catch (e: any) {
    alert('Gagal mengubah email: ' + e.message);
  }
};

const eksekusiUbahPeran = async (user: AkunPengguna, peranBaru: string) => {
  const ok = confirm(`Ubah peran hak akses "${user.nama}" menjadi "${peranBaru}"?`);
  if (!ok) return;
  try {
    await penggunaMobileService.adminUbahPeran(
      userAktif.value?.id || '',
      user.id,
      peranBaru
    );
    await muatSemuaPengguna();
    alert(`✅ Hak akses ${user.nama} berhasil diubah menjadi ${peranBaru}.`);
  } catch (e: any) {
    alert('Gagal mengubah peran: ' + e.message);
  }
};

const eksekusiHapusUser = async (user: AkunPengguna) => {
  if (userAktif.value?.id === user.id) {
    alert('Akses Ditolak: Anda tidak dapat menghapus akun Anda sendiri.');
    return;
  }
  const ok = confirm(`Apakah Anda yakin ingin menghapus akun "${user.nama}" (${user.username})?\nTindakan ini tidak dapat dibatalkan.`);
  if (!ok) return;
  try {
    await penggunaMobileService.adminHapusPengguna(
      userAktif.value?.id || '',
      user.id
    );
    await muatSemuaPengguna();
    alert(`🗑️ Akun "${user.nama}" berhasil dihapus.`);
  } catch (e: any) {
    alert('Gagal menghapus akun: ' + e.message);
  }
};

const tambahMasterKomoditasBaru = async () => {
  if (!formKomoditasMasterMobile.value.nama_komoditas.trim()) {
    alert('Nama varian komoditas wajib diisi!');
    return;
  }
  try {
    const namaTersimpan = formKomoditasMasterMobile.value.nama_komoditas.trim();
    daftarMasterKomoditas.value = await masterDataMobileService.tambahKomoditas(formKomoditasMasterMobile.value);
    formKomoditasMasterMobile.value = {
      kelompok_komoditas: formKomoditasMasterMobile.value.kelompok_komoditas,
      nama_komoditas: '',
      kategori: formKomoditasMasterMobile.value.kategori,
      satuan_bawaan: formKomoditasMasterMobile.value.satuan_bawaan || daftarSatuan.value[0] || '1 KG',
      kata_kunci: '',
      prioritas_tampil: 50
    };
    alert(`✅ Master Komoditas "${namaTersimpan}" berhasil disimpan ke Supabase!`);
  } catch (e: any) {
    alert(e?.message || 'Gagal menambahkan master komoditas.');
  }
};

const hapusMasterKomoditas = async (nama: string) => {
  const ok = confirm(`Hapus komoditas "${nama}" dari Master Komoditas resmi?`);
  if (!ok) return;
  try {
    daftarMasterKomoditas.value = await masterDataMobileService.hapusKomoditas(nama);
  } catch (e: any) {
    alert(e?.message || 'Gagal menghapus master komoditas.');
  }
};

const tambahSatuanBaru = async () => {
  if (!inputSatuanBaru.value.trim()) return;
  try {
    const resmi = masterDataMobileService.formatSatuanPerSatu(inputSatuanBaru.value.trim());
    daftarSatuan.value = await masterDataMobileService.tambahSatuan(inputSatuanBaru.value.trim());
    inputSatuanBaru.value = '';
    alert(`✅ Master Satuan "${resmi}" berhasil disimpan ke Supabase!`);
  } catch (e: any) {
    alert(e?.message || 'Gagal menambahkan satuan.');
  }
};

const hapusSatuan = async (nama: string) => {
  const ok = confirm(`Hapus satuan "${nama}" dari Master Satuan?`);
  if (!ok) return;
  try {
    daftarSatuan.value = await masterDataMobileService.hapusSatuan(nama);
  } catch (e: any) {
    alert(e?.message || 'Gagal menghapus satuan.');
  }
};

const handleDataPasarBerubahMobile = (daftarBaru: ItemMasterPasar[]) => {
  const aman = Array.isArray(daftarBaru) ? daftarBaru : [];
  daftarPasarLengkap.value = aman;
  daftarPasar.value = aman.map((p) => p.nama_pasar);
};

const tampilkanPesanSuksesMobile = (pesan: string) => {
  pesanSuksesMobile.value = pesan;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 4500);
};

const lihatHargaDariDaftarPasarMobile = (namaPasar: string) => {
  kategoriAktif.value = 'Semua';
  kelompokAktifPublik.value = 'Semua';
  varianAktifPublik.value = 'Semua';
  kataKunciPencarian.value = '';
  pasarTerpilihPublik.value = namaPasar ? [namaPasar] : [];
  tabAktif.value = 'harga';
};

const tambahKecamatanBaru = async () => {
  if (!inputKecamatanBaru.value.trim()) return;
  try {
    daftarKecamatan.value = await masterDataMobileService.tambahKecamatan(inputKecamatanBaru.value.trim());
    inputKecamatanBaru.value = '';
    alert('✅ Kecamatan baru berhasil disimpan ke Supabase!');
  } catch (e: any) {
    alert(e?.message || 'Gagal menambahkan kecamatan.');
  }
};

const hapusKecamatan = async (nama: string) => {
  const ok = confirm(`Hapus kecamatan "${nama}"?`);
  if (!ok) return;
  try {
    daftarKecamatan.value = await masterDataMobileService.hapusKecamatan(nama);
  } catch (e: any) {
    alert(e?.message || 'Gagal menghapus kecamatan.');
  }
};

// ─────────────────────────────────────────────────────────────
// METODE KADIS: GRAFIK PANGAN & REKAPITULASI EKSEKUTIF GPM (100% DATA RIIL)
// ─────────────────────────────────────────────────────────────
const muatTrenKadis = async () => {
  const daftarKom = daftarKomoditasTersediaKadis.value;
  if (daftarKom.length > 0 && (!komoditasTren.value || !daftarKom.includes(komoditasTren.value))) {
    komoditasTren.value = daftarKom[0];
  } else if (daftarKom.length === 0) {
    komoditasTren.value = '';
  }

  sedangMuatTrenMobile.value = true;
  try {
    dataTren.value = await laporanMobileService.ambilDataTrenKomoditas(
      komoditasTren.value,
      periodeTren.value,
      pasarTren.value,
      semuaKomoditas.value
    );
  } catch (err) {
    console.error('Gagal memuat tren grafik pangan Kadis mobile:', err);
    dataTren.value = null;
  } finally {
    sedangMuatTrenMobile.value = false;
  }
};

const muatRekapGPMKadis = () => {
  if (semuaAcaraGPM.value.length > 0) {
    daftarRekapGPMKadis.value = semuaAcaraGPM.value.map(a => {
      const st = jadwalGPMMobileService.hitungStatusOperasional(a, waktuSekarangGPMMs.value);
      return {
        id: a.id,
        nama_acara: a.nama_acara,
        lokasi: a.lokasi,
        kecamatan: a.kecamatan || '-',
        tanggal: a.tanggal,
        target_kuota: st.kuotaMaks,
        terdaftar: st.terisi,
        terlayani: st.totalHadir,
        status: st.sudahBerakhir ? 'Selesai' : 'Aktif',
        komoditas_tersedia: a.komoditas_tersedia || '-'
      };
    });
  } else {
    daftarRekapGPMKadis.value = [];
  }
};

const bukaDetailWargaMobile = async (acara: any) => {
  modalDetailWargaMobile.value = {
    buka: true,
    acara,
    pencarian: ''
  };
  if (acara?.id) {
    try {
      const res = await gpmMobileService.ambilPendaftarAcara(String(acara.id));
      detailRiwayatPendaftar.value[String(acara.id)] = res.data || [];
    } catch (e) {}
  }
};

const unduhRekapAcaraMobile = async (acara: any) => {
  if (!acara) return;
  try {
    let pendaftar = detailRiwayatPendaftar.value[String(acara.id)];
    if (!pendaftar) {
      const res = await gpmMobileService.ambilPendaftarAcara(String(acara.id));
      pendaftar = res.data || [];
      detailRiwayatPendaftar.value[String(acara.id)] = pendaftar;
    }
    gpmMobileService.eksporKeCSV(acara, pendaftar);
  } catch (err: any) {
    alert('Gagal mengunduh CSV: ' + (err?.message || 'Terjadi kesalahan'));
  }
};

const unduhLaporanEksekutifGPM = () => {
  laporanMobileService.eksporRekapitulasiSemuaGPMCSV(daftarRekapGPMKadis.value, {
    nama: ambilNamaPenandatanganMobile('Kadis')
  });
};

const pilihFotoDariPerangkat = () => {
  inputFotoMobileRef.value?.click();
};

const handlePilihBerkasFotoMobile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Format berkas harus berupa gambar (JPG, PNG, atau WebP)!');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Ukuran berkas foto maksimal 2 MB!');
    return;
  }
  const reader = new FileReader();
  reader.onload = (uploadEvt) => {
    const base64 = uploadEvt.target?.result as string;
    if (base64) {
      inputFotoProfilUrl.value = base64;
    }
  };
  reader.readAsDataURL(file);
};

const muatNotifikasiDinamisMobile = () => {
  const notifs: NotifMobileItem[] = [];
  const itemsHarga = semuaKomoditas.value || [];
  const gpmSelesai = semuaRiwayatGPMPublik.value;
  const gpmAktifList = semuaAcaraGPMAktif.value;

  if (isKabid.value) {
    const draftCount = itemsHarga.filter((i: any) => (i.status || '').toLowerCase() === 'draft').length;
    if (draftCount > 0) {
      notifs.push({
        id: 'notif-kabid-draft',
        judul: '📝 Verifikasi Harga Pangan',
        pesan: `Terdapat ${draftCount} usulan harga draf menunggu verifikasi Anda.`,
        waktu: 'Terkini',
        target: 'verif-harga'
      });
    }
    if (gpmSelesai.length > 0) {
      notifs.push({
        id: 'notif-kabid-gpm',
        judul: '🌾 GPM Terarsip',
        pesan: `Kegiatan "${gpmSelesai[0].nama_acara}" telah selesai & terarsip (${gpmSelesai[0].statusOperasional.terisi} pendaftar).`,
        waktu: 'Terkini',
        target: 'kelola-gpm'
      });
    }
  }

  if (isKadis.value) {
    if (gpmSelesai.length > 0) {
      notifs.push({
        id: 'notif-kadis-gpm-selesai',
        judul: '📊 Laporan Pelaksanaan GPM',
        pesan: `Kegiatan "${gpmSelesai[0].nama_acara}" selesai dengan ${gpmSelesai[0].statusOperasional.totalHadir} warga hadir dari ${gpmSelesai[0].statusOperasional.terisi} pendaftar.`,
        waktu: 'Terkini',
        target: 'laporan-gpm'
      });
    }
    notifs.push({
      id: 'notif-kadis-tren',
      judul: '📈 Fluktuasi Harga Pasar',
      pesan: 'Grafik pangan terhubung ke seluruh komoditas acuan pasar Manado.',
      waktu: 'Terkini',
      target: 'grafik-pangan'
    });
  }

  if (isStaf.value) {
    const terbitCount = itemsHarga.filter((i: any) => (i.status || '').toLowerCase() === 'terbit').length;
    const draftCount = itemsHarga.filter((i: any) => (i.status || '').toLowerCase() === 'draft').length;
    notifs.push({
      id: 'notif-staf-status',
      judul: '📢 Status Publikasi Komoditas',
      pesan: `${terbitCount} komoditas terbit di publik.${draftCount > 0 ? ` ${draftCount} draf dalam proses telaah.` : ''}`,
      waktu: 'Terkini',
      target: 'input-harga'
    });
    if (gpmAktifList.length > 0) {
      notifs.push({
        id: 'notif-staf-gpm-aktif',
        judul: '🎫 Pelaksanaan GPM Aktif',
        pesan: `${gpmAktifList[0].nama_acara} siap melayani verifikasi tiket warga (Sisa ${gpmAktifList[0].statusOperasional.sisaKuota} kuota).`,
        waktu: 'Hari ini',
        target: 'kelola-gpm'
      });
    }
  }

  if (isAdmin.value) {
    notifs.push({
      id: 'notif-admin-supervisi',
      judul: '🛡️ Pengawasan Sistem & Akun',
      pesan: `Sistem mencatat ${daftarSemuaPengguna.value.length} akun kedinasan dan ${semuaAcaraGPM.value.length} agenda GPM.`,
      waktu: 'Terkini',
      target: 'kelola-user'
    });
  }

  daftarNotifMobile.value = notifs;
};

const bukaNotifTarget = (target?: string) => {
  if (target) {
    menuPetugas.value = target;
  }
  modalNotifMobileBuka.value = false;
};

const hitungKoordinatTitik = (titikData: any[]) => {
  if (!titikData || titikData.length === 0) return [];
  if (titikData.length === 1) {
    const d = titikData[0];
    return [{
      x: 250,
      y: 105,
      harga: d.harga,
      tanggal: d.tanggal,
      pasar: d.pasar
    }];
  }
  const hargaList = titikData.map(d => d.harga);
  const min = Math.min(...hargaList);
  const max = Math.max(...hargaList);
  const range = max === min ? 1 : max - min;
  const count = titikData.length;
  const stepX = (450 - 50) / (count - 1);

  return titikData.map((d, i) => {
    const x = Math.round(50 + i * stepX);
    const y = max === min ? 105 : Math.round(160 - ((d.harga - min) / range) * 110);
    return {
      x,
      y,
      harga: d.harga,
      tanggal: d.tanggal,
      pasar: d.pasar
    };
  });
};

const hitungTitikSVG = (titikData: any[]) => {
  const coords = hitungKoordinatTitik(titikData);
  return coords.map(c => `${c.x},${c.y}`).join(' ');
};

// ─────────────────────────────────────────────────────────────
// METODE PROFIL PRIBADI & GANTI KATA SANDI MANDIRI
// ─────────────────────────────────────────────────────────────
const bukaModalProfil = () => {
  formSandiMandiri.value = { sandiLama: '', sandiBaru: '', konfirmasi: '' };
  inputFotoProfilUrl.value = userAktif.value?.foto_profil || '';
  modalProfilBuka.value = true;
};

const eksekusiGantiSandiMandiri = async () => {
  if (!userAktif.value) return;
  if (!formSandiMandiri.value.sandiLama) {
    alert('Kata sandi lama wajib diisi!');
    return;
  }
  if (formSandiMandiri.value.sandiBaru.length < 8) {
    alert('Kata sandi baru minimal 8 karakter!');
    return;
  }
  if (formSandiMandiri.value.sandiBaru !== formSandiMandiri.value.konfirmasi) {
    alert('Konfirmasi kata sandi tidak cocok!');
    return;
  }
  try {
    await penggunaMobileService.ubahKataSandiPribadi(
      userAktif.value.id,
      formSandiMandiri.value.sandiLama,
      formSandiMandiri.value.sandiBaru
    );
    formSandiMandiri.value = { sandiLama: '', sandiBaru: '', konfirmasi: '' };
    modalProfilBuka.value = false;
    alert('✅ Kata sandi pribadi Anda berhasil diperbarui!');
  } catch (e: any) {
    alert('Gagal mengganti kata sandi: ' + e.message);
  }
};

const eksekusiGantiFotoProfil = () => {
  if (!userAktif.value) return;
  if (!inputFotoProfilUrl.value.trim()) {
    alert('URL foto profil tidak boleh kosong!');
    return;
  }
  penggunaMobileService.ubahFotoProfil(userAktif.value.id, inputFotoProfilUrl.value.trim());
  userAktif.value.foto_profil = inputFotoProfilUrl.value.trim();
  alert('✅ Foto profil berhasil diperbarui!');
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
.btn-m-submit:disabled {
  background: #9ca3af;
  box-shadow: none;
  cursor: not-allowed;
}

/* [CEK-06] Lockout alert mobile */
.m-lockout-alert {
  background: #7f1d1d;
  color: #fca5a5;
  border: 1px solid #dc2626;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.82rem;
  text-align: center;
  margin-top: 4px;
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
  padding: 10px 14px 6px 14px;
  gap: 8px;
}

.staff-header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.staff-brand-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.staff-brand-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.btn-server-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 0.68rem;
  font-weight: 700;
  border: 1px solid rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-server-status-pill.is-offline {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: #991b1b;
}

.btn-server-status-pill .status-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.btn-server-status-pill.is-offline .status-pulse-dot {
  background: #ef4444;
}

.staff-header-sub-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
}

.staff-logo-box {
  width: 36px;
  height: 36px;
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
  font-size: 0.95rem;
  font-weight: 800;
  color: #111827;
  margin: 0;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

.staff-header-sub {
  font-size: 0.72rem;
  color: #6b7280;
  margin: 0;
}

.staff-header-user {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
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
  cursor: pointer;
  flex-shrink: 0;
}

.btn-logout-mini {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 6px 9px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: all 0.15s ease;
}

.btn-logout-mini:active {
  background: #fca5a5;
  transform: scale(0.96);
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 6px 12px 10px 12px;
  gap: 6px;
}

.mobile-tab-item {
  border: none;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 700;
  color: #4b5563;
  padding: 7px 6px;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* ==========================================================================
   ROLE-BASED ACCESS CONTROL (RBAC) STYLING - SIPATOKAAN MOBILE
   ========================================================================== */
.staff-header-sub-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.user-role-badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 12px;
  letter-spacing: 0.03em;
  display: inline-block;
}

.role-superadmin {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.role-admin {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

.role-kabid {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.role-staf, .role-petugas {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.role-kadis {
  background: #f3e8ff;
  color: #7e22ce;
  border: 1px solid #e9d5ff;
}

.user-greeting-name {
  font-size: 0.76rem;
  color: #64748b;
  font-weight: 600;
}

.avatar-fit-circle {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-img-fit {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* Scrollable Segmented Bar for Mobile */
.staff-segmented-bar {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  padding: 6px 12px 10px 12px;
  scrollbar-width: none;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
}

.staff-segmented-bar::-webkit-scrollbar {
  display: none;
}

.staff-segment-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.staff-segment-btn.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
  box-shadow: 0 2px 8px rgba(139, 30, 30, 0.25);
}

.segment-icon {
  font-size: 0.92rem;
}

/* Role Welcome Hero Banner */
.m-role-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.banner-admin {
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-left: 4px solid #dc2626;
}

.banner-kabid {
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
  border-left: 4px solid #0284c7;
}

.banner-staf {
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
  border-left: 4px solid #16a34a;
}

.banner-kadis {
  background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
  border-left: 4px solid #9333ea;
}

.m-role-banner-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #8b1e1e;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 800;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
}

.m-role-banner-info {
  flex: 1;
}

.m-role-chip {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #8b1e1e;
  letter-spacing: 0.04em;
}

.m-role-banner-title {
  margin: 2px 0 0 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #1e293b;
}

.m-role-banner-bidang {
  margin: 1px 0 0 0;
  font-size: 0.74rem;
  color: #64748b;
}

/* Quick Actions Panel */
.m-qa-panel {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  border: 1px solid #e2e8f0;
}

.m-qa-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 10px 0;
}

.m-qa-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.m-qa-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.m-qa-card:active {
  transform: scale(0.98);
}

.m-qa-primary {
  background: #fff8f8;
  border-color: #fecaca;
}

.m-qa-icon {
  font-size: 1.35rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.m-qa-detail strong {
  display: block;
  font-size: 0.86rem;
  color: #1e293b;
}

.m-qa-detail small {
  font-size: 0.72rem;
  color: #64748b;
}

/* Verifikasi Tabs & Cards (Kabid) */
.m-verif-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.m-verif-tab {
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  color: #475569;
  cursor: pointer;
}

.m-verif-tab.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.m-verif-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-verif-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.m-verif-card.border-draft {
  border-left: 4px solid #f59e0b;
}

.m-verif-card.border-terbit {
  border-left: 4px solid #16a34a;
}

.m-verif-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.m-badge-status {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge-draft {
  background: #fef3c7;
  color: #b45309;
}

.badge-terbit {
  background: #dcfce7;
  color: #15803d;
}

.m-verif-date {
  font-size: 0.72rem;
  color: #94a3b8;
}

.m-verif-name {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
}

.m-verif-detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.74rem;
  color: #64748b;
  margin-bottom: 6px;
}

.m-verif-price {
  font-size: 1.05rem;
  font-weight: 800;
  color: #8b1e1e;
  margin-bottom: 10px;
}

.m-verif-price small {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.m-verif-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.btn-m-approve {
  background: #16a34a;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-unpublish {
  background: #f59e0b;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-edit {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-del {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

/* Laporan Resmi Bidang & Export CSV */
.m-export-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 14px;
  text-align: center;
}

.btn-m-export-csv {
  width: 100%;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 11px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 800;
  box-shadow: 0 3px 8px rgba(139, 30, 30, 0.2);
  cursor: pointer;
}

.export-hint {
  margin: 6px 0 0 0;
  font-size: 0.72rem;
  color: #64748b;
}

.m-report-table-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
}

.m-report-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 380px;
  overflow-y: auto;
}

.m-report-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.m-rep-num {
  font-weight: 800;
  color: #94a3b8;
  font-size: 0.8rem;
  width: 20px;
}

.m-rep-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.m-rep-info strong {
  font-size: 0.84rem;
  color: #1e293b;
}

.m-rep-info span {
  font-size: 0.72rem;
  color: #64748b;
}

.m-rep-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 8px;
  width: fit-content;
  margin-top: 2px;
}

.m-rep-badge.draft {
  background: #fef3c7;
  color: #b45309;
}

.m-rep-badge.terbit {
  background: #dcfce7;
  color: #15803d;
}

.m-rep-price {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.m-rep-price strong {
  font-size: 0.88rem;
  color: #8b1e1e;
}

.m-rep-price span {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* Supervisi GPM & Cek GPM (Admin) */
.m-supervisi-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-supervisi-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.m-super-header h3 {
  margin: 6px 0 2px 0;
  font-size: 1rem;
  font-weight: 800;
  color: #1e293b;
}

.m-super-badge {
  font-size: 0.68rem;
  font-weight: 800;
  background: #e2e8f0;
  color: #334155;
  padding: 2px 8px;
  border-radius: 10px;
}

.m-super-loc, .m-super-time {
  margin: 2px 0 0 0;
  font-size: 0.76rem;
  color: #64748b;
}

.m-super-quota-section {
  margin: 12px 0 8px 0;
}

.quota-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  color: #475569;
  margin-bottom: 4px;
}

.quota-progress-bar {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
}

.quota-progress-fill {
  height: 100%;
  background: #8b1e1e;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.m-super-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #f8fafc;
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  margin-top: 8px;
}

.super-stat-col .lbl {
  display: block;
  font-size: 0.68rem;
  color: #64748b;
}

.super-stat-col strong {
  font-size: 0.95rem;
  color: #1e293b;
}

.m-super-actions {
  margin-top: 10px;
}

.btn-m-super-csv {
  width: 100%;
  background: #0284c7;
  color: #ffffff;
  border: none;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

/* Master Data Chips */
.m-inline-add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.m-inline-add-row input {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.84rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.btn-m-add {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.m-master-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.m-master-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  font-size: 0.76rem;
  font-weight: 600;
  color: #334155;
}

.chip-kecamatan {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #3730a3;
}

.btn-m-chip-del {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-weight: 800;
  cursor: pointer;
  padding: 0 2px;
}

.btn-m-chip-del:hover {
  color: #ef4444;
}

/* Kelola Pengguna (Admin) */
.btn-m-add-user {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.m-user-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-user-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
}

.m-user-card-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.m-user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #8b1e1e;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  flex-shrink: 0;
  overflow: hidden;
}

.m-user-head-info {
  flex: 1;
}

.m-user-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.m-user-title-row h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
}

.m-user-sub {
  display: block;
  font-size: 0.74rem;
  color: #64748b;
  margin-top: 2px;
}

.m-user-bidang {
  display: block;
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 1px;
}

.m-user-role-selector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding: 6px 8px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.76rem;
  color: #475569;
}

.m-role-select {
  padding: 4px 8px;
  font-size: 0.76rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
}

.m-user-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.btn-m-u-pwd {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 6px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-u-edit {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-m-u-del {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

/* Grafik Kadis: Responsif & Proporsional Sesuai Layar Mobile (Mencegah Out of Box) */
.m-kadis-filter-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.m-kadis-filter-grid .s-field {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.m-kadis-filter-grid .s-field label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.m-kadis-filter-grid .s-field select,
.s-field select {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.88rem;
  background-color: #ffffff !important;
  color: #0f172a !important;
  outline: none;
  transition: border-color 0.2s;
}

.m-kadis-filter-grid .s-field select:focus,
.s-field select:focus {
  border-color: #8b1e1e;
}

@media (min-width: 580px) {
  .m-kadis-filter-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
}

.m-trend-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
}

.trend-naik {
  background: #fee2e2;
  color: #dc2626;
}

.trend-turun {
  background: #dcfce7;
  color: #16a34a;
}

.trend-stabil {
  background: #f1f5f9;
  color: #475569;
}

.m-svg-chart-container {
  width: 100%;
  overflow-x: auto;
  padding: 4px 0;
}

.m-svg-chart {
  width: 100%;
  height: auto;
  display: block;
}

/* Modal Profil & Close Icon */
.btn-close-modal-icon {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.m-profile-info-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.m-profile-avatar-large {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #8b1e1e;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 800;
  flex-shrink: 0;
  overflow: hidden;
}

.m-empty-box {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.88rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
}

/* Badge Jalur Pendaftaran Mobile */
.m-jalur-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.m-jalur-tag.jalur-langsung {
  background: #ede9fe;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
}

.m-jalur-tag.jalur-daring {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.btn-m-tambah-manual {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  background: #059669;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* =======================================================
   REVISI PORTAL PUBLIK MOBILE: MULTI-PASAR, SORTIR & SMART CARDS
   ======================================================= */
.m-enhanced-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-filter-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.m-multi-market-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  color: #334155;
  text-align: left;
  overflow: hidden;
}

.m-multi-market-btn span:first-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-multi-market-btn.has-pick {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #8b1e1e;
}

.m-chev { font-size: 0.65rem; opacity: 0.7; flex-shrink: 0; }

.m-sort-select {
  width: 100%;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  color: #334155;
}

.m-picked-markets-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.m-picked-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.m-picked-chip button {
  background: none;
  border: none;
  color: #991b1b;
  font-weight: 800;
  padding: 0;
}

.m-clear-picked-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: underline;
}

.m-mode-toggle-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #f1f5f9;
  padding: 3px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  gap: 3px;
}

.m-mode-btn {
  border: none;
  background: transparent;
  padding: 7px 4px;
  border-radius: 7px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
}

.m-mode-btn.active {
  background: #ffffff;
  color: #8b1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.m-pub-state-box {
  margin: 12px 16px;
  padding: 20px 16px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  font-size: 0.82rem;
  color: #475569;
}

.m-pub-state-box.is-err {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.m-pub-retry-btn {
  margin-top: 10px;
  padding: 8px 16px;
  border-radius: 8px;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
}

.m-smart-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 14px 24px 14px;
}

.m-smart-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 13px 14px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.m-sc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.m-delta-pill {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.m-delta-pill.up { background: #fee2e2; color: #b91c1c; }
.m-delta-pill.down { background: #dcfce7; color: #15803d; }
.m-delta-pill.stable { background: #f1f5f9; color: #475569; }

.m-sc-title {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

.m-sc-price {
  font-size: 1.18rem;
  font-weight: 800;
  color: #8b1e1e;
  margin-bottom: 10px;
}

.m-price-sep { color: #94a3b8; font-weight: 500; }

.m-sc-compare-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.m-sc-cmp-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
}

.m-sc-cmp-line.cheap span:first-child { color: #15803d; font-weight: 700; white-space: nowrap; }
.m-sc-cmp-line.exp span:first-child { color: #dc2626; font-weight: 700; white-space: nowrap; }

.m-sc-market-name {
  flex: 1;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-sc-cmp-line strong { color: #0f172a; font-weight: 800; white-space: nowrap; }

.m-sc-single-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.74rem;
  color: #334155;
}

.m-sc-conv {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.66rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.m-sc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.m-sc-cta {
  font-size: 0.72rem;
  font-weight: 800;
  color: #8b1e1e;
}

.m-flat-clickable { cursor: pointer; }
.m-flat-cheap { border-color: #86efac !important; }
.m-flat-exp { border-color: #fca5a5 !important; }
.m-flat-pos-row { margin-bottom: 4px; }
.m-flat-badge-cheap { background: #16a34a; color: #fff; font-size: 0.62rem; font-weight: 700; padding: 2px 6px; border-radius: 999px; }
.m-flat-badge-exp { background: #dc2626; color: #fff; font-size: 0.62rem; font-weight: 700; padding: 2px 6px; border-radius: 999px; }
.m-flat-conv-hint { font-size: 0.66rem; color: #0369a1; font-weight: 600; margin-bottom: 6px; }

/* Modal Multi-Select Pasar Mobile */
.m-market-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  z-index: 19000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.m-market-picker-sheet {
  background: #ffffff;
  width: 100%;
  max-width: 520px;
  max-height: 75vh;
  border-radius: 18px 18px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.m-mp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
  background: #8b1e1e;
  color: #ffffff;
}

.m-mp-header h4 { margin: 0; font-size: 0.96rem; font-weight: 800; }
.m-mp-header p { margin: 3px 0 0 0; font-size: 0.72rem; opacity: 0.88; }
.m-mp-close { background: rgba(255,255,255,0.2); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; font-weight: 700; }

.m-mp-quick-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.m-mp-quick-row button {
  background: none;
  border: none;
  color: #8b1e1e;
  font-size: 0.78rem;
  font-weight: 700;
}

.m-mp-list {
  padding: 10px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-mp-empty {
  text-align: center;
  padding: 18px;
  color: #64748b;
  font-size: 0.8rem;
}

.m-mp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 0.84rem;
  color: #1e293b;
}

.m-mp-item.checked {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #8b1e1e;
  font-weight: 700;
}

.m-mp-item input {
  width: 17px;
  height: 17px;
  accent-color: #8b1e1e;
}

.m-mp-footer {
  padding: 12px 16px 20px 16px;
  border-top: 1px solid #e2e8f0;
}

.m-mp-apply-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  font-size: 0.88rem;
  font-weight: 800;
}

/* Filter Cepat Kelompok Induk, Sub-Varian & Matriks Perbandingan Pasar (Mobile) */
.m-parent-scroll {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow-x: auto;
  padding: 2px 14px 10px 14px;
  -webkit-overflow-scrolling: touch;
}

.m-parent-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.m-parent-pill.active {
  background: #8b1e1e;
  border-color: #8b1e1e;
  color: #ffffff;
}

.m-parent-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.64rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

.m-parent-pill.active .m-parent-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.m-subvariant-panel {
  background: linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%);
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 9px 10px;
}

.m-subvar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  font-size: 0.72rem;
  font-weight: 800;
  color: #8b1e1e;
}

.m-btn-jump-matrix {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 0.66rem;
  font-weight: 700;
}

.m-subvar-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
}

.m-subvar-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.m-subvar-chip.active {
  background: #8b1e1e;
  border-color: #8b1e1e;
  color: #ffffff;
}

.m-subvar-price {
  font-size: 0.65rem;
  font-weight: 700;
  color: #059669;
  background: #ecfdf5;
  padding: 1px 6px;
  border-radius: 999px;
}

.m-subvar-chip.active .m-subvar-price {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.m-matrix-wrap {
  padding: 0 12px 24px 12px;
}

.m-matrix-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.m-matrix-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.68rem;
  color: #475569;
  font-weight: 700;
}

.m-leg-cheap { background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 999px; }
.m-leg-exp { background: #fee2e2; color: #991b1b; padding: 2px 7px; border-radius: 999px; }

.m-matrix-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.m-matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.74rem;
  min-width: 520px;
}

.m-matrix-table thead th {
  background: #8b1e1e;
  color: #ffffff;
  padding: 9px 10px;
  text-align: left;
  font-weight: 700;
  white-space: nowrap;
  border-right: 1px solid rgba(255, 255, 255, 0.14);
}

.m-matrix-table thead th.m-mx-sticky {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #701616;
  min-width: 145px;
}

.m-matrix-table thead th.m-mx-num {
  text-align: right;
  min-width: 112px;
}

.m-matrix-table tbody tr {
  border-bottom: 1px solid #e2e8f0;
}

.m-matrix-table tbody td {
  padding: 9px 10px;
  vertical-align: middle;
  border-right: 1px solid #f1f5f9;
}

.m-matrix-table tbody td.m-mx-sticky {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #ffffff;
  border-right: 2px solid #e2e8f0;
}

.m-mx-name { font-weight: 800; color: #0f172a; font-size: 0.78rem; }
.m-mx-sub { font-size: 0.65rem; color: #64748b; margin-top: 2px; }

.m-mx-cell {
  text-align: right;
  white-space: nowrap;
}

.m-mx-cell.is-cheap { background: #f0fdf4; }
.m-mx-cell.is-exp { background: #fef2f2; }

.m-mx-val { font-weight: 800; color: #0f172a; font-size: 0.78rem; }
.m-mx-cell.is-cheap .m-mx-val { color: #15803d; }
.m-mx-cell.is-exp .m-mx-val { color: #b91c1c; }

.m-mx-tag {
  display: inline-block;
  margin-top: 2px;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}
.m-mx-tag.cheap { background: #dcfce7; color: #166534; }
.m-mx-tag.exp { background: #fee2e2; color: #991b1b; }
.m-mx-empty { color: #cbd5e1; font-weight: 700; }

.m-mx-avg {
  text-align: right;
  background: #f8fafc;
  white-space: nowrap;
}
.m-mx-avg-val { font-weight: 800; color: #8b1e1e; font-size: 0.78rem; }
.m-mx-hist { font-size: 0.64rem; font-weight: 700; color: #1d4ed8; }

/* Admin Master Komoditas Mobile */
.m-mk-form-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.m-mk-groups-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-mk-group-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}

.m-mk-group-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.82rem;
  color: #8b1e1e;
}

.m-mk-group-head span {
  font-size: 0.68rem;
  font-weight: 700;
  background: #fee2e2;
  color: #991b1b;
  padding: 2px 7px;
  border-radius: 999px;
}

.m-mk-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-mk-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
}

.m-mk-item-name { font-size: 0.8rem; font-weight: 800; color: #0f172a; }
.m-mk-item-meta { font-size: 0.68rem; color: #64748b; margin-top: 2px; }
.m-mk-item-syn { font-size: 0.66rem; color: #0369a1; margin-top: 2px; }

/* ============================================================================
   GPM PUBLIK & PETUGAS MOBILE (AUTO-CLOSE WITA, KUOTA, RIWAYAT KERAMAIAN)
   ============================================================================ */
.m-gpm-pub-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 12px 0;
}

.m-gpm-pub-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.m-gpm-pub-tab.active {
  background: #8b1e1e;
  border-color: #8b1e1e;
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(139, 30, 30, 0.22);
}

.m-gpm-pub-count {
  background: rgba(15, 23, 42, 0.1);
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
}

.m-gpm-pub-tab.active .m-gpm-pub-count {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.m-gpm-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.m-gpm-filter-select {
  flex: 1 1 46%;
  min-width: 130px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.78rem;
  font-weight: 600;
}

.m-gpm-gps-btn {
  flex: 1 1 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1.5px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.m-gpm-gps-btn.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
}

.m-gpm-status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.m-gpm-status-pill.st-berlangsung { background: #dcfce7; color: #166534; }
.m-gpm-status-pill.st-akan-datang { background: #dbeafe; color: #1e40af; }
.m-gpm-status-pill.st-penuh { background: #fee2e2; color: #991b1b; }
.m-gpm-status-pill.st-selesai { background: #e2e8f0; color: #475569; }

.m-map-grid-pin {
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 5px;
}

.m-map-grid-pin.is-full {
  opacity: 0.85;
  border-style: dashed;
}

.pin-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.m-pin-quota-pill {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
}

.m-pin-quota-pill.full {
  background: #fee2e2;
  color: #991b1b;
}

.pin-time-sub {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
}

.m-event-quota.quota-habis {
  background: #fee2e2;
  color: #991b1b;
}

.m-gpm-progress-track {
  width: 100%;
  height: 7px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.m-gpm-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #16a34a, #22c55e);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.m-gpm-progress-fill.full {
  background: linear-gradient(90deg, #dc2626, #ef4444);
}

.m-gpm-locked-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  margin-top: 12px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.m-gpm-locked-banner.locked-ended {
  background: #fef2f2;
  border: 1.5px solid #fca5a5;
  color: #991b1b;
}

.m-gpm-locked-banner.locked-full {
  background: #fffbeb;
  border: 1.5px solid #fcd34d;
  color: #92400e;
}

.m-gpm-locked-banner p {
  margin: 3px 0 0 0;
  font-size: 0.75rem;
}

.m-lock-ico {
  font-size: 1.35rem;
  line-height: 1;
}

.m-gpm-empty-card {
  background: #ffffff;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  margin-bottom: 14px;
}

.m-gpm-empty-ico { font-size: 2rem; margin-bottom: 6px; }
.m-gpm-empty-card h4 { margin: 0 0 6px 0; font-size: 0.96rem; color: #1e293b; }
.m-gpm-empty-card p { margin: 0; font-size: 0.78rem; color: #64748b; line-height: 1.45; }

.m-gpm-empty-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #8b1e1e;
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.m-gpm-empty-btn.secondary {
  background: #e2e8f0;
  color: #334155;
}

.m-btn-retry-small {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

/* Riwayat GPM Publik Mobile */
.m-gpm-hist-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.m-hist-kpi-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-hist-kpi-box .lbl { font-size: 0.68rem; color: #64748b; font-weight: 600; }
.m-hist-kpi-box strong { font-size: 1.05rem; color: #8b1e1e; font-weight: 800; }

.m-gpm-privacy-strip {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 0.72rem;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 12px;
  line-height: 1.4;
}

.m-pub-hist-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-pub-hist-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.m-pub-hist-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.m-pub-hist-title { margin: 0 0 4px 0; font-size: 0.92rem; color: #0f172a; font-weight: 800; }
.m-pub-hist-meta { margin: 2px 0; font-size: 0.74rem; color: #475569; }

.m-pub-hist-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  margin-top: 8px;
  text-align: center;
}

.m-pub-hist-stats .lbl { display: block; font-size: 0.66rem; color: #64748b; }
.m-pub-hist-stats strong { font-size: 0.88rem; color: #0f172a; }

.m-pub-hist-kom {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
  font-size: 0.73rem;
  color: #475569;
}

.m-crowd-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
}

.m-crowd-badge.crowd-sangat-ramai { background: #fee2e2; color: #b91c1c; }
.m-crowd-badge.crowd-ramai { background: #ffedd5; color: #c2410c; }
.m-crowd-badge.crowd-cukup { background: #dcfce7; color: #15803d; }
.m-crowd-badge.crowd-normal { background: #e0f2fe; color: #0369a1; }
.m-crowd-badge.crowd-sepi { background: #f1f5f9; color: #64748b; }

/* Petugas GPM Tambahan Mobile */
.m-scan-event-strip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.76rem;
  color: #334155;
}

.btn-m-cancel-hadir {
  margin-top: 8px;
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #fca5a5;
  background: #ffffff;
  color: #b91c1c;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.m-antrean-quota-strip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  margin: 10px 0;
}

.m-aqs-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.m-aqs-time { font-size: 0.72rem; color: #64748b; font-weight: 600; }

.m-aqs-nums {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #334155;
  margin-bottom: 6px;
}

.btn-m-ubah-kuota {
  background: #1d4ed8;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.m-queue-right-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.btn-m-toggle-hadir {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
}

.btn-m-toggle-hadir.hadirkan { background: #16a34a; color: #ffffff; }
.btn-m-toggle-hadir.batal { background: #fee2e2; color: #b91c1c; }

.m-autoclose-hint {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 0.73rem;
  padding: 7px 10px;
  border-radius: 8px;
  margin-top: -4px;
}

.m-preset-loc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.m-preset-loc-btn {
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.m-history-3col {
  grid-template-columns: repeat(3, 1fr) !important;
}

.m-kuota-info-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  font-size: 0.74rem;
}

.m-kuota-info-box span { display: block; color: #64748b; }
.m-kuota-info-box strong { font-size: 0.95rem; color: #0f172a; }

.m-quick-add-kuota-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.m-quick-add-kuota-row button {
  padding: 7px 6px;
  border-radius: 6px;
  border: 1.5px solid #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 800;
  font-size: 0.76rem;
  cursor: pointer;
}

/* ============================================================================
   PERBAIKAN RESPONSIF LAYAR ANDROID SEMPIT (HARGA PANGAN & 3 MENU PUBLIK)
   ============================================================================ */
.m-filter-row-2 > *,
.m-mode-toggle-row > * {
  min-width: 0;
}

.m-mode-btn {
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-sc-cmp-line {
  min-width: 0;
}

.m-sc-market-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 380px) {
  .mobile-tab-item {
    font-size: 0.72rem;
    padding: 7px 4px;
  }

  .m-filter-row-2 {
    grid-template-columns: 1fr;
  }

  .m-mode-btn {
    font-size: 0.66rem;
    padding: 7px 2px;
  }

  .mobile-commodity-2col-grid {
    grid-template-columns: 1fr;
  }

  .m-sc-price {
    font-size: 1.15rem;
  }

  .m-matrix-table thead th.m-mx-sticky,
  .m-matrix-table tbody td.m-mx-sticky {
    min-width: 120px;
    max-width: 135px;
  }
}

</style>
