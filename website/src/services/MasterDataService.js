// ===================================================================================
// Modul Layanan Master Data Resmi - Admin & Superadmin (OOP)
// Fungsi: Mengelola daftar Master Satuan (terkunci per 1 unit seperti 1 KG, 1 Liter,
//         1 Baki), Master Komoditas Terstruktur (Induk, Varian & Sinonim Pencarian),
//         Master Pasar, dan Master Kecamatan 100% langsung ke basis data Supabase
//         tanpa array data dummy hardcoded dan tanpa silent error.
// ===================================================================================

import { supabaseClient } from './SupabaseClient.js';

// Daftar Urutan Tampil Publik Bahasa Awam (Opsi A — Tanpa Angka Teknis di UI)
export const OPSI_URUTAN_TAMPIL_PUBLIK = [
    { nilai: 10, label: '⭐ Paling Atas (Sangat Utama)', badge: '⭐ Paling Atas' },
    { nilai: 20, label: '🔝 Atas (Bahan Pokok Utama)', badge: '🔝 Atas' },
    { nilai: 30, label: '📌 Menengah (Penting)', badge: '📌 Menengah' },
    { nilai: 50, label: '📋 Standar (Normal)', badge: '📋 Standar' },
    { nilai: 70, label: '⬇️ Bawah (Tambahan)', badge: '⬇️ Bawah' }
];

export class MasterDataService {
    constructor() {
        this.kunciCacheSatuan = 'sipatokaan_master_satuan';
        this.kunciCachePasar = 'sipatokaan_master_pasar';
        this.kunciCacheKecamatan = 'sipatokaan_master_kecamatan';
        this.kunciCacheKomoditas = 'sipatokaan_master_komoditas';
        this.kunciCacheInduk = 'sipatokaan_master_induk_komoditas';
    }

    // Mengonversi nilai urutan tampil numerik database menjadi label ramah pengguna (Opsi A)
    ambilLabelUrutanTampil(prioritas) {
        const angka = Number(prioritas) || 50;
        if (angka <= 12) return '⭐ Paling Atas';
        if (angka <= 22) return '🔝 Atas';
        if (angka <= 38) return '📌 Menengah';
        if (angka <= 60) return '📋 Standar';
        return '⬇️ Bawah';
    }

    normalisasiNilaiUrutanTampil(prioritas) {
        const angka = Number(prioritas) || 50;
        if (angka <= 12) return 10;
        if (angka <= 22) return 20;
        if (angka <= 38) return 30;
        if (angka <= 60) return 50;
        return 70;
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
    // 1. MASTER SATUAN (TERKUNCI PER 1, 100% SUPABASE)
    // ─────────────────────────────────────────────
    async ambilDaftarSatuan() {
        try {
            const rows = await supabaseClient.getMasterSatuan();
            if (Array.isArray(rows)) {
                const list = rows.map((r) => r.nama_satuan).filter(Boolean);
                try { localStorage.setItem(this.kunciCacheSatuan, JSON.stringify(list)); } catch (_) {}
                return list;
            }
        } catch (err) {
            console.warn('Gagal mengambil master_satuan dari Supabase:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCacheSatuan);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
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
            throw new Error(String(err?.message || 'Gagal menyimpan satuan ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarSatuan();
    }

    async hapusSatuan(namaSatuan) {
        const daftarSekarang = await this.ambilDaftarSatuan();
        if (daftarSekarang.length <= 1) {
            throw new Error('Minimal harus tersisa 1 Master Satuan aktif.');
        }

        try {
            await supabaseClient.hapusMasterSatuan(namaSatuan);
        } catch (err) {
            throw new Error(String(err?.message || 'Gagal menghapus satuan dari basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarSatuan();
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
                if (Array.isArray(parsed)) return parsed;
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
            throw new Error(String(err?.message || 'Gagal menyimpan pasar ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
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
            throw new Error(String(err?.message || 'Gagal memperbarui data pasar di Supabase.').replace(/^Supabase Error:\s*/i, ''));
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
    // 3. MASTER KECAMATAN (100% SUPABASE)
    // ─────────────────────────────────────────────
    async ambilDaftarKecamatan() {
        try {
            const rows = await supabaseClient.getMasterKecamatan();
            if (Array.isArray(rows)) {
                const list = rows.map((r) => r.nama_kecamatan).filter(Boolean);
                try { localStorage.setItem(this.kunciCacheKecamatan, JSON.stringify(list)); } catch (_) {}
                return list;
            }
        } catch (err) {
            console.warn('Gagal mengambil master_kecamatan dari Supabase:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCacheKecamatan);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
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
            throw new Error(String(err?.message || 'Gagal menyimpan kecamatan ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarKecamatan();
    }

    async hapusKecamatan(namaKecamatan) {
        const daftarSekarang = await this.ambilDaftarKecamatan();
        if (daftarSekarang.length <= 1) {
            throw new Error('Minimal harus tersisa 1 kecamatan terdaftar.');
        }

        try {
            await supabaseClient.hapusMasterKecamatan(namaKecamatan);
        } catch (err) {
            throw new Error(String(err?.message || 'Gagal menghapus kecamatan di basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarKecamatan();
    }

    // ─────────────────────────────────────────────
    // 4. MASTER KOMODITAS RESMI (INDUK, VARIAN & SINONIM — 100% SUPABASE)
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
            if (Array.isArray(rows)) {
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
                try { localStorage.setItem(this.kunciCacheKomoditas, JSON.stringify(rapi)); } catch (_) {}
                return rapi;
            }
        } catch (err) {
            console.warn('Gagal mengambil master_komoditas dari Supabase:', err?.message);
        }

        try {
            const cache = localStorage.getItem(this.kunciCacheKomoditas);
            if (cache) {
                const parsed = JSON.parse(cache);
                if (Array.isArray(parsed)) return this.urutkanKomoditas(parsed);
            }
        } catch (_) {}
        return [];
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
            await supabaseClient.tambahMasterKomoditasInduk(kelompokBersih);
            await supabaseClient.tambahMasterKomoditas(itemBaru);
        } catch (err) {
            throw new Error(String(err?.message || 'Gagal menyimpan komoditas ke basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarKomoditas();
    }

    async perbaruiKomoditas(idAtauNamaLama, {
        kelompok_komoditas = '',
        nama_komoditas = '',
        kategori = 'Bahan Pokok',
        satuan_bawaan = '1 KG',
        kata_kunci = '',
        prioritas_tampil = 50
    } = {}, namaLamaAsli = '') {
        const namaBersih = String(nama_komoditas || '').trim();
        if (!namaBersih) throw new Error('Nama varian komoditas wajib diisi.');

        const kelompokBersih = String(kelompok_komoditas || '').trim() || this.tebakKelompokKomoditas(namaBersih);
        const satuanResmi = this.formatSatuanPerSatu(satuan_bawaan || '1 KG');
        const daftarSekarang = await this.ambilDaftarKomoditas();
        const namaPembandingLama = String(namaLamaAsli || idAtauNamaLama || '').trim().toLowerCase();

        const bentrok = daftarSekarang.find(
            (k) =>
                k.nama_komoditas.toLowerCase() === namaBersih.toLowerCase() &&
                String(k.id || '') !== String(idAtauNamaLama || '') &&
                k.nama_komoditas.toLowerCase() !== namaPembandingLama
        );
        if (bentrok) {
            throw new Error(`Nama komoditas "${namaBersih}" sudah digunakan oleh entri lain di Master Komoditas.`);
        }

        const itemUpdate = {
            kelompok_komoditas: kelompokBersih,
            nama_komoditas: namaBersih,
            kategori: kategori || 'Bahan Pokok',
            satuan_bawaan: satuanResmi,
            kata_kunci: String(kata_kunci || '').trim(),
            prioritas_tampil: this.normalisasiNilaiUrutanTampil(prioritas_tampil)
        };

        try {
            await supabaseClient.tambahMasterKomoditasInduk(kelompokBersih);
            await supabaseClient.updateMasterKomoditas(idAtauNamaLama, itemUpdate);
            const namaAsliTarget = String(namaLamaAsli || '').trim();
            if (namaAsliTarget) {
                await supabaseClient.sinkronNamaKomoditasDiHarga(namaAsliTarget, namaBersih, {
                    kategori: itemUpdate.kategori,
                    prioritas_tampil: itemUpdate.prioritas_tampil
                });
            }
        } catch (err) {
            throw new Error(String(err?.message || 'Gagal memperbarui komoditas di basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarKomoditas();
    }

    async ambilDaftarIndukKomoditas(daftarKomoditas = []) {
        const petaUnik = new Map();
        const masukkan = (nama) => {
            const bersih = String(nama || '').trim();
            if (!bersih) return;
            const kunci = bersih.toLowerCase();
            if (!petaUnik.has(kunci)) petaUnik.set(kunci, bersih);
        };

        try {
            const rows = await supabaseClient.getMasterKomoditasInduk();
            if (Array.isArray(rows)) {
                rows.forEach((r) => masukkan(r?.nama_induk));
            }
        } catch (_) {}

        (Array.isArray(daftarKomoditas) ? daftarKomoditas : []).forEach((k) => {
            masukkan(k?.kelompok_komoditas);
        });

        const hasil = Array.from(petaUnik.values()).sort((a, b) => a.localeCompare(b, 'id-ID'));
        try { localStorage.setItem(this.kunciCacheInduk, JSON.stringify(hasil)); } catch (_) {}
        return hasil;
    }

    async tambahIndukKomoditas(namaInduk, daftarKomoditasSaatIni = []) {
        const bersih = String(namaInduk || '').trim();
        if (!bersih) throw new Error('Nama komoditas induk tidak boleh kosong.');
        await supabaseClient.tambahMasterKomoditasInduk(bersih);
        const daftar = await this.ambilDaftarIndukKomoditas(daftarKomoditasSaatIni);
        if (!daftar.some((k) => k.toLowerCase() === bersih.toLowerCase())) {
            daftar.push(bersih);
            daftar.sort((a, b) => a.localeCompare(b, 'id-ID'));
        }
        return daftar;
    }

    // Menyusun pilihan dropdown Grafik Tren Kadis 100% sinkron dengan Master Komoditas Admin
    susunPilihanKomoditasKadis(daftarMasterKomoditas = [], daftarHarga = []) {
        const hargaTerbit = (Array.isArray(daftarHarga) ? daftarHarga : []).filter(
            (i) => String(i?.status || '').toLowerCase() === 'terbit' && i?.nama_komoditas
        );
        const petaHarga = new Map();
        hargaTerbit.forEach((item) => {
            const nama = String(item.nama_komoditas).trim();
            const kunci = nama.toLowerCase();
            if (!petaHarga.has(kunci)) {
                petaHarga.set(kunci, { namaAsli: nama, pasarSet: new Set() });
            }
            if (item.nama_pasar) petaHarga.get(kunci).pasarSet.add(String(item.nama_pasar).trim());
        });

        const kunciMaster = new Set();
        const grupMaster = this.kelompokkanKomoditasUntukDropdown(daftarMasterKomoditas).map((grup) => ({
            kelompok: grup.kelompok,
            prioritas: grup.prioritas,
            items: grup.items.map((k) => {
                const nama = String(k.nama_komoditas || '').trim();
                const kunci = nama.toLowerCase();
                kunciMaster.add(kunci);
                const infoHarga = petaHarga.get(kunci);
                return {
                    nama,
                    punyaDataHarga: Boolean(infoHarga),
                    jumlahPasar: infoHarga ? infoHarga.pasarSet.size : 0
                };
            })
        }));

        const arsipDiLuarMaster = [];
        petaHarga.forEach((info, kunci) => {
            if (!kunciMaster.has(kunci)) {
                arsipDiLuarMaster.push({
                    nama: info.namaAsli,
                    punyaDataHarga: true,
                    jumlahPasar: info.pasarSet.size
                });
            }
        });
        arsipDiLuarMaster.sort((a, b) => a.nama.localeCompare(b.nama, 'id-ID'));

        const semuaItemMaster = grupMaster.flatMap((g) => g.items);
        const semuaNamaValid = [
            ...semuaItemMaster.map((i) => i.nama),
            ...arsipDiLuarMaster.map((i) => i.nama)
        ];

        const masterDenganHarga = semuaItemMaster.find((i) => i.punyaDataHarga);
        const komoditasDefaultTerbaik = masterDenganHarga
            ? masterDenganHarga.nama
            : (arsipDiLuarMaster[0]?.nama || semuaItemMaster[0]?.nama || '');

        return {
            grupMaster,
            arsipDiLuarMaster,
            semuaNamaValid,
            komoditasDefaultTerbaik
        };
    }

    async hapusKomoditas(namaKomoditas) {
        const daftarSekarang = await this.ambilDaftarKomoditas();
        if (daftarSekarang.length <= 1) {
            throw new Error('Minimal harus tersisa 1 Master Komoditas aktif.');
        }

        try {
            await supabaseClient.hapusMasterKomoditas(namaKomoditas);
        } catch (err) {
            throw new Error(String(err?.message || 'Gagal menghapus komoditas dari basis data Supabase.').replace(/^Supabase Error:\s*/i, ''));
        }

        return this.ambilDaftarKomoditas();
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
