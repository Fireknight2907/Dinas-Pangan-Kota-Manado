// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP) - MOBILE
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi murni Supabase Cloud (RPC SHA-256),
// pembagian peran, hak akses menu, pengelolaan akun, dan validasi masa aktif sesi.
// ===================================================================================

import { supabaseClient } from './SupabaseClient';

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
  } catch (_) { }
  return kataSandi;
}

export type PeranPengguna = 'Admin' | 'Kabid' | 'Staf' | 'Kadis' | 'Superadmin';

export interface AkunPengguna {
  id: string;
  nama: string;
  username: string;
  email: string;
  kata_sandi?: string;
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
  private kunciSesiToken = 'sipatokaan_mobile_token';
  private kunciSesiUser = 'sipatokaan_mobile_user';
  private readonly durasiSesiMs = 8 * 60 * 60 * 1000; // 8 jam

  constructor() {
    // Bersihkan sisa cache akun lokal warisan lama yang tidak aman
    try {
      localStorage.removeItem('sipatokaan_master_users');
      localStorage.removeItem('sipatokean_master_users');
    } catch (_) {}
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

  // Normalisasi objek pengguna tanpa menimpa nama asli dari database
  normalisasiDataPengguna(u: any): AkunPengguna | null {
    if (!u) return null;
    const peran = this.normalisasiPeran(u.peran);
    const bidangDefault = peran === 'Superadmin'
      ? 'Superadmin'
      : (peran === 'Admin' ? 'Admin' : 'Dinas Pangan Kota Manado');

    return {
      id: String(u.id || ''),
      nama: (u.nama && String(u.nama).trim()) ? String(u.nama).trim() : (peran === 'Superadmin' ? 'Superadmin' : (u.username || 'Petugas')),
      username: String(u.username || '').trim().toLowerCase(),
      email: String(u.email || '').trim().toLowerCase(),
      peran,
      bidang: (peran === 'Admin' || peran === 'Superadmin') ? bidangDefault : (u.bidang || bidangDefault),
      foto_profil: u.foto_profil || ''
    };
  }

  // Mengambil daftar menu navigasi resmi yang berhak diakses oleh masing-masing peran
  ambilDaftarMenu(peranPengguna?: string | null): MenuItemResmi[] {
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
          { id: 'master-data', label: 'Master Satuan, Pasar & Wilayah', icon: '🏛️' },
          { id: 'cek-gpm', label: 'Menu Cek GPM', icon: '🔍' }
        ];

      case 'Admin':
        return [
          { id: 'dashboard', label: 'Beranda', icon: '📊' },
          { id: 'kelola-user', label: 'Kelola Pengguna', icon: '👥' },
          { id: 'master-data', label: 'Master Satuan, Pasar & Wilayah', icon: '🏛️' },
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
  apakahMenuDiizinkan(peranPengguna: string, idMenu: string): boolean {
    const daftar = this.ambilDaftarMenu(peranPengguna);
    return daftar.some(m => m.id === idMenu);
  }

  // Autentikasi Pengguna saat Login (100% Murni Supabase Cloud RPC — Tanpa Mock/Backdoor Lokal)
  async login(identifier: string, kataSandi: string, ingatSaya: boolean = false): Promise<{ token: string; pengguna: AkunPengguna }> {
    const idBersih = (identifier || '').toLowerCase().trim();
    if (!idBersih || !kataSandi) {
      throw new Error('Nama pengguna/email dan kata sandi wajib diisi.');
    }

    let userCloud: any = null;
    try {
      userCloud = await supabaseClient.loginPengguna(idBersih, kataSandi);
    } catch (_) {
      throw new Error('Gagal terhubung ke server autentikasi. Periksa koneksi internet Anda lalu coba lagi.');
    }

    if (!userCloud) {
      throw new Error('Nama pengguna/email atau kata sandi salah!');
    }

    const penggunaResmi = this.normalisasiDataPengguna(userCloud)!;
    const exp = Date.now() + this.durasiSesiMs;
    const token = `sipatokaan-mobile-cloud-${penggunaResmi.id}-${Date.now()}-exp${exp}`;
    this.simpanSesi(token, penggunaResmi, ingatSaya);

    return { token, pengguna: penggunaResmi };
  }

  // Mengambil seluruh data pengguna langsung dari Supabase Cloud (tanpa data dummy lokal)
  async ambilSemuaPengguna(): Promise<AkunPengguna[]> {
    const usersCloud = await supabaseClient.getPengguna();
    if (!Array.isArray(usersCloud)) {
      return [];
    }
    return usersCloud
      .map(u => this.normalisasiDataPengguna(u))
      .filter((u): u is AkunPengguna => Boolean(u));
  }

  // Verifikasi real-time ke database Supabase untuk memastikan akun sah berstatus Admin/Superadmin
  async verifikasiHakAdminServer(idAdmin: string): Promise<boolean> {
    if (!idAdmin) return false;
    try {
      const res = await supabaseClient.request<any[]>(`pengguna?id=eq.${encodeURIComponent(idAdmin)}&select=peran&limit=1`);
      if (Array.isArray(res) && res.length > 0 && res[0].peran) {
        const peranReal = this.normalisasiPeran(res[0].peran);
        return peranReal === 'Admin' || peranReal === 'Superadmin';
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  private apakahSesiPermanen(): boolean {
    return Boolean(localStorage.getItem(this.kunciSesiToken));
  }

  // Reset kata sandi pengguna oleh Admin / Superadmin langsung ke Supabase Cloud
  async adminResetPassword(idAdmin: string, idTarget: string, passwordBaru: string): Promise<boolean> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak memiliki hak akses administrator!');
    }

    if (!passwordBaru || passwordBaru.length < 8) {
      throw new Error('Kata sandi baru minimal 8 karakter demi keamanan!');
    }

    const daftar = await this.ambilSemuaPengguna();
    const targetUser = daftar.find(u => u.id === idTarget);
    if (!targetUser) {
      throw new Error('Pengguna target tidak ditemukan dalam basis data!');
    }

    await supabaseClient.ubahPasswordPengguna(idTarget, passwordBaru, targetUser.username);
    return true;
  }

  // Ubah username pengguna oleh Admin / Superadmin langsung ke Supabase Cloud
  async adminUbahUsername(idAdmin: string, idTarget: string, usernameBaru: string): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak berwenang mengubah username!');
    }

    const usernameBersih = (usernameBaru || '').toLowerCase().trim();
    if (!usernameBersih) {
      throw new Error('Username baru tidak boleh kosong!');
    }
    if (/\s/.test(usernameBersih)) {
      throw new Error('Username tidak boleh mengandung spasi!');
    }

    const daftar = await this.ambilSemuaPengguna();
    const sudahAda = daftar.some(u => u.id !== idTarget && u.username.toLowerCase() === usernameBersih);
    if (sudahAda) {
      throw new Error(`Username "${usernameBersih}" sudah digunakan oleh pengguna lain!`);
    }

    const targetUser = daftar.find(u => u.id === idTarget);
    if (!targetUser) {
      throw new Error('Pengguna target tidak ditemukan!');
    }

    const usernameLama = targetUser.username;
    const emailBaru = targetUser.email && !targetUser.email.startsWith(`${usernameLama}@`)
      ? targetUser.email
      : `${usernameBersih}@manado.go.id`;

    await supabaseClient.updatePengguna(idTarget, {
      username: usernameBersih,
      email: emailBaru
    }, usernameLama);

    const hasilUpdate: AkunPengguna = { ...targetUser, username: usernameBersih, email: emailBaru };

    const userSesi = this.ambilUserSesi();
    if (userSesi && (userSesi.id === idTarget || userSesi.username === usernameLama)) {
      userSesi.username = usernameBersih;
      userSesi.email = emailBaru;
      this.simpanSesi(this.ambilToken() || '', userSesi, this.apakahSesiPermanen());
    }

    return hasilUpdate;
  }

  // Ubah email pengguna oleh Admin / Superadmin langsung ke Supabase Cloud
  async adminUbahEmail(idAdmin: string, idTarget: string, emailBaru: string): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak berwenang mengubah email pengguna!');
    }

    const emailBersih = (emailBaru || '').toLowerCase().trim();
    if (!emailBersih) {
      throw new Error('Alamat email baru tidak boleh kosong!');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailBersih)) {
      throw new Error('Format alamat email tidak valid!');
    }

    const daftar = await this.ambilSemuaPengguna();
    const sudahAda = daftar.some(u => u.id !== idTarget && u.email && u.email.toLowerCase() === emailBersih);
    if (sudahAda) {
      throw new Error(`Email "${emailBersih}" sudah digunakan oleh akun lain!`);
    }

    const targetUser = daftar.find(u => u.id === idTarget);
    if (!targetUser) {
      throw new Error('Pengguna target tidak ditemukan!');
    }

    await supabaseClient.updatePengguna(idTarget, { email: emailBersih }, targetUser.username);
    const hasilUpdate: AkunPengguna = { ...targetUser, email: emailBersih };

    const userSesi = this.ambilUserSesi();
    if (userSesi && (userSesi.id === idTarget || userSesi.username === targetUser.username)) {
      userSesi.email = emailBersih;
      this.simpanSesi(this.ambilToken() || '', userSesi, this.apakahSesiPermanen());
    }

    return hasilUpdate;
  }

  // Ubah peran pengguna oleh Admin / Superadmin langsung ke Supabase Cloud
  async adminUbahPeran(idAdmin: string, idTarget: string, peranBaru: string): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak berwenang mengubah peran pengguna!');
    }

    const daftar = await this.ambilSemuaPengguna();
    const peranValid = this.normalisasiPeran(peranBaru);
    const targetUser = daftar.find(u => u.id === idTarget);
    if (!targetUser) {
      throw new Error('Pengguna target tidak ditemukan!');
    }

    const bidangBaru = peranValid === 'Admin'
      ? 'Admin'
      : (peranValid === 'Superadmin' ? 'Superadmin' : (targetUser.bidang === 'Admin' || targetUser.bidang === 'Superadmin' ? 'Bidang Cadangan dan Distribusi Pangan' : (targetUser.bidang || 'Dinas Pangan Kota Manado')));

    await supabaseClient.updatePengguna(idTarget, {
      peran: peranValid,
      bidang: bidangBaru
    }, targetUser.username);

    const hasilUpdate: AkunPengguna = { ...targetUser, peran: peranValid, bidang: bidangBaru };

    const userSesi = this.ambilUserSesi();
    if (userSesi && (userSesi.id === idTarget || userSesi.username === targetUser.username)) {
      userSesi.peran = peranValid;
      userSesi.bidang = bidangBaru;
      this.simpanSesi(this.ambilToken() || '', userSesi, this.apakahSesiPermanen());
    }

    return hasilUpdate;
  }

  // Tambah pengguna baru oleh Admin / Superadmin langsung ke Supabase Cloud
  async adminTambahPengguna(idAdmin: string, dataBaru: Partial<AkunPengguna>): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak dapat menambah pengguna!');
    }

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

    const peranValid = this.normalisasiPeran(dataBaru.peran);
    const hashKataSandi = await hitungHashSandi(dataBaru.kata_sandi);
    const bidangBersih = peranValid === 'Admin'
      ? 'Admin'
      : (peranValid === 'Superadmin' ? 'Superadmin' : (dataBaru.bidang || 'Bidang Cadangan dan Distribusi Pangan'));

    const payloadAkun: any = {
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

    return this.normalisasiDataPengguna(resCloud)!;
  }

  // Hapus akun pengguna oleh Admin / Superadmin langsung dari Supabase Cloud
  async adminHapusPengguna(idAdmin: string, idTarget: string): Promise<boolean> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak dapat menghapus akun pengguna!');
    }

    if (idAdmin === idTarget) {
      throw new Error('Akun admin yang sedang aktif tidak dapat menghapus dirinya sendiri!');
    }

    const daftar = await this.ambilSemuaPengguna();
    const targetUser = daftar.find(u => u.id === idTarget);
    await supabaseClient.hapusPengguna(idTarget, targetUser?.username);
    return true;
  }

  // Ubah kata sandi pribadi (verifikasi sandi lama via RPC server-side Supabase)
  async ubahKataSandiPribadi(idUser: string, kataSandiLama: string, kataSandiBaru: string): Promise<boolean> {
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
  async ubahFotoProfil(idUser: string, urlFoto: string): Promise<boolean> {
    const userSesi = this.ambilUserSesi();
    await supabaseClient.updatePengguna(idUser, { foto_profil: urlFoto }, userSesi?.username);

    if (userSesi && userSesi.id === idUser) {
      userSesi.foto_profil = urlFoto;
      this.simpanSesi(this.ambilToken() || '', userSesi, this.apakahSesiPermanen());
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

  // Validasi ketat masa berlaku token (wajib memiliki -exp<timestamp> dan belum kedaluwarsa)
  tokenMasihBerlaku(token: string | null): boolean {
    if (!token || typeof token !== 'string') return false;
    if (token.startsWith('mock-')) return false;
    const match = token.match(/-exp(\d+)$/);
    if (!match) return false;
    return Date.now() < Number(match[1]);
  }

  ambilUserSesi(): AkunPengguna | null {
    const tokenSession = sessionStorage.getItem(this.kunciSesiToken);
    const dariSession = sessionStorage.getItem(this.kunciSesiUser);
    if (dariSession && this.tokenMasihBerlaku(tokenSession)) {
      try {
        return this.normalisasiDataPengguna(JSON.parse(dariSession));
      } catch (_) {}
    } else if (dariSession || tokenSession) {
      sessionStorage.removeItem(this.kunciSesiToken);
      sessionStorage.removeItem(this.kunciSesiUser);
    }

    const tokenLocal = localStorage.getItem(this.kunciSesiToken);
    const data = localStorage.getItem(this.kunciSesiUser);
    if (data && this.tokenMasihBerlaku(tokenLocal)) {
      try {
        return this.normalisasiDataPengguna(JSON.parse(data));
      } catch (_) {}
    } else if (data || tokenLocal) {
      localStorage.removeItem(this.kunciSesiToken);
      localStorage.removeItem(this.kunciSesiUser);
    }
    return null;
  }

  ambilUser(): AkunPengguna | null {
    return this.ambilUserSesi();
  }

  ambilToken(): string | null {
    const tokenSession = sessionStorage.getItem(this.kunciSesiToken);
    if (this.tokenMasihBerlaku(tokenSession)) return tokenSession;
    const tokenLocal = localStorage.getItem(this.kunciSesiToken);
    if (this.tokenMasihBerlaku(tokenLocal)) return tokenLocal;
    return null;
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
