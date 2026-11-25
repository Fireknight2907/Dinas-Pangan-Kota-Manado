// ===================================================================================
// MODUL LAYANAN LAPORAN RESMI DAN STATISTIK PANGAN (OOP) - MOBILE
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Mengolah tren fluktuasi harga pangan 100% dari tabel riwayat_harga_pangan
//         Supabase (tanpa simulasi garis datar / tanpa harga palsu Rp 15.000),
//         rekapitulasi GPM riil (tanpa kalkulasi distribusi fiktif), dan ekspor CSV
//         resmi dengan penandatangan dinamis.
// ===================================================================================

import { riwayatHargaMobileService } from './RiwayatHargaService';

export interface TitikTrenHarga {
  tanggal: string;
  tanggalLengkap: string;
  harga: number;
  hargaLama: number | null;
  selisih: number;
  pasar: string;
  keterangan?: string;
}

export interface DataTrenKomoditas {
  adaData: boolean;
  sumber: 'riwayat' | 'snapshot' | 'kosong';
  jumlahCatatan: number;
  namaKomoditas: string;
  periode: string;
  pasar: string;
  hargaTerkini: number;
  hargaAwal: number;
  hargaTertinggi: number;
  hargaTerendah: number;
  rataRata: number;
  selisih: number;
  persentase: string;
  statusTren: 'Naik' | 'Turun' | 'Stabil';
  titikData: TitikTrenHarga[];
}

export interface ItemRekapGPM {
  id: string;
  nama_acara: string;
  lokasi: string;
  kecamatan: string;
  tanggal: string;
  target_kuota: number;
  terdaftar: number;
  terlayani: number;
  status: string;
  komoditas_tersedia?: string;
}

export interface InfoPenandatangan {
  nama?: string;
  nip?: string;
}

class LaporanMobileService {
  instansi = 'Dinas Pangan Kota Manado';
  bidangResmi = 'Bidang Cadangan dan Distribusi Pangan';

  private konversiPeriodeKeHari(periode: string = '7hari'): number {
    if (periode === '7hari') return 7;
    if (periode === '30hari') return 30;
    if (periode === '3bulan') return 90;
    return 30;
  }

  private formatLabelTanggalTitik(isoString?: string, tampilkanJam: boolean = false): string {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    if (tampilkanJam) {
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  }

  private hitungMetrikDariTitik(params: {
    namaKomoditas: string;
    periode: string;
    pasar: string;
    sumber: 'riwayat' | 'snapshot' | 'kosong';
    jumlahCatatan: number;
    titikData: TitikTrenHarga[];
  }): DataTrenKomoditas {
    const { namaKomoditas, periode, pasar, sumber, jumlahCatatan, titikData } = params;
    const hargaAngka = titikData.map(d => Number(d.harga) || 0);
    const hargaAwal = hargaAngka[0] || 0;
    const hargaTerkini = hargaAngka[hargaAngka.length - 1] || 0;
    const hargaTertinggi = hargaAngka.length > 0 ? Math.max(...hargaAngka) : 0;
    const hargaTerendah = hargaAngka.length > 0 ? Math.min(...hargaAngka) : 0;
    const rataRata = hargaAngka.length > 0
      ? Math.round(hargaAngka.reduce((acc, c) => acc + c, 0) / hargaAngka.length)
      : 0;

    const selisih = hargaTerkini - hargaAwal;
    const persentase = hargaAwal > 0 ? ((selisih / hargaAwal) * 100).toFixed(1) : '0.0';

    let statusTren: 'Naik' | 'Turun' | 'Stabil' = 'Stabil';
    if (selisih > 0) statusTren = 'Naik';
    else if (selisih < 0) statusTren = 'Turun';

    return {
      adaData: titikData.length > 0,
      sumber,
      jumlahCatatan,
      namaKomoditas,
      periode,
      pasar,
      hargaTerkini,
      hargaAwal,
      hargaTertinggi,
      hargaTerendah,
      rataRata,
      selisih,
      persentase: String(Math.abs(Number(persentase))),
      statusTren,
      titikData
    };
  }

  // 1. Data Tren Fluktuasi Harga Komoditas Kadis — 100% RIIL dari tabel riwayat_harga_pangan Supabase
  async ambilDataTrenKomoditas(
    namaKomoditas: string = '',
    periode: string = '7hari',
    namaPasar: string = 'Semua',
    dataHargaKoleksi: any[] = []
  ): Promise<DataTrenKomoditas> {
    const namaBersih = String(namaKomoditas || '').trim();
    const pasarBersih = String(namaPasar || 'Semua').trim() || 'Semua';

    const hasilKosong: DataTrenKomoditas = {
      adaData: false,
      sumber: 'kosong',
      jumlahCatatan: 0,
      namaKomoditas: namaBersih,
      periode,
      pasar: pasarBersih,
      hargaTerkini: 0,
      hargaAwal: 0,
      hargaTertinggi: 0,
      hargaTerendah: 0,
      rataRata: 0,
      selisih: 0,
      persentase: '0.0',
      statusTren: 'Stabil',
      titikData: []
    };

    if (!namaBersih) return hasilKosong;

    const rentangHari = this.konversiPeriodeKeHari(periode);
    const pasarTerpilih = pasarBersih !== 'Semua' ? [pasarBersih] : [];

    let riwayatKronologis: any[] = [];
    try {
      const hasilRiwayat = await riwayatHargaMobileService.ambilRiwayatKomoditas(namaBersih, {
        pasarTerpilih,
        rentangHari
      });
      if (Array.isArray(hasilRiwayat?.riwayatKronologis)) {
        riwayatKronologis = hasilRiwayat.riwayatKronologis;
      }
    } catch (err: any) {
      console.warn('Gagal memuat riwayat_harga_pangan untuk grafik Kadis mobile:', err?.message);
    }

    // A. Prioritas Utama: Data historis riil dari tabel riwayat_harga_pangan
    if (riwayatKronologis.length > 0) {
      let titikData: TitikTrenHarga[] = [];
      if (pasarBersih === 'Semua') {
        const perTanggal = new Map<string, { total: number; jumlah: number; pasarSet: Set<string> }>();
        riwayatKronologis.forEach((r) => {
          const tglKey = this.formatLabelTanggalTitik(r.dicatat_pada, false);
          if (!perTanggal.has(tglKey)) {
            perTanggal.set(tglKey, { total: 0, jumlah: 0, pasarSet: new Set() });
          }
          const b = perTanggal.get(tglKey)!;
          b.total += Number(r.harga_baru) || 0;
          b.jumlah += 1;
          if (r.nama_pasar) b.pasarSet.add(r.nama_pasar);
        });
        titikData = Array.from(perTanggal.entries()).slice(-20).map(([tglKey, b]) => ({
          tanggal: tglKey,
          tanggalLengkap: `${tglKey} (Rata-rata ${b.pasarSet.size || 1} pasar)`,
          harga: Math.round(b.total / (b.jumlah || 1)),
          hargaLama: null,
          selisih: 0,
          pasar: `Rata-rata (${b.pasarSet.size || 1} pasar)`,
          keterangan: ''
        }));
      } else {
        const potongan = riwayatKronologis.slice(-20);
        const hariUnik = new Set(potongan.map(r => this.formatLabelTanggalTitik(r.dicatat_pada, false)));
        const pakaiJam = potongan.length > 1 && hariUnik.size < potongan.length;

        titikData = potongan.map((r) => ({
          tanggal: this.formatLabelTanggalTitik(r.dicatat_pada, pakaiJam),
          tanggalLengkap: r.dicatat_pada
            ? new Date(r.dicatat_pada).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })
            : '-',
          harga: Number(r.harga_baru) || 0,
          hargaLama: r.harga_lama !== null && r.harga_lama !== undefined ? Number(r.harga_lama) : null,
          selisih: Number(r.selisih) || 0,
          pasar: r.nama_pasar || '-',
          keterangan: r.keterangan || ''
        }));
      }

      return this.hitungMetrikDariTitik({
        namaKomoditas: namaBersih,
        periode,
        pasar: pasarBersih,
        sumber: 'riwayat',
        jumlahCatatan: riwayatKronologis.length,
        titikData
      });
    }

    // B. Jika belum ada riwayat perubahan di rentang waktu ini, tampilkan snapshot riil saat ini dari DB (TANPA duplikasi tanggal fiktif)
    const sumberHarga: any[] = Array.isArray(dataHargaKoleksi) ? dataHargaKoleksi : [];
    let cocok = sumberHarga.filter(i =>
      (i.nama_komoditas || '').toLowerCase().trim() === namaBersih.toLowerCase()
    );
    if (pasarBersih !== 'Semua') {
      cocok = cocok.filter(i => (i.nama_pasar || '').toLowerCase().trim() === pasarBersih.toLowerCase());
    }

    if (cocok.length > 0) {
      const titikData: TitikTrenHarga[] = cocok.map((c, idx) => ({
        tanggal: cocok.length > 1
          ? (c.nama_pasar ? c.nama_pasar.replace(/^Pasar\s+/i, '') : `Pasar ${idx + 1}`)
          : (c.tanggal_penetapan || 'Terkini'),
        tanggalLengkap: `${c.nama_pasar || '-'} (${c.tanggal_penetapan || 'Terkini'})`,
        harga: Number(c.harga) || 0,
        hargaLama: null,
        selisih: 0,
        pasar: c.nama_pasar || '-',
        keterangan: 'Harga acuan terkini (belum ada riwayat perubahan pada periode ini)'
      }));

      return this.hitungMetrikDariTitik({
        namaKomoditas: namaBersih,
        periode,
        pasar: pasarBersih,
        sumber: 'snapshot',
        jumlahCatatan: titikData.length,
        titikData
      });
    }

    // C. Jika tidak ada data sama sekali di database, kembalikan kosong jujur (BUKAN Rp 15.000)
    return hasilKosong;
  }

  // 2. Ekspor Laporan Komoditas Pangan ke Format CSV (Kop Surat Resmi + Penandatangan Dinamis)
  eksporLaporanHargaCSV(daftarKomoditas: any[], penandatangan: InfoPenandatangan = {}): boolean {
    if (!daftarKomoditas || daftarKomoditas.length === 0) {
      alert('Tidak ada data komoditas pangan untuk diunduh.');
      return false;
    }

    const totalKomoditas = daftarKomoditas.length;
    const totalTerbit = daftarKomoditas.filter(i => (i.status || '').toLowerCase() === 'terbit').length;
    const totalDraft = totalKomoditas - totalTerbit;
    const tanggalCetak = new Date().toLocaleString('id-ID');

    const namaPejabat = (penandatangan?.nama || '').trim();
    const barisNama = namaPejabat ? `( ${namaPejabat} )` : '( ........................................ )';
    const barisNip = (penandatangan?.nip && String(penandatangan.nip).trim())
      ? `NIP. ${String(penandatangan.nip).trim()}`
      : 'NIP. ........................................';

    let csv = '\uFEFF'; // Karakter UTF-8 BOM untuk Microsoft Excel
    csv += 'PEMERINTAH KOTA MANADO\n';
    csv += 'DINAS PANGAN KOTA MANADO\n';
    csv += 'BIDANG CADANGAN DAN DISTRIBUSI PANGAN\n';
    csv += 'Alamat: Jl. Balai Kota No. 1, Tikala, Kota Manado, Sulawesi Utara\n\n';

    csv += 'LAPORAN RESMI REKAPITULASI HARGA PANGAN POKOK DAN STRATEGIS\n';
    csv += `Waktu Unduh Laporan,"${tanggalCetak}"\n`;
    csv += `Instansi Penanggung Jawab,"${this.bidangResmi} - ${this.instansi}"\n`;
    csv += `Status Dokumen,"RESMI & TERVALIDASI KEDINASAN"\n\n`;

    csv += 'RINGKASAN STATISTIK KOMODITAS\n';
    csv += `Total Komoditas Terdata,${totalKomoditas}\n`;
    csv += `Komoditas Terbit (Publik),${totalTerbit}\n`;
    csv += `Komoditas Draf (Menunggu Verifikasi),${totalDraft}\n\n`;

    csv += 'TABEL RINCIAN HARGA KOMODITAS PANGAN PASAR TRADISIONAL\n';
    csv += 'No,Nama Komoditas Pangan,Kategori Pangan,Satuan Kuantitas,Harga Acuan (Rp),Pasar Tradisional Pantauan,Tanggal Penetapan,Status Verifikasi,Instansi Pengelola\n';

    daftarKomoditas.forEach((item, idx) => {
      const no = idx + 1;
      const nama = `"${(item.nama_komoditas || '').replace(/"/g, '""')}"`;
      const kategori = `"${(item.kategori || 'Bahan Pokok').replace(/"/g, '""')}"`;
      const satuan = `"${(item.satuan || '1 KG').replace(/"/g, '""')}"`;
      const harga = item.harga || 0;
      const pasar = `"${(item.nama_pasar || '-').replace(/"/g, '""')}"`;
      const tgl = `"${(item.tanggal_penetapan || '-').replace(/"/g, '""')}"`;
      const status = `"${(item.status || 'Terbit').replace(/"/g, '""')}"`;
      const instansi = `"${this.bidangResmi}"`;
      csv += `${no},${nama},${kategori},${satuan},${harga},${pasar},${tgl},${status},${instansi}\n`;
    });

    csv += '\nLEMBAR PENGESAHAN DOKUMEN RESMI\n';
    csv += 'Mengetahui dan Mengesahkan:\n';
    csv += 'Kepala Bidang Cadangan dan Distribusi Pangan\n';
    csv += 'Dinas Pangan Pemerintah Kota Manado\n\n\n';
    csv += `${barisNama}\n`;
    csv += `${barisNip}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const tautan = document.createElement('a');
    tautan.setAttribute('href', url);
    tautan.setAttribute('download', `Laporan_Resmi_Harga_Pangan_Manado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
    URL.revokeObjectURL(url);
    return true;
  }

  // 3. Ekspor Rekapitulasi Seluruh Kegiatan GPM ke Format CSV (Kop Surat Resmi + Penandatangan Dinamis)
  eksporRekapitulasiSemuaGPMCSV(daftarRekap: ItemRekapGPM[], penandatangan: InfoPenandatangan = {}): boolean {
    if (!daftarRekap || daftarRekap.length === 0) {
      alert('Tidak ada data rekapitulasi GPM untuk diunduh.');
      return false;
    }
    const totalAcara = daftarRekap.length;
    const totalKuota = daftarRekap.reduce((acc, r) => acc + (r.target_kuota || 0), 0);
    const totalTerdaftar = daftarRekap.reduce((acc, r) => acc + (r.terdaftar || 0), 0);
    const totalTerlayani = daftarRekap.reduce((acc, r) => acc + (r.terlayani || 0), 0);
    const persentase = totalKuota > 0 ? ((totalTerlayani / totalKuota) * 100).toFixed(1) : '0.0';

    const namaPejabat = (penandatangan?.nama || '').trim();
    const barisNama = namaPejabat ? `( ${namaPejabat} )` : '( ........................................ )';
    const barisNip = (penandatangan?.nip && String(penandatangan.nip).trim())
      ? `NIP. ${String(penandatangan.nip).trim()}`
      : 'NIP. ........................................';

    let csv = '\uFEFF';
    csv += 'PEMERINTAH KOTA MANADO\n';
    csv += 'DINAS PANGAN KOTA MANADO\n';
    csv += 'BIDANG CADANGAN DAN DISTRIBUSI PANGAN\n';
    csv += 'Alamat: Jl. Balai Kota No. 1, Tikala, Kota Manado, Sulawesi Utara\n\n';

    csv += 'LAPORAN EKSEKUTIF REKAPITULASI PELAKSANAAN GERAKAN PANGAN MURAH (GPM)\n';
    csv += `Waktu Unduh Laporan,"${new Date().toLocaleString('id-ID')}"\n`;
    csv += `Instansi Penanggung Jawab,"${this.bidangResmi} - ${this.instansi}"\n`;
    csv += `Status Dokumen,"RESMI & TERVALIDASI KEDINASAN"\n\n`;

    csv += 'RINGKASAN EKSEKUTIF PENYALURAN GPM KOTA MANADO\n';
    csv += `Total Titik Kegiatan,${totalAcara}\n`;
    csv += `Total Alokasi Kuota,${totalKuota} KK\n`;
    csv += `Total Warga Mendaftar,${totalTerdaftar} Warga\n`;
    csv += `Total Warga Terlayani,${totalTerlayani} KK\n`;
    csv += `Tingkat Penyerapan Kuota,${persentase}%\n\n`;

    csv += 'TABEL RINCIAN KEGIATAN GERAKAN PANGAN MURAH\n';
    csv += 'No,Nama Kegiatan GPM,Lokasi Pelaksanaan,Wilayah Kecamatan,Tanggal Pelaksanaan,Target Kuota (KK),Warga Terdaftar,Warga Terlayani (Hadir),Status Pelaksanaan,Komoditas Disediakan\n';

    daftarRekap.forEach((r, idx) => {
      const no = idx + 1;
      const nama = `"${(r.nama_acara || '').replace(/"/g, '""')}"`;
      const lokasi = `"${(r.lokasi || '').replace(/"/g, '""')}"`;
      const kec = `"${(r.kecamatan || '-').replace(/"/g, '""')}"`;
      const tgl = `"${(r.tanggal || '-').replace(/"/g, '""')}"`;
      const kuota = r.target_kuota || 0;
      const terdaftar = r.terdaftar || 0;
      const terlayani = r.terlayani || 0;
      const status = `"${(r.status || 'Aktif').replace(/"/g, '""')}"`;
      const komoditas = `"${(r.komoditas_tersedia || '-').replace(/"/g, '""')}"`;
      csv += `${no},${nama},${lokasi},${kec},${tgl},${kuota},${terdaftar},${terlayani},${status},${komoditas}\n`;
    });

    csv += '\nLEMBAR PENGESAHAN DOKUMEN RESMI\n';
    csv += 'Mengetahui dan Mengesahkan:\n';
    csv += 'Kepala Dinas Pangan Pemerintah Kota Manado\n\n\n';
    csv += `${barisNama}\n`;
    csv += `${barisNip}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Eksekutif_GPM_Manado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
}

export const laporanMobileService = new LaporanMobileService();
