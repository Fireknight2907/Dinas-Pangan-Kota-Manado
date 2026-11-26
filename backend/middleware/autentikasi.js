const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Kunci JWT tunggal bersama untuk penandatanganan & verifikasi.
// Di produksi wajib disetel melalui process.env.JWT_SECRET.
const FALLBACK_DEV_SECRET = crypto.randomBytes(32).toString('hex');

const ambilJwtSecret = () => {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
        return process.env.JWT_SECRET.trim();
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Konfigurasi keamanan tidak lengkap: JWT_SECRET wajib disetel pada lingkungan produksi.');
    }
    return FALLBACK_DEV_SECRET;
};

/**
 * Middleware untuk memverifikasi token JWT
 * Token dikirim via header: Authorization: Bearer <token>
 */
const verifikasiToken = (req, res, next) => {
    const headerOtorisasi = req.headers['authorization'];

    if (!headerOtorisasi) {
        return res.status(401).json({ sukses: false, pesan: 'Token tidak ditemukan. Akses ditolak.' });
    }

    const bagian = String(headerOtorisasi).split(' ');
    const token = bagian.length === 2 && /^Bearer$/i.test(bagian[0]) ? bagian[1] : null;

    if (!token) {
        return res.status(401).json({ sukses: false, pesan: 'Format token tidak valid.' });
    }

    try {
        const dataDekode = jwt.verify(token, ambilJwtSecret());
        req.pengguna = dataDekode;
        next();
    } catch (error) {
        return res.status(403).json({ sukses: false, pesan: 'Token tidak valid atau sudah kadaluarsa.' });
    }
};

/**
 * Middleware untuk memeriksa peran (role) pengguna
 * @param {string[]} peranDiizinkan - Array peran yang boleh akses, contoh: ['Admin', 'Superadmin', 'Kabid', 'Staf']
 */
const periksaPeran = (peranDiizinkan) => {
    const daftarNormal = peranDiizinkan.map(p => String(p).toLowerCase().trim());
    return (req, res, next) => {
        if (!req.pengguna) {
            return res.status(401).json({ sukses: false, pesan: 'Pengguna belum terautentikasi.' });
        }

        const peranAktif = String(req.pengguna.peran || '').toLowerCase().trim();
        if (!daftarNormal.includes(peranAktif)) {
            return res.status(403).json({
                sukses: false,
                pesan: `Akses ditolak. Hanya ${peranDiizinkan.join(', ')} yang diperbolehkan.`
            });
        }

        next();
    };
};

module.exports = { verifikasiToken, periksaPeran, ambilJwtSecret };
