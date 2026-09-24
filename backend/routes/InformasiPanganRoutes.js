const express = require('express');
const router = express.Router();
const InformasiPanganController = require('../controllers/InformasiPanganController');
const { verifikasiToken, periksaPeran } = require('../middleware/autentikasi');

// ============================
// RUTE PUBLIK (tanpa login)
// ============================
// GET semua informasi pangan
router.get('/', InformasiPanganController.daftarSemua);

// GET detail satu informasi
router.get('/:id', InformasiPanganController.detailSatu);

// ============================
// RUTE ADMIN / PETUGAS (perlu login)
// ============================
// POST tambah informasi pangan
router.post('/', verifikasiToken, periksaPeran(['Admin', 'Petugas']), InformasiPanganController.tambah);

// PUT perbarui informasi pangan
router.put('/:id', verifikasiToken, periksaPeran(['Admin', 'Petugas']), InformasiPanganController.perbarui);

// DELETE hapus informasi pangan
router.delete('/:id', verifikasiToken, periksaPeran(['Admin']), InformasiPanganController.hapus);

module.exports = router;
