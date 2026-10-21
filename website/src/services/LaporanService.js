// ===================================================================================
// MODUL LAYANAN LAPORAN RESMI DAN STATISTIK PANGAN (OOP)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk mengolah data rekapitulasi, evaluasi pelaksanaan GPM,
// analisis tren grafik pangan, dan penyusunan dokumen laporan kedinasan.
// ===================================================================================

class LaporanService {
    constructor() {
        this.instansi = 'Dinas Pangan Kota Manado';
        this.bidangResmi = 'Bidang Cadangan dan Distribusi Pangan';
    }

    // 1. Data Tren Fluktuasi Harga Komoditas untuk Tampilan Grafik Pangan (Kadis)
    ambilDataTrenKomoditas(namaKomoditas = 'Beras Medium', periode = '7hari', namaPasar = 'Semua') {
        const hargaBasis = {
            'Beras Medium': 13500,
            'Beras Premium': 15500,
            'Minyak Goreng Kemasan': 18000,
            'Gula Pasir': 16000,
            'Telur Ayam': 28000,
            'Daging Ayam': 38000,
            'Daging Sapi': 135000,
            'Bawang Merah': 32000,
            'Bawang Putih': 35000,
            'Cabai Rawit': 45000
        };

        const basis = hargaBasis[namaKomoditas] || 15000;
        let titikData = [];

        if (periode === '7hari') {
            const labelTanggal = ['15 Okt', '16 Okt', '17 Okt', '18 Okt', '19 Okt', '20 Okt', '21 Okt'];
            const fluktuasi = [-300, -200, -100, 0, 100, 200, 0];
            titikData = labelTanggal.map((tgl, i) => ({
                tanggal: tgl,
                harga: Math.max(1000, basis + fluktuasi[i]),
                pasar: namaPasar === 'Semua' ? 'Rata-rata Pasar' : namaPasar
            }));
        } else if (periode === '30hari') {
            const labelTanggal = ['22 Sep', '27 Sep', '02 Okt', '07 Okt', '12 Okt', '17 Okt', '21 Okt'];
            const fluktuasi = [-600, -400, -100, 200, -100, 300, 200];
            titikData = labelTanggal.map((tgl, i) => ({
                tanggal: tgl,
                harga: Math.max(1000, basis + fluktuasi[i]),
                pasar: namaPasar === 'Semua' ? 'Rata-rata Pasar' : namaPasar
            }));
        } else {
            // Periode 3 Bulan
            const labelTanggal = ['Agt M2', 'Agt M4', 'Sep M2', 'Sep M4', 'Okt M2', 'Okt M3'];
            const fluktuasi = [-1100, -700, -300, 200, 100, 400];
            titikData = labelTanggal.map((tgl, i) => ({
                tanggal: tgl,
                harga: Math.max(1000, basis + fluktuasi[i]),
                pasar: namaPasar === 'Semua' ? 'Rata-rata Pasar' : namaPasar
            }));
        }

        const hargaAngka = titikData.map(d => d.harga);
        const hargaTerkini = hargaAngka[hargaAngka.length - 1];
        const hargaAwal = hargaAngka[0];
        const hargaTertinggi = Math.max(...hargaAngka);
        const hargaTerendah = Math.min(...hargaAngka);
        const rataRata = Math.round(hargaAngka.reduce((acc, c) => acc + c, 0) / hargaAngka.length);

        const selisih = hargaTerkini - hargaAwal;
        const persentase = ((selisih / hargaAwal) * 100).toFixed(1);

        let statusTren = 'Stabil';
        if (selisih > 50) statusTren = 'Naik';
        else if (selisih < -50) statusTren = 'Turun';

        return {
            namaKomoditas,
            periode,
            pasar: namaPasar,
            hargaTerkini,
            hargaTertinggi,
            hargaTerendah,
            rataRata,
            selisih,
            persentase: Math.abs(persentase),
            statusTren,
            titikData
        };
    }

    // 2. Data Rekapitulasi Pelaksanaan Gerakan Pangan Murah (GPM) untuk Kadis
    ambilRekapitulasiGPM() {
        return [
            {
                id: 'gpm-1',
                nama_acara: 'GPM Lapangan Sparta Tikala',
                lokasi: 'Kelurahan Tikala Ares, Kec. Tikala',
                kecamatan: 'Tikala',
                tanggal: '24 Oktober 2026',
                target_kuota: 250,
                terdaftar: 250,
                terlayani: 238,
                status: 'Selesai',
                komoditas_tersalurkan: [
                    { nama: 'Beras SPHP 5kg', jumlah: '1.250 kg' },
                    { nama: 'Minyak Goreng 1L', jumlah: '500 liter' },
                    { nama: 'Gula Pasir 1kg', jumlah: '250 kg' }
                ]
            },
            {
                id: 'gpm-2',
                nama_acara: 'GPM Halaman Kantor Camat Malalayang',
                lokasi: 'Jl. Wolter Monginsidi, Kec. Malalayang',
                kecamatan: 'Malalayang',
                tanggal: '28 Oktober 2026',
                target_kuota: 300,
                terdaftar: 284,
                terlayani: 0,
                status: 'Terjadwal',
                komoditas_tersalurkan: [
                    { nama: 'Beras SPHP 5kg', jumlah: '1.500 kg' },
                    { nama: 'Minyak Goreng 1L', jumlah: '600 liter' },
                    { nama: 'Telur Ayam 1 Rak', jumlah: '300 baki' }
                ]
            },
            {
                id: 'gpm-3',
                nama_acara: 'GPM Pesisir Karangria Tuminting',
                lokasi: 'Kompleks Pelelangan Ikan Tuminting',
                kecamatan: 'Tuminting',
                tanggal: '05 November 2026',
                target_kuota: 200,
                terdaftar: 112,
                terlayani: 0,
                status: 'Terjadwal',
                komoditas_tersalurkan: [
                    { nama: 'Beras SPHP 5kg', jumlah: '1.000 kg' },
                    { nama: 'Bawang Merah 1kg', jumlah: '200 kg' },
                    { nama: 'Cabai Rawit 0.5kg', jumlah: '100 kg' }
                ]
            }
        ];
    }

    // 3. Ekspor Laporan Komoditas Pangan ke Format CSV (Kompatibel Excel)
    eksporLaporanHargaCSV(daftarKomoditas) {
        if (!daftarKomoditas || daftarKomoditas.length === 0) {
            alert('Tidak ada data komoditas pangan untuk diunduh.');
            return;
        }

        const barisHeader = ['No', 'Komoditas', 'Kategori', 'Satuan', 'Harga (Rp)', 'Pasar', 'Tanggal Penetapan', 'Status Publikasi', 'Instansi Penanggung Jawab'];
        const barisData = daftarKomoditas.map((item, idx) => [
            idx + 1,
            `"${item.nama_komoditas || ''}"`,
            `"${item.kategori || 'Bahan Pokok'}"`,
            `"${item.satuan || 'kg'}"`,
            item.harga || 0,
            `"${item.nama_pasar || ''}"`,
            `"${item.tanggal_penetapan || ''}"`,
            `"${item.status || 'Terbit'}"`,
            `"${this.bidangResmi} - ${this.instansi}"`
        ]);

        const isiCSV = [barisHeader.join(','), ...barisData.map(b => b.join(','))].join('\r\n');
        const blob = new Blob(['\uFEFF' + isiCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const tautan = document.createElement('a');
        tautan.setAttribute('href', url);
        tautan.setAttribute('download', `Laporan_Harga_Pangan_Manado_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(tautan);
        tautan.click();
        document.body.removeChild(tautan);
        URL.revokeObjectURL(url);
    }
}

export const laporanService = new LaporanService();
