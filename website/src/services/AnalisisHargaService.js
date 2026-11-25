// ===================================================================================
// Modul Analisis & Penyaringan Harga Pangan Publik (OOP)
// Fungsi: Menormalisasi satuan (per 1 KG / 1 Liter) agar perbandingan & pengurutan
//         harga adil, mengelompokkan komoditas lintas pasar (menentukan pasar termurah
//         & termahal), menyortir berdasarkan prioritas masyarakat / harga / popularitas,
//         serta menghitung statistik & stempel pembaruan murni dari data DB.
// ===================================================================================

export class AnalisisHargaService {
    constructor() {
        this.kategoriBaku = ['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah', 'Lainnya'];
    }

    // Menormalisasi penulisan satuan agar seragam dan terkunci per 1 unit (1 KG, 1 Liter, 1 Baki, dst.)
    normalisasiSatuan(satuan) {
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

        // Jika masih ada data lama tanpa angka 1 di depan (misal "baki", "ikat")
        if (!/^\d/.test(bersih)) {
            return `1 ${bersih.charAt(0).toUpperCase() + bersih.slice(1)}`;
        }
        return bersih;
    }

    // Harga standar langsung menggunakan harga resmi per 1 satuan Master Satuan Admin
    hitungHargaStandar(harga, satuan) {
        const nominal = Math.round(Number(harga) || 0);
        const teksSatuan = this.normalisasiSatuan(satuan);
        return {
            hargaStandar: nominal,
            labelStandar: teksSatuan,
            perluKonversi: false
        };
    }

    // Menentukan skor prioritas tampil (angka kecil = lebih utama bagi masyarakat)
    // Mengutamakan kolom 'prioritas_tampil' dari DB; jika belum dimigrasi memakai urutan pangan pokok strategis Bapanas
    tentukanPrioritasKomoditas(item) {
        const nilaiDB = Number(item?.prioritas_tampil);
        if (Number.isFinite(nilaiDB) && nilaiDB > 0 && nilaiDB !== 50) {
            return nilaiDB;
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

    // Kunci unik nama komoditas untuk pengelompokan lintas pasar
    kunciKomoditas(nama) {
        return String(nama || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    // Kunci unik pasangan komoditas + pasar untuk memetakan riwayat perubahan harga
    kunciKomoditasPasar(namaKomoditas, namaPasar) {
        return `${this.kunciKomoditas(namaKomoditas)}||${String(namaPasar || '').toLowerCase().trim()}`;
    }

    // Mengekstrak daftar pasar unik murni dari data harga pangan yang ada di DB
    ekstrakDaftarPasarUnik(daftarTerbit = []) {
        const setPasar = new Set();
        (Array.isArray(daftarTerbit) ? daftarTerbit : []).forEach((item) => {
            const p = (item?.nama_pasar || '').trim();
            if (p) setPasar.add(p);
        });
        return Array.from(setPasar).sort((a, b) => a.localeCompare(b, 'id-ID'));
    }

    // Mengambil stempel waktu pembaruan terakhir yang sebenarnya dari baris DB
    ambilPembaruanTerakhir(daftarTerbit = []) {
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
            const jam = d.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${tgl} • ${jam} WITA`;
        }

        return tanggalTeksTerbaru || 'Data aktif dari basis data';
    }

    // Membangun peta delta perubahan harga terbaru dari catatan riwayat_harga_pangan riil
    buatPetaDeltaTerbaru(daftarRiwayat = []) {
        const petaPasar = new Map();
        const petaKomoditas = new Map();

        if (!Array.isArray(daftarRiwayat)) {
            return { petaPasar, petaKomoditas };
        }

        // Pastikan urut dari yang paling baru dicatat
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

    // Menghitung jumlah komoditas riil per kategori (menyesuaikan pasar yang dipilih & mode tampilan)
    hitungStatistikKategori(daftarTerbit = [], pasarTerpilih = [], modeTampilan = 'ringkasan') {
        const hitungan = {
            Semua: 0,
            'Bahan Pokok': 0,
            Hewani: 0,
            Sayuran: 0,
            Buah: 0,
            Lainnya: 0
        };

        const setPasarFilter = new Set((pasarTerpilih || []).map((p) => p.toLowerCase()));
        const tersaring = (Array.isArray(daftarTerbit) ? daftarTerbit : []).filter((item) => {
            if (setPasarFilter.size === 0) return true;
            return setPasarFilter.has((item?.nama_pasar || '').toLowerCase());
        });

        if (modeTampilan === 'ringkasan') {
            const unikPerKomoditas = new Map();
            tersaring.forEach((item) => {
                const k = this.kunciKomoditas(item.nama_komoditas);
                if (!unikPerKomoditas.has(k)) {
                    unikPerKomoditas.set(k, item.kategori || 'Lainnya');
                }
            });
            hitungan.Semua = unikPerKomoditas.size;
            unikPerKomoditas.forEach((kat) => {
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

    // Memfilter baris dasar berdasarkan kategori, pencarian teks, dan multi-select pasar
    saringBarisDasar(daftarTerbit = [], { kategori = 'Semua', pencarian = '', pasarTerpilih = [] } = {}) {
        const setPasar = new Set((pasarTerpilih || []).map((p) => p.toLowerCase()));
        const kataKunci = String(pencarian || '').toLowerCase().trim();
        const katFilter = String(kategori || 'Semua').toLowerCase();

        return (Array.isArray(daftarTerbit) ? daftarTerbit : []).filter((item) => {
            if (setPasar.size > 0 && !setPasar.has((item?.nama_pasar || '').toLowerCase())) {
                return false;
            }
            if (katFilter !== 'semua') {
                const katItem = (item?.kategori || 'Lainnya').toLowerCase();
                if (katFilter === 'lainnya') {
                    const dikenal = ['bahan pokok', 'hewani', 'sayuran', 'buah'].includes(katItem);
                    if (dikenal) return false;
                } else if (katItem !== katFilter) {
                    return false;
                }
            }
            if (kataKunci) {
                const cocokNama = (item?.nama_komoditas || '').toLowerCase().includes(kataKunci);
                const cocokPasar = (item?.nama_pasar || '').toLowerCase().includes(kataKunci);
                const cocokKat = (item?.kategori || '').toLowerCase().includes(kataKunci);
                if (!cocokNama && !cocokPasar && !cocokKat) return false;
            }
            return true;
        });
    }

    // Mengelompokkan data harga pangan lintas pasar menjadi kartu ringkasan komoditas cerdas
    // Langsung menentukan pasar termurah, pasar termahal, rentang harga, rata-rata, dan urutan
    kelompokkanPerKomoditas(
        daftarTerbit = [],
        { kategori = 'Semua', pencarian = '', pasarTerpilih = [], urutkan = 'prioritas', petaDelta = null } = {}
    ) {
        const barisTersaring = this.saringBarisDasar(daftarTerbit, { kategori, pencarian, pasarTerpilih });
        const grupMap = new Map();

        barisTersaring.forEach((item) => {
            const kunci = this.kunciKomoditas(item.nama_komoditas);
            const satuanRapi = this.normalisasiSatuan(item.satuan);
            const norm = this.hitungHargaStandar(item.harga, satuanRapi);
            const deltaItem = petaDelta?.petaPasar?.get(this.kunciKomoditasPasar(item.nama_komoditas, item.nama_pasar)) || null;

            const entriPasar = {
                ...item,
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
                    nama_komoditas: item.nama_komoditas,
                    kategori: item.kategori || 'Bahan Pokok',
                    prioritas: this.tentukanPrioritasKomoditas(item),
                    daftarPasarItem: [entriPasar]
                });
            } else {
                const grup = grupMap.get(kunci);
                grup.daftarPasarItem.push(entriPasar);
                grup.prioritas = Math.min(grup.prioritas, this.tentukanPrioritasKomoditas(item));
            }
        });

        const hasil = Array.from(grupMap.values()).map((grup) => {
            // Urutkan pasar di dalam komoditas dari TERMURAH ke TERMAHAL berdasarkan harga ternormalisasi
            const pasarTerurut = [...grup.daftarPasarItem].sort((a, b) => {
                if (a.hargaStandar !== b.hargaStandar) return a.hargaStandar - b.hargaStandar;
                return a.harga - b.harga;
            });

            const termurah = pasarTerurut[0];
            const termahal = pasarTerurut[pasarTerurut.length - 1];
            const rataStandar = Math.round(
                pasarTerurut.reduce((acc, p) => acc + p.hargaStandar, 0) / pasarTerurut.length
            );
            const rataAsli = Math.round(
                pasarTerurut.reduce((acc, p) => acc + p.harga, 0) / pasarTerurut.length
            );
            const totalDilihat = pasarTerurut.reduce((acc, p) => acc + (Number(p.jumlah_dilihat) || 0), 0);

            // Ambil tanggal pembaruan paling akhir dari salah satu pasar komoditas ini
            const terbaruItem = [...pasarTerurut].sort(
                (a, b) => new Date(b.diperbarui_pada || b.dibuat_pada || 0).getTime() -
                          new Date(a.diperbarui_pada || a.dibuat_pada || 0).getTime()
            )[0];

            // Pilih delta paling relevan dari pasar yang masuk kelompok ini
            const deltaKandidat = pasarTerurut
                .map((p) => p.delta)
                .filter(Boolean)
                .sort((a, b) => new Date(b.dicatatPada || 0).getTime() - new Date(a.dicatatPada || 0).getTime());

            const deltaTerbaru = deltaKandidat[0] || petaDelta?.petaKomoditas?.get(grup.kunci) || null;
            const adaPerbedaanHarga = pasarTerurut.length > 1 && termurah.hargaStandar !== termahal.hargaStandar;

            return {
                id: termurah.id,
                kunci: grup.kunci,
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

        // Pengurutan multi-kriteria (default: prioritas masyarakat, BUKAN terbaru diinput)
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
            // Default: 'prioritas' (kebutuhan pokok strategis masyarakat -> popularitas -> abjad)
            if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
            if (b.totalDilihat !== a.totalDilihat) return b.totalDilihat - a.totalDilihat;
            return a.nama_komoditas.localeCompare(b.nama_komoditas, 'id-ID');
        });

        return hasil;
    }

    // Menyusun daftar kartu datar (1 baris per pasar) dengan penanda otomatis Termurah/Termahal
    susunDaftarSemuaPasar(
        daftarTerbit = [],
        { kategori = 'Semua', pencarian = '', pasarTerpilih = [], urutkan = 'prioritas', petaDelta = null } = {}
    ) {
        const grupList = this.kelompokkanPerKomoditas(daftarTerbit, {
            kategori,
            pencarian,
            pasarTerpilih,
            urutkan: 'prioritas',
            petaDelta
        });

        const datar = [];
        grupList.forEach((grup) => {
            grup.daftarPasarItem.forEach((item) => {
                let posisiPasar = 'tunggal';
                if (grup.jumlahPasar > 1 && grup.adaPerbedaanHarga) {
                    if (item.hargaStandar === grup.hargaStandarMin) posisiPasar = 'termurah';
                    else if (item.hargaStandar === grup.hargaStandarMax) posisiPasar = 'termahal';
                    else posisiPasar = 'tengah';
                }
                datar.push({
                    ...item,
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

    // Format nominal ke Rupiah Indonesia
    formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(Number(angka) || 0).replace('IDR', 'Rp');
    }

    // Format stempel waktu ISO menjadi tanggal ringkas bahasa Indonesia
    formatTanggalRingkas(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return String(isoString);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    // Format stempel waktu ISO lengkap beserta jam WITA
    formatTanggalWaktu(isoString) {
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

export const analisisHargaService = new AnalisisHargaService();
