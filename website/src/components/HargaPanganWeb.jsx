// ===================================================================================
// KOMPONEN TAMPILAN UTAMA: HARGA PANGAN KOTA MANADO (WEBSITE)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berdasarkan desain SIPATOKAAN (Gambar 1) dilengkapi Modul Input Data Staf
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { hargaPanganService } from '../services/HargaPanganService';
import GPMWeb from './GPMWeb';
import './HargaPanganWeb.css';

export default function HargaPanganWeb({ onBukaLogin }) {
  // ─────────────────────────────────────────────
  // 1. STATE MANAGEMENT
  // ─────────────────────────────────────────────
  
  // Tab Navigasi Aktif ('harga' | 'gpm')
  const [tabNavAktif, setTabNavAktif] = useState('harga');
  
  // Data komoditas harga pangan
  const [daftarKomoditas, setDaftarKomoditas] = useState([]);
  
  // Data statistik jumlah per kategori (untuk badge counter)
  const [statistik, setStatistik] = useState({
    Semua: 0,
    'Bahan Pokok': 0,
    Hewani: 0,
    Sayuran: 0,
    Buah: 0,
    Lainnya: 0
  });

  // State filter & pencarian
  const [kategoriAktif, setKategoriAktif] = useState('Semua');
  const [pencarian, setPencarian] = useState('');
  const [pasarDipilih, setPasarDipilih] = useState('Semua');
  const [daftarPasar, setDaftarPasar] = useState([]);

  // State loading & status
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanNotifikasi, setPesanNotifikasi] = useState('');

  // State Modal Tempat Isi Data Staf (CRUD)
  const [tampilkanModalStaf, setTampilkanModalStaf] = useState(false);
  const [modeEdit, setModeEdit] = useState(null); // null untuk tambah baru, atau ID komoditas
  const [formStaf, setFormStaf] = useState({
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan: 'KG',
    harga: '',
    nama_pasar: 'Pasar Bersehati Karombasan',
    tanggal_penetapan: new Date().toISOString().split('T')[0]
  });

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & PEMANGGILAN API
  // ─────────────────────────────────────────────
  
  // Memuat data saat komponen pertama kali dibuka atau filter berubah
  useEffect(() => {
    muatDataKomoditas();
  }, [kategoriAktif, pasarDipilih]);

  // Memuat data komoditas dari backend/Supabase
  const muatDataKomoditas = async () => {
    setSedangMemuat(true);
    try {
      const data = await hargaPanganService.ambilSemua(kategoriAktif, pasarDipilih, pencarian);
      setDaftarKomoditas(data);

      const stat = await hargaPanganService.ambilStatistik();
      setStatistik(stat);

      const pasar = await hargaPanganService.ambilDaftarPasar();
      setDaftarPasar(pasar);
    } catch (error) {
      console.error('Gagal memuat data:', error);
    } finally {
      setSedangMemuat(false);
    }
  };

  // Handler pencarian saat user menekan enter atau submit
  const handlePencarianSubmit = (e) => {
    e.preventDefault();
    muatDataKomoditas();
  };

  // ─────────────────────────────────────────────
  // 3. HANDLER OPERASI TEMPAT ISI DATA STAF (CRUD)
  // ─────────────────────────────────────────────
  
  // Membuka modal tambah baru
  const bukaModalTambah = () => {
    setModeEdit(null);
    setFormStaf({
      nama_komoditas: '',
      kategori: 'Bahan Pokok',
      satuan: 'KG',
      harga: '',
      nama_pasar: 'Pasar Bersehati Karombasan',
      tanggal_penetapan: new Date().toISOString().split('T')[0]
    });
    setTampilkanModalStaf(true);
  };

  // Membuka modal edit dengan data yang dipilih
  const bukaModalEdit = (item) => {
    setModeEdit(item.id);
    setFormStaf({
      nama_komoditas: item.nama_komoditas,
      kategori: item.kategori,
      satuan: item.satuan,
      harga: item.harga,
      nama_pasar: item.nama_pasar,
      tanggal_penetapan: item.tanggal_penetapan || new Date().toISOString().split('T')[0]
    });
    setTampilkanModalStaf(true);
  };

  // Menyimpan data (Insert atau Update)
  const handleSimpanDataStaf = async (e) => {
    e.preventDefault();
    try {
      if (modeEdit) {
        // Mode Perbarui / Update
        await hargaPanganService.perbarui(modeEdit, formStaf);
        tampilkanPesan('Data komoditas berhasil diperbarui!');
      } else {
        // Mode Tambah Baru
        await hargaPanganService.tambah(formStaf);
        tampilkanPesan('Data harga pangan baru berhasil disimpan ke sistem!');
      }
      setTampilkanModalStaf(false);
      muatDataKomoditas();
    } catch (err) {
      alert('Gagal menyimpan data: ' + err.message);
    }
  };

  // Menghapus data komoditas
  const handleHapusKomoditas = async (id, nama) => {
    if (window.confirm(`Yakin ingin menghapus harga untuk "${nama}"?`)) {
      try {
        await hargaPanganService.hapus(id);
        tampilkanPesan(`Data "${nama}" berhasil dihapus.`);
        muatDataKomoditas();
      } catch (err) {
        alert('Gagal menghapus: ' + err.message);
      }
    }
  };

  const tampilkanPesan = (pesan) => {
    setPesanNotifikasi(pesan);
    setTimeout(() => setPesanNotifikasi(''), 4000);
  };

  // Format rupiah
  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(angka).replace('IDR', 'Rp');
  };

  // Daftar kategori dengan label dan icon
  const daftarKategoriList = [
    { key: 'Semua', label: 'Semua', icon: '📋' },
    { key: 'Bahan Pokok', label: 'Bahan Pokok', icon: '' },
    { key: 'Hewani', label: 'Hewani', icon: '' },
    { key: 'Sayuran', label: 'Sayuran', icon: '🥬' },
    { key: 'Buah', label: 'Buah', icon: '🍊' },
    { key: 'Lainnya', label: 'Lainnya', icon: '' }
  ];

  return (
    <div className="sipatokean-page-wrapper">
      {/* ─────────────────────────────────────────────
          4. HEADER NAVIGASI (Sesuai Gambar 1)
          ───────────────────────────────────────────── */}
      <header className="sipatokean-navbar">
        <div className="navbar-left">
          {/* Logo SIPATOKAAN */}
          <div className="brand-logo-badge">
            <img src="/logodinaspangan.png" alt="Logo SIPATOKAAN" className="brand-logo-img" />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">SIPATOKAAN</h1>
            <p className="brand-subtitle">Dinas Pangan Kota Manado</p>
          </div>
        </div>

        {/* Tab Menu Header */}
        <nav className="navbar-menu">
          <button 
            className={`nav-tab ${tabNavAktif === 'harga' ? 'active' : ''}`}
            onClick={() => setTabNavAktif('harga')}
          >
            Harga Pangan
          </button>
          <button 
            className={`nav-tab ${tabNavAktif === 'gpm' ? 'active' : ''}`}
            onClick={() => setTabNavAktif('gpm')}
          >
            Gerakan pangan murah
          </button>
        </nav>

        {/* Tombol Aksi Kanan (Masuk Petugas) */}
        <div className="navbar-right">
          <button 
            className="btn-login-petugas"
            onClick={onBukaLogin}
            title="Masuk ke Portal Petugas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
            <span>Masuk Petugas</span>
          </button>
        </div>
      </header>

      {/* JIKA TAB GPM AKTIF, TAMPILKAN MODUL GPM PUBLIK */}
      {tabNavAktif === 'gpm' ? (
        <GPMWeb 
          onKembaliKeHarga={() => setTabNavAktif('harga')}
          onBukaLogin={onBukaLogin}
        />
      ) : (
        <>
          {/* Notifikasi Floating jika ada update */}
          {pesanNotifikasi && (
            <div className="alert-sukses-banner">
              ✅ {pesanNotifikasi}
            </div>
          )}

          {/* ─────────────────────────────────────────────
              5. HERO SECTION (Banner Merah Tua / Maroon)
              ───────────────────────────────────────────── */}
          <section className="hero-banner-maroon">
        <div className="hero-content">
          <div className="hero-tag-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            <span>Pemantauan Harga Pangan</span>
          </div>

          <h2 className="hero-headline">Harga Pangan Kota Manado</h2>

          <p className="hero-description">
            Informasi terkini harga produsen dan konsumen komoditas pangan di pasar Kota Manado.
            Data diperbarui rutin oleh Dinas Pangan untuk transparansi dan stabilisasi harga.
          </p>

          <div className="hero-date-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Pembaruan terakhir: Selasa, 22 September 2026</span>
          </div>
        </div>
      </section>

      {/* Konten Utama */}
      <main className="sipatokean-main-container">
        
        {/* ─────────────────────────────────────────────
            6. FILTER KATEGORI (Chips dengan Count Badge)
            ───────────────────────────────────────────── */}
        <div className="category-filter-chips">
          {daftarKategoriList.map((kat) => {
            const isAktif = kategoriAktif === kat.key;
            const jumlah = statistik[kat.key] ?? 0;
            return (
              <button
                key={kat.key}
                onClick={() => setKategoriAktif(kat.key)}
                className={`filter-chip-btn ${isAktif ? 'active' : ''}`}
              >
                {kat.icon && <span className="chip-icon">{kat.icon}</span>}
                <span className="chip-label">{kat.label}</span>
                <span className={`chip-count ${isAktif ? 'active-count' : ''}`}>
                  {jumlah}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────
            7. SEARCH BAR & DROPDOWN FILTER
            ───────────────────────────────────────────── */}
        <div className="search-filter-card">
          <form className="search-input-wrapper" onSubmit={handlePencarianSubmit}>
            <span className="search-prefix-label">Cari Komoditas —</span>
            <input
              type="text"
              className="search-input-field"
              placeholder="beras, cabai, daging, ikan..."
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
            />
            {pencarian && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => { setPencarian(''); muatDataKomoditas(); }}
              >
                ✕
              </button>
            )}
          </form>

          <div className="category-select-wrapper">
            <select
              className="custom-category-select"
              value={pasarDipilih}
              onChange={(e) => setPasarDipilih(e.target.value)}
            >
              <option value="Semua">Semua Kategori / Pasar</option>
              {daftarPasar.map((pasar, idx) => (
                <option key={idx} value={pasar}>{pasar}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            8. GRID KARTU HARGA KOMODITAS (Sesuai Gambar 1)
            ───────────────────────────────────────────── */}
        {sedangMemuat ? (
          <div className="loading-state-box">
            <div className="spinner-loader"></div>
            <p>Memuat data harga pangan terkini dari Dinas Pangan Kota Manado...</p>
          </div>
        ) : daftarKomoditas.length === 0 ? (
          <div className="empty-state-box">
            <p>Tidak ada komoditas pangan yang sesuai dengan pencarian atau filter.</p>
            <button className="btn-reset-filter" onClick={() => { setKategoriAktif('Semua'); setPasarDipilih('Semua'); setPencarian(''); }}>
              Atur Ulang Filter
            </button>
          </div>
        ) : (
          <div className="commodity-cards-grid">
            {daftarKomoditas.map((item) => (
              <div key={item.id} className="commodity-card-item">
                {/* Baris Atas: Satuan & Label Pasar */}
                <div className="card-top-row">
                  <span className="satuan-badge">
                    SATUAN {item.satuan || 'KG'}
                  </span>
                  <span className="market-pill-badge" title={item.nama_pasar}>
                    {item.nama_pasar}
                  </span>
                </div>

                {/* Judul Komoditas */}
                <h3 className="commodity-name-title">
                  {item.nama_komoditas}
                </h3>

                {/* Harga Komoditas */}
                <div className="commodity-price-amount">
                  {formatRupiah(item.harga)}
                </div>

                {/* Baris Bawah: Tanggal Penetapan */}
                <div className="card-bottom-row">
                  <span className="date-set-text">
                    Ditetapkan {item.tanggal_penetapan || '8 Oktober 2026'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────
          9. MODAL TEMPAT ISI DATA STAF (CRUD FORM)
          Bidang Cadangan dan Distribusi Pangan
          ───────────────────────────────────────────── */}
      {tampilkanModalStaf && (
        <div className="modal-overlay-backdrop" onClick={() => setTampilkanModalStaf(false)}>
          <div className="modal-container-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="modal-title-group">
                <span className="modal-badge-icon">🏛️</span>
                <div>
                  <h3 className="modal-heading">
                    {modeEdit ? 'Ubah Data Harga Komoditas' : 'Masukan Data Harga Komoditas Baru'}
                  </h3>
                  <p className="modal-subheading">
                    Bidang Cadangan dan Distribusi Pangan • Terkoneksi ke Supabase
                  </p>
                </div>
              </div>
              <button 
                className="modal-close-button" 
                onClick={() => setTampilkanModalStaf(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpanDataStaf} className="modal-form-body">
              {/* Nama Komoditas */}
              <div className="form-group-item">
                <label className="form-label-text">Nama Komoditas Pangan <span className="req">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beras Premium, Cabai Rawit, Minyak Goreng"
                  className="form-input-control"
                  value={formStaf.nama_komoditas}
                  onChange={(e) => setFormStaf({ ...formStaf, nama_komoditas: e.target.value })}
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="form-row-two-columns">
                <div className="form-group-item">
                  <label className="form-label-text">Kategori Komoditas <span className="req">*</span></label>
                  <select
                    className="form-input-control"
                    value={formStaf.kategori}
                    onChange={(e) => setFormStaf({ ...formStaf, kategori: e.target.value })}
                  >
                    <option value="Bahan Pokok">Bahan Pokok</option>
                    <option value="Hewani">Hewani</option>
                    <option value="Sayuran">Sayuran</option>
                    <option value="Buah">Buah</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label className="form-label-text">Satuan <span className="req">*</span></label>
                  <select
                    className="form-input-control"
                    value={formStaf.satuan}
                    onChange={(e) => setFormStaf({ ...formStaf, satuan: e.target.value })}
                  >
                    <option value="KG">KG (Kilogram)</option>
                    <option value="LITER">LITER</option>
                    <option value="IKAT">IKAT</option>
                    <option value="BIJI">BIJI</option>
                  </select>
                </div>
              </div>

              {/* Harga & Nama Pasar */}
              <div className="form-row-two-columns">
                <div className="form-group-item">
                  <label className="form-label-text">Harga (Rp) <span className="req">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Contoh: 15500"
                    className="form-input-control"
                    value={formStaf.harga}
                    onChange={(e) => setFormStaf({ ...formStaf, harga: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-text">Nama Pasar <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pasar Bersehati Karombasan"
                    className="form-input-control"
                    value={formStaf.nama_pasar}
                    onChange={(e) => setFormStaf({ ...formStaf, nama_pasar: e.target.value })}
                    list="daftarPasarOptions"
                  />
                  <datalist id="daftarPasarOptions">
                    <option value="Pasar Bersehati Karombasan" />
                    <option value="Pasar Tradisional Tuminting" />
                    <option value="Pasar Bersehati Sario" />
                    <option value="Pasar Tradisional Bahu" />
                  </datalist>
                </div>
              </div>

              {/* Tanggal Penetapan */}
              <div className="form-group-item">
                <label className="form-label-text">Tanggal Penetapan Harga</label>
                <input
                  type="date"
                  className="form-input-control"
                  value={formStaf.tanggal_penetapan}
                  onChange={(e) => setFormStaf({ ...formStaf, tanggal_penetapan: e.target.value })}
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setTampilkanModalStaf(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                >
                  💾 {modeEdit ? 'Simpan Perubahan' : 'Simpan Data Harga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="sipatokean-footer">
        <p>Sumber Data: Dinas Pangan Kota Manado • Bidang Cadangan dan Distribusi Pangan</p>
      </footer>
        </>
      )}
    </div>
  );
}
