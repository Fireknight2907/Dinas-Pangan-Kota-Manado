// ===================================================================================
// MODEL ACARA GPM (GERAKAN PANGAN MURAH) - OOP
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Basis Data Pengelolaan Jadwal & Lokasi Acara GPM (Supabase + In-Memory Fallback)
// ===================================================================================

const klienBasisData = require('../config/database');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

class ModelAcaraGPM {
    constructor() {
        // Nama tabel di basis data Supabase
        this.namaTabel = 'acara_gpm';

        // Data cadangan lokal (in-memory fallback) di Kota Manado
        this.dataCadangan = [
            {
                id: 'gpm-001-sparta-tikala',
                nama_acara: 'Gerakan Pangan Murah (GPM) Sparta Tikala',
                lokasi: 'Lapangan Sparta Tikala (Depan Kantor Walikota Manado)',
                kecamatan: 'Tikala',
                tanggal: '2026-10-18',
                jam_mulai: '08:00',
                jam_selesai: '13:00',
                latitude: 1.4883,
                longitude: 124.8436,
                kuota_maksimal: 250,
                komoditas_tersedia: 'Beras SPHP 5kg (Rp 58.000), Minyak Goreng Minyakita 1L (Rp 15.000), Gula Pasir 1kg (Rp 16.500), Bawang Merah 1kg (Rp 28.000), Cabai Rawit 1kg (Rp 35.000)',
                deskripsi: 'GPM Khusus stabilisasi pasokan pangan menyambut akhir pekan. Terbuka untuk seluruh warga Kota Manado.',
                status: 'Aktif',
                dibuat_pada: '2026-10-14T07:00:00Z'
            },
            {
                id: 'gpm-002-pasar-bersehati',
                nama_acara: 'Gerakan Pangan Murah Karombasan Bersehati',
                lokasi: 'Pelataran Pasar Bersehati Karombasan',
                kecamatan: 'Wanea',
                tanggal: '2026-10-21',
                jam_mulai: '07:30',
                jam_selesai: '12:30',
                latitude: 1.4674,
                longitude: 124.8468,
                kuota_maksimal: 300,
                komoditas_tersedia: 'Beras Premium 5kg, Minyak Goreng Kita, Telur Ayam 1 Baki (Rp 52.000), Daging Ayam Segar',
                deskripsi: 'Penyaluran komoditas pangan murah langsung dari produsen lokal untuk menekan laju inflasi.',
                status: 'Aktif',
                dibuat_pada: '2026-10-14T08:00:00Z'
            },
            {
                id: 'gpm-003-pesisir-tuminting',
                nama_acara: 'GPM Pesisir Utara Tuminting',
                lokasi: 'Halaman Kantor Kecamatan Tuminting',
                kecamatan: 'Tuminting',
                tanggal: '2026-10-25',
                jam_mulai: '08:30',
                jam_selesai: '14:00',
                latitude: 1.5126,
                longitude: 124.8488,
                kuota_maksimal: 200,
                komoditas_tersedia: 'Beras SPHP, Minyak Goreng Kemasan, Gula Pasir, Ikan Laut Segar, Bumbu Dapur Lengkap',
                deskripsi: 'Gerakan Pangan Murah serentak untuk warga pesisir utara Kota Manado.',
                status: 'Aktif',
                dibuat_pada: '2026-10-13T09:30:00Z'
            }
        ];
    }

    // [Modul Model] 1. Mengambil semua data acara GPM (dengan filter status/kecamatan opsional)
    async ambilSemua(filter = {}) {
        try {
            if (klienBasisData) {
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
                if (!error && data && data.length > 0) {
                    return data;
                }
            }
        } catch (err) {
            console.warn('[ModelAcaraGPM] Basis data utama gagal/offline, beralih ke data cadangan:', err.message);
        }

        // Filter pada data fallback lokal
        return this.dataCadangan.filter(item => {
            const cocokStatus = !filter.status || filter.status === 'Semua' || item.status === filter.status;
            const cocokKecamatan = !filter.kecamatan || filter.kecamatan === 'Semua' || item.kecamatan.toLowerCase() === filter.kecamatan.toLowerCase();
            return cocokStatus && cocokKecamatan;
        });
    }

    // [Modul Model] 2. Mengambil detail satu acara GPM berdasarkan ID
    async ambilBerdasarkanId(id) {
        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) return data;
            }
        } catch (err) {
            console.warn('[ModelAcaraGPM] Gagal mengambil berdasarkan ID dari DB, periksa cadangan:', err.message);
        }

        const acara = this.dataCadangan.find(item => item.id === id);
        if (!acara) throw new Error('Acara GPM tidak ditemukan');
        return acara;
    }

    // [Modul Model] 3. Menambahkan jadwal acara GPM baru oleh Petugas
    async tambah(dataAcara) {
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
            komoditas_tersedia: dataAcara.komoditas_tersedia || 'Beras SPHP, Minyak Goreng, Gula Pasir',
            deskripsi: dataAcara.deskripsi || '',
            status: dataAcara.status || 'Aktif',
            petugas_id: dataAcara.petugas_id || null,
            dibuat_pada: new Date().toISOString()
        };

        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .insert([itemBaru])
                    .select();

                if (!error && data && data.length > 0) {
                    this.dataCadangan.unshift(data[0]);
                    return data[0];
                }
            }
        } catch (err) {
            console.warn('[ModelAcaraGPM] Gagal insert ke database, simpan ke memori cadangan:', err.message);
        }

        this.dataCadangan.unshift(itemBaru);
        return itemBaru;
    }

    // [Modul Model] 4. Memperbarui informasi acara GPM oleh Petugas
    async perbarui(id, dataUpdate) {
        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .update(dataUpdate)
                    .eq('id', id)
                    .select();

                if (!error && data && data.length > 0) {
                    const idx = this.dataCadangan.findIndex(item => item.id === id);
                    if (idx !== -1) this.dataCadangan[idx] = { ...this.dataCadangan[idx], ...data[0] };
                    return data[0];
                }
            }
        } catch (err) {
            console.warn('[ModelAcaraGPM] Gagal update di database:', err.message);
        }

        const idx = this.dataCadangan.findIndex(item => item.id === id);
        if (idx === -1) throw new Error('Acara GPM tidak ditemukan untuk diperbarui');
        this.dataCadangan[idx] = { ...this.dataCadangan[idx], ...dataUpdate, diperbarui_pada: new Date().toISOString() };
        return this.dataCadangan[idx];
    }

    // [Modul Model] 5. Menghapus acara GPM
    async hapus(id) {
        try {
            if (klienBasisData) {
                await klienBasisData
                    .from(this.namaTabel)
                    .delete()
                    .eq('id', id);
            }
        } catch (err) {
            console.warn('[ModelAcaraGPM] Gagal hapus di database:', err.message);
        }

        this.dataCadangan = this.dataCadangan.filter(item => item.id !== id);
        return true;
    }

    // [Modul Model] 6. Mengambil ringkasan statistik GPM untuk dashboard petugas
    async ambilStatistik() {
        const totalAktif = this.dataCadangan.filter(item => item.status === 'Aktif').length;
        const totalSelesai = this.dataCadangan.filter(item => item.status === 'Selesai').length;
        const totalKapasitasKuota = this.dataCadangan.reduce((sum, item) => sum + (item.kuota_maksimal || 0), 0);

        return {
            total_gpm: this.dataCadangan.length,
            gpm_aktif: totalAktif,
            gpm_selesai: totalSelesai,
            total_kuota_disediakan: totalKapasitasKuota
        };
    }
}

module.exports = new ModelAcaraGPM();
