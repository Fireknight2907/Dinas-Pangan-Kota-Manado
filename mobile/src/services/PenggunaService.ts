// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP) - MOBILE
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi, pembagian peran, hak akses menu,
// peremajaan username, serta hard reset kata sandi oleh administrator.
// Dilengkapi enkripsi hashing SHA-256 (Web Crypto API) untuk proteksi kata sandi.
// ===================================================================================

export async function hitungHashSandi(kataSandi: string): Promise<string> {
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

export type PeranPengguna = 'Admin' | 'Kabid' | 'Staf' | 'Kadis' | 'Superadmin';

export interface AkunPengguna {
  id: string;
  nama: string;
  username: string;
  email: string;
  kata_sandi: string;
  peran: PeranPengguna;
  bidang: string;
  foto_profil?: string;
}

export interface MenuItemResmi {
  id: string;
  label: string;
  icon: string;
}

class PenggunaMobileService {
  private kunciMasterUsers = 'sipatokean_master_users';
  private kunciSesiToken = 'sipatokean_mobile_token';
  private kunciSesiUser = 'sipatokean_mobile_user';

  constructor() {
    this.inisialisasiAkunBawaan();
  }

  // Inisialisasi daftar akun resmi sesuai struktur organisasi Dinas Pangan
  inisialisasiAkunBawaan(): void {
    const akunBawaanResmi: AkunPengguna[] = [
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
      const daftar: AkunPengguna[] = JSON.parse(tersimpan);
      let adaPembaruan = false;

      // Pastikan akun superadmin terdaftar di storage
      if (!daftar.some(u => u.username && u.username.toLowerCase() === 'superadmin')) {
        const sa = akunBawaanResmi.find(u => u.username === 'superadmin');
        if (sa) daftar.unshift(sa);
        adaPembaruan = true;
      }

      // Pastikan akun Kadis terdaftar di storage
      if (!daftar.some(u => u.username && u.username.toLowerCase() === 'kadis')) {
        const kadis = akunBawaanResmi.find(u => u.username === 'kadis');
        if (kadis) daftar.push(kadis);
        adaPembaruan = true;
      }

      // Normalisasi peran lama 'Kepala Bagian' menjadi 'Kabid'
      daftar.forEach(u => {
        if ((u.peran as string) === 'Kepala Bagian') {
          u.peran = 'Kabid';
          adaPembaruan = true;
        }
        // Bersihkan teks Superadmin jika akun adalah Admin biasa (misal: Regina, Edrick)
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
  normalisasiPeran(peranInput?: string | null): PeranPengguna {
    if (!peranInput) return 'Staf';
    const str = peranInput.toString().toLowerCase().trim();
    if (str === 'superadmin') return 'Superadmin';
    if (str === 'admin') return 'Admin';
    if (str === 'kabid' || str === 'kepala bidang' || str === 'kepala_bidang' || str === 'kepala bagian') return 'Kabid';
    if (str === 'kadis' || str === 'kepala dinas' || str === 'kepala_dinas') return 'Kadis';
    return 'Staf';
  }

  // Mengambil daftar menu navigasi resmi yang berhak diakses oleh masing-masing peran
  ambilDaftarMenu(peranPengguna?: string | null): MenuItemResmi[] {
    const peranBersih = this.normalisasiPeran(peranPengguna);

    switch (peranBersih) {
      case 'Superadmin':
        // Superadmin: Akses penuh ke seluruh menu
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
        // Admin: Menu edit user, master pasar dan wilayah, dashboard, menu cek gpm
        return [
          { id: 'dashboard', label: 'Beranda', icon: '📊' },
          { id: 'kelola-user', label: 'Kelola Pengguna', icon: '👥' },
          { id: 'master-data', label: 'Master Pasar & Wilayah', icon: '🏛️' },
          { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
        ];

      case 'Kabid':
        // Kabid: Laporan (khusus bidang ini), menu verif harga pangan, dashboard, menu kelola gpm
        return [
          { id: 'dashboard', label: 'Beranda', icon: '📊' },
          { id: 'verif-harga', label: 'Verifikasi Harga Pangan', icon: '✅' },
          { id: 'kelola-gpm', label: 'Kelola GPM', icon: '🎟️' },
          { id: 'laporan', label: 'Laporan Bidang Pangan', icon: '📑' }
        ];

      case 'Staf':
        // Staf: Menu kelola GPM, dashboard, menu input data pangan
        return [
          { id: 'dashboard', label: 'Beranda', icon: '📊' },
          { id: 'input-harga', label: 'Masukan Data Pangan', icon: '📝' },
          { id: 'kelola-gpm', label: 'Kelola GPM', icon: '🎟️' }
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
  apakahMenuDiizinkan(peranPengguna: string, idMenu: string): boolean {
    const daftar = this.ambilDaftarMenu(peranPengguna);
    return daftar.some(m => m.id === idMenu);
  }

  // Autentikasi Pengguna saat Login (Aman dengan Verifikasi Hash SHA-256)
  async login(identifier: string, kataSandi: string, ingatSaya: boolean = false): Promise<{ token: string; pengguna: AkunPengguna }> {
    const idBersih = (identifier || '').toLowerCase().trim();
    const daftar = this.ambilSemuaPengguna();

    const userCocok = daftar.find(u =>
      (u.username && u.username.toLowerCase() === idBersih) ||
      (u.email && u.email.toLowerCase() === idBersih)
    );

    if (!userCocok) {
      throw new Error('Akun dengan username atau email tersebut tidak terdaftar!');
    }

    const hashInput = await hitungHashSandi(kataSandi);
    const cocok = (userCocok.kata_sandi === hashInput) || (userCocok.kata_sandi === kataSandi);

    if (!cocok) {
      throw new Error('Kata sandi yang Anda masukkan salah!');
    }

    // Otomatis migrasikan kata sandi plaintext warisan ke hash SHA-256
    if (userCocok.kata_sandi !== hashInput) {
      userCocok.kata_sandi = hashInput;
      const idx = daftar.findIndex(u => u.id === userCocok.id);
      if (idx !== -1) {
        daftar[idx].kata_sandi = hashInput;
        localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
      }
    }

    const token = 'token-sipato-mobile-' + Date.now();
    const salinanAman: AkunPengguna = { ...userCocok };
    delete (salinanAman as any).kata_sandi;
    salinanAman.peran = this.normalisasiPeran(salinanAman.peran) as PeranPengguna;
    this.simpanSesi(token, salinanAman, ingatSaya);

    return {
      token,
      pengguna: salinanAman
    };
  }

  // Mengambil seluruh data pengguna yang tersimpan
  ambilSemuaPengguna(): AkunPengguna[] {
    const tersimpan = localStorage.getItem(this.kunciMasterUsers);
    if (tersimpan) {
      try {
        return JSON.parse(tersimpan);
      } catch (e) {}
    }
    return [];
  }

  // Reset kata sandi pengguna oleh Admin / Superadmin
  async adminResetPassword(idAdmin: string, idTarget: string, passwordBaru: string): Promise<boolean> {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);
    const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

    if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
      throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat mereset kata sandi pengguna!');
    }

    if (!passwordBaru || passwordBaru.length < 8) {
      throw new Error('Kata sandi baru minimal 8 karakter demi keamanan!');
    }

    const idxTarget = daftar.findIndex(u => u.id === idTarget);
    if (idxTarget === -1) {
      throw new Error('Pengguna target tidak ditemukan!');
    }

    const hashBaru = await hitungHashSandi(passwordBaru);
    daftar[idxTarget].kata_sandi = hashBaru;
    localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
    return true;
  }

  // Ubah username pengguna oleh Admin / Superadmin
  adminUbahUsername(idAdmin: string, idTarget: string, usernameBaru: string): AkunPengguna {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);
    const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

    if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
      throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat mengubah username!');
    }

    const usernameBersih = (usernameBaru || '').toLowerCase().trim();
    if (!usernameBersih) {
      throw new Error('Username baru tidak boleh kosong!');
    }

    const sudahAda = daftar.some(u => u.id !== idTarget && u.username.toLowerCase() === usernameBersih);
    if (sudahAda) {
      throw new Error(`Username "${usernameBersih}" sudah digunakan oleh pengguna lain!`);
    }

    const idxTarget = daftar.findIndex(u => u.id === idTarget);
    if (idxTarget === -1) {
      throw new Error('Pengguna target tidak ditemukan!');
    }

    daftar[idxTarget].username = usernameBersih;
    daftar[idxTarget].email = `${usernameBersih}@manado.go.id`;
    localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));

    const userSesi = this.ambilUserSesi();
    if (userSesi && userSesi.id === idTarget) {
      userSesi.username = usernameBersih;
      userSesi.email = daftar[idxTarget].email;
      this.simpanSesi(this.ambilToken() || '', userSesi);
    }

    return daftar[idxTarget];
  }

  // Ubah peran pengguna oleh Admin / Superadmin
  adminUbahPeran(idAdmin: string, idTarget: string, peranBaru: string): AkunPengguna {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);
    const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';

    if (!adminAktif || (peranAdmin !== 'Admin' && peranAdmin !== 'Superadmin')) {
      throw new Error('Akses ditolak: Hanya role Admin atau Superadmin yang dapat mengubah peran pengguna!');
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
      this.simpanSesi(this.ambilToken() || '', userSesi);
    }

    return daftar[idxTarget];
  }

  // Tambah pengguna baru oleh Admin / Superadmin
  async adminTambahPengguna(idAdmin: string, dataBaru: Partial<AkunPengguna>): Promise<AkunPengguna> {
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

    const peranValid = this.normalisasiPeran(dataBaru.peran) as PeranPengguna;
    const hashKataSandi = await hitungHashSandi(dataBaru.kata_sandi);

    const akunBaru: AkunPengguna = {
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
  adminHapusPengguna(idAdmin: string, idTarget: string): boolean {
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
  async ubahKataSandiPribadi(idUser: string, kataSandiLama: string, kataSandiBaru: string): Promise<boolean> {
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
  ubahFotoProfil(idUser: string, urlFoto: string): boolean {
    const daftar = this.ambilSemuaPengguna();
    const target = daftar.find(u => u.id === idUser);
    if (target) {
      target.foto_profil = urlFoto;
      localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
    }

    const userSesi = this.ambilUserSesi();
    if (userSesi && userSesi.id === idUser) {
      userSesi.foto_profil = urlFoto;
      this.simpanSesi(this.ambilToken() || '', userSesi);
    }
    return true;
  }

  // Manajemen Sesi Login (Sesi Sementara sessionStorage & Sesi Permanen localStorage)
  simpanSesi(token: string, pengguna: AkunPengguna, ingatSaya: boolean = false): void {
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

  ambilUserSesi(): AkunPengguna | null {
    // Cek sessionStorage terlebih dahulu
    const dariSession = sessionStorage.getItem(this.kunciSesiUser);
    if (dariSession) {
      try {
        const u = JSON.parse(dariSession);
        if (u && (u.peran === 'Admin' || u.username === 'regina' || u.username === 'edrick')) {
          if (u.bidang && u.bidang.includes('Superadmin')) {
            u.bidang = 'Administrator Sistem';
            sessionStorage.setItem(this.kunciSesiUser, JSON.stringify(u));
          }
        }
        return u;
      } catch (e) {}
    }

    // Cek localStorage jika sebelumnya mencentang Ingat Saya
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

  ambilUser(): AkunPengguna | null {
    return this.ambilUserSesi();
  }

  ambilToken(): string | null {
    return sessionStorage.getItem(this.kunciSesiToken) || localStorage.getItem(this.kunciSesiToken);
  }

  logout(): void {
    sessionStorage.removeItem(this.kunciSesiToken);
    sessionStorage.removeItem(this.kunciSesiUser);
    localStorage.removeItem(this.kunciSesiToken);
    localStorage.removeItem(this.kunciSesiUser);
  }

  keluar(): void {
    this.logout();
  }
}

export const penggunaMobileService = new PenggunaMobileService();

