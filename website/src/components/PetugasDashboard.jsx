// ===================================================================================
// KOMPONEN DASHBOARD PETUGAS: BIDANG DISTRIBUSI & CADANGAN PANGAN (DESKTOP & RESPONSIVE)
// Mendukung Role-Based Access Control (RBAC):
// 1. Staf (effrend): Tetapkan harga (pilih pasar yang ada), Kelola GPM, tanpa menu Laporan
// 2. Kepala Bagian (mareta): Menu Laporan Eksklusif, Kelola Master Pasar & Kecamatan
// 3. Superadmin (regina & edrick): Kelola Pengguna & Role, Master Data, semua fitur
// Fitur Tambahan: Fungsional Notifikasi, Logout Tuntas, Ganti Foto Profil & Ganti Password (min 8 char)
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { hargaPanganService } from '../services/HargaPanganService';
import PetugasGPMManager from './PetugasGPMManager';
import './PetugasDashboard.css';

export default function PetugasDashboard({ pengguna, onKeluar }) {
  // ─────────────────────────────────────────────
  // 1. STATE & ROLE MANAGEMENT
  // ─────────────────────────────────────────────
  const peran = pengguna?.peran || 'Staf';
  const isSuperAdmin = peran === 'Admin';
  const isKepalaBagian = peran === 'Kepala Bagian';
  const bisaLihatLaporan = isKepalaBagian || isSuperAdmin;
  const bisaKelolaMaster = isKepalaBagian || isSuperAdmin;
  const bisaKelolaUser = isSuperAdmin;

  // Menu aktif
  const [menuAktif, setMenuAktif] = useState('dashboard');
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false);

  // Data Dashboard
  const [statsDashboard, setStatsDashboard] = useState({
    harga_ditetapkan: 2,
    draft_harga: 1,
    gpm_terjadwal: 2,
    gpm_selesai: 1
  });
  const [daftarHarga, setDaftarHarga] = useState([]);
  const [daftarPasar, setDaftarPasar] = useState([]);
  const [daftarKecamatan, setDaftarKecamatan] = useState([]);

  // Form Tetapkan Harga Pangan
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

  // Notifikasi
  const [daftarNotif, setDaftarNotif] = useState([]);
  const [tampilkanNotifDropdown, setTampilkanNotifDropdown] = useState(false);

  // Profil & Keamanan (Ganti Foto Profil & Ganti Password)
  const [tampilkanModalProfil, setTampilkanModalProfil] = useState(false);
  const [userState, setUserState] = useState(pengguna || {});
  const [inputFotoUrl, setInputFotoUrl] = useState(pengguna?.foto_profil || '');
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPasswordBaru, setKonfirmasiPasswordBaru] = useState('');
  const [pesanProfil, setPesanProfil] = useState({ tipe: '', teks: '' });

  // Master Data (Pasar & Kecamatan)
  const [inputPasarBaru, setInputPasarBaru] = useState('');
  const [inputKecamatanBaru, setInputKecamatanBaru] = useState('');

  // Kelola User (Khusus Superadmin)
  const [daftarPengguna, setDaftarPengguna] = useState([]);
  const [formUserBaru, setFormUserBaru] = useState({
    nama: '',
    username: '',
    email: '',
    peran: 'Staf',
    bidang: 'Bidang Cadangan dan Distribusi Pangan',
    kata_sandi: ''
  });

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & DATA LOADING
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataDashboard();
    muatMasterData();
    muatNotifikasi();
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

  const muatMasterData = async () => {
    const pasar = await hargaPanganService.ambilDaftarPasar();
    setDaftarPasar(pasar);
    if (pasar.length > 0 && !formHarga.nama_pasar) {
      setFormHarga(prev => ({ ...prev, nama_pasar: pasar[0] }));
    }

    const kec = hargaPanganService.ambilKecamatan();
    setDaftarKecamatan(kec);

    if (bisaKelolaUser) {
      const users = hargaPanganService.ambilSemuaPengguna();
      setDaftarPengguna(users);
    }
  };

  const muatNotifikasi = () => {
    const notifs = hargaPanganService.ambilNotifikasi();
    setDaftarNotif(notifs);
  };

  // ─────────────────────────────────────────────
  // 3. HANDLER HARGA PANGAN
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
        tanggal_penetapan: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      };

      await hargaPanganService.tambah(payload);
      
      setPesanSukses(statusBaru === 'Terbit' 
        ? '✅ Harga komoditas berhasil diterbitkan ke halaman publik!' 
        : '📝 Harga komoditas disimpan sebagai draft!');
      
      setTimeout(() => setPesanSukses(''), 4000);

      // Reset form
      setFormHarga({
        nama_komoditas: '',
        kategori: 'Bahan Pokok',
        satuan: 'kg',
        harga: '',
        nama_pasar: daftarPasar[0] || 'Pasar Tradisional Bahu',
        status: 'Terbit'
      });

      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menyimpan harga: ' + error.message);
    } finally {
      setSedangMenyimpan(false);
    }
  };

  const toggleStatusHarga = async (item) => {
    const statusBaru = item.status === 'Terbit' ? 'Draft' : 'Terbit';
    try {
      await hargaPanganService.perbarui(item.id, { status: statusBaru });
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal mengubah status: ' + error.message);
    }
  };

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

  // ─────────────────────────────────────────────
  // 4. HANDLER MASTER PASAR & KECAMATAN (KEPALA BAGIAN)
  // ─────────────────────────────────────────────
  const handleTambahPasar = (e) => {
    e.preventDefault();
    if (!inputPasarBaru.trim()) return;
    try {
      const updated = hargaPanganService.tambahPasar(inputPasarBaru.trim());
      setDaftarPasar(updated);
      setInputPasarBaru('');
      alert(`✅ Pasar "${inputPasarBaru.trim()}" berhasil ditambahkan dan otomatis dapat dipilih oleh staf!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusPasar = (nama) => {
    if (window.confirm(`Hapus pasar "${nama}" dari master data?`)) {
      const updated = hargaPanganService.hapusPasar(nama);
      setDaftarPasar(updated);
    }
  };

  const handleTambahKecamatan = (e) => {
    e.preventDefault();
    if (!inputKecamatanBaru.trim()) return;
    try {
      const updated = hargaPanganService.tambahKecamatan(inputKecamatanBaru.trim());
      setDaftarKecamatan(updated);
      setInputKecamatanBaru('');
      alert(`✅ Kecamatan "${inputKecamatanBaru.trim()}" berhasil ditambahkan dan otomatis dapat dipilih oleh staf!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusKecamatan = (nama) => {
    if (window.confirm(`Hapus kecamatan "${nama}" dari master data?`)) {
      const updated = hargaPanganService.hapusKecamatan(nama);
      setDaftarKecamatan(updated);
    }
  };

  // ─────────────────────────────────────────────
  // 5. HANDLER KELOLA USER (KHUSUS SUPERADMIN)
  // ─────────────────────────────────────────────
  const handleTambahUserBaru = (e) => {
    e.preventDefault();
    try {
      hargaPanganService.tambahPengguna(formUserBaru);
      setFormUserBaru({
        nama: '',
        username: '',
        email: '',
        peran: 'Staf',
        bidang: 'Bidang Cadangan dan Distribusi Pangan',
        kata_sandi: ''
      });
      const users = hargaPanganService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      alert('✅ Pengguna baru berhasil ditambahkan!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUbahRoleUser = (id, roleBaru) => {
    try {
      hargaPanganService.ubahRolePengguna(id, roleBaru);
      const users = hargaPanganService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      alert('✅ Role pengguna berhasil diperbarui!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusUser = (id, nama) => {
    if (window.confirm(`Hapus akun pengguna "${nama}"?`)) {
      hargaPanganService.hapusPengguna(id);
      const users = hargaPanganService.ambilSemuaPengguna();
      setDaftarPengguna(users);
    }
  };

  // ─────────────────────────────────────────────
  // 6. HANDLER PROFIL & GANTI PASSWORD
  // ─────────────────────────────────────────────
  const handleSimpanFotoProfil = () => {
    try {
      hargaPanganService.gantiFotoProfil(userState.id, inputFotoUrl);
      setUserState(prev => ({ ...prev, foto_profil: inputFotoUrl }));
      setPesanProfil({ tipe: 'sukses', teks: '✅ Foto profil berhasil diperbarui!' });
      setTimeout(() => setPesanProfil({ tipe: '', teks: '' }), 3000);
    } catch (e) {
      setPesanProfil({ tipe: 'error', teks: e.message });
    }
  };

  const handleSimpanPassword = (e) => {
    e.preventDefault();
    if (!passwordBaru || passwordBaru.length < 8) {
      setPesanProfil({ tipe: 'error', teks: '⚠️ Kata sandi baru minimal 8 karakter demi keamanan!' });
      return;
    }
    if (passwordBaru !== konfirmasiPasswordBaru) {
      setPesanProfil({ tipe: 'error', teks: '⚠️ Konfirmasi kata sandi baru tidak cocok!' });
      return;
    }

    try {
      hargaPanganService.gantiPassword(userState.id, passwordLama, passwordBaru);
      setPasswordLama('');
      setPasswordBaru('');
      setKonfirmasiPasswordBaru('');
      setPesanProfil({ tipe: 'sukses', teks: '✅ Kata sandi berhasil diubah! Keamanan akun Anda terjaga.' });
      setTimeout(() => setPesanProfil({ tipe: '', teks: '' }), 4000);
    } catch (err) {
      setPesanProfil({ tipe: 'error', teks: `⚠️ ${err.message}` });
    }
  };

  const handleTandaiNotifikasiDibaca = () => {
    const updated = hargaPanganService.tandaiSemuaDibaca();
    setDaftarNotif(updated);
  };

  // Format Rupiah
  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(angka).replace('IDR', 'Rp');
  };

  const notifBelumDibaca = daftarNotif.filter(n => !n.dibaca).length;

  return (
    <div className="petugas-app-layout">
      {/* ─────────────────────────────────────────────
          7. SIDEBAR NAVIGASI BERDASARKAN ROLE
          ───────────────────────────────────────────── */}
      <aside className={`petugas-sidebar ${sidebarTerbuka ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-box">
          <div className="sidebar-logo-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b1e1e" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <h2 className="sidebar-app-name">SI PATOKAAN</h2>
            <p className="sidebar-dept-name">Dinas Pangan Kota Manado</p>
          </div>
        </div>

        <div className="sidebar-section-title">
          MENU {peran.toUpperCase()}
        </div>

        <nav className="sidebar-nav-list">
          {/* Menu 1: Dashboard (Semua) */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('dashboard'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </button>

          {/* Menu 2: Tetapkan Harga (Semua) */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'tetapkan-harga' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('tetapkan-harga'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">🏷️</span>
            <span className="nav-label">Tetapkan Harga</span>
          </button>

          {/* Menu 3: Kelola GPM (Semua) */}
          <button
            className={`sidebar-nav-btn ${menuAktif === 'kelola-gpm' ? 'active' : ''}`}
            onClick={() => { setMenuAktif('kelola-gpm'); setSidebarTerbuka(false); }}
          >
            <span className="nav-icon">🎟️</span>
            <span className="nav-label">Kelola GPM</span>
          </button>

          {/* Menu 4: Laporan (HANYA KEPALA BAGIAN & ADMIN) */}
          {bisaLihatLaporan && (
            <button
              className={`sidebar-nav-btn ${menuAktif === 'laporan' ? 'active' : ''}`}
              onClick={() => { setMenuAktif('laporan'); setSidebarTerbuka(false); }}
            >
              <span className="nav-icon">📑</span>
              <span className="nav-label">Laporan Pangan</span>
            </button>
          )}

          {/* Menu 5: Master Data (HANYA KEPALA BAGIAN & ADMIN) */}
          {bisaKelolaMaster && (
            <button
              className={`sidebar-nav-btn ${menuAktif === 'master-data' ? 'active' : ''}`}
              onClick={() => { setMenuAktif('master-data'); setSidebarTerbuka(false); }}
            >
              <span className="nav-icon">🏛️</span>
              <span className="nav-label">Master Pasar & Wilayah</span>
            </button>
          )}

          {/* Menu 6: Kelola Pengguna & Role (HANYA SUPERADMIN: REGINA / EDRICK) */}
          {bisaKelolaUser && (
            <button
              className={`sidebar-nav-btn ${menuAktif === 'kelola-user' ? 'active' : ''}`}
              onClick={() => { setMenuAktif('kelola-user'); setSidebarTerbuka(false); }}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">Kelola Role & User</span>
            </button>
          )}
        </nav>

        {/* Tombol Keluar di Bawah Sidebar */}
        <div className="sidebar-bottom-footer">
          <button className="sidebar-logout-btn" onClick={onKeluar} title="Keluar dari sistem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {sidebarTerbuka && (
        <div className="sidebar-mobile-overlay" onClick={() => setSidebarTerbuka(false)} />
      )}

      {/* ─────────────────────────────────────────────
          8. AREA KONTEN UTAMA & TOP BAR
          ───────────────────────────────────────────── */}
      <div className="petugas-main-wrapper">
        <header className="petugas-top-bar">
          <div className="top-bar-left">
            <button className="mobile-toggle-btn" onClick={() => setSidebarTerbuka(!sidebarTerbuka)}>
              ☰
            </button>
            <div>
              <h3 className="dept-header-title">Bidang Cadangan dan Distribusi Pangan</h3>
              <p className="breadcrumb-subtitle">
                Masuk Sebagai: <strong>{userState.nama || 'Petugas'}</strong> ({peran})
              </p>
            </div>
          </div>

          <div className="top-bar-right" style={{ position: 'relative' }}>
            {/* Tombol Notifikasi Interaktif */}
            <div 
              className="notification-bell-btn"
              onClick={() => setTampilkanNotifDropdown(!tampilkanNotifDropdown)}
              title="Notifikasi Sistem"
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifBelumDibaca > 0 && <span className="notif-red-dot"></span>}
            </div>

            {/* Dropdown Notifikasi */}
            {tampilkanNotifDropdown && (
              <div 
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '120px',
                  width: '320px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  zIndex: 100,
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>🔔 Notifikasi Sistem</h4>
                  {notifBelumDibaca > 0 && (
                    <button 
                      onClick={handleTandaiNotifikasiDibaca}
                      style={{ background: 'none', border: 'none', color: '#8b1e1e', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Tandai Dibaca
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {daftarNotif.map((n) => (
                    <div 
                      key={n.id} 
                      style={{ 
                        padding: '10px', 
                        borderRadius: '8px', 
                        background: n.dibaca ? '#f8fafc' : '#fef2f2', 
                        borderLeft: `4px solid ${n.dibaca ? '#cbd5e1' : '#8b1e1e'}` 
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{n.judul}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{n.pesan}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>{n.waktu}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profil Petugas dengan Modal Ganti Foto & Password */}
            <div 
              className="staff-profile-pill" 
              onClick={() => setTampilkanModalProfil(true)}
              style={{ cursor: 'pointer' }}
              title="Klik untuk ubah foto profil & kata sandi"
            >
              <div className="staff-meta">
                <span className="staff-name-text">{userState.nama || 'Petugas'}</span>
                <span className="staff-role-text">{peran}</span>
              </div>
              <div className="staff-avatar-circle" style={{ overflow: 'hidden' }}>
                {userState.foto_profil ? (
                  <img src={userState.foto_profil} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (userState.nama ? userState.nama.charAt(0) : 'P').toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>

        {pesanSukses && (
          <div className="petugas-alert-bar">
            {pesanSukses}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            9. VIEW 1: DASHBOARD
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">
                Dashboard {peran === 'Kepala Bagian' ? 'Kepala Bagian' : peran === 'Admin' ? 'Superadmin' : 'Staf'} Cadangan & Distribusi Pangan
              </h1>
              <p className="dashboard-main-subheading">
                Pemerintah Kota Manado — Pemantauan harga acuan & operasional Gerakan Pangan Murah (GPM)
              </p>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white">
                <div className="stat-icon-square icon-pink">🏷️</div>
                <div className="stat-number-big">{statsDashboard.harga_ditetapkan}</div>
                <div className="stat-title-label">Harga Ditetapkan</div>
                <div className="stat-caption-sub">terbit ke publik</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-amber">📝</div>
                <div className="stat-number-big">{statsDashboard.draft_harga}</div>
                <div className="stat-title-label">Draft Harga</div>
                <div className="stat-caption-sub">menunggu verifikasi</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-blue">🎟️</div>
                <div className="stat-number-big">{statsDashboard.gpm_terjadwal}</div>
                <div className="stat-title-label">GPM Terjadwal</div>
                <div className="stat-caption-sub">titik lokasi aktif</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-green">✅</div>
                <div className="stat-number-big">{statsDashboard.gpm_selesai}</div>
                <div className="stat-title-label">GPM Selesai</div>
                <div className="stat-caption-sub">kegiatan terlaksana</div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('tetapkan-harga')}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#8b1e1e' }}>🏷️ Tetapkan Harga Komoditas</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Input harga komoditas pasar hari ini dan terbitkan langsung ke masyarakat.</p>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#8b1e1e' }}>🎟️ Kelola GPM & Scan QR</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Pindai QR code tiket warga, pantau kuota, dan tambah jadwal titik peta.</p>
              </div>

              {bisaLihatLaporan && (
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan')}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#8b1e1e' }}>📑 Cetak Laporan Pangan</h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Rekapitulasi berkala harga pasar dan kehadiran GPM untuk pimpinan.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            10. VIEW 2: TETAPKAN HARGA PANGAN
            Staf hanya memilih pasar yang sudah ada (tidak bisa add seenaknya)
            ───────────────────────────────────────────── */}
        {menuAktif === 'tetapkan-harga' && (
          <div className="tetapkan-harga-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">Penetapan Harga Acuan Pasar</h1>
              <p className="dashboard-main-subheading">
                Masukkan harga komoditas pangan terkini untuk pasar di Kota Manado.
              </p>
            </div>

            <div className="tetapkan-content-columns">
              <div className="tetapkan-form-card">
                <h3 className="form-card-heading">Form Input Harga Komoditas</h3>
                <form onSubmit={(e) => handleSimpanHarga(e, 'Terbit')} className="price-entry-form">
                  <div className="form-field-group">
                    <label className="field-label-text">Jenis Pangan / Nama Komoditas</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Beras Medium"
                      className="field-input-box"
                      value={formHarga.nama_komoditas}
                      onChange={(e) => setFormHarga({ ...formHarga, nama_komoditas: e.target.value })}
                    />
                  </div>

                  <div className="form-two-cols-row">
                    <div className="form-field-group">
                      <label className="field-label-text">Kategori</label>
                      <select
                        className="field-select-box"
                        value={formHarga.kategori}
                        onChange={(e) => setFormHarga({ ...formHarga, kategori: e.target.value })}
                      >
                        <option value="Bahan Pokok">Bahan Pokok</option>
                        <option value="Hewani">Hewani</option>
                        <option value="Sayuran">Sayuran</option>
                        <option value="Buah">Buah</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label-text">Satuan</label>
                      <input
                        type="text"
                        required
                        placeholder="kg / liter / butir"
                        className="field-input-box"
                        value={formHarga.satuan}
                        onChange={(e) => setFormHarga({ ...formHarga, satuan: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-two-cols-row">
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

                    {/* Dropdown Pasar: Staf Cuma Bisa Memilih Yang Sudah Ada */}
                    <div className="form-field-group">
                      <label className="field-label-text">Nama Pasar</label>
                      <select
                        className="field-select-box"
                        value={formHarga.nama_pasar}
                        onChange={(e) => setFormHarga({ ...formHarga, nama_pasar: e.target.value })}
                      >
                        {daftarPasar.map((pasar, idx) => (
                          <option key={idx} value={pasar}>{pasar}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-actions-stack">
                    <button type="submit" className="btn-terbitkan-masyarakat" disabled={sedangMenyimpan}>
                      <span>{sedangMenyimpan ? 'Menerbitkan...' : 'Terbitkan ke Halaman Masyarakat'}</span>
                    </button>
                    <button type="button" className="btn-simpan-draft" onClick={() => handleSimpanHarga(null, 'Draft')} disabled={sedangMenyimpan}>
                      Simpan sebagai Draft
                    </button>
                  </div>
                </form>
              </div>

              {/* Daftar Harga Saat Ini */}
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
                          {item.nama_pasar} · {item.tanggal_penetapan || 'Hari ini'}
                        </div>
                      </div>

                      <div className="price-item-value-col">
                        <div className="item-price-nominal">{formatRupiah(item.harga)}</div>
                        <div className="item-status-wrapper">
                          <span 
                            className={`badge-status-pill ${item.status === 'Draft' ? 'status-draft' : 'status-terbit'}`}
                            onClick={() => toggleStatusHarga(item)}
                            title="Klik untuk ubah status"
                          >
                            {item.status || 'Terbit'}
                          </span>
                          <button className="btn-del-mini" onClick={() => handleHapusItem(item.id, item.nama_komoditas)} title="Hapus">
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

        {/* ─────────────────────────────────────────────
            11. VIEW 3: KELOLA GPM & SCAN QR CODE
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-gpm' && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Pengelolaan Gerakan Pangan Murah (GPM)</h1>
            <p className="dashboard-main-subheading">
              Titik peta interaktif (klik langsung di peta), verifikasi QR Code tiket masyarakat, dan rekapitulasi antrean
            </p>
            <div style={{ marginTop: '20px' }}>
              <PetugasGPMManager 
                token={hargaPanganService.ambilToken()} 
                pengguna={userState} 
              />
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            12. VIEW 4: MENU LAPORAN (KHUSUS KEPALA BAGIAN & ADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan' && bisaLihatLaporan && (
          <div className="dashboard-page-container" id="area-laporan-resmi">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h1 className="dashboard-main-heading">📑 Laporan Resmi Ketahanan & Distribusi Pangan</h1>
                <p className="dashboard-main-subheading">
                  Menu Khusus Kepala Bagian Cadangan & Distribusi Pangan — Rekapitulasi Harga & GPM Kota Manado
                </p>
              </div>
              <button 
                onClick={() => window.print()}
                style={{
                  background: '#8b1e1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🖨️ Cetak / Ekspor Laporan PDF
              </button>
            </div>

            {/* Kotak Rekapitulasi */}
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '14px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#8b1e1e' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#555' }}>
                  Laporan Pemantauan Harga Pasar Tradisional & Realisasi Gerakan Pangan Murah
                </p>
              </div>

              <h4 style={{ margin: '16px 0 10px 0' }}>1. Rekapitulasi Harga Komoditas Terbit</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>No.</th>
                    <th style={{ padding: '10px' }}>Komoditas</th>
                    <th style={{ padding: '10px' }}>Kategori</th>
                    <th style={{ padding: '10px' }}>Pasar</th>
                    <th style={{ padding: '10px' }}>Harga</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarHarga.map((h, idx) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                      <td style={{ padding: '10px' }}>{h.kategori}</td>
                      <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(h.harga)}/{h.satuan}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: h.status === 'Draft' ? '#fef3c7' : '#dcfce7', color: h.status === 'Draft' ? '#92400e' : '#166534' }}>
                          {h.status || 'Terbit'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                <div style={{ width: '250px' }}>
                  <div>Manado, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Bagian Cadangan & Distribusi</div>
                  <div style={{ height: '70px' }}></div>
                  <div style={{ fontWeight: 800, textDecoration: 'underline' }}>{userState.nama || 'Mareta'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>NIP. 19850412 201001 2 003</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            13. VIEW 5: MASTER PASAR & KECAMATAN (KHUSUS KEPALA BAGIAN & ADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'master-data' && bisaKelolaMaster && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">🏛️ Kelola Master Pasar & Wilayah Kecamatan</h1>
            <p className="dashboard-main-subheading">
              Ketua Bidang / Kepala Bagian berwenang menambah pasar atau kecamatan baru agar langsung tersedia sebagai pilihan bagi staf.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {/* Kolom Master Pasar */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#8b1e1e' }}>🏪 Master Daftar Pasar</h3>
                <form onSubmit={handleTambahPasar} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Nama pasar baru..."
                    className="field-input-box"
                    value={inputPasarBaru}
                    onChange={(e) => setInputPasarBaru(e.target.value)}
                  />
                  <button type="submit" style={{ background: '#8b1e1e', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Tambah
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {daftarPasar.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{p}</span>
                      <button onClick={() => handleHapusPasar(p)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kolom Master Kecamatan */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#8b1e1e' }}>📍 Master Daftar Kecamatan</h3>
                <form onSubmit={handleTambahKecamatan} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Nama kecamatan baru..."
                    className="field-input-box"
                    value={inputKecamatanBaru}
                    onChange={(e) => setInputKecamatanBaru(e.target.value)}
                  />
                  <button type="submit" style={{ background: '#8b1e1e', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Tambah
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {daftarKecamatan.map((k, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 600 }}>Kecamatan {k}</span>
                      <button onClick={() => handleHapusKecamatan(k)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            14. VIEW 6: KELOLA PENGGUNA & ROLE (KHUSUS SUPERADMIN: REGINA / EDRICK)
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-user' && bisaKelolaUser && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">👥 Pengelolaan Pengguna & Role (Superadmin)</h1>
            <p className="dashboard-main-subheading">
              Superadmin berwenang mendaftarkan user baru, mengatur role (Staf, Kepala Bagian, Admin), dan menentukan hak fungsi.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {/* Form Tambah Pengguna */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>➕ Tambah Pengguna Baru</h3>
                <form onSubmit={handleTambahUserBaru} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Mareta Wowor"
                      className="field-input-box"
                      value={formUserBaru.nama}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, nama: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Username Login</label>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      className="field-input-box"
                      value={formUserBaru.username}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Role / Hak Akses</label>
                    <select
                      className="field-select-box"
                      value={formUserBaru.peran}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, peran: e.target.value })}
                    >
                      <option value="Staf">Staf (Input harga & GPM, tanpa laporan)</option>
                      <option value="Kepala Bagian">Kepala Bagian (Laporan resmi & Master Wilayah)</option>
                      <option value="Admin">Admin (Superadmin pengelola user)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                      Kata Sandi (Keamanan: Minimal 8 Karakter)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimal 8 karakter"
                      className="field-input-box"
                      value={formUserBaru.kata_sandi}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, kata_sandi: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: '#8b1e1e',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginTop: '6px'
                    }}
                  >
                    Simpan & Buat Akun
                  </button>
                </form>
              </div>

              {/* Daftar Pengguna & Role */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>📋 Daftar Akun Terdaftar</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {daftarPengguna.map((u) => (
                    <div key={u.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{u.nama}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '8px' }}>@{u.username}</span>
                        </div>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          background: u.peran === 'Admin' ? '#fdf2f8' : u.peran === 'Kepala Bagian' ? '#f0fdf4' : '#eff6ff',
                          color: u.peran === 'Admin' ? '#9d174d' : u.peran === 'Kepala Bagian' ? '#166534' : '#1e40af'
                        }}>
                          {u.peran}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <select
                          value={u.peran}
                          onChange={(e) => handleUbahRoleUser(u.id, e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="Staf">Set Staf</option>
                          <option value="Kepala Bagian">Set Kepala Bagian</option>
                          <option value="Admin">Set Admin</option>
                        </select>
                        <button
                          onClick={() => handleHapusUser(u.id, u.nama)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Hapus User
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          15. MODAL PROFIL & GANTI PASSWORD (SAFETY MINIMAL 8)
          ───────────────────────────────────────────── */}
      {tampilkanModalProfil && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={() => setTampilkanModalProfil(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#8b1e1e' }}>👤 Profil & Pengaturan Keamanan</h3>
              <button 
                onClick={() => setTampilkanModalProfil(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            {pesanProfil.teks && (
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: '8px', 
                marginBottom: '14px', 
                fontSize: '0.88rem',
                background: pesanProfil.tipe === 'sukses' ? '#dcfce7' : '#fee2e2',
                color: pesanProfil.tipe === 'sukses' ? '#166534' : '#991b1b'
              }}>
                {pesanProfil.teks}
              </div>
            )}

            {/* Bagian Ganti Foto Profil */}
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>📷 Ganti Foto Profil</h4>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#8b1e1e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, overflow: 'hidden' }}>
                  {inputFotoUrl ? (
                    <img src={inputFotoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (userState.nama ? userState.nama.charAt(0) : 'P').toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="url"
                    placeholder="URL gambar / foto profil baru..."
                    className="field-input-box"
                    value={inputFotoUrl}
                    onChange={(e) => setInputFotoUrl(e.target.value)}
                    style={{ fontSize: '0.85rem', marginBottom: '6px' }}
                  />
                  <button
                    type="button"
                    onClick={handleSimpanFotoProfil}
                    style={{ background: '#380a0a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Perbarui Foto
                  </button>
                </div>
              </div>
            </div>

            {/* Bagian Ganti Password */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>🔒 Ganti Kata Sandi (Safety: Min. 8 Karakter)</h4>
              <form onSubmit={handleSimpanPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>Kata Sandi Lama</label>
                  <input
                    type="password"
                    required
                    placeholder="Kata sandi saat ini"
                    className="field-input-box"
                    value={passwordLama}
                    onChange={(e) => setPasswordLama(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>
                    Kata Sandi Baru (Min. 8 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    className="field-input-box"
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>Konfirmasi Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Ulangi kata sandi baru"
                    className="field-input-box"
                    value={konfirmasiPasswordBaru}
                    onChange={(e) => setKonfirmasiPasswordBaru(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={onKeluar}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    🚪 Keluar dari Akun (Logout)
                  </button>

                  <button
                    type="submit"
                    style={{ background: '#8b1e1e', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Simpan Kata Sandi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
