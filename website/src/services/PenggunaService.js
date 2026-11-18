// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi, pembagian peran, hak akses menu,
// peremajaan username, serta hard reset kata sandi oleh administrator.
// Dilengkapi enkripsi hashing SHA-256 (Web Crypto API) untuk proteksi kata sandi.
// ===================================================================================

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
    } catch (_) {}
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
                nama: 'Super Administrator',
                username: 'superadmin',
                email: 'superadmin@manado.go.id',
                kata_sandi: HASH_AWAL_DEFAULT,
                peran: 'Superadmin',
                bidang: 'Akses Penuh Seluruh Modul (Superadmin)',
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
                bidang: 'Administrator Sistem',
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
                bidang: 'Administrator Sistem',
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

        const tersimpan = localStorage.getItem(this.kunciMasterUsers);
        if (!tersimpan) {
            localStorage.setItem(this.kunciMasterUsers, JSON.stringify(akunBawaanResmi));
            return;
        }

        try {
            const daftar = JSON.parse(tersimpan);
            let adaPembaruan = false;

            // Pastikan akun superadmin terdaftar di browser
            if (!daftar.some(u => u.username && u.username.toLowerCase() === 'superadmin')) {
                daftar.unshift(akunBawaanResmi.find(u => u.username === 'superadmin'));
                adaPembaruan = true;
            }

            // Pastikan akun Kadis terdaftar di browser
            if (!daftar.some(u => u.username && u.username.toLowerCase() === 'kadis')) {
                daftar.push(akunBawaanResmi.find(u => u.username === 'kadis'));
                adaPembaruan = true;
            }

            // Normalisasi peran lama 'Kepala Bagian' menjadi 'Kabid'
            daftar.forEach(u => {
                if (u.peran === 'Kepala Bagian') {
                    u.peran = 'Kabid';
                    adaPembaruan = true;
                }
                // Bersihkan teks Superadmin jika akun adalah Admin biasa (Regina, Edrick)
                if (u.peran === 'Admin' && u.bidang && u.bidang.includes('Superadmin')) {
                    u.bidang = 'Administrator Sistem';
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
        if (str === 'kabid' || str === 'kepala bagian' || str === 'kepala_bagian') return 'Kabid';
        if (str === 'kadis' || str === 'kepala dinas' || str === 'kepala_dinas') return 'Kadis';
        return 'Staf';
    }

    // Mengambil daftar menu navigasi resmi yang berhak diakses oleh masing-masing peran
    ambilDaftarMenu(peranPengguna) {
        const peranBersih = this.normalisasiPeran(peranPengguna);

        switch (peranBersih) {
            case 'Superadmin':
                // Superadmin: Memiliki hak akses penuh ke seluruh modul sistem
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'input-harga', label: 'Menu Masukan Data Pangan', icon: '📝' },
                    { id: 'verif-harga', label: 'Menu Verifikasi Harga Pangan', icon: '✅' },
                    { id: 'kelola-gpm', label: 'Menu Kelola GPM', icon: '🎟️' },
                    { id: 'laporan', label: 'Laporan Bidang Pangan', icon: '📑' },
                    { id: 'grafik-pangan', label: 'Grafik Pangan', icon: '📈' },
                    { id: 'laporan-gpm', label: 'Laporan GPM', icon: '📋' },
                    { id: 'kelola-user', label: 'Menu Kelola Pengguna', icon: '👥' },
                    { id: 'master-data', label: 'Master Pasar & Wilayah', icon: '🏛️' },
                    { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
                ];

            case 'Admin':
                // Admin: Menu edit user, master pasar dan wilayah, dashboard, menu cek gpm
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'kelola-user', label: 'Menu Kelola Pengguna', icon: '👥' },
                    { id: 'master-data', label: 'Master Pasar & Wilayah', icon: '🏛️' },
                    { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
                ];

            case 'Kabid':
                // Kabid: Laporan (khusus bidang ini), menu verif harga pangan, dashboard, menu kelola gpm
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'verif-harga', label: 'Menu Verifikasi Harga Pangan', icon: '✅' },
                    { id: 'kelola-gpm', label: 'Menu Kelola GPM', icon: '🎟️' },
                    { id: 'laporan', label: 'Laporan Bidang Pangan', icon: '📑' }
                ];

            case 'Staf':
                // Staf: Menu kelola GPM, dashboard, menu input data pangan
                return [
                    { id: 'dashboard', label: 'Beranda', icon: '📊' },
                    { id: 'input-harga', label: 'Menu Masukan Data Pangan', icon: '📝' },
                    { id: 'kelola-gpm', label: 'Menu Kelola GPM', icon: '🎟️' }
                ];

            case 'Kadis':
                // Kadis: Dashboard dan laporan gpm dan grafik pangan
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

    // Autentikasi Pengguna saat Login (Aman dengan Verifikasi Hash SHA-256)
    async login(identifier, kataSandi) {
        const inputBersih = (identifier || '').toLowerCase().trim();
        const daftarUsers = this.ambilSemuaPengguna();

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

        const token = `sipatokean-auth-${dataPenggunaAman.id}-${Date.now()}`;
        this.simpanSesi(token, dataPenggunaAman);

        return { token, pengguna: dataPenggunaAman };
    }

    // Mengambil semua daftar pengguna dari penyimpanan master
    ambilSemuaPengguna() {
        const tersimpan = localStorage.getItem(this.kunciMasterUsers);
        if (tersimpan) {
            try {
                return JSON.parse(tersimpan);
            } catch (e) {
                console.error('Gagal membaca data pengguna:', e);
            }
        }
        return [];
    }

    // Hard reset kata sandi oleh Admin / Superadmin (Tersimpan sebagai Hash Aman)
    async adminResetPassword(idAdmin, idTarget, passwordBaru) {
        const daftar = this.ambilSemuaPengguna();
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

        // Simpan dalam bentuk Hash Kriptografi SHA-256
        const hashBaru = await hitungHashSandi(passwordBaru);
        daftar[idxTarget].kata_sandi = hashBaru;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
        return true;
    }

    // Pengubahan username oleh Admin / Superadmin
    adminUbahUsername(idAdmin, idTarget, usernameBaru) {
        const daftar = this.ambilSemuaPengguna();
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

        daftar[idxTarget].username = usernameBersih;
        daftar[idxTarget].email = `${usernameBersih}@manado.go.id`;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

        // Jika admin mengubah username dirinya sendiri, perbarui sesi aktif
        const userSesi = this.ambilUserSesi();
        if (userSesi && userSesi.id === idTarget) {
            userSesi.username = usernameBersih;
            userSesi.email = daftar[idxTarget].email;
            this.simpanSesi(this.ambilToken(), userSesi);
        }

        return daftar[idxTarget];
    }

    // Pengubahan role pengguna oleh Admin / Superadmin
    adminUbahPeran(idAdmin, idTarget, peranBaru) {
        const daftar = this.ambilSemuaPengguna();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat mengatur peran pengguna!');
        }

        const peranValid = this.normalisasiPeran(peranBaru);
        const idxTarget = daftar.findIndex(u => u.id === idTarget);
        if (idxTarget === -1) {
            throw new Error('Pengguna target tidak ditemukan!');
        }

        daftar[idxTarget].peran = peranValid;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

        const userSesi = this.ambilUserSesi();
        if (userSesi && userSesi.id === idTarget) {
            userSesi.peran = peranValid;
            this.simpanSesi(this.ambilToken(), userSesi);
        }

        return daftar[idxTarget];
    }

    // Tambah pengguna baru oleh Admin / Superadmin
    async adminTambahPengguna(idAdmin, dataBaru) {
        const daftar = this.ambilSemuaPengguna();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat mendaftarkan akun baru!');
        }

        const usernameBersih = (dataBaru.username || '').toLowerCase().trim();
        if (!usernameBersih || !dataBaru.nama || !dataBaru.kata_sandi) {
            throw new Error('Nama, username, dan kata sandi wajib diisi lengkap!');
        }

        if (dataBaru.kata_sandi.length < 8) {
            throw new Error('Kata sandi awal minimal 8 karakter demi keamanan!');
        }

        if (daftar.some(u => u.username.toLowerCase() === usernameBersih)) {
            throw new Error(`Username "${usernameBersih}" sudah terdaftar di sistem!`);
        }

        const peranValid = this.normalisasiPeran(dataBaru.peran);
        const hashKataSandi = await hitungHashSandi(dataBaru.kata_sandi);

        const akunBaru = {
            id: 'usr-' + Date.now(),
            nama: dataBaru.nama.trim(),
            username: usernameBersih,
            email: dataBaru.email || `${usernameBersih}@manado.go.id`,
            kata_sandi: hashKataSandi,
            peran: peranValid,
            bidang: dataBaru.bidang || 'Dinas Pangan Kota Manado',
            foto_profil: ''
        };

        daftar.push(akunBaru);
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
        return akunBaru;
    }

    // Hapus pengguna oleh Admin / Superadmin
    adminHapusPengguna(idAdmin, idTarget) {
        const daftar = this.ambilSemuaPengguna();
        const adminAktif = daftar.find(u => u.id === idAdmin);
        const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

        if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
            throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat menghapus akun pengguna!');
        }

        if (idAdmin === idTarget) {
            throw new Error('Akun admin yang sedang aktif tidak dapat menghapus dirinya sendiri!');
        }

        const disaring = daftar.filter(u => u.id !== idTarget);
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(disaring));
        return true;
    }

    // Ubah kata sandi pribadi oleh pengguna yang sedang login
    async ubahKataSandiPribadi(idUser, kataSandiLama, kataSandiBaru) {
        if (!kataSandiBaru || kataSandiBaru.length < 8) {
            throw new Error('Kata sandi baru minimal 8 karakter!');
        }

        const daftar = this.ambilSemuaPengguna();
        const target = daftar.find(u => u.id === idUser);

        if (!target) {
            throw new Error('Pengguna tidak ditemukan!');
        }

        const hashLama = await hitungHashSandi(kataSandiLama);
        const cocok = (target.kata_sandi === hashLama) || (target.kata_sandi === kataSandiLama);

        if (!cocok) {
            throw new Error('Kata sandi lama yang Anda masukkan salah!');
        }

        target.kata_sandi = await hitungHashSandi(kataSandiBaru);
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
        return true;
    }

    // Ubah foto profil pribadi
    ubahFotoProfil(idUser, urlFoto) {
        const daftar = this.ambilSemuaPengguna();
        const target = daftar.find(u => u.id === idUser);
        if (target) {
            target.foto_profil = urlFoto;
            localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
        }

        const userSesi = this.ambilUserSesi();
        if (userSesi && userSesi.id === idUser) {
            userSesi.foto_profil = urlFoto;
            this.simpanSesi(this.ambilToken(), userSesi);
        }
        return true;
    }

    // Manajemen Sesi Login
    simpanSesi(token, pengguna) {
        localStorage.setItem(this.kunciSesiToken, token);
        localStorage.setItem(this.kunciSesiUser, JSON.stringify(pengguna));
    }

    ambilUserSesi() {
        const data = localStorage.getItem(this.kunciSesiUser);
        if (data) {
            try {
                const u = JSON.parse(data);
                if (u && (u.peran === 'Admin' || u.username === 'regina' || u.username === 'edrick')) {
                    if (u.bidang && u.bidang.includes('Superadmin')) {
                        u.bidang = 'Administrator Sistem';
                        localStorage.setItem(this.kunciSesiUser, JSON.stringify(u));
                    }
                }
                return u;
            } catch (e) {}
        }
        return null;
    }

    ambilUser() {
        return this.ambilUserSesi();
    }

    ambilToken() {
        return localStorage.getItem(this.kunciSesiToken);
    }

    logout() {
        localStorage.removeItem(this.kunciSesiToken);
        localStorage.removeItem(this.kunciSesiUser);
    }

    keluar() {
        this.logout();
    }
}

export const penggunaService = new PenggunaService();
