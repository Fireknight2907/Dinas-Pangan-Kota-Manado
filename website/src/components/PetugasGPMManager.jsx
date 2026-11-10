// ===================================================================================
// KOMPONEN PENGELOLAAN GPM OLEH PETUGAS - WEBSITE
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: 
// 1. Menu Tambah Jadwal & Titik Lokasi Peta GPM (Interaktif Klik Titik Maps)
// 2. Menu Scan QR Code (Menampilkan Data Masyarakat & Nomor Antrean)
// 3. Menu Monitoring Jumlah Antrean & Data Orang yang Mendaftar
// 4. Pengelolaan Master Kecamatan (Khusus Kepala Bagian / Admin)
// ===================================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [kameraAktif, setKameraAktif] = useState(false);
  const html5QrCodeRef = useRef(null);

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

  // Identifikasi Hak Akses Peran Petugas (OOP RBAC)
  const peranUser = (pengguna?.peran || '').toLowerCase();
  const isKabid = peranUser === 'kabid' || peranUser === 'kepala bidang' || peranUser === 'kepala bagian' || peranUser === 'admin';
  const bisaKelolaMaster = isKabid;

  // State Riwayat Kegiatan GPM & Ekspor Rekapitulasi
  const [daftarRiwayat, setDaftarRiwayat] = useState([]);
  const [modalRiwayatDetail, setModalRiwayatDetail] = useState({
    buka: false,
    acara: null,
    pendaftar: [],
    loading: false
  });
  const [sedangSelesaikanAcara, setSedangSelesaikanAcara] = useState(false);

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
      const acaraAktif = await gpmService.ambilSemuaAcara('Aktif');
      const riwayat = await gpmService.ambilRiwayatAcara();
      setDaftarAcara(acaraAktif);
      setDaftarRiwayat(riwayat);

      const targetId = acaraTerpilihId && acaraAktif.some(a => a.id === acaraTerpilihId)
        ? acaraTerpilihId
        : (acaraAktif.length > 0 ? acaraAktif[0].id : '');

      setAcaraTerpilihId(targetId);
      if (targetId) {
        muatPendaftar(targetId);
      } else {
        setDaftarPendaftar([]);
      }

      const stat = await gpmService.ambilStatistik();
      setStatistikGlobal(stat);
    } catch (err) {
      console.error('[PetugasGPM] Error muat data:', err);
    }
  };

  // Selesaikan Kegiatan GPM (Hanya Kepala Bidang & Admin)
  const handleSelesaikanAcara = async (acaraId) => {
    if (!isKabid) {
      alert('Hanya Kepala Bidang yang memiliki wewenang menyelesaikan kegiatan GPM.');
      return;
    }
    const acara = daftarAcara.find(a => a.id === acaraId);
    if (!acara) return;

    const konfirmasi = window.confirm(
      `Konfirmasi Selesaikan Kegiatan GPM:\n\nApakah Anda yakin ingin menyelesaikan dan mengunci kegiatan "${acara.nama_acara}"?\n\n- Kegiatan ini akan diarsipkan ke menu Riwayat GPM.\n- Pendaftaran tiket online untuk masyarakat otomatis ditutup.\n- Data antrean dan rekapitulasi akan dikunci untuk pelaporan.`
    );
    if (!konfirmasi) return;

    setSedangSelesaikanAcara(true);
    try {
      await gpmService.selesaikanAcara(acaraId);
      setNotifSukses(`✅ Kegiatan "${acara.nama_acara}" resmi diselesaikan dan diarsipkan ke menu Riwayat GPM.`);
      await muatDataAwal();
      setSubTab('riwayat');
    } catch (err) {
      alert('Gagal menyelesaikan kegiatan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setSedangSelesaikanAcara(false);
    }
  };

  // Hapus Riwayat Kegiatan GPM (Hanya Kepala Bidang & Admin)
  const handleHapusRiwayat = async (acaraId) => {
    if (!isKabid) {
      alert('Hanya Kepala Bidang yang berhak menghapus riwayat kegiatan GPM.');
      return;
    }
    const acara = daftarRiwayat.find(a => a.id === acaraId);
    if (!acara) return;

    const konfirmasi = window.confirm(
      `Hapus Riwayat Kegiatan GPM:\n\nApakah Anda yakin ingin menghapus data riwayat "${acara.nama_acara}" beserta seluruh rekaman antrean warga terkait?\n\nTindakan ini tidak dapat dibatalkan.`
    );
    if (!konfirmasi) return;

    try {
      await gpmService.hapusAcara(acaraId);
      setNotifSukses(`🗑️ Riwayat kegiatan "${acara.nama_acara}" berhasil dihapus.`);
      await muatDataAwal();
    } catch (err) {
      alert('Gagal menghapus riwayat: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  // Buka Modal Detail Rekap Antrean Riwayat
  const handleBukaDetailRiwayat = async (acara) => {
    setModalRiwayatDetail({ buka: true, acara, pendaftar: [], loading: true });
    try {
      const res = await gpmService.ambilPendaftarAcara(acara.id);
      setModalRiwayatDetail({ buka: true, acara, pendaftar: res.data || [], loading: false });
    } catch (err) {
      setModalRiwayatDetail(prev => ({ ...prev, loading: false }));
    }
  };

  // Ekspor Rekapitulasi Data Pendaftar ke CSV
  const handleEksporLangsungRiwayat = async (acara) => {
    try {
      const res = await gpmService.ambilPendaftarAcara(acara.id);
      gpmService.eksporKeCSV(acara, res.data || []);
    } catch (err) {
      alert('Gagal mengunduh file rekap CSV: ' + err.message);
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
  // ─────────────────────────────────────────────
  // 3. FITUR SCAN QR CODE & KAMERA LIVE
  // ─────────────────────────────────────────────
  const handleMulaiScanKamera = async () => {
    setKameraAktif(true);
    setPesanScanError('');
    setTimeout(async () => {
      try {
        const el = document.getElementById('webQrReader');
        if (!el) return;
        const html5QrCode = new Html5Qrcode("webQrReader");
        html5QrCodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 }
          },
          (decodedText) => {
            handleHentikanScanKamera();
            setInputQRCode(decodedText);
            handleEksekusiScan(null, decodedText);
          },
          () => {}
        );
      } catch (err) {
        setPesanScanError("Gagal membuka kamera: " + (err.message || 'Pastikan izin akses kamera diberikan pada peramban.'));
        setKameraAktif(false);
      }
    }, 300);
  };

  const handleHentikanScanKamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setKameraAktif(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try { html5QrCodeRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

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
    <div className="petugas-gpm-wrap">
      {/* ─────────────────────────────────────────────
          1. STATISTIK GLOBAL GPM (4 KARTU MODERN)
          ───────────────────────────────────────────── */}
      <div className="gpm-stats-grid-row">
        <div className="gpm-mini-stat-card">
          <div className="stat-card-icon-box icon-red">📍</div>
          <div className="stat-card-info">
            <div className="stat-card-val">{statistikGlobal.total_gpm}</div>
            <div className="stat-card-label">Total Acara GPM</div>
            <div className="stat-card-sub">titik pelaksanaan</div>
          </div>
        </div>

        <div className="gpm-mini-stat-card">
          <div className="stat-card-icon-box icon-blue">🎟️</div>
          <div className="stat-card-info">
            <div className="stat-card-val">{statistikGlobal.total_antrean}</div>
            <div className="stat-card-label">Total Antrean</div>
            <div className="stat-card-sub">warga terdaftar</div>
          </div>
        </div>

        <div className="gpm-mini-stat-card">
          <div className="stat-card-icon-box icon-green">✅</div>
          <div className="stat-card-info">
            <div className="stat-card-val">{statistikGlobal.total_hadir}</div>
            <div className="stat-card-label">Hadir / Terlayani</div>
            <div className="stat-card-sub">terverifikasi QR</div>
          </div>
        </div>

        <div className="gpm-mini-stat-card">
          <div className="stat-card-icon-box icon-amber">⏳</div>
          <div className="stat-card-info">
            <div className="stat-card-val">{statistikGlobal.total_menunggu}</div>
            <div className="stat-card-label">Antrean Menunggu</div>
            <div className="stat-card-sub">belum dipindai di lokasi</div>
          </div>
        </div>
      </div>

      {notifSukses && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '14px 18px', borderRadius: '10px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
          {notifSukses}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          2. NAVIGASI SUBTAB (MODERN PILL TABS)
          ───────────────────────────────────────────── */}
      <div className="gpm-officer-subnav">
        <button
          className={`subnav-btn ${subTab === 'scan' ? 'active' : ''}`}
          onClick={() => setSubTab('scan')}
        >
          📷 Pindai Kode QR Tiket
        </button>
        <button
          className={`subnav-btn ${subTab === 'antrean' ? 'active' : ''}`}
          onClick={() => setSubTab('antrean')}
        >
          👥 Rekap Antrean & Pendaftar ({daftarPendaftar.length})
        </button>
        <button
          className={`subnav-btn ${subTab === 'buat-gpm' ? 'active' : ''}`}
          onClick={() => setSubTab('buat-gpm')}
        >
          ➕ Jadwalkan Acara & Titik Peta
        </button>
        <button
          className={`subnav-btn ${subTab === 'riwayat' ? 'active' : ''}`}
          onClick={() => setSubTab('riwayat')}
        >
          📜 Riwayat GPM ({daftarRiwayat.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────
          3. VIEW SUBTAB 1: FITUR SCAN QR CODE
          ───────────────────────────────────────────── */}
      {subTab === 'scan' && (
        <div className="scan-panel-card">
          <div className="scan-box-header">
            <div className="scan-box-icon">📷</div>
            <h2 className="scan-box-title">Verifikasi Kode QR Tiket Antrean Warga</h2>
            <p className="scan-box-desc">
              Pindai kode QR tiket yang ditunjukkan oleh masyarakat atau masukan kode secara manual untuk memverifikasi kehadiran di lokasi GPM.
            </p>
          </div>

          {/* Tombol Pemindai Kamera Langsung (Responsif HP, iPhone & Laptop) */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            {!kameraAktif ? (
              <button
                type="button"
                onClick={handleMulaiScanKamera}
                style={{
                  background: '#8b1e1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 26px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(139, 30, 30, 0.28)',
                  transition: 'transform 0.15s ease'
                }}
              >
                📷 Buka Kamera Pemindai (Scan QR Langsung)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleHentikanScanKamera}
                style={{
                  background: '#475569',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ✕ Tutup Kamera
              </button>
            )}
          </div>

          {/* Kotak Bidik Kamera Scanner */}
          {kameraAktif && (
            <div style={{ maxWidth: '380px', margin: '0 auto 22px auto', background: '#0f172a', borderRadius: '14px', overflow: 'hidden', padding: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
              <div id="webQrReader" style={{ width: '100%', borderRadius: '10px', overflow: 'hidden' }}></div>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', margin: '8px 0 2px 0' }}>
                Arahkan kamera ke layar ponsel warga atau lembar tiket antrean
              </p>
            </div>
          )}

          {/* Garis Pemisah Opsi Manual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '18px auto', maxWidth: '620px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Atau Masukkan Kode Tiket Manual (Laptop/PC)</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          <form onSubmit={handleEksekusiScan} className="scan-input-row">
            <input
              type="text"
              className="scan-input-text"
              placeholder="Masukan kode QR tiket (Contoh: GPM-TIKA-001-A9F2)"
              value={inputQRCode}
              onChange={(e) => setInputQRCode(e.target.value)}
            />
            <button type="submit" className="btn-exec-scan" disabled={sedangScan}>
              <span>{sedangScan ? 'Memindai...' : '🔍 Pindai & Verifikasi'}</span>
            </button>
          </form>

          {/* Tombol Demo Cepat untuk Petugas */}
          <div className="scan-quick-samples">
            <span>Uji coba Kode QR pendaftar:</span>
            <button
              type="button"
              className="sample-barcode-chip"
              onClick={() => { setInputQRCode('GPM-TIKA-001-A9F2'); handleEksekusiScan(null, 'GPM-TIKA-001-A9F2'); }}
            >
              Meity Rondonuwu (#001)
            </button>
            <button
              type="button"
              className="sample-barcode-chip"
              onClick={() => { setInputQRCode('GPM-TIKA-002-C4B8'); handleEksekusiScan(null, 'GPM-TIKA-002-C4B8'); }}
            >
              Frangky Wenas (#002)
            </button>
          </div>

          {pesanScanError && (
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '14px 18px', borderRadius: '10px', marginTop: '18px', maxWidth: '620px', margin: '18px auto 0 auto' }}>
              ⚠️ {pesanScanError}
            </div>
          )}

          {/* KARTU HASIL SCAN */}
          {hasilScanPendaftar && (
            <div className="scan-result-profile-card">
              <div className="result-card-banner">
                <span className="result-banner-title">
                  <span>✓</span> DATA PENDAFTAR RESMI DITEMUKAN
                </span>
                <span className="result-barcode-tag">
                  {hasilScanPendaftar.kode_barcode}
                </span>
              </div>

              <div className="result-card-body">
                <div className="result-card-inner-flex">
                  <div className="result-qr-box">
                    <QRCodeComponent value={hasilScanPendaftar.kode_barcode} size={115} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '6px', color: '#64748b' }}>
                      QR RESMI GPM
                    </div>
                  </div>

                  <div className="result-data-grid">
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
                    ✅ Warga ini telah diverifikasi hadir dan berhak menerima paket pangan murah.
                  </div>
                ) : (
                  <button className="btn-verify-success" onClick={handleKonfirmasiKehadiran}>
                    <span>✓</span> Konfirmasi Kehadiran & Layani Antrean #{hasilScanPendaftar.nomor_antrean}
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
          <div className="table-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '4px' }}>
                  PILIH ACARA GPM AKTIF:
                </label>
                <select
                  className="filter-select-event"
                  value={acaraTerpilihId}
                  onChange={(e) => {
                    setAcaraTerpilihId(e.target.value);
                    muatPendaftar(e.target.value);
                  }}
                >
                  {daftarAcara.length === 0 ? (
                    <option value="">(Tidak ada acara GPM aktif)</option>
                  ) : (
                    daftarAcara.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama_acara} ({a.lokasi})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '4px' }}>
                  CARI PENDAFTAR / KODE QR:
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

            {/* Tombol Aksi Acara: Unduh CSV & Selesaikan GPM (Khusus Kepala Bidang) */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {daftarAcara.find(a => a.id === acaraTerpilihId) && (
                <button
                  type="button"
                  onClick={() => gpmService.eksporKeCSV(daftarAcara.find(a => a.id === acaraTerpilihId), daftarPendaftar)}
                  className="btn-export-csv"
                  title="Unduh rekapitulasi data pendaftar & nomor antrean dalam format Excel/CSV"
                >
                  📥 Export Data (CSV)
                </button>
              )}

              {daftarAcara.find(a => a.id === acaraTerpilihId) && isKabid && (
                <button
                  type="button"
                  onClick={() => handleSelesaikanAcara(acaraTerpilihId)}
                  disabled={sedangSelesaikanAcara}
                  className="btn-selesaikan-gpm"
                  title="Kunci kegiatan dan pindahkan ke Riwayat GPM (Khusus Kepala Bidang)"
                >
                  {sedangSelesaikanAcara ? 'Memproses...' : '🔒 Selesaikan Kegiatan GPM'}
                </button>
              )}
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
                    {tampilkanFormKecamatan ? 'Tutup Formulir' : '➕ Tambah Kecamatan Baru (Ketua)'}
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

      {/* ─────────────────────────────────────────────
          6. VIEW SUBTAB 4: RIWAYAT GPM & REKAPITULASI DATA
          ───────────────────────────────────────────── */}
      {subTab === 'riwayat' && (
        <div className="gpm-history-panel">
          <div className="history-header-bar">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                📜 Riwayat Kegiatan Gerakan Pangan Murah (GPM)
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Arsip kegiatan GPM yang telah diselesaikan. {isKabid ? 'Kepala Bidang dapat mengunduh rekap dan menghapus arsip riwayat.' : 'Staf dapat melihat rekapitulasi dan mengunduh data.'}
              </p>
            </div>
            <button
              type="button"
              onClick={muatDataAwal}
              style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              🔄 Segarkan Riwayat
            </button>
          </div>

          {daftarRiwayat.length === 0 ? (
            <div className="empty-history-box">
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📭</span>
              <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>Belum Ada Riwayat Kegiatan GPM</h4>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Kegiatan GPM yang telah diselesaikan oleh Kepala Bidang akan otomatis diarsipkan di sini.
              </p>
            </div>
          ) : (
            <div className="history-cards-grid">
              {daftarRiwayat.map((acara) => (
                <div key={acara.id} className="history-card-item">
                  <div className="history-card-head">
                    <div>
                      <span className="badge-closed-tag">✓ Kegiatan Selesai</span>
                      <h3 className="history-item-title">{acara.nama_acara}</h3>
                      <p className="history-item-sub">📍 {acara.lokasi} (Kec. {acara.kecamatan})</p>
                    </div>
                  </div>

                  <div className="history-card-meta">
                    <div className="meta-col">
                      <span className="meta-lbl">Pelaksanaan</span>
                      <span className="meta-val">📅 {acara.tanggal} ({acara.jam_mulai} - {acara.jam_selesai} WITA)</span>
                    </div>
                    <div className="meta-stats-row">
                      <div className="stat-pill">
                        <span className="stat-pill-num">{acara.kuota_maksimal || 250}</span>
                        <span className="stat-pill-label">Total Kuota</span>
                      </div>
                      <div className="stat-pill">
                        <span className="stat-pill-num">{acara.antrean_terisi || 0}</span>
                        <span className="stat-pill-label">Warga Mendaftar</span>
                      </div>
                    </div>
                  </div>

                  <div className="history-card-actions">
                    <button
                      type="button"
                      className="btn-action-view"
                      onClick={() => handleBukaDetailRiwayat(acara)}
                    >
                      👁️ Lihat Antrean
                    </button>
                    <button
                      type="button"
                      className="btn-action-download"
                      onClick={() => handleEksporLangsungRiwayat(acara)}
                    >
                      📥 Unduh Rekap (CSV)
                    </button>
                    {isKabid && (
                      <button
                        type="button"
                        className="btn-action-delete"
                        onClick={() => handleHapusRiwayat(acara.id)}
                        title="Hapus riwayat kegiatan ini (Khusus Kepala Bidang)"
                      >
                        🗑️ Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL LIHAT DETAIL & ANTREAN RIWAYAT GPM */}
      {modalRiwayatDetail.buka && modalRiwayatDetail.acara && (
        <div className="modal-overlay-backdrop" onClick={() => setModalRiwayatDetail({ buka: false, acara: null, pendaftar: [] })}>
          <div className="modal-history-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-history-header">
              <div>
                <span className="badge-closed-tag" style={{ marginBottom: '4px' }}>Arsip Selesai</span>
                <h3 style={{ margin: '4px 0', fontSize: '1.2rem', color: '#0f172a' }}>
                  {modalRiwayatDetail.acara.nama_acara}
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  📍 {modalRiwayatDetail.acara.lokasi} · 📅 {modalRiwayatDetail.acara.tanggal}
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalRiwayatDetail({ buka: false, acara: null, pendaftar: [] })}
              >
                ✕
              </button>
            </div>

            <div className="modal-history-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                  Daftar Pendaftar Warga ({modalRiwayatDetail.pendaftar.length} orang)
                </span>
                <button
                  type="button"
                  className="btn-export-csv"
                  onClick={() => gpmService.eksporKeCSV(modalRiwayatDetail.acara, modalRiwayatDetail.pendaftar)}
                >
                  📥 Unduh File CSV / Excel
                </button>
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="pendaftar-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>No.</th>
                      <th>Nama Warga</th>
                      <th>No. WhatsApp</th>
                      <th>Kode Tiket</th>
                      <th>Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRiwayatDetail.pendaftar.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          Tidak ada rekaman pendaftar pada acara ini.
                        </td>
                      </tr>
                    ) : (
                      modalRiwayatDetail.pendaftar.map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td style={{ fontWeight: 700, color: '#8b1e1e' }}>
                            #{String(p.nomor_antrean || idx + 1).padStart(3, '0')}
                          </td>
                          <td style={{ fontWeight: 600 }}>{p.nama_pendaftar}</td>
                          <td>{p.nomor_telepon}</td>
                          <td><code>{p.kode_barcode}</code></td>
                          <td>
                            <span className={`badge-status-attend ${p.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                              {p.status_kehadiran === 'Hadir' ? '✓ Hadir' : 'Menunggu'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-history-footer">
              <button
                type="button"
                className="btn-close-secondary"
                onClick={() => setModalRiwayatDetail({ buka: false, acara: null, pendaftar: [] })}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
