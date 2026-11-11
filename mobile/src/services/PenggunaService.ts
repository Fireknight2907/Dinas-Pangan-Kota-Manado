// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP) - MOBILE
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi, pembagian peran, hak akses menu,
// peremajaan username, serta hard reset kata sandi oleh administrator.
// ===================================================================================

export type PeranPengguna = 'Admin' | 'Kabid' | 'Staf' | 'Kadis';

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
        peran: 'Kabid',
        bidang: 'Kepala Bidang Cadangan & Distribusi Pangan',
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
      },
      {
        id: 'usr-kadis',
        nama: 'Kepala Dinas Pangan',
        username: 'kadis',
        email: 'kadis@manado.go.id',
        kata_sandi: '12345678',
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

      // Pastikan akun Kadis terdaftar di storage
      if (!daftar.some(u => u.username.toLowerCase() === 'kadis')) {
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
    if (str === 'admin') return 'Admin';
    if (str === 'kabid' || str === 'kepala bidang' || str === 'kepala_bidang' || str === 'kepala bagian') return 'Kabid';
    if (str === 'kadis' || str === 'kepala dinas' || str === 'kepala_dinas') return 'Kadis';
    return 'Staf';
  }

  // Mengambil daftar menu navigasi resmi yang berhak diakses oleh masing-masing peran
  ambilDaftarMenu(peranPengguna?: string | null): MenuItemResmi[] {
    const peranBersih = this.normalisasiPeran(peranPengguna);

    switch (peranBersih) {
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

  // Autentikasi Pengguna
  async login(identifier: string, kataSandi: string): Promise<{ token: string; pengguna: AkunPengguna }> {
    const idBersih = (identifier || '').toLowerCase().trim();
    const daftar = this.ambilSemuaPengguna();

    const userCocok = daftar.find(u =>
      (u.username && u.username.toLowerCase() === idBersih) ||
      (u.email && u.email.toLowerCase() === idBersih)
    );

    if (!userCocok) {
      throw new Error('Akun dengan username atau email tersebut tidak terdaftar!');
    }

    if (userCocok.kata_sandi !== kataSandi) {
      throw new Error('Kata sandi yang Anda masukkan salah!');
    }

    const token = 'token-sipato-mobile-' + Date.now();
    const salinanAman: AkunPengguna = { ...userCocok };
    this.simpanSesi(token, salinanAman);

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

  // Reset kata sandi pengguna oleh Admin
  adminResetPassword(idAdmin: string, idTarget: string, passwordBaru: string): boolean {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);

    if (!adminAktif || this.normalisasiPeran(adminAktif.peran) !== 'Admin') {
      throw new Error('Akses ditolak: Hanya role Admin yang dapat mereset kata sandi pengguna!');
    }

    if (!passwordBaru || passwordBaru.length < 8) {
      throw new Error('Kata sandi baru minimal 8 karakter demi keamanan!');
    }

    const idxTarget = daftar.findIndex(u => u.id === idTarget);
    if (idxTarget === -1) {
      throw new Error('Pengguna target tidak ditemukan!');
    }

    daftar[idxTarget].kata_sandi = passwordBaru;
    localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
    return true;
  }

  // Ubah username pengguna oleh Admin
  adminUbahUsername(idAdmin: string, idTarget: string, usernameBaru: string): AkunPengguna {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);

    if (!adminAktif || this.normalisasiPeran(adminAktif.peran) !== 'Admin') {
      throw new Error('Akses ditolak: Hanya role Admin yang dapat mengubah username!');
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

  // Ubah peran pengguna oleh Admin
  adminUbahPeran(idAdmin: string, idTarget: string, peranBaru: string): AkunPengguna {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);

    if (!adminAktif || this.normalisasiPeran(adminAktif.peran) !== 'Admin') {
      throw new Error('Akses ditolak: Hanya role Admin yang dapat mengubah peran pengguna!');
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

  // Tambah pengguna baru oleh Admin
  adminTambahPengguna(idAdmin: string, dataBaru: Partial<AkunPengguna>): AkunPengguna {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);

    if (!adminAktif || this.normalisasiPeran(adminAktif.peran) !== 'Admin') {
      throw new Error('Akses ditolak: Hanya role Admin yang dapat mendaftarkan akun baru!');
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
    const akunBaru: AkunPengguna = {
      id: 'usr-' + Date.now(),
      nama: dataBaru.nama.trim(),
      username: usernameBersih,
      email: dataBaru.email || `${usernameBersih}@manado.go.id`,
      kata_sandi: dataBaru.kata_sandi,
      peran: peranValid,
      bidang: dataBaru.bidang || 'Dinas Pangan Kota Manado',
      foto_profil: ''
    };

    daftar.push(akunBaru);
    localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
    return akunBaru;
  }

  // Hapus pengguna oleh Admin
  adminHapusPengguna(idAdmin: string, idTarget: string): boolean {
    const daftar = this.ambilSemuaPengguna();
    const adminAktif = daftar.find(u => u.id === idAdmin);

    if (!adminAktif || this.normalisasiPeran(adminAktif.peran) !== 'Admin') {
      throw new Error('Akses ditolak: Hanya role Admin yang dapat menghapus akun pengguna!');
    }

    if (idAdmin === idTarget) {
      throw new Error('Akun admin yang sedang aktif tidak dapat menghapus dirinya sendiri!');
    }

    const disaring = daftar.filter(u => u.id !== idTarget);
    localStorage.setItem(this.kunciMasterUsers, JSON.stringify(disaring));
    return true;
  }

  // Ubah kata sandi pribadi oleh pengguna yang sedang login
  ubahKataSandiPribadi(idUser: string, kataSandiLama: string, kataSandiBaru: string): boolean {
    if (!kataSandiBaru || kataSandiBaru.length < 8) {
      throw new Error('Kata sandi baru minimal 8 karakter!');
    }

    const daftar = this.ambilSemuaPengguna();
    const target = daftar.find(u => u.id === idUser);

    if (!target) {
      throw new Error('Pengguna tidak ditemukan!');
    }

    if (target.kata_sandi !== kataSandiLama) {
      throw new Error('Kata sandi lama yang Anda masukkan salah!');
    }

    target.kata_sandi = kataSandiBaru;
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

  // Manajemen Sesi Login
  simpanSesi(token: string, pengguna: AkunPengguna): void {
    localStorage.setItem(this.kunciSesiToken, token);
    localStorage.setItem(this.kunciSesiUser, JSON.stringify(pengguna));
  }

  ambilUserSesi(): AkunPengguna | null {
    const data = localStorage.getItem(this.kunciSesiUser);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {}
    }
    return null;
  }

  ambilUser(): AkunPengguna | null {
    return this.ambilUserSesi();
  }

  ambilToken(): string | null {
    return localStorage.getItem(this.kunciSesiToken);
  }

  logout(): void {
    localStorage.removeItem(this.kunciSesiToken);
    localStorage.removeItem(this.kunciSesiUser);
  }

  keluar(): void {
    this.logout();
  }
}

export const penggunaMobileService = new PenggunaMobileService();

