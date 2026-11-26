// ===================================================================================
// MODUL LAYANAN HARGA PANGAN - DINAS PANGAN KOTA MANADO (OOP)
// Fungsi: Mengelola komunikasi data harga komoditas pasar secara murni ke Cloud
//         Supabase (0% data dummy, 0% tanggal palsu, 0% notifikasi fiktif).
// ===================================================================================

import { supabaseClient } from './SupabaseClient.js';
import { penggunaService } from './PenggunaService.js';
import { jadwalGPMService } from './JadwalGPMService.js';

class HargaPanganApiService {
    constructor() {
        this.apiRoot = import.meta.env.VITE_API_ROOT || 'http://localhost:3000/api';
        this.baseUrl = `${this.apiRoot}/harga-pangan`;
        // Bersihkan sisa kunci notifikasi dummy warisan lama
        try {
            localStorage.removeItem('sipatokaan_notifikasi');
        } catch { }
    }

    formatTanggalHariIni() {
        return new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    normalisasiSatuan(satuan) {
        if (!satuan) return '1 KG';
        let s = String(satuan).replace(/[/]+/g, '').trim();
        if (!s) return '1 KG';
        if (/^kg$|^kilogram$/i.test(s)) return '1 KG';
        if (/^gram$|^gr$|^g$/i.test(s)) return '1 Gram';
        const match = s.match(/^(\d+)\s*(kg|kilogram|gram|gr|g)$/i);
        if (match) {
            const angka = match[1];
            const unit = /^(gram|gr|g)$/i.test(match[2].trim()) ? 'Gram' : 'KG';
            return `${angka} ${unit}`;
        }
        return s;
    }

    saringDaftar(daftar, kategori = 'Semua', pasar = 'Semua', cari = '', status = '') {
        let hasil = Array.isArray(daftar) ? [...daftar] : [];
        if (status) {
            hasil = hasil.filter(i => (i.status || 'Terbit').toLowerCase() === status.toLowerCase());
        }
        if (kategori && kategori !== 'Semua') {
            hasil = hasil.filter(i => (i.kategori || '').toLowerCase() === kategori.toLowerCase());
        }
        if (pasar && pasar !== 'Semua') {
            hasil = hasil.filter(i => (i.nama_pasar || '').toLowerCase() === pasar.toLowerCase());
        }
        if (cari && cari.trim() !== '') {
            const c = cari.toLowerCase().trim();
            hasil = hasil.filter(i => (i.nama_komoditas || '').toLowerCase().includes(c));
        }
        return hasil;
    }

    // ─────────────────────────────────────────────
    // 1. DATA KOMODITAS (100% DATA RIIL BASIS DATA, TANPA DUMMY FALLBACK)
    // ─────────────────────────────────────────────
    async ambilSemua(kategori = 'Semua', pasar = 'Semua', cari = '', status = '') {
        // 1. Prioritaskan Cloud Supabase Database (mengembalikan [] jika memang kosong — bukan data dummy)
        try {
            const dataCloud = await supabaseClient.getHargaPangan();
            if (Array.isArray(dataCloud)) {
                const cleaned = dataCloud.map(i => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
                try {
                    localStorage.setItem('sipatokaan_custom_items', JSON.stringify(cleaned));
                } catch { }
                return this.saringDaftar(cleaned, kategori, pasar, cari, status);
            }
        } catch (err) {
            console.warn('Supabase getHargaPangan gagal, mencoba API backend mandiri:', err?.message);
        }

        // 2. Fallback ke API backend mandiri jika sedang dijalankan lokal
        try {
            const params = new URLSearchParams();
            if (kategori && kategori !== 'Semua') params.append('kategori', kategori);
            if (pasar && pasar !== 'Semua') params.append('pasar', pasar);
            if (cari && cari.trim() !== '') params.append('cari', cari.trim());
            if (status) params.append('status', status);

            const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
            const respon = await fetch(url);
            if (respon.ok) {
                const hasil = await respon.json();
                if (Array.isArray(hasil.data)) {
                    return hasil.data.map(i => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
                }
            }
        } catch { }

        return [];
    }

    // 1b. Mengambil data harga pangan TERBIT khusus portal publik (100% DATA RIIL DB, TANPA DUMMY FALLBACK)
    async ambilPublikTerbit() {
        try {
            const dataCloud = await supabaseClient.getHargaPangan();
            if (Array.isArray(dataCloud)) {
                return dataCloud
                    .filter(i => (i.status || '').toLowerCase() === 'terbit')
                    .map(i => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
            }
        } catch (errCloud) {
            try {
                const respon = await fetch(`${this.baseUrl}?status=Terbit`);
                if (respon.ok) {
                    const hasil = await respon.json();
                    const list = Array.isArray(hasil.data) ? hasil.data : [];
                    return list
                        .filter(i => (i.status || '').toLowerCase() === 'terbit')
                        .map(i => ({ ...i, satuan: this.normalisasiSatuan(i.satuan) }));
                }
            } catch { }
            throw new Error(errCloud?.message || 'Tidak dapat terhubung ke basis data harga pangan.');
        }
        return [];
    }

    // Statistik kategori dihitung 100% dari data riil Supabase
    async ambilStatistik() {
        const list = await this.ambilSemua();
        const terbit = list.filter(i => (i.status || '').toLowerCase() === 'terbit');
        return {
            Semua: terbit.length,
            'Bahan Pokok': terbit.filter(i => i.kategori === 'Bahan Pokok').length,
            Hewani: terbit.filter(i => i.kategori === 'Hewani').length,
            Sayuran: terbit.filter(i => i.kategori === 'Sayuran').length,
            Buah: terbit.filter(i => i.kategori === 'Buah').length,
            Lainnya: terbit.filter(i => !['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah'].includes(i.kategori)).length
        };
    }

    // Statistik dashboard petugas dihitung 100% dari data riil Supabase + status waktu WITA
    async ambilStatistikDashboard(itemsHarga = null, daftarAcara = null) {
        const items = Array.isArray(itemsHarga) ? itemsHarga : await this.ambilSemua();
        let acaraList = Array.isArray(daftarAcara) ? daftarAcara : [];
        if (!Array.isArray(daftarAcara)) {
            try {
                const resAcara = await supabaseClient.getAcaraGPM();
                if (Array.isArray(resAcara)) acaraList = resAcara;
            } catch {
                acaraList = [];
            }
        }

        const terbit = items.filter(i => (i.status || '').toLowerCase() === 'terbit').length;
        const draft = items.filter(i => (i.status || '').toLowerCase() === 'draft').length;

        let gpmTerjadwal = 0;
        let gpmSelesai = 0;
        acaraList.forEach(a => {
            const st = jadwalGPMService.hitungStatusOperasional(a);
            if (st.sudahBerakhir) {
                gpmSelesai += 1;
            } else {
                gpmTerjadwal += 1;
            }
        });

        return {
            harga_ditetapkan: terbit,
            draft_harga: draft,
            gpm_terjadwal: gpmTerjadwal,
            gpm_selesai: gpmSelesai
        };
    }

    // ─────────────────────────────────────────────
    // 2. CRUD HARGA KOMODITAS (100% LANGSUNG KE SUPABASE CLOUD)
    // ─────────────────────────────────────────────
    async tambah(dataBaru) {
        const payload = {
            ...dataBaru,
            satuan: this.normalisasiSatuan(dataBaru.satuan),
            tanggal_penetapan: dataBaru.tanggal_penetapan || this.formatTanggalHariIni()
        };

        const itemMasuk = await supabaseClient.tambahHargaPangan(payload);
        if (!itemMasuk || !itemMasuk.id) {
            throw new Error('Gagal menyimpan data komoditas ke basis data Supabase.');
        }
        return { ...itemMasuk, satuan: this.normalisasiSatuan(itemMasuk.satuan) };
    }

    async perbarui(id, dataUpdate) {
        const payload = { ...dataUpdate };
        if (payload.satuan) {
            payload.satuan = this.normalisasiSatuan(payload.satuan);
        }

        const itemUpdate = await supabaseClient.updateHargaPangan(id, payload);
        if (!itemUpdate) {
            throw new Error('Gagal memperbarui data harga pangan di basis data Supabase.');
        }
        return { ...itemUpdate, satuan: this.normalisasiSatuan(itemUpdate.satuan) };
    }

    async hapus(id) {
        await supabaseClient.hapusHargaPangan(id);
        return { sukses: true };
    }

    // ─────────────────────────────────────────────
    // 3. DELEGASI MANAJEMEN SESI (TERPUSAT DI PENGGUNASERVICE)
    // ─────────────────────────────────────────────
    simpanSesi(token, pengguna, ingatSaya = false) {
        penggunaService.simpanSesi(token, pengguna, ingatSaya);
    }

    ambilUser() {
        return penggunaService.ambilUserSesi();
    }

    ambilToken() {
        return penggunaService.ambilToken();
    }

    keluar() {
        penggunaService.logout();
    }
}

export const hargaPanganService = new HargaPanganApiService();
