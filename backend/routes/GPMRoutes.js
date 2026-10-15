// ===================================================================================
// RUTE API GPM (GERAKAN PANGAN MURAH)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Definisi Endpoint Publik (Masyarakat Tanpa Login) & Privat (Petugas)
// ===================================================================================

const express = require('express');
const router = express.Router();
const GPMController = require('../controllers/GPMController');
const { verifikasiToken, periksaPeran } = require('../middleware/autentikasi');

// ===============================================================================
// 1. RUTE PUBLIK (Dapat Diakses Oleh Masyarakat Tanpa Perlu Login)
// ===============================================================================

// [Modul Rute] Mengambil semua lokasi & jadwal acara GPM (untuk peta & daftar pilihan)
router.get('/acara', (req, res) => GPMController.daftarAcara(req, res));

// [Modul Rute] Mengambil detail informasi 1 acara GPM beserta ketersediaan sisa kuota
router.get('/acara/:id', (req, res) => GPMController.detailAcara(req, res));

// [Modul Rute] Pendaftaran Antrean Masyarakat (Hanya butuh Nama Lengkap & No Telp -> Dapatkan Barcode & No Urut)
router.post('/antrian', (req, res) => GPMController.ambilNomorAntrean(req, res));


// ===============================================================================
// 2. RUTE PETUGAS & ADMIN (Akses Khusus Pengurus Dinas Pangan)
// ===============================================================================

// [Modul Rute] Mengambil ringkasan statistik antrean dan kegiatan GPM
router.get('/statistik', (req, res) => GPMController.ambilStatistik(req, res));

// [Modul Rute] Petugas mendaftarkan/menulis lokasi dan jadwal acara GPM baru
router.post('/acara', (req, res) => GPMController.tambahAcara(req, res));

// [Modul Rute] Petugas memperbarui jadwal atau kuota acara GPM
router.put('/acara/:id', (req, res) => GPMController.perbaruiAcara(req, res));

// [Modul Rute] Petugas menghapus jadwal acara GPM
router.delete('/acara/:id', (req, res) => GPMController.hapusAcara(req, res));

// [Modul Rute] Petugas melihat berapa banyak nomor antrean yang dibuat dan data orang2 yang mendaftar
router.get('/acara/:acara_id/pendaftar', (req, res) => GPMController.daftarPendaftar(req, res));

// [Modul Rute] Petugas melakukan SCAN Barcode tiket masyarakat
router.get('/scan/:barcode', (req, res) => GPMController.scanBarcode(req, res));

// [Modul Rute] Petugas mengonfirmasi verifikasi kehadiran pendaftar setelah di-scan
router.post('/verifikasi/:barcode', (req, res) => GPMController.verifikasiKehadiran(req, res));

module.exports = router;
