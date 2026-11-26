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
import { jadwalGPMService } from '../services/JadwalGPMService';
import { masterDataService } from '../services/MasterDataService';
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

export default function PetugasGPMManager({ token, pengguna, subTabAwal = 'scan' }) {
  // ─────────────────────────────────────────────
  // 1. STATE MANAGEMENT
  // ─────────────────────────────────────────────
  const [subTab, setSubTab] = useState(subTabAwal || 'scan'); // 'scan', 'antrean', 'buat-gpm', 'riwayat'

  useEffect(() => {
    if (subTabAwal) setSubTab(subTabAwal);
  }, [subTabAwal]);
  
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
    kecamatan: '',
    tanggal: new Date().toISOString().split('T')[0],
    jam_mulai: '08:00',
    jam_selesai: '13:00',
    latitude: 1.4883,
    longitude: 124.8436,
    kuota_maksimal: 100,
    komoditas_tersedia: '',
    deskripsi: '',
    mode_pendaftaran: 'online',
    mode_penerima: 'individu'
  });
  const [sedangSimpanAcara, setSedangSimpanAcara] = useState(false);
  const [notifSukses, setNotifSukses] = useState('');
  const [filterCariTabel, setFilterCariTabel] = useState('');

  // Identifikasi Hak Akses Peran Petugas (OOP RBAC)
  const peranUser = (pengguna?.peran || '').toLowerCase();
  const isKabid = peranUser === 'kabid' || peranUser === 'kepala bidang' || peranUser === 'kepala bagian' || peranUser === 'admin' || peranUser === 'superadmin';
  const bisaKelolaMaster = isKabid;

  // Modal Tambah Pendaftar Manual (Walk-In / Di Tempat saat Pelaksanaan GPM)
  const [modalTambahManual, setModalTambahManual] = useState({
    buka: false,
    acaraId: '',
    nama: '',
    nik: '',
    telepon: '',
    no_kk: '',
    jumlah_anggota: 1,
    langsungHadir: true,
    sedangKirim: false,
    pesanError: ''
  });

  // Master Pasar bertitik koordinat dari Supabase (100% data riil, tanpa preset hardcoded)
  const [daftarPasarKoordinat, setDaftarPasarKoordinat] = useState([]);

  // Modal Tambah / Ubah Kuota Acara GPM (Khusus Kepala Bidang & Superadmin)
  const [modalUbahKuota, setModalUbahKuota] = useState({
    buka: false,
    acara: null,
    kuotaBaru: '',
    sedangSimpan: false,
    pesanError: ''
  });

  // State Riwayat Kegiatan GPM & Ekspor Rekapitulasi
  const [daftarRiwayat, setDaftarRiwayat] = useState([]);
  const [modalRiwayatDetail, setModalRiwayatDetail] = useState({
    buka: false,
    acara: null,
    pendaftar: [],
    loading: false
  });
  const [sedangSelesaikanAcara, setSedangSelesaikanAcara] = useState(false);

  // Master Komoditas Pangan dari Master Komoditas Resmi Supabase untuk Dropdown Checklist Form GPM
  const [daftarKomoditasMaster, setDaftarKomoditasMaster] = useState([]);
  const [dropdownKomoditasBuka, setDropdownKomoditasBuka] = useState(false);

  // ─────────────────────────────────────────────
  // 2. LIFECYCLE & LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataAwal();
    muatKecamatan();
    muatMasterKomoditas();
    muatMasterPasarKoordinat();
  }, []);

  const muatMasterPasarKoordinat = async () => {
    try {
      const listPasar = await masterDataService.ambilDaftarPasarLengkap();
      const punyaTitik = (Array.isArray(listPasar) ? listPasar : [])
        .filter((p) => p && p.punyaKoordinat && p.latitude !== null && p.longitude !== null)
        .map((p) => ({
          nama: p.nama_pasar,
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          kec: p.kecamatan || ''
        }));
      setDaftarPasarKoordinat(punyaTitik);
    } catch (e) {
      console.warn('[PetugasGPM] Gagal memuat master pasar koordinat:', e);
    }
  };

  const muatMasterKomoditas = async () => {
    try {
      const listMaster = await masterDataService.ambilDaftarKomoditas();
      const namaResmi = Array.isArray(listMaster)
        ? listMaster.map((k) => `${k.nama_komoditas} (${k.satuan_bawaan || '1 KG'})`).filter(Boolean)
        : [];
      setDaftarKomoditasMaster(Array.from(new Set(namaResmi)));
    } catch (e) {
      console.warn('[PetugasGPM] Gagal memuat master komoditas:', e);
    }
  };

  const handleToggleKomoditas = (itemNama) => {
    let list = formGPM.komoditas_tersedia
      ? formGPM.komoditas_tersedia.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const idx = list.indexOf(itemNama);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(itemNama);
    }
    setFormGPM(prev => ({ ...prev, komoditas_tersedia: list.join(', ') }));
  };

  const handlePilihSemuaKomoditas = () => {
    setFormGPM(prev => ({ ...prev, komoditas_tersedia: daftarKomoditasMaster.join(', ') }));
  };

  const handleKosongkanKomoditas = () => {
    setFormGPM(prev => ({ ...prev, komoditas_tersedia: '' }));
  };

  const muatKecamatan = async () => {
    try {
      const list = await masterDataService.ambilDaftarKecamatan();
      setDaftarKecamatan(list);
      if (list.length > 0 && !formGPM.kecamatan) {
        setFormGPM(prev => ({ ...prev, kecamatan: list[0] }));
      }
    } catch (e) {
      console.warn('[PetugasGPM] Gagal memuat master kecamatan:', e);
    }
  };

  const muatDataAwal = async () => {
    try {
      const semuaAcara = await gpmService.ambilSemuaAcara('Semua');
      const acaraAktif = jadwalGPMService.urutkanAcaraAktif(semuaAcara);
      const riwayat = jadwalGPMService.urutkanRiwayatSelesai(semuaAcara);
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

      const totalAntrean = semuaAcara.reduce((acc, a) => acc + (Number(a.antrean_terisi) || 0), 0);
      const totalHadir = semuaAcara.reduce((acc, a) => acc + (Number(a.total_hadir) || 0), 0);
      setStatistikGlobal({
        total_gpm: semuaAcara.length,
        gpm_aktif: acaraAktif.length,
        gpm_selesai: riwayat.length,
        total_antrean: totalAntrean,
        total_hadir: totalHadir,
        total_menunggu: Math.max(0, totalAntrean - totalHadir)
      });
    } catch (err) {
      console.error('[PetugasGPM] Error muat data:', err);
    }
  };

  // Kabid / Superadmin: Buka & Simpan Ubah/Tambah Kuota Acara Aktif
  const handleBukaModalUbahKuota = (acara) => {
    if (!isKabid || !acara) return;
    setModalUbahKuota({
      buka: true,
      acara,
      kuotaBaru: String(acara.kuota_maksimal || 250),
      sedangSimpan: false,
      pesanError: ''
    });
  };

  const handleSimpanUbahKuota = async (e) => {
    e.preventDefault();
    const { acara, kuotaBaru } = modalUbahKuota;
    if (!acara) return;
    const angka = parseInt(String(kuotaBaru || '').replace(/[^0-9]/g, ''), 10);
    const terisi = Number(acara.antrean_terisi) || 0;
    if (!angka || angka < 1) {
      setModalUbahKuota(prev => ({ ...prev, pesanError: 'Kuota maksimal harus berupa angka minimal 1.' }));
      return;
    }
    if (angka < terisi) {
      setModalUbahKuota(prev => ({ ...prev, pesanError: `Kuota baru (${angka}) tidak boleh lebih kecil dari warga yang sudah terdaftar (${terisi}).` }));
      return;
    }

    setModalUbahKuota(prev => ({ ...prev, sedangSimpan: true, pesanError: '' }));
    try {
      await gpmService.ubahKuotaAcara(acara.id, angka);
      setModalUbahKuota({ buka: false, acara: null, kuotaBaru: '', sedangSimpan: false, pesanError: '' });
      setNotifSukses(`✅ Kuota kegiatan "${acara.nama_acara}" berhasil diperbarui menjadi ${angka} antrean!`);
      setTimeout(() => setNotifSukses(''), 4500);
      await muatDataAwal();
    } catch (err) {
      setModalUbahKuota(prev => ({ ...prev, sedangSimpan: false, pesanError: err?.message || 'Gagal memperbarui kuota.' }));
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

  // Ekspor Rekapitulasi Data Pendaftar ke Excel Resmi (.xlsx)
  const handleEksporLangsungRiwayat = async (acara) => {
    try {
      const res = await gpmService.ambilPendaftarAcara(acara.id);
      gpmService.eksporKeExcel(acara, res.data || [], { nama: pengguna?.nama || '' });
    } catch (err) {
      alert('Gagal mengunduh file rekap Excel: ' + err.message);
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
      await gpmService.verifikasiKehadiran(hasilScanPendaftar.kode_barcode, 'Hadir', pengguna?.id || null);
      setStatusVerifikasiSukses(true);
      setHasilScanPendaftar(prev => ({ ...prev, status_kehadiran: 'Hadir' }));
      
      // Refresh statistik dan daftar
      muatDataAwal();
      if (acaraTerpilihId) muatPendaftar(acaraTerpilihId);
    } catch (err) {
      alert('Gagal verifikasi: ' + err.message);
    }
  };

  // Konfirmasi Pengambilan Bahan Pangan (Via Layanan OOP GPMService -> RPC / PATCH aman)
  const handleKonfirmasiPengambilan = async (pendaftarId, dariHasilScan = false) => {
    if (!pendaftarId) return;
    try {
      await gpmService.konfirmasiPengambilanPangan(pendaftarId, pengguna?.id || null);
      if (dariHasilScan) {
        setHasilScanPendaftar((prev) => (prev ? { ...prev, status_pengambilan: 'Sudah Diambil', waktu_pengambilan: new Date().toISOString() } : prev));
      }
      setNotifSukses('📦 Pengambilan bahan pangan oleh warga berhasil dikonfirmasi!');
      setTimeout(() => setNotifSukses(''), 4000);
      if (acaraTerpilihId) await muatPendaftar(acaraTerpilihId);
      await muatDataAwal();
    } catch (err) {
      alert('Gagal konfirmasi pengambilan: ' + (err?.message || 'Terjadi kesalahan sistem'));
    }
  };

  // Buka Modal Tambah Pendaftar Manual (Walk-In / Di Tempat saat Pelaksanaan)
  const handleBukaModalManual = () => {
    setModalTambahManual({
      buka: true,
      acaraId: acaraTerpilihId || (daftarAcara[0] ? daftarAcara[0].id : ''),
      nama: '',
      nik: '',
      telepon: '',
      no_kk: '',
      jumlah_anggota: 1,
      langsungHadir: true,
      sedangKirim: false,
      pesanError: ''
    });
  };

  // Simpan Pendaftar Manual oleh Staf atau Kabid (mendukung mode Individu 1 NIK & Keluarga 1 KK)
  const handleSimpanPendaftarManual = async (e) => {
    e.preventDefault();
    const { acaraId, nama, nik, telepon, no_kk, jumlah_anggota, langsungHadir } = modalTambahManual;
    if (!acaraId) {
      setModalTambahManual(prev => ({ ...prev, pesanError: 'Silakan pilih kegiatan GPM!' }));
      return;
    }
    const nikBersih = (nik || '').replace(/[^0-9]/g, '').trim();
    if (!nikBersih) {
      setModalTambahManual(prev => ({ ...prev, pesanError: 'Nomor Induk Kependudukan (NIK) wajib diisi!' }));
      return;
    }
    if (nikBersih.length !== 16) {
      setModalTambahManual(prev => ({ ...prev, pesanError: `NIK harus tepat 16 digit angka! (Saat ini: ${nikBersih.length} digit)` }));
      return;
    }
    const namaBersih = (nama || '').trim();
    if (!namaBersih || namaBersih.length < 3) {
      setModalTambahManual(prev => ({ ...prev, pesanError: 'Nama lengkap wajib diisi minimal 3 karakter!' }));
      return;
    }
    const regexNama = /^[a-zA-Z\s'.]+$/;
    if (!regexNama.test(namaBersih)) {
      setModalTambahManual(prev => ({ ...prev, pesanError: 'Nama hanya boleh berupa huruf dan spasi!' }));
      return;
    }
    const telpBersih = (telepon || '').trim();
    if (telpBersih) {
      if (!/^[0-9]+$/.test(telpBersih) || telpBersih.length < 10 || telpBersih.length > 15) {
        setModalTambahManual(prev => ({ ...prev, pesanError: 'Nomor telepon harus antara 10-15 digit angka jika diisi!' }));
        return;
      }
    }
    const acaraTarget = daftarAcara.find((a) => String(a.id) === String(acaraId));
    const isModeKeluarga = String(acaraTarget?.mode_penerima || 'individu').toLowerCase() === 'keluarga';
    const noKkBersih = (no_kk || '').replace(/[^0-9]/g, '').trim();
    if (isModeKeluarga && noKkBersih && noKkBersih.length !== 16) {
      setModalTambahManual(prev => ({ ...prev, pesanError: `Nomor Kartu Keluarga (KK) harus tepat 16 digit angka! (Saat ini: ${noKkBersih.length} digit)` }));
      return;
    }

    setModalTambahManual(prev => ({ ...prev, sedangKirim: true, pesanError: '' }));
    try {
      const opsiKeluarga = isModeKeluarga
        ? {
            no_kk: noKkBersih || null,
            nama_kepala_keluarga: namaBersih,
            jumlah_anggota: Math.max(1, parseInt(String(jumlah_anggota), 10) || 1)
          }
        : null;
      const res = await gpmService.tambahPendaftarManual(
        acaraId,
        namaBersih,
        telpBersih || '-',
        nikBersih,
        langsungHadir,
        opsiKeluarga
      );
      setModalTambahManual({
        buka: false,
        acaraId: '',
        nama: '',
        nik: '',
        telepon: '',
        no_kk: '',
        jumlah_anggota: 1,
        langsungHadir: true,
        sedangKirim: false,
        pesanError: ''
      });
      setNotifSukses(`✅ Warga "${namaBersih}" berhasil didaftarkan langsung (Nomor Antrean #${res.tiket.nomor_antrean})${langsungHadir ? ' dan otomatis diverifikasi Hadir!' : '!'}`);
      setTimeout(() => setNotifSukses(''), 4500);
      muatDataAwal();
      if (acaraId === acaraTerpilihId) {
        muatPendaftar(acaraId);
      }
    } catch (err) {
      setModalTambahManual(prev => ({ ...prev, sedangKirim: false, pesanError: err.message || 'Gagal mendaftarkan warga secara manual.' }));
    }
  };

  // 4. TAMBAH KECAMATAN OLEH KEPALA BAGIAN (SINKRON SUPABASE)
  const handleTambahKecamatan = async (e) => {
    e.preventDefault();
    if (!tambahKecamatanBaruInput.trim()) return;
    try {
      const nama = tambahKecamatanBaruInput.trim();
      const updated = await masterDataService.tambahKecamatan(nama);
      setDaftarKecamatan(updated);
      setFormGPM(prev => ({ ...prev, kecamatan: nama }));
      setTambahKecamatanBaruInput('');
      setTampilkanFormKecamatan(false);
      alert(`✅ Kecamatan baru "${nama}" berhasil disimpan ke database Master Kecamatan!`);
    } catch (err) {
      alert(err.message);
    }
  };

  // 5. FITUR TAMBAH ACARA GPM BARU (TERVALIDASI WITA & AUTO-CLOSE)
  const handleSimpanAcaraGPM = async (e) => {
    e.preventDefault();
    setSedangSimpanAcara(true);
    try {
      jadwalGPMService.validasiFormAcaraBaru(formGPM);
      await gpmService.tambahAcara(formGPM);
      setNotifSukses('✅ Acara Gerakan Pangan Murah (GPM) baru berhasil dijadwalkan dan otomatis akan berakhir tepat sesuai jam selesai WITA!');
      setTimeout(() => setNotifSukses(''), 4500);

      setFormGPM({
        nama_acara: '',
        lokasi: '',
        kecamatan: daftarKecamatan[0] || '',
        tanggal: new Date().toISOString().split('T')[0],
        jam_mulai: '08:00',
        jam_selesai: '16:00',
        latitude: 1.4883,
        longitude: 124.8436,
        kuota_maksimal: 250,
        komoditas_tersedia: '',
        deskripsi: '',
        mode_pendaftaran: 'online',
        mode_penerima: 'individu'
      });

      await muatDataAwal();
    } catch (err) {
      alert('Gagal menambah acara GPM: ' + err.message);
    } finally {
      setSedangSimpanAcara(false);
    }
  };

  // Preset Titik Lokasi 100% dari Master Pasar Supabase yang sudah memiliki koordinat GPS
  const terapkanPreset = (p) => {
    setFormGPM(prev => ({
      ...prev,
      lokasi: prev.lokasi?.trim() ? prev.lokasi : p.nama,
      kecamatan: p.kec && daftarKecamatan.includes(p.kec) ? p.kec : prev.kecamatan,
      latitude: p.lat,
      longitude: p.lng
    }));
  };

  // Toggle kehadiran di tabel (FIX: tombol Batalkan benar-benar mengembalikan status ke 'Menunggu' + terkunci jika lewat jam)
  const handleToggleKehadiranTabel = async (pendaftar) => {
    const statusTarget = String(pendaftar.status_kehadiran || '').toLowerCase() === 'hadir' ? 'Menunggu' : 'Hadir';
    try {
      await gpmService.verifikasiKehadiran(pendaftar.kode_barcode, statusTarget, pengguna?.id || null);
      await muatPendaftar(acaraTerpilihId);
      await muatDataAwal();
    } catch (err) {
      alert(err.message || 'Gagal mengubah status kehadiran.');
    }
  };

  // Filter daftar pendaftar
  const pendaftarTerfilter = daftarPendaftar.filter((item) => {
    if (!filterCariTabel) return true;
    const cari = filterCariTabel.toLowerCase();
    return (
      (item.nama_pendaftar && item.nama_pendaftar.toLowerCase().includes(cari)) ||
      (item.nik && String(item.nik).toLowerCase().includes(cari)) ||
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

          {/* Tombol Pemindai Kamera Langsung & Tombol Tambah Manual (Walk-in) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {!kameraAktif ? (
              <button
                type="button"
                onClick={handleMulaiScanKamera}
                style={{
                  background: '#8b1e1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.94rem',
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

            <button
              type="button"
              className="btn-tambah-manual"
              onClick={handleBukaModalManual}
              title="Daftarkan warga yang datang di tempat tanpa membawa HP/smartphone"
            >
              ➕ Tambah Manual (Di Tempat)
            </button>
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

          {pesanScanError && (
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '14px 18px', borderRadius: '10px', marginTop: '18px', maxWidth: '620px', margin: '18px auto 0 auto' }}>
              ⚠️ {pesanScanError}
            </div>
          )}

          {/* KARTU HASIL SCAN */}
          {hasilScanPendaftar && (() => {
            const parsedScan = gpmService.parseDataPendaftar(hasilScanPendaftar);
            return (
              <div className="scan-result-profile-card">
                <div className="result-card-banner">
                  <span className="result-banner-title">
                    <span>✓</span> DATA PENDAFTAR RESMI DITEMUKAN
                  </span>
                  <span className="result-barcode-tag">
                    {parsedScan.kode_barcode}
                  </span>
                </div>

                <div className="result-card-body">
                  <div className="result-card-inner-flex">
                    <div className="result-qr-box">
                      <QRCodeComponent value={parsedScan.kode_barcode} size={115} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '6px', color: '#64748b' }}>
                        QR RESMI GPM
                      </div>
                    </div>

                    <div className="result-data-grid">
                      <div className="data-item-col">
                        <span className="data-item-lbl">Nomor Antrean</span>
                        <span className="data-item-val big-queue">
                          #{String(parsedScan.nomor_antrean || 1).padStart(3, '0')}
                        </span>
                      </div>

                      <div className="data-item-col">
                        <span className="data-item-lbl">Status Kehadiran</span>
                        <div>
                          <span className={`badge-status-attend ${parsedScan.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                            {parsedScan.status_kehadiran === 'Hadir' ? '✓ Sudah Hadir / Terlayani' : '⏳ Menunggu Verifikasi'}
                          </span>
                        </div>
                      </div>

                      <div className="data-item-col">
                        <span className="data-item-lbl">Nama Lengkap</span>
                        <span className="data-item-val">{parsedScan.nama_bersih}</span>
                      </div>

                      <div className="data-item-col">
                        <span className="data-item-lbl">NIK (16 Digit)</span>
                        <span className="data-item-val" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{parsedScan.nik || '-'}</span>
                      </div>

                      <div className="data-item-col">
                        <span className="data-item-lbl">Jalur Pendaftaran</span>
                        <div>
                          <span className={parsedScan.jalur_pendaftaran === 'Langsung' ? 'badge-jalur-langsung' : 'badge-jalur-daring'}>
                            {parsedScan.jalur_pendaftaran === 'Langsung' ? '📍 Langsung (Di Tempat)' : '🌐 Daring (Online)'}
                          </span>
                        </div>
                      </div>

                      <div className="data-item-col">
                        <span className="data-item-lbl">Nomor Telepon / WhatsApp</span>
                        <span className="data-item-val">{parsedScan.nomor_telepon}</span>
                      </div>

                      <div className="data-item-col" style={{ gridColumn: '1 / -1' }}>
                        <span className="data-item-lbl">Lokasi Acara GPM</span>
                        <span className="data-item-val">
                          {parsedScan.acara ? parsedScan.acara.nama_acara : 'Gerakan Pangan Murah (GPM) Kota Manado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {parsedScan.acara?.terkunci_waktu || String(parsedScan.acara?.status || '').toLowerCase() === 'selesai' ? (
                    <div style={{ background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fca5a5', padding: '12px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem', marginTop: '12px' }}>
                      🔒 Verifikasi QR Dikunci: Jadwal kegiatan GPM ini telah berakhir ({parsedScan.acara?.jam_selesai || '-'} WITA / Selesai). Tiket tidak dapat diverifikasi lagi.
                    </div>
                  ) : parsedScan.status_kehadiran === 'Hadir' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <div className="badge-verified-done">
                        ✅ Warga ini telah diverifikasi hadir ({parsedScan.status_pengambilan === 'Sudah Diambil' ? '📦 Pangan Sudah Diambil' : '⏳ Belum Mengambil Pangan'}).
                      </div>
                      {parsedScan.status_pengambilan !== 'Sudah Diambil' && (
                        <button
                          type="button"
                          className="btn-verify-success"
                          style={{ background: '#0369a1' }}
                          onClick={() => handleKonfirmasiPengambilan(parsedScan.id, true)}
                        >
                          📦 Konfirmasi Pengambilan Bahan Pangan
                        </button>
                      )}
                    </div>
                  ) : (
                    <button className="btn-verify-success" onClick={handleKonfirmasiKehadiran}>
                      <span>✓</span> Konfirmasi Kehadiran &amp; Layani Antrean #{parsedScan.nomor_antrean}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
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

            {/* Tombol Aksi Acara: Tambah Manual (Tunduk Kuota), Ubah Kuota (Kabid), Unduh CSV & Selesaikan Lebih Awal */}
            {(() => {
              const acaraAktifDipilih = daftarAcara.find((a) => a.id === acaraTerpilihId);
              const stAcara = acaraAktifDipilih?.statusOperasional || null;
              const penuhAtauSelesai = Boolean(stAcara && !stAcara.bisaDaftar);
              return (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-tambah-manual"
                    onClick={handleBukaModalManual}
                    disabled={!acaraAktifDipilih || penuhAtauSelesai}
                    style={!acaraAktifDipilih || penuhAtauSelesai ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                    title={
                      penuhAtauSelesai
                        ? 'Kuota habis atau acara berakhir. Kepala Bidang dapat menambah kuota terlebih dahulu.'
                        : 'Daftarkan warga yang hadir di tempat tanpa membawa HP/smartphone (mengikuti kuota acara)'
                    }
                  >
                    {stAcara?.kuotaPenuh ? '🚫 Kuota Penuh' : '➕ Tambah Manual (Di Tempat)'}
                  </button>

                  {acaraAktifDipilih && isKabid && (
                    <button
                      type="button"
                      onClick={() => handleBukaModalUbahKuota(acaraAktifDipilih)}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1.5px solid #93c5fd',
                        padding: '9px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                      title="Atur atau tambah kuota antrean acara ini (Khusus Kepala Bidang / Superadmin)"
                    >
                      🔧 Atur Kuota ({stAcara?.terisi ?? 0}/{stAcara?.kuotaMaks ?? acaraAktifDipilih.kuota_maksimal})
                    </button>
                  )}

                  {acaraAktifDipilih && (
                    <button
                      type="button"
                      onClick={() => gpmService.eksporKeExcel(acaraAktifDipilih, daftarPendaftar, { nama: pengguna?.nama || '' })}
                      className="btn-export-csv"
                      title="Unduh rekapitulasi data pendaftar & nomor antrean dalam format Microsoft Excel (.xlsx)"
                    >
                      📊 Export Excel (.xlsx)
                    </button>
                  )}

                  {acaraAktifDipilih && isKabid && (
                    <button
                      type="button"
                      onClick={() => handleSelesaikanAcara(acaraTerpilihId)}
                      disabled={sedangSelesaikanAcara}
                      className="btn-selesaikan-gpm"
                      title="Tutup lebih awal sebelum jam selesai WITA dan arsipkan ke Riwayat GPM (Khusus Kepala Bidang)"
                    >
                      {sedangSelesaikanAcara ? 'Memproses...' : '🔒 Selesaikan Lebih Awal'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Info Kuota & Jadwal Auto-Close Acara Terpilih */}
          {(() => {
            const acaraAktifDipilih = daftarAcara.find((a) => a.id === acaraTerpilihId);
            if (!acaraAktifDipilih) return null;
            const st = acaraAktifDipilih.statusOperasional;
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: st.kuotaPenuh ? '#fef2f2' : '#f8fafc', border: st.kuotaPenuh ? '1px solid #fecaca' : '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.84rem' }}>
                <div>
                  <strong>{st.label}</strong> · Kuota terisi: <strong>{st.terisi} / {st.kuotaMaks}</strong> (Sisa: <strong style={{ color: st.kuotaPenuh ? '#dc2626' : '#15803d' }}>{st.sisaKuota}</strong>)
                  {st.kuotaPenuh && !isKabid && <span style={{ color: '#b91c1c', marginLeft: '8px' }}>— Minta Kepala Bidang untuk menambah kuota jika ada stok tambahan.</span>}
                </div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>
                  ⏰ Auto-close otomatis: {acaraAktifDipilih.tanggal} pukul {acaraAktifDipilih.jam_selesai} WITA
                </span>
              </div>
            );
          })()}

          <div style={{ overflowX: 'auto' }}>
            <table className="pendaftar-data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>No. Urut</th>
                  <th>Nama Lengkap & NIK</th>
                  <th>Jalur Pendaftaran</th>
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
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                      Belum ada pendaftar untuk acara ini atau tidak cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  pendaftarTerfilter.map((item) => {
                    const parsed = gpmService.parseDataPendaftar(item);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 800, color: '#8b1e1e' }}>
                          #{String(parsed.nomor_antrean || 1).padStart(3, '0')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{parsed.nama_bersih}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            NIK: {parsed.nik && parsed.nik !== '-' ? parsed.nik : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Tidak tercatat</span>}
                          </div>
                        </td>
                        <td>
                          <span className={parsed.jalur_pendaftaran === 'Langsung' ? 'badge-jalur-langsung' : 'badge-jalur-daring'}>
                            {parsed.jalur_pendaftaran === 'Langsung' ? '📍 Langsung' : '🌐 Daring'}
                          </span>
                        </td>
                        <td>{parsed.nomor_telepon || '-'}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
                            {parsed.kode_barcode}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#666' }}>
                          {parsed.waktu_mendaftar ? new Date(parsed.waktu_mendaftar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA' : '-'}
                        </td>
                        <td>
                          <span className={`badge-status-attend ${parsed.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                            {parsed.status_kehadiran === 'Hadir' ? '✓ Hadir' : 'Menunggu'}
                          </span>
                          {parsed.status_kehadiran === 'Hadir' && (
                            <div style={{ marginTop: '4px', fontSize: '0.72rem', fontWeight: 700, color: item.status_pengambilan === 'Sudah Diambil' ? '#15803d' : '#b45309' }}>
                              {item.status_pengambilan === 'Sudah Diambil' ? '📦 Sudah Diambil' : '⏳ Belum Diambil'}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className={parsed.status_kehadiran === 'Hadir' ? 'btn-cancel-attend' : 'btn-mark-attend'}
                              onClick={() => handleToggleKehadiranTabel(item)}
                            >
                              {parsed.status_kehadiran === 'Hadir' ? 'Batalkan' : '✓ Tandai Hadir'}
                            </button>
                            {parsed.status_kehadiran === 'Hadir' && item.status_pengambilan !== 'Sudah Diambil' && (
                              <button
                                type="button"
                                className="btn-mark-attend"
                                style={{ background: '#0369a1', fontSize: '0.72rem', padding: '4px 8px' }}
                                onClick={() => handleKonfirmasiPengambilan(item.id, false)}
                              >
                                📦 Ambil Pangan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                  Jam Mulai (WITA)
                </label>
                <input
                  type="time"
                  required
                  className="event-input-box"
                  value={formGPM.jam_mulai}
                  onChange={(e) => setFormGPM({ ...formGPM, jam_mulai: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Jam Selesai (Auto-Close WITA)
                </label>
                <input
                  type="time"
                  required
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '8px', fontSize: '0.82rem', color: '#555' }}>
                <span>
                  📍 Titik Terpilih: <strong>{formGPM.latitude.toFixed(5)}, {formGPM.longitude.toFixed(5)}</strong>
                </span>
                <span style={{ color: '#8b1e1e', fontWeight: 600 }}>
                  ✓ Titik koordinat tersimpan otomatis saat peta diklik
                </span>
              </div>

              {/* Preset Pilihan Cepat dari Master Pasar Supabase */}
              {daftarPasarKoordinat.length > 0 && (
                <div className="preset-loc-buttons" style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#666', alignSelf: 'center' }}>Titik Pasar Resmi (Master Data):</span>
                  {daftarPasarKoordinat.map((p, idx) => (
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
              )}
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

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Komoditas Pangan yang Disediakan (Pilih dari Data Harga Pangan)
              </label>

              {/* Box Pemilih Dropdown */}
              <div
                onClick={() => setDropdownKomoditasBuka(!dropdownKomoditasBuka)}
                className="event-input-box"
                style={{
                  minHeight: '44px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: dropdownKomoditasBuka ? '2px solid #8b1e1e' : '1.5px solid #d1d5db',
                  borderRadius: '8px',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, alignItems: 'center' }}>
                  {(!formGPM.komoditas_tersedia || formGPM.komoditas_tersedia.trim() === '') ? (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      📋 Klik untuk mencentang komoditas dari informasi harga...
                    </span>
                  ) : (
                    formGPM.komoditas_tersedia.split(',').map(s => s.trim()).filter(Boolean).map((k, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✓ {k}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleKomoditas(k);
                          }}
                          style={{ cursor: 'pointer', marginLeft: '2px', color: '#dc2626' }}
                          title="Hapus"
                        >
                          ✕
                        </span>
                      </span>
                    ))
                  )}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '8px', fontWeight: 700 }}>
                  {dropdownKomoditasBuka ? '▲' : '▼'}
                </span>
              </div>

              {/* Dropdown Checklist Popover */}
              {dropdownKomoditasBuka && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1050,
                    background: '#ffffff',
                    border: '1.5px solid #8b1e1e',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    marginTop: '4px',
                    padding: '12px',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8b1e1e' }}>
                      Pilih Komoditas Tersedia ({formGPM.komoditas_tersedia ? formGPM.komoditas_tersedia.split(',').filter(Boolean).length : 0} dipilih)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handlePilihSemuaKomoditas}
                        style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Pilih Semua
                      </button>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <button
                        type="button"
                        onClick={handleKosongkanKomoditas}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                    {daftarKomoditasMaster.map((item, idx) => {
                      const listTerpilih = formGPM.komoditas_tersedia
                        ? formGPM.komoditas_tersedia.split(',').map(s => s.trim()).filter(Boolean)
                        : [];
                      const isChecked = listTerpilih.includes(item);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: isChecked ? '#fef2f2' : '#f8fafc',
                            border: isChecked ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 700 : 500,
                            color: isChecked ? '#991b1b' : '#334155'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleKomoditas(item)}
                            style={{ accentColor: '#8b1e1e', width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setDropdownKomoditasBuka(false)}
                      style={{
                        background: '#8b1e1e',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Selesai Memilih
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-two-cols-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: '1 / -1' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Mode Pendaftaran Warga
                </label>
                <select
                  className="event-input-box"
                  value={formGPM.mode_pendaftaran}
                  onChange={(e) => setFormGPM({ ...formGPM, mode_pendaftaran: e.target.value })}
                >
                  <option value="online">🌐 Pendaftaran Online + Lokasi</option>
                  <option value="keduanya">🔄 Online &amp; Datang Langsung</option>
                  <option value="langsung">📍 Datang Langsung (Tanpa Daftar Online)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Mekanisme Hitungan Penerima
                </label>
                <select
                  className="event-input-box"
                  value={formGPM.mode_penerima}
                  onChange={(e) => setFormGPM({ ...formGPM, mode_penerima: e.target.value })}
                >
                  <option value="individu">👤 Per Individu (1 NIK = 1 Antrean)</option>
                  <option value="keluarga">👨‍👩‍👧‍👦 Per Keluarga (1 KK = 1 Antrean)</option>
                </select>
              </div>
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
                        <span className="stat-pill-num">{acara.kuota_maksimal || 0}</span>
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
                      📊 Unduh Excel (.xlsx)
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
                  onClick={() => gpmService.eksporKeExcel(modalRiwayatDetail.acara, modalRiwayatDetail.pendaftar, { nama: pengguna?.nama || '' })}
                >
                  📊 Unduh Excel (.xlsx)
                </button>
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="pendaftar-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>No.</th>
                      <th>Nama Warga & NIK</th>
                      <th>Jalur</th>
                      <th>No. WhatsApp</th>
                      <th>Kode Tiket</th>
                      <th>Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRiwayatDetail.pendaftar.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          Tidak ada rekaman pendaftar pada acara ini.
                        </td>
                      </tr>
                    ) : (
                      modalRiwayatDetail.pendaftar.map((p, idx) => {
                        const parsed = gpmService.parseDataPendaftar(p);
                        return (
                          <tr key={p.id || idx}>
                            <td style={{ fontWeight: 700, color: '#8b1e1e' }}>
                              #{String(parsed.nomor_antrean || idx + 1).padStart(3, '0')}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{parsed.nama_bersih}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>NIK: {parsed.nik || '-'}</div>
                            </td>
                            <td>
                              <span className={parsed.jalur_pendaftaran === 'Langsung' ? 'badge-jalur-langsung' : 'badge-jalur-daring'}>
                                {parsed.jalur_pendaftaran}
                              </span>
                            </td>
                            <td>{parsed.nomor_telepon || '-'}</td>
                            <td><code>{parsed.kode_barcode}</code></td>
                            <td>
                              <span className={`badge-status-attend ${parsed.status_kehadiran === 'Hadir' ? 'hadir' : 'menunggu'}`}>
                                {parsed.status_kehadiran === 'Hadir' ? '✓ Hadir' : 'Menunggu'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
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

      {/* MODAL TAMBAH PENDAFTAR MANUAL (DI TEMPAT / WALK-IN TANPA HP) */}
      {modalTambahManual.buka && (
        <div className="modal-overlay-backdrop" onClick={() => setModalTambahManual(prev => ({ ...prev, buka: false }))}>
          <div className="modal-history-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-history-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
                  ➕ Pendaftaran Manual di Lokasi GPM
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Layanan petugas untuk warga yang hadir di tempat tanpa membawa HP/smartphone
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalTambahManual(prev => ({ ...prev, buka: false }))}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpanPendaftarManual}>
              <div className="modal-history-body" style={{ padding: '20px' }}>
                {modalTambahManual.pesanError && (
                  <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                    ⚠️ {modalTambahManual.pesanError}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                    Lokasi Kegiatan GPM <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    value={modalTambahManual.acaraId}
                    onChange={(e) => setModalTambahManual(prev => ({ ...prev, acaraId: e.target.value }))}
                    required
                  >
                    {daftarAcara.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama_acara} ({a.lokasi})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                    Nomor Induk Kependudukan (NIK) <span style={{ color: '#ef4444' }}>* (Wajib 16 Digit)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    placeholder="Contoh: 7171012345678901"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    value={modalTambahManual.nik}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
                      setModalTambahManual(prev => ({ ...prev, nik: val }));
                    }}
                  />
                  <small style={{ color: modalTambahManual.nik.length === 16 ? '#16a34a' : '#64748b', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {modalTambahManual.nik.length}/16 digit {modalTambahManual.nik.length > 0 && modalTambahManual.nik.length < 16 && `(Kurang ${16 - modalTambahManual.nik.length} digit)`}
                  </small>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                    Nama Lengkap Warga <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap warga"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    value={modalTambahManual.nama}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s'.]/g, '');
                      setModalTambahManual(prev => ({ ...prev, nama: val }));
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                    Nomor Telepon / WhatsApp <span style={{ color: '#64748b', fontWeight: 400 }}>(Opsional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890 (Boleh kosong)"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    value={modalTambahManual.telepon}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 15);
                      setModalTambahManual(prev => ({ ...prev, telepon: val }));
                    }}
                  />
                </div>

                {(() => {
                  const acaraDipilihModal = daftarAcara.find((a) => String(a.id) === String(modalTambahManual.acaraId));
                  if (String(acaraDipilihModal?.mode_penerima || 'individu').toLowerCase() !== 'keluarga') return null;
                  return (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '10px' }}>
                        👨‍👩‍👧‍👦 Acara GPM Berbasis Keluarga (1 KK = 1 Antrean)
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px', color: '#1e3a8a' }}>
                          Nomor Kartu Keluarga (KK - 16 Digit) <span style={{ fontWeight: 400, color: '#475569' }}>(Opsional di lokasi, jika diisi wajib 16 digit)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="16 digit Nomor KK"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.88rem', background: '#ffffff' }}
                          value={modalTambahManual.no_kk}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
                            setModalTambahManual(prev => ({ ...prev, no_kk: val }));
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px', color: '#1e3a8a' }}>
                          Jumlah Anggota Keluarga
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.88rem', background: '#ffffff' }}
                          value={modalTambahManual.jumlah_anggota}
                          onChange={(e) => setModalTambahManual(prev => ({ ...prev, jumlah_anggota: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={modalTambahManual.langsungHadir}
                      onChange={(e) => setModalTambahManual(prev => ({ ...prev, langsungHadir: e.target.checked }))}
                    />
                    <span>Langsung Tandai Hadir & Verifikasi (Siap Terima Pangan)</span>
                  </label>
                </div>
              </div>

              <div className="modal-history-footer">
                <button
                  type="button"
                  className="btn-close-secondary"
                  onClick={() => setModalTambahManual(prev => ({ ...prev, buka: false }))}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-tambah-manual"
                  disabled={modalTambahManual.sedangKirim}
                >
                  {modalTambahManual.sedangKirim ? 'Menyimpan...' : '💾 Simpan & Daftarkan Warga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UBAH / TAMBAH KUOTA ACARA GPM (KHUSUS KEPALA BIDANG & SUPERADMIN) */}
      {modalUbahKuota.buka && modalUbahKuota.acara && (
        <div className="modal-overlay-backdrop" onClick={() => setModalUbahKuota({ buka: false, acara: null, kuotaBaru: '', sedangSimpan: false, pesanError: '' })}>
          <div className="modal-history-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-history-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.12rem', color: '#1e293b' }}>🔧 Atur / Tambah Kuota GPM</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {modalUbahKuota.acara.nama_acara}
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalUbahKuota({ buka: false, acara: null, kuotaBaru: '', sedangSimpan: false, pesanError: '' })}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpanUbahKuota}>
              <div className="modal-history-body" style={{ padding: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '0.85rem' }}>
                  <div>Warga sudah terdaftar: <strong>{modalUbahKuota.acara.antrean_terisi || 0} orang</strong></div>
                  <div>Kuota saat ini: <strong>{modalUbahKuota.acara.kuota_maksimal} antrean</strong></div>
                </div>

                {modalUbahKuota.pesanError && (
                  <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.84rem' }}>
                    ⚠️ {modalUbahKuota.pesanError}
                  </div>
                )}

                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: '#334155' }}>
                  Kuota Maksimal Baru (Min. {Math.max(1, modalUbahKuota.acara.antrean_terisi || 0)})
                </label>
                <input
                  type="number"
                  min={Math.max(1, modalUbahKuota.acara.antrean_terisi || 0)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 700 }}
                  value={modalUbahKuota.kuotaBaru}
                  onChange={(e) => setModalUbahKuota(prev => ({ ...prev, kuotaBaru: e.target.value }))}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {[25, 50, 100].map((tambah) => (
                    <button
                      key={tambah}
                      type="button"
                      onClick={() =>
                        setModalUbahKuota((prev) => ({
                          ...prev,
                          kuotaBaru: String((parseInt(prev.kuotaBaru, 10) || prev.acara.kuota_maksimal || 0) + tambah)
                        }))
                      }
                      style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      +{tambah} Kuota
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-history-footer">
                <button
                  type="button"
                  className="btn-close-secondary"
                  onClick={() => setModalUbahKuota({ buka: false, acara: null, kuotaBaru: '', sedangSimpan: false, pesanError: '' })}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-tambah-manual"
                  disabled={modalUbahKuota.sedangSimpan}
                  style={{ background: '#1d4ed8' }}
                >
                  {modalUbahKuota.sedangSimpan ? 'Menyimpan...' : '💾 Simpan Kuota Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
