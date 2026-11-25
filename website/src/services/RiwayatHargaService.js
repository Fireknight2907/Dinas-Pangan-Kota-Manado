// ===================================================================================
// Modul Layanan Riwayat Harga Pangan (OOP)
// Fungsi: Mengambil riwayat perubahan harga resmi dari tabel 'riwayat_harga_pangan'
//         di database Supabase / Backend berdasarkan komoditas, pasar, dan rentang hari
//         (7/30/90/Semua) serta menghitung metrik tren riil tanpa data dummy.
// ===================================================================================

import { supabaseClient } from './SupabaseClient.js';

export class RiwayatHargaService {
    constructor() {
        this.apiRoot = import.meta.env.VITE_API_ROOT || 'http://localhost:3000/api';
    }

    // Mengecek apakah error menandakan tabel riwayat_harga_pangan belum dimigrasi di Supabase
    apakahBelumMigrasi(err) {
        const msg = String(err?.message || '').toLowerCase();
        return (
            msg.includes('riwayat_harga_pangan') ||
            msg.includes('404') ||
            msg.includes('pgrst205') ||
            msg.includes('does not exist') ||
            msg.includes('could not find the table')
        );
    }

    // Mengambil riwayat perubahan harga resmi untuk 1 komoditas (filter multi-pasar & rentang hari)
    async ambilRiwayatKomoditas(namaKomoditas, { pasarTerpilih = [], rentangHari = 30 } = {}) {
        let dataMentah = [];
        let belumMigrasi = false;

        try {
            const res = await supabaseClient.getRiwayatHarga({
                namaKomoditas,
                rentangHari,
                batas: 500
            });
            dataMentah = Array.isArray(res) ? res : [];
        } catch (err) {
            if (this.apakahBelumMigrasi(err)) {
                belumMigrasi = true;
            } else {
                // Coba fallback ke backend Express jika aktif (bukan data dummy)
                try {
                    const params = new URLSearchParams({
                        komoditas: namaKomoditas,
                        hari: String(rentangHari)
                    });
                    if (pasarTerpilih.length > 0) params.append('pasar', pasarTerpilih.join(','));
                    const respon = await fetch(`${this.apiRoot}/harga-pangan/riwayat?${params.toString()}`);
                    if (respon.ok) {
                        const json = await respon.json();
                        dataMentah = Array.isArray(json.data) ? json.data : [];
                    } else {
                        throw err;
                    }
                } catch (_) {
                    throw err;
                }
            }
        }

        // Saring berdasarkan pasar yang dipilih pengguna
        const setPasar = new Set((pasarTerpilih || []).map((p) => p.toLowerCase().trim()));
        const riwayatTersaring = dataMentah.filter((row) => {
            if (setPasar.size === 0) return true;
            return setPasar.has((row.nama_pasar || '').toLowerCase().trim());
        });

        // Urutkan kronologis naik (untuk grafik) dan susun metrik ringkasan riil
        const kronologis = [...riwayatTersaring].sort(
            (a, b) => new Date(a.dicatat_pada || 0).getTime() - new Date(b.dicatat_pada || 0).getTime()
        );

        const ringkasan = this.hitungRingkasanTren(kronologis);

        return {
            belumMigrasi,
            riwayatKronologis: kronologis,
            riwayatTerbaru: [...kronologis].reverse(),
            ringkasan
        };
    }

    // Mengambil ringkasan perubahan terbaru seluruh komoditas untuk indikator naik/turun pada kartu
    async ambilRiwayatPublikTerbaru(batas = 400) {
        try {
            const res = await supabaseClient.getRiwayatHargaTerbaru(batas);
            return {
                belumMigrasi: false,
                data: Array.isArray(res) ? res : []
            };
        } catch (err) {
            if (this.apakahBelumMigrasi(err)) {
                return { belumMigrasi: true, data: [] };
            }
            return { belumMigrasi: false, data: [] };
        }
    }

    // Menghitung metrik tren riil (awal, akhir, tertinggi, terendah, selisih, persentase)
    hitungRingkasanTren(riwayatKronologis = []) {
        if (!Array.isArray(riwayatKronologis) || riwayatKronologis.length === 0) {
            return {
                jumlahCatatan: 0,
                adaPerubahan: false,
                hargaAwal: 0,
                hargaAkhir: 0,
                hargaTertinggi: 0,
                hargaTerendah: 0,
                selisihTotal: 0,
                persentase: 0,
                statusTren: 'Stabil'
            };
        }

        const daftarHarga = riwayatKronologis.map((r) => Number(r.harga_baru) || 0);
        const hargaAwal = daftarHarga[0];
        const hargaAkhir = daftarHarga[daftarHarga.length - 1];
        const hargaTertinggi = Math.max(...daftarHarga);
        const hargaTerendah = Math.min(...daftarHarga);
        const selisihTotal = hargaAkhir - hargaAwal;
        const persentase = hargaAwal > 0 ? Number(((selisihTotal / hargaAwal) * 100).toFixed(1)) : 0;

        let statusTren = 'Stabil';
        if (selisihTotal > 0) statusTren = 'Naik';
        else if (selisihTotal < 0) statusTren = 'Turun';

        const adaPerubahan = riwayatKronologis.length > 1 && (hargaTertinggi !== hargaTerendah || selisihTotal !== 0);

        return {
            jumlahCatatan: riwayatKronologis.length,
            adaPerubahan,
            hargaAwal,
            hargaAkhir,
            hargaTertinggi,
            hargaTerendah,
            selisihTotal,
            persentase: Math.abs(persentase),
            statusTren
        };
    }

    // Mencatat klik lihat komoditas masyarakat ke DB (non-blocking)
    async catatLihatKomoditas(namaKomoditas) {
        return supabaseClient.tambahJumlahDilihat(namaKomoditas);
    }
}

export const riwayatHargaService = new RiwayatHargaService();
