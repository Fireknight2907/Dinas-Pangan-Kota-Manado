const jwt = require('jsonwebtoken');

/**
 * Middleware untuk memverifikasi token JWT
 * Token dikirim via header: Authorization: Bearer <token>
 */
const verifikasiToken = (req, res, next) => {
    const headerOtorisasi = req.headers['authorization'];

    if (!headerOtorisasi) {
        return res.status(401).json({ sukses: false, pesan: 'Token tidak ditemukan. Akses ditolak.' });
    }

    const token = headerOtorisasi.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ sukses: false, pesan: 'Format token tidak valid.' });
    }

    try {
        const dataDekode = jwt.verify(token, process.env.JWT_SECRET || 'rahasia_dinas_pangan');
        req.pengguna = dataDekode; // simpan data user ke request
        next();
    } catch (error) {
        return res.status(403).json({ sukses: false, pesan: 'Token tidak valid atau sudah kadaluarsa.' });
    }
};

/**
 * Middleware untuk memeriksa peran (role) pengguna
 * @param {string[]} peranDiizinkan - Array peran yang boleh akses, contoh: ['Admin', 'Petugas']
 */
const periksaPeran = (peranDiizinkan) => {
    return (req, res, next) => {
        if (!req.pengguna) {
            return res.status(401).json({ sukses: false, pesan: 'Pengguna belum terautentikasi.' });
        }

        if (!peranDiizinkan.includes(req.pengguna.peran)) {
            return res.status(403).json({
                sukses: false,
                pesan: `Akses ditolak. Hanya ${peranDiizinkan.join(', ')} yang diperbolehkan.`
            });
        }

        next();
    };
};

module.exports = { verifikasiToken, periksaPeran };
