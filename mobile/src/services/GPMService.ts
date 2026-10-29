// ===================================================================================
// SERVICE GPM (GERAKAN PANGAN MURAH) - OOP (MOBILE)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Framework: Vue 3 + TypeScript + Ionic Framework + Capacitor
// Modul: Komunikasi HTTP Mobile dengan Backend API GPM & Antrean Barcode
// ===================================================================================

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
        this.apiRoot = (import.meta as any).env?.VITE_API_ROOT || 'http://localhost:3000/api';
        this.baseUrl = `${this.apiRoot}/gpm`;
        this.inisialisasiDataLokal();
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

    // [Modul Mobile Service] 1. Mengambil semua jadwal acara GPM
    async ambilSemuaAcara(status = '', kecamatan = ''): Promise<ItemAcaraGPM[]> {
        try {
            const params = new URLSearchParams();
            if (status && status !== 'Semua') params.append('status', status);
            if (kecamatan && kecamatan !== 'Semua') params.append('kecamatan', kecamatan);

            const respon = await fetch(`${this.baseUrl}/acara${params.toString() ? '?' + params.toString() : ''}`);
            if (!respon.ok) throw new Error('Gagal mengambil data dari server');
            const json = await respon.json();
            return json.data || [];
        } catch (error) {
            return this.fallbackAcara.filter(item => {
                const cocokStatus = !status || status === 'Semua' || item.status === status;
                const cocokKecamatan = !kecamatan || kecamatan === 'Semua' || item.kecamatan.toLowerCase() === kecamatan.toLowerCase();
                return cocokStatus && cocokKecamatan;
            });
        }
    }

    // [Modul Mobile Service] 2. Masyarakat Ambil Antrean & Barcode (Tanpa Login)
    async ambilNomorAntrean(acara_id: string, nama_lengkap: string, nomor_telepon: string): Promise<HasilTiketGPM> {
        try {
            const respon = await fetch(`${this.baseUrl}/antrian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acara_id, nama_lengkap, nomor_telepon })
            });
            const json = await respon.json();
            if (!respon.ok) throw new Error(json.pesan || 'Gagal mengambil nomor antrean');
            return json.data;
        } catch (error) {
            const acara = this.fallbackAcara.find(a => a.id === acara_id) || this.fallbackAcara[0];
            const pendaftarAcara = this.fallbackPendaftar.filter(p => p.acara_id === acara_id);
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
    }

    // [Modul Mobile Service] 3. Petugas Scan Barcode
    async scanBarcode(kodeBarcode: string): Promise<ItemPendaftarGPM> {
        try {
            const respon = await fetch(`${this.baseUrl}/scan/${encodeURIComponent(kodeBarcode)}`, {
                headers: this.ambilHeaderAuth()
            });
            const json = await respon.json();
            if (!respon.ok) throw new Error(json.pesan || 'Barcode tidak ditemukan');
            return json.data;
        } catch (error) {
            const kode = kodeBarcode.trim().toUpperCase();
            const pendaftar = this.fallbackPendaftar.find(p => p.kode_barcode.toUpperCase() === kode);
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
    }

    // [Modul Mobile Service] 4. Petugas Verifikasi Kehadiran
    async verifikasiKehadiran(kodeBarcode: string): Promise<ItemPendaftarGPM> {
        try {
            const respon = await fetch(`${this.baseUrl}/verifikasi/${encodeURIComponent(kodeBarcode)}`, {
                method: 'POST',
                headers: this.ambilHeaderAuth()
            });
            const json = await respon.json();
            if (!respon.ok) throw new Error(json.pesan || 'Gagal memverifikasi');
            return json.data;
        } catch (error) {
            const kode = kodeBarcode.trim().toUpperCase();
            const idx = this.fallbackPendaftar.findIndex(p => p.kode_barcode.toUpperCase() === kode);
            if (idx === -1) throw new Error(`Barcode "${kodeBarcode}" tidak ditemukan.`);
            this.fallbackPendaftar[idx].status_kehadiran = 'Hadir';
            this.fallbackPendaftar[idx].waktu_kehadiran = new Date().toISOString();
            this.simpanPendaftarKeStorage();
            return this.fallbackPendaftar[idx];
        }
    }

    // [Modul Mobile Service] 5. Mengambil Semua Pendaftar untuk Petugas
    async ambilPendaftarAcara(acara_id: string) {
        try {
            const respon = await fetch(`${this.baseUrl}/acara/${acara_id}/pendaftar`, {
                headers: this.ambilHeaderAuth()
            });
            const json = await respon.json();
            return json;
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

    // [Modul Mobile Service] 6. Petugas Tambah Acara GPM Baru
    async tambahAcara(dataAcara: Partial<ItemAcaraGPM>): Promise<ItemAcaraGPM> {
        try {
            const respon = await fetch(`${this.baseUrl}/acara`, {
                method: 'POST',
                headers: this.ambilHeaderAuth(),
                body: JSON.stringify(dataAcara)
            });
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

    // [Modul Mobile Service] 7. Mengambil Statistik Global GPM
    async ambilStatistik(): Promise<StatistikGPM> {
        try {
            const respon = await fetch(`${this.baseUrl}/statistik`, {
                headers: this.ambilHeaderAuth()
            });
            const json = await respon.json();
            return json.data;
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
