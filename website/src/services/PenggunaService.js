// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi murni Supabase Cloud (RPC SHA-256),
// pembagian peran, hak akses menu, pengelolaan akun, dan validasi masa aktif sesi.
// ===================================================================================

import { supabaseClient } from './SupabaseClient';

export async function hitungHashSandi(kataSandi) {
    return supabaseClient.hitungHashSandi(kataSandi);
}

class PenggunaService {
    constructor() {
        this.kunciSesiToken = 'sipatokean_token';
        this.kunciSesiUser = 'sipatokean_user';
        this.durasiSesiMs = 8 * 60 * 60 * 1000; // 8 jam
        // Bersihkan sisa cache akun lokal warisan lama yang menyimpan hash/akun bawaan tidak aman
        try {
            localStorage.removeItem('sipatokean_master_users');
            localStorage.removeItem('sipatokaan_master_users');
        } catch (_) { }
    }

    // Normalisasi string peran agar konsisten dengan standar sistem
    normalisasiPeran(peranInput) {
        if (!peranInput) return 'Staf';
        const str = peranInput.toString().toLowerCase().trim();
        if (str === 'superadmin') return 'Superadmin';
        if (str === 'admin') return 'Admin';
        if (str === 'kabid' || str === 'kepala bidang' || str === 'kepala_bidang' || str === 'kepala bagian') return 'Kabid';
        if (str === 'kadis' || str === 'kepala dinas' || str === 'kepala_dinas') return 'Kadis';
        return 'Staf';
    }

    // Normalisasi objek pengguna tanpa menimpa nama asli dari database
    normalisasiDataPengguna(u) {
        if (!u) return null;
        const peran = this.normalisasiPeran(u.peran);
        const bidangDefault = peran === 'Superadmin'
            ? 'Superadmin'
            : (peran === 'Admin' ? 'Admin' : 'Dinas Pangan Kota Manado');

        return {
            id: u.id,
            nama: (u.nama && String(u.nama).trim()) ? String(u.nama).trim() : (peran === 'Superadmin' ? 'Superadmin' : (u.username || 'Petugas')),
            username: String(u.username || '').trim().toLowerCase(),
            email: String(u.email || '').trim().toLowerCase(),
            peran,
            bidang: (peran === 'Admin' || peran === 'Superadmin') ? bidangDefault : (u.bidang || bidangDefault),
            foto_profil: u.foto_profil || ''
        };
    }

    // Mengambil daftar menu navigasi resmi yang berhak diakses oleh masing-masing peran
    ambilDaftarMenu(peranPengguna) {
        const peranBersih = this.normalisasiPeran(peranPengguna);

        switch (peranBersih) {
            case 'Superadmin':
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'input-harga', label: 'Masukan Data Pangan', icon: '📝' },
                    { id: 'verif-harga', label: 'Verifikasi Harga Pangan', icon: '✅' },
                    { id: 'kelola-gpm', label: 'Kelola GPM', icon: '🎟️' },
                    { id: 'laporan', label: 'Laporan Bidang Pangan', icon: '📑' },
                    { id: 'grafik-pangan', label: 'Grafik Pangan', icon: '📈' },
                    { id: 'laporan-gpm', label: 'Laporan Eksekutif Kadis', icon: '📋' },
                    { id: 'kelola-user', label: 'Kelola Pengguna', icon: '👥' },
                    { id: 'master-komoditas', label: 'Master Komoditas', icon: '🌾' },
                    { id: 'master-wilayah', label: 'Master Pasar & Wilayah', icon: '🗺️' },
                    { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
                ];

            case 'Admin':
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'kelola-user', label: 'Kelola Pengguna', icon: '👥' },
                    { id: 'master-komoditas', label: 'Master Komoditas', icon: '🌾' },
                    { id: 'master-wilayah', label: 'Master Pasar & Wilayah', icon: '🗺️' },
                    { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
                ];

            case 'Kabid':
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'verif-harga', label: 'Verifikasi Harga Pangan', icon: '✅' },
                    { id: 'kelola-gpm', label: 'Kelola GPM', icon: '🎟️' },
                    { id: 'laporan', label: 'Laporan Bidang Pangan', icon: '📑' }
                ];

            case 'Staf':
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'input-harga', label: 'Masukan Data Pangan', icon: '📝' },
                    { id: 'kelola-gpm', label: 'Kelola GPM', icon: '🎟️' }
                ];

            case 'Kadis':
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'grafik-pangan', label: 'Grafik Pangan', icon: '📈' },
                    { id: 'laporan-gpm', label: 'Laporan GPM', icon: '📋' }
                ];

            default:
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' }
                ];
        }
    }

    // Memeriksa apakah menu tertentu diizinkan untuk peran yang sedang aktif
    apakahMenuDiizinkan(peranPengguna, idMenu) {
        const daftar = this.ambilDaftarMenu(peranPengguna);
        return daftar.some(m => m.id === idMenu);
    }

    // Autentikasi Pengguna saat Login (100% Murni Supabase Cloud RPC — Tanpa Backdoor Lokal)
    async login(identifier, kataSandi, ingatSaya = false) {
        const inputBersih = (identifier || '').toLowerCase().trim();
        if (!inputBersih || !kataSandi) {
            throw new Error('Nama pengguna/email dan kata sandi wajib diisi.');
        }

        let userCloud = null;
        try {
            userCloud = await supabaseClient.loginPengguna(inputBersih, kataSandi);
        } catch (e) {
            throw new Error('Gagal terhubung ke server autentikasi. Periksa koneksi internet Anda lalu coba lagi.');
        }

        if (!userCloud) {
            throw new Error('Nama pengguna/email atau kata sandi salah!');
        }

        const penggunaResmi = this.normalisasiDataPengguna(userCloud);
        const exp = Date.now() + this.durasiSesiMs;
        const token = `sipatokaan-cloud-${penggunaResmi.id}-${Date.now()}-exp${exp}`;
        this.simpanSesi(token, penggunaResmi, ingatSaya);

        return { token, pengguna: penggunaResmi };
    }

    // Mengambil semua daftar pengguna langsung dari Supabase Cloud (tanpa akun dummy lokal)
    async ambilSemuaPengguna() {
        const usersCloud = await supabaseClient.getPengguna();
        if (!Array.isArray(usersCloud)) {
            return [];
        }
        return usersCloud
            .map(u => this.normalisasiDataPengguna(u))
            .filter(Boolean);
    }

    // Verifikasi real-time ke database Supabase untuk mengambil peran sah aktor (Superadmin / Admin / null)
    async ambilPeranTerverifikasiServer(idAdmin) {
        if (!idAdmin) return null;
        try {
            const res = await supabaseClient.request(`pengguna?id=eq.${encodeURIComponent(idAdmin)}&select=peran&limit=1`);
            if (Array.isArray(res) && res.length > 0 && res[0].peran) {
                const peranReal = this.normalisasiPeran(res[0].peran);
                if (peranReal === 'Superadmin' || peranReal === 'Admin') {
                    return peranReal;
                }
            }
        } catch (_) {
            return null;
        }
        return null;
    }

    // Verifikasi real-time ke database Supabase untuk memastikan akun sah berstatus Admin/Superadmin
    async verifikasiHakAdminServer(idAdmin) {
        const peran = await this.ambilPeranTerverifikasiServer(idAdmin);
        return peran === 'Admin' || peran === 'Superadmin';
    }

    // Pengaman hierarki RBAC: Admin tidak boleh memodifikasi/menghapus akun Superadmin atau mempromosikan ke Superadmin
    async validasiHierarkiAdmin(idAdmin, targetUser = null, peranBaru = null) {
        const peranAktor = await this.ambilPeranTerverifikasiServer(idAdmin);
        if (!peranAktor) {
            throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak memiliki hak akses administrator!');
        }
        if (targetUser && this.normalisasiPeran(targetUser.peran) === 'Superadmin' && peranAktor !== 'Superadmin') {
            throw new Error('Akses ditolak: Akun Superadmin dilindungi dan hanya dapat dikelola oleh Superadmin!');
        }
        if (peranBaru && this.normalisasiPeran(peranBaru) === 'Superadmin' && peranAktor !== 'Superadmin') {
            throw new Error('Akses ditolak: Hanya Superadmin yang berwenang menetapkan atau membuat peran Superadmin!');
        }
        return peranAktor;
    }

    // Helper: cek apakah sesi saat ini disimpan permanen (Ingat Saya)
    apakahSesiPermanen() {
        return Boolean(localStorage.getItem(this.kunciSesiToken));
    }

    // Hard reset kata sandi oleh Admin / Superadmin langsung ke Supabase Cloud
    async adminResetPassword(idAdmin, idTarget, passwordBaru) {
        if (!passwordBaru || passwordBaru.length < 8) {
            throw new Error('Kata sandi baru minimal harus 8 karakter demi standar keamanan!');
        }

        const daftar = await this.ambilSemuaPengguna();
        const targetUser = daftar.find(u => String(u.id) === String(idTarget));
        if (!targetUser) {
            throw new Error('Data pengguna target tidak ditemukan dalam basis data!');
        }

        await this.validasiHierarkiAdmin(idAdmin, targetUser);

        await supabaseClient.ubahPasswordPengguna(idTarget, passwordBaru, targetUser.username);
        return true;
    }

    // Pengubahan nama lengkap & bidang pengguna oleh Admin / Superadmin langsung ke Supabase Cloud
    async adminUbahProfil(idAdmin, idTarget, { nama, bidang } = {}) {
        const namaBersih = String(nama || '').trim();
        if (!namaBersih) {
            throw new Error('Nama lengkap pengguna tidak boleh kosong!');
        }

        const daftar = await this.ambilSemuaPengguna();
        const targetUser = daftar.find(u => String(u.id) === String(idTarget));
        if (!targetUser) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        await this.validasiHierarkiAdmin(idAdmin, targetUser);

        const peranTarget = this.normalisasiPeran(targetUser.peran);
        const bidangBersih = peranTarget === 'Superadmin'
            ? 'Superadmin'
            : (peranTarget === 'Admin' ? 'Admin' : (String(bidang || '').trim() || targetUser.bidang || 'Dinas Pangan Kota Manado'));

        await supabaseClient.updatePengguna(idTarget, {
            nama: namaBersih,
            bidang: bidangBersih
        }, targetUser.username);

        const hasilUpdate = { ...targetUser, nama: namaBersih, bidang: bidangBersih };

        const userSesi = this.ambilUserSesi();
        if (userSesi && (String(userSesi.id) === String(idTarget) || userSesi.username === targetUser.username)) {
            userSesi.nama = namaBersih;
            userSesi.bidang = bidangBersih;
            this.simpanSesi(this.ambilToken(), userSesi, this.apakahSesiPermanen());
        }

        return hasilUpdate;
    }

    // Pengubahan username oleh Admin / Superadmin langsung ke Supabase Cloud
    async adminUbahUsername(idAdmin, idTarget, usernameBaru) {
        const usernameBersih = (usernameBaru || '').toLowerCase().trim();
        if (!usernameBersih) {
            throw new Error('Username baru tidak boleh kosong!');
        }
        if (/\s/.test(usernameBersih)) {
            throw new Error('Username tidak boleh mengandung spasi!');
        }

        const daftar = await this.ambilSemuaPengguna();
        const targetUser = daftar.find(u => String(u.id) === String(idTarget));
        if (!targetUser) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        await this.validasiHierarkiAdmin(idAdmin, targetUser);

        const sudahAda = daftar.some(u => String(u.id) !== String(idTarget) && u.username.toLowerCase() === usernameBersih);
        if (sudahAda) {
            throw new Error(`Username "${usernameBersih}" sudah digunakan oleh akun lain!`);
        }

        const usernameLama = targetUser.username;
        const emailBaru = targetUser.email && !targetUser.email.startsWith(`${usernameLama}@`)
            ? targetUser.email
            : `${usernameBersih}@manado.go.id`;

        await supabaseClient.updatePengguna(idTarget, {
            username: usernameBersih,
            email: emailBaru
        }, usernameLama);

        const hasilUpdate = { ...targetUser, username: usernameBersih, email: emailBaru };

        // Jika admin mengubah username dirinya sendiri, perbarui sesi aktif
        const userSesi = this.ambilUserSesi();
        if (userSesi && (String(userSesi.id) === String(idTarget) || userSesi.username === usernameLama)) {
            userSesi.username = usernameBersih;
            userSesi.email = emailBaru;
            this.simpanSesi(this.ambilToken(), userSesi, this.apakahSesiPermanen());
        }

        return hasilUpdate;
    }

    // Pengubahan email oleh Admin / Superadmin langsung ke Supabase Cloud
    async adminUbahEmail(idAdmin, idTarget, emailBaru) {
        const emailBersih = (emailBaru || '').toLowerCase().trim();
        if (!emailBersih) {
            throw new Error('Alamat email baru tidak boleh kosong!');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailBersih)) {
            throw new Error('Format alamat email tidak valid!');
        }

        const daftar = await this.ambilSemuaPengguna();
        const targetUser = daftar.find(u => String(u.id) === String(idTarget));
        if (!targetUser) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        await this.validasiHierarkiAdmin(idAdmin, targetUser);

        const sudahAda = daftar.some(u => String(u.id) !== String(idTarget) && u.email && u.email.toLowerCase() === emailBersih);
        if (sudahAda) {
            throw new Error(`Email "${emailBersih}" sudah digunakan oleh akun lain!`);
        }

        await supabaseClient.updatePengguna(idTarget, { email: emailBersih }, targetUser.username);
        const hasilUpdate = { ...targetUser, email: emailBersih };

        const userSesi = this.ambilUserSesi();
        if (userSesi && (String(userSesi.id) === String(idTarget) || userSesi.username === targetUser.username)) {
            userSesi.email = emailBersih;
            this.simpanSesi(this.ambilToken(), userSesi, this.apakahSesiPermanen());
        }

        return hasilUpdate;
    }

    // Pengubahan role pengguna oleh Admin / Superadmin langsung ke Supabase Cloud
    async adminUbahPeran(idAdmin, idTarget, peranBaru) {
        const daftar = await this.ambilSemuaPengguna();
        const peranValid = this.normalisasiPeran(peranBaru);
        const targetUser = daftar.find(u => String(u.id) === String(idTarget));
        if (!targetUser) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        await this.validasiHierarkiAdmin(idAdmin, targetUser, peranValid);

        if (String(idAdmin) === String(idTarget) && peranValid !== targetUser.peran) {
            throw new Error('Demi keamanan akses, Anda tidak dapat mengubah peran akun Anda sendiri yang sedang aktif!');
        }

        if (targetUser.peran === 'Superadmin' && peranValid !== 'Superadmin') {
            const jumlahSuperadmin = daftar.filter(u => this.normalisasiPeran(u.peran) === 'Superadmin').length;
            if (jumlahSuperadmin <= 1) {
                throw new Error('Tidak dapat menurunkan peran satu-satunya akun Superadmin aktif di sistem!');
            }
        }

        const bidangBaru = peranValid === 'Admin'
            ? 'Admin'
            : (peranValid === 'Superadmin' ? 'Superadmin' : (targetUser.bidang === 'Admin' || targetUser.bidang === 'Superadmin' ? 'Bidang Cadangan dan Distribusi Pangan' : (targetUser.bidang || 'Dinas Pangan Kota Manado')));

        await supabaseClient.updatePengguna(idTarget, {
            peran: peranValid,
            bidang: bidangBaru
        }, targetUser.username);

        const hasilUpdate = { ...targetUser, peran: peranValid, bidang: bidangBaru };

        const userSesi = this.ambilUserSesi();
        if (userSesi && (String(userSesi.id) === String(idTarget) || userSesi.username === targetUser.username)) {
            userSesi.peran = peranValid;
            userSesi.bidang = bidangBaru;
            this.simpanSesi(this.ambilToken(), userSesi, this.apakahSesiPermanen());
        }

        return hasilUpdate;
    }

    // Tambah pengguna baru oleh Admin / Superadmin langsung ke Supabase Cloud
    async adminTambahPengguna(idAdmin, dataBaru) {
        const peranValid = this.normalisasiPeran(dataBaru.peran);
        await this.validasiHierarkiAdmin(idAdmin, null, peranValid);

        const usernameBersih = (dataBaru.username || '').toLowerCase().trim();
        if (!dataBaru.nama || !dataBaru.nama.trim()) {
            throw new Error('Nama lengkap pengguna wajib diisi!');
        }
        if (!usernameBersih) {
            throw new Error('Username pengguna wajib diisi!');
        }
        if (/\s/.test(usernameBersih)) {
            throw new Error('Username tidak boleh mengandung spasi!');
        }
        if (!dataBaru.kata_sandi || dataBaru.kata_sandi.length < 8) {
            throw new Error('Kata sandi awal minimal 8 karakter demi keamanan!');
        }

        const daftar = await this.ambilSemuaPengguna();
        if (daftar.some(u => u.username.toLowerCase() === usernameBersih)) {
            throw new Error(`Username "${usernameBersih}" sudah terdaftar di sistem!`);
        }

        const emailBersih = (dataBaru.email || `${usernameBersih}@manado.go.id`).toLowerCase().trim();
        if (daftar.some(u => u.email && u.email.toLowerCase() === emailBersih)) {
            throw new Error(`Email "${emailBersih}" sudah digunakan oleh akun lain!`);
        }

        const hashKataSandi = await hitungHashSandi(dataBaru.kata_sandi);
        const bidangBersih = peranValid === 'Admin'
            ? 'Admin'
            : (peranValid === 'Superadmin' ? 'Superadmin' : (dataBaru.bidang || 'Bidang Cadangan dan Distribusi Pangan'));

        const payloadAkun = {
            nama: dataBaru.nama.trim(),
            username: usernameBersih,
            email: emailBersih,
            kata_sandi: hashKataSandi,
            peran: peranValid,
            bidang: bidangBersih,
            foto_profil: ''
        };

        const resCloud = await supabaseClient.tambahPengguna(payloadAkun);
        if (!resCloud || !resCloud.id) {
            throw new Error('Gagal menyimpan akun baru ke basis data Supabase.');
        }

        return this.normalisasiDataPengguna(resCloud);
    }

    // Hapus pengguna oleh Admin / Superadmin langsung dari Supabase Cloud
    async adminHapusPengguna(idAdmin, idTarget) {
        if (String(idAdmin) === String(idTarget)) {
            throw new Error('Akun administrator yang sedang aktif tidak dapat menghapus dirinya sendiri!');
        }

        const daftar = await this.ambilSemuaPengguna();
        const targetUser = daftar.find(u => String(u.id) === String(idTarget));
        if (!targetUser) {
            throw new Error('Pengguna target tidak ditemukan di basis data!');
        }

        await this.validasiHierarkiAdmin(idAdmin, targetUser);

        if (this.normalisasiPeran(targetUser.peran) === 'Superadmin') {
            const jumlahSuperadmin = daftar.filter(u => this.normalisasiPeran(u.peran) === 'Superadmin').length;
            if (jumlahSuperadmin <= 1) {
                throw new Error('Tidak dapat menghapus satu-satunya akun Superadmin aktif di sistem!');
            }
        }

        await supabaseClient.hapusPengguna(idTarget, targetUser?.username);
        return true;
    }

    // Ubah kata sandi pribadi (verifikasi sandi lama via RPC server-side Supabase)
    async ubahKataSandiPribadi(idUser, kataSandiLama, kataSandiBaru) {
        if (!kataSandiLama) {
            throw new Error('Kata sandi lama wajib diisi!');
        }
        if (!kataSandiBaru || kataSandiBaru.length < 8) {
            throw new Error('Kata sandi baru minimal 8 karakter!');
        }

        const userSesi = this.ambilUserSesi();
        if (!userSesi || !userSesi.username) {
            throw new Error('Sesi pengguna tidak valid. Silakan login ulang.');
        }

        const terverifikasi = await supabaseClient.loginPengguna(userSesi.username, kataSandiLama);
        if (!terverifikasi) {
            throw new Error('Kata sandi lama yang Anda masukkan salah!');
        }

        await supabaseClient.ubahPasswordPengguna(idUser, kataSandiBaru, userSesi.username);
        return true;
    }

    // Ubah foto profil pribadi langsung ke Supabase Cloud
    async ubahFotoProfil(idUser, urlFoto) {
        const userSesi = this.ambilUserSesi();
        await supabaseClient.updatePengguna(idUser, { foto_profil: urlFoto }, userSesi?.username);

        if (userSesi && userSesi.id === idUser) {
            userSesi.foto_profil = urlFoto;
            this.simpanSesi(this.ambilToken(), userSesi, this.apakahSesiPermanen());
        }
        return true;
    }

    // Manajemen Sesi Login (Mendukung Sesi Sementara sessionStorage dan Sesi Permanen localStorage)
    simpanSesi(token, pengguna, ingatSaya = false) {
        if (ingatSaya) {
            localStorage.setItem(this.kunciSesiToken, token);
            localStorage.setItem(this.kunciSesiUser, JSON.stringify(pengguna));
            sessionStorage.removeItem(this.kunciSesiToken);
            sessionStorage.removeItem(this.kunciSesiUser);
        } else {
            sessionStorage.setItem(this.kunciSesiToken, token);
            sessionStorage.setItem(this.kunciSesiUser, JSON.stringify(pengguna));
            localStorage.removeItem(this.kunciSesiToken);
            localStorage.removeItem(this.kunciSesiUser);
        }
    }

    // Validasi ketat masa berlaku token (wajib memiliki -exp<timestamp> dan belum kedaluwarsa)
    tokenMasihBerlaku(token) {
        if (!token || typeof token !== 'string') return false;
        if (token.startsWith('mock-')) return false;
        const match = token.match(/-exp(\d+)$/);
        if (!match) return false;
        return Date.now() < Number(match[1]);
    }

    ambilUserSesi() {
        const tokenSession = sessionStorage.getItem(this.kunciSesiToken);
        const dariSession = sessionStorage.getItem(this.kunciSesiUser);
        if (dariSession && this.tokenMasihBerlaku(tokenSession)) {
            try {
                return this.normalisasiDataPengguna(JSON.parse(dariSession));
            } catch (_) { }
        } else if (dariSession || tokenSession) {
            sessionStorage.removeItem(this.kunciSesiToken);
            sessionStorage.removeItem(this.kunciSesiUser);
        }

        const tokenLocal = localStorage.getItem(this.kunciSesiToken);
        const data = localStorage.getItem(this.kunciSesiUser);
        if (data && this.tokenMasihBerlaku(tokenLocal)) {
            try {
                return this.normalisasiDataPengguna(JSON.parse(data));
            } catch (_) { }
        } else if (data || tokenLocal) {
            localStorage.removeItem(this.kunciSesiToken);
            localStorage.removeItem(this.kunciSesiUser);
        }
        return null;
    }

    ambilUser() {
        return this.ambilUserSesi();
    }

    ambilToken() {
        const tokenSession = sessionStorage.getItem(this.kunciSesiToken);
        if (this.tokenMasihBerlaku(tokenSession)) return tokenSession;
        const tokenLocal = localStorage.getItem(this.kunciSesiToken);
        if (this.tokenMasihBerlaku(tokenLocal)) return tokenLocal;
        return null;
    }

    logout() {
        sessionStorage.removeItem(this.kunciSesiToken);
        sessionStorage.removeItem(this.kunciSesiUser);
        localStorage.removeItem(this.kunciSesiToken);
        localStorage.removeItem(this.kunciSesiUser);
    }

    keluar() {
        this.logout();
    }
}

export const penggunaService = new PenggunaService();
