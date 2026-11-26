// ===================================================================================
// Modul Analisis & Penyaringan Harga Pangan Publik - Aplikasi Seluler (OOP)
// Fungsi: Menormalisasi satuan (terkunci per 1 unit Master Satuan), pencarian pintar
//         multi-kata & sinonim lokal, ekstraksi kelompok induk & sub-varian otomatis,
//         pengelompokan komoditas lintas pasar (pasar termurah & termahal), penyusunan
//         matriks tabel perbandingan pasar, serta statistik murni dari basis data.
// ===================================================================================

import type { ItemHargaPangan, StatistikKategori } from './HargaPanganService';
import type { ItemMasterKomoditas } from './MasterDataService';

export interface DeltaHarga {
  selisih: number;
  hargaLama: number | null;
  hargaBaru: number;
  namaPasar?: string;
  dicatatPada: string | null;
  keterangan?: string;
}

export interface PetaDeltaHarga {
  petaPasar: Map<string, DeltaHarga>;
  petaKomoditas: Map<string, DeltaHarga>;
}

export interface ItemPasarTersaring extends ItemHargaPangan {
  kelompok: string;
  hargaStandar: number;
  labelStandar: string;
  perluKonversi: boolean;
  delta: DeltaHarga | null;
}

export interface GrupKomoditasAnalisis {
  id: string;
  kunci: string;
  kelompok: string;
  nama_komoditas: string;
  kategori: string;
  satuanUtama: string;
  labelStandar: string;
  prioritas: number;
  totalDilihat: number;
  jumlahPasar: number;
  daftarPasarItem: ItemPasarTersaring[];
  pasarTermurah: ItemPasarTersaring;
  pasarTermahal: ItemPasarTersaring;
  hargaMin: number;
  hargaMax: number;
  hargaStandarMin: number;
  hargaStandarMax: number;
  hargaRataRata: number;
  hargaStandarRataRata: number;
  adaPerbedaanHarga: boolean;
  deltaTerbaru: DeltaHarga | null;
  tanggalPenetapanTerbaru: string;
  diperbaruiPadaTerbaru: string | null;
}

export interface ItemSemuaPasarAnalisis extends ItemPasarTersaring {
  prioritas: number;
  totalDilihat: number;
  posisiPasar: 'termurah' | 'termahal' | 'tengah' | 'tunggal';
  grupKomoditas: GrupKomoditasAnalisis;
}

export interface KelompokIndukAnalisis {
  kelompok: string;
  jumlahVarian: number;
  jumlahData: number;
  prioritas: number;
}

export interface SubVarianAnalisis {
  kunci: string;
  nama_komoditas: string;
  kelompok: string;
  satuan: string;
  hargaMin: number;
  jumlahPasar: number;
  prioritas: number;
}

export interface SelMatriksPasar {
  harga: number;
  satuan: string;
  hargaStandar: number;
  posisi: 'termurah' | 'termahal' | 'tengah' | 'tunggal';
  delta: DeltaHarga | null;
  item: ItemPasarTersaring;
}

export interface BarisMatriksPasar extends GrupKomoditasAnalisis {
  selPerPasar: Record<string, SelMatriksPasar>;
}

export interface HasilMatriksPerbandingan {
  daftarKolomPasar: string[];
  daftarBarisMatriks: BarisMatriksPasar[];
}

export type JenisUrutanHarga = 'prioritas' | 'termurah' | 'termahal' | 'terpopuler' | 'abjad';
export type ModeTampilanHarga = 'ringkasan' | 'matriks' | 'semua-pasar';

export class AnalisisHargaMobileService {
  private readonly kategoriBaku = ['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah', 'Lainnya'];
  private readonly aturanSinonimLokal = [
    { cocok: ['medium'], tambah: 'biasa standar harian lokal rakyat' },
    { cocok: ['sphp'], tambah: 'bulog subsidi pemerintah murah biasa' },
    { cocok: ['premium'], tambah: 'super pulen kepala bagus kualitas atas' },
    { cocok: ['cabai', 'cabe'], tambah: 'rica lombok pedas' },
    { cocok: ['rica'], tambah: 'cabai cabe lombok pedas' },
    { cocok: ['minyakita'], tambah: 'minyak goreng subsidi pemerintah murah' },
    { cocok: ['curah'], tambah: 'biasa kiloan' },
    { cocok: ['terigu'], tambah: 'tepung gandum segitiga' },
    { cocok: ['telur'], tambah: 'baki ras ayam' },
    { cocok: ['gula'], tambah: 'putih kristal manis' },
    { cocok: ['ikan'], tambah: 'laut segar tongkol cakalang deho' },
    { cocok: ['ayam'], tambah: 'daging potong ras broiler' },
    { cocok: ['sapi'], tambah: 'daging segar murni paha' }
  ];

  // Membangun peta cepat Master Komoditas (induk, sinonim, satuan bawaan, prioritas)
  buatPetaMasterKomoditas(daftarMasterKomoditas: ItemMasterKomoditas[] = []): Map<string, ItemMasterKomoditas> {
    const peta = new Map<string, ItemMasterKomoditas>();
    (Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas : []).forEach((mk) => {
      const kunci = this.kunciKomoditas(mk?.nama_komoditas);
      if (kunci) peta.set(kunci, mk);
    });
    return peta;
  }

  // Menentukan komoditas induk (kelompok) untuk pengelompokan & chip sub-varian otomatis
  tentukanKelompokKomoditas(
    item: Partial<ItemHargaPangan>,
    petaMaster: Map<string, ItemMasterKomoditas> | null = null
  ): string {
    const nama = String(item?.nama_komoditas || '').trim();
    const kunci = this.kunciKomoditas(nama);
    const master = petaMaster?.get(kunci);
    if (master?.kelompok_komoditas && String(master.kelompok_komoditas).trim()) {
      return String(master.kelompok_komoditas).trim();
    }

    const rendah = nama.toLowerCase();
    if (!rendah) return 'Lainnya';
    if (rendah.includes('beras')) return 'Beras';
    if (rendah.includes('minyak')) return 'Minyak Goreng';
    if (rendah.includes('gula')) return 'Gula';
    if (rendah.includes('cabai') || rendah.includes('cabe') || rendah.includes('rica') || rendah.includes('lombok')) return 'Cabai';
    if (rendah.includes('bawang')) return 'Bawang';
    if (rendah.includes('telur')) return 'Telur';
    if (rendah.includes('daging') || rendah.includes('ayam') || rendah.includes('sapi')) return 'Daging';
    if (rendah.includes('ikan') || rendah.includes('tongkol') || rendah.includes('cakalang') || rendah.includes('tuna') || rendah.includes('deho')) return 'Ikan';
    if (rendah.includes('tepung') || rendah.includes('terigu')) return 'Tepung';

    const kataPertama = nama.split(/\s+/)[0] || 'Lainnya';
    return kataPertama.charAt(0).toUpperCase() + kataPertama.slice(1).toLowerCase();
  }

  // Membangun teks indeks gabungan (nama + induk + kategori + pasar + sinonim DB + sinonim lokal)
  bangunTeksPencarian(
    item: Partial<ItemHargaPangan>,
    petaMaster: Map<string, ItemMasterKomoditas> | null = null
  ): string {
    const nama = String(item?.nama_komoditas || '');
    const kunci = this.kunciKomoditas(nama);
    const master = petaMaster?.get(kunci);
    const kelompok = this.tentukanKelompokKomoditas(item, petaMaster);
    const dasar = `${nama} ${kelompok} ${item?.kategori || ''} ${item?.nama_pasar || ''} ${master?.kata_kunci || ''}`.toLowerCase();

    const tambahanSinonim: string[] = [];
    this.aturanSinonimLokal.forEach((aturan) => {
      if (aturan.cocok.some((kata) => dasar.includes(kata))) {
        tambahanSinonim.push(aturan.tambah);
      }
    });

    return `${dasar} ${tambahanSinonim.join(' ')}`;
  }

  // Menormalisasi penulisan satuan agar seragam dan terkunci per 1 unit (1 KG, 1 Liter, 1 Baki, dst.)
  normalisasiSatuan(satuan?: string): string {
    if (!satuan) return '1 KG';
    const bersih = String(satuan).replace(/[\/]+/g, '').trim();
    if (!bersih) return '1 KG';
    if (/^(1\s*)?(kg|kilogram)$/i.test(bersih)) return '1 KG';
    if (/^(1\s*)?(l|ltr|liter)$/i.test(bersih)) return '1 Liter';

    const cocokSatu = bersih.match(/^1\s+(.+)$/);
    if (cocokSatu) {
      const u = cocokSatu[1].trim();
      if (/^(kg|kilogram)$/i.test(u)) return '1 KG';
      if (/^(l|ltr|liter)$/i.test(u)) return '1 Liter';
      return `1 ${u.charAt(0).toUpperCase() + u.slice(1)}`;
    }

    if (!/^\d/.test(bersih)) {
      return `1 ${bersih.charAt(0).toUpperCase() + bersih.slice(1)}`;
    }
    return bersih;
  }

  // Harga standar langsung menggunakan harga resmi per 1 satuan Master Satuan Admin
  hitungHargaStandar(harga: number, satuan?: string): { hargaStandar: number; labelStandar: string; perluKonversi: boolean } {
    const nominal = Math.round(Number(harga) || 0);
    const teksSatuan = this.normalisasiSatuan(satuan);
    return { hargaStandar: nominal, labelStandar: teksSatuan, perluKonversi: false };
  }

  // Menentukan prioritas tampil komoditas (prioritas_tampil DB -> Master Komoditas -> standar pangan pokok strategis Bapanas)
  tentukanPrioritasKomoditas(
    item: ItemHargaPangan,
    petaMaster: Map<string, ItemMasterKomoditas> | null = null
  ): number {
    const nilaiDB = Number(item?.prioritas_tampil);
    if (Number.isFinite(nilaiDB) && nilaiDB > 0 && nilaiDB !== 50) {
      return nilaiDB;
    }

    const master = petaMaster?.get(this.kunciKomoditas(item?.nama_komoditas));
    const nilaiMaster = Number(master?.prioritas_tampil);
    if (Number.isFinite(nilaiMaster) && nilaiMaster > 0 && nilaiMaster !== 50) {
      return nilaiMaster;
    }

    const nama = (item?.nama_komoditas || '').toLowerCase();
    if (nama.includes('beras')) return 10;
    if (nama.includes('minyak')) return 15;
    if (nama.includes('gula')) return 20;
    if (nama.includes('cabai') || nama.includes('rica')) return 22;
    if (nama.includes('bawang merah')) return 25;
    if (nama.includes('bawang putih')) return 26;
    if (nama.includes('telur')) return 30;
    if (nama.includes('ayam')) return 35;
    if (nama.includes('ikan')) return 36;
    if (nama.includes('sapi') || nama.includes('daging')) return 40;
    if (nama.includes('tepung')) return 42;
    if (nama.includes('kedelai')) return 44;

    const kat = (item?.kategori || '').toLowerCase();
    if (kat === 'bahan pokok') return 48;
    if (kat === 'hewani') return 52;
    if (kat === 'sayuran') return 55;
    if (kat === 'buah') return 60;
    return Number.isFinite(nilaiDB) && nilaiDB > 0 ? nilaiDB : 70;
  }

  kunciKomoditas(nama?: string): string {
    return String(nama || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  kunciKomoditasPasar(namaKomoditas?: string, namaPasar?: string): string {
    return `${this.kunciKomoditas(namaKomoditas)}||${String(namaPasar || '').toLowerCase().trim()}`;
  }

  // Daftar pasar unik murni dari baris DB
  ekstrakDaftarPasarUnik(daftarTerbit: ItemHargaPangan[] = []): string[] {
    const setPasar = new Set<string>();
    (Array.isArray(daftarTerbit) ? daftarTerbit : []).forEach((item) => {
      const p = (item?.nama_pasar || '').trim();
      if (p) setPasar.add(p);
    });
    return Array.from(setPasar).sort((a, b) => a.localeCompare(b, 'id-ID'));
  }

  // Tanggal pembaruan terakhir murni dari stempel waktu DB
  ambilPembaruanTerakhir(daftarTerbit: ItemHargaPangan[] = []): string {
    if (!Array.isArray(daftarTerbit) || daftarTerbit.length === 0) {
      return 'Belum ada data harga terbit';
    }

    let waktuTerbaruMs = 0;
    let tanggalTeksTerbaru = '';

    daftarTerbit.forEach((item) => {
      const kandidat = item?.diperbarui_pada || item?.dibuat_pada;
      if (kandidat) {
        const ms = new Date(kandidat).getTime();
        if (!Number.isNaN(ms) && ms > waktuTerbaruMs) {
          waktuTerbaruMs = ms;
          tanggalTeksTerbaru = item?.tanggal_penetapan || '';
        }
      } else if (!tanggalTeksTerbaru && item?.tanggal_penetapan) {
        tanggalTeksTerbaru = item.tanggal_penetapan;
      }
    });

    if (waktuTerbaruMs > 0) {
      const d = new Date(waktuTerbaruMs);
      const tgl = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return `${tgl} • ${jam} WITA`;
    }

    return tanggalTeksTerbaru || 'Data aktif dari basis data';
  }

  // Peta delta perubahan harga riil dari riwayat_harga_pangan
  buatPetaDeltaTerbaru(daftarRiwayat: any[] = []): PetaDeltaHarga {
    const petaPasar = new Map<string, DeltaHarga>();
    const petaKomoditas = new Map<string, DeltaHarga>();

    if (!Array.isArray(daftarRiwayat)) return { petaPasar, petaKomoditas };

    const terurut = [...daftarRiwayat].sort(
      (a, b) => new Date(b.dicatat_pada || 0).getTime() - new Date(a.dicatat_pada || 0).getTime()
    );

    terurut.forEach((row) => {
      const kPasar = this.kunciKomoditasPasar(row.nama_komoditas, row.nama_pasar);
      if (!petaPasar.has(kPasar)) {
        petaPasar.set(kPasar, {
          selisih: Number(row.selisih) || 0,
          hargaLama: row.harga_lama !== null && row.harga_lama !== undefined ? Number(row.harga_lama) : null,
          hargaBaru: Number(row.harga_baru) || 0,
          dicatatPada: row.dicatat_pada || null,
          keterangan: row.keterangan || ''
        });
      }

      const kKom = this.kunciKomoditas(row.nama_komoditas);
      if (!petaKomoditas.has(kKom)) {
        petaKomoditas.set(kKom, {
          selisih: Number(row.selisih) || 0,
          hargaLama: row.harga_lama !== null && row.harga_lama !== undefined ? Number(row.harga_lama) : null,
          hargaBaru: Number(row.harga_baru) || 0,
          namaPasar: row.nama_pasar || '',
          dicatatPada: row.dicatat_pada || null
        });
      }
    });

    return { petaPasar, petaKomoditas };
  }

  // Statistik badge kategori riil (menyesuaikan pasar terpilih, tanggal & mode tampilan)
  hitungStatistikKategori(
    daftarTerbit: ItemHargaPangan[] = [],
    pasarTerpilih: string[] = [],
    modeTampilan: ModeTampilanHarga = 'ringkasan',
    tanggalFilter: string = 'Semua'
  ): StatistikKategori {
    const hitungan: StatistikKategori = {
      Semua: 0,
      'Bahan Pokok': 0,
      Hewani: 0,
      Sayuran: 0,
      Buah: 0,
      Lainnya: 0
    };

    const setPasar = new Set((pasarTerpilih || []).map((p) => p.toLowerCase()));
    const tglFilter = String(tanggalFilter || 'Semua').trim();
    const tersaring = (Array.isArray(daftarTerbit) ? daftarTerbit : []).filter((item) => {
      if (setPasar.size > 0 && !setPasar.has((item?.nama_pasar || '').toLowerCase())) return false;
      if (tglFilter !== 'Semua' && (item?.tanggal_penetapan || '').trim() !== tglFilter) return false;
      return true;
    });

    if (modeTampilan === 'ringkasan' || modeTampilan === 'matriks') {
      const unik = new Map<string, string>();
      tersaring.forEach((item) => {
        const k = this.kunciKomoditas(item.nama_komoditas);
        if (!unik.has(k)) unik.set(k, item.kategori || 'Lainnya');
      });
      hitungan.Semua = unik.size;
      unik.forEach((kat) => {
        const cocok = this.kategoriBaku.find((b) => b.toLowerCase() === String(kat).toLowerCase());
        if (cocok) hitungan[cocok] += 1;
        else hitungan.Lainnya += 1;
      });
    } else {
      hitungan.Semua = tersaring.length;
      tersaring.forEach((item) => {
        const kat = item.kategori || 'Lainnya';
        const cocok = this.kategoriBaku.find((b) => b.toLowerCase() === String(kat).toLowerCase());
        if (cocok) hitungan[cocok] += 1;
        else hitungan.Lainnya += 1;
      });
    }

    return hitungan;
  }

  saringBarisDasar(
    daftarTerbit: ItemHargaPangan[] = [],
    opsi: {
      kategori?: string;
      pencarian?: string;
      pasarTerpilih?: string[];
      kelompokAktif?: string;
      varianAktif?: string;
      tanggalFilter?: string;
      petaMaster?: Map<string, ItemMasterKomoditas> | null;
    } = {}
  ): ItemHargaPangan[] {
    const {
      kategori = 'Semua',
      pencarian = '',
      pasarTerpilih = [],
      kelompokAktif = 'Semua',
      varianAktif = 'Semua',
      tanggalFilter = 'Semua',
      petaMaster = null
    } = opsi;
    const setPasar = new Set((pasarTerpilih || []).map((p) => p.toLowerCase()));
    const tokenCari = String(pencarian || '')
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const katFilter = String(kategori || 'Semua').toLowerCase();
    const kelFilter = String(kelompokAktif || 'Semua').toLowerCase();
    const varFilter = String(varianAktif || 'Semua').toLowerCase();
    const tglFilter = String(tanggalFilter || 'Semua').trim();

    return (Array.isArray(daftarTerbit) ? daftarTerbit : []).filter((item) => {
      if (setPasar.size > 0 && !setPasar.has((item?.nama_pasar || '').toLowerCase())) return false;
      if (tglFilter !== 'Semua' && (item?.tanggal_penetapan || '').trim() !== tglFilter) return false;
      if (katFilter !== 'semua') {
        const katItem = (item?.kategori || 'Lainnya').toLowerCase();
        if (katFilter === 'lainnya') {
          if (['bahan pokok', 'hewani', 'sayuran', 'buah'].includes(katItem)) return false;
        } else if (katItem !== katFilter) {
          return false;
        }
      }
      if (kelFilter !== 'semua') {
        const kelItem = this.tentukanKelompokKomoditas(item, petaMaster).toLowerCase();
        if (kelItem !== kelFilter) return false;
      }
      if (varFilter !== 'semua') {
        if (this.kunciKomoditas(item?.nama_komoditas) !== varFilter) return false;
      }
      if (tokenCari.length > 0) {
        const teksGabungan = this.bangunTeksPencarian(item, petaMaster);
        if (!tokenCari.every((token) => teksGabungan.includes(token))) return false;
      }
      return true;
    });
  }

  // Mengekstrak daftar kelompok komoditas induk (Beras, Minyak Goreng, Cabai, Bawang, dll.) murni dari data terbit DB
  ekstrakKelompokInduk(
    daftarTerbit: ItemHargaPangan[] = [],
    opsi: {
      kategori?: string;
      pasarTerpilih?: string[];
      tanggalFilter?: string;
      petaMaster?: Map<string, ItemMasterKomoditas> | null;
    } = {}
  ): KelompokIndukAnalisis[] {
    const { kategori = 'Semua', pasarTerpilih = [], tanggalFilter = 'Semua', petaMaster = null } = opsi;
    const baris = this.saringBarisDasar(daftarTerbit, {
      kategori,
      pasarTerpilih,
      kelompokAktif: 'Semua',
      varianAktif: 'Semua',
      tanggalFilter,
      pencarian: '',
      petaMaster
    });

    const petaKelompok = new Map<string, { kelompok: string; varianSet: Set<string>; jumlahData: number; prioritas: number }>();
    baris.forEach((item) => {
      const kelompok = this.tentukanKelompokKomoditas(item, petaMaster);
      const kunciVar = this.kunciKomoditas(item?.nama_komoditas);
      const prioritas = this.tentukanPrioritasKomoditas(item, petaMaster);
      if (!petaKelompok.has(kelompok)) {
        petaKelompok.set(kelompok, {
          kelompok,
          varianSet: new Set([kunciVar]),
          jumlahData: 1,
          prioritas
        });
      } else {
        const entri = petaKelompok.get(kelompok)!;
        entri.varianSet.add(kunciVar);
        entri.jumlahData += 1;
        entri.prioritas = Math.min(entri.prioritas, prioritas);
      }
    });

    return Array.from(petaKelompok.values())
      .map((e) => ({
        kelompok: e.kelompok,
        jumlahVarian: e.varianSet.size,
        jumlahData: e.jumlahData,
        prioritas: e.prioritas
      }))
      .sort((a, b) => {
        if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
        return a.kelompok.localeCompare(b.kelompok, 'id-ID');
      });
  }

  // Mengekstrak daftar sub-varian otomatis (muncul saat cari kata kunci luas seperti "beras" atau pilih induk)
  ekstrakSubVarian(
    daftarTerbit: ItemHargaPangan[] = [],
    opsi: {
      kategori?: string;
      pencarian?: string;
      pasarTerpilih?: string[];
      kelompokAktif?: string;
      tanggalFilter?: string;
      petaMaster?: Map<string, ItemMasterKomoditas> | null;
    } = {}
  ): SubVarianAnalisis[] {
    const { kategori = 'Semua', pencarian = '', pasarTerpilih = [], kelompokAktif = 'Semua', tanggalFilter = 'Semua', petaMaster = null } = opsi;
    const baris = this.saringBarisDasar(daftarTerbit, {
      kategori,
      pencarian,
      pasarTerpilih,
      kelompokAktif,
      varianAktif: 'Semua',
      tanggalFilter,
      petaMaster
    });

    const petaVarian = new Map<
      string,
      { kunci: string; nama_komoditas: string; kelompok: string; satuan: string; hargaMin: number; pasarSet: Set<string>; prioritas: number }
    >();
    baris.forEach((item) => {
      const kunci = this.kunciKomoditas(item?.nama_komoditas);
      if (!kunci) return;
      const harga = Number(item?.harga) || 0;
      const satuan = this.normalisasiSatuan(item?.satuan);
      const prioritas = this.tentukanPrioritasKomoditas(item, petaMaster);
      const kelompok = this.tentukanKelompokKomoditas(item, petaMaster);
      const pasar = String(item?.nama_pasar || '').trim();

      if (!petaVarian.has(kunci)) {
        petaVarian.set(kunci, {
          kunci,
          nama_komoditas: item.nama_komoditas,
          kelompok,
          satuan,
          hargaMin: harga,
          pasarSet: new Set(pasar ? [pasar] : []),
          prioritas
        });
      } else {
        const entri = petaVarian.get(kunci)!;
        if (harga > 0 && (entri.hargaMin === 0 || harga < entri.hargaMin)) {
          entri.hargaMin = harga;
        }
        if (pasar) entri.pasarSet.add(pasar);
        entri.prioritas = Math.min(entri.prioritas, prioritas);
      }
    });

    return Array.from(petaVarian.values())
      .map((e) => ({
        kunci: e.kunci,
        nama_komoditas: e.nama_komoditas,
        kelompok: e.kelompok,
        satuan: e.satuan,
        hargaMin: e.hargaMin,
        jumlahPasar: e.pasarSet.size,
        prioritas: e.prioritas
      }))
      .sort((a, b) => {
        if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
        if (a.hargaMin !== b.hargaMin) return a.hargaMin - b.hargaMin;
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      });
  }

  // Kelompokkan per komoditas lintas pasar (otomatis hitung Pasar Termurah & Termahal + Urutkan)
  kelompokkanPerKomoditas(
    daftarTerbit: ItemHargaPangan[] = [],
    opsi: {
      kategori?: string;
      pencarian?: string;
      pasarTerpilih?: string[];
      kelompokAktif?: string;
      varianAktif?: string;
      tanggalFilter?: string;
      urutkan?: JenisUrutanHarga;
      petaDelta?: PetaDeltaHarga | null;
      petaMaster?: Map<string, ItemMasterKomoditas> | null;
    } = {}
  ): GrupKomoditasAnalisis[] {
    const {
      kategori = 'Semua',
      pencarian = '',
      pasarTerpilih = [],
      kelompokAktif = 'Semua',
      varianAktif = 'Semua',
      tanggalFilter = 'Semua',
      urutkan = 'prioritas',
      petaDelta = null,
      petaMaster = null
    } = opsi;
    const barisTersaring = this.saringBarisDasar(daftarTerbit, {
      kategori,
      pencarian,
      pasarTerpilih,
      kelompokAktif,
      varianAktif,
      tanggalFilter,
      petaMaster
    });
    const grupMap = new Map<
      string,
      { kunci: string; kelompok: string; nama_komoditas: string; kategori: string; prioritas: number; daftarPasarItem: ItemPasarTersaring[] }
    >();

    barisTersaring.forEach((item) => {
      const kunci = this.kunciKomoditas(item.nama_komoditas);
      const satuanRapi = this.normalisasiSatuan(item.satuan);
      const norm = this.hitungHargaStandar(item.harga, satuanRapi);
      const deltaItem = petaDelta?.petaPasar?.get(this.kunciKomoditasPasar(item.nama_komoditas, item.nama_pasar)) || null;
      const kelompok = this.tentukanKelompokKomoditas(item, petaMaster);
      const prioritas = this.tentukanPrioritasKomoditas(item, petaMaster);

      const entri: ItemPasarTersaring = {
        ...item,
        kelompok,
        harga: Number(item.harga) || 0,
        satuan: satuanRapi,
        hargaStandar: norm.hargaStandar,
        labelStandar: norm.labelStandar,
        perluKonversi: norm.perluKonversi,
        delta: deltaItem
      };

      if (!grupMap.has(kunci)) {
        grupMap.set(kunci, {
          kunci,
          kelompok,
          nama_komoditas: item.nama_komoditas,
          kategori: item.kategori || 'Bahan Pokok',
          prioritas,
          daftarPasarItem: [entri]
        });
      } else {
        const g = grupMap.get(kunci)!;
        g.daftarPasarItem.push(entri);
        g.prioritas = Math.min(g.prioritas, prioritas);
      }
    });

    const hasil: GrupKomoditasAnalisis[] = Array.from(grupMap.values()).map((grup) => {
      const pasarTerurut = [...grup.daftarPasarItem].sort((a, b) => {
        if (a.hargaStandar !== b.hargaStandar) return a.hargaStandar - b.hargaStandar;
        return a.harga - b.harga;
      });

      const termurah = pasarTerurut[0];
      const termahal = pasarTerurut[pasarTerurut.length - 1];
      const rataStandar = Math.round(pasarTerurut.reduce((acc, p) => acc + p.hargaStandar, 0) / pasarTerurut.length);
      const rataAsli = Math.round(pasarTerurut.reduce((acc, p) => acc + p.harga, 0) / pasarTerurut.length);
      const totalDilihat = pasarTerurut.reduce((acc, p) => acc + (Number(p.jumlah_dilihat) || 0), 0);

      const terbaruItem = [...pasarTerurut].sort(
        (a, b) => new Date(b.diperbarui_pada || b.dibuat_pada || 0).getTime() -
          new Date(a.diperbarui_pada || a.dibuat_pada || 0).getTime()
      )[0];

      const deltaKandidat = pasarTerurut
        .map((p) => p.delta)
        .filter((d): d is DeltaHarga => Boolean(d))
        .sort((a, b) => new Date(b.dicatatPada || 0).getTime() - new Date(a.dicatatPada || 0).getTime());

      const deltaTerbaru = deltaKandidat[0] || petaDelta?.petaKomoditas?.get(grup.kunci) || null;
      const adaPerbedaanHarga = pasarTerurut.length > 1 && termurah.hargaStandar !== termahal.hargaStandar;

      return {
        id: String(termurah.id || grup.kunci),
        kunci: grup.kunci,
        kelompok: grup.kelompok,
        nama_komoditas: grup.nama_komoditas,
        kategori: grup.kategori,
        satuanUtama: termurah.satuan,
        labelStandar: termurah.labelStandar,
        prioritas: grup.prioritas,
        totalDilihat,
        jumlahPasar: pasarTerurut.length,
        daftarPasarItem: pasarTerurut,
        pasarTermurah: termurah,
        pasarTermahal: termahal,
        hargaMin: termurah.harga,
        hargaMax: termahal.harga,
        hargaStandarMin: termurah.hargaStandar,
        hargaStandarMax: termahal.hargaStandar,
        hargaRataRata: rataAsli,
        hargaStandarRataRata: rataStandar,
        adaPerbedaanHarga,
        deltaTerbaru,
        tanggalPenetapanTerbaru: terbaruItem?.tanggal_penetapan || '-',
        diperbaruiPadaTerbaru: terbaruItem?.diperbarui_pada || terbaruItem?.dibuat_pada || null
      };
    });

    hasil.sort((a, b) => {
      if (urutkan === 'termurah') {
        if (a.hargaStandarMin !== b.hargaStandarMin) return a.hargaStandarMin - b.hargaStandarMin;
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      }
      if (urutkan === 'termahal') {
        if (a.hargaStandarMax !== b.hargaStandarMax) return b.hargaStandarMax - a.hargaStandarMax;
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      }
      if (urutkan === 'terpopuler') {
        if (b.totalDilihat !== a.totalDilihat) return b.totalDilihat - a.totalDilihat;
        if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      }
      if (urutkan === 'abjad') {
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      }
      if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
      if (b.totalDilihat !== a.totalDilihat) return b.totalDilihat - a.totalDilihat;
      return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
    });

    return hasil;
  }

  // Susun daftar datar (1 kartu per pasar) dengan penanda otomatis Termurah/Termahal
  susunDaftarSemuaPasar(
    daftarTerbit: ItemHargaPangan[] = [],
    opsi: {
      kategori?: string;
      pencarian?: string;
      pasarTerpilih?: string[];
      kelompokAktif?: string;
      varianAktif?: string;
      tanggalFilter?: string;
      urutkan?: JenisUrutanHarga;
      petaDelta?: PetaDeltaHarga | null;
      petaMaster?: Map<string, ItemMasterKomoditas> | null;
    } = {}
  ): ItemSemuaPasarAnalisis[] {
    const {
      kategori = 'Semua',
      pencarian = '',
      pasarTerpilih = [],
      kelompokAktif = 'Semua',
      varianAktif = 'Semua',
      tanggalFilter = 'Semua',
      urutkan = 'prioritas',
      petaDelta = null,
      petaMaster = null
    } = opsi;
    const grupList = this.kelompokkanPerKomoditas(daftarTerbit, {
      kategori,
      pencarian,
      pasarTerpilih,
      kelompokAktif,
      varianAktif,
      tanggalFilter,
      urutkan: 'prioritas',
      petaDelta,
      petaMaster
    });

    const datar: ItemSemuaPasarAnalisis[] = [];
    grupList.forEach((grup) => {
      grup.daftarPasarItem.forEach((item) => {
        let posisiPasar: 'termurah' | 'termahal' | 'tengah' | 'tunggal' = 'tunggal';
        if (grup.jumlahPasar > 1 && grup.adaPerbedaanHarga) {
          if (item.hargaStandar === grup.hargaStandarMin) posisiPasar = 'termurah';
          else if (item.hargaStandar === grup.hargaStandarMax) posisiPasar = 'termahal';
          else posisiPasar = 'tengah';
        }
        datar.push({
          ...item,
          kelompok: grup.kelompok,
          prioritas: grup.prioritas,
          totalDilihat: Number(item.jumlah_dilihat) || 0,
          posisiPasar,
          grupKomoditas: grup
        });
      });
    });

    datar.sort((a, b) => {
      if (urutkan === 'termurah') {
        if (a.hargaStandar !== b.hargaStandar) return a.hargaStandar - b.hargaStandar;
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      }
      if (urutkan === 'termahal') {
        if (a.hargaStandar !== b.hargaStandar) return b.hargaStandar - a.hargaStandar;
        return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      }
      if (urutkan === 'terpopuler') {
        if (b.totalDilihat !== a.totalDilihat) return b.totalDilihat - a.totalDilihat;
        return a.prioritas - b.prioritas;
      }
      if (urutkan === 'abjad') {
        const cmp = a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
        return cmp !== 0 ? cmp : a.hargaStandar - b.hargaStandar;
      }
      if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
      const cmp = a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
      return cmp !== 0 ? cmp : a.hargaStandar - b.hargaStandar;
    });

    return datar;
  }

  // Susun Matriks Perbandingan Pasar (Baris = Varian Komoditas, Kolom = Pasar)
  susunMatriksPerbandinganPasar(
    daftarTerbit: ItemHargaPangan[] = [],
    opsi: {
      kategori?: string;
      pencarian?: string;
      pasarTerpilih?: string[];
      kelompokAktif?: string;
      varianAktif?: string;
      tanggalFilter?: string;
      urutkan?: JenisUrutanHarga;
      petaDelta?: PetaDeltaHarga | null;
      petaMaster?: Map<string, ItemMasterKomoditas> | null;
    } = {}
  ): HasilMatriksPerbandingan {
    const {
      kategori = 'Semua',
      pencarian = '',
      pasarTerpilih = [],
      kelompokAktif = 'Semua',
      varianAktif = 'Semua',
      tanggalFilter = 'Semua',
      urutkan = 'prioritas',
      petaDelta = null,
      petaMaster = null
    } = opsi;
    const grupList = this.kelompokkanPerKomoditas(daftarTerbit, {
      kategori,
      pencarian,
      pasarTerpilih,
      kelompokAktif,
      varianAktif,
      tanggalFilter,
      urutkan,
      petaDelta,
      petaMaster
    });

    let daftarKolomPasar: string[] = [];
    if (Array.isArray(pasarTerpilih) && pasarTerpilih.length > 0) {
      daftarKolomPasar = [...pasarTerpilih].sort((a, b) => a.localeCompare(b, 'id-ID'));
    } else {
      const setPasar = new Set<string>();
      grupList.forEach((g) => {
        g.daftarPasarItem.forEach((p) => {
          if (p?.nama_pasar) setPasar.add(p.nama_pasar);
        });
      });
      daftarKolomPasar =
        setPasar.size > 0
          ? Array.from(setPasar).sort((a, b) => a.localeCompare(b, 'id-ID'))
          : this.ekstrakDaftarPasarUnik(daftarTerbit);
    }

    const daftarBarisMatriks: BarisMatriksPasar[] = grupList.map((grup) => {
      const selPerPasar: Record<string, SelMatriksPasar> = {};
      grup.daftarPasarItem.forEach((item) => {
        const namaPasar = item.nama_pasar;
        if (!namaPasar) return;
        let posisi: 'termurah' | 'termahal' | 'tengah' | 'tunggal' = 'tunggal';
        if (grup.jumlahPasar > 1 && grup.adaPerbedaanHarga) {
          if (item.hargaStandar === grup.hargaStandarMin) posisi = 'termurah';
          else if (item.hargaStandar === grup.hargaStandarMax) posisi = 'termahal';
          else posisi = 'tengah';
        }
        const sudahAda = selPerPasar[namaPasar];
        const waktuBaru = new Date(item.diperbarui_pada || item.dibuat_pada || 0).getTime();
        const waktuLama = sudahAda
          ? new Date(sudahAda.item.diperbarui_pada || sudahAda.item.dibuat_pada || 0).getTime()
          : -1;
        if (!sudahAda || waktuBaru >= waktuLama) {
          selPerPasar[namaPasar] = {
            harga: item.harga,
            satuan: item.satuan,
            hargaStandar: item.hargaStandar,
            posisi,
            delta: item.delta,
            item
          };
        }
      });

      return {
        ...grup,
        selPerPasar
      };
    });

    return {
      daftarKolomPasar,
      daftarBarisMatriks
    };
  }

  formatRupiah(angka: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(angka) || 0).replace('IDR', 'Rp');
  }

  formatTanggalRingkas(isoString?: string | null): string {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTanggalWaktu(isoString?: string | null): string {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export const analisisHargaMobileService = new AnalisisHargaMobileService();
