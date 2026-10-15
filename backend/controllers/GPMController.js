// ===================================================================================
// CONTROLLER GPM (GERAKAN PANGAN MURAH) - OOP
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Pengendali Alur Logika Acara GPM, Pendaftaran Antrean & Scan Barcode Petugas
// ===================================================================================

const ModelAcaraGPM = require('../models/AcaraGPMModel');
const ModelPendaftarGPM = require('../models/PendaftarGPMModel');

class GPMController {

    // [Modul Controller] 1. Mengambil semua jadwal & lokasi acara GPM untuk publik (Peta & List)
    async daftarAcara(req, res) {
        try {
            const { status, kecamatan } = req.query;
            const data = await ModelAcaraGPM.ambilSemua({ status, kecamatan });
            return res.status(200).json({
                sukses: true,
                total: data.length,
                data: data
            });
        } catch (error) {
            console.error('[GPMController] Error ambil daftar acara:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat daftar acara GPM: ' + error.message
            });
        }
    }

    // [Modul Controller] 2. Mengambil detail satu acara GPM (beserta info sisa kuota)
    async detailAcara(req, res) {
        try {
            const { id } = req.params;
            const acara = await ModelAcaraGPM.ambilBerdasarkanId(id);
            const statistikAntrean = await ModelPendaftarGPM.ambilStatistikAntrian(id);
            
            return res.status(200).json({
                sukses: true,
                data: {
                    ...acara,
                    antrean_terisi: statistikAntrean.total_antrean,
                    sisa_kuota: Math.max(0, acara.kuota_maksimal - statistikAntrean.total_antrean)
                }
            });
        } catch (error) {
            console.error('[GPMController] Error ambil detail acara:', error);
            return res.status(404).json({
                sukses: false,
                pesan: error.message || 'Acara GPM tidak ditemukan'
            });
        }
    }

    // [Modul Controller] 3. Petugas Membuat / Menjadwalkan Acara GPM Baru
    async tambahAcara(req, res) {
        try {
            const { nama_acara, lokasi, kecamatan, tanggal, jam_mulai, jam_selesai, latitude, longitude, kuota_maksimal, komoditas_tersedia, deskripsi } = req.body;

            if (!nama_acara || !lokasi || !tanggal) {
                return res.status(400).json({
                    sukses: false,
                    pesan: 'Nama acara, lokasi, dan tanggal wajib diisi!'
                });
            }

            const dataBaru = await ModelAcaraGPM.tambah({
                nama_acara,
                lokasi,
                kecamatan,
                tanggal,
                jam_mulai,
                jam_selesai,
                latitude,
                longitude,
                kuota_maksimal,
                komoditas_tersedia,
                deskripsi,
                petugas_id: req.pengguna ? req.pengguna.id : null
            });

            return res.status(201).json({
                sukses: true,
                pesan: 'Acara Gerakan Pangan Murah berhasil dijadwalkan!',
                data: dataBaru
            });
        } catch (error) {
            console.error('[GPMController] Error tambah acara GPM:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal membuat acara GPM: ' + error.message
            });
        }
    }

    // [Modul Controller] 4. Petugas Memperbarui Acara GPM
    async perbaruiAcara(req, res) {
        try {
            const { id } = req.params;
            const dataUpdate = await ModelAcaraGPM.perbarui(id, req.body);
            return res.status(200).json({
                sukses: true,
                pesan: 'Informasi acara GPM berhasil diperbarui',
                data: dataUpdate
            });
        } catch (error) {
            console.error('[GPMController] Error perbarui acara GPM:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memperbarui acara: ' + error.message
            });
        }
    }

    // [Modul Controller] 5. Petugas Menghapus Acara GPM
    async hapusAcara(req, res) {
        try {
            const { id } = req.params;
            await ModelAcaraGPM.hapus(id);
            return res.status(200).json({
                sukses: true,
                pesan: 'Acara GPM berhasil dihapus'
            });
        } catch (error) {
            console.error('[GPMController] Error hapus acara GPM:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal menghapus acara: ' + error.message
            });
        }
    }

    // [Modul Controller] 6. Statistik Keseluruhan GPM & Antrean untuk Dashboard Petugas
    async ambilStatistik(req, res) {
        try {
            const statsGPM = await ModelAcaraGPM.ambilStatistik();
            const statsAntrean = await ModelPendaftarGPM.ambilStatistikAntrian();

            return res.status(200).json({
                sukses: true,
                data: {
                    ...statsGPM,
                    ...statsAntrean
                }
            });
        } catch (error) {
            console.error('[GPMController] Error ambil statistik GPM:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat statistik GPM: ' + error.message
            });
        }
    }

    // [Modul Controller] 7. Masyarakat Mengambil Antrean & Barcode (PUBLIK - TANPA LOGIN)
    async ambilNomorAntrean(req, res) {
        try {
            const { acara_id, nama_lengkap, nomor_telepon } = req.body;

            if (!acara_id || !nama_lengkap || !nomor_telepon) {
                return res.status(400).json({
                    sukses: false,
                    pesan: 'Mohon lengkapi pilihan Acara GPM, Nama Lengkap, dan Nomor Telepon Anda!'
                });
            }

            // Validasi keberadaan acara dan sisa kuota
            const acara = await ModelAcaraGPM.ambilBerdasarkanId(acara_id);
            const statsAcara = await ModelPendaftarGPM.ambilStatistikAntrian(acara_id);

            if (acara.kuota_maksimal && statsAcara.total_antrean >= acara.kuota_maksimal) {
                return res.status(400).json({
                    sukses: false,
                    pesan: 'Mohon maaf, kuota antrean untuk acara GPM ini sudah penuh.'
                });
            }

            // Simpan pendaftar dan buat barcode
            const hasilDaftar = await ModelPendaftarGPM.daftarAcara(acara_id, nama_lengkap, nomor_telepon);

            return res.status(201).json({
                sukses: true,
                pesan: 'Nomor antrean dan barcode berhasil dibuat!',
                data: {
                    tiket: hasilDaftar,
                    acara: {
                        nama_acara: acara.nama_acara,
                        lokasi: acara.lokasi,
                        kecamatan: acara.kecamatan,
                        tanggal: acara.tanggal,
                        jam: `${acara.jam_mulai} - ${acara.jam_selesai} WITA`
                    }
                }
            });
        } catch (error) {
            console.error('[GPMController] Error pendaftaran antrean GPM:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memproses antrean: ' + error.message
            });
        }
    }

    // [Modul Controller] 8. Petugas Melihat Daftar Orang yang Sudah Ambil Nomor Antrean
    async daftarPendaftar(req, res) {
        try {
            const { acara_id } = req.params;
            const pendaftar = await ModelPendaftarGPM.ambilSemuaPendaftar(acara_id);
            const statistik = await ModelPendaftarGPM.ambilStatistikAntrian(acara_id);

            return res.status(200).json({
                sukses: true,
                total: pendaftar.length,
                statistik: statistik,
                data: pendaftar
            });
        } catch (error) {
            console.error('[GPMController] Error ambil pendaftar GPM:', error);
            return res.status(500).json({
                sukses: false,
                pesan: 'Gagal memuat daftar pendaftar: ' + error.message
            });
        }
    }

    // [Modul Controller] 9. Petugas Scan Barcode Tiket Masyarakat (Melihat Profil & Status)
    async scanBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const pendaftar = await ModelPendaftarGPM.cariBerdasarkanBarcode(barcode);
            const acara = await ModelAcaraGPM.ambilBerdasarkanId(pendaftar.acara_id).catch(() => null);

            return res.status(200).json({
                sukses: true,
                pesan: 'Data pendaftar antrean ditemukan',
                data: {
                    ...pendaftar,
                    acara: acara ? {
                        nama_acara: acara.nama_acara,
                        lokasi: acara.lokasi,
                        tanggal: acara.tanggal
                    } : null
                }
            });
        } catch (error) {
            console.error('[GPMController] Error scan barcode:', error);
            return res.status(404).json({
                sukses: false,
                pesan: error.message || 'Data antrean dengan barcode ini tidak ditemukan'
            });
        }
    }

    // [Modul Controller] 10. Petugas Konfirmasi Kehadiran / Layani Pendaftar
    async verifikasiKehadiran(req, res) {
        try {
            const { barcode } = req.params;
            const petugas_id = req.pengguna ? req.pengguna.id : null;
            const hasilVerifikasi = await ModelPendaftarGPM.verifikasiKehadiran(barcode, petugas_id);

            return res.status(200).json({
                sukses: true,
                pesan: `Pendaftar ${hasilVerifikasi.nama_pendaftar} (Antrean #${hasilVerifikasi.nomor_antrean}) berhasil diverifikasi hadir!`,
                data: hasilVerifikasi
            });
        } catch (error) {
            console.error('[GPMController] Error verifikasi kehadiran:', error);
            return res.status(400).json({
                sukses: false,
                pesan: error.message || 'Gagal memverifikasi kehadiran'
            });
        }
    }
}

module.exports = new GPMController();
