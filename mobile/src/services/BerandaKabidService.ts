// ===================================================================================
// MODUL LAYANAN ANALITIK BERANDA KEPALA BIDANG (OOP - MOBILE / TYPESCRIPT)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Menyajikan ringkasan kinerja & pengawasan strategis Kepala Bidang secara
//         100% riil dari basis data Supabase (0% dummy), dilengkapi filter periode
//         (Bulan Ini / Tahun Berjalan / Semua Periode) agar angka GPM Terlaksana dan
//         serapan kuota selalu relevan dengan periode anggaran dinas.
// ===================================================================================

import { jadwalGPMMobileService } from './JadwalGPMService';
import { berandaStafMobileService, StatusSurveyPasar } from './BerandaStafService';
import { ItemHargaPangan } from './HargaPanganService';
import { ItemMasterKomoditas, ItemMasterPasar } from './MasterDataService';
import { DokumenPengajuanHarga } from './PengajuanHargaService';

export type PeriodeLaporanKabid = 'bulan_ini' | 'tahun_ini' | 'semua';

export interface RingkasanBerandaKabid {
  hariIniID: string;
  periode: PeriodeLaporanKabid;
  labelPeriode: string;
  tahunBerjalan: number;
  kpi: {
    menungguVerifikasiPaket: number;
    menungguVerifikasiSatuan: number;
    totalMenungguVerifikasi: number;
    disetujuiTotal: number;
    ditolakTotal: number;
    totalHargaTerbit: number;
    rataRataHargaTerbit: number;
    pasarSelesaiHariIni: number;
    totalPasar: number;
    persenKepatuhanPasar: number;
    gpmAktifSekarang: number;
    gpmAktifPeriode: number;
    gpmTerlaksanaPeriode: number;
    gpmTerlaksanaTotalArsip: number;
    totalKuotaPeriode: number;
    totalTerdaftarPeriode: number;
    totalHadirPeriode: number;
    persenSerapanPeriode: number;
  };
  antreanPengajuanTerbaru: DokumenPengajuanHarga[];
  riwayatKeputusanTerbaru: DokumenPengajuanHarga[];
  kepatuhanPerPasar: StatusSurveyPasar[];
  gpmPeriodeList: any[];
}

export class BerandaKabidMobileService {
  ambilInfoWaktuWITA() {
    const skrg = new Date();
    const wita = new Date(skrg.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
    const tahun = wita.getFullYear();
    const bulan = wita.getMonth() + 1;
    const namaBulan = wita.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return {
      tahun,
      bulan,
      namaBulan,
      hariIniID: berandaStafMobileService.formatTanggalHariIniID()
    };
  }

  apakahAcaraMasukPeriode(acara: any, periode: PeriodeLaporanKabid = 'tahun_ini'): boolean {
    if (periode === 'semua') return true;
    const tglStr = String(acara?.tanggal || '').split('T')[0].trim();
    if (!tglStr) return false;
    const bagian = tglStr.split('-');
    if (bagian.length < 2) return false;
    const thnAcara = Number(bagian[0]);
    const blnAcara = Number(bagian[1]);
    const { tahun, bulan } = this.ambilInfoWaktuWITA();
    if (periode === 'bulan_ini') {
      return thnAcara === tahun && blnAcara === bulan;
    }
    return thnAcara === tahun;
  }

  labelPeriode(periode: PeriodeLaporanKabid = 'tahun_ini'): string {
    const { tahun, namaBulan } = this.ambilInfoWaktuWITA();
    if (periode === 'bulan_ini') return `Bulan ${namaBulan}`;
    if (periode === 'semua') return 'Semua Periode';
    return `Tahun ${tahun}`;
  }

  hitungRingkasanKabid(params: {
    daftarPasarLengkap?: ItemMasterPasar[];
    daftarHarga?: ItemHargaPangan[];
    daftarMasterKomoditas?: ItemMasterKomoditas[];
    daftarPengajuan?: DokumenPengajuanHarga[];
    daftarAcaraGPM?: any[];
    periode?: PeriodeLaporanKabid;
    waktuSekarangMs?: number;
  }): RingkasanBerandaKabid {
    const {
      daftarPasarLengkap = [],
      daftarHarga = [],
      daftarMasterKomoditas = [],
      daftarPengajuan = [],
      daftarAcaraGPM = [],
      periode = 'tahun_ini',
      waktuSekarangMs = Date.now()
    } = params;

    const infoWaktu = this.ambilInfoWaktuWITA();
    const labelPeriodeAktif = this.labelPeriode(periode);

    const semuaPengajuan = Array.isArray(daftarPengajuan) ? daftarPengajuan : [];
    const pengajuanMenunggu = semuaPengajuan.filter((p) => p && p.status === 'Diajukan');
    const pengajuanDisetujui = semuaPengajuan.filter((p) => p && p.status === 'Diverifikasi');
    const pengajuanDitolak = semuaPengajuan.filter((p) => p && p.status === 'Ditolak');

    const semuaHarga = Array.isArray(daftarHarga) ? daftarHarga : [];
    const hargaTerbitList = semuaHarga.filter((h) => String(h.status || '').toLowerCase() === 'terbit');
    const draftSatuanList = semuaHarga.filter((h) => String(h.status || '').toLowerCase() === 'draft');

    const stafOps = berandaStafMobileService.hitungRingkasanOperasional({
      daftarPasarLengkap,
      daftarHarga: semuaHarga,
      daftarMasterKomoditas,
      daftarPengajuan: semuaPengajuan.filter((p) => p && p.status !== 'Draft'),
      daftarAcaraGPM,
      waktuSekarangMs
    });

    const semuaAcara = Array.isArray(daftarAcaraGPM) ? daftarAcaraGPM : [];
    const acaraTeranalisis = semuaAcara.map((a) => {
      const st = jadwalGPMMobileService.hitungStatusOperasional(a, waktuSekarangMs);
      const kuota = Number(st.kuotaMaks || a.kuota_maksimal) || 0;
      const terdaftar = Number(st.terisi) || 0;
      const hadir = Number(st.totalHadir) || 0;
      return {
        ...a,
        statusOperasional: st,
        terdaftarRiil: terdaftar,
        hadirRiil: hadir,
        kuotaRiil: kuota,
        persenSerapan: kuota > 0 ? Math.min(100, Math.round((hadir / kuota) * 100)) : 0
      };
    });

    const acaraPeriode = acaraTeranalisis.filter((a) => this.apakahAcaraMasukPeriode(a, periode));
    const gpmAktifSemua = acaraTeranalisis.filter((a) => !a.statusOperasional.sudahBerakhir);
    const gpmSelesaiSemua = acaraTeranalisis.filter((a) => a.statusOperasional.sudahBerakhir);
    const gpmSelesaiPeriode = acaraPeriode.filter((a) => a.statusOperasional.sudahBerakhir);
    const gpmAktifPeriode = acaraPeriode.filter((a) => !a.statusOperasional.sudahBerakhir);

    const totalKuotaPeriode = acaraPeriode.reduce((acc, a) => acc + a.kuotaRiil, 0);
    const totalTerdaftarPeriode = acaraPeriode.reduce((acc, a) => acc + a.terdaftarRiil, 0);
    const totalHadirPeriode = acaraPeriode.reduce((acc, a) => acc + a.hadirRiil, 0);
    const persenSerapanPeriode = totalKuotaPeriode > 0
      ? Math.min(100, Math.round((totalHadirPeriode / totalKuotaPeriode) * 100))
      : 0;

    const rataRataHargaTerbit = hargaTerbitList.length > 0
      ? Math.round(hargaTerbitList.reduce((acc, h) => acc + (Number(h.harga) || 0), 0) / hargaTerbitList.length)
      : 0;

    return {
      hariIniID: infoWaktu.hariIniID,
      periode,
      labelPeriode: labelPeriodeAktif,
      tahunBerjalan: infoWaktu.tahun,
      kpi: {
        menungguVerifikasiPaket: pengajuanMenunggu.length,
        menungguVerifikasiSatuan: draftSatuanList.length,
        totalMenungguVerifikasi: pengajuanMenunggu.length + draftSatuanList.length,
        disetujuiTotal: pengajuanDisetujui.length,
        ditolakTotal: pengajuanDitolak.length,
        totalHargaTerbit: hargaTerbitList.length,
        rataRataHargaTerbit,
        pasarSelesaiHariIni: stafOps.kpi.pasarSelesaiHariIni,
        totalPasar: stafOps.kpi.totalPasar,
        persenKepatuhanPasar: stafOps.kpi.persenProgresPasar,
        gpmAktifSekarang: gpmAktifSemua.length,
        gpmAktifPeriode: gpmAktifPeriode.length,
        gpmTerlaksanaPeriode: gpmSelesaiPeriode.length,
        gpmTerlaksanaTotalArsip: gpmSelesaiSemua.length,
        totalKuotaPeriode,
        totalTerdaftarPeriode,
        totalHadirPeriode,
        persenSerapanPeriode
      },
      antreanPengajuanTerbaru: pengajuanMenunggu.slice(0, 5),
      riwayatKeputusanTerbaru: [...pengajuanDisetujui, ...pengajuanDitolak]
        .sort((a, b) => new Date(b.diperbarui_pada || b.dibuat_pada || 0).getTime() - new Date(a.diperbarui_pada || a.dibuat_pada || 0).getTime())
        .slice(0, 6),
      kepatuhanPerPasar: stafOps.statusPerPasar,
      gpmPeriodeList: acaraPeriode.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || ''))).slice(0, 5)
    };
  }
}

export const berandaKabidMobileService = new BerandaKabidMobileService();
