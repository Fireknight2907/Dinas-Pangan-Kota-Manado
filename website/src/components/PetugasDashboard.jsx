// ===================================================================================
// KOMPONEN DASHBOARD PETUGAS: BIDANG DISTRIBUSI & CADANGAN PANGAN (DESKTOP & RESPONSIVE)
// Sesuai Gambar 1 (Dashboard), Gambar 2 (Tetapkan Harga), & Gambar 3 (Responsive Layout)
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { hargaPanganService } from '../services/HargaPanganService';
import PetugasGPMManager from './PetugasGPMManager';
import './PetugasDashboard.css';

export default function PetugasDashboard({ pengguna, onKeluar }) {
  // ─────────────────────────────────────────────
  // 1. STATE MANAGEMENT
  // ─────────────────────────────────────────────

  // Menu aktif di sidebar ('dashboard', 'jenis-pangan', 'tetapkan-harga', 'kelola-gpm', 'laporan')
  const [menuAktif, setMenuAktif] = useState('dashboard');

  // Ringkasan statistik 4 kartu (Harga Ditetapkan, Draft, GPM Terjadwal, GPM Selesai)
  const [statsDashboard, setStatsDashboard] = useState({
    harga_ditetapkan: 2,
    draft_harga: 1,
    gpm_terjadwal: 2,
    gpm_selesai: 1
  });

  // Daftar harga komoditas (termasuk Terbit dan Draft)
  const [daftarHarga, setDaftarHarga] = useState([]);

  // Form State untuk Tetapkan Harga Pangan (Gambar 2)
  const [formHarga, setFormHarga] = useState({
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan: 'kg',
    harga: '',
    nama_pasar: 'Pasar Tradisional Bahu',
    status: 'Terbit'
  });

  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState('');
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false);

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataDashboard();
  }, []);

  const muatDataDashboard = async () => {
    try {
      const stats = await hargaPanganService.ambilStatistikDashboard();
      setStatsDashboard(stats);

      const items = await hargaPanganService.ambilSemua();
      setDaftarHarga(items);
    } catch (error) {
      console.error('Error saat memuat data dashboard petugas:', error);
    }
  };

  // ─────────────────────────────────────────────
  // 3. HANDLER SIMPAN / TERBITKAN HARGA (GAMBAR 2)
  // ─────────────────────────────────────────────
  const handleSimpanHarga = async (e, statusBaru = 'Terbit') => {
    if (e) e.preventDefault();

    if (!formHarga.nama_komoditas.trim() || !formHarga.harga) {
      alert('Nama jenis pangan dan harga wajib diisi!');
      return;
    }

    setSedangMenyimpan(true);
    try {
      const payload = {
        ...formHarga,
        harga: parseFloat(formHarga.harga),
        status: statusBaru,
        tanggal_penetapan: '14 Oktober 2026'
      };

      await hargaPanganService.tambah(payload);
      
      setPesanSukses(statusBaru === 'Terbit' 
        ? '✅ Harga komoditas berhasil diterbitkan ke halaman masyarakat!' 
        : '📝 Harga komoditas disimpan sebagai draft!');
      
      setTimeout(() => setPesanSukses(''), 4000);

      // Reset form
      setFormHarga({
        nama_komoditas: '',
        kategori: 'Bahan Pokok',
        satuan: 'kg',
        harga: '',
        nama_pasar: 'Pasar Tradisional Bahu',
        status: 'Terbit'
      });

      // Refresh data
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menyimpan harga: ' + error.message);
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Ubah status Terbit / Draft langsung dari daftar
  const toggleStatusHarga = async (item) => {
    const statusBaru = item.status === 'Terbit' ? 'Draft' : 'Terbit';
    try {
      await hargaPanganService.perbarui(item.id, { status: statusBaru });
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal mengubah status: ' + error.message);
    }
  };

  // Hapus item harga
  const handleHapusItem = async (id, nama) => {
    if (window.confirm(`Hapus data penetapan harga "${nama}"?`)) {
      try {
        await hargaPanganService.hapus(id);
        await muatDataDashboard();
      } catch (error) {
        alert('Gagal menghapus: ' + error.message);
      }
    }
  };

  // Format Rupiah
  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(angka).replace('IDR', 'Rp');
  };

  return (
    <div className="petugas-app-layout">
      {/* ─────────────────────────────────────────────
          4. SIDEBAR KIRI (Sesuai Gambar 1 & Gambar 2)
          Warna Maroon Tua Pekat (#3c0b0b)
          ───────────────────────────────────────────── */}
      <aside className={`petugas-sidebar ${sidebarTerbuka ? 'sidebar-open' : ''}`}>
        {/* Brand Header Sidebar */}
        <div className="sidebar-brand-box">
          <div className="sidebar-logo-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b1e1e" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <h2 className="sidebar-app-name">SI PATOKAAN</h2>
            <p className="sidebar-dept-name">Bidang Distribusi & Cadangan</p>
          </div>
        </div>

        {/* Label Menu */}
        <div className="sidebar-section-title">
          BIDANG DISTRIBUSI & CADANGAN
        </div>

        {/* Daftar Navigasi Sidebar */}
        <nav className="sidebar-nav-list">
          {/* Menu 1: Dashboard */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('dashboard'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </span>
            <span className="nav-label">Dashboard</span>
          </button>

          {/* Menu 2: Jenis Pangan */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'jenis-pangan' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('tetapkan-harga'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14"/>
                <line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/>
                <line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/>
                <line x1="9" y1="8" x2="15" y2="8"/>
                <line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
            </span>
            <span className="nav-label">Jenis Pangan</span>
          </button>

          {/* Menu 3: Tetapkan Harga */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'tetapkan-harga' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('tetapkan-harga'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </span>
            <span className="nav-label">Tetapkan Harga</span>
          </button>

          {/* Menu 4: Kelola GPM */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'kelola-gpm' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('kelola-gpm'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className="nav-label">Kelola GPM</span>
          </button>

          {/* Menu 5: Laporan */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'laporan' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('laporan'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <span className="nav-label">Laporan</span>
          </button>
        </nav>

        {/* Tombol Keluar di Bawah Sidebar */}
        <div className="sidebar-bottom-footer">
          <button className="sidebar-logout-btn" onClick={onKeluar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Backdrop mobile saat sidebar dibuka */}
      {sidebarTerbuka && (
        <div className="sidebar-mobile-overlay" onClick={() => setSidebarTerbuka(false)} />
      )}

      {/* ─────────────────────────────────────────────
          5. AREA KONTEN UTAMA
          ───────────────────────────────────────────── */}
      <div className="petugas-main-wrapper">
        {/* Top Header Bar */}
        <header className="petugas-top-bar">
          <div className="top-bar-left">
            <button className="mobile-toggle-btn" onClick={() => setSidebarTerbuka(!sidebarTerbuka)}>
              ☰
            </button>
            <div>
              <h3 className="dept-header-title">Bidang Distribusi & Cadangan</h3>
              <p className="breadcrumb-subtitle">
                {menuAktif === 'dashboard' ? 'Dashboard' : 'Penetapan Harga'}
              </p>
            </div>
          </div>

          <div className="top-bar-right">
            {/* Ikon Notifikasi Lonceng */}
            <div className="notification-bell-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="notif-red-dot"></span>
            </div>

            {/* Profil Petugas (Roni Tilaar) */}
            <div className="staff-profile-pill">
              <div className="staff-meta">
                <span className="staff-name-text">{pengguna?.nama || 'Roni Tilaar'}</span>
                <span className="staff-role-text">{pengguna?.bidang ? 'Staf ' + pengguna.bidang : 'Staf Bidang Distribusi'}</span>
              </div>
              <div className="staff-avatar-circle">
                {(pengguna?.nama ? pengguna.nama.charAt(0) : 'R').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Notifikasi Alert Sukses */}
        {pesanSukses && (
          <div className="petugas-alert-bar">
            {pesanSukses}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            6. VIEW 1: DASHBOARD (SESUAI GAMBAR 1)
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && (
          <div className="dashboard-page-container">
            {/* Header Dashboard */}
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">Dashboard Distribusi & Cadangan Pangan</h1>
              <p className="dashboard-main-subheading">
                Penetapan harga acuan & pengelolaan Gerakan Pangan Murah
              </p>
            </div>

            {/* Grid 4 Kartu Statistik (Gambar 1) */}
            <div className="dashboard-stat-cards-grid">
              {/* Kartu 1: Harga Ditetapkan */}
              <div className="stat-card-white">
                <div className="stat-icon-square icon-pink">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <div className="stat-number-big">
                  {statsDashboard.harga_ditetapkan}
                </div>
                <div className="stat-title-label">Harga Ditetapkan</div>
                <div className="stat-caption-sub">terbit ke publik</div>
              </div>

              {/* Kartu 2: Draft Harga */}
              <div className="stat-card-white">
                <div className="stat-icon-square icon-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
                <div className="stat-number-big">
                  {statsDashboard.draft_harga}
                </div>
                <div className="stat-title-label">Draft Harga</div>
                <div className="stat-caption-sub">belum terbit</div>
              </div>

              {/* Kartu 3: GPM Terjadwal */}
              <div className="stat-card-white">
                <div className="stat-icon-square icon-green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="stat-number-big">
                  {statsDashboard.gpm_terjadwal}
                </div>
                <div className="stat-title-label">GPM Terjadwal</div>
                <div className="stat-caption-sub">kegiatan mendatang</div>
              </div>

              {/* Kartu 4: GPM Selesai */}
              <div className="stat-card-white">
                <div className="stat-icon-square icon-pink-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div className="stat-number-big">
                  {statsDashboard.gpm_selesai}
                </div>
                <div className="stat-title-label">GPM Selesai</div>
                <div className="stat-caption-sub">bulan ini</div>
              </div>
            </div>

            {/* 2 Kartu Aksi Cepat Bawah (Gambar 1) */}
            <div className="dashboard-action-cards-grid">
              {/* Aksi 1: Penetapan Harga Pangan */}
              <div 
                className="action-card-interactive"
                onClick={() => setMenuAktif('tetapkan-harga')}
              >
                <div className="action-card-icon-tag">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <h3 className="action-card-heading">Penetapan Harga Pangan</h3>
                <span className="action-card-link-text">Isi & terbitkan harga →</span>
              </div>

              {/* Aksi 2: Pengelolaan GPM */}
              <div 
                className="action-card-interactive"
                onClick={() => setMenuAktif('kelola-gpm')}
              >
                <div className="action-card-icon-tag">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <h3 className="action-card-heading">Pengelolaan GPM</h3>
                <span className="action-card-link-text">Buat & kelola jadwal →</span>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            7. VIEW 2: TETAPKAN HARGA (SESUAI GAMBAR 2 & 3)
            Formulir Penetapan Harga & Daftar Harga Saat Ini
            ───────────────────────────────────────────── */}
        {(menuAktif === 'tetapkan-harga' || menuAktif === 'jenis-pangan') && (
          <div className="tetapkan-harga-page-container">
            {/* Header Tetapkan Harga */}
            <div className="tetapkan-header-box">
              <h1 className="tetapkan-main-title">Penetapan Harga Pangan</h1>
              <p className="tetapkan-main-desc">
                Tetapkan harga acuan untuk jenis pangan yang ditetapkan admin, lalu terbitkan ke halaman masyarakat
              </p>
            </div>

            {/* Layout 2 Kolom (Form di Kiri, Daftar Harga di Kanan) */}
            <div className="tetapkan-content-columns">
              
              {/* KOLOM KIRI: FORMULIR PENETAPAN HARGA (GAMBAR 2) */}
              <div className="tetapkan-form-card">
                <div className="form-card-title-row">
                  <span className="form-plus-icon">+</span>
                  <h3 className="form-card-heading">Formulir Penetapan Harga</h3>
                </div>

                <form onSubmit={(e) => handleSimpanHarga(e, 'Terbit')} className="price-entry-form">
                  {/* Jenis Pangan (ditetapkan admin) */}
                  <div className="form-field-group">
                    <label className="field-label-text">Jenis Pangan (ditetapkan admin)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Beras Medium"
                      className="field-input-box"
                      value={formHarga.nama_komoditas}
                      onChange={(e) => setFormHarga({ ...formHarga, nama_komoditas: e.target.value })}
                      list="opsiJenisPangan"
                    />
                    <datalist id="opsiJenisPangan">
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

                  {/* Baris Satuan & Harga (Rp) */}
                  <div className="form-two-cols-row">
                    <div className="form-field-group">
                      <label className="field-label-text">Satuan</label>
                      <input
                        type="text"
                        required
                        placeholder="kg"
                        className="field-input-box"
                        value={formHarga.satuan}
                        onChange={(e) => setFormHarga({ ...formHarga, satuan: e.target.value })}
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label-text">Harga (Rp)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="13500"
                        className="field-input-box"
                        value={formHarga.harga}
                        onChange={(e) => setFormHarga({ ...formHarga, harga: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Dropdown Pasar */}
                  <div className="form-field-group">
                    <label className="field-label-text">Pasar</label>
                    <div className="select-pasar-wrapper">
                      <select
                        className="field-select-box"
                        value={formHarga.nama_pasar}
                        onChange={(e) => setFormHarga({ ...formHarga, nama_pasar: e.target.value })}
                      >
                        <option value="Pasar Tradisional Bahu">Pasar Tradisional Bahu</option>
                        <option value="Pasar Bersehati Karombasan">Pasar Bersehati Karombasan</option>
                        <option value="Pasar Tradisional Tuminting">Pasar Tradisional Tuminting</option>
                        <option value="Pasar Bersehati Sario">Pasar Bersehati Sario</option>
                      </select>
                    </div>
                  </div>

                  {/* Tombol Aksi: Terbitkan ke Halaman Masyarakat */}
                  <div className="form-actions-stack">
                    <button
                      type="submit"
                      className="btn-terbitkan-masyarakat"
                      disabled={sedangMenyimpan}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      <span>{sedangMenyimpan ? 'Menerbitkan...' : 'Terbitkan ke Halaman Masyarakat'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-simpan-draft"
                      onClick={() => handleSimpanHarga(null, 'Draft')}
                      disabled={sedangMenyimpan}
                    >
                      Simpan sebagai Draft
                    </button>
                  </div>
                </form>
              </div>

              {/* KOLOM KANAN: DAFTAR HARGA SAAT INI (GAMBAR 2) */}
              <div className="tetapkan-list-card">
                <h3 className="list-card-heading">Daftar Harga Saat Ini</h3>

                <div className="current-prices-stack">
                  {daftarHarga.map((item) => (
                    <div key={item.id} className="price-item-row-card">
                      <div className="price-item-info-col">
                        <div className="item-title-unit">
                          <strong className="item-name">{item.nama_komoditas}</strong>
                          <span className="item-unit"> / {item.satuan || 'kg'}</span>
                        </div>
                        <div className="item-market-date">
                          {item.nama_pasar} · {item.tanggal_penetapan || '14 Oktober 2026'}
                        </div>
                      </div>

                      <div className="price-item-value-col">
                        <div className="item-price-nominal">
                          {formatRupiah(item.harga)}
                        </div>
                        <div className="item-status-wrapper">
                          <span 
                            className={`badge-status-pill ${item.status === 'Draft' ? 'status-draft' : 'status-terbit'}`}
                            onClick={() => toggleStatusHarga(item)}
                            title="Klik untuk ubah status (Terbit / Draft)"
                          >
                            {item.status || 'Terbit'}
                          </span>
                          <button 
                            className="btn-del-mini"
                            onClick={() => handleHapusItem(item.id, item.nama_komoditas)}
                            title="Hapus"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: KELOLA GPM, SCAN BARCODE & DAFTAR ANTREAN */}
        {menuAktif === 'kelola-gpm' && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Pengelolaan Gerakan Pangan Murah (GPM)</h1>
            <p className="dashboard-main-subheading">
              Jadwal pelaksanaan, titik koordinat peta, scan barcode antrean masyarakat, dan rekapitulasi kehadiran warga
            </p>
            <div style={{ marginTop: '20px' }}>
              <PetugasGPMManager token={hargaPanganService.ambilToken()} />
            </div>
          </div>
        )}

        {menuAktif === 'laporan' && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Laporan Distribusi & Cadangan Pangan</h1>
            <p className="dashboard-main-subheading">Rekapitulasi berkala harga pasar dan fluktuasi komoditas</p>
            <div className="stat-card-white" style={{marginTop: '20px'}}>
              <p>📊 Laporan mingguan dan bulanan siap diunduh dalam format PDF / Excel.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
