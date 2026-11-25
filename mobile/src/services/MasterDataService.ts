// ===================================================================================
// Modul Layanan Master Data Resmi - Aplikasi Seluler (OOP - Admin & Superadmin)
// Fungsi: Mengelola daftar Master Satuan (terkunci per 1 unit seperti 1 KG, 1 Liter,
//         1 Baki), Master Komoditas Terstruktur (Induk, Varian & Sinonim Pencarian),
//         Master Pasar, dan Master Kecamatan 100% langsung ke basis data Supabase
//         tanpa array data dummy hardcoded dan tanpa silent error.
// ===================================================================================

import { supabaseClient } from './SupabaseClient';

export interface ItemMasterKomoditas {
  id?: string;
  kelompok_komoditas: string;
  nama_komoditas: string;
  kategori: string;
  satuan_bawaan: string;
  kata_kunci: string;
  prioritas_tampil: number;
}

export interface ItemMasterPasar {
  id: string;
  nama_pasar: string;
  alamat: string;
  kecamatan: string;
  latitude: number | null;
  longitude: number | null;
  punyaKoordinat: boolean;
  dibuat_pada?: string | null;
  diperbarui_pada?: string | null;
}

export interface GrupMasterKomoditasDropdown {
  kelompok: string;
  prioritas: number;
  items: ItemMasterKomoditas[];
}

export class MasterDataMobileService {
  private readonly kunciCacheSatuan = 'sipatokaan_master_satuan';
  private readonly kunciCachePasar = 'sipatokaan_master_pasar';
  private readonly kunciCacheKecamatan = 'sipatokaan_master_kecamatan';
  private readonly kunciCacheKomoditas = 'sipatokaan_master_komoditas';

  tebakKelompokKomoditas(namaKomoditas?: string): string {
    const teks = String(namaKomoditas || '').trim();
    const rendah = teks.toLowerCase();
    if (!rendah) return 'Lainnya';
    if (rendah.includes('beras')) return 'Beras';
    if (rendah.includes('minyak')) return 'Minyak Goreng';
    if (rendah.includes('gula')) return 'Gula';
    if (rendah.includes('cabai') || rendah.includes('rica') || rendah.includes('lombok')) return 'Cabai';
    if (rendah.includes('bawang')) return 'Bawang';
    if (rendah.includes('telur')) return 'Telur';
    if (rendah.includes('daging') || rendah.includes('ayam') || rendah.includes('sapi')) return 'Daging';
    if (rendah.includes('ikan') || rendah.includes('tongkol') || rendah.includes('cakalang') || rendah.includes('tuna') || rendah.includes('deho')) return 'Ikan';
    if (rendah.includes('tepung') || rendah.includes('terigu')) return 'Tepung';
    const kataPertama = teks.split(/\s+/)[0] || 'Lainnya';
    return kataPertama.charAt(0).toUpperCase() + kataPertama.slice(1).toLowerCase();
  }

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

  // 1. MASTER SATUAN (TERKUNCI PER 1, 100% SUPABASE)
  async ambilDaftarSatuan(): Promise<string[]> {
    try {
      const rows = await supabaseClient.getMasterSatuan();
      if (Array.isArray(rows)) {
        const list = rows.map((r: any) => r.nama_satuan).filter(Boolean);
        try { localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(list)); } catch (_) {}
        return list;
      }
    } catch (err: any) {
      console.warn('Gagal mengambil master_satuan dari Supabase:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCacheSatuan);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
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
      throw new Error(String(err?.message || 'Gagal menyimpan satuan ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarSatuan();
  }

  async hapusSatuan(namaSatuan: string): Promise<string[]> {
    const daftarSekarang = await this.ambilDaftarSatuan();
    if (daftarSekarang.length <= 1) {
      throw new Error('Minimal harus tersisa 1 Master Satuan aktif.');
    }

    try {
      await supabaseClient.hapusMasterSatuan(namaSatuan);
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal menghapus satuan dari basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarSatuan();
  }

  // 2. MASTER PASAR (LENGKAP + TITIK PETA, 100% SUPABASE)
  normalisasiItemPasar(row: any): ItemMasterPasar {
    const lat = row?.latitude !== null && row?.latitude !== undefined && row?.latitude !== ''
      ? Number(row.latitude)
      : null;
    const lng = row?.longitude !== null && row?.longitude !== undefined && row?.longitude !== ''
      ? Number(row.longitude)
      : null;
    const punyaKoordinat =
      lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0);

    return {
      id: row?.id ? String(row.id) : '',
      nama_pasar: String(row?.nama_pasar || '').trim(),
      alamat: String(row?.alamat || '').trim(),
      kecamatan: String(row?.kecamatan || '').trim(),
      latitude: punyaKoordinat ? lat : null,
      longitude: punyaKoordinat ? lng : null,
      punyaKoordinat,
      dibuat_pada: row?.dibuat_pada || null,
      diperbarui_pada: row?.diperbarui_pada || null
    };
  }

  async ambilDaftarPasarLengkap(): Promise<ItemMasterPasar[]> {
    const rows = await supabaseClient.getMasterPasar();
    if (!Array.isArray(rows)) {
      throw new Error('Respon daftar pasar dari basis data tidak valid.');
    }
    const daftarLengkap: ItemMasterPasar[] = rows
      .filter((r: any) => r?.nama_pasar)
      .map((r: any) => this.normalisasiItemPasar(r))
      .sort((a, b) => a.nama_pasar.localeCompare(b.nama_pasar, 'id-ID'));

    try {
      localStorage.setItem(
        this.kunciCachePasar,
        JSON.stringify(daftarLengkap.map((p) => p.nama_pasar))
      );
    } catch (_) {}

    return daftarLengkap;
  }

  async ambilDaftarPasar(): Promise<string[]> {
    try {
      const daftarLengkap = await this.ambilDaftarPasarLengkap();
      return daftarLengkap.map((p) => p.nama_pasar);
    } catch (err: any) {
      console.warn('Gagal mengambil master_pasar dari Supabase:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCachePasar);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  async tambahPasar(inputPasar: string | {
    nama_pasar: string;
    alamat?: string;
    kecamatan?: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<ItemMasterPasar[]> {
    const payload = typeof inputPasar === 'string'
      ? { nama_pasar: inputPasar.trim(), alamat: '', kecamatan: '', latitude: null, longitude: null }
      : {
          nama_pasar: String(inputPasar?.nama_pasar || '').trim(),
          alamat: String(inputPasar?.alamat || '').trim(),
          kecamatan: String(inputPasar?.kecamatan || '').trim(),
          latitude:
            inputPasar?.latitude !== null && inputPasar?.latitude !== undefined && (inputPasar.latitude as any) !== ''
              ? Number(inputPasar.latitude)
              : null,
          longitude:
            inputPasar?.longitude !== null && inputPasar?.longitude !== undefined && (inputPasar.longitude as any) !== ''
              ? Number(inputPasar.longitude)
              : null
        };

    if (!payload.nama_pasar) throw new Error('Nama pasar wajib diisi.');

    const daftarSekarang = await this.ambilDaftarPasarLengkap();
    if (daftarSekarang.some((p) => p.nama_pasar.toLowerCase() === payload.nama_pasar.toLowerCase())) {
      throw new Error(`Pasar "${payload.nama_pasar}" sudah terdaftar.`);
    }

    try {
      await supabaseClient.tambahMasterPasar(payload);
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal menyimpan pasar ke Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarPasarLengkap();
  }

  async perbaruiPasar(
    idAtauNamaLama: string,
    inputPasar: {
      nama_pasar: string;
      alamat?: string;
      kecamatan?: string;
      latitude?: number | null;
      longitude?: number | null;
    },
    namaLamaAsli = ''
  ): Promise<ItemMasterPasar[]> {
    const payload = {
      nama_pasar: String(inputPasar?.nama_pasar || '').trim(),
      alamat: String(inputPasar?.alamat || '').trim(),
      kecamatan: String(inputPasar?.kecamatan || '').trim(),
      latitude:
        inputPasar?.latitude !== null && inputPasar?.latitude !== undefined && (inputPasar.latitude as any) !== ''
          ? Number(inputPasar.latitude)
          : null,
      longitude:
        inputPasar?.longitude !== null && inputPasar?.longitude !== undefined && (inputPasar.longitude as any) !== ''
          ? Number(inputPasar.longitude)
          : null
    };

    if (!payload.nama_pasar) throw new Error('Nama pasar wajib diisi.');

    const daftarSekarang = await this.ambilDaftarPasarLengkap();
    const bentrok = daftarSekarang.find(
      (p) =>
        p.nama_pasar.toLowerCase() === payload.nama_pasar.toLowerCase() &&
        String(p.id) !== String(idAtauNamaLama) &&
        p.nama_pasar.toLowerCase() !== String(namaLamaAsli || idAtauNamaLama).toLowerCase()
    );
    if (bentrok) {
      throw new Error(`Nama pasar "${payload.nama_pasar}" sudah digunakan oleh pasar lain.`);
    }

    try {
      await supabaseClient.updateMasterPasar(idAtauNamaLama, payload);
      if (namaLamaAsli && namaLamaAsli !== payload.nama_pasar) {
        await supabaseClient.sinkronNamaPasarDiHarga(namaLamaAsli, payload.nama_pasar);
      }
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal memperbarui pasar di Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarPasarLengkap();
  }

  async hapusPasar(idAtauNama: string): Promise<ItemMasterPasar[]> {
    try {
      await supabaseClient.hapusMasterPasar(idAtauNama);
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal menghapus pasar di Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }
    return this.ambilDaftarPasarLengkap();
  }

  // 3. MASTER KECAMATAN (100% SUPABASE)
  async ambilDaftarKecamatan(): Promise<string[]> {
    try {
      const rows = await supabaseClient.getMasterKecamatan();
      if (Array.isArray(rows)) {
        const list = rows.map((r: any) => r.nama_kecamatan).filter(Boolean);
        try { localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(list)); } catch (_) {}
        return list;
      }
    } catch (err: any) {
      console.warn('Gagal mengambil master_kecamatan dari Supabase:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCacheKecamatan);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
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
      throw new Error(String(err?.message || 'Gagal menyimpan kecamatan ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarKecamatan();
  }

  async hapusKecamatan(namaKecamatan: string): Promise<string[]> {
    const daftarSekarang = await this.ambilDaftarKecamatan();
    if (daftarSekarang.length <= 1) {
      throw new Error('Minimal harus tersisa 1 kecamatan terdaftar.');
    }

    try {
      await supabaseClient.hapusMasterKecamatan(namaKecamatan);
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal menghapus kecamatan di basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarKecamatan();
  }

  // 4. MASTER KOMODITAS RESMI (INDUK, VARIAN & SINONIM PENCARIAN — 100% SUPABASE)
  urutkanKomoditas(daftar: ItemMasterKomoditas[] = []): ItemMasterKomoditas[] {
    return [...daftar].sort((a, b) => {
      const pA = Number(a?.prioritas_tampil) || 50;
      const pB = Number(b?.prioritas_tampil) || 50;
      if (pA !== pB) return pA - pB;
      const kelCmp = String(a?.kelompok_komoditas || '').localeCompare(String(b?.kelompok_komoditas || ''), 'id-ID');
      if (kelCmp !== 0) return kelCmp;
      return String(a?.nama_komoditas || '').localeCompare(String(b?.nama_komoditas || ''), 'id-ID');
    });
  }

  async ambilDaftarKomoditas(): Promise<ItemMasterKomoditas[]> {
    try {
      const rows = await supabaseClient.getMasterKomoditas();
      if (Array.isArray(rows)) {
        const rapi: ItemMasterKomoditas[] = this.urutkanKomoditas(
          rows
            .filter((r: any) => r?.nama_komoditas)
            .map((r: any) => ({
              id: r.id,
              kelompok_komoditas: (r.kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(r.nama_komoditas),
              nama_komoditas: String(r.nama_komoditas).trim(),
              kategori: r.kategori || 'Bahan Pokok',
              satuan_bawaan: r.satuan_bawaan || '1 KG',
              kata_kunci: r.kata_kunci || '',
              prioritas_tampil: Number(r.prioritas_tampil) || 50
            }))
        );
        try { localStorage.setItem(this.kunciCacheKomoditas, JSON.stringify(rapi)); } catch (_) {}
        return rapi;
      }
    } catch (err: any) {
      console.warn('Gagal mengambil master_komoditas dari Supabase:', err?.message);
    }

    try {
      const cache = localStorage.getItem(this.kunciCacheKomoditas);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) return this.urutkanKomoditas(parsed);
      }
    } catch (_) {}
    return [];
  }

  async tambahKomoditas(input: Partial<ItemMasterKomoditas>): Promise<ItemMasterKomoditas[]> {
    const namaBersih = String(input?.nama_komoditas || '').trim();
    if (!namaBersih) throw new Error('Nama varian komoditas wajib diisi (contoh: Beras Medium, Beras Premium).');

    const kelompokBersih = String(input?.kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(namaBersih);
    const satuanResmi = this.formatSatuanPerSatu(input?.satuan_bawaan || '1 KG');
    const daftarSekarang = await this.ambilDaftarKomoditas();

    if (daftarSekarang.some((k) => k.nama_komoditas.toLowerCase() === namaBersih.toLowerCase())) {
      throw new Error(`Komoditas "${namaBersih}" sudah terdaftar di Master Komoditas.`);
    }

    const itemBaru: ItemMasterKomoditas = {
      kelompok_komoditas: kelompokBersih,
      nama_komoditas: namaBersih,
      kategori: input?.kategori || 'Bahan Pokok',
      satuan_bawaan: satuanResmi,
      kata_kunci: String(input?.kata_kunci || '').trim(),
      prioritas_tampil: Number(input?.prioritas_tampil) || 50
    };

    try {
      await supabaseClient.tambahMasterKomoditas(itemBaru);
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal menyimpan komoditas ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarKomoditas();
  }

  async hapusKomoditas(namaKomoditas: string): Promise<ItemMasterKomoditas[]> {
    const daftarSekarang = await this.ambilDaftarKomoditas();
    if (daftarSekarang.length <= 1) {
      throw new Error('Minimal harus tersisa 1 Master Komoditas aktif.');
    }

    try {
      await supabaseClient.hapusMasterKomoditas(namaKomoditas);
    } catch (err: any) {
      throw new Error(String(err?.message || 'Gagal menghapus komoditas dari basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
    }

    return this.ambilDaftarKomoditas();
  }

  kelompokkanKomoditasUntukDropdown(daftarKomoditas: ItemMasterKomoditas[] = []): GrupMasterKomoditasDropdown[] {
    const peta = new Map<string, GrupMasterKomoditasDropdown>();
    (Array.isArray(daftarKomoditas) ? daftarKomoditas : []).forEach((item) => {
      const kel = (item?.kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(item?.nama_komoditas);
      if (!peta.has(kel)) {
        peta.set(kel, {
          kelompok: kel,
          prioritas: Number(item?.prioritas_tampil) || 50,
          items: []
        });
      }
      const grup = peta.get(kel)!;
      grup.items.push(item);
      grup.prioritas = Math.min(grup.prioritas, Number(item?.prioritas_tampil) || 50);
    });

    return Array.from(peta.values())
      .sort((a, b) => {
        if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
        return a.kelompok.localeCompare(b.kelompok, 'id-ID');
      })
      .map((g) => ({
        ...g,
        items: this.urutkanKomoditas(g.items)
      }));
  }
}

export const masterDataMobileService = new MasterDataMobileService();
