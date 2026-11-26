// ===================================================================================
// MODUL ANTARMUKA DASHBOARD PETUGAS DINAS PANGAN KOTA MANADO (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Pemerintah Kota Manado
// Mengimplementasikan Role-Based Access Control (RBAC) ketat:
// 1. Admin : Menu Edit User, Master Pasar & Wilayah, Dashboard, Menu Cek GPM
// 2. Kabid : Laporan Khusus Bidang, Menu Verif Harga Pangan, Dashboard, Menu Kelola GPM
// 3. Staf  : Menu Kelola GPM, Dashboard, Menu Input Data Pangan
// 4. Kadis : Dashboard Eksekutif, Laporan GPM, Grafik Pangan (Tren Fluktuasi)
// ===================================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { penggunaService } from '../services/PenggunaService';
import { hargaPanganService } from '../services/HargaPanganService';
import { masterDataService } from '../services/MasterDataService';
import { analisisHargaService } from '../services/AnalisisHargaService';
import { laporanService } from '../services/LaporanService';
import { gpmService } from '../services/GPMService';
import { jadwalGPMService } from '../services/JadwalGPMService';
import { pengajuanHargaService } from '../services/PengajuanHargaService';
import { berandaStafService } from '../services/BerandaStafService';
import { berandaKabidService } from '../services/BerandaKabidService';
import { berandaKadisService } from '../services/BerandaKadisService';
import { berandaAdminService } from '../services/BerandaAdminService';
import PetugasGPMManager from './PetugasGPMManager';
import AdminMasterPasarPanel from './AdminMasterPasarPanel';
import './PetugasDashboard.css';

export default function PetugasDashboard({ pengguna, onKeluar }) {
  // ─────────────────────────────────────────────
  // 1. IDENTIFIKASI PERAN & AKSES RESMI (OOP)
  // ─────────────────────────────────────────────
  const peran = penggunaService.normalisasiPeran(pengguna?.peran);
  const daftarMenuResmi = penggunaService.ambilDaftarMenu(peran);

  // Aksesibilitas peran menyeluruh (Superadmin memiliki hak akses penuh ke seluruh menu)
  const isSuperadmin = peran === 'Superadmin';
  const isAdmin = peran === 'Admin' || isSuperadmin;
  const isKabid = peran === 'Kabid' || isSuperadmin;
  const isStaf = peran === 'Staf' || isSuperadmin;
  const isKadis = peran === 'Kadis' || isSuperadmin;

  // Format nama peran lengkap untuk tampilan antarmuka
  const namaLengkapPeran = (r) => {
    if (r === 'Superadmin') return 'Superadmin';
    if (r === 'Kabid') return 'Kepala Bidang';
    if (r === 'Kadis') return 'Kepala Dinas';
    if (r === 'Admin') return 'Admin';
    return r || 'Staf Pangan';
  };

  // Menu aktif awal diarahkan ke menu pertama yang diizinkan (default: 'dashboard')
  const [menuAktif, setMenuAktif] = useState(daftarMenuResmi[0]?.id || 'dashboard');
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false);

  // Data Dashboard Utama
  const [statsDashboard, setStatsDashboard] = useState({
    harga_ditetapkan: 0,
    draft_harga: 0,
    gpm_terjadwal: 0,
    gpm_selesai: 0
  });
  const [daftarHarga, setDaftarHarga] = useState([]);
  const [daftarMasterKomoditas, setDaftarMasterKomoditas] = useState([]);
  const [daftarSatuan, setDaftarSatuan] = useState([]);
  const [daftarPasar, setDaftarPasar] = useState([]);
  const [daftarPasarLengkap, setDaftarPasarLengkap] = useState([]);
  const [daftarKecamatan, setDaftarKecamatan] = useState([]);

  // Modal Edit Harga (Khusus Kepala Bidang)
  const [modalEditKabid, setModalEditKabid] = useState({
    buka: false,
    item: null,
    form: {
      nama_komoditas: '',
      kategori: 'Bahan Pokok',
      satuan: '1 KG',
      harga: '',
      nama_pasar: '',
      status: 'Terbit',
      prioritas_tampil: 50
    }
  });
  const [formHarga, setFormHarga] = useState({
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan: '1 KG',
    harga: '',
    nama_pasar: '',
    status: 'Draft',
    prioritas_tampil: 50
  });
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [pesanNotifikasi, setPesanNotifikasi] = useState('');
  const [tanggalPengambilan, setTanggalPengambilan] = useState(() => berandaStafService.ambilTanggalHariIniISO());
  const [daftarPengajuanHarga, setDaftarPengajuanHarga] = useState([]);
  const [belumMigrasiPengajuan, setBelumMigrasiPengajuan] = useState(false);
  const [subTabPengajuanStaf, setSubTabPengajuanStaf] = useState('baru'); // 'baru' | 'daftar' | 'terbit'
  const [filterStatusPengajuanStaf, setFilterStatusPengajuanStaf] = useState('semua'); // 'semua' | 'Draft' | 'Diajukan' | 'Diverifikasi' | 'Ditolak'
  const [jenisKomoditasTerpilih, setJenisKomoditasTerpilih] = useState('Semua');
  const [keranjangPengajuan, setKeranjangPengajuan] = useState([]);
  const [cariKeranjangStaf, setCariKeranjangStaf] = useState('');
  const [dokumenPengajuanDiedit, setDokumenPengajuanDiedit] = useState(null);
  const [adaPerubahanBelumDisimpan, setAdaPerubahanBelumDisimpan] = useState(false);
  const [detailPengajuanBatch, setDetailPengajuanBatch] = useState(null);
  const [modalTolakBatch, setModalTolakBatch] = useState({ buka: false, pengajuan: null, catatan: '' });
  const [subTabGpmTarget, setSubTabGpmTarget] = useState('scan');

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

  // Master Data Komoditas, Satuan, Pasar & Wilayah (Khusus Admin & Superadmin — sinkron Supabase)
  const [formKomoditasMaster, setFormKomoditasMaster] = useState({
    kelompok_komoditas: '',
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan_bawaan: '1 KG',
    kata_kunci: '',
    prioritas_tampil: 50
  });
  const [inputSatuanBaru, setInputSatuanBaru] = useState('');
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

  // Modal Edit Email oleh Admin
  const [modalEditEmail, setModalEditEmail] = useState({
    buka: false,
    userTarget: null,
    emailBaru: '',
    pesan: ''
  });

  // Modal Edit Nama & Bidang oleh Admin / Superadmin
  const [modalEditProfilUser, setModalEditProfilUser] = useState({
    buka: false,
    userTarget: null,
    namaBaru: '',
    bidangBaru: '',
    pesan: ''
  });
  const [filterCariPengguna, setFilterCariPengguna] = useState('');
  const [filterPeranPengguna, setFilterPeranPengguna] = useState('Semua');
  const [cariMasterKomoditas, setCariMasterKomoditas] = useState('');
  const [filterCekGpm, setFilterCekGpm] = useState({
    pencarian: '',
    kecamatan: 'Semua',
    status: 'Semua'
  });

  // State Grafik Pangan (Khusus Kadis — 100% Data Riil riwayat_harga_pangan)
  const [komoditasTren, setKomoditasTren] = useState('');
  const [periodeTren, setPeriodeTren] = useState('7hari');
  const [pasarTren, setPasarTren] = useState('Semua');
  const [dataTren, setDataTren] = useState(null);
  const [sedangMuatTren, setSedangMuatTren] = useState(false);
  const [periodeBerandaKadis, setPeriodeBerandaKadis] = useState('tahun_ini');
  const [subTabLaporanKadis, setSubTabLaporanKadis] = useState('gpm'); // 'gpm' | 'harga'
  const [filterLaporanGPMKadis, setFilterLaporanGPMKadis] = useState({
    periode: 'tahun_ini',
    kecamatan: 'Semua',
    status: 'Semua'
  });
  const [filterLaporanHargaKadis, setFilterLaporanHargaKadis] = useState({
    pasar: 'Semua',
    kategori: 'Semua',
    pencarian: ''
  });
  const [filterLaporanHarga, setFilterLaporanHarga] = useState({ pasar: 'Semua', kategori: 'Semua', status: 'Terbit' });
  const [cariLaporanHarga, setCariLaporanHarga] = useState('');
  const [subTabLaporanKabid, setSubTabLaporanKabid] = useState('harga'); // 'harga' | 'gpm'
  const [periodeBerandaKabid, setPeriodeBerandaKabid] = useState('tahun_ini'); // 'bulan_ini' | 'tahun_ini' | 'semua'
  const [filterLaporanGPMKabid, setFilterLaporanGPMKabid] = useState({
    periode: 'tahun_ini',
    kecamatan: 'Semua',
    status: 'Semua'
  });
  const [cariVerifTerbitKabid, setCariVerifTerbitKabid] = useState('');
  const [filterPasarVerifTerbitKabid, setFilterPasarVerifTerbitKabid] = useState('Semua');
  const [subTabVerifKabid, setSubTabVerifKabid] = useState('antrean'); // 'antrean' | 'input' | 'terbit'
  const [formInputKabid, setFormInputKabid] = useState({
    nama_pasar: '',
    nama_komoditas: '',
    kategori: 'Bahan Pokok',
    satuan: '1 KG',
    harga: '',
    prioritas_tampil: 50
  });
  const [tanggalInputKabid, setTanggalInputKabid] = useState(() => berandaStafService.ambilTanggalHariIniISO());
  const [jenisInputKabid, setJenisInputKabid] = useState('Semua');
  const [keranjangInputKabid, setKeranjangInputKabid] = useState([]);
  const [cariKeranjangKabid, setCariKeranjangKabid] = useState('');

  // Data Riil Pelaksanaan GPM & Pendaftar Warga (Kadis, Admin, Kabid)
  const [daftarAcaraGPM, setDaftarAcaraGPM] = useState([]);
  const [daftarPendaftarGPM, setDaftarPendaftarGPM] = useState([]);

  // Modal Detail Pendaftar Warga GPM (Dapat diakses Kadis, Admin, Superadmin)
  const [modalDetailWarga, setModalDetailWarga] = useState({
    buka: false,
    acara: null,
    pencarian: ''
  });

  // Modal Pilihan Cetak Rekapitulasi GPM (Kadis & Superadmin)
  const [modalPilihanCetakGPM, setModalPilihanCetakGPM] = useState({
    buka: false,
    mode: 'semua', // 'semua' | 'acara'
    acaraId: ''
  });

  // Ref Input Unggah Berkas Foto Profil dari Perangkat
  const inputBerkasFotoRef = useRef(null);

  // ─────────────────────────────────────────────
  // 2. SIKLUS HIDUP & PEMUATAN DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataDashboard();
    muatMasterData();
  }, [peran]);

  // Sinkronkan pilihan komoditas pertama dari data riil Supabase untuk Grafik Kadis
  useEffect(() => {
    if (!isKadis) return;
    const daftarNamaUnik = Array.from(new Set(daftarHarga.filter(i => i.status === 'Terbit').map(i => i.nama_komoditas).filter(Boolean)));
    if (daftarNamaUnik.length === 0) {
      if (komoditasTren !== '') setKomoditasTren('');
      return;
    }
    if (!komoditasTren || !daftarNamaUnik.includes(komoditasTren)) {
      setKomoditasTren(daftarNamaUnik[0]);
    }
  }, [isKadis, daftarHarga]);

  // Muat grafik tren riil dari tabel riwayat_harga_pangan setiap filter berubah
  useEffect(() => {
    if (!isKadis) return;
    let masihAktif = true;
    const muatTren = async () => {
      setSedangMuatTren(true);
      try {
        const tren = await laporanService.ambilDataTrenKomoditas(
          komoditasTren,
          periodeTren,
          pasarTren,
          daftarHarga
        );
        if (masihAktif) setDataTren(tren);
      } catch (err) {
        console.error('Gagal memuat tren grafik pangan Kadis:', err);
        if (masihAktif) setDataTren(null);
      } finally {
        if (masihAktif) setSedangMuatTren(false);
      }
    };
    muatTren();
    return () => { masihAktif = false; };
  }, [isKadis, komoditasTren, periodeTren, pasarTren, daftarHarga]);

  const muatDataDashboard = async () => {
    try {
      const [itemsRes, acaraRes, pendaftarRes, pengajuanRes, usersRes] = await Promise.all([
        hargaPanganService.ambilSemua(),
        gpmService.ambilSemuaAcara(),
        gpmService.ambilPendaftarAcara(),
        pengajuanHargaService.ambilSemuaPengajuan().catch(() => ({ belumMigrasi: false, data: [] })),
        (isAdmin || isKabid || isKadis)
          ? penggunaService.ambilSemuaPengguna().catch(() => [])
          : Promise.resolve([])
      ]);

      const items = Array.isArray(itemsRes) ? itemsRes : [];
      const acara = Array.isArray(acaraRes) ? acaraRes : [];
      const listPendaftar = Array.isArray(pendaftarRes)
        ? pendaftarRes
        : (Array.isArray(pendaftarRes?.data) ? pendaftarRes.data : []);
      const listPengajuan = Array.isArray(pengajuanRes?.data) ? pengajuanRes.data : [];
      const users = Array.isArray(usersRes) ? usersRes : [];

      setDaftarHarga(items);
      setDaftarAcaraGPM(acara);
      setDaftarPendaftarGPM(listPendaftar);
      setDaftarPengajuanHarga(listPengajuan);
      setBelumMigrasiPengajuan(Boolean(pengajuanRes?.belumMigrasi));
      if (users.length > 0 || isAdmin) {
        setDaftarPengguna(users);
      }

      // Hitung kartu KPI Dashboard 100% dari data riil Supabase + status waktu WITA
      const stats = await hargaPanganService.ambilStatistikDashboard(items, acara);
      if (stats) setStatsDashboard(stats);

      muatNotifikasiDinamis(items, acara, users, listPengajuan);
    } catch (error) {
      console.error('Gagal memuat data dashboard:', error);
    }
  };

  const muatMasterData = async () => {
    const [komoditas, satuan, pasarLengkap, kec] = await Promise.all([
      masterDataService.ambilDaftarKomoditas(),
      masterDataService.ambilDaftarSatuan(),
      masterDataService.ambilDaftarPasarLengkap().catch(() => []),
      masterDataService.ambilDaftarKecamatan()
    ]);

    setDaftarMasterKomoditas(Array.isArray(komoditas) ? komoditas : []);

    setDaftarSatuan(satuan);
    if (satuan.length > 0 && !formHarga.satuan) {
      setFormHarga(prev => ({ ...prev, satuan: satuan[0] }));
    }

    const listPasarLengkap = Array.isArray(pasarLengkap) ? pasarLengkap : [];
    const namaPasarList = listPasarLengkap.map((p) => p.nama_pasar);
    setDaftarPasarLengkap(listPasarLengkap);
    setDaftarPasar(namaPasarList);
    if (namaPasarList.length > 0 && !formHarga.nama_pasar) {
      setFormHarga(prev => ({ ...prev, nama_pasar: namaPasarList[0] }));
    }

    setDaftarKecamatan(kec);

    if (isAdmin) {
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      muatNotifikasiDinamis(daftarHarga, daftarAcaraGPM, users);
    }
  };

  // Pemuatan Notifikasi Dinamis Sesuai Peran Respon Riil Sistem
  const muatNotifikasiDinamis = (hargaList, acaraList, usersList, pengajuanList) => {
    const notifs = [];
    const itemsHarga = hargaList || daftarHarga || [];
    const acaraGPM = acaraList || daftarAcaraGPM || [];
    const users = usersList || daftarPengguna || [];
    const pengajuan = pengajuanList || daftarPengajuanHarga || [];

    if (isKabid) {
      const batchMenunggu = pengajuan.filter((p) => p.status === 'Diajukan').length;
      const draftCount = itemsHarga.filter(i => (i.status || '').toLowerCase() === 'draft').length;
      if (batchMenunggu > 0 || draftCount > 0) {
        notifs.push({
          id: 'notif-kabid-draft',
          judul: '📝 Verifikasi Harga Pangan',
          pesan: `Terdapat ${batchMenunggu > 0 ? `${batchMenunggu} paket pengajuan pasar` : ''}${batchMenunggu > 0 && draftCount > 0 ? ' & ' : ''}${draftCount > 0 ? `${draftCount} draf satuan` : ''} dari staf menunggu verifikasi Anda.`,
          waktu: 'Terkini',
          target: 'verif-harga'
        });
      }
      const gpmSelesai = acaraGPM.filter(a => a.status === 'Selesai');
      if (gpmSelesai.length > 0) {
        notifs.push({
          id: 'notif-kabid-gpm',
          judul: '🌾 Realisasi Gerakan Pangan Murah',
          pesan: `Kegiatan "${gpmSelesai[0].nama_acara}" telah selesai dan terarsip dalam riwayat.`,
          waktu: 'Hari ini',
          target: 'kelola-gpm'
        });
      }
    }

    if (isKadis) {
      const gpmSelesai = acaraGPM.filter((a) => String(a.status || '').toLowerCase() === 'selesai');
      if (gpmSelesai.length > 0) {
        const jmlHadirTerbaru = Number(gpmSelesai[0].total_hadir ?? gpmSelesai[0].terlayani ?? 0);
        const jmlDaftarTerbaru = Number(gpmSelesai[0].antrean_terisi ?? gpmSelesai[0].terdaftar ?? 0);
        notifs.push({
          id: 'notif-kadis-gpm-selesai',
          judul: '📊 Laporan Pelaksanaan GPM',
          pesan: `Kegiatan "${gpmSelesai[0].nama_acara}" selesai (${jmlHadirTerbaru} hadir dari ${jmlDaftarTerbaru} pendaftar). Laporan eksekutif siap ditinjau.`,
          waktu: 'Terkini',
          target: 'laporan-gpm'
        });
      }
      const jmlTerbit = itemsHarga.filter((i) => String(i.status || '').toLowerCase() === 'terbit').length;
      notifs.push({
        id: 'notif-kadis-tren',
        judul: '📈 Fluktuasi Harga Pasar',
        pesan: `Grafik komoditas terhubung langsung ke ${jmlTerbit} harga resmi terbit di pasar Manado.`,
        waktu: 'Terkini',
        target: 'grafik-pangan'
      });
    }

    if (isStaf) {
      const ditolakList = pengajuan.filter((p) => p.status === 'Ditolak');
      if (ditolakList.length > 0) {
        notifs.push({
          id: 'notif-staf-ditolak',
          judul: '⚠️ Pengajuan Harga Perlu Revisi',
          pesan: `${ditolakList.length} pengajuan (${ditolakList[0].nama_pasar}) ditolak Kepala Bidang. Klik untuk perbaiki & ajukan ulang.`,
          waktu: 'Perlu Tindakan',
          target: 'input-harga-daftar'
        });
      }
      const draftBatchCount = pengajuan.filter((p) => p.status === 'Draft').length;
      if (draftBatchCount > 0) {
        notifs.push({
          id: 'notif-staf-draft',
          judul: '📝 Draft Pengajuan Belum Dikirim',
          pesan: `Anda memiliki ${draftBatchCount} Draft pengajuan harga tersimpan. Buka Daftar Pengajuan untuk menyelesaikan & mengajukan ke Kabid.`,
          waktu: 'Draft',
          target: 'input-harga-daftar'
        });
      }
      const menungguBatch = pengajuan.filter((p) => p.status === 'Diajukan').length;
      const terbitCount = itemsHarga.filter(i => (i.status || '').toLowerCase() === 'terbit').length;
      const draftCount = itemsHarga.filter(i => (i.status || '').toLowerCase() === 'draft').length;
      notifs.push({
        id: 'notif-staf-status',
        judul: '📢 Status Publikasi Komoditas',
        pesan: `${terbitCount} komoditas terbit.${menungguBatch + draftCount > 0 ? ` ${menungguBatch} paket pengajuan${draftCount > 0 ? ` & ${draftCount} draf lama` : ''} menunggu verifikasi Kabid.` : ' Tidak ada pengajuan tertunda.'}`,
        waktu: 'Terkini',
        target: 'input-harga-daftar'
      });
      const gpmAktif = acaraGPM.find(a => !jadwalGPMService.hitungStatusOperasional(a).sudahBerakhir);
      if (gpmAktif) {
        notifs.push({
          id: 'notif-staf-gpm-aktif',
          judul: '🎫 Pelaksanaan GPM Terjadwal',
          pesan: `${gpmAktif.nama_acara} di ${gpmAktif.lokasi} siap melayani registrasi tiket warga.`,
          waktu: 'Hari ini',
          target: 'kelola-gpm'
        });
      }
    }

    if (isAdmin) {
      notifs.push({
        id: 'notif-admin-supervisi',
        judul: '🛡️ Pengawasan Sistem & Akun',
        pesan: `Sistem mencatat ${users.length} akun kedinasan aktif dan ${acaraGPM.length} agenda GPM dalam basis data.`,
        waktu: 'Terkini',
        target: 'kelola-user'
      });
    }

    setDaftarNotif(notifs);
  };

  const tampilkanPesan = (teks) => {
    setPesanNotifikasi(teks);
    setTimeout(() => setPesanNotifikasi(''), 4500);
  };

  // ─────────────────────────────────────────────
  // 3. LOGIKA HARGA PANGAN & VERIFIKASI (KABID & STAF)
  // ─────────────────────────────────────────────

  // Format tampilan satuan terkunci per 1 unit (1 KG, 1 Liter, 1 Baki, dst.)
  const formatSatuanTampil = (satuan) => analisisHargaService.normalisasiSatuan(satuan);

  // Memastikan input hanya menerima angka bulat positif (0-9) dan navigasi keyboard
  const hanyaBolehAngka = (e) => {
    if ([
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ].includes(e.key)) {
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Mengisi otomatis kategori, satuan bawaan, & prioritas tampil saat memilih komoditas dari Master Komoditas Admin
  const handlePilihKomoditasStaf = (namaKomoditas) => {
    const master = daftarMasterKomoditas.find(
      (k) => k.nama_komoditas.toLowerCase() === String(namaKomoditas || '').toLowerCase()
    );
    if (master) {
      setFormHarga((prev) => ({
        ...prev,
        nama_komoditas: master.nama_komoditas,
        kategori: master.kategori || prev.kategori,
        satuan: formatSatuanTampil(master.satuan_bawaan) || prev.satuan,
        prioritas_tampil: Number(master.prioritas_tampil) || 50
      }));
    } else {
      setFormHarga((prev) => ({ ...prev, nama_komoditas: namaKomoditas }));
    }
  };

  const handlePilihKomoditasKabid = (namaKomoditas) => {
    const master = daftarMasterKomoditas.find(
      (k) => k.nama_komoditas.toLowerCase() === String(namaKomoditas || '').toLowerCase()
    );
    setModalEditKabid((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        nama_komoditas: master ? master.nama_komoditas : namaKomoditas,
        kategori: master?.kategori || prev.form.kategori,
        satuan: master?.satuan_bawaan ? formatSatuanTampil(master.satuan_bawaan) : prev.form.satuan,
        prioritas_tampil: master ? Number(master.prioritas_tampil) || 50 : prev.form.prioritas_tampil
      }
    }));
  };

  // ─────────────────────────────────────────────
  // 3B. ALUR PENGAJUAN HARGA HYBRID PER PASAR (MASTER-DETAIL + DRAFT + TIMPA CERDAS)
  // ─────────────────────────────────────────────
  const pengajuanAktifPasarIni = useMemo(
    () => pengajuanHargaService.cariPengajuanAktifPasar(daftarPengajuanHarga, formHarga.nama_pasar, tanggalPengambilan, 'Diajukan'),
    [daftarPengajuanHarga, formHarga.nama_pasar, tanggalPengambilan]
  );

  const draftAktifPasarIni = useMemo(
    () => pengajuanHargaService.cariPengajuanAktifPasar(daftarPengajuanHarga, formHarga.nama_pasar, tanggalPengambilan, 'Draft'),
    [daftarPengajuanHarga, formHarga.nama_pasar, tanggalPengambilan]
  );

  const daftarJenisKomoditas = useMemo(
    () => pengajuanHargaService.ambilDaftarJenisKomoditas(daftarMasterKomoditas, daftarHarga),
    [daftarMasterKomoditas, daftarHarga]
  );

  const grupKomoditasTerfilterJenis = useMemo(() => {
    const sumber =
      jenisKomoditasTerpilih === 'Semua'
        ? daftarMasterKomoditas
        : daftarMasterKomoditas.filter(
          (k) => String(k.kategori || 'Bahan Pokok').trim().toLowerCase() === jenisKomoditasTerpilih.toLowerCase()
        );
    return masterDataService.kelompokkanKomoditasUntukDropdown(sumber);
  }, [daftarMasterKomoditas, jenisKomoditasTerpilih]);

  const hargaTerbitKomoditasDipilih = useMemo(
    () => pengajuanHargaService.cariHargaTerbitPasar(formHarga.nama_pasar, formHarga.nama_komoditas, daftarHarga),
    [formHarga.nama_pasar, formHarga.nama_komoditas, daftarHarga]
  );

  const ringkasanKeranjangStaf = useMemo(() => {
    const valid = [];
    const berubah = [];
    keranjangPengajuan.forEach((row) => {
      const angka = parseInt(String(row.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (angka > 0) {
        valid.push({ ...row, hargaAngka: angka });
        if (row.harga_lama === null || row.harga_lama === undefined || angka !== Number(row.harga_lama)) {
          berubah.push({ ...row, hargaAngka: angka });
        }
      }
    });
    return { valid, berubah };
  }, [keranjangPengajuan]);

  // Sinkronkan ruang kerja Daftar Harga Pangan saat berpindah pasar atau tanggal (isolasi penuh per pasar!)
  const sinkronkanRuangKerjaPasar = (pasarTujuan, tanggalTujuan, sumberPengajuan = daftarPengajuanHarga) => {
    const draftTujuan = pengajuanHargaService.cariPengajuanAktifPasar(sumberPengajuan, pasarTujuan, tanggalTujuan, 'Draft');
    const diajukanTujuan = pengajuanHargaService.cariPengajuanAktifPasar(sumberPengajuan, pasarTujuan, tanggalTujuan, 'Diajukan');
    const paketDitemukan = draftTujuan || diajukanTujuan || null;

    if (paketDitemukan) {
      const itemsKeranjang = pengajuanHargaService.bangunKeranjangDariDokumen(paketDitemukan, daftarHarga);
      setKeranjangPengajuan(itemsKeranjang);
      setDokumenPengajuanDiedit(paketDitemukan);
    } else {
      setKeranjangPengajuan([]);
      setDokumenPengajuanDiedit(null);
    }
    setAdaPerubahanBelumDisimpan(false);
    setCariKeranjangStaf('');
  };

  const handleGantiPasarPengajuan = (pasarBaru) => {
    if (String(pasarBaru || '').toLowerCase() === String(formHarga.nama_pasar || '').toLowerCase()) {
      return;
    }
    if (adaPerubahanBelumDisimpan && keranjangPengajuan.length > 0 && formHarga.nama_pasar) {
      const lanjut = window.confirm(
        `Daftar Harga Pangan untuk "${formHarga.nama_pasar}" (${keranjangPengajuan.length} komoditas) belum disimpan ke Draft.\n\nKlik OK untuk pindah ke "${pasarBaru || 'pasar lain'}" (perubahan belum disimpan akan dibersihkan), atau klik Batal lalu tekan "💾 Simpan" terlebih dahulu.`
      );
      if (!lanjut) return;
    }
    setFormHarga((prev) => ({ ...prev, nama_pasar: pasarBaru, nama_komoditas: '', harga: '' }));
    sinkronkanRuangKerjaPasar(pasarBaru, tanggalPengambilan);
  };

  const handleGantiTanggalPengajuan = (tanggalBaru) => {
    if (tanggalBaru === tanggalPengambilan) return;
    if (adaPerubahanBelumDisimpan && keranjangPengajuan.length > 0 && formHarga.nama_pasar) {
      const lanjut = window.confirm(
        `Ada ${keranjangPengajuan.length} komoditas untuk "${formHarga.nama_pasar}" yang belum disimpan ke Draft.\n\nKlik OK untuk mengganti tanggal pengajuan, atau klik Batal lalu tekan "💾 Simpan" terlebih dahulu.`
      );
      if (!lanjut) return;
    }
    setTanggalPengambilan(tanggalBaru);
    if (formHarga.nama_pasar) {
      sinkronkanRuangKerjaPasar(formHarga.nama_pasar, tanggalBaru);
    }
  };

  const handleMulaiPengajuanBaruKosong = () => {
    setDokumenPengajuanDiedit(null);
    setKeranjangPengajuan([]);
    setAdaPerubahanBelumDisimpan(false);
    setCariKeranjangStaf('');
    setTanggalPengambilan(berandaStafService.ambilTanggalHariIniISO());
    setFormHarga((prev) => ({
      ...prev,
      nama_komoditas: '',
      harga: '',
      satuan: daftarSatuan[0] || '1 KG'
    }));
    setSubTabPengajuanStaf('baru');
  };

  // Pintasan Hybrid: Muat seluruh komoditas pasar beserta harga terbit saat ini ke tabel kanan Daftar Harga Pangan
  const handleMuatSemuaHargaPasarKeKeranjang = () => {
    if (!formHarga.nama_pasar) {
      alert('Pilih Pasar terlebih dahulu!');
      return;
    }
    const paketAktif =
      dokumenPengajuanDiedit && (dokumenPengajuanDiedit.status === 'Draft' || dokumenPengajuanDiedit.status === 'Diajukan')
        ? dokumenPengajuanDiedit
        : (pengajuanAktifPasarIni || draftAktifPasarIni || null);
    const daftar = pengajuanHargaService.bangunDaftarInputCepatPasar(
      formHarga.nama_pasar,
      daftarMasterKomoditas,
      daftarHarga,
      paketAktif
    );
    setKeranjangPengajuan(daftar);
    setAdaPerubahanBelumDisimpan(true);
    setCariKeranjangStaf('');
    tampilkanPesan(`⚡ ${daftar.length} komoditas untuk ${formHarga.nama_pasar} dimuat ke Daftar Harga Pangan. Ubah harga yang perlu diperbarui lalu Simpan atau Ajukan.`);
  };

  // Menyaring keranjang agar hanya menyisakan item yang harganya berubah / baru diisi
  const handleSaringHanyaBerubahKeranjang = () => {
    const tersaring = keranjangPengajuan.filter((row) => {
      const angka = parseInt(String(row.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0;
      return angka > 0 && (row.harga_lama === null || row.harga_lama === undefined || angka !== Number(row.harga_lama));
    });
    if (tersaring.length === 0) {
      alert('Belum ada komoditas yang harganya diubah atau baru diisi. Ubah minimal 1 harga terlebih dahulu.');
      return;
    }
    setKeranjangPengajuan(tersaring);
    setAdaPerubahanBelumDisimpan(true);
    tampilkanPesan(`✂️ Daftar diringkas menjadi ${tersaring.length} komoditas yang berubah / baru.`);
  };

  // Membuka dokumen pengajuan dari Daftar Pengajuan (Lihat / Ubah untuk Draft/Diajukan/Ditolak, atau Salin untuk Disetujui)
  const handleBukaDokumenUntukUbah = (pengajuan, modeSalin = false) => {
    if (!pengajuan) return;
    const isDisetujui = pengajuan.status === 'Diverifikasi';
    if (isDisetujui && !modeSalin) {
      setDetailPengajuanBatch(pengajuan);
      return;
    }

    setFormHarga((prev) => ({
      ...prev,
      nama_pasar: pengajuan.nama_pasar,
      nama_komoditas: '',
      harga: ''
    }));
    setTanggalPengambilan(
      modeSalin ? berandaStafService.ambilTanggalHariIniISO() : (pengajuan.tanggal_pengambilan || berandaStafService.ambilTanggalHariIniISO())
    );
    const itemsKeranjang = pengajuanHargaService.bangunKeranjangDariDokumen(pengajuan, daftarHarga);
    setKeranjangPengajuan(itemsKeranjang);
    setAdaPerubahanBelumDisimpan(modeSalin || pengajuan.status === 'Ditolak');
    setCariKeranjangStaf('');

    // Untuk Ditolak atau Salin dari Disetujui -> buat dokumen baru agar histori audit tetap utuh
    if (modeSalin || pengajuan.status === 'Ditolak' || isDisetujui) {
      setDokumenPengajuanDiedit(
        pengajuan.status === 'Ditolak'
          ? { id: null, status: 'Revisi', nama_pasar: pengajuan.nama_pasar, tanggal_pengambilan: pengajuan.tanggal_pengambilan, catatan_verifikasi: pengajuan.catatan_verifikasi }
          : null
      );
    } else {
      setDokumenPengajuanDiedit(pengajuan);
    }

    setDetailPengajuanBatch(null);
    setMenuAktif('input-harga');
    setSubTabPengajuanStaf('baru');
    tampilkanPesan(
      modeSalin
        ? `📋 ${itemsKeranjang.length} komoditas dari "${pengajuan.nama_pasar}" disalin ke Pengajuan Baru.`
        : pengajuan.status === 'Ditolak'
          ? `🔄 Pengajuan ditolak "${pengajuan.nama_pasar}" dimuat untuk revisi (${itemsKeranjang.length} komoditas).`
          : `✏️ Dokumen ${pengajuanHargaService.formatLabelStatus(pengajuan.status)} "${pengajuan.nama_pasar}" dimuat ke form.`
    );
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pintasan dari Beranda Staf: buka Pengajuan Baru untuk pasar tertentu (otomatis muat Ditolak/Draft/Diajukan jika ada)
  const handleBukaInputCepatPasar = (namaPasar) => {
    if (namaPasar) {
      const hariIni = berandaStafService.ambilTanggalHariIniISO();
      const pasarKey = namaPasar.trim().toLowerCase();
      const ditolak = daftarPengajuanHarga.find(
        (p) => p.status === 'Ditolak' && String(p.nama_pasar || '').trim().toLowerCase() === pasarKey
      );
      const diajukan = pengajuanHargaService.cariPengajuanAktifPasar(daftarPengajuanHarga, namaPasar, hariIni, 'Diajukan');
      const draft = pengajuanHargaService.cariPengajuanAktifPasar(daftarPengajuanHarga, namaPasar, hariIni, 'Draft');

      if (ditolak && !diajukan) {
        handleBukaDokumenUntukUbah(ditolak);
        return;
      }
      if (draft) {
        handleBukaDokumenUntukUbah(draft);
        return;
      }
      if (diajukan) {
        handleBukaDokumenUntukUbah(diajukan);
        return;
      }

      setFormHarga((prev) => ({ ...prev, nama_pasar: namaPasar, nama_komoditas: '', harga: '' }));
      setTanggalPengambilan(hariIni);
      setDokumenPengajuanDiedit(null);
      setKeranjangPengajuan([]);
    }
    setMenuAktif('input-harga');
    setSubTabPengajuanStaf('baru');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Staf menghapus Draft atau membatalkan paket yang masih berstatus 'Diajukan'
  const handleBatalkanPengajuanBatch = async (pengajuan) => {
    if (!pengajuan || (pengajuan.status !== 'Diajukan' && pengajuan.status !== 'Draft')) return;
    const isDraft = pengajuan.status === 'Draft';
    const konfirmasiTeks = isDraft
      ? `Hapus Draft pengajuan harga untuk "${pengajuan.nama_pasar}" (${pengajuan.tanggal_tampil})?`
      : `Batalkan pengajuan harga untuk "${pengajuan.nama_pasar}" (${pengajuan.tanggal_tampil})?\n\nPaket yang masih menunggu verifikasi ini akan dihapus dan tidak memengaruhi harga publik.`;
    if (!window.confirm(konfirmasiTeks)) return;

    setSedangMenyimpan(true);
    try {
      await pengajuanHargaService.hapusPengajuanBatch(pengajuan.id);
      if (dokumenPengajuanDiedit?.id === pengajuan.id) {
        setDokumenPengajuanDiedit(null);
        setKeranjangPengajuan([]);
      }
      setDetailPengajuanBatch(null);
      tampilkanPesan(
        isDraft
          ? `🗑️ Draft pengajuan "${pengajuan.nama_pasar}" berhasil dihapus.`
          : `🗑️ Pengajuan harga "${pengajuan.nama_pasar}" (${pengajuan.tanggal_tampil}) berhasil dibatalkan.`
      );
      await muatDataDashboard();
    } catch (err) {
      alert('Gagal menghapus/membatalkan pengajuan: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Tombol "Tambah" (Form Kiri -> Keranjang Kanan Daftar Harga Pangan)
  const handleTambahItemKeKeranjang = (e) => {
    e.preventDefault();
    if (!formHarga.nama_pasar) {
      alert('Pilih Pasar terlebih dahulu!');
      return;
    }
    if (!formHarga.nama_komoditas.trim()) {
      alert('Pilih Nama Komoditas terlebih dahulu!');
      return;
    }
    const hargaAngka = parseInt(String(formHarga.harga).replace(/[^0-9]/g, ''), 10);
    if (!hargaAngka || hargaAngka <= 0) {
      alert('Masukkan nominal Harga Pangan (Rp) yang valid (> 0)!');
      return;
    }
    const namaTrim = formHarga.nama_komoditas.trim();
    const kunci = namaTrim.toLowerCase();
    const satuanGabungan = formatSatuanTampil(formHarga.satuan || daftarSatuan[0] || '1 KG');
    const masterCocok = daftarMasterKomoditas.find((k) => k.nama_komoditas.toLowerCase() === kunci);
    const hargaTerbit = pengajuanHargaService.cariHargaTerbitPasar(formHarga.nama_pasar, namaTrim, daftarHarga);
    const kategoriItem =
      (jenisKomoditasTerpilih !== 'Semua' ? jenisKomoditasTerpilih : '') ||
      masterCocok?.kategori ||
      formHarga.kategori ||
      hargaTerbit?.kategori ||
      'Bahan Pokok';

    setKeranjangPengajuan((prev) => {
      const ada = prev.some((r) => r.nama_komoditas.toLowerCase() === kunci);
      if (ada) {
        return prev.map((r) =>
          r.nama_komoditas.toLowerCase() === kunci
            ? {
              ...r,
              kategori: kategoriItem,
              satuan: satuanGabungan,
              harga_usulan: String(hargaAngka)
            }
            : r
        );
      }
      return [
        {
          tempId: `cart-${kunci}-${Date.now()}`,
          komoditas_id: masterCocok?.id || null,
          nama_komoditas: namaTrim,
          kelompok_komoditas: masterCocok?.kelompok_komoditas || '',
          kategori: kategoriItem,
          satuan: satuanGabungan,
          prioritas_tampil: Number(masterCocok?.prioritas_tampil || formHarga.prioritas_tampil) || 50,
          harga_lama: hargaTerbit ? Math.round(Number(hargaTerbit.harga) || 0) : null,
          tanggal_terakhir: hargaTerbit?.tanggal_penetapan || '-',
          harga_usulan: String(hargaAngka),
          sedang_diajukan: false
        },
        ...prev
      ];
    });
    setAdaPerubahanBelumDisimpan(true);
    setFormHarga((prev) => ({ ...prev, nama_komoditas: '', harga: '' }));
    tampilkanPesan(`✅ "${namaTrim}" (${formatRupiah(hargaAngka)} / ${satuanGabungan}) ditambahkan ke Daftar Harga Pangan.`);
  };

  // Edit cepat angka langsung pada 1 baris tabel kanan Daftar Harga Pangan
  const handleUbahHargaItemKeranjang = (tempId, nilaiMentah) => {
    const angkaBersih = String(nilaiMentah || '').replace(/[^0-9]/g, '');
    setKeranjangPengajuan((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, harga_usulan: angkaBersih } : row))
    );
    setAdaPerubahanBelumDisimpan(true);
  };

  // Hapus 1 baris komoditas dari tabel kanan Daftar Harga Pangan
  const handleHapusItemKeranjang = (tempId) => {
    setKeranjangPengajuan((prev) => prev.filter((row) => row.tempId !== tempId));
    setAdaPerubahanBelumDisimpan(true);
  };

  // Tombol "Simpan" (status = 'Draft') atau "Ajukan" (status = 'Diajukan' dengan Timpa Cerdas)
  const handleSimpanAtauAjukanPengajuan = async (statusTarget = 'Diajukan') => {
    if (!formHarga.nama_pasar || !tanggalPengambilan) {
      alert('Pilih Pasar dan Tanggal Pengajuan terlebih dahulu!');
      return;
    }

    const daftarKirim = ringkasanKeranjangStaf.valid;
    if (daftarKirim.length === 0) {
      alert(
        statusTarget === 'Draft'
          ? 'Daftar Harga Pangan masih kosong! Tambahkan minimal 1 komoditas lewat tombol "Tambah" atau "Muat Harga Pasar Ini" sebelum menyimpan Draft.'
          : 'Daftar Harga Pangan masih kosong! Tambahkan minimal 1 komoditas (harga > 0) sebelum mengajukan ke Kepala Bidang.'
      );
      return;
    }

    const pasarObj = daftarPasarLengkap.find(
      (p) => (p.nama_pasar || '').toLowerCase() === formHarga.nama_pasar.toLowerCase()
    );
    const idEdit =
      dokumenPengajuanDiedit &&
        dokumenPengajuanDiedit.id &&
        (dokumenPengajuanDiedit.status === 'Draft' || dokumenPengajuanDiedit.status === 'Diajukan')
        ? dokumenPengajuanDiedit.id
        : null;

    setSedangMenyimpan(true);
    try {
      const payload = {
        namaPasar: formHarga.nama_pasar,
        pasarId: pasarObj?.id || null,
        tanggalPengambilan,
        petugasId: userState?.id || null,
        namaPetugas: userState?.nama || userState?.username || 'Staf Lapangan',
        items: daftarKirim.map((it) => ({
          komoditas_id: it.komoditas_id,
          nama_komoditas: it.nama_komoditas,
          kategori: it.kategori,
          satuan: it.satuan,
          harga: it.hargaAngka,
          harga_lama: it.harga_lama,
          prioritas_tampil: it.prioritas_tampil
        })),
        daftarHargaAktif: daftarHarga,
        daftarPengajuanAktif: daftarPengajuanHarga,
        pengajuanIdDiedit: idEdit
      };

      const hasil =
        statusTarget === 'Draft'
          ? await pengajuanHargaService.simpanDraftBatchHarga(payload)
          : await pengajuanHargaService.ajukanBatchHarga(payload);

      if (statusTarget === 'Draft') {
        setDokumenPengajuanDiedit({
          id: hasil.id,
          status: 'Draft',
          nama_pasar: formHarga.nama_pasar,
          tanggal_pengambilan: tanggalPengambilan
        });
        setAdaPerubahanBelumDisimpan(false);
        tampilkanPesan(
          hasil.ditimpa
            ? `💾 Draft pengajuan "${hasil.namaPasar}" (${hasil.tanggalTampil}) berhasil diperbarui (${hasil.jumlahItem} komoditas). Anda bisa langsung ganti pasar lain untuk menyusun Draft terpisah.`
            : `💾 Draft pengajuan "${hasil.namaPasar}" (${hasil.tanggalTampil}) berhasil disimpan (${hasil.jumlahItem} komoditas). Aman untuk pindah ke pasar lain atau lanjutkan kapan saja di Daftar Pengajuan.`
        );
      } else {
        setDokumenPengajuanDiedit(null);
        setKeranjangPengajuan([]);
        setAdaPerubahanBelumDisimpan(false);
        setSubTabPengajuanStaf('daftar');
        tampilkanPesan(
          hasil.ditimpa
            ? `🔄 Paket pengajuan "${hasil.namaPasar}" (${hasil.tanggalTampil}) berhasil diperbarui/ditimpa (${hasil.jumlahItem} komoditas) dan menunggu verifikasi Kepala Bidang!`
            : `✅ Berhasil mengajukan ${hasil.jumlahItem} komoditas untuk ${hasil.namaPasar} (${hasil.tanggalTampil}) ke Kepala Bidang! Harga publik tetap aktif sampai disetujui.`
        );
      }
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal memproses pengajuan harga: ' + (error?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Kepala Bidang: Setujui 1 Batch Pengajuan (UPSERT anti-duplikat -> riwayat_harga_pangan akurat!)
  const handleSetujuiPengajuanBatch = async (pengajuan) => {
    if (!pengajuan) return;
    const konfirm = window.confirm(
      `Setujui & Terbitkan Pengajuan Harga?\n\nPasar: ${pengajuan.nama_pasar}\nTanggal: ${pengajuan.tanggal_tampil}\nJumlah Komoditas: ${pengajuan.items?.length || 0} item\n\nHarga di halaman publik akan langsung diperbarui dan tercatat ke grafik tren riwayat.`
    );
    if (!konfirm) return;

    setSedangMenyimpan(true);
    try {
      await pengajuanHargaService.setujuiPengajuanBatch(pengajuan, daftarHarga);
      setDetailPengajuanBatch(null);
      tampilkanPesan(`✅ Paket pengajuan ${pengajuan.nama_pasar} (${pengajuan.items?.length || 0} komoditas) resmi diverifikasi dan terbit ke masyarakat!`);
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menyetujui pengajuan: ' + (error?.message || 'Terjadi kesalahan'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Kepala Bidang: Setujui SEMUA paket pengajuan pasar yang menunggu dalam 1 klik
  const handleSetujuiSemuaAntreanKabid = async () => {
    const jmlPaket = daftarPengajuanDiajukan.length;
    if (jmlPaket === 0) return;

    const konfirm = window.confirm(
      `Setujui & Terbitkan Seluruh Paket Pengajuan?\n\nJumlah paket pasar menunggu: ${jmlPaket} paket\n\nSemua komoditas pada paket tersebut akan langsung terbit ke halaman masyarakat (anti-duplikat) dan tercatat ke riwayat harga.`
    );
    if (!konfirm) return;

    setSedangMenyimpan(true);
    try {
      const hasil = await pengajuanHargaService.setujuiSemuaAntrean({
        daftarPengajuanDiajukan,
        daftarDraftSatuan: [],
        daftarHargaAktif: daftarHarga,
        catatanVerifikasi: `Disetujui massal oleh Kepala Bidang (${userState?.nama || 'Kabid'})`
      });
      tampilkanPesan(
        `✅ Selesai! ${hasil.jumlahPaketDisetujui} paket pasar (${hasil.totalItemTerbit} komoditas) berhasil diverifikasi & diterbitkan ke masyarakat.`
      );
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal memproses persetujuan massal: ' + (error?.message || 'Terjadi kesalahan'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Kepala Bidang: Pilih komoditas master pada tab Input & Terbitkan Langsung
  const handlePilihKomoditasInputKabid = (namaKomoditas) => {
    const master = daftarMasterKomoditas.find(
      (k) => k.nama_komoditas.toLowerCase() === String(namaKomoditas || '').toLowerCase()
    );
    if (master) {
      setFormInputKabid((prev) => ({
        ...prev,
        nama_komoditas: master.nama_komoditas,
        kategori: master.kategori || 'Bahan Pokok',
        satuan: formatSatuanTampil(master.satuan_bawaan) || daftarSatuan[0] || '1 KG',
        prioritas_tampil: Number(master.prioritas_tampil) || 50
      }));
      if (master.kategori) setJenisInputKabid(master.kategori);
    } else {
      setFormInputKabid((prev) => ({ ...prev, nama_komoditas: namaKomoditas }));
    }
  };

  // Kepala Bidang: Tambah 1 komoditas ke daftar siap terbit langsung
  const handleTambahItemKeranjangKabid = (e) => {
    e.preventDefault();
    const pasarDipilih = formInputKabid.nama_pasar || daftarPasar[0] || '';
    if (!pasarDipilih) {
      alert('Pilih Pasar terlebih dahulu!');
      return;
    }
    if (!formInputKabid.nama_komoditas.trim()) {
      alert('Pilih Nama Komoditas terlebih dahulu!');
      return;
    }
    const hargaAngka = parseInt(String(formInputKabid.harga).replace(/[^0-9]/g, ''), 10);
    if (!hargaAngka || hargaAngka <= 0) {
      alert('Masukkan nominal Harga Pangan (Rp) yang valid (> 0)!');
      return;
    }

    const namaTrim = formInputKabid.nama_komoditas.trim();
    const kunci = namaTrim.toLowerCase();
    const satuanGabungan = formatSatuanTampil(formInputKabid.satuan || daftarSatuan[0] || '1 KG');
    const masterCocok = daftarMasterKomoditas.find((k) => k.nama_komoditas.toLowerCase() === kunci);
    const hargaTerbit = pengajuanHargaService.cariHargaTerbitPasar(pasarDipilih, namaTrim, daftarHarga);
    const kategoriItem =
      (jenisInputKabid !== 'Semua' ? jenisInputKabid : '') ||
      masterCocok?.kategori ||
      formInputKabid.kategori ||
      hargaTerbit?.kategori ||
      'Bahan Pokok';

    setFormInputKabid((prev) => ({ ...prev, nama_pasar: pasarDipilih, nama_komoditas: '', harga: '' }));
    setKeranjangInputKabid((prev) => {
      const ada = prev.some((r) => r.nama_komoditas.toLowerCase() === kunci);
      if (ada) {
        return prev.map((r) =>
          r.nama_komoditas.toLowerCase() === kunci
            ? { ...r, kategori: kategoriItem, satuan: satuanGabungan, harga_usulan: String(hargaAngka) }
            : r
        );
      }
      return [
        {
          tempId: `kabid-${kunci}-${Date.now()}`,
          komoditas_id: masterCocok?.id || null,
          nama_komoditas: namaTrim,
          kelompok_komoditas: masterCocok?.kelompok_komoditas || '',
          kategori: kategoriItem,
          satuan: satuanGabungan,
          prioritas_tampil: Number(masterCocok?.prioritas_tampil || formInputKabid.prioritas_tampil) || 50,
          harga_lama: hargaTerbit ? Math.round(Number(hargaTerbit.harga) || 0) : null,
          tanggal_terakhir: hargaTerbit?.tanggal_penetapan || '-',
          harga_usulan: String(hargaAngka)
        },
        ...prev
      ];
    });
    tampilkanPesan(`✅ "${namaTrim}" (${formatRupiah(hargaAngka)} / ${satuanGabungan}) ditambahkan ke daftar siap terbit.`);
  };

  // Kepala Bidang: Muat seluruh harga pasar terpilih ke keranjang terbit langsung
  const handleMuatHargaPasarKabid = () => {
    const pasarDipilih = formInputKabid.nama_pasar || daftarPasar[0] || '';
    if (!pasarDipilih) {
      alert('Pilih Pasar terlebih dahulu!');
      return;
    }
    setFormInputKabid((prev) => ({ ...prev, nama_pasar: pasarDipilih }));
    const daftar = pengajuanHargaService.bangunDaftarInputCepatPasar(
      pasarDipilih,
      daftarMasterKomoditas,
      daftarHarga,
      null
    );
    setKeranjangInputKabid(daftar);
    setCariKeranjangKabid('');
    tampilkanPesan(`⚡ ${daftar.length} komoditas di ${pasarDipilih} dimuat. Ubah nominal lalu klik Terbitkan Langsung.`);
  };

  // Kepala Bidang: Terbitkan langsung daftar harga pasar ke masyarakat (tanpa perlu ajukan/verifikasi ulang)
  const handleTerbitkanLangsungKabid = async () => {
    const pasarDipilih = formInputKabid.nama_pasar || daftarPasar[0] || '';
    const itemValid = keranjangInputKabid.filter(
      (r) => (parseInt(String(r.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0) > 0
    );
    if (!pasarDipilih) {
      alert('Pilih Pasar terlebih dahulu!');
      return;
    }
    if (itemValid.length === 0) {
      alert('Tambahkan minimal 1 komoditas dengan harga > 0 sebelum menerbitkan langsung!');
      return;
    }

    const konfirm = window.confirm(
      `Terbitkan Langsung Harga Pangan?\n\nPasar: ${pasarDipilih}\nTanggal: ${pengajuanHargaService.formatTanggalID(tanggalInputKabid)}\nJumlah Komoditas: ${itemValid.length} item\n\nHarga akan langsung tayang ke masyarakat dan tercatat di riwayat verifikasi atas nama Kepala Bidang.`
    );
    if (!konfirm) return;

    setSedangMenyimpan(true);
    try {
      const pasarObj = daftarPasarLengkap.find(
        (p) => String(p.nama_pasar || '').toLowerCase() === pasarDipilih.toLowerCase()
      );
      const hasil = await pengajuanHargaService.terbitkanLangsungOlehKabid({
        namaPasar: pasarDipilih,
        pasarId: pasarObj?.id || null,
        tanggalPengambilan: tanggalInputKabid,
        petugasId: userState?.id || null,
        namaPetugas: userState?.nama || 'Kepala Bidang',
        items: itemValid,
        daftarHargaAktif: daftarHarga
      });
      setKeranjangInputKabid([]);
      setCariKeranjangKabid('');
      setSubTabVerifKabid('terbit');
      tampilkanPesan(
        `✅ ${hasil.jumlahItem} komoditas untuk ${hasil.namaPasar} (${hasil.tanggalTampil}) berhasil diterbitkan langsung ke masyarakat!`
      );
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menerbitkan langsung: ' + (error?.message || 'Terjadi kesalahan'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Kepala Bidang: Tolak 1 Batch Pengajuan beserta catatan untuk Staf
  const handleEksekusiTolakBatch = async (e) => {
    e.preventDefault();
    if (!modalTolakBatch.pengajuan) return;
    setSedangMenyimpan(true);
    try {
      await pengajuanHargaService.tolakPengajuanBatch(
        modalTolakBatch.pengajuan.id,
        modalTolakBatch.catatan
      );
      tampilkanPesan(`ℹ️ Pengajuan ${modalTolakBatch.pengajuan.nama_pasar} ditolak dengan catatan revisi untuk Staf.`);
      setModalTolakBatch({ buka: false, pengajuan: null, catatan: '' });
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menolak pengajuan: ' + (error?.message || 'Terjadi kesalahan'));
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // Kabid: Ubah data yang dibuat staf (Modal Edit Kabid)
  const handleBukaEditKabid = (item) => {
    setModalEditKabid({
      buka: true,
      item,
      form: {
        nama_komoditas: item.nama_komoditas,
        kategori: item.kategori || 'Bahan Pokok',
        satuan: formatSatuanTampil(item.satuan) || daftarSatuan[0] || '1 KG',
        harga: String(item.harga ? Math.round(item.harga) : '').replace(/[^0-9]/g, ''),
        nama_pasar: item.nama_pasar || daftarPasar[0] || '',
        status: item.status || 'Terbit',
        prioritas_tampil: Number(item.prioritas_tampil) || 50
      }
    });
  };

  const handleSimpanEditKabid = async (e) => {
    if (e) e.preventDefault();
    if (!modalEditKabid.item) return;

    const hargaAngka = parseInt(String(modalEditKabid.form.harga).replace(/[^0-9]/g, ''), 10);
    if (!hargaAngka || hargaAngka <= 0) {
      alert('Besaran harga acuan wajib diisi dengan angka bulat positif lebih dari 0!');
      return;
    }

    const satuanGabungan = formatSatuanTampil(modalEditKabid.form.satuan || daftarSatuan[0] || '1 KG');
    const masterCocok = daftarMasterKomoditas.find(
      (k) => k.nama_komoditas.toLowerCase() === modalEditKabid.form.nama_komoditas.trim().toLowerCase()
    );
    const prioritasFinal = Number(masterCocok?.prioritas_tampil || modalEditKabid.form.prioritas_tampil) || 50;

    try {
      await hargaPanganService.perbarui(modalEditKabid.item.id, {
        nama_komoditas: modalEditKabid.form.nama_komoditas.trim(),
        kategori: modalEditKabid.form.kategori,
        satuan: satuanGabungan,
        harga: hargaAngka,
        nama_pasar: modalEditKabid.form.nama_pasar,
        status: modalEditKabid.form.status || 'Terbit',
        prioritas_tampil: prioritasFinal
      });
      tampilkanPesan(`✅ Data "${modalEditKabid.form.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diperbarui oleh Kepala Bidang.`);
      setModalEditKabid({
        buka: false,
        item: null,
        form: { nama_komoditas: '', kategori: 'Bahan Pokok', satuan: daftarSatuan[0] || '1 KG', harga: '', nama_pasar: '', status: 'Terbit', prioritas_tampil: 50 }
      });
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal memperbarui data: ' + error.message);
    }
  };

  // Kabid: Verifikasi harga satuan (Draft -> Terbit anti-duplikat atau sebaliknya)
  const handleVerifikasiHarga = async (item, statusBaru) => {
    try {
      if (statusBaru === 'Terbit') {
        await pengajuanHargaService.setujuiDraftSatuanTanpaDuplikat(item, daftarHarga);
      } else {
        await hargaPanganService.perbarui(item.id, { status: statusBaru });
      }
      tampilkanPesan(statusBaru === 'Terbit'
        ? `✅ Komoditas "${item.nama_komoditas}" (${item.nama_pasar}) telah diverifikasi dan resmi terbit ke publik!`
        : `ℹ️ Status komoditas "${item.nama_komoditas}" ditarik kembali ke Draf.`);
      await muatDataDashboard();
    } catch (error) {
      alert('Gagal memperbarui status: ' + error.message);
    }
  };

  // Hapus data harga (Hanya boleh oleh Kabid atau Admin)
  const handleHapusHarga = async (id, nama) => {
    if (peran === 'Staf') {
      alert('Akses Ditolak: Staf tidak memiliki hak menghapus data harga. Penghapusan harus melalui Kepala Bidang.');
      return;
    }
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

  const handleTambahMasterKomoditas = async (e) => {
    e.preventDefault();
    if (!formKomoditasMaster.nama_komoditas.trim()) return;
    try {
      const updated = await masterDataService.tambahKomoditas(formKomoditasMaster);
      setDaftarMasterKomoditas(updated);
      const namaTersimpan = formKomoditasMaster.nama_komoditas.trim();
      setFormKomoditasMaster({
        kelompok_komoditas: formKomoditasMaster.kelompok_komoditas,
        nama_komoditas: '',
        kategori: formKomoditasMaster.kategori,
        satuan_bawaan: formKomoditasMaster.satuan_bawaan || daftarSatuan[0] || '1 KG',
        kata_kunci: '',
        prioritas_tampil: 50
      });
      tampilkanPesan(`✅ Master Komoditas "${namaTersimpan}" berhasil disimpan ke database.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusMasterKomoditas = async (namaKomoditas) => {
    if (window.confirm(`Hapus komoditas "${namaKomoditas}" dari daftar Master Komoditas resmi?`)) {
      try {
        const updated = await masterDataService.hapusKomoditas(namaKomoditas);
        setDaftarMasterKomoditas(updated);
        tampilkanPesan(`Komoditas "${namaKomoditas}" telah dihapus dari Master Komoditas.`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleTambahSatuan = async (e) => {
    e.preventDefault();
    if (!inputSatuanBaru.trim()) return;
    try {
      const satuanResmi = masterDataService.formatSatuanPerSatu(inputSatuanBaru.trim());
      const updated = await masterDataService.tambahSatuan(inputSatuanBaru.trim());
      setDaftarSatuan(updated);
      setInputSatuanBaru('');
      tampilkanPesan(`✅ Master Satuan "${satuanResmi}" berhasil disimpan ke database.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusSatuan = async (nama) => {
    if (window.confirm(`Hapus satuan "${nama}" dari Master Satuan?`)) {
      try {
        const updated = await masterDataService.hapusSatuan(nama);
        setDaftarSatuan(updated);
        tampilkanPesan(`Satuan "${nama}" telah dihapus dari Master Data.`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDataPasarBerubah = (listLengkap) => {
    const aman = Array.isArray(listLengkap) ? listLengkap : [];
    setDaftarPasarLengkap(aman);
    setDaftarPasar(aman.map((p) => p.nama_pasar));
  };

  const handleTambahKecamatan = async (e) => {
    e.preventDefault();
    if (!inputKecamatanBaru.trim()) return;
    try {
      const nama = inputKecamatanBaru.trim();
      const updated = await masterDataService.tambahKecamatan(nama);
      setDaftarKecamatan(updated);
      setInputKecamatanBaru('');
      tampilkanPesan(`✅ Kecamatan "${nama}" berhasil ditambahkan ke database master.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusKecamatan = async (nama) => {
    if (window.confirm(`Hapus kecamatan "${nama}" dari daftar master?`)) {
      try {
        const updated = await masterDataService.hapusKecamatan(nama);
        setDaftarKecamatan(updated);
        tampilkanPesan(`Kecamatan "${nama}" telah dihapus.`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // ─────────────────────────────────────────────
  // 5. LOGIKA KELOLA PENGGUNA (KHUSUS ADMIN)
  // ─────────────────────────────────────────────
  const handleTambahUserBaru = async (e) => {
    e.preventDefault();
    try {
      await penggunaService.adminTambahPengguna(userState.id, formUserBaru);
      setFormUserBaru({
        nama: '',
        username: '',
        email: '',
        peran: 'Staf',
        bidang: 'Bidang Cadangan dan Distribusi Pangan',
        kata_sandi: ''
      });
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan('✅ Pengguna baru berhasil didaftarkan ke sistem!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUbahPeranUser = async (idTarget, peranBaru) => {
    try {
      await penggunaService.adminUbahPeran(userState.id, idTarget, peranBaru);
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan('✅ Peran pengguna berhasil diperbarui.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHapusUser = async (idTarget, nama) => {
    if (window.confirm(`Hapus akun pengguna "${nama}" secara permanen?`)) {
      try {
        await penggunaService.adminHapusPengguna(userState.id, idTarget);
        const users = await penggunaService.ambilSemuaPengguna();
        setDaftarPengguna(users);
        tampilkanPesan(`Akun pengguna "${nama}" telah dihapus.`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Eksekusi Hard Reset Password oleh Admin
  const handleEksekusiResetAdmin = async (e) => {
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
      await penggunaService.adminResetPassword(userState.id, modalResetAdmin.userTarget.id, modalResetAdmin.sandiBaru);
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan(`✅ Kata sandi untuk ${modalResetAdmin.userTarget.username} berhasil di-reset.`);
      setModalResetAdmin({ buka: false, userTarget: null, sandiBaru: '', konfirmasiSandi: '', pesan: '' });
    } catch (err) {
      setModalResetAdmin(prev => ({ ...prev, pesan: err.message }));
    }
  };

  // Eksekusi Ubah Username oleh Admin
  const handleEksekusiUbahUsername = async (e) => {
    e.preventDefault();
    if (!modalEditUsername.usernameBaru.trim()) {
      setModalEditUsername(prev => ({ ...prev, pesan: 'Username baru tidak boleh kosong!' }));
      return;
    }

    try {
      await penggunaService.adminUbahUsername(userState.id, modalEditUsername.userTarget.id, modalEditUsername.usernameBaru.trim());
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan(`✅ Username berhasil diperbarui menjadi ${modalEditUsername.usernameBaru.trim()}`);
      setModalEditUsername({ buka: false, userTarget: null, usernameBaru: '', pesan: '' });
    } catch (err) {
      setModalEditUsername(prev => ({ ...prev, pesan: err.message }));
    }
  };

  // Eksekusi Ubah Email oleh Admin
  const handleEksekusiUbahEmail = async (e) => {
    e.preventDefault();
    if (!modalEditEmail.emailBaru.trim()) {
      setModalEditEmail(prev => ({ ...prev, pesan: 'Alamat email baru tidak boleh kosong!' }));
      return;
    }

    try {
      await penggunaService.adminUbahEmail(userState.id, modalEditEmail.userTarget.id, modalEditEmail.emailBaru.trim());
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      tampilkanPesan(`✅ Alamat email berhasil diperbarui menjadi ${modalEditEmail.emailBaru.trim()}`);
      setModalEditEmail({ buka: false, userTarget: null, emailBaru: '', pesan: '' });
    } catch (err) {
      setModalEditEmail(prev => ({ ...prev, pesan: err.message }));
    }
  };

  // Eksekusi Ubah Nama & Bidang oleh Admin / Superadmin
  const handleEksekusiUbahProfilUser = async (e) => {
    e.preventDefault();
    if (!modalEditProfilUser.namaBaru.trim()) {
      setModalEditProfilUser(prev => ({ ...prev, pesan: 'Nama lengkap tidak boleh kosong!' }));
      return;
    }
    try {
      const hasil = await penggunaService.adminUbahProfil(userState.id, modalEditProfilUser.userTarget.id, {
        nama: modalEditProfilUser.namaBaru.trim(),
        bidang: modalEditProfilUser.bidangBaru.trim()
      });
      const users = await penggunaService.ambilSemuaPengguna();
      setDaftarPengguna(users);
      if (String(modalEditProfilUser.userTarget.id) === String(userState.id) && hasil) {
        setUserState(prev => ({ ...prev, nama: hasil.nama, bidang: hasil.bidang }));
      }
      tampilkanPesan(`✅ Profil "${hasil.nama}" berhasil diperbarui.`);
      setModalEditProfilUser({ buka: false, userTarget: null, namaBaru: '', bidangBaru: '', pesan: '' });
    } catch (err) {
      setModalEditProfilUser(prev => ({ ...prev, pesan: err.message }));
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

  // Unggah Berkas Foto Profil Langsung dari Galeri/Perangkat Lokal
  const handlePilihBerkasFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPesanProfil({ tipe: 'error', teks: '⚠️ Berkas harus berupa gambar (JPG, PNG, atau WebP)!' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPesanProfil({ tipe: 'error', teks: '⚠️ Ukuran foto maksimal 2 MB!' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (base64) {
        setInputFotoUrl(base64);
        setPesanProfil({ tipe: 'sukses', teks: 'Foto dipilih dari perangkat. Klik "Perbarui Foto" untuk menyimpan.' });
      }
    };
    reader.readAsDataURL(file);
  };

  // Cetak Dokumen PDF Resmi Anti-Blank (Isolated Iframe A4 dengan Kop Surat & Filter Aktif)
  const handleCetakDokumen = (konfigurasi) => {
    if (!konfigurasi || !konfigurasi.jenis) return;
    if (konfigurasi.jenis === 'kabid-harga') {
      laporanService.cetakLaporanHargaPDF(konfigurasi.data || [], {
        penandatangan: { nama: ambilNamaPenandatangan('Kabid') },
        jabatanPenandatangan: 'Kepala Bidang Cadangan dan Distribusi Pangan',
        filter: konfigurasi.filter || {}
      });
      return;
    }
    if (konfigurasi.jenis === 'kabid-gpm') {
      laporanService.cetakLaporanGPMPDF(konfigurasi.data || [], {
        penandatangan: { nama: ambilNamaPenandatangan('Kabid') },
        jabatanPenandatangan: 'Kepala Bidang Cadangan dan Distribusi Pangan',
        filter: konfigurasi.filter || {}
      });
      return;
    }
    if (konfigurasi.jenis === 'kadis-gpm-semua') {
      laporanService.cetakLaporanGPMPDF(konfigurasi.data || rekapitulasiGPMList, {
        penandatangan: { nama: ambilNamaPenandatangan('Kadis') },
        jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
        filter: konfigurasi.filter || { labelPeriode: 'Semua Periode' }
      });
      return;
    }
    if (konfigurasi.jenis === 'kadis-gpm-acara') {
      const targetPeran = peran === 'Kabid' ? 'Kabid' : 'Kadis';
      laporanService.cetakLaporanPendaftarGPMPDF(konfigurasi.acara, konfigurasi.pendaftar || [], {
        penandatangan: { nama: ambilNamaPenandatangan(targetPeran) },
        jabatanPenandatangan: targetPeran === 'Kabid'
          ? 'Kepala Bidang Cadangan dan Distribusi Pangan'
          : 'Kepala Dinas Pangan Kota Manado'
      });
    }
  };

  const handleSimpanPasswordPribadi = async (e) => {
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
      await penggunaService.ubahKataSandiPribadi(userState.id, passwordLama, passwordBaru);
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

  // Data Riil Rekapitulasi GPM (Terkoneksi Basis Data Supabase & Pendaftar Riil)
  const listPendaftarAman = Array.isArray(daftarPendaftarGPM)
    ? daftarPendaftarGPM
    : (Array.isArray(daftarPendaftarGPM?.data) ? daftarPendaftarGPM.data : []);
  const listAcaraAman = Array.isArray(daftarAcaraGPM) ? daftarAcaraGPM : [];

  // Helper penandatangan resmi dinamis (dari profil login atau akun pejabat terdaftar di Supabase — 0% nama/NIP fiktif)
  const ambilNamaPenandatangan = (peranTarget) => {
    if (peran === peranTarget && userState?.nama && String(userState.nama).trim()) {
      return String(userState.nama).trim();
    }
    const pejabatDB = (Array.isArray(daftarPengguna) ? daftarPengguna : []).find(
      u => penggunaService.normalisasiPeran(u.peran) === peranTarget && u.nama && String(u.nama).trim()
    );
    return pejabatDB ? String(pejabatDB.nama).trim() : '';
  };

  const rekapitulasiGPMList = listAcaraAman.map(a => {
    const pendaftarAcara = listPendaftarAman.filter(p => String(p.acara_id) === String(a.id));
    const st = jadwalGPMService.hitungStatusOperasional(a);
    const terdaftarCount = Math.max(pendaftarAcara.length, st.terisi || 0);
    const terlayaniCount = Math.max(
      pendaftarAcara.filter(p => p.status_kehadiran === 'Hadir').length,
      st.totalHadir || 0
    );
    return {
      id: a.id,
      nama_acara: a.nama_acara,
      lokasi: a.lokasi,
      kecamatan: a.kecamatan || '-',
      tanggal: a.tanggal,
      jam_mulai: a.jam_mulai,
      jam_selesai: a.jam_selesai,
      mode_penerima: a.mode_penerima || 'individu',
      satuan_penerima: String(a.mode_penerima || 'individu').toLowerCase() === 'keluarga' ? 'KK' : 'Warga',
      target_kuota: st.kuotaMaks,
      terdaftar: terdaftarCount,
      terlayani: terlayaniCount,
      status: st.sudahBerakhir ? 'Selesai' : 'Aktif',
      komoditas_tersedia: a.komoditas_tersedia || '-',
      daftar_warga: pendaftarAcara
    };
  });
  const daftarGpmKadisTerfilter = rekapitulasiGPMList.filter((g) => {
    if (!berandaKadisService.apakahAcaraMasukPeriode(g, filterLaporanGPMKadis.periode)) return false;
    if (filterLaporanGPMKadis.kecamatan !== 'Semua' && g.kecamatan !== filterLaporanGPMKadis.kecamatan) return false;
    if (filterLaporanGPMKadis.status !== 'Semua' && String(g.status || '').toLowerCase() !== filterLaporanGPMKadis.status.toLowerCase()) return false;
    return true;
  });
  const daftarDraftVerifikasi = (Array.isArray(daftarHarga) ? daftarHarga : []).filter(item => item && (item.status || '').toLowerCase() === 'draft');
  const daftarPengajuanDiajukan = (Array.isArray(daftarPengajuanHarga) ? daftarPengajuanHarga : []).filter(p => p && p.status === 'Diajukan');
  const ringkasanBerandaStaf = useMemo(
    () =>
      berandaStafService.hitungRingkasanOperasional({
        daftarPasarLengkap,
        daftarHarga,
        daftarMasterKomoditas,
        daftarPengajuan: daftarPengajuanHarga,
        daftarAcaraGPM: listAcaraAman
      }),
    [daftarPasarLengkap, daftarHarga, daftarMasterKomoditas, daftarPengajuanHarga, listAcaraAman]
  );
  const ringkasanBerandaKabid = useMemo(
    () =>
      berandaKabidService.hitungRingkasanKabid({
        daftarPasarLengkap,
        daftarHarga,
        daftarMasterKomoditas,
        daftarPengajuan: daftarPengajuanHarga,
        daftarAcaraGPM: listAcaraAman,
        daftarPendaftarGPM: listPendaftarAman,
        periode: periodeBerandaKabid
      }),
    [daftarPasarLengkap, daftarHarga, daftarMasterKomoditas, daftarPengajuanHarga, listAcaraAman, listPendaftarAman, periodeBerandaKabid]
  );
  const ringkasanBerandaKadis = useMemo(
    () =>
      berandaKadisService.hitungRingkasanKadis({
        daftarHarga,
        daftarPasarLengkap,
        daftarKecamatanMaster: daftarKecamatan,
        daftarAcaraGPM: listAcaraAman,
        daftarPendaftarGPM: listPendaftarAman,
        periode: periodeBerandaKadis
      }),
    [daftarHarga, daftarPasarLengkap, daftarKecamatan, listAcaraAman, listPendaftarAman, periodeBerandaKadis]
  );
  const ringkasanBerandaAdmin = useMemo(
    () =>
      berandaAdminService.hitungRingkasanSistem({
        daftarPengguna,
        daftarMasterKomoditas,
        daftarSatuan,
        daftarPasarLengkap,
        daftarKecamatan,
        daftarHarga,
        daftarPengajuan: daftarPengajuanHarga,
        daftarAcaraGPM: listAcaraAman
      }),
    [daftarPengguna, daftarMasterKomoditas, daftarSatuan, daftarPasarLengkap, daftarKecamatan, daftarHarga, daftarPengajuanHarga, listAcaraAman]
  );
  const grupKomoditasDropdown = masterDataService.kelompokkanKomoditasUntukDropdown(daftarMasterKomoditas);
  const daftarKelompokIndukMaster = Array.from(new Set(daftarMasterKomoditas.map(k => k.kelompok_komoditas).filter(Boolean)));

  return (
    <div className="petugas-app-layout">
      {/* ─────────────────────────────────────────────
          7. SIDEBAR NAVIGASI BERDASARKAN ROLE RESMI
          ───────────────────────────────────────────── */}
      <aside className={`petugas-sidebar ${sidebarTerbuka ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-box">
          <div className="sidebar-logo-circle">
            <img src="/logodinaspangan.png" alt="Logo SIPATOKAAN" className="sidebar-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <h2 className="sidebar-app-name">SI PATOKAAN</h2>
            <p className="sidebar-dept-name">Dinas Pangan Kota Manado</p>
          </div>
        </div>

        <div className="sidebar-section-title">
          MENU {namaLengkapPeran(peran).toUpperCase()}
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
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
                Masuk Sebagai: <strong>{userState.nama || 'Petugas'}</strong> (Peran: <span style={{ color: '#8b1e1e', fontWeight: 700 }}>{namaLengkapPeran(peran)}</span>)
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {daftarNotif.some(n => !n.dibaca) && <span className="notif-red-dot" />}
            </div>

            {/* Dropdown Notifikasi */}
            {tampilkanNotifDropdown && (
              <div style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '340px',
                maxWidth: 'calc(100vw - 32px)',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                zIndex: 1000,
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>🔔 Notifikasi Respon Sistem</strong>
                  <button
                    onClick={() => {
                      setDaftarNotif(prev => prev.map(n => ({ ...n, dibaca: true })));
                    }}
                    style={{ background: 'none', border: 'none', color: '#8b1e1e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Tandai Dibaca
                  </button>
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {daftarNotif.length === 0 ? (
                    <div style={{ padding: '16px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                      Belum ada pemberitahuan baru
                    </div>
                  ) : (
                    daftarNotif.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.target) {
                            let targetTujuan = n.target;
                            if (targetTujuan === 'input-harga-daftar') {
                              setSubTabPengajuanStaf('daftar');
                              targetTujuan = 'input-harga';
                            } else if (targetTujuan === 'gpm-petugas') {
                              targetTujuan = (isKabid || isStaf) ? 'kelola-gpm' : 'cek-gpm';
                            }
                            setMenuAktif(targetTujuan);
                          }
                          setTampilkanNotifDropdown(false);
                        }}
                        style={{
                          padding: '10px 8px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: n.target ? 'pointer' : 'default',
                          borderRadius: '6px',
                          background: '#ffffff',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>{n.judul}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>{n.pesan}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{n.waktu}</span>
                          {n.target && <span style={{ fontSize: '0.7rem', color: '#8b1e1e', fontWeight: 700 }}>Buka Modul →</span>}
                        </div>
                      </div>
                    ))
                  )}
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
                <span className="staff-role-text">{namaLengkapPeran(peran)}</span>
              </div>
              <div className="staff-avatar-circle" style={{ overflow: 'hidden' }}>
                {userState.foto_profil ? (
                  <img src={userState.foto_profil} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (userState.nama ? userState.nama.charAt(0) : 'P').toUpperCase()
                )}
              </div>
            </div>

            {/* Tombol Logout Cepat di Header (Memastikan Tombol Keluar Selalu Terlihat di Mobile Web & Desktop) */}
            <button
              type="button"
              className="topbar-quick-logout-btn"
              onClick={onKeluar}
              title="Keluar dari Akun (Logout)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {pesanNotifikasi && (
          <div className="petugas-alert-bar">
            {pesanNotifikasi}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            9. VIEW 1: DASHBOARD (BERANDA OPERASIONAL STAF & ROLE LAINNYA)
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && peran === 'Staf' && (
          <div className="dashboard-page-container">
            <div className="staf-hero-banner">
              <div className="staf-hero-text">
                <span className="staf-hero-date-pill">📅 Operasional Lapangan · {ringkasanBerandaStaf.hariIniID}</span>
                <h1 className="dashboard-main-heading" style={{ margin: '6px 0 4px 0' }}>
                  Beranda Kerja Staf — Survey Harga &amp; GPM
                </h1>
                <p className="dashboard-main-subheading" style={{ margin: 0 }}>
                  Pantau pasar yang belum diperbarui hari ini, tindak lanjuti catatan revisi Kepala Bidang, dan buka pemindai QR GPM langsung dari satu layar.
                </p>
              </div>
              <div className="staf-hero-actions">
                <button
                  type="button"
                  className="staf-btn-primary"
                  onClick={() => handleBukaInputCepatPasar(ringkasanBerandaStaf.statusPerPasar[0]?.nama_pasar || daftarPasar[0] || '')}
                >
                  📝 Input / Edit Harga Cepat
                </button>
                <button
                  type="button"
                  className="staf-btn-secondary"
                  onClick={() => {
                    setSubTabGpmTarget('scan');
                    setMenuAktif('kelola-gpm');
                  }}
                >
                  📷 Pindai QR GPM
                </button>
              </div>
            </div>

            {/* 4 Kartu KPI Operasional Staf */}
            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white">
                <div className="stat-icon-square icon-green">🏪</div>
                <div className="stat-number-big">
                  {ringkasanBerandaStaf.kpi.pasarSelesaiHariIni} / {ringkasanBerandaStaf.kpi.totalPasar}
                </div>
                <div className="stat-title-label">Progres Survey Pasar Hari Ini</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaStaf.kpi.persenProgresPasar}% selesai · {ringkasanBerandaStaf.kpi.pasarPerluSurvey} pasar belum diperbarui
                </div>
              </div>

              <div
                className="stat-card-white"
                style={{ cursor: 'pointer', borderColor: ringkasanBerandaStaf.kpi.pengajuanDitolak > 0 ? '#fca5a5' : undefined }}
                onClick={() => {
                  setSubTabPengajuanStaf('daftar');
                  setMenuAktif('input-harga');
                }}
              >
                <div className="stat-icon-square icon-amber">📨</div>
                <div className="stat-number-big" style={{ color: ringkasanBerandaStaf.kpi.pengajuanDitolak > 0 ? '#dc2626' : undefined }}>
                  {ringkasanBerandaStaf.kpi.pengajuanMenunggu}
                </div>
                <div className="stat-title-label">Menunggu Verifikasi Kabid</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaStaf.kpi.pengajuanDitolak > 0
                    ? `⚠️ ${ringkasanBerandaStaf.kpi.pengajuanDitolak} ditolak`
                    : '0 ditolak'}
                  {ringkasanBerandaStaf.kpi.pengajuanDraft > 0
                    ? ` · 📝 ${ringkasanBerandaStaf.kpi.pengajuanDraft} draft`
                    : ''}
                </div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-pink">🏷️</div>
                <div className="stat-number-big">{ringkasanBerandaStaf.kpi.totalTerbit}</div>
                <div className="stat-title-label">Harga Terbit Aktif</div>
                <div className="stat-caption-sub">
                  dari {ringkasanBerandaStaf.kpi.totalMasterKom} varian Master Komoditas
                </div>
              </div>

              <div
                className="stat-card-white"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubTabGpmTarget('scan');
                  setMenuAktif('kelola-gpm');
                }}
              >
                <div className="stat-icon-square icon-blue">🎟️</div>
                <div className="stat-number-big">{ringkasanBerandaStaf.kpi.jumlahGPMAktif}</div>
                <div className="stat-title-label">Agenda GPM Aktif</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaStaf.kpi.totalMenungguScanGPM} tiket warga menunggu dipindai
                </div>
              </div>
            </div>

            {/* BAGIAN 1: CHECKLIST PROGRES SURVEY HARGA PER PASAR HARI INI */}
            <section className="staf-ops-card" style={{ marginTop: '20px' }}>
              <div className="staf-ops-card-head">
                <div>
                  <h3 className="staf-ops-card-title">📋 Checklist Survey &amp; Pembaruan Harga per Pasar</h3>
                  <p className="staf-ops-card-sub">
                    Diurutkan berdasarkan prioritas tugas: revisi ditolak &amp; pasar yang belum diperbarui hari ini tampil paling atas.
                  </p>
                </div>
                <div className="staf-progress-pill">
                  <span>Progres Hari Ini: <strong>{ringkasanBerandaStaf.kpi.persenProgresPasar}%</strong></span>
                  <div className="staf-progress-track">
                    <div
                      className="staf-progress-fill"
                      style={{ width: `${ringkasanBerandaStaf.kpi.persenProgresPasar}%` }}
                    />
                  </div>
                </div>
              </div>

              {ringkasanBerandaStaf.statusPerPasar.length === 0 ? (
                <div className="staf-empty-box">
                  Belum ada pasar terdaftar di Master Pasar. Hubungi Admin untuk menambahkan daftar pasar resmi Kota Manado.
                </div>
              ) : (
                <div className="staf-market-checklist-grid">
                  {ringkasanBerandaStaf.statusPerPasar.map((pasar) => (
                    <div key={pasar.nama_pasar} className={`staf-market-row-card is-${pasar.kodeStatus}`}>
                      <div className="staf-market-row-main">
                        <div className="staf-market-row-top">
                          <strong className="staf-market-name">📍 {pasar.nama_pasar}</strong>
                          <span className={`staf-status-chip is-${pasar.kodeStatus}`}>
                            {pasar.kodeStatus === 'revisi' && '⚠️ '}
                            {pasar.kodeStatus === 'menunggu' && '⏳ '}
                            {pasar.kodeStatus === 'draft' && '📝 '}
                            {pasar.kodeStatus === 'terbaru' && '✅ '}
                            {pasar.kodeStatus === 'perlu_update' && '📌 '}
                            {pasar.kodeStatus === 'kosong' && '📭 '}
                            {pasar.labelStatus}
                          </span>
                        </div>

                        <div className="staf-market-meta">
                          <span>Kec. {pasar.kecamatan}</span>
                          <span>·</span>
                          <span>
                            Kelengkapan: <strong>{pasar.jumlahTerbit}/{pasar.totalMasterKom || pasar.jumlahTerbit}</strong> komoditas ({pasar.persenKelengkapan}%)
                          </span>
                          <span>·</span>
                          <span>Terakhir: <strong>{pasar.tanggalTerakhir}</strong></span>
                        </div>

                        <div className="staf-market-bar-track">
                          <div className="staf-market-bar-fill" style={{ width: `${pasar.persenKelengkapan}%` }} />
                        </div>

                        {pasar.catatanPenolakanTerbaru && (
                          <div className="staf-reject-note-inline">
                            💬 <strong>Catatan Kepala Bidang:</strong> {pasar.catatanPenolakanTerbaru}
                          </div>
                        )}
                      </div>

                      <div className="staf-market-row-action">
                        <button
                          type="button"
                          className={`staf-btn-market-go ${pasar.kodeStatus === 'revisi' ? 'is-urgent' : ''}`}
                          onClick={() => handleBukaInputCepatPasar(pasar.nama_pasar)}
                        >
                          {pasar.kodeStatus === 'revisi'
                            ? '🔄 Perbaiki Harga →'
                            : pasar.jumlahTerbit === 0
                              ? '➕ Input Pasar Ini →'
                              : '✏️ Edit Harga Pasar →'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* BAGIAN 2: GRID 2 KOLOM (STATUS PENGAJUAN TERBARU + AGENDA GPM TERDEKAT) */}
            <div className="staf-ops-two-col">
              {/* Kiri: Status Pengajuan Harga ke Kabid */}
              <section className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">📨 Status Pengajuan Harga Terbaru</h3>
                    <p className="staf-ops-card-sub">Pantau hasil verifikasi Kepala Bidang atas pengajuan batch per pasar Anda.</p>
                  </div>
                  <button
                    type="button"
                    className="staf-link-btn"
                    onClick={() => {
                      setSubTabPengajuanStaf('daftar');
                      setMenuAktif('input-harga');
                    }}
                  >
                    Lihat Daftar Pengajuan →
                  </button>
                </div>

                {ringkasanBerandaStaf.pengajuanTerbaru.length === 0 ? (
                  <div className="staf-empty-box">
                    {belumMigrasiPengajuan
                      ? 'Tabel pengajuan_harga belum aktif di basis data. Ajukan harga melalui menu Input Harga.'
                      : 'Belum ada dokumen pengajuan harga. Pilih salah satu pasar di atas untuk mulai membuat pengajuan harga.'}
                  </div>
                ) : (
                  <div className="staf-submission-list">
                    {ringkasanBerandaStaf.pengajuanTerbaru.map((p) => (
                      <div key={p.id} className="staf-submission-item">
                        <div className="staf-sub-info">
                          <div className="staf-sub-title-row">
                            <strong>📍 {p.nama_pasar}</strong>
                            <span className={`staf-batch-pill is-${String(p.status || 'Diajukan').toLowerCase()}`}>
                              {pengajuanHargaService.formatLabelStatus(p.status)}
                            </span>
                          </div>
                          <div className="staf-sub-meta">
                            📅 {p.tanggal_tampil} · {p.items?.length || 0} komoditas · oleh {p.nama_petugas}
                          </div>
                          {p.catatan_verifikasi && (
                            <div className={`staf-sub-note ${p.status === 'Ditolak' ? 'is-reject' : ''}`}>
                              💬 {p.catatan_verifikasi}
                            </div>
                          )}
                        </div>
                        <div className="staf-sub-actions">
                          {p.status !== 'Diverifikasi' ? (
                            <button
                              type="button"
                              className={`staf-mini-btn ${p.status === 'Ditolak' ? 'is-revisi' : ''}`}
                              onClick={() => handleBukaDokumenUntukUbah(p)}
                            >
                              {p.status === 'Ditolak' ? '🔄 Revisi' : '✏️ Lihat / Ubah'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="staf-mini-btn"
                              onClick={() => setDetailPengajuanBatch(p)}
                            >
                              👁️ Lihat
                            </button>
                          )}
                          {(p.status === 'Diajukan' || p.status === 'Draft') && (
                            <button
                              type="button"
                              className="staf-mini-btn"
                              style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                              disabled={sedangMenyimpan}
                              onClick={() => handleBatalkanPengajuanBatch(p)}
                            >
                              {p.status === 'Draft' ? '🗑️ Hapus' : '🗑️ Batalkan'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Kanan: Agenda Tugas GPM Terdekat */}
              <section className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">🎟️ Agenda Tugas GPM Terdekat</h3>
                    <p className="staf-ops-card-sub">Jadwal Gerakan Pangan Murah aktif yang membutuhkan pemindaian QR &amp; layanan lokasi.</p>
                  </div>
                  <button
                    type="button"
                    className="staf-link-btn"
                    onClick={() => {
                      setSubTabGpmTarget('antrean');
                      setMenuAktif('kelola-gpm');
                    }}
                  >
                    Kelola GPM →
                  </button>
                </div>

                {ringkasanBerandaStaf.agendaGPMTerdekat.length === 0 ? (
                  <div className="staf-empty-box">
                    Tidak ada jadwal GPM aktif saat ini. Anda dapat membuat jadwal baru melalui menu Kelola GPM.
                  </div>
                ) : (
                  <div className="staf-gpm-list">
                    {ringkasanBerandaStaf.agendaGPMTerdekat.map((acara) => {
                      const st = acara.statusOperasional;
                      return (
                        <div key={acara.id} className="staf-gpm-item">
                          <div className="staf-gpm-top">
                            <span className={`staf-gpm-status is-${st.kode.toLowerCase().replace(/\s+/g, '-')}`}>
                              {st.label}
                            </span>
                            <span className="staf-gpm-time">⏳ {st.keteranganWaktu}</span>
                          </div>
                          <strong className="staf-gpm-title">{acara.nama_acara}</strong>
                          <div className="staf-sub-meta">
                            📍 {acara.lokasi} (Kec. {acara.kecamatan}) · 📅 {acara.tanggal} ({acara.jam_mulai}–{acara.jam_selesai} WITA)
                          </div>
                          <div className="staf-gpm-footer">
                            <span className="staf-gpm-quota">
                              Terdaftar: <strong>{st.terisi}/{st.kuotaMaks}</strong> · Hadir: <strong>{st.totalHadir}</strong>
                            </span>
                            <button
                              type="button"
                              className="staf-mini-btn is-scan"
                              onClick={() => {
                                setSubTabGpmTarget('scan');
                                setMenuAktif('kelola-gpm');
                              }}
                            >
                              📷 Pindai QR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            9B. VIEW 1B: BERANDA OPERASIONAL KEPALA BIDANG (100% DATA RIIL + FILTER PERIODE)
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && peran === 'Kabid' && (
          <div className="dashboard-page-container">
            <div className="staf-hero-banner">
              <div style={{ flex: 1, minWidth: '260px' }}>
                <span className="staf-hero-date-pill">
                  🏛️ {ringkasanBerandaKabid.hariIniID} · Periode: {ringkasanBerandaKabid.labelPeriode}
                </span>
                <h1 className="dashboard-main-heading" style={{ marginTop: '8px', marginBottom: '4px' }}>
                  Beranda Kepala Bidang — Pengawasan &amp; Verifikasi
                </h1>
                <p className="dashboard-main-subheading" style={{ marginBottom: 0 }}>
                  Ringkasan real-time verifikasi harga pasar, progres update harian staf, dan capaian Gerakan Pangan Murah ({ringkasanBerandaKabid.labelPeriode}).
                </p>
              </div>
              <div className="kabid-hero-controls">
                <div className="kabid-period-switch" role="group" aria-label="Pilih periode ringkasan">
                  {[
                    { id: 'bulan_ini', label: 'Bulan Ini' },
                    { id: 'tahun_ini', label: `Tahun ${ringkasanBerandaKabid.tahunBerjalan}` },
                    { id: 'semua', label: 'Semua Periode' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`kabid-period-btn ${periodeBerandaKabid === opt.id ? 'active' : ''}`}
                      onClick={() => setPeriodeBerandaKabid(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="staf-hero-actions">
                  <button
                    type="button"
                    className="staf-btn-primary"
                    onClick={() => {
                      setSubTabVerifKabid('antrean');
                      setMenuAktif('verif-harga');
                    }}
                  >
                    ✅ Verifikasi Harga ({ringkasanBerandaKabid.kpi.totalMenungguVerifikasi})
                  </button>
                  <button
                    type="button"
                    className="staf-btn-secondary"
                    onClick={() => {
                      setSubTabVerifKabid('input');
                      setMenuAktif('verif-harga');
                    }}
                  >
                    ⚡ Input Langsung
                  </button>
                  <button
                    type="button"
                    className="staf-btn-secondary"
                    onClick={() => setMenuAktif('laporan')}
                  >
                    📑 Laporan &amp; Excel
                  </button>
                </div>
              </div>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div
                className="stat-card-white"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubTabVerifKabid('antrean');
                  setMenuAktif('verif-harga');
                }}
              >
                <div className="stat-icon-square icon-amber">📦</div>
                <div className="stat-number-big">{ringkasanBerandaKabid.kpi.menungguVerifikasiPaket}</div>
                <div className="stat-title-label">Menunggu Verifikasi</div>
                <div className="stat-caption-sub">
                  paket pengajuan pasar dari staf
                </div>
              </div>

              <div
                className="stat-card-white"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubTabVerifKabid('terbit');
                  setMenuAktif('verif-harga');
                }}
              >
                <div className="stat-icon-square icon-pink">🏪</div>
                <div className="stat-number-big">
                  {ringkasanBerandaKabid.kpi.pasarSelesaiHariIni}/{ringkasanBerandaKabid.kpi.totalPasar}
                </div>
                <div className="stat-title-label">Update Pasar Hari Ini</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaKabid.kpi.persenKepatuhanPasar}% pasar diperbarui · {ringkasanBerandaKabid.kpi.totalHargaTerbit} harga terbit
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => { setSubTabGpmTarget('riwayat'); setMenuAktif('kelola-gpm'); }}>
                <div className="stat-icon-square icon-green">✅</div>
                <div className="stat-number-big">{ringkasanBerandaKabid.kpi.gpmTerlaksanaPeriode}</div>
                <div className="stat-title-label">GPM Terlaksana ({ringkasanBerandaKabid.labelPeriode})</div>
                <div className="stat-caption-sub">
                  Aktif: {ringkasanBerandaKabid.kpi.gpmAktifSekarang} · Total arsip: {ringkasanBerandaKabid.kpi.gpmTerlaksanaTotalArsip}
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => { setSubTabLaporanKabid('gpm'); setMenuAktif('laporan'); }}>
                <div className="stat-icon-square icon-blue">🎟️</div>
                <div className="stat-number-big">{ringkasanBerandaKabid.kpi.persenSerapanPeriode}%</div>
                <div className="stat-title-label">Serapan Kuota GPM</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaKabid.kpi.totalHadirPeriode.toLocaleString('id-ID')} hadir dari {ringkasanBerandaKabid.kpi.totalKuotaPeriode.toLocaleString('id-ID')} kuota
                </div>
              </div>
            </div>

            <div className="staf-ops-two-col">
              {/* Kiri: Antrean Verifikasi Paket Harga Pasar (Hanya Diajukan, bukan Draft pribadi Staf) */}
              <section className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">📦 Antrean Verifikasi Paket Harga</h3>
                    <p className="staf-ops-card-sub">Usulan resmi dari Staf Pangan yang siap disetujui sekaligus atau ditolak.</p>
                  </div>
                  <button
                    type="button"
                    className="staf-link-btn"
                    onClick={() => {
                      setSubTabVerifKabid('antrean');
                      setMenuAktif('verif-harga');
                    }}
                  >
                    Buka Menu Verifikasi →
                  </button>
                </div>

                {ringkasanBerandaKabid.antreanPengajuanTerbaru.length === 0 ? (
                  <div className="staf-empty-box">
                    Semua pengajuan harga dari staf sudah selesai diverifikasi. Tidak ada antrean tertunda saat ini.
                  </div>
                ) : (
                  <div className="staf-submission-list">
                    {ringkasanBerandaKabid.antreanPengajuanTerbaru.map((p) => (
                      <div key={p.id} className="staf-submission-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="staf-sub-title-row">
                            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>📍 {p.nama_pasar}</strong>
                            <span className="staf-batch-pill is-pending">{p.items?.length || 0} komoditas</span>
                          </div>
                          <div className="staf-sub-meta">
                            📅 {p.tanggal_tampil} · 👤 {p.nama_petugas}
                          </div>
                        </div>
                        <div className="kabid-row-actions">
                          <button
                            type="button"
                            className="kabid-btn-outline"
                            onClick={() => setDetailPengajuanBatch(p)}
                          >
                            👁️ Tinjau
                          </button>
                          <button
                            type="button"
                            className="kabid-btn-approve-sm"
                            disabled={sedangMenyimpan}
                            onClick={() => handleSetujuiPengajuanBatch(p)}
                          >
                            ✓ Setujui
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Kanan: Status Update Pasar Hari Ini */}
              <section className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">🏪 Status Update Pasar Hari Ini</h3>
                    <p className="staf-ops-card-sub">
                      {ringkasanBerandaKabid.kpi.pasarSelesaiHariIni} dari {ringkasanBerandaKabid.kpi.totalPasar} pasar sudah melaporkan harga hari ini.
                    </p>
                  </div>
                  <div className="staf-progress-pill" style={{ minWidth: '130px' }}>
                    <span>Progres: <strong>{ringkasanBerandaKabid.kpi.persenKepatuhanPasar}%</strong></span>
                    <div className="staf-progress-track">
                      <div className="staf-progress-fill" style={{ width: `${ringkasanBerandaKabid.kpi.persenKepatuhanPasar}%` }} />
                    </div>
                  </div>
                </div>

                {ringkasanBerandaKabid.kepatuhanPerPasar.length === 0 ? (
                  <div className="staf-empty-box">Belum ada data master pasar di database.</div>
                ) : (
                  <div className="staf-market-checklist-grid">
                    {ringkasanBerandaKabid.kepatuhanPerPasar.map((m) => (
                      <div key={m.nama_pasar} className={`staf-market-row-card is-${m.kodeStatus}`}>
                        <div className="staf-market-row-main">
                          <div className="staf-market-row-top">
                            <strong className="staf-market-name">{m.nama_pasar}</strong>
                            <span className={`staf-status-chip is-${m.kodeStatus}`}>{m.labelStatus}</span>
                          </div>
                          <div className="staf-market-meta" style={{ marginBottom: 0 }}>
                            <span>{m.jumlahTerbit} komoditas terbit</span>
                            {m.jumlahPengajuanMenunggu > 0 && <span>· {m.jumlahPengajuanMenunggu} paket menunggu verifikasi</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Bawah Full: Monitoring Pelaksanaan GPM Periode Aktif */}
              <section className="staf-ops-card" style={{ gridColumn: '1 / -1' }}>
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">🎟️ Pelaksanaan Gerakan Pangan Murah ({ringkasanBerandaKabid.labelPeriode})</h3>
                    <p className="staf-ops-card-sub">
                      Pantau realisasi kehadiran dan serapan kuota per titik lokasi GPM pada periode terpilih.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="staf-link-btn"
                      onClick={() => setMenuAktif('kelola-gpm')}
                    >
                      Kelola GPM →
                    </button>
                    <button
                      type="button"
                      className="staf-link-btn"
                      onClick={() => {
                        setFilterLaporanGPMKabid((prev) => ({ ...prev, periode: periodeBerandaKabid }));
                        setSubTabLaporanKabid('gpm');
                        setMenuAktif('laporan');
                      }}
                    >
                      Cetak / Excel GPM →
                    </button>
                  </div>
                </div>

                {ringkasanBerandaKabid.gpmPeriodeList.length === 0 ? (
                  <div className="staf-empty-box">
                    Belum ada kegiatan Gerakan Pangan Murah tercatat pada periode {ringkasanBerandaKabid.labelPeriode}.
                  </div>
                ) : (
                  <div className="staf-gpm-list">
                    {ringkasanBerandaKabid.gpmPeriodeList.map((a) => (
                      <div key={a.id} className="staf-gpm-item kabid-gpm-row">
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div className="staf-sub-title-row" style={{ justifyContent: 'flex-start' }}>
                            <strong style={{ color: '#0f172a', fontSize: '0.94rem' }}>{a.nama_acara}</strong>
                            <span className={`staf-batch-pill ${a.statusOperasional.sudahBerakhir ? 'is-ok' : 'is-pending'}`}>
                              {a.statusOperasional.sudahBerakhir ? 'Selesai' : 'Aktif'}
                            </span>
                          </div>
                          <div className="staf-sub-meta">
                            📍 {a.lokasi} (Kec. {a.kecamatan || '-'}) · 📅 {a.tanggal} ({a.jam_mulai}–{a.jam_selesai} WITA)
                          </div>
                        </div>
                        <div className="kabid-gpm-serapan-box">
                          <div className="kabid-gpm-serapan-text">
                            Hadir <strong>{a.hadirRiil}</strong> / {a.kuotaRiil} kuota ({a.persenSerapan}%) · Daftar: {a.terdaftarRiil}
                          </div>
                          <div className="kabid-gpm-mini-bar">
                            <div className="kabid-gpm-mini-fill" style={{ width: `${a.persenSerapan}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            9C. VIEW 1C: BERANDA EKSEKUTIF KEPALA DINAS (100% DATA RIIL + FILTER PERIODE)
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && peran === 'Kadis' && (
          <div className="dashboard-page-container">
            <div className="staf-hero-banner">
              <div style={{ flex: 1, minWidth: '260px' }}>
                <span className="staf-hero-date-pill">
                  🏛️ {ringkasanBerandaKadis.hariIniID} · Periode: {ringkasanBerandaKadis.labelPeriode}
                </span>
                <h1 className="dashboard-main-heading" style={{ marginTop: '8px', marginBottom: '4px' }}>
                  Beranda Eksekutif — Kepala Dinas Pangan Kota Manado
                </h1>
                <p className="dashboard-main-subheading" style={{ marginBottom: 0 }}>
                  Ringkasan strategis stabilitas harga pangan pokok, disparitas antar pasar, dan pemerataan Gerakan Pangan Murah ({ringkasanBerandaKadis.labelPeriode}).
                </p>
              </div>
              <div className="kabid-hero-controls">
                <div className="kabid-period-switch" role="group" aria-label="Pilih periode eksekutif">
                  {[
                    { id: 'bulan_ini', label: 'Bulan Ini' },
                    { id: 'tahun_ini', label: `Tahun ${ringkasanBerandaKadis.tahunBerjalan}` },
                    { id: 'semua', label: 'Semua Periode' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`kabid-period-btn ${periodeBerandaKadis === opt.id ? 'active' : ''}`}
                      onClick={() => setPeriodeBerandaKadis(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="staf-hero-actions">
                  <button
                    type="button"
                    className="staf-btn-primary"
                    onClick={() => setMenuAktif('grafik-pangan')}
                  >
                    📈 Analisis Grafik Pangan
                  </button>
                  <button
                    type="button"
                    className="staf-btn-secondary"
                    onClick={() => {
                      setFilterLaporanGPMKadis((prev) => ({ ...prev, periode: periodeBerandaKadis }));
                      setSubTabLaporanKadis('gpm');
                      setMenuAktif('laporan-gpm');
                    }}
                  >
                    📋 Laporan Eksekutif
                  </button>
                </div>
              </div>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('grafik-pangan')}>
                <div className="stat-icon-square icon-pink">🏷️</div>
                <div className="stat-number-big">{ringkasanBerandaKadis.kpi.jumlahKomoditasUnik}</div>
                <div className="stat-title-label">Komoditas Terpantau</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaKadis.kpi.totalHargaTerbit} harga terbit di {ringkasanBerandaKadis.kpi.pasarTerpantau}/{ringkasanBerandaKadis.kpi.totalPasarMaster} pasar
                </div>
              </div>

              <div
                className="stat-card-white"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setFilterLaporanGPMKadis((prev) => ({ ...prev, periode: periodeBerandaKadis }));
                  setSubTabLaporanKadis('gpm');
                  setMenuAktif('laporan-gpm');
                }}
              >
                <div className="stat-icon-square icon-green">✅</div>
                <div className="stat-number-big">{ringkasanBerandaKadis.kpi.gpmSelesaiPeriode}</div>
                <div className="stat-title-label">GPM Terlaksana ({ringkasanBerandaKadis.labelPeriode})</div>
                <div className="stat-caption-sub">
                  Aktif: {ringkasanBerandaKadis.kpi.gpmAktifPeriode} · Total arsip: {ringkasanBerandaKadis.kpi.gpmSelesaiArsip}
                </div>
              </div>

              <div
                className="stat-card-white"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setFilterLaporanGPMKadis((prev) => ({ ...prev, periode: periodeBerandaKadis }));
                  setSubTabLaporanKadis('gpm');
                  setMenuAktif('laporan-gpm');
                }}
              >
                <div className="stat-icon-square icon-blue">👥</div>
                <div className="stat-number-big">{ringkasanBerandaKadis.kpi.persenSerapanPeriode}%</div>
                <div className="stat-title-label">Serapan Kuota GPM</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaKadis.kpi.totalHadirPeriode.toLocaleString('id-ID')} hadir dari {ringkasanBerandaKadis.kpi.totalKuotaPeriode.toLocaleString('id-ID')} kuota
                </div>
              </div>

              <div
                className="stat-card-white"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setFilterLaporanGPMKadis((prev) => ({ ...prev, periode: periodeBerandaKadis }));
                  setSubTabLaporanKadis('gpm');
                  setMenuAktif('laporan-gpm');
                }}
              >
                <div className="stat-icon-square icon-amber">🗺️</div>
                <div className="stat-number-big">
                  {ringkasanBerandaKadis.kpi.kecamatanTerjangkau}/{ringkasanBerandaKadis.kpi.totalKecamatan}
                </div>
                <div className="stat-title-label">Cakupan Kecamatan GPM</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaKadis.kpi.persenCakupanWilayah}% wilayah kecamatan terjangkau
                </div>
              </div>
            </div>

            <div className="staf-ops-two-col">
              {/* Kiri: Pemerataan Pelaksanaan GPM per Kecamatan */}
              <section className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">🗺️ Pemerataan GPM per Kecamatan ({ringkasanBerandaKadis.labelPeriode})</h3>
                    <p className="staf-ops-card-sub">
                      Sebaran titik kegiatan dan realisasi penerima manfaat berdasarkan Master Kecamatan Manado.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="staf-link-btn"
                    onClick={() => {
                      setFilterLaporanGPMKadis((prev) => ({ ...prev, periode: periodeBerandaKadis }));
                      setSubTabLaporanKadis('gpm');
                      setMenuAktif('laporan-gpm');
                    }}
                  >
                    Buka Laporan →
                  </button>
                </div>

                {ringkasanBerandaKadis.pemerataanKecamatan.length === 0 ? (
                  <div className="staf-empty-box">Belum ada data master kecamatan di database.</div>
                ) : (
                  <div className="staf-market-checklist-grid">
                    {ringkasanBerandaKadis.pemerataanKecamatan.slice(0, 8).map((k) => (
                      <div key={k.kecamatan} className={`staf-market-row-card ${k.totalKegiatan > 0 ? 'is-terbaru' : 'is-kosong'}`}>
                        <div className="staf-market-row-main">
                          <div className="staf-market-row-top">
                            <strong className="staf-market-name">Kec. {k.kecamatan}</strong>
                            <span className={`staf-status-chip ${k.totalKegiatan > 0 ? 'is-terbaru' : 'is-kosong'}`}>
                              {k.totalKegiatan > 0 ? `${k.totalKegiatan} Titik GPM` : 'Belum Terjadwal'}
                            </span>
                          </div>
                          <div className="staf-market-meta" style={{ marginBottom: k.totalKegiatan > 0 ? '6px' : 0 }}>
                            {k.totalKegiatan > 0 ? (
                              <>
                                <span>Selesai: {k.selesai} · Aktif: {k.aktif}</span>
                                <span>· Hadir: <strong>{k.hadir}/{k.kuota}</strong> ({k.persenSerapan}%)</span>
                              </>
                            ) : (
                              <span>Belum ada pelaksanaan GPM pada periode {ringkasanBerandaKadis.labelPeriode}.</span>
                            )}
                          </div>
                          {k.totalKegiatan > 0 && (
                            <div className="kabid-gpm-mini-bar" style={{ maxWidth: '280px' }}>
                              <div className="kabid-gpm-mini-fill" style={{ width: `${k.persenSerapan}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Kanan: Sorotan Disparitas Harga Antar Pasar (100% Data Riil Terbit) */}
              <section className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3 className="staf-ops-card-title">⚖️ Sorotan Disparitas Harga Antar Pasar</h3>
                    <p className="staf-ops-card-sub">
                      Komoditas resmi terbit dengan perbedaan harga tertinggi–terendah lintas pasar Manado.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="staf-link-btn"
                    onClick={() => {
                      setSubTabLaporanKadis('harga');
                      setMenuAktif('laporan-gpm');
                    }}
                  >
                    Rekap Harga →
                  </button>
                </div>

                {ringkasanBerandaKadis.sorotanDisparitasHarga.length === 0 ? (
                  <div className="staf-empty-box">Belum ada data harga resmi terbit di database.</div>
                ) : (
                  <div className="staf-submission-list">
                    {ringkasanBerandaKadis.sorotanDisparitasHarga.map((item) => (
                      <div key={item.nama_komoditas} className="staf-submission-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="staf-sub-title-row" style={{ justifyContent: 'flex-start' }}>
                            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{item.nama_komoditas}</strong>
                            <span className="pengajuan-kat-tag">{item.jumlahPasar} pasar</span>
                          </div>
                          <div className="staf-sub-meta">
                            Rata-rata: <strong style={{ color: '#8b1e1e' }}>{formatRupiah(item.rataRata)}</strong> / {formatSatuanTampil(item.satuan)}
                            {item.disparitas > 0 && (
                              <> · Rentang {formatRupiah(item.terendah)} – {formatRupiah(item.tertinggi)} (selisih {item.persenDisparitas}%)</>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="kabid-btn-outline"
                          onClick={() => {
                            setKomoditasTren(item.nama_komoditas);
                            setMenuAktif('grafik-pangan');
                          }}
                        >
                          📈 Tren
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* BERANDA ADMINISTRATOR SISTEM (100% DATA RIIL) */}
        {menuAktif === 'dashboard' && peran === 'Admin' && (
          <div className="dashboard-page-container">
            <div className="staf-hero-banner">
              <div className="staf-hero-main">
                <div className="staf-hero-date-pill">🛡️ {ringkasanBerandaAdmin.hariIniID} · Panel Administrator Sistem</div>
                <h1 className="dashboard-main-heading">Beranda Administrator — Tata Kelola Akun &amp; Master Data</h1>
                <p className="dashboard-main-subheading">
                  Kelola akun kedinasan (Staf, Kabid, Kadis, Admin), referensi Master Komoditas, Satuan, Pasar + titik peta, Kecamatan, dan supervisi GPM.
                </p>
              </div>
              <div className="staf-hero-actions">
                <button type="button" className="staf-btn-primary" onClick={() => setMenuAktif('kelola-user')}>
                  👥 Kelola Pengguna ({ringkasanBerandaAdmin.kpi.totalPengguna})
                </button>
                <button type="button" className="staf-btn-secondary" onClick={() => setMenuAktif('master-data')}>
                  🏛️ Master Data
                </button>
              </div>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-user')}>
                <div className="stat-icon-square icon-pink">👥</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.totalPengguna}</div>
                <div className="stat-title-label">Akun Pengguna Aktif</div>
                <div className="stat-caption-sub">
                  Staf {ringkasanBerandaAdmin.kpi.rincianPeran.Staf} · Kabid {ringkasanBerandaAdmin.kpi.rincianPeran.Kabid} · Kadis {ringkasanBerandaAdmin.kpi.rincianPeran.Kadis}
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('master-data')}>
                <div className="stat-icon-square icon-orange">🌾</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.totalMasterKomoditas}</div>
                <div className="stat-title-label">Master Komoditas</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaAdmin.kpi.totalKelompokKomoditas} kelompok induk · {ringkasanBerandaAdmin.kpi.totalSatuan} satuan
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('master-data')}>
                <div className="stat-icon-square icon-green">📍</div>
                <div className="stat-number-big">
                  {ringkasanBerandaAdmin.kpi.pasarDenganPeta}/{ringkasanBerandaAdmin.kpi.totalPasar}
                </div>
                <div className="stat-title-label">Pasar Berkoordinat Peta</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaAdmin.kpi.persenPasarBerpeta}% berpeta · {ringkasanBerandaAdmin.kpi.totalKecamatan} kecamatan
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('cek-gpm')}>
                <div className="stat-icon-square icon-pink-box">🔍</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.gpmAktif}</div>
                <div className="stat-title-label">GPM Aktif Dipantau</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaAdmin.kpi.gpmSelesai} arsip · {ringkasanBerandaAdmin.kpi.totalTerdaftarGPM} pendaftar
                </div>
              </div>
            </div>

            <div className="staf-ops-two-col">
              {/* Distribusi Akun per Peran */}
              <div className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3>👥 Distribusi Akun per Peran</h3>
                    <small>Komposisi hak akses aktif di basis data Supabase</small>
                  </div>
                  <button type="button" className="staf-link-btn" onClick={() => setMenuAktif('kelola-user')}>
                    Kelola →
                  </button>
                </div>
                <div className="admin-role-pills">
                  <div className="admin-role-pill-box"><span>Staf Pangan</span><strong>{ringkasanBerandaAdmin.kpi.rincianPeran.Staf}</strong></div>
                  <div className="admin-role-pill-box"><span>Kepala Bidang</span><strong>{ringkasanBerandaAdmin.kpi.rincianPeran.Kabid}</strong></div>
                  <div className="admin-role-pill-box"><span>Kepala Dinas</span><strong>{ringkasanBerandaAdmin.kpi.rincianPeran.Kadis}</strong></div>
                  <div className="admin-role-pill-box"><span>Admin</span><strong>{ringkasanBerandaAdmin.kpi.rincianPeran.Admin}</strong></div>
                  <div className="admin-role-pill-box is-protected"><span>Superadmin 🔒</span><strong>{ringkasanBerandaAdmin.kpi.rincianPeran.Superadmin}</strong></div>
                </div>
              </div>

              {/* Kelengkapan Titik Peta Master Pasar */}
              <div className="staf-ops-card">
                <div className="staf-ops-card-head">
                  <div>
                    <h3>🗺️ Kelengkapan Titik Peta Pasar</h3>
                    <small>Menjamin seluruh pasar tampil akurat di Peta Publik</small>
                  </div>
                  <button type="button" className="staf-link-btn" onClick={() => setMenuAktif('master-data')}>
                    Atur Peta →
                  </button>
                </div>
                {ringkasanBerandaAdmin.daftarPasarTanpaPeta.length === 0 ? (
                  <div className="staf-ops-empty" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
                    ✅ Seluruh {ringkasanBerandaAdmin.kpi.totalPasar} pasar tradisional sudah memiliki titik koordinat peta.
                  </div>
                ) : (
                  <div className="staf-submission-list">
                    {ringkasanBerandaAdmin.daftarPasarTanpaPeta.map((p) => (
                      <div key={p.id || p.nama_pasar} className="staf-submission-item">
                        <div>
                          <strong>⚠️ {p.nama_pasar}</strong>
                          <div className="staf-sub-meta">Belum memiliki koordinat Latitude / Longitude</div>
                        </div>
                        <button type="button" className="kabid-btn-outline" onClick={() => setMenuAktif('master-data')}>
                          Lengkapi
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BERANDA PUSAT KENDALI SUPERADMIN (FULL FEATURE LINTAS PERAN) */}
        {menuAktif === 'dashboard' && peran === 'Superadmin' && (
          <div className="dashboard-page-container">
            <div className="staf-hero-banner">
              <div className="staf-hero-main">
                <div className="staf-hero-date-pill">👑 {ringkasanBerandaAdmin.hariIniID} · Mode Akses Penuh (Superadmin)</div>
                <h1 className="dashboard-main-heading">Pusat Kendali Superadmin — Seluruh Modul SIPATOKAAN</h1>
                <p className="dashboard-main-subheading">
                  Kendali terpadu lintas peran (Staf, Kepala Bidang, Kepala Dinas, dan Administrator) dengan 100% data riil Supabase.
                </p>
              </div>
              <div className="staf-hero-actions">
                <button type="button" className="staf-btn-primary" onClick={() => setMenuAktif('verif-harga')}>
                  ✅ Verifikasi Harga ({ringkasanBerandaAdmin.kpi.pengajuanMenunggu})
                </button>
                <button type="button" className="staf-btn-secondary" onClick={() => setMenuAktif('kelola-user')}>
                  👥 Kelola Pengguna
                </button>
              </div>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('verif-harga')}>
                <div className="stat-icon-square icon-pink">🏷️</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.totalHargaTerbit}</div>
                <div className="stat-title-label">Harga Terbit Publik</div>
                <div className="stat-caption-sub">{ringkasanBerandaAdmin.kpi.pengajuanMenunggu} paket menunggu verif</div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                <div className="stat-icon-square icon-green">🎟️</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.gpmAktif}</div>
                <div className="stat-title-label">GPM Aktif</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaAdmin.kpi.gpmSelesai} selesai · {ringkasanBerandaAdmin.kpi.totalHadirGPM}/{ringkasanBerandaAdmin.kpi.totalKuotaGPM} hadir
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-user')}>
                <div className="stat-icon-square icon-orange">👥</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.totalPengguna}</div>
                <div className="stat-title-label">Total Akun Sistem</div>
                <div className="stat-caption-sub">
                  SA {ringkasanBerandaAdmin.kpi.rincianPeran.Superadmin} · Adm {ringkasanBerandaAdmin.kpi.rincianPeran.Admin} · Kabid {ringkasanBerandaAdmin.kpi.rincianPeran.Kabid} · Kadis {ringkasanBerandaAdmin.kpi.rincianPeran.Kadis} · Staf {ringkasanBerandaAdmin.kpi.rincianPeran.Staf}
                </div>
              </div>

              <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('master-data')}>
                <div className="stat-icon-square icon-pink-box">🏛️</div>
                <div className="stat-number-big">{ringkasanBerandaAdmin.kpi.totalMasterKomoditas}</div>
                <div className="stat-title-label">Master Data Resmi</div>
                <div className="stat-caption-sub">
                  {ringkasanBerandaAdmin.kpi.totalPasar} pasar · {ringkasanBerandaAdmin.kpi.totalSatuan} satuan · {ringkasanBerandaAdmin.kpi.totalKecamatan} kec.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '1rem', color: '#1e293b', margin: '0 0 14px 0' }}>
                🧭 Akses Cepat Seluruh 9 Modul Kedinasan (Full Feature):
              </h3>
              <div className="superadmin-quick-grid">
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('input-harga')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📝 Masukan Data Pangan (Staf)</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Input &amp; ajukan paket harga komoditas per pasar.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('verif-harga')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>✅ Verifikasi &amp; Input Langsung (Kabid)</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>{ringkasanBerandaAdmin.kpi.pengajuanMenunggu} paket antrean + mode terbit langsung.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🎟️ Kelola &amp; Pindai GPM</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Buat jadwal GPM, scan QR, atur kuota, &amp; selesaikan acara.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📑 Laporan Bidang Pangan (Kabid)</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Ekspor Excel (.xlsx) 2-sheet &amp; cetak PDF A4 harga dan GPM.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('grafik-pangan')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📈 Grafik Tren Pangan (Kadis)</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Analisis tren fluktuasi harga &amp; ekspor Excel/PDF tren.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan-gpm')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📋 Laporan Eksekutif Kadis</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Rekapitulasi GPM &amp; harga terbit bertanda tangan Kadis.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-user')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>👥 Kelola Pengguna &amp; RBAC</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Kelola semua {ringkasanBerandaAdmin.kpi.totalPengguna} akun termasuk peran Superadmin.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('master-data')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🏛️ Master Komoditas, Pasar &amp; Wilayah</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Atur komoditas induk/varian, satuan, titik peta pasar &amp; kecamatan.</p>
                </div>
                <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('cek-gpm')}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🔍 Supervisi Menu Cek GPM</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Inspeksi seluruh titik GPM aktif/selesai, warga &amp; Excel.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            10. VIEW 2: MENU PENGAJUAN HARGA PANGAN HYBRID (STAF / SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'input-harga' && isStaf && (() => {
          const kataCariKeranjang = cariKeranjangStaf.trim().toLowerCase();
          const keranjangTerfilter = keranjangPengajuan.filter((row) => {
            if (!kataCariKeranjang) return true;
            return `${row.nama_komoditas} ${row.kategori} ${row.satuan}`.toLowerCase().includes(kataCariKeranjang);
          });

          const daftarPengajuanTerfilter = daftarPengajuanHarga.filter((p) => {
            if (filterStatusPengajuanStaf === 'semua') return true;
            return String(p.status || '').toLowerCase() === filterStatusPengajuanStaf.toLowerCase();
          });

          const hargaAktifPasarDipilih = daftarHarga.filter(
            (h) =>
              String(h.nama_pasar || '').toLowerCase() === String(formHarga.nama_pasar || '').toLowerCase() &&
              String(h.status || '').toLowerCase() === 'terbit'
          );

          const jumlahDraft = daftarPengajuanHarga.filter((p) => p.status === 'Draft').length;
          const jumlahDiajukan = daftarPengajuanHarga.filter((p) => p.status === 'Diajukan').length;
          const jumlahDisetujui = daftarPengajuanHarga.filter((p) => p.status === 'Diverifikasi').length;
          const jumlahDitolak = daftarPengajuanHarga.filter((p) => p.status === 'Ditolak').length;

          const sedangMenimpaDiajukan = Boolean(
            (dokumenPengajuanDiedit && dokumenPengajuanDiedit.status === 'Diajukan') ||
            (!dokumenPengajuanDiedit && pengajuanAktifPasarIni)
          );

          return (
            <div className="tetapkan-harga-page-container">
              <div className="dashboard-hero-title-box">
                <h1 className="dashboard-main-heading">Pengajuan Harga Pangan per Pasar</h1>
                <p className="dashboard-main-subheading">
                  Tambahkan komoditas satu per satu atau muat langsung seluruh harga pasar untuk diedit cepat, simpan sebagai Draft, lalu ajukan ke Kepala Bidang.
                </p>
              </div>

              {/* SUB-NAVIGASI PENGAJUAN (BARU / DAFTAR / HARGA TERBIT) */}
              <div className="pengajuan-subnav-bar">
                <button
                  type="button"
                  className={`pengajuan-subnav-btn ${subTabPengajuanStaf === 'baru' ? 'active' : ''}`}
                  onClick={() => setSubTabPengajuanStaf('baru')}
                >
                  {dokumenPengajuanDiedit?.id
                    ? `✏️ Ubah ${pengajuanHargaService.formatLabelStatus(dokumenPengajuanDiedit.status)}`
                    : dokumenPengajuanDiedit?.status === 'Revisi'
                      ? '🔄 Revisi Pengajuan'
                      : '📝 Pengajuan Baru'}
                </button>
                <button
                  type="button"
                  className={`pengajuan-subnav-btn ${subTabPengajuanStaf === 'daftar' ? 'active' : ''}`}
                  onClick={() => setSubTabPengajuanStaf('daftar')}
                >
                  📋 Daftar Pengajuan ({daftarPengajuanHarga.length})
                </button>
                <button
                  type="button"
                  className={`pengajuan-subnav-btn ${subTabPengajuanStaf === 'terbit' ? 'active' : ''}`}
                  onClick={() => setSubTabPengajuanStaf('terbit')}
                >
                  🏷️ Harga Terbit {formHarga.nama_pasar ? `(${hargaAktifPasarDipilih.length})` : ''}
                </button>
              </div>

              {/* ── TAB 1: PENGAJUAN BARU (HYBRID: FORM KIRI + DAFTAR HARGA PANGAN KANAN) ── */}
              {subTabPengajuanStaf === 'baru' && (
                <>
                  {/* Banner Konteks: Sedang Mengedit Draft / Diajukan / Revisi Ditolak */}
                  {dokumenPengajuanDiedit && (
                    <div
                      className={`pengajuan-context-banner ${dokumenPengajuanDiedit.status === 'Revisi'
                        ? 'is-reject'
                        : dokumenPengajuanDiedit.status === 'Draft'
                          ? 'is-draft'
                          : 'is-pending'
                        }`}
                    >
                      <div>
                        {dokumenPengajuanDiedit.status === 'Revisi' ? (
                          <>
                            <strong>🔄 Mode Revisi Pengajuan Ditolak ({dokumenPengajuanDiedit.nama_pasar}):</strong>{' '}
                            {dokumenPengajuanDiedit.catatan_verifikasi || 'Perbaiki harga di Daftar Harga Pangan lalu klik Ajukan.'}
                          </>
                        ) : dokumenPengajuanDiedit.status === 'Draft' ? (
                          <>
                            <strong>📝 Sedang Membuka Draft ({dokumenPengajuanDiedit.nama_pasar}):</strong> Anda dapat menambah/mengubah daftar komoditas, klik <strong>Simpan</strong> untuk memperbarui Draft, atau <strong>Ajukan</strong> ke Kepala Bidang.
                          </>
                        ) : (
                          <>
                            <strong>⏳ Sedang Mengubah Pengajuan Aktif ({dokumenPengajuanDiedit.nama_pasar}):</strong> Menyimpan ulang dengan tombol <strong>Ajukan</strong> akan otomatis menimpa paket ini tanpa membuat duplikat.
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="staf-mini-btn"
                        onClick={handleMulaiPengajuanBaruKosong}
                      >
                        ➕ Buat Pengajuan Baru
                      </button>
                    </div>
                  )}

                  {/* Banner Peringatan Paket Aktif (jika belum masuk mode edit namun pasar+tgl punya Diajukan/Draft) */}
                  {!dokumenPengajuanDiedit && (pengajuanAktifPasarIni || draftAktifPasarIni) && (
                    <div className="pengajuan-context-banner is-pending">
                      <div>
                        {pengajuanAktifPasarIni ? (
                          <>
                            <strong>⏳ Sudah ada Pengajuan Aktif ({pengajuanAktifPasarIni.items?.length || 0} komoditas)</strong> untuk <strong>{formHarga.nama_pasar}</strong> pada tanggal ini. Klik <strong>Muat untuk Ubah</strong> agar item sebelumnya ikut terbawa, atau mengajukan baru akan menimpa paket tersebut.
                          </>
                        ) : (
                          <>
                            <strong>📝 Anda memiliki Draft tersimpan ({draftAktifPasarIni.items?.length || 0} komoditas)</strong> untuk <strong>{formHarga.nama_pasar}</strong> pada tanggal ini.
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="staf-mini-btn"
                          onClick={() => handleBukaDokumenUntukUbah(pengajuanAktifPasarIni || draftAktifPasarIni)}
                        >
                          📂 Muat untuk Ubah
                        </button>
                        {pengajuanAktifPasarIni && (
                          <button
                            type="button"
                            className="staf-mini-btn"
                            style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                            disabled={sedangMenyimpan}
                            onClick={() => handleBatalkanPengajuanBatch(pengajuanAktifPasarIni)}
                          >
                            🗑️ Batalkan
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bilah Pintasan Draft Tersimpan per Pasar (Bukti Visual Setiap Pasar Terpisah & Tidak Saling Menimpa) */}
                  {daftarPengajuanHarga.some((p) => p.status === 'Draft') && (
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e3a8a' }}>
                        📝 Draft Tersimpan (Terpisah per Pasar):
                      </span>
                      {daftarPengajuanHarga
                        .filter((p) => p.status === 'Draft')
                        .map((dr) => {
                          const aktifIni = dokumenPengajuanDiedit?.id && String(dokumenPengajuanDiedit.id) === String(dr.id);
                          return (
                            <button
                              key={dr.id}
                              type="button"
                              className="staf-mini-btn"
                              style={
                                aktifIni
                                  ? { background: '#1d4ed8', color: '#ffffff', borderColor: '#1d4ed8' }
                                  : { background: '#ffffff', color: '#1e40af', borderColor: '#93c5fd' }
                              }
                              onClick={() => handleBukaDokumenUntukUbah(dr)}
                            >
                              📍 {dr.nama_pasar} ({dr.items?.length || 0})
                            </button>
                          );
                        })}
                    </div>
                  )}

                  <div className="tetapkan-content-columns pengajuan-hybrid-grid">
                    {/* KOLOM KIRI: FORM PENGAJUAN BARU (PERSIS STRUKTUR DOSEN) */}
                    <div className="tetapkan-form-card">
                      <div className="pengajuan-card-header">
                        <h3>📝 Pengajuan Baru</h3>
                        <small>Pilih pasar &amp; komoditas, lalu klik Tambah ke Daftar Harga Pangan.</small>
                      </div>

                      <form onSubmit={handleTambahItemKeKeranjang} className="pengajuan-left-form">
                        <div className="pengajuan-form-row">
                          <label>Pilih Pasar *</label>
                          <select
                            required
                            value={formHarga.nama_pasar}
                            onChange={(e) => handleGantiPasarPengajuan(e.target.value)}
                            className="field-select-box"
                          >
                            <option value="">-- Pilih Pasar --</option>
                            {daftarPasar.map((pasar) => (
                              <option key={pasar} value={pasar}>{pasar}</option>
                            ))}
                          </select>
                        </div>

                        <div className="pengajuan-form-row">
                          <label>Tanggal Pengajuan *</label>
                          <input
                            type="date"
                            required
                            value={tanggalPengambilan}
                            onChange={(e) => handleGantiTanggalPengajuan(e.target.value)}
                            className="field-input-box"
                          />
                        </div>

                        <div className="pengajuan-form-divider" />

                        <div className="pengajuan-form-row">
                          <label>Jenis Komoditas</label>
                          <select
                            value={jenisKomoditasTerpilih}
                            onChange={(e) => {
                              const kat = e.target.value;
                              setJenisKomoditasTerpilih(kat);
                              setFormHarga((prev) => ({
                                ...prev,
                                kategori: kat === 'Semua' ? prev.kategori : kat,
                                nama_komoditas: ''
                              }));
                            }}
                            className="field-select-box"
                          >
                            <option value="Semua">Semua Jenis Komoditas</option>
                            {daftarJenisKomoditas.map((kat) => (
                              <option key={kat} value={kat}>{kat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="pengajuan-form-row">
                          <label>Nama Komoditas *</label>
                          <select
                            required
                            value={formHarga.nama_komoditas}
                            onChange={(e) => {
                              handlePilihKomoditasStaf(e.target.value);
                              const master = daftarMasterKomoditas.find(
                                (k) => k.nama_komoditas.toLowerCase() === String(e.target.value || '').toLowerCase()
                              );
                              if (master?.kategori) {
                                setJenisKomoditasTerpilih(master.kategori);
                              }
                            }}
                            className="field-select-box"
                          >
                            <option value="">-- Pilih Nama Komoditas --</option>
                            {grupKomoditasTerfilterJenis.map((grup) => (
                              <optgroup key={grup.kelompok} label={`🌾 ${grup.kelompok}`}>
                                {grup.items.map((k) => (
                                  <option key={k.nama_komoditas} value={k.nama_komoditas}>
                                    {k.nama_komoditas} ({formatSatuanTampil(k.satuan_bawaan)})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div className="pengajuan-two-col-mini">
                          <div className="pengajuan-form-row">
                            <label>Satuan</label>
                            <select
                              value={formatSatuanTampil(formHarga.satuan)}
                              onChange={(e) => setFormHarga((prev) => ({ ...prev, satuan: e.target.value }))}
                              className="field-select-box"
                            >
                              {Array.from(new Set([...daftarSatuan.map((s) => formatSatuanTampil(s)), formatSatuanTampil(formHarga.satuan)].filter(Boolean))).map((sat) => (
                                <option key={sat} value={sat}>{sat}</option>
                              ))}
                            </select>
                          </div>

                          <div className="pengajuan-form-row">
                            <label>Harga Pangan (Rp) *</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              placeholder="Contoh: 15000"
                              className="field-input-box"
                              value={formHarga.harga}
                              onKeyDown={hanyaBolehAngka}
                              onChange={(e) => setFormHarga((prev) => ({ ...prev, harga: e.target.value.replace(/[^0-9]/g, '') }))}
                            />
                          </div>
                        </div>

                        {/* Patokan Harga Terbit Saat Ini (agar Staf tidak salah ketik nol) */}
                        {formHarga.nama_komoditas && formHarga.nama_pasar && (
                          <div className="pengajuan-ref-price-box">
                            {hargaTerbitKomoditasDipilih ? (
                              <>
                                <span>
                                  🏷️ Harga terbit di <strong>{formHarga.nama_pasar}</strong>:{' '}
                                  <strong>{formatRupiah(hargaTerbitKomoditasDipilih.harga)}</strong> / {formatSatuanTampil(hargaTerbitKomoditasDipilih.satuan)}
                                </span>
                                <button
                                  type="button"
                                  className="pengajuan-use-ref-btn"
                                  onClick={() => setFormHarga((prev) => ({ ...prev, harga: String(Math.round(Number(hargaTerbitKomoditasDipilih.harga) || 0)) }))}
                                >
                                  Pakai Angka Ini
                                </button>
                              </>
                            ) : (
                              <span>✨ Komoditas ini belum memiliki harga terbit di <strong>{formHarga.nama_pasar}</strong>.</span>
                            )}
                          </div>
                        )}

                        {/* 3 TOMBOL UTAMA PERSIS CONTOH DOSEN: TAMBAH | SIMPAN | AJUKAN */}
                        <div className="pengajuan-three-actions">
                          <button
                            type="submit"
                            className="pengajuan-btn-tambah"
                            disabled={sedangMenyimpan}
                          >
                            ➕ Tambah
                          </button>
                          <button
                            type="button"
                            className="pengajuan-btn-simpan"
                            disabled={sedangMenyimpan || ringkasanKeranjangStaf.valid.length === 0}
                            onClick={() => handleSimpanAtauAjukanPengajuan('Draft')}
                            title="Simpan daftar ke Draft (belum dikirim ke Kepala Bidang)"
                          >
                            💾 Simpan
                          </button>
                          <button
                            type="button"
                            className="pengajuan-btn-ajukan"
                            disabled={sedangMenyimpan || ringkasanKeranjangStaf.valid.length === 0}
                            onClick={() => handleSimpanAtauAjukanPengajuan('Diajukan')}
                            title="Ajukan daftar harga pangan ke Kepala Bidang untuk diverifikasi"
                          >
                            {sedangMenyimpan
                              ? '⏳...'
                              : sedangMenimpaDiajukan
                                ? '🔄 Perbarui & Ajukan'
                                : '📨 Ajukan'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* KOLOM KANAN: TABEL DAFTAR HARGA PANGAN (KERANJANG + PINTASAN HYBRID CEPAT) */}
                    <div className="tetapkan-list-card">
                      <div className="pengajuan-cart-header">
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', color: '#0f172a' }}>
                            📋 Daftar Harga Pangan ({keranjangPengajuan.length})
                          </h3>
                          <small style={{ color: '#64748b' }}>
                            {formHarga.nama_pasar
                              ? `Pasar: ${formHarga.nama_pasar} · ${pengajuanHargaService.formatTanggalID(tanggalPengambilan)}`
                              : 'Pilih pasar di sebelah kiri untuk mulai menyusun daftar'}
                          </small>
                        </div>

                        <div className="pengajuan-cart-shortcuts">
                          <button
                            type="button"
                            className="pengajuan-btn-hybrid-load"
                            disabled={!formHarga.nama_pasar || sedangMenyimpan}
                            onClick={handleMuatSemuaHargaPasarKeKeranjang}
                            title="Muat seluruh komoditas & harga terbit pasar ini sekaligus untuk edit cepat"
                          >
                            ⚡ Muat Harga Pasar Ini
                          </button>
                          {keranjangPengajuan.length > 0 && ringkasanKeranjangStaf.berubah.length > 0 && ringkasanKeranjangStaf.berubah.length < keranjangPengajuan.length && (
                            <button
                              type="button"
                              className="staf-mini-btn"
                              onClick={handleSaringHanyaBerubahKeranjang}
                              title="Hapus baris yang harganya tidak berubah agar hanya mengajukan yang diubah"
                            >
                              ✂️ Hanya Berubah ({ringkasanKeranjangStaf.berubah.length})
                            </button>
                          )}
                          {keranjangPengajuan.length > 0 && (
                            <button
                              type="button"
                              className="staf-mini-btn"
                              style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                              onClick={() => {
                                if (window.confirm('Kosongkan seluruh isi Daftar Harga Pangan di keranjang ini?')) {
                                  setKeranjangPengajuan([]);
                                }
                              }}
                            >
                              🗑️ Kosongkan
                            </button>
                          )}
                        </div>
                      </div>

                      {keranjangPengajuan.length > 5 && (
                        <div style={{ marginBottom: '10px' }}>
                          <input
                            type="text"
                            placeholder="🔍 Cari komoditas di Daftar Harga Pangan..."
                            className="field-input-box"
                            value={cariKeranjangStaf}
                            onChange={(e) => setCariKeranjangStaf(e.target.value)}
                          />
                        </div>
                      )}

                      {keranjangPengajuan.length === 0 ? (
                        <div className="pengajuan-cart-empty">
                          <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🧺</div>
                          <strong>Daftar Harga Pangan masih kosong</strong>
                          <p>
                            Pilih komoditas di form <strong>Pengajuan Baru</strong> lalu klik <strong>➕ Tambah</strong>, atau klik <strong>⚡ Muat Harga Pasar Ini</strong> untuk langsung menampilkan semua komoditas pasar dan mengubah harganya sekaligus.
                          </p>
                        </div>
                      ) : (
                        <div className="fast-entry-table-scroll">
                          <table className="fast-entry-table">
                            <thead>
                              <tr>
                                <th>Jenis Komoditas</th>
                                <th>Nama Komoditas</th>
                                <th>Satuan</th>
                                <th>Harga Pangan (Rp)</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {keranjangTerfilter.map((row) => {
                                const angkaBaru = parseInt(String(row.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0;
                                const selisih =
                                  row.harga_lama !== null && row.harga_lama !== undefined && angkaBaru > 0
                                    ? angkaBaru - Number(row.harga_lama)
                                    : null;
                                const isBerubah =
                                  angkaBaru > 0 &&
                                  (row.harga_lama === null || row.harga_lama === undefined || angkaBaru !== Number(row.harga_lama));

                                return (
                                  <tr key={row.tempId} className={isBerubah ? 'is-edited-row' : ''}>
                                    <td>
                                      <span className="pengajuan-kat-tag">{row.kategori || 'Bahan Pokok'}</span>
                                    </td>
                                    <td>
                                      <div className="fast-row-title">{row.nama_komoditas}</div>
                                      <div className="fast-row-sub">
                                        {row.harga_lama !== null && row.harga_lama !== undefined
                                          ? `Terbit: ${formatRupiah(row.harga_lama)}`
                                          : 'Komoditas baru di pasar ini'}
                                        {selisih !== null && selisih !== 0 && (
                                          <span
                                            style={{
                                              marginLeft: '6px',
                                              fontWeight: 800,
                                              color: selisih > 0 ? '#b91c1c' : '#15803d'
                                            }}
                                          >
                                            ({selisih > 0 ? `+${formatRupiah(selisih)}` : `-${formatRupiah(Math.abs(selisih))}`})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td>{row.satuan}</td>
                                    <td>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Isi angka..."
                                        className={`fast-price-input ${isBerubah ? 'is-changed' : ''}`}
                                        value={row.harga_usulan}
                                        onKeyDown={hanyaBolehAngka}
                                        onChange={(e) => handleUbahHargaItemKeranjang(row.tempId, e.target.value)}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <button
                                        type="button"
                                        className="pengajuan-btn-row-hapus"
                                        onClick={() => handleHapusItemKeranjang(row.tempId)}
                                        title="Hapus komoditas dari daftar pengajuan"
                                      >
                                        Hapus
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Footer Ringkasan & Aksi Cepat Kanan */}
                      <div className="fast-entry-submit-bar">
                        <div className="fast-submit-meta">
                          <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 700 }}>
                            Siap diproses: <strong>{ringkasanKeranjangStaf.valid.length} komoditas</strong>
                            {ringkasanKeranjangStaf.berubah.length > 0 && (
                              <span style={{ color: '#b45309', marginLeft: '6px' }}>
                                ({ringkasanKeranjangStaf.berubah.length} berubah / baru)
                              </span>
                            )}
                          </div>
                          <small className="fast-safe-note">
                            🛡️ Harga publik tetap aman &amp; tayang sampai pengajuan disetujui Kepala Bidang.
                          </small>
                        </div>
                        <div className="fast-submit-buttons">
                          <button
                            type="button"
                            className="btn-simpan-draft"
                            disabled={sedangMenyimpan || ringkasanKeranjangStaf.valid.length === 0}
                            onClick={() => handleSimpanAtauAjukanPengajuan('Draft')}
                          >
                            💾 Simpan Draft
                          </button>
                          <button
                            type="button"
                            className="btn-terbitkan-masyarakat"
                            disabled={sedangMenyimpan || ringkasanKeranjangStaf.valid.length === 0}
                            onClick={() => handleSimpanAtauAjukanPengajuan('Diajukan')}
                          >
                            {sedangMenyimpan
                              ? '⏳ Memproses...'
                              : sedangMenimpaDiajukan
                                ? `🔄 Perbarui & Ajukan (${ringkasanKeranjangStaf.valid.length})`
                                : `📨 Ajukan (${ringkasanKeranjangStaf.valid.length} Komoditas)`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── TAB 2: DAFTAR PENGAJUAN (TABEL PERSIS CONTOH DOSEN TANPA KODE PASAR) ── */}
              {subTabPengajuanStaf === 'daftar' && (
                <div className="staf-ops-card">
                  <div className="staf-ops-card-head">
                    <div>
                      <h3 className="staf-ops-card-title">📋 Daftar Pengajuan Harga Pangan</h3>
                      <p className="staf-ops-card-sub">
                        Kelola Draft tersimpan, pantau pengajuan yang sedang diverifikasi, revisi penolakan, dan lihat riwayat yang telah Disetujui.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="staf-btn-primary"
                      onClick={handleMulaiPengajuanBaruKosong}
                    >
                      ➕ Buat Pengajuan Baru
                    </button>
                  </div>

                  {/* Filter Status Pill */}
                  <div className="fast-entry-filter-pills" style={{ marginBottom: '14px' }}>
                    <button
                      type="button"
                      className={`fast-pill-btn ${filterStatusPengajuanStaf === 'semua' ? 'active' : ''}`}
                      onClick={() => setFilterStatusPengajuanStaf('semua')}
                    >
                      Semua ({daftarPengajuanHarga.length})
                    </button>
                    <button
                      type="button"
                      className={`fast-pill-btn ${filterStatusPengajuanStaf === 'Draft' ? 'active' : ''}`}
                      onClick={() => setFilterStatusPengajuanStaf('Draft')}
                    >
                      📝 Draft ({jumlahDraft})
                    </button>
                    <button
                      type="button"
                      className={`fast-pill-btn ${filterStatusPengajuanStaf === 'Diajukan' ? 'active' : ''}`}
                      onClick={() => setFilterStatusPengajuanStaf('Diajukan')}
                    >
                      ⏳ Diajukan ({jumlahDiajukan})
                    </button>
                    <button
                      type="button"
                      className={`fast-pill-btn ${filterStatusPengajuanStaf === 'Diverifikasi' ? 'active' : ''}`}
                      onClick={() => setFilterStatusPengajuanStaf('Diverifikasi')}
                    >
                      ✅ Disetujui ({jumlahDisetujui})
                    </button>
                    <button
                      type="button"
                      className={`fast-pill-btn ${filterStatusPengajuanStaf === 'Ditolak' ? 'active' : ''}`}
                      onClick={() => setFilterStatusPengajuanStaf('Ditolak')}
                    >
                      ❌ Ditolak ({jumlahDitolak})
                    </button>
                  </div>

                  {daftarPengajuanTerfilter.length === 0 ? (
                    <div className="staf-empty-box">
                      {belumMigrasiPengajuan
                        ? 'Menunggu migrasi tabel pengajuan_harga di Supabase.'
                        : 'Belum ada dokumen pengajuan untuk filter status ini.'}
                    </div>
                  ) : (
                    <div className="pengajuan-daftar-table-wrap">
                      <table className="fast-entry-table">
                        <thead>
                          <tr>
                            <th>Nama Pasar</th>
                            <th>Tanggal Pengajuan</th>
                            <th>Komoditas</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daftarPengajuanTerfilter.map((p) => {
                            const labelStatus = pengajuanHargaService.formatLabelStatus(p.status);
                            const isDisetujui = p.status === 'Diverifikasi';
                            return (
                              <tr key={p.id}>
                                <td>
                                  <strong>📍 {p.nama_pasar}</strong>
                                  <div className="fast-row-sub">oleh {p.nama_petugas}</div>
                                  {p.catatan_verifikasi && (
                                    <div className={`staf-sub-note ${p.status === 'Ditolak' ? 'is-reject' : ''}`} style={{ marginTop: '6px' }}>
                                      💬 {p.catatan_verifikasi}
                                    </div>
                                  )}
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>{p.tanggal_tampil}</td>
                                <td>
                                  <strong>{p.items?.length || 0} item</strong>
                                  <div className="fast-row-sub">
                                    {(p.items || []).slice(0, 3).map((it) => it.nama_komoditas).join(', ')}
                                    {(p.items?.length || 0) > 3 ? ` +${p.items.length - 3} lainnya` : ''}
                                  </div>
                                </td>
                                <td>
                                  <span className={`staf-batch-pill is-${String(p.status || 'Diajukan').toLowerCase()}`}>
                                    {labelStatus}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {isDisetujui ? (
                                      <>
                                        <button
                                          type="button"
                                          className="staf-mini-btn"
                                          onClick={() => setDetailPengajuanBatch(p)}
                                        >
                                          👁️ Lihat
                                        </button>
                                        <button
                                          type="button"
                                          className="staf-mini-btn"
                                          onClick={() => handleBukaDokumenUntukUbah(p, true)}
                                          title="Salin daftar komoditas ini ke Pengajuan Baru"
                                        >
                                          📋 Salin ke Baru
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          className={`staf-mini-btn ${p.status === 'Ditolak' ? 'is-revisi' : ''}`}
                                          onClick={() => handleBukaDokumenUntukUbah(p)}
                                        >
                                          {p.status === 'Ditolak' ? '🔄 Lihat / Revisi' : '✏️ Lihat / Ubah'}
                                        </button>
                                        {(p.status === 'Draft' || p.status === 'Diajukan') && (
                                          <button
                                            type="button"
                                            className="staf-mini-btn"
                                            style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                                            disabled={sedangMenyimpan}
                                            onClick={() => handleBatalkanPengajuanBatch(p)}
                                          >
                                            {p.status === 'Draft' ? '🗑️ Hapus' : '🗑️ Batalkan'}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {daftarDraftVerifikasi.length > 0 && (
                    <div style={{ marginTop: '14px', padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '0.8rem', color: '#92400e' }}>
                      ⏳ Terdapat juga <strong>{daftarDraftVerifikasi.length} draf satuan lama</strong> di tabel harga pangan yang sedang menunggu verifikasi Kepala Bidang.
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: REFERENSI HARGA TERBIT SAAT INI PER PASAR ── */}
              {subTabPengajuanStaf === 'terbit' && (
                <div className="staf-ops-card">
                  <div className="staf-ops-card-head">
                    <div>
                      <h3 className="staf-ops-card-title">🏷️ Harga Resmi Terbit di Masyarakat</h3>
                      <p className="staf-ops-card-sub">
                        Daftar harga yang saat ini aktif tampil di halaman publik untuk pasar pilihan Anda.
                      </p>
                    </div>
                    <div style={{ minWidth: '220px' }}>
                      <select
                        value={formHarga.nama_pasar}
                        onChange={(e) => handleGantiPasarPengajuan(e.target.value)}
                        className="field-select-box"
                      >
                        <option value="">-- Pilih Pasar --</option>
                        {daftarPasar.map((pasar) => (
                          <option key={pasar} value={pasar}>{pasar}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {hargaAktifPasarDipilih.length === 0 ? (
                    <div className="staf-empty-box">
                      Belum ada komoditas berstatus Terbit untuk {formHarga.nama_pasar || 'pasar ini'}.
                    </div>
                  ) : (
                    <div className="pengajuan-daftar-table-wrap">
                      <table className="fast-entry-table">
                        <thead>
                          <tr>
                            <th>Komoditas</th>
                            <th>Kategori</th>
                            <th>Satuan</th>
                            <th>Harga Terbit</th>
                            <th>Tanggal Penetapan</th>
                            <th style={{ textAlign: 'right' }}>Aksi Cepat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hargaAktifPasarDipilih.map((item) => (
                            <tr key={item.id}>
                              <td><strong>{item.nama_komoditas}</strong></td>
                              <td>{item.kategori || 'Bahan Pokok'}</td>
                              <td>{formatSatuanTampil(item.satuan)}</td>
                              <td style={{ fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(item.harga)}</td>
                              <td>{item.tanggal_penetapan || '-'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="staf-mini-btn"
                                  onClick={() => {
                                    setJenisKomoditasTerpilih(item.kategori || 'Semua');
                                    setFormHarga((prev) => ({
                                      ...prev,
                                      nama_pasar: item.nama_pasar,
                                      nama_komoditas: item.nama_komoditas,
                                      kategori: item.kategori || 'Bahan Pokok',
                                      satuan: formatSatuanTampil(item.satuan),
                                      harga: String(Math.round(Number(item.harga) || 0))
                                    }));
                                    setSubTabPengajuanStaf('baru');
                                  }}
                                >
                                  ✏️ Ajukan Perubahan
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─────────────────────────────────────────────
            11. VIEW 3: MENU VERIFIKASI HARGA PANGAN (KABID / SUPERADMIN — 3 SUB-TAB SERAGAM DENGAN STAF)
            ───────────────────────────────────────────── */}
        {menuAktif === 'verif-harga' && isKabid && (() => {
          const totalAntreanKabid = daftarPengajuanDiajukan.length;
          const riwayatKeputusanKabid = (Array.isArray(daftarPengajuanHarga) ? daftarPengajuanHarga : [])
            .filter((p) => p && (p.status === 'Diverifikasi' || p.status === 'Ditolak'));
          const hargaTerbitSemua = daftarHarga.filter((h) => (h.status || 'Terbit').toLowerCase() === 'terbit');
          const pasarTerbitUnik = Array.from(new Set(hargaTerbitSemua.map((h) => h.nama_pasar).filter(Boolean))).sort();
          const kataCariVerif = cariVerifTerbitKabid.trim().toLowerCase();
          const hargaTerbitTerfilter = hargaTerbitSemua.filter((h) => {
            if (filterPasarVerifTerbitKabid !== 'Semua' && h.nama_pasar !== filterPasarVerifTerbitKabid) return false;
            if (!kataCariVerif) return true;
            return `${h.nama_komoditas || ''} ${h.kategori || ''} ${h.nama_pasar || ''} ${h.satuan || ''}`
              .toLowerCase()
              .includes(kataCariVerif);
          });

          const pasarAktifKabid = formInputKabid.nama_pasar || daftarPasar[0] || '';
          const daftarJenisKabid = pengajuanHargaService.ambilDaftarJenisKomoditas(daftarMasterKomoditas, daftarHarga);
          const grupKomoditasKabid = grupKomoditasDropdown
            .map((g) => ({
              ...g,
              items: g.items.filter(
                (k) =>
                  jenisInputKabid === 'Semua' ||
                  String(k.kategori || '').toLowerCase() === jenisInputKabid.toLowerCase()
              )
            }))
            .filter((g) => g.items.length > 0);
          const hargaTerbitPatokanKabid =
            formInputKabid.nama_komoditas && pasarAktifKabid
              ? pengajuanHargaService.cariHargaTerbitPasar(pasarAktifKabid, formInputKabid.nama_komoditas, daftarHarga)
              : null;
          const kataCariKeranjangKabid = cariKeranjangKabid.trim().toLowerCase();
          const keranjangKabidTerfilter = keranjangInputKabid.filter((r) => {
            if (!kataCariKeranjangKabid) return true;
            return `${r.nama_komoditas} ${r.kategori} ${r.satuan}`.toLowerCase().includes(kataCariKeranjangKabid);
          });
          const itemValidKabid = keranjangInputKabid.filter(
            (r) => (parseInt(String(r.harga_usulan || '').replace(/[^0-9]/g, ''), 10) || 0) > 0
          );

          return (
            <div className="dashboard-page-container">
              <div className="dashboard-hero-title-box">
                <h1 className="dashboard-main-heading">Verifikasi &amp; Penetapan Harga Pangan</h1>
                <p className="dashboard-main-subheading">
                  Tinjau dan setujui paket pengajuan harga per pasar dari staf (bisa 1 klik sekaligus), atau gunakan tab <strong>Input &amp; Terbitkan Langsung</strong> bila staf berhalangan.
                </p>
              </div>

              {pesanNotifikasi && (
                <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '0.86rem', marginBottom: '14px' }}>
                  {pesanNotifikasi}
                </div>
              )}

              {/* 3 SUB-TAB SERAGAM DENGAN ALUR STAF */}
              <div className="pengajuan-subnav-bar" style={{ marginBottom: '18px' }}>
                <button
                  type="button"
                  className={`pengajuan-subnav-btn ${subTabVerifKabid === 'antrean' ? 'active' : ''}`}
                  onClick={() => setSubTabVerifKabid('antrean')}
                >
                  📥 Antrean Verifikasi ({totalAntreanKabid})
                </button>
                <button
                  type="button"
                  className={`pengajuan-subnav-btn ${subTabVerifKabid === 'input' ? 'active' : ''}`}
                  onClick={() => {
                    if (!formInputKabid.nama_pasar && daftarPasar[0]) {
                      setFormInputKabid((prev) => ({ ...prev, nama_pasar: daftarPasar[0] }));
                    }
                    setSubTabVerifKabid('input');
                  }}
                >
                  ⚡ Input &amp; Terbitkan Langsung
                </button>
                <button
                  type="button"
                  className={`pengajuan-subnav-btn ${subTabVerifKabid === 'terbit' ? 'active' : ''}`}
                  onClick={() => setSubTabVerifKabid('terbit')}
                >
                  ✅ Harga Terbit ({hargaTerbitSemua.length}) &amp; Riwayat ({riwayatKeputusanKabid.length})
                </button>
              </div>

              {/* ─── SUB-TAB 1: ANTREAN VERIFIKASI (MASTER-DETAIL RINGKAS + SETUJUI SEMUA SEKALIGUS) ─── */}
              {subTabVerifKabid === 'antrean' && (
                <>
                  {/* Banner Bulk Approve 1 Klik */}
                  {totalAntreanKabid > 0 && (
                    <div className="kabid-bulk-banner">
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                          ⚡ Verifikasi Cepat — {daftarPengajuanDiajukan.length} paket pasar menunggu persetujuan
                        </strong>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                          Tidak perlu klik satu per satu: tinjau sekilas lalu setujui per paket pasar atau terbitkan seluruh paket dalam 1 klik.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="kabid-btn-bulk-approve"
                        disabled={sedangMenyimpan}
                        onClick={handleSetujuiSemuaAntreanKabid}
                      >
                        {sedangMenyimpan ? '⏳ Memproses...' : `✓ Setujui Semua Paket (${totalAntreanKabid})`}
                      </button>
                    </div>
                  )}

                  {/* BAGIAN A: TABEL DAFTAR PENGAJUAN PAKET PER PASAR (RINGKAS SEPERTI STAF) */}
                  <div className="verif-section-card">
                    <div className="verif-section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#8b1e1e', fontSize: '1.02rem' }}>
                          📦 Daftar Paket Pengajuan Pasar ({daftarPengajuanDiajukan.length})
                        </h3>
                        <small style={{ color: '#64748b' }}>
                          Klik <strong>Tinjau</strong> untuk melihat rincian perubahan harga lama vs baru, atau klik <strong>Setujui</strong> untuk langsung menerbitkan semua komoditas pasar tersebut.
                        </small>
                      </div>
                    </div>

                    {daftarPengajuanDiajukan.length === 0 ? (
                      <div className="staf-empty-box">
                        Tidak ada paket pengajuan pasar yang tertunda saat ini.
                      </div>
                    ) : (
                      <div className="pengajuan-daftar-table-wrap">
                        <table className="fast-entry-table">
                          <thead>
                            <tr>
                              <th>Pasar Pantauan</th>
                              <th>Tanggal Survey</th>
                              <th>Staf Pengaju</th>
                              <th>Jumlah Komoditas</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Aksi Verifikasi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {daftarPengajuanDiajukan.map((pengajuan) => (
                              <tr key={pengajuan.id}>
                                <td><strong>📍 {pengajuan.nama_pasar}</strong></td>
                                <td>{pengajuan.tanggal_tampil}</td>
                                <td>{pengajuan.nama_petugas}</td>
                                <td>
                                  <span className="pengajuan-kat-tag">{pengajuan.items?.length || 0} komoditas</span>
                                </td>
                                <td>
                                  <span className="staf-batch-pill is-pending">Diajukan</span>
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div className="kabid-row-actions" style={{ justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      className="kabid-btn-outline"
                                      onClick={() => setDetailPengajuanBatch(pengajuan)}
                                    >
                                      👁️ Tinjau
                                    </button>
                                    <button
                                      type="button"
                                      className="kabid-btn-approve-sm"
                                      disabled={sedangMenyimpan}
                                      onClick={() => handleSetujuiPengajuanBatch(pengajuan)}
                                    >
                                      ✓ Setujui ({pengajuan.items?.length || 0})
                                    </button>
                                    <button
                                      type="button"
                                      className="kabid-btn-reject-sm"
                                      disabled={sedangMenyimpan}
                                      onClick={() => setModalTolakBatch({ buka: true, pengajuan, catatan: '' })}
                                    >
                                      ✕ Tolak
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── SUB-TAB 2: INPUT & TERBITKAN LANGSUNG OLEH KABID (DARURAT / KOREKSI CEPAT) ─── */}
              {subTabVerifKabid === 'input' && (
                <>
                  <div className="kabid-direct-banner">
                    <span>⚡</span>
                    <div>
                      <strong>Wewenang Langsung Kepala Bidang (Darurat / Koreksi Cepat):</strong> Gunakan form ini bila staf berhalangan atau perlu penyesuaian cepat. Data yang Anda simpan akan <strong>langsung diterbitkan ke halaman publik</strong> tanpa antrean persetujuan dan tetap tercatat di riwayat.
                    </div>
                  </div>

                  <div className="pengajuan-hybrid-grid">
                    {/* KOLOM KIRI: FORM INPUT HARGA LANGSUNG KABID */}
                    <div className="tetapkan-form-card">
                      <div className="pengajuan-card-head">
                        <h3>⚡ Penetapan Langsung Kabid</h3>
                        <p>Pilih pasar &amp; komoditas, klik Tambah ke daftar kanan, lalu Terbitkan Langsung.</p>
                      </div>

                      <form onSubmit={handleTambahItemKeranjangKabid} className="pengajuan-form-body">
                        <div className="pengajuan-two-col-mini">
                          <div className="pengajuan-form-row">
                            <label>Pilih Pasar *</label>
                            <select
                              required
                              value={pasarAktifKabid}
                              onChange={(e) => {
                                setFormInputKabid((prev) => ({ ...prev, nama_pasar: e.target.value }));
                                setKeranjangInputKabid([]);
                                setCariKeranjangKabid('');
                              }}
                              className="field-select-box"
                            >
                              <option value="">-- Pilih Pasar --</option>
                              {daftarPasar.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          <div className="pengajuan-form-row">
                            <label>Tanggal Penetapan *</label>
                            <input
                              type="date"
                              required
                              value={tanggalInputKabid}
                              onChange={(e) => setTanggalInputKabid(e.target.value)}
                              className="field-input-box"
                            />
                          </div>
                        </div>

                        <div className="pengajuan-form-row">
                          <label>Jenis Komoditas</label>
                          <select
                            value={jenisInputKabid}
                            onChange={(e) => {
                              setJenisInputKabid(e.target.value);
                              setFormInputKabid((prev) => ({
                                ...prev,
                                kategori: e.target.value === 'Semua' ? prev.kategori : e.target.value,
                                nama_komoditas: ''
                              }));
                            }}
                            className="field-select-box"
                          >
                            <option value="Semua">Semua Jenis Komoditas</option>
                            {daftarJenisKabid.map((kat) => (
                              <option key={kat} value={kat}>{kat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="pengajuan-form-row">
                          <label>Nama Komoditas *</label>
                          <select
                            required
                            value={formInputKabid.nama_komoditas}
                            onChange={(e) => handlePilihKomoditasInputKabid(e.target.value)}
                            className="field-select-box"
                          >
                            <option value="">-- Pilih Nama Komoditas --</option>
                            {grupKomoditasKabid.map((grup) => (
                              <optgroup key={grup.kelompok} label={`🌾 ${grup.kelompok}`}>
                                {grup.items.map((k) => (
                                  <option key={k.nama_komoditas} value={k.nama_komoditas}>
                                    {k.nama_komoditas} ({formatSatuanTampil(k.satuan_bawaan)})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div className="pengajuan-two-col-mini">
                          <div className="pengajuan-form-row">
                            <label>Satuan</label>
                            <select
                              value={formatSatuanTampil(formInputKabid.satuan)}
                              onChange={(e) => setFormInputKabid((prev) => ({ ...prev, satuan: e.target.value }))}
                              className="field-select-box"
                            >
                              {Array.from(new Set([...daftarSatuan.map((s) => formatSatuanTampil(s)), formatSatuanTampil(formInputKabid.satuan)].filter(Boolean))).map((sat) => (
                                <option key={sat} value={sat}>{sat}</option>
                              ))}
                            </select>
                          </div>

                          <div className="pengajuan-form-row">
                            <label>Harga Pangan (Rp) *</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              placeholder="Contoh: 15000"
                              className="field-input-box"
                              value={formInputKabid.harga}
                              onKeyDown={hanyaBolehAngka}
                              onChange={(e) => setFormInputKabid((prev) => ({ ...prev, harga: e.target.value.replace(/[^0-9]/g, '') }))}
                            />
                          </div>
                        </div>

                        {formInputKabid.nama_komoditas && pasarAktifKabid && (
                          <div className="pengajuan-ref-price-box">
                            {hargaTerbitPatokanKabid ? (
                              <>
                                <span>
                                  🏷️ Harga terbit saat ini di <strong>{pasarAktifKabid}</strong>:{' '}
                                  <strong>{formatRupiah(hargaTerbitPatokanKabid.harga)}</strong> / {formatSatuanTampil(hargaTerbitPatokanKabid.satuan)}
                                </span>
                                <button
                                  type="button"
                                  className="pengajuan-use-ref-btn"
                                  onClick={() => setFormInputKabid((prev) => ({ ...prev, harga: String(Math.round(Number(hargaTerbitPatokanKabid.harga) || 0)) }))}
                                >
                                  Pakai Angka Ini
                                </button>
                              </>
                            ) : (
                              <span>✨ Komoditas ini belum memiliki harga terbit di <strong>{pasarAktifKabid}</strong>.</span>
                            )}
                          </div>
                        )}

                        <div className="kabid-direct-actions">
                          <button
                            type="submit"
                            className="pengajuan-btn-tambah"
                            disabled={sedangMenyimpan}
                          >
                            ➕ Tambah ke Daftar
                          </button>
                          <button
                            type="button"
                            className="kabid-btn-bulk-approve"
                            disabled={sedangMenyimpan || itemValidKabid.length === 0}
                            onClick={handleTerbitkanLangsungKabid}
                          >
                            {sedangMenyimpan ? '⏳ Menerbitkan...' : `✓ Terbitkan Langsung (${itemValidKabid.length})`}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* KOLOM KANAN: DAFTAR HARGA SIAP TERBIT LANGSUNG */}
                    <div className="tetapkan-list-card">
                      <div className="pengajuan-cart-header">
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', color: '#0f172a' }}>
                            📋 Daftar Harga Siap Terbit ({keranjangInputKabid.length})
                          </h3>
                          <small style={{ color: '#64748b' }}>
                            {pasarAktifKabid
                              ? `Pasar: ${pasarAktifKabid} · ${pengajuanHargaService.formatTanggalID(tanggalInputKabid)}`
                              : 'Pilih pasar di sebelah kiri untuk mulai'}
                          </small>
                        </div>
                        <div className="pengajuan-cart-shortcuts">
                          <button
                            type="button"
                            className="pengajuan-btn-hybrid-load"
                            disabled={!pasarAktifKabid || sedangMenyimpan}
                            onClick={handleMuatHargaPasarKabid}
                          >
                            ⚡ Muat Harga Pasar Ini
                          </button>
                          {keranjangInputKabid.length > 0 && (
                            <button
                              type="button"
                              className="staf-mini-btn"
                              style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                              onClick={() => setKeranjangInputKabid([])}
                            >
                              🗑️ Kosongkan
                            </button>
                          )}
                        </div>
                      </div>

                      {keranjangInputKabid.length > 5 && (
                        <div style={{ marginBottom: '10px' }}>
                          <input
                            type="text"
                            placeholder="🔍 Cari komoditas di daftar..."
                            className="field-input-box"
                            value={cariKeranjangKabid}
                            onChange={(e) => setCariKeranjangKabid(e.target.value)}
                          />
                        </div>
                      )}

                      {keranjangInputKabid.length === 0 ? (
                        <div className="pengajuan-cart-empty">
                          <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>⚡</div>
                          <strong>Daftar Harga Siap Terbit masih kosong</strong>
                          <p>
                            Pilih komoditas di sebelah kiri lalu klik <strong>➕ Tambah ke Daftar</strong>, atau klik <strong>⚡ Muat Harga Pasar Ini</strong> untuk memperbarui banyak harga sekaligus.
                          </p>
                        </div>
                      ) : (
                        <div className="fast-entry-table-scroll">
                          <table className="fast-entry-table">
                            <thead>
                              <tr>
                                <th>Jenis</th>
                                <th>Nama Komoditas</th>
                                <th>Satuan</th>
                                <th>Harga (Rp)</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {keranjangKabidTerfilter.map((row) => (
                                <tr key={row.tempId}>
                                  <td><span className="pengajuan-kat-tag">{row.kategori}</span></td>
                                  <td>
                                    <strong>{row.nama_komoditas}</strong>
                                    {row.harga_lama !== null && (
                                      <div className="fast-row-sub">Sebelumnya: {formatRupiah(row.harga_lama)}</div>
                                    )}
                                  </td>
                                  <td>{row.satuan}</td>
                                  <td>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      className="fast-price-input"
                                      value={row.harga_usulan}
                                      onKeyDown={hanyaBolehAngka}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setKeranjangInputKabid((prev) =>
                                          prev.map((item) => (item.tempId === row.tempId ? { ...item, harga_usulan: val } : item))
                                        );
                                      }}
                                    />
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      className="pengajuan-btn-row-hapus"
                                      onClick={() => setKeranjangInputKabid((prev) => prev.filter((item) => item.tempId !== row.tempId))}
                                    >
                                      Hapus
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ─── SUB-TAB 3: HARGA TERBIT PUBLIK & RIWAYAT KEPUTUSAN VERIFIKASI ─── */}
              {subTabVerifKabid === 'terbit' && (
                <>
                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <div className="verif-filter-bar">
                      <h3 style={{ margin: 0, color: '#166534', fontSize: '1.05rem' }}>
                        ✅ Komoditas Resmi Terbit di Halaman Publik ({hargaTerbitTerfilter.length}/{hargaTerbitSemua.length})
                      </h3>
                      <div className="verif-filter-controls">
                        <input
                          type="text"
                          value={cariVerifTerbitKabid}
                          onChange={(e) => setCariVerifTerbitKabid(e.target.value)}
                          placeholder="🔍 Cari komoditas / pasar..."
                          className="verif-filter-input"
                        />
                        <select
                          value={filterPasarVerifTerbitKabid}
                          onChange={(e) => setFilterPasarVerifTerbitKabid(e.target.value)}
                          className="verif-filter-select"
                        >
                          <option value="Semua">📍 Semua Pasar</option>
                          {pasarTerbitUnik.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {hargaTerbitTerfilter.length === 0 ? (
                      <div className="staf-empty-box">
                        Tidak ada data komoditas terbit yang sesuai dengan pencarian/filter saat ini.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '640px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                              <th style={{ padding: '10px' }}>Komoditas</th>
                              <th style={{ padding: '10px' }}>Kategori</th>
                              <th style={{ padding: '10px' }}>Pasar</th>
                              <th style={{ padding: '10px' }}>Tanggal</th>
                              <th style={{ padding: '10px' }}>Harga</th>
                              <th style={{ padding: '10px' }}>Status</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hargaTerbitTerfilter.map((h) => (
                              <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                                <td style={{ padding: '10px' }}>{h.kategori}</td>
                                <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
                                <td style={{ padding: '10px', fontSize: '0.82rem', color: '#475569' }}>{h.tanggal_penetapan || '-'}</td>
                                <td style={{ padding: '10px', fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(h.harga)} / {formatSatuanTampil(h.satuan)}</td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                                    Terbit
                                  </span>
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleBukaEditKabid(h)}
                                    style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, marginRight: '10px' }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleHapusHarga(h.id, h.nama_komoditas)}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    🗑️ Hapus
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RIWAYAT KEPUTUSAN VERIFIKASI PAKET */}
                  <div className="verif-section-card">
                    <div className="verif-section-head">
                      <h3 style={{ margin: 0, color: '#334155', fontSize: '1.02rem' }}>
                        🗂️ Riwayat Keputusan Verifikasi &amp; Publikasi ({riwayatKeputusanKabid.length})
                      </h3>
                    </div>
                    {riwayatKeputusanKabid.length === 0 ? (
                      <div className="staf-empty-box">
                        Belum ada riwayat keputusan persetujuan atau penolakan paket pengajuan harga.
                      </div>
                    ) : (
                      <div className="staf-submission-list">
                        {riwayatKeputusanKabid.slice(0, 12).map((p) => {
                          const isOk = p.status === 'Diverifikasi';
                          return (
                            <div key={p.id} className="staf-submission-item">
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="staf-sub-title-row" style={{ justifyContent: 'flex-start' }}>
                                  <strong style={{ color: '#0f172a' }}>📍 {p.nama_pasar}</strong>
                                  <span className={`staf-batch-pill ${isOk ? 'is-ok' : 'is-rej'}`}>
                                    {isOk ? 'Disetujui' : 'Ditolak'}
                                  </span>
                                </div>
                                <div className="staf-sub-meta">
                                  📅 {p.tanggal_tampil} · 👤 {p.nama_petugas} · {p.items?.length || 0} komoditas
                                  {p.catatan_verifikasi ? ` · Catatan: "${p.catatan_verifikasi}"` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="kabid-btn-outline"
                                onClick={() => setDetailPengajuanBatch(p)}
                              >
                                👁️ Rincian
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ─────────────────────────────────────────────
            12. VIEW 4: MENU KELOLA GPM (KABID, STAF & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-gpm' && (isKabid || isStaf) && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Menu Kelola Gerakan Pangan Murah (GPM)</h1>
            <p className="dashboard-main-subheading">
              Pengelolaan jadwal pelaksanaan, koordinat titik lokasi peta Kota Manado, serta pemindaian tiket QR Code masyarakat.
            </p>
            <div style={{ marginTop: '20px' }}>
              <PetugasGPMManager
                token={penggunaService.ambilToken()}
                pengguna={userState}
                subTabAwal={subTabGpmTarget}
              />
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            13. VIEW 5: MENU CEK GPM (ADMIN & SUPERADMIN — FILTER + EXCEL + UNIT DINAMIS)
            ───────────────────────────────────────────── */}
        {menuAktif === 'cek-gpm' && isAdmin && (() => {
          const kataCari = filterCekGpm.pencarian.trim().toLowerCase();
          const daftarKecCekGpm = Array.from(new Set(rekapitulasiGPMList.map(g => g.kecamatan).filter(k => k && k !== '-'))).sort((a, b) => a.localeCompare(b, 'id-ID'));
          const daftarCekGpmTerfilter = rekapitulasiGPMList.filter((g) => {
            if (filterCekGpm.kecamatan !== 'Semua' && g.kecamatan !== filterCekGpm.kecamatan) return false;
            if (filterCekGpm.status !== 'Semua' && String(g.status || '').toLowerCase() !== filterCekGpm.status.toLowerCase()) return false;
            if (kataCari && !`${g.nama_acara || ''} ${g.lokasi || ''} ${g.kecamatan || ''}`.toLowerCase().includes(kataCari)) return false;
            return true;
          });
          const totalAktifCek = daftarCekGpmTerfilter.filter(g => g.status === 'Aktif').length;
          const totalSelesaiCek = daftarCekGpmTerfilter.filter(g => g.status === 'Selesai').length;
          const totalHadirCek = daftarCekGpmTerfilter.reduce((acc, g) => acc + (Number(g.terlayani) || 0), 0);
          const totalKuotaCek = daftarCekGpmTerfilter.reduce((acc, g) => acc + (Number(g.target_kuota) || 0), 0);

          return (
            <div className="dashboard-page-container">
              <h1 className="dashboard-main-heading">🔍 Menu Cek GPM (Supervisi Administrator)</h1>
              <p className="dashboard-main-subheading">
                Inspeksi menyeluruh agenda Gerakan Pangan Murah (aktif maupun selesai), realisasi kuota, daftar hadir warga, dan ekspor Excel resmi.
              </p>

              <div className="verif-filter-bar" style={{ marginTop: '18px' }}>
                <div className="verif-filter-controls" style={{ width: '100%' }}>
                  <input
                    type="text"
                    className="verif-filter-input"
                    placeholder="🔍 Cari nama kegiatan, lokasi, atau kecamatan..."
                    value={filterCekGpm.pencarian}
                    onChange={(e) => setFilterCekGpm(prev => ({ ...prev, pencarian: e.target.value }))}
                  />
                  <select
                    className="verif-filter-select"
                    value={filterCekGpm.kecamatan}
                    onChange={(e) => setFilterCekGpm(prev => ({ ...prev, kecamatan: e.target.value }))}
                  >
                    <option value="Semua">📍 Semua Kecamatan</option>
                    {daftarKecCekGpm.map(k => (
                      <option key={k} value={k}>Kec. {k}</option>
                    ))}
                  </select>
                  <select
                    className="verif-filter-select"
                    value={filterCekGpm.status}
                    onChange={(e) => setFilterCekGpm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Semua">🔖 Semua Status ({rekapitulasiGPMList.length})</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Selesai">Selesai / Arsip</option>
                  </select>
                  {isSuperadmin && (
                    <button
                      type="button"
                      className="kabid-btn-outline"
                      onClick={() => setMenuAktif('kelola-gpm')}
                    >
                      🎟️ Buka Kelola GPM
                    </button>
                  )}
                </div>
              </div>

              <div className="kabid-summary-strip">
                <div className="kabid-summary-chip">
                  <span>Total Kegiatan Terfilter</span>
                  <strong>{daftarCekGpmTerfilter.length} Titik</strong>
                </div>
                <div className="kabid-summary-chip" style={{ borderLeftColor: '#1d4ed8' }}>
                  <span>Status Aktif</span>
                  <strong>{totalAktifCek} Kegiatan</strong>
                </div>
                <div className="kabid-summary-chip" style={{ borderLeftColor: '#166534' }}>
                  <span>Status Selesai / Arsip</span>
                  <strong>{totalSelesaiCek} Kegiatan</strong>
                </div>
                <div className="kabid-summary-chip" style={{ borderLeftColor: '#b45309' }}>
                  <span>Realisasi Hadir / Kuota</span>
                  <strong>{totalHadirCek} / {totalKuotaCek} ({totalKuotaCek > 0 ? Math.round((totalHadirCek / totalKuotaCek) * 100) : 0}%)</strong>
                </div>
              </div>

              <div className="gpm-supervisi-cards-grid" style={{ marginTop: '14px' }}>
                {daftarCekGpmTerfilter.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    Tidak ada agenda Gerakan Pangan Murah yang sesuai dengan filter.
                  </div>
                ) : (
                  daftarCekGpmTerfilter.map((gpm) => {
                    const satuan = gpm.satuan_penerima || 'Warga';
                    const persenHadir = gpm.target_kuota > 0 ? Math.min(100, Math.round((gpm.terlayani / gpm.target_kuota) * 100)) : 0;
                    const pendaftarAcara = listPendaftarAman.filter(p => String(p.acara_id) === String(gpm.id));
                    return (
                      <div key={gpm.id} style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: gpm.status === 'Selesai' ? '#dcfce7' : '#eff6ff',
                            color: gpm.status === 'Selesai' ? '#166534' : '#1e40af'
                          }}>
                            {gpm.status} · Serapan {persenHadir}%
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>📅 {gpm.tanggal}</span>
                        </div>

                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.02rem', color: '#8b1e1e' }}>{gpm.nama_acara}</h3>
                          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569' }}>📍 {gpm.lokasi} (Kec. {gpm.kecamatan})</p>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                            <span>Kapasitas Kuota:</span>
                            <strong>{gpm.target_kuota} {satuan}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                            <span>Terdaftar:</span>
                            <strong style={{ color: '#1d4ed8' }}>{gpm.terdaftar} {satuan}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                            <span>Terlayani (Hadir):</span>
                            <strong style={{ color: gpm.terlayani > 0 ? '#166534' : '#64748b' }}>
                              {gpm.terlayani} {satuan}
                            </strong>
                          </div>
                          <div className="kabid-gpm-mini-bar">
                            <div className="kabid-gpm-mini-fill" style={{ width: `${persenHadir}%` }} />
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', flex: 1 }}>
                          <strong>🌾 Komoditas Disediakan:</strong>
                          <div style={{ marginTop: '3px', color: '#475569', lineHeight: 1.4 }}>
                            {gpm.komoditas_tersedia || '-'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="kabid-btn-pdf"
                            style={{ flex: '1 1 160px', padding: '9px 12px', fontSize: '0.8rem' }}
                            onClick={() => setModalDetailWarga({ buka: true, acara: gpm, pencarian: '' })}
                          >
                            👥 Data Warga ({gpm.terdaftar})
                          </button>
                          <button
                            type="button"
                            className="kabid-btn-excel"
                            style={{ flex: '1 1 140px', padding: '9px 12px', fontSize: '0.8rem' }}
                            onClick={() => gpmService.eksporKeExcel(gpm, pendaftarAcara, { nama: ambilNamaPenandatangan('Kadis') })}
                          >
                            📊 Excel (.xlsx)
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* ─────────────────────────────────────────────
            14. VIEW 6: LAPORAN KHUSUS BIDANG (KABID & SUPERADMIN — HARGA PANGAN & GPM, EXCEL .xlsx + PDF A4)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan' && isKabid && (() => {
          const kataCariLap = cariLaporanHarga.trim().toLowerCase();
          const daftarLaporanTerfilter = daftarHarga.filter((h) => {
            if (filterLaporanHarga.pasar !== 'Semua' && h.nama_pasar !== filterLaporanHarga.pasar) return false;
            if (filterLaporanHarga.kategori !== 'Semua' && h.kategori !== filterLaporanHarga.kategori) return false;
            if (filterLaporanHarga.status !== 'Semua' && (h.status || 'Terbit') !== filterLaporanHarga.status) return false;
            if (kataCariLap && !`${h.nama_komoditas || ''} ${h.nama_pasar || ''} ${h.kategori || ''}`.toLowerCase().includes(kataCariLap)) {
              return false;
            }
            return true;
          });

          const totalHargaTerbitLap = daftarLaporanTerfilter.filter((h) => String(h.status || '').toLowerCase() === 'terbit').length;
          const totalHargaDraftLap = daftarLaporanTerfilter.length - totalHargaTerbitLap;
          const nilaiHargaValid = daftarLaporanTerfilter.map((h) => Number(h.harga) || 0).filter((v) => v > 0);
          const rataHargaLap = nilaiHargaValid.length > 0
            ? Math.round(nilaiHargaValid.reduce((a, b) => a + b, 0) / nilaiHargaValid.length)
            : 0;

          const labelPeriodeGPM = berandaKabidService.labelPeriode(filterLaporanGPMKabid.periode);
          const daftarGpmTerfilter = rekapitulasiGPMList.filter((g) => {
            if (!berandaKabidService.apakahAcaraMasukPeriode(g, filterLaporanGPMKabid.periode)) return false;
            if (filterLaporanGPMKabid.kecamatan !== 'Semua' && g.kecamatan !== filterLaporanGPMKabid.kecamatan) return false;
            if (filterLaporanGPMKabid.status !== 'Semua' && String(g.status || '').toLowerCase() !== filterLaporanGPMKabid.status.toLowerCase()) return false;
            return true;
          });

          const totalKuotaGpmLap = daftarGpmTerfilter.reduce((acc, g) => acc + (Number(g.target_kuota) || 0), 0);
          const totalDaftarGpmLap = daftarGpmTerfilter.reduce((acc, g) => acc + (Number(g.terdaftar) || 0), 0);
          const totalHadirGpmLap = daftarGpmTerfilter.reduce((acc, g) => acc + (Number(g.terlayani) || 0), 0);
          const persenSerapanGpmLap = totalKuotaGpmLap > 0 ? ((totalHadirGpmLap / totalKuotaGpmLap) * 100).toFixed(1) : '0.0';
          const namaPenandatanganKabid = ambilNamaPenandatangan('Kabid');

          return (
            <div className="dashboard-page-container" id="area-laporan-resmi">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h1 className="dashboard-main-heading">📑 Laporan Resmi Bidang Cadangan &amp; Distribusi Pangan</h1>
                  <p className="dashboard-main-subheading">
                    Unduh Microsoft Excel resmi (<code>.xlsx</code>) berformat kedinasan atau cetak PDF A4 langsung dari data riil basis data Supabase.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {subTabLaporanKabid === 'harga' ? (
                    <>
                      <button
                        type="button"
                        disabled={daftarLaporanTerfilter.length === 0}
                        onClick={() =>
                          laporanService.eksporLaporanHargaExcel(daftarLaporanTerfilter, {
                            penandatangan: { nama: namaPenandatanganKabid },
                            filter: { ...filterLaporanHarga, pencarian: cariLaporanHarga }
                          })
                        }
                        className="kabid-btn-excel"
                      >
                        📊 Unduh Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        disabled={daftarLaporanTerfilter.length === 0}
                        onClick={() =>
                          handleCetakDokumen({
                            jenis: 'kabid-harga',
                            data: daftarLaporanTerfilter,
                            filter: { ...filterLaporanHarga, pencarian: cariLaporanHarga }
                          })
                        }
                        className="kabid-btn-pdf"
                      >
                        🖨️ Cetak Dokumen PDF
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={daftarGpmTerfilter.length === 0}
                        onClick={() =>
                          laporanService.eksporLaporanGPMExcel(daftarGpmTerfilter, {
                            penandatangan: { nama: namaPenandatanganKabid },
                            jabatanPenandatangan: 'Kepala Bidang Cadangan dan Distribusi Pangan',
                            filter: { ...filterLaporanGPMKabid, labelPeriode: labelPeriodeGPM }
                          })
                        }
                        className="kabid-btn-excel"
                      >
                        📊 Unduh Excel GPM (.xlsx)
                      </button>
                      <button
                        type="button"
                        disabled={daftarGpmTerfilter.length === 0}
                        onClick={() =>
                          handleCetakDokumen({
                            jenis: 'kabid-gpm',
                            data: daftarGpmTerfilter,
                            filter: { ...filterLaporanGPMKabid, labelPeriode: labelPeriodeGPM }
                          })
                        }
                        className="kabid-btn-pdf"
                      >
                        🖨️ Cetak PDF GPM
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Sub-Tab Pilihan Jenis Laporan Bidang */}
              <div className="kabid-laporan-subtabs">
                <button
                  type="button"
                  className={`kabid-subtab-btn ${subTabLaporanKabid === 'harga' ? 'active' : ''}`}
                  onClick={() => setSubTabLaporanKabid('harga')}
                >
                  🏷️ Laporan Harga Pangan ({daftarHarga.length})
                </button>
                <button
                  type="button"
                  className={`kabid-subtab-btn ${subTabLaporanKabid === 'gpm' ? 'active' : ''}`}
                  onClick={() => setSubTabLaporanKabid('gpm')}
                >
                  🎟️ Laporan Pelaksanaan GPM ({rekapitulasiGPMList.length})
                </button>
              </div>

              {subTabLaporanKabid === 'harga' ? (
                <>
                  {/* Filter Laporan Harga */}
                  <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={cariLaporanHarga}
                      onChange={(e) => setCariLaporanHarga(e.target.value)}
                      placeholder="🔍 Cari komoditas..."
                      className="verif-filter-input"
                    />
                    <select
                      value={filterLaporanHarga.pasar}
                      onChange={(e) => setFilterLaporanHarga(p => ({ ...p, pasar: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">📍 Semua Pasar</option>
                      {Array.from(new Set(daftarHarga.map(h => h.nama_pasar).filter(Boolean))).sort().map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={filterLaporanHarga.kategori}
                      onChange={(e) => setFilterLaporanHarga(p => ({ ...p, kategori: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">📦 Semua Kategori</option>
                      {Array.from(new Set(daftarHarga.map(h => h.kategori).filter(Boolean))).sort().map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <select
                      value={filterLaporanHarga.status}
                      onChange={(e) => setFilterLaporanHarga(p => ({ ...p, status: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">🔖 Semua Status</option>
                      <option value="Terbit">Terbit</option>
                      <option value="Draft">Draf</option>
                    </select>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: 'auto' }}>
                      Menampilkan <strong>{daftarLaporanTerfilter.length}</strong> dari {daftarHarga.length} data
                    </span>
                  </div>

                  {/* Strip Ringkasan Statistik Laporan Harga */}
                  <div className="kabid-summary-strip">
                    <div className="kabid-summary-chip">
                      <span>Total Data Terfilter</span>
                      <strong>{daftarLaporanTerfilter.length} Komoditas</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Terbit (Publik)</span>
                      <strong style={{ color: '#166534' }}>{totalHargaTerbitLap} Data</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Draf / Menunggu</span>
                      <strong style={{ color: '#b45309' }}>{totalHargaDraftLap} Data</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Rata-Rata Harga</span>
                      <strong style={{ color: '#8b1e1e' }}>{formatRupiah(rataHargaLap)}</strong>
                    </div>
                  </div>

                  {/* Pratinjau Dokumen Resmi Harga Pangan */}
                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '14px', marginBottom: '18px', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: '#8b1e1e', letterSpacing: '0.5px' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                      <h4 style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#334155' }}>BIDANG CADANGAN DAN DISTRIBUSI PANGAN</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Laporan Berkala Pemantauan Harga Bahan Pokok &amp; Komoditas Pangan Pasar Tradisional
                      </p>
                    </div>

                    {daftarLaporanTerfilter.length === 0 ? (
                      <div className="staf-empty-box">
                        Tidak ada data harga pangan sesuai filter yang dipilih. Ubah filter di atas untuk menampilkan data.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.87rem', minWidth: '640px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                              <th style={{ padding: '10px' }}>No.</th>
                              <th style={{ padding: '10px' }}>Nama Komoditas</th>
                              <th style={{ padding: '10px' }}>Kategori</th>
                              <th style={{ padding: '10px' }}>Nama Pasar</th>
                              <th style={{ padding: '10px' }}>Tanggal</th>
                              <th style={{ padding: '10px' }}>Harga Acuan</th>
                              <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {daftarLaporanTerfilter.map((h, idx) => (
                              <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '10px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                                <td style={{ padding: '10px' }}>{h.kategori}</td>
                                <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
                                <td style={{ padding: '10px', fontSize: '0.82rem', color: '#475569' }}>{h.tanggal_penetapan || '-'}</td>
                                <td style={{ padding: '10px', fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(h.harga)} / {formatSatuanTampil(h.satuan)}</td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: (h.status || '').toLowerCase() === 'draft' ? '#fef3c7' : '#dcfce7',
                                    color: (h.status || '').toLowerCase() === 'draft' ? '#92400e' : '#166534'
                                  }}>
                                    {(h.status || '').toLowerCase() === 'draft' ? 'Draf' : (h.status || 'Terbit')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                      <div style={{ width: '280px' }}>
                        <div>Manado, {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Bidang Cadangan &amp; Distribusi Pangan</div>
                        <div style={{ height: '64px' }}></div>
                        <div style={{ fontWeight: 800, textDecoration: 'underline' }}>
                          {namaPenandatanganKabid || '( ........................................ )'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NIP. ........................................</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Filter Laporan Pelaksanaan GPM */}
                  <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={filterLaporanGPMKabid.periode}
                      onChange={(e) => setFilterLaporanGPMKabid((p) => ({ ...p, periode: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="bulan_ini">📅 Bulan Ini</option>
                      <option value="tahun_ini">📆 Tahun {ringkasanBerandaKabid.tahunBerjalan}</option>
                      <option value="semua">🗂️ Semua Periode</option>
                    </select>
                    <select
                      value={filterLaporanGPMKabid.kecamatan}
                      onChange={(e) => setFilterLaporanGPMKabid((p) => ({ ...p, kecamatan: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">📍 Semua Kecamatan</option>
                      {Array.from(new Set(rekapitulasiGPMList.map((g) => g.kecamatan).filter(Boolean))).sort().map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <select
                      value={filterLaporanGPMKabid.status}
                      onChange={(e) => setFilterLaporanGPMKabid((p) => ({ ...p, status: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">🔖 Semua Status</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: 'auto' }}>
                      Menampilkan <strong>{daftarGpmTerfilter.length}</strong> dari {rekapitulasiGPMList.length} kegiatan GPM
                    </span>
                  </div>

                  {/* Strip Ringkasan Statistik Laporan GPM */}
                  <div className="kabid-summary-strip">
                    <div className="kabid-summary-chip">
                      <span>Titik GPM ({labelPeriodeGPM})</span>
                      <strong>{daftarGpmTerfilter.length} Kegiatan</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Total Alokasi Kuota</span>
                      <strong>{totalKuotaGpmLap.toLocaleString('id-ID')} Kuota</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Warga Terdaftar</span>
                      <strong style={{ color: '#1d4ed8' }}>{totalDaftarGpmLap.toLocaleString('id-ID')} Warga</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Hadir &amp; Serapan</span>
                      <strong style={{ color: '#166534' }}>{totalHadirGpmLap.toLocaleString('id-ID')} ({persenSerapanGpmLap}%)</strong>
                    </div>
                  </div>

                  {/* Pratinjau Dokumen Resmi GPM */}
                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '14px', marginBottom: '18px', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: '#8b1e1e', letterSpacing: '0.5px' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                      <h4 style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#334155' }}>BIDANG CADANGAN DAN DISTRIBUSI PANGAN</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Rekapitulasi Pelaksanaan Gerakan Pangan Murah (GPM) — Periode: {labelPeriodeGPM}
                      </p>
                    </div>

                    {daftarGpmTerfilter.length === 0 ? (
                      <div className="staf-empty-box">
                        Tidak ada kegiatan GPM sesuai periode/filter yang dipilih.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.86rem', minWidth: '720px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                              <th style={{ padding: '10px' }}>No.</th>
                              <th style={{ padding: '10px' }}>Nama Kegiatan GPM</th>
                              <th style={{ padding: '10px' }}>Lokasi &amp; Kecamatan</th>
                              <th style={{ padding: '10px' }}>Tanggal</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Kuota</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Terdaftar</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Hadir</th>
                              <th style={{ padding: '10px', textAlign: 'center' }}>Serapan</th>
                              <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {daftarGpmTerfilter.map((g, idx) => {
                              const serapan = g.target_kuota > 0 ? ((g.terlayani / g.target_kuota) * 100).toFixed(1) : '0.0';
                              const isSelesai = String(g.status || '').toLowerCase() === 'selesai';
                              return (
                                <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '10px' }}>{idx + 1}</td>
                                  <td style={{ padding: '10px', fontWeight: 700 }}>{g.nama_acara}</td>
                                  <td style={{ padding: '10px' }}>{g.lokasi} <span style={{ color: '#64748b' }}>({g.kecamatan})</span></td>
                                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{g.tanggal}</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>{(Number(g.target_kuota) || 0).toLocaleString('id-ID')}</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>{(Number(g.terdaftar) || 0).toLocaleString('id-ID')}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>{(Number(g.terlayani) || 0).toLocaleString('id-ID')}</td>
                                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{serapan}%</td>
                                  <td style={{ padding: '10px', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: isSelesai ? '#dcfce7' : '#fef3c7',
                                      color: isSelesai ? '#166534' : '#92400e'
                                    }}>
                                      {g.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr style={{ background: '#fef2f2', fontWeight: 800, color: '#8b1e1e', borderTop: '2px solid #8b1e1e' }}>
                              <td colSpan={4} style={{ padding: '10px' }}>TOTAL ({daftarGpmTerfilter.length} KEGIATAN GPM)</td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>{totalKuotaGpmLap.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>{totalDaftarGpmLap.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>{totalHadirGpmLap.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>{persenSerapanGpmLap}%</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>—</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                      <div style={{ width: '280px' }}>
                        <div>Manado, {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Bidang Cadangan &amp; Distribusi Pangan</div>
                        <div style={{ height: '64px' }}></div>
                        <div style={{ fontWeight: 800, textDecoration: 'underline' }}>
                          {namaPenandatanganKabid || '( ........................................ )'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NIP. ........................................</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ─────────────────────────────────────────────
            15. VIEW 7: MASTER SATUAN, PASAR & WILAYAH (ADMIN & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'master-data' && isAdmin && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">🏛️ Master Komoditas, Satuan, Pasar dan Wilayah</h1>
            <p className="dashboard-main-subheading">
              Admin & Superadmin mengelola Master Komoditas Terstruktur (Induk, Varian & Sinonim Pencarian), Master Satuan (terkunci per 1 unit), Master Pasar, dan Master Kecamatan langsung di database Supabase.
            </p>

            {/* KARTU PENUH: MASTER KOMODITAS RESMI (INDUK, VARIAN & SINONIM PENCARIAN) */}
            <div style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🌾 Master Komoditas Resmi (Induk, Varian & Sinonim)</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
                Mengelompokkan varian komoditas (contoh Induk <strong>Beras</strong> → <strong>Beras SPHP</strong>, <strong>Beras Medium</strong>, <strong>Beras Premium</strong>) agar pencarian warga akurat, sub-varian muncul otomatis, dan staf tidak salah ketik nama komoditas.
              </p>

              <form onSubmit={handleTambahMasterKomoditas} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', marginBottom: '18px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Komoditas Induk</label>
                  <input
                    type="text"
                    list="datalist-kelompok-induk"
                    placeholder="Contoh: Beras, Cabai, Minyak Goreng"
                    className="field-input-box"
                    value={formKomoditasMaster.kelompok_komoditas}
                    onChange={(e) => setFormKomoditasMaster({ ...formKomoditasMaster, kelompok_komoditas: e.target.value })}
                  />
                  <datalist id="datalist-kelompok-induk">
                    {daftarKelompokIndukMaster.map((kel) => (
                      <option key={kel} value={kel} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Nama Varian Resmi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Beras Superwin"
                    className="field-input-box"
                    value={formKomoditasMaster.nama_komoditas}
                    onChange={(e) => setFormKomoditasMaster({ ...formKomoditasMaster, nama_komoditas: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Kategori</label>
                  <select
                    className="field-select-box"
                    value={formKomoditasMaster.kategori}
                    onChange={(e) => setFormKomoditasMaster({ ...formKomoditasMaster, kategori: e.target.value })}
                  >
                    <option value="Bahan Pokok">Bahan Pokok</option>
                    <option value="Hewani">Hewani</option>
                    <option value="Sayuran">Sayuran</option>
                    <option value="Buah">Buah</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Satuan Bawaan (Per 1)</label>
                  <select
                    className="field-select-box"
                    value={formKomoditasMaster.satuan_bawaan}
                    onChange={(e) => setFormKomoditasMaster({ ...formKomoditasMaster, satuan_bawaan: e.target.value })}
                  >
                    {daftarSatuan.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Prioritas Tampil Publik</label>
                  <select
                    className="field-select-box"
                    value={formKomoditasMaster.prioritas_tampil}
                    onChange={(e) => setFormKomoditasMaster({ ...formKomoditasMaster, prioritas_tampil: Number(e.target.value) })}
                  >
                    <option value={10}>10 — Sangat Utama (Beras)</option>
                    <option value={15}>15 — Utama (Minyak Goreng)</option>
                    <option value={20}>20 — Pokok (Gula / Cabai / Bawang)</option>
                    <option value={30}>30 — Penting (Telur / Daging / Ikan)</option>
                    <option value={50}>50 — Standar</option>
                    <option value={70}>70 — Tambahan</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Sinonim / Kata Kunci Pencarian Warga (pisahkan koma)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: beras biasa, beras bulog, rica, lombok"
                      className="field-input-box"
                      value={formKomoditasMaster.kata_kunci}
                      onChange={(e) => setFormKomoditasMaster({ ...formKomoditasMaster, kata_kunci: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{ background: '#8b1e1e', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    ➕ Tambah Master Komoditas
                  </button>
                </div>
              </form>

              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ fontSize: '0.86rem', color: '#334155' }}>
                  Daftar Master Komoditas ({daftarMasterKomoditas.length} varian dalam {grupKomoditasDropdown.length} kelompok induk)
                </strong>
                <input
                  type="text"
                  className="verif-filter-input"
                  placeholder="🔍 Cari varian, kelompok, atau sinonim..."
                  value={cariMasterKomoditas}
                  onChange={(e) => setCariMasterKomoditas(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {grupKomoditasDropdown
                  .map((grup) => {
                    const q = cariMasterKomoditas.trim().toLowerCase();
                    if (!q) return grup;
                    const itemsCocok = grup.items.filter((k) =>
                      `${grup.kelompok} ${k.nama_komoditas} ${k.kategori} ${k.kata_kunci || ''}`.toLowerCase().includes(q)
                    );
                    return { ...grup, items: itemsCocok };
                  })
                  .filter((grup) => grup.items.length > 0)
                  .map((grup) => (
                  <div key={grup.kelompok} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#8b1e1e', fontSize: '0.9rem' }}>🌾 {grup.kelompok}</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '999px' }}>
                        {grup.items.length} varian
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {grup.items.map((k) => (
                        <div key={k.nama_komoditas} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>{k.nama_komoditas}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {k.kategori} • {k.satuan_bawaan} • P{k.prioritas_tampil}
                            </div>
                            {k.kata_kunci && (
                              <div style={{ fontSize: '0.7rem', color: '#0369a1', marginTop: '2px' }}>
                                🔍 {k.kata_kunci}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleHapusMasterKomoditas(k.nama_komoditas)}
                            title={`Hapus ${k.nama_komoditas}`}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800, flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Daftar Pasar & Titik Lokasi Peta Interaktif (Leaflet + Auto-Isi Alamat) */}
            <div style={{ marginTop: '20px' }}>
              <AdminMasterPasarPanel
                daftarPasarLengkap={daftarPasarLengkap}
                daftarKecamatan={daftarKecamatan}
                onDataBerubah={handleDataPasarBerubah}
                onPesanSukses={tampilkanPesan}
              />
            </div>

            <div className="gpm-supervisi-cards-grid" style={{ marginTop: '20px' }}>
              {/* Master Satuan (Terkunci per 1) */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>⚖️ Master Satuan Pangan (Per 1 Unit)</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Ketik nama satuan saja (misal: <strong>KG</strong>, <strong>Liter</strong>, <strong>Baki</strong>, <strong>Ikat</strong>). Sistem otomatis mengunci format per 1 unit.
                </p>
                <form onSubmit={handleTambahSatuan} className="admin-inline-form">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Liter, Baki, Ikat, Ekor..."
                    className="field-input-box"
                    value={inputSatuanBaru}
                    onChange={(e) => setInputSatuanBaru(e.target.value)}
                  />
                  <button type="submit" className="kabid-btn-pdf" style={{ whiteSpace: 'nowrap' }}>
                    + Tambah
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {daftarSatuan.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>⚖️ {s}</span>
                      <button type="button" onClick={() => handleHapusSatuan(s)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Master Kecamatan */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#8b1e1e' }}>📍 Master Daftar Kecamatan ({daftarKecamatan.length})</h3>
                <form onSubmit={handleTambahKecamatan} className="admin-inline-form">
                  <input
                    type="text"
                    required
                    placeholder="Nama kecamatan baru..."
                    className="field-input-box"
                    value={inputKecamatanBaru}
                    onChange={(e) => setInputKecamatanBaru(e.target.value)}
                  />
                  <button type="submit" className="kabid-btn-pdf" style={{ whiteSpace: 'nowrap' }}>
                    + Tambah
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
            16. VIEW 8: MENU KELOLA PENGGUNA (ADMIN & SUPERADMIN — RBAC KETAT)
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-user' && isAdmin && (() => {
          const qUser = filterCariPengguna.trim().toLowerCase();
          const daftarPenggunaTerfilter = daftarPengguna.filter((u) => {
            if (filterPeranPengguna !== 'Semua' && u.peran !== filterPeranPengguna) return false;
            if (qUser && !`${u.nama || ''} ${u.username || ''} ${u.email || ''} ${u.bidang || ''}`.toLowerCase().includes(qUser)) {
              return false;
            }
            return true;
          });

          return (
            <div className="dashboard-page-container">
              <h1 className="dashboard-main-heading">👥 Kelola Pengguna &amp; Manajemen Akses ({namaLengkapPeran(peran)})</h1>
              <p className="dashboard-main-subheading">
                {isSuperadmin
                  ? 'Mode Superadmin: Anda berwenang penuh menambah, mengubah profil, peran (termasuk Superadmin), reset sandi, dan menghapus akun.'
                  : 'Mode Administrator: Anda berwenang mengelola akun Staf, Kepala Bidang, Kepala Dinas, dan Admin. Akun Superadmin dilindungi sistem.'}
              </p>

              <div className="admin-two-col-grid" style={{ marginTop: '20px' }}>
                {/* Form Tambah Pengguna Baru */}
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>➕ Tambah Akun Pengguna Baru</h3>
                  <form onSubmit={handleTambahUserBaru} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap pegawai / pejabat"
                        className="field-input-box"
                        value={formUserBaru.nama}
                        onChange={(e) => setFormUserBaru({ ...formUserBaru, nama: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Pengguna (Username) *</label>
                      <input
                        type="text"
                        required
                        placeholder="username tanpa spasi"
                        className="field-input-box"
                        value={formUserBaru.username}
                        onChange={(e) => setFormUserBaru({ ...formUserBaru, username: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Alamat Email (Opsional)</label>
                      <input
                        type="email"
                        placeholder="contoh@manado.go.id (otomatis jika kosong)"
                        className="field-input-box"
                        value={formUserBaru.email}
                        onChange={(e) => setFormUserBaru({ ...formUserBaru, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Peran Kedinasan (Hak Akses)</label>
                      <select
                        className="field-select-box"
                        value={formUserBaru.peran}
                        onChange={(e) => setFormUserBaru({ ...formUserBaru, peran: e.target.value })}
                      >
                        <option value="Staf">Staf (Masukan Data Pangan &amp; Kelola GPM)</option>
                        <option value="Kabid">Kepala Bidang (Verifikasi Harga, GPM &amp; Laporan)</option>
                        <option value="Kadis">Kepala Dinas (Grafik Pangan &amp; Laporan Eksekutif)</option>
                        <option value="Admin">Admin (Kelola Pengguna, Master Data &amp; Cek GPM)</option>
                        {isSuperadmin && (
                          <option value="Superadmin">Superadmin (Akses Penuh Seluruh Sistem)</option>
                        )}
                      </select>
                    </div>

                    {formUserBaru.peran !== 'Admin' && formUserBaru.peran !== 'Superadmin' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Bidang / Unit Kerja</label>
                        <input
                          type="text"
                          placeholder="Bidang Cadangan dan Distribusi Pangan"
                          className="field-input-box"
                          value={formUserBaru.bidang}
                          onChange={(e) => setFormUserBaru({ ...formUserBaru, bidang: e.target.value })}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                        Kata Sandi Awal (Min. 8 Karakter) *
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
                      className="kabid-btn-pdf"
                      style={{ padding: '12px', fontSize: '0.88rem', marginTop: '4px' }}
                    >
                      ✓ Simpan &amp; Buat Akun
                    </button>
                  </form>
                </div>

                {/* Daftar Akun Terdaftar & Aksi Admin */}
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#8b1e1e' }}>
                      📋 Daftar Akun ({daftarPenggunaTerfilter.length}/{daftarPengguna.length})
                    </h3>
                  </div>

                  <div className="verif-filter-controls" style={{ marginBottom: '14px' }}>
                    <input
                      type="text"
                      className="verif-filter-input"
                      placeholder="🔍 Cari nama, username, email..."
                      value={filterCariPengguna}
                      onChange={(e) => setFilterCariPengguna(e.target.value)}
                    />
                    <select
                      className="verif-filter-select"
                      value={filterPeranPengguna}
                      onChange={(e) => setFilterPeranPengguna(e.target.value)}
                    >
                      <option value="Semua">Semua Peran</option>
                      <option value="Superadmin">Superadmin</option>
                      <option value="Admin">Admin</option>
                      <option value="Kadis">Kepala Dinas</option>
                      <option value="Kabid">Kepala Bidang</option>
                      <option value="Staf">Staf</option>
                    </select>
                  </div>

                  {daftarPenggunaTerfilter.length === 0 ? (
                    <div className="staf-ops-empty">Tidak ada akun pengguna yang sesuai pencarian/filter peran.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {daftarPenggunaTerfilter.map((u) => {
                        const targetSuperadmin = u.peran === 'Superadmin';
                        const dilindungi = targetSuperadmin && !isSuperadmin;
                        const akunSendiri = String(u.id) === String(userState.id);

                        return (
                          <div key={u.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: targetSuperadmin ? '1px solid #fcd34d' : '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{u.nama}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '6px' }}>({u.username})</span>
                                {akunSendiri && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, marginLeft: '6px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '999px' }}>
                                    Anda
                                  </span>
                                )}
                                <div style={{ fontSize: '0.77rem', color: '#64748b', marginTop: '3px', wordBreak: 'break-word' }}>
                                  ✉️ {u.email || `${u.username}@manado.go.id`} · 🏢 {u.bidang || 'Dinas Pangan Kota Manado'}
                                </div>
                              </div>
                              <span style={{
                                fontSize: '0.73rem',
                                fontWeight: 800,
                                padding: '3px 9px',
                                borderRadius: '999px',
                                whiteSpace: 'nowrap',
                                background: u.peran === 'Superadmin' ? '#fef3c7' : u.peran === 'Admin' ? '#fdf2f8' : u.peran === 'Kabid' ? '#e0f2fe' : u.peran === 'Kadis' ? '#f3e8ff' : '#dcfce7',
                                color: u.peran === 'Superadmin' ? '#92400e' : u.peran === 'Admin' ? '#9d174d' : u.peran === 'Kabid' ? '#0369a1' : u.peran === 'Kadis' ? '#6b21a8' : '#166534'
                              }}>
                                {u.peran === 'Superadmin' ? '👑 ' : ''}{namaLengkapPeran(u.peran)}
                              </span>
                            </div>

                            {dilindungi ? (
                              <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '7px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.76rem', color: '#92400e', fontWeight: 600 }}>
                                🔒 Akun Superadmin dilindungi hierarki RBAC — hanya dapat dikelola oleh Superadmin.
                              </div>
                            ) : (
                              <div className="admin-user-actions-row">
                                <select
                                  value={u.peran}
                                  disabled={akunSendiri}
                                  title={akunSendiri ? 'Peran akun sendiri dikunci agar tidak terkunci keluar' : 'Ubah peran pengguna'}
                                  onChange={(e) => handleUbahPeranUser(u.id, e.target.value)}
                                  style={{ fontSize: '0.78rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: akunSendiri ? '#f1f5f9' : '#fff', cursor: akunSendiri ? 'not-allowed' : 'pointer' }}
                                >
                                  <option value="Staf">Peran Staf</option>
                                  <option value="Kabid">Peran Kepala Bidang</option>
                                  <option value="Kadis">Peran Kepala Dinas</option>
                                  <option value="Admin">Peran Admin</option>
                                  {isSuperadmin && <option value="Superadmin">Peran Superadmin</option>}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => setModalEditProfilUser({ buka: true, userTarget: u, namaBaru: u.nama || '', bidangBaru: u.bidang || '', pesan: '' })}
                                  className="kabid-btn-outline"
                                  style={{ padding: '5px 9px', fontSize: '0.76rem' }}
                                >
                                  👤 Edit Nama
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalEditUsername({ buka: true, userTarget: u, usernameBaru: u.username, pesan: '' })}
                                  className="kabid-btn-outline"
                                  style={{ padding: '5px 9px', fontSize: '0.76rem' }}
                                >
                                  ✏️ Username
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalEditEmail({ buka: true, userTarget: u, emailBaru: u.email || `${u.username}@manado.go.id`, pesan: '' })}
                                  style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 9px', borderRadius: '7px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  ✉️ Email
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalResetAdmin({ buka: true, userTarget: u, sandiBaru: '', konfirmasiSandi: '', pesan: '' })}
                                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 9px', borderRadius: '7px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  🔒 Reset Sandi
                                </button>

                                {!akunSendiri && (
                                  <button
                                    type="button"
                                    onClick={() => handleHapusUser(u.id, u.nama)}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.76rem', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}
                                  >
                                    🗑️ Hapus
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─────────────────────────────────────────────
            17. VIEW 9: GRAFIK PANGAN (KADIS & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'grafik-pangan' && isKadis && (
          <div className="dashboard-page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h1 className="dashboard-main-heading">📈 Analisis Grafik &amp; Tren Harga Pangan (Kepala Dinas)</h1>
                <p className="dashboard-main-subheading">
                  Visualisasi dinamika pergerakan dan stabilitas harga komoditas pangan pokok di pasar-pasar Kota Manado (100% data riil basis data).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="kabid-btn-excel"
                  disabled={!dataTren || !dataTren.adaData}
                  onClick={() =>
                    laporanService.eksporTrenHargaExcel(dataTren, {
                      penandatangan: { nama: ambilNamaPenandatangan('Kadis') },
                      jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado'
                    })
                  }
                >
                  📊 Unduh Excel Tren (.xlsx)
                </button>
                <button
                  type="button"
                  className="kabid-btn-pdf"
                  disabled={!dataTren || !dataTren.adaData}
                  onClick={() =>
                    laporanService.cetakTrenHargaPDF(dataTren, {
                      penandatangan: { nama: ambilNamaPenandatangan('Kadis') },
                      jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado'
                    })
                  }
                >
                  🖨️ Cetak Analisis PDF
                </button>
              </div>
            </div>

            {/* Filter Komoditas, Pasar & Periode (100% Data Riil Database) */}
            <div style={{ background: '#ffffff', padding: '18px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Komoditas</label>
                <select
                  value={komoditasTren}
                  onChange={(e) => setKomoditasTren(e.target.value)}
                  disabled={daftarHarga.length === 0}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                >
                  {(() => {
                    const daftarNama = Array.from(
                      new Set(
                        daftarHarga
                          .filter((i) => String(i.status || '').toLowerCase() === 'terbit')
                          .map((i) => i.nama_komoditas)
                          .filter(Boolean)
                      )
                    );
                    if (daftarNama.length === 0) {
                      return <option value="">Belum ada data komoditas di database</option>;
                    }
                    return daftarNama.map(nama => (
                      <option key={nama} value={nama}>{nama}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Pasar Pantauan</label>
                <select
                  value={pasarTren}
                  onChange={(e) => setPasarTren(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                >
                  <option value="Semua">Semua Pasar</option>
                  {Array.from(new Set([
                    ...daftarPasar,
                    ...daftarHarga.map(i => i.nama_pasar).filter(Boolean)
                  ])).sort((a, b) => a.localeCompare(b, 'id-ID')).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
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

            {/* Metrik & Grafik Tren 100% Riil dari Tabel riwayat_harga_pangan */}
            {sedangMuatTren ? (
              <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                ⏳ Memuat data riwayat fluktuasi harga dari basis data Supabase...
              </div>
            ) : !dataTren || !dataTren.adaData ? (
              <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📉</div>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                  Belum Ada Data Harga / Riwayat untuk Pilihan Ini
                </strong>
                <span style={{ fontSize: '0.84rem' }}>
                  Grafik menampilkan 100% catatan harga resmi dari database (tanpa simulasi/data dummy). Pilih komoditas/pasar lain atau tunggu penetapan harga dari bidang terkait.
                </span>
              </div>
            ) : (
              <>
                <div className="dashboard-stat-cards-grid" style={{ marginBottom: '24px' }}>
                  <div className="stat-card-white">
                    <div className="stat-title-label">Harga Terkini</div>
                    <div className="stat-number-big" style={{ color: '#8b1e1e' }}>{formatRupiah(dataTren.hargaTerkini)}</div>
                    <div className="stat-caption-sub">acuan terbaru tercatat</div>
                  </div>

                  <div className="stat-card-white">
                    <div className="stat-title-label">Rata-rata Harga</div>
                    <div className="stat-number-big">{formatRupiah(dataTren.rataRata)}</div>
                    <div className="stat-caption-sub">dari {dataTren.titikData.length} catatan riil</div>
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
                    <div className="stat-caption-sub">
                      selisih {dataTren.selisih > 0 ? '+' : ''}{formatRupiah(dataTren.selisih)} ({dataTren.persentase}%)
                    </div>
                  </div>
                </div>

                {/* Visualisasi Grafik Tren Interaktif (100% Data Riil) */}
                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem' }}>
                      Pergerakan Harga Komoditas: {dataTren.namaKomoditas} {dataTren.pasar !== 'Semua' ? `(${dataTren.pasar})` : '(Semua Pasar)'}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      color: dataTren.sumber === 'riwayat' ? '#166534' : '#92400e',
                      background: dataTren.sumber === 'riwayat' ? '#dcfce7' : '#fef3c7',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 700
                    }}>
                      {dataTren.sumber === 'riwayat'
                        ? `📊 Riwayat Perubahan Harga Resmi (${dataTren.jumlahCatatan} catatan)`
                        : `📌 Harga Acuan Terkini (${dataTren.jumlahCatatan} pasar)`}
                    </span>
                  </div>

                  {dataTren.titikData.length === 1 && (
                    <div style={{ fontSize: '0.8rem', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
                      ℹ️ Baru terdapat <strong>1 catatan harga resmi</strong> pada rentang waktu ini. Titik tren fluktuasi akan bertambah otomatis setiap kali terjadi pembaruan harga terbit oleh Kepala Bidang.
                    </div>
                  )}

                  {(() => {
                    const pts = dataTren.titikData;
                    const W = Math.max(560, pts.length * 64);
                    const H = 240;
                    const padL = 72;
                    const padR = 24;
                    const padT = 24;
                    const padB = 42;
                    const plotW = W - padL - padR;
                    const plotH = H - padT - padB;
                    const minH = dataTren.hargaTerendah;
                    const maxH = dataTren.hargaTertinggi;
                    const range = maxH === minH ? 1 : maxH - minH;
                    const coords = pts.map((t, i) => ({
                      ...t,
                      x: pts.length === 1 ? padL + plotW / 2 : padL + (i / (pts.length - 1)) * plotW,
                      y: pts.length === 1 ? padT + plotH / 2 : padT + plotH - ((t.harga - minH) / range) * plotH
                    }));
                    const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
                    const areaPoints = coords.length >= 2
                      ? `${coords[0].x},${padT + plotH} ${polylinePoints} ${coords[coords.length - 1].x},${padT + plotH}`
                      : '';
                    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
                      y: padT + plotH - r * plotH,
                      val: Math.round(minH + r * (maxH === minH ? 0 : range))
                    }));
                    const stepLabel = pts.length > 10 ? Math.ceil(pts.length / 8) : 1;

                    return (
                      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px' }}>
                        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: `${W}px`, height: '240px', background: '#f8fafc', borderRadius: '8px', display: 'block' }}>
                          {yTicks.map((tk, i) => (
                            <g key={i}>
                              <line x1={padL} y1={tk.y} x2={W - padR} y2={tk.y} stroke={i === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth="1" />
                              <text x={padL - 8} y={tk.y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontWeight="600">
                                {formatRupiah(tk.val)}
                              </text>
                            </g>
                          ))}
                          {areaPoints && (
                            <polygon points={areaPoints} fill="rgba(139, 30, 30, 0.08)" />
                          )}
                          {coords.length >= 2 && (
                            <polyline
                              fill="none"
                              stroke="#8b1e1e"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylinePoints}
                            />
                          )}
                          {coords.map((c, idx) => {
                            const showLbl = idx === 0 || idx === coords.length - 1 || idx % stepLabel === 0;
                            return (
                              <g key={idx}>
                                <circle cx={c.x} cy={c.y} r="5" fill="#8b1e1e" stroke="#ffffff" strokeWidth="2">
                                  <title>{`${c.tanggalLengkap} · ${c.pasar}: ${formatRupiah(c.harga)}`}</title>
                                </circle>
                                {showLbl && (
                                  <>
                                    <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e293b">
                                      {`${(c.harga / 1000).toFixed(1).replace(/\.0$/, '')}k`}
                                    </text>
                                    <text x={c.x} y={H - 18} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">
                                      {c.tanggal}
                                    </text>
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'right', marginTop: '6px' }}>
                    💡 Arahkan kursor pada titik grafik untuk melihat detail waktu &amp; pasar. Geser ke samping jika grafik lebar.
                  </div>

                  {/* Tabel Rincian Catatan Riwayat Riil */}
                  <div style={{ marginTop: '18px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '520px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>Waktu Tercatat</th>
                          <th style={{ padding: '8px 10px' }}>Pasar</th>
                          <th style={{ padding: '8px 10px' }}>Harga Tercatat</th>
                          <th style={{ padding: '8px 10px' }}>Perubahan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...dataTren.titikData].reverse().map((t, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>{t.tanggalLengkap}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{t.pasar}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(t.harga)}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: t.selisih > 0 ? '#dc2626' : t.selisih < 0 ? '#166534' : '#64748b' }}>
                              {t.selisih > 0 ? `▲ +${formatRupiah(t.selisih)}` : t.selisih < 0 ? `▼ ${formatRupiah(t.selisih)}` : '▬ Tetap / Baru'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            18. VIEW 10: LAPORAN EKSEKUTIF KEPALA DINAS (GPM & HARGA TERBIT — EXCEL .xlsx + PDF A4)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan-gpm' && isKadis && (() => {
          const labelPeriodeKadis = berandaKadisService.labelPeriode(filterLaporanGPMKadis.periode);
          const totalGpmSelesaiLap = daftarGpmKadisTerfilter.filter((g) => String(g.status || '').toLowerCase() === 'selesai').length;
          const totalGpmAktifLap = daftarGpmKadisTerfilter.length - totalGpmSelesaiLap;
          const totalKuotaKadisLap = daftarGpmKadisTerfilter.reduce((acc, g) => acc + (Number(g.target_kuota) || 0), 0);
          const totalDaftarKadisLap = daftarGpmKadisTerfilter.reduce((acc, g) => acc + (Number(g.terdaftar) || 0), 0);
          const totalHadirKadisLap = daftarGpmKadisTerfilter.reduce((acc, g) => acc + (Number(g.terlayani) || 0), 0);
          const persenSerapanKadisLap = totalKuotaKadisLap > 0 ? ((totalHadirKadisLap / totalKuotaKadisLap) * 100).toFixed(1) : '0.0';
          const kecamatanUnikGpmKadis = Array.from(new Set(rekapitulasiGPMList.map((g) => g.kecamatan).filter(Boolean))).sort();

          // Harga resmi terbit (Read-only eksekutif Kadis)
          const hargaTerbitKadisSemua = daftarHarga.filter((h) => String(h.status || '').toLowerCase() === 'terbit');
          const kataCariHargaKadis = filterLaporanHargaKadis.pencarian.trim().toLowerCase();
          const hargaTerbitKadisTerfilter = hargaTerbitKadisSemua.filter((h) => {
            if (filterLaporanHargaKadis.pasar !== 'Semua' && h.nama_pasar !== filterLaporanHargaKadis.pasar) return false;
            if (filterLaporanHargaKadis.kategori !== 'Semua' && h.kategori !== filterLaporanHargaKadis.kategori) return false;
            if (kataCariHargaKadis && !`${h.nama_komoditas || ''} ${h.nama_pasar || ''} ${h.kategori || ''}`.toLowerCase().includes(kataCariHargaKadis)) {
              return false;
            }
            return true;
          });
          const nilaiHargaKadis = hargaTerbitKadisTerfilter.map((h) => Number(h.harga) || 0).filter((v) => v > 0);
          const rataHargaKadis = nilaiHargaKadis.length > 0 ? Math.round(nilaiHargaKadis.reduce((a, b) => a + b, 0) / nilaiHargaKadis.length) : 0;
          const minHargaKadis = nilaiHargaKadis.length > 0 ? Math.min(...nilaiHargaKadis) : 0;
          const maxHargaKadis = nilaiHargaKadis.length > 0 ? Math.max(...nilaiHargaKadis) : 0;
          const namaPenandatanganKadis = ambilNamaPenandatangan('Kadis');

          return (
            <div className="dashboard-page-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h1 className="dashboard-main-heading">📋 Laporan Eksekutif Kepala Dinas</h1>
                  <p className="dashboard-main-subheading">
                    Rekapitulasi serapan Gerakan Pangan Murah lintas kecamatan dan daftar harga pangan resmi terbit untuk pelaporan pimpinan / TPID.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {subTabLaporanKadis === 'gpm' ? (
                    <>
                      <button
                        type="button"
                        className="kabid-btn-excel"
                        disabled={daftarGpmKadisTerfilter.length === 0}
                        onClick={() =>
                          laporanService.eksporLaporanGPMExcel(daftarGpmKadisTerfilter, {
                            penandatangan: { nama: namaPenandatanganKadis },
                            jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
                            filter: { ...filterLaporanGPMKadis, labelPeriode: labelPeriodeKadis }
                          })
                        }
                      >
                        📊 Unduh Excel GPM (.xlsx)
                      </button>
                      <button
                        type="button"
                        className="kabid-btn-pdf"
                        disabled={daftarGpmKadisTerfilter.length === 0}
                        onClick={() => setModalPilihanCetakGPM({ buka: true, mode: 'semua', acaraId: '' })}
                      >
                        🖨️ Cetak PDF GPM
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="kabid-btn-excel"
                        disabled={hargaTerbitKadisTerfilter.length === 0}
                        onClick={() =>
                          laporanService.eksporLaporanHargaExcel(hargaTerbitKadisTerfilter, {
                            penandatangan: { nama: namaPenandatanganKadis },
                            jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
                            filter: {
                              pasar: filterLaporanHargaKadis.pasar,
                              kategori: filterLaporanHargaKadis.kategori,
                              status: 'Terbit',
                              pencarian: filterLaporanHargaKadis.pencarian
                            }
                          })
                        }
                      >
                        📊 Unduh Excel Harga (.xlsx)
                      </button>
                      <button
                        type="button"
                        className="kabid-btn-pdf"
                        disabled={hargaTerbitKadisTerfilter.length === 0}
                        onClick={() =>
                          laporanService.cetakLaporanHargaPDF(hargaTerbitKadisTerfilter, {
                            penandatangan: { nama: namaPenandatanganKadis },
                            jabatanPenandatangan: 'Kepala Dinas Pangan Kota Manado',
                            filter: {
                              pasar: filterLaporanHargaKadis.pasar,
                              kategori: filterLaporanHargaKadis.kategori,
                              status: 'Terbit',
                              pencarian: filterLaporanHargaKadis.pencarian
                            }
                          })
                        }
                      >
                        🖨️ Cetak PDF Harga
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Sub-tab Laporan Eksekutif Kadis */}
              <div className="kabid-laporan-subtabs">
                <button
                  type="button"
                  className={`kabid-subtab-btn ${subTabLaporanKadis === 'gpm' ? 'active' : ''}`}
                  onClick={() => setSubTabLaporanKadis('gpm')}
                >
                  🎟️ Laporan Pelaksanaan GPM ({rekapitulasiGPMList.length})
                </button>
                <button
                  type="button"
                  className={`kabid-subtab-btn ${subTabLaporanKadis === 'harga' ? 'active' : ''}`}
                  onClick={() => setSubTabLaporanKadis('harga')}
                >
                  🏷️ Ringkasan Harga Pangan Terbit ({hargaTerbitKadisSemua.length})
                </button>
              </div>

              {subTabLaporanKadis === 'gpm' ? (
                <>
                  {/* Filter Periode, Kecamatan, & Status */}
                  <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={filterLaporanGPMKadis.periode}
                      onChange={(e) => setFilterLaporanGPMKadis((p) => ({ ...p, periode: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="bulan_ini">📅 Bulan Ini</option>
                      <option value="tahun_ini">📆 Tahun {ringkasanBerandaKadis.tahunBerjalan}</option>
                      <option value="semua">🗂️ Semua Periode</option>
                    </select>
                    <select
                      value={filterLaporanGPMKadis.kecamatan}
                      onChange={(e) => setFilterLaporanGPMKadis((p) => ({ ...p, kecamatan: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">📍 Semua Kecamatan</option>
                      {kecamatanUnikGpmKadis.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <select
                      value={filterLaporanGPMKadis.status}
                      onChange={(e) => setFilterLaporanGPMKadis((p) => ({ ...p, status: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">🔖 Semua Status</option>
                      <option value="Selesai">Selesai (Terlaksana)</option>
                      <option value="Aktif">Aktif (Berjalan / Terjadwal)</option>
                    </select>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: 'auto' }}>
                      Menampilkan <strong>{daftarGpmKadisTerfilter.length}</strong> dari {rekapitulasiGPMList.length} kegiatan GPM
                    </span>
                  </div>

                  {/* 4 KPI Ringkas Akurat */}
                  <div className="kabid-summary-strip">
                    <div className="kabid-summary-chip">
                      <span>Kegiatan ({labelPeriodeKadis})</span>
                      <strong>{daftarGpmKadisTerfilter.length} Titik ({totalGpmSelesaiLap} Selesai · {totalGpmAktifLap} Aktif)</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Alokasi Kuota</span>
                      <strong>{totalKuotaKadisLap.toLocaleString('id-ID')} Kuota</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Warga Mendaftar</span>
                      <strong style={{ color: '#1d4ed8' }}>{totalDaftarKadisLap.toLocaleString('id-ID')} Pendaftar</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Hadir &amp; Serapan Kuota</span>
                      <strong style={{ color: '#166534' }}>{totalHadirKadisLap.toLocaleString('id-ID')} ({persenSerapanKadisLap}%)</strong>
                    </div>
                  </div>

                  {/* Tabel Realisasi GPM */}
                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '12px', marginBottom: '16px', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: '#8b1e1e', letterSpacing: '0.5px' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>
                        Laporan Eksekutif Realisasi Gerakan Pangan Murah (GPM) — Periode: {labelPeriodeKadis}
                      </p>
                    </div>

                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '760px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>No.</th>
                            <th style={{ padding: '10px' }}>Nama Acara / Lokasi</th>
                            <th style={{ padding: '10px' }}>Kecamatan</th>
                            <th style={{ padding: '10px' }}>Tanggal</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Kuota</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Mendaftar</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Hadir</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Serapan</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Data Pendaftar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daftarGpmKadisTerfilter.length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                Belum ada kegiatan Gerakan Pangan Murah sesuai periode/filter yang dipilih.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {daftarGpmKadisTerfilter.map((gpm, idx) => {
                                const serapan = gpm.target_kuota > 0 ? ((gpm.terlayani / gpm.target_kuota) * 100).toFixed(1) : '0.0';
                                const satuan = gpm.satuan_penerima || 'Warga';
                                return (
                                  <tr key={gpm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px' }}>{idx + 1}</td>
                                    <td style={{ padding: '10px' }}>
                                      <strong>{gpm.nama_acara}</strong>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{gpm.lokasi}</div>
                                    </td>
                                    <td style={{ padding: '10px' }}>{gpm.kecamatan}</td>
                                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{gpm.tanggal}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{gpm.target_kuota} {satuan}</td>
                                    <td
                                      style={{ padding: '10px', textAlign: 'right', cursor: 'pointer', color: '#1d4ed8', fontWeight: 700 }}
                                      onClick={() => setModalDetailWarga({ buka: true, acara: gpm, pencarian: '' })}
                                      title="Klik untuk membuka data pendaftar warga"
                                    >
                                      {gpm.terdaftar}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: gpm.terlayani > 0 ? '#166534' : '#64748b' }}>
                                      {gpm.terlayani} {satuan}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{serapan}%</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
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
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      <button
                                        type="button"
                                        className="kabid-btn-outline"
                                        onClick={() => setModalDetailWarga({ buka: true, acara: gpm, pencarian: '' })}
                                      >
                                        👥 Data ({gpm.terdaftar})
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr style={{ background: '#fef2f2', fontWeight: 800, color: '#8b1e1e', borderTop: '2px solid #8b1e1e' }}>
                                <td colSpan={4} style={{ padding: '10px' }}>TOTAL ({daftarGpmKadisTerfilter.length} KEGIATAN GPM)</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{totalKuotaKadisLap.toLocaleString('id-ID')}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{totalDaftarKadisLap.toLocaleString('id-ID')}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{totalHadirKadisLap.toLocaleString('id-ID')}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{persenSerapanKadisLap}%</td>
                                <td colSpan={2} style={{ padding: '10px', textAlign: 'center' }}>—</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                      <div style={{ width: '280px' }}>
                        <div>Manado, {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Dinas Pangan Kota Manado</div>
                        <div style={{ height: '64px' }}></div>
                        <div style={{ fontWeight: 800, textDecoration: 'underline' }}>
                          {namaPenandatanganKadis || '( ........................................ )'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NIP. ........................................</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Tab 2 Kadis: Ringkasan Harga Pangan Resmi Terbit (Read-Only Eksekutif) */}
                  <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={filterLaporanHargaKadis.pencarian}
                      onChange={(e) => setFilterLaporanHargaKadis((p) => ({ ...p, pencarian: e.target.value }))}
                      placeholder="🔍 Cari komoditas / pasar..."
                      className="verif-filter-input"
                    />
                    <select
                      value={filterLaporanHargaKadis.pasar}
                      onChange={(e) => setFilterLaporanHargaKadis((p) => ({ ...p, pasar: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">📍 Semua Pasar</option>
                      {Array.from(new Set(hargaTerbitKadisSemua.map((h) => h.nama_pasar).filter(Boolean))).sort().map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={filterLaporanHargaKadis.kategori}
                      onChange={(e) => setFilterLaporanHargaKadis((p) => ({ ...p, kategori: e.target.value }))}
                      className="verif-filter-select"
                    >
                      <option value="Semua">📦 Semua Kategori</option>
                      {Array.from(new Set(hargaTerbitKadisSemua.map((h) => h.kategori).filter(Boolean))).sort().map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: 'auto' }}>
                      Menampilkan <strong>{hargaTerbitKadisTerfilter.length}</strong> dari {hargaTerbitKadisSemua.length} harga terbit
                    </span>
                  </div>

                  <div className="kabid-summary-strip">
                    <div className="kabid-summary-chip">
                      <span>Data Terbit Terfilter</span>
                      <strong>{hargaTerbitKadisTerfilter.length} Data</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Harga Terendah</span>
                      <strong style={{ color: '#166534' }}>{formatRupiah(minHargaKadis)}</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Rata-Rata Harga</span>
                      <strong style={{ color: '#8b1e1e' }}>{formatRupiah(rataHargaKadis)}</strong>
                    </div>
                    <div className="kabid-summary-chip">
                      <span>Harga Tertinggi</span>
                      <strong>{formatRupiah(maxHargaKadis)}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '12px', marginBottom: '16px', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: '#8b1e1e', letterSpacing: '0.5px' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>
                        Laporan Eksekutif Harga Pangan Pokok &amp; Strategis Resmi Terbit (Read-Only Pimpinan)
                      </p>
                    </div>

                    {hargaTerbitKadisTerfilter.length === 0 ? (
                      <div className="staf-empty-box">Tidak ada data harga terbit sesuai filter yang dipilih.</div>
                    ) : (
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '640px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                              <th style={{ padding: '10px' }}>No.</th>
                              <th style={{ padding: '10px' }}>Komoditas</th>
                              <th style={{ padding: '10px' }}>Kategori</th>
                              <th style={{ padding: '10px' }}>Pasar Pantauan</th>
                              <th style={{ padding: '10px' }}>Tanggal Penetapan</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Harga Acuan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hargaTerbitKadisTerfilter.map((h, idx) => (
                              <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px' }}>{idx + 1}</td>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                                <td style={{ padding: '10px' }}>{h.kategori}</td>
                                <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
                                <td style={{ padding: '10px', color: '#475569' }}>{h.tanggal_penetapan || '-'}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#8b1e1e' }}>
                                  {formatRupiah(h.harga)} / {formatSatuanTampil(h.satuan)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                      <div style={{ width: '280px' }}>
                        <div>Manado, {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Dinas Pangan Kota Manado</div>
                        <div style={{ height: '64px' }}></div>
                        <div style={{ fontWeight: 800, textDecoration: 'underline' }}>
                          {namaPenandatanganKadis || '( ........................................ )'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NIP. ........................................</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}
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
            zIndex: 1200,
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
              maxHeight: '90dvh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#8b1e1e' }}>🔒 Hard Reset Kata Sandi (Admin)</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Target: <strong>{modalResetAdmin.userTarget?.nama}</strong> ({modalResetAdmin.userTarget?.username})
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
            zIndex: 1200,
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
              maxHeight: '90dvh',
              overflowY: 'auto',
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
          20B. MODAL KHUSUS ADMIN: UBAH EMAIL
          ───────────────────────────────────────────── */}
      {modalEditEmail.buka && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
          onClick={() => setModalEditEmail({ buka: false, userTarget: null, emailBaru: '', pesan: '' })}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '90dvh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#8b1e1e' }}>✉️ Ubah Email Pengguna (Admin)</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Pengguna: <strong>{modalEditEmail.userTarget?.nama}</strong> ({modalEditEmail.userTarget?.username})
            </p>

            {modalEditEmail.pesan && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.82rem', marginBottom: '12px' }}>
                ⚠️ {modalEditEmail.pesan}
              </div>
            )}

            <form onSubmit={handleEksekusiUbahEmail} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Alamat Email Baru</label>
                <input
                  type="email"
                  required
                  placeholder="contoh@manado.go.id"
                  className="field-input-box"
                  value={modalEditEmail.emailBaru}
                  onChange={(e) => setModalEditEmail({ ...modalEditEmail, emailBaru: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalEditEmail({ buka: false, userTarget: null, emailBaru: '', pesan: '' })}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#8b1e1e', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Simpan Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          20C. MODAL KHUSUS ADMIN/SUPERADMIN: UBAH NAMA & BIDANG PENGGUNA
          ───────────────────────────────────────────── */}
      {modalEditProfilUser.buka && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
          onClick={() => setModalEditProfilUser({ buka: false, userTarget: null, namaBaru: '', bidangBaru: '', pesan: '' })}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90dvh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#8b1e1e' }}>👤 Ubah Nama &amp; Bidang Pengguna</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Akun: <strong>{modalEditProfilUser.userTarget?.username}</strong> ({namaLengkapPeran(modalEditProfilUser.userTarget?.peran)})
            </p>

            {modalEditProfilUser.pesan && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.82rem', marginBottom: '12px' }}>
                ⚠️ {modalEditProfilUser.pesan}
              </div>
            )}

            <form onSubmit={handleEksekusiUbahProfilUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap pegawai / pejabat"
                  className="field-input-box"
                  value={modalEditProfilUser.namaBaru}
                  onChange={(e) => setModalEditProfilUser({ ...modalEditProfilUser, namaBaru: e.target.value })}
                />
              </div>

              {modalEditProfilUser.userTarget?.peran !== 'Admin' && modalEditProfilUser.userTarget?.peran !== 'Superadmin' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Bidang / Unit Kerja</label>
                  <input
                    type="text"
                    placeholder="Bidang Cadangan dan Distribusi Pangan"
                    className="field-input-box"
                    value={modalEditProfilUser.bidangBaru}
                    onChange={(e) => setModalEditProfilUser({ ...modalEditProfilUser, bidangBaru: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalEditProfilUser({ buka: false, userTarget: null, namaBaru: '', bidangBaru: '', pesan: '' })}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#8b1e1e', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Simpan Profil
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
            zIndex: 1200,
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
              maxHeight: '90dvh',
              overflowY: 'auto',
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
                  {/* Input Berkas Foto Tersembunyi */}
                  <input
                    type="file"
                    ref={inputBerkasFotoRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePilihBerkasFoto}
                  />

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => inputBerkasFotoRef.current?.click()}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📁 Unggah dari Perangkat
                    </button>

                    <button
                      type="button"
                      onClick={handleSimpanFotoProfil}
                      style={{
                        background: '#8b1e1e',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Simpan Foto
                    </button>
                  </div>

                  <input
                    type="url"
                    placeholder="Atau tempel tautan gambar web (opsional)..."
                    className="field-input-box"
                    value={inputFotoUrl.startsWith('data:') ? 'Foto terpilih dari galeri/perangkat (Base64)' : inputFotoUrl}
                    onChange={(e) => setInputFotoUrl(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
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
      {/* ─────────────────────────────────────────────
          MODAL UBAH DATA HARGA PANGAN OLEH KEPALA BIDANG
          ───────────────────────────────────────────── */}
      {modalEditKabid.buka && modalEditKabid.item && (
        <div
          className="modal-overlay-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setModalEditKabid({ buka: false, item: null, form: { nama_komoditas: '', kategori: 'Bahan Pokok', satuan: daftarSatuan[0] || '1 KG', harga: '', nama_pasar: '', status: 'Terbit' } })}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#8b1e1e', letterSpacing: '0.5px' }}>
                  Kewenangan Kepala Bidang
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', color: '#0f172a' }}>
                  ✏️ Ubah Data Harga Komoditas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEditKabid({ buka: false, item: null, form: { nama_komoditas: '', kategori: 'Bahan Pokok', satuan: daftarSatuan[0] || '1 KG', harga: '', nama_pasar: '', status: 'Terbit' } })}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSimpanEditKabid(e)} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nama Komoditas / Varian Resmi (Master Admin)
                </label>
                <select
                  required
                  className="field-select-box"
                  value={modalEditKabid.form.nama_komoditas}
                  onChange={(e) => handlePilihKomoditasKabid(e.target.value)}
                >
                  <option value="">-- Pilih Komoditas / Varian Resmi --</option>
                  {grupKomoditasDropdown.map((grup) => (
                    <optgroup key={grup.kelompok} label={`🌾 ${grup.kelompok}`}>
                      {grup.items.map((k) => (
                        <option key={k.nama_komoditas} value={k.nama_komoditas}>
                          {k.nama_komoditas} ({k.satuan_bawaan})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {modalEditKabid.form.nama_komoditas &&
                    !daftarMasterKomoditas.some(
                      (k) => k.nama_komoditas.toLowerCase() === modalEditKabid.form.nama_komoditas.toLowerCase()
                    ) && (
                      <optgroup label="Data Sebelumnya">
                        <option value={modalEditKabid.form.nama_komoditas}>{modalEditKabid.form.nama_komoditas}</option>
                      </optgroup>
                    )}
                </select>
              </div>

              <div className="modal-two-col-grid" style={{ marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Kategori
                  </label>
                  <select
                    className="field-select-box"
                    value={modalEditKabid.form.kategori}
                    onChange={(e) => setModalEditKabid({
                      ...modalEditKabid,
                      form: { ...modalEditKabid.form, kategori: e.target.value }
                    })}
                  >
                    <option value="Bahan Pokok">Bahan Pokok</option>
                    <option value="Hewani">Hewani</option>
                    <option value="Sayuran">Sayuran</option>
                    <option value="Buah">Buah</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Satuan Resmi (Terkunci per 1 • Master Admin)
                  </label>
                  <select
                    className="field-select-box"
                    value={modalEditKabid.form.satuan}
                    onChange={(e) => setModalEditKabid({
                      ...modalEditKabid,
                      form: { ...modalEditKabid.form, satuan: e.target.value }
                    })}
                  >
                    {Array.from(new Set([...daftarSatuan, modalEditKabid.form.satuan].filter(Boolean))).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-two-col-grid" style={{ marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Harga Acuan (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Contoh: 15000 (hanya angka)"
                    className="field-input-box"
                    value={modalEditKabid.form.harga}
                    onKeyDown={hanyaBolehAngka}
                    onChange={(e) => setModalEditKabid({
                      ...modalEditKabid,
                      form: { ...modalEditKabid.form, harga: e.target.value.replace(/[^0-9]/g, '') }
                    })}
                  />
                  {modalEditKabid.form.harga && (
                    <small style={{ color: '#059669', fontWeight: 600, fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                      Terformat: {formatRupiah(parseInt(modalEditKabid.form.harga, 10))}
                    </small>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Pasar
                  </label>
                  <select
                    className="field-select-box"
                    value={modalEditKabid.form.nama_pasar}
                    onChange={(e) => setModalEditKabid({
                      ...modalEditKabid,
                      form: { ...modalEditKabid.form, nama_pasar: e.target.value }
                    })}
                  >
                    {daftarPasar.map((pasar, idx) => (
                      <option key={idx} value={pasar}>{pasar}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Status Publikasi Komoditas
                </label>
                <select
                  className="field-select-box"
                  value={modalEditKabid.form.status}
                  onChange={(e) => setModalEditKabid({
                    ...modalEditKabid,
                    form: { ...modalEditKabid.form, status: e.target.value }
                  })}
                >
                  <option value="Terbit">Terbit (Ditampilkan ke Publik Masyarakat)</option>
                  <option value="Draft">Draft (Ditahan sebagai Draf Usulan)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalEditKabid({ buka: false, item: null, form: { nama_komoditas: '', kategori: 'Bahan Pokok', satuan: daftarSatuan[0] || '1 KG', harga: '', nama_pasar: '', status: 'Terbit' } })}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ Simpan Perubahan Harga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          22. MODAL LIHAT DETAIL WARGA PENDAFTAR GPM
          (Dapat diakses Kadis, Admin, dan Superadmin)
          ───────────────────────────────────────────── */}
      {modalDetailWarga.buka && modalDetailWarga.acara && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
          onClick={() => setModalDetailWarga({ buka: false, acara: null, pencarian: '' })}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '960px',
              width: '100%',
              maxHeight: '90dvh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#8b1e1e', fontSize: '1.2rem' }}>
                  👥 Rincian Pendaftar Warga: {modalDetailWarga.acara.nama_acara}
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  📍 {modalDetailWarga.acara.lokasi} (Kec. {modalDetailWarga.acara.kecamatan}) · 📅 {modalDetailWarga.acara.tanggal} ({modalDetailWarga.acara.jam_mulai || '08:00'} - {modalDetailWarga.acara.jam_selesai || '13:00'} WITA)
                </p>
              </div>
              <button
                onClick={() => setModalDetailWarga({ buka: false, acara: null, pencarian: '' })}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            {/* Statistik Ringkas Pendaftar */}
            {(() => {
              const listWarga = Array.isArray(daftarPendaftarGPM)
                ? daftarPendaftarGPM
                : (Array.isArray(daftarPendaftarGPM?.data) ? daftarPendaftarGPM.data : []);
              const pendaftarAcara = listWarga.filter(p => String(p.acara_id) === String(modalDetailWarga.acara.id));
              const satuanModal = modalDetailWarga.acara.satuan_penerima || (String(modalDetailWarga.acara.mode_penerima || 'individu').toLowerCase() === 'keluarga' ? 'KK' : 'Warga');
              const totalTerdaftar = Math.max(pendaftarAcara.length, modalDetailWarga.acara.terdaftar || 0);
              const totalHadir = pendaftarAcara.filter(p => p.status_kehadiran === 'Hadir').length || (modalDetailWarga.acara.terlayani || 0);
              const totalBelum = Math.max(0, totalTerdaftar - totalHadir);

              const pendaftarTersaring = pendaftarAcara.filter(p => {
                if (!modalDetailWarga.pencarian) return true;
                const cari = modalDetailWarga.pencarian.toLowerCase();
                const nama = (p.nama_pendaftar || p.nama_lengkap || p.nama_bersih || p.nama || '').toLowerCase();
                const nik = (p.nik || '').toLowerCase();
                const telp = (p.nomor_telepon || '').toLowerCase();
                return nama.includes(cari) || nik.includes(cari) || telp.includes(cari);
              });

              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Target Alokasi Kuota</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{modalDetailWarga.acara.target_kuota} {satuanModal}</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>Terdaftar</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e40af' }}>{totalTerdaftar} {satuanModal}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#166534' }}>Hadir (Terlayani)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>{totalHadir} {satuanModal}</div>
                    </div>
                    <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Belum Hadir</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>{totalBelum} {satuanModal}</div>
                    </div>
                  </div>

                  {/* Filter & Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <input
                      type="text"
                      placeholder="🔍 Cari warga berdasarkan Nama, NIK 16 digit, atau No. HP..."
                      className="field-input-box"
                      value={modalDetailWarga.pencarian}
                      onChange={(e) => setModalDetailWarga(prev => ({ ...prev, pencarian: e.target.value }))}
                      style={{ maxWidth: '400px', fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => gpmService.eksporKeExcel(modalDetailWarga.acara, pendaftarAcara, { nama: ambilNamaPenandatangan(peran === 'Kabid' ? 'Kabid' : 'Kadis') })}
                        style={{
                          background: '#166534',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        📊 Unduh Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalDetailWarga({ buka: false, acara: null, pencarian: '' });
                          handleCetakDokumen({ jenis: 'kadis-gpm-acara', acara: modalDetailWarga.acara, pendaftar: pendaftarAcara });
                        }}
                        style={{
                          background: '#8b1e1e',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        🖨️ Cetak Rekap Acara
                      </button>
                    </div>
                  </div>

                  {/* Tabel Pendaftar Warga */}
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>No.</th>
                          <th style={{ padding: '8px 10px' }}>No. Antrean</th>
                          <th style={{ padding: '8px 10px' }}>NIK (16 Digit)</th>
                          <th style={{ padding: '8px 10px' }}>Nama Lengkap Warga</th>
                          <th style={{ padding: '8px 10px' }}>Jalur</th>
                          <th style={{ padding: '8px 10px' }}>Nomor Telepon</th>
                          <th style={{ padding: '8px 10px' }}>Status Kehadiran</th>
                          <th style={{ padding: '8px 10px' }}>Waktu Hadir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendaftarTersaring.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                              Tidak ditemukan data pendaftar warga untuk kegiatan ini.
                            </td>
                          </tr>
                        ) : (
                          pendaftarTersaring.map((w, idx) => (
                            <tr key={w.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 800, color: '#8b1e1e' }}>
                                #{String(w.nomor_antrean || idx + 1).padStart(3, '0')}
                              </td>
                              <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                                {w.nik || '-'}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                                {w.nama_pendaftar || w.nama_lengkap || w.nama_bersih || w.nama || '-'}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: (w.jalur_pendaftaran || '').toLowerCase() === 'langsung' ? '#f0fdf4' : '#eff6ff',
                                  color: (w.jalur_pendaftaran || '').toLowerCase() === 'langsung' ? '#166534' : '#1e40af'
                                }}>
                                  {w.jalur_pendaftaran || 'Daring'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>{w.nomor_telepon || '-'}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: w.status_kehadiran === 'Hadir' ? '#dcfce7' : '#fef3c7',
                                  color: w.status_kehadiran === 'Hadir' ? '#166534' : '#92400e'
                                }}>
                                  {w.status_kehadiran === 'Hadir' ? 'Hadir' : 'Menunggu'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: '#64748b' }}>
                                {w.waktu_kehadiran ? new Date(w.waktu_kehadiran).toLocaleString('id-ID') : (w.status_kehadiran === 'Hadir' ? 'Terverifikasi di Lokasi' : '-')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          23. MODAL PILIHAN CETAK REKAPITULASI GPM (KADIS & SUPERADMIN)
          ───────────────────────────────────────────── */}
      {modalPilihanCetakGPM.buka && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
          onClick={() => setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' })}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#8b1e1e', fontSize: '1.1rem' }}>🖨️ Cetak Rekapitulasi GPM Resmi</h3>
              <button
                onClick={() => setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' })}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#64748b' }}>
              Tentukan format laporan Gerakan Pangan Murah (GPM) yang ingin dicetak ke dokumen resmi PDF:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '8px', border: modalPilihanCetakGPM.mode === 'semua' ? '2px solid #8b1e1e' : '1px solid #cbd5e1', background: modalPilihanCetakGPM.mode === 'semua' ? '#fff5f5' : '#ffffff', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="modeCetakGPM"
                  checked={modalPilihanCetakGPM.mode === 'semua'}
                  onChange={() => setModalPilihanCetakGPM(prev => ({ ...prev, mode: 'semua' }))}
                  style={{ marginTop: '3px', accentColor: '#8b1e1e' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#1e293b' }}>1. Rekapitulasi Seluruh Kegiatan GPM</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mencetak rangkuman laporan seluruh titik pelaksanaan GPM Kota Manado, serapan kuota, dan status kegiatan.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '8px', border: modalPilihanCetakGPM.mode === 'acara' ? '2px solid #8b1e1e' : '1px solid #cbd5e1', background: modalPilihanCetakGPM.mode === 'acara' ? '#fff5f5' : '#ffffff', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="modeCetakGPM"
                  checked={modalPilihanCetakGPM.mode === 'acara'}
                  onChange={() => setModalPilihanCetakGPM(prev => ({ ...prev, mode: 'acara' }))}
                  style={{ marginTop: '3px', accentColor: '#8b1e1e' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#1e293b' }}>2. Rekapitulasi & Rincian Warga Titik Tertentu</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mencetak laporan spesifik satu lokasi GPM beserta rincian lengkap daftar hadir warga pendaftar.</span>

                  {modalPilihanCetakGPM.mode === 'acara' && (
                    <div style={{ marginTop: '10px' }}>
                      <select
                        value={modalPilihanCetakGPM.acaraId}
                        onChange={(e) => setModalPilihanCetakGPM(prev => ({ ...prev, acaraId: e.target.value }))}
                        className="field-input-box"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Pilih Titik Pelaksanaan GPM --</option>
                        {rekapitulasiGPMList.map(a => (
                          <option key={a.id} value={a.id}>{a.nama_acara} ({a.kecamatan})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' })}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modalPilihanCetakGPM.mode === 'acara') {
                    const target = rekapitulasiGPMList.find(a => a.id === modalPilihanCetakGPM.acaraId) || rekapitulasiGPMList[0];
                    if (!target) {
                      alert('Silakan pilih kegiatan GPM terlebih dahulu!');
                      return;
                    }
                    const listWarga = Array.isArray(daftarPendaftarGPM)
                      ? daftarPendaftarGPM
                      : (Array.isArray(daftarPendaftarGPM?.data) ? daftarPendaftarGPM.data : []);
                    const pendaftarAcara = listWarga.filter(p => String(p.acara_id) === String(target.id));
                    setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' });
                    handleCetakDokumen({ jenis: 'kadis-gpm-acara', acara: target, pendaftar: pendaftarAcara });
                  } else {
                    setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' });
                    handleCetakDokumen({
                      jenis: 'kadis-gpm-semua',
                      data: daftarGpmKadisTerfilter,
                      filter: {
                        ...filterLaporanGPMKadis,
                        labelPeriode: berandaKadisService.labelPeriode(filterLaporanGPMKadis.periode)
                      }
                    });
                  }
                }}
                style={{ background: '#8b1e1e', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                🖨️ Mulai Cetak PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          23B. MODAL DETAIL PAKET PENGAJUAN BATCH (STAF / KABID)
          ───────────────────────────────────────────── */}
      {detailPengajuanBatch && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setDetailPengajuanBatch(null)}
        >
          <div
            style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: '22px', boxShadow: '0 20px 45px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.08rem', color: '#0f172a' }}>
                  📋 Rincian Paket Pengajuan Harga
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
                  📍 <strong>{detailPengajuanBatch.nama_pasar}</strong> · 📅 {detailPengajuanBatch.tanggal_tampil} · 👤 {detailPengajuanBatch.nama_petugas}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPengajuanBatch(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}
              >
                ✕ Tutup
              </button>
            </div>

            {detailPengajuanBatch.catatan_verifikasi && (
              <div className={`staf-sub-note ${detailPengajuanBatch.status === 'Ditolak' ? 'is-reject' : ''}`} style={{ marginBottom: '14px' }}>
                💬 <strong>Catatan Kepala Bidang ({pengajuanHargaService.formatLabelStatus(detailPengajuanBatch.status)}):</strong> {detailPengajuanBatch.catatan_verifikasi}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="fast-entry-table">
                <thead>
                  <tr>
                    <th>Komoditas</th>
                    <th>Satuan</th>
                    <th>Harga Sebelumnya</th>
                    <th>Harga Pangan</th>
                    <th>Perubahan</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailPengajuanBatch.items || []).map((it) => {
                    const selisih = it.harga_lama !== null && it.harga_lama !== undefined
                      ? Number(it.harga) - Number(it.harga_lama)
                      : null;
                    return (
                      <tr key={it.id}>
                        <td>
                          <strong>{it.nama_komoditas}</strong>
                          <div className="fast-row-sub">{it.kategori}</div>
                        </td>
                        <td>{it.satuan}</td>
                        <td>{it.harga_lama !== null && it.harga_lama !== undefined ? formatRupiah(it.harga_lama) : <span className="fast-badge-none">Baru</span>}</td>
                        <td style={{ fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(it.harga)}</td>
                        <td>
                          {selisih === null ? (
                            <span className="fast-diff-pill is-new">✨ Baru</span>
                          ) : selisih > 0 ? (
                            <span className="fast-diff-pill is-up">▲ +{formatRupiah(selisih)}</span>
                          ) : selisih < 0 ? (
                            <span className="fast-diff-pill is-down">▼ -{formatRupiah(Math.abs(selisih))}</span>
                          ) : (
                            <span className="fast-diff-pill is-same">Tetap</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {isKabid && detailPengajuanBatch.status === 'Diajukan' && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="kabid-btn-reject-sm"
                  style={{ padding: '10px 16px', fontSize: '0.84rem' }}
                  disabled={sedangMenyimpan}
                  onClick={() => {
                    const target = detailPengajuanBatch;
                    setDetailPengajuanBatch(null);
                    setModalTolakBatch({ buka: true, pengajuan: target, catatan: '' });
                  }}
                >
                  ✕ Tolak dengan Catatan
                </button>
                <button
                  type="button"
                  className="kabid-btn-bulk-approve"
                  disabled={sedangMenyimpan}
                  onClick={() => handleSetujuiPengajuanBatch(detailPengajuanBatch)}
                >
                  ✓ Setujui &amp; Terbitkan Semua ({detailPengajuanBatch.items?.length || 0})
                </button>
              </div>
            )}

            {isStaf && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                {detailPengajuanBatch.status === 'Diverifikasi' ? (
                  <button
                    type="button"
                    className="staf-btn-primary"
                    onClick={() => handleBukaDokumenUntukUbah(detailPengajuanBatch, true)}
                  >
                    📋 Salin ke Pengajuan Baru
                  </button>
                ) : (
                  <button
                    type="button"
                    className="staf-btn-primary"
                    onClick={() => handleBukaDokumenUntukUbah(detailPengajuanBatch)}
                  >
                    {detailPengajuanBatch.status === 'Ditolak'
                      ? '🔄 Muat Paket untuk Revisi'
                      : '✏️ Buka di Form untuk Diubah'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          23C. MODAL TOLAK PAKET PENGAJUAN DENGAN CATATAN (KABID)
          ───────────────────────────────────────────── */}
      {modalTolakBatch.buka && modalTolakBatch.pengajuan && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setModalTolakBatch({ buka: false, pengajuan: null, catatan: '' })}
        >
          <div
            style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '22px', boxShadow: '0 20px 45px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b' }}>✕ Tolak Pengajuan Harga Pasar</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#475569' }}>
              Paket <strong>{modalTolakBatch.pengajuan.nama_pasar}</strong> ({modalTolakBatch.pengajuan.tanggal_tampil}) akan dikembalikan ke Staf untuk direvisi. Harga publik yang sudah terbit tetap aman.
            </p>
            <form onSubmit={handleEksekusiTolakBatch}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                Catatan / Alasan Revisi untuk Staf *
              </label>
              <textarea
                rows={3}
                required
                className="field-input-box"
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: '14px' }}
                placeholder="Contoh: Mohon cek ulang harga Cabai Rawit Merah, tampak terlalu jauh dari rata-rata pasar lain."
                value={modalTolakBatch.catatan}
                onChange={(e) => setModalTolakBatch((prev) => ({ ...prev, catatan: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-simpan-draft"
                  onClick={() => setModalTolakBatch({ buka: false, pengajuan: null, catatan: '' })}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="verif-btn-tolak"
                  disabled={sedangMenyimpan}
                  style={{ padding: '10px 18px' }}
                >
                  {sedangMenyimpan ? 'Memproses...' : 'Kirim Penolakan & Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
