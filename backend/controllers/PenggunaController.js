// ===================================================================================
// MODUL CONTROLLER PENGGUNA DAN KONTROL AKSES (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Menangani permintaan HTTP untuk login, manajemen akun staf & pimpinan,
// serta eksekusi hak khusus administrator (hard reset kata sandi & ubah username).
// ===================================================================================

const ModelPengguna = require('../models/PenggunaModel');

class PenggunaController {
    async login(req, res) {
        try {
            const { email, kata_sandi } = req.body;
            const hasil = await ModelPengguna.login(email, kata_sandi);
            res.status(200).json({ sukses: true, data: hasil });
        } catch (error) {
            res.status(401).json({ sukses: false, pesan: error.message });
        }
    }

    async gantiSandi(req, res) {
        try {
            const { idPengguna, kataSandiLama, kataSandiBaru } = req.body;
            await ModelPengguna.gantiKataSandi(idPengguna, kataSandiLama, kataSandiBaru);
            res.status(200).json({ sukses: true, pesan: 'Kata sandi berhasil diubah' });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    // Hard reset kata sandi oleh Admin (Admin tidak melihat kata sandi lama pengguna)
    async adminResetPassword(req, res) {
        try {
            const peranPemohon = req.pengguna ? req.pengguna.peran : req.body.peranPemohon;
            if (peranPemohon !== 'Admin') {
                return res.status(403).json({ sukses: false, pesan: 'Akses ditolak: Hanya role Admin yang berhak melakukan reset kata sandi!' });
            }

            const { idTarget, kataSandiBaru } = req.body;
            if (!idTarget || !kataSandiBaru) {
                return res.status(400).json({ sukses: false, pesan: 'ID target dan kata sandi baru wajib disertakan!' });
            }

            await ModelPengguna.adminResetKataSandi(idTarget, kataSandiBaru);
            res.status(200).json({ sukses: true, pesan: 'Kata sandi pengguna berhasil di-reset oleh Admin.' });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    // Mengubah username pengguna oleh Admin
    async adminUbahUsername(req, res) {
        try {
            const peranPemohon = req.pengguna ? req.pengguna.peran : req.body.peranPemohon;
            if (peranPemohon !== 'Admin') {
                return res.status(403).json({ sukses: false, pesan: 'Akses ditolak: Hanya role Admin yang berhak mengganti username pengguna!' });
            }

            const { idTarget, usernameBaru } = req.body;
            await ModelPengguna.adminUbahUsername(idTarget, usernameBaru);
            res.status(200).json({ sukses: true, pesan: 'Username pengguna berhasil diperbarui.' });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    // Mengubah peran pengguna oleh Admin
    async adminUbahPeran(req, res) {
        try {
            const peranPemohon = req.pengguna ? req.pengguna.peran : req.body.peranPemohon;
            if (peranPemohon !== 'Admin') {
                return res.status(403).json({ sukses: false, pesan: 'Akses ditolak: Hanya role Admin yang berhak mengatur peran pengguna!' });
            }

            const { idTarget, peranBaru } = req.body;
            await ModelPengguna.adminUbahPeran(idTarget, peranBaru);
            res.status(200).json({ sukses: true, pesan: 'Peran pengguna berhasil diperbarui.' });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    async tambahUser(req, res) {
        try {
            const { nama, email, kata_sandi, peran, bidang } = req.body;
            const peranDiizinkan = ['Admin', 'Kabid', 'Staf', 'Kadis'];
            if (!peranDiizinkan.includes(peran)) {
                return res.status(400).json({ sukses: false, pesan: 'Peran kedinasan tidak valid (harus Admin, Kabid, Staf, atau Kadis).' });
            }

            const dataBaru = { nama, email, kata_sandi, peran, bidang };
            const hasil = await ModelPengguna.tambahPenggunaBaru(dataBaru);
            res.status(201).json({ sukses: true, pesan: 'Pengguna baru berhasil ditambahkan', data: hasil });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    async hapusUser(req, res) {
        try {
            const peranPemohon = req.pengguna ? req.pengguna.peran : req.body.peranPemohon;
            if (peranPemohon !== 'Admin') {
                return res.status(403).json({ sukses: false, pesan: 'Akses ditolak: Hanya role Admin yang berhak menghapus akun!' });
            }

            const { idTarget } = req.params;
            await ModelPengguna.hapusPengguna(idTarget);
            res.status(200).json({ sukses: true, pesan: 'Akun pengguna berhasil dihapus.' });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    async daftarSemuaUser(req, res) {
        try {
            const hasil = await ModelPengguna.ambilSemuaPengguna();
            res.status(200).json({ sukses: true, data: hasil });
        } catch (error) {
            res.status(500).json({ sukses: false, pesan: error.message });
        }
    }
}

module.exports = new PenggunaController();
