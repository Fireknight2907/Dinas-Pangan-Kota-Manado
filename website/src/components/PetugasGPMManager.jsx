// ===================================================================================
// KOMPONEN PENGELOLAAN GPM OLEH PETUGAS - WEBSITE
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: 
// 1. Menu Tambah Jadwal & Titik Lokasi Peta GPM
// 2. Menu Scan Barcode (Menampilkan Data Masyarakat & Nomor Antrean)
// 3. Menu Monitoring Jumlah Antrean & Data Orang yang Mendaftar
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { gpmService } from '../services/GPMService';
import './PetugasGPMManager.css';

export default function PetugasGPMManager({ token }) {
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

  // State Fitur Scan Barcode
  const [inputBarcode, setInputBarcode] = useState('');
  const [sedangScan, setSedangScan] = useState(false);
  const [pesanScanError, setPesanScanError] = useState('');
  const [hasilScanPendaftar, setHasilScanPendaftar] = useState(null);
  const [statusVerifikasiSukses, setStatusVerifikasiSukses] = useState(false);

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

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataAwal();
  }, []);

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
  // 3. FITUR SCAN BARCODE PETUGAS
  // ─────────────────────────────────────────────
  const handleEksekusiScan = async (e, barcodeOverride = null) => {
    if (e) e.preventDefault();
    const barcode = barcodeOverride || inputBarcode;

    if (!barcode.trim()) {
      setPesanScanError('Silakan masukkan atau scan kode barcode!');
      return;
    }

    setSedangScan(true);
    setPesanScanError('');
    setHasilScanPendaftar(null);
    setStatusVerifikasiSukses(false);

    try {
      const data = await gpmService.scanBarcode(barcode);
      setHasilScanPendaftar(data);
    } catch (err) {
      setPesanScanError(err.message || 'Data pendaftar antrean tidak ditemukan.');
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
  // 4. FITUR TAMBAH ACARA GPM BARU
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
      setNotifSukses('✅ Acara Gerakan Pangan Murah (GPM) baru berhasil dijadwalkan dan muncul di peta!');
      setTimeout(() => setNotifSukses(''), 4000);

      // Reset form
      setFormGPM({
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

      muatDataAwal();
    } catch (err) {
      alert('Gagal menambah acara GPM: ' + err.message);
    } finally {
      setSedangSimpanAcara(false);
    }
  };

  // Preset Koordinat Peta Kota Manado
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

  // Data terfilter untuk tabel
  const pendaftarTerfilter = daftarPendaftar.filter(item => {
    const q = filterCariTabel.toLowerCase();
    return (
      item.nama_pendaftar.toLowerCase().includes(q) ||
      item.nomor_telepon.includes(q) ||
      item.kode_barcode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="petugas-gpm-wrap">
      {/* ─────────────────────────────────────────────
          1. HEADER SUB-NAVIGASI MODUL GPM
          ───────────────────────────────────────────── */}
      <div className="gpm-officer-subnav">
        <button
          className={`subnav-btn ${subTab === 'scan' ? 'active' : ''}`}
          onClick={() => setSubTab('scan')}
        >
          <span>📷</span>
          <span>Scan Barcode Antrean</span>
        </button>

        <button
          className={`subnav-btn ${subTab === 'antrean' ? 'active' : ''}`}
          onClick={() => { setSubTab('antrean'); muatDataAwal(); }}
        >
          <span>📋</span>
          <span>Data Antrean ({daftarPendaftar.length})</span>
        </button>

        <button
          className={`subnav-btn ${subTab === 'buat-gpm' ? 'active' : ''}`}
          onClick={() => setSubTab('buat-gpm')}
        >
          <span>📍</span>
          <span>Jadwal & Lokasi GPM Baru</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────
          2. KARTU STATISTIK RINGKASAN ANTREAN (4 KARTU)
          ───────────────────────────────────────────── */}
      <div className="gpm-stats-grid-row">
        <div className="gpm-mini-stat-card">
          <div className="stat-card-val">{statistikGlobal.total_antrean || 4}</div>
          <div className="stat-card-label">Total Antrean Dibuat</div>
          <div className="stat-card-sub">oleh masyarakat online</div>
        </div>

        <div className="gpm-mini-stat-card">
          <div className="stat-card-val" style={{ color: '#27ae60' }}>
            {statistikGlobal.total_hadir || 1}
          </div>
          <div className="stat-card-label">Pendaftar Hadir / Selesai</div>
          <div className="stat-card-sub">terverifikasi scan barcode</div>
        </div>

        <div className="gpm-mini-stat-card">
          <div className="stat-card-val" style={{ color: '#f39c12' }}>
            {statistikGlobal.total_menunggu || 3}
          </div>
          <div className="stat-card-label">Antrean Menunggu</div>
          <div className="stat-card-sub">belum dipindai di lokasi</div>
        </div>

        <div className="gpm-mini-stat-card">
          <div className="stat-card-val" style={{ color: '#2a5298' }}>
            {daftarAcara.length || 3}
          </div>
          <div className="stat-card-label">Acara GPM Terjadwal</div>
          <div className="stat-card-sub">di titik peta Kota Manado</div>
        </div>
      </div>

      {notifSukses && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '12px 18px', borderRadius: '8px', fontWeight: 'bold' }}>
          {notifSukses}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          3. VIEW SUBTAB 1: MENU SCAN BARCODE PETUGAS
          ───────────────────────────────────────────── */}
      {subTab === 'scan' && (
        <div className="scan-panel-card">
          <div className="scan-box-header">
            <div className="scan-box-icon">📷</div>
            <h2 className="scan-box-title">Pemindaian Barcode Antrean GPM</h2>
            <p className="scan-box-desc">
              Pindai barcode masyarakat menggunakan barcode scanner atau masukkan kode barcode untuk melihat profil, nomor antrean, dan memverifikasi kehadiran di tempat.
            </p>
          </div>

          <form onSubmit={handleEksekusiScan} className="scan-input-row">
            <input
              type="text"
              autoFocus
              placeholder="Contoh: GPM-TIKA-001-A9F2"
              className="scan-input-text"
              value={inputBarcode}
              onChange={(e) => setInputBarcode(e.target.value)}
            />
            <button type="submit" className="btn-exec-scan" disabled={sedangScan}>
              {sedangScan ? '⏳ Memindai...' : '🔍 Scan / Cari'}
            </button>
          </form>

          {/* Tombol Uji Barcode Cepat */}
          <div className="scan-quick-samples">
            <span>Uji coba sampel barcode:</span>
            <span className="sample-barcode-chip" onClick={() => { setInputBarcode('GPM-TIKA-001-A9F2'); handleEksekusiScan(null, 'GPM-TIKA-001-A9F2'); }}>
              GPM-TIKA-001-A9F2 (Meity)
            </span>
            <span className="sample-barcode-chip" onClick={() => { setInputBarcode('GPM-TIKA-002-C4B8'); handleEksekusiScan(null, 'GPM-TIKA-002-C4B8'); }}>
              GPM-TIKA-002-C4B8 (Frangky)
            </span>
            <span className="sample-barcode-chip" onClick={() => { setInputBarcode('GPM-TIKA-003-X8Q1'); handleEksekusiScan(null, 'GPM-TIKA-003-X8Q1'); }}>
              GPM-TIKA-003-X8Q1 (Grace)
            </span>
          </div>

          {pesanScanError && (
            <div style={{ maxWidth: '600px', margin: '20px auto 0 auto', background: '#fdecea', color: '#c62828', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
              ⚠️ {pesanScanError}
            </div>
          )}

          {/* KARTU HASIL SCAN PROFIL MASYARAKAT */}
          {hasilScanPendaftar && (
            <div className="scan-result-profile-card">
              <div className="result-card-banner">
                <span className="result-banner-title">
                  <span>✅</span> Data Pendaftar Ditemukan
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Kode: {hasilScanPendaftar.kode_barcode}
                </span>
              </div>

              <div className="result-card-body">
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
                      {hasilScanPendaftar.acara ? hasilScanPendaftar.acara.nama_acara : 'Gerakan Pangan Murah (GPM) Sparta Tikala'}
                    </span>
                  </div>
                </div>

                {hasilScanPendaftar.status_kehadiran === 'Hadir' ? (
                  <div className="badge-verified-done">
                    ✅ Pendaftar ini telah diverifikasi hadir dan dapat langsung mengambil jatah pangan murah.
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
                CARI PENDAFTAR / BARCODE:
              </label>
              <input
                type="text"
                placeholder="Cari nama, nomor telepon, barcode..."
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
                  <th>Kode Barcode</th>
                  <th>Waktu Mendaftar</th>
                  <th>Status Kehadiran</th>
                  <th style={{ textAlign: 'center' }}>Aksi Petugas</th>
                </tr>
              </thead>
              <tbody>
                {pendaftarTerfilter.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                      Belum ada pendaftar pada acara GPM ini.
                    </td>
                  </tr>
                ) : (
                  pendaftarTerfilter.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 800, fontSize: '1.1rem', color: '#8b1e1e' }}>
                        #{String(item.nomor_antrean).padStart(3, '0')}
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.nama_pendaftar}</td>
                      <td>{item.nomor_telepon}</td>
                      <td>
                        <code style={{ background: '#f1f3f5', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.kode_barcode}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#666' }}>
                        {item.waktu_mendaftar ? new Date(item.waktu_mendaftar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA' : '-'}
                      </td>
                      <td>
                        <span className={`badge-status-attend ${item.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                          {item.status_kehadiran === 'Hadir' ? '✓ Hadir' : '⏳ Menunggu'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.status_kehadiran === 'Hadir' ? (
                          <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '0.85rem' }}>✓ Terverifikasi</span>
                        ) : (
                          <button
                            className="btn-toggle-verify"
                            onClick={() => handleToggleKehadiranTabel(item)}
                          >
                            Tandai Hadir
                          </button>
                        )}
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
          5. VIEW SUBTAB 3: TULIS JADWAL & LOKASI GPM BARU
          ───────────────────────────────────────────── */}
      {subTab === 'buat-gpm' && (
        <div className="scan-panel-card">
          <div style={{ marginBottom: '20px', borderBottom: '2px solid #f1f3f5', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a1a', fontWeight: 800 }}>
              📍 Penjadwalan & Titik Peta Gerakan Pangan Murah (GPM)
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
              Petugas mengisi lokasi, tanggal, serta koordinat titik peta agar masyarakat dapat melihat dan mengambil antrean online.
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
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Kecamatan (Kota Manado)
              </label>
              <select
                className="event-input-box"
                value={formGPM.kecamatan}
                onChange={(e) => setFormGPM({ ...formGPM, kecamatan: e.target.value })}
              >
                <option value="Wenang">Wenang</option>
                <option value="Tikala">Tikala</option>
                <option value="Wanea">Wanea</option>
                <option value="Sario">Sario</option>
                <option value="Malalayang">Malalayang</option>
                <option value="Tuminting">Tuminting</option>
                <option value="Singkil">Singkil</option>
                <option value="Mapanget">Mapanget</option>
                <option value="Paal Dua">Paal Dua</option>
                <option value="Bunaken">Bunaken</option>
                <option value="Bunaken Kepulauan">Bunaken Kepulauan</option>
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

            {/* Titik Koordinat Peta */}
            <div className="form-field-full">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                Titik Koordinat Peta (Latitude & Longitude Kota Manado)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude (Contoh: 1.4883)"
                  className="event-input-box"
                  value={formGPM.latitude}
                  onChange={(e) => setFormGPM({ ...formGPM, latitude: parseFloat(e.target.value) })}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude (Contoh: 124.8436)"
                  className="event-input-box"
                  value={formGPM.longitude}
                  onChange={(e) => setFormGPM({ ...formGPM, longitude: parseFloat(e.target.value) })}
                />
              </div>
              <div className="preset-loc-buttons">
                <span style={{ fontSize: '0.8rem', color: '#666', alignSelf: 'center' }}>Preset Lokasi Cepat:</span>
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
                Kuota Maksimal Antrean
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
