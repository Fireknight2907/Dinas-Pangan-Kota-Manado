// ===================================================================================
// RUTE API HARGA PANGAN
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// ===================================================================================

const express = require('express');
const router = express.Router();
const HargaPanganController = require('../controllers/HargaPanganController');
const { verifikasiToken, periksaPeran } = require('../middleware/autentikasi');

// =======================================================
// RUTE PUBLIK (Dapat diakses oleh Masyarakat via Web & Mobile)
// =======================================================

// 1. Ambil daftar komoditas harga pangan (bisa filter ?kategori=&pasar=&cari=)
router.get('/', (req, res) => HargaPanganController.daftarSemua(req, res));

// 2. Ambil ringkasan jumlah komoditas per kategori (untuk badge 'Semua', 'Bahan Pokok', dll.)
router.get('/statistik', (req, res) => HargaPanganController.ambilStatistik(req, res));

// 2b. Ambil statistik lengkap Dashboard Petugas (Harga Ditetapkan, Draft, GPM Terjadwal, GPM Selesai)
router.get('/dashboard-stats', (req, res) => HargaPanganController.ambilStatistikDashboard(req, res));

// 3. Ambil daftar nama pasar yang terdaftar
router.get('/pasar', (req, res) => HargaPanganController.daftarPasar(req, res));

// 4. Ambil detail satu komoditas berdasarkan ID
router.get('/:id', (req, res) => HargaPanganController.detailSatu(req, res));


// =======================================================
// RUTE MANAJEMEN / INPUT DATA OLEH STAF & PETUGAS
// =======================================================

// 5. Tambah data komoditas pangan baru (Tempat input staf)
// Catatan: Jika token disertakan, data petugas akan tercatat otomatis
router.post('/', (req, res) => HargaPanganController.tambah(req, res));

// 6. Perbarui data komoditas pangan
router.put('/:id', (req, res) => HargaPanganController.perbarui(req, res));

// 7. Hapus data komoditas pangan
router.delete('/:id', (req, res) => HargaPanganController.hapus(req, res));

module.exports = router;
