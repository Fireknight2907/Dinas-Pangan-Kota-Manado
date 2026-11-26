// ===================================================================================
// MODUL LAYANAN LAPORAN RESMI, EKSPOR EXCEL (.xlsx), & CETAK PDF (OOP - WEBSITE)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Mengolah tren fluktuasi harga pangan 100% dari tabel riwayat_harga_pangan
//         Supabase (tanpa simulasi / tanpa harga palsu), ekspor Excel resmi (.xlsx)
//         multi-sheet berformat kedinasan, cetak PDF anti-halaman-kosong (iframe A4),
//         serta ekspor CSV cadangan ramah Excel Indonesia (delimiter titik koma).
// ===================================================================================

import { riwayatHargaService } from './RiwayatHargaService.js';
import { excelResmiService } from './ExcelResmiService.js';

class LaporanService {
    constructor() {
        this.instansi = 'Dinas Pangan Kota Manado';
        this.bidangResmi = 'Bidang Cadangan dan Distribusi Pangan';
        this.alamatResmi = 'Jl. Balai Kota No. 1, Tikala, Kota Manado, Sulawesi Utara';
    }

    konversiPeriodeKeHari(periode = '7hari') {
        if (periode === '7hari') return 7;
        if (periode === '30hari') return 30;
        if (periode === '3bulan') return 90;
        return 30;
    }

    formatLabelTanggalTitik(isoString, tampilkanJam = false) {
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

    escapeHtml(teks) {
        return String(teks ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatRupiah(nilai) {
        return `Rp ${(Number(nilai) || 0).toLocaleString('id-ID')}`;
    }

    normalisasiOpsiLaporan(opsiAtauPenandatangan = {}, defaultJabatan = 'Kepala Bidang Cadangan dan Distribusi Pangan') {
        const isFormatBaru = Boolean(
            opsiAtauPenandatangan &&
            (Object.prototype.hasOwnProperty.call(opsiAtauPenandatangan, 'penandatangan') ||
                Object.prototype.hasOwnProperty.call(opsiAtauPenandatangan, 'filter') ||
                Object.prototype.hasOwnProperty.call(opsiAtauPenandatangan, 'jabatanPenandatangan'))
        );

        const penandatangan = isFormatBaru ? (opsiAtauPenandatangan.penandatangan || {}) : (opsiAtauPenandatangan || {});
        const filter = isFormatBaru ? (opsiAtauPenandatangan.filter || {}) : {};
        const jabatan = (isFormatBaru && opsiAtauPenandatangan.jabatanPenandatangan)
            ? String(opsiAtauPenandatangan.jabatanPenandatangan).trim()
            : defaultJabatan;

        const namaPejabat = String(penandatangan?.nama || '').trim();
        const nipPejabat = String(penandatangan?.nip || '').trim();
        const barisNama = namaPejabat ? `( ${namaPejabat} )` : '( ........................................ )';
        const barisNip = nipPejabat ? `NIP. ${nipPejabat}` : 'NIP. ........................................';

        const skrg = new Date();
        const tanggalCetakWITA = `${skrg.toLocaleString('id-ID', {
            timeZone: 'Asia/Makassar',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })} WITA`;
        const tanggalTtdID = skrg.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Makassar',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const slugTanggal = skrg.toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });

        return {
            penandatangan,
            filter,
            jabatan,
            namaPejabat,
            barisNama,
            barisNip,
            tanggalCetakWITA,
            tanggalTtdID,
            slugTanggal
        };
    }

    normalisasiItemRekapGPM(r = {}) {
        const kuota = Math.max(0, Number(r.target_kuota ?? r.kuota_maksimal ?? 0) || 0);
        const terdaftar = Math.max(0, Number(r.terdaftar ?? r.antrean_terisi ?? 0) || 0);
        const terlayani = Math.max(0, Number(r.terlayani ?? r.total_hadir ?? 0) || 0);
        const serapan = kuota > 0 ? Math.min(100, Number(((terlayani / kuota) * 100).toFixed(1))) : 0;
        return {
            id: String(r.id || ''),
            nama_acara: r.nama_acara || 'Kegiatan GPM Manado',
            lokasi: r.lokasi || '-',
            kecamatan: r.kecamatan || '-',
            tanggal: r.tanggal ? String(r.tanggal).split('T')[0] : '-',
            jam: `${r.jam_mulai || '08:00'} - ${r.jam_selesai || '14:00'} WITA`,
            target_kuota: kuota,
            terdaftar,
            terlayani,
            serapan,
            status: r.status || 'Aktif',
            komoditas_tersedia: r.komoditas_tersedia || '-'
        };
    }

    // 1. Data Tren Fluktuasi Harga Komoditas Kadis — 100% RIIL dari tabel riwayat_harga_pangan Supabase
    async ambilDataTrenKomoditas(namaKomoditas = '', periode = '7hari', namaPasar = 'Semua', dataHargaKoleksi = []) {
        const namaBersih = String(namaKomoditas || '').trim();
        const pasarBersih = String(namaPasar || 'Semua').trim() || 'Semua';

        const hasilKosong = {
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
            persentase: 0,
            statusTren: 'Stabil',
            titikData: []
        };

        if (!namaBersih) return hasilKosong;

        const rentangHari = this.konversiPeriodeKeHari(periode);
        const pasarTerpilih = pasarBersih !== 'Semua' ? [pasarBersih] : [];

        let riwayatKronologis = [];
        try {
            const hasilRiwayat = await riwayatHargaService.ambilRiwayatKomoditas(namaBersih, {
                pasarTerpilih,
                rentangHari
            });
            if (Array.isArray(hasilRiwayat?.riwayatKronologis)) {
                riwayatKronologis = hasilRiwayat.riwayatKronologis;
            }
        } catch (err) {
            console.warn('Gagal memuat riwayat_harga_pangan untuk grafik Kadis:', err?.message);
        }

        // A. Prioritas Utama: Data historis riil dari tabel riwayat_harga_pangan
        if (riwayatKronologis.length > 0) {
            let titikData = [];
            if (pasarBersih === 'Semua') {
                const perHari = new Map();
                riwayatKronologis.forEach((r) => {
                    const d = new Date(r.dicatat_pada || 0);
                    const kunciHari = Number.isNaN(d.getTime())
                        ? String(r.dicatat_pada || '').slice(0, 10) || 'lainnya'
                        : d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
                    if (!perHari.has(kunciHari)) {
                        perHari.set(kunciHari, {
                            label: this.formatLabelTanggalTitik(r.dicatat_pada, false),
                            hargaPerPasar: new Map()
                        });
                    }
                    const bucket = perHari.get(kunciHari);
                    const kunciPasar = String(r.nama_pasar || 'Pasar').trim().toLowerCase();
                    bucket.hargaPerPasar.set(kunciPasar, Number(r.harga_baru) || 0);
                });

                const daftarHariTerurut = Array.from(perHari.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .slice(-30);

                let hargaSebelumnya = null;
                titikData = daftarHariTerurut.map(([, b], idx) => {
                    const nilaiPasar = Array.from(b.hargaPerPasar.values()).filter((v) => v > 0);
                    const rataHari = nilaiPasar.length > 0
                        ? Math.round(nilaiPasar.reduce((acc, v) => acc + v, 0) / nilaiPasar.length)
                        : 0;
                    const hargaLama = idx > 0 && hargaSebelumnya !== null ? hargaSebelumnya : null;
                    const selisihHari = hargaLama !== null ? rataHari - hargaLama : 0;
                    hargaSebelumnya = rataHari;
                    const jmlPasar = b.hargaPerPasar.size || 1;
                    return {
                        tanggal: b.label,
                        tanggalLengkap: `${b.label} (Rata-rata ${jmlPasar} pasar)`,
                        harga: rataHari,
                        hargaLama,
                        selisih: selisihHari,
                        pasar: `Rata-rata (${jmlPasar} pasar)`,
                        keterangan: idx === 0
                            ? 'Titik awal periode pantauan'
                            : selisihHari > 0
                                ? 'Rata-rata kota naik dibanding hari sebelumnya'
                                : selisihHari < 0
                                    ? 'Rata-rata kota turun dibanding hari sebelumnya'
                                    : 'Rata-rata kota stabil'
                    };
                });
            } else {
                const potongan = riwayatKronologis.slice(-30);
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

        // B. Snapshot riil saat ini dari tabel harga_pangan jika belum ada riwayat perubahan pada rentang ini
        const sumberHarga = Array.isArray(dataHargaKoleksi) ? dataHargaKoleksi : [];
        let cocok = sumberHarga.filter(i =>
            (i.nama_komoditas || '').toLowerCase().trim() === namaBersih.toLowerCase()
        );
        if (pasarBersih !== 'Semua') {
            cocok = cocok.filter(i => (i.nama_pasar || '').toLowerCase().trim() === pasarBersih.toLowerCase());
        }

        if (cocok.length > 0) {
            const titikData = cocok.map((c, idx) => ({
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

        return hasilKosong;
    }

    hitungMetrikDariTitik({ namaKomoditas, periode, pasar, sumber, jumlahCatatan, titikData }) {
        const hargaAngka = titikData.map(d => Number(d.harga) || 0);
        const hargaAwal = hargaAngka[0] || 0;
        const hargaTerkini = hargaAngka[hargaAngka.length - 1] || 0;
        const hargaTertinggi = hargaAngka.length > 0 ? Math.max(...hargaAngka) : 0;
        const hargaTerendah = hargaAngka.length > 0 ? Math.min(...hargaAngka) : 0;
        const rataRata = hargaAngka.length > 0
            ? Math.round(hargaAngka.reduce((acc, c) => acc + c, 0) / hargaAngka.length)
            : 0;

        const selisih = hargaTerkini - hargaAwal;
        const persentase = hargaAwal > 0 ? Number(((selisih / hargaAwal) * 100).toFixed(1)) : 0;

        let statusTren = 'Stabil';
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
            persentase: Math.abs(persentase),
            statusTren,
            titikData
        };
    }

    // =========================================================================
    // 2. EKSPOR MICROSOFT EXCEL ASLI (.xlsx) — HARGA PANGAN (2 SHEET RAPI)
    // =========================================================================
    eksporLaporanHargaExcel(daftarKomoditas, opsi = {}) {
        const list = Array.isArray(daftarKomoditas) ? daftarKomoditas : [];
        if (list.length === 0) {
            alert('Tidak ada data komoditas pangan sesuai filter untuk diunduh ke Excel.');
            return false;
        }

        const meta = this.normalisasiOpsiLaporan(opsi, 'Kepala Bidang Cadangan dan Distribusi Pangan');
        const totalData = list.length;
        const totalTerbit = list.filter((i) => String(i.status || '').toLowerCase() === 'terbit').length;
        const totalDraft = totalData - totalTerbit;
        const hargaValid = list.map((i) => Number(i.harga) || 0).filter((h) => h > 0);
        const rataRata = hargaValid.length > 0
            ? Math.round(hargaValid.reduce((a, b) => a + b, 0) / hargaValid.length)
            : 0;
        const terendah = hargaValid.length > 0 ? Math.min(...hargaValid) : 0;
        const tertinggi = hargaValid.length > 0 ? Math.max(...hargaValid) : 0;

        const filterPasar = meta.filter?.pasar && meta.filter.pasar !== 'Semua' ? meta.filter.pasar : 'Semua Pasar Pantauan';
        const filterKategori = meta.filter?.kategori && meta.filter.kategori !== 'Semua' ? meta.filter.kategori : 'Semua Kategori';
        const filterStatus = meta.filter?.status && meta.filter.status !== 'Semua' ? meta.filter.status : 'Semua Status';
        const filterCari = meta.filter?.pencarian ? String(meta.filter.pencarian).trim() : '';

        // ─── SHEET 1: LAPORAN HARGA PANGAN ───
        const baris1 = [
            { tinggi: 24, sel: [{ v: 'PEMERINTAH KOTA MANADO', s: 1 }] },
            { tinggi: 20, sel: [{ v: 'DINAS PANGAN KOTA MANADO', s: 2 }] },
            { tinggi: 19, sel: [{ v: 'BIDANG CADANGAN DAN DISTRIBUSI PANGAN', s: 2 }] },
            { tinggi: 17, sel: [{ v: `${this.alamatResmi} — Portal Resmi SIPATOKAAN`, s: 3 }] },
            { tinggi: 8, sel: [] },
            { tinggi: 22, sel: [{ v: 'LAPORAN RESMI REKAPITULASI HARGA PANGAN POKOK & STRATEGIS', s: 4 }] },
            {
                tinggi: 20,
                sel: [
                    { v: 'Waktu Unduh (WITA)', s: 5 }, null,
                    { v: meta.tanggalCetakWITA, s: 6 }, null, null,
                    { v: 'Filter Pasar', s: 5 },
                    { v: filterPasar, s: 6 }, null, null
                ]
            },
            {
                tinggi: 20,
                sel: [
                    { v: 'Filter Kategori / Status', s: 5 }, null,
                    { v: `${filterKategori} • ${filterStatus}${filterCari ? ` • Cari: "${filterCari}"` : ''}`, s: 6 }, null, null,
                    { v: 'Total Data', s: 5 },
                    { v: `${totalData} Komoditas (${totalTerbit} Terbit, ${totalDraft} Draf)`, s: 6 }, null, null
                ]
            },
            {
                tinggi: 20,
                sel: [
                    { v: 'Instansi Pengelola', s: 5 }, null,
                    { v: `${this.bidangResmi} - ${this.instansi}`, s: 6 }, null, null,
                    { v: 'Rata-Rata Harga', s: 5 },
                    { v: rataRata, t: 'n', s: 17 }, null, null
                ]
            },
            { tinggi: 10, sel: [] },
            {
                tinggi: 28,
                sel: [
                    { v: 'No', s: 7 },
                    { v: 'Nama Komoditas Pangan', s: 7 },
                    { v: 'Kategori Pangan', s: 7 },
                    { v: 'Satuan', s: 7 },
                    { v: 'Harga Acuan (Rp)', s: 7 },
                    { v: 'Pasar Tradisional', s: 7 },
                    { v: 'Tanggal Penetapan', s: 7 },
                    { v: 'Status Verifikasi', s: 7 },
                    { v: 'Instansi Pengelola', s: 7 }
                ]
            }
        ];

        list.forEach((item, idx) => {
            const zebra = idx % 2 === 1;
            const sTeks = zebra ? 12 : 8;
            const sTengah = zebra ? 13 : 9;
            const sRupiah = zebra ? 15 : 11;
            const statusBersih = String(item.status || 'Terbit');
            const isTerbit = statusBersih.toLowerCase() === 'terbit';

            baris1.push({
                tinggi: 21,
                sel: [
                    { v: idx + 1, t: 'n', s: sTengah },
                    { v: item.nama_komoditas || '-', s: sTeks },
                    { v: item.kategori || 'Bahan Pokok', s: sTeks },
                    { v: item.satuan || '1 KG', s: sTengah },
                    { v: Number(item.harga) || 0, t: 'n', s: sRupiah },
                    { v: item.nama_pasar || '-', s: sTeks },
                    { v: item.tanggal_penetapan || '-', s: sTengah },
                    { v: statusBersih, s: isTerbit ? 21 : 22 },
                    { v: this.bidangResmi, s: sTeks }
                ]
            });
        });

        const rowRingkasan = baris1.length + 1;
        baris1.push({
            tinggi: 24,
            sel: [
                { v: `RATA-RATA HARGA (${totalData} DATA TERFILTER)`, s: 16 }, null, null, null,
                { v: rataRata, t: 'n', s: 17 },
                { v: `Terendah: ${this.formatRupiah(terendah)}  |  Tertinggi: ${this.formatRupiah(tertinggi)}`, s: 16 }, null, null, null
            ]
        });

        const ttdStart = baris1.length + 2;
        baris1.push(
            { tinggi: 14, sel: [] },
            { tinggi: 19, sel: [null, null, null, null, null, { v: `Manado, ${meta.tanggalTtdID}`, s: 18 }] },
            { tinggi: 19, sel: [null, null, null, null, null, { v: 'Mengetahui dan Mengesahkan,', s: 18 }] },
            { tinggi: 19, sel: [null, null, null, null, null, { v: meta.jabatan, s: 19 }] },
            { tinggi: 19, sel: [null, null, null, null, null, { v: this.instansi, s: 18 }] },
            { tinggi: 18, sel: [] },
            { tinggi: 18, sel: [] },
            { tinggi: 18, sel: [] },
            { tinggi: 20, sel: [null, null, null, null, null, { v: meta.barisNama, s: 19 }] },
            { tinggi: 19, sel: [null, null, null, null, null, { v: meta.barisNip, s: 18 }] }
        );

        const merges1 = [
            'A1:I1', 'A2:I2', 'A3:I3', 'A4:I4', 'A6:I6',
            'A7:B7', 'C7:E7', 'G7:I7',
            'A8:B8', 'C8:E8', 'G8:I8',
            'A9:B9', 'C9:E9', 'G9:I9',
            `A${rowRingkasan}:D${rowRingkasan}`,
            `F${rowRingkasan}:I${rowRingkasan}`,
            `F${ttdStart}:I${ttdStart}`,
            `F${ttdStart + 1}:I${ttdStart + 1}`,
            `F${ttdStart + 2}:I${ttdStart + 2}`,
            `F${ttdStart + 3}:I${ttdStart + 3}`,
            `F${ttdStart + 7}:I${ttdStart + 7}`,
            `F${ttdStart + 8}:I${ttdStart + 8}`
        ];

        // ─── SHEET 2: RINGKASAN PER PASAR ───
        const petaPasar = new Map();
        list.forEach((item) => {
            const namaPasar = String(item.nama_pasar || 'Belum Ditentukan').trim() || 'Belum Ditentukan';
            if (!petaPasar.has(namaPasar)) {
                petaPasar.set(namaPasar, { namaPasar, total: 0, terbit: 0, hargaList: [], tanggalTerbaru: '' });
            }
            const g = petaPasar.get(namaPasar);
            g.total += 1;
            if (String(item.status || '').toLowerCase() === 'terbit') g.terbit += 1;
            const h = Number(item.harga) || 0;
            if (h > 0) g.hargaList.push(h);
            const tgl = String(item.tanggal_penetapan || '').trim();
            if (tgl && tgl > g.tanggalTerbaru) g.tanggalTerbaru = tgl;
        });

        const daftarRingkasanPasar = Array.from(petaPasar.values()).sort((a, b) => a.namaPasar.localeCompare(b.namaPasar));

        const baris2 = [
            { tinggi: 24, sel: [{ v: 'RINGKASAN HARGA PANGAN PER PASAR TRADISIONAL', s: 1 }] },
            { tinggi: 19, sel: [{ v: `${this.bidangResmi} — ${this.instansi} (Diunduh: ${meta.tanggalCetakWITA})`, s: 3 }] },
            { tinggi: 10, sel: [] },
            {
                tinggi: 28,
                sel: [
                    { v: 'No', s: 7 },
                    { v: 'Pasar Tradisional Pantauan', s: 7 },
                    { v: 'Total Komoditas', s: 7 },
                    { v: 'Status Terbit', s: 7 },
                    { v: 'Harga Terendah (Rp)', s: 7 },
                    { v: 'Rata-Rata Harga (Rp)', s: 7 },
                    { v: 'Harga Tertinggi (Rp)', s: 7 },
                    { v: 'Tanggal Terbaru', s: 7 }
                ]
            }
        ];

        daftarRingkasanPasar.forEach((g, idx) => {
            const zebra = idx % 2 === 1;
            const minH = g.hargaList.length > 0 ? Math.min(...g.hargaList) : 0;
            const maxH = g.hargaList.length > 0 ? Math.max(...g.hargaList) : 0;
            const avgH = g.hargaList.length > 0 ? Math.round(g.hargaList.reduce((a, b) => a + b, 0) / g.hargaList.length) : 0;
            baris2.push({
                tinggi: 21,
                sel: [
                    { v: idx + 1, t: 'n', s: zebra ? 13 : 9 },
                    { v: g.namaPasar, s: zebra ? 12 : 8 },
                    { v: g.total, t: 'n', s: zebra ? 14 : 10 },
                    { v: g.terbit, t: 'n', s: zebra ? 14 : 10 },
                    { v: minH, t: 'n', s: zebra ? 15 : 11 },
                    { v: avgH, t: 'n', s: zebra ? 15 : 11 },
                    { v: maxH, t: 'n', s: zebra ? 15 : 11 },
                    { v: g.tanggalTerbaru || '-', s: zebra ? 13 : 9 }
                ]
            });
        });

        const rowTotalPasar = baris2.length + 1;
        baris2.push({
            tinggi: 24,
            sel: [
                { v: `TOTAL KESELURUHAN (${daftarRingkasanPasar.length} PASAR)`, s: 16 }, null,
                { v: totalData, t: 'n', s: 20 },
                { v: totalTerbit, t: 'n', s: 20 },
                { v: terendah, t: 'n', s: 17 },
                { v: rataRata, t: 'n', s: 17 },
                { v: tertinggi, t: 'n', s: 17 },
                { v: '-', s: 16 }
            ]
        });

        return excelResmiService.unduhWorkbookXlsx(
            `Laporan_Resmi_Harga_Pangan_Manado_${meta.slugTanggal}.xlsx`,
            [
                {
                    namaSheet: 'Laporan Harga Pangan',
                    lebarKolom: [6, 26, 20, 12, 18, 24, 16, 15, 30],
                    merges: merges1,
                    baris: baris1
                },
                {
                    namaSheet: 'Ringkasan per Pasar',
                    lebarKolom: [6, 28, 16, 14, 19, 20, 19, 16],
                    merges: ['A1:H1', 'A2:H2', `A${rowTotalPasar}:B${rowTotalPasar}`],
                    baris: baris2
                }
            ]
        );
    }

    // =========================================================================
    // 3. EKSPOR MICROSOFT EXCEL ASLI (.xlsx) — REKAP PELAKSANAAN GPM (2 SHEET)
    // =========================================================================
    eksporLaporanGPMExcel(daftarRekap, opsi = {}) {
        const listRaw = Array.isArray(daftarRekap) ? daftarRekap : [];
        if (listRaw.length === 0) {
            alert('Tidak ada data pelaksanaan GPM sesuai filter untuk diunduh ke Excel.');
            return false;
        }

        const list = listRaw.map((r) => this.normalisasiItemRekapGPM(r));
        const meta = this.normalisasiOpsiLaporan(opsi, 'Kepala Bidang Cadangan dan Distribusi Pangan');

        const totalAcara = list.length;
        const totalKuota = list.reduce((acc, r) => acc + r.target_kuota, 0);
        const totalTerdaftar = list.reduce((acc, r) => acc + r.terdaftar, 0);
        const totalTerlayani = list.reduce((acc, r) => acc + r.terlayani, 0);
        const persenSerapanTotal = totalKuota > 0 ? ((totalTerlayani / totalKuota) * 100).toFixed(1) : '0.0';

        const labelPeriode = meta.filter?.labelPeriode || meta.filter?.periode || 'Semua Periode';
        const filterKec = meta.filter?.kecamatan && meta.filter.kecamatan !== 'Semua' ? meta.filter.kecamatan : 'Semua Kecamatan';
        const filterStatus = meta.filter?.status && meta.filter.status !== 'Semua' ? meta.filter.status : 'Semua Status';

        // ─── SHEET 1: REKAPITULASI GPM ───
        const baris1 = [
            { tinggi: 24, sel: [{ v: 'PEMERINTAH KOTA MANADO', s: 1 }] },
            { tinggi: 20, sel: [{ v: 'DINAS PANGAN KOTA MANADO', s: 2 }] },
            { tinggi: 19, sel: [{ v: 'BIDANG CADANGAN DAN DISTRIBUSI PANGAN', s: 2 }] },
            { tinggi: 17, sel: [{ v: `${this.alamatResmi} — Portal Resmi SIPATOKAAN`, s: 3 }] },
            { tinggi: 8, sel: [] },
            { tinggi: 22, sel: [{ v: 'LAPORAN REKAPITULASI PELAKSANAAN GERAKAN PANGAN MURAH (GPM)', s: 4 }] },
            {
                tinggi: 20,
                sel: [
                    { v: 'Periode Laporan', s: 5 }, null,
                    { v: labelPeriode, s: 6 }, null, null,
                    { v: 'Waktu Unduh (WITA)', s: 5 }, null,
                    { v: meta.tanggalCetakWITA, s: 6 }, null, null, null
                ]
            },
            {
                tinggi: 20,
                sel: [
                    { v: 'Filter Wilayah / Status', s: 5 }, null,
                    { v: `${filterKec} • ${filterStatus}`, s: 6 }, null, null,
                    { v: 'Total Kegiatan / Kuota', s: 5 }, null,
                    { v: `${totalAcara} Titik GPM • ${totalKuota.toLocaleString('id-ID')} Kuota`, s: 6 }, null, null, null
                ]
            },
            {
                tinggi: 20,
                sel: [
                    { v: 'Warga Terdaftar', s: 5 }, null,
                    { v: `${totalTerdaftar.toLocaleString('id-ID')} Warga`, s: 6 }, null, null,
                    { v: 'Warga Hadir / Serapan', s: 5 }, null,
                    { v: `${totalTerlayani.toLocaleString('id-ID')} Warga (${persenSerapanTotal}%)`, s: 6 }, null, null, null
                ]
            },
            { tinggi: 10, sel: [] },
            {
                tinggi: 28,
                sel: [
                    { v: 'No', s: 7 },
                    { v: 'Nama Kegiatan GPM', s: 7 },
                    { v: 'Lokasi Pelaksanaan', s: 7 },
                    { v: 'Kecamatan', s: 7 },
                    { v: 'Tanggal', s: 7 },
                    { v: 'Target Kuota', s: 7 },
                    { v: 'Terdaftar', s: 7 },
                    { v: 'Hadir / Terlayani', s: 7 },
                    { v: 'Serapan (%)', s: 7 },
                    { v: 'Status', s: 7 },
                    { v: 'Komoditas Tersedia', s: 7 }
                ]
            }
        ];

        list.forEach((r, idx) => {
            const zebra = idx % 2 === 1;
            const sTeks = zebra ? 12 : 8;
            const sTengah = zebra ? 13 : 9;
            const sAngka = zebra ? 14 : 10;
            const isSelesai = String(r.status || '').toLowerCase() === 'selesai';

            baris1.push({
                tinggi: 22,
                sel: [
                    { v: idx + 1, t: 'n', s: sTengah },
                    { v: r.nama_acara, s: sTeks },
                    { v: r.lokasi, s: sTeks },
                    { v: r.kecamatan, s: sTengah },
                    { v: r.tanggal, s: sTengah },
                    { v: r.target_kuota, t: 'n', s: sAngka },
                    { v: r.terdaftar, t: 'n', s: sAngka },
                    { v: r.terlayani, t: 'n', s: sAngka },
                    { v: `${r.serapan}%`, s: sTengah },
                    { v: r.status, s: isSelesai ? 21 : 22 },
                    { v: r.komoditas_tersedia, s: sTeks }
                ]
            });
        });

        const rowTotal = baris1.length + 1;
        baris1.push({
            tinggi: 24,
            sel: [
                { v: `TOTAL KESELURUHAN (${totalAcara} KEGIATAN GPM)`, s: 16 }, null, null, null, null,
                { v: totalKuota, t: 'n', s: 20 },
                { v: totalTerdaftar, t: 'n', s: 20 },
                { v: totalTerlayani, t: 'n', s: 20 },
                { v: `${persenSerapanTotal}%`, s: 16 },
                { v: '-', s: 16 },
                { v: '-', s: 16 }
            ]
        });

        const ttdStart = baris1.length + 2;
        baris1.push(
            { tinggi: 14, sel: [] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, { v: `Manado, ${meta.tanggalTtdID}`, s: 18 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, { v: 'Mengetahui dan Mengesahkan,', s: 18 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, { v: meta.jabatan, s: 19 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, { v: this.instansi, s: 18 }] },
            { tinggi: 18, sel: [] },
            { tinggi: 18, sel: [] },
            { tinggi: 18, sel: [] },
            { tinggi: 20, sel: [null, null, null, null, null, null, null, { v: meta.barisNama, s: 19 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, { v: meta.barisNip, s: 18 }] }
        );

        const merges1 = [
            'A1:K1', 'A2:K2', 'A3:K3', 'A4:K4', 'A6:K6',
            'A7:B7', 'C7:E7', 'F7:G7', 'H7:K7',
            'A8:B8', 'C8:E8', 'F8:G8', 'H8:K8',
            'A9:B9', 'C9:E9', 'F9:G9', 'H9:K9',
            `A${rowTotal}:E${rowTotal}`,
            `H${ttdStart}:K${ttdStart}`,
            `H${ttdStart + 1}:K${ttdStart + 1}`,
            `H${ttdStart + 2}:K${ttdStart + 2}`,
            `H${ttdStart + 3}:K${ttdStart + 3}`,
            `H${ttdStart + 7}:K${ttdStart + 7}`,
            `H${ttdStart + 8}:K${ttdStart + 8}`
        ];

        // ─── SHEET 2: RINGKASAN PER KECAMATAN ───
        const petaKec = new Map();
        list.forEach((r) => {
            const kec = r.kecamatan || 'Belum Ditentukan';
            if (!petaKec.has(kec)) {
                petaKec.set(kec, { kecamatan: kec, titik: 0, kuota: 0, terdaftar: 0, terlayani: 0 });
            }
            const g = petaKec.get(kec);
            g.titik += 1;
            g.kuota += r.target_kuota;
            g.terdaftar += r.terdaftar;
            g.terlayani += r.terlayani;
        });
        const listKec = Array.from(petaKec.values()).sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

        const baris2 = [
            { tinggi: 24, sel: [{ v: 'RINGKASAN PELAKSANAAN GPM PER KECAMATAN', s: 1 }] },
            { tinggi: 19, sel: [{ v: `Periode: ${labelPeriode} — ${this.instansi}`, s: 3 }] },
            { tinggi: 10, sel: [] },
            {
                tinggi: 28,
                sel: [
                    { v: 'No', s: 7 },
                    { v: 'Kecamatan', s: 7 },
                    { v: 'Jumlah Titik GPM', s: 7 },
                    { v: 'Total Kuota', s: 7 },
                    { v: 'Warga Terdaftar', s: 7 },
                    { v: 'Hadir / Terlayani', s: 7 },
                    { v: 'Serapan (%)', s: 7 }
                ]
            }
        ];

        listKec.forEach((k, idx) => {
            const zebra = idx % 2 === 1;
            const persen = k.kuota > 0 ? `${((k.terlayani / k.kuota) * 100).toFixed(1)}%` : '0.0%';
            baris2.push({
                tinggi: 21,
                sel: [
                    { v: idx + 1, t: 'n', s: zebra ? 13 : 9 },
                    { v: k.kecamatan, s: zebra ? 12 : 8 },
                    { v: k.titik, t: 'n', s: zebra ? 14 : 10 },
                    { v: k.kuota, t: 'n', s: zebra ? 14 : 10 },
                    { v: k.terdaftar, t: 'n', s: zebra ? 14 : 10 },
                    { v: k.terlayani, t: 'n', s: zebra ? 14 : 10 },
                    { v: persen, s: zebra ? 13 : 9 }
                ]
            });
        });

        const rowTotalKec = baris2.length + 1;
        baris2.push({
            tinggi: 24,
            sel: [
                { v: `TOTAL (${listKec.length} KECAMATAN)`, s: 16 }, null,
                { v: totalAcara, t: 'n', s: 20 },
                { v: totalKuota, t: 'n', s: 20 },
                { v: totalTerdaftar, t: 'n', s: 20 },
                { v: totalTerlayani, t: 'n', s: 20 },
                { v: `${persenSerapanTotal}%`, s: 16 }
            ]
        });

        return excelResmiService.unduhWorkbookXlsx(
            `Laporan_Resmi_GPM_Manado_${meta.slugTanggal}.xlsx`,
            [
                {
                    namaSheet: 'Laporan Pelaksanaan GPM',
                    lebarKolom: [6, 28, 24, 16, 13, 14, 13, 16, 12, 13, 32],
                    merges: merges1,
                    baris: baris1
                },
                {
                    namaSheet: 'Ringkasan per Kecamatan',
                    lebarKolom: [6, 24, 17, 15, 16, 17, 14],
                    merges: ['A1:G1', 'A2:G2', `A${rowTotalKec}:B${rowTotalKec}`],
                    baris: baris2
                }
            ]
        );
    }

    // =========================================================================
    // 4. MESIN CETAK PDF RESMI ANTI-HALAMAN-KOSONG (HIDDEN SAME-ORIGIN IFRAME)
    // =========================================================================
    cetakHtmlViaIframe(htmlDokumen) {
        const lama = document.getElementById('iframe-cetak-sipatokaan');
        if (lama && lama.parentNode) {
            lama.parentNode.removeChild(lama);
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'iframe-cetak-sipatokaan';
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc || !iframe.contentWindow) {
            alert('Peramban tidak mendukung pencetakan dokumen secara langsung. Silakan gunakan tombol Unduh Excel (.xlsx).');
            return false;
        }

        doc.open();
        doc.write(htmlDokumen);
        doc.close();

        const eksekusiCetak = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Gagal memicu jendela cetak PDF:', err);
                alert('Gagal membuka jendela cetak PDF. Silakan coba lagi.');
            }
        };

        const gambarList = Array.from(doc.images || []);
        if (gambarList.length === 0) {
            setTimeout(eksekusiCetak, 150);
            return true;
        }

        let sudahCetak = false;
        const picuSekali = () => {
            if (sudahCetak) return;
            sudahCetak = true;
            setTimeout(eksekusiCetak, 120);
        };

        const sisa = gambarList.filter((img) => !img.complete);
        if (sisa.length === 0) {
            picuSekali();
        } else {
            let selesai = 0;
            const cekSelesai = () => {
                selesai += 1;
                if (selesai >= sisa.length) picuSekali();
            };
            sisa.forEach((img) => {
                img.addEventListener('load', cekSelesai, { once: true });
                img.addEventListener('error', cekSelesai, { once: true });
            });
            setTimeout(picuSekali, 1200);
        }

        return true;
    }

    bangunCssCetakA4(orientasi = 'portrait') {
        return `
            @page { size: A4 ${orientasi}; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
                color: #0f172a;
                background: #ffffff;
                font-size: 11px;
                line-height: 1.45;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .kop-surat {
                display: flex;
                align-items: center;
                gap: 14px;
                border-bottom: 3px double #1e293b;
                padding-bottom: 10px;
                margin-bottom: 14px;
            }
            .kop-logo {
                width: 60px;
                height: 60px;
                object-fit: contain;
                flex-shrink: 0;
            }
            .kop-teks {
                flex: 1;
                text-align: center;
                padding-right: 40px;
            }
            .kop-pemkot { font-size: 13px; font-weight: 700; letter-spacing: 0.6px; margin: 0; color: #0f172a; }
            .kop-dinas { font-size: 17px; font-weight: 900; letter-spacing: 0.8px; margin: 2px 0; color: #8B1E1E; }
            .kop-bidang { font-size: 12px; font-weight: 700; margin: 0; color: #1e293b; }
            .kop-alamat { font-size: 9.5px; color: #475569; margin: 3px 0 0; }
            .judul-dokumen {
                text-align: center;
                margin: 10px 0 12px;
            }
            .judul-dokumen h1 {
                margin: 0 0 4px;
                font-size: 14px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                color: #0f172a;
            }
            .judul-dokumen p {
                margin: 0;
                font-size: 10.5px;
                color: #475569;
            }
            .meta-filter {
                display: flex;
                flex-wrap: wrap;
                gap: 8px 18px;
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                padding: 8px 12px;
                margin-bottom: 12px;
                font-size: 10.5px;
            }
            .meta-filter strong { color: #0f172a; }
            .kpi-strip {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-bottom: 12px;
            }
            .kpi-box {
                border: 1px solid #e2e8f0;
                border-left: 4px solid #8B1E1E;
                border-radius: 6px;
                padding: 7px 10px;
                background: #ffffff;
            }
            .kpi-label { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .kpi-nilai { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
                font-size: 10px;
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            th {
                background: #8B1E1E;
                color: #ffffff;
                font-weight: 700;
                text-align: left;
                padding: 7px 6px;
                border: 1px solid #7f1d1d;
                font-size: 9.8px;
            }
            td {
                padding: 6px;
                border: 1px solid #cbd5e1;
                vertical-align: top;
            }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .kanan { text-align: right; }
            .tengah { text-align: center; }
            .tebal { font-weight: 700; }
            .badge-hijau {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 99px;
                background: #dcfce7;
                color: #166534;
                font-weight: 700;
                font-size: 9px;
            }
            .badge-kuning {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 99px;
                background: #fef3c7;
                color: #92400e;
                font-weight: 700;
                font-size: 9px;
            }
            .baris-total td {
                background: #fef2f2 !important;
                color: #8B1E1E;
                font-weight: 800;
                border-top: 2px solid #8B1E1E;
            }
            .ttd-wrap {
                margin-top: 22px;
                display: flex;
                justify-content: flex-end;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .ttd-box {
                width: 260px;
                text-align: center;
                font-size: 11px;
            }
            .ttd-box p { margin: 2px 0; }
            .ttd-ruang { height: 56px; }
            .ttd-nama { font-weight: 800; text-decoration: underline; }
            .footer-catatan {
                margin-top: 16px;
                padding-top: 6px;
                border-top: 1px dashed #cbd5e1;
                font-size: 9px;
                color: #64748b;
                display: flex;
                justify-content: space-between;
            }
        `;
    }

    // 4A. Cetak Dokumen PDF Resmi — Laporan Harga Pangan
    cetakLaporanHargaPDF(daftarKomoditas, opsi = {}) {
        const list = Array.isArray(daftarKomoditas) ? daftarKomoditas : [];
        if (list.length === 0) {
            alert('Tidak ada data harga pangan sesuai filter untuk dicetak ke PDF.');
            return false;
        }

        const meta = this.normalisasiOpsiLaporan(opsi, 'Kepala Bidang Cadangan dan Distribusi Pangan');
        const totalData = list.length;
        const totalTerbit = list.filter((i) => String(i.status || '').toLowerCase() === 'terbit').length;
        const totalDraft = totalData - totalTerbit;
        const hargaValid = list.map((i) => Number(i.harga) || 0).filter((h) => h > 0);
        const rataRata = hargaValid.length > 0 ? Math.round(hargaValid.reduce((a, b) => a + b, 0) / hargaValid.length) : 0;
        const terendah = hargaValid.length > 0 ? Math.min(...hargaValid) : 0;
        const tertinggi = hargaValid.length > 0 ? Math.max(...hargaValid) : 0;

        const filterPasar = meta.filter?.pasar && meta.filter.pasar !== 'Semua' ? meta.filter.pasar : 'Semua Pasar';
        const filterKategori = meta.filter?.kategori && meta.filter.kategori !== 'Semua' ? meta.filter.kategori : 'Semua Kategori';
        const filterStatus = meta.filter?.status && meta.filter.status !== 'Semua' ? meta.filter.status : 'Semua Status';
        const logoUrl = `${window.location.origin}/logodinaspangan.png`;

        const rowsHtml = list.map((item, idx) => {
            const statusStr = String(item.status || 'Terbit');
            const isTerbit = statusStr.toLowerCase() === 'terbit';
            return `
                <tr>
                    <td class="tengah">${idx + 1}</td>
                    <td class="tebal">${this.escapeHtml(item.nama_komoditas || '-')}</td>
                    <td>${this.escapeHtml(item.kategori || 'Bahan Pokok')}</td>
                    <td class="tengah">${this.escapeHtml(item.satuan || '1 KG')}</td>
                    <td class="kanan tebal">${this.escapeHtml(this.formatRupiah(item.harga))}</td>
                    <td>${this.escapeHtml(item.nama_pasar || '-')}</td>
                    <td class="tengah">${this.escapeHtml(item.tanggal_penetapan || '-')}</td>
                    <td class="tengah"><span class="${isTerbit ? 'badge-hijau' : 'badge-kuning'}">${this.escapeHtml(statusStr)}</span></td>
                </tr>
            `;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Resmi Harga Pangan - Dinas Pangan Kota Manado</title>
  <style>${this.bangunCssCetakA4('portrait')}</style>
</head>
<body>
  <div class="kop-surat">
    <img src="${this.escapeHtml(logoUrl)}" alt="Logo Dinas Pangan" class="kop-logo" />
    <div class="kop-teks">
      <p class="kop-pemkot">PEMERINTAH KOTA MANADO</p>
      <p class="kop-dinas">DINAS PANGAN KOTA MANADO</p>
      <p class="kop-bidang">BIDANG CADANGAN DAN DISTRIBUSI PANGAN</p>
      <p class="kop-alamat">${this.escapeHtml(this.alamatResmi)}</p>
    </div>
  </div>

  <div class="judul-dokumen">
    <h1>Laporan Rekapitulasi Harga Pangan Pokok &amp; Strategis</h1>
    <p>Dicetak pada: ${this.escapeHtml(meta.tanggalCetakWITA)} • Sumber Data: Basis Data Resmi SIPATOKAAN</p>
  </div>

  <div class="meta-filter">
    <span><strong>Pasar:</strong> ${this.escapeHtml(filterPasar)}</span>
    <span><strong>Kategori:</strong> ${this.escapeHtml(filterKategori)}</span>
    <span><strong>Status:</strong> ${this.escapeHtml(filterStatus)}</span>
    <span><strong>Rentang Harga:</strong> ${this.escapeHtml(this.formatRupiah(terendah))} – ${this.escapeHtml(this.formatRupiah(tertinggi))}</span>
  </div>

  <div class="kpi-strip">
    <div class="kpi-box"><div class="kpi-label">Total Komoditas</div><div class="kpi-nilai">${totalData} Data</div></div>
    <div class="kpi-box"><div class="kpi-label">Terbit (Publik)</div><div class="kpi-nilai">${totalTerbit} Data</div></div>
    <div class="kpi-box"><div class="kpi-label">Menunggu / Draf</div><div class="kpi-nilai">${totalDraft} Data</div></div>
    <div class="kpi-box"><div class="kpi-label">Rata-Rata Harga</div><div class="kpi-nilai">${this.escapeHtml(this.formatRupiah(rataRata))}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="tengah" style="width:32px;">No</th>
        <th>Komoditas Pangan</th>
        <th>Kategori</th>
        <th class="tengah" style="width:62px;">Satuan</th>
        <th class="kanan" style="width:98px;">Harga Acuan</th>
        <th>Pasar Pantauan</th>
        <th class="tengah" style="width:82px;">Tanggal</th>
        <th class="tengah" style="width:68px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="baris-total">
        <td colspan="4">RATA-RATA HARGA (${totalData} DATA TERFILTER)</td>
        <td class="kanan">${this.escapeHtml(this.formatRupiah(rataRata))}</td>
        <td colspan="3">Terendah: ${this.escapeHtml(this.formatRupiah(terendah))} &nbsp;|&nbsp; Tertinggi: ${this.escapeHtml(this.formatRupiah(tertinggi))}</td>
      </tr>
    </tbody>
  </table>

  <div class="ttd-wrap">
    <div class="ttd-box">
      <p>Manado, ${this.escapeHtml(meta.tanggalTtdID)}</p>
      <p>Mengetahui dan Mengesahkan,</p>
      <p class="tebal">${this.escapeHtml(meta.jabatan)}</p>
      <p>${this.escapeHtml(this.instansi)}</p>
      <div class="ttd-ruang"></div>
      <p class="ttd-nama">${this.escapeHtml(meta.barisNama)}</p>
      <p>${this.escapeHtml(meta.barisNip)}</p>
    </div>
  </div>

  <div class="footer-catatan">
    <span>SIPATOKAAN — Sistem Informasi Pangan Kota Manado</span>
    <span>Dokumen Kedinasan Resmi • 100% Data Basis Data Supabase</span>
  </div>
</body>
</html>`;

        return this.cetakHtmlViaIframe(html);
    }

    // 4B. Cetak Dokumen PDF Resmi — Rekapitulasi Pelaksanaan GPM (A4 Landscape)
    cetakLaporanGPMPDF(daftarRekap, opsi = {}) {
        const listRaw = Array.isArray(daftarRekap) ? daftarRekap : [];
        if (listRaw.length === 0) {
            alert('Tidak ada data kegiatan GPM sesuai filter untuk dicetak ke PDF.');
            return false;
        }

        const list = listRaw.map((r) => this.normalisasiItemRekapGPM(r));
        const meta = this.normalisasiOpsiLaporan(opsi, 'Kepala Bidang Cadangan dan Distribusi Pangan');
        const totalAcara = list.length;
        const totalKuota = list.reduce((acc, r) => acc + r.target_kuota, 0);
        const totalTerdaftar = list.reduce((acc, r) => acc + r.terdaftar, 0);
        const totalTerlayani = list.reduce((acc, r) => acc + r.terlayani, 0);
        const persenSerapanTotal = totalKuota > 0 ? ((totalTerlayani / totalKuota) * 100).toFixed(1) : '0.0';

        const labelPeriode = meta.filter?.labelPeriode || meta.filter?.periode || 'Semua Periode';
        const filterKec = meta.filter?.kecamatan && meta.filter.kecamatan !== 'Semua' ? meta.filter.kecamatan : 'Semua Kecamatan';
        const filterStatus = meta.filter?.status && meta.filter.status !== 'Semua' ? meta.filter.status : 'Semua Status';
        const logoUrl = `${window.location.origin}/logodinaspangan.png`;

        const rowsHtml = list.map((r, idx) => {
            const isSelesai = String(r.status || '').toLowerCase() === 'selesai';
            return `
                <tr>
                    <td class="tengah">${idx + 1}</td>
                    <td class="tebal">${this.escapeHtml(r.nama_acara)}</td>
                    <td>${this.escapeHtml(r.lokasi)}</td>
                    <td class="tengah">${this.escapeHtml(r.kecamatan)}</td>
                    <td class="tengah">${this.escapeHtml(r.tanggal)}</td>
                    <td class="kanan">${r.target_kuota.toLocaleString('id-ID')}</td>
                    <td class="kanan">${r.terdaftar.toLocaleString('id-ID')}</td>
                    <td class="kanan tebal">${r.terlayani.toLocaleString('id-ID')}</td>
                    <td class="tengah tebal">${r.serapan}%</td>
                    <td class="tengah"><span class="${isSelesai ? 'badge-hijau' : 'badge-kuning'}">${this.escapeHtml(r.status)}</span></td>
                    <td>${this.escapeHtml(r.komoditas_tersedia)}</td>
                </tr>
            `;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Pelaksanaan GPM - Dinas Pangan Kota Manado</title>
  <style>${this.bangunCssCetakA4('landscape')}</style>
</head>
<body>
  <div class="kop-surat">
    <img src="${this.escapeHtml(logoUrl)}" alt="Logo Dinas Pangan" class="kop-logo" />
    <div class="kop-teks">
      <p class="kop-pemkot">PEMERINTAH KOTA MANADO</p>
      <p class="kop-dinas">DINAS PANGAN KOTA MANADO</p>
      <p class="kop-bidang">BIDANG CADANGAN DAN DISTRIBUSI PANGAN</p>
      <p class="kop-alamat">${this.escapeHtml(this.alamatResmi)}</p>
    </div>
  </div>

  <div class="judul-dokumen">
    <h1>Laporan Rekapitulasi Pelaksanaan Gerakan Pangan Murah (GPM)</h1>
    <p>Dicetak pada: ${this.escapeHtml(meta.tanggalCetakWITA)} • Periode: ${this.escapeHtml(labelPeriode)}</p>
  </div>

  <div class="meta-filter">
    <span><strong>Periode:</strong> ${this.escapeHtml(labelPeriode)}</span>
    <span><strong>Kecamatan:</strong> ${this.escapeHtml(filterKec)}</span>
    <span><strong>Status:</strong> ${this.escapeHtml(filterStatus)}</span>
  </div>

  <div class="kpi-strip">
    <div class="kpi-box"><div class="kpi-label">Total Titik GPM</div><div class="kpi-nilai">${totalAcara} Kegiatan</div></div>
    <div class="kpi-box"><div class="kpi-label">Alokasi Kuota</div><div class="kpi-nilai">${totalKuota.toLocaleString('id-ID')} Kuota</div></div>
    <div class="kpi-box"><div class="kpi-label">Warga Terdaftar</div><div class="kpi-nilai">${totalTerdaftar.toLocaleString('id-ID')} Warga</div></div>
    <div class="kpi-box"><div class="kpi-label">Hadir &amp; Serapan</div><div class="kpi-nilai">${totalTerlayani.toLocaleString('id-ID')} (${persenSerapanTotal}%)</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="tengah" style="width:30px;">No</th>
        <th>Nama Kegiatan GPM</th>
        <th>Lokasi Pelaksanaan</th>
        <th class="tengah" style="width:82px;">Kecamatan</th>
        <th class="tengah" style="width:76px;">Tanggal</th>
        <th class="kanan" style="width:58px;">Kuota</th>
        <th class="kanan" style="width:62px;">Daftar</th>
        <th class="kanan" style="width:62px;">Hadir</th>
        <th class="tengah" style="width:56px;">Serapan</th>
        <th class="tengah" style="width:62px;">Status</th>
        <th>Komoditas Tersedia</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="baris-total">
        <td colspan="5">TOTAL KESELURUHAN (${totalAcara} KEGIATAN GPM)</td>
        <td class="kanan">${totalKuota.toLocaleString('id-ID')}</td>
        <td class="kanan">${totalTerdaftar.toLocaleString('id-ID')}</td>
        <td class="kanan">${totalTerlayani.toLocaleString('id-ID')}</td>
        <td class="tengah">${persenSerapanTotal}%</td>
        <td colspan="2">Terserap ${totalTerlayani.toLocaleString('id-ID')} dari ${totalKuota.toLocaleString('id-ID')} kuota</td>
      </tr>
    </tbody>
  </table>

  <div class="ttd-wrap">
    <div class="ttd-box">
      <p>Manado, ${this.escapeHtml(meta.tanggalTtdID)}</p>
      <p>Mengetahui dan Mengesahkan,</p>
      <p class="tebal">${this.escapeHtml(meta.jabatan)}</p>
      <p>${this.escapeHtml(this.instansi)}</p>
      <div class="ttd-ruang"></div>
      <p class="ttd-nama">${this.escapeHtml(meta.barisNama)}</p>
      <p>${this.escapeHtml(meta.barisNip)}</p>
    </div>
  </div>

  <div class="footer-catatan">
    <span>SIPATOKAAN — Sistem Informasi Pangan Kota Manado</span>
    <span>Dokumen Kedinasan Resmi • 100% Data Basis Data Supabase</span>
  </div>
</body>
</html>`;

        return this.cetakHtmlViaIframe(html);
    }

    // 4C. Cetak Dokumen PDF Resmi — Daftar Hadir & Antrean 1 Kegiatan GPM
    cetakLaporanPendaftarGPMPDF(acara, daftarPendaftar = [], opsi = {}) {
        if (!acara) {
            alert('Data kegiatan GPM tidak ditemukan untuk dicetak.');
            return false;
        }
        const pendaftar = Array.isArray(daftarPendaftar) ? daftarPendaftar : [];
        const meta = this.normalisasiOpsiLaporan(opsi, 'Kepala Bidang Cadangan dan Distribusi Pangan');
        const totalDaftar = pendaftar.length;
        const totalHadir = pendaftar.filter((p) => String(p.status_kehadiran || '').toLowerCase() === 'hadir').length;
        const kuota = Number(acara.kuota_maksimal || acara.target_kuota || 0) || 0;
        const persen = kuota > 0 ? ((totalHadir / kuota) * 100).toFixed(1) : '0.0';
        const logoUrl = `${window.location.origin}/logodinaspangan.png`;

        const rowsHtml = pendaftar.length > 0
            ? pendaftar.map((w, idx) => {
                const isHadir = String(w.status_kehadiran || '').toLowerCase() === 'hadir';
                return `
                    <tr>
                        <td class="tengah">${idx + 1}</td>
                        <td class="tengah tebal">#${String(w.nomor_antrean || idx + 1).padStart(3, '0')}</td>
                        <td class="tebal">${this.escapeHtml(w.nama_bersih || w.nama_pendaftar || '-')}</td>
                        <td class="tengah">${this.escapeHtml(w.nik || '-')}</td>
                        <td class="tengah">${this.escapeHtml(w.no_kk || '-')}</td>
                        <td class="tengah">${this.escapeHtml(w.nomor_telepon || '-')}</td>
                        <td class="tengah">${this.escapeHtml(w.kode_barcode || '-')}</td>
                        <td class="tengah"><span class="${isHadir ? 'badge-hijau' : 'badge-kuning'}">${this.escapeHtml(w.status_kehadiran || 'Menunggu')}</span></td>
                        <td class="tengah">${this.escapeHtml(w.status_pengambilan || 'Belum Diambil')}</td>
                    </tr>
                `;
            }).join('')
            : `<tr><td colspan="9" class="tengah" style="padding:18px;color:#64748b;">Belum ada warga yang terdaftar pada kegiatan GPM ini.</td></tr>`;

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Daftar Hadir GPM - ${this.escapeHtml(acara.nama_acara || 'GPM Manado')}</title>
  <style>${this.bangunCssCetakA4('landscape')}</style>
</head>
<body>
  <div class="kop-surat">
    <img src="${this.escapeHtml(logoUrl)}" alt="Logo Dinas Pangan" class="kop-logo" />
    <div class="kop-teks">
      <p class="kop-pemkot">PEMERINTAH KOTA MANADO</p>
      <p class="kop-dinas">DINAS PANGAN KOTA MANADO</p>
      <p class="kop-bidang">BIDANG CADANGAN DAN DISTRIBUSI PANGAN</p>
      <p class="kop-alamat">${this.escapeHtml(this.alamatResmi)}</p>
    </div>
  </div>

  <div class="judul-dokumen">
    <h1>Daftar Hadir &amp; Antrean Gerakan Pangan Murah (GPM)</h1>
    <p>${this.escapeHtml(acara.nama_acara || '-')} • ${this.escapeHtml(acara.lokasi || '-')} (Kec. ${this.escapeHtml(acara.kecamatan || '-')})</p>
  </div>

  <div class="meta-filter">
    <span><strong>Tanggal:</strong> ${this.escapeHtml(String(acara.tanggal || '-').split('T')[0])} (${this.escapeHtml(acara.jam_mulai || '08:00')} – ${this.escapeHtml(acara.jam_selesai || '14:00')} WITA)</span>
    <span><strong>Status:</strong> ${this.escapeHtml(acara.status || 'Aktif')}</span>
    <span><strong>Komoditas:</strong> ${this.escapeHtml(acara.komoditas_tersedia || '-')}</span>
  </div>

  <div class="kpi-strip">
    <div class="kpi-box"><div class="kpi-label">Target Kuota</div><div class="kpi-nilai">${kuota.toLocaleString('id-ID')}</div></div>
    <div class="kpi-box"><div class="kpi-label">Warga Mendaftar</div><div class="kpi-nilai">${totalDaftar.toLocaleString('id-ID')}</div></div>
    <div class="kpi-box"><div class="kpi-label">Hadir Terverifikasi</div><div class="kpi-nilai">${totalHadir.toLocaleString('id-ID')}</div></div>
    <div class="kpi-box"><div class="kpi-label">Tingkat Serapan</div><div class="kpi-nilai">${persen}%</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="tengah" style="width:28px;">No</th>
        <th class="tengah" style="width:62px;">Antrean</th>
        <th>Nama Lengkap</th>
        <th class="tengah" style="width:118px;">NIK</th>
        <th class="tengah" style="width:118px;">No. KK</th>
        <th class="tengah" style="width:94px;">No. HP</th>
        <th class="tengah" style="width:112px;">Kode Tiket QR</th>
        <th class="tengah" style="width:72px;">Kehadiran</th>
        <th class="tengah" style="width:86px;">Pengambilan</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="ttd-wrap">
    <div class="ttd-box">
      <p>Manado, ${this.escapeHtml(meta.tanggalTtdID)}</p>
      <p>Mengetahui dan Mengesahkan,</p>
      <p class="tebal">${this.escapeHtml(meta.jabatan)}</p>
      <p>${this.escapeHtml(this.instansi)}</p>
      <div class="ttd-ruang"></div>
      <p class="ttd-nama">${this.escapeHtml(meta.barisNama)}</p>
      <p>${this.escapeHtml(meta.barisNip)}</p>
    </div>
  </div>
</body>
</html>`;

        return this.cetakHtmlViaIframe(html);
    }

    // 5. Cadangan CSV Kompatibel Excel Indonesia (sep=; + delimiter titik koma)
    eksporLaporanHargaCSV(daftarKomoditas, penandatangan = {}) {
        if (!daftarKomoditas || daftarKomoditas.length === 0) {
            alert('Tidak ada data komoditas pangan untuk diunduh.');
            return false;
        }

        const meta = this.normalisasiOpsiLaporan(penandatangan);
        const totalKomoditas = daftarKomoditas.length;
        const totalTerbit = daftarKomoditas.filter(i => (i.status || '').toLowerCase() === 'terbit').length;
        const totalDraft = totalKomoditas - totalTerbit;

        let csv = '\uFEFFsep=;\n';
        csv += 'PEMERINTAH KOTA MANADO\n';
        csv += 'DINAS PANGAN KOTA MANADO\n';
        csv += 'BIDANG CADANGAN DAN DISTRIBUSI PANGAN\n';
        csv += `Alamat: ${this.alamatResmi}\n\n`;
        csv += 'LAPORAN RESMI REKAPITULASI HARGA PANGAN POKOK DAN STRATEGIS\n';
        csv += `Waktu Unduh Laporan;"${meta.tanggalCetakWITA}"\n`;
        csv += `Total Komoditas;${totalKomoditas}\n`;
        csv += `Terbit;${totalTerbit}\n`;
        csv += `Draf / Menunggu;${totalDraft}\n\n`;
        csv += 'No;Nama Komoditas Pangan;Kategori Pangan;Satuan;Harga Acuan (Rp);Pasar Tradisional;Tanggal Penetapan;Status Verifikasi;Instansi Pengelola\n';

        daftarKomoditas.forEach((item, idx) => {
            const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            csv += `${idx + 1};${q(item.nama_komoditas || '')};${q(item.kategori || 'Bahan Pokok')};${q(item.satuan || '1 KG')};${Number(item.harga) || 0};${q(item.nama_pasar || '-')};${q(item.tanggal_penetapan || '-')};${q(item.status || 'Terbit')};${q(this.bidangResmi)}\n`;
        });

        csv += `\nMengetahui dan Mengesahkan;\n${meta.jabatan};\n${this.instansi};\n\n\n${meta.barisNama};\n${meta.barisNip};\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const tautan = document.createElement('a');
        tautan.setAttribute('href', url);
        tautan.setAttribute('download', `Laporan_Resmi_Harga_Pangan_Manado_${meta.slugTanggal}.csv`);
        document.body.appendChild(tautan);
        tautan.click();
        document.body.removeChild(tautan);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    }
}

export const laporanService = new LaporanService();
