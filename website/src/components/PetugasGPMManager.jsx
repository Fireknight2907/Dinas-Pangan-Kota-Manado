// ===================================================================================
// KOMPONEN PENGELOLAAN GPM OLEH PETUGAS - WEBSITE
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: 
// 1. Menu Tambah Jadwal & Titik Lokasi Peta GPM (Interaktif Klik Titik Maps)
// 2. Menu Scan QR Code (Menampilkan Data Masyarakat & Nomor Antrean)
// 3. Menu Monitoring Jumlah Antrean & Data Orang yang Mendaftar
// 4. Pengelolaan Master Kecamatan (Khusus Kepala Bagian / Admin)
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import QRCodeComponent from './QRCodeComponent';
import { gpmService } from '../services/GPMService';
import { hargaPanganService } from '../services/HargaPanganService';
import './PetugasGPMManager.css';

// Ikon Pin Peta Petugas Leaflet
const ikonGPMPetugas = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Komponen Pembantu Pemilih Titik Peta (Klik Langsung di Peta untuk Menentukan Lokasi)
function PenentuTitikPeta({ posisi, onPilihTitik }) {
  useMapEvents({
    click(e) {
      onPilihTitik(e.latlng.lat, e.latlng.lng);
    }
  });

  return posisi ? (
    <Marker position={posisi} icon={ikonGPMPetugas}>
      <Popup>
        <strong>Titik Lokasi Acara GPM Terpilih</strong><br />
        Lat: {posisi[0].toFixed(5)}<br />
        Lng: {posisi[1].toFixed(5)}
      </Popup>
    </Marker>
  ) : null;
}

export default function PetugasGPMManager({ token, pengguna }) {
  // ─────────────────────────────────────────────
  // 1. STATE MANAGEMENT
  // ─────────────────────────────────────────────
  const [subTab, setSubTab] = useState('scan'); // 'scan', 'antrean', 'buat-gpm'
  
  // Data Acara & Pendaftar
  const [daftarAcara, setDaftarAcara] = useState([]);
  const [acaraTerpilihId, setAcaraTerpilihId] = useState('');
  const [daftarPendaftar, setDaftarPendaftar] = useState([]);
  const [statistikGlobal, setStatistikGlobal] = useState({
    total_gpm: 0,
    gpm_aktif: 0,
    total_antrean: 0,
    total_hadir: 0,
    total_menunggu: 0
  });

  // State Fitur Scan QR Code
  const [inputQRCode, setInputQRCode] = useState('');
  const [sedangScan, setSedangScan] = useState(false);
  const [pesanScanError, setPesanScanError] = useState('');
  const [hasilScanPendaftar, setHasilScanPendaftar] = useState(null);
  const [statusVerifikasiSukses, setStatusVerifikasiSukses] = useState(false);

  // Master Data Kecamatan
  const [daftarKecamatan, setDaftarKecamatan] = useState([]);
  const [tambahKecamatanBaruInput, setTambahKecamatanBaruInput] = useState('');
  const [tampilkanFormKecamatan, setTampilkanFormKecamatan] = useState(false);

  // Form Tambah Acara GPM Baru
  const [formGPM, setFormGPM] = useState({
    nama_acara: '',
    lokasi: '',
    kecamatan: 'Wenang',
    tanggal: new Date().toISOString().split('T')[0],
    jam_mulai: '08:00',
    jam_selesai: '13:00',
    latitude: 1.4883,
    longitude: 124.8436,
    kuota_maksimal: 250,
    komoditas_tersedia: 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg, Telur Ayam',
    deskripsi: ''
  });
  const [sedangSimpanAcara, setSedangSimpanAcara] = useState(false);
  const [notifSukses, setNotifSukses] = useState('');
  const [filterCariTabel, setFilterCariTabel] = useState('');

  // Cek apakah pengguna adalah Kepala Bagian atau Admin
  const bisaKelolaMaster = pengguna?.peran === 'Kepala Bagian' || pengguna?.peran === 'Admin';

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataAwal();
    muatKecamatan();
  }, []);

  const muatKecamatan = () => {
    const list = hargaPanganService.ambilKecamatan();
    setDaftarKecamatan(list);
    if (list.length > 0 && !formGPM.kecamatan) {
      setFormGPM(prev => ({ ...prev, kecamatan: list[0] }));
    }
  };

  const muatDataAwal = async () => {
    try {
      const acara = await gpmService.ambilSemuaAcara();
      setDaftarAcara(acara);
      if (acara.length > 0 && !acaraTerpilihId) {
        setAcaraTerpilihId(acara[0].id);
        muatPendaftar(acara[0].id);
      }

      const stat = await gpmService.ambilStatistik();
      setStatistikGlobal(stat);
    } catch (err) {
      console.error('[PetugasGPM] Error muat data:', err);
    }
  };

  const muatPendaftar = async (acaraId) => {
    try {
      const res = await gpmService.ambilPendaftarAcara(acaraId);
      setDaftarPendaftar(res.data || []);
    } catch (err) {
      console.error('[PetugasGPM] Error muat pendaftar:', err);
    }
  };

  // ─────────────────────────────────────────────
  // 3. FITUR SCAN QR CODE PETUGAS
  // ─────────────────────────────────────────────
  const handleEksekusiScan = async (e, qrOverride = null) => {
    if (e) e.preventDefault();
    const qrCode = qrOverride || inputQRCode;

    if (!qrCode.trim()) {
      setPesanScanError('Silakan masukkan atau scan kode QR tiket antrean!');
      return;
    }

    setSedangScan(true);
    setPesanScanError('');
    setHasilScanPendaftar(null);
    setStatusVerifikasiSukses(false);

    try {
      const data = await gpmService.scanBarcode(qrCode);
      setHasilScanPendaftar(data);
    } catch (err) {
      setPesanScanError(err.message || 'Data pendaftar antrean tidak ditemukan di sistem.');
    } finally {
      setSedangScan(false);
    }
  };

  // Konfirmasi Kehadiran / Layani Pendaftar
  const handleKonfirmasiKehadiran = async () => {
    if (!hasilScanPendaftar) return;
    try {
      await gpmService.verifikasiKehadiran(hasilScanPendaftar.kode_barcode);
      setStatusVerifikasiSukses(true);
      setHasilScanPendaftar(prev => ({ ...prev, status_kehadiran: 'Hadir' }));
      
      // Refresh statistik dan daftar
      muatDataAwal();
      if (acaraTerpilihId) muatPendaftar(acaraTerpilihId);
    } catch (err) {
      alert('Gagal verifikasi: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────
  // 4. TAMBAH KECAMATAN OLEH KEPALA BAGIAN
  // ─────────────────────────────────────────────
  const handleTambahKecamatan = (e) => {
    e.preventDefault();
    if (!tambahKecamatanBaruInput.trim()) return;
    try {
      const updated = hargaPanganService.tambahKecamatan(tambahKecamatanBaruInput.trim());
      setDaftarKecamatan(updated);
      setFormGPM(prev => ({ ...prev, kecamatan: tambahKecamatanBaruInput.trim() }));
      setTambahKecamatanBaruInput('');
      setTampilkanFormKecamatan(false);
      alert(`✅ Kecamatan baru "${tambahKecamatanBaruInput.trim()}" berhasil ditambahkan dan otomatis tersedia untuk staf!`);
    } catch (err) {
      alert(err.message);
    }
  };

  // ─────────────────────────────────────────────
  // 5. FITUR TAMBAH ACARA GPM BARU
  // ─────────────────────────────────────────────
  const handleSimpanAcaraGPM = async (e) => {
    e.preventDefault();
    if (!formGPM.nama_acara.trim() || !formGPM.lokasi.trim()) {
      alert('Nama acara dan lokasi wajib diisi!');
      return;
    }

    setSedangSimpanAcara(true);
    try {
      await gpmService.tambahAcara(formGPM);
      setNotifSukses('✅ Acara Gerakan Pangan Murah (GPM) baru berhasil dijadwalkan dan muncul di peta publik!');
      setTimeout(() => setNotifSukses(''), 4000);

      // Reset form
      setFormGPM({
        nama_acara: '',
        lokasi: '',
        kecamatan: daftarKecamatan[0] || 'Wenang',
        tanggal: new Date().toISOString().split('T')[0],
        jam_mulai: '08:00',
        jam_selesai: '13:00',
        latitude: 1.4883,
        longitude: 124.8436,
        kuota_maksimal: 250,
        komoditas_tersedia: 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg, Telur Ayam',
        deskripsi: ''
      });

      muatDataAwal();
    } catch (err) {
      alert('Gagal menambah acara GPM: ' + err.message);
    } finally {
      setSedangSimpanAcara(false);
    }
  };

  // Preset Cepat Titik Lokasi Kota Manado
  const presetLokasiManado = [
    { nama: 'Lapangan Sparta Tikala', lat: 1.4883, lng: 124.8436, kec: 'Tikala' },
    { nama: 'Pasar Bersehati Karombasan', lat: 1.4674, lng: 124.8468, kec: 'Wanea' },
    { nama: 'Pasar Bahu Malalayang', lat: 1.4641, lng: 124.8252, kec: 'Malalayang' },
    { nama: 'Kantor Camat Tuminting', lat: 1.5126, lng: 124.8488, kec: 'Tuminting' },
    { nama: 'Kawasan Megamas (Pesisir)', lat: 1.4842, lng: 124.8322, kec: 'Wenang' },
    { nama: 'Kantor Camat Mapanget', lat: 1.5369, lng: 124.9126, kec: 'Mapanget' }
  ];

  const terapkanPreset = (p) => {
    setFormGPM(prev => ({
      ...prev,
      lokasi: p.nama,
      kecamatan: p.kec,
      latitude: p.lat,
      longitude: p.lng
    }));
  };

  // Toggle kehadiran di tabel
  const handleToggleKehadiranTabel = async (pendaftar) => {
    try {
      await gpmService.verifikasiKehadiran(pendaftar.kode_barcode);
      muatPendaftar(acaraTerpilihId);
      muatDataAwal();
    } catch (err) {
      alert('Gagal mengubah kehadiran: ' + err.message);
    }
  };

  // Filter daftar pendaftar
  const pendaftarTerfilter = daftarPendaftar.filter((item) => {
    if (!filterCariTabel) return true;
    const cari = filterCariTabel.toLowerCase();
    return (
      (item.nama_pendaftar && item.nama_pendaftar.toLowerCase().includes(cari)) ||
      (item.nomor_telepon && item.nomor_telepon.includes(cari)) ||
      (item.kode_barcode && item.kode_barcode.toLowerCase().includes(cari)) ||
      String(item.nomor_antrean).includes(cari)
    );
  });

  return (
    <div className="petugas-gpm-wrapper">
      {/* ─────────────────────────────────────────────
          1. STATISTIK GLOBAL GPM
          ───────────────────────────────────────────── */}
      <div className="gpm-summary-cards-row">
        <div className="summary-card-item">
          <div className="summary-card-icon">📍</div>
          <div>
            <div className="summary-card-num">{statistikGlobal.total_gpm}</div>
            <div className="summary-card-lbl">Total Acara GPM</div>
          </div>
        </div>

        <div className="summary-card-item">
          <div className="summary-card-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            🎟️
          </div>
          <div>
            <div className="summary-card-num">{statistikGlobal.total_antrean}</div>
            <div className="summary-card-lbl">Total Antrean Terdaftar</div>
          </div>
        </div>

        <div className="summary-card-item">
          <div className="summary-card-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            ✅
          </div>
          <div>
            <div className="summary-card-num">{statistikGlobal.total_hadir}</div>
            <div className="summary-card-lbl">Hadir / Terlayani</div>
          </div>
        </div>

        <div className="summary-card-item">
          <div className="summary-card-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            ⏳
          </div>
          <div>
            <div className="summary-card-num">{statistikGlobal.total_menunggu}</div>
            <div className="summary-card-lbl">Antrean Menunggu</div>
          </div>
        </div>
      </div>

      {notifSukses && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 18px', borderRadius: '8px', marginBottom: '18px', fontWeight: 600 }}>
          {notifSukses}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          2. NAVIGASI SUBTAB
          ───────────────────────────────────────────── */}
      <div className="gpm-subtabs-nav">
        <button
          className={`gpm-subtab-btn ${subTab === 'scan' ? 'active' : ''}`}
          onClick={() => setSubTab('scan')}
        >
          📷 Scan QR Code Tiket
        </button>
        <button
          className={`gpm-subtab-btn ${subTab === 'antrean' ? 'active' : ''}`}
          onClick={() => setSubTab('antrean')}
        >
          👥 Rekap Antrean & Pendaftar ({daftarPendaftar.length})
        </button>
        <button
          className={`gpm-subtab-btn ${subTab === 'buat-gpm' ? 'active' : ''}`}
          onClick={() => setSubTab('buat-gpm')}
        >
          ➕ Jadwalkan Acara & Titik Peta
        </button>
      </div>

      {/* ─────────────────────────────────────────────
          3. VIEW SUBTAB 1: FITUR SCAN QR CODE
          ───────────────────────────────────────────── */}
      {subTab === 'scan' && (
        <div className="scan-panel-card">
          <div className="scan-panel-header">
            <h2 className="scan-panel-title">Verifikasi QR Code Tiket Antrean Warga</h2>
            <p className="scan-panel-desc">
              Pindai QR code tiket yang ditunjukkan oleh masyarakat atau masukkan kode secara manual untuk memverifikasi kehadiran di lokasi GPM.
            </p>
          </div>

          <form onSubmit={handleEksekusiScan} className="scan-input-group">
            <input
              type="text"
              className="scan-code-input"
              placeholder="Masukkan kode QR tiket (Contoh: GPM-MND-001-A9F2)"
              value={inputQRCode}
              onChange={(e) => setInputQRCode(e.target.value)}
            />
            <button type="submit" className="btn-exec-scan" disabled={sedangScan}>
              {sedangScan ? 'Memindai...' : '🔍 Pindai & Verifikasi'}
            </button>
          </form>

          {/* Tombol Demo Cepat untuk Petugas */}
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Uji coba QR Code pendaftar:</span>
            <button
              type="button"
              className="btn-preset-chip"
              onClick={() => { setInputQRCode('GPM-TIKA-001-A9F2'); handleEksekusiScan(null, 'GPM-TIKA-001-A9F2'); }}
            >
              Meity Rondonuwu (#001)
            </button>
            <button
              type="button"
              className="btn-preset-chip"
              onClick={() => { setInputQRCode('GPM-TIKA-002-C4B8'); handleEksekusiScan(null, 'GPM-TIKA-002-C4B8'); }}
            >
              Frangky Wenas (#002)
            </button>
          </div>

          {pesanScanError && (
            <div style={{ background: '#fdecea', color: '#c62828', padding: '12px', borderRadius: '8px', marginTop: '16px' }}>
              ⚠️ {pesanScanError}
            </div>
          )}

          {/* KARTU HASIL SCAN */}
          {hasilScanPendaftar && (
            <div className="scan-result-card">
              <div className="result-card-header">
                <span className="result-card-title">✅ DATA PENDAFTAR DITEMUKAN</span>
                <span className="result-barcode-tag">
                  KODE QR: {hasilScanPendaftar.kode_barcode}
                </span>
              </div>

              <div className="result-card-body">
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '10px', border: '1px solid #e9ecef', textAlign: 'center' }}>
                    <QRCodeComponent value={hasilScanPendaftar.kode_barcode} size={110} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', color: '#555' }}>
                      QR Resmi
                    </div>
                  </div>

                  <div className="result-data-grid" style={{ flex: 1, minWidth: '240px' }}>
                    <div className="data-item-col">
                      <span className="data-item-lbl">Nomor Antrean</span>
                      <span className="data-item-val big-queue">
                        #{String(hasilScanPendaftar.nomor_antrean).padStart(3, '0')}
                      </span>
                    </div>

                    <div className="data-item-col">
                      <span className="data-item-lbl">Status Kehadiran</span>
                      <div>
                        <span className={`badge-status-attend ${hasilScanPendaftar.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                          {hasilScanPendaftar.status_kehadiran === 'Hadir' ? '✓ Sudah Hadir / Terlayani' : '⏳ Menunggu Verifikasi'}
                        </span>
                      </div>
                    </div>

                    <div className="data-item-col">
                      <span className="data-item-lbl">Nama Lengkap Masyarakat</span>
                      <span className="data-item-val">{hasilScanPendaftar.nama_pendaftar}</span>
                    </div>

                    <div className="data-item-col">
                      <span className="data-item-lbl">Nomor Telepon / WhatsApp</span>
                      <span className="data-item-val">{hasilScanPendaftar.nomor_telepon}</span>
                    </div>

                    <div className="data-item-col" style={{ gridColumn: '1 / -1' }}>
                      <span className="data-item-lbl">Lokasi Acara GPM</span>
                      <span className="data-item-val">
                        {hasilScanPendaftar.acara ? hasilScanPendaftar.acara.nama_acara : 'Gerakan Pangan Murah (GPM) Kota Manado'}
                      </span>
                    </div>
                  </div>
                </div>

                {hasilScanPendaftar.status_kehadiran === 'Hadir' ? (
                  <div className="badge-verified-done">
                    ✅ Pendaftar ini telah diverifikasi hadir dan dapat langsung mengambil komoditas pangan murah.
                  </div>
                ) : (
                  <button className="btn-verify-success" onClick={handleKonfirmasiKehadiran}>
                    <span>✅</span> Konfirmasi Kehadiran & Layani Antrean #{hasilScanPendaftar.nomor_antrean}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          4. VIEW SUBTAB 2: DATA ORANG-ORANG PENDAFTAR
          ───────────────────────────────────────────── */}
      {subTab === 'antrean' && (
        <div className="gpm-table-panel">
          <div className="table-filter-bar">
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '4px' }}>
                PILIH ACARA GPM:
              </label>
              <select
                className="filter-select-event"
                value={acaraTerpilihId}
                onChange={(e) => {
                  setAcaraTerpilihId(e.target.value);
                  muatPendaftar(e.target.value);
                }}
              >
                {daftarAcara.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama_acara} ({a.lokasi})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '4px' }}>
                CARI PENDAFTAR / QR CODE:
              </label>
              <input
                type="text"
                placeholder="Cari nama, nomor telepon, kode QR..."
                className="filter-search-box"
                value={filterCariTabel}
                onChange={(e) => setFilterCariTabel(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pendaftar-data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>No. Urut</th>
                  <th>Nama Lengkap</th>
                  <th>No. Telepon / WA</th>
                  <th>Kode QR</th>
                  <th>Waktu Mendaftar</th>
                  <th>Status Kehadiran</th>
                  <th style={{ textAlign: 'center' }}>Aksi Petugas</th>
                </tr>
              </thead>
              <tbody>
                {pendaftarTerfilter.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                      Belum ada pendaftar untuk acara ini atau tidak cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  pendaftarTerfilter.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 800, color: '#8b1e1e' }}>
                        #{String(item.nomor_antrean).padStart(3, '0')}
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.nama_pendaftar}</td>
                      <td>{item.nomor_telepon}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
                          {item.kode_barcode}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#666' }}>
                        {item.waktu_mendaftar ? new Date(item.waktu_mendaftar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA' : '-'}
                      </td>
                      <td>
                        <span className={`badge-status-attend ${item.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                          {item.status_kehadiran === 'Hadir' ? '✓ Hadir' : 'Menunggu'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={item.status_kehadiran === 'Hadir' ? 'btn-cancel-attend' : 'btn-mark-attend'}
                          onClick={() => handleToggleKehadiranTabel(item)}
                        >
                          {item.status_kehadiran === 'Hadir' ? 'Batalkan' : '✓ Tandai Hadir'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          5. VIEW SUBTAB 3: TAMBAH ACARA & TITIK PETA LANGSUNG
          ───────────────────────────────────────────── */}
      {subTab === 'buat-gpm' && (
        <div className="scan-panel-card">
          <div style={{ marginBottom: '20px', borderBottom: '2px solid #f1f3f5', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a1a', fontWeight: 800 }}>
              📍 Penjadwalan & Titik Peta Gerakan Pangan Murah (GPM)
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
              Petugas mengisi nama acara, tanggal, dan <strong>cukup klik titik langsung di peta</strong> untuk menentukan lokasi acara tanpa perlu mengetik angka koordinat manual.
            </p>
          </div>

          <form onSubmit={handleSimpanAcaraGPM} className="gpm-add-event-form">
            <div className="form-field-full">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Nama Acara Gerakan Pangan Murah
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Gerakan Pangan Murah Lapangan Sparta Tikala"
                className="event-input-box"
                value={formGPM.nama_acara}
                onChange={(e) => setFormGPM({ ...formGPM, nama_acara: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Lokasi / Alamat Lengkap
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Halaman Kantor Kecamatan Tuminting"
                className="event-input-box"
                value={formGPM.lokasi}
                onChange={(e) => setFormGPM({ ...formGPM, lokasi: e.target.value })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Kecamatan (Kota Manado)
                </label>
                {bisaKelolaMaster && (
                  <button
                    type="button"
                    onClick={() => setTampilkanFormKecamatan(!tampilkanFormKecamatan)}
                    style={{ background: 'none', border: 'none', color: '#8b1e1e', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    {tampilkanFormKecamatan ? 'Tutup Form' : '➕ Tambah Kecamatan Baru (Ketua)'}
                  </button>
                )}
              </div>

              {/* Form Tambah Kecamatan oleh Kepala Bagian */}
              {tampilkanFormKecamatan && bisaKelolaMaster && (
                <div style={{ background: '#fdf2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', marginBottom: '6px' }}>
                    👑 Tambah Master Kecamatan Baru:
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nama kecamatan baru..."
                      className="event-input-box"
                      style={{ height: '36px', fontSize: '0.85rem' }}
                      value={tambahKecamatanBaruInput}
                      onChange={(e) => setTambahKecamatanBaruInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleTambahKecamatan}
                      style={{ background: '#8b1e1e', color: '#fff', border: 'none', padding: '0 14px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              )}

              {/* Dropdown Kecamatan - Staf Hanya Memilih Dari Pilihan Yang Tersedia */}
              <select
                className="event-input-box"
                value={formGPM.kecamatan}
                onChange={(e) => setFormGPM({ ...formGPM, kecamatan: e.target.value })}
              >
                {daftarKecamatan.map((kec, idx) => (
                  <option key={idx} value={kec}>{kec}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                required
                className="event-input-box"
                value={formGPM.tanggal}
                onChange={(e) => setFormGPM({ ...formGPM, tanggal: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Jam Mulai
                </label>
                <input
                  type="text"
                  placeholder="08:00"
                  className="event-input-box"
                  value={formGPM.jam_mulai}
                  onChange={(e) => setFormGPM({ ...formGPM, jam_mulai: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Jam Selesai
                </label>
                <input
                  type="text"
                  placeholder="13:00"
                  className="event-input-box"
                  value={formGPM.jam_selesai}
                  onChange={(e) => setFormGPM({ ...formGPM, jam_selesai: e.target.value })}
                />
              </div>
            </div>

            {/* PETA PENENTU TITIK LOKASI INTERAKTIF (KLIK LANGSUNG DI PETA) */}
            <div className="form-field-full">
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#8b1e1e', marginBottom: '4px' }}>
                🗺️ Titik Lokasi Peta Acara GPM (Klik Langsung di Peta):
              </label>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#555' }}>
                Klik pada peta Kota Manado di bawah ini untuk menaruh penanda lokasi GPM. Staf tidak perlu menghafal koordinat angka.
              </p>

              <div style={{ height: '300px', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '2px solid #8b1e1e', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <MapContainer
                  center={[formGPM.latitude || 1.4883, formGPM.longitude || 124.8436]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <PenentuTitikPeta
                    posisi={[formGPM.latitude, formGPM.longitude]}
                    onPilihTitik={(lat, lng) => {
                      setFormGPM(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    }}
                  />
                </MapContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.82rem', color: '#555' }}>
                <span>
                  📍 Titik Terpilih: <strong>{formGPM.latitude.toFixed(5)}, {formGPM.longitude.toFixed(5)}</strong>
                </span>
                <span style={{ color: '#8b1e1e', fontWeight: 600 }}>
                  ✓ Titik koordinat tersimpan otomatis saat peta diklik
                </span>
              </div>

              {/* Preset Pilihan Cepat */}
              <div className="preset-loc-buttons" style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#666', alignSelf: 'center' }}>Pilihan Cepat Titik Lokasi:</span>
                {presetLokasiManado.map((p, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className="btn-preset-chip"
                    onClick={() => terapkanPreset(p)}
                  >
                    📍 {p.nama}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Kuota Maksimal Antrean Warga
              </label>
              <input
                type="number"
                min="10"
                required
                className="event-input-box"
                value={formGPM.kuota_maksimal}
                onChange={(e) => setFormGPM({ ...formGPM, kuota_maksimal: parseInt(e.target.value, 10) })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Komoditas Pangan yang Disediakan
              </label>
              <input
                type="text"
                placeholder="Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg"
                className="event-input-box"
                value={formGPM.komoditas_tersedia}
                onChange={(e) => setFormGPM({ ...formGPM, komoditas_tersedia: e.target.value })}
              />
            </div>

            <div className="form-field-full">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Deskripsi / Keterangan Acara
              </label>
              <textarea
                rows="3"
                placeholder="Catatan pelaksanaan, petunjuk bagi warga, dsb..."
                className="event-input-box"
                value={formGPM.deskripsi}
                onChange={(e) => setFormGPM({ ...formGPM, deskripsi: e.target.value })}
              />
            </div>

            <div className="form-field-full">
              <button
                type="submit"
                style={{
                  background: '#8b1e1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
                disabled={sedangSimpanAcara}
              >
                {sedangSimpanAcara ? 'Menyimpan...' : '📍 Terbitkan Lokasi & Jadwal GPM ke Peta Publik'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
