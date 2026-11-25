// ===================================================================================
// Modul Model Riwayat Harga Pangan (OOP)
// Fungsi: Mengambil dan memfilter catatan riwayat perubahan harga komoditas resmi
//         secara langsung dari tabel 'riwayat_harga_pangan' di basis data (tanpa dummy).
// ===================================================================================

const klienBasisData = require('../config/database');

class ModelRiwayatHarga {
    constructor() {
        this.namaTabel = 'riwayat_harga_pangan';
    }

    // Mengecek kesiapan koneksi ke basis data Supabase
    apakahDatabaseAktif() {
        return !!(process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData);
    }

    // Mengambil riwayat perubahan harga riil per komoditas, opsional filter multi-pasar dan rentang hari
    async ambilRiwayatKomoditas({ namaKomoditas = '', pasarList = [], rentangHari = 30 } = {}) {
        if (!this.apakahDatabaseAktif()) {
            return [];
        }

        let query = klienBasisData
            .from(this.namaTabel)
            .select('*')
            .order('dicatat_pada', { ascending: true });

        if (namaKomoditas && namaKomoditas.trim() !== '') {
            query = query.ilike('nama_komoditas', namaKomoditas.trim());
        }

        if (Array.isArray(pasarList) && pasarList.length > 0) {
            query = query.in('nama_pasar', pasarList);
        }

        const hariAngka = Number(rentangHari);
        if (hariAngka > 0) {
            const batasTanggal = new Date();
            batasTanggal.setDate(batasTanggal.getDate() - hariAngka);
            query = query.gte('dicatat_pada', batasTanggal.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // Mengambil log perubahan harga terbaru untuk menghitung indikator naik/turun pada kartu publik
    async ambilRingkasanTerbaru(batasBaris = 300) {
        if (!this.apakahDatabaseAktif()) {
            return [];
        }

        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('id, harga_pangan_id, nama_komoditas, nama_pasar, satuan, harga_lama, harga_baru, selisih, keterangan, dicatat_pada')
            .order('dicatat_pada', { ascending: false })
            .limit(batasBaris);

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }
}

module.exports = new ModelRiwayatHarga();
