// Modul Klien Supabase - Akses Basis Data Cloud SIPATOKAAN
// Dinas Pangan Kota Manado (Aplikasi Seluler)
// Mengelola integrasi langsung dengan basis data Cloud Supabase REST API

import { SUPABASE_CONFIG } from './ServerConfig';

export interface SupabaseResponse<T = any> {
  sukses: boolean;
  data: T | null;
  pesan?: string;
}

export class SupabaseRestClient {
  private baseUrl = `${SUPABASE_CONFIG.url}/rest/v1`;
  private apikey = SUPABASE_CONFIG.anonKey;

  private getHeaders(): Record<string, string> {
    return {
      'apikey': this.apikey,
      'Authorization': `Bearer ${this.apikey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // Request generic dengan AbortController timeout 4 detik
  async request<T = any>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
      signal: controller.signal
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(body);
    }

    try {
      const url = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
      const res = await fetch(url, options);
      clearTimeout(timeout);

      if (!res.ok) {
        let errDetail = `Status ${res.status}`;
        try {
          const errJson = await res.json();
          errDetail = errJson.message || errJson.error || errDetail;
        } catch (_) {}
        throw new Error(`Supabase Error: ${errDetail}`);
      }

      if (res.status === 204) return [] as unknown as T;
      const data = await res.json();
      return data as T;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // --- HARGA PANGAN ---
  async getHargaPangan(): Promise<any[]> {
    return this.request<any[]>('harga_pangan?order=dibuat_pada.desc');
  }

  async tambahHargaPangan(item: any): Promise<any> {
    const payload = {
      nama_komoditas: item.nama_komoditas,
      kategori: item.kategori || 'Bahan Pokok',
      satuan: item.satuan || 'kg',
      harga: Number(item.harga) || 0,
      nama_pasar: item.nama_pasar,
      tanggal_penetapan: item.tanggal_penetapan || '14 Oktober 2026',
      status: item.status || 'Terbit',
      catatan_perubahan: item.catatan_perubahan || '',
      bidang: item.bidang || 'Bidang Cadangan dan Distribusi Pangan'
    };
    const res = await this.request<any[]>('harga_pangan', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updateHargaPangan(id: string, data: any): Promise<any> {
    const payload: any = {};
    if (data.nama_komoditas !== undefined) payload.nama_komoditas = data.nama_komoditas;
    if (data.kategori !== undefined) payload.kategori = data.kategori;
    if (data.satuan !== undefined) payload.satuan = data.satuan;
    if (data.harga !== undefined) payload.harga = Number(data.harga);
    if (data.nama_pasar !== undefined) payload.nama_pasar = data.nama_pasar;
    if (data.tanggal_penetapan !== undefined) payload.tanggal_penetapan = data.tanggal_penetapan;
    if (data.status !== undefined) payload.status = data.status;
    if (data.catatan_perubahan !== undefined) payload.catatan_perubahan = data.catatan_perubahan;

    const res = await this.request<any[]>(`harga_pangan?id=eq.${encodeURIComponent(id)}`, 'PATCH', payload);
    if (Array.isArray(res)) {
      return res.length > 0 ? res[0] : null;
    }
    return res;
  }

  async hapusHargaPangan(id: string): Promise<boolean> {
    await this.request(`harga_pangan?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  // --- ACARA GPM ---
  async getAcaraGPM(): Promise<any[]> {
    return this.request<any[]>('acara_gpm?order=tanggal.asc');
  }

  async tambahAcaraGPM(item: any): Promise<any> {
    const payload = {
      nama_acara: item.nama_acara,
      lokasi: item.lokasi,
      kecamatan: item.kecamatan || 'Wenang',
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      jam_mulai: item.jam_mulai || '08:00',
      jam_selesai: item.jam_selesai || '14:00',
      latitude: Number(item.latitude) || 1.4883,
      longitude: Number(item.longitude) || 124.8436,
      kuota_maksimal: Number(item.kuota_maksimal) || 250,
      komoditas_tersedia: item.komoditas_tersedia || '',
      deskripsi: item.deskripsi || '',
      status: item.status || 'Aktif'
    };
    const res = await this.request<any[]>('acara_gpm', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updateAcaraGPM(id: string, data: any): Promise<any> {
    const res = await this.request<any[]>(`acara_gpm?id=eq.${encodeURIComponent(id)}`, 'PATCH', data);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusAcaraGPM(id: string): Promise<boolean> {
    await this.request(`acara_gpm?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  // --- PENDAFTAR GPM ---
  async getPendaftarGPM(acaraId?: string): Promise<any[]> {
    const endpoint = acaraId 
      ? `pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&order=nomor_antrean.asc`
      : 'pendaftar_gpm?order=waktu_mendaftar.desc';
    return this.request<any[]>(endpoint);
  }

  // [UU PDP FIX] Hitung pendaftar untuk publik hanya menarik acara_id (TIDAK ADA NIK, NAMA, atau HP)
  async getHitungPendaftarGPM(): Promise<any[]> {
    try {
      const res = await this.request<any[]>('pendaftar_gpm?select=acara_id');
      return Array.isArray(res) ? res : [];
    } catch (_) {
      return [];
    }
  }

  async daftarAntreanGPM(data: any): Promise<any> {
    const payload: any = {
      acara_id: data.acara_id,
      nama_pendaftar: data.nama_pendaftar,
      nomor_telepon: data.nomor_telepon,
      nomor_antrean: Number(data.nomor_antrean) || 1,
      kode_barcode: data.kode_barcode,
      status_kehadiran: data.status_kehadiran || 'Menunggu'
    };
    if (data.nik) payload.nik = data.nik;
    if (data.jalur_pendaftaran) payload.jalur_pendaftaran = data.jalur_pendaftaran;
    const res = await this.request<any[]>('pendaftar_gpm', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async cariPendaftarByBarcode(kodeBarcode: string): Promise<any | null> {
    const res = await this.request<any[]>(`pendaftar_gpm?kode_barcode=eq.${encodeURIComponent(kodeBarcode)}&limit=1`);
    return Array.isArray(res) && res.length > 0 ? res[0] : null;
  }

  async verifikasiPendaftarGPM(kodeBarcode: string, status: string = 'Hadir'): Promise<any> {
    const payload = {
      status_kehadiran: status,
      waktu_kehadiran: new Date().toISOString()
    };
    const res = await this.request<any[]>(`pendaftar_gpm?kode_barcode=eq.${encodeURIComponent(kodeBarcode)}`, 'PATCH', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusPendaftarGPM(id: string): Promise<boolean> {
    await this.request(`pendaftar_gpm?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  // [UU PDP & PRIVACY FIX] Hanya cek NIK tunggal tanpa menarik data pendaftar lain
  async cekNikTerdaftar(acaraId: string, nik: string): Promise<boolean> {
    try {
      const res = await this.request<any[]>(`pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&nik=eq.${encodeURIComponent(nik)}&select=id&limit=1`);
      return Array.isArray(res) && res.length > 0;
    } catch (_) {
      return false;
    }
  }

  // [UU PDP & PRIVACY FIX] Hanya mengambil nomor antrean terbesar saat ini tanpa menarik data warga
  async getNomorAntreanTerakhir(acaraId: string): Promise<number> {
    try {
      const res = await this.request<any[]>(`pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&select=nomor_antrean&order=nomor_antrean.desc&limit=1`);
      if (Array.isArray(res) && res.length > 0 && res[0].nomor_antrean) {
        return Number(res[0].nomor_antrean);
      }
    } catch (_) {}
    return 0;
  }

  // Fungsi Kriptografi SHA-256 untuk Keamanan Kata Sandi
  async hitungHashSandi(kataSandi: string): Promise<string> {
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

  // --- PENGGUNA ---
  async getPengguna(): Promise<any[]> {
    return this.request<any[]>('pengguna?select=id,nama,username,email,peran,bidang,foto_profil,dibuat_pada&order=nama.asc');
  }

  async tambahPengguna(item: any): Promise<any> {
    const hash = item.kata_sandi ? await this.hitungHashSandi(item.kata_sandi) : 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481';
    const payload = {
      nama: item.nama ? item.nama.trim() : '',
      username: item.username ? item.username.trim().toLowerCase() : '',
      email: item.email || `${(item.username || '').trim().toLowerCase()}@manado.go.id`,
      kata_sandi: hash,
      peran: item.peran || 'Staf',
      bidang: item.bidang || 'Dinas Pangan Kota Manado',
      foto_profil: item.foto_profil || ''
    };
    const res = await this.request<any[]>('pengguna', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updatePengguna(id: string, data: any, fallbackUsername?: string): Promise<any> {
    const payload: any = {};
    if (data.nama !== undefined) payload.nama = data.nama;
    if (data.username !== undefined) payload.username = data.username.toLowerCase().trim();
    if (data.email !== undefined) payload.email = data.email;
    if (data.peran !== undefined) payload.peran = data.peran;
    if (data.bidang !== undefined) payload.bidang = data.bidang;
    if (data.foto_profil !== undefined) payload.foto_profil = data.foto_profil;
    if (data.kata_sandi !== undefined) {
      payload.kata_sandi = await this.hitungHashSandi(data.kata_sandi);
    }

    let filter = `id=eq.${encodeURIComponent(id)}`;
    if (fallbackUsername) {
      filter = `or=(id.eq.${encodeURIComponent(id)},username.eq.${encodeURIComponent(fallbackUsername)})`;
    }
    const res = await this.request<any[]>(`pengguna?${filter}`, 'PATCH', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async ubahPasswordPengguna(id: string, kataSandiBaru: string, fallbackUsername?: string): Promise<any> {
    const hash = await this.hitungHashSandi(kataSandiBaru);
    let filter = `id=eq.${encodeURIComponent(id)}`;
    if (fallbackUsername) {
      filter = `or=(id.eq.${encodeURIComponent(id)},username.eq.${encodeURIComponent(fallbackUsername)})`;
    }
    const res = await this.request<any[]>(`pengguna?${filter}`, 'PATCH', { kata_sandi: hash });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusPengguna(id: string, fallbackUsername?: string): Promise<boolean> {
    let filter = `id=eq.${encodeURIComponent(id)}`;
    if (fallbackUsername) {
      filter = `or=(id.eq.${encodeURIComponent(id)},username.eq.${encodeURIComponent(fallbackUsername)})`;
    }
    await this.request(`pengguna?${filter}`, 'DELETE');
    return true;
  }

  // --- LOGIN PENGGUNA (via RPC aman — CEK-08 FIX) ---
  async loginPengguna(identifier: string, kata_sandi: string): Promise<any | null> {
    // [CEK-08 FIX] Gunakan RPC server-side — anon tidak perlu SELECT langsung dari tabel pengguna.
    // Hash dihitung di client lalu dikirim ke RPC; RPC mencocokkan di server dan hanya
    // mengembalikan data user TANPA kolom kata_sandi jika cocok.
    const idClean = identifier.toLowerCase().trim();
    const hashInput = await this.hitungHashSandi(kata_sandi);

    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/rpc_login_pengguna`, {
      method: 'POST',
      headers: {
        'apikey': this.apikey,
        'Authorization': `Bearer ${this.apikey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_identifier: idClean,
        p_hash_sandi: hashInput
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Login error: ${res.status}`);
    }

    const data = await res.json();
    // RPC mengembalikan array; kosong = sandi salah/user tidak ada
    if (!data || data.length === 0) return null;
    // kata_sandi TIDAK ADA dalam respons (RPC tidak return kolom itu)
    return data[0];
  }
}

export const supabaseClient = new SupabaseRestClient();

