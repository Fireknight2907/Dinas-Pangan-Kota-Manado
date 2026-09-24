const ModelInformasiPangan = require('../models/InformasiPanganModel');

class InformasiPanganController {

    async daftarSemua(req, res) {
        try {
            const hasil = await ModelInformasiPangan.ambilSemuaData();
            res.status(200).json({ sukses: true, data: hasil });
        } catch (error) {
            res.status(500).json({ sukses: false, pesan: error.message });
        }
    }

    async detailSatu(req, res) {
        try {
            const { id } = req.params;
            const hasil = await ModelInformasiPangan.ambilSatuData(id);
            res.status(200).json({ sukses: true, data: hasil });
        } catch (error) {
            res.status(404).json({ sukses: false, pesan: 'Data tidak ditemukan' });
        }
    }

    async tambah(req, res) {
        try {
            const { judul, konten, kategori, gambar_url } = req.body;

            if (!judul || !konten) {
                return res.status(400).json({ sukses: false, pesan: 'Judul dan konten wajib diisi' });
            }

            // Ambil penulis_id dari JWT middleware (req.pengguna.id)
            const penulis_id = req.pengguna ? req.pengguna.id : null;

            const dataBaru = { judul, konten, kategori, gambar_url, penulis_id };
            const hasil = await ModelInformasiPangan.tambahData(dataBaru);
            res.status(201).json({ sukses: true, pesan: 'Informasi pangan berhasil ditambahkan', data: hasil });
        } catch (error) {
            res.status(500).json({ sukses: false, pesan: error.message });
        }
    }

    async perbarui(req, res) {
        try {
            const { id } = req.params;
            const { judul, konten, kategori, gambar_url } = req.body;

            if (!judul || !konten) {
                return res.status(400).json({ sukses: false, pesan: 'Judul dan konten wajib diisi' });
            }

            const hasil = await ModelInformasiPangan.perbaruiData(id, { judul, konten, kategori, gambar_url });
            res.status(200).json({ sukses: true, pesan: 'Informasi pangan berhasil diperbarui', data: hasil });
        } catch (error) {
            res.status(500).json({ sukses: false, pesan: error.message });
        }
    }

    async hapus(req, res) {
        try {
            const { id } = req.params;
            await ModelInformasiPangan.hapusData(id);
            res.status(200).json({ sukses: true, pesan: 'Informasi pangan berhasil dihapus' });
        } catch (error) {
            res.status(500).json({ sukses: false, pesan: error.message });
        }
    }
}

module.exports = new InformasiPanganController();
