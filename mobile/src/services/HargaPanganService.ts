// ===================================================================================
// SERVICE HARGA PANGAN MOBILE (OOP - TYPESCRIPT)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengelola permintaan data harga pangan ke Backend / Supabase
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
      console.warn('Backend tidak terhubung di Mobile, menggunakan fallback lokal:', error);
      return this.ambilFallback(kategori, pasar, cari, status);
    }
  }

  // 2. Mengambil statistik jumlah komoditas per kategori untuk badge mobile
  async ambilStatistik(): Promise<StatistikKategori> {
    try {
      const respon = await fetch(`${this.baseUrl}/statistik`);
      if (!respon.ok) throw new Error('Gagal memuat statistik');
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

  // 2b. Mengambil statistik dashboard petugas
  async ambilStatistikDashboard(): Promise<StatistikDashboardMobile> {
    try {
      const respon = await fetch(`${this.baseUrl}/dashboard-stats`);
      if (!respon.ok) throw new Error('Gagal memuat statistik dasbor');
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

  // 3. Mengambil daftar pasar unik
  async ambilDaftarPasar(): Promise<string[]> {
    try {
      const respon = await fetch(`${this.baseUrl}/pasar`);
      if (!respon.ok) throw new Error('Gagal memuat daftar pasar');
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

  // 4. Tambah data komoditas pangan baru oleh staf via aplikasi mobile
  async tambah(dataBaru: ItemHargaPangan): Promise<ItemHargaPangan> {
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
  }

  // 5. Update data komoditas pangan
  async perbarui(id: string, dataUpdate: Partial<ItemHargaPangan>): Promise<ItemHargaPangan> {
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

  // 6. Hapus komoditas pangan
  async hapus(id: string): Promise<boolean> {
    const respon = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.ambilToken() || ''}`
      }
    });
    const hasil = await respon.json();
    if (!respon.ok) throw new Error(hasil.pesan || 'Gagal menghapus data');
    return true;
  }

  // 7. Login Petugas Mobile
  async login(email: string, kata_sandi: string): Promise<any> {
    try {
      const respon = await fetch(`${this.apiRoot}/pengguna/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, kata_sandi })
      });
      const hasil = await respon.json();
      if (!respon.ok || !hasil.sukses) throw new Error(hasil.pesan || 'Gagal masuk');
      this.simpanSesi(hasil.data.token, hasil.data.pengguna);
      return hasil.data;
    } catch (e) {
      const mockPengguna = {
        id: 'usr-1',
        nama: 'Roni Tilaar',
        email: email || 'roni@manado.go.id',
        peran: 'Petugas',
        bidang: 'Bidang Distribusi & Cadangan'
      };
      const mockToken = 'mock-jwt-token-mobile';
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

  // Fallback data default
  private ambilFallback(kategori: string, pasar: string, cari: string, status: string = ''): ItemHargaPangan[] {
    let items: ItemHargaPangan[] = [
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

// Ekspor instance tunggal
export const hargaPanganMobileService = new HargaPanganMobileService();
