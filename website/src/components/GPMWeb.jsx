// ===================================================================================
// KOMPONEN GPM PUBLIK (GERAKAN PANGAN MURAH) - WEBSITE
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Peta Titik Lokasi GPM, Pilihan Acara, Formulir Ambil Antrean & Tiket Barcode
// Bebas Login untuk Masyarakat
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import QRCodeComponent from './QRCodeComponent';
import { gpmService } from '../services/GPMService';
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
  // ─────────────────────────────────────────────
  // 1. STATE MANAGEMENT
  // ─────────────────────────────────────────────
  const [daftarAcara, setDaftarAcara] = useState([]);
  const [acaraDipilih, setAcaraDipilih] = useState(null);
  const [sedangMemuat, setSedangMemuat] = useState(false);

  // Form Input Pendaftaran Antrean Masyarakat (Tanpa Login)
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [sedangDaftar, setSedangDaftar] = useState(false);
  const [pesanError, setPesanError] = useState('');

  // Hasil Tiket Antrean (Nomor Urut + Barcode)
  const [tiketHasil, setTiketHasil] = useState(null);

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDaftarAcaraGPM();
  }, []);

  const muatDaftarAcaraGPM = async () => {
    setSedangMemuat(true);
    try {
      const data = await gpmService.ambilSemuaAcara('Aktif');
      setDaftarAcara(data);
      if (data && data.length > 0) {
        setAcaraDipilih(data[0]); // Pilih acara pertama secara default
      }
    } catch (err) {
      console.error('[GPMWeb] Gagal memuat acara GPM:', err);
    } finally {
      setSedangMemuat(false);
    }
  };

  // ─────────────────────────────────────────────
  // 3. HANDLER PENDAFTARAN ANTREAN (PUBLIK)
  // ─────────────────────────────────────────────
  const handleAmbilAntrean = async (e) => {
    e.preventDefault();
    if (!acaraDipilih) {
      alert('Silakan pilih salah satu lokasi acara GPM terlebih dahulu!');
      return;
    }
    if (!namaLengkap.trim() || !nomorTelepon.trim()) {
      setPesanError('Nama Lengkap dan Nomor Telepon wajib diisi!');
      return;
    }

    // Validasi Keamanan Input Nama: Hanya huruf dan spasi, dilarang simbol & angka
    const regexNama = /^[a-zA-Z\s'.]+$/;
    if (!regexNama.test(namaLengkap.trim())) {
      setPesanError('Nama lengkap hanya boleh berisi huruf dan spasi (tidak boleh ada angka atau simbol)!');
      return;
    }
    if (namaLengkap.trim().length < 3) {
      setPesanError('Nama lengkap minimal 3 karakter!');
      return;
    }

    // Validasi Keamanan Input Nomor Telepon: Hanya angka, minimal > 10 digit (11-15 digit)
    const telpBersih = nomorTelepon.trim();
    const regexTelp = /^[0-9]+$/;
    if (!regexTelp.test(telpBersih)) {
      setPesanError('Nomor telepon hanya boleh berisi angka (tidak boleh ada huruf atau simbol)!');
      return;
    }
    if (telpBersih.length <= 10) {
      setPesanError('Nomor telepon harus di atas 10 digit (minimal 11 digit, contoh: 081234567890)!');
      return;
    }
    if (telpBersih.length > 15) {
      setPesanError('Nomor telepon maksimal 15 digit!');
      return;
    }

    setSedangDaftar(true);
    setPesanError('');
    try {
      const hasil = await gpmService.ambilNomorAntrean(
        acaraDipilih.id,
        namaLengkap,
        nomorTelepon
      );

      setTiketHasil(hasil);
      // Reset form
      setNamaLengkap('');
      setNomorTelepon('');
      // Refresh kuota
      muatDaftarAcaraGPM();
    } catch (err) {
      setPesanError(err.message || 'Gagal mengambil nomor antrean. Silakan coba lagi.');
    } finally {
      setSedangDaftar(false);
    }
  };

  // Cetak / Print Tiket
  const handlePrintTiket = () => {
    window.print();
  };

  return (
    <div className="gpm-page-wrapper">
      {/* ─────────────────────────────────────────────
          4. HERO BANNER GPM KOTA MANADO
          ───────────────────────────────────────────── */}
      <section className="gpm-hero-section">
        <div className="gpm-hero-container">
          <div className="gpm-hero-pill">
            <span>🎟️</span>
            <span>Gerakan Pangan Murah (GPM) Kota Manado</span>
          </div>

          <h1 className="gpm-hero-title">
            Antrean Daring Gerakan Pangan Murah
          </h1>

          <p className="gpm-hero-desc">
            Dapatkan komoditas pangan pokok berkualitas (beras SPHP, minyak goreng, gula, telur, dan cabai) dengan harga terjangkau langsung dari produsen untuk stabilisasi pasokan dan harga di Kota Manado.
          </p>

          <div className="gpm-hero-meta-badges">
            <div className="gpm-meta-item">
              <span>📍</span>
              <span><strong>{daftarAcara.length}</strong> Lokasi Pelaksanaan Tersedia</span>
            </div>
            <div className="gpm-meta-item">
              <span>🛡️</span>
              <span>Masyarakat <strong>Bebas Masuk Akun</strong> (Cukup Masukan Nama & No. HP)</span>
            </div>
            <div className="gpm-meta-item">
              <span>⚡</span>
              <span>Nomor Antrean & Kode QR Instan</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          5. KONTEN UTAMA: PETA SEBARAN & FORM ANTREAN
          ───────────────────────────────────────────── */}
      <main className="gpm-main-content">
        <div className="gpm-split-grid">

          {/* KOLOM KIRI: PETA TITIK LOKASI GPM & PILIHAN ACARA */}
          <div className="gpm-card-box">
            <div className="gpm-card-header">
              <div className="gpm-card-title-group">
                <div className="gpm-title-icon-badge">🗺️</div>
                <div>
                  <h3 className="gpm-card-title">Peta Titik Pelaksanaan GPM</h3>
                  <p className="gpm-card-subtitle">Klik pin lokasi merah di peta untuk melihat detail acara</p>
                </div>
              </div>
            </div>

            {/* PETA INTERAKTIF LEAFLET (KOTA MANADO) */}
            <div className="gpm-map-container">
              <MapContainer 
                center={[1.4883, 124.8436]} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {daftarAcara.map((acara) => (
                  <Marker
                    key={acara.id}
                    position={[acara.latitude || 1.4883, acara.longitude || 124.8436]}
                    icon={ikonGPM}
                    eventHandlers={{
                      click: () => setAcaraDipilih(acara)
                    }}
                  >
                    <Popup>
                      <div style={{ textAlign: 'left', minWidth: '180px' }}>
                        <strong style={{ color: '#8b1e1e', fontSize: '0.95rem' }}>{acara.nama_acara}</strong>
                        <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>📍 {acara.lokasi}</p>
                        <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#555' }}>
                          📅 {acara.tanggal} | ⏰ {acara.jam_mulai} - {acara.jam_selesai}
                        </p>
                        <p style={{ margin: '6px 0 0 0', fontWeight: 'bold', color: '#27ae60' }}>
                          Sisa Kuota: {acara.sisa_kuota ?? acara.kuota_maksimal} Antrean
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="gpm-map-tip">
              <span>💡</span>
              <span>Pin merah menunjukkan titik lokasi GPM yang ditaruh oleh petugas Dinas Pangan Kota Manado.</span>
            </div>

            {/* LIST DAFTAR ACARA UNTUK SELEKSI */}
            <h4 style={{ margin: '24px 0 10px 0', fontSize: '1rem', color: '#333' }}>
              Pilih Lokasi Acara GPM:
            </h4>
            <div className="gpm-event-selector-list">
              {daftarAcara.map((acara) => (
                <div
                  key={acara.id}
                  className={`gpm-event-select-item ${acaraDipilih?.id === acara.id ? 'is-selected' : ''}`}
                  onClick={() => setAcaraDipilih(acara)}
                >
                  <div className="event-item-left">
                    <div className="event-name-tag">{acara.nama_acara}</div>
                    <div className="event-loc-sub">
                      <span>📍</span> {acara.lokasi} (Kec. {acara.kecamatan})
                    </div>
                    <div className="event-time-row">
                      📅 {acara.tanggal} · ⏰ {acara.jam_mulai} - {acara.jam_selesai} WITA
                    </div>
                  </div>

                  <div className="event-quota-badge">
                    Sisa Kuota: {acara.sisa_kuota ?? (acara.kuota_maksimal - (acara.antrean_terisi || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KOLOM KANAN: DETAIL ACARA / FORM AMBIL ANTREAN / TIKET DIGITAL */}
          <div className="gpm-action-panel">

            {/* JIKA SUDAH BERHASIL MENDAPATKAN TIKET */}
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

                  {/* QR CODE GENERATOR RESMI */}
                  <div className="ticket-barcode-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '15px 0' }}>
                    <QRCodeComponent value={tiketHasil.tiket.kode_barcode} size={170} />
                    <div className="ticket-barcode-code-text" style={{ marginTop: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
                      {tiketHasil.tiket.kode_barcode}
                    </div>
                  </div>

                  {/* DETAIL INFORMASI TIKET */}
                  <div className="ticket-details-summary">
                    <p>
                      <span className="lbl">Nama Pendaftar:</span>
                      <span className="val">{tiketHasil.tiket.nama_pendaftar}</span>
                    </p>
                    <p>
                      <span className="lbl">Nomor Telepon / WA:</span>
                      <span className="val">{tiketHasil.tiket.nomor_telepon}</span>
                    </p>
                    <p>
                      <span className="lbl">Lokasi Acara GPM:</span>
                      <span className="val">{tiketHasil.acara.nama_acara}</span>
                    </p>
                    <p>
                      <span className="lbl">Alamat Tempat:</span>
                      <span className="val">{tiketHasil.acara.lokasi}</span>
                    </p>
                    <p>
                      <span className="lbl">Tanggal & Jam:</span>
                      <span className="val">{tiketHasil.acara.tanggal} ({tiketHasil.acara.jam})</span>
                    </p>
                  </div>

                  <div className="ticket-scan-instruction">
                    📱 <strong>Petunjuk:</strong> Tunjukkan Kode QR ini langsung di layar ponsel Anda kepada petugas di lokasi GPM saat giliran Anda tiba. Petugas akan memindai (pindai QR) untuk verifikasi antrean Anda.
                  </div>

                  <div className="ticket-actions-row">
                    <button className="btn-ticket-print" onClick={handlePrintTiket}>
                      🖨️ Cetak / Simpan Tiket
                    </button>
                    <button className="btn-ticket-new" onClick={() => setTiketHasil(null)}>
                      ➕ Ambil Nomor Lain
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DETAIL ACARA TERPILIH & FORMULIR PENDAFTARAN ANTREAN */
              <div className="gpm-detail-box">
                {acaraDipilih ? (
                  <>
                    <h3 className="gpm-highlight-title">{acaraDipilih.nama_acara}</h3>
                    
                    <div className="gpm-info-rows-stack">
                      <div className="gpm-info-row">
                        <strong>📍 Lokasi:</strong>
                        <span>{acaraDipilih.lokasi} (Kecamatan {acaraDipilih.kecamatan})</span>
                      </div>
                      <div className="gpm-info-row">
                        <strong>📅 Tanggal:</strong>
                        <span>{acaraDipilih.tanggal}</span>
                      </div>
                      <div className="gpm-info-row">
                        <strong>⏰ Waktu:</strong>
                        <span>{acaraDipilih.jam_mulai} - {acaraDipilih.jam_selesai} WITA</span>
                      </div>
                      <div className="gpm-info-row">
                        <strong>🎟️ Kuota Antrean:</strong>
                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                          Tersedia {acaraDipilih.sisa_kuota ?? (acaraDipilih.kuota_maksimal - (acaraDipilih.antrean_terisi || 0))} dari {acaraDipilih.kuota_maksimal} kuota
                        </span>
                      </div>
                    </div>

                    {acaraDipilih.komoditas_tersedia && (
                      <div className="gpm-commodities-pill-box">
                        <strong>🌾 Komoditas Pangan Murah Tersedia:</strong>
                        <p style={{ margin: '6px 0 0 0' }}>{acaraDipilih.komoditas_tersedia}</p>
                      </div>
                    )}

                    {/* FORM AMBIL ANTREAN (PUBLIK TANPA LOGIN) */}
                    <div className="gpm-form-wrapper">
                      <h4 className="gpm-form-title">
                        <span>🎟️</span> Ambil Nomor Antrean & Kode QR
                      </h4>
                      <p className="gpm-form-hint">
                        Masyarakat tidak perlu masuk akun. Cukup lengkapi data diri di bawah ini untuk mendapatkan tiket antrean digital resmi.
                      </p>

                      {pesanError && (
                        <div style={{ background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.9rem' }}>
                          ⚠️ {pesanError}
                        </div>
                      )}

                      <form onSubmit={handleAmbilAntrean}>
                        <div className="gpm-input-field">
                          <label>Nama Lengkap Anda</label>
                          <input
                            type="text"
                            required
                            placeholder="Budi Santoso"
                            className="gpm-input-box"
                            value={namaLengkap}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^a-zA-Z\s'.]/g, '');
                              setNamaLengkap(val);
                            }}
                          />
                        </div>

                        <div className="gpm-input-field">
                          <label>Nomor Telepon / WhatsApp</label>
                          <input
                            type="tel"
                            required
                            placeholder="081234567890"
                            className="gpm-input-box"
                            value={nomorTelepon}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setNomorTelepon(val);
                            }}
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
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                    <p>Silakan pilih titik acara GPM di peta atau daftar untuk mendaftar antrean.</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
