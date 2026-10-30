import { supabaseClient } from './SupabaseClient.js';
// ===================================================================================
// SERVICE GPM (GERAKAN PANGAN MURAH) - OOP (WEBSITE)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Komunikasi HTTP Frontend Web dengan Endpoint API GPM & Antrean Barcode
// ===================================================================================

class GPMApiService {
    constructor() {
        this.apiRoot = import.meta.env.VITE_API_ROOT || 'http://localhost:3000/api';
        this.baseUrl = `${this.apiRoot}/gpm`;

        // Data cadangan lokal jika backend belum berjalan atau offline
        this.fallbackAcara = [
            {
                id: 'gpm-001-sparta-tikala',
                nama_acara: 'Gerakan Pangan Murah (GPM) Sparta Tikala',
                lokasi: 'Lapangan Sparta Tikala (Depan Kantor Walikota Manado)',
                kecamatan: 'Tikala',
                tanggal: '2026-10-18',
                jam_mulai: '08:00',
                jam_selesai: '13:00',
                latitude: 1.4883,
                longitude: 124.8436,
                kuota_maksimal: 250,
                antrean_terisi: 3,
                sisa_kuota: 247,
                komoditas_tersedia: 'Beras SPHP 5kg (Rp 58.000), Minyak Goreng Minyakita 1L (Rp 15.000), Gula Pasir 1kg (Rp 16.500), Bawang Merah 1kg (Rp 28.000), Cabai Rawit 1kg (Rp 35.000)',
                deskripsi: 'GPM Khusus stabilisasi pasokan pangan menyambut akhir pekan. Terbuka untuk seluruh warga Kota Manado.',
                status: 'Aktif'
            },
            {
                id: 'gpm-002-pasar-bersehati',
                nama_acara: 'Gerakan Pangan Murah Karombasan Bersehati',
                lokasi: 'Pelataran Pasar Bersehati Karombasan',
                kecamatan: 'Wanea',
                tanggal: '2026-10-21',
                jam_mulai: '07:30',
                jam_selesai: '12:30',
                latitude: 1.4674,
                longitude: 124.8468,
                kuota_maksimal: 300,
                antrean_terisi: 1,
                sisa_kuota: 299,
                komoditas_tersedia: 'Beras Premium 5kg, Minyak Goreng Kita, Telur Ayam 1 Baki (Rp 52.000), Daging Ayam Segar',
                deskripsi: 'Penyaluran komoditas pangan murah langsung dari produsen lokal untuk menekan laju inflasi.',
                status: 'Aktif'
            },
            {
                id: 'gpm-003-pesisir-tuminting',
                nama_acara: 'GPM Pesisir Utara Tuminting',
                lokasi: 'Halaman Kantor Kecamatan Tuminting',
                kecamatan: 'Tuminting',
                tanggal: '2026-10-25',
                jam_mulai: '08:30',
                jam_selesai: '14:00',
                latitude: 1.5126,
                longitude: 124.8488,
                kuota_maksimal: 200,
                antrean_terisi: 0,
                sisa_kuota: 200,
                komoditas_tersedia: 'Beras SPHP, Minyak Goreng Kemasan, Gula Pasir, Ikan Laut Segar, Bumbu Dapur Lengkap',
                deskripsi: 'Gerakan Pangan Murah serentak untuk warga pesisir utara Kota Manado.',
                status: 'Aktif'
            }
        ];

        this.fallbackPendaftar = [
            {
                id: 'antrean-001',
                acara_id: 'gpm-001-sparta-tikala',
                nama_pendaftar: 'Meity Rondonuwu',
                nomor_telepon: '081234567890',
                nomor_antrean: 1,
                kode_barcode: 'GPM-TIKA-001-A9F2',
                status_kehadiran: 'Hadir',
                waktu_kehadiran: '2026-10-18T08:15:00Z',
                waktu_mendaftar: '2026-10-15T09:00:00Z'
            },
            {
                id: 'antrean-002',
                acara_id: 'gpm-001-sparta-tikala',
                nama_pendaftar: 'Frangky Mandagi',
                nomor_telepon: '082198765432',
                nomor_antrean: 2,
                kode_barcode: 'GPM-TIKA-002-C4B8',
                status_kehadiran: 'Menunggu',
                waktu_kehadiran: null,
                waktu_mendaftar: '2026-10-15T09:12:00Z'
            },
            {
                id: 'antrean-003',
                acara_id: 'gpm-001-sparta-tikala',
                nama_pendaftar: 'Grace Lumempouw',
                nomor_telepon: '085240112233',
                nomor_antrean: 3,
                kode_barcode: 'GPM-TIKA-003-X8Q1',
                status_kehadiran: 'Menunggu',
                waktu_kehadiran: null,
                waktu_mendaftar: '2026-10-15T09:30:00Z'
            },
            {
                id: 'antrean-004',
                acara_id: 'gpm-002-pasar-bersehati',
                nama_pendaftar: 'Johan Sompie',
                nomor_telepon: '081355667788',
                nomor_antrean: 1,
                kode_barcode: 'GPM-BERSE-001-V7L2',
                status_kehadiran: 'Menunggu',
                waktu_kehadiran: null,
                waktu_mendaftar: '2026-10-15T10:00:00Z'
            }
        ];
    }

    // Helper Authorization Header
    ambilHeaderAuth() {
        const token = localStorage.getItem('sipatokean_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    // [Modul Service] 1. Mengambil semua acara GPM untuk publik (peta & card)
    async ambilSemuaAcara(status = '', kecamatan = '') {
        // 1. Prioritaskan Cloud Supabase
        try {
            const dataCloud = await supabaseClient.getAcaraGPM();
            if (Array.isArray(dataCloud) && dataCloud.length > 0) {
                const mapped = dataCloud.map(item => ({
                    id: String(item.id),
                    nama_acara: item.nama_acara || 'Acara GPM Manado',
                    lokasi: item.lokasi || 'Kota Manado',
                    kecamatan: item.kecamatan || 'Wenang',
                    tanggal: item.tanggal ? String(item.tanggal).split('T')[0] : '2026-10-20',
                    jam_mulai: item.jam_mulai || '08:00',
                    jam_selesai: item.jam_selesai || '14:00',
                    latitude: Number(item.latitude) || 1.4883,
                    longitude: Number(item.longitude) || 124.8436,
                    kuota_maksimal: Number(item.kuota_maksimal) || 250,
                    antrean_terisi: Number(item.antrean_terisi) || 0,
                    sisa_kuota: Math.max(0, (Number(item.kuota_maksimal) || 250) - (Number(item.antrean_terisi) || 0)),
                    komoditas_tersedia: item.komoditas_tersedia || 'Beras, Minyak Goreng, Gula Pasir',
                    deskripsi: item.deskripsi || '',
                    status: item.status || 'Aktif'
                }));
                this.fallbackAcara = mapped;
                return mapped.filter(item => {
                    const cocokStatus = !status || status === 'Semua' || item.status.toLowerCase() === status.toLowerCase();
                    const cocokKecamatan = !kecamatan || kecamatan === 'Semua' || item.kecamatan.toLowerCase() === kecamatan.toLowerCase();
                    return cocokStatus && cocokKecamatan;
                });
            }
        } catch (err) {
            console.warn('[GPMService] Supabase getAcaraGPM offline, mencoba backend/fallback:', err);
        }

        // 2. Coba API server
        try {
            const params = new URLSearchParams();
            if (status && status !== 'Semua') params.append('status', status);
            if (kecamatan && kecamatan !== 'Semua') params.append('kecamatan', kecamatan);

            const respon = await fetch(`${this.baseUrl}/acara${params.toString() ? '?' + params.toString() : ''}`);
            if (respon.ok) {
                const hasil = await respon.json();
                if (hasil.data) return hasil.data;
            }
        } catch (error) {}

        // 3. Fallback lokal
        return this.fallbackAcara.filter(item => {
            const cocokStatus = !status || status === 'Semua' || item.status === status;
            const cocokKecamatan = !kecamatan || kecamatan === 'Semua' || item.kecamatan.toLowerCase() === kecamatan.toLowerCase();
            return cocokStatus && cocokKecamatan;
        });
    }

    // [Modul Service] 2. Mengambil detail satu acara GPM
    async ambilDetailAcara(id) {
        try {
            const respon = await fetch(`${this.baseUrl}/acara/${id}`);
            if (!respon.ok) throw new Error('Acara tidak ditemukan');
            const hasil = await respon.json();
            return hasil.data;
        } catch (error) {
            const acara = this.fallbackAcara.find(a => a.id === id);
            if (!acara) throw new Error('Acara GPM tidak ditemukan');
            return acara;
        }
    }

    // [Modul Service] 3. Masyarakat Mendaftar Antrean (Tanpa Login)
    async ambilNomorAntrean(acara_id, nama_lengkap, nomor_telepon) {
        try {
            const respon = await fetch(`${this.baseUrl}/antrian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acara_id, nama_lengkap, nomor_telepon })
            });
            const hasil = await respon.json();
            if (!respon.ok) throw new Error(hasil.pesan || 'Gagal mengambil nomor antrean');
            return hasil.data;
        } catch (error) {
            console.warn('[GPMService] Backend offline, memproses tiket antrean fallback:', error);
            const acara = this.fallbackAcara.find(a => a.id === acara_id) || this.fallbackAcara[0];
            const pendaftarAcara = this.fallbackPendaftar.filter(p => p.acara_id === acara_id);
            const nomorBaru = pendaftarAcara.length + 1;
            const kodeBarcode = `GPM-MND-${String(nomorBaru).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const tiketBaru = {
                id: 'antrean-' + Date.now(),
                acara_id,
                nama_pendaftar: nama_lengkap,
                nomor_telepon,
                nomor_antrean: nomorBaru,
                kode_barcode: kodeBarcode,
                status_kehadiran: 'Menunggu',
                waktu_kehadiran: null,
                waktu_mendaftar: new Date().toISOString()
            };

            this.fallbackPendaftar.push(tiketBaru);
            acara.antrean_terisi = (acara.antrean_terisi || 0) + 1;
            acara.sisa_kuota = Math.max(0, (acara.kuota_maksimal || 200) - acara.antrean_terisi);

            return {
                tiket: tiketBaru,
                acara: {
                    nama_acara: acara.nama_acara,
                    lokasi: acara.lokasi,
                    kecamatan: acara.kecamatan,
                    tanggal: acara.tanggal,
                    jam: `${acara.jam_mulai} - ${acara.jam_selesai} WITA`
                }
            };
        }
    }

    // [Modul Service] 4. Petugas Mengambil Daftar Pendaftar untuk Suatu Acara
    async ambilPendaftarAcara(acara_id) {
        try {
            const respon = await fetch(`${this.baseUrl}/acara/${acara_id}/pendaftar`, {
                headers: this.ambilHeaderAuth()
            });
            if (!respon.ok) throw new Error('Gagal mengambil data pendaftar');
            const hasil = await respon.json();
            return hasil;
        } catch (error) {
            const daftar = this.fallbackPendaftar.filter(p => !acara_id || p.acara_id === acara_id);
            const hadir = daftar.filter(p => p.status_kehadiran === 'Hadir').length;
            return {
                sukses: true,
                total: daftar.length,
                statistik: {
                    total_antrean: daftar.length,
                    total_hadir: hadir,
                    total_menunggu: daftar.length - hadir
                },
                data: daftar
            };
        }
    }

    // [Modul Service] 5. Petugas Scan Barcode
    async scanBarcode(kodeBarcode) {
        try {
            const respon = await fetch(`${this.baseUrl}/scan/${encodeURIComponent(kodeBarcode)}`, {
                headers: this.ambilHeaderAuth()
            });
            const hasil = await respon.json();
            if (!respon.ok) throw new Error(hasil.pesan || 'Data barcode tidak ditemukan');
            return hasil.data;
        } catch (error) {
            const kode = kodeBarcode.trim().toUpperCase();
            const pendaftar = this.fallbackPendaftar.find(p => p.kode_barcode.toUpperCase() === kode);
            if (!pendaftar) throw new Error(`Barcode "${kodeBarcode}" tidak ditemukan di sistem.`);
            const acara = this.fallbackAcara.find(a => a.id === pendaftar.acara_id);
            return {
                ...pendaftar,
                acara: acara ? {
                    nama_acara: acara.nama_acara,
                    lokasi: acara.lokasi,
                    tanggal: acara.tanggal
                } : null
            };
        }
    }

    // [Modul Service] 6. Petugas Verifikasi Kehadiran
    async verifikasiKehadiran(kodeBarcode) {
        try {
            const respon = await fetch(`${this.baseUrl}/verifikasi/${encodeURIComponent(kodeBarcode)}`, {
                method: 'POST',
                headers: this.ambilHeaderAuth()
            });
            const hasil = await respon.json();
            if (!respon.ok) throw new Error(hasil.pesan || 'Gagal verifikasi');
            return hasil.data;
        } catch (error) {
            const kode = kodeBarcode.trim().toUpperCase();
            const idx = this.fallbackPendaftar.findIndex(p => p.kode_barcode.toUpperCase() === kode);
            if (idx === -1) throw new Error(`Data barcode "${kodeBarcode}" tidak ditemukan.`);
            this.fallbackPendaftar[idx].status_kehadiran = 'Hadir';
            this.fallbackPendaftar[idx].waktu_kehadiran = new Date().toISOString();
            return this.fallbackPendaftar[idx];
        }
    }

    // [Modul Service] 7. Petugas Tambah Acara GPM Baru
    async tambahAcara(dataAcara) {
        // 1. Simpan ke Supabase Cloud
        try {
            const itemMasuk = await supabaseClient.tambahAcaraGPM(dataAcara);
            if (itemMasuk && itemMasuk.id) {
                this.fallbackAcara.unshift(itemMasuk);
                return itemMasuk;
            }
        } catch (err) {
            console.warn('Supabase tambahAcara offline, mencoba backend/fallback:', err);
        }

        // 2. Coba API server
        try {
            const respon = await fetch(`${this.baseUrl}/acara`, {
                method: 'POST',
                headers: this.ambilHeaderAuth(),
                body: JSON.stringify(dataAcara)
            });
            const hasil = await respon.json();
            if (respon.ok && hasil.data) return hasil.data;
        } catch (error) {}

        // 3. Fallback lokal
        const itemBaru = {
            id: 'gpm-' + Date.now(),
            ...dataAcara,
            antrean_terisi: 0,
            sisa_kuota: parseInt(dataAcara.kuota_maksimal || 200, 10),
            status: 'Aktif'
        };
        this.fallbackAcara.unshift(itemBaru);
        return itemBaru;
    }

    // [Modul Service] 8. Petugas Hapus Acara GPM
    async hapusAcara(id) {
        try {
            await supabaseClient.hapusAcaraGPM(id);
        } catch (e) {}

        try {
            await fetch(`${this.baseUrl}/acara/${id}`, {
                method: 'DELETE',
                headers: this.ambilHeaderAuth()
            });
        } catch (e) {}

        this.fallbackAcara = this.fallbackAcara.filter(a => String(a.id) !== String(id));
        return true;
    }

    // [Modul Service] 9. Mengambil Statistik Keseluruhan
    async ambilStatistik() {
        try {
            const respon = await fetch(`${this.baseUrl}/statistik`, {
                headers: this.ambilHeaderAuth()
            });
            if (!respon.ok) throw new Error('Gagal mengambil statistik');
            const hasil = await respon.json();
            return hasil.data;
        } catch (e) {
            const totalAntrean = this.fallbackPendaftar.length;
            const totalHadir = this.fallbackPendaftar.filter(p => p.status_kehadiran === 'Hadir').length;
            return {
                total_gpm: this.fallbackAcara.length,
                gpm_aktif: this.fallbackAcara.filter(a => a.status === 'Aktif').length,
                gpm_selesai: this.fallbackAcara.filter(a => a.status === 'Selesai').length,
                total_antrean: totalAntrean,
                total_hadir: totalHadir,
                total_menunggu: totalAntrean - totalHadir
            };
        }
    }
}

export const gpmService = new GPMApiService();
