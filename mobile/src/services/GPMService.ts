// ===================================================================================
// Modul Layanan Gerakan Pangan Murah (GPM) dan Antrean QR Code (OOP - Mobile)
// Fungsi: Mengelola sinkronisasi jadwal acara GPM 100% dari basis data Supabase
//         (tanpa data dummy), auto-close otomatis berbasis waktu WITA, pendaftaran
//         antrean atomik anti-tembus kuota & anti-NIK ganda, tambah acara langsung
//         ke Supabase, ubah kuota oleh Kabid, serta kunci verifikasi QR saat selesai.
// ===================================================================================

import { getApiRoot, onServerUrlChanged } from './ServerConfig';
import { supabaseClient } from './SupabaseClient';
import { jadwalGPMMobileService } from './JadwalGPMService';
import { excelResmiMobileService, BarisExcelResmi } from './ExcelResmiService';

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
    total_hadir?: number;
    total_menunggu?: number;
    sisa_kuota?: number;
    komoditas_tersedia: string;
    deskripsi?: string;
    mode_pendaftaran?: 'online' | 'keduanya' | 'langsung';
    mode_penerima?: 'individu' | 'keluarga';
    status: string;
    dibuat_pada?: string | null;
    diperbarui_pada?: string | null;
}

export interface ItemPendaftarGPM {
    id: string;
    acara_id: string;
    nama_pendaftar: string;
    nama_bersih?: string;
    nik?: string;
    no_kk?: string | null;
    nama_kepala_keluarga?: string | null;
    jumlah_anggota?: number | null;
    jalur_pendaftaran?: 'Daring' | 'Langsung';
    nomor_telepon: string;
    nomor_antrean: number;
    kode_barcode: string;
    status_kehadiran: 'Menunggu' | 'Hadir' | 'Batal';
    status_pengambilan?: 'Belum Diambil' | 'Sudah Diambil';
    waktu_kehadiran?: string | null;
    waktu_pengambilan?: string | null;
    waktu_mendaftar?: string;
    acara?: {
        id?: string;
        nama_acara: string;
        lokasi: string;
        tanggal: string;
        jam_mulai?: string;
        jam_selesai?: string;
        status?: string;
        terkunci_waktu?: boolean;
    } | null;
}

export interface OpsiKeluargaGPM {
    no_kk?: string | null;
    nama_kepala_keluarga?: string | null;
    jumlah_anggota?: number | null;
}

export interface HasilTiketGPM {
    tiket: ItemPendaftarGPM;
    acara: {
        nama_acara: string;
        lokasi: string;
        kecamatan: string;
        tanggal: string;
        jam: string;
        mode_penerima?: 'individu' | 'keluarga';
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
    private cacheAcara: ItemAcaraGPM[] = [];
    private cachePendaftar: ItemPendaftarGPM[] = [];

    constructor() {
        this.apiRoot = getApiRoot();
        this.baseUrl = `${this.apiRoot}/gpm`;

        onServerUrlChanged((baruApi) => {
            this.apiRoot = baruApi;
            this.baseUrl = `${baruApi}/gpm`;
        });
    }

    private adalahErrorRpcBelumAda(err: any): boolean {
        const msg = String(err?.message || '').toLowerCase();
        return (
            msg.includes('could not find the function') ||
            msg.includes('pgrst202') ||
            msg.includes('status 404') ||
            msg.includes('does not exist')
        );
    }

    // 1. Mengambil semua jadwal acara GPM RIIL dari Supabase (0% data dummy) + Auto-Close WITA + Hitung Kuota Akurat
    async ambilSemuaAcara(status = '', kecamatan = ''): Promise<ItemAcaraGPM[]> {
        await supabaseClient.sinkronStatusGPMOtomatis();

        const [dataCloud, ringkasanCloud] = await Promise.all([
            supabaseClient.getAcaraGPM(),
            supabaseClient.getRingkasanPendaftarGPM()
        ]);

        if (!Array.isArray(dataCloud)) {
            throw new Error('Respon jadwal acara GPM dari basis data tidak valid.');
        }

        const petaRingkasan = new Map<string, { total_terdaftar: number; total_hadir: number; total_menunggu: number }>();
        (Array.isArray(ringkasanCloud) ? ringkasanCloud : []).forEach((r) => {
            if (r?.acara_id) {
                petaRingkasan.set(String(r.acara_id).toLowerCase(), {
                    total_terdaftar: Number(r.total_terdaftar) || 0,
                    total_hadir: Number(r.total_hadir) || 0,
                    total_menunggu: Number(r.total_menunggu) || 0
                });
            }
        });

        const sekarangMs = Date.now();
        const perluAutoCloseIds: string[] = [];

        const mapped: ItemAcaraGPM[] = dataCloud.map((item: any) => {
            const idStr = String(item.id);
            const ringkasan = petaRingkasan.get(idStr.toLowerCase()) || {
                total_terdaftar: 0,
                total_hadir: 0,
                total_menunggu: 0
            };

            const tanggalBersih = item.tanggal ? String(item.tanggal).split('T')[0] : '';
            const jamMulai = jadwalGPMMobileService.normalisasiJam(item.jam_mulai, '08:00');
            const jamSelesai = jadwalGPMMobileService.normalisasiJam(item.jam_selesai, '14:00');
            const waktuSelesaiMs = jadwalGPMMobileService.parseWaktuWITA(tanggalBersih, jamSelesai, '23:59');

            let statusFinal = item.status || 'Aktif';
            if (statusFinal.toLowerCase() === 'aktif' && waktuSelesaiMs > 0 && sekarangMs >= waktuSelesaiMs) {
                statusFinal = 'Selesai';
                perluAutoCloseIds.push(idStr);
            }

            const kuotaMaks = Math.max(0, Number(item.kuota_maksimal) || 0);
            const terisi = ringkasan.total_terdaftar;

            return {
                id: idStr,
                nama_acara: item.nama_acara || 'Acara GPM Manado',
                lokasi: item.lokasi || 'Kota Manado',
                kecamatan: item.kecamatan || 'Wenang',
                tanggal: tanggalBersih,
                jam_mulai: jamMulai,
                jam_selesai: jamSelesai,
                latitude: Number(item.latitude) || 1.4883,
                longitude: Number(item.longitude) || 124.8436,
                kuota_maksimal: kuotaMaks,
                antrean_terisi: terisi,
                total_hadir: ringkasan.total_hadir,
                total_menunggu: ringkasan.total_menunggu,
                sisa_kuota: Math.max(0, kuotaMaks - terisi),
                komoditas_tersedia: item.komoditas_tersedia || '',
                deskripsi: item.deskripsi || '',
                mode_pendaftaran: (item.mode_pendaftaran || 'online') as 'online' | 'keduanya' | 'langsung',
                mode_penerima: (item.mode_penerima || 'individu') as 'individu' | 'keluarga',
                status: statusFinal,
                dibuat_pada: item.dibuat_pada || null,
                diperbarui_pada: item.diperbarui_pada || null
            };
        });

        if (perluAutoCloseIds.length > 0) {
            Promise.allSettled(
                perluAutoCloseIds.map((id) => supabaseClient.updateAcaraGPM(id, { status: 'Selesai' }))
            ).catch(() => {});
        }

        this.cacheAcara = mapped;

        return mapped.filter((item) => {
            const cocokStatus = !status || status === 'Semua' || item.status.toLowerCase() === status.toLowerCase();
            const cocokKecamatan = !kecamatan || kecamatan === 'Semua' || item.kecamatan.toLowerCase() === kecamatan.toLowerCase();
            return cocokStatus && cocokKecamatan;
        });
    }

    parseDataPendaftar(item: any): ItemPendaftarGPM {
        if (!item) return item;
        let nama = item.nama_pendaftar || '';
        let nik = item.nik || '';
        let jalur: 'Daring' | 'Langsung' = item.jalur_pendaftaran || 'Daring';

        const nikMatch = nama.match(/\[NIK:?\s*(\d{16})\]/i);
        if (nikMatch) {
            nik = nikMatch[1];
            nama = nama.replace(nikMatch[0], '').trim();
        }

        const jalurMatch = nama.match(/\[(Daring|Langsung)\]/i);
        if (jalurMatch) {
            jalur = jalurMatch[1] as 'Daring' | 'Langsung';
            nama = nama.replace(jalurMatch[0], '').trim();
        }

        return {
            ...item,
            nama_pendaftar: nama || item.nama_pendaftar,
            nama_bersih: nama || item.nama_pendaftar,
            nik: nik || item.nik || '-',
            jalur_pendaftaran: jalur
        };
    }

    // 2. Masyarakat / Walk-In Ambil Antrean & Kode QR (Atomik RPC -> Anti-Tembus Kuota, Anti-Lewat Jam WITA, Anti-NIK/KK Ganda)
    async ambilNomorAntrean(
        acara_id: string,
        nama_lengkap: string,
        nomor_telepon: string,
        nik: string,
        jalur_pendaftaran: 'Daring' | 'Langsung' = 'Daring',
        langsung_hadir: boolean = false,
        opsiKeluarga: OpsiKeluargaGPM | null = null
    ): Promise<HasilTiketGPM> {
        const nikBersih = String(nik || '').replace(/[^0-9]/g, '').trim();
        if (nikBersih.length !== 16) {
            throw new Error(`NIK wajib terdiri dari tepat 16 digit angka! (Saat ini: ${nikBersih.length} digit)`);
        }

        const namaBersih = String(nama_lengkap || '').trim();
        if (namaBersih.length < 3) {
            throw new Error('Nama lengkap minimal 3 karakter!');
        }

        const telpBersih = String(nomor_telepon || '').trim() || '-';
        const prefixKode = jalur_pendaftaran === 'Langsung' ? 'GPM-DIR' : 'GPM-MOB';

        let acara = this.cacheAcara.find((a) => String(a.id) === String(acara_id));
        if (!acara) {
            const semua = await this.ambilSemuaAcara('Semua');
            acara = semua.find((a) => String(a.id) === String(acara_id));
        }
        if (!acara) {
            throw new Error('Jadwal acara GPM tidak ditemukan di basis data.');
        }

        if (jalur_pendaftaran !== 'Langsung' && String(acara.mode_pendaftaran || 'online').toLowerCase() === 'langsung') {
            throw new Error(`Kegiatan GPM "${acara.nama_acara}" hanya melayani pendaftaran langsung di lokasi acara (tanpa pendaftaran daring).`);
        }

        const noKkBersih = opsiKeluarga?.no_kk ? String(opsiKeluarga.no_kk).replace(/[^0-9]/g, '').trim() : '';
        const namaKepalaBersih = opsiKeluarga?.nama_kepala_keluarga ? String(opsiKeluarga.nama_kepala_keluarga).trim() : '';
        const jumlahAnggota = opsiKeluarga?.jumlah_anggota ? Math.max(1, parseInt(String(opsiKeluarga.jumlah_anggota), 10) || 1) : 1;

        if (String(acara.mode_penerima || 'individu').toLowerCase() === 'keluarga') {
            if (jalur_pendaftaran === 'Daring' && noKkBersih.length !== 16) {
                throw new Error(`Kegiatan ini berbasis Keluarga (1 KK = 1 Antrean). Nomor Kartu Keluarga (KK) wajib tepat 16 digit! (Saat ini: ${noKkBersih.length} digit)`);
            }
            if (noKkBersih && noKkBersih.length !== 16) {
                throw new Error(`Nomor Kartu Keluarga (KK) harus tepat 16 digit angka! (Saat ini: ${noKkBersih.length} digit)`);
            }
        }

        const statusOp = jadwalGPMMobileService.hitungStatusOperasional(acara);
        if (statusOp.sudahBerakhir) {
            throw new Error(`Pendaftaran ditutup: Kegiatan GPM "${acara.nama_acara}" telah berakhir sesuai jadwal (${acara.jam_selesai} WITA).`);
        }
        if (statusOp.kuotaPenuh) {
            throw new Error(`Kuota antrean telah habis (${statusOp.terisi} / ${statusOp.kuotaMaks} kuota terisi). Silakan pilih lokasi GPM lain.`);
        }

        try {
            const tiketRow = await supabaseClient.daftarAntreanGPMViaRPC({
                acara_id: acara.id,
                nama_pendaftar: namaBersih,
                nomor_telepon: telpBersih,
                nik: nikBersih,
                jalur_pendaftaran,
                prefix_kode: prefixKode,
                langsung_hadir: Boolean(langsung_hadir),
                no_kk: noKkBersih || null,
                nama_kepala_keluarga: namaKepalaBersih || (noKkBersih ? namaBersih : null),
                jumlah_anggota: jumlahAnggota
            });

            return {
                tiket: this.parseDataPendaftar(tiketRow),
                acara: {
                    nama_acara: acara.nama_acara,
                    lokasi: acara.lokasi,
                    kecamatan: acara.kecamatan,
                    tanggal: acara.tanggal,
                    jam: `${acara.jam_mulai} - ${acara.jam_selesai} WITA`,
                    mode_penerima: acara.mode_penerima || 'individu'
                }
            };
        } catch (errRpc: any) {
            if (!this.adalahErrorRpcBelumAda(errRpc)) {
                throw new Error(String(errRpc?.message || 'Gagal mendaftar antrean GPM.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        // Fallback jika RPC belum dimigrasi
        const [semuaSegar, sudahAdaNIK, nomorTerakhir] = await Promise.all([
            this.ambilSemuaAcara('Semua'),
            supabaseClient.cekNikTerdaftar(acara.id, nikBersih),
            supabaseClient.getNomorAntreanTerakhir(acara.id)
        ]);
        const acaraSegar = semuaSegar.find((a) => String(a.id) === String(acara!.id));
        if (!acaraSegar) throw new Error('Jadwal acara GPM tidak ditemukan.');

        const stSegar = jadwalGPMMobileService.hitungStatusOperasional(acaraSegar);
        if (stSegar.sudahBerakhir) {
            throw new Error(`Pendaftaran ditutup: Kegiatan GPM "${acaraSegar.nama_acara}" telah berakhir.`);
        }
        if (stSegar.kuotaPenuh) {
            throw new Error(`Kuota antrean telah habis (${stSegar.terisi} / ${stSegar.kuotaMaks} kuota terisi).`);
        }
        if (sudahAdaNIK) {
            throw new Error(`Pendaftaran ditolak: NIK (${nikBersih}) sudah terdaftar pada kegiatan GPM ini! Satu NIK hanya berlaku untuk 1 nomor antrean.`);
        }

        const nomorBaru = nomorTerakhir + 1;
        const kodeBarcode = `${prefixKode}-${String(nomorBaru).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const payloadDaftar: any = {
            acara_id: acaraSegar.id,
            nama_pendaftar: namaBersih,
            nik: nikBersih,
            jalur_pendaftaran,
            nomor_telepon: telpBersih,
            nomor_antrean: nomorBaru,
            kode_barcode: kodeBarcode,
            status_kehadiran: langsung_hadir ? 'Hadir' : 'Menunggu'
        };
        if (noKkBersih) {
            payloadDaftar.no_kk = noKkBersih;
            payloadDaftar.nama_kepala_keluarga = namaKepalaBersih || namaBersih;
            payloadDaftar.jumlah_anggota = jumlahAnggota;
        }
        let dataMasuk: any;
        try {
            dataMasuk = await supabaseClient.daftarAntreanGPM(payloadDaftar);
        } catch (errKolom: any) {
            const msg = String(errKolom?.message || '').toLowerCase();
            if (noKkBersih && (msg.includes('column') || msg.includes('schema cache'))) {
                delete payloadDaftar.no_kk;
                delete payloadDaftar.nama_kepala_keluarga;
                delete payloadDaftar.jumlah_anggota;
                dataMasuk = await supabaseClient.daftarAntreanGPM(payloadDaftar);
            } else {
                throw errKolom;
            }
        }

        return {
            tiket: this.parseDataPendaftar(dataMasuk),
            acara: {
                nama_acara: acaraSegar.nama_acara,
                lokasi: acaraSegar.lokasi,
                kecamatan: acaraSegar.kecamatan,
                tanggal: acaraSegar.tanggal,
                jam: `${acaraSegar.jam_mulai} - ${acaraSegar.jam_selesai} WITA`,
                mode_penerima: acaraSegar.mode_penerima || 'individu'
            }
        };
    }

    // 3. Pendaftaran Manual di Lokasi oleh Petugas (Walk-In — TETAP TUNDUK PADA KUOTA & WAKTU WITA)
    async tambahPendaftarManual(
        acara_id: string,
        nama_lengkap: string,
        nomor_telepon: string,
        nik: string,
        langsungHadir: boolean = true,
        opsiKeluarga: OpsiKeluargaGPM | null = null
    ): Promise<HasilTiketGPM> {
        return this.ambilNomorAntrean(acara_id, nama_lengkap, nomor_telepon, nik, 'Langsung', Boolean(langsungHadir), opsiKeluarga);
    }

    // 4. Petugas Scan Barcode / QR Code (Sertakan status acara untuk kunci tiket lewat jam)
    async scanBarcode(kodeBarcode: string): Promise<ItemPendaftarGPM> {
        const kode = String(kodeBarcode || '').trim().toUpperCase();
        if (!kode) throw new Error('Kode tiket QR tidak boleh kosong!');

        const pendaftarCloud = await supabaseClient.cariPendaftarByBarcode(kode);
        if (!pendaftarCloud) {
            throw new Error(`Tiket dengan kode QR "${kodeBarcode}" tidak ditemukan di basis data.`);
        }

        if (this.cacheAcara.length === 0) {
            await this.ambilSemuaAcara('Semua').catch(() => []);
        }
        const acara = this.cacheAcara.find((a) => String(a.id) === String(pendaftarCloud.acara_id)) || null;
        const statusOp = acara ? jadwalGPMMobileService.hitungStatusOperasional(acara) : null;

        return {
            ...pendaftarCloud,
            acara: acara
                ? {
                    id: acara.id,
                    nama_acara: acara.nama_acara,
                    lokasi: acara.lokasi,
                    tanggal: acara.tanggal,
                    jam_mulai: acara.jam_mulai,
                    jam_selesai: acara.jam_selesai,
                    status: statusOp?.sudahBerakhir ? 'Selesai' : acara.status,
                    terkunci_waktu: Boolean(statusOp?.sudahBerakhir)
                }
                : null
        };
    }

    // 5. Petugas Verifikasi / Batalkan Kehadiran (TERKUNCI OTOMATIS JIKA ACARA LEWAT JAM / SELESAI)
    async verifikasiKehadiran(kodeBarcode: string, statusBaru: 'Hadir' | 'Menunggu' = 'Hadir', petugasId: string | null = null): Promise<ItemPendaftarGPM> {
        const kode = String(kodeBarcode || '').trim().toUpperCase();
        if (!kode) throw new Error('Kode tiket QR tidak boleh kosong!');
        const statusFinal: 'Hadir' | 'Menunggu' = String(statusBaru).toLowerCase() === 'menunggu' ? 'Menunggu' : 'Hadir';

        try {
            const resRpc = await supabaseClient.verifikasiPendaftarGPMViaRPC(kode, statusFinal, petugasId);
            return Array.isArray(resRpc) ? resRpc[0] : resRpc;
        } catch (errRpc: any) {
            if (!this.adalahErrorRpcBelumAda(errRpc)) {
                throw new Error(String(errRpc?.message || 'Gagal memverifikasi tiket QR.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        const tiket = await this.scanBarcode(kode);
        if (tiket?.acara?.terkunci_waktu || String(tiket?.acara?.status || '').toLowerCase() === 'selesai') {
            throw new Error(`Verifikasi QR dikunci: Jadwal kegiatan GPM "${tiket.acara?.nama_acara || 'GPM'}" telah berakhir.`);
        }

        const payload: any = {
            status_kehadiran: statusFinal,
            waktu_kehadiran: statusFinal === 'Hadir' ? new Date().toISOString() : null
        };
        if (petugasId && statusFinal === 'Hadir') {
            payload.petugas_verifikasi = petugasId;
        }
        const res = await supabaseClient.request<any[]>(`pendaftar_gpm?kode_barcode=eq.${encodeURIComponent(kode)}`, 'PATCH', payload);
        return Array.isArray(res) && res.length > 0 ? res[0] : (res as any);
    }

    // 5B. Petugas Konfirmasi Pengambilan Bahan Pangan oleh Warga (Setelah Diverifikasi Hadir)
    async konfirmasiPengambilanPangan(pendaftarId: string, petugasId: string | null = null): Promise<any> {
        if (!pendaftarId) throw new Error('ID pendaftar tidak valid.');
        return supabaseClient.konfirmasiPengambilanPanganGPM(pendaftarId, petugasId);
    }

    // 6. Mengambil Daftar Pendaftar untuk Petugas (Data Riil DB)
    async ambilPendaftarAcara(acara_id?: string) {
        const dataCloud = await supabaseClient.getPendaftarGPM(acara_id);
        const list = Array.isArray(dataCloud) ? dataCloud : [];
        const hadir = list.filter((p) => String(p.status_kehadiran || '').toLowerCase() === 'hadir').length;
        this.cachePendaftar = list;
        return {
            sukses: true,
            total: list.length,
            statistik: {
                total_antrean: list.length,
                total_hadir: hadir,
                total_menunggu: list.length - hadir
            },
            data: list
        };
    }

    // 7. Petugas Tambah Acara GPM Baru (FIX BUG FATAL: LANGSUNG SIMPAN KE SUPABASE!)
    async tambahAcara(dataAcara: Partial<ItemAcaraGPM>): Promise<ItemAcaraGPM> {
        const tervalidasi = jadwalGPMMobileService.validasiFormAcaraBaru(dataAcara);
        const itemMasuk = await supabaseClient.tambahAcaraGPM({
            ...tervalidasi,
            status: 'Aktif'
        });
        return itemMasuk;
    }

    // 8. Kepala Bidang / Superadmin Mengubah / Menambah Kuota Acara GPM Aktif
    async ubahKuotaAcara(acaraId: string, kuotaBaru: number): Promise<any> {
        const angka = parseInt(String(kuotaBaru || 0), 10);
        if (!Number.isFinite(angka) || angka < 1) {
            throw new Error('Kuota maksimal harus berupa angka minimal 1.');
        }

        try {
            const resRpc = await supabaseClient.ubahKuotaAcaraGPMViaRPC(acaraId, angka);
            return Array.isArray(resRpc) ? resRpc[0] : resRpc;
        } catch (errRpc: any) {
            if (!this.adalahErrorRpcBelumAda(errRpc)) {
                throw new Error(String(errRpc?.message || 'Gagal mengubah kuota acara GPM.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        const semua = await this.ambilSemuaAcara('Semua');
        const acara = semua.find((a) => String(a.id) === String(acaraId));
        if (!acara) throw new Error('Acara GPM tidak ditemukan.');
        const st = jadwalGPMMobileService.hitungStatusOperasional(acara);
        if (st.sudahBerakhir) {
            throw new Error('Kuota tidak dapat diubah karena kegiatan GPM sudah berakhir/selesai.');
        }
        if (angka < st.terisi) {
            throw new Error(`Kuota baru (${angka}) tidak boleh lebih kecil dari jumlah warga yang sudah terdaftar (${st.terisi}).`);
        }

        return supabaseClient.updateAcaraGPM(acaraId, {
            kuota_maksimal: angka,
            diperbarui_pada: new Date().toISOString()
        });
    }

    // 9. Selesaikan Lebih Awal & Kunci Kegiatan GPM (Khusus Kepala Bidang / Superadmin)
    async selesaikanAcara(id: string): Promise<boolean> {
        await supabaseClient.updateAcaraGPM(id, {
            status: 'Selesai',
            diperbarui_pada: new Date().toISOString()
        });
        return true;
    }

    // 10. Hapus Acara GPM & Seluruh Riwayat Antrean (Khusus Kepala Bidang / Superadmin)
    async hapusAcara(id: string): Promise<boolean> {
        await supabaseClient.hapusAcaraGPM(id);
        return true;
    }

    // 11. Mengambil Riwayat Acara yang Sudah Selesai (Terurut Terbaru)
    async ambilRiwayatAcara(): Promise<ItemAcaraGPM[]> {
        const semua = await this.ambilSemuaAcara('Semua');
        return jadwalGPMMobileService.urutkanRiwayatSelesai(semua);
    }

    // 12A. Ekspor Rekapitulasi Pendaftar Acara GPM ke File Excel Resmi (.xlsx) — Anti-Scientific-Notation NIK/KK
    eksporKeExcel(
        acara: ItemAcaraGPM | any,
        daftarPendaftar: ItemPendaftarGPM[] | any[],
        penandatangan: { nama?: string; nip?: string } = {}
    ): boolean {
        if (!acara) return false;
        const pendaftar = (Array.isArray(daftarPendaftar) ? daftarPendaftar : []).map((p) => this.parseDataPendaftar(p));
        const totalPendaftar = pendaftar.length;
        const totalHadir = pendaftar.filter((p) => String(p.status_kehadiran || '').toLowerCase() === 'hadir').length;
        const totalMenunggu = totalPendaftar - totalHadir;
        const totalSudahAmbil = pendaftar.filter((p) => String(p.status_pengambilan || '').toLowerCase() === 'sudah diambil').length;
        const kuotaMaks = Number(acara.kuota_maksimal || acara.target_kuota || 0) || 0;
        const serapan = kuotaMaks > 0 ? `${((totalHadir / kuotaMaks) * 100).toFixed(1)}%` : '0.0%';

        const skrg = new Date();
        const waktuUnduh = `${skrg.toLocaleString('id-ID', {
            timeZone: 'Asia/Makassar',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })} WITA`;
        const tanggalTtd = skrg.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Makassar',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const namaPejabat = String(penandatangan?.nama || '').trim();
        const nipPejabat = String(penandatangan?.nip || '').trim();
        const barisNama = namaPejabat ? `( ${namaPejabat} )` : '( ........................................ )';
        const barisNip = nipPejabat ? `NIP. ${nipPejabat}` : 'NIP. ........................................';
        const modePenerimaLabel = String(acara.mode_penerima || 'individu').toLowerCase() === 'keluarga'
            ? 'Berbasis Keluarga (1 KK = 1 Antrean)'
            : 'Berbasis Individu (1 NIK = 1 Antrean)';

        const baris: BarisExcelResmi[] = [
            { tinggi: 24, sel: [{ v: 'PEMERINTAH KOTA MANADO', s: 1 }] },
            { tinggi: 20, sel: [{ v: 'DINAS PANGAN KOTA MANADO', s: 2 }] },
            { tinggi: 19, sel: [{ v: 'BIDANG CADANGAN DAN DISTRIBUSI PANGAN', s: 2 }] },
            { tinggi: 17, sel: [{ v: 'Jl. Balai Kota No. 1, Tikala, Kota Manado, Sulawesi Utara — Portal Resmi SIPATOKAAN', s: 3 }] },
            { tinggi: 8, sel: [] },
            { tinggi: 22, sel: [{ v: 'REKAPITULASI DAFTAR HADIR & ANTREAN GERAKAN PANGAN MURAH (GPM)', s: 4 }] },
            {
                tinggi: 20,
                sel: [
                    { v: 'Nama Kegiatan GPM', s: 5 }, null,
                    { v: acara.nama_acara || '-', s: 6 }, null, null, null,
                    { v: 'Jadwal & Jam (WITA)', s: 5 }, null,
                    { v: `${String(acara.tanggal || '-').split('T')[0]} (${acara.jam_mulai || '08:00'} - ${acara.jam_selesai || '14:00'} WITA)`, s: 6 }, null, null, null
                ]
            },
            {
                tinggi: 20,
                sel: [
                    { v: 'Lokasi & Kecamatan', s: 5 }, null,
                    { v: `${acara.lokasi || '-'} (Kec. ${acara.kecamatan || '-'})`, s: 6 }, null, null, null,
                    { v: 'Status & Mode Penerima', s: 5 }, null,
                    { v: `${acara.status || 'Aktif'} • ${modePenerimaLabel}`, s: 6 }, null, null, null
                ]
            },
            {
                tinggi: 20,
                sel: [
                    { v: 'Komoditas Tersedia', s: 5 }, null,
                    { v: acara.komoditas_tersedia || '-', s: 6 }, null, null, null,
                    { v: 'Ringkasan Kehadiran', s: 5 }, null,
                    { v: `Kuota ${kuotaMaks} • Daftar ${totalPendaftar} • Hadir ${totalHadir} (${serapan}) • Ambil Pangan ${totalSudahAmbil}`, s: 6 }, null, null, null
                ]
            },
            {
                tinggi: 19,
                sel: [
                    { v: 'Waktu Unduh Rekap', s: 5 }, null,
                    { v: waktuUnduh, s: 6 }, null, null, null,
                    { v: 'Belum Hadir / Menunggu', s: 5 }, null,
                    { v: `${totalMenunggu} Warga`, s: 6 }, null, null, null
                ]
            },
            { tinggi: 10, sel: [] },
            {
                tinggi: 28,
                sel: [
                    { v: 'No', s: 7 },
                    { v: 'No. Antrean', s: 7 },
                    { v: 'Nama Lengkap', s: 7 },
                    { v: 'NIK (16 Digit)', s: 7 },
                    { v: 'No. KK (16 Digit)', s: 7 },
                    { v: 'Jalur', s: 7 },
                    { v: 'No. Telepon / WA', s: 7 },
                    { v: 'Kode Tiket QR', s: 7 },
                    { v: 'Status Kehadiran', s: 7 },
                    { v: 'Pengambilan Pangan', s: 7 },
                    { v: 'Waktu Daftar', s: 7 },
                    { v: 'Waktu Hadir', s: 7 }
                ]
            }
        ];

        const merges = [
            'A1:L1', 'A2:L2', 'A3:L3', 'A4:L4', 'A6:L6',
            'A7:B7', 'C7:F7', 'G7:H7', 'I7:L7',
            'A8:B8', 'C8:F8', 'G8:H8', 'I8:L8',
            'A9:B9', 'C9:F9', 'G9:H9', 'I9:L9',
            'A10:B10', 'C10:F10', 'G10:H10', 'I10:L10'
        ];

        if (pendaftar.length === 0) {
            const emptyRow = baris.length + 1;
            baris.push({
                tinggi: 24,
                sel: [{ v: 'Belum ada warga yang terdaftar pada kegiatan GPM ini.', s: 9 }]
            });
            merges.push(`A${emptyRow}:L${emptyRow}`);
        } else {
            pendaftar.forEach((p, idx) => {
                const zebra = idx % 2 === 1;
                const sTeks = zebra ? 12 : 8;
                const sTengah = zebra ? 13 : 9;
                const isHadir = String(p.status_kehadiran || '').toLowerCase() === 'hadir';
                const isDiambil = String(p.status_pengambilan || '').toLowerCase() === 'sudah diambil';
                const rawTelp = String(p.nomor_telepon || '').trim() || '-';
                const waktuDaftar = p.waktu_mendaftar
                    ? new Date(p.waktu_mendaftar).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })
                    : '-';
                const waktuHadir = p.waktu_kehadiran
                    ? new Date(p.waktu_kehadiran).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })
                    : (isHadir ? 'Hadir di Lokasi' : '-');

                baris.push({
                    tinggi: 21,
                    sel: [
                        { v: idx + 1, t: 'n', s: sTengah },
                        { v: `#${String(p.nomor_antrean || idx + 1).padStart(3, '0')}`, t: 's', s: sTengah },
                        { v: p.nama_bersih || p.nama_pendaftar || '-', t: 's', s: sTeks },
                        { v: p.nik && p.nik !== '-' ? String(p.nik) : '-', t: 's', s: sTengah },
                        { v: p.no_kk ? String(p.no_kk) : '-', t: 's', s: sTengah },
                        { v: p.jalur_pendaftaran || 'Daring', t: 's', s: sTengah },
                        { v: rawTelp, t: 's', s: sTengah },
                        { v: p.kode_barcode || '-', t: 's', s: sTengah },
                        { v: p.status_kehadiran || 'Menunggu', t: 's', s: isHadir ? 21 : 22 },
                        { v: p.status_pengambilan || 'Belum Diambil', t: 's', s: isDiambil ? 21 : sTengah },
                        { v: waktuDaftar, t: 's', s: sTengah },
                        { v: waktuHadir, t: 's', s: sTengah }
                    ]
                });
            });
        }

        const rowTotal = baris.length + 1;
        baris.push({
            tinggi: 24,
            sel: [
                { v: `RINGKASAN: ${totalPendaftar} TERDAFTAR  |  ${totalHadir} HADIR (${serapan})  |  ${totalSudahAmbil} SUDAH AMBIL PANGAN  |  ${totalMenunggu} MENUNGGU`, s: 16 }
            ]
        });
        merges.push(`A${rowTotal}:L${rowTotal}`);

        const ttdStart = baris.length + 2;
        baris.push(
            { tinggi: 14, sel: [] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, null, { v: `Manado, ${tanggalTtd}`, s: 18 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, null, { v: 'Mengetahui dan Mengesahkan,', s: 18 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, null, { v: 'Kepala Bidang Cadangan dan Distribusi Pangan', s: 19 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, null, { v: 'Dinas Pangan Kota Manado', s: 18 }] },
            { tinggi: 18, sel: [] },
            { tinggi: 18, sel: [] },
            { tinggi: 18, sel: [] },
            { tinggi: 20, sel: [null, null, null, null, null, null, null, null, { v: barisNama, s: 19 }] },
            { tinggi: 19, sel: [null, null, null, null, null, null, null, null, { v: barisNip, s: 18 }] }
        );

        merges.push(
            `I${ttdStart}:L${ttdStart}`,
            `I${ttdStart + 1}:L${ttdStart + 1}`,
            `I${ttdStart + 2}:L${ttdStart + 2}`,
            `I${ttdStart + 3}:L${ttdStart + 3}`,
            `I${ttdStart + 7}:L${ttdStart + 7}`,
            `I${ttdStart + 8}:L${ttdStart + 8}`
        );

        const namaFileBersih = (acara.nama_acara || 'GPM').replace(/[^a-zA-Z0-9_-]/g, '_');
        const tglBersih = String(acara.tanggal || 'arsip').split('T')[0];

        return excelResmiMobileService.unduhWorkbookXlsx(
            `Rekap_GPM_${namaFileBersih}_${tglBersih}.xlsx`,
            [
                {
                    namaSheet: 'Daftar Hadir GPM',
                    lebarKolom: [6, 13, 25, 20, 20, 12, 17, 22, 16, 18, 20, 20],
                    merges,
                    baris
                }
            ]
        );
    }

    // 12B. Ekspor Rekapitulasi Data Pendaftar Acara ke File CSV (Cadangan — Delimiter Titik Koma Excel ID)
    eksporKeCSV(acara: ItemAcaraGPM, daftarPendaftar: ItemPendaftarGPM[] | any[]): boolean {
        if (!acara) return false;
        const pendaftar = Array.isArray(daftarPendaftar) ? daftarPendaftar : [];
        const totalPendaftar = pendaftar.length;
        const totalHadir = pendaftar.filter((p) => p.status_kehadiran === 'Hadir').length;
        const totalMenunggu = totalPendaftar - totalHadir;

        let csv = '\uFEFFsep=;\n';
        csv += 'LAPORAN REKAPITULASI RESMI GERAKAN PANGAN MURAH (GPM)\n';
        csv += 'DINAS PANGAN PEMERINTAH KOTA MANADO\n\n';

        csv += 'RINGKASAN KEGIATAN\n';
        csv += `Nama Kegiatan;"${(acara.nama_acara || '').replace(/"/g, '""')}"\n`;
        csv += `Lokasi Pelaksanaan;"${(acara.lokasi || '').replace(/"/g, '""')} (Kec. ${(acara.kecamatan || '').replace(/"/g, '""')})"\n`;
        csv += `Jadwal Pelaksanaan;"${acara.tanggal || '-'} (${acara.jam_mulai || '08:00'} - ${acara.jam_selesai || '13:00'} WITA)"\n`;
        csv += `Komoditas Disediakan;"${(acara.komoditas_tersedia || '').replace(/"/g, '""')}"\n`;
        csv += `Status Kegiatan;"${acara.status || 'Selesai'}"\n\n`;

        csv += 'DATA KUOTA & KEHADIRAN WARGA\n';
        csv += `Total Kuota Maksimal;${acara.kuota_maksimal || 0}\n`;
        csv += `Total Warga Mendaftar;${totalPendaftar}\n`;
        csv += `Total Warga Hadir (Terverifikasi);${totalHadir}\n`;
        csv += `Total Belum Hadir / Menunggu;${totalMenunggu}\n`;
        csv += `Waktu Unduh Rekapitulasi;"${new Date().toLocaleString('id-ID')}"\n\n`;

        csv += 'DATA DETAIL PENDAFTAR & ANTREAN\n';
        csv += 'No Urut;Nomor Antrean;Nama Lengkap;NIK (16 Digit);No. KK (16 Digit);Jalur Pendaftaran;Nomor Telepon / WhatsApp;Kode Tiket QR;Status Kehadiran;Pengambilan Pangan;Waktu Pendaftaran;Waktu Hadir\n';

        pendaftar.forEach((p, index) => {
            const parsed = this.parseDataPendaftar(p);
            const noUrut = index + 1;
            const noAntrean = `="#${String(parsed.nomor_antrean || index + 1).padStart(3, '0')}"`;
            const nama = `"${(parsed.nama_bersih || '').replace(/"/g, '""')}"`;
            const nik = parsed.nik && parsed.nik !== '-' ? `="${parsed.nik}"` : '"-"';
            const kk = parsed.no_kk ? `="${parsed.no_kk}"` : '"-"';
            const jalur = `"${parsed.jalur_pendaftaran || 'Daring'}"`;
            const rawTelp = String(parsed.nomor_telepon || '').replace(/[^0-9]/g, '');
            const telp = rawTelp ? `="${rawTelp}"` : '"-"';
            const kode = `"${(parsed.kode_barcode || '').replace(/"/g, '""')}"`;
            const status = `"${parsed.status_kehadiran || 'Menunggu'}"`;
            const pengambilan = `"${parsed.status_pengambilan || 'Belum Diambil'}"`;
            const waktuDaftar = `"${parsed.waktu_mendaftar ? new Date(parsed.waktu_mendaftar).toLocaleString('id-ID') : '-'}"`;
            const waktuHadir = `"${parsed.waktu_kehadiran ? new Date(parsed.waktu_kehadiran).toLocaleString('id-ID') : (parsed.status_kehadiran === 'Hadir' ? 'Hadir di Lokasi' : '-')}"`;
            csv += `${noUrut};${noAntrean};${nama};${nik};${kk};${jalur};${telp};${kode};${status};${pengambilan};${waktuDaftar};${waktuHadir}\n`;
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
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    }

    // 13. Statistik Global GPM Murni dari Basis Data (Tanpa Fallback Dummy)
    async ambilStatistik(): Promise<StatistikGPM> {
        const semuaAcara = await this.ambilSemuaAcara('Semua');
        const totalAntrean = semuaAcara.reduce((acc, a) => acc + (Number(a.antrean_terisi) || 0), 0);
        const totalHadir = semuaAcara.reduce((acc, a) => acc + (Number(a.total_hadir) || 0), 0);
        const gpmAktif = semuaAcara.filter((a) => !jadwalGPMMobileService.hitungStatusOperasional(a).sudahBerakhir).length;
        const gpmSelesai = semuaAcara.length - gpmAktif;

        return {
            total_gpm: semuaAcara.length,
            gpm_aktif: gpmAktif,
            gpm_selesai: gpmSelesai,
            total_antrean: totalAntrean,
            total_hadir: totalHadir,
            total_menunggu: Math.max(0, totalAntrean - totalHadir)
        };
    }
}

export const gpmMobileService = new GPMMobileApiService();
