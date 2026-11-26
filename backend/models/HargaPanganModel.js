// ===================================================================================
// MODEL HARGA PANGAN (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola operasi CRUD basis data ke tabel 'harga_pangan' (100% Data Riil)
// ===================================================================================

const klienBasisData = require('../config/database');
const ModelAcaraGPM = require('./AcaraGPMModel');

class ModelHargaPangan {
    constructor() {
        this.namaTabel = 'harga_pangan';
    }

    apakahSupabaseAktif() {
        return !!(process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData);
    }

    // Fungsi mengambil semua data komoditas riil (0% data dummy fallback)
    async ambilSemuaData(filter = {}) {
        if (!this.apakahSupabaseAktif()) {
            return [];
        }

        let query = klienBasisData
            .from(this.namaTabel)
            .select('*');

        if (filter.status) {
            query = query.eq('status', filter.status);
        }

        if (filter.kategori && filter.kategori !== 'Semua') {
            query = query.eq('kategori', filter.kategori);
        }

        if (Array.isArray(filter.pasarList) && filter.pasarList.length > 0) {
            query = query.in('nama_pasar', filter.pasarList);
        } else if (filter.pasar && filter.pasar !== 'Semua') {
            query = query.eq('nama_pasar', filter.pasar);
        }

        if (filter.cari) {
            query = query.ilike('nama_komoditas', `%${filter.cari}%`);
        }

        if (filter.urutkan === 'termurah') {
            query = query.order('harga', { ascending: true });
        } else if (filter.urutkan === 'termahal') {
            query = query.order('harga', { ascending: false });
        } else if (filter.urutkan === 'abjad') {
            query = query.order('nama_komoditas', { ascending: true });
        } else {
            query = query.order('diperbarui_pada', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // Fungsi mencatat jumlah klik lihat komoditas oleh masyarakat ke basis data
    async tambahJumlahDilihat(namaKomoditas) {
        if (!this.apakahSupabaseAktif() || !namaKomoditas) return false;
        const { error } = await klienBasisData.rpc('rpc_tambah_lihat_komoditas', {
            p_nama_komoditas: String(namaKomoditas).trim()
        });
        if (error) throw error;
        return true;
    }

    // Mengambil ringkasan statistik riil untuk Dashboard Petugas (0% angka hardcoded)
    async ambilStatistikDashboard() {
        const [semua, statsGpm] = await Promise.all([
            this.ambilSemuaData(),
            ModelAcaraGPM.ambilStatistik().catch(() => ({ gpm_aktif: 0, gpm_selesai: 0 }))
        ]);
        const hargaDitetapkan = semua.filter(item => item.status === 'Terbit').length;
        const draftHarga = semua.filter(item => item.status === 'Draft').length;

        return {
            harga_ditetapkan: hargaDitetapkan,
            draft_harga: draftHarga,
            gpm_terjadwal: Number(statsGpm.gpm_aktif) || 0,
            gpm_selesai: Number(statsGpm.gpm_selesai) || 0
        };
    }

    // Fungsi menghitung jumlah komoditas per kategori untuk badge publik
    async ambilStatistikKategori() {
        const semua = await this.ambilSemuaData({ status: 'Terbit' });
        const hitungan = {
            Semua: semua.length,
            'Bahan Pokok': 0,
            Hewani: 0,
            Sayuran: 0,
            Buah: 0,
            Lainnya: 0
        };

        semua.forEach(item => {
            if (hitungan[item.kategori] !== undefined) {
                hitungan[item.kategori] += 1;
            } else {
                hitungan.Lainnya += 1;
            }
        });

        return hitungan;
    }

    // Fungsi mengambil detail 1 komoditas berdasarkan ID
    async ambilSatuData(id) {
        if (!this.apakahSupabaseAktif()) {
            throw new Error('Basis data tidak tersedia');
        }
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) throw new Error('Data komoditas pangan tidak ditemukan');
        return data;
    }

    // Fungsi menambahkan data komoditas pangan baru oleh petugas
    async tambahData(dataBaru) {
        if (!this.apakahSupabaseAktif()) {
            throw new Error('Basis data tidak tersedia');
        }
        const dataBersih = {
            ...dataBaru,
            status: dataBaru.status || 'Terbit'
        };

        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .insert([dataBersih])
            .select();

        if (error) throw error;
        return data[0];
    }

    // Fungsi memperbarui harga atau data komoditas pangan
    async perbaruiData(id, dataUpdate) {
        if (!this.apakahSupabaseAktif()) {
            throw new Error('Basis data tidak tersedia');
        }
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .update({ ...dataUpdate, diperbarui_pada: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Data tidak ditemukan');
        return data[0];
    }

    // Fungsi menghapus komoditas pangan
    async hapusData(id) {
        if (!this.apakahSupabaseAktif()) {
            throw new Error('Basis data tidak tersedia');
        }
        const { error } = await klienBasisData
            .from(this.namaTabel)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { berhasil: true };
    }
}

module.exports = new ModelHargaPangan();
