// ===================================================================================
// MODUL LAYANAN HARGA PANGAN - APLIKASI SELULER (OOP - TYPESCRIPT)
// Dinas Pangan Kota Manado
// Fungsi: Mengelola komunikasi data harga pangan murni ke Cloud Supabase
//         (0% data dummy, 0% mock-login darurat, 0% tanggal palsu).
// ===================================================================================

import { getApiRoot, onServerUrlChanged } from './ServerConfig';
import { supabaseClient } from './SupabaseClient';
import { penggunaMobileService } from './PenggunaService';
import { jadwalGPMMobileService } from './JadwalGPMService';

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
  prioritas_tampil?: number;
  jumlah_dilihat?: number;
  catatan_perubahan?: string;
  dibuat_pada?: string;
  diperbarui_pada?: string;
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
    this.apiRoot = getApiRoot();
    this.baseUrl = `${this.apiRoot}/harga-pangan`;

    onServerUrlChanged((baruApi) => {
      this.apiRoot = baruApi;
      this.baseUrl = `${baruApi}/harga-pangan`;
    });
  }

  private formatTanggalHariIni(): string {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  normalisasiSatuan(satuan?: string): string {
    if (!satuan) return '1 KG';
    let s = String(satuan).replace(/[\/]+/g, '').trim();
    if (!s) return '1 KG';
    if (/^kg$|^kilogram$/i.test(s)) return '1 KG';
    if (/^gram$|^gr$|^g$/i.test(s)) return '1 Gram';
    const match = s.match(/^(\d+)\s*(kg|kilogram|gram|gr|g)$/i);
    if (match) {
      const angka = match[1];
      const unit = /^(gram|gr|g)$/i.test(match[2].trim()) ? 'Gram' : 'KG';
      return `${angka} ${unit}`;
    }
    return s;
  }

  private saringDaftar(
    daftar: ItemHargaPangan[],
    kategori: string = 'Semua',
    pasar: string = 'Semua',
    cari: string = '',
    status: string = ''
  ): ItemHargaPangan[] {
    let hasil: ItemHargaPangan[] = Array.isArray(daftar) ? [...daftar] : [];
    if (status) {
      hasil = hasil.filter(i => (i.status || 'Terbit').toLowerCase() === status.toLowerCase());
    }
    if (kategori && kategori !== 'Semua') {
      hasil = hasil.filter(i => (i.kategori || '').toLowerCase() === kategori.toLowerCase());
    }
    if (pasar && pasar !== 'Semua') {
      hasil = hasil.filter(i => (i.nama_pasar || '').toLowerCase() === pasar.toLowerCase());
    }
    if (cari && cari.trim() !== '') {
      const c = cari.toLowerCase().trim();
      hasil = hasil.filter(i => (i.nama_komoditas || '').toLowerCase().includes(c));
    }
    return hasil;
  }

  // 1. Mengambil semua data komoditas pangan murni dari Supabase Cloud (0% data dummy)
  async ambilSemua(kategori: string = 'Semua', pasar: string = 'Semua', cari: string = '', status: string = ''): Promise<ItemHargaPangan[]> {
    try {
      const supabaseData = await supabaseClient.getHargaPangan();
      if (Array.isArray(supabaseData)) {
        const cleaned: ItemHargaPangan[] = supabaseData.map((i: any) => ({
          ...i,
          satuan: this.normalisasiSatuan(i.satuan)
        }));
        try {
          localStorage.setItem('sipatokaan_custom_items', JSON.stringify(cleaned));
        } catch (_) {}
        return this.saringDaftar(cleaned, kategori, pasar, cari, status);
      }
    } catch (err) {
      console.warn('Supabase getHargaPangan gagal, mencoba backend LAN jika aktif:', err);
    }

    // Fallback ke backend LAN (bukan data dummy) jika dikonfigurasi pengguna
    try {
      const params = new URLSearchParams();
      if (kategori && kategori !== 'Semua') params.append('kategori', kategori);
      if (pasar && pasar !== 'Semua') params.append('pasar', pasar);
      if (cari && cari.trim() !== '') params.append('cari', cari.trim());
      if (status) params.append('status', status);

      const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const respon = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (respon.ok) {
        const hasil = await respon.json();
        if (Array.isArray(hasil.data)) {
          return hasil.data.map((i: any) => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
        }
      }
    } catch (_) {}

    return [];
  }

  // 1b. Mengambil data harga pangan TERBIT khusus portal publik mobile (100% DATA RIIL DB)
  async ambilPublikTerbit(): Promise<ItemHargaPangan[]> {
    try {
      const supabaseData = await supabaseClient.getHargaPangan();
      if (Array.isArray(supabaseData)) {
        return supabaseData
          .filter((i: any) => (i.status || '').toLowerCase() === 'terbit')
          .map((i: any) => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
      }
    } catch (errCloud: any) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const respon = await fetch(`${this.baseUrl}?status=Terbit`, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (respon.ok) {
          const hasil = await respon.json();
          const list = Array.isArray(hasil.data) ? hasil.data : [];
          return list
            .filter((i: any) => (i.status || '').toLowerCase() === 'terbit')
            .map((i: any) => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
        }
      } catch (_) {}
      throw new Error(errCloud?.message || 'Tidak dapat terhubung ke basis data harga pangan.');
    }
    return [];
  }

  // 2. Mengambil statistik jumlah komoditas per kategori dari data riil Supabase
  async ambilStatistik(): Promise<StatistikKategori> {
    const list = (await this.ambilSemua()).filter(i => (i.status || '').toLowerCase() === 'terbit');
    return {
      Semua: list.length,
      'Bahan Pokok': list.filter(i => i.kategori === 'Bahan Pokok').length,
      Hewani: list.filter(i => i.kategori === 'Hewani').length,
      Sayuran: list.filter(i => i.kategori === 'Sayuran').length,
      Buah: list.filter(i => i.kategori === 'Buah').length,
      Lainnya: list.filter(i => !['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah'].includes(i.kategori)).length
    };
  }

  // 2b. Mengambil statistik dashboard petugas dari data riil Supabase + status waktu WITA
  async ambilStatistikDashboard(): Promise<StatistikDashboardMobile> {
    const list = await this.ambilSemua();
    let acaraList: any[] = [];
    try {
      const res = await supabaseClient.getAcaraGPM();
      if (Array.isArray(res)) acaraList = res;
    } catch (_) {
      acaraList = [];
    }

    const terbit = list.filter(i => (i.status || '').toLowerCase() === 'terbit').length;
    const draft = list.filter(i => (i.status || '').toLowerCase() === 'draft').length;
    let gpmTerjadwal = 0;
    let gpmSelesai = 0;

    acaraList.forEach(a => {
      const st = jadwalGPMMobileService.hitungStatusOperasional(a);
      if (st.sudahBerakhir) {
        gpmSelesai += 1;
      } else {
        gpmTerjadwal += 1;
      }
    });

    return {
      harga_ditetapkan: terbit,
      draft_harga: draft,
      gpm_terjadwal: gpmTerjadwal,
      gpm_selesai: gpmSelesai
    };
  }

  async verifikasiHarga(id: string, statusBaru: 'Terbit' | 'Draft'): Promise<ItemHargaPangan> {
    return this.perbarui(id, { status: statusBaru });
  }

  // 4. Tambah data komoditas pangan baru langsung ke Supabase Cloud (tanpa fallback dummy lokal)
  async tambah(dataBaru: ItemHargaPangan): Promise<ItemHargaPangan> {
    const payload: ItemHargaPangan = {
      ...dataBaru,
      satuan: this.normalisasiSatuan(dataBaru.satuan),
      tanggal_penetapan: dataBaru.tanggal_penetapan || this.formatTanggalHariIni(),
      status: dataBaru.status || 'Draft'
    };

    const itemMasuk = await supabaseClient.tambahHargaPangan(payload);
    if (!itemMasuk || !itemMasuk.id) {
      throw new Error('Gagal menyimpan data komoditas ke basis data Supabase.');
    }
    return { ...itemMasuk, satuan: this.normalisasiSatuan(itemMasuk.satuan) };
  }

  // 5. Update data komoditas pangan langsung ke Supabase Cloud
  async perbarui(id: string, dataUpdate: Partial<ItemHargaPangan>): Promise<ItemHargaPangan> {
    const payload: Partial<ItemHargaPangan> = { ...dataUpdate };
    if (payload.satuan) {
      payload.satuan = this.normalisasiSatuan(payload.satuan);
    }

    const itemUpdate = await supabaseClient.updateHargaPangan(id, payload);
    if (!itemUpdate) {
      throw new Error('Gagal memperbarui data harga pangan di basis data Supabase.');
    }
    return { ...itemUpdate, satuan: this.normalisasiSatuan(itemUpdate.satuan) };
  }

  // 6. Hapus komoditas pangan langsung dari Supabase Cloud
  async hapus(id: string): Promise<boolean> {
    await supabaseClient.hapusHargaPangan(id);
    return true;
  }

  // 7. Login Petugas Mobile — didelegasikan 100% ke PenggunaMobileService (Supabase RPC murni, TANPA mock-login!)
  async login(emailOrUsername: string, kata_sandi: string, ingatSaya: boolean = false): Promise<any> {
    return penggunaMobileService.login(emailOrUsername, kata_sandi, ingatSaya);
  }

  simpanSesi(token: string, user: any, ingatSaya: boolean = false) {
    penggunaMobileService.simpanSesi(token, user, ingatSaya);
  }

  ambilUser(): any {
    return penggunaMobileService.ambilUserSesi();
  }

  ambilToken(): string | null {
    return penggunaMobileService.ambilToken();
  }

  keluar() {
    penggunaMobileService.logout();
  }
}

// Ekspor instance tunggal
export const hargaPanganMobileService = new HargaPanganMobileService();
