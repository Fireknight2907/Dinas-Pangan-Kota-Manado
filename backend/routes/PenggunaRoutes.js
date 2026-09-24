const express = require('express');
const router = express.Router();
const PenggunaController = require('../controllers/PenggunaController');

router.post('/login', PenggunaController.login);
router.post('/tambah', PenggunaController.tambahUser);
router.put('/ganti-sandi', PenggunaController.gantiSandi);
router.get('/', PenggunaController.daftarSemuaUser);

module.exports = router;
