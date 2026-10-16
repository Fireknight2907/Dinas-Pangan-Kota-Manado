// ===================================================================================
// SERVICE HARGA PANGAN (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola komunikasi HTTP dengan Backend API / Supabase / Local Storage
// ===================================================================================

class HargaPanganApiService {
    constructor() {
        this.apiRoot = import.meta.env.VITE_API_ROOT || 'http://localhost:3000/api';
        this.baseUrl = `${this.apiRoot}/harga-pangan`;
        this.inisialisasiMasterData();
    }

    inisialisasiMasterData() {
        // Master Akun Resmi Sesuai Permintaan
        if (!localStorage.getItem('sipatokean_master_users')) {
            const defaultUsers = [
                {
                    id: 'usr-effrend',
                    nama: 'Effrend',
                    username: 'effrend',
                    email: 'effrend@manado.go.id',
                    kata_sandi: '12345678',
                    peran: 'Staf',
                    bidang: 'Bidang Cadangan dan Distribusi Pangan',
                    foto_profil: ''
                },
                {
                    id: 'usr-regina',
                    nama: 'Regina',
                    username: 'regina',
                    email: 'regina@manado.go.id',
                    kata_sandi: '12345678',
                    peran: 'Admin',
                    bidang: 'Administrator Sistem (Superadmin)',
                    foto_profil: ''
                },
                {
                    id: 'usr-mareta',
                    nama: 'Mareta',
                    username: 'mareta',
                    email: 'mareta@manado.go.id',
                    kata_sandi: '12345678',
                    peran: 'Kepala Bagian',
                    bidang: 'Kepala Bagian Cadangan & Distribusi',
                    foto_profil: ''
                },
                {
                    id: 'usr-edrick',
                    nama: 'Edrick',
                    username: 'edrick',
                    email: 'edrick@manado.go.id',
                    kata_sandi: '12345678',
                    peran: 'Admin',
                    bidang: 'Administrator Sistem (Superadmin)',
                    foto_profil: ''
                }
            ];
            localStorage.setItem('sipatokean_master_users', JSON.stringify(defaultUsers));
        }

        // Master Kecamatan (Ditambah oleh Kepala Bagian/Admin, Staf hanya memilih)
        if (!localStorage.getItem('sipatokean_master_kecamatan')) {
            const defaultKecamatan = [
                'Wenang',
                'Tikala',
                'Wanea',
                'Sario',
                'Malalayang',
                'Tuminting',
                'Singkil',
                'Mapanget',
                'Paal Dua',
                'Bunaken',
                'Bunaken Kepulauan'
            ];
            localStorage.setItem('sipatokean_master_kecamatan', JSON.stringify(defaultKecamatan));
        }

        // Master Pasar (Ditambah oleh Kepala Bagian/Admin, Staf hanya memilih)
        if (!localStorage.getItem('sipatokean_master_pasar')) {
            const defaultPasar = [
                'Pasar Tradisional Bahu',
                'Pasar Bersehati Karombasan',
                'Pasar Tradisional Tuminting',
                'Pasar Bersehati Sario'
            ];
            localStorage.setItem('sipatokean_master_pasar', JSON.stringify(defaultPasar));
        }

        // Master Notifikasi
        if (!localStorage.getItem('sipatokean_notifikasi')) {
            const defaultNotif = [
                {
                    id: 'notif-1',
                    judul: 'Pendaftar Baru GPM',
                    pesan: 'Budi Santoso mendaftar di GPM Lapangan Tikala (#001)',
                    waktu: '5 menit lalu',
                    dibaca: false,
                    tipe: 'gpm'
                },
                {
                    id: 'notif-2',
                    judul: 'Pembaruan Harga Komoditas',
                    pesan: 'Staf Effrend menetapkan harga Beras Medium Rp 13.500/kg',
                    waktu: '20 menit lalu',
                    dibaca: false,
                    tipe: 'harga'
                },
                {
                    id: 'notif-3',
                    judul: 'Pengingat Laporan Pangan',
                    pesan: 'Rekapitulasi harga pangan pekan ini siap ditinjau oleh Kepala Bagian',
                    waktu: '1 jam lalu',
                    dibaca: false,
                    tipe: 'laporan'
                }
            ];
            localStorage.setItem('sipatokean_notifikasi', JSON.stringify(defaultNotif));
        }
    }

    // ─────────────────────────────────────────────
    // 1. DATA KOMODITAS
    // ─────────────────────────────────────────────
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
            return this.ambilDataFallback(kategori, pasar, cari, status);
        }
    }

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

    async ambilStatistikDashboard() {
        try {
            const respon = await fetch(`${this.baseUrl}/dashboard-stats`);
            if (!respon.ok) throw new Error('Gagal mengambil statistik dashboard');
            const hasil = await respon.json();
            return hasil.data;
        } catch (error) {
            const items = this.ambilDataFallback();
            const terbit = items.filter(i => i.status === 'Terbit').length;
            const draft = items.filter(i => i.status === 'Draft').length;
            return {
                harga_ditetapkan: terbit,
                draft_harga: draft,
                gpm_terjadwal: 2,
                gpm_selesai: 1
            };
        }
    }

    // ─────────────────────────────────────────────
    // 2. MASTER PASAR (KEPALA BAGIAN & ADMIN BISA ADD)
    // ─────────────────────────────────────────────
    async ambilDaftarPasar() {
        const tersimpan = localStorage.getItem('sipatokean_master_pasar');
        if (tersimpan) {
            try { return JSON.parse(tersimpan); } catch (e) {}
        }
        return [
            'Pasar Tradisional Bahu',
            'Pasar Bersehati Karombasan',
            'Pasar Tradisional Tuminting',
            'Pasar Bersehati Sario'
        ];
    }

    tambahPasar(namaPasar) {
        if (!namaPasar || !namaPasar.trim()) throw new Error('Nama pasar tidak boleh kosong');
        const daftar = JSON.parse(localStorage.getItem('sipatokean_master_pasar') || '[]');
        if (daftar.some(p => p.toLowerCase() === namaPasar.trim().toLowerCase())) {
            throw new Error(`Pasar "${namaPasar}" sudah terdaftar.`);
        }
        daftar.push(namaPasar.trim());
        localStorage.setItem('sipatokean_master_pasar', JSON.stringify(daftar));
        return daftar;
    }

    hapusPasar(namaPasar) {
        let daftar = JSON.parse(localStorage.getItem('sipatokean_master_pasar') || '[]');
        daftar = daftar.filter(p => p !== namaPasar);
        localStorage.setItem('sipatokean_master_pasar', JSON.stringify(daftar));
        return daftar;
    }

    // ─────────────────────────────────────────────
    // 3. MASTER KECAMATAN (KEPALA BAGIAN & ADMIN BISA ADD)
    // ─────────────────────────────────────────────
    ambilKecamatan() {
        const tersimpan = localStorage.getItem('sipatokean_master_kecamatan');
        if (tersimpan) {
            try { return JSON.parse(tersimpan); } catch (e) {}
        }
        return [
            'Wenang', 'Tikala', 'Wanea', 'Sario', 'Malalayang',
            'Tuminting', 'Singkil', 'Mapanget', 'Paal Dua', 'Bunaken', 'Bunaken Kepulauan'
        ];
    }

    tambahKecamatan(namaKecamatan) {
        if (!namaKecamatan || !namaKecamatan.trim()) throw new Error('Nama kecamatan tidak boleh kosong');
        const daftar = this.ambilKecamatan();
        if (daftar.some(k => k.toLowerCase() === namaKecamatan.trim().toLowerCase())) {
            throw new Error(`Kecamatan "${namaKecamatan}" sudah ada di sistem.`);
        }
        daftar.push(namaKecamatan.trim());
        localStorage.setItem('sipatokean_master_kecamatan', JSON.stringify(daftar));
        return daftar;
    }

    hapusKecamatan(namaKecamatan) {
        let daftar = this.ambilKecamatan();
        daftar = daftar.filter(k => k !== namaKecamatan);
        localStorage.setItem('sipatokean_master_kecamatan', JSON.stringify(daftar));
        return daftar;
    }

    // ─────────────────────────────────────────────
    // 4. CRUD HARGA KOMODITAS
    // ─────────────────────────────────────────────
    async tambah(dataBaru) {
        try {
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
        } catch (e) {
            const list = this.ambilDataFallback();
            const itemBaru = {
                id: 'komoditas-' + Date.now(),
                ...dataBaru,
                tanggal_penetapan: dataBaru.tanggal_penetapan || '14 Oktober 2026'
            };
            list.unshift(itemBaru);
            localStorage.setItem('sipatokean_custom_items', JSON.stringify(list));
            return itemBaru;
        }
    }

    async perbarui(id, dataUpdate) {
        try {
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
        } catch (e) {
            const list = this.ambilDataFallback();
            const idx = list.findIndex(i => i.id === id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...dataUpdate };
                localStorage.setItem('sipatokean_custom_items', JSON.stringify(list));
            }
            return list[idx];
        }
    }

    async hapus(id) {
        try {
            const respon = await fetch(`${this.baseUrl}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.ambilToken() || ''}` }
            });
            const hasil = await respon.json();
            if (!respon.ok) throw new Error(hasil.pesan || 'Gagal menghapus data');
            return hasil;
        } catch (e) {
            let list = this.ambilDataFallback();
            list = list.filter(i => i.id !== id);
            localStorage.setItem('sipatokean_custom_items', JSON.stringify(list));
            return { sukses: true };
        }
    }

    // ─────────────────────────────────────────────
    // 5. AUTENTIKASI & KELOLA PENGGUNA (ROLE-BASED)
    // ─────────────────────────────────────────────
    async login(emailOrUsername, kata_sandi) {
        const inputBersih = (emailOrUsername || '').toLowerCase().trim();
        const users = this.ambilSemuaPengguna();

        const userCocok = users.find(u => 
            u.username.toLowerCase() === inputBersih || 
            u.email.toLowerCase() === inputBersih
        );

        if (!userCocok) {
            throw new Error('Akun dengan username atau email tersebut tidak terdaftar!');
        }

        if (userCocok.kata_sandi !== kata_sandi) {
            throw new Error('Kata sandi yang Anda masukkan salah!');
        }

        const dataAman = { ...userCocok };
        delete dataAman.kata_sandi;
        const mockToken = `token-sipatokean-${dataAman.id}-${Date.now()}`;
        this.simpanSesi(mockToken, dataAman);
        return { token: mockToken, pengguna: dataAman };
    }

    ambilSemuaPengguna() {
        const tersimpan = localStorage.getItem('sipatokean_master_users');
        if (tersimpan) {
            try { return JSON.parse(tersimpan); } catch (e) {}
        }
        return [];
    }

    tambahPengguna(dataPenggunaBaru) {
        if (!dataPenggunaBaru.nama || !dataPenggunaBaru.username || !dataPenggunaBaru.kata_sandi) {
            throw new Error('Nama, username, dan kata sandi wajib diisi!');
        }
        if (dataPenggunaBaru.kata_sandi.length < 8) {
            throw new Error('Kata sandi minimal 8 karakter untuk keamanan!');
        }

        const users = this.ambilSemuaPengguna();
        if (users.some(u => u.username.toLowerCase() === dataPenggunaBaru.username.toLowerCase().trim())) {
            throw new Error(`Username "${dataPenggunaBaru.username}" sudah digunakan!`);
        }

        const userBaru = {
            id: 'usr-' + Date.now(),
            nama: dataPenggunaBaru.nama.trim(),
            username: dataPenggunaBaru.username.trim(),
            email: dataPenggunaBaru.email || `${dataPenggunaBaru.username.toLowerCase().trim()}@manado.go.id`,
            kata_sandi: dataPenggunaBaru.kata_sandi,
            peran: dataPenggunaBaru.peran || 'Staf', // 'Admin', 'Kepala Bagian', 'Staf'
            bidang: dataPenggunaBaru.bidang || 'Bidang Cadangan dan Distribusi Pangan',
            foto_profil: ''
        };

        users.push(userBaru);
        localStorage.setItem('sipatokean_master_users', JSON.stringify(users));
        return userBaru;
    }

    ubahRolePengguna(id, peranBaru) {
        const users = this.ambilSemuaPengguna();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) throw new Error('Pengguna tidak ditemukan');
        users[idx].peran = peranBaru;
        localStorage.setItem('sipatokean_master_users', JSON.stringify(users));
        return users[idx];
    }

    hapusPengguna(id) {
        let users = this.ambilSemuaPengguna();
        users = users.filter(u => u.id !== id);
        localStorage.setItem('sipatokean_master_users', JSON.stringify(users));
        return true;
    }

    gantiPassword(idPengguna, sandiLama, sandiBaru) {
        if (!sandiBaru || sandiBaru.length < 8) {
            throw new Error('Kata sandi baru minimal 8 karakter demi keamanan!');
        }
        const users = this.ambilSemuaPengguna();
        const idx = users.findIndex(u => u.id === idPengguna);
        if (idx === -1) throw new Error('Pengguna tidak ditemukan!');

        if (users[idx].kata_sandi !== sandiLama) {
            throw new Error('Kata sandi lama yang Anda masukkan tidak sesuai!');
        }

        users[idx].kata_sandi = sandiBaru;
        localStorage.setItem('sipatokean_master_users', JSON.stringify(users));

        // Update sesi aktif jika pengguna saat ini yang mengubah
        const aktif = this.ambilUser();
        if (aktif && aktif.id === idPengguna) {
            this.simpanSesi(this.ambilToken(), { ...aktif });
        }
        return true;
    }

    gantiFotoProfil(idPengguna, fotoUrl) {
        const users = this.ambilSemuaPengguna();
        const idx = users.findIndex(u => u.id === idPengguna);
        if (idx !== -1) {
            users[idx].foto_profil = fotoUrl;
            localStorage.setItem('sipatokean_master_users', JSON.stringify(users));
        }

        const aktif = this.ambilUser();
        if (aktif && aktif.id === idPengguna) {
            aktif.foto_profil = fotoUrl;
            this.simpanSesi(this.ambilToken(), aktif);
        }
        return true;
    }

    // ─────────────────────────────────────────────
    // 6. NOTIFIKASI
    // ─────────────────────────────────────────────
    ambilNotifikasi() {
        const tersimpan = localStorage.getItem('sipatokean_notifikasi');
        if (tersimpan) {
            try { return JSON.parse(tersimpan); } catch (e) {}
        }
        return [];
    }

    tandaiSemuaDibaca() {
        const list = this.ambilNotifikasi().map(n => ({ ...n, dibaca: true }));
        localStorage.setItem('sipatokean_notifikasi', JSON.stringify(list));
        return list;
    }

    // ─────────────────────────────────────────────
    // 7. MANAJEMEN SESI
    // ─────────────────────────────────────────────
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
        const kustom = localStorage.getItem('sipatokean_custom_items');
        let items = kustom ? JSON.parse(kustom) : [
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

export const hargaPanganService = new HargaPanganApiService();
