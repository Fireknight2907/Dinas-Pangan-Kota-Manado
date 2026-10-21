// ===================================================================================
// MODUL RUTE API PENGGUNA DAN KONTROL AKSES (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// ===================================================================================

const express = require('express');
const router = express.Router();
const PenggunaController = require('../controllers/PenggunaController');

// 1. Autentikasi Pengguna
router.post('/login', PenggunaController.login);

// 2. Ganti Kata Sandi Pribadi Pengguna
router.put('/ganti-sandi', PenggunaController.gantiSandi);

// 3. Hak Khusus Administrator
router.put('/admin/reset-password', PenggunaController.adminResetPassword);
router.put('/admin/ubah-username', PenggunaController.adminUbahUsername);
router.put('/admin/ubah-peran', PenggunaController.adminUbahPeran);
router.delete('/admin/:idTarget', PenggunaController.hapusUser);
router.post('/tambah', PenggunaController.tambahUser);

// 4. Daftar Semua Pengguna
router.get('/', PenggunaController.daftarSemuaUser);

module.exports = router;
