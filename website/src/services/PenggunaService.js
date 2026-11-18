// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi, pembagian peran, hak akses menu,
// peremajaan username, serta hard reset kata sandi oleh administrator.
// Terintegrasi langsung dengan Supabase Cloud Database + Enkripsi SHA-256.
// ===================================================================================

import { supabaseClient } from './SupabaseClient';

export async function hitungHashSandi(kataSandi) {
    if (!kataSandi) return '';
    if (/^[a-f0-9]{64}$/i.test(kataSandi)) return kataSandi.toLowerCase();
    const garam = 'SIPATOKAAN_MANADO_2026_SECURE_SALT';
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(garam + kataSandi);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (_) { }
    return kataSandi;
}

// Hash resmi untuk kata sandi awal '12345678'
const HASH_AWAL_DEFAULT = 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481';

class PenggunaService {
    constructor() {
        this.kunciMasterUsers = 'sipatokean_master_users';
        this.kunciSesiToken = 'sipatokean_token';
        this.kunciSesiUser = 'sipatokean_user';
        this.inisialisasiAkunBawaan();
    }

    // Inisialisasi daftar akun resmi sesuai struktur organisasi Dinas Pangan
    inisialisasiAkunBawaan() {
        const akunBawaanResmi = [
            {
                id: 'usr-superadmin',
                nama: 'Superadmin',
                username: 'superadmin',
                email: 'superadmin@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Superadmin',
                bidang: 'Superadmin',
                foto_profil: ''
            },
            {
                id: 'usr-effrend',
                nama: 'Effrend',
                username: 'effrend',
                email: 'effrend@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Staf',
                bidang: 'Bidang Cadangan dan Distribusi Pangan',
                foto_profil: ''
            },
            {
                id: 'usr-regina',
                nama: 'Regina',
                username: 'regina',
                email: 'regina@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Admin',
                bidang: 'Admin',
                foto_profil: ''
            },
            {
                id: 'usr-mareta',
                nama: 'Mareta',
                username: 'mareta',
                email: 'mareta@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Kabid',
                bidang: 'Kepala Bidang Cadangan & Distribusi Pangan',
                foto_profil: ''
            },
            {
                id: 'usr-edrick',
                nama: 'Edrick',
                username: 'edrick',
                email: 'edrick@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Admin',
                bidang: 'Admin',
                foto_profil: ''
            },
            {
                id: 'usr-kadis',
                nama: 'Kepala Dinas Pangan',
                username: 'kadis',
                email: 'kadis@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Kadis',
                bidang: 'Pimpinan Dinas Pangan Kota Manado',
                foto_profil: ''
            }
        ];

        const tersimpan = localStorage.getItem(this.kunciMasterUsers) || localStorage.getItem('sipatokean_master_users');
        if (!tersimpan) {
            localStorage.setItem(this.kunciMasterUsers, JSON.stringify(akunBawaanResmi));
            return;
        }

        try {
            let daftar = JSON.parse(tersimpan);
            let adaPembaruan = false;

            // Hapus akun roni jika masih tersimpan di local cache
            if (daftar.some(u => u.username && u.username.toLowerCase() === 'roni')) {
                daftar = daftar.filter(u => u.username && u.username.toLowerCase() !== 'roni');
                adaPembaruan = true;
            }

            // Pastikan akun superadmin terdaftar di browser
            if (!daftar.some(u => u.username && u.username.toLowerCase() === 'superadmin')) {
                const sa = akunBawaanResmi.find(u => u.username === 'superadmin');
                if (sa) daftar.unshift(sa);
                adaPembaruan = true;
            }

            // Pastikan akun Kadis terdaftar di browser
            if (!daftar.some(u => u.username && u.username.toLowerCase() === 'kadis')) {
                const kd = akunBawaanResmi.find(u => u.username === 'kadis');
                if (kd) daftar.push(kd);
                adaPembaruan = true;
            }

            // Normalisasi peran lama 'Kepala Bagian' atau 'Petugas' menjadi 'Staf'/'Kabid'
            daftar.forEach(u => {
                if (u.peran === 'Kepala Bagian') {
                    u.peran = 'Kabid';
                    adaPembaruan = true;
                }
                if (u.peran === 'Petugas') {
                    u.peran = 'Staf';
                    adaPembaruan = true;
                }
                if (u.peran === 'Admin' && (u.bidang?.includes('Superadmin') || u.bidang?.includes('Administrator'))) {
                    u.bidang = 'Admin';
                    adaPembaruan = true;
                }
                if (u.peran === 'Superadmin') {
                    u.nama = 'Superadmin';
                    u.bidang = 'Superadmin';
                    adaPembaruan = true;
                }
            });

            if (adaPembaruan) {
                localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
            }
        } catch (e) {
            localStorage.setItem(this.kunciMasterUsers, JSON.stringify(akunBawaanResmi));
        }
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
                    { id: 'laporan-gpm', label: 'Laporan GPM', icon: '📋' },
                    { id: 'kelola-user', label: 'Kelola Pengguna', icon: '👥' },
                    { id: 'master-data', label: 'Master Pasar & Wilayah', icon: '🏛️' },
                    { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
                ];

            case 'Admin':
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'kelola-user', label: 'Kelola Pengguna', icon: '👥' },
                    { id: 'master-data', label: 'Master Pasar & Wilayah', icon: '🏛️' },
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

    // Autentikasi Pengguna saat Login (Supabase Cloud Database -> Local Fallback)
    async login(identifier, kataSandi, ingatSaya = false) {
        const inputBersih = (identifier || '').toLowerCase().trim();

    // 1. Coba autentikasi via Supabase Cloud
        try {
            const userCloud = await supabaseClient.loginPengguna(inputBersih, kataSandi);
            if (userCloud) {
                userCloud.peran = this.normalisasiPeran(userCloud.peran);
                if (userCloud.peran === 'Admin') userCloud.bidang = 'Admin';
                if (userCloud.peran === 'Superadmin') {
                    userCloud.nama = 'Superadmin';
                    userCloud.bidang = 'Superadmin';
                }

                // [CEK-09 FIX] Token menyimpan waktu expiry (8 jam)
                const exp = Date.now() + (8 * 60 * 60 * 1000);
                const token = `sipatokaan-cloud-${userCloud.id}-${Date.now()}-exp${exp}`;
                this.simpanSesi(token, userCloud, ingatSaya);

                // Perbarui cache master users lokal
                const lokal = this.ambilSemuaPenggunaLokal();
                const idx = lokal.findIndex(u => u.id === userCloud.id || u.username === userCloud.username);
                if (idx !== -1) {
                    lokal[idx] = { ...lokal[idx], ...userCloud };
                } else {
                    lokal.push(userCloud);
                }
                localStorage.setItem(this.kunciMasterUsers, JSON.stringify(lokal));

                return { token, pengguna: userCloud };
            } else {
                // [CEK-05 FIX] Jika Supabase merespon tapi user tidak ditemukan/sandi salah — tolak langsung
                throw new Error('Nama pengguna atau kata sandi salah!');
            }
        } catch (e) {
            // [CEK-05 FIX] Jika error adalah kesalahan kredensial (bukan timeout/offline), langsung throw
            const pesanError = e.message || '';
            const isOffline = pesanError.includes('fetch') || pesanError.includes('abort') || pesanError.includes('network') || pesanError.includes('Failed');
            if (!isOffline) {
                throw e; // Tolak — kredensial salah atau Supabase merespon dengan error
            }
            // Hanya fallback lokal jika benar-benar offline (timeout/network error)
            console.warn('Supabase tidak dapat dijangkau (offline), verifikasi lokal digunakan sebagai fallback darurat:', e);
        }

        // 2. [CEK-05] Verifikasi lokal HANYA jika Supabase benar-benar offline (network error)
        // PERINGATAN: Ini adalah fallback darurat — data lokal mungkin tidak terkini
        const daftarUsers = this.ambilSemuaPenggunaLokal();
        const userCocok = daftarUsers.find(u =>
            (u.username && u.username.toLowerCase() === inputBersih) ||
            (u.email && u.email.toLowerCase() === inputBersih)
        );

        if (!userCocok) {
            throw new Error('Akun dengan nama pengguna atau email tersebut tidak ditemukan!');
        }

        const hashInput = await hitungHashSandi(kataSandi);
        const cocok = (userCocok.kata_sandi === hashInput) || (userCocok.kata_sandi === kataSandi);

        if (!cocok) {
            throw new Error('Kata sandi yang Anda masukkan tidak sesuai!');
        }

        // Otomatis migrasikan kata sandi plaintext warisan lama ke hash SHA-256
        if (userCocok.kata_sandi !== hashInput) {
            userCocok.kata_sandi = hashInput;
            const idx = daftarUsers.findIndex(u => u.id === userCocok.id);
            if (idx !== -1) {
                daftarUsers[idx].kata_sandi = hashInput;
                localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftarUsers));
            }
        }

        const dataPenggunaAman = { ...userCocok };
        delete dataPenggunaAman.kata_sandi;
        dataPenggunaAman.peran = this.normalisasiPeran(dataPenggunaAman.peran);
        if (dataPenggunaAman.peran === 'Admin') dataPenggunaAman.bidang = 'Admin';
        if (dataPenggunaAman.peran === 'Superadmin') {
            dataPenggunaAman.nama = 'Superadmin';
            dataPenggunaAman.bidang = 'Superadmin';
        }

        const token = `sipatokean-auth-${dataPenggunaAman.id}-${Date.now()}`;
        this.simpanSesi(token, dataPenggunaAman, ingatSaya);

        return { token, pengguna: dataPenggunaAman };
    }

    // Mengambil semua daftar pengguna (Langsung dari Supabase Cloud + Cache Sinkron)
    async ambilSemuaPengguna() {
        try {
            const usersCloud = await supabaseClient.getPengguna();
            if (usersCloud && Array.isArray(usersCloud) && usersCloud.length > 0) {
                const daftarBersih = usersCloud.map(u => ({
                    id: u.id,
                    nama: (u.peran === 'Superadmin' || u.username === 'superadmin') ? 'Superadmin' : u.nama,
                    username: u.username,
                    email: u.email,
                    peran: this.normalisasiPeran(u.peran),
                    bidang: u.peran === 'Superadmin' ? 'Superadmin' : (u.peran === 'Admin' ? 'Admin' : (u.bidang || 'Dinas Pangan Kota Manado')),
                    foto_profil: u.foto_profil || ''
                }));
                localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftarBersih));
                return daftarBersih;
            }
        } catch (e) {
            console.warn('Gagal memuat pengguna dari Supabase Cloud, fallback ke lokal:', e);
        }
        return this.ambilSemuaPenggunaLokal();
    }

    // Mengambil data pengguna dari penyimpanan lokal secara sinkron
    ambilSemuaPenggunaLokal() {
        const tersimpan = localStorage.getItem(this.kunciMasterUsers);
        if (tersimpan) {
            try {
                return JSON.parse(tersimpan);
            } catch (e) {
                console.error('Gagal membaca data pengguna lokal:', e);
            }
        }
        return [];
    }

    // Hard reset kata sandi oleh Admin / Superadmin (Supabase Cloud + Local Sync)
    async adminResetPassword(idAdmin, idTarget, passwordBaru) {
        const daftar = this.ambilSemuaPenggunaLokal();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya akun dengan role Admin atau Superadmin yang berhak melakukan reset kata sandi!');
        }

        if (!passwordBaru || passwordBaru.length < 8) {
            throw new Error('Kata sandi baru minimal harus 8 karakter demi standar keamanan!');
        }

        const idxTarget = daftar.findIndex(u => u.id === idTarget);
        if (idxTarget === -1) {
            throw new Error('Data pengguna target tidak ditemukan dalam sistem!');
        }

        const targetUser = daftar[idxTarget];
        const hashBaru = await hitungHashSandi(passwordBaru);
        targetUser.kata_sandi = hashBaru;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

        // Sinkronisasi ke Supabase Cloud
        try {
            await supabaseClient.ubahPasswordPengguna(idTarget, passwordBaru, targetUser.username);
        } catch (e) {
            console.warn('Gagal sinkronisasi reset kata sandi ke Supabase Cloud:', e);
        }

        return true;
    }

    // Pengubahan username oleh Admin / Superadmin (Supabase Cloud + Local Sync)
    async adminUbahUsername(idAdmin, idTarget, usernameBaru) {
        const daftar = this.ambilSemuaPenggunaLokal();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang berwenang mengganti username pengguna!');
        }

        const usernameBersih = (usernameBaru || '').toLowerCase().trim();
        if (!usernameBersih) {
            throw new Error('Username baru tidak boleh kosong!');
        }

        // Cek apakah username sudah dipakai orang lain
        const sudahAda = daftar.some(u => u.id !== idTarget && u.username.toLowerCase() === usernameBersih);
        if (sudahAda) {
            throw new Error(`Username "${usernameBersih}" sudah digunakan oleh akun lain!`);
        }

        const idxTarget = daftar.findIndex(u => u.id === idTarget);
        if (idxTarget === -1) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        const usernameLama = daftar[idxTarget].username;
        daftar[idxTarget].username = usernameBersih;
        daftar[idxTarget].email = `${usernameBersih}@manado.go.id`;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

        // Sinkronisasi ke Supabase Cloud
        try {
            await supabaseClient.updatePengguna(idTarget, {
                username: usernameBersih,
                email: daftar[idxTarget].email
            }, usernameLama);
        } catch (e) {
            console.warn('Gagal sinkronisasi username ke Supabase Cloud:', e);
        }

        // Jika admin mengubah username dirinya sendiri, perbarui sesi aktif
        const userSesi = this.ambilUserSesi();
        if (userSesi && (userSesi.id === idTarget || userSesi.username === usernameLama)) {
            userSesi.username = usernameBersih;
            userSesi.email = daftar[idxTarget].email;
            this.simpanSesi(this.ambilToken(), userSesi);
        }

        return daftar[idxTarget];
    }

    // Pengubahan role pengguna oleh Admin / Superadmin (Supabase Cloud + Local Sync)
    async adminUbahPeran(idAdmin, idTarget, peranBaru) {
        const daftar = this.ambilSemuaPenggunaLokal();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang berwenang mengubah peran pengguna!');
        }

        const peranValid = this.normalisasiPeran(peranBaru);
        const idxTarget = daftar.findIndex(u => u.id === idTarget);
        if (idxTarget === -1) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        const targetUser = daftar[idxTarget];
        targetUser.peran = peranValid;
        if (peranValid === 'Admin') targetUser.bidang = 'Admin';
        if (peranValid === 'Superadmin') {
            targetUser.nama = 'Superadmin';
            targetUser.bidang = 'Superadmin';
        }
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

        // Sinkronisasi ke Supabase Cloud
        try {
            await supabaseClient.updatePengguna(idTarget, {
                peran: peranValid,
                bidang: targetUser.bidang
            }, targetUser.username);
        } catch (e) {
            console.warn('Gagal sinkronisasi peran ke Supabase Cloud:', e);
        }

        const userSesi = this.ambilUserSesi();
        if (userSesi && (userSesi.id === idTarget || userSesi.username === targetUser.username)) {
            userSesi.peran = peranValid;
            userSesi.bidang = targetUser.bidang;
            this.simpanSesi(this.ambilToken(), userSesi);
        }

        return targetUser;
    }

    // Tambah pengguna baru oleh Admin / Superadmin (Supabase Cloud + Local Sync)
    async adminTambahPengguna(idAdmin, dataBaru) {
        const daftar = this.ambilSemuaPenggunaLokal();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat menambahkan pengguna!');
        }

        const usernameBersih = (dataBaru.username || '').toLowerCase().trim();
        if (!dataBaru.nama || !dataBaru.nama.trim()) {
            throw new Error('Nama lengkap pengguna wajib diisi!');
        }
        if (!usernameBersih) {
            throw new Error('Username pengguna wajib diisi!');
        }
        if (!dataBaru.kata_sandi || dataBaru.kata_sandi.length < 8) {
            throw new Error('Kata sandi awal minimal 8 karakter demi keamanan!');
        }

        if (daftar.some(u => u.username.toLowerCase() === usernameBersih)) {
            throw new Error(`Username "${usernameBersih}" sudah terdaftar di sistem!`);
        }

        const peranValid = this.normalisasiPeran(dataBaru.peran);
        const hashKataSandi = await hitungHashSandi(dataBaru.kata_sandi);

        const bidangBersih = peranValid === 'Admin' ? 'Admin' : (peranValid === 'Superadmin' ? 'Superadmin' : (dataBaru.bidang || 'Dinas Pangan Kota Manado'));

        const payloadAkun = {
            nama: (peranValid === 'Superadmin' || usernameBersih === 'superadmin') ? 'Superadmin' : dataBaru.nama.trim(),
            username: usernameBersih,
            email: dataBaru.email || `${usernameBersih}@manado.go.id`,
            kata_sandi: hashKataSandi,
            peran: peranValid,
            bidang: bidangBersih,
            foto_profil: ''
        };

        // Simpan langsung ke Supabase Cloud
        let akunBaru = null;
        try {
            const resCloud = await supabaseClient.tambahPengguna(payloadAkun);
            if (resCloud && resCloud.id) {
                akunBaru = {
                    ...resCloud,
                    peran: peranValid,
                    bidang: bidangBersih
                };
            }
        } catch (e) {
            console.warn('Gagal menambah pengguna ke Supabase Cloud, simpan ke lokal:', e);
        }

        if (!akunBaru) {
            akunBaru = {
                id: 'usr-' + Date.now(),
                ...payloadAkun
            };
        }

        daftar.push(akunBaru);
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
        return akunBaru;
    }

    // Hapus pengguna oleh Admin / Superadmin (Supabase Cloud + Local Sync)
    async adminHapusPengguna(idAdmin, idTarget) {
        const daftar = this.ambilSemuaPenggunaLokal();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat menghapus akun pengguna!');
        }

        if (idAdmin === idTarget) {
            throw new Error('Akun admin yang sedang aktif tidak dapat menghapus dirinya sendiri!');
        }

        const targetUser = daftar.find(u => u.id === idTarget);
        const disaring = daftar.filter(u => u.id !== idTarget);
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(disaring));

        // Hapus dari Supabase Cloud
        try {
            await supabaseClient.hapusPengguna(idTarget, targetUser?.username);
        } catch (e) {
            console.warn('Gagal menghapus pengguna di Supabase Cloud:', e);
        }

        return true;
    }

    // Ubah kata sandi pribadi oleh pengguna yang sedang login (Supabase Cloud + Local Sync)
    async ubahKataSandiPribadi(idUser, kataSandiLama, kataSandiBaru) {
        if (!kataSandiBaru || kataSandiBaru.length < 8) {
            throw new Error('Kata sandi baru minimal 8 karakter!');
        }

        const daftar = this.ambilSemuaPenggunaLokal();
        const target = daftar.find(u => u.id === idUser);

        if (!target) {
            throw new Error('Pengguna tidak ditemukan!');
        }

        const hashLama = await hitungHashSandi(kataSandiLama);
        const cocok = (target.kata_sandi === hashLama) || (target.kata_sandi === kataSandiLama);

        if (!cocok) {
            throw new Error('Kata sandi lama yang Anda masukkan salah!');
        }

        const hashBaru = await hitungHashSandi(kataSandiBaru);
        target.kata_sandi = hashBaru;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

        // Sinkronkan ke Supabase Cloud
        try {
            await supabaseClient.ubahPasswordPengguna(idUser, kataSandiBaru, target.username);
        } catch (e) {
            console.warn('Gagal sinkronisasi ganti sandi ke Supabase Cloud:', e);
        }

        return true;
    }

    // Ubah foto profil pribadi
    async ubahFotoProfil(idUser, urlFoto) {
        const daftar = this.ambilSemuaPenggunaLokal();
        const target = daftar.find(u => u.id === idUser);
        if (target) {
            target.foto_profil = urlFoto;
            localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

            try {
                await supabaseClient.updatePengguna(idUser, { foto_profil: urlFoto }, target.username);
            } catch (e) {
                console.warn('Gagal sinkronisasi foto profil ke Supabase Cloud:', e);
            }
        }

        const userSesi = this.ambilUserSesi();
        if (userSesi && userSesi.id === idUser) {
            userSesi.foto_profil = urlFoto;
            this.simpanSesi(this.ambilToken(), userSesi);
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

    ambilUserSesi() {
        // [CEK-09 FIX] Helper: cek apakah token sudah kedaluwarsa
        const tokenMasihBerlaku = (token) => {
            if (!token) return false;
            const match = token.match(/exp(\d+)$/);
            if (!match) return true; // token lama tanpa expiry, anggap masih berlaku
            return Date.now() < Number(match[1]);
        };

        const tokenSession = sessionStorage.getItem(this.kunciSesiToken);
        const dariSession = sessionStorage.getItem(this.kunciSesiUser);
        if (dariSession && tokenMasihBerlaku(tokenSession)) {
            try {
                const u = JSON.parse(dariSession);
                if (u && (u.peran === 'Admin' || u.username === 'regina' || u.username === 'edrick')) {
                    u.bidang = 'Admin';
                    sessionStorage.setItem(this.kunciSesiUser, JSON.stringify(u));
                }
                if (u && (u.peran === 'Superadmin' || u.username === 'superadmin')) {
                    u.nama = 'Superadmin';
                    u.bidang = 'Superadmin';
                }
                return u;
            } catch (e) { }
        } else if (dariSession && !tokenMasihBerlaku(tokenSession)) {
            // Token kedaluwarsa — hapus sesi
            sessionStorage.removeItem(this.kunciSesiToken);
            sessionStorage.removeItem(this.kunciSesiUser);
        }

        const tokenLocal = localStorage.getItem(this.kunciSesiToken);
        const data = localStorage.getItem(this.kunciSesiUser);
        if (data && tokenMasihBerlaku(tokenLocal)) {
            try {
                const u = JSON.parse(data);
                if (u && (u.peran === 'Admin' || u.username === 'regina' || u.username === 'edrick')) {
                    u.bidang = 'Admin';
                    localStorage.setItem(this.kunciSesiUser, JSON.stringify(u));
                }
                if (u && (u.peran === 'Superadmin' || u.username === 'superadmin')) {
                    u.nama = 'Superadmin';
                    u.bidang = 'Superadmin';
                }
                return u;
            } catch (e) { }
        } else if (data && !tokenMasihBerlaku(tokenLocal)) {
            // Token "Ingat Saya" kedaluwarsa — hapus
            localStorage.removeItem(this.kunciSesiToken);
            localStorage.removeItem(this.kunciSesiUser);
        }
        return null;
    }

    ambilUser() {
        return this.ambilUserSesi();
    }

    ambilToken() {
        return sessionStorage.getItem(this.kunciSesiToken) || localStorage.getItem(this.kunciSesiToken);
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
