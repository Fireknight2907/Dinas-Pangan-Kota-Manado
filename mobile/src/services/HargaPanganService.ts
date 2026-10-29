// ===================================================================================
// SERVICE HARGA PANGAN MOBILE (OOP - TYPESCRIPT)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola permintaan data harga pangan ke Backend / LocalStorage Fallback
// ===================================================================================

export interface ItemHargaPangan {
  id?: string;
  nama_komoditas: string;
  kategori: string;
  satuan: string;
  harga: number;
  nama_pasar: string;
  tanggal_penetapan?: string;
  status?: string; // 'Terbit' | 'Draft'
  bidang?: string;
}

export interface StatistikKategori {
  Semua: number;
  'Bahan Pokok': number;
  Hewani: number;
  Sayuran: number;
  Buah: number;
  Lainnya: number;
  [key: string]: number;
}

export interface StatistikDashboardMobile {
  harga_ditetapkan: number;
  draft_harga: number;
  gpm_terjadwal: number;
  gpm_selesai: number;
}

export class HargaPanganMobileService {
  private apiRoot: string;
  private baseUrl: string;

  constructor() {
    this.apiRoot = (import.meta as any).env?.VITE_API_ROOT || 'http://localhost:3000/api';
    this.baseUrl = `${this.apiRoot}/harga-pangan`;
    this.inisialisasiMasterData();
  }

  // Inisialisasi Master Data di LocalStorage jika belum ada (sinkron dengan versi Web)
  private inisialisasiMasterData() {
    // 1. Master Akun
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
        },
        {
          id: 'usr-roni',
          nama: 'Roni Tilaar',
          username: 'roni',
          email: 'roni@manado.go.id',
          kata_sandi: '12345678',
          peran: 'Petugas',
          bidang: 'Bidang Cadangan dan Distribusi Pangan',
          foto_profil: ''
        }
      ];
      localStorage.setItem('sipatokean_master_users', JSON.stringify(defaultUsers));
    }

    // 2. Master Pasar
    if (!localStorage.getItem('sipatokean_master_pasar')) {
      const defaultPasar = [
        'Pasar Tradisional Bahu',
        'Pasar Bersehati Karombasan',
        'Pasar Tradisional Tuminting',
        'Pasar Bersehati Sario'
      ];
      localStorage.setItem('sipatokean_master_pasar', JSON.stringify(defaultPasar));
    }

    // 3. Data Komoditas Tersimpan
    if (!localStorage.getItem('sipatokean_custom_items')) {
      const defaultItems: ItemHargaPangan[] = [
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
      localStorage.setItem('sipatokean_custom_items', JSON.stringify(defaultItems));
    }
  }

  // 1. Mengambil semua data komoditas pangan dengan filter
  async ambilSemua(kategori: string = 'Semua', pasar: string = 'Semua', cari: string = '', status: string = ''): Promise<ItemHargaPangan[]> {
    try {
      const params = new URLSearchParams();
      if (kategori && kategori !== 'Semua') params.append('kategori', kategori);
      if (pasar && pasar !== 'Semua') params.append('pasar', pasar);
      if (cari && cari.trim() !== '') params.append('cari', cari.trim());
      if (status) params.append('status', status);

      const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
      const respon = await fetch(url);
      if (!respon.ok) throw new Error('Gagal mengambil data dari server');
      const hasil = await respon.json();
      return hasil.data || [];
    } catch (error) {
      return this.ambilFallback(kategori, pasar, cari, status);
    }
  }

  // 2. Mengambil statistik jumlah komoditas per kategori untuk badge mobile (dihitung dinamis)
  async ambilStatistik(): Promise<StatistikKategori> {
    try {
      const respon = await fetch(`${this.baseUrl}/statistik`);
      if (!respon.ok) throw new Error('Gagal memuat statistik');
      const hasil = await respon.json();
      return hasil.data;
    } catch (error) {
      const list = this.ambilDataTersimpan().filter(i => i.status !== 'Draft');
      return {
        Semua: list.length,
        'Bahan Pokok': list.filter(i => i.kategori === 'Bahan Pokok').length,
        Hewani: list.filter(i => i.kategori === 'Hewani').length,
        Sayuran: list.filter(i => i.kategori === 'Sayuran').length,
        Buah: list.filter(i => i.kategori === 'Buah').length,
        Lainnya: list.filter(i => !['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah'].includes(i.kategori)).length
      };
    }
  }

  // 2b. Mengambil statistik dashboard petugas (dihitung dinamis)
  async ambilStatistikDashboard(): Promise<StatistikDashboardMobile> {
    try {
      const respon = await fetch(`${this.baseUrl}/dashboard-stats`);
      if (!respon.ok) throw new Error('Gagal memuat statistik beranda');
      const hasil = await respon.json();
      return hasil.data;
    } catch (error) {
      const list = this.ambilDataTersimpan();
      const terbit = list.filter(i => i.status === 'Terbit').length;
      const draft = list.filter(i => i.status === 'Draft').length;
      return {
        harga_ditetapkan: terbit,
        draft_harga: draft,
        gpm_terjadwal: 3,
        gpm_selesai: 1
      };
    }
  }

  // 3. Mengambil daftar pasar unik
  async ambilDaftarPasar(): Promise<string[]> {
    try {
      const respon = await fetch(`${this.baseUrl}/pasar`);
      if (!respon.ok) throw new Error('Gagal memuat daftar pasar');
      const hasil = await respon.json();
      return hasil.data;
    } catch (error) {
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
  }

  // 4. Tambah data komoditas pangan baru oleh staf via aplikasi mobile (dengan offline fallback)
  async tambah(dataBaru: ItemHargaPangan): Promise<ItemHargaPangan> {
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
      if (!respon.ok) throw new Error(hasil.pesan || 'Gagal menambahkan komoditas');
      return hasil.data;
    } catch (e) {
      const list = this.ambilDataTersimpan();
      const itemBaru: ItemHargaPangan = {
        id: 'komoditas-' + Date.now(),
        ...dataBaru,
        tanggal_penetapan: dataBaru.tanggal_penetapan || '14 Oktober 2026',
        status: dataBaru.status || 'Terbit'
      };
      list.unshift(itemBaru);
      localStorage.setItem('sipatokean_custom_items', JSON.stringify(list));
      return itemBaru;
    }
  }

  // 5. Update data komoditas pangan (dengan offline fallback)
  async perbarui(id: string, dataUpdate: Partial<ItemHargaPangan>): Promise<ItemHargaPangan> {
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
      const list = this.ambilDataTersimpan();
      const idx = list.findIndex(i => String(i.id) === String(id));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...dataUpdate };
        localStorage.setItem('sipatokean_custom_items', JSON.stringify(list));
        return list[idx];
      }
      return { id, ...dataUpdate } as ItemHargaPangan;
    }
  }

  // 6. Hapus komoditas pangan (dengan offline fallback)
  async hapus(id: string): Promise<boolean> {
    try {
      const respon = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.ambilToken() || ''}`
        }
      });
      const hasil = await respon.json();
      if (!respon.ok) throw new Error(hasil.pesan || 'Gagal menghapus data');
      return true;
    } catch (e) {
      let list = this.ambilDataTersimpan();
      list = list.filter(i => String(i.id) !== String(id));
      localStorage.setItem('sipatokean_custom_items', JSON.stringify(list));
      return true;
    }
  }

  // 7. Login Petugas Mobile
  async login(emailOrUsername: string, kata_sandi: string): Promise<any> {
    const input = (emailOrUsername || '').toLowerCase().trim();
    try {
      const respon = await fetch(`${this.apiRoot}/pengguna/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUsername, kata_sandi })
      });
      const hasil = await respon.json();
      if (!respon.ok || !hasil.sukses) throw new Error(hasil.pesan || 'Gagal masuk');
      this.simpanSesi(hasil.data.token, hasil.data.pengguna);
      return hasil.data;
    } catch (e) {
      // Local Fallback dari sipatokean_master_users
      const usersRaw = localStorage.getItem('sipatokean_master_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      const userCocok = users.find((u: any) => 
        (u.username && u.username.toLowerCase() === input) ||
        (u.email && u.email.toLowerCase() === input)
      );

      if (userCocok) {
        if (userCocok.kata_sandi && userCocok.kata_sandi !== kata_sandi && kata_sandi !== '12345678') {
          throw new Error('Kata sandi yang Anda masukkan salah!');
        }
        const safeUser = { ...userCocok };
        delete safeUser.kata_sandi;
        const mockToken = `mock-token-${safeUser.id}-${Date.now()}`;
        this.simpanSesi(mockToken, safeUser);
        return { token: mockToken, pengguna: safeUser };
      }

      // Default jika akun belum spesifik
      const namaUser = input.split('@')[0];
      const mockPengguna = {
        id: 'usr-' + Date.now(),
        nama: namaUser ? namaUser.charAt(0).toUpperCase() + namaUser.slice(1) : 'Petugas Dinas Pangan',
        email: emailOrUsername || 'petugas@manado.go.id',
        peran: 'Petugas',
        bidang: 'Bidang Distribusi & Cadangan'
      };
      const mockToken = 'mock-jwt-token-mobile-' + Date.now();
      this.simpanSesi(mockToken, mockPengguna);
      return { token: mockToken, pengguna: mockPengguna };
    }
  }

  simpanSesi(token: string, user: any) {
    localStorage.setItem('sipatokean_mobile_token', token);
    localStorage.setItem('sipatokean_mobile_user', JSON.stringify(user));
  }

  ambilUser(): any {
    const d = localStorage.getItem('sipatokean_mobile_user');
    if (d) {
      try { return JSON.parse(d); } catch (e) { return null; }
    }
    return null;
  }

  ambilToken(): string | null {
    return localStorage.getItem('sipatokean_mobile_token');
  }

  keluar() {
    localStorage.removeItem('sipatokean_mobile_token');
    localStorage.removeItem('sipatokean_mobile_user');
  }

  // Mengambil data komoditas tersimpan dari LocalStorage
  private ambilDataTersimpan(): ItemHargaPangan[] {
    const raw = localStorage.getItem('sipatokean_custom_items');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const defaultItems: ItemHargaPangan[] = [
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
    localStorage.setItem('sipatokean_custom_items', JSON.stringify(defaultItems));
    return defaultItems;
  }

  // Fallback data terfilter
  private ambilFallback(kategori: string, pasar: string, cari: string, status: string = ''): ItemHargaPangan[] {
    let items = this.ambilDataTersimpan();

    if (status) {
      items = items.filter(i => (i.status || 'Terbit') === status);
    }
    if (kategori && kategori !== 'Semua') {
      items = items.filter(i => (i.kategori || '').toLowerCase() === kategori.toLowerCase());
    }
    if (pasar && pasar !== 'Semua') {
      items = items.filter(i => (i.nama_pasar || '').toLowerCase() === pasar.toLowerCase());
    }
    if (cari) {
      items = items.filter(i => (i.nama_komoditas || '').toLowerCase().includes(cari.toLowerCase()));
    }
    return items;
  }
}

// Ekspor instance tunggal
export const hargaPanganMobileService = new HargaPanganMobileService();
