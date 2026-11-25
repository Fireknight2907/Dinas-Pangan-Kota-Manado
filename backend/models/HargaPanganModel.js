// ===================================================================================
// MODEL HARGA PANGAN (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola operasi CRUD basis data ke tabel 'harga_pangan' (Supabase)
// ===================================================================================

const klienBasisData = require('../config/database');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

class ModelHargaPangan {
    constructor() {
        // Nama tabel di Supabase
        this.namaTabel = 'harga_pangan';

        // Data in-memory (fallback) sesuai desain Gambar 1 & Gambar 2
        this.dataCadangan = [
            {
                id: '1',
                nama_komoditas: 'Beras Medium',
                kategori: 'Bahan Pokok',
                satuan: 'kg',
                harga: 13500,
                nama_pasar: 'Pasar Bersehati Karombasan',
                tanggal_penetapan: '14 Oktober 2026',
                status: 'Terbit', // 'Terbit' atau 'Draft'
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-14T08:00:00Z'
            },
            {
                id: '2',
                nama_komoditas: 'Minyak Goreng Kemasan',
                kategori: 'Bahan Pokok',
                satuan: 'liter',
                harga: 18000,
                nama_pasar: 'Pasar Tradisional Tuminting',
                tanggal_penetapan: '14 Oktober 2026',
                status: 'Draft', // Draft harga (belum terbit)
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-14T08:30:00Z'
            },
            {
                id: '3',
                nama_komoditas: 'Gula Pasir',
                kategori: 'Bahan Pokok',
                satuan: 'kg',
                harga: 16000,
                nama_pasar: 'Pasar Bersehati Sario',
                tanggal_penetapan: '14 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-14T09:00:00Z'
            },
            {
                id: '4',
                nama_komoditas: 'Beras Premium',
                kategori: 'Bahan Pokok',
                satuan: 'kg',
                harga: 15500,
                nama_pasar: 'Pasar Bersehati Karombasan',
                tanggal_penetapan: '8 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-08T08:00:00Z'
            },
            {
                id: '5',
                nama_komoditas: 'Telur Ayam',
                kategori: 'Hewani',
                satuan: 'kg',
                harga: 28000,
                nama_pasar: 'Pasar Bersehati Sario',
                tanggal_penetapan: '8 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-08T08:00:00Z'
            },
            {
                id: '6',
                nama_komoditas: 'Daging Ayam',
                kategori: 'Hewani',
                satuan: 'kg',
                harga: 38000,
                nama_pasar: 'Pasar Bersehati Sario',
                tanggal_penetapan: '8 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-08T08:00:00Z'
            },
            {
                id: '7',
                nama_komoditas: 'Daging Sapi',
                kategori: 'Hewani',
                satuan: 'kg',
                harga: 135000,
                nama_pasar: 'Pasar Tradisional Bahu',
                tanggal_penetapan: '8 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-08T08:00:00Z'
            },
            {
                id: '8',
                nama_komoditas: 'Bawang Merah',
                kategori: 'Sayuran',
                satuan: 'kg',
                harga: 32000,
                nama_pasar: 'Pasar Tradisional Bahu',
                tanggal_penetapan: '8 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-08T08:00:00Z'
            },
            {
                id: '9',
                nama_komoditas: 'Bawang Putih',
                kategori: 'Sayuran',
                satuan: 'kg',
                harga: 35000,
                nama_pasar: 'Pasar Bersehati Karombasan',
                tanggal_penetapan: '8 Oktober 2026',
                status: 'Terbit',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                dibuat_pada: '2026-10-08T08:00:00Z'
            }
        ];
    }

    // Fungsi mengecek apakah Supabase siap dipakai
    apakahSupabaseAktif() {
        return !!(process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData);
    }

    // Fungsi mengambil semua data komoditas dengan opsi filter kategori, multi-pasar, status, pencarian nama, dan urutan
    async ambilSemuaData(filter = {}) {
        if (this.apakahSupabaseAktif()) {
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

        // Mode tanpa koneksi database aktif mengembalikan kosong (bebas data dummy untuk tampilan publik)
        return [];
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

    // Mengambil ringkasan statistik untuk Dashboard Petugas (Sesuai Gambar 1)
    async ambilStatistikDashboard() {
        const semua = await this.ambilSemuaData();
        const hargaDitetapkan = semua.filter(item => item.status === 'Terbit').length;
        const draftHarga = semua.filter(item => item.status === 'Draft').length;

        return {
            harga_ditetapkan: hargaDitetapkan,
            draft_harga: draftHarga,
            gpm_terjadwal: 2, // 2 kegiatan mendatang
            gpm_selesai: 1    // 1 kegiatan bulan ini
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
        if (this.apakahSupabaseAktif()) {
            const { data, error } = await klienBasisData
                .from(this.namaTabel)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        }

        const hasil = this.dataCadangan.find(item => item.id === id);
        if (!hasil) throw new Error('Data komoditas pangan tidak ditemukan');
        return hasil;
    }

    // Fungsi menambahkan data komoditas pangan baru oleh petugas
    async tambahData(dataBaru) {
        const dataBersih = {
            ...dataBaru,
            status: dataBaru.status || 'Terbit'
        };

        if (this.apakahSupabaseAktif()) {
            const { data, error } = await klienBasisData
                .from(this.namaTabel)
                .insert([dataBersih])
                .select();

            if (error) throw error;
            return data[0];
        }

        const dataMasuk = {
            id: uuidv4(),
            ...dataBersih,
            dibuat_pada: new Date().toISOString(),
            diperbarui_pada: new Date().toISOString()
        };
        this.dataCadangan.unshift(dataMasuk);
        return dataMasuk;
    }

    // Fungsi memperbarui harga atau data komoditas pangan
    async perbaruiData(id, dataUpdate) {
        if (this.apakahSupabaseAktif()) {
            const { data, error } = await klienBasisData
                .from(this.namaTabel)
                .update({ ...dataUpdate, diperbarui_pada: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;
            return data[0];
        }

        const indeks = this.dataCadangan.findIndex(item => item.id === id);
        if (indeks === -1) throw new Error('Data tidak ditemukan');
        this.dataCadangan[indeks] = {
            ...this.dataCadangan[indeks],
            ...dataUpdate,
            diperbarui_pada: new Date().toISOString()
        };
        return this.dataCadangan[indeks];
    }

    // Fungsi menghapus komoditas pangan
    async hapusData(id) {
        if (this.apakahSupabaseAktif()) {
            const { error } = await klienBasisData
                .from(this.namaTabel)
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { berhasil: true };
        }

        this.dataCadangan = this.dataCadangan.filter(item => item.id !== id);
        return { berhasil: true };
    }
}

// Mengekspor instance tunggal (Singleton OOP)
module.exports = new ModelHargaPangan();
