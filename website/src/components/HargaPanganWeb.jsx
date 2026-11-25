// ===================================================================================
// Modul Tampilan Publik Informasi Harga Pangan Kota Manado (Website)
// Fungsi: Menyajikan harga pangan terverifikasi dari DB tanpa data dummy, dilengkapi
//         multi-select pasar, pengurutan (Prioritas Masyarakat/Termurah/Termahal/
//         Populer/A-Z), satuan terkunci per 1 dari Master Admin, kartu terkelompok
//         lintas pasar + toggle daftar semua pasar, serta modal perbandingan & riwayat.
// ===================================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { hargaPanganService } from '../services/HargaPanganService';
import { analisisHargaService } from '../services/AnalisisHargaService';
import { riwayatHargaService } from '../services/RiwayatHargaService';
import ModalDetailHargaWeb from './ModalDetailHargaWeb';
import GPMWeb from './GPMWeb';
import './HargaPanganWeb.css';

const DAFTAR_KATEGORI = [
  { key: 'Semua', label: 'Semua', icon: '📋' },
  { key: 'Bahan Pokok', label: 'Bahan Pokok', icon: '🌾' },
  { key: 'Hewani', label: 'Hewani', icon: '🥩' },
  { key: 'Sayuran', label: 'Sayuran', icon: '🥬' },
  { key: 'Buah', label: 'Buah', icon: '🍊' },
  { key: 'Lainnya', label: 'Lainnya', icon: '📦' }
];

export default function HargaPanganWeb({ onBukaLogin }) {
  // Tab Navigasi Aktif ('harga' | 'gpm')
  const [tabNavAktif, setTabNavAktif] = useState('harga');

  // Data Riil dari Basis Data (100% tanpa data dummy)
  const [daftarHargaTerbit, setDaftarHargaTerbit] = useState([]);
  const [riwayatTerbaru, setRiwayatTerbaru] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState('');

  // State Filter, Multi-Pilih Pasar, Urutan & Mode Tampilan
  const [kategoriAktif, setKategoriAktif] = useState('Semua');
  const [pencarian, setPencarian] = useState('');
  const [pasarTerpilih, setPasarTerpilih] = useState([]); // [] berarti Semua Pasar
  const [popoverPasarBuka, setPopoverPasarBuka] = useState(false);
  const [urutkan, setUrutkan] = useState('prioritas'); // 'prioritas' | 'termurah' | 'termahal' | 'terpopuler' | 'abjad'
  const [modeTampilan, setModeTampilan] = useState('ringkasan'); // 'ringkasan' | 'semua-pasar'

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

  // Muat seluruh data harga pangan terbit & ringkasan riwayat riil saat pertama kali dibuka
  const muatDataPublik = async () => {
    setSedangMemuat(true);
    setErrorMuat('');
    try {
      const [dataTerbit, hasilRiwayat] = await Promise.all([
        hargaPanganService.ambilPublikTerbit(),
        riwayatHargaService.ambilRiwayatPublikTerbaru(400)
      ]);
      setDaftarHargaTerbit(Array.isArray(dataTerbit) ? dataTerbit : []);
      setRiwayatTerbaru(Array.isArray(hasilRiwayat?.data) ? hasilRiwayat.data : []);
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

  // Daftar kartu mode 'ringkasan' (1 kartu per komoditas dengan Pasar Termurah & Termahal)
  const daftarRingkasanKomoditas = useMemo(
    () =>
      analisisHargaService.kelompokkanPerKomoditas(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pencarian,
        pasarTerpilih,
        urutkan,
        petaDelta
      }),
    [daftarHargaTerbit, kategoriAktif, pencarian, pasarTerpilih, urutkan, petaDelta]
  );

  // Daftar kartu mode 'semua-pasar' (flat per pasar dengan badge Termurah/Termahal)
  const daftarSemuaPasar = useMemo(
    () =>
      analisisHargaService.susunDaftarSemuaPasar(daftarHargaTerbit, {
        kategori: kategoriAktif,
        pencarian,
        pasarTerpilih,
        urutkan,
        petaDelta
      }),
    [daftarHargaTerbit, kategoriAktif, pencarian, pasarTerpilih, urutkan, petaDelta]
  );

  // Toggle centang satu pasar di multi-select
  const togglePasar = (namaPasar) => {
    setPasarTerpilih((prev) =>
      prev.includes(namaPasar) ? prev.filter((p) => p !== namaPasar) : [...prev, namaPasar]
    );
  };

  const resetSemuaFilter = () => {
    setKategoriAktif('Semua');
    setPencarian('');
    setPasarTerpilih([]);
    setUrutkan('prioritas');
  };

  const totalTampil = modeTampilan === 'ringkasan' ? daftarRingkasanKomoditas.length : daftarSemuaPasar.length;
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

            {/* BAR KONTROL: PENCARIAN, MULTI-SELECT PASAR, SORTIR & MODE TAMPILAN */}
            <div className="public-controls-panel">
              <div className="search-filter-card enhanced-filter-card">
                {/* Pencarian Realtime */}
                <div className="search-input-wrapper">
                  <span className="search-prefix-label">🔍</span>
                  <input
                    type="text"
                    className="search-input-field"
                    placeholder="Cari komoditas atau pasar (misal: beras, cabai, bahu)..."
                    value={pencarian}
                    onChange={(e) => setPencarian(e.target.value)}
                  />
                  {pencarian && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setPencarian('')}
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
                        <p className="popover-empty-note">Belum ada data pasar di basis data.</p>
                      ) : (
                        <div className="popover-checkbox-list">
                          {daftarPasarDB.map((pasar) => {
                            const tercentang = pasarTerpilih.includes(pasar);
                            return (
                              <label key={pasar} className={`popover-market-item ${tercentang ? 'checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={tercentang}
                                  onChange={() => togglePasar(pasar)}
                                />
                                <span>{pasar}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <div className="popover-footer-note">
                        Centang 2+ pasar untuk langsung melihat pasar termurah & termahal di antaranya.
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown Urutkan */}
                <div className="sort-select-wrapper">
                  <select
                    className="custom-category-select"
                    value={urutkan}
                    onChange={(e) => setUrutkan(e.target.value)}
                    aria-label="Urutkan harga pangan"
                  >
                    <option value="prioritas">⭐ Urutkan: Prioritas Masyarakat</option>
                    <option value="termurah">💰 Harga Termurah → Termahal</option>
                    <option value="termahal">📈 Harga Termahal → Termurah</option>
                    <option value="terpopuler">🔥 Paling Banyak Dilihat</option>
                    <option value="abjad">🔤 Nama Komoditas (A–Z)</option>
                  </select>
                </div>
              </div>

              {/* Baris Kedua: Pill Pasar Terpilih + Toggle Mode Tampilan + Info */}
              <div className="subtoolbar-row">
                <div className="subtoolbar-left">
                  <span className="summary-count-text">
                    Menampilkan <strong>{totalTampil}</strong>{' '}
                    {modeTampilan === 'ringkasan' ? 'komoditas' : 'catatan harga pasar'}
                    {' • Semua harga per 1 satuan resmi (Master Satuan)'}
                  </span>

                  {pasarTerpilih.length > 0 && (
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
                  )}
                </div>

                {/* Toggle Ringkasan Komoditas vs Daftar Semua Pasar */}
                <div className="view-mode-toggle" role="group" aria-label="Mode tampilan">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${modeTampilan === 'ringkasan' ? 'active' : ''}`}
                    onClick={() => setModeTampilan('ringkasan')}
                  >
                    🧩 Ringkasan Komoditas
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

            {/* STATUS MEMUAT / ERROR / KOSONG / GRID KARTU */}
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
            ) : modeTampilan === 'ringkasan' ? (
              /* MODE 1: KARTU KOMODITAS TERKELOMPOK (SMART COMMODITY CARDS) */
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
                      {/* Baris Atas: Satuan, Kategori & Indikator Perubahan Riil */}
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

                      {/* Judul Komoditas */}
                      <h3 className="commodity-name-title">{grup.nama_komoditas}</h3>

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

                      {/* Strip Perbandingan Pasar Termurah vs Termahal */}
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
                          </div>
                        )}
                      </div>

                      {/* Baris Bawah: Tanggal & CTA Detail/Riwayat */}
                      <div className="card-bottom-row">
                        <span className="date-set-text">
                          Ditetapkan {grup.tanggalPenetapanTerbaru}
                        </span>
                        <span className="card-detail-cta">
                          Riwayat & Pasar →
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* MODE 2: DAFTAR SEMUA PASAR (FLAT CARD PER PASAR DENGAN BADGE TERMURAH/TERMAHAL) */
              <div className="commodity-cards-grid">
                {daftarSemuaPasar.map((item) => {
                  const selisihDelta = item.delta ? Number(item.delta.selisih) || 0 : 0;
                  return (
                    <article
                      key={item.id}
                      className={`commodity-card-item smart-commodity-card ${
                        item.posisiPasar === 'termurah'
                          ? 'card-border-cheapest'
                          : item.posisiPasar === 'termahal'
                            ? 'card-border-expensive'
                            : ''
                      }`}
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
                        {item.posisiPasar === 'termurah' && <span className="pill-cheapest">🏆 Termurah</span>}
                        {item.posisiPasar === 'termahal' && <span className="pill-expensive">⬆️ Termahal</span>}
                      </div>

                      <div className="commodity-price-amount">
                        {analisisHargaService.formatRupiah(item.harga)}
                      </div>

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
          </main>

          {/* MODAL DETAIL KOMODITAS: PERBANDINGAN ANTAR PASAR & GRAFIK RIWAYAT RIIL */}
          {grupDetailDipilih && (
            <ModalDetailHargaWeb
              grupKomoditas={grupDetailDipilih}
              pasarTerpilihAwal={pasarTerpilih}
              onTutup={() => setGrupDetailDipilih(null)}
            />
          )}

          {/* Footer */}
          <footer className="sipatokaan-footer">
            <p>Sumber Data: Dinas Pangan Kota Manado • Bidang Cadangan dan Distribusi Pangan (100% Data Resmi Basis Data)</p>
          </footer>
        </>
      )}
    </div>
  );
}
