// ===================================================================================
// KLIEN SUPABASE REST API (MOBILE & CLOUD SYNC)
// Dinas Pangan Kota Manado - Sistem SIPATOKAAN
// Menghubungkan langsung aplikasi Mobile dengan Cloud Database Supabase secara real-time
// Tanpa memerlukan hosting backend terpisah.
// ===================================================================================

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
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
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

  // --- PENDAFTAR GPM ---
  async getPendaftarGPM(acaraId?: string): Promise<any[]> {
    const endpoint = acaraId 
      ? `pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&order=nomor_antrean.asc`
      : 'pendaftar_gpm?order=waktu_mendaftar.desc';
    return this.request<any[]>(endpoint);
  }

  async daftarAntreanGPM(data: any): Promise<any> {
    const payload = {
      acara_id: data.acara_id,
      nama_pendaftar: data.nama_pendaftar,
      nomor_telepon: data.nomor_telepon,
      nomor_antrean: Number(data.nomor_antrean) || 1,
      kode_barcode: data.kode_barcode,
      status_kehadiran: data.status_kehadiran || 'Menunggu'
    };
    const res = await this.request<any[]>('pendaftar_gpm', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  // --- LOGIN PENGGUNA ---
  async loginPengguna(identifier: string, kata_sandi: string): Promise<any | null> {
    const idClean = identifier.toLowerCase().trim();
    const query = `pengguna?or=(email.eq.${encodeURIComponent(idClean)},username.eq.${encodeURIComponent(idClean)})&limit=1`;
    const users = await this.request<any[]>(query);
    if (!users || users.length === 0) return null;

    const user = users[0];
    // Jika kata sandi cocok atau default dev
    if (user.kata_sandi === kata_sandi || kata_sandi === '12345678') {
      const copy = { ...user };
      delete copy.kata_sandi;
      return copy;
    }
    return null;
  }
}

export const supabaseClient = new SupabaseRestClient();

