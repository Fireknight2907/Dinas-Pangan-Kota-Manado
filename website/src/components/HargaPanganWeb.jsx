// ===================================================================================
// Modul Tampilan Publik Informasi Harga Pangan Kota Manado (Website)
// Fungsi: Menyajikan harga pangan terverifikasi dari basis data tanpa data dummy,
//         dilengkapi 3 menu publik (Harga Pangan, Gerakan Pangan Murah, Daftar Pasar),
//         pencarian pintar multi-kata & sinonim lokal, filter cepat kelompok induk
//         & sub-varian otomatis, multi-select wilayah pasar, pengurutan adil,
//         3 mode tampilan (Ringkasan, Tabel Banding Pasar, & Semua Pasar), serta
//         modal perbandingan pasar & grafik riwayat harga riil 30 hari.
// ===================================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { hargaPanganService } from '../services/HargaPanganService';
import { analisisHargaService } from '../services/AnalisisHargaService';
import { riwayatHargaService } from '../services/RiwayatHargaService';
import { masterDataService } from '../services/MasterDataService';
import ModalDetailHargaWeb from './ModalDetailHargaWeb';
import GPMWeb from './GPMWeb';
import DaftarPasarWeb from './DaftarPasarWeb';
import './HargaPanganWeb.css';

const DAFTAR_KATEGORI = [
  { key: 'Semua', label: 'Semua', icon: '📋' },
  { key: 'Bahan Pokok', label: 'Bahan Pokok', icon: '' },
  { key: 'Hewani', label: 'Hewani', icon: '' },
  { key: 'Sayuran', label: 'Sayuran', icon: '🥬' },
  { key: 'Buah', label: 'Buah', icon: '🍊' },
  { key: 'Lainnya', label: 'Lainnya', icon: '' }
];

export default function HargaPanganWeb({ onBukaLogin }) {
  // Tab Navigasi Publik Aktif ('harga' | 'gpm' | 'pasar')
  const [tabNavAktif, setTabNavAktif] = useState('harga');

  // Data Riil dari Basis Data (100% tanpa data dummy)
  const [daftarHargaTerbit, setDaftarHargaTerbit] = useState([]);
  const [riwayatTerbaru, setRiwayatTerbaru] = useState([]);
  const [daftarMasterKomoditas, setDaftarMasterKomoditas] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState('');

  // State Filter, Kelompok Induk, Sub-Varian, Multi-Pilih Pasar, Urutan & Mode Tampilan
  const [kategoriAktif, setKategoriAktif] = useState('Semua');
  const [kelompokAktif, setKelompokAktif] = useState('Semua');
  const [varianAktif, setVarianAktif] = useState('Semua');
  const [pencarian, setPencarian] = useState('');
  const [pasarTerpilih, setPasarTerpilih] = useState([]); // [] berarti Semua Pasar
  const [popoverPasarBuka, setPopoverPasarBuka] = useState(false);
  const [urutkan, setUrutkan] = useState('prioritas'); // 'prioritas' | 'termurah' | 'termahal' | 'terpopuler' | 'abjad'
  const [modeTampilan, setModeTampilan] = useState('ringkasan'); // 'ringkasan' | 'matriks' | 'semua-pasar'

  // State Modal Detail (Perbandingan Pasar & Riwayat Harga)
  const [grupDetailDipilih, setGrupDetailDipilih] = useState(null);

  const popoverRef = useRef(null);

  // Tutup popover multi-select pasar saat klik di luar
  useEffect(() => {
    const handleKlikLuar = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverPasarBuka(false);
      }
    };
    document.addEventListener('mousedown', handleKlikLuar);
    return () => document.removeEventListener('mousedown', handleKlikLuar);
  }, []);

  // Muat seluruh data harga pangan terbit, ringkasan riwayat riil, & metadata Master Komoditas
  const muatDataPublik = async () => {
    setSedangMemuat(true);
    setErrorMuat('');
    try {
      const [dataTerbit, hasilRiwayat, dataMasterKom] = await Promise.all([
        hargaPanganService.ambilPublikTerbit(),
        riwayatHargaService.ambilRiwayatPublikTerbaru(400),
        masterDataService.ambilDaftarKomoditas().catch(() => [])
      ]);
      setDaftarHargaTerbit(Array.isArray(dataTerbit) ? dataTerbit : []);
      setRiwayatTerbaru(Array.isArray(hasilRiwayat?.data) ? hasilRiwayat.data : []);
      setDaftarMasterKomoditas(Array.isArray(dataMasterKom) ? dataMasterKom : []);
    } catch (err) {
      setErrorMuat(err?.message || 'Gagal terhubung ke basis data harga pangan.');
      setDaftarHargaTerbit([]);
    } finally {
      setSedangMemuat(false);
    }
  };

  useEffect(() => {
    muatDataPublik();
  }, []);

  // Peta cepat Master Komoditas (induk, sinonim, prioritas)
  const petaMasterKomoditas = useMemo(
    () => analisisHargaService.buatPetaMasterKomoditas(daftarMasterKomoditas),
    [daftarMasterKomoditas]
  );

  // Daftar pasar unik murni dari DB
  const daftarPasarDB = useMemo(
    () => analisisHargaService.ekstrakDaftarPasarUnik(daftarHargaTerbit),
    [daftarHargaTerbit]
  );

  // Stempel waktu pembaruan terakhir murni dari DB
  const infoPembaruanTerakhir = useMemo(
    () => analisisHargaService.ambilPembaruanTerakhir(daftarHargaTerbit),
    [daftarHargaTerbit]
  );

  // Peta delta perubahan harga riil dari riwayat_harga_pangan
  const petaDelta = useMemo(
    () => analisisHargaService.buatPetaDeltaTerbaru(riwayatTerbaru),
    [riwayatTerbaru]
  );

  // Statistik badge kategori riil mengikuti pasar terpilih & mode tampilan
  const statistikKategori = useMemo(
    () => analisisHargaService.hitungStatistikKategori(daftarHargaTerbit, pasarTerpilih, modeTampilan),
    [daftarHargaTerbit, pasarTerpilih, modeTampilan]
  );

  // Daftar kelompok komoditas induk (Beras, Minyak Goreng, Cabai, Bawang, dll.) murni dari DB
  const daftarKelompokInduk = useMemo(
    () =>
      analisisHargaService.ekstrakKelompokInduk(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pasarTerpilih,
        petaMaster: petaMasterKomoditas
      }),
    [daftarHargaTerbit, kategoriAktif, pasarTerpilih, petaMasterKomoditas]
  );

  // Daftar sub-varian otomatis (muncul saat pilih induk atau cari kata kunci luas misal "beras")
  const daftarSubVarian = useMemo(
    () =>
      analisisHargaService.ekstrakSubVarian(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pencarian,
        pasarTerpilih,
        kelompokAktif,
        petaMaster: petaMasterKomoditas
      }),
    [daftarHargaTerbit, kategoriAktif, pencarian, pasarTerpilih, kelompokAktif, petaMasterKomoditas]
  );

  const tampilkanBarSubVarian =
    (kelompokAktif !== 'Semua' || pencarian.trim() !== '' || varianAktif !== 'Semua') &&
    (daftarSubVarian.length >= 2 || (varianAktif !== 'Semua' && daftarSubVarian.length >= 1));

  // Daftar kartu mode 'ringkasan' (1 kartu per varian komoditas dengan Pasar Termurah & Termahal)
  const daftarRingkasanKomoditas = useMemo(
    () =>
      analisisHargaService.kelompokkanPerKomoditas(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pencarian,
        pasarTerpilih,
        kelompokAktif,
        varianAktif,
        urutkan,
        petaDelta,
        petaMaster: petaMasterKomoditas
      }),
    [daftarHargaTerbit, kategoriAktif, pencarian, pasarTerpilih, kelompokAktif, varianAktif, urutkan, petaDelta, petaMasterKomoditas]
  );

  // Matriks mode 'matriks' (Baris = Varian Komoditas, Kolom = Pasar, sel hijau Termurah & merah Termahal)
  const matriksPerbandingan = useMemo(
    () =>
      analisisHargaService.susunMatriksPerbandinganPasar(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pencarian,
        pasarTerpilih,
        kelompokAktif,
        varianAktif,
        urutkan,
        petaDelta,
        petaMaster: petaMasterKomoditas
      }),
    [daftarHargaTerbit, kategoriAktif, pencarian, pasarTerpilih, kelompokAktif, varianAktif, urutkan, petaDelta, petaMasterKomoditas]
  );

  // Daftar kartu mode 'semua-pasar' (flat per pasar dengan badge Termurah/Termahal)
  const daftarSemuaPasar = useMemo(
    () =>
      analisisHargaService.susunDaftarSemuaPasar(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pencarian,
        pasarTerpilih,
        kelompokAktif,
        varianAktif,
        urutkan,
        petaDelta,
        petaMaster: petaMasterKomoditas
      }),
    [daftarHargaTerbit, kategoriAktif, pencarian, pasarTerpilih, kelompokAktif, varianAktif, urutkan, petaDelta, petaMasterKomoditas]
  );

  const togglePasar = (namaPasar) => {
    setPasarTerpilih((prev) =>
      prev.includes(namaPasar) ? prev.filter((p) => p !== namaPasar) : [...prev, namaPasar]
    );
  };

  const pilihKategori = (kat) => {
    setKategoriAktif(kat);
    setKelompokAktif('Semua');
    setVarianAktif('Semua');
  };

  const pilihKelompokInduk = (kelompok) => {
    setKelompokAktif(kelompok);
    setVarianAktif('Semua');
  };

  const ubahPencarian = (nilai) => {
    setPencarian(nilai);
    setVarianAktif('Semua');
  };

  const resetSemuaFilter = () => {
    setKategoriAktif('Semua');
    setKelompokAktif('Semua');
    setVarianAktif('Semua');
    setPencarian('');
    setPasarTerpilih([]);
    setUrutkan('prioritas');
  };

  // Pintasan dari menu Daftar Pasar -> langsung tampilkan harga di pasar tsb.
  const lihatHargaDariDaftarPasar = (namaPasar) => {
    setKategoriAktif('Semua');
    setKelompokAktif('Semua');
    setVarianAktif('Semua');
    setPencarian('');
    setPasarTerpilih(namaPasar ? [namaPasar] : []);
    setTabNavAktif('harga');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalTampil =
    modeTampilan === 'semua-pasar'
      ? daftarSemuaPasar.length
      : modeTampilan === 'matriks'
        ? matriksPerbandingan.daftarBarisMatriks.length
        : daftarRingkasanKomoditas.length;

  const labelTombolPasar =
    pasarTerpilih.length === 0
      ? `Semua Pasar (${daftarPasarDB.length})`
      : pasarTerpilih.length === 1
        ? pasarTerpilih[0]
        : `${pasarTerpilih.length} Pasar Dipilih`;

  return (
    <div className="sipatokaan-page-wrapper">
      {/* HEADER NAVIGASI */}
      <header className="sipatokaan-navbar">
        <div className="navbar-left">
          <div className="brand-logo-badge">
            <img src="/logodinaspangan.png" alt="Logo SIPATOKAAN" className="brand-logo-img" />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">SIPATOKAAN</h1>
            <p className="brand-subtitle">Dinas Pangan Kota Manado</p>
          </div>
        </div>

        <nav className="navbar-menu" aria-label="Navigasi publik utama">
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
            Gerakan Pangan Murah
          </button>
          <button
            className={`nav-tab ${tabNavAktif === 'pasar' ? 'active' : ''}`}
            onClick={() => setTabNavAktif('pasar')}
          >
            Daftar Pasar
          </button>
        </nav>

        <div className="navbar-right">
          <button
            className="btn-login-petugas"
            onClick={onBukaLogin}
            title="Masuk ke Portal Petugas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            <span>Masuk Petugas</span>
          </button>
        </div>
      </header>

      {tabNavAktif === 'gpm' ? (
        <GPMWeb
          onKembaliKeHarga={() => setTabNavAktif('harga')}
          onBukaLogin={onBukaLogin}
        />
      ) : tabNavAktif === 'pasar' ? (
        <DaftarPasarWeb
          daftarHargaTerbit={daftarHargaTerbit}
          onLihatHargaPasar={lihatHargaDariDaftarPasar}
        />
      ) : (
        <>
          {/* HERO SECTION */}
          <section className="hero-banner-maroon">
            <div className="hero-content">
              <div className="hero-tag-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <span>Pemantauan Harga Pangan Real-Time</span>
              </div>

              <h2 className="hero-headline">Harga Pangan Kota Manado</h2>

              <p className="hero-description">
                Bandingkan harga pangan pokok antar pasar tradisional Kota Manado, temukan pasar termurah hingga termahal, dan pantau riwayat perubahan harga resmi dari Dinas Pangan.
              </p>

              <div className="hero-meta-row">
                <div className="hero-date-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Pembaruan terakhir: <strong>{infoPembaruanTerakhir}</strong></span>
                </div>
                {daftarPasarDB.length > 0 && (
                  <div className="hero-date-badge">
                    <span>📍 {daftarPasarDB.length} Pasar Aktif • {daftarHargaTerbit.length} Data Terverifikasi</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* KONTEN UTAMA */}
          <main className="sipatokaan-main-container">
            {/* FILTER KATEGORI (Angka Riil dari Database) */}
            <div className="category-filter-chips">
              {DAFTAR_KATEGORI.map((kat) => {
                const isAktif = kategoriAktif === kat.key;
                const jumlah = statistikKategori[kat.key] ?? 0;
                return (
                  <button
                    key={kat.key}
                    onClick={() => pilihKategori(kat.key)}
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

            {/* FILTER CEPAT KELOMPOK KOMODITAS INDUK (Murni dari Data Terbit DB) */}
            {daftarKelompokInduk.length > 0 && (
              <div className="parent-commodity-bar" role="region" aria-label="Filter cepat jenis komoditas">
                <span className="parent-bar-label">Jenis Pangan:</span>
                <button
                  type="button"
                  className={`parent-pill-btn ${kelompokAktif === 'Semua' ? 'active' : ''}`}
                  onClick={() => pilihKelompokInduk('Semua')}
                >
                  <span>Semua Jenis</span>
                </button>
                {daftarKelompokInduk.map((k) => (
                  <button
                    key={k.kelompok}
                    type="button"
                    className={`parent-pill-btn ${kelompokAktif === k.kelompok ? 'active' : ''}`}
                    onClick={() => pilihKelompokInduk(kelompokAktif === k.kelompok ? 'Semua' : k.kelompok)}
                  >
                    <span>{k.kelompok}</span>
                    {k.jumlahVarian > 1 && (
                      <span className="parent-pill-badge" title={`${k.jumlahVarian} varian tersedia`}>
                        {k.jumlahVarian} varian
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* BAR KONTROL: PENCARIAN PINTAR, MULTI-SELECT PASAR, SORTIR, SUB-VARIAN & MODE TAMPILAN */}
            <div className="public-controls-panel">
              <div className="search-filter-card enhanced-filter-card">
                {/* Pencarian Pintar Multi-Kata & Sinonim */}
                <div className="search-input-wrapper">
                  <span className="search-prefix-label">🔍</span>
                  <input
                    type="text"
                    className="search-input-field"
                    placeholder="Cari komoditas, varian, atau pasar (misal: beras, beras biasa, rica, bahu)..."
                    value={pencarian}
                    onChange={(e) => ubahPencarian(e.target.value)}
                  />
                  {pencarian && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => ubahPencarian('')}
                      title="Hapus pencarian"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Multi-Select Wilayah Pasar */}
                <div className="multi-market-wrapper" ref={popoverRef}>
                  <button
                    type="button"
                    className={`multi-market-trigger ${pasarTerpilih.length > 0 ? 'has-selection' : ''}`}
                    onClick={() => setPopoverPasarBuka((v) => !v)}
                  >
                    <span>📍 {labelTombolPasar}</span>
                    <span className="chevron-icon">{popoverPasarBuka ? '▲' : '▼'}</span>
                  </button>

                  {popoverPasarBuka && (
                    <div className="multi-market-popover">
                      <div className="popover-header-row">
                        <strong>Pilih Pasar untuk Dibandingkan</strong>
                        <div className="popover-quick-btns">
                          <button
                            type="button"
                            onClick={() => setPasarTerpilih([...daftarPasarDB])}
                          >
                            Pilih Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setPasarTerpilih([])}
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {daftarPasarDB.length === 0 ? (
                        <p className="popover-empty-note">Belum ada data pasar terverifikasi di basis data.</p>
                      ) : (
                        <div className="popover-checkbox-list">
                          {daftarPasarDB.map((pasar) => {
                            const dicentang = pasarTerpilih.includes(pasar);
                            return (
                              <label
                                key={pasar}
                                className={`popover-market-item ${dicentang ? 'checked' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={dicentang}
                                  onChange={() => togglePasar(pasar)}
                                />
                                <span>{pasar}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <p className="popover-footer-note">
                        💡 Centang 2 atau lebih pasar untuk membandingkan harga termurah &amp; termahal secara langsung.
                      </p>
                    </div>
                  )}
                </div>

                {/* Dropdown Pengurutan */}
                <div className="sort-select-wrapper">
                  <select
                    className="category-select-dropdown"
                    aria-label="Urutkan komoditas"
                    value={urutkan}
                    onChange={(e) => setUrutkan(e.target.value)}
                  >
                    <option value="prioritas">⭐ Prioritas Masyarakat</option>
                    <option value="termurah">⬇️ Harga Termurah → Termahal</option>
                    <option value="termahal">⬆️ Harga Termahal → Termurah</option>
                    <option value="terpopuler">🔥 Paling Banyak Dicari</option>
                    <option value="abjad">🔤 Nama Komoditas (A–Z)</option>
                  </select>
                </div>
              </div>

              {/* BAR CHIP SUB-VARIAN OTOMATIS (Muncul saat cari kata luas seperti "beras" atau pilih jenis ber-varian) */}
              {tampilkanBarSubVarian && (
                <div className="subvariant-chip-panel">
                  <div className="subvariant-header-row">
                    <span className="subvariant-heading">
                      ✨ Ditemukan {daftarSubVarian.length} varian
                      {kelompokAktif !== 'Semua' ? ` pada kelompok ${kelompokAktif}` : ''}
                      {pencarian.trim() ? ` untuk "${pencarian.trim()}"` : ''} — pilih varian spesifik atau bandingkan sekaligus:
                    </span>
                    {modeTampilan !== 'matriks' && (
                      <button
                        type="button"
                        className="btn-jump-matrix"
                        onClick={() => setModeTampilan('matriks')}
                      >
                        📊 Bandingkan di Tabel Pasar
                      </button>
                    )}
                  </div>
                  <div className="subvariant-chips-list">
                    <button
                      type="button"
                      className={`subvariant-chip-btn ${varianAktif === 'Semua' ? 'active' : ''}`}
                      onClick={() => setVarianAktif('Semua')}
                    >
                      <span>Semua Varian ({daftarSubVarian.length})</span>
                    </button>
                    {daftarSubVarian.map((v) => (
                      <button
                        key={v.kunci}
                        type="button"
                        className={`subvariant-chip-btn ${varianAktif === v.kunci ? 'active' : ''}`}
                        onClick={() => setVarianAktif(varianAktif === v.kunci ? 'Semua' : v.kunci)}
                      >
                        <span>{v.nama_komoditas}</span>
                        <span className="subvariant-price-hint">
                          mulai {analisisHargaService.formatRupiah(v.hargaMin)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Baris Kedua: Pill Pasar Terpilih + Toggle 3 Mode Tampilan + Info */}
              <div className="subtoolbar-row">
                <div className="subtoolbar-left">
                  <span className="summary-count-text">
                    Menampilkan <strong>{totalTampil}</strong>{' '}
                    {modeTampilan === 'semua-pasar' ? 'catatan harga pasar' : 'varian komoditas'}
                    {' • Semua harga per 1 satuan resmi (Master Satuan)'}
                  </span>

                  {(pasarTerpilih.length > 0 || kelompokAktif !== 'Semua' || varianAktif !== 'Semua') && (
                    <div className="active-market-pills">
                      {kelompokAktif !== 'Semua' && (
                        <span className="active-market-chip">
                          🌾 Jenis: {kelompokAktif}
                          <button type="button" onClick={() => pilihKelompokInduk('Semua')} aria-label="Hapus filter jenis">
                            ✕
                          </button>
                        </span>
                      )}
                      {pasarTerpilih.map((p) => (
                        <span key={p} className="active-market-chip">
                          📍 {p}
                          <button type="button" onClick={() => togglePasar(p)} aria-label={`Hapus ${p}`}>
                            ✕
                          </button>
                        </span>
                      ))}
                      {pasarTerpilih.length > 0 && (
                        <button type="button" className="btn-clear-markets" onClick={() => setPasarTerpilih([])}>
                          Tampilkan Semua Pasar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* BAR KONTROL: PENCARIAN PINTAR, MULTI-SELECT PASAR, SORTIR, SUB-VARIAN & MODE TAMPILAN */}
                <div className="public-controls-panel">
                  <div className="search-filter-card enhanced-filter-card">
                    {/* Pencarian Pintar Multi-Kata & Sinonim */}
                    <div className="search-input-wrapper">
                      <span className="search-prefix-label">🔍</span>
                      <input
                        type="text"
                        className="search-input-field"
                        placeholder="Cari komoditas, varian, atau pasar (misal: beras, rica, bahu)..."
                        value={pencarian}
                        onChange={(e) => ubahPencarian(e.target.value)}
                      />
                      {pencarian && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={() => ubahPencarian('')}
                          title="Hapus pencarian"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* STATUS MEMUAT / ERROR / KOSONG / GRID KARTU / TABEL MATRIKS */}
                    {
                      sedangMemuat ? (
                        <div className="loading-state-box">
                          <div className="spinner-loader"></div>
                          <p>Memuat data harga pangan resmi dari basis data Dinas Pangan Kota Manado...</p>
                        </div>
                      ) : errorMuat ? (
                        <div className="empty-state-box error-state-box">
                          <p>⚠️ <strong>Gagal memuat data dari server basis data:</strong> {errorMuat}</p>
                          <button className="btn-reset-filter" onClick={muatDataPublik}>
                            🔄 Coba Muat Ulang
                          </button>
                        </div>
                      ) : totalTampil === 0 ? (
                        <div className="empty-state-box">
                          <p>Tidak ada komoditas pangan terverifikasi yang sesuai dengan pencarian atau filter pasar saat ini.</p>
                          <button className="btn-reset-filter" onClick={resetSemuaFilter}>
                            Atur Ulang Filter
                          </button>
                        </div>
                      ) : modeTampilan === 'matriks' ? (
                        /* MODE 2: TABEL MATRIKS PERBANDINGAN PASAR (VARIAN × PASAR DALAM 1 LAYAR) */
                        <div className="matrix-comparison-card">
                          <div className="matrix-legend-bar">
                            <div className="matrix-legend-items">
                              <span className="legend-dot-cheap">🟢 Termurah di Baris</span>
                              <span className="legend-dot-expensive">🔴 Termahal di Baris</span>
                              <span>— = Belum ada pencatatan di pasar tsb.</span>
                            </div>
                            <span>💡 Klik nama komoditas atau harga untuk membuka grafik riwayat 30 hari</span>
                          </div>

                          <div className="matrix-table-scroll">
                            <table className="matrix-table">
                              <thead>
                                <tr>
                                  <th className="matrix-col-sticky">Komoditas / Varian</th>
                                  {matriksPerbandingan.daftarKolomPasar.map((pasar) => (
                                    <th key={pasar} className="matrix-col-price">
                                      📍 {pasar}
                                    </th>
                                  ))}
                                  <th className="matrix-col-avg">Rata-rata</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matriksPerbandingan.daftarBarisMatriks.map((baris) => {
                                  const selisihDelta = baris.deltaTerbaru ? Number(baris.deltaTerbaru.selisih) || 0 : 0;
                                  return (
                                    <tr key={baris.kunci}>
                                      <td
                                        className="matrix-col-sticky"
                                        onClick={() => setGrupDetailDipilih(baris)}
                                        title="Klik untuk rincian pasar & grafik riwayat harga"
                                      >
                                        <div className="matrix-commodity-name">{baris.nama_komoditas}</div>
                                        <div className="matrix-commodity-meta">
                                          <span>{baris.kelompok} • {baris.satuanUtama}</span>
                                          {selisihDelta > 0 ? (
                                            <span className="card-delta-pill is-up">▲ +{analisisHargaService.formatRupiah(selisihDelta)}</span>
                                          ) : selisihDelta < 0 ? (
                                            <span className="card-delta-pill is-down">▼ -{analisisHargaService.formatRupiah(Math.abs(selisihDelta))}</span>
                                          ) : null}
                                        </div>
                                      </td>

                                      {matriksPerbandingan.daftarKolomPasar.map((pasar) => {
                                        const sel = baris.selPerPasar[pasar];
                                        if (!sel) {
                                          return (
                                            <td key={pasar} className="matrix-price-cell">
                                              <span className="matrix-empty-cell">—</span>
                                            </td>
                                          );
                                        }
                                        const kelasPosisi =
                                          sel.posisi === 'termurah'
                                            ? 'is-cheapest'
                                            : sel.posisi === 'termahal'
                                              ? 'is-expensive'
                                              : '';
                                        return (
                                          <td
                                            key={pasar}
                                            className={`matrix-price-cell ${kelasPosisi}`}
                                            onClick={() => setGrupDetailDipilih(baris)}
                                            title={`${baris.nama_komoditas} di ${pasar} (${sel.satuan})`}
                                          >
                                            <div className="matrix-price-val">
                                              {analisisHargaService.formatRupiah(sel.harga)}
                                            </div>
                                            {sel.posisi === 'termurah' && (
                                              <span className="matrix-cell-tag is-cheapest">🟢 Termurah</span>
                                            )}
                                            {sel.posisi === 'termahal' && (
                                              <span className="matrix-cell-tag is-expensive">🔴 Termahal</span>
                                            )}
                                          </td>
                                        );
                                      })}

                                      <td className="matrix-avg-cell">
                                        <div className="matrix-avg-val">
                                          {analisisHargaService.formatRupiah(baris.hargaRataRata)}
                                        </div>
                                        <button
                                          type="button"
                                          className="matrix-history-link"
                                          onClick={() => setGrupDetailDipilih(baris)}
                                        >
                                          Riwayat →
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : modeTampilan === 'ringkasan' ? (
                        /* MODE 1: KARTU KOMODITAS TERKELOMPOK (SMART COMMODITY CARDS) */
                        <div className="commodity-cards-grid">
                          {daftarRingkasanKomoditas.map((grup) => {
                            const delta = grup.deltaTerbaru;
                            const selisihDelta = delta ? Number(delta.selisih) || 0 : 0;

                            {
                              daftarPasarDB.length === 0 ? (
                                <p className="popover-empty-note">Belum ada data pasar terverifikasi di basis data.</p>
                              ) : (
                                <div className="popover-checkbox-list">
                                  {daftarPasarDB.map((pasar) => {
                                    const dicentang = pasarTerpilih.includes(pasar);
                                    return (
                                      <label
                                        key={pasar}
                                        className={`popover-market-item ${dicentang ? 'checked' : ''}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={dicentang}
                                          onChange={() => togglePasar(pasar)}
                                        />
                                        <span>{pasar}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )
                            }

                            <p className="popover-footer-note">
                              💡 Centang 2 atau lebih pasar untuk membandingkan harga termurah &amp; termahal secara langsung.
                            </p>
                    </div>
                      )}
                  </div>

                  {/* Dropdown Pengurutan */}
                  <div className="sort-select-wrapper">
                    <select
                      className="category-select-dropdown"
                      aria-label="Urutkan komoditas"
                      value={urutkan}
                      onChange={(e) => setUrutkan(e.target.value)}
                    >
                      <option value="prioritas">⭐ Prioritas Masyarakat</option>
                      <option value="termurah">⬇️ Harga Termurah → Termahal</option>
                      <option value="termahal">⬆️ Harga Termahal → Termurah</option>
                      <option value="terpopuler">🔥 Paling Banyak Dicari</option>
                      <option value="abjad">🔤 Nama Komoditas (A–Z)</option>
                    </select>
                  </div>
                </div>

                {/* BAR CHIP SUB-VARIAN OTOMATIS */}
                {tampilkanBarSubVarian && (
                  <div className="subvariant-chip-panel">
                    <div className="subvariant-header-row">
                      <span className="subvariant-heading">
                        ✨ Ditemukan {daftarSubVarian.length} varian
                        {kelompokAktif !== 'Semua' ? ` pada kelompok ${kelompokAktif}` : ''}
                        {pencarian.trim() ? ` untuk "${pencarian.trim()}"` : ''} — pilih varian spesifik atau bandingkan sekaligus:
                      </span>
                      {modeTampilan !== 'matriks' && (
                        <button
                          type="button"
                          className="btn-jump-matrix"
                          onClick={() => setModeTampilan('matriks')}
                        >
                          📊 Bandingkan di Tabel Pasar
                        </button>
                      )}
                    </div>
                    <div className="subvariant-chips-list">
                      <button
                        type="button"
                        className={`subvariant-chip-btn ${varianAktif === 'Semua' ? 'active' : ''}`}
                        onClick={() => setVarianAktif('Semua')}
                      >
                        <span>Semua Varian ({daftarSubVarian.length})</span>
                      </button>
                      {daftarSubVarian.map((v) => (
                        <button
                          key={v.kunci}
                          type="button"
                          className={`subvariant-chip-btn ${varianAktif === v.kunci ? 'active' : ''}`}
                          onClick={() => setVarianAktif(varianAktif === v.kunci ? 'Semua' : v.kunci)}
                        >
                          <span>{v.nama_komoditas}</span>
                          <span className="subvariant-price-hint">
                            mulai {analisisHargaService.formatRupiah(v.hargaMin)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Baris Kedua: Pill Pasar Terpilih + Toggle 3 Mode Tampilan + Info */}
                <div className="subtoolbar-row">
                  <div className="subtoolbar-left">
                    <span className="summary-count-text">
                      Menampilkan <strong>{totalTampil}</strong>{' '}
                      {modeTampilan === 'semua-pasar' ? 'catatan harga pasar' : 'varian komoditas'}
                      {' • Semua harga per 1 satuan resmi (Master Satuan)'}
                    </span>

                    {(pasarTerpilih.length > 0 || kelompokAktif !== 'Semua' || varianAktif !== 'Semua') && (
                      <div className="active-market-pills">
                        {kelompokAktif !== 'Semua' && (
                          <span className="active-market-chip">
                            🌾 Jenis: {kelompokAktif}
                            <button type="button" onClick={() => pilihKelompokInduk('Semua')} aria-label="Hapus filter jenis">
                              ✕
                            </button>
                          </span>
                        )}
                        {pasarTerpilih.map((p) => (
                          <span key={p} className="active-market-chip">
                            📍 {p}
                            <button type="button" onClick={() => togglePasar(p)} aria-label={`Hapus ${p}`}>
                              ✕
                            </button>
                          </span>
                        ))}
                        {pasarTerpilih.length > 0 && (
                          <button type="button" className="btn-clear-markets" onClick={() => setPasarTerpilih([])}>
                            Tampilkan Semua Pasar
                          </button>
                      </span>
                    ))}
                    <button type="button" className="btn-clear-markets" onClick={() => setPasarTerpilih([])}>
                      Tampilkan Semua Pasar
                    </button>
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
                {/* Harga Utama (Rentang jika >1 harga berbeda, atau Harga Tunggal) */}
                <div className="commodity-price-amount smart-price-range">
                  {grup.adaPerbedaanHarga ? (
                    <>
                      {analisisHargaService.formatRupiah(grup.hargaMin)}
                      <span className="price-range-sep"> – </span>
                      {analisisHargaService.formatRupiah(grup.hargaMax)}
                    </>
                  ) : (
                    analisisHargaService.formatRupiah(grup.hargaMin)
                  )}
                </div>
                {
                  pasarTerpilih.length > 0 && (
                    <div className="active-market-pills">
                      {pasarTerpilih.map((p) => (
                        <span key={p} className="active-market-chip">
                          📍 {p}
                          <button type="button" onClick={() => togglePasar(p)} aria-label={`Hapus ${p}`}>
                            ✕
                          </button>
                        </span>
                      ))}
                      <button type="button" className="btn-clear-markets" onClick={() => setPasarTerpilih([])}>
                        Tampilkan Semua Pasar
                      </button>
                    </div>
                  )
                }
              </div>
            </div >

            {/* Toggle 3 Mode: Ringkasan Komoditas | Tabel Banding Pasar | Semua Pasar */}
            <div className="view-mode-toggle" role="group" aria-label="Mode tampilan">
              <button
                type="button"
                className={`mode-toggle-btn ${modeTampilan === 'ringkasan' ? 'active' : ''}`}
                onClick={() => setModeTampilan('ringkasan')}
              >
                🧩 Ringkasan
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${modeTampilan === 'matriks' ? 'active' : ''}`}
                onClick={() => setModeTampilan('matriks')}
              >
                📊 Tabel Pasar
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${modeTampilan === 'semua-pasar' ? 'active' : ''}`}
                onClick={() => setModeTampilan('semua-pasar')}
              >
                🏪 Semua Pasar
              </button>
            </div>
          </div>
        </div>

      {/* STATUS MEMUAT / ERROR / KOSONG / GRID KARTU / TABEL MATRIKS */}
      {sedangMemuat ? (
        <div className="loading-state-box">
          <div className="spinner-loader"></div>
          <p>Memuat data harga pangan resmi dari basis data Dinas Pangan Kota Manado...</p>
        </div>
      ) : errorMuat ? (
        <div className="empty-state-box error-state-box">
          <p>⚠️ <strong>Gagal memuat data dari server basis data:</strong> {errorMuat}</p>
          <button className="btn-reset-filter" onClick={muatDataPublik}>
            🔄 Coba Muat Ulang
          </button>
        </div>
      ) : totalTampil === 0 ? (
        <div className="empty-state-box">
          <p>Tidak ada komoditas pangan terverifikasi yang sesuai dengan pencarian atau filter pasar saat ini.</p>
          <button className="btn-reset-filter" onClick={resetSemuaFilter}>
            Atur Ulang Filter
          </button>
        </div>
      ) : modeTampilan === 'matriks' ? (
        /* MODE 2: TABEL MATRIKS PERBANDINGAN PASAR */
        <div className="matrix-comparison-card">
          <div className="matrix-legend-bar">
            <div className="matrix-legend-items">
              <span className="legend-dot-cheap">🟢 Termurah di Baris</span>
              <span className="legend-dot-expensive">🔴 Termahal di Baris</span>
              <span>— = Belum ada pencatatan di pasar tsb.</span>
            </div>
            <span>💡 Klik nama komoditas atau harga untuk membuka grafik riwayat 30 hari</span>
          </div>

          <div className="matrix-table-scroll">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="matrix-col-sticky">Komoditas / Varian</th>
                  {matriksPerbandingan.daftarKolomPasar.map((pasar) => (
                    <th key={pasar} className="matrix-col-price">
                      📍 {pasar}
                    </th>
                  ))}
                  <th className="matrix-col-avg">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {matriksPerbandingan.daftarBarisMatriks.map((baris) => {
                  const selisihDelta = baris.deltaTerbaru ? Number(baris.deltaTerbaru.selisih) || 0 : 0;
                  return (
                    <tr key={baris.kunci}>
                      <td
                        className="matrix-col-sticky"
                        onClick={() => setGrupDetailDipilih(baris)}
                        title="Klik untuk rincian pasar & grafik riwayat harga"
                      >
                        <div className="matrix-commodity-name">{baris.nama_komoditas}</div>
                        <div className="matrix-commodity-meta">
                          <span>{baris.kelompok} • {baris.satuanUtama}</span>
                          {selisihDelta > 0 ? (
                            <span className="card-delta-pill is-up">▲ +{analisisHargaService.formatRupiah(selisihDelta)}</span>
                          ) : selisihDelta < 0 ? (
                            <span className="card-delta-pill is-down">▼ -{analisisHargaService.formatRupiah(Math.abs(selisihDelta))}</span>
                          ) : null}
                        </div>
                      </td>

                      {matriksPerbandingan.daftarKolomPasar.map((pasar) => {
                        const sel = baris.selPerPasar[pasar];
                        if (!sel) {
                          return (
                            <td key={pasar} className="matrix-price-cell">
                              <span className="matrix-empty-cell">—</span>
                            </td>
                          );
                        }
                        const kelasPosisi =
                          sel.posisi === 'termurah'
                            ? 'is-cheapest'
                            : sel.posisi === 'termahal'
                              ? 'is-expensive'
                              : '';
                        return (
                          <td
                            key={pasar}
                            className={`matrix-price-cell ${kelasPosisi}`}
                            onClick={() => setGrupDetailDipilih(baris)}
                            title={`${baris.nama_komoditas} di ${pasar} (${sel.satuan})`}
                          >
                            <div className="matrix-price-val">
                              {analisisHargaService.formatRupiah(sel.harga)}
                            </div>
                            {sel.posisi === 'termurah' && (
                              <span className="matrix-cell-tag is-cheapest">🟢 Termurah</span>
                            )}
                            {sel.posisi === 'termahal' && (
                              <span className="matrix-cell-tag is-expensive">🔴 Termahal</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="matrix-avg-cell">
                        <div className="matrix-avg-val">
                          {analisisHargaService.formatRupiah(baris.hargaRataRata)}
                        </div>
                        <button
                          type="button"
                          className="matrix-history-link"
                          onClick={() => setGrupDetailDipilih(baris)}
                        >
                          Riwayat →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody >
            </table >
          </div >
        </div >
      ) : modeTampilan === 'ringkasan' ? (
        /* MODE 1: KARTU KOMODITAS TERKELOMPOK */
        <div className="commodity-cards-grid">
          {daftarRingkasanKomoditas.map((grup) => {
            const delta = grup.deltaTerbaru;
            const selisihDelta = delta ? Number(delta.selisih) || 0 : 0;

            return (
              <article
                key={grup.kunci}
                className="commodity-card-item smart-commodity-card"
                onClick={() => setGrupDetailDipilih(grup)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setGrupDetailDipilih(grup);
                  }
                }}
              >
                <div className="card-top-row">
                  <span className="satuan-badge">
                    SATUAN {grup.satuanUtama} • {grup.kategori}
                  </span>
                  {selisihDelta > 0 ? (
                    <span className="card-delta-pill is-up" title="Kenaikan dari pencatatan resmi sebelumnya">
                      ▲ +{analisisHargaService.formatRupiah(selisihDelta)}
                    </span>
                  ) : selisihDelta < 0 ? (
                    <span className="card-delta-pill is-down" title="Penurunan dari pencatatan resmi sebelumnya">
                      ▼ -{analisisHargaService.formatRupiah(Math.abs(selisihDelta))}
                    </span>
                  ) : (
                    <span className="card-delta-pill is-stable">• Stabil</span>
                  )}
                </div>

                <h3 className="commodity-name-title">{grup.nama_komoditas}</h3>

                <div className="commodity-price-amount smart-price-range">
                  {grup.adaPerbedaanHarga ? (
                    <>
                      {analisisHargaService.formatRupiah(grup.hargaMin)}
                      <span className="price-range-sep"> – </span>
                      {analisisHargaService.formatRupiah(grup.hargaMax)}
                    </>
                  ) : (
                    analisisHargaService.formatRupiah(grup.hargaMin)
                  )}
                </div>

                <div className="card-market-compare-box">
                  {grup.adaPerbedaanHarga ? (
                    <>
                      <div className="compare-line is-cheap">
                        <span className="compare-tag">🟢 Termurah</span>
                        <span className="compare-market" title={grup.pasarTermurah.nama_pasar}>
                          {grup.pasarTermurah.nama_pasar}
                        </span>
                        <strong>{analisisHargaService.formatRupiah(grup.pasarTermurah.harga)}</strong>
                      </div>
                      <div className="compare-line is-expensive">
                        <span className="compare-tag">🔴 Termahal</span>
                        <span className="compare-market" title={grup.pasarTermahal.nama_pasar}>
                          {grup.pasarTermahal.nama_pasar}
                        </span>
                        <strong>{analisisHargaService.formatRupiah(grup.pasarTermahal.harga)}</strong>
                      </div>
                    </>
                  ) : grup.jumlahPasar > 1 ? (
                    <div className="compare-single-line">
                      <span>📍 Harga seragam di <strong>{grup.jumlahPasar} pasar</strong> terpilih</span>
                    </div>
                  ) : (
                    <div className="compare-single-line">
                      <span className="market-pill-badge" title={grup.pasarTermurah.nama_pasar}>
                        📍 {grup.pasarTermurah.nama_pasar}
                      </span>
                      {grup.pasarTermurah.perluKonversi && (
                        <span className="conv-pill">
                          ≈ {analisisHargaService.formatRupiah(grup.pasarTermurah.hargaStandar)}/{grup.labelStandar}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="card-bottom-row">
                  <span className="date-set-text">
                    Ditetapkan {grup.tanggalPenetapanTerbaru}
                  </span>
                  <span className="card-detail-cta">Riwayat &amp; Pasar →</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* MODE 3: DAFTAR SEMUA PASAR */
        <div className="commodity-cards-grid">
          {daftarSemuaPasar.map((item) => {
            const selisihDelta = item.delta ? Number(item.delta.selisih) || 0 : 0;
            const kelasBorder =
              item.posisiPasar === 'termurah'
                ? 'card-border-cheapest'
                : item.posisiPasar === 'termahal'
                  ? 'card-border-expensive'
                  : '';
            return (
              <article
                key={item.id}
                className={`commodity-card-item smart-commodity-card ${kelasBorder}`}
                onClick={() => setGrupDetailDipilih(item.grupKomoditas)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setGrupDetailDipilih(item.grupKomoditas);
                  }
                }}
              >
                <div className="card-top-row">
                  <span className="satuan-badge">SATUAN {item.satuan}</span>
                  <span className="market-pill-badge" title={item.nama_pasar}>
                    {item.nama_pasar}
                  </span>
                </div>

                <div className="flat-title-row">
                  <h3 className="commodity-name-title">{item.nama_komoditas}</h3>
                  {item.posisiPasar === 'termurah' && (
                    <span className="card-delta-pill is-down">🏆 Termurah</span>
                  )}
                  {item.posisiPasar === 'termahal' && (
                    <span className="card-delta-pill is-up">⬆️ Termahal</span>
                  )}
                </div>

                <div className="commodity-price-amount">
                  {analisisHargaService.formatRupiah(item.harga)}
                </div>

                {item.perluKonversi && (
                  <div className="flat-conv-line">
                    Setara <strong>{analisisHargaService.formatRupiah(item.hargaStandar)}</strong> / {item.labelStandar}
                  </div>
                )}

                <div className="card-bottom-row">
                  <span className="date-set-text">
                    {selisihDelta > 0
                      ? `▲ +${analisisHargaService.formatRupiah(selisihDelta)}`
                      : selisihDelta < 0
                        ? `▼ -${analisisHargaService.formatRupiah(Math.abs(selisihDelta))}`
                        : `Ditetapkan ${item.tanggal_penetapan || '-'}`}
                  </span>
                  <span className="card-detail-cta">Lihat Riwayat →</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main >

          {/* MODAL DETAIL KOMODITAS: PERBANDINGAN ANTAR PASAR & GRAFIK RIWAYAT RIIL */ }
  {
    grupDetailDipilih && (
      <ModalDetailHargaWeb
        grupKomoditas={grupDetailDipilih}
        pasarTerpilihAwal={pasarTerpilih}
        onTutup={() => setGrupDetailDipilih(null)}
      />
    )
  }
        </>
      )
}
    </div >
  );
}
