// ===================================================================================
// Modul Tampilan Publik Gerakan Pangan Murah (GPM) - Website (OOP)
// Fungsi: Menampilkan jadwal GPM aktif (100% data riil DB, tanpa data dummy) lengkap
//         dengan peta Leaflet, pengurutan deterministik (termasuk tie-breaker hari &
//         jam sama berdasarkan sisa kuota terbanyak / lokasi GPS terdekat), auto-lock
//         realtime saat melewati jam selesai (WITA) atau kuota habis, formulir ambil
//         tiket QR tanpa login, serta tab Riwayat GPM Terlaksana (agregat anonim UU PDP).
// ===================================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import QRCodeComponent from './QRCodeComponent';
import { gpmService } from '../services/GPMService';
import { jadwalGPMService } from '../services/JadwalGPMService';
import './GPMWeb.css';

// Konfigurasi icon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ikon Khusus Penanda Gerakan Pangan Murah (Merah Marun)
const ikonGPM = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function GPMWeb({ onKembaliKeHarga, onBukaLogin }) {
  // 1. STATE UTAMA
  const [subTabPublik, setSubTabPublik] = useState('aktif'); // 'aktif' | 'riwayat'
  const [semuaAcara, setSemuaAcara] = useState([]);
  const [acaraDipilihId, setAcaraDipilihId] = useState('');
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState('');

  // Filter & Pengurutan (Menjawab skenario hari & jam sama)
  const [kecamatanFilter, setKecamatanFilter] = useState('Semua');
  const [modeUrutan, setModeUrutan] = useState('otomatis'); // 'otomatis' | 'terdekat' | 'kuota-terbanyak'
  const [posisiUser, setPosisiUser] = useState(null);
  const [sedangCariLokasi, setSedangCariLokasi] = useState(false);
  const [pesanLokasi, setPesanLokasi] = useState('');

  // Jam Realtime (Update tiap 15 detik untuk auto-lock jika jadwal WITA berakhir)
  const [waktuSekarangMs, setWaktuSekarangMs] = useState(() => Date.now());

  // Form Input Pendaftaran Antrean Masyarakat (Tanpa Login)
  const [nik, setNik] = useState('');
  const [noKK, setNoKK] = useState('');
  const [jumlahAnggota, setJumlahAnggota] = useState('1');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [sedangDaftar, setSedangDaftar] = useState(false);
  const [pesanError, setPesanError] = useState('');
  const [tiketHasil, setTiketHasil] = useState(null);

  // 2. PEMUATAN DATA RIIL DB & TIMER AUTO-CLOSE REALTIME
  const muatDaftarAcaraGPM = async (senyap = false) => {
    if (!senyap) setSedangMemuat(true);
    setErrorMuat('');
    try {
      const data = await gpmService.ambilSemuaAcara('Semua');
      const list = Array.isArray(data) ? data : [];
      setSemuaAcara(list);
      setWaktuSekarangMs(Date.now());
    } catch (err) {
      setErrorMuat(err?.message || 'Gagal terhubung ke basis data jadwal GPM.');
      setSemuaAcara([]);
    } finally {
      if (!senyap) setSedangMemuat(false);
    }
  };

  useEffect(() => {
    muatDaftarAcaraGPM();
    const timer = setInterval(() => {
      setWaktuSekarangMs(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // 3. KALKULASI OOP: JADWAL AKTIF TERURUT & RIWAYAT TERLAKSANA
  const semuaAktifTanpaFilter = useMemo(
    () => jadwalGPMService.urutkanAcaraAktif(semuaAcara, { modeUrutan, posisiUser, waktuSekarangMs }),
    [semuaAcara, modeUrutan, posisiUser, waktuSekarangMs]
  );

  const daftarAcaraAktif = useMemo(
    () =>
      jadwalGPMService.urutkanAcaraAktif(semuaAcara, {
        modeUrutan,
        kecamatan: kecamatanFilter,
        posisiUser,
        waktuSekarangMs
      }),
    [semuaAcara, modeUrutan, kecamatanFilter, posisiUser, waktuSekarangMs]
  );

  const semuaRiwayatTanpaFilter = useMemo(
    () => jadwalGPMService.urutkanRiwayatSelesai(semuaAcara, { waktuSekarangMs }),
    [semuaAcara, waktuSekarangMs]
  );

  const daftarRiwayatPublik = useMemo(
    () =>
      jadwalGPMService.urutkanRiwayatSelesai(semuaAcara, {
        kecamatan: kecamatanFilter,
        waktuSekarangMs
      }),
    [semuaAcara, kecamatanFilter, waktuSekarangMs]
  );

  const daftarKecamatanTersedia = useMemo(
    () =>
      jadwalGPMService.ekstrakKecamatanUnik(
        subTabPublik === 'aktif' ? semuaAktifTanpaFilter : semuaRiwayatTanpaFilter
      ),
    [subTabPublik, semuaAktifTanpaFilter, semuaRiwayatTanpaFilter]
  );

  // Jaga pilihan acara tetap sinkron dengan urutan terbaru
  useEffect(() => {
    if (daftarAcaraAktif.length === 0) {
      setAcaraDipilihId('');
      return;
    }
    const masihAda = daftarAcaraAktif.some((a) => String(a.id) === String(acaraDipilihId));
    if (!masihAda) {
      setAcaraDipilihId(daftarAcaraAktif[0].id);
    }
  }, [daftarAcaraAktif, acaraDipilihId]);

  // Acara terpilih saat ini (atau cek apakah baru saja melewati jam tutup saat tab sedang dibuka)
  const acaraDipilih = useMemo(() => {
    const aktif = daftarAcaraAktif.find((a) => String(a.id) === String(acaraDipilihId));
    if (aktif) return aktif;
    if (acaraDipilihId) {
      const mentah = semuaAcara.find((a) => String(a.id) === String(acaraDipilihId));
      if (mentah) {
        return {
          ...mentah,
          statusOperasional: jadwalGPMService.hitungStatusOperasional(mentah, waktuSekarangMs)
        };
      }
    }
    return daftarAcaraAktif[0] || null;
  }, [daftarAcaraAktif, semuaAcara, acaraDipilihId, waktuSekarangMs]);

  // Deteksi lokasi GPS warga (Opsional untuk mode Urutkan Terdekat)
  const handleAktifkanLokasiTerdekat = () => {
    if (!navigator.geolocation) {
      setPesanLokasi('Peramban tidak mendukung deteksi lokasi GPS.');
      return;
    }
    setSedangCariLokasi(true);
    setPesanLokasi('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosisiUser({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setModeUrutan('terdekat');
        setSedangCariLokasi(false);
        setPesanLokasi('📍 Urutan disesuaikan dari lokasi terdekat Anda.');
      },
      () => {
        setSedangCariLokasi(false);
        setPesanLokasi('Izin lokasi ditolak. Menggunakan urutan otomatis (Sisa Kuota Terbanyak).');
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  // Ringkasan agregat untuk Tab Riwayat Publik (100% tanpa data pribadi warga)
  const ringkasanRiwayat = useMemo(() => {
    const totalKegiatan = daftarRiwayatPublik.length;
    const totalKuota = daftarRiwayatPublik.reduce((acc, a) => acc + (a.statusOperasional.kuotaMaks || 0), 0);
    const totalDaftar = daftarRiwayatPublik.reduce((acc, a) => acc + (a.statusOperasional.terisi || 0), 0);
    const totalHadir = daftarRiwayatPublik.reduce((acc, a) => acc + (a.statusOperasional.totalHadir || 0), 0);
    const rataPersen = totalKuota > 0 ? Math.round((totalDaftar / totalKuota) * 100) : 0;
    return { totalKegiatan, totalKuota, totalDaftar, totalHadir, rataPersen };
  }, [daftarRiwayatPublik]);

  // 4. HANDLER PENDAFTARAN ANTREAN (PUBLIK)
  const handleAmbilAntrean = async (e) => {
    e.preventDefault();
    setPesanError('');

    if (!acaraDipilih) {
      setPesanError('Silakan pilih salah satu lokasi acara GPM aktif terlebih dahulu.');
      return;
    }

    const stSekarang = jadwalGPMService.hitungStatusOperasional(acaraDipilih, Date.now());
    if (stSekarang.sudahBerakhir) {
      setPesanError(`Pendaftaran ditutup: Jadwal kegiatan "${acaraDipilih.nama_acara}" telah berakhir (${acaraDipilih.jam_selesai} WITA).`);
      muatDaftarAcaraGPM(true);
      return;
    }
    if (stSekarang.kuotaPenuh) {
      setPesanError(`Kuota antrean telah habis (${stSekarang.terisi} / ${stSekarang.kuotaMaks}). Silakan pilih titik GPM lain yang masih tersedia.`);
      return;
    }

    const nikBersih = nik.trim();
    if (!nikBersih || !/^[0-9]{16}$/.test(nikBersih)) {
      setPesanError(`NIK wajib terdiri dari tepat 16 digit angka! Saat ini terisi ${nikBersih.length} digit.`);
      return;
    }

    const isModeKeluarga = String(acaraDipilih.mode_penerima || 'individu').toLowerCase() === 'keluarga';
    const noKkBersih = noKK.trim();
    if (isModeKeluarga && !/^[0-9]{16}$/.test(noKkBersih)) {
      setPesanError(`Nomor Kartu Keluarga (KK) wajib tepat 16 digit angka untuk kegiatan berbasis Keluarga! (Saat ini: ${noKkBersih.length} digit)`);
      return;
    }

    const namaBersih = namaLengkap.trim();
    if (!namaBersih || namaBersih.length < 3 || !/^[a-zA-Z\s'.]+$/.test(namaBersih)) {
      setPesanError('Nama lengkap minimal 3 huruf dan tidak boleh mengandung angka/simbol.');
      return;
    }

    const telpBersih = nomorTelepon.trim();
    if (telpBersih && (!/^[0-9]+$/.test(telpBersih) || telpBersih.length < 10 || telpBersih.length > 15)) {
      setPesanError('Nomor telepon jika diisi harus antara 10 hingga 15 digit angka.');
      return;
    }

    setSedangDaftar(true);
    try {
      const hasil = await gpmService.ambilNomorAntrean(
        acaraDipilih.id,
        namaBersih,
        telpBersih || '-',
        nikBersih,
        'Daring',
        false,
        isModeKeluarga
          ? {
              no_kk: noKkBersih,
              nama_kepala_keluarga: namaBersih,
              jumlah_anggota: Math.max(1, parseInt(jumlahAnggota || '1', 10) || 1)
            }
          : null
      );

      setTiketHasil(hasil);
      setNik('');
      setNoKK('');
      setJumlahAnggota('1');
      setNamaLengkap('');
      setNomorTelepon('');
      await muatDaftarAcaraGPM(true);
    } catch (err) {
      setPesanError(err?.message || 'Gagal mengambil nomor antrean. Silakan coba lagi.');
      await muatDaftarAcaraGPM(true);
    } finally {
      setSedangDaftar(false);
    }
  };

  const handlePrintTiket = () => window.print();

  const pilihLokasiLainTersedia = () => {
    const alternatif = daftarAcaraAktif.find(
      (a) => String(a.id) !== String(acaraDipilih?.id) && a.statusOperasional.bisaDaftar
    );
    if (alternatif) {
      setAcaraDipilihId(alternatif.id);
      setPesanError('');
    }
  };

  return (
    <div className="gpm-page-wrapper">
      {/* HERO BANNER GPM */}
      <section className="gpm-hero-section">
        <div className="gpm-hero-container">
          <div className="gpm-hero-pill">
            <span>🎟️</span>
            <span>Gerakan Pangan Murah (GPM) Kota Manado</span>
          </div>

          <h1 className="gpm-hero-title">Antrean Daring Gerakan Pangan Murah</h1>

          <p className="gpm-hero-desc">
            Dapatkan komoditas pangan pokok berkualitas dengan harga terjangkau langsung dari produsen. Jadwal otomatis ditutup tepat saat jam berakhir (WITA) dan kuota terkunci otomatis bila penuh.
          </p>

          <div className="gpm-hero-meta-badges">
            <div className="gpm-meta-item">
              <span>📍</span>
              <span><strong>{semuaAktifTanpaFilter.length}</strong> Lokasi Aktif</span>
            </div>
            <div className="gpm-meta-item">
              <span>📜</span>
              <span><strong>{semuaRiwayatTanpaFilter.length}</strong> Kegiatan Terlaksana</span>
            </div>
            <div className="gpm-meta-item">
              <span>🛡️</span>
              <span><strong>Tanpa Login</strong> (Cukup NIK 16 Digit & Nama Lengkap)</span>
            </div>
          </div>
        </div>
      </section>

      {/* KONTEN UTAMA */}
      <main className="gpm-main-content">
        {/* SUB-TAB PUBLIK: JADWAL AKTIF VS RIWAYAT TERLAKSANA */}
        <div className="gpm-public-tabs-bar">
          <div className="gpm-public-tabs-left">
            <button
              type="button"
              className={`gpm-pub-tab-btn ${subTabPublik === 'aktif' ? 'active' : ''}`}
              onClick={() => {
                setSubTabPublik('aktif');
                setKecamatanFilter('Semua');
              }}
            >
              📍 Jadwal GPM Aktif
              <span className="gpm-tab-pill">{semuaAktifTanpaFilter.length}</span>
            </button>
            <button
              type="button"
              className={`gpm-pub-tab-btn ${subTabPublik === 'riwayat' ? 'active' : ''}`}
              onClick={() => {
                setSubTabPublik('riwayat');
                setKecamatanFilter('Semua');
              }}
            >
              📜 Riwayat GPM Terlaksana
              <span className="gpm-tab-pill">{semuaRiwayatTanpaFilter.length}</span>
            </button>
          </div>

          <div className="gpm-public-filter-controls">
            {daftarKecamatanTersedia.length > 1 && (
              <select
                className="gpm-ctrl-select"
                value={kecamatanFilter}
                onChange={(e) => setKecamatanFilter(e.target.value)}
                aria-label="Filter kecamatan GPM"
              >
                <option value="Semua">🗺️ Semua Kecamatan</option>
                {daftarKecamatanTersedia.map((kec) => (
                  <option key={kec} value={kec}>Kec. {kec}</option>
                ))}
              </select>
            )}

            {subTabPublik === 'aktif' && (
              <>
                <select
                  className="gpm-ctrl-select"
                  value={modeUrutan}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'terdekat' && !posisiUser) {
                      handleAktifkanLokasiTerdekat();
                    } else {
                      setModeUrutan(val);
                    }
                  }}
                  aria-label="Urutkan jadwal GPM"
                >
                  <option value="otomatis">⭐ Urutan Otomatis (Tercepat & Kuota Terbanyak)</option>
                  <option value="kuota-terbanyak">🎟️ Sisa Kuota Terbanyak</option>
                  <option value="terdekat">📍 Terdekat dari Lokasi Saya</option>
                </select>
                <button
                  type="button"
                  className="gpm-btn-gps"
                  onClick={handleAktifkanLokasiTerdekat}
                  disabled={sedangCariLokasi}
                  title="Urutkan titik GPM terdekat dari posisi GPS Anda"
                >
                  {sedangCariLokasi ? '⏳ Mencari GPS...' : '📍 Terdekat'}
                </button>
              </>
            )}
          </div>
        </div>

        {pesanLokasi && <div className="gpm-gps-notice">{pesanLokasi}</div>}

        {sedangMemuat ? (
          <div className="gpm-empty-card">
            <p>⏳ Memuat jadwal resmi Gerakan Pangan Murah dari basis data Dinas Pangan Kota Manado...</p>
          </div>
        ) : errorMuat ? (
          <div className="gpm-empty-card is-error">
            <p>⚠️ <strong>Gagal memuat jadwal GPM:</strong> {errorMuat}</p>
            <button type="button" className="gpm-btn-retry" onClick={() => muatDaftarAcaraGPM()}>
              🔄 Coba Muat Ulang
            </button>
          </div>
        ) : subTabPublik === 'aktif' ? (
          /* ════════════════════════════════════════════════════════════════
             TAB 1: JADWAL GPM AKTIF (PETA, DAFTAR TERURUT & FORM ANTREAN)
             ════════════════════════════════════════════════════════════════ */
          daftarAcaraAktif.length === 0 ? (
            <div className="gpm-empty-card">
              <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📭</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
                Belum Ada Jadwal GPM Aktif{kecamatanFilter !== 'Semua' ? ` di Kec. ${kecamatanFilter}` : ' Saat Ini'}
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b' }}>
                Seluruh kegiatan sebelumnya telah berakhir sesuai jadwal WITA. Anda dapat melihat tingkat keramaian & rekap kegiatan sebelumnya di tab Riwayat GPM.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {kecamatanFilter !== 'Semua' && (
                  <button type="button" className="gpm-btn-secondary" onClick={() => setKecamatanFilter('Semua')}>
                    Tampilkan Semua Kecamatan
                  </button>
                )}
                <button type="button" className="gpm-btn-retry" onClick={() => setSubTabPublik('riwayat')}>
                  📜 Lihat Riwayat GPM Terlaksana ({semuaRiwayatTanpaFilter.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="gpm-split-grid">
              {/* KOLOM KIRI: PETA TITIK LOKASI GPM & PILIHAN ACARA */}
              <div className="gpm-card-box">
                <div className="gpm-card-header">
                  <div className="gpm-card-title-group">
                    <div className="gpm-title-icon-badge">🗺️</div>
                    <div>
                      <h3 className="gpm-card-title">Peta Titik Pelaksanaan GPM Aktif</h3>
                      <p className="gpm-card-subtitle">Klik pin merah di peta atau pilih kartu jadwal di bawah</p>
                    </div>
                  </div>
                </div>

                {/* PETA INTERAKTIF LEAFLET (100% DARI ACARA AKTIF RIIL) */}
                <div className="gpm-map-container">
                  <MapContainer
                    center={[
                      acaraDipilih?.latitude || daftarAcaraAktif[0]?.latitude || 1.4883,
                      acaraDipilih?.longitude || daftarAcaraAktif[0]?.longitude || 124.8436
                    ]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {daftarAcaraAktif.map((acara) => (
                      <Marker
                        key={acara.id}
                        position={[acara.latitude || 1.4883, acara.longitude || 124.8436]}
                        icon={ikonGPM}
                        eventHandlers={{
                          click: () => {
                            setAcaraDipilihId(acara.id);
                            setTiketHasil(null);
                            setPesanError('');
                          }
                        }}
                      >
                        <Popup>
                          <div style={{ textAlign: 'left', minWidth: '190px' }}>
                            <strong style={{ color: '#8b1e1e', fontSize: '0.95rem' }}>{acara.nama_acara}</strong>
                            <p style={{ margin: '4px 0', fontSize: '0.84rem' }}>📍 {acara.lokasi}</p>
                            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#555' }}>
                              📅 {jadwalGPMService.formatTanggalID(acara.tanggal)} | ⏰ {acara.jam_mulai} - {acara.jam_selesai} WITA
                            </p>
                            <p
                              style={{
                                margin: '6px 0 0 0',
                                fontWeight: 'bold',
                                color: acara.statusOperasional.kuotaPenuh ? '#dc2626' : '#15803d'
                              }}
                            >
                              {acara.statusOperasional.kuotaPenuh
                                ? `🚫 Kuota Habis (${acara.statusOperasional.terisi}/${acara.statusOperasional.kuotaMaks})`
                                : `Sisa Kuota: ${acara.statusOperasional.sisaKuota} / ${acara.statusOperasional.kuotaMaks}`}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div className="gpm-map-tip">
                  <span>ℹ️</span>
                  <span>
                    Jika ada jadwal pada <strong>hari &amp; jam yang sama</strong>, titik dengan <strong>sisa kuota terbanyak</strong> tampil lebih dulu agar antrean merata (atau gunakan tombol <strong>📍 Terdekat</strong>).
                  </span>
                </div>

                {/* LIST DAFTAR ACARA AKTIF */}
                <h4 style={{ margin: '20px 0 10px 0', fontSize: '1rem', color: '#1e293b' }}>
                  Pilih Lokasi Acara GPM ({daftarAcaraAktif.length}):
                </h4>
                <div className="gpm-event-selector-list">
                  {['Berlangsung', 'Akan Datang', 'Penuh'].map((kelompokKode) => {
                    const daftarGrup = daftarAcaraAktif.filter((a) => a.statusOperasional?.kode === kelompokKode);
                    if (daftarGrup.length === 0) return null;
                    const judulGrup =
                      kelompokKode === 'Berlangsung'
                        ? `🟢 Sedang Berlangsung (${daftarGrup.length})`
                        : kelompokKode === 'Akan Datang'
                          ? `🔵 Akan Datang / Pendaftaran Dibuka (${daftarGrup.length})`
                          : `🔴 Kuota Penuh (${daftarGrup.length})`;
                    return (
                      <React.Fragment key={kelompokKode}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', padding: '6px 4px 2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                          {judulGrup}
                        </div>
                        {daftarGrup.map((acara) => {
                          const st = acara.statusOperasional;
                          const terpilih = String(acaraDipilih?.id) === String(acara.id);
                          return (
                            <div
                              key={acara.id}
                              className={`gpm-event-select-item ${terpilih ? 'is-selected' : ''} ${st.kuotaPenuh ? 'is-full' : ''}`}
                              onClick={() => {
                                setAcaraDipilihId(acara.id);
                                setTiketHasil(null);
                                setPesanError('');
                              }}
                            >
                              <div className="event-item-left">
                                <div className="event-badges-row">
                                  <span className={`event-status-chip is-${st.kode.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {st.label}
                                  </span>
                                  <span className="event-countdown-chip">⏳ {st.keteranganWaktu}</span>
                                  {acara.jarakKm !== null && acara.jarakKm !== undefined && (
                                    <span className="event-distance-chip">📍 {acara.jarakKm} km</span>
                                  )}
                                </div>
                                <div className="event-name-tag">{acara.nama_acara}</div>
                                <div className="event-loc-sub">
                                  <span>📍</span> {acara.lokasi} (Kec. {acara.kecamatan})
                                </div>
                                <div className="event-time-row">
                                  📅 {jadwalGPMService.formatTanggalID(acara.tanggal)} · ⏰ {acara.jam_mulai} – {acara.jam_selesai} WITA
                                </div>
                              </div>

                              <div className={`event-quota-badge ${st.kuotaPenuh ? 'is-full' : ''}`}>
                                {st.kuotaPenuh
                                  ? `Penuh (${st.terisi}/${st.kuotaMaks})`
                                  : `Sisa ${st.sisaKuota} / ${st.kuotaMaks}`}
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* KOLOM KANAN: DETAIL ACARA / FORM AMBIL ANTREAN / TIKET DIGITAL */}
              <div className="gpm-action-panel">
                {tiketHasil ? (
                  <div className="gpm-ticket-container" id="tiket-antrean-print">
                    <div className="ticket-header-band">
                      <h3 className="ticket-header-brand-title">TIKET ANTREAN RESMI GPM</h3>
                      <p className="ticket-header-brand-sub">Dinas Pangan Pemerintah Kota Manado</p>
                    </div>

                    <div className="ticket-body-content">
                      <div className="ticket-queue-number-card">
                        <div className="ticket-queue-label">Nomor Antrean Anda</div>
                        <div className="ticket-queue-big-number">
                          #{String(tiketHasil.tiket.nomor_antrean).padStart(3, '0')}
                        </div>
                        <span className="ticket-queue-status-tag">Status: Menunggu Verifikasi</span>
                      </div>

                      <div className="ticket-barcode-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '15px 0' }}>
                        <QRCodeComponent value={tiketHasil.tiket.kode_barcode} size={170} />
                        <div className="ticket-barcode-code-text" style={{ marginTop: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
                          {tiketHasil.tiket.kode_barcode}
                        </div>
                      </div>

                      <div className="ticket-details-summary">
                        <p><span className="lbl">Nama Pendaftar:</span><span className="val">{tiketHasil.tiket.nama_bersih || tiketHasil.tiket.nama_pendaftar}</span></p>
                        <p><span className="lbl">NIK (16 Digit):</span><span className="val">{tiketHasil.tiket.nik || '-'}</span></p>
                        {tiketHasil.tiket.no_kk && (
                          <p><span className="lbl">No. Kartu Keluarga (KK):</span><span className="val">{tiketHasil.tiket.no_kk} ({tiketHasil.tiket.jumlah_anggota || 1} anggota)</span></p>
                        )}
                        <p><span className="lbl">Jalur Pendaftaran:</span><span className="val">{tiketHasil.tiket.jalur_pendaftaran || 'Daring'}</span></p>
                        <p><span className="lbl">Nomor Telepon / WA:</span><span className="val">{tiketHasil.tiket.nomor_telepon || '-'}</span></p>
                        <p><span className="lbl">Lokasi Acara GPM:</span><span className="val">{tiketHasil.acara.nama_acara}</span></p>
                        <p><span className="lbl">Alamat Tempat:</span><span className="val">{tiketHasil.acara.lokasi}</span></p>
                        <p><span className="lbl">Tanggal &amp; Jam:</span><span className="val">{tiketHasil.acara.tanggal} ({tiketHasil.acara.jam})</span></p>
                      </div>

                      <div className="ticket-scan-instruction">
                        📱 <strong>Petunjuk:</strong> Tiket ini adalah <strong>bukti nomor antrean &amp; alokasi kuota</strong> (bukan bukti pembayaran) dan tidak dapat dipindahtangankan. Tunjukkan Kode QR ini kepada petugas di lokasi GPM <strong>sebelum jam selesai berakhir</strong>. Tiket QR otomatis terkunci setelah jadwal GPM ditutup.
                      </div>

                      <div className="ticket-actions-row">
                        <button className="btn-ticket-print" onClick={handlePrintTiket}>🖨️ Cetak / Simpan Tiket</button>
                        <button className="btn-ticket-new" onClick={() => setTiketHasil(null)}>➕ Daftar Lagi</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="gpm-detail-box">
                    {acaraDipilih ? (() => {
                      const st = acaraDipilih.statusOperasional;
                      const adaLokasiLainTersedia = daftarAcaraAktif.some(
                        (a) => String(a.id) !== String(acaraDipilih.id) && a.statusOperasional.bisaDaftar
                      );

                      return (
                        <>
                          <div className="event-badges-row" style={{ marginBottom: '8px' }}>
                            <span className={`event-status-chip is-${st.kode.toLowerCase().replace(/\s+/g, '-')}`}>
                              {st.label}
                            </span>
                            <span className="event-countdown-chip">⏳ {st.keteranganWaktu}</span>
                          </div>

                          <h3 className="gpm-highlight-title">{acaraDipilih.nama_acara}</h3>

                          <div className="gpm-info-rows-stack">
                            <div className="gpm-info-row">
                              <strong>📍 Lokasi:</strong>
                              <span>{acaraDipilih.lokasi} (Kec. {acaraDipilih.kecamatan})</span>
                            </div>
                            <div className="gpm-info-row">
                              <strong>📅 Tanggal:</strong>
                              <span>{jadwalGPMService.formatTanggalID(acaraDipilih.tanggal)} ({acaraDipilih.tanggal})</span>
                            </div>
                            <div className="gpm-info-row">
                              <strong>⏰ Waktu:</strong>
                              <span>{acaraDipilih.jam_mulai} – {acaraDipilih.jam_selesai} WITA (tutup otomatis)</span>
                            </div>
                            <div className="gpm-info-row">
                              <strong>🎟️ Kuota Antrean:</strong>
                              <span style={{ color: st.kuotaPenuh ? '#dc2626' : '#15803d', fontWeight: 800 }}>
                                {st.kuotaPenuh
                                  ? `HABIS (${st.terisi} / ${st.kuotaMaks} terisi)`
                                  : `Tersisa ${st.sisaKuota} dari ${st.kuotaMaks} kuota (${st.terisi} terdaftar)`}
                              </span>
                            </div>
                            <div className="gpm-info-row">
                              <strong>📝 Pendaftaran:</strong>
                              <span>
                                {acaraDipilih.mode_pendaftaran === 'langsung'
                                  ? '📍 Datang langsung ke lokasi (tanpa pendaftaran daring)'
                                  : acaraDipilih.mode_pendaftaran === 'keduanya'
                                    ? '🔄 Pendaftaran daring & datang langsung tersedia di lokasi'
                                    : '🌐 Daftar antrean daring tersedia (atau layanan langsung petugas sesuai kuota)'}
                                {acaraDipilih.mode_penerima === 'keluarga' ? ' · 👨‍👩‍👧‍👦 1 KK = 1 Antrean' : ' · 👤 1 NIK = 1 Antrean'}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar Keterisian Kuota */}
                          <div className="gpm-quota-progress-wrap">
                            <div className="gpm-quota-progress-track">
                              <div
                                className={`gpm-quota-progress-fill ${st.kuotaPenuh ? 'is-full' : st.persenTerisi >= 80 ? 'is-high' : ''}`}
                                style={{ width: `${st.persenTerisi}%` }}
                              />
                            </div>
                            <div className="gpm-quota-progress-meta">
                              <span>{st.persenTerisi}% kuota terisi</span>
                              <span>{st.labelAntusiasme}</span>
                            </div>
                          </div>

                          {acaraDipilih.komoditas_tersedia && (
                            <div className="gpm-commodities-pill-box">
                              <strong>🌾 Komoditas Pangan Murah Tersedia:</strong>
                              <p style={{ margin: '6px 0 0 0' }}>{acaraDipilih.komoditas_tersedia}</p>
                            </div>
                          )}

                          {acaraDipilih.deskripsi && (
                            <div className="gpm-commodities-pill-box" style={{ marginTop: '8px', background: '#f8fafc', borderColor: '#e2e8f0' }}>
                              <strong>ℹ️ Keterangan Kegiatan:</strong>
                              <p style={{ margin: '6px 0 0 0' }}>{acaraDipilih.deskripsi}</p>
                            </div>
                          )}

                          {/* KONDISI TERKUNCI: JADWAL BERAKHIR ATAU KUOTA HABIS */}
                          {st.sudahBerakhir ? (
                            <div className="gpm-locked-banner is-ended">
                              <h4>🔒 Kegiatan GPM Telah Berakhir</h4>
                              <p>
                                Jadwal pelaksanaan acara ini berakhir pada <strong>{acaraDipilih.jam_selesai} WITA</strong>. Pendaftaran antrean daring dan verifikasi tiket QR telah ditutup otomatis.
                              </p>
                              <button
                                type="button"
                                className="gpm-btn-secondary"
                                onClick={() => {
                                  muatDaftarAcaraGPM();
                                  setSubTabPublik('riwayat');
                                }}
                              >
                                📜 Lihat di Riwayat GPM Terlaksana
                              </button>
                            </div>
                          ) : st.kuotaPenuh ? (
                            <div className="gpm-locked-banner is-full">
                              <h4>🚫 Kuota Antrean Telah Habis ({st.terisi}/{st.kuotaMaks})</h4>
                              <p>
                                Seluruh kuota antrean untuk lokasi ini sudah penuh sehingga pendaftaran dikunci otomatis.
                              </p>
                              {adaLokasiLainTersedia && (
                                <button type="button" className="gpm-btn-retry" onClick={pilihLokasiLainTersedia}>
                                  📍 Pilih Lokasi GPM Lain yang Masih Tersedia
                                </button>
                              )}
                            </div>
                          ) : acaraDipilih.mode_pendaftaran === 'langsung' ? (
                            <div className="gpm-locked-banner" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e3a8a' }}>
                              <h4>📍 Datang Langsung ke Lokasi (Tanpa Daftar Online)</h4>
                              <p>
                                Kegiatan ini tidak memerlukan pendaftaran antrean online. Silakan datang langsung ke <strong>{acaraDipilih.lokasi}</strong> dengan membawa KTP/KK pada jadwal yang tertera.
                              </p>
                            </div>
                          ) : (
                            /* FORM AMBIL ANTREAN AKTIF (TANPA LOGIN) */
                            <div className="gpm-form-wrapper">
                              <h4 className="gpm-form-title">
                                <span>🎟️</span> Ambil Nomor Antrean &amp; Kode QR
                              </h4>
                              <p className="gpm-form-hint">
                                {acaraDipilih.mode_penerima === 'keluarga'
                                  ? 'Mekanisme kegiatan ini dihitung per Keluarga (1 Kartu Keluarga / 1 NIK perwakilan = 1 antrean).'
                                  : 'Masyarakat tidak perlu login. Satu NIK (16 digit) hanya berlaku untuk 1 nomor antrean pada kegiatan yang sama.'}
                              </p>

                              {pesanError && (
                                <div className="gpm-error-inline-box">
                                  ⚠️ {pesanError}
                                </div>
                              )}

                              <form onSubmit={handleAmbilAntrean}>
                                <div className="gpm-input-field">
                                  <label>
                                    Nomor Induk Kependudukan (NIK) <span style={{ color: '#e74c3c' }}>* (Wajib 16 Digit)</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    maxLength={16}
                                    placeholder="Contoh: 7171012345678901"
                                    className="gpm-input-box"
                                    value={nik}
                                    onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
                                  />
                                  <small style={{ color: nik.length === 16 ? '#15803d' : '#64748b', marginTop: '4px', display: 'block', fontSize: '0.8rem' }}>
                                    {nik.length}/16 digit {nik.length > 0 && nik.length < 16 && `(Kurang ${16 - nik.length} digit)`}
                                  </small>
                                </div>

                                {acaraDipilih.mode_penerima === 'keluarga' && (
                                  <>
                                    <div className="gpm-input-field">
                                      <label>
                                        Nomor Kartu Keluarga (KK) <span style={{ color: '#e74c3c' }}>* (Wajib 16 Digit)</span>
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        maxLength={16}
                                        placeholder="Contoh: 7171011234560001"
                                        className="gpm-input-box"
                                        value={noKK}
                                        onChange={(e) => setNoKK(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
                                      />
                                      <small style={{ color: noKK.length === 16 ? '#15803d' : '#64748b', marginTop: '4px', display: 'block', fontSize: '0.8rem' }}>
                                        {noKK.length}/16 digit {noKK.length > 0 && noKK.length < 16 && `(Kurang ${16 - noKK.length} digit)`}
                                      </small>
                                    </div>
                                    <div className="gpm-input-field">
                                      <label>Jumlah Anggota Keluarga <span style={{ color: '#888', fontWeight: 'normal' }}>(Orang)</span></label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        className="gpm-input-box"
                                        value={jumlahAnggota}
                                        onChange={(e) => setJumlahAnggota(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                                      />
                                    </div>
                                  </>
                                )}

                                <div className="gpm-input-field">
                                  <label>Nama Lengkap Anda <span style={{ color: '#e74c3c' }}>*</span></label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Budi Santoso"
                                    className="gpm-input-box"
                                    value={namaLengkap}
                                    onChange={(e) => setNamaLengkap(e.target.value.replace(/[^a-zA-Z\s'.]/g, ''))}
                                  />
                                </div>

                                <div className="gpm-input-field">
                                  <label>Nomor Telepon / WhatsApp <span style={{ color: '#888', fontWeight: 'normal' }}>(Opsional)</span></label>
                                  <input
                                    type="tel"
                                    placeholder="081234567890 (Boleh dikosongkan)"
                                    className="gpm-input-box"
                                    value={nomorTelepon}
                                    onChange={(e) => setNomorTelepon(e.target.value.replace(/[^0-9]/g, '').slice(0, 15))}
                                  />
                                </div>

                                <button
                                  type="submit"
                                  className="btn-gpm-submit-queue"
                                  disabled={sedangDaftar}
                                >
                                  <span>{sedangDaftar ? '⏳ Memproses Nomor Antrean...' : '🎟️ Ambil Nomor Antrean & Kode QR'}</span>
                                </button>
                              </form>
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                        <p>Silakan pilih titik acara GPM di peta atau daftar untuk mendaftar antrean.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ════════════════════════════════════════════════════════════════
             TAB 2: RIWAYAT GPM TERLAKSANA (TRANSPARANSI PUBLIK — AGREGAT ANONIM UU PDP)
             ════════════════════════════════════════════════════════════════ */
          <div className="gpm-public-history-section">
            <div className="gpm-history-summary-grid">
              <div className="gpm-hs-card">
                <span className="gpm-hs-lbl">Total Kegiatan Terlaksana</span>
                <strong className="gpm-hs-val">{ringkasanRiwayat.totalKegiatan}</strong>
                <small>arsip resmi selesai</small>
              </div>
              <div className="gpm-hs-card">
                <span className="gpm-hs-lbl">Total Warga Mendaftar</span>
                <strong className="gpm-hs-val" style={{ color: '#1d4ed8' }}>{ringkasanRiwayat.totalDaftar}</strong>
                <small>dari {ringkasanRiwayat.totalKuota} kuota disediakan</small>
              </div>
              <div className="gpm-hs-card">
                <span className="gpm-hs-lbl">Warga Hadir Terlayani</span>
                <strong className="gpm-hs-val" style={{ color: '#15803d' }}>{ringkasanRiwayat.totalHadir}</strong>
                <small>terverifikasi QR di lokasi</small>
              </div>
              <div className="gpm-hs-card">
                <span className="gpm-hs-lbl">Rata-rata Keramaian</span>
                <strong className="gpm-hs-val" style={{ color: '#8b1e1e' }}>{ringkasanRiwayat.rataPersen}%</strong>
                <small>tingkat keterisian kuota</small>
              </div>
            </div>

            {daftarRiwayatPublik.length === 0 ? (
              <div className="gpm-empty-card">
                <p>Belum ada riwayat kegiatan Gerakan Pangan Murah yang selesai tercatat.</p>
              </div>
            ) : (
              <div className="gpm-pub-history-grid">
                {daftarRiwayatPublik.map((acara) => {
                  const st = acara.statusOperasional;
                  return (
                    <article key={acara.id} className="gpm-pub-history-card">
                      <div className="gpm-ph-top">
                        <span className="event-status-chip is-selesai">✓ Selesai</span>
                        <span className={`gpm-crowd-badge is-${st.kelasAntusiasme}`}>
                          {st.labelAntusiasme} ({st.persenTerisi}%)
                        </span>
                      </div>

                      <h3 className="gpm-ph-title">{acara.nama_acara}</h3>
                      <p className="gpm-ph-loc">📍 {acara.lokasi} (Kec. {acara.kecamatan})</p>
                      <p className="gpm-ph-time">
                        📅 {jadwalGPMService.formatTanggalID(acara.tanggal)} · ⏰ {acara.jam_mulai} – {acara.jam_selesai} WITA
                      </p>

                      {/* Progress Bar Keramaian / Antusiasme */}
                      <div className="gpm-quota-progress-wrap">
                        <div className="gpm-quota-progress-track">
                          <div
                            className={`gpm-quota-progress-fill ${st.persenTerisi >= 90 ? 'is-full' : st.persenTerisi >= 65 ? 'is-high' : ''}`}
                            style={{ width: `${st.persenTerisi}%` }}
                          />
                        </div>
                        <div className="gpm-ph-stats-row">
                          <span>👥 Pendaftar: <strong>{st.terisi} / {st.kuotaMaks}</strong></span>
                          <span>✅ Hadir: <strong>{st.totalHadir} warga</strong></span>
                        </div>
                      </div>

                      {acara.komoditas_tersedia && (
                        <div className="gpm-ph-commodities">
                          <strong>🌾 Komoditas:</strong> {acara.komoditas_tersedia}
                        </div>
                      )}

                      <div className="gpm-ph-footer">
                        🔒 Pendaftaran ditutup • Statistik agregat resmi (privasi warga dilindungi)
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
