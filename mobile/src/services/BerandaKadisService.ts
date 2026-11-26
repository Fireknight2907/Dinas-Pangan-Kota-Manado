// ===================================================================================
// MODUL LAYANAN ANALITIK BERANDA EKSEKUTIF KEPALA DINAS (OOP - MOBILE / TYPESCRIPT)
// Instansi: Dinas Pangan Pemerintah Kota Manado
// Fungsi: Menyajikan ringkasan strategis tingkat pimpinan (100% data riil Supabase,
//         0% dummy) dengan filter periode (Bulan Ini / Tahun Berjalan / Semua Periode),
//         pemerataan GPM per kecamatan, serta sorotan stabilitas harga pangan terbit.
// ===================================================================================

import { jadwalGPMMobileService } from './JadwalGPMService';
import { berandaKabidMobileService, PeriodeLaporanKabid } from './BerandaKabidService';
import { ItemHargaPangan } from './HargaPanganService';
import { ItemMasterPasar } from './MasterDataService';

export interface ItemPemerataanKecamatan {
  kecamatan: string;
  totalKegiatan: number;
  selesai: number;
  aktif: number;
  kuota: number;
  terdaftar: number;
  hadir: number;
  persenSerapan: number;
}

export interface ItemSorotanDisparitas {
  nama_komoditas: string;
  kategori: string;
  satuan: string;
  jumlahPasar: number;
  terendah: number;
  rataRata: number;
  tertinggi: number;
  disparitas: number;
  persenDisparitas: number;
}

export interface RingkasanBerandaKadis {
  hariIniID: string;
  periode: PeriodeLaporanKabid;
  labelPeriode: string;
  tahunBerjalan: number;
  kpi: {
    totalHargaTerbit: number;
    jumlahKomoditasUnik: number;
    pasarTerpantau: number;
    totalPasarMaster: number;
    gpmTotalPeriode: number;
    gpmSelesaiPeriode: number;
    gpmAktifPeriode: number;
    gpmAktifSekarang: number;
    gpmSelesaiArsip: number;
    totalKuotaPeriode: number;
    totalTerdaftarPeriode: number;
    totalHadirPeriode: number;
    persenSerapanPeriode: number;
    kecamatanTerjangkau: number;
    totalKecamatan: number;
    persenCakupanWilayah: number;
  };
  pemerataanKecamatan: ItemPemerataanKecamatan[];
  sorotanDisparitasHarga: ItemSorotanDisparitas[];
  gpmPeriodeList: any[];
}

export class BerandaKadisMobileService {
  labelPeriode(periode: PeriodeLaporanKabid = 'tahun_ini'): string {
    return berandaKabidMobileService.labelPeriode(periode);
  }

  apakahAcaraMasukPeriode(acara: any, periode: PeriodeLaporanKabid = 'tahun_ini'): boolean {
    return berandaKabidMobileService.apakahAcaraMasukPeriode(acara, periode);
  }

  hitungRingkasanKadis(params: {
    daftarHarga?: ItemHargaPangan[];
    daftarPasarLengkap?: ItemMasterPasar[];
    daftarKecamatanMaster?: string[];
    daftarAcaraGPM?: any[];
    periode?: PeriodeLaporanKabid;
    waktuSekarangMs?: number;
  }): RingkasanBerandaKadis {
    const {
      daftarHarga = [],
      daftarPasarLengkap = [],
      daftarKecamatanMaster = [],
      daftarAcaraGPM = [],
      periode = 'tahun_ini',
      waktuSekarangMs = Date.now()
    } = params;

    const infoWaktu = berandaKabidMobileService.ambilInfoWaktuWITA();
    const labelPeriodeAktif = this.labelPeriode(periode);

    const semuaHarga = Array.isArray(daftarHarga) ? daftarHarga : [];
    const hargaTerbitList = semuaHarga.filter((h) => String(h.status || '').toLowerCase() === 'terbit');
    const komoditasUnik = new Set(
      hargaTerbitList.map((h) => String(h.nama_komoditas || '').trim().toLowerCase()).filter(Boolean)
    );
    const pasarAktifSet = new Set(
      hargaTerbitList.map((h) => String(h.nama_pasar || '').trim().toLowerCase()).filter(Boolean)
    );
    const totalPasarMaster = Array.isArray(daftarPasarLengkap) && daftarPasarLengkap.length > 0
      ? daftarPasarLengkap.length
      : pasarAktifSet.size;

    const petaKomoditas = new Map<string, {
      nama_komoditas: string;
      kategori: string;
      satuan: string;
      daftarHarga: number[];
      pasarSet: Set<string>;
    }>();

    hargaTerbitList.forEach((h) => {
      const nama = String(h.nama_komoditas || '').trim();
      const nilai = Number(h.harga) || 0;
      if (!nama || nilai <= 0) return;
      const kunci = nama.toLowerCase();
      if (!petaKomoditas.has(kunci)) {
        petaKomoditas.set(kunci, {
          nama_komoditas: nama,
          kategori: h.kategori || 'Bahan Pokok',
          satuan: h.satuan || '1 KG',
          daftarHarga: [],
          pasarSet: new Set<string>()
        });
      }
      const b = petaKomoditas.get(kunci)!;
      b.daftarHarga.push(nilai);
      if (h.nama_pasar) b.pasarSet.add(h.nama_pasar);
    });

    const sorotanDisparitasHarga: ItemSorotanDisparitas[] = Array.from(petaKomoditas.values())
      .map((k) => {
        const minH = Math.min(...k.daftarHarga);
        const maxH = Math.max(...k.daftarHarga);
        const avgH = Math.round(k.daftarHarga.reduce((a, b) => a + b, 0) / k.daftarHarga.length);
        const disparitas = maxH - minH;
        const persenDisparitas = minH > 0 ? Number(((disparitas / minH) * 100).toFixed(1)) : 0;
        return {
          nama_komoditas: k.nama_komoditas,
          kategori: k.kategori,
          satuan: k.satuan,
          jumlahPasar: k.pasarSet.size,
          terendah: minH,
          rataRata: avgH,
          tertinggi: maxH,
          disparitas,
          persenDisparitas
        };
      })
      .sort((a, b) => b.disparitas - a.disparitas || b.rataRata - a.rataRata)
      .slice(0, 6);

    const semuaAcara = Array.isArray(daftarAcaraGPM) ? daftarAcaraGPM : [];
    const acaraTeranalisis = semuaAcara.map((a) => {
      const st = jadwalGPMMobileService.hitungStatusOperasional(a, waktuSekarangMs);
      const kuota = Number(st.kuotaMaks || a.kuota_maksimal) || 0;
      const terdaftar = Number(st.terisi) || 0;
      const hadir = Number(st.totalHadir) || 0;
      const satuanPenerima = String(a.mode_penerima || 'individu').toLowerCase() === 'keluarga' ? 'KK' : 'Warga';
      return {
        ...a,
        statusOperasional: st,
        terdaftarRiil: terdaftar,
        hadirRiil: hadir,
        kuotaRiil: kuota,
        satuanPenerima,
        persenSerapan: kuota > 0 ? Math.min(100, Math.round((hadir / kuota) * 100)) : 0
      };
    });

    const acaraPeriode = acaraTeranalisis.filter((a) => this.apakahAcaraMasukPeriode(a, periode));
    const gpmAktifSemua = acaraTeranalisis.filter((a) => !a.statusOperasional.sudahBerakhir);
    const gpmSelesaiSemua = acaraTeranalisis.filter((a) => a.statusOperasional.sudahBerakhir);
    const gpmAktifPeriode = acaraPeriode.filter((a) => !a.statusOperasional.sudahBerakhir);
    const gpmSelesaiPeriode = acaraPeriode.filter((a) => a.statusOperasional.sudahBerakhir);

    const totalKuotaPeriode = acaraPeriode.reduce((acc, a) => acc + a.kuotaRiil, 0);
    const totalTerdaftarPeriode = acaraPeriode.reduce((acc, a) => acc + a.terdaftarRiil, 0);
    const totalHadirPeriode = acaraPeriode.reduce((acc, a) => acc + a.hadirRiil, 0);
    const persenSerapanPeriode = totalKuotaPeriode > 0
      ? Math.min(100, Math.round((totalHadirPeriode / totalKuotaPeriode) * 100))
      : 0;

    const petaKecamatan = new Map<string, Omit<ItemPemerataanKecamatan, 'persenSerapan'>>();
    (Array.isArray(daftarKecamatanMaster) ? daftarKecamatanMaster : []).forEach((namaKec) => {
      const bersih = String(namaKec || '').trim();
      if (!bersih) return;
      petaKecamatan.set(bersih.toLowerCase(), {
        kecamatan: bersih,
        totalKegiatan: 0,
        selesai: 0,
        aktif: 0,
        kuota: 0,
        terdaftar: 0,
        hadir: 0
      });
    });

    acaraPeriode.forEach((a) => {
      const namaKec = String(a.kecamatan || 'Lainnya').trim() || 'Lainnya';
      const k = namaKec.toLowerCase();
      if (!petaKecamatan.has(k)) {
        petaKecamatan.set(k, {
          kecamatan: namaKec,
          totalKegiatan: 0,
          selesai: 0,
          aktif: 0,
          kuota: 0,
          terdaftar: 0,
          hadir: 0
        });
      }
      const row = petaKecamatan.get(k)!;
      row.totalKegiatan += 1;
      if (a.statusOperasional.sudahBerakhir) row.selesai += 1;
      else row.aktif += 1;
      row.kuota += a.kuotaRiil;
      row.terdaftar += a.terdaftarRiil;
      row.hadir += a.hadirRiil;
    });

    const pemerataanKecamatan: ItemPemerataanKecamatan[] = Array.from(petaKecamatan.values())
      .map((r) => ({
        ...r,
        persenSerapan: r.kuota > 0 ? Math.min(100, Math.round((r.hadir / r.kuota) * 100)) : 0
      }))
      .sort((a, b) => b.totalKegiatan - a.totalKegiatan || a.kecamatan.localeCompare(b.kecamatan, 'id-ID'));

    const totalKecamatan = pemerataanKecamatan.length;
    const kecamatanTerjangkau = pemerataanKecamatan.filter((r) => r.totalKegiatan > 0).length;
    const persenCakupanWilayah = totalKecamatan > 0 ? Math.round((kecamatanTerjangkau / totalKecamatan) * 100) : 0;

    return {
      hariIniID: infoWaktu.hariIniID,
      periode,
      labelPeriode: labelPeriodeAktif,
      tahunBerjalan: infoWaktu.tahun,
      kpi: {
        totalHargaTerbit: hargaTerbitList.length,
        jumlahKomoditasUnik: komoditasUnik.size,
        pasarTerpantau: pasarAktifSet.size,
        totalPasarMaster,
        gpmTotalPeriode: acaraPeriode.length,
        gpmSelesaiPeriode: gpmSelesaiPeriode.length,
        gpmAktifPeriode: gpmAktifPeriode.length,
        gpmAktifSekarang: gpmAktifSemua.length,
        gpmSelesaiArsip: gpmSelesaiSemua.length,
        totalKuotaPeriode,
        totalTerdaftarPeriode,
        totalHadirPeriode,
        persenSerapanPeriode,
        kecamatanTerjangkau,
        totalKecamatan,
        persenCakupanWilayah
      },
      pemerataanKecamatan,
      sorotanDisparitasHarga,
      gpmPeriodeList: acaraPeriode.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')))
    };
  }
}

export const berandaKadisMobileService = new BerandaKadisMobileService();
