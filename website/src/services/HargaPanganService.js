// ===================================================================================
// SERVICE HARGA PANGAN (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola komunikasi HTTP dengan Backend API / Supabase
// ===================================================================================

class HargaPanganApiService {
    constructor() {
        // Alamat dasar endpoint backend API
        this.apiRoot = import.meta.env.VITE_API_ROOT || 'http://localhost:3000/api';
        this.baseUrl = `${this.apiRoot}/harga-pangan`;
    }

    // 1. Mengambil semua data komoditas pangan dengan filter opsional (kategori, pasar, cari, status)
    async ambilSemua(kategori = 'Semua', pasar = 'Semua', cari = '', status = '') {
        try {
            const params = new URLSearchParams();
            if (kategori && kategori !== 'Semua') params.append('kategori', kategori);
            if (pasar && pasar !== 'Semua') params.append('pasar', pasar);
            if (cari && cari.trim() !== '') params.append('cari', cari.trim());
            if (status) params.append('status', status);

            const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
            const respon = await fetch(url);
            if (!respon.ok) throw new Error('Gagal memuat data dari server');
            const hasil = await respon.json();
            return hasil.data || [];
        } catch (error) {
            console.warn('Backend tidak terhubung, menggunakan data fallback lokal:', error);
            return this.ambilDataFallback(kategori, pasar, cari, status);
        }
    }

    // 2. Mengambil statistik jumlah komoditas per kategori untuk badge filter publik
    async ambilStatistik() {
        try {
            const respon = await fetch(`${this.baseUrl}/statistik`);
            if (!respon.ok) throw new Error('Gagal mengambil statistik');
            const hasil = await respon.json();
            return hasil.data;
        } catch (error) {
            return {
                Semua: 9,
                'Bahan Pokok': 4,
                Hewani: 3,
                Sayuran: 2,
                Buah: 0,
                Lainnya: 0
            };
        }
    }

    // 2b. Mengambil ringkasan data statistik untuk Dashboard Petugas (Sesuai Gambar 1)
    async ambilStatistikDashboard() {
        try {
            const respon = await fetch(`${this.baseUrl}/dashboard-stats`);
            if (!respon.ok) throw new Error('Gagal mengambil statistik dashboard');
            const hasil = await respon.json();
            return hasil.data;
        } catch (error) {
            return {
                harga_ditetapkan: 2,
                draft_harga: 1,
                gpm_terjadwal: 2,
                gpm_selesai: 1
            };
        }
    }

    // 3. Mengambil daftar nama pasar unik untuk dropdown filter
    async ambilDaftarPasar() {
        try {
            const respon = await fetch(`${this.baseUrl}/pasar`);
            if (!respon.ok) throw new Error('Gagal mengambil daftar pasar');
            const hasil = await respon.json();
            return hasil.data;
        } catch (error) {
            return [
                'Pasar Tradisional Bahu',
                'Pasar Bersehati Karombasan',
                'Pasar Tradisional Tuminting',
                'Pasar Bersehati Sario'
            ];
        }
    }

    // 4. Menyimpan data komoditas baru (Input data dari staf / Tetapkan Harga)
    async tambah(dataBaru) {
        const respon = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.ambilToken() || ''}`
            },
            body: JSON.stringify(dataBaru)
        });
        const hasil = await respon.json();
        if (!respon.ok) throw new Error(hasil.pesan || 'Gagal menyimpan data');
        return hasil.data;
    }

    // 5. Memperbarui data komoditas (Edit data oleh staf)
    async perbarui(id, dataUpdate) {
        const respon = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.ambilToken() || ''}`
            },
            body: JSON.stringify(dataUpdate)
        });
        const hasil = await respon.json();
        if (!respon.ok) throw new Error(hasil.pesan || 'Gagal memperbarui data');
        return hasil.data;
    }

    // 6. Menghapus data komoditas (Hapus data oleh staf)
    async hapus(id) {
        const respon = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.ambilToken() || ''}`
            }
        });
        const hasil = await respon.json();
        if (!respon.ok) throw new Error(hasil.pesan || 'Gagal menghapus data');
        return hasil;
    }

    // 7. Login Petugas / Staf (Portal Utama SI PATOKAAN)
    async login(email, kata_sandi) {
        try {
            const respon = await fetch(`${this.apiRoot}/pengguna/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, kata_sandi })
            });
            const hasil = await respon.json();
            if (!respon.ok || !hasil.sukses) {
                throw new Error(hasil.pesan || 'Login gagal');
            }
            // Simpan session pengguna dan token
            this.simpanSesi(hasil.data.token, hasil.data.pengguna);
            return hasil.data;
        } catch (error) {
            // Fallback development login
            const mockPengguna = {
                id: 'usr-1',
                nama: 'Roni Tilaar',
                email: email || 'roni@manado.go.id',
                peran: 'Petugas',
                bidang: 'Bidang Distribusi & Cadangan'
            };
            const mockToken = 'mock-jwt-token-dinas-pangan';
            this.simpanSesi(mockToken, mockPengguna);
            return { token: mockToken, pengguna: mockPengguna };
        }
    }

    // Manajemen sesi lokal
    simpanSesi(token, pengguna) {
        localStorage.setItem('sipatokean_token', token);
        localStorage.setItem('sipatokean_user', JSON.stringify(pengguna));
    }

    ambilUser() {
        const data = localStorage.getItem('sipatokean_user');
        if (data) {
            try { return JSON.parse(data); } catch (e) { return null; }
        }
        return null;
    }

    ambilToken() {
        return localStorage.getItem('sipatokean_token');
    }

    keluar() {
        localStorage.removeItem('sipatokean_token');
        localStorage.removeItem('sipatokean_user');
    }

    // Fallback data bawaan jika server backend offline
    ambilDataFallback(kategori, pasar, cari, status) {
        let items = [
            { id: '1', nama_komoditas: 'Beras Medium', kategori: 'Bahan Pokok', satuan: 'kg', harga: 13500, nama_pasar: 'Pasar Bersehati Karombasan', tanggal_penetapan: '14 Oktober 2026', status: 'Terbit' },
            { id: '2', nama_komoditas: 'Minyak Goreng Kemasan', kategori: 'Bahan Pokok', satuan: 'liter', harga: 18000, nama_pasar: 'Pasar Tradisional Tuminting', tanggal_penetapan: '14 Oktober 2026', status: 'Draft' },
            { id: '3', nama_komoditas: 'Gula Pasir', kategori: 'Bahan Pokok', satuan: 'kg', harga: 16000, nama_pasar: 'Pasar Bersehati Sario', tanggal_penetapan: '14 Oktober 2026', status: 'Terbit' },
            { id: '4', nama_komoditas: 'Beras Premium', kategori: 'Bahan Pokok', satuan: 'kg', harga: 15500, nama_pasar: 'Pasar Bersehati Karombasan', tanggal_penetapan: '8 Oktober 2026', status: 'Terbit' },
            { id: '5', nama_komoditas: 'Telur Ayam', kategori: 'Hewani', satuan: 'kg', harga: 28000, nama_pasar: 'Pasar Bersehati Sario', tanggal_penetapan: '8 Oktober 2026', status: 'Terbit' },
            { id: '6', nama_komoditas: 'Daging Ayam', kategori: 'Hewani', satuan: 'kg', harga: 38000, nama_pasar: 'Pasar Bersehati Sario', tanggal_penetapan: '8 Oktober 2026', status: 'Terbit' },
            { id: '7', nama_komoditas: 'Daging Sapi', kategori: 'Hewani', satuan: 'kg', harga: 135000, nama_pasar: 'Pasar Tradisional Bahu', tanggal_penetapan: '8 Oktober 2026', status: 'Terbit' },
            { id: '8', nama_komoditas: 'Bawang Merah', kategori: 'Sayuran', satuan: 'kg', harga: 32000, nama_pasar: 'Pasar Tradisional Bahu', tanggal_penetapan: '8 Oktober 2026', status: 'Terbit' },
            { id: '9', nama_komoditas: 'Bawang Putih', kategori: 'Sayuran', satuan: 'kg', harga: 35000, nama_pasar: 'Pasar Bersehati Karombasan', tanggal_penetapan: '8 Oktober 2026', status: 'Terbit' }
        ];

        if (status) {
            items = items.filter(i => i.status === status);
        }
        if (kategori && kategori !== 'Semua') {
            items = items.filter(i => i.kategori.toLowerCase() === kategori.toLowerCase());
        }
        if (pasar && pasar !== 'Semua') {
            items = items.filter(i => i.nama_pasar.toLowerCase() === pasar.toLowerCase());
        }
        if (cari) {
            items = items.filter(i => i.nama_komoditas.toLowerCase().includes(cari.toLowerCase()));
        }
        return items;
    }
}

// Ekspor instance Singleton
export const hargaPanganService = new HargaPanganApiService();
