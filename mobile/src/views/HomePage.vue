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
        <!-- SUB-VIEW A: PENGAJUAN HARGA PANGAN HYBRID (STAF / SUPERADMIN) -->
        <div v-if="menuPetugas === 'input-harga' || menuPetugas === 'tetapkan'" class="staff-view-container">
          <div class="staff-heading-area" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h1 class="staff-view-title">Pengajuan Harga Pangan per Pasar</h1>
              <p class="staff-view-desc">
                Tambahkan komoditas satu per satu atau muat semua harga pasar untuk edit cepat, simpan Draft, lalu ajukan ke Kepala Bidang.
              </p>
            </div>
            <button
              v-if="isKabid"
              type="button"
              class="btn-m-super-csv"
              style="background: #166534; color: #ffffff; padding: 6px 12px; font-size: 0.78rem; border-radius: 6px;"
              @click="unduhLaporanPanganKabid"
            >
              📊 Unduh Excel
            </button>
          </div>

          <!-- Alert jika berhasil simpan/ajukan -->
          <div v-if="pesanSuksesMobile" class="staff-success-banner">
            {{ pesanSuksesMobile }}
          </div>

          <!-- SUB-TAB PENGAJUAN: BARU | DAFTAR | TERBIT -->
          <div class="m-pengajuan-subtabs">
            <button
              type="button"
              :class="['m-pengajuan-stab', subTabPengajuanStafMobile === 'baru' ? 'active' : '']"
              @click="subTabPengajuanStafMobile = 'baru'"
            >
              {{
                dokumenPengajuanDieditMobile?.id
                  ? `✏️ Ubah ${pengajuanHargaMobileService.formatLabelStatus(dokumenPengajuanDieditMobile.status)}`
                  : dokumenPengajuanDieditMobile?.status === 'Revisi'
                    ? '🔄 Revisi'
                    : '📝 Baru'
              }}
            </button>
            <button
              type="button"
              :class="['m-pengajuan-stab', subTabPengajuanStafMobile === 'daftar' ? 'active' : '']"
              @click="subTabPengajuanStafMobile = 'daftar'"
            >
              📋 Daftar ({{ daftarPengajuanHargaMobile.length }})
            </button>
            <button
              type="button"
              :class="['m-pengajuan-stab', subTabPengajuanStafMobile === 'terbit' ? 'active' : '']"
              @click="subTabPengajuanStafMobile = 'terbit'"
            >
              🏷️ Terbit ({{ hargaAktifPasarDipilihMobile.length }})
            </button>
          </div>

          <!-- ── TAB 1: PENGAJUAN BARU (FORM + DAFTAR HARGA PANGAN HYBRID) ── -->
          <template v-if="subTabPengajuanStafMobile === 'baru'">
            <!-- Banner Konteks Edit / Revisi -->
            <div
              v-if="dokumenPengajuanDieditMobile"
              :class="[
                'm-pengajuan-ctx-banner',
                dokumenPengajuanDieditMobile.status === 'Revisi'
                  ? 'is-reject'
                  : dokumenPengajuanDieditMobile.status === 'Draft'
                    ? 'is-draft'
                    : 'is-pending'
              ]"
            >
              <div>
                <template v-if="dokumenPengajuanDieditMobile.status === 'Revisi'">
                  <strong>🔄 Mode Revisi ({{ dokumenPengajuanDieditMobile.nama_pasar }}):</strong>
                  {{ dokumenPengajuanDieditMobile.catatan_verifikasi || 'Perbaiki harga lalu Ajukan kembali.' }}
                </template>
                <template v-else-if="dokumenPengajuanDieditMobile.status === 'Draft'">
                  <strong>📝 Membuka Draft ({{ dokumenPengajuanDieditMobile.nama_pasar }}):</strong> Ubah daftar lalu klik Simpan atau Ajukan.
                </template>
                <template v-else>
                  <strong>⏳ Mengubah Pengajuan Aktif ({{ dokumenPengajuanDieditMobile.nama_pasar }}):</strong> Mengajukan ulang akan otomatis menimpa paket ini.
                </template>
              </div>
              <button type="button" class="m-staf-mini-btn" style="margin-top: 6px;" @click="mulaiPengajuanBaruKosongMobile">
                ➕ Buat Pengajuan Baru
              </button>
            </div>

            <!-- Banner Paket Aktif / Draft jika belum masuk mode edit -->
            <div
              v-else-if="pengajuanAktifPasarIniMobile || draftAktifPasarIniMobile"
              class="m-pengajuan-ctx-banner is-pending"
            >
              <div>
                <template v-if="pengajuanAktifPasarIniMobile">
                  <strong>⏳ Ada Pengajuan Aktif ({{ pengajuanAktifPasarIniMobile.items?.length || 0 }} komoditas)</strong> untuk {{ formPenetapan.nama_pasar }} tanggal ini. Muat untuk ubah agar item lama terbawa.
                </template>
                <template v-else-if="draftAktifPasarIniMobile">
                  <strong>📝 Ada Draft Tersimpan ({{ draftAktifPasarIniMobile.items?.length || 0 }} komoditas)</strong> untuk {{ formPenetapan.nama_pasar }} tanggal ini.
                </template>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                <button
                  type="button"
                  class="m-staf-mini-btn"
                  @click="bukaDokumenUntukUbahMobile((pengajuanAktifPasarIniMobile || draftAktifPasarIniMobile)!)"
                >
                  📂 Muat untuk Ubah
                </button>
                <button
                  v-if="pengajuanAktifPasarIniMobile"
                  type="button"
                  class="m-staf-mini-btn"
                  style="color: #b91c1c; border-color: #fca5a5;"
                  :disabled="sedangAjukanBatchMobile"
                  @click="batalkanPengajuanBatchMobile(pengajuanAktifPasarIniMobile)"
                >
                  🗑️ Batalkan
                </button>
              </div>
            </div>

            <!-- Bilah Pintasan Draft Tersimpan per Pasar (Terpisah & Tidak Saling Menimpa) -->
            <div
              v-if="daftarPengajuanHargaMobile.some((p) => p.status === 'Draft')"
              style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px; margin-bottom: 10px;"
            >
              <div style="font-size: 0.72rem; font-weight: 800; color: #1e3a8a; margin-bottom: 6px;">
                📝 Draft Tersimpan (Terpisah per Pasar):
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button
                  v-for="dr in daftarPengajuanHargaMobile.filter((p) => p.status === 'Draft')"
                  :key="dr.id"
                  type="button"
                  class="m-staf-mini-btn"
                  :style="
                    dokumenPengajuanDieditMobile?.id && String(dokumenPengajuanDieditMobile.id) === String(dr.id)
                      ? 'background: #1d4ed8; color: #ffffff; border-color: #1d4ed8;'
                      : 'background: #ffffff; color: #1e40af; border-color: #93c5fd;'
                  "
                  @click="bukaDokumenUntukUbahMobile(dr)"
                >
                  📍 {{ dr.nama_pasar }} ({{ dr.items?.length || 0 }})
                </button>
              </div>
            </div>

            <!-- PANEL 1: FORM PENGAJUAN BARU -->
            <div class="staff-form-panel" id="formPenetapanPanel">
              <div style="margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <strong style="font-size: 0.94rem; color: #0f172a;">📝 Pengajuan Baru</strong>
                <div style="font-size: 0.72rem; color: #64748b;">Pilih pasar &amp; komoditas, lalu klik Tambah ke Daftar Harga Pangan.</div>
              </div>

              <form @submit.prevent="tambahItemKeKeranjangMobile">
                <div class="m-fast-header-grid">
                  <div class="s-field">
                    <label>Pilih Pasar *</label>
                    <select
                      :value="formPenetapan.nama_pasar"
                      @change="gantiPasarPengajuanMobile(($event.target as HTMLSelectElement).value, $event.target as HTMLSelectElement)"
                      class="s-select-market"
                      required
                    >
                      <option value="">-- Pilih Pasar --</option>
                      <option v-for="p in Array.from(new Set([...daftarPasar, formPenetapan.nama_pasar].filter(Boolean)))" :key="p" :value="p">
                        {{ p }}
                      </option>
                    </select>
                  </div>
                  <div class="s-field">
                    <label>Tanggal *</label>
                    <input
                      type="date"
                      :value="tanggalPengambilanMobile"
                      @change="gantiTanggalPengajuanMobile(($event.target as HTMLInputElement).value, $event.target as HTMLInputElement)"
                      class="m-date-input"
                      required
                    />
                  </div>
                </div>

                <div class="s-field" style="margin-bottom: 8px;">
                  <label>Jenis Komoditas</label>
                  <select
                    v-model="jenisKomoditasTerpilihMobile"
                    @change="formPenetapan.nama_komoditas = ''; if (jenisKomoditasTerpilihMobile !== 'Semua') formPenetapan.kategori = jenisKomoditasTerpilihMobile"
                    class="s-select-market"
                  >
                    <option value="Semua">Semua Jenis Komoditas</option>
                    <option v-for="kat in daftarJenisKomoditasMobile" :key="kat" :value="kat">{{ kat }}</option>
                  </select>
                </div>

                <div class="s-field" style="margin-bottom: 8px;">
                  <label>Nama Komoditas *</label>
                  <select
                    class="s-select-market"
                    :value="formPenetapan.nama_komoditas"
                    @change="pilihKomoditasMasterStafHybrid(($event.target as HTMLSelectElement).value)"
                    required
                  >
                    <option value="">-- Pilih Nama Komoditas --</option>
                    <optgroup v-for="grup in grupKomoditasTerfilterJenisMobile" :key="grup.kelompok" :label="`🌾 ${grup.kelompok}`">
                      <option v-for="k in grup.items" :key="k.nama_komoditas" :value="k.nama_komoditas">
                        {{ k.nama_komoditas }} ({{ formatSatuanTampil(k.satuan_bawaan) }})
                      </option>
                    </optgroup>
                  </select>
                </div>

                <div class="s-row-two" style="margin-bottom: 8px;">
                  <div class="s-field">
                    <label>Satuan</label>
                    <select v-model="formPenetapan.satuan" class="s-select-market">
                      <option
                        v-for="sat in Array.from(new Set([...daftarSatuan.map((s) => formatSatuanTampil(s)), formatSatuanTampil(formPenetapan.satuan)].filter(Boolean)))"
                        :key="sat"
                        :value="sat"
                      >
                        {{ sat }}
                      </option>
                    </select>
                  </div>
                  <div class="s-field">
                    <label>Harga Pangan (Rp) *</label>
                    <input
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      v-model="formPenetapan.harga"
                      @keydown="hanyaBolehAngka"
                      @input="formPenetapan.harga = (($event.target as HTMLInputElement).value || '').replace(/[^0-9]/g, '')"
                      required
                      placeholder="15000"
                    />
                  </div>
                </div>

                <!-- Patokan Harga Terbit Saat Ini -->
                <div v-if="formPenetapan.nama_komoditas && formPenetapan.nama_pasar" class="m-pengajuan-ref-box">
                  <template v-if="hargaTerbitKomoditasDipilihMobile">
                    <span>
                      🏷️ Terbit saat ini: <strong>{{ formatRupiah(hargaTerbitKomoditasDipilihMobile.harga) }}</strong> / {{ formatSatuanTampil(hargaTerbitKomoditasDipilihMobile.satuan) }}
                    </span>
                    <button
                      type="button"
                      class="m-staf-mini-btn"
                      @click="formPenetapan.harga = String(Math.round(Number(hargaTerbitKomoditasDipilihMobile.harga) || 0))"
                    >
                      Pakai Angka
                    </button>
                  </template>
                  <span v-else>✨ Komoditas ini belum memiliki harga terbit di {{ formPenetapan.nama_pasar }}.</span>
                </div>

                <!-- 3 TOMBOL UTAMA PERSIS CONTOH DOSEN: TAMBAH | SIMPAN | AJUKAN -->
                <div class="m-pengajuan-3btns">
                  <button type="submit" class="m-btn-p-tambah" :disabled="sedangAjukanBatchMobile">
                    ➕ Tambah
                  </button>
                  <button
                    type="button"
                    class="m-btn-p-simpan"
                    :disabled="sedangAjukanBatchMobile || ringkasanKeranjangMobile.valid.length === 0"
                    @click="simpanAtauAjukanPengajuanMobile('Draft')"
                  >
                    💾 Simpan
                  </button>
                  <button
                    type="button"
                    class="m-btn-p-ajukan"
                    :disabled="sedangAjukanBatchMobile || ringkasanKeranjangMobile.valid.length === 0"
                    @click="simpanAtauAjukanPengajuanMobile('Diajukan')"
                  >
                    {{ sedangAjukanBatchMobile ? '⏳...' : (sedangMenimpaDiajukanMobile ? '🔄 Timpa' : '📨 Ajukan') }}
                  </button>
                </div>
              </form>
            </div>

            <!-- PANEL 2: DAFTAR HARGA PANGAN (KERANJANG + PINTASAN HYBRID MUAT SEMUA) -->
            <div class="staff-list-panel">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                <div>
                  <strong style="font-size: 0.92rem; color: #0f172a;">📋 Daftar Harga Pangan ({{ keranjangPengajuanMobile.length }})</strong>
                  <div style="font-size: 0.72rem; color: #64748b;">
                    {{ formPenetapan.nama_pasar || 'Pilih pasar terlebih dahulu' }}
                  </div>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button
                    type="button"
                    class="m-btn-hybrid-load"
                    :disabled="!formPenetapan.nama_pasar || sedangAjukanBatchMobile"
                    @click="muatSemuaHargaPasarKeKeranjangMobile"
                  >
                    ⚡ Muat Harga Pasar
                  </button>
                  <button
                    v-if="keranjangPengajuanMobile.length > 0 && ringkasanKeranjangMobile.berubah.length > 0 && ringkasanKeranjangMobile.berubah.length < keranjangPengajuanMobile.length"
                    type="button"
                    class="m-staf-mini-btn"
                    @click="saringHanyaBerubahKeranjangMobile"
                  >
                    ✂️ Berubah ({{ ringkasanKeranjangMobile.berubah.length }})
                  </button>
                  <button
                    v-if="keranjangPengajuanMobile.length > 0"
                    type="button"
                    class="m-staf-mini-btn"
                    style="color: #b91c1c; border-color: #fca5a5;"
                    @click="kosongkanKeranjangMobile"
                  >
                    🗑️ Kosongkan
                  </button>
                </div>
              </div>

              <div v-if="keranjangPengajuanMobile.length > 4" class="m-fast-search-wrap">
                <input
                  type="text"
                  v-model="cariKeranjangStafMobile"
                  placeholder="🔍 Filter isi Daftar Harga Pangan..."
                  class="m-fast-search-input"
                />
              </div>

              <div v-if="keranjangPengajuanMobile.length === 0" class="m-empty-box">
                Daftar Harga Pangan masih kosong. Tambahkan komoditas lewat tombol <strong>➕ Tambah</strong> di atas, atau ketuk <strong>⚡ Muat Harga Pasar</strong> untuk langsung memuat semua komoditas pasar.
              </div>
              <div v-else class="m-fast-rows-list">
                <div
                  v-for="row in keranjangTerfilterMobile"
                  :key="row.tempId"
                  :class="['m-fast-row-card', cekBarisBerubahMobile(row) ? 'is-edited' : '']"
                >
                  <div class="m-fast-row-top">
                    <div>
                      <strong class="m-fast-row-name">{{ row.nama_komoditas }}</strong>
                      <div class="m-fast-row-meta">{{ row.kategori }} · {{ row.satuan }}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span :class="['m-fast-diff-badge', hitungBadgeSelisihMobile(row).kelas]">
                        {{ hitungBadgeSelisihMobile(row).teks }}
                      </span>
                      <button
                        type="button"
                        class="m-btn-row-hapus"
                        @click="hapusItemKeranjangMobile(row.tempId)"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <div class="m-fast-row-bottom">
                    <div class="m-fast-old-col">
                      <span class="m-fast-old-lbl">Harga Terbit</span>
                      <strong>{{ row.harga_lama !== null ? formatRupiah(row.harga_lama) : 'Baru' }}</strong>
                    </div>
                    <div class="m-fast-input-col">
                      <span class="m-fast-old-lbl">Harga Pangan (Rp)</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        placeholder="Isi angka..."
                        class="m-fast-num-input"
                        :value="row.harga_usulan"
                        @keydown="hanyaBolehAngka"
                        @input="ubahHargaItemKeranjangMobile(row.tempId, ($event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="m-fast-submit-panel">
                <div class="m-fast-safe-note">
                  🛡️ {{ ringkasanKeranjangMobile.valid.length }} komoditas siap diproses. Harga publik tetap tayang sampai disetujui Kabid.
                </div>
                <div class="m-fast-submit-btns">
                  <button
                    type="button"
                    class="m-btn-p-simpan"
                    style="padding: 10px 12px;"
                    :disabled="sedangAjukanBatchMobile || ringkasanKeranjangMobile.valid.length === 0"
                    @click="simpanAtauAjukanPengajuanMobile('Draft')"
                  >
                    💾 Simpan Draft
                  </button>
                  <button
                    type="button"
                    class="btn-publish-action"
                    style="flex: 1; justify-content: center;"
                    :disabled="sedangAjukanBatchMobile || ringkasanKeranjangMobile.valid.length === 0"
                    @click="simpanAtauAjukanPengajuanMobile('Diajukan')"
                  >
                    {{
                      sedangAjukanBatchMobile
                        ? '⏳ Memproses...'
                        : sedangMenimpaDiajukanMobile
                          ? `🔄 Perbarui & Ajukan (${ringkasanKeranjangMobile.valid.length})`
                          : `📨 Ajukan (${ringkasanKeranjangMobile.valid.length})`
                    }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- ── TAB 2: DAFTAR PENGAJUAN (PERSIS TABEL DOSEN TANPA KODE PASAR) ── -->
          <div v-else-if="subTabPengajuanStafMobile === 'daftar'" class="staff-list-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
              <strong style="font-size: 0.94rem; color: #0f172a;">📋 Daftar Pengajuan</strong>
              <button type="button" class="m-staf-mini-btn" style="background: #8b1e1e; color: #fff; border-color: #8b1e1e;" @click="mulaiPengajuanBaruKosongMobile">
                ➕ Pengajuan Baru
              </button>
            </div>

            <div class="m-fast-pills-row">
              <button
                type="button"
                :class="['m-fast-pill', filterStatusPengajuanStafMobile === 'semua' ? 'active' : '']"
                @click="filterStatusPengajuanStafMobile = 'semua'"
              >
                Semua ({{ daftarPengajuanHargaMobile.length }})
              </button>
              <button
                type="button"
                :class="['m-fast-pill', filterStatusPengajuanStafMobile === 'Draft' ? 'active' : '']"
                @click="filterStatusPengajuanStafMobile = 'Draft'"
              >
                Draft ({{ daftarPengajuanHargaMobile.filter((x) => x.status === 'Draft').length }})
              </button>
              <button
                type="button"
                :class="['m-fast-pill', filterStatusPengajuanStafMobile === 'Diajukan' ? 'active' : '']"
                @click="filterStatusPengajuanStafMobile = 'Diajukan'"
              >
                Diajukan ({{ daftarPengajuanHargaMobile.filter((x) => x.status === 'Diajukan').length }})
              </button>
              <button
                type="button"
                :class="['m-fast-pill', filterStatusPengajuanStafMobile === 'Diverifikasi' ? 'active' : '']"
                @click="filterStatusPengajuanStafMobile = 'Diverifikasi'"
              >
                Disetujui ({{ daftarPengajuanHargaMobile.filter((x) => x.status === 'Diverifikasi').length }})
              </button>
              <button
                type="button"
                :class="['m-fast-pill', filterStatusPengajuanStafMobile === 'Ditolak' ? 'active' : '']"
                @click="filterStatusPengajuanStafMobile = 'Ditolak'"
              >
                Ditolak ({{ daftarPengajuanHargaMobile.filter((x) => x.status === 'Ditolak').length }})
              </button>
            </div>

            <div class="prices-items-stack">
              <div v-if="daftarPengajuanTerfilterMobile.length === 0" class="m-empty-box">
                {{ belumMigrasiPengajuanMobile ? 'Menunggu migrasi tabel pengajuan_harga.' : 'Belum ada dokumen pengajuan untuk status ini.' }}
              </div>
              <div v-else v-for="p in daftarPengajuanTerfilterMobile" :key="p.id" class="m-staf-sub-card">
                <div class="m-staf-sub-top">
                  <strong>📍 {{ p.nama_pasar }}</strong>
                  <span :class="['m-staf-batch-pill', 'st-' + String(p.status || 'Diajukan').toLowerCase()]">
                    {{ pengajuanHargaMobileService.formatLabelStatus(p.status) }}
                  </span>
                </div>
                <div class="m-staf-sub-meta">📅 {{ p.tanggal_tampil }} · {{ p.items?.length || 0 }} komoditas</div>
                <div v-if="p.catatan_verifikasi" :class="['m-staf-sub-note', p.status === 'Ditolak' ? 'is-reject' : '']">
                  💬 {{ p.catatan_verifikasi }}
                </div>
                <div class="m-staf-sub-btns">
                  <template v-if="p.status === 'Diverifikasi'">
                    <button type="button" class="m-staf-mini-btn" @click="detailPengajuanBatchMobile = p">👁️ Lihat</button>
                    <button type="button" class="m-staf-mini-btn" @click="bukaDokumenUntukUbahMobile(p, true)">📋 Salin ke Baru</button>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      :class="['m-staf-mini-btn', p.status === 'Ditolak' ? 'is-revisi' : '']"
                      @click="bukaDokumenUntukUbahMobile(p)"
                    >
                      {{ p.status === 'Ditolak' ? '🔄 Lihat / Revisi' : '✏️ Lihat / Ubah' }}
                    </button>
                    <button
                      v-if="p.status === 'Draft' || p.status === 'Diajukan'"
                      type="button"
                      class="m-staf-mini-btn"
                      style="color: #b91c1c; border-color: #fca5a5;"
                      :disabled="sedangAjukanBatchMobile"
                      @click="batalkanPengajuanBatchMobile(p)"
                    >
                      {{ p.status === 'Draft' ? '🗑️ Hapus' : '🗑️ Batalkan' }}
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- ── TAB 3: REFERENSI HARGA TERBIT PASAR INI ── -->
          <div v-else class="staff-list-panel">
            <div class="s-field" style="margin-bottom: 10px;">
              <label>Pilih Pasar Pantauan</label>
              <select
                :value="formPenetapan.nama_pasar"
                @change="gantiPasarPengajuanMobile(($event.target as HTMLSelectElement).value)"
                class="s-select-market"
              >
                <option value="">-- Pilih Pasar --</option>
                <option v-for="p in Array.from(new Set([...daftarPasar, formPenetapan.nama_pasar].filter(Boolean)))" :key="p" :value="p">
                  {{ p }}
                </option>
              </select>
            </div>
            <div class="prices-items-stack">
              <div v-if="hargaAktifPasarDipilihMobile.length === 0" class="m-empty-box">
                Belum ada komoditas terbit untuk {{ formPenetapan.nama_pasar || 'pasar ini' }}.
              </div>
              <div v-for="item in hargaAktifPasarDipilihMobile" :key="item.id" class="price-stack-row">
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
                    <button
                      type="button"
                      class="btn-mini-action edit"
                      @click.stop="
                        jenisKomoditasTerpilihMobile = item.kategori || 'Semua';
                        formPenetapan.nama_pasar = item.nama_pasar;
                        formPenetapan.nama_komoditas = item.nama_komoditas;
                        formPenetapan.kategori = item.kategori || 'Bahan Pokok';
                        formPenetapan.satuan = formatSatuanTampil(item.satuan);
                        formPenetapan.harga = String(Math.round(Number(item.harga) || 0));
                        subTabPengajuanStafMobile = 'baru';
                      "
                    >
                      ✏️ Ajukan Ubah
                    </button>
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

        <!-- SUB-VIEW B: DASHBOARD OPERASIONAL STAF & BERANDA PERAN LAINNYA -->
        <div v-if="menuPetugas === 'dashboard'" class="staff-view-container">
          <!-- BERANDA OPERASIONAL KHUSUS STAF -->
          <template v-if="peranAktif === 'Staf'">
            <div class="m-staf-hero-box">
              <span class="m-staf-date-chip">📅 Operasional · {{ ringkasanBerandaStafMobile.hariIniID }}</span>
              <h2 class="m-staf-hero-title">Halo, {{ userAktif?.nama || 'Staf Pangan' }}</h2>
              <p class="m-staf-hero-desc">
                Pantau progres survey harga per pasar hari ini, revisi dari Kepala Bidang, dan agenda pemindaian QR GPM.
              </p>
              <div class="m-staf-hero-btns">
                <button
                  type="button"
                  class="m-staf-hero-btn primary"
                  @click="bukaInputCepatPasarMobile(ringkasanBerandaStafMobile.statusPerPasar[0]?.nama_pasar || daftarPasar[0] || '')"
                >
                  📝 Input / Edit Harga
                </button>
                <button
                  type="button"
                  class="m-staf-hero-btn secondary"
                  @click="bukaMenuKelolaGpmMobile('aktif')"
                >
                  🎟️ Kelola GPM
                </button>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card">
                <div class="stat-val">{{ ringkasanBerandaStafMobile.kpi.pasarSelesaiHariIni }}/{{ ringkasanBerandaStafMobile.kpi.totalPasar }}</div>
                <div class="stat-lbl">Survey Hari Ini</div>
                <div class="stat-sub">{{ ringkasanBerandaStafMobile.kpi.persenProgresPasar }}% pasar selesai</div>
              </div>
              <div class="stat-box-card" @click="subTabPengajuanStafMobile = 'daftar'; menuPetugas = 'input-harga'" style="cursor: pointer;">
                <div class="stat-val" :style="{ color: ringkasanBerandaStafMobile.kpi.pengajuanDitolak > 0 ? '#dc2626' : '' }">
                  {{ ringkasanBerandaStafMobile.kpi.pengajuanMenunggu }}
                </div>
                <div class="stat-lbl">Menunggu Kabid</div>
                <div class="stat-sub">
                  {{ ringkasanBerandaStafMobile.kpi.pengajuanDitolak > 0 ? `⚠️ ${ringkasanBerandaStafMobile.kpi.pengajuanDitolak} ditolak` : '0 ditolak' }}
                  {{ ringkasanBerandaStafMobile.kpi.pengajuanDraft > 0 ? ` · 📝 ${ringkasanBerandaStafMobile.kpi.pengajuanDraft} draft` : '' }}
                </div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val">{{ ringkasanBerandaStafMobile.kpi.totalTerbit }}</div>
                <div class="stat-lbl">Harga Terbit</div>
                <div class="stat-sub">dari {{ ringkasanBerandaStafMobile.kpi.totalMasterKom }} master</div>
              </div>
              <div class="stat-box-card" @click="bukaMenuKelolaGpmMobile('aktif')" style="cursor: pointer;">
                <div class="stat-val">{{ ringkasanBerandaStafMobile.kpi.jumlahGPMAktif }}</div>
                <div class="stat-lbl">GPM Aktif</div>
                <div class="stat-sub">{{ ringkasanBerandaStafMobile.kpi.totalMenungguScanGPM }} tiket menunggu</div>
              </div>
            </div>

            <!-- Checklist Progres Survey Harga per Pasar -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>📋 Progres Survey per Pasar Hari Ini</h3>
                  <small>{{ ringkasanBerandaStafMobile.kpi.pasarPerluSurvey }} pasar belum diperbarui hari ini</small>
                </div>
                <span class="m-staf-pct-pill">{{ ringkasanBerandaStafMobile.kpi.persenProgresPasar }}%</span>
              </div>

              <div class="m-staf-bar-track">
                <div class="m-staf-bar-fill" :style="{ width: ringkasanBerandaStafMobile.kpi.persenProgresPasar + '%' }"></div>
              </div>

              <div v-if="ringkasanBerandaStafMobile.statusPerPasar.length === 0" class="m-empty-box" style="margin-top: 10px;">
                Belum ada pasar di Master Pasar.
              </div>
              <div v-else class="m-staf-market-list">
                <div
                  v-for="pasar in ringkasanBerandaStafMobile.statusPerPasar"
                  :key="pasar.nama_pasar"
                  :class="['m-staf-market-card', 'st-' + pasar.kodeStatus]"
                >
                  <div class="m-staf-mc-top">
                    <strong>📍 {{ pasar.nama_pasar }}</strong>
                    <span :class="['m-staf-status-tag', 'st-' + pasar.kodeStatus]">{{ pasar.labelStatus }}</span>
                  </div>
                  <div class="m-staf-mc-meta">
                    Kec. {{ pasar.kecamatan }} · {{ pasar.jumlahTerbit }}/{{ pasar.totalMasterKom || pasar.jumlahTerbit }} komoditas · Update: {{ pasar.tanggalTerakhir }}
                  </div>
                  <div v-if="pasar.catatanPenolakanTerbaru" class="m-staf-sub-note is-reject">
                    💬 Catatan Kabid: {{ pasar.catatanPenolakanTerbaru }}
                  </div>
                  <button
                    type="button"
                    :class="['m-staf-mc-btn', pasar.kodeStatus === 'revisi' ? 'is-urgent' : '']"
                    @click="bukaInputCepatPasarMobile(pasar.nama_pasar)"
                  >
                    {{ pasar.kodeStatus === 'revisi' ? '🔄 Perbaiki Harga Pasar Ini →' : '✏️ Input / Edit Harga Pasar →' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Status Pengajuan Harga Terbaru -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>📨 Status Pengajuan Harga Terbaru</h3>
                  <small>Hasil verifikasi Kepala Bidang atas batch pasar Anda</small>
                </div>
              </div>

              <div v-if="ringkasanBerandaStafMobile.pengajuanTerbaru.length === 0" class="m-empty-box">
                Belum ada pengajuan harga batch tercatat.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="p in ringkasanBerandaStafMobile.pengajuanTerbaru" :key="p.id" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>📍 {{ p.nama_pasar }}</strong>
                    <span :class="['m-staf-batch-pill', 'st-' + String(p.status || 'Diajukan').toLowerCase()]">
                      {{ pengajuanHargaMobileService.formatLabelStatus(p.status) }}
                    </span>
                  </div>
                  <div class="m-staf-sub-meta">📅 {{ p.tanggal_tampil }} · {{ p.items?.length || 0 }} komoditas</div>
                  <div v-if="p.catatan_verifikasi" :class="['m-staf-sub-note', p.status === 'Ditolak' ? 'is-reject' : '']">
                    💬 {{ p.catatan_verifikasi }}
                  </div>
                  <div class="m-staf-sub-btns">
                    <button
                      v-if="p.status === 'Diverifikasi'"
                      type="button"
                      class="m-staf-mini-btn"
                      @click="detailPengajuanBatchMobile = p"
                    >
                      👁️ Lihat
                    </button>
                    <button
                      v-else
                      type="button"
                      :class="['m-staf-mini-btn', p.status === 'Ditolak' ? 'is-revisi' : '']"
                      @click="bukaDokumenUntukUbahMobile(p)"
                    >
                      {{ p.status === 'Ditolak' ? '🔄 Revisi' : '✏️ Lihat / Ubah' }}
                    </button>
                    <button
                      v-if="p.status === 'Diajukan' || p.status === 'Draft'"
                      type="button"
                      class="m-staf-mini-btn"
                      style="color: #b91c1c; border-color: #fca5a5;"
                      :disabled="sedangAjukanBatchMobile"
                      @click="batalkanPengajuanBatchMobile(p)"
                    >
                      {{ p.status === 'Draft' ? '🗑️ Hapus' : '🗑️ Batalkan' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Agenda GPM Terdekat -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>🎟️ Agenda Tugas GPM Terdekat</h3>
                  <small>Lokasi aktif siap layanan pemindaian QR</small>
                </div>
              </div>
              <div v-if="ringkasanBerandaStafMobile.agendaGPMTerdekat.length === 0" class="m-empty-box">
                Tidak ada jadwal GPM aktif saat ini.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="acara in ringkasanBerandaStafMobile.agendaGPMTerdekat" :key="acara.id" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>{{ acara.nama_acara }}</strong>
                    <span class="m-staf-batch-pill st-diverifikasi">{{ acara.statusOperasional.label }}</span>
                  </div>
                  <div class="m-staf-sub-meta">
                    📍 {{ acara.lokasi }} · 📅 {{ acara.tanggal }} ({{ acara.jam_mulai }}–{{ acara.jam_selesai }} WITA)
                  </div>
                  <div class="m-staf-sub-meta">
                    Terdaftar: <strong>{{ acara.statusOperasional.terisi }}/{{ acara.statusOperasional.kuotaMaks }}</strong> · Hadir: <strong>{{ acara.statusOperasional.totalHadir }}</strong>
                  </div>
                  <button
                    type="button"
                    class="m-staf-mc-btn"
                    style="background: #8b1e1e; margin-top: 8px;"
                    @click="menuPetugas = 'kelola-gpm'; bukaKelolaAcaraMobile(acara, 'scan')"
                  >
                    📂 Kelola Acara &amp; Pindai QR →
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- BERANDA OPERASIONAL KEPALA BIDANG (100% DATA RIIL + FILTER PERIODE) -->
          <template v-else-if="peranAktif === 'Kabid'">
            <div class="m-staf-hero-box">
              <span class="m-staf-date-chip">🏛️ {{ ringkasanBerandaKabidMobile.hariIniID }} · {{ ringkasanBerandaKabidMobile.labelPeriode }}</span>
              <h2 class="m-staf-hero-title">Halo, {{ userAktif?.nama || 'Kepala Bidang' }}</h2>
              <p class="m-staf-hero-desc">
                Ringkasan verifikasi harga pasar, progres update harian staf, dan capaian Gerakan Pangan Murah ({{ ringkasanBerandaKabidMobile.labelPeriode }}).
              </p>

              <div class="m-kabid-period-bar">
                <button
                  type="button"
                  :class="['m-kabid-period-btn', periodeBerandaKabidMobile === 'bulan_ini' ? 'active' : '']"
                  @click="periodeBerandaKabidMobile = 'bulan_ini'"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  :class="['m-kabid-period-btn', periodeBerandaKabidMobile === 'tahun_ini' ? 'active' : '']"
                  @click="periodeBerandaKabidMobile = 'tahun_ini'"
                >
                  Tahun {{ ringkasanBerandaKabidMobile.tahunBerjalan }}
                </button>
                <button
                  type="button"
                  :class="['m-kabid-period-btn', periodeBerandaKabidMobile === 'semua' ? 'active' : '']"
                  @click="periodeBerandaKabidMobile = 'semua'"
                >
                  Semua
                </button>
              </div>

              <div class="m-staf-hero-btns">
                <button type="button" class="m-staf-hero-btn primary" @click="subTabVerifKabidMobile = 'antrean'; menuPetugas = 'verif-harga'">
                  ✅ Verifikasi ({{ ringkasanBerandaKabidMobile.kpi.totalMenungguVerifikasi }})
                </button>
                <button type="button" class="m-staf-hero-btn secondary" @click="bukaTabInputLangsungKabidMobile">
                  ⚡ Input Langsung
                </button>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card" @click="subTabVerifKabidMobile = 'antrean'; menuPetugas = 'verif-harga'" style="cursor: pointer;">
                <div class="stat-val" style="color: #b45309;">{{ ringkasanBerandaKabidMobile.kpi.menungguVerifikasiPaket }}</div>
                <div class="stat-lbl">Menunggu Verif</div>
                <div class="stat-sub">paket pengajuan pasar</div>
              </div>
              <div class="stat-box-card" @click="subTabVerifKabidMobile = 'terbit'; menuPetugas = 'verif-harga'" style="cursor: pointer;">
                <div class="stat-val">{{ ringkasanBerandaKabidMobile.kpi.pasarSelesaiHariIni }}/{{ ringkasanBerandaKabidMobile.kpi.totalPasar }}</div>
                <div class="stat-lbl">Update Pasar Hari Ini</div>
                <div class="stat-sub">{{ ringkasanBerandaKabidMobile.kpi.persenKepatuhanPasar }}% · {{ ringkasanBerandaKabidMobile.kpi.totalHargaTerbit }} terbit</div>
              </div>
              <div class="stat-box-card" @click="bukaMenuKelolaGpmMobile('riwayat')" style="cursor: pointer;">
                <div class="stat-val" style="color: #166534;">{{ ringkasanBerandaKabidMobile.kpi.gpmTerlaksanaPeriode }}</div>
                <div class="stat-lbl">GPM Terlaksana</div>
                <div class="stat-sub">Aktif: {{ ringkasanBerandaKabidMobile.kpi.gpmAktifSekarang }} · Arsip: {{ ringkasanBerandaKabidMobile.kpi.gpmTerlaksanaTotalArsip }}</div>
              </div>
              <div class="stat-box-card" @click="subTabLaporanKabidMobile = 'gpm'; menuPetugas = 'laporan'" style="cursor: pointer;">
                <div class="stat-val" style="color: #1d4ed8;">{{ ringkasanBerandaKabidMobile.kpi.persenSerapanPeriode }}%</div>
                <div class="stat-lbl">Serapan GPM</div>
                <div class="stat-sub">{{ ringkasanBerandaKabidMobile.kpi.totalHadirPeriode }}/{{ ringkasanBerandaKabidMobile.kpi.totalKuotaPeriode }} hadir</div>
              </div>
            </div>

            <!-- Antrean Verifikasi Paket Harga -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>📦 Antrean Verifikasi Paket Harga</h3>
                  <small>Pengajuan resmi Staf siap disetujui sekaligus / ditolak</small>
                </div>
                <button type="button" class="m-btn-link-inline" @click="subTabVerifKabidMobile = 'antrean'; menuPetugas = 'verif-harga'">Buka →</button>
              </div>
              <div v-if="ringkasanBerandaKabidMobile.antreanPengajuanTerbaru.length === 0" class="m-empty-box">
                Tidak ada antrean paket pengajuan yang tertunda saat ini.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="p in ringkasanBerandaKabidMobile.antreanPengajuanTerbaru" :key="p.id" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>📍 {{ p.nama_pasar }}</strong>
                    <span class="m-staf-batch-pill st-diajukan">{{ p.items?.length || 0 }} komoditas</span>
                  </div>
                  <div class="m-staf-sub-meta">📅 {{ p.tanggal_tampil }} · 👤 {{ p.nama_petugas }}</div>
                  <div class="m-verif-actions" style="margin-top: 8px;">
                    <button type="button" class="btn-m-edit" @click="detailPengajuanBatchMobile = p">👁️ Tinjau</button>
                    <button type="button" class="btn-m-approve" :disabled="sedangAjukanBatchMobile" @click="setujuiPengajuanBatchMobile(p)">✓ Setujui</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status Update Pasar Hari Ini -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>🏪 Status Update Pasar Hari Ini</h3>
                  <small>{{ ringkasanBerandaKabidMobile.kpi.pasarSelesaiHariIni }} dari {{ ringkasanBerandaKabidMobile.kpi.totalPasar }} pasar sudah melapor</small>
                </div>
                <span class="m-staf-batch-pill st-diverifikasi">{{ ringkasanBerandaKabidMobile.kpi.persenKepatuhanPasar }}%</span>
              </div>
              <div v-if="ringkasanBerandaKabidMobile.kepatuhanPerPasar.length === 0" class="m-empty-box">
                Belum ada data master pasar.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="m in ringkasanBerandaKabidMobile.kepatuhanPerPasar" :key="m.nama_pasar" class="m-staf-market-card" :class="'st-' + m.kodeStatus">
                  <div class="m-staf-mc-top">
                    <strong>{{ m.nama_pasar }}</strong>
                    <span class="m-staf-status-tag" :class="'st-' + m.kodeStatus">{{ m.labelStatus }}</span>
                  </div>
                  <div class="m-staf-sub-meta">
                    {{ m.jumlahTerbit }} komoditas terbit<span v-if="m.jumlahPengajuanMenunggu > 0"> · {{ m.jumlahPengajuanMenunggu }} paket menunggu verif</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pelaksanaan GPM Periode Aktif -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>🎟️ Pelaksanaan GPM ({{ ringkasanBerandaKabidMobile.labelPeriode }})</h3>
                  <small>Realisasi kuota &amp; kehadiran warga</small>
                </div>
                <button
                  type="button"
                  class="m-btn-link-inline"
                  @click="filterLaporanGPMKabidMobile.periode = periodeBerandaKabidMobile; subTabLaporanKabidMobile = 'gpm'; menuPetugas = 'laporan'"
                >
                  Laporan →
                </button>
              </div>
              <div v-if="ringkasanBerandaKabidMobile.gpmPeriodeList.length === 0" class="m-empty-box">
                Belum ada kegiatan GPM pada periode {{ ringkasanBerandaKabidMobile.labelPeriode }}.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="a in ringkasanBerandaKabidMobile.gpmPeriodeList" :key="a.id" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>{{ a.nama_acara }}</strong>
                    <span :class="['m-staf-batch-pill', a.statusOperasional.sudahBerakhir ? 'st-diverifikasi' : 'st-diajukan']">
                      {{ a.statusOperasional.sudahBerakhir ? 'Selesai' : 'Aktif' }}
                    </span>
                  </div>
                  <div class="m-staf-sub-meta">📍 {{ a.lokasi }} ({{ a.kecamatan || '-' }}) · 📅 {{ a.tanggal }}</div>
                  <div class="m-staf-sub-meta">
                    Hadir <strong>{{ a.hadirRiil }}</strong> / {{ a.kuotaRiil }} kuota ({{ a.persenSerapan }}%) · Daftar: {{ a.terdaftarRiil }}
                  </div>
                  <div class="m-kabid-serapan-bar">
                    <div class="m-kabid-serapan-fill" :style="{ width: a.persenSerapan + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- BERANDA EKSEKUTIF KEPALA DINAS (100% DATA RIIL + FILTER PERIODE) -->
          <template v-else-if="peranAktif === 'Kadis'">
            <div class="m-staf-hero-box">
              <span class="m-staf-date-chip">🏛️ {{ ringkasanBerandaKadisMobile.hariIniID }} · {{ ringkasanBerandaKadisMobile.labelPeriode }}</span>
              <h2 class="m-staf-hero-title">Halo, {{ userAktif?.nama || 'Kepala Dinas' }}</h2>
              <p class="m-staf-hero-desc">
                Pemantauan strategis stabilitas harga pangan terbit, pemerataan Gerakan Pangan Murah per kecamatan, dan serapan kuota ({{ ringkasanBerandaKadisMobile.labelPeriode }}).
              </p>

              <div class="m-kabid-period-bar">
                <button
                  type="button"
                  :class="['m-kabid-period-btn', periodeBerandaKadisMobile === 'bulan_ini' ? 'active' : '']"
                  @click="periodeBerandaKadisMobile = 'bulan_ini'"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  :class="['m-kabid-period-btn', periodeBerandaKadisMobile === 'tahun_ini' ? 'active' : '']"
                  @click="periodeBerandaKadisMobile = 'tahun_ini'"
                >
                  Tahun {{ ringkasanBerandaKadisMobile.tahunBerjalan }}
                </button>
                <button
                  type="button"
                  :class="['m-kabid-period-btn', periodeBerandaKadisMobile === 'semua' ? 'active' : '']"
                  @click="periodeBerandaKadisMobile = 'semua'"
                >
                  Semua
                </button>
              </div>

              <div class="m-staf-hero-btns">
                <button type="button" class="m-staf-hero-btn primary" @click="menuPetugas = 'grafik-pangan'; muatTrenKadis()">
                  📈 Grafik Pangan
                </button>
                <button
                  type="button"
                  class="m-staf-hero-btn secondary"
                  @click="filterLaporanGPMKadisMobile.periode = periodeBerandaKadisMobile; subTabLaporanKadisMobile = 'gpm'; menuPetugas = 'laporan-gpm'"
                >
                  📋 Laporan Eksekutif
                </button>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div
                class="stat-box-card"
                style="cursor: pointer;"
                @click="subTabLaporanKadisMobile = 'harga'; menuPetugas = 'laporan-gpm'"
              >
                <div class="stat-val" style="color: #8b1e1e;">{{ ringkasanBerandaKadisMobile.kpi.jumlahKomoditasUnik }}</div>
                <div class="stat-lbl">Komoditas Terpantau</div>
                <div class="stat-sub">{{ ringkasanBerandaKadisMobile.kpi.totalHargaTerbit }} harga terbit · {{ ringkasanBerandaKadisMobile.kpi.pasarTerpantau }}/{{ ringkasanBerandaKadisMobile.kpi.totalPasarMaster }} pasar</div>
              </div>
              <div
                class="stat-box-card"
                style="cursor: pointer;"
                @click="filterLaporanGPMKadisMobile.periode = periodeBerandaKadisMobile; subTabLaporanKadisMobile = 'gpm'; menuPetugas = 'laporan-gpm'"
              >
                <div class="stat-val" style="color: #166534;">{{ ringkasanBerandaKadisMobile.kpi.gpmSelesaiPeriode }}</div>
                <div class="stat-lbl">GPM Terlaksana</div>
                <div class="stat-sub">Aktif: {{ ringkasanBerandaKadisMobile.kpi.gpmAktifPeriode }} · Arsip: {{ ringkasanBerandaKadisMobile.kpi.gpmSelesaiArsip }}</div>
              </div>
              <div
                class="stat-box-card"
                style="cursor: pointer;"
                @click="filterLaporanGPMKadisMobile.periode = periodeBerandaKadisMobile; subTabLaporanKadisMobile = 'gpm'; menuPetugas = 'laporan-gpm'"
              >
                <div class="stat-val" style="color: #1d4ed8;">{{ ringkasanBerandaKadisMobile.kpi.persenSerapanPeriode }}%</div>
                <div class="stat-lbl">Serapan Kuota GPM</div>
                <div class="stat-sub">{{ ringkasanBerandaKadisMobile.kpi.totalHadirPeriode }}/{{ ringkasanBerandaKadisMobile.kpi.totalKuotaPeriode }} hadir</div>
              </div>
              <div
                class="stat-box-card"
                style="cursor: pointer;"
                @click="filterLaporanGPMKadisMobile.periode = periodeBerandaKadisMobile; subTabLaporanKadisMobile = 'gpm'; menuPetugas = 'laporan-gpm'"
              >
                <div class="stat-val" style="color: #b45309;">{{ ringkasanBerandaKadisMobile.kpi.kecamatanTerjangkau }}/{{ ringkasanBerandaKadisMobile.kpi.totalKecamatan }}</div>
                <div class="stat-lbl">Cakupan Kecamatan</div>
                <div class="stat-sub">{{ ringkasanBerandaKadisMobile.kpi.persenCakupanWilayah }}% wilayah terjangkau</div>
              </div>
            </div>

            <!-- Pemerataan Pelaksanaan GPM per Kecamatan -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>🗺️ Pemerataan GPM per Kecamatan</h3>
                  <small>Sebaran &amp; serapan wilayah ({{ ringkasanBerandaKadisMobile.labelPeriode }})</small>
                </div>
                <button
                  type="button"
                  class="m-btn-link-inline"
                  @click="filterLaporanGPMKadisMobile.periode = periodeBerandaKadisMobile; subTabLaporanKadisMobile = 'gpm'; menuPetugas = 'laporan-gpm'"
                >
                  Laporan →
                </button>
              </div>
              <div v-if="ringkasanBerandaKadisMobile.pemerataanKecamatan.length === 0" class="m-empty-box">
                Belum ada data wilayah kecamatan.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="wil in ringkasanBerandaKadisMobile.pemerataanKecamatan" :key="wil.kecamatan" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>📍 {{ wil.kecamatan }}</strong>
                    <span :class="['m-staf-batch-pill', wil.totalKegiatan > 0 ? 'st-diverifikasi' : 'st-draft']">
                      {{ wil.totalKegiatan > 0 ? `${wil.totalKegiatan} kegiatan` : 'Belum ada' }}
                    </span>
                  </div>
                  <div class="m-staf-sub-meta">
                    Selesai: <strong>{{ wil.selesai }}</strong> · Aktif: <strong>{{ wil.aktif }}</strong> · Hadir: <strong>{{ wil.hadir }}</strong>/{{ wil.kuota }} ({{ wil.persenSerapan }}%)
                  </div>
                  <div class="m-kabid-serapan-bar">
                    <div class="m-kabid-serapan-fill" :style="{ width: wil.persenSerapan + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sorotan Disparitas Harga Antar Pasar -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>⚖️ Sorotan Disparitas Harga Pasar</h3>
                  <small>Komoditas dengan selisih harga tertinggi antar pasar (terbit)</small>
                </div>
                <button
                  type="button"
                  class="m-btn-link-inline"
                  @click="subTabLaporanKadisMobile = 'harga'; menuPetugas = 'laporan-gpm'"
                >
                  Semua →
                </button>
              </div>
              <div v-if="ringkasanBerandaKadisMobile.sorotanDisparitasHarga.length === 0" class="m-empty-box">
                Belum ada data harga pangan terbit untuk dianalisis.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="item in ringkasanBerandaKadisMobile.sorotanDisparitasHarga" :key="item.nama_komoditas" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>{{ item.nama_komoditas }} <small style="font-weight: 500; color: #64748b;">({{ formatSatuanTampil(item.satuan) }})</small></strong>
                    <span :class="['m-staf-batch-pill', item.persenDisparitas >= 15 ? 'st-ditolak' : item.disparitas > 0 ? 'st-diajukan' : 'st-diverifikasi']">
                      {{ item.disparitas > 0 ? `Selisih ${item.persenDisparitas}%` : 'Seragam' }}
                    </span>
                  </div>
                  <div class="m-staf-sub-meta">
                    Rata-rata: <strong style="color: #8b1e1e;">{{ formatRupiah(item.rataRata) }}</strong> · Rentang: {{ formatRupiah(item.terendah) }} – {{ formatRupiah(item.tertinggi) }} ({{ item.jumlahPasar }} pasar)
                  </div>
                  <div style="margin-top: 6px;">
                    <button
                      type="button"
                      class="btn-m-edit"
                      style="width: 100%;"
                      @click="bukaGrafikKomoditasKadisMobile(item.nama_komoditas)"
                    >
                      📈 Lihat Grafik Tren Komoditas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- BERANDA ADMINISTRATOR SISTEM (100% DATA RIIL) -->
          <template v-else-if="peranAktif === 'Admin'">
            <div class="m-staf-hero-box">
              <span class="m-staf-date-chip">🛡️ {{ ringkasanBerandaAdminMobile.hariIniID }} · Administrator Sistem</span>
              <h2 class="m-staf-hero-title">Halo, {{ userAktif?.nama || 'Admin' }}</h2>
              <p class="m-staf-hero-desc">
                Tata kelola akun pengguna, referensi Master Komoditas, Satuan, Pasar &amp; titik peta, Kecamatan, serta supervisi GPM.
              </p>
              <div class="m-staf-hero-btns">
                <button type="button" class="m-staf-hero-btn primary" @click="menuPetugas = 'kelola-user'">
                  👥 Pengguna ({{ ringkasanBerandaAdminMobile.kpi.totalPengguna }})
                </button>
                <button type="button" class="m-staf-hero-btn secondary" @click="menuPetugas = 'master-komoditas'">
                  🌾 Komoditas
                </button>
                <button type="button" class="m-staf-hero-btn secondary" @click="menuPetugas = 'master-wilayah'">
                  🗺️ Wilayah
                </button>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'kelola-user'">
                <div class="stat-val" style="color: #8b1e1e;">{{ ringkasanBerandaAdminMobile.kpi.totalPengguna }}</div>
                <div class="stat-lbl">Akun Pengguna</div>
                <div class="stat-sub">Staf {{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Staf }} · Kabid {{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Kabid }} · Kadis {{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Kadis }}</div>
              </div>
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'master-komoditas'">
                <div class="stat-val" style="color: #b45309;">{{ ringkasanBerandaAdminMobile.kpi.totalMasterKomoditas }}</div>
                <div class="stat-lbl">Master Komoditas</div>
                <div class="stat-sub">{{ ringkasanBerandaAdminMobile.kpi.totalKelompokKomoditas }} induk · {{ ringkasanBerandaAdminMobile.kpi.totalSatuan }} satuan</div>
              </div>
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'master-wilayah'">
                <div class="stat-val" style="color: #166534;">{{ ringkasanBerandaAdminMobile.kpi.pasarDenganPeta }}/{{ ringkasanBerandaAdminMobile.kpi.totalPasar }}</div>
                <div class="stat-lbl">Pasar Berpeta</div>
                <div class="stat-sub">{{ ringkasanBerandaAdminMobile.kpi.persenPasarBerpeta }}% · {{ ringkasanBerandaAdminMobile.kpi.totalKecamatan }} kec.</div>
              </div>
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'cek-gpm'">
                <div class="stat-val" style="color: #1d4ed8;">{{ ringkasanBerandaAdminMobile.kpi.gpmAktif }}</div>
                <div class="stat-lbl">GPM Aktif</div>
                <div class="stat-sub">{{ ringkasanBerandaAdminMobile.kpi.gpmSelesai }} selesai · {{ ringkasanBerandaAdminMobile.kpi.totalTerdaftarGPM }} daftar</div>
              </div>
            </div>

            <!-- Distribusi Akun per Peran -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>👥 Distribusi Akun per Peran</h3>
                  <small>Komposisi hak akses aktif di database</small>
                </div>
                <button type="button" class="m-btn-link-inline" @click="menuPetugas = 'kelola-user'">Kelola →</button>
              </div>
              <div class="m-admin-role-grid">
                <div class="m-admin-role-tile"><span>Staf</span><strong>{{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Staf }}</strong></div>
                <div class="m-admin-role-tile"><span>Kabid</span><strong>{{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Kabid }}</strong></div>
                <div class="m-admin-role-tile"><span>Kadis</span><strong>{{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Kadis }}</strong></div>
                <div class="m-admin-role-tile"><span>Admin</span><strong>{{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Admin }}</strong></div>
                <div class="m-admin-role-tile is-protected"><span>Superadmin 🔒</span><strong>{{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Superadmin }}</strong></div>
              </div>
            </div>

            <!-- Kelengkapan Peta Master Pasar -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>🗺️ Kelengkapan Titik Peta Pasar</h3>
                  <small>Status koordinat pasar untuk peta publik</small>
                </div>
                <button type="button" class="m-btn-link-inline" @click="menuPetugas = 'master-wilayah'">Atur →</button>
              </div>
              <div v-if="ringkasanBerandaAdminMobile.daftarPasarTanpaPeta.length === 0" class="m-empty-box" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">
                ✅ Seluruh {{ ringkasanBerandaAdminMobile.kpi.totalPasar }} pasar sudah memiliki titik koordinat peta.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="p in ringkasanBerandaAdminMobile.daftarPasarTanpaPeta" :key="p.id || p.nama_pasar" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>⚠️ {{ p.nama_pasar }}</strong>
                    <span class="m-staf-batch-pill st-diajukan">Belum berpeta</span>
                  </div>
                  <div class="m-staf-sub-meta">Lengkapi koordinat Latitude &amp; Longitude di menu Master Pasar &amp; Wilayah.</div>
                </div>
              </div>
            </div>
          </template>

          <!-- BERANDA PUSAT KENDALI SUPERADMIN (FULL FEATURE LINTAS PERAN) -->
          <template v-else>
            <div class="m-staf-hero-box">
              <span class="m-staf-date-chip">👑 {{ ringkasanBerandaAdminMobile.hariIniID }} · Mode Akses Penuh (Superadmin)</span>
              <h2 class="m-staf-hero-title">Halo, {{ userAktif?.nama || 'Superadmin' }}</h2>
              <p class="m-staf-hero-desc">
                Kendali penuh lintas peran (Staf, Kabid, Kadis, &amp; Admin) dengan data riil real-time Supabase.
              </p>
              <div class="m-staf-hero-btns">
                <button type="button" class="m-staf-hero-btn primary" @click="menuPetugas = 'verif-harga'">
                  ✅ Verifikasi ({{ ringkasanBerandaAdminMobile.kpi.pengajuanMenunggu }})
                </button>
                <button type="button" class="m-staf-hero-btn secondary" @click="menuPetugas = 'kelola-user'">
                  👥 Pengguna ({{ ringkasanBerandaAdminMobile.kpi.totalPengguna }})
                </button>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'verif-harga'">
                <div class="stat-val" style="color: #8b1e1e;">{{ ringkasanBerandaAdminMobile.kpi.totalHargaTerbit }}</div>
                <div class="stat-lbl">Harga Terbit</div>
                <div class="stat-sub">{{ ringkasanBerandaAdminMobile.kpi.pengajuanMenunggu }} paket menunggu verif</div>
              </div>
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'kelola-gpm'">
                <div class="stat-val" style="color: #166534;">{{ ringkasanBerandaAdminMobile.kpi.gpmAktif }}</div>
                <div class="stat-lbl">GPM Aktif</div>
                <div class="stat-sub">{{ ringkasanBerandaAdminMobile.kpi.gpmSelesai }} selesai · {{ ringkasanBerandaAdminMobile.kpi.totalHadirGPM }} hadir</div>
              </div>
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'kelola-user'">
                <div class="stat-val" style="color: #b45309;">{{ ringkasanBerandaAdminMobile.kpi.totalPengguna }}</div>
                <div class="stat-lbl">Total Akun</div>
                <div class="stat-sub">SA {{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Superadmin }} · Adm {{ ringkasanBerandaAdminMobile.kpi.rincianPeran.Admin }} · Lainnya {{ ringkasanBerandaAdminMobile.kpi.totalPengguna - ringkasanBerandaAdminMobile.kpi.rincianPeran.Superadmin - ringkasanBerandaAdminMobile.kpi.rincianPeran.Admin }}</div>
              </div>
              <div class="stat-box-card" style="cursor: pointer;" @click="menuPetugas = 'master-komoditas'">
                <div class="stat-val" style="color: #1d4ed8;">{{ ringkasanBerandaAdminMobile.kpi.totalMasterKomoditas }}</div>
                <div class="stat-lbl">Master Komoditas</div>
                <div class="stat-sub">{{ ringkasanBerandaAdminMobile.kpi.totalPasar }} pasar · {{ ringkasanBerandaAdminMobile.kpi.totalKecamatan }} kec.</div>
              </div>
            </div>

            <!-- Akses Cepat Seluruh 10 Modul (Superadmin Full Feature) -->
            <div class="m-qa-panel">
              <h3 class="m-qa-title">🧭 Akses Cepat Seluruh 10 Modul (Full Feature):</h3>
              <div class="m-qa-grid">
                <button type="button" class="m-qa-card" @click="menuPetugas = 'input-harga'">
                  <span class="m-qa-icon">📝</span>
                  <div class="m-qa-detail">
                    <strong>Masukan Data Pangan (Staf)</strong>
                    <small>Input &amp; ajukan paket harga komoditas per pasar</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card m-qa-primary" @click="menuPetugas = 'verif-harga'">
                  <span class="m-qa-icon">✅</span>
                  <div class="m-qa-detail">
                    <strong>Verifikasi &amp; Input Langsung (Kabid)</strong>
                    <small>{{ ringkasanBerandaAdminMobile.kpi.pengajuanMenunggu }} paket menunggu + input darurat</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'kelola-gpm'">
                  <span class="m-qa-icon">🎟️</span>
                  <div class="m-qa-detail">
                    <strong>Kelola &amp; Pindai QR GPM</strong>
                    <small>Jadwal GPM, scan QR, kuota &amp; selesaikan acara</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'laporan'">
                  <span class="m-qa-icon">📑</span>
                  <div class="m-qa-detail">
                    <strong>Laporan Bidang Pangan (Kabid)</strong>
                    <small>Rekap harga &amp; GPM, unduh Excel (.xlsx) &amp; PDF A4</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'grafik-pangan'; muatTrenKadis()">
                  <span class="m-qa-icon">📈</span>
                  <div class="m-qa-detail">
                    <strong>Grafik Tren Pangan (Kadis)</strong>
                    <small>Analisis fluktuasi harga &amp; ekspor Excel/PDF tren</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'laporan-gpm'">
                  <span class="m-qa-icon">📋</span>
                  <div class="m-qa-detail">
                    <strong>Laporan Eksekutif Kadis</strong>
                    <small>Rekap GPM &amp; harga terbit bertanda tangan Kadis</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card m-qa-primary" @click="menuPetugas = 'kelola-user'">
                  <span class="m-qa-icon">👥</span>
                  <div class="m-qa-detail">
                    <strong>Kelola Pengguna &amp; RBAC</strong>
                    <small>Atur semua peran (termasuk Superadmin) &amp; reset sandi</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'master-komoditas'">
                  <span class="m-qa-icon">🌾</span>
                  <div class="m-qa-detail">
                    <strong>Master Komoditas &amp; Satuan</strong>
                    <small>Komoditas induk/varian, edit, urutan tampil &amp; satuan</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'master-wilayah'">
                  <span class="m-qa-icon">🗺️</span>
                  <div class="m-qa-detail">
                    <strong>Master Pasar &amp; Wilayah</strong>
                    <small>Titik peta pasar tradisional &amp; kecamatan Kota Manado</small>
                  </div>
                </button>
                <button type="button" class="m-qa-card" @click="menuPetugas = 'cek-gpm'">
                  <span class="m-qa-icon">🔍</span>
                  <div class="m-qa-detail">
                    <strong>Supervisi Menu Cek GPM</strong>
                    <small>Inspeksi seluruh titik GPM aktif/arsip, warga &amp; Excel</small>
                  </div>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- SUB-VIEW C: PENGELOLAAN GPM — MASTER-DETAIL EVENT WORKSPACE (MOBILE RESPONSIF) -->
        <div v-if="menuPetugas === 'gpm' || menuPetugas === 'kelola-gpm'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Menu Kelola GPM</h1>
            <p class="staff-view-desc">
              Pilih acara GPM yang dijadwalkan untuk memindai QR, memantau antrean, dan mendaftarkan warga manual
            </p>
          </div>

          <!-- ═══════════════════════════════════════════════════════════════════
               MODE 1: DAFTAR GPM (AKTIF / DIJADWALKAN & RIWAYAT SELESAI)
               ═══════════════════════════════════════════════════════════════════ -->
          <template v-if="modeKelolaGpmMobile === 'daftar'">
            <div class="m-gpm-ws-topbar">
              <div class="m-gpm-ws-tabs">
                <button
                  type="button"
                  :class="['m-gpm-ws-tab-btn', tabDaftarGpmMobile === 'aktif' ? 'active' : '']"
                  @click="tabDaftarGpmMobile = 'aktif'"
                >
                  🎟️ Aktif ({{ daftarAcaraGPM.length }})
                </button>
                <button
                  type="button"
                  :class="['m-gpm-ws-tab-btn', tabDaftarGpmMobile === 'riwayat' ? 'active' : '']"
                  @click="tabDaftarGpmMobile = 'riwayat'"
                >
                  📜 Riwayat ({{ daftarRiwayatGPM.length }})
                </button>
              </div>
              <button
                type="button"
                class="m-gpm-btn-schedule"
                @click="modeKelolaGpmMobile = 'buat'"
              >
                ➕ Jadwalkan GPM Baru
              </button>
            </div>

            <!-- TAB 1A: DAFTAR GPM AKTIF / DIJADWALKAN -->
            <div v-if="tabDaftarGpmMobile === 'aktif'" class="staff-form-panel">
              <div class="m-gpm-sec-head-row">
                <div>
                  <h3 style="margin: 0; font-size: 0.98rem; font-weight: 800; color: #0f172a;">
                    🎟️ GPM Aktif &amp; Dijadwalkan
                  </h3>
                  <p style="margin: 2px 0 0 0; font-size: 0.76rem; color: #64748b;">
                    Ketuk acara untuk membuka Scan QR &amp; Rekap Antrean khusus acara tersebut.
                  </p>
                </div>
                <button
                  type="button"
                  class="m-gpm-refresh-chip"
                  @click="muatDataGPM()"
                >
                  🔄 Segarkan
                </button>
              </div>

              <div v-if="daftarAcaraGPM.length === 0" class="m-gpm-empty-card">
                <span class="m-gpm-empty-ico">📭</span>
                <h4>Belum Ada GPM yang Dijadwalkan</h4>
                <p>
                  Jadwalkan acara GPM terlebih dahulu agar muncul di sini dan siap untuk pendaftaran warga, pemindaian QR, maupun pendaftaran manual.
                </p>
                <div class="m-gpm-empty-actions">
                  <button
                    type="button"
                    class="m-gpm-btn-schedule"
                    @click="modeKelolaGpmMobile = 'buat'"
                  >
                    ➕ Jadwalkan GPM Pertama
                  </button>
                  <button
                    v-if="daftarRiwayatGPM.length > 0"
                    type="button"
                    class="m-gpm-btn-outline-slate"
                    @click="tabDaftarGpmMobile = 'riwayat'"
                  >
                    📜 Lihat {{ daftarRiwayatGPM.length }} Riwayat Selesai
                  </button>
                </div>
              </div>

              <div v-else class="m-gpm-active-list">
                <div
                  v-for="acara in daftarAcaraGPM"
                  :key="acara.id"
                  class="m-gpm-active-card"
                >
                  <div class="m-gpm-ac-top">
                    <span
                      :class="[
                        'm-gpm-status-pill',
                        'st-' + jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).kode.toLowerCase().replace(/\s+/g, '-')
                      ]"
                    >
                      {{ jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).label }}
                    </span>
                    <span class="m-gpm-mode-pill">
                      {{ String(acara.mode_penerima || 'individu').toLowerCase() === 'keluarga' ? '👨‍👩‍👧‍👦 1 KK' : '👤 1 NIK' }}
                    </span>
                  </div>

                  <h4 class="m-gpm-ac-title">{{ acara.nama_acara }}</h4>
                  <p class="m-gpm-ac-meta">📍 {{ acara.lokasi }} (Kec. {{ acara.kecamatan }})</p>
                  <p class="m-gpm-ac-meta">
                    📅 {{ jadwalGPMMobileService.formatTanggalID(acara.tanggal) }} · ⏰ {{ acara.jam_mulai }}–{{ acara.jam_selesai }} WITA
                  </p>

                  <div class="m-gpm-ac-metrics">
                    <div class="m-gpm-ac-m">
                      <span>Kuota</span>
                      <strong>{{ jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).kuotaMaks }}</strong>
                    </div>
                    <div class="m-gpm-ac-m">
                      <span>Daftar</span>
                      <strong style="color: #1d4ed8;">{{ jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).terisi }}</strong>
                    </div>
                    <div class="m-gpm-ac-m">
                      <span>Hadir</span>
                      <strong style="color: #15803d;">{{ jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).totalHadir }}</strong>
                    </div>
                    <div class="m-gpm-ac-m">
                      <span>Menunggu</span>
                      <strong style="color: #b45309;">{{ Math.max(0, (jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).terisi || 0) - (jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).totalHadir || 0)) }}</strong>
                    </div>
                  </div>

                  <div class="m-gpm-progress-track">
                    <div
                      class="m-gpm-progress-fill"
                      :class="{ full: jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).kuotaPenuh }"
                      :style="{ width: jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).persenTerisi + '%' }"
                    ></div>
                  </div>

                  <div v-if="acara.komoditas_tersedia" class="m-gpm-ac-komoditas">
                    🌾 {{ acara.komoditas_tersedia }}
                  </div>

                  <button
                    type="button"
                    class="m-gpm-ac-open-btn"
                    @click="bukaKelolaAcaraMobile(acara, 'scan')"
                  >
                    📂 Kelola Acara (Scan QR &amp; Antrean) →
                  </button>

                  <div class="m-gpm-ac-secondary-row">
                    <button
                      type="button"
                      class="m-gpm-ac-sec-btn is-manual"
                      :disabled="!jadwalGPMMobileService.hitungStatusOperasional(acara, waktuSekarangGPMMs).bisaDaftar"
                      @click="bukaModalManualMobile(acara.id)"
                    >
                      ➕ Manual
                    </button>
                    <button
                      v-if="isKabid"
                      type="button"
                      class="m-gpm-ac-sec-btn is-quota"
                      @click="bukaModalUbahKuotaMobile(acara)"
                    >
                      🔧 Kuota
                    </button>
                    <button
                      v-if="isKabid"
                      type="button"
                      class="m-gpm-ac-sec-btn is-close"
                      :disabled="sedangSelesaikanAcaraMobile"
                      @click="selesaikanAcaraMobile(acara)"
                    >
                      🔒 Selesai
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 1B: RIWAYAT GPM SELESAI -->
            <div v-if="tabDaftarGpmMobile === 'riwayat'" class="staff-form-panel">
              <div class="m-gpm-sec-head-row">
                <div>
                  <h3 style="margin: 0; font-size: 0.98rem; font-weight: 800; color: #0f172a;">
                    📜 Riwayat Kegiatan GPM
                  </h3>
                  <p style="margin: 2px 0 0 0; font-size: 0.76rem; color: #64748b;">
                    Arsip kegiatan selesai / lewat jam WITA. {{ isKabid ? 'Kabid dapat ekspor Excel & hapus arsip.' : 'Staf dapat tinjau & unduh Excel.' }}
                  </p>
                </div>
                <button
                  type="button"
                  class="m-gpm-refresh-chip"
                  @click="muatDataGPM()"
                >
                  🔄 Segarkan
                </button>
              </div>

              <div v-if="daftarRiwayatGPM.length === 0" class="m-gpm-empty-card">
                <span class="m-gpm-empty-ico">📭</span>
                <h4>Belum Ada Riwayat GPM</h4>
                <p>Kegiatan GPM yang telah selesai akan otomatis terarsip di sini.</p>
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
                      📊 Excel (.xlsx)
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
          </template>

          <!-- ═══════════════════════════════════════════════════════════════════
               MODE 2: RUANG KERJA ACARA (EVENT WORKSPACE — TERKUNCI KE 1 ACARA)
               ═══════════════════════════════════════════════════════════════════ -->
          <template v-else-if="modeKelolaGpmMobile === 'kelola-acara'">
            <div v-if="!acaraGPMDipilih" class="staff-form-panel">
              <div class="m-gpm-empty-card">
                <h4>Acara GPM Tidak Aktif</h4>
                <p>Acara ini sudah selesai atau belum dipilih.</p>
                <button type="button" class="m-gpm-btn-schedule" @click="kembaliKeDaftarGpmMobile('aktif')">
                  ← Kembali ke Daftar GPM
                </button>
              </div>
            </div>

            <template v-else>
              <!-- Banner Konteks Acara -->
              <div class="m-gpm-ws-banner">
                <div class="m-gpm-ws-banner-top">
                  <button type="button" class="m-gpm-btn-back" @click="kembaliKeDaftarGpmMobile()">
                    ← Daftar GPM
                  </button>
                  <span
                    v-if="statusAcaraDipilihMobile"
                    :class="['m-gpm-status-pill', 'st-' + statusAcaraDipilihMobile.kode.toLowerCase().replace(/\s+/g, '-')]"
                  >
                    {{ statusAcaraDipilihMobile.label }}
                  </span>
                </div>

                <h2 class="m-gpm-ws-banner-title">{{ acaraGPMDipilih.nama_acara }}</h2>
                <p class="m-gpm-ws-banner-sub">
                  📍 {{ acaraGPMDipilih.lokasi }} (Kec. {{ acaraGPMDipilih.kecamatan }})
                </p>
                <p class="m-gpm-ws-banner-sub">
                  📅 {{ jadwalGPMMobileService.formatTanggalID(acaraGPMDipilih.tanggal) }} · ⏰ {{ acaraGPMDipilih.jam_mulai }}–{{ acaraGPMDipilih.jam_selesai }} WITA
                </p>

                <div v-if="statusAcaraDipilihMobile" class="m-gpm-ac-metrics" style="margin-top: 10px;">
                  <div class="m-gpm-ac-m">
                    <span>Kuota</span>
                    <strong>{{ statusAcaraDipilihMobile.kuotaMaks }}</strong>
                  </div>
                  <div class="m-gpm-ac-m">
                    <span>Daftar</span>
                    <strong style="color: #1d4ed8;">{{ Math.max(pendaftarGPMList.length, statusAcaraDipilihMobile.terisi || 0) }}</strong>
                  </div>
                  <div class="m-gpm-ac-m">
                    <span>Hadir</span>
                    <strong style="color: #15803d;">{{ Math.max(pendaftarGPMList.filter(p => p.status_kehadiran === 'Hadir').length, statusAcaraDipilihMobile.totalHadir || 0) }}</strong>
                  </div>
                  <div class="m-gpm-ac-m">
                    <span>Menunggu</span>
                    <strong style="color: #b45309;">{{ Math.max(0, Math.max(pendaftarGPMList.length, statusAcaraDipilihMobile.terisi || 0) - Math.max(pendaftarGPMList.filter(p => p.status_kehadiran === 'Hadir').length, statusAcaraDipilihMobile.totalHadir || 0)) }}</strong>
                  </div>
                </div>

                <div v-if="statusAcaraDipilihMobile" class="m-gpm-progress-track" style="margin-top: 8px;">
                  <div
                    class="m-gpm-progress-fill"
                    :class="{ full: statusAcaraDipilihMobile.kuotaPenuh }"
                    :style="{ width: statusAcaraDipilihMobile.persenTerisi + '%' }"
                  ></div>
                </div>

                <div class="m-gpm-ws-quick-actions">
                  <button
                    type="button"
                    class="btn-m-tambah-manual"
                    :disabled="!statusAcaraDipilihMobile?.bisaDaftar"
                    @click="bukaModalManualMobile(acaraGPMDipilih.id)"
                  >
                    {{ statusAcaraDipilihMobile?.kuotaPenuh ? '🚫 Penuh' : '➕ Daftar Manual' }}
                  </button>
                  <button
                    type="button"
                    class="btn-m-export-csv"
                    @click="unduhRekapAktifMobile"
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    v-if="isKabid && !statusAcaraDipilihMobile?.sudahBerakhir"
                    type="button"
                    class="btn-m-ubah-kuota"
                    @click="bukaModalUbahKuotaMobile(acaraGPMDipilih)"
                  >
                    🔧 Atur Kuota
                  </button>
                  <button
                    v-if="isKabid"
                    type="button"
                    class="btn-m-close-gpm"
                    :disabled="sedangSelesaikanAcaraMobile"
                    @click="selesaikanAcaraMobile(acaraGPMDipilih)"
                  >
                    {{ sedangSelesaikanAcaraMobile ? 'Memproses...' : '🔒 Selesaikan' }}
                  </button>
                </div>
              </div>

              <!-- 2 Inner Sub-Tab Fokus: Pindai QR & Rekap Antrean -->
              <div class="m-gpm-inner-two-tabs">
                <button
                  type="button"
                  :class="['m-gpm-ws-tab-btn', tabAcaraGpmMobile === 'scan' ? 'active' : '']"
                  @click="tabAcaraGpmMobile = 'scan'"
                >
                  📷 Pindai QR Tiket
                </button>
                <button
                  type="button"
                  :class="['m-gpm-ws-tab-btn', tabAcaraGpmMobile === 'antrean' ? 'active' : '']"
                  @click="tabAcaraGpmMobile = 'antrean'"
                >
                  👥 Rekap Antrean ({{ pendaftarGPMList.length }})
                </button>
              </div>

              <!-- SUB-TAB 2A: PINDAI QR TIKET (TERKUNCI KE ACARA INI) -->
              <div v-if="tabAcaraGpmMobile === 'scan'" class="staff-form-panel">
                <div class="panel-title-row">
                  <span class="plus-icon-red">📷</span>
                  <h3>Pindai QR — {{ acaraGPMDipilih.nama_acara }}</h3>
                </div>
                <p style="font-size: 0.78rem; color: #64748b; margin: 4px 0 12px 0;">
                  Cocokkan Nomor Antrean, Nama, dan NIK warga dengan KTP fisik. Tiket dari acara GPM lain otomatis ditolak.
                </p>

                <!-- Tombol Buka / Tutup Kamera Pemindai Mobile -->
                <div style="margin-bottom: 14px;">
                  <button
                    v-if="!kameraAktifMobile"
                    type="button"
                    @click="mulaiScanKameraMobile"
                    style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; font-size: 0.92rem; font-weight: 700; background: #8b1e1e; color: #ffffff; border-radius: 10px; border: none; box-shadow: 0 4px 12px rgba(139,30,30,0.25); cursor: pointer;"
                  >
                    📷 Buka Kamera Pemindai (Scan QR)
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="hentikanScanKameraMobile"
                    style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; font-weight: 700; background: #475569; color: #ffffff; border-radius: 10px; border: none; cursor: pointer;"
                  >
                    ✕ Tutup Kamera
                  </button>
                </div>

                <!-- Viewfinder Kamera Scanner Mobile -->
                <div v-if="kameraAktifMobile" style="margin-bottom: 16px; background: #0f172a; border-radius: 12px; overflow: hidden; padding: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
                  <div id="mobileQrReader" style="width: 100%; border-radius: 8px; overflow: hidden;"></div>
                  <p style="text-align: center; color: #cbd5e1; font-size: 0.74rem; margin: 6px 0 2px 0;">
                    Arahkan kamera ke layar HP warga atau gambar tiket QR
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

                <!-- HASIL SCAN PROFIL PENDAFTAR (RINGKAS: NOMOR ANTREAN, NAMA, NIK + TOLAK SALAH ACARA) -->
                <div
                  v-if="hasilScanPetugas"
                  class="m-scan-profile-result"
                  :style="isTiketSalahAcaraMobile ? { borderColor: '#dc2626' } : undefined"
                >
                  <div class="m-profile-header">
                    <span
                      :style="{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: isTiketSalahAcaraMobile ? '#dc2626' : '#2e7d32'
                      }"
                    >
                      {{ isTiketSalahAcaraMobile ? '⚠️ TIKET BUKAN UNTUK ACARA INI' : '✓ DATA PENDAFTAR VALID' }}
                    </span>
                    <span class="m-badge-queue">
                      #{{ String(hasilScanPetugas.nomor_antrean).padStart(3, '0') }}
                    </span>
                  </div>

                  <!-- Blokir otomatis bila tiket milik acara GPM lain -->
                  <div v-if="isTiketSalahAcaraMobile" class="m-error-alert" style="margin: 8px 0;">
                    🚫 Tiket ini terdaftar untuk acara lain: <strong>{{ hasilScanPetugas.acara?.nama_acara || 'kegiatan GPM lain' }}</strong><span v-if="hasilScanPetugas.acara?.lokasi"> ({{ hasilScanPetugas.acara.lokasi }})</span>. Verifikasi dikunci agar tidak salah lokasi.
                  </div>

                  <div class="m-profile-info-grid">
                    <div style="grid-column: 1 / -1;">
                      <span class="m-info-lbl">Nama Lengkap</span>
                      <strong class="m-info-val" style="font-size: 1rem;">{{ gpmMobileService.parseDataPendaftar(hasilScanPetugas).nama_bersih }}</strong>
                    </div>
                    <div style="grid-column: 1 / -1;">
                      <span class="m-info-lbl">NIK (16 Digit — Cocokkan dengan KTP)</span>
                      <strong class="m-info-val" style="font-family: monospace; font-size: 1.02rem; letter-spacing: 0.8px;">
                        {{ gpmMobileService.parseDataPendaftar(hasilScanPetugas).nik || '-' }}
                      </strong>
                    </div>
                    <div v-if="hasilScanPetugas.no_kk" style="grid-column: 1 / -1;">
                      <span class="m-info-lbl">No. Kartu Keluarga (Opsional)</span>
                      <strong class="m-info-val" style="font-family: monospace;">{{ hasilScanPetugas.no_kk }}</strong>
                    </div>
                    <div style="grid-column: 1 / -1;">
                      <span class="m-info-lbl">Status Kehadiran</span>
                      <span :class="['m-status-tag', hasilScanPetugas.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu']">
                        {{ hasilScanPetugas.status_kehadiran === 'Hadir' ? '✓ Hadir / Terverifikasi' : '⏳ Menunggu Verifikasi' }}
                      </span>
                    </div>
                  </div>

                  <template v-if="!isTiketSalahAcaraMobile">
                    <div
                      v-if="hasilScanPetugas.acara?.terkunci_waktu || (hasilScanPetugas.acara?.status || '').toLowerCase() === 'selesai'"
                      class="m-gpm-locked-banner locked-ended"
                      style="margin-top: 10px;"
                    >
                      <span class="m-lock-ico">🔒</span>
                      <div>
                        <strong>Tiket QR Terkunci (Acara Telah Berakhir)</strong>
                        <p>Jadwal GPM telah melewati jam tutup ({{ hasilScanPetugas.acara?.jam_selesai || '-' }} WITA) atau berstatus Selesai.</p>
                      </div>
                    </div>
                    <div v-else-if="hasilScanPetugas.status_kehadiran === 'Hadir'" class="m-verified-box">
                      <div>
                        ✅ Pendaftar telah diverifikasi hadir ({{ hasilScanPetugas.status_pengambilan === 'Sudah Diambil' ? '📦 Pangan Sudah Diambil' : '⏳ Belum Mengambil Pangan' }}).
                      </div>
                      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                        <button
                          v-if="hasilScanPetugas.status_pengambilan !== 'Sudah Diambil'"
                          type="button"
                          class="btn-m-verify-confirm"
                          style="background: #0369a1; flex: 1; padding: 8px 10px; font-size: 0.78rem;"
                          @click="konfirmasiPengambilanPanganMobile(hasilScanPetugas.id, true)"
                        >
                          📦 Konfirmasi Ambil Pangan
                        </button>
                        <button
                          type="button"
                          class="btn-m-cancel-hadir"
                          @click="verifikasiKehadiranMobile('Menunggu')"
                        >
                          ↩ Batalkan Kehadiran
                        </button>
                      </div>
                    </div>
                    <button
                      v-else
                      type="button"
                      class="btn-m-verify-confirm"
                      @click="verifikasiKehadiranMobile('Hadir')"
                    >
                      ✅ Konfirmasi Kehadiran &amp; Layani Antrean
                    </button>
                  </template>
                </div>
              </div>

              <!-- SUB-TAB 2B: REKAP ANTREAN & PENDAFTAR (KHUSUS ACARA INI) -->
              <div v-if="tabAcaraGpmMobile === 'antrean'" class="staff-form-panel">
                <div class="m-gpm-sec-head-row">
                  <div>
                    <h3 style="margin: 0; font-size: 0.96rem; font-weight: 800; color: #0f172a;">
                      👥 Rekap Antrean Warga
                    </h3>
                    <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b;">
                      Total {{ pendaftarGPMList.length }} pendaftar pada acara ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="m-gpm-refresh-chip"
                    @click="muatDataGPM()"
                  >
                    🔄 Segarkan
                  </button>
                </div>

                <div v-if="pendaftarGPMList.length === 0" class="m-gpm-empty-card" style="padding: 20px 14px;">
                  <p style="margin: 0;">Belum ada pendaftar nomor antrean untuk acara ini.</p>
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
                        <span
                          v-if="item.status_kehadiran === 'Hadir'"
                          :style="{ fontSize: '0.68rem', fontWeight: 700, color: item.status_pengambilan === 'Sudah Diambil' ? '#15803d' : '#b45309' }"
                        >
                          {{ item.status_pengambilan === 'Sudah Diambil' ? '📦 Diambil' : '⏳ Belum Diambil' }}
                        </span>
                        <button
                          v-if="!statusAcaraDipilihMobile?.sudahBerakhir"
                          type="button"
                          :class="['btn-m-toggle-hadir', item.status_kehadiran === 'Hadir' ? 'batal' : 'hadirkan']"
                          @click="ubahStatusPendaftarDiListMobile(item)"
                        >
                          {{ item.status_kehadiran === 'Hadir' ? '↩ Batal' : '✓ Hadirkan' }}
                        </button>
                        <button
                          v-if="!statusAcaraDipilihMobile?.sudahBerakhir && item.status_kehadiran === 'Hadir' && item.status_pengambilan !== 'Sudah Diambil'"
                          type="button"
                          class="btn-m-toggle-hadir"
                          style="background: #0369a1; color: #ffffff; border-color: #0369a1;"
                          @click="konfirmasiPengambilanPanganMobile(item.id, false)"
                        >
                          📦 Ambil Pangan
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </template>

          <!-- ═══════════════════════════════════════════════════════════════════
               MODE 3: FORM JADWALKAN ACARA GPM BARU
               ═══════════════════════════════════════════════════════════════════ -->
          <div v-else-if="modeKelolaGpmMobile === 'buat'" class="staff-form-panel">
            <div class="m-gpm-sec-head-row" style="margin-bottom: 12px;">
              <div class="panel-title-row" style="margin: 0;">
                <span class="plus-icon-red">📍</span>
                <h3 style="margin: 0;">Jadwalkan GPM Baru</h3>
              </div>
              <button type="button" class="m-gpm-btn-back" @click="kembaliKeDaftarGpmMobile()">
                ← Daftar GPM
              </button>
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
                ⏱️ Acara otomatis terkunci &amp; berpindah ke Riwayat pada pukul <strong>{{ formGPMBaru.jam_selesai || '14:00' }} WITA</strong>.
              </div>

              <!-- Titik Peta Pasar Resmi dari Master Pasar Supabase -->
              <div v-if="presetLokasiPasarMobile.length > 0" class="s-field">
                <label>Titik Lokasi Pasar Resmi (Master Data Supabase)</label>
                <div class="m-preset-loc-chips">
                  <button
                    v-for="preset in presetLokasiPasarMobile"
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
              <div class="s-row-two">
                <div class="s-field">
                  <label>Mode Pendaftaran Warga</label>
                  <select v-model="formGPMBaru.mode_pendaftaran" class="s-select-market">
                    <option value="online">🌐 Online + Lokasi</option>
                    <option value="keduanya">🔄 Online &amp; Langsung</option>
                    <option value="langsung">📍 Datang Langsung Saja</option>
                  </select>
                </div>
                <div class="s-field">
                  <label>Mekanisme Penerima</label>
                  <select v-model="formGPMBaru.mode_penerima" class="s-select-market">
                    <option value="individu">👤 Per Individu (1 NIK)</option>
                    <option value="keluarga">👨‍👩‍👧‍👦 Per Keluarga (1 KK)</option>
                  </select>
                </div>
              </div>

              <button type="submit" class="btn-publish-action" :disabled="sedangSimpanGPMBaru">
                <span>📍</span> {{ sedangSimpanGPMBaru ? 'Menyimpan ke Supabase...' : 'Terbitkan Acara ke Peta' }}
              </button>
            </form>
          </div>
        </div>

        <!-- SUB-VIEW D: VERIFIKASI & PENETAPAN HARGA PANGAN (KHUSUS KABID — 3 SUB-TAB SERAGAM DENGAN STAF) -->
        <div v-if="menuPetugas === 'verif-harga'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Verifikasi &amp; Penetapan Harga</h1>
            <p class="staff-view-desc">Setujui paket harga dari staf sekaligus, atau input &amp; terbitkan langsung bila staf berhalangan</p>
          </div>

          <div v-if="pesanSuksesMobile" class="staff-success-banner">
            {{ pesanSuksesMobile }}
          </div>

          <!-- 3 SUB-TAB KABID MOBILE -->
          <div class="m-verif-tabs" style="margin-bottom: 12px;">
            <button
              type="button"
              :class="['m-verif-tab', subTabVerifKabidMobile === 'antrean' ? 'active' : '']"
              @click="subTabVerifKabidMobile = 'antrean'"
            >
              📥 Antrean ({{ daftarPengajuanDiajukanMobile.length }})
            </button>
            <button
              type="button"
              :class="['m-verif-tab', subTabVerifKabidMobile === 'input' ? 'active' : '']"
              @click="bukaTabInputLangsungKabidMobile"
            >
              ⚡ Input Langsung
            </button>
            <button
              type="button"
              :class="['m-verif-tab', subTabVerifKabidMobile === 'terbit' ? 'active' : '']"
              @click="subTabVerifKabidMobile = 'terbit'"
            >
              ✅ Terbit ({{ komoditasTerbit.length }})
            </button>
          </div>

          <!-- ─── TAB 1: ANTREAN VERIFIKASI + SETUJUI SEMUA SEKALIGUS ─── -->
          <template v-if="subTabVerifKabidMobile === 'antrean'">
            <div v-if="daftarPengajuanDiajukanMobile.length > 0" class="m-kabid-bulk-box">
              <div>
                <strong>⚡ Verifikasi Cepat Sekaligus</strong>
                <small>{{ daftarPengajuanDiajukanMobile.length }} paket pengajuan pasar menunggu persetujuan</small>
              </div>
              <button
                type="button"
                class="m-kabid-btn-bulk"
                :disabled="sedangAjukanBatchMobile"
                @click="setujuiSemuaAntreanMobile"
              >
                {{ sedangAjukanBatchMobile ? '⏳ Memproses...' : `✓ Setujui Semua Paket (${daftarPengajuanDiajukanMobile.length})` }}
              </button>
            </div>

            <!-- Paket Pengajuan Pasar -->
            <div class="m-staf-ops-section" style="margin-bottom: 14px;">
              <div class="m-staf-sec-head">
                <div>
                  <h3>📦 Paket Pengajuan Pasar ({{ daftarPengajuanDiajukanMobile.length }})</h3>
                  <small>Klik Tinjau untuk cek perubahan, atau Setujui semua item pasar</small>
                </div>
              </div>

              <div v-if="daftarPengajuanDiajukanMobile.length === 0" class="m-empty-box">
                Tidak ada paket pengajuan pasar yang tertunda saat ini.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="p in daftarPengajuanDiajukanMobile" :key="p.id" class="m-verif-batch-card">
                  <div class="m-staf-sub-top">
                    <strong>📍 {{ p.nama_pasar }}</strong>
                    <span class="m-staf-batch-pill st-diajukan">{{ p.items?.length || 0 }} komoditas</span>
                  </div>
                  <div class="m-staf-sub-meta">📅 {{ p.tanggal_tampil }} · 👤 {{ p.nama_petugas }}</div>
                  <div class="m-verif-batch-preview">
                    <div v-for="it in (p.items || []).slice(0, 4)" :key="it.id" class="m-vbp-row">
                      <div>
                        <span>{{ it.nama_komoditas }} ({{ it.satuan }})</span>
                        <div class="m-vbp-sub">
                          <template v-if="it.harga_lama !== null && it.harga_lama !== undefined">
                            Lama: {{ formatRupiah(it.harga_lama) }}
                            <span v-if="Number(it.harga) > Number(it.harga_lama)" class="m-vbp-diff up">▲ +{{ formatRupiah(Number(it.harga) - Number(it.harga_lama)) }}</span>
                            <span v-else-if="Number(it.harga) < Number(it.harga_lama)" class="m-vbp-diff down">▼ -{{ formatRupiah(Number(it.harga_lama) - Number(it.harga)) }}</span>
                            <span v-else class="m-vbp-diff same">Tetap</span>
                          </template>
                          <span v-else class="m-vbp-diff new">✨ Baru</span>
                        </div>
                      </div>
                      <strong>{{ formatRupiah(it.harga) }}</strong>
                    </div>
                    <div v-if="(p.items?.length || 0) > 4" style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">
                      +{{ (p.items?.length || 0) - 4 }} komoditas lainnya (klik Tinjau)
                    </div>
                  </div>
                  <div class="m-verif-actions" style="margin-top: 8px;">
                    <button type="button" class="btn-m-approve" :disabled="sedangAjukanBatchMobile" @click="setujuiPengajuanBatchMobile(p)">
                      ✓ Setujui ({{ p.items?.length || 0 }})
                    </button>
                    <button type="button" class="btn-m-edit" @click="detailPengajuanBatchMobile = p">
                      👁️ Tinjau
                    </button>
                    <button
                      type="button"
                      class="btn-m-del"
                      :disabled="sedangAjukanBatchMobile"
                      @click="modalTolakBatchMobile = { buka: true, pengajuan: p, catatan: '' }"
                    >
                      ✕ Tolak
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ─── TAB 2: INPUT & TERBITKAN LANGSUNG OLEH KABID (DARURAT) ─── -->
          <template v-else-if="subTabVerifKabidMobile === 'input'">
            <div class="m-kabid-direct-banner">
              ⚡ <strong>Wewenang Langsung Kabid:</strong> Gunakan bila staf berhalangan atau perlu koreksi cepat. Harga yang diterbitkan langsung tayang ke publik tanpa menunggu antrean.
            </div>

            <div class="m-staf-ops-section" style="margin-bottom: 14px;">
              <form @submit.prevent="tambahItemKeranjangKabidMobile" style="display: flex; flex-direction: column; gap: 10px;">
                <div class="m-kabid-filter-row">
                  <div class="s-field">
                    <label>Pilih Pasar *</label>
                    <select
                      v-model="formInputKabidMobile.nama_pasar"
                      class="m-role-select"
                      style="width: 100%;"
                      @change="keranjangInputKabidMobile = []"
                    >
                      <option value="">-- Pilih Pasar --</option>
                      <option v-for="p in daftarPasar" :key="p" :value="p">{{ p }}</option>
                    </select>
                  </div>
                  <div class="s-field">
                    <label>Tanggal *</label>
                    <input v-model="tanggalInputKabidMobile" type="date" />
                  </div>
                </div>

                <div class="s-field">
                  <label>Jenis Komoditas</label>
                  <select
                    v-model="jenisInputKabidMobile"
                    class="m-role-select"
                    style="width: 100%;"
                    @change="formInputKabidMobile.nama_komoditas = ''"
                  >
                    <option value="Semua">Semua Jenis Komoditas</option>
                    <option v-for="kat in daftarJenisKabidMobile" :key="kat" :value="kat">{{ kat }}</option>
                  </select>
                </div>

                <div class="s-field">
                  <label>Nama Komoditas *</label>
                  <select
                    class="m-role-select"
                    style="width: 100%;"
                    :value="formInputKabidMobile.nama_komoditas"
                    @change="pilihKomoditasInputKabidMobile(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">-- Pilih Nama Komoditas --</option>
                    <optgroup v-for="grup in grupKomoditasKabidMobile" :key="grup.kelompok" :label="`🌾 ${grup.kelompok}`">
                      <option v-for="k in grup.items" :key="k.nama_komoditas" :value="k.nama_komoditas">
                        {{ k.nama_komoditas }} ({{ formatSatuanTampil(k.satuan_bawaan) }})
                      </option>
                    </optgroup>
                  </select>
                </div>

                <div class="m-kabid-filter-row">
                  <div class="s-field">
                    <label>Satuan</label>
                    <select v-model="formInputKabidMobile.satuan" class="m-role-select" style="width: 100%;">
                      <option v-for="sat in Array.from(new Set([...daftarSatuan.map(s => formatSatuanTampil(s)), formatSatuanTampil(formInputKabidMobile.satuan)].filter(Boolean)))" :key="sat" :value="sat">
                        {{ sat }}
                      </option>
                    </select>
                  </div>
                  <div class="s-field">
                    <label>Harga (Rp) *</label>
                    <input
                      type="text"
                      inputmode="numeric"
                      placeholder="15000"
                      :value="formInputKabidMobile.harga"
                      @keydown="hanyaBolehAngka"
                      @input="formInputKabidMobile.harga = ($event.target as HTMLInputElement).value.replace(/[^0-9]/g, '')"
                    />
                  </div>
                </div>

                <div v-if="formInputKabidMobile.nama_komoditas && formInputKabidMobile.nama_pasar" class="m-pengajuan-ref-box">
                  <template v-if="hargaPatokanKabidMobile">
                    <span>Terbit saat ini: <strong>{{ formatRupiah(hargaPatokanKabidMobile.harga) }}</strong></span>
                    <button
                      type="button"
                      class="m-btn-hybrid-load"
                      @click="formInputKabidMobile.harga = String(Math.round(Number(hargaPatokanKabidMobile.harga) || 0))"
                    >
                      Pakai
                    </button>
                  </template>
                  <span v-else>✨ Belum ada harga terbit di pasar ini.</span>
                </div>

                <div class="m-kabid-export-btns">
                  <button type="submit" class="m-btn-p-tambah" :disabled="sedangAjukanBatchMobile">
                    ➕ Tambah
                  </button>
                  <button
                    type="button"
                    class="m-kabid-btn-bulk"
                    :disabled="sedangAjukanBatchMobile || itemValidKabidMobile.length === 0"
                    @click="terbitkanLangsungKabidMobile"
                  >
                    {{ sedangAjukanBatchMobile ? '⏳...' : `✓ Terbitkan (${itemValidKabidMobile.length})` }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Keranjang Siap Terbit Langsung -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>📋 Daftar Siap Terbit ({{ keranjangInputKabidMobile.length }})</h3>
                  <small>{{ formInputKabidMobile.nama_pasar || 'Pilih pasar di atas' }}</small>
                </div>
                <button
                  type="button"
                  class="m-btn-hybrid-load"
                  :disabled="!formInputKabidMobile.nama_pasar || sedangAjukanBatchMobile"
                  @click="muatHargaPasarKabidMobile"
                >
                  ⚡ Muat Harga Pasar
                </button>
              </div>

              <div v-if="keranjangInputKabidMobile.length === 0" class="m-empty-box">
                Belum ada komoditas di daftar. Klik <strong>➕ Tambah</strong> atau <strong>⚡ Muat Harga Pasar</strong>.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="row in keranjangInputKabidMobile" :key="row.tempId" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>{{ row.nama_komoditas }}</strong>
                    <button
                      type="button"
                      class="m-btn-row-hapus"
                      @click="keranjangInputKabidMobile = keranjangInputKabidMobile.filter(r => r.tempId !== row.tempId)"
                    >
                      Hapus
                    </button>
                  </div>
                  <div class="m-staf-sub-meta">
                    {{ row.kategori }} · {{ row.satuan }}
                    <span v-if="row.harga_lama !== null"> · Lama: {{ formatRupiah(row.harga_lama) }}</span>
                  </div>
                  <div class="s-field" style="margin-top: 6px;">
                    <input
                      type="text"
                      inputmode="numeric"
                      :value="row.harga_usulan"
                      @keydown="hanyaBolehAngka"
                      @input="row.harga_usulan = ($event.target as HTMLInputElement).value.replace(/[^0-9]/g, '')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ─── TAB 3: HARGA TERBIT PUBLIK & RIWAYAT KEPUTUSAN ─── -->
          <template v-else>
            <div class="m-kabid-filter-box">
              <input
                v-model="cariVerifMobile"
                type="text"
                class="m-kabid-filter-input"
                placeholder="🔍 Cari komoditas terbit / pasar..."
              />
              <select v-model="filterPasarVerifMobile" class="m-kabid-filter-select">
                <option value="Semua">📍 Semua Pasar</option>
                <option v-for="p in daftarPasarLaporanHargaMobile" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <div v-if="komoditasTerbitTersaringMobile.length === 0" class="m-empty-box" style="margin-bottom: 14px;">
              Tidak ada komoditas terbit sesuai pencarian/filter saat ini.
            </div>
            <div v-else class="m-verif-cards-list" style="margin-bottom: 14px;">
              <div v-for="item in komoditasTerbitTersaringMobile" :key="item.id" class="m-verif-card border-terbit">
                <div class="m-verif-top">
                  <span class="m-badge-status badge-terbit">✓ Terbit di Publik</span>
                  <span class="m-verif-date">📅 {{ item.tanggal_penetapan || '-' }}</span>
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
                  <button type="button" class="btn-m-edit" @click="bukaModalEditKabid(item)">✏️ Edit</button>
                  <button type="button" class="btn-m-del" @click="hapusItem(item)">🗑️ Hapus</button>
                </div>
              </div>
            </div>

            <!-- Riwayat Keputusan Verifikasi -->
            <div class="m-staf-ops-section">
              <div class="m-staf-sec-head">
                <div>
                  <h3>🗂️ Riwayat Keputusan Verifikasi ({{ daftarKeputusanVerifMobile.length }})</h3>
                  <small>Paket disetujui, ditolak, atau terbit langsung Kabid</small>
                </div>
              </div>
              <div v-if="daftarKeputusanVerifMobile.length === 0" class="m-empty-box">
                Belum ada riwayat keputusan verifikasi paket.
              </div>
              <div v-else class="m-staf-market-list">
                <div v-for="p in daftarKeputusanVerifMobile.slice(0, 8)" :key="p.id" class="m-staf-sub-card">
                  <div class="m-staf-sub-top">
                    <strong>📍 {{ p.nama_pasar }}</strong>
                    <span :class="['m-staf-batch-pill', p.status === 'Diverifikasi' ? 'st-diverifikasi' : 'st-ditolak']">
                      {{ p.status === 'Diverifikasi' ? 'Disetujui' : 'Ditolak' }}
                    </span>
                  </div>
                  <div class="m-staf-sub-meta">
                    📅 {{ p.tanggal_tampil }} · 👤 {{ p.nama_petugas }} · {{ p.items?.length || 0 }} komoditas
                  </div>
                  <div v-if="p.catatan_verifikasi" class="m-staf-sub-meta" style="color: #475569;">
                    Catatan: "{{ p.catatan_verifikasi }}"
                  </div>
                  <div style="margin-top: 6px;">
                    <button type="button" class="btn-m-edit" style="width: 100%;" @click="detailPengajuanBatchMobile = p">
                      👁️ Lihat Rincian Paket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- SUB-VIEW E: LAPORAN RESMI BIDANG PANGAN (KHUSUS KABID — HARGA & GPM, EXCEL .xlsx + PDF) -->
        <div v-if="menuPetugas === 'laporan'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Laporan Bidang Pangan</h1>
            <p class="staff-view-desc">Unduh Microsoft Excel resmi (.xlsx) multi-sheet atau cetak dokumen PDF A4 dari data riil Supabase</p>
          </div>

          <!-- Sub-tab Harga Pangan vs Pelaksanaan GPM -->
          <div class="m-verif-tabs" style="margin-bottom: 12px;">
            <button
              type="button"
              :class="['m-verif-tab', subTabLaporanKabidMobile === 'harga' ? 'active' : '']"
              @click="subTabLaporanKabidMobile = 'harga'"
            >
              🏷️ Harga Pangan ({{ semuaKomoditas.length }})
            </button>
            <button
              type="button"
              :class="['m-verif-tab', subTabLaporanKabidMobile === 'gpm' ? 'active' : '']"
              @click="subTabLaporanKabidMobile = 'gpm'"
            >
              🎟️ Pelaksanaan GPM ({{ semuaAcaraGPM.length }})
            </button>
          </div>

          <!-- TAB 1: LAPORAN HARGA PANGAN -->
          <template v-if="subTabLaporanKabidMobile === 'harga'">
            <div class="m-kabid-filter-box">
              <input
                v-model="filterLaporanHargaMobile.pencarian"
                type="text"
                class="m-kabid-filter-input"
                placeholder="🔍 Cari komoditas..."
              />
              <div class="m-kabid-filter-row">
                <select v-model="filterLaporanHargaMobile.pasar" class="m-kabid-filter-select">
                  <option value="Semua">📍 Semua Pasar</option>
                  <option v-for="p in daftarPasarLaporanHargaMobile" :key="p" :value="p">{{ p }}</option>
                </select>
                <select v-model="filterLaporanHargaMobile.kategori" class="m-kabid-filter-select">
                  <option value="Semua">📦 Semua Kategori</option>
                  <option v-for="k in daftarKategoriLaporanHargaMobile" :key="k" :value="k">{{ k }}</option>
                </select>
                <select v-model="filterLaporanHargaMobile.status" class="m-kabid-filter-select">
                  <option value="Semua">🔖 Semua Status</option>
                  <option value="Terbit">Terbit</option>
                  <option value="Draft">Draf</option>
                </select>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card">
                <div class="stat-val">{{ daftarLaporanHargaTerfilterMobile.length }}</div>
                <div class="stat-lbl">Data Terfilter</div>
                <div class="stat-sub">dari {{ semuaKomoditas.length }} total</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="color: #8b1e1e; font-size: 1.05rem;">{{ formatRupiah(rataHargaLaporanMobile) }}</div>
                <div class="stat-lbl">Rata-Rata Harga</div>
                <div class="stat-sub">komoditas terpilih</div>
              </div>
            </div>

            <div class="m-export-box">
              <div class="m-kabid-export-btns">
                <button
                  type="button"
                  class="btn-m-export-csv"
                  :disabled="daftarLaporanHargaTerfilterMobile.length === 0"
                  @click="unduhLaporanPanganKabid"
                >
                  📊 Unduh Excel (.xlsx)
                </button>
                <button
                  type="button"
                  class="btn-m-export-pdf"
                  :disabled="daftarLaporanHargaTerfilterMobile.length === 0"
                  @click="cetakLaporanPanganKabidMobile"
                >
                  🖨️ Cetak / PDF
                </button>
              </div>
              <p class="export-hint">Excel (.xlsx) berisi 2 sheet: Laporan Harga Pangan + Ringkasan per Pasar dengan format Rupiah asli.</p>
            </div>

            <div class="m-report-table-card">
              <h3 style="font-size: 0.9rem; margin: 0 0 10px 0; color: #1e293b;">
                Pratinjau Data Laporan ({{ daftarLaporanHargaTerfilterMobile.length }}):
              </h3>
              <div v-if="daftarLaporanHargaTerfilterMobile.length === 0" class="m-empty-box">
                Tidak ada data harga pangan sesuai filter yang dipilih.
              </div>
              <div v-else class="m-report-rows">
                <div v-for="(item, idx) in daftarLaporanHargaTerfilterMobile" :key="item.id || idx" class="m-report-row">
                  <div class="m-rep-num">{{ idx + 1 }}</div>
                  <div class="m-rep-info">
                    <strong>{{ item.nama_komoditas }}</strong>
                    <span>{{ item.nama_pasar }} · {{ item.kategori }} · {{ item.tanggal_penetapan || '-' }}</span>
                    <span class="m-rep-badge" :class="(item.status || '').toLowerCase() === 'draft' ? 'draft' : 'terbit'">
                      {{ (item.status || '').toLowerCase() === 'draft' ? 'Draf' : (item.status || 'Terbit') }}
                    </span>
                  </div>
                  <div class="m-rep-price">
                    <strong>{{ formatRupiah(item.harga) }}</strong>
                    <span>/ {{ formatSatuanTampil(item.satuan) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- TAB 2: LAPORAN PELAKSANAAN GPM -->
          <template v-else>
            <div class="m-kabid-filter-box">
              <div class="m-kabid-filter-row">
                <select v-model="filterLaporanGPMKabidMobile.periode" class="m-kabid-filter-select">
                  <option value="bulan_ini">📅 Bulan Ini</option>
                  <option value="tahun_ini">📆 Tahun {{ ringkasanBerandaKabidMobile.tahunBerjalan }}</option>
                  <option value="semua">🗂️ Semua Periode</option>
                </select>
                <select v-model="filterLaporanGPMKabidMobile.kecamatan" class="m-kabid-filter-select">
                  <option value="Semua">📍 Semua Kecamatan</option>
                  <option v-for="k in daftarKecamatanLaporanGPMMobile" :key="k" :value="k">{{ k }}</option>
                </select>
                <select v-model="filterLaporanGPMKabidMobile.status" class="m-kabid-filter-select">
                  <option value="Semua">🔖 Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card">
                <div class="stat-val">{{ ringkasanLaporanGPMMobile.totalTitik }}</div>
                <div class="stat-lbl">Titik GPM</div>
                <div class="stat-sub">{{ berandaKabidMobileService.labelPeriode(filterLaporanGPMKabidMobile.periode) }}</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="color: #166534;">{{ ringkasanLaporanGPMMobile.persenSerapan }}%</div>
                <div class="stat-lbl">Serapan Kuota</div>
                <div class="stat-sub">{{ ringkasanLaporanGPMMobile.totalHadir }}/{{ ringkasanLaporanGPMMobile.totalKuota }} hadir</div>
              </div>
            </div>

            <div class="m-export-box">
              <div class="m-kabid-export-btns">
                <button
                  type="button"
                  class="btn-m-export-csv"
                  :disabled="daftarLaporanGPMTerfilterMobile.length === 0"
                  @click="unduhLaporanGPMKabidMobile"
                >
                  📊 Excel GPM (.xlsx)
                </button>
                <button
                  type="button"
                  class="btn-m-export-pdf"
                  :disabled="daftarLaporanGPMTerfilterMobile.length === 0"
                  @click="cetakLaporanGPMKabidMobile"
                >
                  🖨️ Cetak PDF GPM
                </button>
              </div>
              <p class="export-hint">Excel (.xlsx) berisi 2 sheet: Rekap Pelaksanaan GPM + Ringkasan per Kecamatan.</p>
            </div>

            <div class="m-report-table-card">
              <h3 style="font-size: 0.9rem; margin: 0 0 10px 0; color: #1e293b;">
                Pratinjau Pelaksanaan GPM ({{ daftarLaporanGPMTerfilterMobile.length }}):
              </h3>
              <div v-if="daftarLaporanGPMTerfilterMobile.length === 0" class="m-empty-box">
                Tidak ada kegiatan GPM sesuai periode/filter yang dipilih.
              </div>
              <div v-else class="m-report-rows">
                <div v-for="(g, idx) in daftarLaporanGPMTerfilterMobile" :key="g.id || idx" class="m-report-row">
                  <div class="m-rep-num">{{ idx + 1 }}</div>
                  <div class="m-rep-info">
                    <strong>{{ g.nama_acara }}</strong>
                    <span>📍 {{ g.lokasi }} ({{ g.kecamatan }}) · 📅 {{ g.tanggal }}</span>
                    <span class="m-rep-badge" :class="String(g.status || '').toLowerCase() === 'selesai' ? 'terbit' : 'draft'">
                      {{ g.status }}
                    </span>
                  </div>
                  <div class="m-rep-price">
                    <strong>{{ g.terlayani }}/{{ g.target_kuota }}</strong>
                    <span>Hadir ({{ g.target_kuota > 0 ? Math.round((g.terlayani / g.target_kuota) * 100) : 0 }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- SUB-VIEW F: SUPERVISI MENU CEK GPM (ADMIN & SUPERADMIN — AKTIF + SELESAI + FILTER + EXCEL) -->
        <div v-if="menuPetugas === 'cek-gpm'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">🔍 Supervisi Cek GPM</h1>
            <p class="staff-view-desc">Inspeksi seluruh agenda GPM (aktif &amp; selesai), realisasi kuota, daftar hadir warga, dan ekspor Excel (.xlsx)</p>
          </div>

          <div class="m-kabid-filter-box">
            <input
              v-model="filterCekGpmMobile.pencarian"
              type="text"
              class="m-kabid-filter-input"
              placeholder="🔍 Cari kegiatan, lokasi, atau kecamatan..."
            />
            <div class="m-kabid-filter-row">
              <select v-model="filterCekGpmMobile.kecamatan" class="m-kabid-filter-select">
                <option value="Semua">📍 Semua Kecamatan</option>
                <option v-for="k in daftarKecamatanGPMKadisMobile" :key="k" :value="k">{{ k }}</option>
              </select>
              <select v-model="filterCekGpmMobile.status" class="m-kabid-filter-select">
                <option value="Semua">🔖 Semua Status ({{ daftarRekapGPMKadisReaktif.length }})</option>
                <option value="Aktif">Aktif</option>
                <option value="Selesai">Selesai / Arsip</option>
              </select>
            </div>
          </div>

          <div class="staff-stats-grid" style="margin-bottom: 12px;">
            <div class="stat-box-card">
              <div class="stat-val">{{ daftarCekGpmTerfilterMobile.length }}</div>
              <div class="stat-lbl">Titik GPM</div>
              <div class="stat-sub">{{ ringkasanCekGpmMobile.aktif }} aktif · {{ ringkasanCekGpmMobile.selesai }} arsip</div>
            </div>
            <div class="stat-box-card">
              <div class="stat-val" style="color: #166534;">{{ ringkasanCekGpmMobile.hadir }}/{{ ringkasanCekGpmMobile.kuota }}</div>
              <div class="stat-lbl">Realisasi Hadir</div>
              <div class="stat-sub">serapan {{ ringkasanCekGpmMobile.persen }}%</div>
            </div>
          </div>

          <div v-if="daftarCekGpmTerfilterMobile.length === 0" class="m-empty-box">
            Tidak ada kegiatan GPM yang sesuai filter.
          </div>

          <div v-else class="m-supervisi-cards">
            <div v-for="acara in daftarCekGpmTerfilterMobile" :key="acara.id" class="m-supervisi-card">
              <div class="m-super-header">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="m-super-badge">📍 {{ acara.kecamatan }}</span>
                  <span :class="['m-staf-batch-pill', acara.status === 'Selesai' ? 'st-diverifikasi' : 'st-diajukan']">
                    {{ acara.status }} · {{ acara.persenSerapan }}%
                  </span>
                </div>
                <h3>{{ acara.nama_acara }}</h3>
                <p class="m-super-loc">🏢 {{ acara.lokasi }}</p>
                <p class="m-super-time">📅 {{ jadwalGPMMobileService.formatTanggalID(acara.tanggal) }} · {{ acara.jam_mulai || '08:00' }} - {{ acara.jam_selesai || '14:00' }} WITA</p>
              </div>

              <div class="m-super-quota-section">
                <div class="quota-progress-labels">
                  <span>Hadir / Kuota: <strong>{{ acara.terlayani }} / {{ acara.target_kuota }} {{ acara.satuan_penerima }}</strong></span>
                  <span>{{ acara.persenSerapan }}%</span>
                </div>
                <div class="quota-progress-bar">
                  <div class="quota-progress-fill" :style="{ width: acara.persenSerapan + '%' }"></div>
                </div>
              </div>

              <div class="m-super-stats-row">
                <div class="super-stat-col">
                  <span class="lbl">Kuota ({{ acara.satuan_penerima }})</span>
                  <strong>{{ acara.target_kuota }}</strong>
                </div>
                <div class="super-stat-col">
                  <span class="lbl">Terdaftar</span>
                  <strong style="color: #1d4ed8;">{{ acara.terdaftar }}</strong>
                </div>
                <div class="super-stat-col">
                  <span class="lbl">Hadir</span>
                  <strong style="color: #166534;">{{ acara.terlayani }}</strong>
                </div>
              </div>

              <div class="m-super-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-m-super-csv" style="flex: 1 1 120px; background: #8b1e1e;" @click="bukaDetailWargaMobile(acara)">
                  👥 Warga ({{ acara.terdaftar }})
                </button>
                <button
                  v-if="isKabid && acara.status === 'Aktif'"
                  type="button"
                  class="btn-m-super-csv"
                  style="flex: 1 1 110px; background: #1d4ed8;"
                  @click="bukaModalUbahKuotaDariCekGpmMobile(acara.id)"
                >
                  🔧 Atur Kuota
                </button>
                <button type="button" class="btn-m-super-csv" style="flex: 1 1 120px; background: #166534;" @click="unduhRekapAcaraMobile(acara)">
                  📊 Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-VIEW G1: MASTER KOMODITAS & SATUAN (KHUSUS ADMIN & SUPERADMIN) -->
        <div v-if="menuPetugas === 'master-komoditas'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">🌾 Master Komoditas &amp; Satuan</h1>
            <p class="staff-view-desc">
              Kelola Komoditas Induk, Varian, Urutan Tampil Publik, Sinonim, dan Satuan per 1 unit. Otomatis tersinkron ke Staf, Kabid, Grafik Tren Kadis, &amp; Publik.
            </p>
          </div>

          <!-- Master Komoditas Resmi (Induk Fleksibel, Varian, Edit & Sinonim) -->
          <div
            id="form-master-komoditas-mobile"
            class="staff-form-panel"
            :style="{ marginBottom: '16px', border: komoditasMasterDieditMobile ? '2px solid #2563eb' : undefined }"
          >
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
              <div class="panel-title-row" style="margin: 0;">
                <span class="plus-icon-red">{{ komoditasMasterDieditMobile ? '✏️' : '🌾' }}</span>
                <h3 style="margin: 0;">
                  {{ komoditasMasterDieditMobile ? `Edit: ${komoditasMasterDieditMobile.nama_komoditas}` : `Master Komoditas Resmi (${daftarMasterKomoditas.length})` }}
                </h3>
              </div>
              <button
                v-if="komoditasMasterDieditMobile"
                type="button"
                class="m-gpm-btn-back"
                @click="batalEditMasterKomoditasMobile"
              >
                ✕ Batal Edit
              </button>
            </div>

            <p style="font-size: 0.74rem; color: #64748b; margin: 0 0 10px 0;">
              {{
                komoditasMasterDieditMobile
                  ? 'Mengubah nama komoditas otomatis menyinkronkan harga pasar & riwayat grafik Kadis agar histori tetap utuh.'
                  : 'Pilih Komoditas Induk yang ada atau ketuk "+ Induk Baru" untuk menambahkan kelompok induk bebas.'
              }}
            </p>

            <div class="m-mk-form-grid">
              <div class="s-field">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="margin: 0;">Komoditas Induk *</label>
                  <button
                    type="button"
                    style="background: none; border: none; color: #8b1e1e; font-size: 0.74rem; font-weight: 800; padding: 0; cursor: pointer;"
                    @click="modeIndukBaruMobile = !modeIndukBaruMobile; if (modeIndukBaruMobile) formKomoditasMasterMobile.kelompok_komoditas = ''"
                  >
                    {{ modeIndukBaruMobile ? '← Pilih Daftar' : '+ Induk Baru' }}
                  </button>
                </div>
                <input
                  v-if="modeIndukBaruMobile || daftarKelompokIndukMasterMobile.length === 0"
                  type="text"
                  v-model="formKomoditasMasterMobile.kelompok_komoditas"
                  placeholder="Ketik induk baru (misal: Sayur, Susu)"
                />
                <select
                  v-else
                  class="s-select-market"
                  :value="daftarKelompokIndukMasterMobile.includes(formKomoditasMasterMobile.kelompok_komoditas) ? formKomoditasMasterMobile.kelompok_komoditas : ''"
                  @change="($event.target as HTMLSelectElement).value === '__BARU__' ? (modeIndukBaruMobile = true, formKomoditasMasterMobile.kelompok_komoditas = '') : (formKomoditasMasterMobile.kelompok_komoditas = ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">-- Pilih Komoditas Induk --</option>
                  <option v-for="kel in daftarKelompokIndukMasterMobile" :key="kel" :value="kel">{{ kel }}</option>
                  <option value="__BARU__">➕ Tambah Komoditas Induk Baru...</option>
                </select>
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
                  <label>Kategori Pangan</label>
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
                <label>Urutan Tampil Publik</label>
                <select v-model.number="formKomoditasMasterMobile.prioritas_tampil" class="s-select-market">
                  <option v-for="opsi in OPSI_URUTAN_TAMPIL_PUBLIK" :key="opsi.nilai" :value="opsi.nilai">
                    {{ opsi.label }}
                  </option>
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

              <button
                type="button"
                class="btn-m-add"
                :style="{ width: '100%', padding: '11px', background: komoditasMasterDieditMobile ? '#1d4ed8' : undefined }"
                @click="tambahMasterKomoditasBaru"
              >
                {{ komoditasMasterDieditMobile ? '💾 Simpan Perubahan Komoditas' : '➕ Tambah Master Komoditas' }}
              </button>
            </div>

            <input
              v-model="cariMasterKomoditasMobile"
              type="text"
              class="m-kabid-filter-input"
              style="margin: 12px 0 10px 0;"
              placeholder="🔍 Cari varian, kelompok induk, atau sinonim..."
            />

            <div class="m-mk-groups-list">
              <div v-for="grup in grupKomoditasTerfilterMobile" :key="grup.kelompok" class="m-mk-group-card">
                <div class="m-mk-group-head">
                  <strong>🌾 {{ grup.kelompok }}</strong>
                  <span>{{ grup.items.length }} varian</span>
                </div>
                <div class="m-mk-items">
                  <div
                    v-for="k in grup.items"
                    :key="k.nama_komoditas"
                    class="m-mk-item-row"
                    :style="komoditasMasterDieditMobile?.nama_komoditas === k.nama_komoditas ? { background: '#eff6ff', borderColor: '#3b82f6' } : undefined"
                  >
                    <div style="min-width: 0; flex: 1;">
                      <div class="m-mk-item-name">{{ k.nama_komoditas }}</div>
                      <div class="m-mk-item-meta">
                        {{ k.kategori }} • {{ k.satuan_bawaan }} • {{ masterDataMobileService.ambilLabelUrutanTampil(k.prioritas_tampil) }}
                      </div>
                      <div v-if="k.kata_kunci" class="m-mk-item-syn">🔍 {{ k.kata_kunci }}</div>
                    </div>
                    <div style="display: flex; gap: 5px; flex-shrink: 0;">
                      <button
                        type="button"
                        class="btn-m-mk-edit"
                        @click="mulaiEditMasterKomoditasMobile(k)"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        class="btn-m-chip-del"
                        @click="hapusMasterKomoditas(k.nama_komoditas)"
                      >
                        ✕
                      </button>
                    </div>
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
        </div>

        <!-- SUB-VIEW G2: MASTER PASAR & WILAYAH KOTA MANADO (KHUSUS ADMIN & SUPERADMIN) -->
        <div v-if="menuPetugas === 'master-wilayah'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">🗺️ Master Pasar &amp; Wilayah</h1>
            <p class="staff-view-desc">
              Kelola daftar pasar tradisional, titik lokasi peta publik, dan daftar kecamatan resmi Kota Manado
            </p>
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
              <span class="plus-icon-red">🏛️</span>
              <h3>Master Kecamatan Kota Manado ({{ daftarKecamatan.length }})</h3>
            </div>
            <p style="font-size: 0.74rem; color: #64748b; margin: 0 0 8px 0;">
              Acuan wilayah untuk Pasar Tradisional dan penjadwalan lokasi Gerakan Pangan Murah (GPM).
            </p>
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

        <!-- SUB-VIEW H: KELOLA PENGGUNA SISTEM (ADMIN & SUPERADMIN — RBAC KETAT) -->
        <div v-if="menuPetugas === 'kelola-user'" class="staff-view-container">
          <div class="staff-heading-area">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div>
                <h1 class="staff-view-title">👥 Kelola Pengguna</h1>
                <p class="staff-view-desc">
                  {{ isSuperadmin ? 'Mode Superadmin: kendali penuh semua peran termasuk Superadmin' : 'Mode Admin: kelola akun Staf, Kabid, Kadis & Admin (Superadmin dilindungi)' }}
                </p>
              </div>
              <button type="button" class="btn-m-add-user" @click="modalTambahUserBuka = true">
                + Tambah Akun
              </button>
            </div>
          </div>

          <div class="m-kabid-filter-box">
            <input
              v-model="filterCariPenggunaMobile"
              type="text"
              class="m-kabid-filter-input"
              placeholder="🔍 Cari nama, username, atau email..."
            />
            <select v-model="filterPeranPenggunaMobile" class="m-kabid-filter-select">
              <option value="Semua">🔖 Semua Peran ({{ daftarSemuaPengguna.length }})</option>
              <option value="Superadmin">Superadmin</option>
              <option value="Admin">Admin</option>
              <option value="Kadis">Kepala Dinas</option>
              <option value="Kabid">Kepala Bidang</option>
              <option value="Staf">Staf</option>
            </select>
          </div>

          <div v-if="daftarPenggunaTerfilterMobile.length === 0" class="m-empty-box">
            Tidak ada akun pengguna yang sesuai pencarian/filter peran.
          </div>

          <div v-else class="m-user-cards-list">
            <div
              v-for="user in daftarPenggunaTerfilterMobile"
              :key="user.id"
              class="m-user-card"
              :style="user.peran === 'Superadmin' ? { borderColor: '#fcd34d' } : undefined"
            >
              <div class="m-user-card-head">
                <div class="m-user-avatar">
                  <img v-if="user.foto_profil" :src="user.foto_profil" alt="Avatar" class="avatar-fit-circle" />
                  <span v-else>{{ (user.nama ? user.nama.charAt(0) : 'U').toUpperCase() }}</span>
                </div>
                <div class="m-user-head-info">
                  <div class="m-user-title-row">
                    <h4>
                      {{ user.nama }}
                      <span v-if="String(userAktif?.id) === String(user.id)" class="m-self-chip">Anda</span>
                    </h4>
                    <span class="user-role-badge" :class="'role-' + (user.peran || 'Staf').toLowerCase()">
                      {{ user.peran === 'Superadmin' ? '👑 ' : '' }}{{ formatPeranLengkap(user.peran) }}
                    </span>
                  </div>
                  <span class="m-user-sub">{{ user.username }} · {{ user.email }}</span>
                  <span class="m-user-bidang">{{ user.bidang || 'Dinas Pangan Kota Manado' }}</span>
                </div>
              </div>

              <div v-if="user.peran === 'Superadmin' && !isSuperadmin" class="m-user-locked-note">
                🔒 Akun Superadmin dilindungi hierarki RBAC — hanya dapat dikelola oleh Superadmin.
              </div>

              <template v-else>
                <div class="m-user-role-selector-row">
                  <label>Peran:</label>
                  <select
                    :value="user.peran"
                    :disabled="String(userAktif?.id) === String(user.id)"
                    @change="eksekusiUbahPeran(user, ($event.target as any).value)"
                    class="m-role-select"
                  >
                    <option value="Staf">Staf (Petugas Pangan)</option>
                    <option value="Kabid">Kabid (Kepala Bidang)</option>
                    <option value="Kadis">Kadis (Kepala Dinas)</option>
                    <option value="Admin">Admin</option>
                    <option v-if="isSuperadmin" value="Superadmin">Superadmin</option>
                  </select>
                </div>

                <div class="m-user-card-actions">
                  <button type="button" class="btn-m-u-edit" @click="bukaModalUbahProfilUser(user)">
                    👤 Nama
                  </button>
                  <button type="button" class="btn-m-u-edit" @click="bukaModalUbahUsername(user)">
                    ✏️ Username
                  </button>
                  <button type="button" class="btn-m-u-edit" @click="bukaModalUbahEmail(user)">
                    ✉️ Email
                  </button>
                  <button type="button" class="btn-m-u-pwd" @click="bukaModalResetSandi(user)">
                    🔑 Reset Sandi
                  </button>
                  <button
                    v-if="String(userAktif?.id) !== String(user.id)"
                    type="button"
                    class="btn-m-u-del"
                    @click="eksekusiHapusUser(user)"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </template>
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
                <label>Komoditas Pangan (Sinkron Master Admin)</label>
                <select v-model="komoditasTren" @change="muatTrenKadis" :disabled="pilihanKomoditasKadisMobile.semuaNamaValid.length === 0">
                  <option v-if="pilihanKomoditasKadisMobile.semuaNamaValid.length === 0" value="">Belum ada komoditas di Master Admin</option>
                  <template v-else>
                    <optgroup
                      v-for="grup in pilihanKomoditasKadisMobile.grupMaster"
                      :key="grup.kelompok"
                      :label="'🌾 ' + grup.kelompok"
                    >
                      <option v-for="item in grup.items" :key="item.nama" :value="item.nama">
                        {{ item.punyaDataHarga ? `${item.nama} (${item.jumlahPasar} pasar)` : `${item.nama} — Belum ada harga` }}
                      </option>
                    </optgroup>
                    <optgroup
                      v-if="pilihanKomoditasKadisMobile.arsipDiLuarMaster.length > 0"
                      label="📂 Arsip (Di Luar Master Admin)"
                    >
                      <option
                        v-for="item in pilihanKomoditasKadisMobile.arsipDiLuarMaster"
                        :key="item.nama"
                        :value="item.nama"
                      >
                        {{ item.nama }} ({{ item.jumlahPasar }} pasar)
                      </option>
                    </optgroup>
                  </template>
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

            <!-- Ekspor & Cetak Analisis Tren (Kadis) -->
            <div class="m-export-box" style="margin-top: 12px;">
              <div class="m-kabid-export-btns">
                <button
                  type="button"
                  class="btn-m-export-csv"
                  @click="unduhTrenHargaKadisMobile"
                >
                  📊 Excel Tren (.xlsx)
                </button>
                <button
                  type="button"
                  class="btn-m-export-pdf"
                  @click="cetakTrenHargaKadisMobile"
                >
                  🖨️ Cetak PDF Tren
                </button>
              </div>
              <p class="export-hint">Ekspor riwayat fluktuasi harga resmi (tanpa dummy) lengkap dengan pengesahan Kepala Dinas.</p>
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
                    {{ (dataTren.hargaTertinggi / 1000).toFixed(1).replace(/\.0$/, '') }}k
                  </text>
                  <text x="50" y="109" text-anchor="end" font-size="9" fill="#64748b" font-weight="600">
                    {{ (((dataTren.hargaTertinggi + dataTren.hargaTerendah) / 2) / 1000).toFixed(1).replace(/\.0$/, '') }}k
                  </text>
                  <text x="50" y="184" text-anchor="end" font-size="9" fill="#64748b" font-weight="600">
                    {{ (dataTren.hargaTerendah / 1000).toFixed(1).replace(/\.0$/, '') }}k
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
                      {{ (titik.harga / 1000).toFixed(1).replace(/\.0$/, '') }}k
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

        <!-- SUB-VIEW J: LAPORAN EKSEKUTIF KEPALA DINAS (2 TAB: GPM & HARGA TERBIT, EXCEL .xlsx + PDF A4) -->
        <div v-if="menuPetugas === 'laporan-gpm'" class="staff-view-container">
          <div class="staff-heading-area">
            <h1 class="staff-view-title">Laporan Eksekutif Kepala Dinas</h1>
            <p class="staff-view-desc">Rekapitulasi pelaksanaan GPM dan harga pangan terbit resmi (Read-Only) siap ekspor Excel &amp; PDF A4</p>
          </div>

          <!-- Sub-tab Pelaksanaan GPM vs Ringkasan Harga Terbit -->
          <div class="m-verif-tabs" style="margin-bottom: 12px;">
            <button
              type="button"
              :class="['m-verif-tab', subTabLaporanKadisMobile === 'gpm' ? 'active' : '']"
              @click="subTabLaporanKadisMobile = 'gpm'"
            >
              🎟️ Pelaksanaan GPM ({{ daftarRekapGPMKadisReaktif.length }})
            </button>
            <button
              type="button"
              :class="['m-verif-tab', subTabLaporanKadisMobile === 'harga' ? 'active' : '']"
              @click="subTabLaporanKadisMobile = 'harga'"
            >
              🏷️ Harga Terbit ({{ komoditasTerbit.length }})
            </button>
          </div>

          <!-- TAB 1: LAPORAN PELAKSANAAN GPM -->
          <template v-if="subTabLaporanKadisMobile === 'gpm'">
            <div class="m-kabid-filter-box">
              <div class="m-kabid-filter-row">
                <select v-model="filterLaporanGPMKadisMobile.periode" class="m-kabid-filter-select">
                  <option value="bulan_ini">📅 Bulan Ini</option>
                  <option value="tahun_ini">📆 Tahun {{ ringkasanBerandaKadisMobile.tahunBerjalan }}</option>
                  <option value="semua">🗂️ Semua Periode</option>
                </select>
                <select v-model="filterLaporanGPMKadisMobile.kecamatan" class="m-kabid-filter-select">
                  <option value="Semua">📍 Semua Kecamatan</option>
                  <option v-for="k in daftarKecamatanGPMKadisMobile" :key="k" :value="k">{{ k }}</option>
                </select>
                <select v-model="filterLaporanGPMKadisMobile.status" class="m-kabid-filter-select">
                  <option value="Semua">🔖 Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Aktif">Aktif</option>
                </select>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card">
                <div class="stat-val" style="color: #166534;">{{ ringkasanLaporanGPMKadisMobile.totalSelesai }}</div>
                <div class="stat-lbl">GPM Selesai</div>
                <div class="stat-sub">{{ ringkasanLaporanGPMKadisMobile.totalAktif }} aktif · {{ ringkasanLaporanGPMKadisMobile.totalTitik }} total</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val">{{ ringkasanLaporanGPMKadisMobile.totalKuota }}</div>
                <div class="stat-lbl">Target Kuota</div>
                <div class="stat-sub">{{ berandaKadisMobileService.labelPeriode(filterLaporanGPMKadisMobile.periode) }}</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="color: #1d4ed8;">{{ ringkasanLaporanGPMKadisMobile.totalHadir }}</div>
                <div class="stat-lbl">Warga Terlayani</div>
                <div class="stat-sub">dari {{ ringkasanLaporanGPMKadisMobile.totalTerdaftar }} terdaftar</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="color: #16a34a;">{{ ringkasanLaporanGPMKadisMobile.persenSerapan }}%</div>
                <div class="stat-lbl">Tingkat Serapan</div>
                <div class="stat-sub">realisasi kehadiran</div>
              </div>
            </div>

            <div class="m-export-box">
              <div class="m-kabid-export-btns">
                <button
                  type="button"
                  class="btn-m-export-csv"
                  :disabled="daftarLaporanGPMKadisTerfilterMobile.length === 0"
                  @click="unduhLaporanGPMKadisMobile"
                >
                  📊 Excel GPM (.xlsx)
                </button>
                <button
                  type="button"
                  class="btn-m-export-pdf"
                  :disabled="daftarLaporanGPMKadisTerfilterMobile.length === 0"
                  @click="cetakLaporanGPMKadisMobile"
                >
                  🖨️ Cetak PDF GPM
                </button>
              </div>
              <p class="export-hint">Excel (.xlsx) berisi 2 sheet (Rekap GPM + Ringkasan per Kecamatan) &amp; PDF A4 ditandatangani Kepala Dinas.</p>
            </div>

            <div v-if="daftarLaporanGPMKadisTerfilterMobile.length === 0" class="m-empty-box" style="margin-top: 12px;">
              Tidak ada kegiatan GPM yang sesuai filter periode, kecamatan, atau status.
            </div>

            <div v-else class="m-supervisi-cards" style="margin-top: 12px;">
              <div v-for="rekap in daftarLaporanGPMKadisTerfilterMobile" :key="rekap.id" class="m-supervisi-card">
                <div class="m-super-header">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="m-super-badge">📍 {{ rekap.kecamatan }}</span>
                    <span :class="['m-staf-batch-pill', rekap.status === 'Selesai' ? 'st-diverifikasi' : 'st-diajukan']">
                      {{ rekap.status }} · Serapan {{ rekap.persenSerapan }}%
                    </span>
                  </div>
                  <h3>{{ rekap.nama_acara }}</h3>
                  <p class="m-super-loc">🏢 {{ rekap.lokasi }}</p>
                  <p class="m-super-time">📅 {{ jadwalGPMMobileService.formatTanggalID(rekap.tanggal) }}</p>
                </div>

                <div class="m-super-stats-row" style="margin-top: 10px;">
                  <div class="super-stat-col">
                    <span class="lbl">Kuota ({{ rekap.satuan_penerima }})</span>
                    <strong>{{ rekap.target_kuota }} {{ rekap.satuan_penerima }}</strong>
                  </div>
                  <div class="super-stat-col">
                    <span class="lbl">Terdaftar</span>
                    <strong style="color: #1d4ed8;">{{ rekap.terdaftar }} {{ rekap.satuan_penerima }}</strong>
                  </div>
                  <div class="super-stat-col">
                    <span class="lbl">Terlayani</span>
                    <strong style="color: #16a34a;">{{ rekap.terlayani }} {{ rekap.satuan_penerima }}</strong>
                  </div>
                </div>

                <div style="margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 6px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">🌾 Komoditas Disediakan:</span>
                  <p style="margin: 0; font-size: 0.8rem; color: #334155;">{{ rekap.komoditas_tersedia || '-' }}</p>
                </div>

                <div class="m-super-actions" style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn-m-super-csv" style="flex: 1; background: #8b1e1e;" @click="bukaDetailWargaMobile(rekap)">
                    👥 Data Warga ({{ rekap.terdaftar }})
                  </button>
                  <button type="button" class="btn-m-super-csv" style="flex: 1;" @click="unduhRekapAcaraMobile(rekap)">
                    📊 Excel Warga (.xlsx)
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- TAB 2: RINGKASAN HARGA PANGAN TERBIT (READ-ONLY) -->
          <template v-else>
            <div class="m-kabid-filter-box">
              <input
                v-model="filterLaporanHargaKadisMobile.pencarian"
                type="text"
                class="m-kabid-filter-input"
                placeholder="🔍 Cari komoditas terbit..."
              />
              <div class="m-kabid-filter-row">
                <select v-model="filterLaporanHargaKadisMobile.pasar" class="m-kabid-filter-select">
                  <option value="Semua">📍 Semua Pasar</option>
                  <option v-for="p in daftarPasarTerbitKadisMobile" :key="p" :value="p">{{ p }}</option>
                </select>
                <select v-model="filterLaporanHargaKadisMobile.kategori" class="m-kabid-filter-select">
                  <option value="Semua">📦 Semua Kategori</option>
                  <option v-for="k in daftarKategoriTerbitKadisMobile" :key="k" :value="k">{{ k }}</option>
                </select>
              </div>
            </div>

            <div class="staff-stats-grid">
              <div class="stat-box-card">
                <div class="stat-val">{{ daftarHargaTerbitKadisTerfilterMobile.length }}</div>
                <div class="stat-lbl">Harga Terbit</div>
                <div class="stat-sub">dari {{ komoditasTerbit.length }} terverifikasi</div>
              </div>
              <div class="stat-box-card">
                <div class="stat-val" style="color: #8b1e1e; font-size: 1.05rem;">{{ formatRupiah(statistikHargaKadisMobile.rataRata) }}</div>
                <div class="stat-lbl">Rata-Rata Harga</div>
                <div class="stat-sub">Min {{ formatRupiah(statistikHargaKadisMobile.terendah) }} · Maks {{ formatRupiah(statistikHargaKadisMobile.tertinggi) }}</div>
              </div>
            </div>

            <div class="m-export-box">
              <div class="m-kabid-export-btns">
                <button
                  type="button"
                  class="btn-m-export-csv"
                  :disabled="daftarHargaTerbitKadisTerfilterMobile.length === 0"
                  @click="unduhLaporanHargaKadisMobile"
                >
                  📊 Excel Harga (.xlsx)
                </button>
                <button
                  type="button"
                  class="btn-m-export-pdf"
                  :disabled="daftarHargaTerbitKadisTerfilterMobile.length === 0"
                  @click="cetakLaporanHargaKadisMobile"
                >
                  🖨️ Cetak PDF Harga
                </button>
              </div>
              <p class="export-hint">Menampilkan khusus harga resmi berstatus Terbit hasil verifikasi Kepala Bidang (Read-Only).</p>
            </div>

            <div class="m-report-table-card">
              <h3 style="font-size: 0.9rem; margin: 0 0 10px 0; color: #1e293b;">
                Daftar Harga Pangan Terbit ({{ daftarHargaTerbitKadisTerfilterMobile.length }}):
              </h3>
              <div v-if="daftarHargaTerbitKadisTerfilterMobile.length === 0" class="m-empty-box">
                Tidak ada data harga terbit yang sesuai filter.
              </div>
              <div v-else class="m-report-rows">
                <div v-for="(item, idx) in daftarHargaTerbitKadisTerfilterMobile" :key="item.id || idx" class="m-report-row">
                  <div class="m-rep-num">{{ idx + 1 }}</div>
                  <div class="m-rep-info">
                    <strong>{{ item.nama_komoditas }}</strong>
                    <span>{{ item.nama_pasar }} · {{ item.kategori }} · {{ item.tanggal_penetapan || '-' }}</span>
                    <span class="m-rep-badge terbit">Terbit</span>
                  </div>
                  <div class="m-rep-price">
                    <strong>{{ formatRupiah(item.harga) }}</strong>
                    <span>/ {{ formatSatuanTampil(item.satuan) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
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

            <!-- Baris Filter Wilayah Kecamatan & Tanggal Penetapan -->
            <div v-if="daftarKecamatanPasarPublik.length > 0 || daftarTanggalUnikPublik.length > 0" class="m-filter-row-2" style="margin-top: 6px;">
              <select
                v-if="daftarKecamatanPasarPublik.length > 0"
                v-model="kecamatanAktifPublik"
                @change="pilihKecamatanPublik(kecamatanAktifPublik)"
                class="m-sort-select"
                aria-label="Filter kecamatan pasar"
              >
                <option value="Semua">🏘️ Semua Kecamatan</option>
                <option v-for="kec in daftarKecamatanPasarPublik" :key="kec" :value="kec">Kec. {{ kec }}</option>
              </select>
              <select
                v-if="daftarTanggalUnikPublik.length > 0"
                v-model="tanggalFilterPublik"
                class="m-sort-select"
                aria-label="Filter tanggal penetapan"
              >
                <option value="Semua">📅 Semua Tanggal</option>
                <option v-for="tgl in daftarTanggalUnikPublik" :key="tgl" :value="tgl">{{ tgl }}</option>
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
                          v-if="baris.deltaTerbaru && baris.deltaTerbaru.selisih !== 0"
                          class="m-mx-sub"
                          :style="{ fontSize: '0.65rem', fontWeight: 700, color: baris.deltaTerbaru.selisih > 0 ? '#dc2626' : '#15803d' }"
                        >
                          {{ baris.deltaTerbaru.selisih > 0 ? '▲ +' : '▼ -' }}{{ formatRupiah(Math.abs(baris.deltaTerbaru.selisih)) }}
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

                <!-- QR Code Resmi Mobile (Hanya token unik — NIK tidak di-encode) -->
                <BarcodeGenerator :value="tiketGPMHasil.tiket.kode_barcode" :size="160" />

                <div class="m-ticket-meta-box">
                  <p><span>Nama Pendaftar:</span> <strong>{{ gpmMobileService.parseDataPendaftar(tiketGPMHasil.tiket).nama_bersih || tiketGPMHasil.tiket.nama_pendaftar }}</strong></p>
                  <p><span>Lokasi GPM:</span> <strong>{{ tiketGPMHasil.acara.nama_acara }} — {{ tiketGPMHasil.acara.lokasi }}</strong></p>
                  <p><span>Waktu Pelaksanaan:</span> <strong>{{ tiketGPMHasil.acara.tanggal }} ({{ tiketGPMHasil.acara.jam }})</strong></p>
                </div>

                <div class="m-ticket-instruction">
                  📱 <strong>Petunjuk:</strong> Tunjukkan Kode QR ini bersama KTP fisik kepada petugas Dinas Pangan di lokasi GPM sebelum jam pelaksanaan berakhir.
                </div>

                <div class="m-ticket-actions-stack">
                  <button
                    type="button"
                    class="btn-m-download-ticket"
                    :disabled="sedangUnduhTiketMobile"
                    @click="unduhTiketGPMMobilePNG"
                  >
                    {{ sedangUnduhTiketMobile ? '⏳ Menyiapkan Tiket...' : '📥 Unduh Tiket (PNG)' }}
                  </button>
                  <button type="button" class="btn-m-take-new" @click="tiketGPMHasil = null">
                    ← Kembali ke Daftar Jadwal GPM
                  </button>
                </div>
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

                  <!-- KONDISI 2B: MODE DATANG LANGSUNG (TANPA PENDAFTARAN DARING) -->
                  <div v-else-if="acaraGPMDipilihTeranalisis.mode_pendaftaran === 'langsung'" class="m-gpm-locked-banner" style="background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a;">
                    <span class="m-lock-ico">📍</span>
                    <div>
                      <strong>Datang Langsung ke Lokasi (Tanpa Daftar Online)</strong>
                      <p>Kegiatan ini tidak memerlukan antrean online. Silakan datang langsung ke <strong>{{ acaraGPMDipilihTeranalisis.lokasi }}</strong> dengan membawa KTP/KK pada jadwal yang tertera.</p>
                    </div>
                  </div>

                  <!-- KONDISI 3: FORMULIR AMBIL ANTREAN AKTIF (TANPA LOGIN) -->
                  <form v-else @submit.prevent="ambilNomorAntreanMobile" class="m-queue-form">
                    <h4 class="m-form-heading">🎟️ Formulir Ambil Nomor Antrean</h4>
                    <p class="m-form-subheading">
                      {{ acaraGPMDipilihTeranalisis.mode_penerima === 'keluarga'
                        ? 'Berbasis Keluarga: 1 Kartu Keluarga (16 digit) = 1 nomor antrean.'
                        : 'Masyarakat tidak perlu masuk akun, cukup isi NIK (16 digit) dan nama lengkap:' }}
                    </p>

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

                    <template v-if="acaraGPMDipilihTeranalisis.mode_penerima === 'keluarga'">
                      <div class="m-input-group-mobile">
                        <label>NOMOR KARTU KELUARGA (KK) <span style="color: #ef4444;">* (Wajib 16 Digit)</span></label>
                        <input
                          type="text"
                          required
                          maxlength="16"
                          v-model="formAntreanGPM.no_kk"
                          placeholder="Contoh: 7171011234560001"
                          class="m-input-text"
                          @input="formAntreanGPM.no_kk = formAntreanGPM.no_kk.replace(/[^0-9]/g, '').slice(0, 16)"
                        />
                        <small :style="{ color: formAntreanGPM.no_kk?.length === 16 ? '#16a34a' : '#64748b', fontSize: '0.74rem', marginTop: '3px', display: 'block' }">
                          {{ formAntreanGPM.no_kk?.length || 0 }}/16 digit
                        </small>
                      </div>
                      <div class="m-input-group-mobile">
                        <label>JUMLAH ANGGOTA KELUARGA (ORANG)</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          v-model.number="formAntreanGPM.jumlah_anggota"
                          class="m-input-text"
                        />
                      </div>
                    </template>

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
              <option value="Staf">Staf (Petugas Pangan)</option>
              <option value="Kabid">Kabid (Kepala Bidang)</option>
              <option value="Kadis">Kadis (Kepala Dinas)</option>
              <option value="Admin">Admin</option>
              <option v-if="isSuperadmin" value="Superadmin">Superadmin (Akses Penuh)</option>
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
         MODAL 4C: UBAH NAMA & BIDANG PENGGUNA OLEH ADMIN / SUPERADMIN
         =============================================================================== -->
    <div v-if="modalUbahProfilUserBuka" class="server-config-modal-overlay" @click.self="modalUbahProfilUserBuka = false">
      <div class="server-config-modal-card">
        <div class="server-modal-header">
          <div class="server-modal-title-wrap">
            <span class="server-icon-pulse">👤</span>
            <div>
              <h3 class="server-m-title">Ubah Nama &amp; Bidang</h3>
              <p class="server-m-sub">Akun: {{ targetUbahProfilUser?.username }} ({{ formatPeranLengkap(targetUbahProfilUser?.peran) }})</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal-icon" @click="modalUbahProfilUserBuka = false">✕</button>
        </div>

        <div class="server-modal-body">
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Nama Lengkap *</label>
            <input type="text" v-model="inputNamaProfilBaru" placeholder="Nama lengkap pegawai / pejabat" />
          </div>
          <div v-if="targetUbahProfilUser?.peran !== 'Admin' && targetUbahProfilUser?.peran !== 'Superadmin'" class="s-field">
            <label>Bidang / Unit Kerja</label>
            <input type="text" v-model="inputBidangProfilBaru" placeholder="Bidang Cadangan dan Distribusi Pangan" />
          </div>
        </div>

        <div class="server-modal-footer">
          <button type="button" class="btn-cancel-server" @click="modalUbahProfilUserBuka = false">Batal</button>
          <button type="button" class="btn-save-server" @click="eksekusiUbahProfilUser">
            ✓ Simpan Profil
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
            <input
              type="text"
              inputmode="numeric"
              :value="formEditKabid.harga"
              @keydown="hanyaBolehAngka"
              @input="formEditKabid.harga = ($event.target as HTMLInputElement).value.replace(/[^0-9]/g, '')"
            />
          </div>
          <div class="s-field" style="margin-bottom: 8px;">
            <label>Pasar Tradisional</label>
            <select v-model="formEditKabid.nama_pasar" class="m-role-select" style="width: 100%;">
              <option v-for="p in Array.from(new Set([...daftarPasar, formEditKabid.nama_pasar].filter(Boolean)))" :key="p" :value="p">{{ p }}</option>
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
              <div
                v-if="modeKelolaGpmMobile === 'kelola-acara' && acaraGPMDipilih"
                style="padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.84rem; font-weight: 700; color: #0f172a;"
              >
                🔒 {{ acaraGPMDipilih.nama_acara }} ({{ acaraGPMDipilih.lokasi }})
              </div>
              <select v-else v-model="modalTambahManualMobile.acaraId" class="m-role-select" style="width: 100%;" required>
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

            <div
              v-if="acaraManualDipilihMobile && String(acaraManualDipilihMobile.mode_penerima || 'individu').toLowerCase() === 'keluarga'"
              style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; margin-bottom: 12px;"
            >
              <div style="font-size: 0.76rem; font-weight: 800; color: #1e40af; margin-bottom: 8px;">
                👨‍👩‍👧‍👦 Mode Keluarga (1 KK = 1 Antrean)
              </div>
              <div class="s-field" style="margin-bottom: 8px;">
                <label>Nomor KK (16 Digit) <span style="font-weight: normal; color: #64748b;">(Opsional di lokasi)</span></label>
                <input
                  type="text"
                  inputmode="numeric"
                  maxlength="16"
                  v-model="modalTambahManualMobile.no_kk"
                  placeholder="16 digit Nomor KK"
                  @input="modalTambahManualMobile.no_kk = modalTambahManualMobile.no_kk.replace(/[^0-9]/g, '').slice(0, 16)"
                />
              </div>
              <div class="s-field">
                <label>Jumlah Anggota Keluarga</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  v-model.number="modalTambahManualMobile.jumlah_anggota"
                />
              </div>
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

        <div class="server-modal-footer" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-cancel-server" style="flex: 1 1 80px;" @click="modalDetailWargaMobile.buka = false">
            Tutup
          </button>
          <button
            type="button"
            class="btn-save-server"
            style="flex: 1 1 110px; background: #166534;"
            @click="unduhRekapAcaraMobile(modalDetailWargaMobile.acara)"
          >
            📊 Excel (.xlsx)
          </button>
          <button
            type="button"
            class="btn-save-server"
            style="flex: 1 1 110px; background: #8b1e1e;"
            @click="cetakPendaftarAcaraMobile(modalDetailWargaMobile.acara)"
          >
            🖨️ Cetak PDF
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

    <!-- MODAL RINCIAN PAKET PENGAJUAN HARGA BATCH (STAF / KABID) -->
    <div v-if="detailPengajuanBatchMobile" class="m-mp-backdrop" @click="detailPengajuanBatchMobile = null">
      <div class="m-mp-sheet" @click.stop>
        <div class="m-mp-header">
          <div>
            <h4>📋 Rincian Pengajuan Harga</h4>
            <p>📍 {{ detailPengajuanBatchMobile.nama_pasar }} · 📅 {{ detailPengajuanBatchMobile.tanggal_tampil }}</p>
          </div>
          <button type="button" class="m-mp-close" @click="detailPengajuanBatchMobile = null">✕</button>
        </div>

        <div style="padding: 12px 16px; max-height: 60vh; overflow-y: auto;">
          <div
            v-if="detailPengajuanBatchMobile.catatan_verifikasi"
            :class="['m-staf-sub-note', detailPengajuanBatchMobile.status === 'Ditolak' ? 'is-reject' : '']"
            style="margin-bottom: 10px;"
          >
            💬 <strong>Catatan Kabid ({{ pengajuanHargaMobileService.formatLabelStatus(detailPengajuanBatchMobile.status) }}):</strong> {{ detailPengajuanBatchMobile.catatan_verifikasi }}
          </div>
          <div v-for="it in (detailPengajuanBatchMobile.items || [])" :key="it.id" class="m-vbp-row" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
            <div>
              <strong style="display: block; font-size: 0.84rem; color: #0f172a;">{{ it.nama_komoditas }}</strong>
              <small style="color: #64748b;">{{ it.satuan }} · Sebelumnya: {{ it.harga_lama !== null && it.harga_lama !== undefined ? formatRupiah(it.harga_lama) : 'Baru' }}</small>
            </div>
            <strong style="color: #8b1e1e; font-size: 0.9rem;">{{ formatRupiah(it.harga) }}</strong>
          </div>
        </div>

        <div class="m-mp-footer" v-if="isKabid && detailPengajuanBatchMobile.status === 'Diajukan'" style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px;">
          <button
            type="button"
            class="btn-m-del"
            style="padding: 11px 8px;"
            :disabled="sedangAjukanBatchMobile"
            @click="modalTolakBatchMobile = { buka: true, pengajuan: detailPengajuanBatchMobile, catatan: '' }; detailPengajuanBatchMobile = null"
          >
            ✕ Tolak
          </button>
          <button
            type="button"
            class="m-kabid-btn-bulk"
            :disabled="sedangAjukanBatchMobile"
            @click="setujuiPengajuanBatchMobile(detailPengajuanBatchMobile)"
          >
            ✓ Setujui &amp; Terbitkan
          </button>
        </div>

        <div class="m-mp-footer" v-else-if="isStaf">
          <button
            v-if="detailPengajuanBatchMobile.status === 'Diverifikasi'"
            type="button"
            class="m-mp-apply-btn"
            @click="bukaDokumenUntukUbahMobile(detailPengajuanBatchMobile, true)"
          >
            📋 Salin ke Pengajuan Baru
          </button>
          <button
            v-else
            type="button"
            class="m-mp-apply-btn"
            @click="bukaDokumenUntukUbahMobile(detailPengajuanBatchMobile)"
          >
            {{ detailPengajuanBatchMobile.status === 'Ditolak' ? '🔄 Muat ke Form untuk Revisi' : '✏️ Buka di Form untuk Diubah' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL TOLAK PAKET PENGAJUAN BATCH DENGAN CATATAN (KABID) -->
    <div v-if="modalTolakBatchMobile.buka && modalTolakBatchMobile.pengajuan" class="m-mp-backdrop" @click="modalTolakBatchMobile = { buka: false, pengajuan: null, catatan: '' }">
      <div class="m-mp-sheet" @click.stop>
        <div class="m-mp-header">
          <div>
            <h4>✕ Tolak Pengajuan Pasar</h4>
            <p>{{ modalTolakBatchMobile.pengajuan.nama_pasar }} · {{ modalTolakBatchMobile.pengajuan.tanggal_tampil }}</p>
          </div>
          <button type="button" class="m-mp-close" @click="modalTolakBatchMobile = { buka: false, pengajuan: null, catatan: '' }">✕</button>
        </div>
        <form @submit.prevent="eksekusiTolakBatchMobile" style="padding: 14px 16px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; color: #334155;">
            Catatan / Alasan Revisi untuk Staf *
          </label>
          <textarea
            v-model="modalTolakBatchMobile.catatan"
            rows="3"
            required
            placeholder="Contoh: Mohon verifikasi ulang harga cabai rawit..."
            style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 0.85rem; box-sizing: border-box;"
          ></textarea>
          <button
            type="submit"
            class="m-mp-apply-btn"
            style="margin-top: 12px; background: #dc2626;"
            :disabled="sedangAjukanBatchMobile"
          >
            {{ sedangAjukanBatchMobile ? 'Memproses...' : 'Kirim Penolakan & Catatan' }}
          </button>
        </form>
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

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
  OPSI_URUTAN_TAMPIL_PUBLIK,
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
import {
  pengajuanHargaMobileService,
  type BarisInputCepatPasar,
  type DokumenPengajuanHarga
} from '../services/PengajuanHargaService';
import { berandaStafMobileService } from '../services/BerandaStafService';
import {
  berandaKabidMobileService,
  type PeriodeLaporanKabid
} from '../services/BerandaKabidService';
import { berandaKadisMobileService } from '../services/BerandaKadisService';
import { berandaAdminMobileService } from '../services/BerandaAdminService';
import { tiketGPMMobileService } from '../services/TiketGPMService';


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
  no_kk: '',
  jumlah_anggota: 1,
  nama_lengkap: '',
  nomor_telepon: ''
});
const sedangDaftarGPM = ref(false);
const pesanErrorGPM = ref('');
const tiketGPMHasil = ref<HasilTiketGPM | null>(null);

// Modal Tambah Pendaftar Manual Mobile (Di Tempat / Walk-In Tanpa HP — Tunduk Kuota, KK & WITA)
const modalTambahManualMobile = ref({
  buka: false,
  acaraId: '',
  nama: '',
  nik: '',
  telepon: '',
  no_kk: '',
  jumlah_anggota: 1,
  langsungHadir: true,
  sedangKirim: false,
  pesanError: ''
});

const acaraManualDipilihMobile = computed(() =>
  daftarAcaraGPM.value.find((a) => String(a.id) === String(modalTambahManualMobile.value.acaraId)) || null
);

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

// Titik Koordinat Cepat 100% dari Master Pasar Supabase yang sudah memiliki koordinat GPS
const presetLokasiPasarMobile = computed(() =>
  daftarPasarLengkap.value
    .filter((p) => p && p.punyaKoordinat && p.latitude !== null && p.longitude !== null)
    .map((p) => ({
      label: p.nama_pasar,
      lokasi: p.alamat ? `${p.nama_pasar}, ${p.alamat}` : p.nama_pasar,
      kecamatan: p.kecamatan || '',
      lat: Number(p.latitude),
      lng: Number(p.longitude)
    }))
);

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

// State Petugas GPM (Master-Detail Event Workspace)
const modeKelolaGpmMobile = ref<'daftar' | 'kelola-acara' | 'buat'>('daftar');
const tabDaftarGpmMobile = ref<'aktif' | 'riwayat'>('aktif');
const tabAcaraGpmMobile = ref<'scan' | 'antrean'>('scan');
const sedangUnduhTiketMobile = ref(false);
const daftarRiwayatGPM = ref<ItemAcaraGPM[]>([]);
const detailRiwayatPendaftar = ref<{ [key: string]: any[] }>({});
const riwayatTerbukaId = ref<string | null>(null);
const sedangSelesaikanAcaraMobile = ref(false);

const isTiketSalahAcaraMobile = computed(() => {
  if (!hasilScanPetugas.value || !acaraGPMDipilih.value) return false;
  const idAcaraScan = hasilScanPetugas.value.acara_id || hasilScanPetugas.value.acara?.id || '';
  return Boolean(idAcaraScan && String(idAcaraScan) !== String(acaraGPMDipilih.value.id));
});

const unduhTiketGPMMobilePNG = async () => {
  if (!tiketGPMHasil.value) return;
  sedangUnduhTiketMobile.value = true;
  try {
    await tiketGPMMobileService.unduhTiketPNG(tiketGPMHasil.value);
  } catch (err: any) {
    alert(err?.message || 'Gagal mengunduh gambar tiket.');
  } finally {
    sedangUnduhTiketMobile.value = false;
  }
};
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
  kecamatan: '',
  tanggal: new Date().toISOString().split('T')[0],
  jam_mulai: '08:00',
  jam_selesai: '14:00',
  latitude: 1.4878,
  longitude: 124.8427,
  kuota_maksimal: 250,
  komoditas_tersedia: '',
  deskripsi: '',
  mode_pendaftaran: 'online' as 'online' | 'keduanya' | 'langsung',
  mode_penerima: 'individu' as 'individu' | 'keluarga'
});
const sedangSimpanGPMBaru = ref(false);
const dropdownGPMKomoditasBuka = ref(false);
const cariAntreanMobile = ref('');

const daftarKecamatanPilihanFormGPM = computed<string[]>(() => {
  return daftarKecamatan.value;
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

// State Filter Kategori, Kelompok Induk, Sub-Varian, Kecamatan, Tanggal & Pasar (Publik + Multi-Select & Sortir)
const kategoriAktif = ref('Semua');
const kelompokAktifPublik = ref('Semua');
const varianAktifPublik = ref('Semua');
const kecamatanAktifPublik = ref('Semua');
const tanggalFilterPublik = ref('Semua');
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

const daftarIndukKomoditasMobile = ref<string[]>([]);
const modeIndukBaruMobile = ref(false);
const komoditasMasterDieditMobile = ref<{ id?: string; nama_komoditas: string } | null>(null);

const daftarKelompokIndukMasterMobile = computed(() =>
  Array.from(
    new Set([
      ...daftarIndukKomoditasMobile.value,
      ...daftarMasterKomoditas.value.map((k) => k.kelompok_komoditas).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b, 'id-ID'))
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

const daftarKecamatanPasarPublik = computed<string[]>(() => {
  const setPasarAktif = new Set(daftarPasarPublikDB.value.map((p) => p.toLowerCase()));
  const setKec = new Set<string>();
  daftarPasarLengkap.value.forEach((p) => {
    if (p?.kecamatan && (setPasarAktif.size === 0 || setPasarAktif.has((p.nama_pasar || '').toLowerCase()))) {
      setKec.add(p.kecamatan);
    }
  });
  return Array.from(setKec).sort((a, b) => a.localeCompare(b, 'id-ID'));
});

const daftarTanggalUnikPublik = computed<string[]>(() =>
  Array.from(new Set(dataHargaPublikRiil.value.map((i) => i.tanggal_penetapan).filter((t): t is string => Boolean(t))))
);

const pilihKecamatanPublik = (kec: string) => {
  kecamatanAktifPublik.value = kec;
  if (kec === 'Semua') {
    pasarTerpilihPublik.value = [];
  } else {
    pasarTerpilihPublik.value = daftarPasarLengkap.value
      .filter((p) => String(p.kecamatan || '').toLowerCase() === kec.toLowerCase())
      .map((p) => p.nama_pasar);
  }
};

const statistikPublikRiil = computed(() =>
  analisisHargaMobileService.hitungStatistikKategori(
    dataHargaPublikRiil.value,
    pasarTerpilihPublik.value,
    modeTampilanPublik.value,
    tanggalFilterPublik.value
  )
);

const daftarKelompokIndukPublik = computed(() =>
  analisisHargaMobileService.ekstrakKelompokInduk(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    tanggalFilter: tanggalFilterPublik.value,
    petaMaster: petaMasterKomoditas.value
  })
);

const daftarSubVarianPublik = computed(() =>
  analisisHargaMobileService.ekstrakSubVarian(dataHargaPublikRiil.value, {
    kategori: kategoriAktif.value,
    pencarian: kataKunciPencarian.value,
    pasarTerpilih: pasarTerpilihPublik.value,
    kelompokAktif: kelompokAktifPublik.value,
    tanggalFilter: tanggalFilterPublik.value,
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
    tanggalFilter: tanggalFilterPublik.value,
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
    tanggalFilter: tanggalFilterPublik.value,
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
    tanggalFilter: tanggalFilterPublik.value,
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
  kecamatanAktifPublik.value = 'Semua';
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
  kecamatanAktifPublik.value = 'Semua';
  tanggalFilterPublik.value = 'Semua';
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
  if (idMenu === 'kelola-user' || idMenu === 'master-komoditas' || idMenu === 'master-wilayah') {
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

// Form Penetapan Harga Petugas Mobile (Komoditas & Satuan terkunci dari Master Admin — tanpa pasar hardcoded)
const formPenetapan = ref({
  nama_komoditas: '',
  kategori: 'Bahan Pokok',
  satuan: '1 KG',
  harga: '',
  nama_pasar: '',
  status: 'Draft',
  prioritas_tampil: 50
});

// State Pengajuan Harga Hybrid Per Pasar (Master-Detail + Draft + Timpa Cerdas) & Beranda Staf
const daftarPengajuanHargaMobile = ref<DokumenPengajuanHarga[]>([]);
const belumMigrasiPengajuanMobile = ref(false);
const tanggalPengambilanMobile = ref(berandaStafMobileService.ambilTanggalHariIniISO());
const subTabPengajuanStafMobile = ref<'baru' | 'daftar' | 'terbit'>('baru');
const filterStatusPengajuanStafMobile = ref<'semua' | 'Draft' | 'Diajukan' | 'Diverifikasi' | 'Ditolak'>('semua');
const jenisKomoditasTerpilihMobile = ref<string>('Semua');
const keranjangPengajuanMobile = ref<BarisInputCepatPasar[]>([]);
const cariKeranjangStafMobile = ref('');
const adaPerubahanBelumDisimpanMobile = ref(false);
const dokumenPengajuanDieditMobile = ref<{
  id: string | null;
  status: string;
  nama_pasar: string;
  tanggal_pengambilan: string;
  catatan_verifikasi?: string;
} | null>(null);
const sedangAjukanBatchMobile = ref(false);
const detailPengajuanBatchMobile = ref<DokumenPengajuanHarga | null>(null);
const modalTolakBatchMobile = ref<{ buka: boolean; pengajuan: DokumenPengajuanHarga | null; catatan: string }>({
  buka: false,
  pengajuan: null,
  catatan: ''
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

const modalUbahProfilUserBuka = ref(false);
const targetUbahProfilUser = ref<AkunPengguna | null>(null);
const inputNamaProfilBaru = ref('');
const inputBidangProfilBaru = ref('');

const filterCariPenggunaMobile = ref('');
const filterPeranPenggunaMobile = ref('Semua');
const cariMasterKomoditasMobile = ref('');
const filterCekGpmMobile = ref({
  pencarian: '',
  kecamatan: 'Semua',
  status: 'Semua'
});

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

// ─── KADIS: BERANDA EKSEKUTIF, GRAFIK PANGAN & LAPORAN RESMI (100% DATA RIIL) ──
const periodeBerandaKadisMobile = ref<PeriodeLaporanKabid>('tahun_ini');
const subTabLaporanKadisMobile = ref<'gpm' | 'harga'>('gpm');
const filterLaporanGPMKadisMobile = ref<{
  periode: PeriodeLaporanKabid;
  kecamatan: string;
  status: string;
}>({
  periode: 'tahun_ini',
  kecamatan: 'Semua',
  status: 'Semua'
});
const filterLaporanHargaKadisMobile = ref({
  pasar: 'Semua',
  kategori: 'Semua',
  pencarian: ''
});
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

// Computed Komoditas & Pasar untuk Grafik Kadis & Superadmin — 100% Sinkron dengan Master Komoditas Admin
const pilihanKomoditasKadisMobile = computed(() =>
  masterDataMobileService.susunPilihanKomoditasKadis(daftarMasterKomoditas.value, semuaKomoditas.value)
);
const daftarKomoditasTersediaKadis = computed(() => pilihanKomoditasKadisMobile.value.semuaNamaValid);
const daftarPasarTersediaKadis = computed(() => {
  return Array.from(new Set([
    ...daftarPasar.value,
    ...semuaKomoditas.value.map((i: any) => i.nama_pasar).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, 'id-ID'));
});

// Ringkasan Eksekutif Beranda Kepala Dinas (100% Reaktif & Data Riil)
const ringkasanBerandaKadisMobile = computed(() =>
  berandaKadisMobileService.hitungRingkasanKadis({
    daftarHarga: semuaKomoditas.value,
    daftarPasarLengkap: daftarPasarLengkap.value,
    daftarKecamatanMaster: daftarKecamatan.value,
    daftarAcaraGPM: semuaAcaraGPM.value,
    periode: periodeBerandaKadisMobile.value,
    waktuSekarangMs: waktuSekarangGPMMs.value
  })
);

// Rekap GPM Reaktif untuk Kadis (membedakan Selesai vs Aktif + satuan KK/Warga dinamis)
const daftarRekapGPMKadisReaktif = computed(() =>
  semuaAcaraGPM.value
    .map((a) => {
      const st = jadwalGPMMobileService.hitungStatusOperasional(a, waktuSekarangGPMMs.value);
      const satuan = String(a.mode_penerima || 'individu').toLowerCase() === 'keluarga' ? 'KK' : 'Warga';
      const persenSerapan = st.kuotaMaks > 0 ? Math.min(100, Math.round((st.totalHadir / st.kuotaMaks) * 100)) : 0;
      return {
        id: String(a.id),
        nama_acara: a.nama_acara,
        lokasi: a.lokasi,
        kecamatan: a.kecamatan || '-',
        tanggal: a.tanggal,
        jam_mulai: a.jam_mulai,
        jam_selesai: a.jam_selesai,
        target_kuota: st.kuotaMaks,
        terdaftar: st.terisi,
        terlayani: st.totalHadir,
        status: st.sudahBerakhir ? 'Selesai' : 'Aktif',
        mode_penerima: a.mode_penerima || 'individu',
        satuan_penerima: satuan,
        persenSerapan,
        komoditas_tersedia: a.komoditas_tersedia || '-'
      };
    })
    .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')))
);

const daftarKecamatanGPMKadisMobile = computed<string[]>(() =>
  Array.from(new Set(daftarRekapGPMKadisReaktif.value.map((g) => g.kecamatan).filter((k) => k && k !== '-'))).sort((a, b) =>
    a.localeCompare(b, 'id-ID')
  )
);

const daftarLaporanGPMKadisTerfilterMobile = computed(() => {
  const f = filterLaporanGPMKadisMobile.value;
  return daftarRekapGPMKadisReaktif.value.filter((g) => {
    if (!berandaKadisMobileService.apakahAcaraMasukPeriode(g, f.periode)) return false;
    if (f.kecamatan !== 'Semua' && g.kecamatan !== f.kecamatan) return false;
    if (f.status !== 'Semua' && String(g.status || '').toLowerCase() !== f.status.toLowerCase()) return false;
    return true;
  });
});

const ringkasanLaporanGPMKadisMobile = computed(() => {
  const list = daftarLaporanGPMKadisTerfilterMobile.value;
  const totalTitik = list.length;
  const totalSelesai = list.filter((g) => g.status === 'Selesai').length;
  const totalAktif = totalTitik - totalSelesai;
  const totalKuota = list.reduce((acc, g) => acc + (Number(g.target_kuota) || 0), 0);
  const totalTerdaftar = list.reduce((acc, g) => acc + (Number(g.terdaftar) || 0), 0);
  const totalHadir = list.reduce((acc, g) => acc + (Number(g.terlayani) || 0), 0);
  const persenSerapan = totalKuota > 0 ? Math.min(100, Math.round((totalHadir / totalKuota) * 100)) : 0;
  return { totalTitik, totalSelesai, totalAktif, totalKuota, totalTerdaftar, totalHadir, persenSerapan };
});

const daftarPasarTerbitKadisMobile = computed<string[]>(() =>
  Array.from(new Set(komoditasTerbit.value.map((h) => h.nama_pasar).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id-ID'))
);

const daftarKategoriTerbitKadisMobile = computed<string[]>(() =>
  Array.from(new Set(komoditasTerbit.value.map((h) => h.kategori).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id-ID'))
);

const daftarHargaTerbitKadisTerfilterMobile = computed(() => {
  const f = filterLaporanHargaKadisMobile.value;
  const kata = f.pencarian.trim().toLowerCase();
  return komoditasTerbit.value.filter((h) => {
    if (f.pasar !== 'Semua' && h.nama_pasar !== f.pasar) return false;
    if (f.kategori !== 'Semua' && h.kategori !== f.kategori) return false;
    if (kata && !`${h.nama_komoditas || ''} ${h.nama_pasar || ''} ${h.kategori || ''}`.toLowerCase().includes(kata)) {
      return false;
    }
    return true;
  });
});

const statistikHargaKadisMobile = computed(() => {
  const valid = daftarHargaTerbitKadisTerfilterMobile.value.map((h) => Number(h.harga) || 0).filter((v) => v > 0);
  if (valid.length === 0) return { rataRata: 0, terendah: 0, tertinggi: 0 };
  return {
    rataRata: Math.round(valid.reduce((a, b) => a + b, 0) / valid.length),
    terendah: Math.min(...valid),
    tertinggi: Math.max(...valid)
  };
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

// Computed Statistik Ringkasan Eksekutif GPM Kadis (kompatibilitas)
const totalKuotaGPMKadis = computed(() => ringkasanLaporanGPMKadisMobile.value.totalKuota);
const totalTerlayaniGPMKadis = computed(() => ringkasanLaporanGPMKadisMobile.value.totalHadir);
const persentaseSerapanKadis = computed(() => String(ringkasanLaporanGPMKadisMobile.value.persenSerapan));

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

let timerPollingMobile: ReturnType<typeof setInterval> | null = null;
const handleWindowFocusMobile = () => {
  waktuSekarangGPMMs.value = Date.now();
  muatData(true);
  muatDataGPM();
  muatStatsDashboard();
};

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

  // Sinkronisasi otomatis saat HP kembali dibuka (Focus) tanpa flicker
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocusMobile);
  }

  // Polling berkala setiap 15 detik: sinkron data harga, auto-close waktu WITA & status kuota GPM
  timerPollingMobile = setInterval(() => {
    waktuSekarangGPMMs.value = Date.now();
    muatData(true);
    muatDataGPM();
    muatStatsDashboard();
  }, 15000);
});

onUnmounted(() => {
  if (timerPollingMobile) {
    clearInterval(timerPollingMobile);
    timerPollingMobile = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleWindowFocusMobile);
  }
  hentikanScanKameraMobile();
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
const selesaikanAcaraMobile = async (acaraOverride?: ItemAcaraGPM) => {
  if (!isKabid.value) {
    alert('Hanya Kepala Bidang yang memiliki hak akses untuk menyelesaikan kegiatan GPM.');
    return;
  }
  const targetAcara = acaraOverride && typeof acaraOverride === 'object' && 'id' in acaraOverride
    ? acaraOverride
    : acaraGPMDipilih.value;
  if (!targetAcara) return;
  const nama = targetAcara.nama_acara;
  const ok = confirm(
    `Konfirmasi Selesaikan Lebih Awal:\n\nApakah Anda yakin ingin menutup "${nama}" sebelum jam selesai WITA?\n\n- Kegiatan akan diarsipkan ke Riwayat GPM (Publik & Petugas).\n- Pendaftaran dan verifikasi tiket QR otomatis dikunci.`
  );
  if (!ok) return;

  sedangSelesaikanAcaraMobile.value = true;
  try {
    await gpmMobileService.selesaikanAcara(targetAcara.id);
    alert(`✅ Kegiatan "${nama}" resmi diselesaikan dan diarsipkan ke menu Riwayat GPM.`);
    await muatDataGPM();
    kembaliKeDaftarGpmMobile('riwayat');
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

// Unduh Rekap Data Kegiatan Aktif ke Excel Resmi (.xlsx)
const unduhRekapAktifMobile = () => {
  if (!acaraGPMDipilih.value) return;
  gpmMobileService.eksporKeExcel(acaraGPMDipilih.value, pendaftarGPMList.value, {
    nama: ambilNamaPenandatanganMobile('Kabid')
  });
};

// Unduh Rekap Data Kegiatan Riwayat ke Excel Resmi (.xlsx)
const unduhRekapRiwayatMobile = async (acara: ItemAcaraGPM) => {
  try {
    let pendaftar = detailRiwayatPendaftar.value[acara.id];
    if (!pendaftar) {
      const res = await gpmMobileService.ambilPendaftarAcara(acara.id);
      pendaftar = res.data || [];
      detailRiwayatPendaftar.value[acara.id] = pendaftar;
    }
    gpmMobileService.eksporKeExcel(acara, pendaftar, {
      nama: ambilNamaPenandatanganMobile('Kabid')
    });
  } catch (err: any) {
    alert('Gagal mengunduh file Excel: ' + err.message);
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
  if (baru !== 'gpm' && baru !== 'kelola-gpm' && kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
  }
  if (baru === 'gpm' || baru === 'kelola-gpm' || baru === 'cek-gpm') {
    await muatDataGPM();
  }
  if (baru === 'verif-harga' || baru === 'dashboard' || baru === 'input-harga' || baru === 'laporan') {
    await muatData(true);
    await muatStatsDashboard();
  }
});

const bukaMenuKelolaGpmMobile = async (tujuan: 'aktif' | 'riwayat' | 'buat' = 'aktif') => {
  if (kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
  }
  menuPetugas.value = 'kelola-gpm';
  if (tujuan === 'buat') {
    modeKelolaGpmMobile.value = 'buat';
  } else {
    modeKelolaGpmMobile.value = 'daftar';
    tabDaftarGpmMobile.value = tujuan;
  }
};

const bukaKelolaAcaraMobile = async (acara: ItemAcaraGPM, tab: 'scan' | 'antrean' = 'scan') => {
  if (!acara) return;
  if (kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
  }
  await pilihAcaraGpm(acara);
  hasilScanPetugas.value = null;
  pesanScanErrorPetugas.value = '';
  inputBarcodePetugas.value = '';
  cariAntreanMobile.value = '';
  tabAcaraGpmMobile.value = tab;
  modeKelolaGpmMobile.value = 'kelola-acara';
};

const kembaliKeDaftarGpmMobile = async (tab?: 'aktif' | 'riwayat') => {
  if (kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
  }
  hasilScanPetugas.value = null;
  pesanScanErrorPetugas.value = '';
  if (tab) tabDaftarGpmMobile.value = tab;
  modeKelolaGpmMobile.value = 'daftar';
};

watch([modeKelolaGpmMobile, tabAcaraGpmMobile], async ([mode, tabAcara]) => {
  if ((mode !== 'kelola-acara' || tabAcara !== 'scan') && kameraAktifMobile.value) {
    await hentikanScanKameraMobile();
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

  // 1B. Validasi No. KK jika mode penerima berbasis keluarga
  const isModeKeluarga = String(targetAcara.mode_penerima || 'individu').toLowerCase() === 'keluarga';
  const noKkBersih = String(formAntreanGPM.value.no_kk || '').replace(/[^0-9]/g, '').trim();
  if (isModeKeluarga && noKkBersih.length !== 16) {
    pesanErrorGPM.value = `Nomor Kartu Keluarga (KK) wajib tepat 16 digit untuk kegiatan berbasis Keluarga! (Saat ini: ${noKkBersih.length} digit)`;
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
      'Daring',
      false,
      isModeKeluarga
        ? {
            no_kk: noKkBersih,
            nama_kepala_keluarga: nama,
            jumlah_anggota: Math.max(1, Number(formAntreanGPM.value.jumlah_anggota) || 1)
          }
        : null
    );
    tiketGPMHasil.value = hasil;
    formAntreanGPM.value.nik = '';
    formAntreanGPM.value.no_kk = '';
    formAntreanGPM.value.jumlah_anggota = 1;
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

// Handlers Pendaftaran Manual di Lokasi GPM untuk Petugas (Walk-In Tanpa HP — Tunduk Kuota, KK & WITA)
const bukaModalManualMobile = (acaraOverrideId?: string) => {
  if (daftarAcaraGPM.value.length === 0) {
    alert('Tidak ada kegiatan GPM aktif yang dapat menerima pendaftaran manual saat ini.');
    return;
  }
  const targetId = typeof acaraOverrideId === 'string' && acaraOverrideId
    ? acaraOverrideId
    : (acaraGPMDipilih.value?.id || (daftarAcaraGPM.value[0]?.id ? String(daftarAcaraGPM.value[0].id) : ''));
  modalTambahManualMobile.value = {
    buka: true,
    acaraId: targetId,
    nama: '',
    nik: '',
    telepon: '',
    no_kk: '',
    jumlah_anggota: 1,
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
  const acaraTarget = daftarAcaraGPM.value.find((a) => String(a.id) === String(m.acaraId));
  const isModeKeluarga = String(acaraTarget?.mode_penerima || 'individu').toLowerCase() === 'keluarga';
  const noKkBersih = (m.no_kk || '').replace(/[^0-9]/g, '').trim();
  if (isModeKeluarga && noKkBersih && noKkBersih.length !== 16) {
    m.pesanError = `Nomor Kartu Keluarga (KK) harus tepat 16 digit angka! (Saat ini: ${noKkBersih.length} digit)`;
    return;
  }

  m.sedangKirim = true;
  m.pesanError = '';
  try {
    const opsiKeluarga = isModeKeluarga
      ? {
          no_kk: noKkBersih || null,
          nama_kepala_keluarga: nama,
          jumlah_anggota: Math.max(1, parseInt(String(m.jumlah_anggota), 10) || 1)
        }
      : null;
    const res = await gpmMobileService.tambahPendaftarManual(
      m.acaraId,
      nama,
      telp || '-',
      nik,
      m.langsungHadir,
      opsiKeluarga
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
  if (modeKelolaGpmMobile.value === 'kelola-acara' && isTiketSalahAcaraMobile.value) {
    alert('Tiket ini milik kegiatan GPM lain! Silakan buka kegiatan GPM yang sesuai terlebih dahulu.');
    return;
  }
  try {
    await gpmMobileService.verifikasiKehadiran(hasilScanPetugas.value.kode_barcode, statusTarget, userAktif.value?.id || null);
    hasilScanPetugas.value.status_kehadiran = statusTarget;
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal verifikasi: ' + (err.message || 'Terjadi kesalahan'));
  }
};

const ubahStatusPendaftarDiListMobile = async (item: ItemPendaftarGPM) => {
  const statusTarget: 'Hadir' | 'Menunggu' = item.status_kehadiran === 'Hadir' ? 'Menunggu' : 'Hadir';
  try {
    await gpmMobileService.verifikasiKehadiran(item.kode_barcode, statusTarget, userAktif.value?.id || null);
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal mengubah status kehadiran: ' + (err.message || 'Terjadi kesalahan'));
  }
};

const konfirmasiPengambilanPanganMobile = async (pendaftarId: string, dariHasilScan = false) => {
  if (!pendaftarId) return;
  try {
    await gpmMobileService.konfirmasiPengambilanPangan(pendaftarId, userAktif.value?.id || null);
    if (dariHasilScan && hasilScanPetugas.value) {
      hasilScanPetugas.value = {
        ...hasilScanPetugas.value,
        status_pengambilan: 'Sudah Diambil',
        waktu_pengambilan: new Date().toISOString()
      };
    }
    pesanSuksesMobile.value = '📦 Pengambilan bahan pangan oleh warga berhasil dikonfirmasi!';
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 3500);
    await muatDataGPM();
  } catch (err: any) {
    alert('Gagal konfirmasi pengambilan: ' + (err?.message || 'Terjadi kesalahan'));
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
      kecamatan: daftarKecamatanPilihanFormGPM.value[0] || '',
      tanggal: new Date().toISOString().split('T')[0],
      jam_mulai: '08:00',
      jam_selesai: '14:00',
      latitude: 1.4878,
      longitude: 124.8427,
      kuota_maksimal: 250,
      komoditas_tersedia: '',
      deskripsi: '',
      mode_pendaftaran: 'online',
      mode_penerima: 'individu'
    };
    await muatDataGPM();
    modeKelolaGpmMobile.value = 'daftar';
    tabDaftarGpmMobile.value = 'aktif';
  } catch (err: any) {
    alert('Gagal menambah acara: ' + (err.message || 'Periksa kembali jadwal & kuota.'));
  } finally {
    sedangSimpanGPMBaru.value = false;
  }
};

const muatData = async (diam: boolean | Event = false) => {
  const modeDiam = diam === true;
  if (!modeDiam) {
    sedangMemuatPublik.value = true;
  }
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

    // 2. Ambil seluruh data komoditas pangan (Terbit + Draft) & dokumen pengajuan harga batch
    const [data, pengajuanRes] = await Promise.all([
      hargaPanganMobileService.ambilSemua(),
      pengajuanHargaMobileService.ambilSemuaPengajuan().catch(() => ({ belumMigrasi: false, data: [] }))
    ]);
    semuaKomoditas.value = Array.isArray(data) ? data : [];
    daftarPengajuanHargaMobile.value = Array.isArray(pengajuanRes?.data) ? pengajuanRes.data : [];
    belumMigrasiPengajuanMobile.value = Boolean(pengajuanRes?.belumMigrasi);

    statistik.value = statistikPublikRiil.value;

    // 3. Muat Master Data (Komoditas Terstruktur, Satuan terkunci per 1, Pasar lengkap + titik peta, Kecamatan) langsung dari Supabase
    const [komoditasMaster, satuanMaster, pasarLengkapMaster, kecMaster] = await Promise.all([
      masterDataMobileService.ambilDaftarKomoditas().catch(() => []),
      masterDataMobileService.ambilDaftarSatuan(),
      masterDataMobileService.ambilDaftarPasarLengkap().catch(() => []),
      masterDataMobileService.ambilDaftarKecamatan()
    ]);
    daftarMasterKomoditas.value = Array.isArray(komoditasMaster) ? komoditasMaster : [];
    daftarIndukKomoditasMobile.value = await masterDataMobileService.ambilDaftarIndukKomoditas(daftarMasterKomoditas.value);
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
  hentikanScanKameraMobile();
  keranjangPengajuanMobile.value = [];
  dokumenPengajuanDieditMobile.value = null;
  adaPerubahanBelumDisimpanMobile.value = false;
  detailPengajuanBatchMobile.value = null;
  daftarPengajuanHargaMobile.value = [];
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
    nama_pasar: formPenetapan.value.nama_pasar || daftarPasar.value[0] || '',
    status: 'Draft',
    prioritas_tampil: 50
  };
};

// ─────────────────────────────────────────────────────────────
// OPERASI PENGAJUAN HARGA HYBRID PER PASAR + BERANDA STAF (OOP)
// ─────────────────────────────────────────────────────────────
const pengajuanAktifPasarIniMobile = computed<DokumenPengajuanHarga | null>(() =>
  pengajuanHargaMobileService.cariPengajuanAktifPasar(
    daftarPengajuanHargaMobile.value,
    formPenetapan.value.nama_pasar,
    tanggalPengambilanMobile.value,
    'Diajukan'
  )
);

const draftAktifPasarIniMobile = computed<DokumenPengajuanHarga | null>(() =>
  pengajuanHargaMobileService.cariPengajuanAktifPasar(
    daftarPengajuanHargaMobile.value,
    formPenetapan.value.nama_pasar,
    tanggalPengambilanMobile.value,
    'Draft'
  )
);

const sedangMenimpaDiajukanMobile = computed<boolean>(() =>
  Boolean(
    (dokumenPengajuanDieditMobile.value && dokumenPengajuanDieditMobile.value.status === 'Diajukan') ||
      (!dokumenPengajuanDieditMobile.value && pengajuanAktifPasarIniMobile.value)
  )
);

const daftarJenisKomoditasMobile = computed<string[]>(() =>
  pengajuanHargaMobileService.ambilDaftarJenisKomoditas(daftarMasterKomoditas.value, semuaKomoditas.value)
);

const grupKomoditasTerfilterJenisMobile = computed(() => {
  const sumber =
    jenisKomoditasTerpilihMobile.value === 'Semua'
      ? daftarMasterKomoditas.value
      : daftarMasterKomoditas.value.filter(
          (k) => String(k.kategori || 'Bahan Pokok').trim().toLowerCase() === jenisKomoditasTerpilihMobile.value.toLowerCase()
        );
  return masterDataMobileService.kelompokkanKomoditasUntukDropdown(sumber);
});

const hargaTerbitKomoditasDipilihMobile = computed(() =>
  pengajuanHargaMobileService.cariHargaTerbitPasar(
    formPenetapan.value.nama_pasar,
    formPenetapan.value.nama_komoditas,
    semuaKomoditas.value
  )
);

const pilihKomoditasMasterStafHybrid = (namaKomoditas: string) => {
  pilihKomoditasMasterStaf(namaKomoditas);
  const master = daftarMasterKomoditas.value.find(
    (k) => k.nama_komoditas.toLowerCase() === String(namaKomoditas || '').toLowerCase()
  );
  if (master?.kategori) {
    jenisKomoditasTerpilihMobile.value = master.kategori;
  }
};

const sinkronkanRuangKerjaPasarMobile = (pasarTujuan: string, tanggalTujuan: string) => {
  const draftTujuan = pengajuanHargaMobileService.cariPengajuanAktifPasar(
    daftarPengajuanHargaMobile.value,
    pasarTujuan,
    tanggalTujuan,
    'Draft'
  );
  const diajukanTujuan = pengajuanHargaMobileService.cariPengajuanAktifPasar(
    daftarPengajuanHargaMobile.value,
    pasarTujuan,
    tanggalTujuan,
    'Diajukan'
  );
  const paketDitemukan = draftTujuan || diajukanTujuan || null;
  if (paketDitemukan) {
    keranjangPengajuanMobile.value = pengajuanHargaMobileService.bangunKeranjangDariDokumen(paketDitemukan, semuaKomoditas.value);
    dokumenPengajuanDieditMobile.value = {
      id: paketDitemukan.id,
      status: paketDitemukan.status,
      nama_pasar: paketDitemukan.nama_pasar,
      tanggal_pengambilan: paketDitemukan.tanggal_pengambilan,
      catatan_verifikasi: paketDitemukan.catatan_verifikasi
    };
  } else {
    keranjangPengajuanMobile.value = [];
    dokumenPengajuanDieditMobile.value = null;
  }
  adaPerubahanBelumDisimpanMobile.value = false;
  cariKeranjangStafMobile.value = '';
};

const gantiPasarPengajuanMobile = (pasarBaru: string, elSelect?: HTMLSelectElement) => {
  if (String(pasarBaru || '').toLowerCase() === String(formPenetapan.value.nama_pasar || '').toLowerCase()) {
    return;
  }
  if (adaPerubahanBelumDisimpanMobile.value && keranjangPengajuanMobile.value.length > 0 && formPenetapan.value.nama_pasar) {
    const lanjut = confirm(
      `Daftar Harga Pangan untuk "${formPenetapan.value.nama_pasar}" (${keranjangPengajuanMobile.value.length} komoditas) belum disimpan ke Draft.\n\nTekan OK untuk pindah ke "${pasarBaru || 'pasar lain'}", atau Batal lalu tekan 💾 Simpan terlebih dahulu.`
    );
    if (!lanjut) {
      if (elSelect) elSelect.value = formPenetapan.value.nama_pasar;
      return;
    }
  }
  formPenetapan.value.nama_pasar = pasarBaru;
  formPenetapan.value.nama_komoditas = '';
  formPenetapan.value.harga = '';
  sinkronkanRuangKerjaPasarMobile(pasarBaru, tanggalPengambilanMobile.value);
};

const gantiTanggalPengajuanMobile = (tanggalBaru: string, elInput?: HTMLInputElement) => {
  if (!tanggalBaru || tanggalBaru === tanggalPengambilanMobile.value) return;
  if (adaPerubahanBelumDisimpanMobile.value && keranjangPengajuanMobile.value.length > 0 && formPenetapan.value.nama_pasar) {
    const lanjut = confirm(
      `Ada ${keranjangPengajuanMobile.value.length} komoditas untuk "${formPenetapan.value.nama_pasar}" yang belum disimpan ke Draft.\n\nTekan OK untuk ganti tanggal, atau Batal lalu tekan 💾 Simpan terlebih dahulu.`
    );
    if (!lanjut) {
      if (elInput) elInput.value = tanggalPengambilanMobile.value;
      return;
    }
  }
  tanggalPengambilanMobile.value = tanggalBaru;
  if (formPenetapan.value.nama_pasar) {
    sinkronkanRuangKerjaPasarMobile(formPenetapan.value.nama_pasar, tanggalBaru);
  }
};

const mulaiPengajuanBaruKosongMobile = () => {
  dokumenPengajuanDieditMobile.value = null;
  keranjangPengajuanMobile.value = [];
  adaPerubahanBelumDisimpanMobile.value = false;
  cariKeranjangStafMobile.value = '';
  tanggalPengambilanMobile.value = berandaStafMobileService.ambilTanggalHariIniISO();
  formPenetapan.value.nama_komoditas = '';
  formPenetapan.value.harga = '';
  formPenetapan.value.satuan = daftarSatuan.value[0] || '1 KG';
  subTabPengajuanStafMobile.value = 'baru';
};

const muatSemuaHargaPasarKeKeranjangMobile = () => {
  if (!formPenetapan.value.nama_pasar) {
    alert('Pilih Pasar terlebih dahulu!');
    return;
  }
  const paketAktif =
    dokumenPengajuanDieditMobile.value?.id &&
    (dokumenPengajuanDieditMobile.value.status === 'Draft' || dokumenPengajuanDieditMobile.value.status === 'Diajukan')
      ? daftarPengajuanHargaMobile.value.find((p) => p.id === dokumenPengajuanDieditMobile.value?.id) || null
      : (pengajuanAktifPasarIniMobile.value || draftAktifPasarIniMobile.value || null);
  const daftar = pengajuanHargaMobileService.bangunDaftarInputCepatPasar(
    formPenetapan.value.nama_pasar,
    daftarMasterKomoditas.value,
    semuaKomoditas.value,
    paketAktif
  );
  keranjangPengajuanMobile.value = daftar;
  adaPerubahanBelumDisimpanMobile.value = true;
  cariKeranjangStafMobile.value = '';
  pesanSuksesMobile.value = `⚡ ${daftar.length} komoditas pasar dimuat ke Daftar Harga Pangan.`;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 3000);
};

const saringHanyaBerubahKeranjangMobile = () => {
  const tersaring = keranjangPengajuanMobile.value.filter((row) => cekBarisBerubahMobile(row));
  if (tersaring.length === 0) {
    alert('Belum ada komoditas yang harganya diubah atau baru diisi.');
    return;
  }
  keranjangPengajuanMobile.value = tersaring;
  adaPerubahanBelumDisimpanMobile.value = true;
  pesanSuksesMobile.value = `✂️ Daftar diringkas menjadi ${tersaring.length} komoditas yang berubah / baru.`;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 3000);
};

const kosongkanKeranjangMobile = () => {
  if (!confirm('Kosongkan seluruh isi Daftar Harga Pangan di keranjang ini?')) return;
  keranjangPengajuanMobile.value = [];
  adaPerubahanBelumDisimpanMobile.value = true;
};

const bukaDokumenUntukUbahMobile = (pengajuan: DokumenPengajuanHarga, modeSalin = false) => {
  if (!pengajuan) return;
  const isDisetujui = pengajuan.status === 'Diverifikasi';
  if (isDisetujui && !modeSalin) {
    detailPengajuanBatchMobile.value = pengajuan;
    return;
  }

  formPenetapan.value.nama_pasar = pengajuan.nama_pasar;
  formPenetapan.value.nama_komoditas = '';
  formPenetapan.value.harga = '';
  tanggalPengambilanMobile.value = modeSalin
    ? berandaStafMobileService.ambilTanggalHariIniISO()
    : (pengajuan.tanggal_pengambilan || berandaStafMobileService.ambilTanggalHariIniISO());
  const itemsKeranjang = pengajuanHargaMobileService.bangunKeranjangDariDokumen(pengajuan, semuaKomoditas.value);
  keranjangPengajuanMobile.value = itemsKeranjang;
  adaPerubahanBelumDisimpanMobile.value = modeSalin || pengajuan.status === 'Ditolak';
  cariKeranjangStafMobile.value = '';

  if (modeSalin || pengajuan.status === 'Ditolak' || isDisetujui) {
    dokumenPengajuanDieditMobile.value =
      pengajuan.status === 'Ditolak'
        ? {
            id: null,
            status: 'Revisi',
            nama_pasar: pengajuan.nama_pasar,
            tanggal_pengambilan: pengajuan.tanggal_pengambilan,
            catatan_verifikasi: pengajuan.catatan_verifikasi
          }
        : null;
  } else {
    dokumenPengajuanDieditMobile.value = {
      id: pengajuan.id,
      status: pengajuan.status,
      nama_pasar: pengajuan.nama_pasar,
      tanggal_pengambilan: pengajuan.tanggal_pengambilan,
      catatan_verifikasi: pengajuan.catatan_verifikasi
    };
  }

  detailPengajuanBatchMobile.value = null;
  menuPetugas.value = 'input-harga';
  subTabPengajuanStafMobile.value = 'baru';
  pesanSuksesMobile.value = modeSalin
    ? `📋 ${itemsKeranjang.length} komoditas disalin ke Pengajuan Baru.`
    : pengajuan.status === 'Ditolak'
      ? `🔄 Pengajuan "${pengajuan.nama_pasar}" dimuat untuk revisi.`
      : `✏️ Dokumen ${pengajuanHargaMobileService.formatLabelStatus(pengajuan.status)} "${pengajuan.nama_pasar}" dimuat.`;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 3500);
};

const batalkanPengajuanBatchMobile = async (pengajuan: DokumenPengajuanHarga) => {
  if (!pengajuan || (pengajuan.status !== 'Diajukan' && pengajuan.status !== 'Draft')) return;
  const isDraft = pengajuan.status === 'Draft';
  const pesanTanya = isDraft
    ? `Hapus Draft pengajuan harga untuk "${pengajuan.nama_pasar}" (${pengajuan.tanggal_tampil})?`
    : `Batalkan pengajuan harga untuk "${pengajuan.nama_pasar}" (${pengajuan.tanggal_tampil})?`;
  if (!confirm(pesanTanya)) return;

  sedangAjukanBatchMobile.value = true;
  try {
    await pengajuanHargaMobileService.hapusPengajuanBatch(pengajuan.id);
    if (dokumenPengajuanDieditMobile.value?.id === pengajuan.id) {
      dokumenPengajuanDieditMobile.value = null;
      keranjangPengajuanMobile.value = [];
    }
    detailPengajuanBatchMobile.value = null;
    pesanSuksesMobile.value = isDraft
      ? `🗑️ Draft "${pengajuan.nama_pasar}" berhasil dihapus.`
      : `🗑️ Pengajuan "${pengajuan.nama_pasar}" (${pengajuan.tanggal_tampil}) berhasil dibatalkan.`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 3500);
    await muatData();
    await muatStatsDashboard();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    alert('Gagal menghapus/membatalkan pengajuan: ' + (err?.message || 'Terjadi kesalahan'));
  } finally {
    sedangAjukanBatchMobile.value = false;
  }
};

const periodeBerandaKabidMobile = ref<PeriodeLaporanKabid>('tahun_ini');
const subTabLaporanKabidMobile = ref<'harga' | 'gpm'>('harga');
const subTabVerifKabidMobile = ref<'antrean' | 'input' | 'terbit'>('antrean');
const cariVerifMobile = ref('');
const filterPasarVerifMobile = ref('Semua');
const formInputKabidMobile = ref({
  nama_pasar: '',
  nama_komoditas: '',
  kategori: 'Bahan Pokok',
  satuan: '1 KG',
  harga: '',
  prioritas_tampil: 50
});
const tanggalInputKabidMobile = ref(berandaStafMobileService.ambilTanggalHariIniISO());
const jenisInputKabidMobile = ref('Semua');
const keranjangInputKabidMobile = ref<BarisInputCepatPasar[]>([]);

const daftarJenisKabidMobile = computed<string[]>(() =>
  pengajuanHargaMobileService.ambilDaftarJenisKomoditas(daftarMasterKomoditas.value, semuaKomoditas.value)
);

const grupKomoditasKabidMobile = computed(() =>
  grupKomoditasDropdownMobile.value
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (k) =>
          jenisInputKabidMobile.value === 'Semua' ||
          String(k.kategori || '').toLowerCase() === jenisInputKabidMobile.value.toLowerCase()
      )
    }))
    .filter((g) => g.items.length > 0)
);

const hargaPatokanKabidMobile = computed(() =>
  formInputKabidMobile.value.nama_komoditas && formInputKabidMobile.value.nama_pasar
    ? pengajuanHargaMobileService.cariHargaTerbitPasar(
        formInputKabidMobile.value.nama_pasar,
        formInputKabidMobile.value.nama_komoditas,
        semuaKomoditas.value
      )
    : null
);

const itemValidKabidMobile = computed(() =>
  keranjangInputKabidMobile.value.filter(
    (r) => (parseInt(String(r.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0) > 0
  )
);

const komoditasTerbitTersaringMobile = computed(() => {
  const kata = cariVerifMobile.value.trim().toLowerCase();
  return komoditasTerbit.value.filter((k) => {
    if (filterPasarVerifMobile.value !== 'Semua' && k.nama_pasar !== filterPasarVerifMobile.value) return false;
    if (kata && !`${k.nama_komoditas || ''} ${k.nama_pasar || ''} ${k.kategori || ''}`.toLowerCase().includes(kata)) {
      return false;
    }
    return true;
  });
});

const bukaTabInputLangsungKabidMobile = () => {
  if (!formInputKabidMobile.value.nama_pasar && daftarPasar.value[0]) {
    formInputKabidMobile.value.nama_pasar = daftarPasar.value[0];
  }
  subTabVerifKabidMobile.value = 'input';
  menuPetugas.value = 'verif-harga';
};

const pilihKomoditasInputKabidMobile = (namaKom: string) => {
  const master = daftarMasterKomoditas.value.find(
    (k) => k.nama_komoditas.toLowerCase() === String(namaKom || '').toLowerCase()
  );
  if (master) {
    formInputKabidMobile.value.nama_komoditas = master.nama_komoditas;
    formInputKabidMobile.value.kategori = master.kategori || 'Bahan Pokok';
    formInputKabidMobile.value.satuan = formatSatuanTampil(master.satuan_bawaan) || daftarSatuan.value[0] || '1 KG';
    formInputKabidMobile.value.prioritas_tampil = Number(master.prioritas_tampil) || 50;
    if (master.kategori) jenisInputKabidMobile.value = master.kategori;
  } else {
    formInputKabidMobile.value.nama_komoditas = namaKom;
  }
};

const tambahItemKeranjangKabidMobile = () => {
  const pasarDipilih = formInputKabidMobile.value.nama_pasar || daftarPasar.value[0] || '';
  if (!pasarDipilih) {
    alert('Pilih Pasar terlebih dahulu!');
    return;
  }
  if (!formInputKabidMobile.value.nama_komoditas.trim()) {
    alert('Pilih Nama Komoditas terlebih dahulu!');
    return;
  }
  const hargaAngka = parseInt(String(formInputKabidMobile.value.harga).replace(/[^0-9]/g, ''), 10);
  if (!hargaAngka || hargaAngka <= 0) {
    alert('Masukkan nominal Harga Pangan (Rp) yang valid (> 0)!');
    return;
  }
  const namaTrim = formInputKabidMobile.value.nama_komoditas.trim();
  const kunci = namaTrim.toLowerCase();
  const satuanGabungan = formatSatuanTampil(formInputKabidMobile.value.satuan || daftarSatuan.value[0] || '1 KG');
  const masterCocok = daftarMasterKomoditas.value.find((k) => k.nama_komoditas.toLowerCase() === kunci);
  const hargaTerbit = pengajuanHargaMobileService.cariHargaTerbitPasar(pasarDipilih, namaTrim, semuaKomoditas.value);
  const kategoriItem =
    (jenisInputKabidMobile.value !== 'Semua' ? jenisInputKabidMobile.value : '') ||
    masterCocok?.kategori ||
    formInputKabidMobile.value.kategori ||
    hargaTerbit?.kategori ||
    'Bahan Pokok';

  formInputKabidMobile.value.nama_pasar = pasarDipilih;
  const idxAda = keranjangInputKabidMobile.value.findIndex((r) => r.nama_komoditas.toLowerCase() === kunci);
  if (idxAda >= 0) {
    keranjangInputKabidMobile.value[idxAda] = {
      ...keranjangInputKabidMobile.value[idxAda],
      kategori: kategoriItem,
      satuan: satuanGabungan,
      harga_usulan: String(hargaAngka)
    };
  } else {
    keranjangInputKabidMobile.value.unshift({
      tempId: `kabid-${kunci}-${Date.now()}`,
      komoditas_id: masterCocok?.id || null,
      nama_komoditas: namaTrim,
      kelompok_komoditas: masterCocok?.kelompok_komoditas || '',
      kategori: kategoriItem,
      satuan: satuanGabungan,
      prioritas_tampil: Number(masterCocok?.prioritas_tampil || formInputKabidMobile.value.prioritas_tampil) || 50,
      harga_lama: hargaTerbit ? Math.round(Number(hargaTerbit.harga) || 0) : null,
      tanggal_terakhir: hargaTerbit?.tanggal_penetapan || '-',
      harga_usulan: String(hargaAngka)
    });
  }
  formInputKabidMobile.value.nama_komoditas = '';
  formInputKabidMobile.value.harga = '';
  pesanSuksesMobile.value = `✅ "${namaTrim}" ditambahkan ke daftar siap terbit.`;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 3000);
};

const muatHargaPasarKabidMobile = () => {
  const pasarDipilih = formInputKabidMobile.value.nama_pasar || daftarPasar.value[0] || '';
  if (!pasarDipilih) {
    alert('Pilih Pasar terlebih dahulu!');
    return;
  }
  formInputKabidMobile.value.nama_pasar = pasarDipilih;
  keranjangInputKabidMobile.value = pengajuanHargaMobileService.bangunDaftarInputCepatPasar(
    pasarDipilih,
    daftarMasterKomoditas.value,
    semuaKomoditas.value,
    null
  );
  pesanSuksesMobile.value = `⚡ ${keranjangInputKabidMobile.value.length} komoditas di ${pasarDipilih} dimuat.`;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 3000);
};

const terbitkanLangsungKabidMobile = async () => {
  const pasarDipilih = formInputKabidMobile.value.nama_pasar || daftarPasar.value[0] || '';
  const items = itemValidKabidMobile.value;
  if (!pasarDipilih || items.length === 0) {
    alert('Pilih pasar dan tambahkan minimal 1 komoditas (harga > 0) terlebih dahulu!');
    return;
  }
  if (!confirm(`Terbitkan langsung ${items.length} harga untuk ${pasarDipilih} ke halaman publik?`)) return;

  sedangAjukanBatchMobile.value = true;
  try {
    const pasarObj = daftarPasarLengkap.value.find(
      (p) => String(p.nama_pasar || '').toLowerCase() === pasarDipilih.toLowerCase()
    );
    const hasil = await pengajuanHargaMobileService.terbitkanLangsungOlehKabid({
      namaPasar: pasarDipilih,
      pasarId: pasarObj?.id || null,
      tanggalPengambilan: tanggalInputKabidMobile.value,
      petugasId: userAktif.value?.id || null,
      namaPetugas: userAktif.value?.nama || 'Kepala Bidang',
      items,
      daftarHargaAktif: semuaKomoditas.value
    });
    keranjangInputKabidMobile.value = [];
    subTabVerifKabidMobile.value = 'terbit';
    pesanSuksesMobile.value = `✅ ${hasil.jumlahItem} komoditas untuk ${hasil.namaPasar} berhasil diterbitkan langsung!`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4000);
    await muatData();
    await muatStatsDashboard();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    alert('Gagal menerbitkan langsung: ' + (err?.message || 'Terjadi kesalahan'));
  } finally {
    sedangAjukanBatchMobile.value = false;
  }
};
const filterLaporanHargaMobile = ref({
  pasar: 'Semua',
  kategori: 'Semua',
  status: 'Terbit',
  pencarian: ''
});
const filterLaporanGPMKabidMobile = ref<{
  periode: PeriodeLaporanKabid;
  kecamatan: string;
  status: string;
}>({
  periode: 'tahun_ini',
  kecamatan: 'Semua',
  status: 'Semua'
});

const ringkasanBerandaKabidMobile = computed(() =>
  berandaKabidMobileService.hitungRingkasanKabid({
    daftarPasarLengkap: daftarPasarLengkap.value,
    daftarHarga: semuaKomoditas.value,
    daftarMasterKomoditas: daftarMasterKomoditas.value,
    daftarPengajuan: daftarPengajuanHargaMobile.value,
    daftarAcaraGPM: semuaAcaraGPM.value,
    periode: periodeBerandaKabidMobile.value
  })
);

const daftarKeputusanVerifMobile = computed(() =>
  daftarPengajuanHargaMobile.value.filter(
    (p) => p && (p.status === 'Diverifikasi' || p.status === 'Ditolak')
  )
);

const daftarPasarLaporanHargaMobile = computed<string[]>(() =>
  Array.from(new Set(semuaKomoditas.value.map((h) => h.nama_pasar).filter(Boolean))).sort()
);

const daftarKategoriLaporanHargaMobile = computed<string[]>(() =>
  Array.from(new Set(semuaKomoditas.value.map((h) => h.kategori).filter(Boolean))).sort()
);

const daftarLaporanHargaTerfilterMobile = computed(() => {
  const f = filterLaporanHargaMobile.value;
  const kata = f.pencarian.trim().toLowerCase();
  return semuaKomoditas.value.filter((h) => {
    if (f.pasar !== 'Semua' && h.nama_pasar !== f.pasar) return false;
    if (f.kategori !== 'Semua' && h.kategori !== f.kategori) return false;
    if (f.status !== 'Semua' && (h.status || 'Terbit') !== f.status) return false;
    if (kata && !`${h.nama_komoditas || ''} ${h.nama_pasar || ''} ${h.kategori || ''}`.toLowerCase().includes(kata)) {
      return false;
    }
    return true;
  });
});

const rataHargaLaporanMobile = computed(() => {
  const valid = daftarLaporanHargaTerfilterMobile.value.map((h) => Number(h.harga) || 0).filter((v) => v > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
});

const daftarRekapGPMKabidMobile = computed(() =>
  semuaAcaraGPM.value.map((a) => {
    const st = jadwalGPMMobileService.hitungStatusOperasional(a, waktuSekarangGPMMs.value);
    return {
      id: String(a.id),
      nama_acara: a.nama_acara,
      lokasi: a.lokasi,
      kecamatan: a.kecamatan || '-',
      tanggal: a.tanggal,
      jam_mulai: a.jam_mulai,
      jam_selesai: a.jam_selesai,
      target_kuota: st.kuotaMaks,
      terdaftar: st.terisi,
      terlayani: st.totalHadir,
      status: st.sudahBerakhir ? 'Selesai' : 'Aktif',
      komoditas_tersedia: a.komoditas_tersedia || '-'
    };
  })
);

const daftarKecamatanLaporanGPMMobile = computed<string[]>(() =>
  Array.from(new Set(daftarRekapGPMKabidMobile.value.map((g) => g.kecamatan).filter(Boolean))).sort()
);

const daftarLaporanGPMTerfilterMobile = computed(() => {
  const f = filterLaporanGPMKabidMobile.value;
  return daftarRekapGPMKabidMobile.value.filter((g) => {
    if (!berandaKabidMobileService.apakahAcaraMasukPeriode(g, f.periode)) return false;
    if (f.kecamatan !== 'Semua' && g.kecamatan !== f.kecamatan) return false;
    if (f.status !== 'Semua' && String(g.status || '').toLowerCase() !== f.status.toLowerCase()) return false;
    return true;
  });
});

const ringkasanLaporanGPMMobile = computed(() => {
  const list = daftarLaporanGPMTerfilterMobile.value;
  const totalTitik = list.length;
  const totalKuota = list.reduce((acc, g) => acc + (Number(g.target_kuota) || 0), 0);
  const totalTerdaftar = list.reduce((acc, g) => acc + (Number(g.terdaftar) || 0), 0);
  const totalHadir = list.reduce((acc, g) => acc + (Number(g.terlayani) || 0), 0);
  const persenSerapan = totalKuota > 0 ? Math.min(100, Math.round((totalHadir / totalKuota) * 100)) : 0;
  return { totalTitik, totalKuota, totalTerdaftar, totalHadir, persenSerapan };
});

const ringkasanBerandaStafMobile = computed(() =>
  berandaStafMobileService.hitungRingkasanOperasional({
    daftarPasarLengkap: daftarPasarLengkap.value,
    daftarHarga: semuaKomoditas.value,
    daftarMasterKomoditas: daftarMasterKomoditas.value,
    daftarPengajuan: daftarPengajuanHargaMobile.value,
    daftarAcaraGPM: semuaAcaraGPM.value
  })
);

const daftarPengajuanDiajukanMobile = computed(() =>
  daftarPengajuanHargaMobile.value.filter((p) => p && p.status === 'Diajukan')
);

const daftarPengajuanTerfilterMobile = computed(() => {
  if (filterStatusPengajuanStafMobile.value === 'semua') return daftarPengajuanHargaMobile.value;
  return daftarPengajuanHargaMobile.value.filter(
    (p) => String(p.status || '').toLowerCase() === filterStatusPengajuanStafMobile.value.toLowerCase()
  );
});

const hargaAktifPasarDipilihMobile = computed(() =>
  semuaKomoditas.value.filter(
    (h) =>
      String(h.nama_pasar || '').toLowerCase() === String(formPenetapan.value.nama_pasar || '').toLowerCase() &&
      String(h.status || '').toLowerCase() === 'terbit'
  )
);

const cekBarisBerubahMobile = (row: BarisInputCepatPasar): boolean => {
  const angka = parseInt(String(row.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0;
  return angka > 0 && (row.harga_lama === null || angka !== Number(row.harga_lama));
};

const hitungBadgeSelisihMobile = (row: BarisInputCepatPasar): { teks: string; kelas: string } => {
  const angka = parseInt(String(row.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0;
  if (angka <= 0) return { teks: '—', kelas: 'is-idle' };
  if (row.harga_lama === null) return { teks: '✨ Baru', kelas: 'is-new' };
  const diff = angka - Number(row.harga_lama);
  if (diff > 0) return { teks: `▲ +${formatRupiah(diff)}`, kelas: 'is-up' };
  if (diff < 0) return { teks: `▼ -${formatRupiah(Math.abs(diff))}`, kelas: 'is-down' };
  return { teks: 'Tetap', kelas: 'is-same' };
};

const ringkasanKeranjangMobile = computed(() => {
  const valid: (BarisInputCepatPasar & { hargaAngka: number })[] = [];
  const berubah: (BarisInputCepatPasar & { hargaAngka: number })[] = [];
  keranjangPengajuanMobile.value.forEach((r) => {
    const angka = parseInt(String(r.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0;
    if (angka > 0) {
      valid.push({ ...r, hargaAngka: angka });
      if (r.harga_lama === null || angka !== Number(r.harga_lama)) {
        berubah.push({ ...r, hargaAngka: angka });
      }
    }
  });
  return { valid, berubah };
});

const keranjangTerfilterMobile = computed(() => {
  const q = cariKeranjangStafMobile.value.trim().toLowerCase();
  if (!q) return keranjangPengajuanMobile.value;
  return keranjangPengajuanMobile.value.filter((row) =>
    `${row.nama_komoditas} ${row.kategori} ${row.satuan}`.toLowerCase().includes(q)
  );
});

const ubahHargaItemKeranjangMobile = (tempId: string, nilaiMentah: string) => {
  const bersih = String(nilaiMentah || '').replace(/[^0-9]/g, '');
  keranjangPengajuanMobile.value = keranjangPengajuanMobile.value.map((r) =>
    r.tempId === tempId ? { ...r, harga_usulan: bersih } : r
  );
  adaPerubahanBelumDisimpanMobile.value = true;
};

const hapusItemKeranjangMobile = (tempId: string) => {
  keranjangPengajuanMobile.value = keranjangPengajuanMobile.value.filter((r) => r.tempId !== tempId);
  adaPerubahanBelumDisimpanMobile.value = true;
};

const bukaInputCepatPasarMobile = (namaPasar: string) => {
  if (namaPasar) {
    const hariIni = berandaStafMobileService.ambilTanggalHariIniISO();
    const pasarKey = namaPasar.trim().toLowerCase();
    const ditolak = daftarPengajuanHargaMobile.value.find(
      (p) => p.status === 'Ditolak' && String(p.nama_pasar || '').trim().toLowerCase() === pasarKey
    );
    const diajukan = pengajuanHargaMobileService.cariPengajuanAktifPasar(daftarPengajuanHargaMobile.value, namaPasar, hariIni, 'Diajukan');
    const draft = pengajuanHargaMobileService.cariPengajuanAktifPasar(daftarPengajuanHargaMobile.value, namaPasar, hariIni, 'Draft');

    if (ditolak && !diajukan) {
      bukaDokumenUntukUbahMobile(ditolak);
      return;
    }
    if (draft) {
      bukaDokumenUntukUbahMobile(draft);
      return;
    }
    if (diajukan) {
      bukaDokumenUntukUbahMobile(diajukan);
      return;
    }

    formPenetapan.value.nama_pasar = namaPasar;
    formPenetapan.value.nama_komoditas = '';
    formPenetapan.value.harga = '';
    tanggalPengambilanMobile.value = hariIni;
    dokumenPengajuanDieditMobile.value = null;
    keranjangPengajuanMobile.value = [];
  }
  menuPetugas.value = 'input-harga';
  subTabPengajuanStafMobile.value = 'baru';
};

const tambahItemKeKeranjangMobile = () => {
  if (!formPenetapan.value.nama_pasar) {
    alert('Pilih pasar terlebih dahulu!');
    return;
  }
  const namaTrim = formPenetapan.value.nama_komoditas.trim();
  const hargaAngka = parseInt(String(formPenetapan.value.harga).replace(/[^0-9]/g, ''), 10);
  if (!namaTrim || !hargaAngka || hargaAngka <= 0) {
    alert('Pilih Nama Komoditas dan masukkan Harga Pangan > 0!');
    return;
  }
  const kunci = namaTrim.toLowerCase();
  const satuanGabungan = formatSatuanTampil(formPenetapan.value.satuan || daftarSatuan.value[0] || '1 KG');
  const masterCocok = daftarMasterKomoditas.value.find((k) => k.nama_komoditas.toLowerCase() === kunci);
  const hargaTerbit = pengajuanHargaMobileService.cariHargaTerbitPasar(
    formPenetapan.value.nama_pasar,
    namaTrim,
    semuaKomoditas.value
  );
  const kategoriItem =
    (jenisKomoditasTerpilihMobile.value !== 'Semua' ? jenisKomoditasTerpilihMobile.value : '') ||
    masterCocok?.kategori ||
    formPenetapan.value.kategori ||
    hargaTerbit?.kategori ||
    'Bahan Pokok';

  const ada = keranjangPengajuanMobile.value.some((r) => r.nama_komoditas.toLowerCase() === kunci);
  if (ada) {
    keranjangPengajuanMobile.value = keranjangPengajuanMobile.value.map((r) =>
      r.nama_komoditas.toLowerCase() === kunci
        ? { ...r, kategori: kategoriItem, satuan: satuanGabungan, harga_usulan: String(hargaAngka) }
        : r
    );
  } else {
    keranjangPengajuanMobile.value = [
      {
        tempId: `cart-${kunci}-${Date.now()}`,
        komoditas_id: masterCocok?.id || null,
        nama_komoditas: namaTrim,
        kelompok_komoditas: masterCocok?.kelompok_komoditas || '',
        kategori: kategoriItem,
        satuan: satuanGabungan,
        prioritas_tampil: Number(masterCocok?.prioritas_tampil || formPenetapan.value.prioritas_tampil) || 50,
        harga_lama: hargaTerbit ? Math.round(Number(hargaTerbit.harga) || 0) : null,
        tanggal_terakhir: hargaTerbit?.tanggal_penetapan || '-',
        harga_usulan: String(hargaAngka),
        sedang_diajukan: false
      },
      ...keranjangPengajuanMobile.value
    ];
  }
  adaPerubahanBelumDisimpanMobile.value = true;
  formPenetapan.value.nama_komoditas = '';
  formPenetapan.value.harga = '';
  pesanSuksesMobile.value = `✅ "${namaTrim}" (${formatRupiah(hargaAngka)}) ditambahkan ke Daftar Harga Pangan.`;
  setTimeout(() => { pesanSuksesMobile.value = ''; }, 2500);
};

const simpanAtauAjukanPengajuanMobile = async (statusTarget: 'Draft' | 'Diajukan' = 'Diajukan') => {
  if (!formPenetapan.value.nama_pasar || !tanggalPengambilanMobile.value) {
    alert('Pasar dan tanggal pengajuan wajib diisi!');
    return;
  }
  const daftarKirim = ringkasanKeranjangMobile.value.valid;
  if (daftarKirim.length === 0) {
    alert(
      statusTarget === 'Draft'
        ? 'Tambahkan minimal 1 komoditas ke Daftar Harga Pangan sebelum menyimpan Draft!'
        : 'Tambahkan minimal 1 komoditas ke Daftar Harga Pangan sebelum mengajukan ke Kepala Bidang!'
    );
    return;
  }

  const pasarObj = daftarPasarLengkap.value.find(
    (p) => (p.nama_pasar || '').toLowerCase() === formPenetapan.value.nama_pasar.toLowerCase()
  );
  const idEdit =
    dokumenPengajuanDieditMobile.value?.id &&
    (dokumenPengajuanDieditMobile.value.status === 'Draft' || dokumenPengajuanDieditMobile.value.status === 'Diajukan')
      ? dokumenPengajuanDieditMobile.value.id
      : null;

  sedangAjukanBatchMobile.value = true;
  try {
    const payload = {
      namaPasar: formPenetapan.value.nama_pasar,
      pasarId: pasarObj?.id || null,
      tanggalPengambilan: tanggalPengambilanMobile.value,
      petugasId: userAktif.value?.id || null,
      namaPetugas: userAktif.value?.nama || userAktif.value?.username || 'Staf Lapangan',
      items: daftarKirim.map((it) => ({
        komoditas_id: it.komoditas_id,
        nama_komoditas: it.nama_komoditas,
        kategori: it.kategori,
        satuan: it.satuan,
        harga: it.hargaAngka,
        harga_lama: it.harga_lama,
        prioritas_tampil: it.prioritas_tampil
      })),
      daftarHargaAktif: semuaKomoditas.value,
      daftarPengajuanAktif: daftarPengajuanHargaMobile.value,
      pengajuanIdDiedit: idEdit
    };

    const hasil =
      statusTarget === 'Draft'
        ? await pengajuanHargaMobileService.simpanDraftBatchHarga(payload)
        : await pengajuanHargaMobileService.ajukanBatchHarga(payload);

    if (statusTarget === 'Draft') {
      dokumenPengajuanDieditMobile.value = {
        id: hasil.id,
        status: 'Draft',
        nama_pasar: formPenetapan.value.nama_pasar,
        tanggal_pengambilan: tanggalPengambilanMobile.value
      };
      adaPerubahanBelumDisimpanMobile.value = false;
      pesanSuksesMobile.value = hasil.ditimpa
        ? `💾 Draft "${hasil.namaPasar}" diperbarui (${hasil.jumlahItem} komoditas). Aman pindah ke pasar lain untuk Draft terpisah.`
        : `💾 Draft "${hasil.namaPasar}" tersimpan (${hasil.jumlahItem} komoditas). Aman pindah ke pasar lain!`;
    } else {
      dokumenPengajuanDieditMobile.value = null;
      keranjangPengajuanMobile.value = [];
      adaPerubahanBelumDisimpanMobile.value = false;
      subTabPengajuanStafMobile.value = 'daftar';
      pesanSuksesMobile.value = hasil.ditimpa
        ? `🔄 Paket "${hasil.namaPasar}" (${hasil.tanggalTampil}) berhasil diperbarui/ditimpa (${hasil.jumlahItem} komoditas)!`
        : `✅ ${hasil.jumlahItem} komoditas untuk ${hasil.namaPasar} berhasil diajukan ke Kepala Bidang!`;
    }
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4500);
    await muatData();
    await muatStatsDashboard();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    alert('Gagal memproses pengajuan harga: ' + (err?.message || 'Terjadi kesalahan'));
  } finally {
    sedangAjukanBatchMobile.value = false;
  }
};

const setujuiPengajuanBatchMobile = async (pengajuan: DokumenPengajuanHarga) => {
  if (!confirm(`Setujui & terbitkan ${pengajuan.items?.length || 0} harga untuk ${pengajuan.nama_pasar}?`)) return;
  sedangAjukanBatchMobile.value = true;
  try {
    await pengajuanHargaMobileService.setujuiPengajuanBatch(pengajuan, semuaKomoditas.value);
    detailPengajuanBatchMobile.value = null;
    pesanSuksesMobile.value = `✅ Paket ${pengajuan.nama_pasar} resmi diverifikasi dan terbit ke publik!`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4000);
    await muatData();
    await muatStatsDashboard();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    alert('Gagal menyetujui pengajuan: ' + (err?.message || 'Terjadi kesalahan'));
  } finally {
    sedangAjukanBatchMobile.value = false;
  }
};

const setujuiSemuaAntreanMobile = async () => {
  const jmlPaket = daftarPengajuanDiajukanMobile.value.length;
  if (jmlPaket === 0) return;
  if (!confirm(`Setujui & terbitkan seluruh ${jmlPaket} paket pengajuan pasar sekaligus?`)) return;
  sedangAjukanBatchMobile.value = true;
  try {
    const hasil = await pengajuanHargaMobileService.setujuiSemuaAntrean({
      daftarPengajuanDiajukan: daftarPengajuanDiajukanMobile.value,
      daftarDraftSatuan: [],
      daftarHargaAktif: semuaKomoditas.value,
      catatanVerifikasi: `Disetujui massal oleh Kepala Bidang (${userAktif.value?.nama || 'Kabid'})`
    });
    pesanSuksesMobile.value = `✅ ${hasil.jumlahPaketDisetujui} paket pasar (${hasil.totalItemTerbit} komoditas) berhasil diterbitkan!`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4500);
    await muatData();
    await muatStatsDashboard();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    alert('Gagal menyetujui massal: ' + (err?.message || 'Terjadi kesalahan'));
  } finally {
    sedangAjukanBatchMobile.value = false;
  }
};

const eksekusiTolakBatchMobile = async () => {
  if (!modalTolakBatchMobile.value.pengajuan) return;
  sedangAjukanBatchMobile.value = true;
  try {
    await pengajuanHargaMobileService.tolakPengajuanBatch(
      modalTolakBatchMobile.value.pengajuan.id,
      modalTolakBatchMobile.value.catatan
    );
    pesanSuksesMobile.value = `ℹ️ Pengajuan ${modalTolakBatchMobile.value.pengajuan.nama_pasar} dikembalikan ke Staf dengan catatan revisi.`;
    setTimeout(() => { pesanSuksesMobile.value = ''; }, 4000);
    modalTolakBatchMobile.value = { buka: false, pengajuan: null, catatan: '' };
    await muatData();
    muatNotifikasiDinamisMobile();
  } catch (err: any) {
    alert('Gagal menolak pengajuan: ' + (err?.message || 'Terjadi kesalahan'));
  } finally {
    sedangAjukanBatchMobile.value = false;
  }
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
      await hargaPanganMobileService.perbarui(idDiedit.value, {
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
        ? (status === 'Terbit' ? `✅ Perubahan "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diterbitkan!` : `📝 Perubahan "${formPenetapan.value.nama_komoditas}" disimpan sebagai draf!`)
        : `📨 Perubahan "${formPenetapan.value.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan ke Kepala Bidang!`;
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
    if (statusBaru === 'Terbit') {
      await pengajuanHargaMobileService.setujuiDraftSatuanTanpaDuplikat(item, semuaKomoditas.value);
    } else {
      await hargaPanganMobileService.perbarui(item.id, { status: statusBaru });
    }
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
  const base =
    filterStatusVerif.value === 'Draft'
      ? komoditasDraft.value
      : filterStatusVerif.value === 'Terbit'
        ? komoditasTerbit.value
        : semuaKomoditas.value;
  const kata = cariVerifMobile.value.trim().toLowerCase();
  return base.filter((k) => {
    if (filterPasarVerifMobile.value !== 'Semua' && k.nama_pasar !== filterPasarVerifMobile.value) return false;
    if (kata && !`${k.nama_komoditas || ''} ${k.nama_pasar || ''} ${k.kategori || ''}`.toLowerCase().includes(kata)) {
      return false;
    }
    return true;
  });
});

const eksekusiVerifikasiHarga = async (id: string, statusBaru: 'Terbit' | 'Draft') => {
  try {
    const itemTarget = semuaKomoditas.value.find((k) => String(k.id) === String(id));
    if (statusBaru === 'Terbit' && itemTarget) {
      await pengajuanHargaMobileService.setujuiDraftSatuanTanpaDuplikat(itemTarget, semuaKomoditas.value);
    } else {
      await hargaPanganMobileService.verifikasiHarga(id, statusBaru);
    }
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
  laporanMobileService.eksporLaporanHargaExcel(daftarLaporanHargaTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kabid') },
    filter: { ...filterLaporanHargaMobile.value }
  });
};

const cetakLaporanPanganKabidMobile = () => {
  laporanMobileService.cetakLaporanHargaPDF(daftarLaporanHargaTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kabid') },
    filter: { ...filterLaporanHargaMobile.value }
  });
};

const unduhLaporanGPMKabidMobile = () => {
  laporanMobileService.eksporLaporanGPMExcel(daftarLaporanGPMTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kabid') },
    jabatanPenandatangan: 'Kepala Bidang Cadangan dan Distribusi Pangan',
    filter: {
      ...filterLaporanGPMKabidMobile.value,
      labelPeriode: berandaKabidMobileService.labelPeriode(filterLaporanGPMKabidMobile.value.periode)
    }
  });
};

const cetakLaporanGPMKabidMobile = () => {
  laporanMobileService.cetakLaporanGPMPDF(daftarLaporanGPMTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kabid') },
    jabatanPenandatangan: 'Kepala Bidang Cadangan dan Distribusi Pangan',
    filter: {
      ...filterLaporanGPMKabidMobile.value,
      labelPeriode: berandaKabidMobileService.labelPeriode(filterLaporanGPMKabidMobile.value.periode)
    }
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

const bukaModalUbahProfilUser = (user: AkunPengguna) => {
  targetUbahProfilUser.value = user;
  inputNamaProfilBaru.value = user.nama || '';
  inputBidangProfilBaru.value = user.bidang || 'Bidang Cadangan dan Distribusi Pangan';
  modalUbahProfilUserBuka.value = true;
};

const eksekusiUbahProfilUser = async () => {
  if (!targetUbahProfilUser.value) return;
  const namaBaru = inputNamaProfilBaru.value.trim();
  if (!namaBaru) {
    alert('Nama lengkap tidak boleh kosong!');
    return;
  }
  try {
    const hasil = await penggunaMobileService.adminUbahProfil(
      userAktif.value?.id || '',
      targetUbahProfilUser.value.id,
      { nama: namaBaru, bidang: inputBidangProfilBaru.value.trim() }
    );
    if (String(targetUbahProfilUser.value.id) === String(userAktif.value?.id) && userAktif.value) {
      userAktif.value = { ...userAktif.value, nama: hasil.nama, bidang: hasil.bidang };
    }
    modalUbahProfilUserBuka.value = false;
    await muatSemuaPengguna();
    alert(`✅ Profil "${hasil.nama}" berhasil diperbarui!`);
  } catch (e: any) {
    alert('Gagal mengubah profil: ' + e.message);
  }
};

const ringkasanBerandaAdminMobile = computed(() =>
  berandaAdminMobileService.hitungRingkasanSistem({
    daftarPengguna: daftarSemuaPengguna.value,
    daftarMasterKomoditas: daftarMasterKomoditas.value,
    daftarSatuan: daftarSatuan.value,
    daftarPasarLengkap: daftarPasarLengkap.value,
    daftarKecamatan: daftarKecamatan.value,
    daftarHarga: semuaKomoditas.value,
    daftarPengajuan: daftarPengajuanHargaMobile.value,
    daftarAcaraGPM: semuaAcaraGPM.value,
    waktuSekarangMs: waktuSekarangGPMMs.value
  })
);

const daftarPenggunaTerfilterMobile = computed(() => {
  const q = filterCariPenggunaMobile.value.trim().toLowerCase();
  return daftarSemuaPengguna.value.filter((u) => {
    if (filterPeranPenggunaMobile.value !== 'Semua' && u.peran !== filterPeranPenggunaMobile.value) return false;
    if (q && !`${u.nama || ''} ${u.username || ''} ${u.email || ''} ${u.bidang || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
});

const grupKomoditasTerfilterMobile = computed(() => {
  const q = cariMasterKomoditasMobile.value.trim().toLowerCase();
  if (!q) return grupKomoditasDropdownMobile.value;
  return grupKomoditasDropdownMobile.value
    .map((g) => ({
      ...g,
      items: g.items.filter((k) =>
        `${g.kelompok} ${k.nama_komoditas} ${k.kategori} ${k.kata_kunci || ''}`.toLowerCase().includes(q)
      )
    }))
    .filter((g) => g.items.length > 0);
});

const daftarCekGpmTerfilterMobile = computed(() => {
  const f = filterCekGpmMobile.value;
  const q = f.pencarian.trim().toLowerCase();
  return daftarRekapGPMKadisReaktif.value.filter((g) => {
    if (f.kecamatan !== 'Semua' && g.kecamatan !== f.kecamatan) return false;
    if (f.status !== 'Semua' && String(g.status || '').toLowerCase() !== f.status.toLowerCase()) return false;
    if (q && !`${g.nama_acara || ''} ${g.lokasi || ''} ${g.kecamatan || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
});

const ringkasanCekGpmMobile = computed(() => {
  const list = daftarCekGpmTerfilterMobile.value;
  const aktif = list.filter((g) => g.status === 'Aktif').length;
  const selesai = list.length - aktif;
  const kuota = list.reduce((acc, g) => acc + (Number(g.target_kuota) || 0), 0);
  const hadir = list.reduce((acc, g) => acc + (Number(g.terlayani) || 0), 0);
  const persen = kuota > 0 ? Math.min(100, Math.round((hadir / kuota) * 100)) : 0;
  return { aktif, selesai, kuota, hadir, persen };
});

const bukaModalUbahKuotaDariCekGpmMobile = (acaraId: string) => {
  const target = semuaAcaraGPM.value.find((a) => String(a.id) === String(acaraId));
  if (target) {
    bukaModalUbahKuotaMobile(target);
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

const mulaiEditMasterKomoditasMobile = (item: ItemMasterKomoditas) => {
  komoditasMasterDieditMobile.value = { id: item.id, nama_komoditas: item.nama_komoditas };
  modeIndukBaruMobile.value = false;
  formKomoditasMasterMobile.value = {
    kelompok_komoditas: item.kelompok_komoditas || '',
    nama_komoditas: item.nama_komoditas || '',
    kategori: item.kategori || 'Bahan Pokok',
    satuan_bawaan: item.satuan_bawaan || daftarSatuan.value[0] || '1 KG',
    kata_kunci: item.kata_kunci || '',
    prioritas_tampil: masterDataMobileService.normalisasiNilaiUrutanTampil(item.prioritas_tampil)
  };
  const el = document.getElementById('form-master-komoditas-mobile');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const batalEditMasterKomoditasMobile = () => {
  komoditasMasterDieditMobile.value = null;
  modeIndukBaruMobile.value = false;
  formKomoditasMasterMobile.value = {
    kelompok_komoditas: '',
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan_bawaan: daftarSatuan.value[0] || '1 KG',
    kata_kunci: '',
    prioritas_tampil: 50
  };
};

const tambahMasterKomoditasBaru = async () => {
  if (!formKomoditasMasterMobile.value.nama_komoditas.trim()) {
    alert('Nama varian komoditas wajib diisi!');
    return;
  }
  try {
    const namaTersimpan = formKomoditasMasterMobile.value.nama_komoditas.trim();
    if (komoditasMasterDieditMobile.value) {
      daftarMasterKomoditas.value = await masterDataMobileService.perbaruiKomoditas(
        komoditasMasterDieditMobile.value.id || komoditasMasterDieditMobile.value.nama_komoditas,
        formKomoditasMasterMobile.value,
        komoditasMasterDieditMobile.value.nama_komoditas
      );
      daftarIndukKomoditasMobile.value = await masterDataMobileService.ambilDaftarIndukKomoditas(daftarMasterKomoditas.value);
      batalEditMasterKomoditasMobile();
      await muatData(true);
      tampilkanPesanSuksesMobile(`✅ Master Komoditas "${namaTersimpan}" diperbarui & disinkronkan ke data harga!`);
    } else {
      daftarMasterKomoditas.value = await masterDataMobileService.tambahKomoditas(formKomoditasMasterMobile.value);
      daftarIndukKomoditasMobile.value = await masterDataMobileService.ambilDaftarIndukKomoditas(daftarMasterKomoditas.value);
      modeIndukBaruMobile.value = false;
      formKomoditasMasterMobile.value = {
        kelompok_komoditas: formKomoditasMasterMobile.value.kelompok_komoditas,
        nama_komoditas: '',
        kategori: formKomoditasMasterMobile.value.kategori,
        satuan_bawaan: formKomoditasMasterMobile.value.satuan_bawaan || daftarSatuan.value[0] || '1 KG',
        kata_kunci: '',
        prioritas_tampil: 50
      };
      tampilkanPesanSuksesMobile(`✅ Master Komoditas "${namaTersimpan}" berhasil disimpan ke Supabase!`);
    }
  } catch (e: any) {
    alert(e?.message || 'Gagal menyimpan master komoditas.');
  }
};

const hapusMasterKomoditas = async (nama: string) => {
  const jumlahTerkait = semuaKomoditas.value.filter(
    (h: any) => String(h.nama_komoditas || '').trim().toLowerCase() === String(nama || '').trim().toLowerCase()
  ).length;
  const pesan = jumlahTerkait > 0
    ? `⚠️ Perhatian: Komoditas "${nama}" masih memiliki ${jumlahTerkait} catatan harga pasar.\n\nMenghapus dari Master hanya menghapus dari daftar pilihan baru (arsip riwayat harga tetap aman). Lanjutkan?`
    : `Hapus komoditas "${nama}" dari Master Komoditas resmi?`;
  if (!confirm(pesan)) return;
  try {
    daftarMasterKomoditas.value = await masterDataMobileService.hapusKomoditas(nama);
    daftarIndukKomoditasMobile.value = await masterDataMobileService.ambilDaftarIndukKomoditas(daftarMasterKomoditas.value);
    if (komoditasMasterDieditMobile.value?.nama_komoditas === nama) {
      batalEditMasterKomoditasMobile();
    }
  } catch (e: any) {
    alert(e?.message || 'Gagal menghapus master komoditas.');
  }
};

const cetakPendaftarAcaraMobile = (acara: any) => {
  if (!acara) return;
  const targetPeran = peranAktif.value === 'Kabid' ? 'Kabid' : 'Kadis';
  laporanMobileService.cetakLaporanPendaftarGPMPDF(acara, pendaftarAcaraMobileTersaring.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile(targetPeran) },
    jabatanPenandatangan: targetPeran === 'Kabid'
      ? 'Kepala Bidang Cadangan dan Distribusi Pangan'
      : 'Kepala Dinas Pangan Kota Manado'
  });
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
  const pilihan = pilihanKomoditasKadisMobile.value;
  if (pilihan.semuaNamaValid.length > 0 && (!komoditasTren.value || !pilihan.semuaNamaValid.includes(komoditasTren.value))) {
    komoditasTren.value = pilihan.komoditasDefaultTerbaik;
  } else if (pilihan.semuaNamaValid.length === 0) {
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
    gpmMobileService.eksporKeExcel(acara, pendaftar, {
      nama: ambilNamaPenandatanganMobile(peranAktif.value === 'Kabid' ? 'Kabid' : 'Kadis')
    });
  } catch (err: any) {
    alert('Gagal mengunduh Excel: ' + (err?.message || 'Terjadi kesalahan'));
  }
};

const bukaGrafikKomoditasKadisMobile = (namaKomoditas: string) => {
  if (namaKomoditas) {
    komoditasTren.value = namaKomoditas;
  }
  pasarTren.value = 'Semua';
  menuPetugas.value = 'grafik-pangan';
  muatTrenKadis();
};

const unduhTrenHargaKadisMobile = () => {
  laporanMobileService.eksporTrenHargaExcel(dataTren.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kadis') },
    jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado'
  });
};

const cetakTrenHargaKadisMobile = () => {
  laporanMobileService.cetakTrenHargaPDF(dataTren.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kadis') },
    jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado'
  });
};

const unduhLaporanGPMKadisMobile = () => {
  laporanMobileService.eksporLaporanGPMExcel(daftarLaporanGPMKadisTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kadis') },
    jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
    filter: {
      ...filterLaporanGPMKadisMobile.value,
      labelPeriode: berandaKadisMobileService.labelPeriode(filterLaporanGPMKadisMobile.value.periode)
    }
  });
};

const cetakLaporanGPMKadisMobile = () => {
  laporanMobileService.cetakLaporanGPMPDF(daftarLaporanGPMKadisTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kadis') },
    jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
    filter: {
      ...filterLaporanGPMKadisMobile.value,
      labelPeriode: berandaKadisMobileService.labelPeriode(filterLaporanGPMKadisMobile.value.periode)
    }
  });
};

const unduhLaporanHargaKadisMobile = () => {
  laporanMobileService.eksporLaporanHargaExcel(daftarHargaTerbitKadisTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kadis') },
    jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
    filter: {
      ...filterLaporanHargaKadisMobile.value,
      status: 'Terbit'
    }
  });
};

const cetakLaporanHargaKadisMobile = () => {
  laporanMobileService.cetakLaporanHargaPDF(daftarHargaTerbitKadisTerfilterMobile.value, {
    penandatangan: { nama: ambilNamaPenandatanganMobile('Kadis') },
    jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
    filter: {
      ...filterLaporanHargaKadisMobile.value,
      status: 'Terbit'
    }
  });
};

const unduhLaporanEksekutifGPM = () => {
  unduhLaporanGPMKadisMobile();
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
    const batchCount = daftarPengajuanDiajukanMobile.value.length;
    if (batchCount > 0) {
      notifs.push({
        id: 'notif-kabid-draft',
        judul: '📝 Verifikasi Harga Pangan',
        pesan: `Terdapat ${batchCount} paket pengajuan pasar dari Staf menunggu verifikasi Anda.`,
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
    const terbitKadisCount = itemsHarga.filter((i: any) => (i.status || '').toLowerCase() === 'terbit').length;
    if (gpmSelesai.length > 0) {
      const satuanNotif = String(gpmSelesai[0].mode_penerima || 'individu').toLowerCase() === 'keluarga' ? 'KK' : 'warga';
      notifs.push({
        id: 'notif-kadis-gpm-selesai',
        judul: '📊 Laporan Pelaksanaan GPM',
        pesan: `Kegiatan "${gpmSelesai[0].nama_acara}" selesai dengan ${gpmSelesai[0].statusOperasional.totalHadir} ${satuanNotif} terlayani dari ${gpmSelesai[0].statusOperasional.terisi} pendaftar.`,
        waktu: 'Terkini',
        target: 'laporan-gpm'
      });
    }
    notifs.push({
      id: 'notif-kadis-tren',
      judul: '📈 Monitoring Harga Terbit',
      pesan: `${terbitKadisCount} harga komoditas terverifikasi aktif dipantau pada Grafik Pangan & Laporan Eksekutif.`,
      waktu: 'Terkini',
      target: 'grafik-pangan'
    });
  }

  if (isStaf.value) {
    const ditolakList = daftarPengajuanHargaMobile.value.filter((p) => p.status === 'Ditolak');
    if (ditolakList.length > 0) {
      notifs.push({
        id: 'notif-staf-ditolak',
        judul: '⚠️ Pengajuan Perlu Revisi',
        pesan: `${ditolakList.length} pengajuan (${ditolakList[0].nama_pasar}) ditolak Kepala Bidang. Ketuk untuk perbaiki.`,
        waktu: 'Perlu Tindakan',
        target: 'input-harga-daftar'
      });
    }
    const draftBatchCount = daftarPengajuanHargaMobile.value.filter((p) => p.status === 'Draft').length;
    if (draftBatchCount > 0) {
      notifs.push({
        id: 'notif-staf-draft',
        judul: '📝 Draft Pengajuan Tersimpan',
        pesan: `Anda memiliki ${draftBatchCount} Draft pengajuan harga belum dikirim ke Kepala Bidang.`,
        waktu: 'Draft',
        target: 'input-harga-daftar'
      });
    }
    const terbitCount = itemsHarga.filter((i: any) => (i.status || '').toLowerCase() === 'terbit').length;
    const batchMenunggu = daftarPengajuanDiajukanMobile.value.length;
    notifs.push({
      id: 'notif-staf-status',
      judul: '📢 Status Publikasi Komoditas',
      pesan: `${terbitCount} komoditas terbit.${batchMenunggu > 0 ? ` ${batchMenunggu} paket pengajuan menunggu verifikasi Kepala Bidang.` : ' Tidak ada pengajuan tertunda.'}`,
      waktu: 'Terkini',
      target: 'input-harga-daftar'
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
    if (target === 'input-harga-daftar') {
      subTabPengajuanStafMobile.value = 'daftar';
      menuPetugas.value = 'input-harga';
    } else {
      menuPetugas.value = target;
    }
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

/* ============================================================================
   BERANDA OPERASIONAL STAF, INPUT CEPAT PER PASAR & VERIFIKASI BATCH (MOBILE)
   ============================================================================ */
.m-staf-hero-box {
  background: linear-gradient(135deg, #8b1e1e 0%, #681313 100%);
  color: #ffffff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
}

.m-staf-date-chip {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18);
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.m-staf-hero-title {
  margin: 8px 0 4px 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.m-staf-hero-desc {
  margin: 0 0 12px 0;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

.m-staf-hero-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.m-staf-hero-btn {
  border: none;
  border-radius: 9px;
  padding: 10px 8px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.m-staf-hero-btn.primary {
  background: #ffffff;
  color: #8b1e1e;
}

.m-staf-hero-btn.secondary {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.m-staf-ops-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px;
  margin-top: 12px;
}

.m-staf-sec-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.m-staf-sec-head h3 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
}

.m-staf-sec-head small {
  color: #64748b;
  font-size: 0.74rem;
}

.m-staf-pct-pill {
  background: #dcfce7;
  color: #166534;
  font-weight: 800;
  font-size: 0.78rem;
  padding: 3px 9px;
  border-radius: 999px;
}

.m-staf-bar-track {
  height: 7px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 10px;
}

.m-staf-bar-fill {
  height: 100%;
  background: #16a34a;
  border-radius: 999px;
}

.m-staf-market-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.m-staf-market-card,
.m-staf-sub-card,
.m-verif-batch-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 11px 12px;
}

.m-staf-market-card {
  border-left: 4px solid #94a3b8;
}

.m-staf-market-card.st-revisi { border-left-color: #dc2626; background: #fff5f5; }
.m-staf-market-card.st-menunggu { border-left-color: #d97706; }
.m-staf-market-card.st-terbaru { border-left-color: #16a34a; }
.m-staf-market-card.st-perlu_update { border-left-color: #ea580c; }

.m-staf-mc-top,
.m-staf-sub-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
  font-size: 0.86rem;
  color: #0f172a;
}

.m-staf-status-tag,
.m-staf-batch-pill {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
}

.m-staf-status-tag.st-revisi,
.m-staf-batch-pill.st-ditolak { background: #fee2e2; color: #991b1b; }
.m-staf-status-tag.st-menunggu,
.m-staf-batch-pill.st-diajukan { background: #fef3c7; color: #92400e; }
.m-staf-status-tag.st-terbaru,
.m-staf-batch-pill.st-diverifikasi { background: #dcfce7; color: #166534; }
.m-staf-status-tag.st-perlu_update { background: #ffedd5; color: #9a3412; }
.m-staf-status-tag.st-kosong { background: #e2e8f0; color: #475569; }

.m-staf-mc-meta,
.m-staf-sub-meta {
  font-size: 0.74rem;
  color: #64748b;
  line-height: 1.35;
}

.m-staf-sub-note {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.74rem;
  background: #eef2ff;
  color: #3730a3;
}

.m-staf-sub-note.is-reject {
  background: #fee2e2;
  color: #991b1b;
}

.m-staf-mc-btn {
  margin-top: 8px;
  width: 100%;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.m-staf-mc-btn.is-urgent {
  background: #dc2626;
}

.m-staf-sub-btns {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.m-staf-mini-btn {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.m-staf-mini-btn.is-revisi {
  background: #dc2626;
  color: #ffffff;
  border-color: #dc2626;
}

/* Input Cepat Per Pasar Mobile */
.m-fast-header-grid {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 8px;
  margin-bottom: 10px;
}

.m-date-input,
.m-fast-search-input {
  width: 100%;
  padding: 9px 10px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.84rem;
  background: #ffffff;
  box-sizing: border-box;
}

.m-fast-search-wrap {
  margin-bottom: 8px;
}

.m-fast-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.m-fast-pill {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.m-fast-pill.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.m-fast-pill.is-add {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
  margin-left: auto;
}

.m-fast-single-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
}

.btn-m-add-fast-row {
  width: 100%;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}

.m-fast-rows-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 440px;
  overflow-y: auto;
  padding-right: 2px;
}

.m-fast-row-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  background: #ffffff;
}

.m-fast-row-card.is-edited {
  background: #fffbeb;
  border-color: #f59e0b;
}

.m-fast-row-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.m-fast-row-name {
  font-size: 0.86rem;
  color: #0f172a;
}

.m-fast-row-meta {
  font-size: 0.7rem;
  color: #64748b;
}

.m-fast-diff-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.m-fast-diff-badge.is-up { background: #fee2e2; color: #b91c1c; }
.m-fast-diff-badge.is-down { background: #dcfce7; color: #15803d; }
.m-fast-diff-badge.is-new { background: #dbeafe; color: #1d4ed8; }
.m-fast-diff-badge.is-same { background: #f1f5f9; color: #475569; }
.m-fast-diff-badge.is-idle { color: #94a3b8; }

.m-fast-row-bottom {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 8px;
  align-items: center;
}

.m-fast-old-lbl {
  display: block;
  font-size: 0.68rem;
  color: #64748b;
  margin-bottom: 2px;
}

.m-fast-old-col strong {
  font-size: 0.84rem;
  color: #334155;
}

.m-fast-num-input {
  width: 100%;
  padding: 7px 9px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 800;
  color: #8b1e1e;
  background: #ffffff;
  box-sizing: border-box;
}

.m-fast-submit-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1.5px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-fast-check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #1e293b;
  font-weight: 600;
}

.m-fast-safe-note {
  font-size: 0.72rem;
  color: #15803d;
  font-weight: 600;
}

.m-fast-submit-btns {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.m-fast-right-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.m-fast-rtab {
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.m-fast-rtab.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.m-verif-batch-card {
  border-color: #fecaca;
  background: #fffafa;
}

.m-verif-batch-preview {
  margin-top: 8px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 8px 10px;
}

.m-vbp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  padding: 3px 0;
}

@media (max-width: 400px) {
  .m-fast-header-grid {
    grid-template-columns: 1fr;
  }
}

/* HYBRID PENGAJUAN HARGA PANGAN MOBILE */
.m-pengajuan-subtabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.m-pengajuan-stab {
  padding: 9px 6px;
  border-radius: 9px;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 0.74rem;
  font-weight: 800;
  cursor: pointer;
}

.m-pengajuan-stab.active {
  background: #8b1e1e;
  color: #ffffff;
  border-color: #8b1e1e;
}

.m-pengajuan-ctx-banner {
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 0.75rem;
  line-height: 1.4;
}

.m-pengajuan-ctx-banner.is-pending {
  background: #fffbeb;
  border: 1.5px solid #fcd34d;
  color: #92400e;
}

.m-pengajuan-ctx-banner.is-draft {
  background: #eff6ff;
  border: 1.5px solid #93c5fd;
  color: #1e40af;
}

.m-pengajuan-ctx-banner.is-reject {
  background: #fef2f2;
  border: 1.5px solid #fca5a5;
  color: #991b1b;
}

.m-pengajuan-ref-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 7px 9px;
  margin-bottom: 10px;
  font-size: 0.73rem;
  color: #475569;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.m-pengajuan-3btns {
  display: grid;
  grid-template-columns: 1fr 1fr 1.1fr;
  gap: 6px;
  margin-top: 4px;
}

.m-btn-p-tambah {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 6px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.m-btn-p-simpan {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1.5px solid #93c5fd;
  border-radius: 8px;
  padding: 10px 6px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.m-btn-p-ajukan {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 6px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.m-pengajuan-3btns button:disabled,
.m-btn-p-simpan:disabled,
.m-btn-hybrid-load:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.m-btn-hybrid-load {
  background: #fef3c7;
  color: #92400e;
  border: 1.5px solid #fcd34d;
  border-radius: 7px;
  padding: 5px 8px;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
}

.m-btn-row-hapus {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.m-staf-batch-pill.st-draft,
.m-staf-status-tag.st-draft {
  background: #dbeafe;
  color: #1e40af;
}

.m-staf-market-card.st-draft {
  border-left: 4px solid #2563eb;
}

/* ─── KABID MOBILE: PERIODE BERANDA, DELTA VERIFIKASI, FILTER & EKSPOR ─── */
.m-kabid-period-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 10px;
}

.m-kabid-period-btn {
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 6px 4px;
  border-radius: 7px;
  cursor: pointer;
}

.m-kabid-period-btn.active {
  background: #8b1e1e;
  color: #ffffff;
}

.m-btn-link-inline {
  background: #fef2f2;
  color: #8b1e1e;
  border: 1px solid #fecaca;
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 0.74rem;
  font-weight: 800;
  cursor: pointer;
}

.m-kabid-serapan-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;
}

.m-kabid-serapan-fill {
  height: 100%;
  background: linear-gradient(90deg, #16a34a, #15803d);
  border-radius: 999px;
}

.m-vbp-sub {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.m-vbp-diff {
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.68rem;
}

.m-vbp-diff.up { background: #fee2e2; color: #b91c1c; }
.m-vbp-diff.down { background: #dcfce7; color: #166534; }
.m-vbp-diff.same { background: #f1f5f9; color: #475569; }
.m-vbp-diff.new { background: #dbeafe; color: #1d4ed8; }

.m-kabid-filter-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-kabid-filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 6px;
}

.m-kabid-filter-input,
.m-kabid-filter-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
  box-sizing: border-box;
}

.m-kabid-export-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-m-export-pdf {
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 12px 10px;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
}

.btn-m-export-csv:disabled,
.btn-m-export-pdf:disabled,
.m-kabid-btn-bulk:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.m-kabid-bulk-box {
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
  border: 1.5px solid #bbf7d0;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-kabid-bulk-box strong {
  display: block;
  font-size: 0.86rem;
  color: #14532d;
}

.m-kabid-bulk-box small {
  display: block;
  font-size: 0.75rem;
  color: #475569;
  margin-top: 2px;
}

.m-kabid-btn-bulk {
  background: linear-gradient(135deg, #166534 0%, #15803d 100%);
  color: #ffffff;
  border: none;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
}

.m-kabid-direct-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 0.78rem;
  line-height: 1.45;
}


/* ─── ADMIN, SUPERADMIN & RESPONSIVITAS LAYAR KECIL (360px - 480px) ─── */
.banner-superadmin {
  background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
  border-left: 4px solid #d97706;
}

.m-admin-role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
}

.m-admin-role-tile {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-admin-role-tile span {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
}

.m-admin-role-tile strong {
  font-size: 1.15rem;
  color: #0f172a;
  font-weight: 800;
}

.m-admin-role-tile.is-protected {
  background: #fffbeb;
  border-color: #fde68a;
}

.m-admin-role-tile.is-protected strong {
  color: #92400e;
}

.m-self-chip {
  font-size: 0.65rem;
  font-weight: 800;
  background: #dbeafe;
  color: #1e40af;
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 4px;
  vertical-align: middle;
}

.m-user-locked-note {
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 7px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  font-size: 0.73rem;
  font-weight: 600;
  line-height: 1.35;
}

.m-user-card-actions {
  flex-wrap: wrap;
}

.m-user-card-actions button {
  flex: 1 1 calc(50% - 6px);
  min-width: 96px;
  text-align: center;
}

.m-inline-add-row input {
  min-width: 0;
}

.m-verif-tab {
  white-space: nowrap;
  flex-shrink: 0;
}

.m-user-head-info {
  min-width: 0;
}

.m-user-sub {
  word-break: break-word;
}


/* ═══ MOBILE TIKET DOWNLOAD & MASTER-DETAIL EVENT WORKSPACE GPM (REV 7.2) ═══ */
.m-ticket-actions-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.btn-m-download-ticket {
  width: 100%;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(139, 30, 30, 0.24);
}

.btn-m-download-ticket:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.m-gpm-ws-topbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.m-gpm-ws-tabs,
.m-gpm-inner-two-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #ffffff;
  padding: 5px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.m-gpm-inner-two-tabs {
  margin-bottom: 14px;
}

.m-gpm-ws-tab-btn {
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 10px 8px;
  border-radius: 9px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.m-gpm-ws-tab-btn.active {
  background: #8b1e1e;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(139, 30, 30, 0.25);
}

.m-gpm-btn-schedule {
  width: 100%;
  background: linear-gradient(135deg, #8b1e1e, #6b1414);
  color: #ffffff;
  border: none;
  border-radius: 11px;
  padding: 12px 16px;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(139, 30, 30, 0.22);
}

.m-gpm-btn-outline-slate {
  width: 100%;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.m-gpm-sec-head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.m-gpm-refresh-chip,
.m-gpm-btn-back {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 7px 11px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.m-gpm-empty-card {
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  padding: 26px 16px;
  text-align: center;
}

.m-gpm-empty-ico {
  font-size: 2.3rem;
  display: block;
  margin-bottom: 8px;
}

.m-gpm-empty-card h4 {
  margin: 0 0 6px 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: #0f172a;
}

.m-gpm-empty-card p {
  margin: 0 0 14px 0;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.48;
}

.m-gpm-empty-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-gpm-active-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-gpm-active-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 13px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.m-gpm-ac-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.m-gpm-mode-pill {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
}

.m-gpm-ac-title {
  margin: 2px 0 0 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

.m-gpm-ac-meta {
  margin: 0;
  font-size: 0.78rem;
  color: #475569;
  line-height: 1.38;
}

.m-gpm-ac-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.m-gpm-ac-m {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 4px;
  text-align: center;
}

.m-gpm-ac-m span {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.m-gpm-ac-m strong {
  display: block;
  font-size: 0.94rem;
  font-weight: 800;
  color: #0f172a;
  margin-top: 2px;
}

.m-gpm-ac-komoditas {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 0.74rem;
  line-height: 1.4;
}

.m-gpm-ac-open-btn {
  width: 100%;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  border-radius: 9px;
  padding: 11px 12px;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
}

.m-gpm-ac-secondary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 6px;
}

.m-gpm-ac-sec-btn {
  border-radius: 8px;
  padding: 8px 6px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
}

.m-gpm-ac-sec-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.m-gpm-ac-sec-btn.is-manual {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.m-gpm-ac-sec-btn.is-quota {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.m-gpm-ac-sec-btn.is-close {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.m-gpm-ws-banner {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-top: 4px solid #8b1e1e;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
}

.m-gpm-ws-banner-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.m-gpm-ws-banner-title {
  margin: 0 0 4px 0;
  font-size: 1.04rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

.m-gpm-ws-banner-sub {
  margin: 0 0 2px 0;
  font-size: 0.78rem;
  color: #475569;
}

.m-gpm-ws-quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 12px;
}

.m-gpm-ws-quick-actions button {
  width: 100%;
  margin: 0;
}


.btn-m-mk-edit {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

</style>
