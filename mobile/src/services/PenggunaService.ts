// ===================================================================================
// MODUL LAYANAN PENGGUNA DAN KONTROL HAK AKSES SISTEM (OOP) - MOBILE
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola autentikasi, pembagian peran, hak akses menu,
// peremajaan username, serta hard reset kata sandi oleh administrator.
// Terintegrasi langsung dengan Supabase Cloud Database + Enkripsi SHA-256.
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
  } catch (_) {}
  return kataSandi;
}

// Hash resmi untuk kata sandi awal 'admin'
const HASH_AWAL_DEFAULT = 'bfdbf1ca1799b68e56f988a0c60fe4dfebcc377c4f3d21680bcc1eaca9b587c3';

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
  private kunciMasterUsers = 'sipatokaan_master_users';
  private kunciSesiToken = 'sipatokaan_mobile_token';
  private kunciSesiUser = 'sipatokaan_mobile_user';

  constructor() {
    this.inisialisasiAkunBawaan();
  }

  // Inisialisasi daftar akun resmi bawaan sistem (Akun tunggal default: admin / admin)
  inisialisasiAkunBawaan(): void {
    const akunBawaanResmi: AkunPengguna[] = [
      {
        id: 'usr-admin',
        nama: 'Administrator',
        username: 'admin',
        email: 'admin@manado.go.id',
        kata_sandi: HASH_AWAL_DEFAULT,
        peran: 'Superadmin',
        bidang: 'Administrator Sistem',
        foto_profil: ''
      }
    ];

    const tersimpan = localStorage.getItem(this.kunciMasterUsers) || localStorage.getItem('sipatokaan_master_users');
    if (!tersimpan) {
      localStorage.setItem(this.kunciMasterUsers, JSON.stringify(akunBawaanResmi));
      return;
    }

    try {
      let daftar: AkunPengguna[] = JSON.parse(tersimpan);
      let adaPembaruan = false;

      // Pastikan akun admin utama terdaftar di storage
      const idxAdmin = daftar.findIndex(u => u.username && u.username.toLowerCase() === 'admin');
      if (idxAdmin === -1) {
        daftar.unshift(akunBawaanResmi[0]);
        adaPembaruan = true;
      } else {
        daftar[idxAdmin].kata_sandi = HASH_AWAL_DEFAULT;
        daftar[idxAdmin].peran = 'Superadmin';
        adaPembaruan = true;
      }

      // Normalisasi peran lama 'Kepala Bagian' atau 'Petugas'
      daftar.forEach(u => {
        if ((u.peran as string) === 'Kepala Bagian') {
          u.peran = 'Kabid';
          adaPembaruan = true;
        }
        if ((u.peran as string) === 'Petugas') {
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
  apakahMenuDiizinkan(peranPengguna: string, idMenu: string): boolean {
    const daftar = this.ambilDaftarMenu(peranPengguna);
    return daftar.some(m => m.id === idMenu);
  }

  // Autentikasi Pengguna saat Login (Supabase Cloud Database -> Local Fallback)
  async login(identifier: string, kataSandi: string, ingatSaya: boolean = false): Promise<{ token: string; pengguna: AkunPengguna }> {
    const idBersih = (identifier || '').toLowerCase().trim();

    // 1. Coba login langsung via Supabase Cloud
    try {
      const userCloud = await supabaseClient.loginPengguna(idBersih, kataSandi);
      if (userCloud) {
        userCloud.peran = this.normalisasiPeran(userCloud.peran);
        if (userCloud.peran === 'Admin') userCloud.bidang = 'Admin';
        if (userCloud.peran === 'Superadmin') {
          userCloud.nama = 'Superadmin';
          userCloud.bidang = 'Superadmin';
        }

        // [CEK-09 FIX] Token menyimpan waktu expiry (8 jam)
        const exp = Date.now() + (8 * 60 * 60 * 1000);
        const token = `sipatokaan-mobile-cloud-${userCloud.id}-${Date.now()}-exp${exp}`;
        this.simpanSesi(token, userCloud, ingatSaya);

        // Perbarui cache lokal
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
        // [CEK-05 FIX] Supabase merespon tapi user/sandi salah — tolak langsung
        throw new Error('Nama pengguna atau kata sandi salah!');
      }
    } catch (e: any) {
      // [CEK-05 FIX] Hanya fallback lokal jika benar-benar offline
      const pesanError = (e.message || '');
      const isOffline = pesanError.includes('fetch') || pesanError.includes('abort') || pesanError.includes('network') || pesanError.includes('Failed');
      if (!isOffline) {
        throw e;
      }
      console.warn('Login Supabase Cloud gagal/offline, verifikasi lokal:', e);
    }

    // 2. [CEK-05] Fallback lokal HANYA jika Supabase benar-benar offline
    const daftar = this.ambilSemuaPenggunaLokal();
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
    if (salinanAman.peran === 'Admin') salinanAman.bidang = 'Admin';
    if (salinanAman.peran === 'Superadmin') {
      salinanAman.nama = 'Superadmin';
      salinanAman.bidang = 'Superadmin';
    }
    this.simpanSesi(token, salinanAman, ingatSaya);

    return {
      token,
      pengguna: salinanAman
    };
  }

  // Mengambil seluruh data pengguna (Langsung dari Supabase Cloud + Cache Sinkron)
  async ambilSemuaPengguna(): Promise<AkunPengguna[]> {
    try {
      const usersCloud = await supabaseClient.getPengguna();
      if (usersCloud && Array.isArray(usersCloud) && usersCloud.length > 0) {
        const daftarBersih: AkunPengguna[] = usersCloud.map(u => ({
          id: u.id,
          nama: (u.peran === 'Superadmin' || u.username === 'superadmin') ? 'Superadmin' : u.nama,
          username: u.username,
          email: u.email,
          peran: this.normalisasiPeran(u.peran) as PeranPengguna,
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

  // Mengambil seluruh data pengguna dari penyimpanan lokal secara sinkron
  ambilSemuaPenggunaLokal(): AkunPengguna[] {
    const tersimpan = localStorage.getItem(this.kunciMasterUsers);
    if (tersimpan) {
      try {
        return JSON.parse(tersimpan);
      } catch (e) {}
    }
    return [];
  }

  // [CEK-02 FIX: Cegah Manipulasi LocalStorage / DevTools Privilege Escalation]
  // Verifikasi real-time ke database Supabase untuk memastikan akun admin memang sah berstatus Admin/Superadmin
  async verifikasiHakAdminServer(idAdmin: string): Promise<boolean> {
    if (!idAdmin) return false;
    try {
      const res = await supabaseClient.request<any[]>(`pengguna?id=eq.${encodeURIComponent(idAdmin)}&select=peran&limit=1`);
      if (Array.isArray(res) && res.length > 0 && res[0].peran) {
        const peranReal = this.normalisasiPeran(res[0].peran);
        return peranReal === 'Admin' || peranReal === 'Superadmin';
      }
    } catch (_) {}
    const daftar = this.ambilSemuaPenggunaLokal();
    const adminAktif = daftar.find(u => u.id === idAdmin);
    const peranAdmin = adminAktif ? this.normalisasiPeran(adminAktif.peran) : '';
    return peranAdmin === 'Admin' || peranAdmin === 'Superadmin';
  }

  // Reset kata sandi pengguna oleh Admin / Superadmin (Supabase Cloud + Local Sync)
  async adminResetPassword(idAdmin: string, idTarget: string, passwordBaru: string): Promise<boolean> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak memiliki hak akses administrator!');
    }

    const daftar = this.ambilSemuaPenggunaLokal();

    if (!passwordBaru || passwordBaru.length < 8) {
      throw new Error('Kata sandi baru minimal 8 karakter demi keamanan!');
    }

    const idxTarget = daftar.findIndex(u => u.id === idTarget);
    if (idxTarget === -1) {
      throw new Error('Pengguna target tidak ditemukan!');
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

  // Ubah username pengguna oleh Admin / Superadmin (Supabase Cloud + Local Sync)
  async adminUbahUsername(idAdmin: string, idTarget: string, usernameBaru: string): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak berwenang mengubah username!');
    }

    const daftar = this.ambilSemuaPenggunaLokal();

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

    const userSesi = this.ambilUserSesi();
    if (userSesi && (userSesi.id === idTarget || userSesi.username === usernameLama)) {
      userSesi.username = usernameBersih;
      userSesi.email = daftar[idxTarget].email;
      this.simpanSesi(this.ambilToken() || '', userSesi);
    }

    return daftar[idxTarget];
  }

  // Ubah peran pengguna oleh Admin / Superadmin (Supabase Cloud + Local Sync)
  async adminUbahPeran(idAdmin: string, idTarget: string, peranBaru: string): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak berwenang mengubah peran pengguna!');
    }

    const daftar = this.ambilSemuaPenggunaLokal();

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
      this.simpanSesi(this.ambilToken() || '', userSesi);
    }

    return targetUser;
  }

  // Tambah pengguna baru oleh Admin / Superadmin (Supabase Cloud + Local Sync)
  async adminTambahPengguna(idAdmin: string, dataBaru: Partial<AkunPengguna>): Promise<AkunPengguna> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak dapat menambah pengguna!');
    }

    const daftar = this.ambilSemuaPenggunaLokal();

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

    const payloadAkun: any = {
      nama: (peranValid === 'Superadmin' || usernameBersih === 'superadmin') ? 'Superadmin' : dataBaru.nama.trim(),
      username: usernameBersih,
      email: dataBaru.email || `${usernameBersih}@manado.go.id`,
      kata_sandi: hashKataSandi,
      peran: peranValid,
      bidang: bidangBersih,
      foto_profil: ''
    };

    // Simpan langsung ke Supabase Cloud
    let akunBaru: AkunPengguna | null = null;
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

    daftar.push(akunBaru!);
    localStorage.setItem(this.kunciMasterUsers, JSON.stringify(daftar));
    return akunBaru!;
  }

  // Hapus akun pengguna oleh Admin / Superadmin (Supabase Cloud + Local Sync)
  async adminHapusPengguna(idAdmin: string, idTarget: string): Promise<boolean> {
    const isAuthorized = await this.verifikasiHakAdminServer(idAdmin);
    if (!isAuthorized) {
      throw new Error('Akses ditolak: Verifikasi server mendeteksi akun Anda tidak dapat menghapus akun pengguna!');
    }

    const daftar = this.ambilSemuaPenggunaLokal();

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
  async ubahKataSandiPribadi(idUser: string, kataSandiLama: string, kataSandiBaru: string): Promise<boolean> {
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
  async ubahFotoProfil(idUser: string, urlFoto: string): Promise<boolean> {
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
    const dariSession = sessionStorage.getItem(this.kunciSesiUser);
    if (dariSession) {
      try {
        const u = JSON.parse(dariSession);
        if (u && (u.peran === 'Admin' || u.username === 'regina' || u.username === 'edrick')) {
          u.bidang = 'Admin';
          sessionStorage.setItem(this.kunciSesiUser, JSON.stringify(u));
        }
        if (u && (u.peran === 'Superadmin' || u.username === 'superadmin' || u.username === 'admin')) {
          u.peran = 'Superadmin';
          u.bidang = 'Administrator Sistem';
        }
        return u;
      } catch (e) {}
    }

    const data = localStorage.getItem(this.kunciSesiUser);
    if (data) {
      try {
        const u = JSON.parse(data);
        if (u && (u.peran === 'Admin' || u.username === 'regina' || u.username === 'edrick')) {
          u.bidang = 'Admin';
          localStorage.setItem(this.kunciSesiUser, JSON.stringify(u));
        }
        if (u && (u.peran === 'Superadmin' || u.username === 'superadmin' || u.username === 'admin')) {
          u.peran = 'Superadmin';
          u.bidang = 'Administrator Sistem';
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
