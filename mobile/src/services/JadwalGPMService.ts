// ===================================================================================
// Modul Analisis Jadwal, Pengurutan Deterministik & Status Otomatis GPM - Mobile (OOP)
// Fungsi: Menghitung status operasional acara GPM berbasis zona waktu WITA (UTC+8),
//         mendeteksi acara berakhir (auto-close) & kuota habis secara realtime,
//         mengurutkan jadwal aktif secara deterministik (termasuk tie-breaker saat
//         hari & jam sama berdasarkan sisa kuota terbanyak, urutan penjadwalan, atau
//         jarak terdekat GPS), menyusun arsip riwayat publik beserta tingkat keramaian,
//         serta memvalidasi formulir pembuatan acara GPM baru.
// ===================================================================================

import type { ItemAcaraGPM } from './GPMService';

export type KodeStatusOperasionalGPM = 'Berlangsung' | 'Akan Datang' | 'Penuh' | 'Selesai';
export type ModeUrutanGPM = 'otomatis' | 'terdekat' | 'kuota-terbanyak';

export interface StatusOperasionalGPM {
  kode: KodeStatusOperasionalGPM;
  label: string;
  bisaDaftar: boolean;
  bisaVerifikasiQR: boolean;
  sudahBerakhir: boolean;
  lewatJadwal: boolean;
  kuotaPenuh: boolean;
  sedangBerlangsung: boolean;
  kuotaMaks: number;
  terisi: number;
  totalHadir: number;
  sisaKuota: number;
  persenTerisi: number;
  labelAntusiasme: string;
  kelasAntusiasme: 'sangat-ramai' | 'ramai' | 'cukup' | 'normal' | 'sepi';
  keteranganWaktu: string;
  waktuMulaiMs: number;
  waktuSelesaiMs: number;
}

export interface AcaraGPMTeranalisis extends ItemAcaraGPM {
  statusOperasional: StatusOperasionalGPM;
  jarakKm?: number | null;
}

export class JadwalGPMMobileService {
  private readonly offsetWita = '+08:00';

  normalisasiJam(jamStr?: string, defaultJam: string = '08:00'): string {
    const bersih = String(jamStr || '').replace(/\./g, ':').trim();
    const cocok = bersih.match(/^(\d{1,2}):(\d{2})/);
    if (!cocok) return defaultJam;
    const hh = Math.min(23, Math.max(0, parseInt(cocok[1], 10)));
    const mm = Math.min(59, Math.max(0, parseInt(cocok[2], 10)));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  parseWaktuWITA(tanggal?: string, jamStr?: string, defaultJam: string = '23:59'): number {
    if (!tanggal) return 0;
    const tglBersih = String(tanggal).split('T')[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tglBersih)) return 0;
    const jamRapi = this.normalisasiJam(jamStr, defaultJam);
    const ms = new Date(`${tglBersih}T${jamRapi}:00${this.offsetWita}`).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  formatTanggalID(tanggal?: string): string {
    if (!tanggal) return '-';
    const ms = this.parseWaktuWITA(tanggal, '08:00', '08:00');
    if (!ms) return String(tanggal);
    return new Date(ms).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar'
    });
  }

  formatDurasiRingkas(selisihMs: number): string {
    const menitTotal = Math.max(1, Math.floor(selisihMs / 60000));
    if (menitTotal < 60) return `${menitTotal} menit`;
    const jamTotal = Math.floor(menitTotal / 60);
    const sisaMenit = menitTotal % 60;
    if (jamTotal < 24) {
      return sisaMenit > 0 ? `${jamTotal} jam ${sisaMenit} mnt` : `${jamTotal} jam`;
    }
    const hari = Math.floor(jamTotal / 24);
    const sisaJam = jamTotal % 24;
    return sisaJam > 0 ? `${hari} hari ${sisaJam} jam` : `${hari} hari`;
  }

  hitungStatusOperasional(acara: Partial<ItemAcaraGPM>, waktuSekarangMs: number = Date.now()): StatusOperasionalGPM {
    const kuotaMaks = Math.max(0, Number(acara?.kuota_maksimal) || 0);
    const terisi = Math.max(0, Number(acara?.antrean_terisi) || 0);
    const totalHadir = Math.max(0, Number(acara?.total_hadir) || 0);
    const sisaKuota = Math.max(0, kuotaMaks - terisi);
    const persenTerisi = kuotaMaks > 0 ? Math.min(100, Math.round((terisi / kuotaMaks) * 100)) : 0;

    const waktuMulaiMs = this.parseWaktuWITA(acara?.tanggal, acara?.jam_mulai, '08:00');
    const waktuSelesaiMs = this.parseWaktuWITA(acara?.tanggal, acara?.jam_selesai, '23:59');
    const statusDB = String(acara?.status || 'Aktif').trim().toLowerCase();

    const lewatJadwal = waktuSelesaiMs > 0 && waktuSekarangMs >= waktuSelesaiMs;
    const sudahBerakhir = statusDB === 'selesai' || lewatJadwal;
    const kuotaPenuh = !sudahBerakhir && (kuotaMaks === 0 || sisaKuota <= 0);
    const sedangBerlangsung =
      !sudahBerakhir &&
      waktuMulaiMs > 0 &&
      waktuSekarangMs >= waktuMulaiMs &&
      waktuSekarangMs < waktuSelesaiMs;

    let kode: KodeStatusOperasionalGPM = 'Akan Datang';
    let label = '🔵 Pendaftaran Dibuka';
    let keteranganWaktu = waktuMulaiMs > waktuSekarangMs
      ? `Mulai dalam ${this.formatDurasiRingkas(waktuMulaiMs - waktuSekarangMs)}`
      : 'Jadwal aktif';

    if (sudahBerakhir) {
      kode = 'Selesai';
      label = lewatJadwal && statusDB === 'aktif' ? '🔒 Berakhir Otomatis' : '✓ Terlaksana / Selesai';
      keteranganWaktu = `Ditutup ${this.normalisasiJam(acara?.jam_selesai, '14:00')} WITA`;
    } else if (kuotaPenuh) {
      kode = 'Penuh';
      label = '🚫 Kuota Habis';
      keteranganWaktu = `Penuh (${terisi}/${kuotaMaks} antrean)`;
    } else if (sedangBerlangsung) {
      kode = 'Berlangsung';
      label = '🟢 Sedang Berlangsung';
      keteranganWaktu = `Tutup dalam ${this.formatDurasiRingkas(waktuSelesaiMs - waktuSekarangMs)}`;
    }

    let labelAntusiasme = '📋 Terlaksana';
    let kelasAntusiasme: StatusOperasionalGPM['kelasAntusiasme'] = 'normal';
    if (persenTerisi >= 90) {
      labelAntusiasme = '🔥 Sangat Ramai';
      kelasAntusiasme = 'sangat-ramai';
    } else if (persenTerisi >= 65) {
      labelAntusiasme = '👥 Ramai';
      kelasAntusiasme = 'ramai';
    } else if (persenTerisi >= 30) {
      labelAntusiasme = '🙂 Cukup Ramai';
      kelasAntusiasme = 'cukup';
    } else if (terisi === 0) {
      labelAntusiasme = '📭 Belum Ada Pendaftar';
      kelasAntusiasme = 'sepi';
    }

    return {
      kode,
      label,
      bisaDaftar: !sudahBerakhir && !kuotaPenuh,
      bisaVerifikasiQR: !sudahBerakhir,
      sudahBerakhir,
      lewatJadwal,
      kuotaPenuh,
      sedangBerlangsung,
      kuotaMaks,
      terisi,
      totalHadir,
      sisaKuota,
      persenTerisi,
      labelAntusiasme,
      kelasAntusiasme,
      keteranganWaktu,
      waktuMulaiMs,
      waktuSelesaiMs
    };
  }

  hitungJarakKm(lat1?: number, lng1?: number, lat2?: number, lng2?: number): number | null {
    const a1 = Number(lat1);
    const o1 = Number(lng1);
    const a2 = Number(lat2);
    const o2 = Number(lng2);
    if (![a1, o1, a2, o2].every(Number.isFinite)) return null;

    const R = 6371;
    const dLat = ((a2 - a1) * Math.PI) / 180;
    const dLng = ((o2 - o1) * Math.PI) / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h =
      sinLat * sinLat +
      Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * sinLng * sinLng;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return Math.round(R * c * 10) / 10;
  }

  urutkanAcaraAktif(
    daftarAcara: ItemAcaraGPM[] = [],
    opsi: {
      modeUrutan?: ModeUrutanGPM;
      kecamatan?: string;
      posisiUser?: { lat: number; lng: number } | null;
      waktuSekarangMs?: number;
    } = {}
  ): AcaraGPMTeranalisis[] {
    const { modeUrutan = 'otomatis', kecamatan = 'Semua', posisiUser = null, waktuSekarangMs = Date.now() } = opsi;
    const kecFilter = String(kecamatan || 'Semua').toLowerCase();
    const skorTier: Record<KodeStatusOperasionalGPM, number> = {
      Berlangsung: 0,
      'Akan Datang': 1,
      Penuh: 2,
      Selesai: 3
    };

    const diperkaya: AcaraGPMTeranalisis[] = (Array.isArray(daftarAcara) ? daftarAcara : [])
      .map((acara) => {
        const statusOperasional = this.hitungStatusOperasional(acara, waktuSekarangMs);
        const jarakKm = posisiUser
          ? this.hitungJarakKm(posisiUser.lat, posisiUser.lng, acara.latitude, acara.longitude)
          : null;
        return { ...acara, statusOperasional, jarakKm };
      })
      .filter((acara) => {
        if (acara.statusOperasional.sudahBerakhir) return false;
        if (kecFilter !== 'semua' && String(acara.kecamatan || '').toLowerCase() !== kecFilter) {
          return false;
        }
        return true;
      });

    diperkaya.sort((a, b) => {
      const stA = a.statusOperasional;
      const stB = b.statusOperasional;

      if (stA.kuotaPenuh !== stB.kuotaPenuh) {
        return stA.kuotaPenuh ? 1 : -1;
      }

      if (modeUrutan === 'terdekat' && a.jarakKm !== null && a.jarakKm !== undefined && b.jarakKm !== null && b.jarakKm !== undefined) {
        if (a.jarakKm !== b.jarakKm) return a.jarakKm - b.jarakKm;
      } else if (modeUrutan === 'kuota-terbanyak') {
        if (stB.sisaKuota !== stA.sisaKuota) return stB.sisaKuota - stA.sisaKuota;
      } else {
        if (skorTier[stA.kode] !== skorTier[stB.kode]) {
          return skorTier[stA.kode] - skorTier[stB.kode];
        }
      }

      if (stA.waktuMulaiMs !== stB.waktuMulaiMs) {
        return stA.waktuMulaiMs - stB.waktuMulaiMs;
      }

      if (stB.sisaKuota !== stA.sisaKuota) {
        return stB.sisaKuota - stA.sisaKuota;
      }

      const dibuatA = new Date(a.dibuat_pada || 0).getTime();
      const dibuatB = new Date(b.dibuat_pada || 0).getTime();
      if (dibuatA !== dibuatB) return dibuatA - dibuatB;

      return String(a.nama_acara || '').localeCompare(String(b.nama_acara || ''), 'id-ID');
    });

    return diperkaya;
  }

  urutkanRiwayatSelesai(
    daftarSemuaAcara: ItemAcaraGPM[] = [],
    opsi: { kecamatan?: string; waktuSekarangMs?: number } = {}
  ): AcaraGPMTeranalisis[] {
    const { kecamatan = 'Semua', waktuSekarangMs = Date.now() } = opsi;
    const kecFilter = String(kecamatan || 'Semua').toLowerCase();

    return (Array.isArray(daftarSemuaAcara) ? daftarSemuaAcara : [])
      .map((acara) => ({
        ...acara,
        statusOperasional: this.hitungStatusOperasional(acara, waktuSekarangMs)
      }))
      .filter((acara) => {
        if (!acara.statusOperasional.sudahBerakhir) return false;
        if (kecFilter !== 'semua' && String(acara.kecamatan || '').toLowerCase() !== kecFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sB = b.statusOperasional.waktuSelesaiMs || 0;
        const sA = a.statusOperasional.waktuSelesaiMs || 0;
        if (sB !== sA) return sB - sA;
        return new Date(b.dibuat_pada || 0).getTime() - new Date(a.dibuat_pada || 0).getTime();
      });
  }

  ekstrakKecamatanUnik(daftarAcara: ItemAcaraGPM[] = []): string[] {
    const set = new Set<string>();
    (Array.isArray(daftarAcara) ? daftarAcara : []).forEach((a) => {
      const k = String(a?.kecamatan || '').trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
  }

  validasiFormAcaraBaru<T extends Partial<ItemAcaraGPM>>(form: T): T {
    if (!String(form?.nama_acara || '').trim()) {
      throw new Error('Nama acara GPM wajib diisi!');
    }
    if (!String(form?.lokasi || '').trim()) {
      throw new Error('Lokasi / alamat pelaksanaan GPM wajib diisi!');
    }
    if (!String(form?.tanggal || '').trim()) {
      throw new Error('Tanggal pelaksanaan GPM wajib diisi!');
    }

    const jamMulai = this.normalisasiJam(form.jam_mulai, '');
    const jamSelesai = this.normalisasiJam(form.jam_selesai, '');
    if (!jamMulai || !jamSelesai) {
      throw new Error('Format Jam Mulai dan Jam Selesai harus valid (contoh: 08:00 dan 16:00).');
    }

    const mulaiMs = this.parseWaktuWITA(form.tanggal, jamMulai);
    const selesaiMs = this.parseWaktuWITA(form.tanggal, jamSelesai);
    if (!mulaiMs || !selesaiMs) {
      throw new Error('Tanggal atau jam pelaksanaan tidak valid.');
    }
    if (selesaiMs <= mulaiMs) {
      throw new Error('Jam Selesai harus lebih akhir daripada Jam Mulai!');
    }
    if (selesaiMs <= Date.now()) {
      throw new Error('Jadwal selesai acara sudah berlalu! Pilih tanggal/jam yang masih akan berlangsung (WITA).');
    }

    const kuota = parseInt(String(form.kuota_maksimal || 0), 10);
    if (!Number.isFinite(kuota) || kuota < 1) {
      throw new Error('Kuota maksimal antrean minimal 1 orang.');
    }

    const modePendaftaranValid = ['online', 'keduanya', 'langsung'].includes(String(form.mode_pendaftaran || '').toLowerCase())
      ? (String(form.mode_pendaftaran).toLowerCase() as 'online' | 'keduanya' | 'langsung')
      : 'online';
    const modePenerimaValid = ['individu', 'keluarga'].includes(String(form.mode_penerima || '').toLowerCase())
      ? (String(form.mode_penerima).toLowerCase() as 'individu' | 'keluarga')
      : 'individu';

    return {
      ...form,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      kuota_maksimal: kuota,
      mode_pendaftaran: modePendaftaranValid,
      mode_penerima: modePenerimaValid
    };
  }
}

export const jadwalGPMMobileService = new JadwalGPMMobileService();
