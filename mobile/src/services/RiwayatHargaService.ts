// ===================================================================================
// Modul Layanan Riwayat Harga Pangan - Aplikasi Seluler (OOP)
// Fungsi: Mengambil riwayat perubahan harga resmi dari tabel 'riwayat_harga_pangan'
//         di Supabase / Backend berdasarkan komoditas, pasar, dan rentang waktu
//         (7/30/90/Semua hari) serta menghitung metrik tren riil tanpa data dummy.
// ===================================================================================

import { getApiRoot } from './ServerConfig';
import { supabaseClient } from './SupabaseClient';

export interface CatatanRiwayatHarga {
  id?: string;
  harga_pangan_id?: string;
  nama_komoditas: string;
  kategori?: string;
  nama_pasar: string;
  satuan: string;
  harga_lama: number | null;
  harga_baru: number;
  selisih: number;
  keterangan?: string;
  dicatat_pada: string;
}

export interface RingkasanTrenRiwayat {
  jumlahCatatan: number;
  adaPerubahan: boolean;
  hargaAwal: number;
  hargaAkhir: number;
  hargaTertinggi: number;
  hargaTerendah: number;
  selisihTotal: number;
  persentase: number;
  statusTren: 'Naik' | 'Turun' | 'Stabil';
}

export interface HasilRiwayatKomoditas {
  belumMigrasi: boolean;
  riwayatKronologis: CatatanRiwayatHarga[];
  riwayatTerbaru: CatatanRiwayatHarga[];
  ringkasan: RingkasanTrenRiwayat;
}

export class RiwayatHargaMobileService {
  private apakahBelumMigrasi(err: any): boolean {
    const msg = String(err?.message || '').toLowerCase();
    return (
      msg.includes('riwayat_harga_pangan') ||
      msg.includes('404') ||
      msg.includes('pgrst205') ||
      msg.includes('does not exist') ||
      msg.includes('could not find the table')
    );
  }

  async ambilRiwayatKomoditas(
    namaKomoditas: string,
    opsi: { pasarTerpilih?: string[]; rentangHari?: number } = {}
  ): Promise<HasilRiwayatKomoditas> {
    const { pasarTerpilih = [], rentangHari = 30 } = opsi;
    let dataMentah: CatatanRiwayatHarga[] = [];
    let belumMigrasi = false;

    try {
      const res = await supabaseClient.getRiwayatHarga({
        namaKomoditas,
        rentangHari,
        batas: 500
      });
      dataMentah = Array.isArray(res) ? res : [];
    } catch (err) {
      if (this.apakahBelumMigrasi(err)) {
        belumMigrasi = true;
      } else {
        try {
          const params = new URLSearchParams({
            komoditas: namaKomoditas,
            hari: String(rentangHari)
          });
          if (pasarTerpilih.length > 0) params.append('pasar', pasarTerpilih.join(','));
          const respon = await fetch(`${getApiRoot()}/harga-pangan/riwayat?${params.toString()}`);
          if (respon.ok) {
            const json = await respon.json();
            dataMentah = Array.isArray(json.data) ? json.data : [];
          } else {
            throw err;
          }
        } catch (_) {
          throw err;
        }
      }
    }

    const setPasar = new Set((pasarTerpilih || []).map((p) => p.toLowerCase().trim()));
    const riwayatTersaring = dataMentah.filter((row) => {
      if (setPasar.size === 0) return true;
      return setPasar.has((row.nama_pasar || '').toLowerCase().trim());
    });

    const kronologis = [...riwayatTersaring].sort(
      (a, b) => new Date(a.dicatat_pada || 0).getTime() - new Date(b.dicatat_pada || 0).getTime()
    );

    return {
      belumMigrasi,
      riwayatKronologis: kronologis,
      riwayatTerbaru: [...kronologis].reverse(),
      ringkasan: this.hitungRingkasanTren(kronologis)
    };
  }

  async ambilRiwayatPublikTerbaru(batas: number = 400): Promise<{ belumMigrasi: boolean; data: CatatanRiwayatHarga[] }> {
    try {
      const res = await supabaseClient.getRiwayatHargaTerbaru(batas);
      return {
        belumMigrasi: false,
        data: Array.isArray(res) ? res : []
      };
    } catch (err) {
      if (this.apakahBelumMigrasi(err)) {
        return { belumMigrasi: true, data: [] };
      }
      return { belumMigrasi: false, data: [] };
    }
  }

  hitungRingkasanTren(riwayatKronologis: CatatanRiwayatHarga[] = []): RingkasanTrenRiwayat {
    if (!Array.isArray(riwayatKronologis) || riwayatKronologis.length === 0) {
      return {
        jumlahCatatan: 0,
        adaPerubahan: false,
        hargaAwal: 0,
        hargaAkhir: 0,
        hargaTertinggi: 0,
        hargaTerendah: 0,
        selisihTotal: 0,
        persentase: 0,
        statusTren: 'Stabil'
      };
    }

    const daftarHarga = riwayatKronologis.map((r) => Number(r.harga_baru) || 0);
    const hargaAwal = daftarHarga[0];
    const hargaAkhir = daftarHarga[daftarHarga.length - 1];
    const hargaTertinggi = Math.max(...daftarHarga);
    const hargaTerendah = Math.min(...daftarHarga);
    const selisihTotal = hargaAkhir - hargaAwal;
    const persentase = hargaAwal > 0 ? Number(((selisihTotal / hargaAwal) * 100).toFixed(1)) : 0;

    let statusTren: 'Naik' | 'Turun' | 'Stabil' = 'Stabil';
    if (selisihTotal > 0) statusTren = 'Naik';
    else if (selisihTotal < 0) statusTren = 'Turun';

    const adaPerubahan = riwayatKronologis.length > 1 && (hargaTertinggi !== hargaTerendah || selisihTotal !== 0);

    return {
      jumlahCatatan: riwayatKronologis.length,
      adaPerubahan,
      hargaAwal,
      hargaAkhir,
      hargaTertinggi,
      hargaTerendah,
      selisihTotal,
      persentase: Math.abs(persentase),
      statusTren
    };
  }

  async catatLihatKomoditas(namaKomoditas: string): Promise<boolean> {
    return supabaseClient.tambahJumlahDilihat(namaKomoditas);
  }
}

export const riwayatHargaMobileService = new RiwayatHargaMobileService();
