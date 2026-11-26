// ===================================================================================
// MODUL LAYANAN ANALITIK BERANDA ADMINISTRATOR & SUPERADMIN (OOP - MOBILE / TS)
// Instansi: Dinas Pangan Pemerintah Kota Manado
// Fungsi: Menyajikan ringkasan kesehatan sistem 100% data riil Supabase (0% dummy):
//         distribusi akun per peran, kelengkapan master data (komoditas, satuan,
//         pasar + koordinat peta, kecamatan), serta pengawasan operasional GPM.
// ===================================================================================

import { jadwalGPMMobileService } from './JadwalGPMService';
import { berandaKabidMobileService } from './BerandaKabidService';
import { penggunaMobileService, AkunPengguna } from './PenggunaService';
import { ItemMasterKomoditas, ItemMasterPasar } from './MasterDataService';
import { ItemHargaPangan } from './HargaPanganService';
import { DokumenPengajuanHarga } from './PengajuanHargaService';

export interface RincianPeranSistem {
  Superadmin: number;
  Admin: number;
  Kadis: number;
  Kabid: number;
  Staf: number;
}

export interface RingkasanBerandaAdmin {
  hariIniID: string;
  kpi: {
    totalPengguna: number;
    rincianPeran: RincianPeranSistem;
    totalMasterKomoditas: number;
    totalKelompokKomoditas: number;
    totalSatuan: number;
    totalPasar: number;
    pasarDenganPeta: number;
    pasarTanpaPeta: number;
    persenPasarBerpeta: number;
    totalKecamatan: number;
    totalHargaTerbit: number;
    pengajuanMenunggu: number;
    totalAcaraGPM: number;
    gpmAktif: number;
    gpmSelesai: number;
    totalKuotaGPM: number;
    totalTerdaftarGPM: number;
    totalHadirGPM: number;
  };
  daftarPasarTanpaPeta: ItemMasterPasar[];
}

export class BerandaAdminMobileService {
  hitungRingkasanSistem(params: {
    daftarPengguna?: AkunPengguna[];
    daftarMasterKomoditas?: ItemMasterKomoditas[];
    daftarSatuan?: string[];
    daftarPasarLengkap?: ItemMasterPasar[];
    daftarKecamatan?: string[];
    daftarHarga?: ItemHargaPangan[];
    daftarPengajuan?: DokumenPengajuanHarga[];
    daftarAcaraGPM?: any[];
    waktuSekarangMs?: number;
  }): RingkasanBerandaAdmin {
    const {
      daftarPengguna = [],
      daftarMasterKomoditas = [],
      daftarSatuan = [],
      daftarPasarLengkap = [],
      daftarKecamatan = [],
      daftarHarga = [],
      daftarPengajuan = [],
      daftarAcaraGPM = [],
      waktuSekarangMs = Date.now()
    } = params;

    const infoWaktu = berandaKabidMobileService.ambilInfoWaktuWITA();

    const users = Array.isArray(daftarPengguna) ? daftarPengguna : [];
    const rincianPeran: RincianPeranSistem = {
      Superadmin: 0,
      Admin: 0,
      Kadis: 0,
      Kabid: 0,
      Staf: 0
    };
    users.forEach((u) => {
      const p = penggunaMobileService.normalisasiPeran(u?.peran);
      rincianPeran[p] += 1;
    });

    const komoditas = Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas : [];
    const kelompokUnik = new Set(
      komoditas.map((k) => String(k?.kelompok_komoditas || '').trim().toLowerCase()).filter(Boolean)
    );
    const satuan = Array.isArray(daftarSatuan) ? daftarSatuan : [];
    const pasarLengkap = Array.isArray(daftarPasarLengkap) ? daftarPasarLengkap : [];
    const pasarDenganPeta = pasarLengkap.filter((p) => Boolean(p?.punyaKoordinat));
    const pasarTanpaPeta = pasarLengkap.filter((p) => !p?.punyaKoordinat);
    const kecamatan = Array.isArray(daftarKecamatan) ? daftarKecamatan : [];

    const harga = Array.isArray(daftarHarga) ? daftarHarga : [];
    const totalHargaTerbit = harga.filter((h) => String(h?.status || '').toLowerCase() === 'terbit').length;

    const pengajuan = Array.isArray(daftarPengajuan) ? daftarPengajuan : [];
    const pengajuanMenunggu = pengajuan.filter((p) => p && p.status === 'Diajukan').length;

    const acara = Array.isArray(daftarAcaraGPM) ? daftarAcaraGPM : [];
    let gpmAktif = 0;
    let gpmSelesai = 0;
    let totalKuotaGPM = 0;
    let totalTerdaftarGPM = 0;
    let totalHadirGPM = 0;

    acara.forEach((a) => {
      const st = jadwalGPMMobileService.hitungStatusOperasional(a, waktuSekarangMs);
      if (st.sudahBerakhir) gpmSelesai += 1;
      else gpmAktif += 1;
      totalKuotaGPM += Number(st.kuotaMaks || a.kuota_maksimal) || 0;
      totalTerdaftarGPM += Number(st.terisi) || 0;
      totalHadirGPM += Number(st.totalHadir) || 0;
    });

    const persenPasarBerpeta = pasarLengkap.length > 0
      ? Math.round((pasarDenganPeta.length / pasarLengkap.length) * 100)
      : 0;

    return {
      hariIniID: infoWaktu.hariIniID,
      kpi: {
        totalPengguna: users.length,
        rincianPeran,
        totalMasterKomoditas: komoditas.length,
        totalKelompokKomoditas: kelompokUnik.size,
        totalSatuan: satuan.length,
        totalPasar: pasarLengkap.length,
        pasarDenganPeta: pasarDenganPeta.length,
        pasarTanpaPeta: pasarTanpaPeta.length,
        persenPasarBerpeta,
        totalKecamatan: kecamatan.length,
        totalHargaTerbit,
        pengajuanMenunggu,
        totalAcaraGPM: acara.length,
        gpmAktif,
        gpmSelesai,
        totalKuotaGPM,
        totalTerdaftarGPM,
        totalHadirGPM
      },
      daftarPasarTanpaPeta: pasarTanpaPeta
    };
  }
}

export const berandaAdminMobileService = new BerandaAdminMobileService();
