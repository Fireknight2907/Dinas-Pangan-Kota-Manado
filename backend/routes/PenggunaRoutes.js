// ===================================================================================
// MODUL RUTE API PENGGUNA DAN KONTROL AKSES (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// ===================================================================================

const express = require('express');
const router = express.Router();
const PenggunaController = require('../controllers/PenggunaController');
const { verifikasiToken, periksaPeran } = require('../middleware/autentikasi');

// 1. Autentikasi Pengguna
router.post('/login', PenggunaController.login);

// 2. Ganti Kata Sandi Pribadi Pengguna (Wajib Token Pengguna Aktif)
router.put('/ganti-sandi', verifikasiToken, PenggunaController.gantiSandi);

// 3. Hak Khusus Administrator (Wajib Token dan Peran Admin/Superadmin)
router.put('/admin/reset-password', verifikasiToken, periksaPeran(['Admin', 'Superadmin']), PenggunaController.adminResetPassword);
router.put('/admin/ubah-username', verifikasiToken, periksaPeran(['Admin', 'Superadmin']), PenggunaController.adminUbahUsername);
router.put('/admin/ubah-peran', verifikasiToken, periksaPeran(['Admin', 'Superadmin']), PenggunaController.adminUbahPeran);
router.delete('/admin/:idTarget', verifikasiToken, periksaPeran(['Admin', 'Superadmin']), PenggunaController.hapusUser);
router.post('/tambah', verifikasiToken, periksaPeran(['Admin', 'Superadmin']), PenggunaController.tambahUser);

// 4. Daftar Semua Pengguna (Hanya Akses Pegawai Berwenang)
router.get('/', verifikasiToken, periksaPeran(['Admin', 'Superadmin', 'Kadis', 'Kabid']), PenggunaController.daftarSemuaUser);

module.exports = router;
