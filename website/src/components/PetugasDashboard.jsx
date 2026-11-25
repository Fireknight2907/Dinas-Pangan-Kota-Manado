// ===================================================================================
// MODUL ANTARMUKA DASHBOARD PETUGAS DINAS PANGAN KOTA MANADO (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Pemerintah Kota Manado
// Mengimplementasikan Role-Based Access Control (RBAC) ketat:
// 1. Admin : Menu Edit User, Master Pasar & Wilayah, Dashboard, Menu Cek GPM
// 2. Kabid : Laporan Khusus Bidang, Menu Verif Harga Pangan, Dashboard, Menu Kelola GPM
// 3. Staf  : Menu Kelola GPM, Dashboard, Menu Input Data Pangan
// 4. Kadis : Dashboard Eksekutif, Laporan GPM, Grafik Pangan (Tren Fluktuasi)
// ===================================================================================

import React, { useState, useEffect, useRef } from 'react';
import { penggunaService } from '../services/PenggunaService';
import { hargaPanganService } from '../services/HargaPanganService';
import { masterDataService } from '../services/MasterDataService';
import { analisisHargaService } from '../services/AnalisisHargaService';
import { laporanService } from '../services/LaporanService';
import { gpmService } from '../services/GPMService';
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
  const [daftarSatuan, setDaftarSatuan] = useState(['1 KG', '1 Liter']);
  const [daftarPasar, setDaftarPasar] = useState([]);
  const [daftarPasarLengkap, setDaftarPasarLengkap] = useState([]);
  const [daftarKecamatan, setDaftarKecamatan] = useState([]);

  // Form Input Harga (Khusus Staf — Komoditas & Satuan terkunci dari Master Admin)
  const [idEditHarga, setIdEditHarga] = useState(null);
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

  // State Grafik Pangan (Khusus Kadis)
  const [komoditasTren, setKomoditasTren] = useState('Beras Medium');
  const [periodeTren, setPeriodeTren] = useState('7hari');
  const [pasarTren, setPasarTren] = useState('Semua');
  const [dataTren, setDataTren] = useState(null);

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

  // State Dokumen Cetak Resmi Anti-Blank
  const [dataCetakResmi, setDataCetakResmi] = useState(null);

  // Ref Input Unggah Berkas Foto Profil dari Perangkat
  const inputBerkasFotoRef = useRef(null);

  // ─────────────────────────────────────────────
  // 2. SIKLUS HIDUP & PEMUATAN DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    muatDataDashboard();
    muatMasterData();

    if (isKadis) {
      const tren = laporanService.ambilDataTrenKomoditas(komoditasTren, periodeTren, pasarTren, daftarHarga);
      setDataTren(tren);
    }
  }, [peran]);

  useEffect(() => {
    if (isKadis) {
      const tren = laporanService.ambilDataTrenKomoditas(komoditasTren, periodeTren, pasarTren, daftarHarga);
      setDataTren(tren);
    }
  }, [komoditasTren, periodeTren, pasarTren, daftarHarga]);

  const muatDataDashboard = async () => {
    try {
      const stats = await hargaPanganService.ambilStatistikDashboard();
      if (stats) setStatsDashboard(stats);

      const items = await hargaPanganService.ambilSemua();
      setDaftarHarga(Array.isArray(items) ? items : []);

      const acara = await gpmService.ambilSemuaAcara();
      setDaftarAcaraGPM(Array.isArray(acara) ? acara : []);

      const pendaftarRes = await gpmService.ambilPendaftarAcara();
      const listPendaftar = Array.isArray(pendaftarRes)
        ? pendaftarRes
        : (Array.isArray(pendaftarRes?.data) ? pendaftarRes.data : []);
      setDaftarPendaftarGPM(listPendaftar);

      const users = isAdmin ? await penggunaService.ambilSemuaPengguna() : [];
      muatNotifikasiDinamis(items, acara, users);

      if (isKadis) {
        const tren = laporanService.ambilDataTrenKomoditas(komoditasTren, periodeTren, pasarTren, items);
        setDataTren(tren);
      }
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
  const muatNotifikasiDinamis = (hargaList, acaraList, usersList) => {
    const notifs = [];
    const itemsHarga = hargaList || daftarHarga || [];
    const acaraGPM = acaraList || daftarAcaraGPM || [];
    const users = usersList || daftarPengguna || [];

    if (isKabid) {
      const draftCount = itemsHarga.filter(i => (i.status || '').toLowerCase() === 'draft').length;
      if (draftCount > 0) {
        notifs.push({
          id: 'notif-kabid-draft',
          judul: '📝 Verifikasi Harga Pangan',
          pesan: `Terdapat ${draftCount} usulan harga draf dari staf menunggu verifikasi & persetujuan Anda.`,
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
      const gpmSelesai = acaraGPM.filter(a => a.status === 'Selesai');
      if (gpmSelesai.length > 0) {
        notifs.push({
          id: 'notif-kadis-gpm-selesai',
          judul: '📊 Laporan Pelaksanaan GPM',
          pesan: `Kegiatan "${gpmSelesai[0].nama_acara}" selesai dengan ${gpmSelesai[0].terlayani || 0} warga terlayani. Laporan siap dievaluasi.`,
          waktu: 'Hari ini',
          target: 'laporan-gpm'
        });
      }
      notifs.push({
        id: 'notif-kadis-tren',
        judul: '📈 Fluktuasi Harga Pasar',
        pesan: 'Grafik komoditas diperbarui otomatis dari 15 data pangan pokok di pasar Manado.',
        waktu: 'Terkini',
        target: 'grafik-pangan'
      });
    }

    if (isStaf) {
      const terbitCount = itemsHarga.filter(i => (i.status || '').toLowerCase() === 'terbit').length;
      const draftCount = itemsHarga.filter(i => (i.status || '').toLowerCase() === 'draft').length;
      notifs.push({
        id: 'notif-staf-status',
        judul: '📢 Status Publikasi Komoditas',
        pesan: `${terbitCount} komoditas tampil di publik.${draftCount > 0 ? ` ${draftCount} draf sedang ditelaah pimpinan.` : ' Seluruh usulan harga terbit.'}`,
        waktu: 'Terkini',
        target: 'input-harga'
      });
      const gpmAktif = acaraGPM.find(a => a.status === 'Aktif' || a.status === 'Berlangsung');
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
        pesan: `Sistem mencatat ${users.length || 4} akun kedinasan aktif dan ${acaraGPM.length} agenda GPM dalam basis data.`,
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

  // Staf: Menyimpan harga komoditas (komoditas & satuan terkunci dari Master Admin)
  const handleMulaiEditStaf = (item) => {
    setIdEditHarga(item.id);
    setFormHarga({
      nama_komoditas: item.nama_komoditas,
      kategori: item.kategori || 'Bahan Pokok',
      satuan: formatSatuanTampil(item.satuan) || daftarSatuan[0] || '1 KG',
      harga: String(item.harga ? Math.round(item.harga) : '').replace(/[^0-9]/g, ''),
      nama_pasar: item.nama_pasar || (daftarPasar[0] || 'Pasar Bersehati Karombasan'),
      status: item.status || 'Draft',
      prioritas_tampil: Number(item.prioritas_tampil) || 50
    });
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleBatalEditStaf = () => {
    setIdEditHarga(null);
    setFormHarga({
      nama_komoditas: '',
      kategori: 'Bahan Pokok',
      satuan: daftarSatuan[0] || '1 KG',
      harga: '',
      nama_pasar: daftarPasar[0] || 'Pasar Bersehati Karombasan',
      status: 'Draft',
      prioritas_tampil: 50
    });
  };

  // Simpan harga komoditas (Staf: 1 tombol pengajuan ke verifikasi Kabid)
  const handleSimpanHarga = async (e, statusBaru = 'Draft') => {
    if (e) e.preventDefault();

    if (!formHarga.nama_komoditas.trim()) {
      alert('Silakan pilih nama komoditas resmi terlebih dahulu!');
      return;
    }

    const hargaAngka = parseInt(String(formHarga.harga).replace(/[^0-9]/g, ''), 10);
    if (!hargaAngka || hargaAngka <= 0) {
      alert('Besaran harga acuan wajib diisi dengan angka bulat positif lebih dari 0!');
      return;
    }

    const satuanGabungan = formatSatuanTampil(formHarga.satuan || daftarSatuan[0] || '1 KG');
    const masterCocok = daftarMasterKomoditas.find(
      (k) => k.nama_komoditas.toLowerCase() === formHarga.nama_komoditas.trim().toLowerCase()
    );
    const prioritasFinal = Number(masterCocok?.prioritas_tampil || formHarga.prioritas_tampil) || 50;

    // Staf wajib verifikasi: simpan baru maupun edit selalu menghasilkan 'Draft' (Ajukan Harga)
    const statusFinal = (peran === 'Staf') ? 'Draft' : statusBaru;

    setSedangMenyimpan(true);
    try {
      const payload = {
        nama_komoditas: formHarga.nama_komoditas.trim(),
        kategori: formHarga.kategori,
        satuan: satuanGabungan,
        harga: hargaAngka,
        nama_pasar: formHarga.nama_pasar,
        status: statusFinal,
        prioritas_tampil: prioritasFinal,
        tanggal_penetapan: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      };

      if (idEditHarga) {
        await hargaPanganService.perbarui(idEditHarga, payload);
        tampilkanPesan(`✅ Perubahan data "${formHarga.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan ke Kepala Bidang untuk diverifikasi.`);
        setIdEditHarga(null);
      } else {
        await hargaPanganService.tambah(payload);
        tampilkanPesan(`✅ Pengajuan harga "${formHarga.nama_komoditas}" (${satuanGabungan} - ${formatRupiah(hargaAngka)}) berhasil diajukan ke Kepala Bidang untuk diverifikasi.`);
      }

      // Reset form
      setFormHarga({
        nama_komoditas: '',
        kategori: 'Bahan Pokok',
        satuan: daftarSatuan[0] || '1 KG',
        harga: '',
        nama_pasar: daftarPasar[0] || 'Pasar Bersehati Karombasan',
        status: 'Draft',
        prioritas_tampil: 50
      });

      await muatDataDashboard();
    } catch (error) {
      alert('Gagal menyimpan harga: ' + error.message);
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
        nama_pasar: item.nama_pasar || (daftarPasar[0] || 'Pasar Bersehati Karombasan'),
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

  // Kabid: Verifikasi harga (Draft -> Terbit atau sebaliknya)
  const handleVerifikasiHarga = async (item, statusBaru) => {
    try {
      await hargaPanganService.perbarui(item.id, { status: statusBaru });
      tampilkanPesan(statusBaru === 'Terbit'
        ? `✅ Komoditas "${item.nama_komoditas}" telah diverifikasi dan resmi terbit ke publik!`
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

  // Cetak Dokumen Resmi Anti-Blank dengan Kop Surat Pemkot Manado
  const handleCetakDokumen = (konfigurasi) => {
    setDataCetakResmi(konfigurasi);
    setTimeout(() => {
      window.print();
    }, 250);
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

  const rekapitulasiGPMList = listAcaraAman.map(a => {
    const pendaftarAcara = listPendaftarAman.filter(p => p.acara_id === a.id);
    const terdaftarCount = Math.max(pendaftarAcara.length, a.terdaftar || 0);
    const terlayaniCount = pendaftarAcara.filter(p => p.status_kehadiran === 'Hadir').length || (a.terlayani || 0);
    return {
      id: a.id,
      nama_acara: a.nama_acara,
      lokasi: a.lokasi,
      kecamatan: a.kecamatan || 'Wenang',
      tanggal: a.tanggal,
      jam_mulai: a.jam_mulai,
      jam_selesai: a.jam_selesai,
      target_kuota: a.kuota_maksimal || 250,
      terdaftar: terdaftarCount,
      terlayani: terlayaniCount,
      status: a.status || 'Aktif',
      komoditas_tersedia: a.komoditas_tersedia || 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg',
      daftar_warga: pendaftarAcara
    };
  });
  const daftarDraftVerifikasi = (Array.isArray(daftarHarga) ? daftarHarga : []).filter(item => item && (item.status || '').toLowerCase() === 'draft');
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
                      const updated = hargaPanganService.tandaiSemuaDibaca();
                      setDaftarNotif(updated);
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
                            if (targetTujuan === 'gpm-petugas') {
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
            9. VIEW 1: DASHBOARD (SEMUA ROLE)
            ───────────────────────────────────────────── */}
        {menuAktif === 'dashboard' && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">
                Beranda {namaLengkapPeran(peran)} — Bidang Cadangan & Distribusi Pangan
              </h1>
              <p className="dashboard-main-subheading">
                Sistem Informasi Terpadu Dinas Pangan Kota Manado — Pemantauan stabilitas pasokan komoditas dan Gerakan Pangan Murah
              </p>
            </div>

            <div className="dashboard-stat-cards-grid">
              <div className="stat-card-white">
                <div className="stat-icon-square icon-pink">🏷️</div>
                <div className="stat-number-big">{statsDashboard.harga_ditetapkan}</div>
                <div className="stat-title-label">Harga Terbit</div>
                <div className="stat-caption-sub">tampil ke masyarakat</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-amber">📝</div>
                <div className="stat-number-big">{daftarDraftVerifikasi.length}</div>
                <div className="stat-title-label">Draf Menunggu Verifikasi</div>
                <div className="stat-caption-sub">verifikasi Kepala Bidang</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-blue">🎟️</div>
                <div className="stat-number-big">{statsDashboard.gpm_terjadwal}</div>
                <div className="stat-title-label">GPM Terjadwal</div>
                <div className="stat-caption-sub">titik lokasi aktif</div>
              </div>

              <div className="stat-card-white">
                <div className="stat-icon-square icon-green">✅</div>
                <div className="stat-number-big">{statsDashboard.gpm_selesai}</div>
                <div className="stat-title-label">GPM Terlaksana</div>
                <div className="stat-caption-sub">kuota tersalurkan</div>
              </div>
            </div>

            {/* Quick Access Card Dinamis Berdasarkan Role */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '14px' }}>
                Pintasan Menu Utama {namaLengkapPeran(peran)}:
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {/* Superadmin Full Access Quick Cards */}
                {isSuperadmin && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('input-harga')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📝 Input Harga Komoditas</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Akses modul pengusulan dan penginputan harga pangan.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('verif-harga')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>✅ Verifikasi Harga Kabid</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Tinjau dan sahkan usulan harga komoditas menjadi Terbit.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🎟️ Kelola & Pindai GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Jadwal GPM, scan QR, dan tambah peserta manual.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('grafik-pangan')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📈 Grafik Pangan Kadis</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pantau tren grafik fluktuasi harga komoditas pangan.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-user')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>👥 Manajemen Pengguna</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Kelola seluruh akun, tambah akun, dan atur peran sistem.</p>
                    </div>
                  </>
                )}

                {/* Admin Quick Cards */}
                {peran === 'Admin' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-user')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>👥 Menu Kelola Pengguna</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Kelola nama pengguna, atur ulang kata sandi pengguna lain, dan atur peran sistem.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('master-data')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🏛️ Master Pasar & Wilayah</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Atur daftar pasar resmi dan wilayah kecamatan di Kota Manado.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('cek-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🔍 Menu Cek GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Supervisi jadwal, titik peta lokasi, dan pendaftar Gerakan Pangan Murah.</p>
                    </div>
                  </>
                )}

                {/* Kabid Quick Cards */}
                {peran === 'Kabid' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('verif-harga')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>✅ Menu Verifikasi Harga Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Tinjau dan setujui usulan harga pasar yang dimasukkan oleh staf lapangan.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🎟️ Menu Kelola GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Atur titik koordinat peta lokasi dan penetapan kuota komoditas murah.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📑 Laporan Bidang Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cetak laporan resmi distribusi dan cadangan pangan Pemerintah Kota Manado.</p>
                    </div>
                  </>
                )}

                {/* Staf Quick Cards */}
                {peran === 'Staf' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('input-harga')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📝 Menu Masukan Data Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Masukan harga komoditas terkini dari pasar tradisional untuk diajukan verifikasi.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('kelola-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>🎟️ Menu Kelola GPM & Pindai QR</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Operasional lapangan, verifikasi tiket QR warga penerima manfaat kupon pangan.</p>
                    </div>
                  </>
                )}

                {/* Kadis Quick Cards */}
                {peran === 'Kadis' && (
                  <>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('grafik-pangan')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📈 Grafik Pangan</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pantau tren fluktuasi harga komoditas (7 hari, 30 hari, 3 bulan) di pasar Manado.</p>
                    </div>
                    <div className="stat-card-white" style={{ cursor: 'pointer' }} onClick={() => setMenuAktif('laporan-gpm')}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#8b1e1e' }}>📋 Laporan GPM</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Rekapitulasi pencapaian kuota pangan dan serapan program Gerakan Pangan Murah.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            10. VIEW 2: MENU INPUT DATA PANGAN (KHUSUS STAF / SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'input-harga' && isStaf && (
          <div className="tetapkan-harga-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">Menu Masukan Data Pangan</h1>
              <p className="dashboard-main-subheading">
                Petugas staf memasukan pencatatan harga pangan acuan pasar terkini untuk diajukan ke Kepala Bidang.
              </p>
            </div>

            <div className="tetapkan-content-columns">
              <div className="tetapkan-form-card">
                <h3 className="form-card-heading">{idEditHarga ? "✏️ Ubah Data Komoditas" : "Formulir Masukan Data Komoditas"}</h3>
                <form onSubmit={(e) => handleSimpanHarga(e, 'Draft')} className="price-entry-form">
                  <div className="form-field-group">
                    <label className="field-label-text">Nama Komoditas / Varian Resmi (Master Admin)</label>
                    <select
                      required
                      className="field-select-box"
                      value={formHarga.nama_komoditas}
                      onChange={(e) => handlePilihKomoditasStaf(e.target.value)}
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
                      {formHarga.nama_komoditas &&
                        !daftarMasterKomoditas.some(
                          (k) => k.nama_komoditas.toLowerCase() === formHarga.nama_komoditas.toLowerCase()
                        ) && (
                          <optgroup label="Data Sebelumnya">
                            <option value={formHarga.nama_komoditas}>{formHarga.nama_komoditas}</option>
                          </optgroup>
                        )}
                    </select>
                    <small style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '4px', display: 'block' }}>
                      Kategori & satuan otomatis terisi dari Master Komoditas Admin agar penulisan varian seragam di semua pasar.
                    </small>
                  </div>

                  <div className="form-two-cols-row">
                    <div className="form-field-group">
                      <label className="field-label-text">Kategori</label>
                      <select
                        className="field-select-box"
                        value={formHarga.kategori}
                        onChange={(e) => setFormHarga({ ...formHarga, kategori: e.target.value })}
                      >
                        <option value="Bahan Pokok">Bahan Pokok</option>
                        <option value="Hewani">Hewani</option>
                        <option value="Sayuran">Sayuran</option>
                        <option value="Buah">Buah</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label-text">Satuan Resmi (Terkunci per 1 • Master Admin)</label>
                      <select
                        className="field-select-box"
                        value={formHarga.satuan}
                        onChange={(e) => setFormHarga({ ...formHarga, satuan: e.target.value })}
                      >
                        {Array.from(new Set([...daftarSatuan, formHarga.satuan].filter(Boolean))).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-two-cols-row">
                    <div className="form-field-group">
                      <label className="field-label-text">Harga Acuan (Rp)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        placeholder="Contoh: 15000 (hanya angka)"
                        className="field-input-box"
                        value={formHarga.harga}
                        onKeyDown={hanyaBolehAngka}
                        onChange={(e) => setFormHarga({ ...formHarga, harga: e.target.value.replace(/[^0-9]/g, '') })}
                      />
                      {formHarga.harga && (
                        <small style={{ color: '#059669', fontWeight: 600, fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                          Terformat: {formatRupiah(parseInt(formHarga.harga, 10))}
                        </small>
                      )}
                    </div>

                    <div className="form-field-group">
                      <label className="field-label-text">Pilihan Pasar Terdaftar</label>
                      <select
                        className="field-select-box"
                        value={formHarga.nama_pasar}
                        onChange={(e) => setFormHarga({ ...formHarga, nama_pasar: e.target.value })}
                      >
                        {daftarPasar.map((pasar, idx) => (
                          <option key={idx} value={pasar}>{pasar}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-actions-stack">
                    <button type="submit" className="btn-terbitkan-masyarakat" disabled={sedangMenyimpan}>
                      {sedangMenyimpan ? 'Mengajukan...' : (idEditHarga ? '📨 Ajukan Perubahan Harga' : '📨 Ajukan Harga')}
                    </button>
                    {idEditHarga && (
                      <button type="button" className="btn-simpan-draft" onClick={handleBatalEditStaf}>
                        ✕ Batal Ubah
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Riwayat Data Masukan Staf */}
              <div className="tetapkan-list-card">
                <h3 className="list-card-heading">Daftar Data Komoditas Dimasukkan</h3>
                <div className="current-prices-stack">
                  {daftarHarga.map((item) => (
                    <div key={item.id} className="price-item-row-card">
                      <div className="price-item-info-col">
                        <div className="item-title-unit">
                          <strong className="item-name">{item.nama_komoditas}</strong>
                          <span className="item-unit"> / {formatSatuanTampil(item.satuan)}</span>
                        </div>
                        <div className="item-market-date">
                          {item.nama_pasar} · {item.tanggal_penetapan || 'Hari ini'}
                        </div>
                      </div>

                      <div className="price-item-value-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <div className="item-price-nominal">{formatRupiah(item.harga)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge-status-pill ${(item.status || '').toLowerCase() === 'draft' ? 'status-draft' : 'status-terbit'}`}>
                            {(item.status || '').toLowerCase() === 'draft' ? 'Draf' : (item.status || 'Terbit')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMulaiEditStaf(item)}
                            title="Ubah data harga komoditas"
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          {isKabid && (
                            <button
                              type="button"
                              onClick={() => handleHapusHarga(item.id, item.nama_komoditas)}
                              title="Hapus komoditas"
                              style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            11. VIEW 3: MENU VERIF HARGA PANGAN (KABID / SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'verif-harga' && isKabid && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">Menu Verifikasi Harga Pangan</h1>
              <p className="dashboard-main-subheading">
                Kewenangan Kepala Bidang Cadangan & Distribusi Pangan untuk memverifikasi usulan harga staf sebelum tampil ke publik.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#8b1e1e', fontSize: '1.05rem' }}>
                  ⏳ Usulan Harga Menunggu Verifikasi ({daftarDraftVerifikasi.length})
                </h3>
              </div>

              {daftarDraftVerifikasi.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                  Semua usulan harga telah diverifikasi. Tidak ada usulan tertunda.
                </div>
              ) : (
                <div className="verif-cards-list">
                  {daftarDraftVerifikasi.map(item => (
                    <div key={item.id} className="verif-item-card">
                      <div className="verif-item-info">
                        <div className="verif-item-title-row">
                          <strong className="verif-item-title">{item.nama_komoditas}</strong>
                          <span className="verif-item-badge">({item.kategori})</span>
                        </div>
                        <div className="verif-item-meta">
                          Pasar: <strong>{item.nama_pasar}</strong> · Satuan: {formatSatuanTampil(item.satuan)} · Tanggal: {item.tanggal_penetapan}
                        </div>
                      </div>

                      <div className="verif-item-right-section">
                        <div className="verif-item-price">
                          {formatRupiah(item.harga)}
                        </div>
                        <div className="verif-item-btn-group">
                          <button
                            type="button"
                            className="verif-btn-edit"
                            onClick={() => handleBukaEditKabid(item)}
                            title="Ubah usulan harga komoditas"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="verif-btn-setujui"
                            onClick={() => handleVerifikasiHarga(item, 'Terbit')}
                            title="Setujui dan terbitkan ke publik"
                          >
                            ✓ Setujui & Terbitkan
                          </button>
                          <button
                            type="button"
                            className="verif-btn-tolak"
                            onClick={() => handleHapusHarga(item.id, item.nama_komoditas)}
                            title="Tolak usulan harga ini"
                          >
                            ✕ Tolak
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riwayat Data Terverifikasi */}
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '1.05rem' }}>
                ✅ Komoditas Resmi Terbit di Halaman Publik
              </h3>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Komoditas</th>
                      <th style={{ padding: '10px' }}>Kategori</th>
                      <th style={{ padding: '10px' }}>Pasar</th>
                      <th style={{ padding: '10px' }}>Harga</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarHarga.filter(h => (h.status || 'Terbit').toLowerCase() === 'terbit').map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                        <td style={{ padding: '10px' }}>{h.kategori}</td>
                        <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
                        <td style={{ padding: '10px', fontWeight: 800, color: '#8b1e1e' }}>{formatRupiah(h.harga)} / {formatSatuanTampil(h.satuan)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                            Terbit
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleBukaEditKabid(h)}
                            style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, marginRight: '8px' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleVerifikasiHarga(h, 'Draft')}
                            style={{ background: 'none', border: 'none', color: '#d97706', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, marginRight: '8px' }}
                          >
                            Tarik ke Draft
                          </button>
                          <button
                            onClick={() => handleHapusHarga(h.id, h.nama_komoditas)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
              />
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            13. VIEW 5: MENU CEK GPM (ADMIN & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'cek-gpm' && isAdmin && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">Menu Cek GPM (Supervisi Administrator)</h1>
            <p className="dashboard-main-subheading">
              Inspeksi agenda Gerakan Pangan Murah, monitoring kuota beras & minyak terpakai, dan pemantauan data pendaftar warga.
            </p>

            <div className="gpm-supervisi-cards-grid" style={{ marginTop: '20px' }}>
              {rekapitulasiGPMList.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  Belum ada agenda Gerakan Pangan Murah dalam basis data.
                </div>
              ) : (
                rekapitulasiGPMList.map((gpm) => (
                  <div key={gpm.id} style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: gpm.status === 'Selesai' ? '#dcfce7' : '#eff6ff',
                        color: gpm.status === 'Selesai' ? '#166534' : '#1e40af'
                      }}>
                        {gpm.status}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>📅 {gpm.tanggal}</span>
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#8b1e1e' }}>{gpm.nama_acara}</h3>
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#475569' }}>📍 {gpm.lokasi} (Kec. {gpm.kecamatan})</p>

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <span>Kapasitas Kuota:</span>
                        <strong>{gpm.target_kuota} KK</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <span>Warga Terdaftar:</span>
                        <strong style={{ color: '#1d4ed8' }}>{gpm.terdaftar} Warga</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span>Warga Terlayani (Hadir):</span>
                        <strong style={{ color: gpm.terlayani > 0 ? '#166534' : '#64748b' }}>
                          {gpm.terlayani > 0 ? `${gpm.terlayani} KK` : '-'}
                        </strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                      <strong>🌾 Komoditas Disediakan:</strong>
                      <div style={{ marginTop: '4px', color: '#475569', lineHeight: 1.4 }}>
                        {gpm.komoditas_tersedia || 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalDetailWarga({ buka: true, acara: gpm, pencarian: '' })}
                      style={{
                        background: '#8b1e1e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      👥 Buka & Supervisi Data Warga ({gpm.terdaftar} Pendaftar)
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            14. VIEW 6: LAPORAN KHUSUS BIDANG (KABID & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan' && isKabid && (
          <div className="dashboard-page-container" id="area-laporan-resmi">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h1 className="dashboard-main-heading">📑 Laporan Resmi Bidang Cadangan & Distribusi Pangan</h1>
                <p className="dashboard-main-subheading">
                  Rekapitulasi penetapan harga komoditas acuan pasar Pemerintah Kota Manado.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => laporanService.eksporLaporanHargaCSV(daftarHarga)}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  📥 Unduh CSV (Excel)
                </button>
                <button
                  onClick={() => handleCetakDokumen({ jenis: 'kabid-harga', data: daftarHarga })}
                  style={{
                    background: '#8b1e1e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  🖨️ Cetak Dokumen PDF
                </button>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ borderBottom: '2px solid #8b1e1e', paddingBottom: '14px', marginBottom: '18px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#8b1e1e', letterSpacing: '0.5px' }}>PEMERINTAH KOTA MANADO — DINAS PANGAN</h3>
                <h4 style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#334155' }}>BIDANG CADANGAN DAN DISTRIBUSI PANGAN</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Laporan Berkala Pemantauan Harga Bahan Pokok & Komoditas Pangan Pasar Tradisional
                </p>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '0.88rem', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>No.</th>
                      <th style={{ padding: '10px' }}>Nama Komoditas</th>
                      <th style={{ padding: '10px' }}>Kategori</th>
                      <th style={{ padding: '10px' }}>Nama Pasar</th>
                      <th style={{ padding: '10px' }}>Harga Acuan</th>
                      <th style={{ padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarHarga.map((h, idx) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{h.nama_komoditas}</td>
                        <td style={{ padding: '10px' }}>{h.kategori}</td>
                        <td style={{ padding: '10px' }}>{h.nama_pasar}</td>
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

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                <div style={{ width: '280px' }}>
                  <div>Manado, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontWeight: 800, marginTop: '4px' }}>Kepala Bidang Cadangan & Distribusi Pangan</div>
                  <div style={{ height: '70px' }}></div>
                  <div style={{ fontWeight: 800, textDecoration: 'underline' }}>{userState.nama || 'Mareta'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NIP. 19850412 201001 2 003</div>
                </div>
              </div>
            </div>
          </div>
        )}

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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {grupKomoditasDropdown.map((grup) => (
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
                <form onSubmit={handleTambahSatuan} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Liter, Baki, Ikat, Ekor..."
                    className="field-input-box"
                    value={inputSatuanBaru}
                    onChange={(e) => setInputSatuanBaru(e.target.value)}
                  />
                  <button type="submit" style={{ background: '#8b1e1e', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Tambah
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {daftarSatuan.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>⚖️ {s}</span>
                      <button onClick={() => handleHapusSatuan(s)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Master Kecamatan */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#8b1e1e' }}>📍 Master Daftar Kecamatan</h3>
                <form onSubmit={handleTambahKecamatan} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Nama kecamatan baru..."
                    className="field-input-box"
                    value={inputKecamatanBaru}
                    onChange={(e) => setInputKecamatanBaru(e.target.value)}
                  />
                  <button type="submit" style={{ background: '#8b1e1e', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    Tambah
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
            16. VIEW 8: MENU EDIT USER (ADMIN & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'kelola-user' && isAdmin && (
          <div className="dashboard-page-container">
            <h1 className="dashboard-main-heading">👥 Menu Kelola Pengguna & Manajemen Akses (Admin)</h1>
            <p className="dashboard-main-subheading">
              Khusus Administrator: Anda dapat mengganti nama pengguna, mengubah peran pengguna, dan melakukan atur ulang kata sandi tanpa melihat kata sandi lama pengguna.
            </p>

            <div className="gpm-supervisi-cards-grid" style={{ marginTop: '20px' }}>
              {/* Form Tambah Pengguna Baru */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>➕ Tambah Akun Pengguna Baru</h3>
                <form onSubmit={handleTambahUserBaru} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama pegawai / pejabat"
                      className="field-input-box"
                      value={formUserBaru.nama}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, nama: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Nama Pengguna (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="nama pengguna (tanpa spasi)"
                      className="field-input-box"
                      value={formUserBaru.username}
                      onChange={(e) => setFormUserBaru({ ...formUserBaru, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Alamat Email (Opsional)</label>
                    <input
                      type="email"
                      placeholder="contoh@manado.go.id (Otomatis jika dikosongkan)"
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
                      <option value="Staf">Staf (Masukan Data Pangan & Kelola GPM)</option>
                      <option value="Kabid">Kepala Bidang (Laporan Bidang & Verifikasi Harga)</option>
                      <option value="Admin">Admin (Kelola Pengguna, Master Wilayah, Cek GPM)</option>
                      <option value="Kadis">Kepala Dinas (Grafik Pangan & Laporan GPM)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                      Kata Sandi Awal (Min. 8 Karakter)
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
                    style={{
                      background: '#8b1e1e',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginTop: '6px'
                    }}
                  >
                    Simpan & Buat Akun
                  </button>
                </form>
              </div>

              {/* Daftar Akun Terdaftar & Aksi Admin */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e' }}>📋 Daftar Akun Terdaftar di Sistem</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {daftarPengguna.map((u) => (
                    <div key={u.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{u.nama}</strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '6px' }}>({u.username})</span>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                            ✉️ {u.email || `${u.username}@manado.go.id`}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: u.peran === 'Admin' ? '#fdf2f8' : u.peran === 'Kabid' ? '#fef3c7' : u.peran === 'Kadis' ? '#f0fdf4' : '#eff6ff',
                          color: u.peran === 'Admin' ? '#9d174d' : u.peran === 'Kabid' ? '#92400e' : u.peran === 'Kadis' ? '#166534' : '#1e40af'
                        }}>
                          {namaLengkapPeran(u.peran)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        {/* Ubah Peran */}
                        <select
                          value={u.peran}
                          onChange={(e) => handleUbahPeranUser(u.id, e.target.value)}
                          style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
                        >
                          <option value="Staf">Peran Staf</option>
                          <option value="Kabid">Peran Kepala Bidang</option>
                          <option value="Admin">Peran Admin</option>
                          <option value="Kadis">Peran Kepala Dinas</option>
                        </select>

                        {/* Tombol Ubah Nama Pengguna */}
                        <button
                          onClick={() => setModalEditUsername({ buka: true, userTarget: u, usernameBaru: u.username, pesan: '' })}
                          style={{
                            background: '#e2e8f0',
                            color: '#334155',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Ganti nama pengguna akun ini"
                        >
                          ✏️ Ganti Nama Pengguna
                        </button>

                        {/* Tombol Ubah Email */}
                        <button
                          onClick={() => setModalEditEmail({ buka: true, userTarget: u, emailBaru: u.email || `${u.username}@manado.go.id`, pesan: '' })}
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Ganti alamat email akun ini"
                        >
                          ✉️ Ganti Email
                        </button>

                        {/* Tombol Atur Ulang Kata Sandi */}
                        <button
                          onClick={() => setModalResetAdmin({ buka: true, userTarget: u, sandiBaru: '', konfirmasiSandi: '', pesan: '' })}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Admin mengatur ulang kata sandi tanpa bisa melihat kata sandi lama"
                        >
                          🔒 Atur Ulang Sandi
                        </button>

                        {/* Tombol Hapus (Kecuali diri sendiri) */}
                        {u.id !== userState.id && (
                          <button
                            onClick={() => handleHapusUser(u.id, u.nama)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            17. VIEW 9: GRAFIK PANGAN (KADIS & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'grafik-pangan' && isKadis && (
          <div className="dashboard-page-container">
            <div className="dashboard-hero-title-box">
              <h1 className="dashboard-main-heading">📈 Analisis Grafik & Tren Harga Pangan (Kepala Dinas)</h1>
              <p className="dashboard-main-subheading">
                Visualisasi dinamika pergerakan dan stabilitas harga komoditas pangan pokok di pasar-pasar Kota Manado (data riil basis data).
              </p>
            </div>

            {/* Filter Komoditas & Periode */}
            <div style={{ background: '#ffffff', padding: '18px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Komoditas</label>
                <select
                  value={komoditasTren}
                  onChange={(e) => setKomoditasTren(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                >
                  {(() => {
                    const daftarNama = Array.from(new Set(daftarHarga.map(i => i.nama_komoditas).filter(Boolean)));
                    const daftarOpsi = daftarNama.length > 0 ? daftarNama : ['Beras Medium', 'Beras Premium', 'Minyak Goreng Kemasan', 'Gula Pasir', 'Telur Ayam'];
                    return daftarOpsi.map(nama => (
                      <option key={nama} value={nama}>{nama}</option>
                    ));
                  })()}
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

            {/* Metrik Statistik Tren */}
            {dataTren && (
              <>
                <div className="dashboard-stat-cards-grid" style={{ marginBottom: '24px' }}>
                  <div className="stat-card-white">
                    <div className="stat-title-label">Harga Terkini</div>
                    <div className="stat-number-big" style={{ color: '#8b1e1e' }}>{formatRupiah(dataTren.hargaTerkini)}</div>
                    <div className="stat-caption-sub">acuan saat ini</div>
                  </div>

                  <div className="stat-card-white">
                    <div className="stat-title-label">Rata-rata Harga</div>
                    <div className="stat-number-big">{formatRupiah(dataTren.rataRata)}</div>
                    <div className="stat-caption-sub">selama periode terpilih</div>
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
                    <div className="stat-caption-sub">selisih {formatRupiah(dataTren.selisih)} ({dataTren.persentase}%)</div>
                  </div>
                </div>

                {/* Visualisasi Grafik Tren Interaktif */}
                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem' }}>
                      Pergerakan Harga Komoditas: {dataTren.namaKomoditas}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      📊 Grafik Batang Riil
                    </span>
                  </div>

                  <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px' }}>
                    <div style={{ minWidth: '520px', height: '220px', display: 'flex', alignItems: 'flex-end', gap: '14px', padding: '20px 10px 10px 10px', background: '#f8fafc', borderRadius: '8px', borderBottom: '2px solid #cbd5e1' }}>
                      {Array.isArray(dataTren.titikData) && dataTren.titikData.map((titik, idx) => {
                        const rasio = (titik.harga - dataTren.hargaTerendah * 0.9) / (dataTren.hargaTertinggi - dataTren.hargaTerendah * 0.9 || 1);
                        const tinggiPersen = Math.max(25, Math.min(100, Math.round(rasio * 100)));
                        return (
                          <div key={idx} style={{ flex: 1, minWidth: '55px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8b1e1e', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                              {formatRupiah(titik.harga)}
                            </span>
                            <div
                              style={{
                                width: '100%',
                                maxWidth: '44px',
                                height: `${tinggiPersen}%`,
                                background: 'linear-gradient(180deg, #8b1e1e 0%, #b91c1c 100%)',
                                borderRadius: '6px 6px 0 0',
                                transition: 'all 0.3s ease'
                              }}
                              title={`${titik.tanggal}: ${formatRupiah(titik.harga)}`}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {titik.tanggal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'right', marginTop: '6px' }}>
                    💡 Geser ke samping jika grafik terpotong di layar ponsel
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────
            18. VIEW 10: LAPORAN GPM (KADIS & SUPERADMIN)
            ───────────────────────────────────────────── */}
        {menuAktif === 'laporan-gpm' && isKadis && (
          <div className="dashboard-page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h1 className="dashboard-main-heading">📋 Laporan Evaluasi Gerakan Pangan Murah (GPM)</h1>
                <p className="dashboard-main-subheading">
                  Laporan eksekutif untuk Kepala Dinas: Evaluasi serapan kuota pangan murah dan pemerataan distribusi di 11 Kecamatan.
                </p>
              </div>

              <button
                onClick={() => setModalPilihanCetakGPM({ buka: true, mode: 'semua', acaraId: '' })}
                style={{
                  background: '#8b1e1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🖨️ Cetak Rekapitulasi GPM
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#8b1e1e', fontSize: '1.05rem' }}>
                Realisasi Penyaluran Komoditas Gerakan Pangan Murah
              </h3>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Nama Acara / Lokasi</th>
                      <th style={{ padding: '10px' }}>Wilayah Kecamatan</th>
                      <th style={{ padding: '10px' }}>Target Kuota</th>
                      <th style={{ padding: '10px' }}>Warga Mendaftar</th>
                      <th style={{ padding: '10px' }}>Warga Terlayani</th>
                      <th style={{ padding: '10px' }}>Status Acara</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Data Pendaftar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapitulasiGPMList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                          Belum ada riwayat kegiatan Gerakan Pangan Murah yang tercatat.
                        </td>
                      </tr>
                    ) : (
                      rekapitulasiGPMList.map((gpm) => (
                        <tr key={gpm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px' }}>
                            <strong>{gpm.nama_acara}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{gpm.lokasi}</div>
                          </td>
                          <td style={{ padding: '10px' }}>{gpm.kecamatan}</td>
                          <td style={{ padding: '10px', fontWeight: 700 }}>{gpm.target_kuota} KK</td>
                          <td
                            style={{ padding: '10px', cursor: 'pointer', color: '#1d4ed8', fontWeight: 700 }}
                            onClick={() => setModalDetailWarga({ buka: true, acara: gpm, pencarian: '' })}
                            title="Klik untuk membuka data pendaftar warga"
                          >
                            {gpm.terdaftar} Warga 🔍
                          </td>
                          <td style={{ padding: '10px', fontWeight: 800, color: gpm.terlayani > 0 ? '#166534' : '#64748b' }}>
                            {gpm.terlayani > 0 ? `${gpm.terlayani} KK` : '-'}
                          </td>
                          <td style={{ padding: '10px' }}>
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
                              onClick={() => setModalDetailWarga({ buka: true, acara: gpm, pencarian: '' })}
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              👥 Buka Data ({gpm.terdaftar})
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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
            zIndex: 110,
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
            zIndex: 110,
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
            zIndex: 110,
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
            zIndex: 100,
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
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
            zIndex: 120,
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
              maxHeight: '90vh',
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
              const pendaftarAcara = listWarga.filter(p => p.acara_id === modalDetailWarga.acara.id);
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Target Alokasi Kuota</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>{modalDetailWarga.acara.target_kuota} KK</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>Warga Terdaftar</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e40af' }}>{totalTerdaftar} Warga</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#166534' }}>Warga Hadir (Terlayani)</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d' }}>{totalHadir} Warga</div>
                    </div>
                    <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Belum Hadir</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309' }}>{totalBelum} Warga</div>
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
                        onClick={() => gpmService.eksporKeCSV(modalDetailWarga.acara, pendaftarAcara)}
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
                        📥 Unduh CSV (Excel)
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
            zIndex: 120,
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
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mencetak rangkuman evaluasi seluruh titik pelaksanaan GPM Kota Manado, serapan kuota, dan status kegiatan.</span>
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
                    const pendaftarAcara = listWarga.filter(p => p.acara_id === target.id);
                    setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' });
                    handleCetakDokumen({ jenis: 'kadis-gpm-acara', acara: target, pendaftar: pendaftarAcara });
                  } else {
                    setModalPilihanCetakGPM({ buka: false, mode: 'semua', acaraId: '' });
                    handleCetakDokumen({ jenis: 'kadis-gpm-semua', data: rekapitulasiGPMList });
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
          24. DOKUMEN CETAK RESMI PDF (KOP SURAT PEMKOT MANADO & FORMAT STANDAR)
          ───────────────────────────────────────────── */}
      <div id="area-cetak-dokumen">
        {/* KOP SURAT RESMI */}
        <div style={{ borderBottom: '3px double #000000', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <img src="/logodinaspangan.png" alt="Logo Pemkot Manado" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15pt', fontWeight: 800, letterSpacing: '1px', color: '#000000' }}>
              PEMERINTAH KOTA MANADO
            </h3>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18pt', fontWeight: 900, color: '#000000' }}>
              DINAS PANGAN
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '10pt', fontWeight: 700, color: '#222222' }}>
              BIDANG CADANGAN DAN DISTRIBUSI PANGAN
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8.5pt', color: '#444444' }}>
              Jl. Balai Kota No. 1, Tikala Ares, Kec. Tikala, Kota Manado, Sulawesi Utara 95124
            </p>
          </div>
        </div>

        {/* KONTEN SESUAI JENIS CETAK */}
        {dataCetakResmi?.jenis === 'kabid-harga' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '12pt', fontWeight: 800, textDecoration: 'underline' }}>
                LAPORAN RESMI REKAPITULASI DAN PENETAPAN HARGA PANGAN POKOK
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '9pt', color: '#333333' }}>
                Nomor: 520 / DP-CDP / {new Date().getFullYear()} · Waktu Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #000000', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>No.</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Nama Komoditas</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Kategori</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Satuan</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Harga Acuan</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Pasar Pantauan</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {daftarHarga.map((h, idx) => (
                  <tr key={h.id}>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', fontWeight: 700 }}>{h.nama_komoditas}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{h.kategori || 'Bahan Pokok'}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{formatSatuanTampil(h.satuan)}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', fontWeight: 700 }}>{formatRupiah(h.harga)}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{h.nama_pasar}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{h.status || 'Terbit'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
              <div style={{ width: '280px' }}>
                <div style={{ fontSize: '9.5pt' }}>Manado, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ fontWeight: 800, fontSize: '9.5pt', marginTop: '2px' }}>Kepala Bidang Cadangan & Distribusi Pangan</div>
                <div style={{ height: '65px' }}></div>
                <div style={{ fontWeight: 800, fontSize: '10pt', textDecoration: 'underline' }}>MEITY RONDONUWU, S.Pt, M.Si</div>
                <div style={{ fontSize: '8.5pt', color: '#444' }}>NIP. 19780815 200501 2 008</div>
              </div>
            </div>
          </div>
        )}

        {dataCetakResmi?.jenis === 'kadis-gpm-semua' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '12pt', fontWeight: 800, textDecoration: 'underline' }}>
                LAPORAN EKSEKUTIF REKAPITULASI PELAKSANAAN GERAKAN PANGAN MURAH (GPM)
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '9pt', color: '#333333' }}>
                Evaluasi Serapan Kuota Pangan Pokok & Pemerataan Distribusi Kota Manado
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #000000', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>No.</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Nama Kegiatan GPM</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Lokasi / Titik Acara</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Kecamatan</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Tanggal Pelaksanaan</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Target Kuota</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Terdaftar</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Terlayani</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rekapitulasiGPMList.map((g, idx) => (
                  <tr key={g.id}>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', fontWeight: 700 }}>{g.nama_acara}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{g.lokasi}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{g.kecamatan}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{g.tanggal}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{g.target_kuota} KK</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{g.terdaftar} Warga</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center', fontWeight: 700 }}>{g.terlayani} KK</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
              <div style={{ width: '280px' }}>
                <div style={{ fontSize: '9.5pt' }}>Manado, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ fontWeight: 800, fontSize: '9.5pt', marginTop: '2px' }}>Kepala Dinas Pangan Kota Manado</div>
                <div style={{ height: '65px' }}></div>
                <div style={{ fontWeight: 800, fontSize: '10pt', textDecoration: 'underline' }}>Ir. PHILIPS H. SONDY, M.Si</div>
                <div style={{ fontSize: '8.5pt', color: '#444' }}>NIP. 19681120 199303 1 004</div>
              </div>
            </div>
          </div>
        )}

        {dataCetakResmi?.jenis === 'kadis-gpm-acara' && dataCetakResmi.acara && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '12pt', fontWeight: 800, textDecoration: 'underline' }}>
                LAPORAN PELAKSANAAN & DAFTAR PENDAFTAR WARGA GPM
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '9pt', color: '#333333' }}>
                {dataCetakResmi.acara.nama_acara} — {dataCetakResmi.acara.lokasi} (Kec. {dataCetakResmi.acara.kecamatan})
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '8.5pt', color: '#555555' }}>
                Jadwal: {dataCetakResmi.acara.tanggal} ({dataCetakResmi.acara.jam_mulai || '08:00'} - {dataCetakResmi.acara.jam_selesai || '13:00'} WITA) · Komoditas: {dataCetakResmi.acara.komoditas_tersedia}
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #000000', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>No.</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Antrean</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>NIK Warga (16 Digit)</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Nama Lengkap</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Jalur</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>No. HP / WA</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Status Kehadiran</th>
                  <th style={{ padding: '6px', border: '1px solid #333' }}>Waktu Hadir</th>
                </tr>
              </thead>
              <tbody>
                {(dataCetakResmi.pendaftar || []).map((w, idx) => (
                  <tr key={w.id || idx}>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center', fontWeight: 700 }}>#{String(w.nomor_antrean || idx + 1).padStart(3, '0')}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', fontFamily: 'monospace' }}>{w.nik || '-'}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', fontWeight: 700 }}>{w.nama_pendaftar || w.nama_lengkap || w.nama_bersih || w.nama || '-'}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center' }}>{w.jalur_pendaftaran || 'Daring'}</td>
                    <td style={{ padding: '5px', border: '1px solid #333' }}>{w.nomor_telepon || '-'}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', textAlign: 'center', fontWeight: 700 }}>{w.status_kehadiran || 'Menunggu'}</td>
                    <td style={{ padding: '5px', border: '1px solid #333', fontSize: '8pt' }}>{w.waktu_kehadiran ? new Date(w.waktu_kehadiran).toLocaleString('id-ID') : (w.status_kehadiran === 'Hadir' ? 'Hadir di Lokasi' : '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
              <div style={{ width: '280px' }}>
                <div style={{ fontSize: '9.5pt' }}>Manado, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ fontWeight: 800, fontSize: '9.5pt', marginTop: '2px' }}>Kepala Dinas Pangan Kota Manado</div>
                <div style={{ height: '65px' }}></div>
                <div style={{ fontWeight: 800, fontSize: '10pt', textDecoration: 'underline' }}>Ir. PHILIPS H. SONDY, M.Si</div>
                <div style={{ fontSize: '8.5pt', color: '#444' }}>NIP. 19681120 199303 1 004</div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
