// ===================================================================================
// Modul Layanan Master Data Resmi - Admin & Superadmin (OOP)
// Fungsi: Mengelola daftar Master Satuan (terkunci per 1 unit seperti 1 KG, 1 Liter,
//         1 Baki), Master Komoditas Terstruktur (Induk, Varian & Sinonim Pencarian),
//         Master Pasar, dan Master Kecamatan langsung ke basis data Supabase
//         agar tersinkron otomatis ke formulir Staf/Kabid dan portal publik.
// ===================================================================================

import { supabaseClient } from './SupabaseClient.js';

export class MasterDataService {
    constructor() {
        this.kunciCacheSatuan = 'sipatokaan_master_satuan';
        this.kunciCachePasar = 'sipatokaan_master_pasar';
        this.kunciCacheKecamatan = 'sipatokaan_master_kecamatan';
        this.kunciCacheKomoditas = 'sipatokaan_master_komoditas';
        this.satuanDasar = ['1 KG', '1 Liter', '1 Baki', '1 Ikat', '1 Ekor', '1 Bungkus'];
        this.pasarDasar = [
            'Pasar Bersehati Karombasan',
            'Pasar Tradisional Bahu',
            'Pasar Tradisional Tuminting',
            'Pasar Bersehati Sario'
        ];
        this.kecamatanDasar = [
            'Wenang', 'Tikala', 'Wanea', 'Sario', 'Malalayang',
            'Tuminting', 'Singkil', 'Mapanget', 'Paal Dua', 'Bunaken', 'Bunaken Kepulauan'
        ];
        this.komoditasDasar = [
            { kelompok_komoditas: 'Beras', nama_komoditas: 'Beras SPHP', kategori: 'Bahan Pokok', satuan_bawaan: '1 KG', kata_kunci: 'beras bulog, beras murah, beras subsidi, beras biasa', prioritas_tampil: 10 },
            { kelompok_komoditas: 'Beras', nama_komoditas: 'Beras Medium', kategori: 'Bahan Pokok', satuan_bawaan: '1 KG', kata_kunci: 'beras biasa, beras standar, beras lokal, beras harian', prioritas_tampil: 11 },
            { kelompok_komoditas: 'Beras', nama_komoditas: 'Beras Premium', kategori: 'Bahan Pokok', satuan_bawaan: '1 KG', kata_kunci: 'beras super, beras pulen, beras kepala, beras bagus', prioritas_tampil: 12 },
            { kelompok_komoditas: 'Minyak Goreng', nama_komoditas: 'Minyakita', kategori: 'Bahan Pokok', satuan_bawaan: '1 Liter', kata_kunci: 'minyak subsidi, minyak pemerintah, minyak murah', prioritas_tampil: 15 },
            { kelompok_komoditas: 'Minyak Goreng', nama_komoditas: 'Minyak Goreng Kemasan', kategori: 'Bahan Pokok', satuan_bawaan: '1 Liter', kata_kunci: 'minyak goreng, minyak kemasan, minyak premium', prioritas_tampil: 16 },
            { kelompok_komoditas: 'Minyak Goreng', nama_komoditas: 'Minyak Goreng Curah', kategori: 'Bahan Pokok', satuan_bawaan: '1 Liter', kata_kunci: 'minyak curah, minyak biasa', prioritas_tampil: 17 },
            { kelompok_komoditas: 'Gula', nama_komoditas: 'Gula Pasir', kategori: 'Bahan Pokok', satuan_bawaan: '1 KG', kata_kunci: 'gula putih, gula kristal, gula konsumsi', prioritas_tampil: 20 },
            { kelompok_komoditas: 'Cabai', nama_komoditas: 'Cabai Rawit Merah', kategori: 'Sayuran', satuan_bawaan: '1 KG', kata_kunci: 'rica, rica merah, lombok, cabai setan, cabai kecil', prioritas_tampil: 22 },
            { kelompok_komoditas: 'Cabai', nama_komoditas: 'Cabai Keriting', kategori: 'Sayuran', satuan_bawaan: '1 KG', kata_kunci: 'rica keriting, cabai merah keriting, lombok merah', prioritas_tampil: 23 },
            { kelompok_komoditas: 'Bawang', nama_komoditas: 'Bawang Merah', kategori: 'Sayuran', satuan_bawaan: '1 KG', kata_kunci: 'bawang merah lokal, rempah', prioritas_tampil: 25 },
            { kelompok_komoditas: 'Bawang', nama_komoditas: 'Bawang Putih', kategori: 'Sayuran', satuan_bawaan: '1 KG', kata_kunci: 'bawang putih honan, bawang putih kating', prioritas_tampil: 26 },
            { kelompok_komoditas: 'Telur', nama_komoditas: 'Telur Ayam', kategori: 'Hewani', satuan_bawaan: '1 KG', kata_kunci: 'telur ayam ras, telur biasa, telur baki', prioritas_tampil: 30 },
            { kelompok_komoditas: 'Daging', nama_komoditas: 'Daging Ayam', kategori: 'Hewani', satuan_bawaan: '1 KG', kata_kunci: 'ayam ras, ayam potong, daging ayam segar', prioritas_tampil: 35 },
            { kelompok_komoditas: 'Ikan', nama_komoditas: 'Ikan Tongkol', kategori: 'Hewani', satuan_bawaan: '1 KG', kata_kunci: 'ikan laut, ikan segar, cakalang, deho', prioritas_tampil: 36 },
            { kelompok_komoditas: 'Daging', nama_komoditas: 'Daging Sapi', kategori: 'Hewani', satuan_bawaan: '1 KG', kata_kunci: 'daging sapi segar, paha belakang, sapi murni', prioritas_tampil: 40 },
            { kelompok_komoditas: 'Tepung', nama_komoditas: 'Tepung Terigu', kategori: 'Bahan Pokok', satuan_bawaan: '1 KG', kata_kunci: 'terigu, tepung segitiga, tepung gandum', prioritas_tampil: 42 }
        ];
    }

    // Menebak nama kelompok induk komoditas dari nama varian secara konsisten
    tebakKelompokKomoditas(namaKomoditas) {
        const teks = String(namaKomoditas || '').trim();
        const rendah = teks.toLowerCase();
        if (!rendah) return 'Lainnya';
        if (rendah.includes('beras')) return 'Beras';
        if (rendah.includes('minyak')) return 'Minyak Goreng';
        if (rendah.includes('gula')) return 'Gula';
        if (rendah.includes('cabai') || rendah.includes('rica') || rendah.includes('lombok')) return 'Cabai';
        if (rendah.includes('bawang')) return 'Bawang';
        if (rendah.includes('telur')) return 'Telur';
        if (rendah.includes('daging') || rendah.includes('ayam') || rendah.includes('sapi')) return 'Daging';
        if (rendah.includes('ikan') || rendah.includes('tongkol') || rendah.includes('cakalang') || rendah.includes('tuna') || rendah.includes('deho')) return 'Ikan';
        if (rendah.includes('tepung') || rendah.includes('terigu')) return 'Tepung';
        const kataPertama = teks.split(/\s+/)[0] || 'Lainnya';
        return kataPertama.charAt(0).toUpperCase() + kataPertama.slice(1).toLowerCase();
    }

    // Mengunci format satuan selalu per 1 unit (contoh: "kg" -> "1 KG", "liter" -> "1 Liter", "baki" -> "1 Baki")
    formatSatuanPerSatu(input) {
        let teks = String(input || '').replace(/[\/]+/g, '').trim();
        if (!teks) throw new Error('Nama satuan tidak boleh kosong!');

        // Tolak jika mengandung angka selain 1 di awal (karena satuan dikunci per 1)
        const cocokAngka = teks.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
        if (cocokAngka) {
            const angka = parseFloat(cocokAngka[1].replace(',', '.'));
            if (angka !== 1) {
                throw new Error('Satuan dikunci per 1 unit saja! Cukup ketik nama satuannya (contoh: KG, Liter, Baki, Ikat, Ekor).');
            }
            teks = (cocokAngka[2] || '').trim();
        }

        if (!teks) throw new Error('Nama satuan wajib diisi (contoh: KG, Liter, Baki, Ikat).');
        if (/^(gram|gr|g|ml|mililiter)$/i.test(teks)) {
            throw new Error('Gunakan satuan standar per 1 utuh (contoh: KG atau Liter), bukan pecahan gram/ml.');
        }

        if (/^(kg|kilogram)$/i.test(teks)) return '1 KG';
        if (/^(l|ltr|liter)$/i.test(teks)) return '1 Liter';

        const kapital = teks.charAt(0).toUpperCase() + teks.slice(1).toLowerCase();
        return `1 ${kapital}`;
    }

    // ─────────────────────────────────────────────
    // 1. MASTER SATUAN (TERKUNCI PER 1)
    // ─────────────────────────────────────────────
    async ambilDaftarSatuan() {
        try {
            const rows = await supabaseClient.getMasterSatuan();
            if (Array.isArray(rows) && rows.length > 0) {
                const list = rows.map((r) => r.nama_satuan).filter(Boolean);
                localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(list));
                return list;
            }
        } catch (err) {
            console.warn('Tabel master_satuan belum dimigrasi / offline, menggunakan cache:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCacheSatuan);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [...this.satuanDasar];
    }

    async tambahSatuan(inputSatuan) {
        const satuanResmi = this.formatSatuanPerSatu(inputSatuan);
        const daftarSekarang = await this.ambilDaftarSatuan();

        if (daftarSekarang.some((s) => s.toLowerCase() === satuanResmi.toLowerCase())) {
            throw new Error(`Satuan "${satuanResmi}" sudah terdaftar di Master Satuan.`);
        }

        try {
            await supabaseClient.tambahMasterSatuan(satuanResmi);
        } catch (err) {
            console.warn('Gagal simpan master_satuan ke Supabase, tersimpan di cache lokal:', err?.message);
        }

        const terbaru = [...daftarSekarang, satuanResmi];
        localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(terbaru));
        return terbaru;
    }

    async hapusSatuan(namaSatuan) {
        const daftarSekarang = await this.ambilDaftarSatuan();
        if (daftarSekarang.length <= 1) {
            throw new Error('Minimal harus tersisa 1 Master Satuan aktif.');
        }

        try {
            await supabaseClient.hapusMasterSatuan(namaSatuan);
        } catch (err) {
            console.warn('Gagal hapus master_satuan di Supabase:', err?.message);
        }

        const terbaru = daftarSekarang.filter((s) => s !== namaSatuan);
        localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(terbaru));
        return terbaru;
    }

    // ─────────────────────────────────────────────
    // 2. MASTER PASAR (LENGKAP + TITIK PETA, 100% SUPABASE)
    // ─────────────────────────────────────────────
    normalisasiItemPasar(row) {
        const lat = row?.latitude !== null && row?.latitude !== undefined && row?.latitude !== ''
            ? Number(row.latitude)
            : null;
        const lng = row?.longitude !== null && row?.longitude !== undefined && row?.longitude !== ''
            ? Number(row.longitude)
            : null;
        const punyaKoordinat =
            lat !== null &&
            lng !== null &&
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            !(lat === 0 && lng === 0);

        return {
            id: row?.id ? String(row.id) : '',
            nama_pasar: String(row?.nama_pasar || '').trim(),
            alamat: String(row?.alamat || '').trim(),
            kecamatan: String(row?.kecamatan || '').trim(),
            latitude: punyaKoordinat ? lat : null,
            longitude: punyaKoordinat ? lng : null,
            punyaKoordinat,
            dibuat_pada: row?.dibuat_pada || null,
            diperbarui_pada: row?.diperbarui_pada || null
        };
    }

    // Mengambil daftar pasar LENGKAP beserta titik peta murni dari Supabase (0% data dummy)
    async ambilDaftarPasarLengkap() {
        const rows = await supabaseClient.getMasterPasar();
        if (!Array.isArray(rows)) {
            throw new Error('Respon daftar pasar dari basis data tidak valid.');
        }
        const daftarLengkap = rows
            .filter((r) => r?.nama_pasar)
            .map((r) => this.normalisasiItemPasar(r))
            .sort((a, b) => a.nama_pasar.localeCompare(b.nama_pasar, 'id-ID'));

        try {
            localStorage.setItem(
                this.kunciCachePasar,
                JSON.stringify(daftarLengkap.map((p) => p.nama_pasar))
            );
        } catch (_) {}

        return daftarLengkap;
    }

    async ambilDaftarPasar() {
        try {
            const daftarLengkap = await this.ambilDaftarPasarLengkap();
            return daftarLengkap.map((p) => p.nama_pasar);
        } catch (err) {
            console.warn('Gagal mengambil master_pasar dari Supabase:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCachePasar);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [];
    }

    async tambahPasar(inputPasar) {
        const payload = typeof inputPasar === 'string'
            ? { nama_pasar: inputPasar.trim(), alamat: '', kecamatan: '', latitude: null, longitude: null }
            : {
                nama_pasar: String(inputPasar?.nama_pasar || '').trim(),
                alamat: String(inputPasar?.alamat || '').trim(),
                kecamatan: String(inputPasar?.kecamatan || '').trim(),
                latitude:
                    inputPasar?.latitude !== null && inputPasar?.latitude !== undefined && inputPasar?.latitude !== ''
                        ? Number(inputPasar.latitude)
                        : null,
                longitude:
                    inputPasar?.longitude !== null && inputPasar?.longitude !== undefined && inputPasar?.longitude !== ''
                        ? Number(inputPasar.longitude)
                        : null
            };

        if (!payload.nama_pasar) throw new Error('Nama pasar wajib diisi.');

        const daftarSekarang = await this.ambilDaftarPasarLengkap();
        if (daftarSekarang.some((p) => p.nama_pasar.toLowerCase() === payload.nama_pasar.toLowerCase())) {
            throw new Error(`Pasar "${payload.nama_pasar}" sudah terdaftar.`);
        }

        try {
            await supabaseClient.tambahMasterPasar(payload);
        } catch (err) {
            const msg = String(err?.message || '');
            if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('does not exist')) {
                throw new Error('Kolom lokasi belum ada di Supabase. Silakan jalankan file migrasi_master_pasar_lokasi.sql di Supabase SQL Editor terlebih dahulu.');
            }
            throw new Error(msg.replace(/^Supabase Error:\s*/i, '') || 'Gagal menyimpan pasar ke basis data Supabase.');
        }

        return this.ambilDaftarPasarLengkap();
    }

    async perbaruiPasar(idAtauNamaLama, inputPasar, namaLamaAsli = '') {
        const payload = {
            nama_pasar: String(inputPasar?.nama_pasar || '').trim(),
            alamat: String(inputPasar?.alamat || '').trim(),
            kecamatan: String(inputPasar?.kecamatan || '').trim(),
            latitude:
                inputPasar?.latitude !== null && inputPasar?.latitude !== undefined && inputPasar?.latitude !== ''
                    ? Number(inputPasar.latitude)
                    : null,
            longitude:
                inputPasar?.longitude !== null && inputPasar?.longitude !== undefined && inputPasar?.longitude !== ''
                    ? Number(inputPasar.longitude)
                    : null
        };

        if (!payload.nama_pasar) throw new Error('Nama pasar wajib diisi.');

        const daftarSekarang = await this.ambilDaftarPasarLengkap();
        const bentrok = daftarSekarang.find(
            (p) =>
                p.nama_pasar.toLowerCase() === payload.nama_pasar.toLowerCase() &&
                String(p.id) !== String(idAtauNamaLama) &&
                p.nama_pasar.toLowerCase() !== String(namaLamaAsli || idAtauNamaLama).toLowerCase()
        );
        if (bentrok) {
            throw new Error(`Nama pasar "${payload.nama_pasar}" sudah digunakan oleh pasar lain.`);
        }

        try {
            await supabaseClient.updateMasterPasar(idAtauNamaLama, payload);
            if (namaLamaAsli && namaLamaAsli !== payload.nama_pasar) {
                await supabaseClient.sinkronNamaPasarDiHarga(namaLamaAsli, payload.nama_pasar);
            }
        } catch (err) {
            const msg = String(err?.message || '');
            if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('does not exist')) {
                throw new Error('Kolom lokasi belum ada di Supabase. Silakan jalankan file migrasi_master_pasar_lokasi.sql di Supabase SQL Editor terlebih dahulu.');
            }
            throw new Error(msg.replace(/^Supabase Error:\s*/i, '') || 'Gagal memperbarui data pasar di Supabase.');
        }

        return this.ambilDaftarPasarLengkap();
    }

    async hapusPasar(idAtauNama) {
        try {
            await supabaseClient.hapusMasterPasar(idAtauNama);
        } catch (err) {
            throw new Error(String(err?.message || 'Gagal menghapus pasar di Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }
        return this.ambilDaftarPasarLengkap();
    }

    // ─────────────────────────────────────────────
    // 3. MASTER KECAMATAN (SINKRON SUPABASE)
    // ─────────────────────────────────────────────
    async ambilDaftarKecamatan() {
        try {
            const rows = await supabaseClient.getMasterKecamatan();
            if (Array.isArray(rows) && rows.length > 0) {
                const list = rows.map((r) => r.nama_kecamatan).filter(Boolean);
                localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(list));
                return list;
            }
        } catch (err) {
            console.warn('Tabel master_kecamatan belum dimigrasi / offline, menggunakan cache:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCacheKecamatan);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [...this.kecamatanDasar];
    }

    async tambahKecamatan(namaKecamatan) {
        const bersih = String(namaKecamatan || '').trim();
        if (!bersih) throw new Error('Nama kecamatan tidak boleh kosong.');
        const daftarSekarang = await this.ambilDaftarKecamatan();

        if (daftarSekarang.some((k) => k.toLowerCase() === bersih.toLowerCase())) {
            throw new Error(`Kecamatan "${bersih}" sudah ada di sistem.`);
        }

        try {
            await supabaseClient.tambahMasterKecamatan(bersih);
        } catch (err) {
            console.warn('Gagal simpan master_kecamatan ke Supabase:', err?.message);
        }

        const terbaru = [...daftarSekarang, bersih].sort((a, b) => a.localeCompare(b, 'id-ID'));
        localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(terbaru));
        return terbaru;
    }

    async hapusKecamatan(namaKecamatan) {
        const daftarSekarang = await this.ambilDaftarKecamatan();
        if (daftarSekarang.length <= 1) {
            throw new Error('Minimal harus tersisa 1 kecamatan terdaftar.');
        }

        try {
            await supabaseClient.hapusMasterKecamatan(namaKecamatan);
        } catch (err) {
            console.warn('Gagal hapus master_kecamatan di Supabase:', err?.message);
        }

        const terbaru = daftarSekarang.filter((k) => k !== namaKecamatan);
        localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(terbaru));
        return terbaru;
    }

    // ─────────────────────────────────────────────
    // 4. MASTER KOMODITAS RESMI (INDUK, VARIAN & SINONIM)
    // ─────────────────────────────────────────────
    urutkanKomoditas(daftar = []) {
        return [...daftar].sort((a, b) => {
            const pA = Number(a?.prioritas_tampil) || 50;
            const pB = Number(b?.prioritas_tampil) || 50;
            if (pA !== pB) return pA - pB;
            const kelCmp = String(a?.kelompok_komoditas || '').localeCompare(String(b?.kelompok_komoditas || ''), 'id-ID');
            if (kelCmp !== 0) return kelCmp;
            return String(a?.nama_komoditas || '').localeCompare(String(b?.nama_komoditas || ''), 'id-ID');
        });
    }

    async ambilDaftarKomoditas() {
        try {
            const rows = await supabaseClient.getMasterKomoditas();
            if (Array.isArray(rows) && rows.length > 0) {
                const rapi = this.urutkanKomoditas(
                    rows
                        .filter((r) => r?.nama_komoditas)
                        .map((r) => ({
                            id: r.id,
                            kelompok_komoditas: (r.kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(r.nama_komoditas),
                            nama_komoditas: String(r.nama_komoditas).trim(),
                            kategori: r.kategori || 'Bahan Pokok',
                            satuan_bawaan: r.satuan_bawaan || '1 KG',
                            kata_kunci: r.kata_kunci || '',
                            prioritas_tampil: Number(r.prioritas_tampil) || 50
                        }))
                );
                localStorage.setItem(this.kunciCacheKomoditas, JSON.stringify(rapi));
                return rapi;
            }
        } catch (err) {
            console.warn('Tabel master_komoditas belum dimigrasi / offline, menggunakan cache:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCacheKomoditas);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed) && parsed.length > 0) return this.urutkanKomoditas(parsed);
            }
        } catch (_) {}
        return this.urutkanKomoditas(this.komoditasDasar);
    }

    async tambahKomoditas({
        kelompok_komoditas = '',
        nama_komoditas = '',
        kategori = 'Bahan Pokok',
        satuan_bawaan = '1 KG',
        kata_kunci = '',
        prioritas_tampil = 50
    } = {}) {
        const namaBersih = String(nama_komoditas || '').trim();
        if (!namaBersih) throw new Error('Nama varian komoditas wajib diisi (contoh: Beras Medium, Beras Premium).');

        const kelompokBersih = String(kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(namaBersih);
        const satuanResmi = this.formatSatuanPerSatu(satuan_bawaan || '1 KG');
        const daftarSekarang = await this.ambilDaftarKomoditas();

        if (daftarSekarang.some((k) => k.nama_komoditas.toLowerCase() === namaBersih.toLowerCase())) {
            throw new Error(`Komoditas "${namaBersih}" sudah terdaftar di Master Komoditas.`);
        }

        const itemBaru = {
            kelompok_komoditas: kelompokBersih,
            nama_komoditas: namaBersih,
            kategori: kategori || 'Bahan Pokok',
            satuan_bawaan: satuanResmi,
            kata_kunci: String(kata_kunci || '').trim(),
            prioritas_tampil: Number(prioritas_tampil) || 50
        };

        try {
            const saved = await supabaseClient.tambahMasterKomoditas(itemBaru);
            if (saved?.id) itemBaru.id = saved.id;
        } catch (err) {
            console.warn('Gagal simpan master_komoditas ke Supabase, tersimpan di cache lokal:', err?.message);
        }

        const terbaru = this.urutkanKomoditas([...daftarSekarang, itemBaru]);
        localStorage.setItem(this.kunciCacheKomoditas, JSON.stringify(terbaru));
        return terbaru;
    }

    async hapusKomoditas(namaKomoditas) {
        const daftarSekarang = await this.ambilDaftarKomoditas();
        if (daftarSekarang.length <= 1) {
            throw new Error('Minimal harus tersisa 1 Master Komoditas aktif.');
        }

        try {
            await supabaseClient.hapusMasterKomoditas(namaKomoditas);
        } catch (err) {
            console.warn('Gagal hapus master_komoditas di Supabase:', err?.message);
        }

        const terbaru = daftarSekarang.filter((k) => k.nama_komoditas !== namaKomoditas);
        localStorage.setItem(this.kunciCacheKomoditas, JSON.stringify(terbaru));
        return terbaru;
    }

    // Mengelompokkan Master Komoditas berdasarkan Komoditas Induk untuk dropdown <optgroup> & manajemen Admin
    kelompokkanKomoditasUntukDropdown(daftarKomoditas = []) {
        const peta = new Map();
        (Array.isArray(daftarKomoditas) ? daftarKomoditas : []).forEach((item) => {
            const kel = (item?.kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(item?.nama_komoditas);
            if (!peta.has(kel)) {
                peta.set(kel, {
                    kelompok: kel,
                    prioritas: Number(item?.prioritas_tampil) || 50,
                    items: []
                });
            }
            const grup = peta.get(kel);
            grup.items.push(item);
            grup.prioritas = Math.min(grup.prioritas, Number(item?.prioritas_tampil) || 50);
        });

        return Array.from(peta.values())
            .sort((a, b) => {
                if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
                return a.kelompok.localeCompare(b.kelompok, 'id-ID');
            })
            .map((g) => ({
                ...g,
                items: this.urutkanKomoditas(g.items)
            }));
    }
}

export const masterDataService = new MasterDataService();
