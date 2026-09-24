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
            // idPengguna didapat dari token JWT nanti
            const { idPengguna, kataSandiLama, kataSandiBaru } = req.body;
            await ModelPengguna.gantiKataSandi(idPengguna, kataSandiLama, kataSandiBaru);
            res.status(200).json({ sukses: true, pesan: 'Kata sandi berhasil diubah' });
        } catch (error) {
            res.status(400).json({ sukses: false, pesan: error.message });
        }
    }

    async tambahUser(req, res) {
        try {
            const { nama, email, kata_sandi, peran, bidang } = req.body;
            // Validasi peran
            if (!['Admin', 'Petugas', 'Kepala_Dinas'].includes(peran)) {
                return res.status(400).json({ sukses: false, pesan: 'Peran tidak valid' });
            }

            const dataBaru = { nama, email, kata_sandi, peran, bidang };
            const hasil = await ModelPengguna.tambahPenggunaBaru(dataBaru);
            res.status(201).json({ sukses: true, pesan: 'Pengguna berhasil ditambahkan', data: hasil });
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
