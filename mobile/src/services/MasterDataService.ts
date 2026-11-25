// ===================================================================================
// Modul Layanan Master Data Resmi - Aplikasi Seluler (OOP - Admin & Superadmin)
// Fungsi: Mengelola daftar Master Satuan (terkunci per 1 unit seperti 1 KG, 1 Liter,
//         1 Baki), Master Pasar, dan Master Kecamatan langsung ke basis data Supabase
//         agar tersinkron penuh dengan formulir Staf/Kabid di Mobile & Website.
// ===================================================================================

import { supabaseClient } from './SupabaseClient';

export class MasterDataMobileService {
  private readonly kunciCacheSatuan = 'sipatokaan_master_satuan';
  private readonly kunciCachePasar = 'sipatokaan_master_pasar';
  private readonly kunciCacheKecamatan = 'sipatokaan_master_kecamatan';

  private readonly satuanDasar = ['1 KG', '1 Liter', '1 Baki', '1 Ikat', '1 Ekor', '1 Bungkus'];
  private readonly pasarDasar = [
    'Pasar Bersehati Karombasan',
    'Pasar Tradisional Bahu',
    'Pasar Tradisional Tuminting',
    'Pasar Bersehati Sario'
  ];
  private readonly kecamatanDasar = [
    'Wenang', 'Tikala', 'Wanea', 'Sario', 'Malalayang',
    'Tuminting', 'Singkil', 'Mapanget', 'Paal Dua', 'Bunaken', 'Bunaken Kepulauan'
  ];

  // Mengunci format satuan selalu per 1 unit (misal "kg" -> "1 KG", "liter" -> "1 Liter", "baki" -> "1 Baki")
  formatSatuanPerSatu(input: string): string {
    let teks = String(input || '').replace(/[\/]+/g, '').trim();
    if (!teks) throw new Error('Nama satuan tidak boleh kosong!');

    const cocokAngka = teks.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (cocokAngka) {
      const angka = parseFloat(cocokAngka[1].replace(',', '.'));
      if (angka !== 1) {
        throw new Error('Satuan dikunci per 1 unit saja! Cukup ketik nama satuannya (contoh: KG, Liter, Baki, Ikat, Ekor).');
      }
      teks = (cocokAngka[2] || '').trim();
    }

    if (!teks) throw new Error('Nama satuan wajib diisi (contoh: KG, Liter, Baki, Ikat).');
    if (/^(gram|gr|g|ml|mililiter)$/i.test(teks)) {
      throw new Error('Gunakan satuan standar per 1 utuh (contoh: KG atau Liter), bukan pecahan gram/ml.');
    }

    if (/^(kg|kilogram)$/i.test(teks)) return '1 KG';
    if (/^(l|ltr|liter)$/i.test(teks)) return '1 Liter';

    const kapital = teks.charAt(0).toUpperCase() + teks.slice(1).toLowerCase();
    return `1 ${kapital}`;
  }

  // 1. MASTER SATUAN (TERKUNCI PER 1)
  async ambilDaftarSatuan(): Promise<string[]> {
    try {
      const rows = await supabaseClient.getMasterSatuan();
      if (Array.isArray(rows) && rows.length > 0) {
        const list = rows.map((r: any) => r.nama_satuan).filter(Boolean);
        localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(list));
        return list;
      }
    } catch (err: any) {
      console.warn('Tabel master_satuan belum dimigrasi / offline:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCacheSatuan);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [...this.satuanDasar];
  }

  async tambahSatuan(inputSatuan: string): Promise<string[]> {
    const satuanResmi = this.formatSatuanPerSatu(inputSatuan);
    const daftarSekarang = await this.ambilDaftarSatuan();

    if (daftarSekarang.some((s) => s.toLowerCase() === satuanResmi.toLowerCase())) {
      throw new Error(`Satuan "${satuanResmi}" sudah terdaftar di Master Satuan.`);
    }

    try {
      await supabaseClient.tambahMasterSatuan(satuanResmi);
    } catch (err: any) {
      console.warn('Gagal simpan master_satuan ke Supabase:', err?.message);
    }

    const terbaru = [...daftarSekarang, satuanResmi];
    localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(terbaru));
    return terbaru;
  }

  async hapusSatuan(namaSatuan: string): Promise<string[]> {
    const daftarSekarang = await this.ambilDaftarSatuan();
    if (daftarSekarang.length <= 1) {
      throw new Error('Minimal harus tersisa 1 Master Satuan aktif.');
    }

    try {
      await supabaseClient.hapusMasterSatuan(namaSatuan);
    } catch (err: any) {
      console.warn('Gagal hapus master_satuan di Supabase:', err?.message);
    }

    const terbaru = daftarSekarang.filter((s) => s !== namaSatuan);
    localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(terbaru));
    return terbaru;
  }

  // 2. MASTER PASAR (SINKRON SUPABASE)
  async ambilDaftarPasar(): Promise<string[]> {
    try {
      const rows = await supabaseClient.getMasterPasar();
      if (Array.isArray(rows) && rows.length > 0) {
        const list = rows.map((r: any) => r.nama_pasar).filter(Boolean);
        localStorage.setItem(this.kunciCachePasar, JSON.stringify(list));
        return list;
      }
    } catch (err: any) {
      console.warn('Tabel master_pasar belum dimigrasi / offline:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCachePasar);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [...this.pasarDasar];
  }

  async tambahPasar(namaPasar: string): Promise<string[]> {
    const bersih = String(namaPasar || '').trim();
    if (!bersih) throw new Error('Nama pasar tidak boleh kosong.');
    const daftarSekarang = await this.ambilDaftarPasar();

    if (daftarSekarang.some((p) => p.toLowerCase() === bersih.toLowerCase())) {
      throw new Error(`Pasar "${bersih}" sudah terdaftar.`);
    }

    try {
      await supabaseClient.tambahMasterPasar(bersih);
    } catch (err: any) {
      console.warn('Gagal simpan master_pasar ke Supabase:', err?.message);
    }

    const terbaru = [...daftarSekarang, bersih].sort((a, b) => a.localeCompare(b, 'id-ID'));
    localStorage.setItem(this.kunciCachePasar, JSON.stringify(terbaru));
    return terbaru;
  }

  async hapusPasar(namaPasar: string): Promise<string[]> {
    const daftarSekarang = await this.ambilDaftarPasar();
    if (daftarSekarang.length <= 1) {
      throw new Error('Minimal harus tersisa 1 pasar terdaftar.');
    }

    try {
      await supabaseClient.hapusMasterPasar(namaPasar);
    } catch (err: any) {
      console.warn('Gagal hapus master_pasar di Supabase:', err?.message);
    }

    const terbaru = daftarSekarang.filter((p) => p !== namaPasar);
    localStorage.setItem(this.kunciCachePasar, JSON.stringify(terbaru));
    return terbaru;
  }

  // 3. MASTER KECAMATAN (SINKRON SUPABASE)
  async ambilDaftarKecamatan(): Promise<string[]> {
    try {
      const rows = await supabaseClient.getMasterKecamatan();
      if (Array.isArray(rows) && rows.length > 0) {
        const list = rows.map((r: any) => r.nama_kecamatan).filter(Boolean);
        localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(list));
        return list;
      }
    } catch (err: any) {
      console.warn('Tabel master_kecamatan belum dimigrasi / offline:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCacheKecamatan);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [...this.kecamatanDasar];
  }

  async tambahKecamatan(namaKecamatan: string): Promise<string[]> {
    const bersih = String(namaKecamatan || '').trim();
    if (!bersih) throw new Error('Nama kecamatan tidak boleh kosong.');
    const daftarSekarang = await this.ambilDaftarKecamatan();

    if (daftarSekarang.some((k) => k.toLowerCase() === bersih.toLowerCase())) {
      throw new Error(`Kecamatan "${bersih}" sudah ada di sistem.`);
    }

    try {
      await supabaseClient.tambahMasterKecamatan(bersih);
    } catch (err: any) {
      console.warn('Gagal simpan master_kecamatan ke Supabase:', err?.message);
    }

    const terbaru = [...daftarSekarang, bersih].sort((a, b) => a.localeCompare(b, 'id-ID'));
    localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(terbaru));
    return terbaru;
  }

  async hapusKecamatan(namaKecamatan: string): Promise<string[]> {
    const daftarSekarang = await this.ambilDaftarKecamatan();
    if (daftarSekarang.length <= 1) {
      throw new Error('Minimal harus tersisa 1 kecamatan terdaftar.');
    }

    try {
      await supabaseClient.hapusMasterKecamatan(namaKecamatan);
    } catch (err: any) {
      console.warn('Gagal hapus master_kecamatan di Supabase:', err?.message);
    }

    const terbaru = daftarSekarang.filter((k) => k !== namaKecamatan);
    localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(terbaru));
    return terbaru;
  }
}

export const masterDataMobileService = new MasterDataMobileService();
