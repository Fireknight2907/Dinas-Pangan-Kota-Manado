// ===================================================================================
// Modul Layanan Pengajuan Harga Pangan Per Pasar (OOP - Mobile / TypeScript)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Mengelola alur Master-Detail Pengajuan Harga (Hybrid: Tambah Satuan ke
//         Keranjang Daftar Harga Pangan + Muat Cepat Harga Pasar), simpan Draft,
//         ajukan ke Kepala Bidang (Timpa Cerdas anti-duplikat), serta verifikasi
//         persetujuan/penolakan dengan UPSERT cerdas ke harga_pangan.
// ===================================================================================

import { supabaseClient } from './SupabaseClient';
import { hargaPanganMobileService, ItemHargaPangan } from './HargaPanganService';
import { ItemMasterKomoditas } from './MasterDataService';

export interface BarisInputCepatPasar {
  tempId: string;
  komoditas_id: string | null;
  nama_komoditas: string;
  kelompok_komoditas: string;
  kategori: string;
  satuan: string;
  prioritas_tampil: number;
  harga_lama: number | null;
  status_aktif?: string | null;
  tanggal_terakhir: string;
  harga_usulan: string;
  sedang_diajukan?: boolean;
  harga_diajukan?: number | null;
  dipilih?: boolean;
}

export interface ItemPengajuanHarga {
  id: string;
  pengajuan_id: string;
  komoditas_id: string | null;
  nama_komoditas: string;
  kategori: string;
  satuan: string;
  harga_lama: number | null;
  harga: number;
  prioritas_tampil: number;
}

export interface DokumenPengajuanHarga {
  id: string;
  pasar_id: string | null;
  nama_pasar: string;
  tanggal_pengambilan: string;
  tanggal_tampil: string;
  petugas_id: string | null;
  nama_petugas: string;
  status: 'Draft' | 'Diajukan' | 'Diverifikasi' | 'Ditolak' | string;
  status_label?: string;
  catatan_verifikasi: string;
  dibuat_pada: string | null;
  diperbarui_pada: string | null;
  items: ItemPengajuanHarga[];
}

export interface ParameterSimpanPengajuan {
  namaPasar: string;
  pasarId?: string | null;
  tanggalPengambilan: string;
  petugasId?: string | null;
  namaPetugas?: string;
  items: any[];
  daftarHargaAktif?: ItemHargaPangan[];
  daftarPengajuanAktif?: DokumenPengajuanHarga[] | null;
  statusTarget?: 'Draft' | 'Diajukan';
  pengajuanIdDiedit?: string | null;
}

export class PengajuanHargaMobileService {
  private apakahTabelBelumMigrasi(err: any): boolean {
    const msg = String(err?.message || '').toLowerCase();
    return (
      msg.includes('pgrst205') ||
      msg.includes('42p01') ||
      msg.includes('does not exist') ||
      msg.includes('could not find the table') ||
      msg.includes('relation "pengajuan_harga"') ||
      msg.includes('relation "public.pengajuan_harga"') ||
      msg.includes('status 404')
    );
  }

  private validasiUuidAtauNull(nilai?: string | null): string | null {
    const teks = String(nilai || '').trim();
    if (!teks) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teks) ? teks : null;
  }

  formatTanggalID(isoDate?: string | null): string {
    if (!isoDate) {
      return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const bersih = String(isoDate).split('T')[0];
    const d = new Date(`${bersih}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(isoDate);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatLabelStatus(status?: string | null): string {
    const s = String(status || 'Diajukan').trim().toLowerCase();
    if (s === 'diverifikasi') return 'Disetujui';
    if (s === 'draft') return 'Draft';
    if (s === 'ditolak') return 'Ditolak';
    return 'Diajukan';
  }

  kunciPasangan(namaKomoditas?: string, namaPasar?: string): string {
    return `${String(namaKomoditas || '').trim().toLowerCase()}__${String(namaPasar || '').trim().toLowerCase()}`;
  }

  ambilDaftarJenisKomoditas(
    daftarMasterKomoditas: ItemMasterKomoditas[] = [],
    daftarHargaAktif: ItemHargaPangan[] = []
  ): string[] {
    const setKat = new Set<string>(['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah', 'Lainnya']);
    (Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas : []).forEach((k) => {
      const kat = String(k?.kategori || '').trim();
      if (kat) setKat.add(kat);
    });
    (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
      const kat = String(h?.kategori || '').trim();
      if (kat) setKat.add(kat);
    });
    return Array.from(setKat);
  }

  cariHargaTerbitPasar(
    namaPasar: string,
    namaKomoditas: string,
    daftarHargaAktif: ItemHargaPangan[] = []
  ): ItemHargaPangan | null {
    const pasarKey = String(namaPasar || '').trim().toLowerCase();
    const komKey = String(namaKomoditas || '').trim().toLowerCase();
    if (!pasarKey || !komKey) return null;
    const kandidat = (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).filter(
      (h) =>
        String(h?.nama_pasar || '').trim().toLowerCase() === pasarKey &&
        String(h?.nama_komoditas || '').trim().toLowerCase() === komKey
    );
    if (kandidat.length === 0) return null;
    return kandidat.find((h) => String(h.status || '').toLowerCase() === 'terbit') || kandidat[0];
  }

  cariPengajuanAktifPasar(
    daftarPengajuan: DokumenPengajuanHarga[] = [],
    namaPasar: string = '',
    tanggalPengambilan: string = '',
    statusTarget: string = 'Diajukan'
  ): DokumenPengajuanHarga | null {
    const pasarKey = String(namaPasar || '').trim().toLowerCase();
    const tglKey = String(tanggalPengambilan || '').split('T')[0].trim();
    const statusKey = String(statusTarget || 'Diajukan').trim().toLowerCase();
    if (!pasarKey || !tglKey) return null;
    return (
      (Array.isArray(daftarPengajuan) ? daftarPengajuan : []).find(
        (p) =>
          String(p?.status || '').toLowerCase() === statusKey &&
          String(p?.nama_pasar || '').trim().toLowerCase() === pasarKey &&
          String(p?.tanggal_pengambilan || '').split('T')[0].trim() === tglKey
      ) || null
    );
  }

  bangunDaftarInputCepatPasar(
    namaPasar: string,
    daftarMasterKomoditas: ItemMasterKomoditas[] = [],
    daftarHargaAktif: ItemHargaPangan[] = [],
    pengajuanAktif: DokumenPengajuanHarga | null = null
  ): BarisInputCepatPasar[] {
    const pasarBersih = String(namaPasar || '').trim();
    if (!pasarBersih) return [];

    const petaHargaAktif = new Map<string, ItemHargaPangan>();
    (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
      if ((h.nama_pasar || '').trim().toLowerCase() !== pasarBersih.toLowerCase()) return;
      const k = (h.nama_komoditas || '').trim().toLowerCase();
      const sudah = petaHargaAktif.get(k);
      if (!sudah || (String(h.status || '').toLowerCase() === 'terbit' && String(sudah.status || '').toLowerCase() !== 'terbit')) {
        petaHargaAktif.set(k, h);
      }
    });

    const petaDiajukan = new Map<string, ItemPengajuanHarga>();
    if (pengajuanAktif && Array.isArray(pengajuanAktif.items)) {
      pengajuanAktif.items.forEach((it) => {
        const k = String(it?.nama_komoditas || '').trim().toLowerCase();
        if (k) petaDiajukan.set(k, it);
      });
    }

    const hasil: BarisInputCepatPasar[] = [];
    const kunciSudah = new Set<string>();

    (Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas : []).forEach((master) => {
      const namaKom = String(master.nama_komoditas || '').trim();
      if (!namaKom) return;
      const k = namaKom.toLowerCase();
      kunciSudah.add(k);
      const aktif = petaHargaAktif.get(k) || null;
      const diajukan = petaDiajukan.get(k) || null;
      const hargaLama = aktif ? Math.round(Number(aktif.harga) || 0) : null;
      const hargaAwalUsulan = diajukan
        ? String(Math.round(Number(diajukan.harga) || 0))
        : (hargaLama !== null ? String(hargaLama) : '');

      hasil.push({
        tempId: `row-${k}`,
        komoditas_id: master.id || null,
        nama_komoditas: namaKom,
        kelompok_komoditas: master.kelompok_komoditas || '',
        kategori: master.kategori || aktif?.kategori || diajukan?.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(master.satuan_bawaan || aktif?.satuan || diajukan?.satuan || '1 KG'),
        prioritas_tampil: Number(master.prioritas_tampil) || 50,
        harga_lama: hargaLama,
        status_aktif: aktif?.status || null,
        tanggal_terakhir: aktif?.tanggal_penetapan || '-',
        harga_usulan: hargaAwalUsulan,
        sedang_diajukan: Boolean(diajukan),
        harga_diajukan: diajukan ? Math.round(Number(diajukan.harga) || 0) : null,
        dipilih: Boolean(diajukan)
      });
    });

    petaHargaAktif.forEach((aktif, k) => {
      if (kunciSudah.has(k)) return;
      kunciSudah.add(k);
      const diajukan = petaDiajukan.get(k) || null;
      const hargaLama = Math.round(Number(aktif.harga) || 0);
      hasil.push({
        tempId: `row-${k}`,
        komoditas_id: null,
        nama_komoditas: aktif.nama_komoditas,
        kelompok_komoditas: '',
        kategori: aktif.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(aktif.satuan || '1 KG'),
        prioritas_tampil: Number(aktif.prioritas_tampil) || 50,
        harga_lama: hargaLama,
        status_aktif: aktif.status || null,
        tanggal_terakhir: aktif.tanggal_penetapan || '-',
        harga_usulan: diajukan ? String(Math.round(Number(diajukan.harga) || 0)) : String(hargaLama),
        sedang_diajukan: Boolean(diajukan),
        harga_diajukan: diajukan ? Math.round(Number(diajukan.harga) || 0) : null,
        dipilih: Boolean(diajukan)
      });
    });

    petaDiajukan.forEach((diajukan, k) => {
      if (kunciSudah.has(k)) return;
      kunciSudah.add(k);
      hasil.push({
        tempId: `row-${k}`,
        komoditas_id: diajukan.komoditas_id || null,
        nama_komoditas: diajukan.nama_komoditas,
        kelompok_komoditas: '',
        kategori: diajukan.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(diajukan.satuan || '1 KG'),
        prioritas_tampil: Number(diajukan.prioritas_tampil) || 50,
        harga_lama: null,
        status_aktif: null,
        tanggal_terakhir: '-',
        harga_usulan: String(Math.round(Number(diajukan.harga) || 0)),
        sedang_diajukan: true,
        harga_diajukan: Math.round(Number(diajukan.harga) || 0),
        dipilih: true
      });
    });

    return hasil;
  }

  bangunKeranjangDariDokumen(
    pengajuan: DokumenPengajuanHarga | null,
    daftarHargaAktif: ItemHargaPangan[] = []
  ): BarisInputCepatPasar[] {
    if (!pengajuan || !Array.isArray(pengajuan.items)) return [];
    const pasar = pengajuan.nama_pasar || '';
    return pengajuan.items.map((it, idx) => {
      const hargaTerbit = this.cariHargaTerbitPasar(pasar, it.nama_komoditas, daftarHargaAktif);
      const hargaLama = hargaTerbit
        ? Math.round(Number(hargaTerbit.harga) || 0)
        : (it.harga_lama !== null && it.harga_lama !== undefined ? Math.round(Number(it.harga_lama) || 0) : null);
      const namaBersih = String(it.nama_komoditas || '').trim();
      return {
        tempId: `cart-${namaBersih.toLowerCase()}-${idx}`,
        komoditas_id: it.komoditas_id || null,
        nama_komoditas: namaBersih,
        kelompok_komoditas: '',
        kategori: it.kategori || hargaTerbit?.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(it.satuan || hargaTerbit?.satuan || '1 KG'),
        prioritas_tampil: Number(it.prioritas_tampil) || 50,
        harga_lama: hargaLama,
        tanggal_terakhir: hargaTerbit?.tanggal_penetapan || '-',
        harga_usulan: String(Math.round(Number(it.harga) || 0)),
        sedang_diajukan: pengajuan.status === 'Diajukan'
      };
    });
  }

  async ambilSemuaPengajuan(): Promise<{ belumMigrasi: boolean; data: DokumenPengajuanHarga[] }> {
    try {
      const rows = await supabaseClient.getPengajuanHarga();
      if (!Array.isArray(rows)) return { belumMigrasi: false, data: [] };

      const rapi: DokumenPengajuanHarga[] = rows.map((p: any) => {
        const items = Array.isArray(p.item_pengajuan_harga) ? p.item_pengajuan_harga : [];
        return {
          id: String(p.id),
          pasar_id: p.pasar_id || null,
          nama_pasar: p.nama_pasar || '-',
          tanggal_pengambilan: p.tanggal_pengambilan ? String(p.tanggal_pengambilan).split('T')[0] : '',
          tanggal_tampil: this.formatTanggalID(p.tanggal_pengambilan),
          petugas_id: p.petugas_id || null,
          nama_petugas: p.nama_petugas || 'Petugas Lapangan',
          status: p.status || 'Diajukan',
          status_label: this.formatLabelStatus(p.status || 'Diajukan'),
          catatan_verifikasi: p.catatan_verifikasi || '',
          dibuat_pada: p.dibuat_pada || null,
          diperbarui_pada: p.diperbarui_pada || null,
          items: items.map((it: any) => ({
            id: String(it.id),
            pengajuan_id: String(it.pengajuan_id || p.id),
            komoditas_id: it.komoditas_id || null,
            nama_komoditas: it.nama_komoditas,
            kategori: it.kategori || 'Bahan Pokok',
            satuan: hargaPanganMobileService.normalisasiSatuan(it.satuan || '1 KG'),
            harga_lama: it.harga_lama !== null && it.harga_lama !== undefined ? Number(it.harga_lama) : null,
            harga: Number(it.harga) || 0,
            prioritas_tampil: Number(it.prioritas_tampil) || 50
          }))
        };
      });

      return { belumMigrasi: false, data: rapi };
    } catch (err) {
      if (this.apakahTabelBelumMigrasi(err)) {
        return { belumMigrasi: true, data: [] };
      }
      return { belumMigrasi: false, data: [] };
    }
  }

  private async gantiItemPengajuanAman(
    targetHeaderId: string,
    itemValid: any[],
    itemLamaBackup: ItemPengajuanHarga[] = []
  ): Promise<void> {
    await supabaseClient.hapusItemPengajuanByPengajuanId(targetHeaderId);

    const detailPayload = itemValid.map((it) => ({
      pengajuan_id: targetHeaderId,
      komoditas_id: this.validasiUuidAtauNull(it.komoditas_id),
      nama_komoditas: it.nama_komoditas,
      kategori: it.kategori,
      satuan: it.satuan,
      harga: it.harga,
      harga_lama: it.harga_lama
    }));

    try {
      await supabaseClient.tambahItemPengajuanHargaBatch(detailPayload);
    } catch (errDetail: any) {
      const msg = String(errDetail?.message || '').toLowerCase();
      if (msg.includes('harga_lama')) {
        const tanpaHargaLama = detailPayload.map(({ harga_lama, ...rest }) => rest);
        await supabaseClient.tambahItemPengajuanHargaBatch(tanpaHargaLama);
      } else {
        if (Array.isArray(itemLamaBackup) && itemLamaBackup.length > 0) {
          const restore = itemLamaBackup.map((old) => ({
            pengajuan_id: targetHeaderId,
            komoditas_id: old.komoditas_id || null,
            nama_komoditas: old.nama_komoditas,
            kategori: old.kategori,
            satuan: old.satuan,
            harga: old.harga
          }));
          await supabaseClient.tambahItemPengajuanHargaBatch(restore).catch(() => {});
        }
        throw errDetail;
      }
    }
  }

  async simpanPengajuanHarga(params: ParameterSimpanPengajuan): Promise<{
    mode: string;
    status: 'Draft' | 'Diajukan';
    ditimpa: boolean;
    id: string | null;
    jumlahItem: number;
    namaPasar: string;
    tanggalTampil: string;
  }> {
    const pasarBersih = String(params.namaPasar || '').trim();
    if (!pasarBersih) throw new Error('Pasar wajib dipilih terlebih dahulu!');
    if (!params.tanggalPengambilan) throw new Error('Tanggal pengajuan harga wajib diisi!');

    const statusFinal: 'Draft' | 'Diajukan' =
      String(params.statusTarget || 'Diajukan').toLowerCase() === 'draft' ? 'Draft' : 'Diajukan';

    const itemValid = (Array.isArray(params.items) ? params.items : [])
      .map((r: any) => ({
        komoditas_id: r.komoditas_id || null,
        nama_komoditas: String(r.nama_komoditas || '').trim(),
        kategori: r.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(r.satuan || '1 KG'),
        harga: Math.round(Number(String(r.harga ?? r.harga_usulan ?? '').replace(/[^0-9]/g, '')) || 0),
        harga_lama: r.harga_lama !== null && r.harga_lama !== undefined ? Number(r.harga_lama) : null,
        prioritas_tampil: Number(r.prioritas_tampil) || 50
      }))
      .filter((r) => r.nama_komoditas && r.harga > 0);

    if (itemValid.length === 0) {
      throw new Error(
        statusFinal === 'Draft'
          ? 'Tambahkan minimal 1 komoditas (harga > 0) ke Daftar Harga Pangan sebelum menyimpan Draft!'
          : 'Tambahkan minimal 1 komoditas (harga > 0) ke Daftar Harga Pangan sebelum mengajukan ke Kepala Bidang!'
      );
    }

    try {
      let sumberPengajuan = Array.isArray(params.daftarPengajuanAktif) ? params.daftarPengajuanAktif : null;
      if (!sumberPengajuan) {
        const segar = await this.ambilSemuaPengajuan();
        if (segar.belumMigrasi) {
          throw new Error('pengajuan_harga PGRST205');
        }
        sumberPengajuan = segar.data;
      }

      const tglBersih = String(params.tanggalPengambilan || '').split('T')[0].trim();
      const paketDiedit = params.pengajuanIdDiedit
        ? sumberPengajuan.find((p) => String(p.id) === String(params.pengajuanIdDiedit))
        : null;
      // ISOLASI KETAT PER PASAR & TANGGAL: Jangan pernah menimpa dokumen milik pasar atau tanggal berbeda!
      const bolehTimpaDiedit =
        paketDiedit &&
        (paketDiedit.status === 'Draft' || paketDiedit.status === 'Diajukan') &&
        String(paketDiedit.nama_pasar || '').trim().toLowerCase() === pasarBersih.toLowerCase() &&
        String(paketDiedit.tanggal_pengambilan || '').split('T')[0].trim() === tglBersih;

      const paketSamaStatus = this.cariPengajuanAktifPasar(
        sumberPengajuan,
        pasarBersih,
        tglBersih,
        statusFinal
      );

      let targetPaket: DokumenPengajuanHarga | null = null;
      let draftDuplikatUntukDihapus: string | null = null;

      if (bolehTimpaDiedit && paketDiedit) {
        if (
          statusFinal === 'Diajukan' &&
          paketSamaStatus &&
          String(paketSamaStatus.id) !== String(paketDiedit.id)
        ) {
          targetPaket = paketSamaStatus;
          if (paketDiedit.status === 'Draft') {
            draftDuplikatUntukDihapus = paketDiedit.id;
          }
        } else {
          targetPaket = paketDiedit;
        }
      } else if (paketSamaStatus) {
        targetPaket = paketSamaStatus;
      }

      const pasarUuid = this.validasiUuidAtauNull(params.pasarId);
      const petugasUuid = this.validasiUuidAtauNull(params.petugasId);

      let targetHeaderId: string | null = null;
      let ditimpa = false;

      if (targetPaket && targetPaket.id) {
        targetHeaderId = targetPaket.id;
        ditimpa = true;

        await this.gantiItemPengajuanAman(targetHeaderId, itemValid, targetPaket.items || []);

        await supabaseClient.updatePengajuanHarga(targetHeaderId, {
          pasar_id: pasarUuid || this.validasiUuidAtauNull(targetPaket.pasar_id),
          nama_pasar: pasarBersih,
          tanggal_pengambilan: tglBersih,
          petugas_id: petugasUuid || this.validasiUuidAtauNull(targetPaket.petugas_id),
          nama_petugas: params.namaPetugas || targetPaket.nama_petugas || 'Petugas Lapangan',
          status: statusFinal,
          catatan_verifikasi: ''
        });

        if (draftDuplikatUntukDihapus) {
          await supabaseClient.hapusPengajuanHarga(draftDuplikatUntukDihapus).catch(() => {});
        }
      } else {
        const header = await supabaseClient.tambahPengajuanHarga({
          pasar_id: pasarUuid,
          nama_pasar: pasarBersih,
          tanggal_pengambilan: tglBersih,
          petugas_id: petugasUuid,
          nama_petugas: params.namaPetugas || 'Petugas Lapangan',
          status: statusFinal
        });

        if (!header || !header.id) {
          throw new Error('Gagal membuat dokumen pengajuan harga.');
        }
        targetHeaderId = String(header.id);

        const detailPayload = itemValid.map((it) => ({
          pengajuan_id: targetHeaderId,
          komoditas_id: this.validasiUuidAtauNull(it.komoditas_id),
          nama_komoditas: it.nama_komoditas,
          kategori: it.kategori,
          satuan: it.satuan,
          harga: it.harga,
          harga_lama: it.harga_lama
        }));

        try {
          await supabaseClient.tambahItemPengajuanHargaBatch(detailPayload);
        } catch (errDetail: any) {
          const msg = String(errDetail?.message || '').toLowerCase();
          if (msg.includes('harga_lama')) {
            const tanpaHargaLama = detailPayload.map(({ harga_lama, ...rest }) => rest);
            await supabaseClient.tambahItemPengajuanHargaBatch(tanpaHargaLama);
          } else {
            throw errDetail;
          }
        }
      }

      return {
        mode: 'pengajuan_batch',
        status: statusFinal,
        ditimpa,
        id: targetHeaderId,
        jumlahItem: itemValid.length,
        namaPasar: pasarBersih,
        tanggalTampil: this.formatTanggalID(params.tanggalPengambilan)
      };
    } catch (err: any) {
      if (!this.apakahTabelBelumMigrasi(err)) {
        throw new Error(String(err?.message || 'Gagal menyimpan pengajuan harga.').replace(/^Supabase Error:\s*/i, ''));
      }
    }

    // Fallback aman jika SQL migrasi_tingkat_3 belum dijalankan
    const tglFormatted = this.formatTanggalID(params.tanggalPengambilan);
    const existingDraftMap = new Map<string, ItemHargaPangan>();
    (Array.isArray(params.daftarHargaAktif) ? params.daftarHargaAktif : []).forEach((h) => {
      if (String(h.status || '').toLowerCase() === 'draft') {
        existingDraftMap.set(this.kunciPasangan(h.nama_komoditas, h.nama_pasar), h);
      }
    });

    for (const it of itemValid) {
      const kunci = this.kunciPasangan(it.nama_komoditas, pasarBersih);
      const draftAda = existingDraftMap.get(kunci);
      if (draftAda && draftAda.id) {
        await hargaPanganMobileService.perbarui(draftAda.id, {
          harga: it.harga,
          satuan: it.satuan,
          kategori: it.kategori,
          tanggal_penetapan: tglFormatted,
          prioritas_tampil: it.prioritas_tampil,
          status: 'Draft'
        });
      } else {
        await hargaPanganMobileService.tambah({
          nama_komoditas: it.nama_komoditas,
          kategori: it.kategori,
          satuan: it.satuan,
          harga: it.harga,
          nama_pasar: pasarBersih,
          tanggal_penetapan: tglFormatted,
          prioritas_tampil: it.prioritas_tampil,
          status: 'Draft'
        });
      }
    }

    return {
      mode: 'draft_harga_pangan',
      status: statusFinal,
      ditimpa: false,
      id: null,
      jumlahItem: itemValid.length,
      namaPasar: pasarBersih,
      tanggalTampil: tglFormatted
    };
  }

  async simpanDraftBatchHarga(params: ParameterSimpanPengajuan) {
    return this.simpanPengajuanHarga({ ...params, statusTarget: 'Draft' });
  }

  async ajukanBatchHarga(params: ParameterSimpanPengajuan) {
    return this.simpanPengajuanHarga({ ...params, statusTarget: 'Diajukan' });
  }

  async setujuiPengajuanBatch(
    pengajuan: DokumenPengajuanHarga,
    daftarHargaAktif: ItemHargaPangan[] = [],
    catatanVerifikasi: string = ''
  ): Promise<boolean> {
    if (!pengajuan || !pengajuan.id) {
      throw new Error('Dokumen pengajuan tidak valid.');
    }

    const tglFormatted = this.formatTanggalID(pengajuan.tanggal_pengambilan);
    const petaTerbit = new Map<string, ItemHargaPangan>();
    const petaDraft = new Map<string, ItemHargaPangan>();

    (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
      const k = this.kunciPasangan(h.nama_komoditas, h.nama_pasar);
      if (String(h.status || '').toLowerCase() === 'terbit') {
        petaTerbit.set(k, h);
      } else if (String(h.status || '').toLowerCase() === 'draft') {
        petaDraft.set(k, h);
      }
    });

    for (const it of pengajuan.items || []) {
      const kunci = this.kunciPasangan(it.nama_komoditas, pengajuan.nama_pasar);
      const barisTerbit = petaTerbit.get(kunci);
      const barisDraft = petaDraft.get(kunci);

      const payloadHarga: ItemHargaPangan = {
        nama_komoditas: it.nama_komoditas,
        kategori: it.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(it.satuan || '1 KG'),
        harga: Number(it.harga),
        nama_pasar: pengajuan.nama_pasar,
        tanggal_penetapan: tglFormatted,
        prioritas_tampil: Number(it.prioritas_tampil) || 50,
        catatan_perubahan: catatanVerifikasi || `Disetujui Kabid (${pengajuan.nama_petugas || 'Staf'})`,
        status: 'Terbit'
      };

      if (barisTerbit && barisTerbit.id) {
        await hargaPanganMobileService.perbarui(barisTerbit.id, payloadHarga);
        if (barisDraft && barisDraft.id && barisDraft.id !== barisTerbit.id) {
          await hargaPanganMobileService.hapus(barisDraft.id).catch(() => {});
        }
      } else if (barisDraft && barisDraft.id) {
        await hargaPanganMobileService.perbarui(barisDraft.id, payloadHarga);
      } else {
        await hargaPanganMobileService.tambah(payloadHarga);
      }
    }

    await supabaseClient.updatePengajuanHarga(pengajuan.id, {
      status: 'Diverifikasi',
      catatan_verifikasi: catatanVerifikasi || 'Disetujui dan diterbitkan ke masyarakat'
    });

    return true;
  }

  async setujuiDraftSatuanTanpaDuplikat(itemDraft: ItemHargaPangan, daftarHargaAktif: ItemHargaPangan[] = []): Promise<boolean> {
    if (!itemDraft.id) return false;
    const kunci = this.kunciPasangan(itemDraft.nama_komoditas, itemDraft.nama_pasar);
    const barisTerbitLain = (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).find(
      (h) =>
        String(h.id) !== String(itemDraft.id) &&
        String(h.status || '').toLowerCase() === 'terbit' &&
        this.kunciPasangan(h.nama_komoditas, h.nama_pasar) === kunci
    );

    if (barisTerbitLain && barisTerbitLain.id) {
      await hargaPanganMobileService.perbarui(barisTerbitLain.id, {
        harga: Number(itemDraft.harga),
        satuan: hargaPanganMobileService.normalisasiSatuan(itemDraft.satuan),
        kategori: itemDraft.kategori,
        tanggal_penetapan: itemDraft.tanggal_penetapan,
        prioritas_tampil: itemDraft.prioritas_tampil,
        status: 'Terbit'
      });
      await hargaPanganMobileService.hapus(itemDraft.id);
    } else {
      await hargaPanganMobileService.perbarui(itemDraft.id, { status: 'Terbit' });
    }
    return true;
  }

  async terbitkanLangsungOlehKabid(params: {
    namaPasar: string;
    pasarId?: string | null;
    tanggalPengambilan: string;
    petugasId?: string | null;
    namaPetugas?: string;
    items: any[];
    daftarHargaAktif?: ItemHargaPangan[];
  }): Promise<{ jumlahItem: number; namaPasar: string; tanggalTampil: string }> {
    const pasarBersih = String(params.namaPasar || '').trim();
    if (!pasarBersih) throw new Error('Pasar wajib dipilih terlebih dahulu!');
    if (!params.tanggalPengambilan) throw new Error('Tanggal penetapan harga wajib diisi!');

    const itemValid = (Array.isArray(params.items) ? params.items : [])
      .map((r: any) => ({
        komoditas_id: r.komoditas_id || null,
        nama_komoditas: String(r.nama_komoditas || '').trim(),
        kategori: r.kategori || 'Bahan Pokok',
        satuan: hargaPanganMobileService.normalisasiSatuan(r.satuan || '1 KG'),
        harga: Math.round(Number(String(r.harga ?? r.harga_usulan ?? '').replace(/[^0-9]/g, '')) || 0),
        harga_lama: r.harga_lama !== null && r.harga_lama !== undefined ? Number(r.harga_lama) : null,
        prioritas_tampil: Number(r.prioritas_tampil) || 50
      }))
      .filter((r) => r.nama_komoditas && r.harga > 0);

    if (itemValid.length === 0) {
      throw new Error('Tambahkan minimal 1 komoditas (harga > 0) ke daftar sebelum menerbitkan langsung!');
    }

    const tglBersih = String(params.tanggalPengambilan || '').split('T')[0].trim();
    const tglFormatted = this.formatTanggalID(tglBersih);

    const petaTerbit = new Map<string, ItemHargaPangan>();
    const petaDraft = new Map<string, ItemHargaPangan>();
    (Array.isArray(params.daftarHargaAktif) ? params.daftarHargaAktif : []).forEach((h) => {
      const k = this.kunciPasangan(h.nama_komoditas, h.nama_pasar);
      if (String(h.status || '').toLowerCase() === 'terbit') {
        petaTerbit.set(k, h);
      } else if (String(h.status || '').toLowerCase() === 'draft') {
        petaDraft.set(k, h);
      }
    });

    for (const it of itemValid) {
      const kunci = this.kunciPasangan(it.nama_komoditas, pasarBersih);
      const barisTerbit = petaTerbit.get(kunci);
      const barisDraft = petaDraft.get(kunci);

      const payloadHarga: ItemHargaPangan = {
        nama_komoditas: it.nama_komoditas,
        kategori: it.kategori,
        satuan: it.satuan,
        harga: it.harga,
        nama_pasar: pasarBersih,
        tanggal_penetapan: tglFormatted,
        prioritas_tampil: it.prioritas_tampil,
        catatan_perubahan: `Diterbitkan langsung oleh Kepala Bidang (${params.namaPetugas || 'Kabid'})`,
        status: 'Terbit'
      };

      if (barisTerbit && barisTerbit.id) {
        await hargaPanganMobileService.perbarui(barisTerbit.id, payloadHarga);
        if (barisDraft && barisDraft.id && barisDraft.id !== barisTerbit.id) {
          await hargaPanganMobileService.hapus(barisDraft.id).catch(() => {});
        }
      } else if (barisDraft && barisDraft.id) {
        await hargaPanganMobileService.perbarui(barisDraft.id, payloadHarga);
      } else {
        const baru = await hargaPanganMobileService.tambah(payloadHarga);
        if (baru) petaTerbit.set(kunci, baru);
      }
    }

    try {
      const header = await supabaseClient.tambahPengajuanHarga({
        pasar_id: this.validasiUuidAtauNull(params.pasarId),
        nama_pasar: pasarBersih,
        tanggal_pengambilan: tglBersih,
        petugas_id: this.validasiUuidAtauNull(params.petugasId),
        nama_petugas: `${params.namaPetugas || 'Kepala Bidang'} (Kabid)`,
        status: 'Diverifikasi',
        catatan_verifikasi: 'Input & publikasi langsung oleh Kepala Bidang'
      });
      if (header && header.id) {
        const detailPayload = itemValid.map((it) => ({
          pengajuan_id: header.id,
          komoditas_id: this.validasiUuidAtauNull(it.komoditas_id),
          nama_komoditas: it.nama_komoditas,
          kategori: it.kategori,
          satuan: it.satuan,
          harga: it.harga,
          harga_lama: it.harga_lama
        }));
        try {
          await supabaseClient.tambahItemPengajuanHargaBatch(detailPayload);
        } catch (errDetail: any) {
          if (String(errDetail?.message || '').toLowerCase().includes('harga_lama')) {
            const tanpaLama = detailPayload.map(({ harga_lama, ...rest }) => rest);
            await supabaseClient.tambahItemPengajuanHargaBatch(tanpaLama);
          }
        }
      }
    } catch (errAudit: any) {
      if (!this.apakahTabelBelumMigrasi(errAudit)) {
        console.warn('Gagal mencatat jejak audit terbit langsung Kabid mobile:', errAudit?.message);
      }
    }

    return {
      jumlahItem: itemValid.length,
      namaPasar: pasarBersih,
      tanggalTampil: tglFormatted
    };
  }

  async setujuiSemuaDraftSatuan(
    daftarDraftSatuan: ItemHargaPangan[] = [],
    daftarHargaAktif: ItemHargaPangan[] = []
  ): Promise<{ jumlahDraftDisetujui: number }> {
    const listDraft = Array.isArray(daftarDraftSatuan) ? daftarDraftSatuan : [];
    if (listDraft.length === 0) return { jumlahDraftDisetujui: 0 };

    const petaTerbit = new Map<string, ItemHargaPangan>();
    (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
      if (String(h.status || '').toLowerCase() === 'terbit') {
        petaTerbit.set(this.kunciPasangan(h.nama_komoditas, h.nama_pasar), h);
      }
    });

    let jumlahDraftDisetujui = 0;
    for (const itemDraft of listDraft) {
      if (!itemDraft || !itemDraft.id) continue;
      const kunci = this.kunciPasangan(itemDraft.nama_komoditas, itemDraft.nama_pasar);
      const barisTerbitLain = petaTerbit.get(kunci);

      if (barisTerbitLain && barisTerbitLain.id && String(barisTerbitLain.id) !== String(itemDraft.id)) {
        await hargaPanganMobileService.perbarui(barisTerbitLain.id, {
          harga: Number(itemDraft.harga),
          satuan: hargaPanganMobileService.normalisasiSatuan(itemDraft.satuan),
          kategori: itemDraft.kategori,
          tanggal_penetapan: itemDraft.tanggal_penetapan,
          prioritas_tampil: itemDraft.prioritas_tampil,
          status: 'Terbit'
        });
        await hargaPanganMobileService.hapus(itemDraft.id).catch(() => {});
      } else {
        await hargaPanganMobileService.perbarui(itemDraft.id, { status: 'Terbit' });
        petaTerbit.set(kunci, { ...itemDraft, status: 'Terbit' });
      }
      jumlahDraftDisetujui += 1;
    }

    return { jumlahDraftDisetujui };
  }

  async setujuiSemuaAntrean(params: {
    daftarPengajuanDiajukan?: DokumenPengajuanHarga[];
    daftarDraftSatuan?: ItemHargaPangan[];
    daftarHargaAktif?: ItemHargaPangan[];
    catatanVerifikasi?: string;
  }): Promise<{ jumlahPaketDisetujui: number; jumlahDraftDisetujui: number; totalItemTerbit: number }> {
    const catatan = params.catatanVerifikasi || 'Disetujui massal oleh Kepala Bidang';
    let jumlahPaketDisetujui = 0;
    let totalItemPaket = 0;
    let snapshotHarga: ItemHargaPangan[] = Array.isArray(params.daftarHargaAktif) ? [...params.daftarHargaAktif] : [];

    for (const paket of Array.isArray(params.daftarPengajuanDiajukan) ? params.daftarPengajuanDiajukan : []) {
      if (!paket || !paket.id) continue;
      await this.setujuiPengajuanBatch(paket, snapshotHarga, catatan);
      jumlahPaketDisetujui += 1;
      totalItemPaket += Array.isArray(paket.items) ? paket.items.length : 0;
      const segar = await hargaPanganMobileService.ambilSemua().catch(() => null);
      if (Array.isArray(segar)) snapshotHarga = segar;
    }

    const daftarDraftInput = Array.isArray(params.daftarDraftSatuan) ? params.daftarDraftSatuan : [];
    const targetDraft = daftarDraftInput.length > 0
      ? (jumlahPaketDisetujui > 0
          ? snapshotHarga.filter((h) => String(h.status || '').toLowerCase() === 'draft')
          : daftarDraftInput)
      : [];
    const hasilDraft = await this.setujuiSemuaDraftSatuan(targetDraft, snapshotHarga);

    return {
      jumlahPaketDisetujui,
      jumlahDraftDisetujui: hasilDraft.jumlahDraftDisetujui,
      totalItemTerbit: totalItemPaket + hasilDraft.jumlahDraftDisetujui
    };
  }

  async tolakPengajuanBatch(pengajuanId: string, catatanAlasan: string = ''): Promise<boolean> {
    const alasan = String(catatanAlasan || '').trim();
    await supabaseClient.updatePengajuanHarga(pengajuanId, {
      status: 'Ditolak',
      catatan_verifikasi: alasan || 'Pengajuan ditolak untuk diperbaiki kembali.'
    });
    return true;
  }

  async hapusPengajuanBatch(pengajuanId: string): Promise<boolean> {
    await supabaseClient.hapusPengajuanHarga(pengajuanId);
    return true;
  }
}

export const pengajuanHargaMobileService = new PengajuanHargaMobileService();
