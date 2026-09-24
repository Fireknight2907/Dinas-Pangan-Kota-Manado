const klienBasisData = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ModelPendaftarGPM {
    constructor() {
        this.namaTabel = 'pendaftar_gpm';
    }

    // Hanya admin/petugas yang melihat semua
    async ambilSemuaPendaftar(acara_id) {
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('*')
            .eq('acara_id', acara_id)
            .order('nomor_antrean', { ascending: true });

        if (error) throw error;
        return data;
    }

    // Fungsi untuk masyarakat (tanpa login) mendaftar
    async daftarAcara(acara_id, nama_pendaftar) {
        // 1. Ambil nomor antrean terakhir
        const { data: antreanTerakhir, error: errorAntrean } = await klienBasisData
            .from(this.namaTabel)
            .select('nomor_antrean')
            .eq('acara_id', acara_id)
            .order('nomor_antrean', { ascending: false })
            .limit(1);
        
        let nomor_antrean_baru = 1;
        if (antreanTerakhir && antreanTerakhir.length > 0) {
            nomor_antrean_baru = antreanTerakhir[0].nomor_antrean + 1;
        }

        // 2. Buat kode barcode unik
        const kode_barcode = `GPM-${acara_id.substring(0,4).toUpperCase()}-${uuidv4().substring(0,8).toUpperCase()}`;

        // 3. Simpan pendaftar baru
        const pendaftarBaru = {
            acara_id,
            nama_pendaftar,
            nomor_antrean: nomor_antrean_baru,
            kode_barcode
        };

        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .insert([pendaftarBaru])
            .select();

        if (error) throw error;
        return data[0]; // Kembalikan data pendaftar (termasuk barcode dan nomor)
    }
}

module.exports = new ModelPendaftarGPM();
