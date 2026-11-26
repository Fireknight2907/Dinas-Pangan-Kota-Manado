// ===================================================================================
// MODEL ACARA GPM (GERAKAN PANGAN MURAH) - OOP
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Basis Data Pengelolaan Jadwal & Lokasi Acara GPM (100% Basis Data Riil — 0% Dummy)
// ===================================================================================

const klienBasisData = require('../config/database');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

class ModelAcaraGPM {
    constructor() {
        this.namaTabel = 'acara_gpm';
    }

    apakahDbAktif() {
        return !!(process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData);
    }

    // [Modul Model] 1. Mengambil semua data acara GPM riil dari basis data (tanpa dummy fallback)
    async ambilSemua(filter = {}) {
        if (!this.apakahDbAktif()) {
            return [];
        }

        let query = klienBasisData
            .from(this.namaTabel)
            .select('*')
            .order('tanggal', { ascending: true });

        if (filter.status && filter.status !== 'Semua') {
            query = query.eq('status', filter.status);
        }
        if (filter.kecamatan && filter.kecamatan !== 'Semua') {
            query = query.eq('kecamatan', filter.kecamatan);
        }

        const { data, error } = await query;
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // [Modul Model] 2. Mengambil detail satu acara GPM berdasarkan ID
    async ambilBerdasarkanId(id) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia');
        }
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) throw new Error('Acara GPM tidak ditemukan');
        return data;
    }

    // [Modul Model] 3. Menambahkan jadwal acara GPM baru oleh Petugas
    async tambah(dataAcara) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia');
        }

        const itemBaru = {
            id: uuidv4(),
            nama_acara: dataAcara.nama_acara,
            lokasi: dataAcara.lokasi,
            kecamatan: dataAcara.kecamatan || 'Wenang',
            tanggal: dataAcara.tanggal || new Date().toISOString().split('T')[0],
            jam_mulai: dataAcara.jam_mulai || '08:00',
            jam_selesai: dataAcara.jam_selesai || '14:00',
            latitude: parseFloat(dataAcara.latitude) || 1.4883,
            longitude: parseFloat(dataAcara.longitude) || 124.8436,
            kuota_maksimal: parseInt(dataAcara.kuota_maksimal, 10) || 200,
            komoditas_tersedia: dataAcara.komoditas_tersedia || '',
            deskripsi: dataAcara.deskripsi || '',
            status: dataAcara.status || 'Aktif',
            petugas_id: dataAcara.petugas_id || null,
            dibuat_pada: new Date().toISOString()
        };

        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .insert([itemBaru])
            .select();

        if (error) throw error;
        return Array.isArray(data) && data.length > 0 ? data[0] : itemBaru;
    }

    // [Modul Model] 4. Memperbarui informasi acara GPM oleh Petugas
    async perbarui(id, dataUpdate) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia');
        }

        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .update({ ...dataUpdate, diperbarui_pada: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Acara GPM tidak ditemukan untuk diperbarui');
        return data[0];
    }

    // [Modul Model] 5. Menghapus acara GPM
    async hapus(id) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia');
        }

        const { error } = await klienBasisData
            .from(this.namaTabel)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // [Modul Model] 6. Mengambil ringkasan statistik GPM riil dari basis data
    async ambilStatistik() {
        const semua = await this.ambilSemua();
        const totalAktif = semua.filter(item => String(item.status || '').toLowerCase() === 'aktif').length;
        const totalSelesai = semua.filter(item => String(item.status || '').toLowerCase() === 'selesai').length;
        const totalKapasitasKuota = semua.reduce((sum, item) => sum + (Number(item.kuota_maksimal) || 0), 0);

        return {
            total_gpm: semua.length,
            gpm_aktif: totalAktif,
            gpm_selesai: totalSelesai,
            total_kuota_disediakan: totalKapasitasKuota
        };
    }
}

module.exports = new ModelAcaraGPM();
