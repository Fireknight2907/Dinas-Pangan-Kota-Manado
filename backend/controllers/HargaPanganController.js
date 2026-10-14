// ===================================================================================
// CONTROLLER HARGA PANGAN (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi sebagai pengendali alur logika request dan response dari klien
// ===================================================================================

const ModelHargaPangan = require('../models/HargaPanganModel');

class HargaPanganController {

    // 1. Mengambil semua data harga komoditas (dengan filter kategori, pasar, keyword pencarian)
    async daftarSemua(req, res) {
        try {
            const { kategori, pasar, cari } = req.query;
            const data = await ModelHargaPangan.ambilSemuaData({ kategori, pasar, cari });
            return res.status(200).json({
                sukses: true,
                total: data.length,
                data: data
            });
        } catch (error) {
            console.error('Error saat mengambil daftar harga pangan:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat data harga pangan: ' + error.message
            });
        }
    }

    // 2. Mengambil statistik jumlah komoditas per kategori (untuk badge 'Semua', 'Bahan Pokok', dll.)
    async ambilStatistik(req, res) {
        try {
            const statistik = await ModelHargaPangan.ambilStatistikKategori();
            return res.status(200).json({
                sukses: true,
                data: statistik
            });
        } catch (error) {
            console.error('Error saat mengambil statistik kategori:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat statistik kategori: ' + error.message
            });
        }
    }

    // 2b. Mengambil ringkasan statistik untuk Dashboard Petugas (Sesuai Gambar 1: Harga Ditetapkan, Draft, GPM Terjadwal, GPM Selesai)
    async ambilStatistikDashboard(req, res) {
        try {
            const statistik = await ModelHargaPangan.ambilStatistikDashboard();
            return res.status(200).json({
                sukses: true,
                data: statistik
            });
        } catch (error) {
            console.error('Error saat mengambil statistik dashboard:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat statistik dashboard: ' + error.message
            });
        }
    }

    // 3. Mengambil daftar nama-nama pasar unik untuk dropdown filter
    async daftarPasar(req, res) {
        try {
            const semua = await ModelHargaPangan.ambilSemuaData();
            // Ambil daftar pasar unik
            const daftarPasar = [...new Set(semua.map(item => item.nama_pasar))];
            return res.status(200).json({
                sukses: true,
                data: daftarPasar
            });
        } catch (error) {
            console.error('Error saat mengambil daftar pasar:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat daftar pasar: ' + error.message
            });
        }
    }

    // 4. Mengambil detail 1 komoditas berdasarkan ID
    async detailSatu(req, res) {
        try {
            const { id } = req.params;
            const data = await ModelHargaPangan.ambilSatuData(id);
            return res.status(200).json({
                sukses: true,
                data: data
            });
        } catch (error) {
            return res.status(404).json({
                sukses: false,
                pesan: 'Data komoditas pangan tidak ditemukan'
            });
        }
    }

    // 5. Tambah data komoditas harga pangan baru (digunakan oleh staf/petugas)
    async tambah(req, res) {
        try {
            const { nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status } = req.body;

            // Validasi input form wajib
            if (!nama_komoditas || !harga || !nama_pasar) {
                return res.status(400).json({
                    sukses: false,
                    pesan: 'Nama komoditas, harga, dan nama pasar wajib diisi'
                });
            }

            // Ambil id staf/petugas jika ada dari middleware JWT
            const petugas_id = req.pengguna ? req.pengguna.id : null;

            const dataBaru = {
                nama_komoditas,
                kategori: kategori || 'Bahan Pokok',
                satuan: satuan || 'kg',
                harga: parseFloat(harga),
                nama_pasar,
                tanggal_penetapan: tanggal_penetapan || new Date().toISOString().split('T')[0],
                status: status || 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                petugas_id
            };

            const hasil = await ModelHargaPangan.tambahData(dataBaru);
            return res.status(201).json({
                sukses: true,
                pesan: 'Data harga komoditas pangan berhasil disimpan',
                data: hasil
            });
        } catch (error) {
            console.error('Error saat menambah data harga pangan:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal menambahkan data harga pangan: ' + error.message
            });
        }
    }

    // 6. Perbarui data komoditas harga pangan (oleh staf/petugas)
    async perbarui(req, res) {
        try {
            const { id } = req.params;
            const { nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status } = req.body;

            const dataUpdate = {};
            if (nama_komoditas) dataUpdate.nama_komoditas = nama_komoditas;
            if (kategori) dataUpdate.kategori = kategori;
            if (satuan) dataUpdate.satuan = satuan;
            if (harga) dataUpdate.harga = parseFloat(harga);
            if (nama_pasar) dataUpdate.nama_pasar = nama_pasar;
            if (tanggal_penetapan) dataUpdate.tanggal_penetapan = tanggal_penetapan;
            if (status) dataUpdate.status = status;

            const hasil = await ModelHargaPangan.perbaruiData(id, dataUpdate);
            return res.status(200).json({
                sukses: true,
                pesan: 'Data harga pangan berhasil diperbarui',
                data: hasil
            });
        } catch (error) {
            console.error('Error saat memperbarui data harga pangan:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memperbarui data harga pangan: ' + error.message
            });
        }
    }

    // 7. Hapus data komoditas pangan
    async hapus(req, res) {
        try {
            const { id } = req.params;
            await ModelHargaPangan.hapusData(id);
            return res.status(200).json({
                sukses: true,
                pesan: 'Data komoditas pangan berhasil dihapus'
            });
        } catch (error) {
            console.error('Error saat menghapus data harga pangan:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal menghapus data harga pangan: ' + error.message
            });
        }
    }
}

// Mengekspor instance controller tunggal
module.exports = new HargaPanganController();
