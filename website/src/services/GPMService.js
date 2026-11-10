// Modul Layanan Gerakan Pangan Murah (GPM) dan Antrean Barcode
// Dinas Pangan Kota Manado
// Mengelola jadwal acara pasar murah, kuota antrean, pendaftaran tiket warga, dan verifikasi barcode

import { supabaseClient } from './SupabaseClient.js';

const MAP_FALLBACK_ACARA_ID = {
    'gpm-001-sparta-tikala': '777e05ab-a8c0-4bdc-9999-a12e522786d6',
    'gpm-002-pasar-bersehati': 'f1da6320-1a2b-48f2-8d0d-c1cf28208808'
};

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
            const [dataCloud, pendaftarCloud] = await Promise.all([
                supabaseClient.getAcaraGPM(),
                supabaseClient.getPendaftarGPM().catch(() => [])
            ]);

            const listPendaftar = Array.isArray(pendaftarCloud) && pendaftarCloud.length > 0 
                ? pendaftarCloud 
                : this.fallbackPendaftar;

            if (Array.isArray(dataCloud) && dataCloud.length > 0) {
                const mapped = dataCloud.map(item => {
                    const idStr = String(item.id);
                    // Hitung jumlah pendaftar aktual dari tabel pendaftar_gpm
                    const terdaftar = listPendaftar.filter(p => String(p.acara_id) === idStr).length;
                    const kuotaMaks = Number(item.kuota_maksimal) || 250;
                    const terisi = terdaftar > 0 ? terdaftar : (Number(item.antrean_terisi) || 0);

                    return {
                        id: idStr,
                        nama_acara: item.nama_acara || 'Acara GPM Manado',
                        lokasi: item.lokasi || 'Kota Manado',
                        kecamatan: item.kecamatan || 'Wenang',
                        tanggal: item.tanggal ? String(item.tanggal).split('T')[0] : '2026-10-20',
                        jam_mulai: item.jam_mulai || '08:00',
                        jam_selesai: item.jam_selesai || '14:00',
                        latitude: Number(item.latitude) || 1.4883,
                        longitude: Number(item.longitude) || 124.8436,
                        kuota_maksimal: kuotaMaks,
                        antrean_terisi: terisi,
                        sisa_kuota: Math.max(0, kuotaMaks - terisi),
                        komoditas_tersedia: item.komoditas_tersedia || 'Beras, Minyak Goreng, Gula Pasir',
                        deskripsi: item.deskripsi || '',
                        status: item.status || 'Aktif'
                    };
                });
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
        const listPendaftar = this.fallbackPendaftar;
        return this.fallbackAcara.map(item => {
            const terdaftar = listPendaftar.filter(p => String(p.acara_id) === String(item.id)).length;
            const kuotaMaks = Number(item.kuota_maksimal) || 250;
            const terisi = terdaftar > 0 ? terdaftar : (Number(item.antrean_terisi) || 0);
            return {
                ...item,
                antrean_terisi: terisi,
                sisa_kuota: Math.max(0, kuotaMaks - terisi)
            };
        }).filter(item => {
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

    // [Modul Layanan GPM] 3. Masyarakat Mendaftar Antrean & Mendapatkan Kode QR / Barcode
    async ambilNomorAntrean(acara_id, nama_lengkap, nomor_telepon) {
        // Normalisasi ID Acara jika format fallback lama
        let validAcaraId = acara_id;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(validAcaraId)) {
            validAcaraId = MAP_FALLBACK_ACARA_ID[validAcaraId] || '777e05ab-a8c0-4bdc-9999-a12e522786d6';
        }

        let acara = this.fallbackAcara.find(a => a.id === validAcaraId || a.id === acara_id);
        if (!acara && this.fallbackAcara.length > 0) acara = this.fallbackAcara[0];

        // 1. Simpan langsung ke Supabase Cloud
        try {
            const pendaftarEksis = await supabaseClient.getPendaftarGPM(validAcaraId);
            const nomorBaru = (Array.isArray(pendaftarEksis) ? pendaftarEksis.length : 0) + 1;
            const kodeBarcode = `GPM-MND-${String(nomorBaru).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const payload = {
                acara_id: validAcaraId,
                nama_pendaftar: (nama_lengkap || '').trim(),
                nomor_telepon: (nomor_telepon || '').trim(),
                nomor_antrean: nomorBaru,
                kode_barcode: kodeBarcode,
                status_kehadiran: 'Menunggu'
            };

            const dataMasuk = await supabaseClient.daftarAntreanGPM(payload);
            const tiketHasil = dataMasuk && dataMasuk.id ? dataMasuk : {
                ...payload,
                id: 'antrean-' + Date.now(),
                waktu_mendaftar: new Date().toISOString()
            };

            this.fallbackPendaftar.unshift(tiketHasil);
            if (acara) {
                acara.antrean_terisi = (acara.antrean_terisi || 0) + 1;
                acara.sisa_kuota = Math.max(0, (acara.kuota_maksimal || 250) - acara.antrean_terisi);
            }

            return {
                tiket: tiketHasil,
                acara: {
                    nama_acara: acara ? acara.nama_acara : 'Gerakan Pangan Murah Manado',
                    lokasi: acara ? acara.lokasi : 'Kota Manado',
                    kecamatan: acara ? acara.kecamatan : 'Wenang',
                    tanggal: acara ? acara.tanggal : new Date().toISOString().split('T')[0],
                    jam: acara ? `${acara.jam_mulai} - ${acara.jam_selesai} WITA` : '08:00 - 13:00 WITA'
                }
            };
        } catch (errorCloud) {
            console.warn('[GPMService] Supabase pendaftar_gpm offline, beralih ke backend/lokal:', errorCloud);
        }

        // 2. Coba API server jika ada
        try {
            const respon = await fetch(`${this.baseUrl}/antrian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acara_id: validAcaraId, nama_lengkap, nomor_telepon })
            });
            const hasil = await respon.json();
            if (respon.ok && hasil.data) return hasil.data;
        } catch (error) {}

        // 3. Cadangan lokal jika offline total
        const pendaftarAcara = this.fallbackPendaftar.filter(p => p.acara_id === validAcaraId || p.acara_id === acara_id);
        const nomorBaru = pendaftarAcara.length + 1;
        const kodeBarcode = `GPM-MND-${String(nomorBaru).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const tiketBaru = {
            id: 'antrean-' + Date.now(),
            acara_id: validAcaraId,
            nama_pendaftar: nama_lengkap,
            nomor_telepon,
            nomor_antrean: nomorBaru,
            kode_barcode: kodeBarcode,
            status_kehadiran: 'Menunggu',
            waktu_kehadiran: null,
            waktu_mendaftar: new Date().toISOString()
        };

        this.fallbackPendaftar.push(tiketBaru);
        if (acara) {
            acara.antrean_terisi = (acara.antrean_terisi || 0) + 1;
            acara.sisa_kuota = Math.max(0, (acara.kuota_maksimal || 200) - acara.antrean_terisi);
        }

        return {
            tiket: tiketBaru,
            acara: {
                nama_acara: acara ? acara.nama_acara : 'Gerakan Pangan Murah Manado',
                lokasi: acara ? acara.lokasi : 'Kota Manado',
                kecamatan: acara ? acara.kecamatan : 'Tikala',
                tanggal: acara ? acara.tanggal : '2026-11-01',
                jam: acara ? `${acara.jam_mulai} - ${acara.jam_selesai} WITA` : '08:00 - 13:00 WITA'
            }
        };
    }

    // [Modul Layanan GPM] 4. Petugas Mengambil Daftar Pendaftar untuk Suatu Acara
    async ambilPendaftarAcara(acara_id = null) {
        let validAcaraId = acara_id;
        if (validAcaraId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validAcaraId)) {
            validAcaraId = MAP_FALLBACK_ACARA_ID[validAcaraId] || null;
        }

        // 1. Ambil langsung dari Supabase Cloud
        try {
            const dataCloud = await supabaseClient.getPendaftarGPM(validAcaraId);
            if (Array.isArray(dataCloud)) {
                const hadir = dataCloud.filter(p => p.status_kehadiran === 'Hadir').length;
                this.fallbackPendaftar = dataCloud;
                return {
                    sukses: true,
                    total: dataCloud.length,
                    statistik: {
                        total_antrean: dataCloud.length,
                        total_hadir: hadir,
                        total_menunggu: dataCloud.length - hadir
                    },
                    data: dataCloud
                };
            }
        } catch (err) {
            console.warn('[GPMService] Supabase getPendaftarGPM offline, mencoba backend/lokal:', err);
        }

        // 2. Coba API server jika ada
        try {
            const respon = await fetch(`${this.baseUrl}/acara/${acara_id}/pendaftar`, {
                headers: this.ambilHeaderAuth()
            });
            if (respon.ok) {
                const hasil = await respon.json();
                return hasil;
            }
        } catch (error) {}

        // 3. Cadangan lokal
        const daftar = this.fallbackPendaftar.filter(p => !validAcaraId || p.acara_id === validAcaraId || p.acara_id === acara_id);
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

    // [Modul Layanan GPM] 5. Petugas Scan Barcode / QR Code
    async scanBarcode(kodeBarcode) {
        const kode = (kodeBarcode || '').trim().toUpperCase();
        if (!kode) throw new Error('Kode barcode tiket tidak boleh kosong!');

        // 1. Cari langsung di Supabase Cloud
        try {
            const pendaftarCloud = await supabaseClient.cariPendaftarByBarcode(kode);
            if (pendaftarCloud) {
                let acara = this.fallbackAcara.find(a => a.id === pendaftarCloud.acara_id);
                if (!acara && this.fallbackAcara.length > 0) acara = this.fallbackAcara[0];
                return {
                    ...pendaftarCloud,
                    acara: acara ? {
                        nama_acara: acara.nama_acara,
                        lokasi: acara.lokasi,
                        tanggal: acara.tanggal
                    } : null
                };
            }
        } catch (err) {
            console.warn('[GPMService] Supabase cariPendaftarByBarcode error:', err);
        }

        // 2. Coba API server jika ada
        try {
            const respon = await fetch(`${this.baseUrl}/scan/${encodeURIComponent(kode)}`, {
                headers: this.ambilHeaderAuth()
            });
            const hasil = await respon.json();
            if (respon.ok && hasil.data) return hasil.data;
        } catch (error) {}

        // 3. Cadangan lokal
        const pendaftar = this.fallbackPendaftar.find(p => (p.kode_barcode || '').toUpperCase() === kode);
        if (!pendaftar) throw new Error(`Barcode "${kodeBarcode}" tidak ditemukan di sistem.`);
        const acara = this.fallbackAcara.find(a => a.id === pendaftar.acara_id) || this.fallbackAcara[0];
        return {
            ...pendaftar,
            acara: acara ? {
                nama_acara: acara.nama_acara,
                lokasi: acara.lokasi,
                tanggal: acara.tanggal
            } : null
        };
    }

    // [Modul Layanan GPM] 6. Petugas Verifikasi Kehadiran
    async verifikasiKehadiran(kodeBarcode) {
        const kode = (kodeBarcode || '').trim().toUpperCase();
        if (!kode) throw new Error('Kode barcode tiket tidak boleh kosong!');

        // 1. Simpan verifikasi ke Supabase Cloud
        try {
            const resCloud = await supabaseClient.verifikasiPendaftarGPM(kode, 'Hadir');
            if (resCloud) {
                const idx = this.fallbackPendaftar.findIndex(p => (p.kode_barcode || '').toUpperCase() === kode);
                if (idx !== -1) {
                    this.fallbackPendaftar[idx].status_kehadiran = 'Hadir';
                    this.fallbackPendaftar[idx].waktu_kehadiran = new Date().toISOString();
                }
                return Array.isArray(resCloud) ? resCloud[0] : resCloud;
            }
        } catch (err) {
            console.warn('[GPMService] Supabase verifikasiKehadiran error:', err);
        }

        // 2. Coba API server jika ada
        try {
            const respon = await fetch(`${this.baseUrl}/verifikasi/${encodeURIComponent(kode)}`, {
                method: 'POST',
                headers: this.ambilHeaderAuth()
            });
            const hasil = await respon.json();
            if (respon.ok && hasil.data) return hasil.data;
        } catch (error) {}

        // 3. Cadangan lokal
        const idx = this.fallbackPendaftar.findIndex(p => (p.kode_barcode || '').toUpperCase() === kode);
        if (idx === -1) throw new Error(`Data barcode "${kodeBarcode}" tidak ditemukan.`);
        this.fallbackPendaftar[idx].status_kehadiran = 'Hadir';
        this.fallbackPendaftar[idx].waktu_kehadiran = new Date().toISOString();
        return this.fallbackPendaftar[idx];
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

    // [Modul Layanan GPM] 8. Selesaikan & Kunci Kegiatan GPM (Khusus Kepala Bidang)
    async selesaikanAcara(id) {
        let validId = id;
        const MAP_FALLBACK = {
            '1': '777e05ab-a8c0-4bdc-9999-a12e522786d6',
            '2': 'f1da6320-1a2b-48f2-8d0d-c1cf28208808'
        };
        if (MAP_FALLBACK[String(id)]) {
            validId = MAP_FALLBACK[String(id)];
        }

        try {
            await supabaseClient.updateAcaraGPM(validId, { status: 'Selesai' });
        } catch (e) {
            console.warn('[GPMService] Gagal memperbarui status selesai di Supabase:', e);
        }

        try {
            await fetch(`${this.baseUrl}/acara/${id}`, {
                method: 'PATCH',
                headers: this.ambilHeaderAuth(),
                body: JSON.stringify({ status: 'Selesai' })
            });
        } catch (e) {}

        const idx = this.fallbackAcara.findIndex(a => String(a.id) === String(id) || String(a.id) === String(validId));
        if (idx !== -1) {
            this.fallbackAcara[idx].status = 'Selesai';
        }
        return true;
    }

    // [Modul Layanan GPM] 9. Hapus Acara GPM & Seluruh Riwayat Antrean (Khusus Kepala Bidang)
    async hapusAcara(id) {
        let validId = id;
        const MAP_FALLBACK = {
            '1': '777e05ab-a8c0-4bdc-9999-a12e522786d6',
            '2': 'f1da6320-1a2b-48f2-8d0d-c1cf28208808'
        };
        if (MAP_FALLBACK[String(id)]) {
            validId = MAP_FALLBACK[String(id)];
        }

        try {
            await supabaseClient.hapusAcaraGPM(validId);
        } catch (e) {
            console.warn('[GPMService] Gagal menghapus acara di Supabase:', e);
        }

        try {
            await fetch(`${this.baseUrl}/acara/${id}`, {
                method: 'DELETE',
                headers: this.ambilHeaderAuth()
            });
        } catch (e) {}

        this.fallbackAcara = this.fallbackAcara.filter(a => String(a.id) !== String(id) && String(a.id) !== String(validId));
        this.fallbackPendaftar = this.fallbackPendaftar.filter(p => String(p.acara_id) !== String(id) && String(p.acara_id) !== String(validId));
        return true;
    }

    // [Modul Layanan GPM] 10. Mengambil Riwayat Acara yang Sudah Selesai
    async ambilRiwayatAcara() {
        return this.ambilSemuaAcara('Selesai');
    }

    // [Modul Layanan GPM] 11. Ekspor Rekapitulasi Data Pendaftar Acara ke File CSV
    eksporKeCSV(acara, daftarPendaftar) {
        if (!acara) return false;
        const pendaftar = Array.isArray(daftarPendaftar) ? daftarPendaftar : [];
        const totalPendaftar = pendaftar.length;
        const totalHadir = pendaftar.filter(p => p.status_kehadiran === 'Hadir').length;
        const totalMenunggu = totalPendaftar - totalHadir;

        // Karakter UTF-8 BOM untuk kompatibilitas penuh dengan Microsoft Excel
        let csv = '\uFEFF';
        csv += 'REKAPITULASI RESMI GERAKAN PANGAN MURAH (GPM)\n';
        csv += 'DINAS PANGAN KOTA MANADO\n';
        csv += '============================================================\n';
        csv += `Nama Kegiatan,"${(acara.nama_acara || '').replace(/"/g, '""')}"\n`;
        csv += `Lokasi Pelaksanaan,"${(acara.lokasi || '').replace(/"/g, '""')} (Kec. ${(acara.kecamatan || '').replace(/"/g, '""')})"\n`;
        csv += `Tanggal Pelaksanaan,"${acara.tanggal || '-'} (${acara.jam_mulai || '08:00'} - ${acara.jam_selesai || '13:00'} WITA)"\n`;
        csv += `Komoditas Pangan Tersedia,"${(acara.komoditas_tersedia || '').replace(/"/g, '""')}"\n`;
        csv += `Status Acara,"${acara.status || 'Selesai'}"\n`;
        csv += `Total Kuota Maksimal,${acara.kuota_maksimal || 250}\n`;
        csv += `Total Warga Mendaftar,${totalPendaftar}\n`;
        csv += `Total Warga Hadir (Terverifikasi),${totalHadir}\n`;
        csv += `Total Belum Hadir / Menunggu,${totalMenunggu}\n`;
        csv += `Waktu Unduh Rekapitulasi,"${new Date().toLocaleString('id-ID')}"\n`;
        csv += '============================================================\n\n';

        csv += 'No Urut,Nomor Antrean,Nama Lengkap Warga,Nomor Telepon/WA,Kode Barcode QR,Status Kehadiran,Waktu Pendaftaran,Waktu Hadir\n';

        pendaftar.forEach((p, index) => {
            const noUrut = index + 1;
            const noAntrean = `"#${String(p.nomor_antrean || index + 1).padStart(3, '0')}"`;
            const nama = `"${(p.nama_pendaftar || '').replace(/"/g, '""')}"`;
            const telp = `"'${p.nomor_telepon || ''}"`;
            const kode = `"${(p.kode_barcode || '').replace(/"/g, '""')}"`;
            const status = `"${p.status_kehadiran || 'Menunggu'}"`;
            const waktuDaftar = `"${p.waktu_mendaftar ? new Date(p.waktu_mendaftar).toLocaleString('id-ID') : '-'}"`;
            const waktuHadir = `"${p.waktu_kehadiran ? new Date(p.waktu_kehadiran).toLocaleString('id-ID') : (p.status_kehadiran === 'Hadir' ? 'Hadir di Lokasi' : '-')}"`;
            csv += `${noUrut},${noAntrean},${nama},${telp},${kode},${status},${waktuDaftar},${waktuHadir}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const namaFileBersih = (acara.nama_acara || 'GPM').replace(/[^a-zA-Z0-9_-]/g, '_');
        link.setAttribute('href', url);
        link.setAttribute('download', `Rekap_GPM_${namaFileBersih}_${acara.tanggal || 'arsip'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    }

    // [Modul Layanan GPM] 12. Mengambil Data Statistik Acara & Antrean
    async ambilStatistik() {
        try {
            const pendaftar = await supabaseClient.getPendaftarGPM();
            const acara = await supabaseClient.getAcaraGPM();
            const totalAntrean = Array.isArray(pendaftar) ? pendaftar.length : 0;
            const totalHadir = Array.isArray(pendaftar) ? pendaftar.filter(p => p.status_kehadiran === 'Hadir').length : 0;
            const daftarAcara = Array.isArray(acara) && acara.length > 0 ? acara : this.fallbackAcara;

            return {
                total_gpm: daftarAcara.length,
                gpm_aktif: daftarAcara.filter(a => a.status === 'Aktif').length,
                gpm_selesai: daftarAcara.filter(a => a.status === 'Selesai').length,
                total_antrean: totalAntrean,
                total_hadir: totalHadir,
                total_menunggu: totalAntrean - totalHadir
            };
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
