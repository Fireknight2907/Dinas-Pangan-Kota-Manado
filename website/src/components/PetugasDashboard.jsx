// ===================================================================================
// MODUL ANTARMUKA DASHBOARD PETUGAS DINAS PANGAN KOTA MANADO (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Pemerintah Kota Manado
// Mengimplementasikan Role-Based Access Control (RBAC) ketat:
// 1. Admin : Menu Edit User, Master Pasar & Wilayah, Dashboard, Menu Cek GPM
// 2. Kabid : Laporan Khusus Bidang, Menu Verif Harga Pangan, Dashboard, Menu Kelola GPM
// 3. Staf  : Menu Kelola GPM, Dashboard, Menu Input Data Pangan
// 4. Kadis : Dashboard Eksekutif, Laporan GPM, Grafik Pangan (Tren Fluktuasi)
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { penggunaService } from '../services/PenggunaService';
import { hargaPanganService } from '../services/HargaPanganService';
import { laporanService } from '../services/LaporanService';
import PetugasGPMManager from './PetugasGPMManager';
import './PetugasDashboard.css';

export default function PetugasDashboard({ pengguna, onKeluar }) {
  // ─────────────────────────────────────────────
  // 1. IDENTIFIKASI PERAN & AKSES RESMI (OOP)
  // ─────────────────────────────────────────────
  const peran = penggunaService.normalisasiPeran(pengguna?.peran);
  const daftarMenuResmi = penggunaService.ambilDaftarMenu(peran);

  // Menu aktif awal diarahkan ke menu pertama yang diizinkan (default: 'dashboard')
  const [menuAktif, setMenuAktif] = useState(daftarMenuResmi[0]?.id || 'dashboard');
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false);

  // Data Dashboard Utama
  const [statsDashboard, setStatsDashboard] = useState({
    harga_ditetapkan: 0,
    draft_harga: 0,
    gpm_terjadwal: 2,
    gpm_selesai: 1
  });
  const [daftarHarga, setDaftarHarga] = useState([]);
  const [daftarPasar, setDaftarPasar] = useState([]);
  const [daftarKecamatan, setDaftarKecamatan] = useState([]);

  // Form Input Harga (Khusus Staf)
  const [formHarga, setFormHarga] = useState({
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan: 'kg',
    harga: '',
    nama_pasar: '',
    status: 'Draft'
  });
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [pesanNotifikasi, setPesanNotifikasi] = useState('');

  // Notifikasi Sistem
  const [daftarNotif, setDaftarNotif] = useState([]);
  const [tampilkanNotifDropdown, setTampilkanNotifDropdown] = useState(false);

  // Profil Pribadi & Ganti Sandi Mandiri
  const [tampilkanModalProfil, setTampilkanModalProfil] = useState(false);
  const [userState, setUserState] = useState(pengguna || {});
  const [inputFotoUrl, setInputFotoUrl] = useState(pengguna?.foto_profil || '');
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPasswordBaru, setKonfirmasiPasswordBaru] = useState('');
  const [pesanProfil, setPesanProfil] = useState({ tipe: '', teks: '' });

  // Master Data Pasar & Wilayah (Khusus Admin)
  const [inputPasarBaru, setInputPasarBaru] = useState('');
  const [inputKecamatanBaru, setInputKecamatanBaru] = useState('');

  // Kelola Pengguna (Khusus Admin)
  const [daftarPengguna, setDaftarPengguna] = useState([]);
  const [formUserBaru, setFormUserBaru] = useState({
    nama: '',
    username: '',
    email: '',
    peran: 'Staf',
    bidang: 'Dinas Pangan Kota Manado',
    kata_sandi: ''
  });

  // Modal Hard Reset Password oleh Admin (Admin tidak melihat kata sandi lama)
  const [modalResetAdmin, setModalResetAdmin] = useState({
    buka: false,
    userTarget: null,
    sandiBaru: '',
    konfirmasiSandi: '',
    pesan: ''
  });

  // Modal Edit Username oleh Admin
  const [modalEditUsername, setModalEditUsername] = useState({
    buka: false,
    userTarget: null,
    usernameBaru: '',
    pesan: ''
  });

  // State Grafik Pangan (Khusus Kadis)
  const [komoditasTren, setKomoditasTren] = useState('Beras Medium');
  const [periodeTren, setPeriodeTren] = useState('7hari');
  const [pasarTren, setPasarTren] = useState('Semua');
  const [dataTren, setDataTren] = useState(null);

  // ─────────────────────────────────────────────
  // 2. SIKLUS HIDUP & PEMUATAN DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataDashboard();
    muatMasterData();
    muatNotifikasi();

    if (peran === 'Kadis') {
      const tren = laporanService.ambilDataTrenKomoditas(komoditasTren, periodeTren, pasarTren);
      setDataTren(tren);
    }
  }, [peran]);

  useEffect(() => {
    if (peran === 'Kadis') {
      const tren = laporanService.ambilDataTrenKomoditas(komoditasTren, periodeTren, pasarTren);
      setDataTren(tren);
    }
  }, [komoditasTren, periodeTren, pasarTren]);

  const muatDataDashboard = async () => {
    try {
      const stats = await hargaPanganService.ambilStatistikDashboard();
      setStatsDashboard(stats);

      const items = await hargaPanganService.ambilSemua();
      setDaftarHarga(items);
    } catch (error) {
      console.error('Gagal memuat data dashboard:', error);
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

    if (peran === 'Admin') {
      const users = penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
    }
  };

  const muatNotifikasi = () => {
    const notifs = hargaPanganService.ambilNotifikasi();
    setDaftarNotif(notifs);
  };

  const tampilkanPesan = (teks) => {
    setPesanNotifikasi(teks);
    setTimeout(() => setPesanNotifikasi(''), 4500);
  };

  // ─────────────────────────────────────────────
  // 3. LOGIKA HARGA PANGAN & VERIFIKASI (KABID & STAF)
  // ─────────────────────────────────────────────
  // Staf: Menyimpan harga komoditas (bisa Draft untuk diajukan ke Kabid atau Terbit)
  const handleSimpanHarga = async (e, statusBaru = 'Draft') => {
    if (e) e.preventDefault();

    if (!formHarga.nama_komoditas.trim() || !formHarga.harga) {
      alert('Nama jenis pangan dan besaran harga wajib diisi!');
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

      tampilkanPesan(statusBaru === 'Terbit'
        ? '✅ Harga komoditas berhasil diterbitkan ke halaman publik!'
        : '📝 Data harga disimpan sebagai draf dan siap diajukan ke Kepala Bidang untuk diverifikasi!');

      // Reset form
      setFormHarga({
        nama_komoditas: '',
        kategori: 'Bahan Pokok',
        satuan: 'kg',
        harga: '',
        nama_pasar: daftarPasar[0] || 'Pasar Bersehati Karombasan',
        status: 'Draft'
      });

      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menyimpan harga: ' + error.message);
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Kabid: Verifikasi harga (Draft -> Terbit atau sebaliknya)
  const handleVerifikasiHarga = async (item, statusBaru) => {
    try {
      await hargaPanganService.perbarui(item.id, { status: statusBaru });
      tampilkanPesan(statusBaru === 'Terbit' 
        ? `✅ Komoditas "${item.nama_komoditas}" telah diverifikasi dan resmi terbit ke publik!`
        : `ℹ️ Status komoditas "${item.nama_komoditas}" dikembalikan ke Draft.`);
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal memperbarui status: ' + error.message);
    }
  };

  const handleHapusHarga = async (id, nama) => {
    if (window.confirm(`Hapus pencatatan harga komoditas "${nama}"?`)) {
      try {
        await hargaPanganService.hapus(id);
        tampilkanPesan(`Data "${nama}" berhasil dihapus.`);
        await muatDataDashboard();
      } catch (error) {
        alert('Gagal menghapus data: ' + error.message);
      }
    }
  };

  // ─────────────────────────────────────────────
  // 4. LOGIKA MASTER PASAR & WILAYAH (KHUSUS ADMIN)
  // ─────────────────────────────────────────────
  const handleTambahPasar = (e) => {
    e.preventDefault();
    if (!inputPasarBaru.trim()) return;
    try {
      const updated = hargaPanganService.tambahPasar(inputPasarBaru.trim());
      setDaftarPasar(updated);
      setInputPasarBaru('');
      tampilkanPesan(`✅ Pasar "${inputPasarBaru.trim()}" berhasil ditambahkan ke master data.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusPasar = (nama) => {
    if (window.confirm(`Hapus pasar "${nama}" dari daftar master?`)) {
      const updated = hargaPanganService.hapusPasar(nama);
      setDaftarPasar(updated);
      tampilkanPesan(`Pasar "${nama}" telah dihapus.`);
    }
  };

  const handleTambahKecamatan = (e) => {
    e.preventDefault();
    if (!inputKecamatanBaru.trim()) return;
    try {
      const updated = hargaPanganService.tambahKecamatan(inputKecamatanBaru.trim());
      setDaftarKecamatan(updated);
      setInputKecamatanBaru('');
      tampilkanPesan(`✅ Kecamatan "${inputKecamatanBaru.trim()}" berhasil ditambahkan.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusKecamatan = (nama) => {
    if (window.confirm(`Hapus kecamatan "${nama}" dari daftar master?`)) {
      const updated = hargaPanganService.hapusKecamatan(nama);
      setDaftarKecamatan(updated);
      tampilkanPesan(`Kecamatan "${nama}" telah dihapus.`);
    }
  };

  // ─────────────────────────────────────────────
  // 5. LOGIKA KELOLA PENGGUNA (KHUSUS ADMIN)
  // ─────────────────────────────────────────────
  const handleTambahUserBaru = (e) => {
    e.preventDefault();
    try {
      penggunaService.adminTambahPengguna(userState.id, formUserBaru);
      setFormUserBaru({
        nama: '',
        username: '',
        email: '',
        peran: 'Staf',
        bidang: 'Dinas Pangan Kota Manado',
        kata_sandi: ''
      });
      const users = penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan('✅ Pengguna baru berhasil didaftarkan ke sistem!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUbahPeranUser = (idTarget, peranBaru) => {
    try {
      penggunaService.adminUbahPeran(userState.id, idTarget, peranBaru);
      const users = penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan('✅ Peran pengguna berhasil diperbarui.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusUser = (idTarget, nama) => {
    if (window.confirm(`Hapus akun pengguna "${nama}" secara permanen?`)) {
      try {
        penggunaService.adminHapusPengguna(userState.id, idTarget);
        const users = penggunaService.ambilSemuaPengguna();
        setDaftarPengguna(users);
        tampilkanPesan(`Akun pengguna "${nama}" telah dihapus.`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Eksekusi Hard Reset Password oleh Admin
  const handleEksekusiResetAdmin = (e) => {
    e.preventDefault();
    if (!modalResetAdmin.sandiBaru || modalResetAdmin.sandiBaru.length < 8) {
      setModalResetAdmin(prev => ({ ...prev, pesan: 'Kata sandi baru minimal 8 karakter!' }));
      return;
    }
    if (modalResetAdmin.sandiBaru !== modalResetAdmin.konfirmasiSandi) {
      setModalResetAdmin(prev => ({ ...prev, pesan: 'Konfirmasi kata sandi tidak cocok!' }));
      return;
    }

    try {
      penggunaService.adminResetPassword(userState.id, modalResetAdmin.userTarget.id, modalResetAdmin.sandiBaru);
      tampilkanPesan(`✅ Kata sandi untuk @${modalResetAdmin.userTarget.username} berhasil di-reset.`);
      setModalResetAdmin({ buka: false, userTarget: null, sandiBaru: '', konfirmasiSandi: '', pesan: '' });
    } catch (err) {
      setModalResetAdmin(prev => ({ ...prev, pesan: err.message }));
    }
  };

  // Eksekusi Ubah Username oleh Admin
  const handleEksekusiUbahUsername = (e) => {
    e.preventDefault();
    if (!modalEditUsername.usernameBaru.trim()) {
      setModalEditUsername(prev => ({ ...prev, pesan: 'Username baru tidak boleh kosong!' }));
      return;
    }

    try {
      penggunaService.adminUbahUsername(userState.id, modalEditUsername.userTarget.id, modalEditUsername.usernameBaru.trim());
      const users = penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan(`✅ Username berhasil diperbarui menjadi @${modalEditUsername.usernameBaru.trim()}`);
      setModalEditUsername({ buka: false, userTarget: null, usernameBaru: '', pesan: '' });
    } catch (err) {
      setModalEditUsername(prev => ({ ...prev, pesan: err.message }));
    }
  };

  // ─────────────────────────────────────────────
  // 6. PROFIL PRIBADI & GANTI KATA SANDI MANDIRI
  // ─────────────────────────────────────────────
  const handleSimpanFotoProfil = () => {
    try {
      penggunaService.ubahFotoProfil(userState.id, inputFotoUrl);
      setUserState(prev => ({ ...prev, foto_profil: inputFotoUrl }));
      setPesanProfil({ tipe: 'sukses', teks: '✅ Foto profil berhasil diperbarui!' });
      setTimeout(() => setPesanProfil({ tipe: '', teks: '' }), 3000);
    } catch (e) {
      setPesanProfil({ tipe: 'error', teks: e.message });
    }
  };

  const handleSimpanPasswordPribadi = (e) => {
    e.preventDefault();
    if (!passwordBaru || passwordBaru.length < 8) {
      setPesanProfil({ tipe: 'error', teks: '⚠️ Kata sandi baru minimal 8 karakter!' });
      return;
    }
    if (passwordBaru !== konfirmasiPasswordBaru) {
      setPesanProfil({ tipe: 'error', teks: '⚠️ Konfirmasi kata sandi baru tidak cocok!' });
      return;
    }

    try {
      penggunaService.ubahKataSandiPribadi(userState.id, passwordLama, passwordBaru);
      setPasswordLama('');
      setPasswordBaru('');
      setKonfirmasiPasswordBaru('');
      setPesanProfil({ tipe: 'sukses', teks: '✅ Kata sandi Anda berhasil diperbarui.' });
      setTimeout(() => setPesanProfil({ tipe: '', teks: '' }), 4000);
    } catch (err) {
      setPesanProfil({ tipe: 'error', teks: `⚠️ ${err.message}` });
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(angka).replace('IDR', 'Rp');
  };

  const rekapitulasiGPMList = laporanService.ambilRekapitulasiGPM();
  const daftarDraftVerifikasi = daftarHarga.filter(item => item.status === 'Draft');

  return (
    <div className="petugas-app-layout">
      {/* ─────────────────────────────────────────────
          7. SIDEBAR NAVIGASI BERDASARKAN ROLE RESMI
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
          {daftarMenuResmi.map((menu) => (
            <button
              key={menu.id}
              className={`sidebar-nav-btn ${menuAktif === menu.id ? 'active' : ''}`}
              onClick={() => {
                setMenuAktif(menu.id);
                setSidebarTerbuka(false);
              }}
            >
              <span className="nav-icon">{menu.icon}</span>
              <span className="nav-label">{menu.label}</span>
            </button>
          ))}
        </nav>

        {/* Tombol Logout di Bawah Sidebar */}
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
          8. TOP BAR HEADER
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
                Masuk Sebagai: <strong>{userState.nama || 'Petugas'}</strong> (Role: <span style={{ color: '#8b1e1e', fontWeight: 700 }}>{peran}</span>)
              </p>
            </div>
          </div>

          <div className="top-bar-right" style={{ position: 'relative' }}>
            {/* Lonceng Notifikasi */}
            <div 
              className="notification-bell-btn"
              onClick={() => setTampilkanNotifDropdown(!tampilkanNotifDropdown)}
              title="Notifikasi Aktivitas"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {daftarNotif.some(n => !n.dibaca) && <span className="notif-red-dot" />}
            </div>

            {/* Dropdown Notifikasi */}
            {tampilkanNotifDropdown && (
              <div style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '320px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 50,
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Pemberitahuan Sistem</strong>
                  <button 
                    onClick={() => {
                      const updated = hargaPanganService.tandaiSemuaDibaca();
                      setDaftarNotif(updated);
                    }}
                    style={{ background: 'none', border: 'none', color: '#8b1e1e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Tandai Dibaca
                  </button>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {daftarNotif.map(n => (
                    <div key={n.id} style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{n.judul}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{n.pesan}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{n.waktu}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avatar Pill & Pengaturan Akun */}
            <div 
              className="staff-profile-pill" 
              onClick={() => setTampilkanModalProfil(true)}
              style={{ cursor: 'pointer' }}
              title="Klik untuk profil & kata sandi pribadi"
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

        {pesanNotifikasi && (
          <div className="petugas-alert-bar">
            {pesanNotifikasi}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            9. VIEW 1: DASHBOARD (SEMUA ROLE)
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">
                Dasbor {peran} — Bidang Cadangan & Distribusi Pangan
              </h1>
              <p className="dashboard-main-subheading">
                Sistem Informasi Terpadu Dinas Pangan Kota Manado — Pemantauan stabilitas pasokan komoditas dan Gerakan Pangan Murah
              </p>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white">
                <div className="stat-icon-square icon-pink">🏷️</div>
                <div className="stat-number-big">{statsDashboard.harga_ditetapkan}</div>
                <div className="stat-title-label">Harga Terbit</div>
                <div className="stat-caption-sub">tampil ke masyarakat</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-amber">📝</div>
                <div className="stat-number-big">{daftarDraftVerifikasi.length}</div>
                <div className="stat-title-label">Draf Menunggu Verifikasi</div>
                <div className="stat-caption-sub">verifikasi Kepala Bidang</div>
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
                <div className="stat-title-label">GPM Terlaksana</div>
                <div className="stat-caption-sub">kuota tersalurkan</div>
              </div>
            </div>

            {/* Quick Access Card Dinamis Berdasarkan Role */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '14px' }}>
                Pintasan Menu Utama {peran}:
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {/* Admin Quick Cards */}
                {peran === 'Admin' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-user')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>👥 Menu Kelola Pengguna</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Kelola nama pengguna, atur ulang kata sandi pengguna lain, dan atur peran sistem.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('master-data')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🏛️ Master Pasar & Wilayah</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Atur daftar pasar resmi dan wilayah kecamatan di Kota Manado.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('cek-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🔍 Menu Cek GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Supervisi jadwal, titik peta lokasi, dan pendaftar Gerakan Pangan Murah.</p>
                    </div>
                  </>
                )}

                {/* Kabid Quick Cards */}
                {peran === 'Kabid' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('verif-harga')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>✅ Menu Verifikasi Harga Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Tinjau dan setujui usulan harga pasar yang dimasukkan oleh staf lapangan.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🎟️ Menu Kelola GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Atur titik koordinat peta lokasi dan penetapan kuota komoditas murah.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📑 Laporan Bidang Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cetak laporan resmi distribusi dan cadangan pangan Pemerintah Kota Manado.</p>
                    </div>
                  </>
                )}

                {/* Staf Quick Cards */}
                {peran === 'Staf' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('input-harga')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📝 Menu Masukan Data Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Masukan harga komoditas terkini dari pasar tradisional untuk diajukan verifikasi.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🎟️ Menu Kelola GPM & Pindai QR</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Operasional lapangan, verifikasi tiket QR warga penerima manfaat kupon pangan.</p>
                    </div>
                  </>
                )}

                {/* Kadis Quick Cards */}
                {peran === 'Kadis' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('grafik-pangan')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📈 Grafik Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pantau tren fluktuasi harga komoditas (7 hari, 30 hari, 3 bulan) di pasar Manado.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📋 Laporan GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Rekapitulasi pencapaian kuota pangan dan serapan program Gerakan Pangan Murah.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            10. VIEW 2: MENU INPUT DATA PANGAN (KHUSUS STAF)
            ───────────────────────────────────────────── */}
        {menuAktif === 'input-harga' && peran === 'Staf' && (
          <div className="tetapkan-harga-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">Menu Masukan Data Pangan</h1>
              <p className="dashboard-main-subheading">
                Petugas staf memasukan pencatatan harga pangan acuan pasar terkini untuk diajukan ke Kepala Bidang.
              </p>
            </div>

            <div className="tetapkan-content-columns">
              <div className="tetapkan-form-card">
                <h3 className="form-card-heading">Formulir Masukan Data Komoditas</h3>
                <form onSubmit={(e) => handleSimpanHarga(e, 'Draft')} className="price-entry-form">
                  <div className="form-field-group">
                    <label className="field-label-text">Nama Komoditas / Jenis Pangan</label>
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
                      >
                      </input>
                    </div>
                  </div>

                  <div className="form-two-cols-row">
                    <div className="form-field-group">
                      <label className="field-label-text">Harga Acuan (Rp)</label>
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

                    <div className="form-field-group">
                      <label className="field-label-text">Pilihan Pasar Terdaftar</label>
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
                    <button type="submit" className="btn-simpan-draft" disabled={sedangMenyimpan}>
                      <span>{sedangMenyimpan ? 'Menyimpan...' : 'Ajukan Verifikasi (Simpan Draf)'}</span>
                    </button>
                    <button type="button" className="btn-terbitkan-masyarakat" onClick={(e) => handleSimpanHarga(e, 'Terbit')} disabled={sedangMenyimpan}>
                      Terbitkan Langsung ke Publik
                    </button>
                  </div>
                </form>
              </div>

              {/* Riwayat Data Masukan Staf */}
              <div className="tetapkan-list-card">
                <h3 className="list-card-heading">Daftar Data Komoditas Dimasukkan</h3>
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
                          <span className={`badge-status-pill ${item.status === 'Draft' ? 'status-draft' : 'status-terbit'}`}>
                            {item.status === 'Draft' ? 'Draf' : (item.status || 'Terbit')}
                          </span>
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
            11. VIEW 3: MENU VERIF HARGA PANGAN (KHUSUS KABID)
            ───────────────────────────────────────────── */}
        {menuAktif === 'verif-harga' && peran === 'Kabid' && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">Menu Verifikasi Harga Pangan</h1>
              <p className="dashboard-main-subheading">
                Kewenangan Kepala Bidang Cadangan & Distribusi Pangan untuk memverifikasi usulan harga staf sebelum tampil ke publik.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#8b1e1e', fontSize: '1.05rem' }}>
                  ⏳ Usulan Harga Menunggu Verifikasi ({daftarDraftVerifikasi.length})
                </h3>
              </div>

              {daftarDraftVerifikasi.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                  Semua usulan harga telah diverifikasi. Tidak ada data pending.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {daftarDraftVerifikasi.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '1rem', color: '#92400e' }}>{item.nama_komoditas}</strong>
                        <span style={{ fontSize: '0.85rem', color: '#b45309', marginLeft: '8px' }}>({item.kategori})</span>
                        <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '4px' }}>
                          Pasar: <strong>{item.nama_pasar}</strong> · Satuan: {item.satuan} · Tanggal: {item.tanggal_penetapan}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
                          {formatRupiah(item.harga)}
                        </div>
                        <button
                          onClick={() => handleVerifikasiHarga(item, 'Terbit')}
                          style={{
                            background: '#166534',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          ✓ Setujui & Terbitkan
                        </button>
                        <button
                          onClick={() => handleHapusHarga(item.id, item.nama_komoditas)}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riwayat Data Terverifikasi */}
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '1.05rem' }}>
                ✅ Komoditas Resmi Terbit di Halaman Publik
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Komoditas</th>
                    <th style={{ padding: '10px' }}>Kategori</th>
                    <th style={{ padding: '10px' }}>Pasar</th>
                    <th style={{ padding: '10px' }}>Harga</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarHarga.filter(h => h.status === 'Terbit').map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                      <td style={{ padding: '10px' }}>{h.kategori}</td>
                      <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(h.harga)}/{h.satuan}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                          Terbit
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleVerifikasiHarga(h, 'Draft')}
                          style={{ background: 'none', border: 'none', color: '#d97706', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, marginRight: '8px' }}
                        >
                          Tarik ke Draft
                        </button>
                        <button
                          onClick={() => handleHapusHarga(h.id, h.nama_komoditas)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            12. VIEW 4: MENU KELOLA GPM (KABID & STAF)
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-gpm' && (peran === 'Kabid' || peran === 'Staf') && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Menu Kelola Gerakan Pangan Murah (GPM)</h1>
            <p className="dashboard-main-subheading">
              Pengelolaan jadwal pelaksanaan, koordinat titik lokasi peta Kota Manado, serta pemindaian tiket QR Code masyarakat.
            </p>
            <div style={{ marginTop: '20px' }}>
              <PetugasGPMManager
                token={penggunaService.ambilToken()}
                pengguna={userState}
              />
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            13. VIEW 5: MENU CEK GPM (KHUSUS ADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'cek-gpm' && peran === 'Admin' && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Menu Cek GPM (Supervisi Administrator)</h1>
            <p className="dashboard-main-subheading">
              Inspeksi agenda Gerakan Pangan Murah, monitoring kuota beras & minyak terpakai, dan pemantauan data pendaftar warga.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {rekapitulasiGPMList.map((gpm) => (
                <div key={gpm.id} style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 800, 
                      padding: '3px 8px', 
                      borderRadius: '4px',
                      background: gpm.status === 'Selesai' ? '#dcfce7' : '#eff6ff',
                      color: gpm.status === 'Selesai' ? '#166534' : '#1e40af'
                    }}>
                      {gpm.status}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>📅 {gpm.tanggal}</span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#8b1e1e' }}>{gpm.nama_acara}</h3>
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#475569' }}>📍 {gpm.lokasi}</p>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span>Kapasitas Kuota:</span>
                      <strong>{gpm.target_kuota} KK</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span>Warga Terdaftar:</span>
                      <strong>{gpm.terdaftar} Warga</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span>Tingkat Keterlayanan:</span>
                      <strong style={{ color: gpm.status === 'Selesai' ? '#166534' : '#d97706' }}>
                        {gpm.status === 'Selesai' ? `${Math.round((gpm.terlayani / gpm.terdaftar) * 100)}%` : 'Dalam Proses'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem' }}>
                    <strong>Komoditas Tersedia:</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#475569' }}>
                      {gpm.komoditas_tersalurkan.map((k, i) => (
                        <li key={i}>{k.nama} — Kuota: {k.jumlah}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            14. VIEW 6: LAPORAN KHUSUS BIDANG (KHUSUS KABID)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan' && peran === 'Kabid' && (
          <div className="dashboard-page-container" id="area-laporan-resmi">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h1 className="dashboard-main-heading">📑 Laporan Resmi Bidang Cadangan & Distribusi Pangan</h1>
                <p className="dashboard-main-subheading">
                  Rekapitulasi penetapan harga komoditas acuan pasar Pemerintah Kota Manado.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => laporanService.eksporLaporanHargaCSV(daftarHarga)}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  📥 Unduh CSV (Excel)
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#8b1e1e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  🖨️ Cetak Dokumen PDF
                </button>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '14px', marginBottom: '18px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#8b1e1e', letterSpacing: '0.5px' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                <h4 style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#334155' }}>BIDANG CADANGAN DAN DISTRIBUSI PANGAN</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Laporan Berkala Pemantauan Harga Bahan Pokok & Komoditas Pangan Pasar Tradisional
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>No.</th>
                    <th style={{ padding: '10px' }}>Nama Komoditas</th>
                    <th style={{ padding: '10px' }}>Kategori</th>
                    <th style={{ padding: '10px' }}>Nama Pasar</th>
                    <th style={{ padding: '10px' }}>Harga Acuan</th>
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
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          background: h.status === 'Draft' ? '#fef3c7' : '#dcfce7', 
                          color: h.status === 'Draft' ? '#92400e' : '#166534' 
                        }}>
                          {h.status === 'Draft' ? 'Draf' : (h.status || 'Terbit')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                <div style={{ width: '280px' }}>
                  <div>Manado, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Bidang Cadangan & Distribusi Pangan</div>
                  <div style={{ height: '70px' }}></div>
                  <div style={{ fontWeight: 800, textDecoration: 'underline' }}>{userState.nama || 'Mareta'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NIP. 19850412 201001 2 003</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            15. VIEW 7: MASTER PASAR & WILAYAH (KHUSUS ADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'master-data' && peran === 'Admin' && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">🏛️ Master Pasar dan Wilayah</h1>
            <p className="dashboard-main-subheading">
              Administrator mengelola referensi nama pasar dan wilayah kecamatan agar staf hanya dapat memilih data yang telah disahkan.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {/* Master Pasar */}
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

              {/* Master Kecamatan */}
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
            16. VIEW 8: MENU EDIT USER (KHUSUS ADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-user' && peran === 'Admin' && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">👥 Menu Kelola Pengguna & Manajemen Akses (Admin)</h1>
            <p className="dashboard-main-subheading">
              Khusus Administrator: Anda dapat mengganti nama pengguna, mengubah peran pengguna, dan melakukan atur ulang kata sandi tanpa melihat kata sandi lama pengguna.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {/* Form Tambah Pengguna Baru */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>➕ Tambah Akun Pengguna Baru</h3>
                <form onSubmit={handleTambahUserBaru} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama pegawai / pejabat"
                      className="field-input-box"
                      value={formUserBaru.nama}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, nama: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Pengguna (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="nama pengguna (tanpa spasi)"
                      className="field-input-box"
                      value={formUserBaru.username}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Peran Kedinasan (Hak Akses)</label>
                    <select
                      className="field-select-box"
                      value={formUserBaru.peran}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, peran: e.target.value })}
                    >
                      <option value="Staf">Staf (Masukan Data Pangan & Kelola GPM)</option>
                      <option value="Kabid">Kabid (Laporan Bidang & Verifikasi Harga)</option>
                      <option value="Admin">Admin (Kelola Pengguna, Master Wilayah, Cek GPM)</option>
                      <option value="Kadis">Kadis (Grafik Pangan & Laporan GPM)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                      Kata Sandi Awal (Min. 8 Karakter)
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

              {/* Daftar Akun Terdaftar & Aksi Admin */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>📋 Daftar Akun Terdaftar di Sistem</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {daftarPengguna.map((u) => (
                    <div key={u.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{u.nama}</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '6px' }}>@{u.username}</span>
                        </div>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          background: u.peran === 'Admin' ? '#fdf2f8' : u.peran === 'Kabid' ? '#fef3c7' : u.peran === 'Kadis' ? '#f0fdf4' : '#eff6ff',
                          color: u.peran === 'Admin' ? '#9d174d' : u.peran === 'Kabid' ? '#92400e' : u.peran === 'Kadis' ? '#166534' : '#1e40af'
                        }}>
                          {u.peran}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        {/* Ubah Peran */}
                        <select
                          value={u.peran}
                          onChange={(e) => handleUbahPeranUser(u.id, e.target.value)}
                          style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
                        >
                          <option value="Staf">Peran Staf</option>
                          <option value="Kabid">Peran Kabid</option>
                          <option value="Admin">Peran Admin</option>
                          <option value="Kadis">Peran Kadis</option>
                        </select>

                        {/* Tombol Ubah Nama Pengguna */}
                        <button
                          onClick={() => setModalEditUsername({ buka: true, userTarget: u, usernameBaru: u.username, pesan: '' })}
                          style={{
                            background: '#e2e8f0',
                            color: '#334155',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Ganti nama pengguna akun ini"
                        >
                          ✏️ Ganti Nama Pengguna
                        </button>

                        {/* Tombol Atur Ulang Kata Sandi */}
                        <button
                          onClick={() => setModalResetAdmin({ buka: true, userTarget: u, sandiBaru: '', konfirmasiSandi: '', pesan: '' })}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Admin mengatur ulang kata sandi tanpa bisa melihat kata sandi lama"
                        >
                          🔒 Atur Ulang Sandi
                        </button>

                        {/* Tombol Hapus (Kecuali diri sendiri) */}
                        {u.id !== userState.id && (
                          <button
                            onClick={() => handleHapusUser(u.id, u.nama)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            17. VIEW 9: GRAFIK PANGAN (KHUSUS KADIS)
            ───────────────────────────────────────────── */}
        {menuAktif === 'grafik-pangan' && peran === 'Kadis' && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">📈 Analisis Grafik & Tren Harga Pangan (Kepala Dinas)</h1>
              <p className="dashboard-main-subheading">
                Visualisasi dinamika pergerakan dan stabilitas harga komoditas pangan pokok di pasar-pasar Kota Manado.
              </p>
            </div>

            {/* Filter Komoditas & Periode */}
            <div style={{ background: '#ffffff', padding: '18px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Komoditas</label>
                <select
                  value={komoditasTren}
                  onChange={(e) => setKomoditasTren(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                >
                  <option value="Beras Medium">Beras Medium</option>
                  <option value="Beras Premium">Beras Premium</option>
                  <option value="Minyak Goreng Kemasan">Minyak Goreng Kemasan</option>
                  <option value="Gula Pasir">Gula Pasir</option>
                  <option value="Telur Ayam">Telur Ayam</option>
                  <option value="Daging Ayam">Daging Ayam</option>
                  <option value="Daging Sapi">Daging Sapi</option>
                  <option value="Bawang Merah">Bawang Merah</option>
                  <option value="Bawang Putih">Bawang Putih</option>
                  <option value="Cabai Rawit">Cabai Rawit</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Rentang Waktu</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['7hari', '30hari', '3bulan'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodeTren(p)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: periodeTren === p ? '#8b1e1e' : '#f8fafc',
                        color: periodeTren === p ? '#ffffff' : '#334155',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.82rem'
                      }}
                    >
                      {p === '7hari' ? '7 Hari Terakhir' : p === '30hari' ? '30 Hari Terakhir' : '3 Bulan'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrik Statistik Tren */}
            {dataTren && (
              <>
                <div className="dashboard-stat-cards-grid" style={{ marginBottom: '24px' }}>
                  <div className="stat-card-white">
                    <div className="stat-title-label">Harga Terkini</div>
                    <div className="stat-number-big" style={{ color: '#8b1e1e' }}>{formatRupiah(dataTren.hargaTerkini)}</div>
                    <div className="stat-caption-sub">acuan saat ini</div>
                  </div>

                  <div className="stat-card-white">
                    <div className="stat-title-label">Rata-rata Harga</div>
                    <div className="stat-number-big">{formatRupiah(dataTren.rataRata)}</div>
                    <div className="stat-caption-sub">selama periode terpilih</div>
                  </div>

                  <div className="stat-card-white">
                    <div className="stat-title-label">Rentang Fluktuasi</div>
                    <div className="stat-number-big" style={{ fontSize: '1.25rem', marginTop: '6px' }}>
                      {formatRupiah(dataTren.hargaTerendah)} - {formatRupiah(dataTren.hargaTertinggi)}
                    </div>
                    <div className="stat-caption-sub">titik terendah s/d tertinggi</div>
                  </div>

                  <div className="stat-card-white">
                    <div className="stat-title-label">Status Tren</div>
                    <div className="stat-number-big" style={{ 
                      color: dataTren.statusTren === 'Naik' ? '#dc2626' : dataTren.statusTren === 'Turun' ? '#166534' : '#2563eb',
                      fontSize: '1.4rem'
                    }}>
                      {dataTren.statusTren === 'Naik' ? '▲ Naik' : dataTren.statusTren === 'Turun' ? '▼ Turun' : '▬ Stabil'}
                    </div>
                    <div className="stat-caption-sub">selisih {formatRupiah(dataTren.selisih)} ({dataTren.persentase}%)</div>
                  </div>
                </div>

                {/* Visualisasi Grafik Tren Interaktif */}
                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.05rem' }}>
                    Pergerakan Harga Komoditas: {dataTren.namaKomoditas}
                  </h3>

                  <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '20px 10px 10px 10px', background: '#f8fafc', borderRadius: '8px', borderBottom: '2px solid #cbd5e1' }}>
                    {dataTren.titikData.map((titik, idx) => {
                      const rasio = (titik.harga - dataTren.hargaTerendah * 0.9) / (dataTren.hargaTertinggi - dataTren.hargaTerendah * 0.9 || 1);
                      const tinggiPersen = Math.max(25, Math.min(100, Math.round(rasio * 100)));
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8b1e1e', marginBottom: '6px' }}>
                            {formatRupiah(titik.harga)}
                          </span>
                          <div 
                            style={{ 
                              width: '100%', 
                              maxWidth: '48px', 
                              height: `${tinggiPersen}%`, 
                              background: 'linear-gradient(180deg, #8b1e1e 0%, #b91c1c 100%)', 
                              borderRadius: '6px 6px 0 0',
                              transition: 'all 0.3s ease'
                            }} 
                            title={`${titik.tanggal}: ${formatRupiah(titik.harga)}`}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', fontWeight: 600 }}>
                            {titik.tanggal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            18. VIEW 10: LAPORAN GPM (KHUSUS KADIS)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan-gpm' && peran === 'Kadis' && (
          <div className="dashboard-page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h1 className="dashboard-main-heading">📋 Laporan Evaluasi Gerakan Pangan Murah (GPM)</h1>
                <p className="dashboard-main-subheading">
                  Laporan eksekutif untuk Kepala Dinas: Evaluasi serapan kuota pangan murah dan pemerataan distribusi di 11 Kecamatan.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                style={{
                  background: '#8b1e1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                🖨️ Cetak Rekapitulasi GPM
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e', fontSize: '1.05rem' }}>
                Realisasi Penyaluran Komoditas Gerakan Pangan Murah
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Nama Acara / Lokasi</th>
                    <th style={{ padding: '10px' }}>Wilayah Kecamatan</th>
                    <th style={{ padding: '10px' }}>Target Kuota</th>
                    <th style={{ padding: '10px' }}>Warga Mendaftar</th>
                    <th style={{ padding: '10px' }}>Warga Terlayani</th>
                    <th style={{ padding: '10px' }}>Status Acara</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapitulasiGPMList.map((gpm) => (
                    <tr key={gpm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>
                        <strong>{gpm.nama_acara}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{gpm.lokasi}</div>
                      </td>
                      <td style={{ padding: '10px' }}>{gpm.kecamatan}</td>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{gpm.target_kuota} KK</td>
                      <td style={{ padding: '10px' }}>{gpm.terdaftar} Warga</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: gpm.terlayani > 0 ? '#166534' : '#64748b' }}>
                        {gpm.terlayani > 0 ? `${gpm.terlayani} KK` : '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          background: gpm.status === 'Selesai' ? '#dcfce7' : '#eff6ff', 
                          color: gpm.status === 'Selesai' ? '#166534' : '#1e40af' 
                        }}>
                          {gpm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '24px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <strong style={{ color: '#166534' }}>💡 Catatan Kebijakan Pimpinan:</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#14532d' }}>
                  Tingkat kehadiran masyarakat pada GPM terbukti mencapai 95.2% dari total kuota yang dialokasikan. Disarankan untuk menambah alokasi beras SPHP pada titik kecamatan pesisir dan kepulauan.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          19. MODAL KHUSUS ADMIN: HARD RESET PASSWORD
          Admin hanya memasukkan kata sandi baru (tanpa melihat kata sandi lama)
          ───────────────────────────────────────────── */}
      {modalResetAdmin.buka && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px'
          }}
          onClick={() => setModalResetAdmin({ buka: false, userTarget: null, sandiBaru: '', konfirmasiSandi: '', pesan: '' })}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#8b1e1e' }}>🔒 Hard Reset Kata Sandi (Admin)</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Target: <strong>{modalResetAdmin.userTarget?.nama}</strong> (@{modalResetAdmin.userTarget?.username})
            </p>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#475569', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
              ℹ️ Administrator hanya berhak menetapkan kata sandi baru. Demi privasi dan keamanan sistem, kata sandi lama tidak dapat dilihat.
            </div>

            {modalResetAdmin.pesan && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.82rem', marginBottom: '12px' }}>
                ⚠️ {modalResetAdmin.pesan}
              </div>
            )}

            <form onSubmit={handleEksekusiResetAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Kata Sandi Baru (Min. 8 Karakter)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Masukkan kata sandi baru"
                  className="field-input-box"
                  value={modalResetAdmin.sandiBaru}
                  onChange={(e) => setModalResetAdmin({ ...modalResetAdmin, sandiBaru: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Ulangi Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Konfirmasi kata sandi baru"
                  className="field-input-box"
                  value={modalResetAdmin.konfirmasiSandi}
                  onChange={(e) => setModalResetAdmin({ ...modalResetAdmin, konfirmasiSandi: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalResetAdmin({ buka: false, userTarget: null, sandiBaru: '', konfirmasiSandi: '', pesan: '' })}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#8b1e1e', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Terapkan Reset Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          20. MODAL KHUSUS ADMIN: UBAH USERNAME
          ───────────────────────────────────────────── */}
      {modalEditUsername.buka && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px'
          }}
          onClick={() => setModalEditUsername({ buka: false, userTarget: null, usernameBaru: '', pesan: '' })}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#8b1e1e' }}>✏️ Ubah Username Pengguna (Admin)</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Pengguna: <strong>{modalEditUsername.userTarget?.nama}</strong>
            </p>

            {modalEditUsername.pesan && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.82rem', marginBottom: '12px' }}>
                ⚠️ {modalEditUsername.pesan}
              </div>
            )}

            <form onSubmit={handleEksekusiUbahUsername} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Username Baru</label>
                <input
                  type="text"
                  required
                  placeholder="username baru"
                  className="field-input-box"
                  value={modalEditUsername.usernameBaru}
                  onChange={(e) => setModalEditUsername({ ...modalEditUsername, usernameBaru: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalEditUsername({ buka: false, userTarget: null, usernameBaru: '', pesan: '' })}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#8b1e1e', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Simpan Username
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          21. MODAL PRIBADI: PROFIL & GANTI KATA SANDI
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
              <h3 style={{ margin: 0, color: '#8b1e1e' }}>👤 Profil & Pengaturan Akun</h3>
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
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#8b1e1e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, overflow: 'hidden' }}>
                  {inputFotoUrl ? (
                    <img src={inputFotoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (userState.nama ? userState.nama.charAt(0) : 'P').toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="url"
                    placeholder="Tautan gambar / foto profil baru..."
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

            {/* Bagian Ganti Kata Sandi Mandiri */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>🔒 Ganti Kata Sandi Pribadi (Keamanan: Min. 8 Karakter)</h4>
              <form onSubmit={handleSimpanPasswordPribadi} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukan kata sandi lama"
                    className="field-input-box"
                    value={passwordLama}
                    onChange={(e) => setPasswordLama(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>Kata Sandi Baru (Min. 8 Karakter)</label>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2px' }}>Ulangi Kata Sandi Baru</label>
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
                    🚪 Keluar dari Akun
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
