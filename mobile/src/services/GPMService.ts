// Modul Layanan Gerakan Pangan Murah (GPM) dan Antrean Barcode
// Dinas Pangan Kota Manado (Aplikasi Seluler)
// Framework: Vue 3 + TypeScript + Ionic Framework + Capacitor
// Mengelola sinkronisasi jadwal acara, kuota tiket, nomor antrean, dan pemindaian barcode dengan Cloud Supabase

import { getApiRoot, onServerUrlChanged } from './ServerConfig';
import { supabaseClient } from './SupabaseClient';

const MAP_FALLBACK_ACARA_ID: Record<string, string> = {
    'gpm-001-sparta-tikala': '777e05ab-a8c0-4bdc-9999-a12e522786d6',
    'gpm-002-pasar-bersehati': 'f1da6320-1a2b-48f2-8d0d-c1cf28208808'
};

export interface ItemAcaraGPM {
    id: string;
    nama_acara: string;
    lokasi: string;
    kecamatan: string;
    tanggal: string;
    jam_mulai: string;
    jam_selesai: string;
    latitude: number;
    longitude: number;
    kuota_maksimal: number;
    antrean_terisi?: number;
    sisa_kuota?: number;
    komoditas_tersedia: string;
    deskripsi?: string;
    status: string;
}

export interface ItemPendaftarGPM {
    id: string;
    acara_id: string;
    nama_pendaftar: string;
    nomor_telepon: string;
    nomor_antrean: number;
    kode_barcode: string;
    status_kehadiran: 'Menunggu' | 'Hadir' | 'Batal';
    waktu_kehadiran?: string | null;
    waktu_mendaftar?: string;
    acara?: {
        nama_acara: string;
        lokasi: string;
        tanggal: string;
    } | null;
}

export interface HasilTiketGPM {
    tiket: ItemPendaftarGPM;
    acara: {
        nama_acara: string;
        lokasi: string;
        kecamatan: string;
        tanggal: string;
        jam: string;
    };
}

export interface StatistikGPM {
    total_gpm: number;
    gpm_aktif: number;
    gpm_selesai: number;
    total_antrean: number;
    total_hadir: number;
    total_menunggu: number;
}

class GPMMobileApiService {
    private apiRoot: string;
    private baseUrl: string;
    private fallbackAcara: ItemAcaraGPM[] = [];
    private fallbackPendaftar: ItemPendaftarGPM[] = [];

    constructor() {
        this.apiRoot = getApiRoot();
        this.baseUrl = `${this.apiRoot}/gpm`;
        this.inisialisasiDataLokal();

        onServerUrlChanged((baruApi) => {
            this.apiRoot = baruApi;
            this.baseUrl = `${baruApi}/gpm`;
        });
    }

    private inisialisasiDataLokal() {
        const defaultAcara: ItemAcaraGPM[] = [
            {
                id: 'gpm-001-sparta-tikala',
                nama_acara: 'GPM Lapangan Sparta Tikala',
                lokasi: 'Depan Kantor Walikota Manado',
                kecamatan: 'Tikala',
                tanggal: '2026-10-18',
                jam_mulai: '08:00',
                jam_selesai: '13:00',
                latitude: 1.4883,
                longitude: 124.8436,
                kuota_maksimal: 250,
                antrean_terisi: 3,
                sisa_kuota: 247,
                komoditas_tersedia: 'Beras SPHP 5kg (Rp 58.000), Minyakita 1L (Rp 15.000), Gula 1kg (Rp 16.500), Bawang Merah & Cabai',
                deskripsi: 'GPM serentak untuk stabilisasi pasokan pangan warga Manado.',
                status: 'Aktif'
            },
            {
                id: 'gpm-002-pasar-bersehati',
                nama_acara: 'GPM Pelataran Bersehati Karombasan',
                lokasi: 'Pasar Bersehati Karombasan',
                kecamatan: 'Wanea',
                tanggal: '2026-10-21',
                jam_mulai: '07:30',
                jam_selesai: '12:30',
                latitude: 1.4674,
                longitude: 124.8468,
                kuota_maksimal: 300,
                antrean_terisi: 1,
                sisa_kuota: 299,
                komoditas_tersedia: 'Beras Premium, Minyakita, Telur Ayam 1 Baki (Rp 52.000)',
                deskripsi: 'Komoditas pangan langsung dari distributor resmi.',
                status: 'Aktif'
            },
            {
                id: 'gpm-003-pesisir-tuminting',
                nama_acara: 'GPM Pesisir Utara Tuminting',
                lokasi: 'Kantor Kecamatan Tuminting',
                kecamatan: 'Tuminting',
                tanggal: '2026-10-25',
                jam_mulai: '08:30',
                jam_selesai: '14:00',
                latitude: 1.5126,
                longitude: 124.8488,
                kuota_maksimal: 200,
                antrean_terisi: 0,
                sisa_kuota: 200,
                komoditas_tersedia: 'Beras SPHP, Minyak Goreng, Gula Pasir, Ikan Segar',
                deskripsi: 'Khusus masyarakat Tuminting dan Bunaken Daratan.',
                status: 'Aktif'
            }
        ];

        const defaultPendaftar: ItemPendaftarGPM[] = [
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
            }
        ];

        const savedAcara = localStorage.getItem('sipatokean_mobile_gpm_acara');
        if (savedAcara) {
            try { this.fallbackAcara = JSON.parse(savedAcara); } catch (e) { this.fallbackAcara = defaultAcara; }
        } else {
            this.fallbackAcara = defaultAcara;
            localStorage.setItem('sipatokean_mobile_gpm_acara', JSON.stringify(defaultAcara));
        }

        const savedPendaftar = localStorage.getItem('sipatokean_mobile_gpm_pendaftar');
        if (savedPendaftar) {
            try { this.fallbackPendaftar = JSON.parse(savedPendaftar); } catch (e) { this.fallbackPendaftar = defaultPendaftar; }
        } else {
            this.fallbackPendaftar = defaultPendaftar;
            localStorage.setItem('sipatokean_mobile_gpm_pendaftar', JSON.stringify(defaultPendaftar));
        }
    }

    private simpanAcaraKeStorage() {
        localStorage.setItem('sipatokean_mobile_gpm_acara', JSON.stringify(this.fallbackAcara));
    }

    private simpanPendaftarKeStorage() {
        localStorage.setItem('sipatokean_mobile_gpm_pendaftar', JSON.stringify(this.fallbackPendaftar));
    }

    // Helper token
    private ambilHeaderAuth() {
        const token = localStorage.getItem('sipatokean_mobile_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    // [Modul Mobile Service] 1. Mengambil semua jadwal acara GPM (Cloud Supabase -> Server -> Local)
    async ambilSemuaAcara(status = '', kecamatan = ''): Promise<ItemAcaraGPM[]> {
        // 1. Prioritaskan Supabase Cloud Database (HP & Web Real-time Sync)
        try {
            const dataCloud = await supabaseClient.getAcaraGPM();
            if (Array.isArray(dataCloud) && dataCloud.length > 0) {
                const mapped: ItemAcaraGPM[] = dataCloud.map((item: any) => ({
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
                this.simpanAcaraKeStorage();

                return mapped.filter(item => {
                    const cocokStatus = !status || status === 'Semua' || item.status.toLowerCase() === status.toLowerCase();
                    const cocokKecamatan = !kecamatan || kecamatan === 'Semua' || item.kecamatan.toLowerCase() === kecamatan.toLowerCase();
                    return cocokStatus && cocokKecamatan;
                });
            }
        } catch (err) {
            console.warn('Supabase getAcaraGPM offline, mencoba backend / lokal...', err);
        }

        // 2. Coba API server LAN jika ada
        try {
            const params = new URLSearchParams();
            if (status && status !== 'Semua') params.append('status', status);
            if (kecamatan && kecamatan !== 'Semua') params.append('kecamatan', kecamatan);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const respon = await fetch(`${this.baseUrl}/acara${params.toString() ? '?' + params.toString() : ''}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (respon.ok) {
                const json = await respon.json();
                const dataServer = json.data || [];
                if (dataServer.length > 0) {
                    this.fallbackAcara = dataServer;
                    this.simpanAcaraKeStorage();
                    return dataServer;
                }
            }
        } catch (error) {}

        // 3. Fallback lokal di HP
        return this.fallbackAcara.filter(item => {
            const cocokStatus = !status || status === 'Semua' || item.status.toLowerCase() === status.toLowerCase();
            const cocokKecamatan = !kecamatan || kecamatan === 'Semua' || item.kecamatan.toLowerCase() === kecamatan.toLowerCase();
            return cocokStatus && cocokKecamatan;
        });
    }

    // [Modul Layanan GPM Mobile] 2. Masyarakat Ambil Antrean & Barcode (Cloud Supabase)
    async ambilNomorAntrean(acara_id: string, nama_lengkap: string, nomor_telepon: string): Promise<HasilTiketGPM> {
        let validAcaraId = acara_id;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(validAcaraId)) {
            validAcaraId = MAP_FALLBACK_ACARA_ID[validAcaraId] || '777e05ab-a8c0-4bdc-9999-a12e522786d6';
        }

        const acara = this.fallbackAcara.find(a => a.id === validAcaraId || a.id === acara_id) || this.fallbackAcara[0];

        // 1. Simpan langsung ke Supabase Cloud
        try {
            const pendaftarEksis = await supabaseClient.getPendaftarGPM(validAcaraId);
            const nomorBaru = (Array.isArray(pendaftarEksis) ? pendaftarEksis.length : 0) + 1;
            const kodeBarcode = `GPM-MOB-${String(nomorBaru).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const payload = {
                acara_id: validAcaraId,
                nama_pendaftar: nama_lengkap.trim(),
                nomor_telepon: nomor_telepon.trim(),
                nomor_antrean: nomorBaru,
                kode_barcode: kodeBarcode,
                status_kehadiran: 'Menunggu'
            };

            const dataMasuk = await supabaseClient.daftarAntreanGPM(payload);
            const tiketBaru: ItemPendaftarGPM = dataMasuk && dataMasuk.id ? dataMasuk : {
                ...payload,
                id: 'antrean-' + Date.now(),
                waktu_mendaftar: new Date().toISOString()
            };

            this.fallbackPendaftar.push(tiketBaru);
            this.simpanPendaftarKeStorage();

            if (acara) {
                acara.antrean_terisi = (acara.antrean_terisi || 0) + 1;
                acara.sisa_kuota = Math.max(0, (acara.kuota_maksimal || 200) - acara.antrean_terisi);
                this.simpanAcaraKeStorage();
            }

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
        } catch (cloudErr) {
            console.warn('[GPMService Mobile] Supabase offline, mencoba penyimpanan lokal:', cloudErr);
        }

        // 2. Coba API server jika terhubung LAN
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const respon = await fetch(`${this.baseUrl}/antrian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acara_id: validAcaraId, nama_lengkap, nomor_telepon }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await respon.json();
            if (respon.ok && json.data) return json.data;
        } catch (error) {}

        // 3. Fallback penyimpanan offline lokal
        const pendaftarAcara = this.fallbackPendaftar.filter(p => p.acara_id === validAcaraId || p.acara_id === acara_id);
        const nomorBaru = pendaftarAcara.length + 1;
        const kodeBarcode = `GPM-MOB-${String(nomorBaru).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const tiketBaru: ItemPendaftarGPM = {
            id: 'antrean-' + Date.now(),
            acara_id: acara.id,
            nama_pendaftar: nama_lengkap,
            nomor_telepon,
            nomor_antrean: nomorBaru,
            kode_barcode: kodeBarcode,
            status_kehadiran: 'Menunggu',
            waktu_kehadiran: null,
            waktu_mendaftar: new Date().toISOString()
        };

        this.fallbackPendaftar.push(tiketBaru);
        this.simpanPendaftarKeStorage();

        acara.antrean_terisi = (acara.antrean_terisi || 0) + 1;
        acara.sisa_kuota = Math.max(0, (acara.kuota_maksimal || 200) - acara.antrean_terisi);
        this.simpanAcaraKeStorage();

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

    // [Modul Layanan GPM Mobile] 3. Petugas Scan Barcode
    async scanBarcode(kodeBarcode: string): Promise<ItemPendaftarGPM> {
        const kode = kodeBarcode.trim().toUpperCase();
        if (!kode) throw new Error('Kode tiket tidak boleh kosong');

        // 1. Cari langsung di Supabase Cloud Database
        try {
            const pendaftarCloud = await supabaseClient.cariPendaftarByBarcode(kode);
            if (pendaftarCloud) {
                const acara = this.fallbackAcara.find(a => a.id === pendaftarCloud.acara_id) || this.fallbackAcara[0];
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
            console.warn('[GPMService Mobile] Supabase cariPendaftarByBarcode offline:', err);
        }

        // 2. Coba API server jika ada
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const respon = await fetch(`${this.baseUrl}/scan/${encodeURIComponent(kode)}`, {
                headers: this.ambilHeaderAuth(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await respon.json();
            if (respon.ok && json.data) return json.data;
        } catch (error) {}

        // 3. Cadangan lokal
        const pendaftar = this.fallbackPendaftar.find(p => (p.kode_barcode || '').toUpperCase() === kode);
        if (!pendaftar) throw new Error(`Barcode "${kodeBarcode}" tidak ditemukan.`);
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

    // [Modul Layanan GPM Mobile] 4. Petugas Verifikasi Kehadiran
    async verifikasiKehadiran(kodeBarcode: string): Promise<ItemPendaftarGPM> {
        const kode = kodeBarcode.trim().toUpperCase();
        if (!kode) throw new Error('Kode tiket tidak boleh kosong');

        // 1. Simpan verifikasi ke Cloud Supabase
        try {
            const resCloud = await supabaseClient.verifikasiPendaftarGPM(kode, 'Hadir');
            if (resCloud) {
                const idx = this.fallbackPendaftar.findIndex(p => (p.kode_barcode || '').toUpperCase() === kode);
                if (idx !== -1) {
                    this.fallbackPendaftar[idx].status_kehadiran = 'Hadir';
                    this.fallbackPendaftar[idx].waktu_kehadiran = new Date().toISOString();
                    this.simpanPendaftarKeStorage();
                }
                const hasil = Array.isArray(resCloud) ? resCloud[0] : resCloud;
                return hasil;
            }
        } catch (err) {
            console.warn('[GPMService Mobile] Supabase verifikasi offline:', err);
        }

        // 2. Coba API server jika ada
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const respon = await fetch(`${this.baseUrl}/verifikasi/${encodeURIComponent(kode)}`, {
                method: 'POST',
                headers: this.ambilHeaderAuth(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await respon.json();
            if (respon.ok && json.data) return json.data;
        } catch (error) {}

        // 3. Cadangan lokal
        const idx = this.fallbackPendaftar.findIndex(p => (p.kode_barcode || '').toUpperCase() === kode);
        if (idx === -1) throw new Error(`Barcode "${kodeBarcode}" tidak ditemukan.`);
        this.fallbackPendaftar[idx].status_kehadiran = 'Hadir';
        this.fallbackPendaftar[idx].waktu_kehadiran = new Date().toISOString();
        this.simpanPendaftarKeStorage();
        return this.fallbackPendaftar[idx];
    }

    // [Modul Layanan GPM Mobile] 5. Mengambil Semua Pendaftar untuk Petugas
    async ambilPendaftarAcara(acara_id?: string) {
        let validAcaraId = acara_id;
        if (validAcaraId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validAcaraId)) {
            validAcaraId = MAP_FALLBACK_ACARA_ID[validAcaraId] || undefined;
        }

        // 1. Ambil langsung dari Supabase Cloud Database
        try {
            const dataCloud = await supabaseClient.getPendaftarGPM(validAcaraId);
            if (Array.isArray(dataCloud)) {
                const hadir = dataCloud.filter(p => p.status_kehadiran === 'Hadir').length;
                this.fallbackPendaftar = dataCloud;
                this.simpanPendaftarKeStorage();

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
            console.warn('[GPMService Mobile] Supabase getPendaftarGPM offline:', err);
        }

        // 2. Coba API server jika ada
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const endpoint = acara_id ? `${this.baseUrl}/acara/${acara_id}/pendaftar` : `${this.baseUrl}/antrian`;
            const respon = await fetch(endpoint, {
                headers: this.ambilHeaderAuth(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await respon.json();
            if (respon.ok && json.data) return json;
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

    // [Modul Mobile Service] 6. Petugas Tambah Acara GPM Baru
    async tambahAcara(dataAcara: Partial<ItemAcaraGPM>): Promise<ItemAcaraGPM> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const respon = await fetch(`${this.baseUrl}/acara`, {
                method: 'POST',
                headers: this.ambilHeaderAuth(),
                body: JSON.stringify(dataAcara),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await respon.json();
            return json.data;
        } catch (error) {
            const itemBaru: ItemAcaraGPM = {
                id: 'gpm-' + Date.now(),
                nama_acara: dataAcara.nama_acara || 'GPM Baru',
                lokasi: dataAcara.lokasi || 'Kota Manado',
                kecamatan: dataAcara.kecamatan || 'Wenang',
                tanggal: dataAcara.tanggal || new Date().toISOString().split('T')[0],
                jam_mulai: dataAcara.jam_mulai || '08:00',
                jam_selesai: dataAcara.jam_selesai || '13:00',
                latitude: dataAcara.latitude || 1.4883,
                longitude: dataAcara.longitude || 124.8436,
                kuota_maksimal: dataAcara.kuota_maksimal || 250,
                antrean_terisi: 0,
                sisa_kuota: dataAcara.kuota_maksimal || 250,
                komoditas_tersedia: dataAcara.komoditas_tersedia || 'Beras, Minyak, Gula',
                status: 'Aktif'
            };
            this.fallbackAcara.unshift(itemBaru);
            this.simpanAcaraKeStorage();
            return itemBaru;
        }
    }

    // [Modul Layanan GPM Mobile] Selesaikan & Kunci Kegiatan GPM (Khusus Kepala Bidang)
    async selesaikanAcara(id: string): Promise<boolean> {
        let validId = id;
        const MAP_FALLBACK: Record<string, string> = {
            '1': '777e05ab-a8c0-4bdc-9999-a12e522786d6',
            '2': 'f1da6320-1a2b-48f2-8d0d-c1cf28208808'
        };
        if (MAP_FALLBACK[String(id)]) {
            validId = MAP_FALLBACK[String(id)];
        }

        try {
            await supabaseClient.updateAcaraGPM(validId, { status: 'Selesai' });
        } catch (e) {
            console.warn('[GPMMobileService] Gagal update status di Supabase:', e);
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
            this.simpanAcaraKeStorage();
        }
        return true;
    }

    // [Modul Layanan GPM Mobile] Hapus Acara GPM & Seluruh Riwayat Antrean (Khusus Kepala Bidang)
    async hapusAcara(id: string): Promise<boolean> {
        let validId = id;
        const MAP_FALLBACK: Record<string, string> = {
            '1': '777e05ab-a8c0-4bdc-9999-a12e522786d6',
            '2': 'f1da6320-1a2b-48f2-8d0d-c1cf28208808'
        };
        if (MAP_FALLBACK[String(id)]) {
            validId = MAP_FALLBACK[String(id)];
        }

        try {
            await supabaseClient.hapusAcaraGPM(validId);
        } catch (e) {
            console.warn('[GPMMobileService] Gagal menghapus acara di Supabase:', e);
        }

        try {
            await fetch(`${this.baseUrl}/acara/${id}`, {
                method: 'DELETE',
                headers: this.ambilHeaderAuth()
            });
        } catch (e) {}

        this.fallbackAcara = this.fallbackAcara.filter(a => String(a.id) !== String(id) && String(a.id) !== String(validId));
        this.fallbackPendaftar = this.fallbackPendaftar.filter(p => String(p.acara_id) !== String(id) && String(p.acara_id) !== String(validId));
        this.simpanAcaraKeStorage();
        this.simpanPendaftarKeStorage();
        return true;
    }

    // [Modul Layanan GPM Mobile] Mengambil Riwayat Acara yang Sudah Selesai
    async ambilRiwayatAcara(): Promise<ItemAcaraGPM[]> {
        return this.ambilSemuaAcara('Selesai');
    }

    // [Modul Layanan GPM Mobile] Ekspor Rekapitulasi Data Pendaftar Acara ke File CSV
    eksporKeCSV(acara: ItemAcaraGPM, daftarPendaftar: ItemPendaftarGPM[] | any[]): boolean {
        if (!acara) return false;
        const pendaftar = Array.isArray(daftarPendaftar) ? daftarPendaftar : [];
        const totalPendaftar = pendaftar.length;
        const totalHadir = pendaftar.filter(p => p.status_kehadiran === 'Hadir').length;
        const totalMenunggu = totalPendaftar - totalHadir;

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

    // [Modul Layanan GPM Mobile] 7. Mengambil Statistik Global GPM
    async ambilStatistik(): Promise<StatistikGPM> {
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
        } catch (error) {
            const hadir = this.fallbackPendaftar.filter(p => p.status_kehadiran === 'Hadir').length;
            return {
                total_gpm: this.fallbackAcara.length,
                gpm_aktif: this.fallbackAcara.filter(a => a.status === 'Aktif').length,
                gpm_selesai: this.fallbackAcara.filter(a => a.status === 'Selesai').length,
                total_antrean: this.fallbackPendaftar.length,
                total_hadir: hadir,
                total_menunggu: this.fallbackPendaftar.length - hadir
            };
        }
    }
}

export const gpmMobileService = new GPMMobileApiService();
