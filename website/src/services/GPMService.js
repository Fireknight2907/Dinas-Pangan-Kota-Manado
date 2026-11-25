// ===================================================================================
// Modul Layanan Gerakan Pangan Murah (GPM) dan Antrean QR Code (OOP - Website)
// Fungsi: Mengelola sinkronisasi jadwal acara GPM 100% dari basis data Supabase
//         (tanpa data dummy), auto-close otomatis berbasis waktu WITA, pendaftaran
//         antrean atomik anti-tembus kuota & anti-NIK ganda, ubah kuota oleh Kabid,
//         serta verifikasi/pembatalan kehadiran QR yang terkunci saat acara selesai.
// ===================================================================================

import { supabaseClient } from './SupabaseClient.js';
import { jadwalGPMService } from './JadwalGPMService.js';

class GPMApiService {
    constructor() {
        this.apiRoot = import.meta.env.VITE_API_ROOT || 'http://localhost:3000/api';
        this.baseUrl = `${this.apiRoot}/gpm`;
        this.cacheAcara = [];
        this.cachePendaftar = [];
    }

    ambilHeaderAuth() {
        const token = sessionStorage.getItem('sipatokaan_token') || localStorage.getItem('sipatokaan_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    }

    adalahErrorRpcBelumAda(err) {
        const msg = String(err?.message || '').toLowerCase();
        return (
            msg.includes('could not find the function') ||
            msg.includes('pgrst202') ||
            msg.includes('status 404') ||
            msg.includes('does not exist')
        );
    }

    // 1. Mengambil seluruh acara GPM RIIL dari Supabase (0% data dummy) + Auto-Close WITA + Hitung Kuota Akurat
    async ambilSemuaAcara(status = '', kecamatan = '') {
        // Sinkronisasi auto-close di server (waktu WITA) sebelum menarik data
        await supabaseClient.sinkronStatusGPMOtomatis();

        const [dataCloud, ringkasanCloud] = await Promise.all([
            supabaseClient.getAcaraGPM(),
            supabaseClient.getRingkasanPendaftarGPM()
        ]);

        if (!Array.isArray(dataCloud)) {
            throw new Error('Respon daftar acara GPM dari basis data tidak valid.');
        }

        const petaRingkasan = new Map();
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
        const perluAutoCloseIds = [];

        const mapped = dataCloud.map((item) => {
            const idStr = String(item.id);
            const ringkasan = petaRingkasan.get(idStr.toLowerCase()) || {
                total_terdaftar: 0,
                total_hadir: 0,
                total_menunggu: 0
            };

            const tanggalBersih = item.tanggal ? String(item.tanggal).split('T')[0] : '';
            const jamMulai = jadwalGPMService.normalisasiJam(item.jam_mulai, '08:00');
            const jamSelesai = jadwalGPMService.normalisasiJam(item.jam_selesai, '14:00');
            const waktuSelesaiMs = jadwalGPMService.parseWaktuWITA(tanggalBersih, jamSelesai, '23:59');

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
                status: statusFinal,
                dibuat_pada: item.dibuat_pada || null,
                diperbarui_pada: item.diperbarui_pada || null
            };
        });

        // Jika RPC belum dimigrasi dan masih ada acara lewat jam berstatus Aktif, tutup otomatis di DB
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

    // 2. Normalisasi dan penguraian data pendaftar (Nama, NIK, Jalur Daring/Langsung)
    parseDataPendaftar(item) {
        if (!item) return item;
        let nama = item.nama_pendaftar || '';
        let nik = item.nik || '';
        let jalur = item.jalur_pendaftaran || 'Daring';

        const nikMatch = nama.match(/\[NIK:?\s*(\d{16})\]/i);
        if (nikMatch) {
            nik = nikMatch[1];
            nama = nama.replace(nikMatch[0], '').trim();
        }

        const jalurMatch = nama.match(/\[(Daring|Langsung)\]/i);
        if (jalurMatch) {
            jalur = jalurMatch[1];
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

    // 3. Pendaftaran Antrean Warga / Walk-In (Atomik RPC -> Anti-Tembus Kuota, Anti-Lewat Jam WITA, Anti-NIK Ganda)
    async ambilNomorAntrean(acara_id, nama_lengkap, nomor_telepon, nik, jalur_pendaftaran = 'Daring', langsung_hadir = false) {
        const nikBersih = String(nik || '').replace(/[^0-9]/g, '').trim();
        if (nikBersih.length !== 16) {
            throw new Error(`NIK wajib terdiri dari tepat 16 digit angka! (Saat ini: ${nikBersih.length} digit)`);
        }

        const namaBersih = String(nama_lengkap || '').trim();
        if (namaBersih.length < 3) {
            throw new Error('Nama lengkap minimal 3 karakter!');
        }

        const telpBersih = String(nomor_telepon || '').trim() || '-';
        const prefixKode = jalur_pendaftaran === 'Langsung' ? 'GPM-OFF' : 'GPM-MND';

        // Cari metadata acara untuk info tiket
        let acara = this.cacheAcara.find((a) => String(a.id) === String(acara_id));
        if (!acara) {
            const semua = await this.ambilSemuaAcara('Semua');
            acara = semua.find((a) => String(a.id) === String(acara_id));
        }
        if (!acara) {
            throw new Error('Jadwal acara GPM tidak ditemukan di basis data.');
        }

        // Lapis Validasi Awal (Cepat)
        const statusOp = jadwalGPMService.hitungStatusOperasional(acara);
        if (statusOp.sudahBerakhir) {
            throw new Error(`Pendaftaran ditutup: Kegiatan GPM "${acara.nama_acara}" telah berakhir sesuai jadwal (${acara.jam_selesai} WITA).`);
        }
        if (statusOp.kuotaPenuh) {
            throw new Error(`Kuota antrean telah habis (${statusOp.terisi} / ${statusOp.kuotaMaks} kuota terisi). Silakan pilih lokasi GPM lain.`);
        }

        // Jalur Utama: PostgreSQL Atomic RPC (FOR UPDATE row lock di server)
        try {
            const tiketRow = await supabaseClient.daftarAntreanGPMViaRPC({
                acara_id: acara.id,
                nama_pendaftar: namaBersih,
                nomor_telepon: telpBersih,
                nik: nikBersih,
                jalur_pendaftaran: jalur_pendaftaran || 'Daring',
                prefix_kode: prefixKode,
                langsung_hadir: Boolean(langsung_hadir)
            });

            const tiketParsed = this.parseDataPendaftar(tiketRow);
            return {
                tiket: tiketParsed,
                acara: {
                    nama_acara: acara.nama_acara,
                    lokasi: acara.lokasi,
                    kecamatan: acara.kecamatan,
                    tanggal: acara.tanggal,
                    jam: `${acara.jam_mulai} - ${acara.jam_selesai} WITA`
                }
            };
        } catch (errRpc) {
            // Jika error berasal dari aturan bisnis server (kuota habis, lewat jam, NIK ganda), langsung lempar ke UI!
            if (!this.adalahErrorRpcBelumAda(errRpc)) {
                throw new Error(String(errRpc?.message || 'Gagal mendaftar antrean GPM.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        // Fallback Aman (Hanya jika migrasi SQL RPC belum dijalankan): cek ulang langsung ke tabel DB
        const [semuaSegar, sudahAdaNIK, nomorTerakhir] = await Promise.all([
            this.ambilSemuaAcara('Semua'),
            supabaseClient.cekNikTerdaftar(acara.id, nikBersih),
            supabaseClient.getNomorAntreanTerakhir(acara.id)
        ]);
        const acaraSegar = semuaSegar.find((a) => String(a.id) === String(acara.id));
        if (!acaraSegar) throw new Error('Jadwal acara GPM tidak ditemukan.');

        const stSegar = jadwalGPMService.hitungStatusOperasional(acaraSegar);
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
        const dataMasuk = await supabaseClient.daftarAntreanGPM({
            acara_id: acaraSegar.id,
            nama_pendaftar: namaBersih,
            nik: nikBersih,
            jalur_pendaftaran: jalur_pendaftaran || 'Daring',
            nomor_telepon: telpBersih,
            nomor_antrean: nomorBaru,
            kode_barcode: kodeBarcode,
            status_kehadiran: langsung_hadir ? 'Hadir' : 'Menunggu'
        });

        return {
            tiket: this.parseDataPendaftar(dataMasuk),
            acara: {
                nama_acara: acaraSegar.nama_acara,
                lokasi: acaraSegar.lokasi,
                kecamatan: acaraSegar.kecamatan,
                tanggal: acaraSegar.tanggal,
                jam: `${acaraSegar.jam_mulai} - ${acaraSegar.jam_selesai} WITA`
            }
        };
    }

    // 4. Pendaftaran Manual di Lokasi Acara oleh Petugas (Walk-In — TETAP TUNDUK PADA KUOTA & WAKTU WITA)
    async tambahPendaftarManual(acara_id, nama_lengkap, nomor_telepon, nik, langsungHadir = true) {
        return this.ambilNomorAntrean(acara_id, nama_lengkap, nomor_telepon, nik, 'Langsung', Boolean(langsungHadir));
    }

    // 5. Petugas Mengambil Daftar Pendaftar untuk Suatu Acara (Data Riil DB)
    async ambilPendaftarAcara(acara_id = null) {
        const dataCloud = await supabaseClient.getPendaftarGPM(acara_id || null);
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

    // 6. Petugas Scan Barcode / QR Code (Sertakan status acara agar petugas tahu jika acara sudah berakhir/dikunci)
    async scanBarcode(kodeBarcode) {
        const kode = String(kodeBarcode || '').trim().toUpperCase();
        if (!kode) throw new Error('Kode QR tiket tidak boleh kosong!');

        const pendaftarCloud = await supabaseClient.cariPendaftarByBarcode(kode);
        if (!pendaftarCloud) {
            throw new Error(`Tiket dengan kode QR "${kodeBarcode}" tidak ditemukan di basis data.`);
        }

        if (this.cacheAcara.length === 0) {
            await this.ambilSemuaAcara('Semua').catch(() => []);
        }
        const acara = this.cacheAcara.find((a) => String(a.id) === String(pendaftarCloud.acara_id)) || null;
        const statusOp = acara ? jadwalGPMService.hitungStatusOperasional(acara) : null;

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

    // 7. Petugas Verifikasi atau Batalkan Kehadiran (TERKUNCI OTOMATIS JIKA ACARA SUDAH LEWAT JAM / SELESAI)
    async verifikasiKehadiran(kodeBarcode, statusBaru = 'Hadir') {
        const kode = String(kodeBarcode || '').trim().toUpperCase();
        if (!kode) throw new Error('Kode QR tiket tidak boleh kosong!');
        const statusFinal = String(statusBaru || '').toLowerCase() === 'menunggu' ? 'Menunggu' : 'Hadir';

        try {
            const resRpc = await supabaseClient.verifikasiPendaftarGPMViaRPC(kode, statusFinal);
            return Array.isArray(resRpc) ? resRpc[0] : resRpc;
        } catch (errRpc) {
            if (!this.adalahErrorRpcBelumAda(errRpc)) {
                throw new Error(String(errRpc?.message || 'Gagal memverifikasi tiket QR.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        // Fallback jika RPC belum dimigrasi: cek dulu status & waktu WITA acara tiket tersebut
        const tiket = await this.scanBarcode(kode);
        if (tiket?.acara?.terkunci_waktu || String(tiket?.acara?.status || '').toLowerCase() === 'selesai') {
            throw new Error(`Verifikasi QR dikunci: Jadwal kegiatan GPM "${tiket.acara.nama_acara}" telah berakhir.`);
        }

        const payload = {
            status_kehadiran: statusFinal,
            waktu_kehadiran: statusFinal === 'Hadir' ? new Date().toISOString() : null
        };
        const res = await supabaseClient.request(`pendaftar_gpm?kode_barcode=eq.${encodeURIComponent(kode)}`, 'PATCH', payload);
        return Array.isArray(res) && res.length > 0 ? res[0] : res;
    }

    // 8. Petugas Tambah Acara GPM Baru (Tervalidasi WITA & Langsung ke Supabase)
    async tambahAcara(dataAcara) {
        const tervalidasi = jadwalGPMService.validasiFormAcaraBaru(dataAcara);
        const itemMasuk = await supabaseClient.tambahAcaraGPM({
            ...tervalidasi,
            status: 'Aktif'
        });
        return itemMasuk;
    }

    // 9. Kepala Bidang / Superadmin Mengubah / Menambah Kuota Acara GPM Aktif
    async ubahKuotaAcara(acaraId, kuotaBaru) {
        const angka = parseInt(String(kuotaBaru || 0), 10);
        if (!Number.isFinite(angka) || angka < 1) {
            throw new Error('Kuota maksimal harus berupa angka minimal 1.');
        }

        try {
            const resRpc = await supabaseClient.ubahKuotaAcaraGPMViaRPC(acaraId, angka);
            return Array.isArray(resRpc) ? resRpc[0] : resRpc;
        } catch (errRpc) {
            if (!this.adalahErrorRpcBelumAda(errRpc)) {
                throw new Error(String(errRpc?.message || 'Gagal mengubah kuota acara GPM.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        // Fallback jika RPC belum dimigrasi
        const semua = await this.ambilSemuaAcara('Semua');
        const acara = semua.find((a) => String(a.id) === String(acaraId));
        if (!acara) throw new Error('Acara GPM tidak ditemukan.');
        const st = jadwalGPMService.hitungStatusOperasional(acara);
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

    // 10. Selesaikan Lebih Awal & Kunci Kegiatan GPM (Khusus Kepala Bidang / Superadmin)
    async selesaikanAcara(id) {
        await supabaseClient.updateAcaraGPM(id, {
            status: 'Selesai',
            diperbarui_pada: new Date().toISOString()
        });
        return true;
    }

    // 11. Hapus Acara GPM & Seluruh Riwayat Antrean (Khusus Kepala Bidang / Superadmin)
    async hapusAcara(id) {
        await supabaseClient.hapusAcaraGPM(id);
        return true;
    }

    // 12. Mengambil Riwayat Acara yang Sudah Selesai (Terurut Terbaru)
    async ambilRiwayatAcara() {
        const semua = await this.ambilSemuaAcara('Semua');
        return jadwalGPMService.urutkanRiwayatSelesai(semua);
    }

    // 13. Ekspor Rekapitulasi Data Pendaftar Acara ke File CSV (Kompatibel Excel)
    eksporKeCSV(acara, daftarPendaftar) {
        if (!acara) return false;
        const pendaftar = Array.isArray(daftarPendaftar) ? daftarPendaftar : [];
        const totalPendaftar = pendaftar.length;
        const totalHadir = pendaftar.filter((p) => p.status_kehadiran === 'Hadir').length;
        const totalMenunggu = totalPendaftar - totalHadir;

        let csv = '\uFEFF';
        csv += 'LAPORAN REKAPITULASI RESMI GERAKAN PANGAN MURAH (GPM)\n';
        csv += 'DINAS PANGAN PEMERINTAH KOTA MANADO\n\n';

        csv += 'RINGKASAN KEGIATAN\n';
        csv += `Nama Kegiatan,"${(acara.nama_acara || '').replace(/"/g, '""')}"\n`;
        csv += `Lokasi Pelaksanaan,"${(acara.lokasi || '').replace(/"/g, '""')} (Kec. ${(acara.kecamatan || '').replace(/"/g, '""')})"\n`;
        csv += `Jadwal Pelaksanaan,"${acara.tanggal || '-'} (${acara.jam_mulai || '08:00'} - ${acara.jam_selesai || '13:00'} WITA)"\n`;
        csv += `Komoditas Disediakan,"${(acara.komoditas_tersedia || '').replace(/"/g, '""')}"\n`;
        csv += `Status Kegiatan,"${acara.status || 'Selesai'}"\n\n`;

        csv += 'DATA KUOTA & KEHADIRAN WARGA\n';
        csv += `Total Kuota Maksimal,${acara.kuota_maksimal || 0}\n`;
        csv += `Total Warga Mendaftar,${totalPendaftar}\n`;
        csv += `Total Warga Hadir (Terverifikasi),${totalHadir}\n`;
        csv += `Total Belum Hadir / Menunggu,${totalMenunggu}\n`;
        csv += `Waktu Unduh Rekapitulasi,"${new Date().toLocaleString('id-ID')}"\n\n`;

        csv += 'DATA DETAIL PENDAFTAR & ANTREAN\n';
        csv += 'No Urut,Nomor Antrean,Nama Lengkap,NIK (16 Digit),Jalur Pendaftaran,Nomor Telepon / WhatsApp,Kode Tiket QR,Status Kehadiran,Waktu Pendaftaran,Waktu Hadir\n';

        pendaftar.forEach((p, index) => {
            const parsed = this.parseDataPendaftar(p);
            const noUrut = index + 1;
            const noAntrean = `="#${String(parsed.nomor_antrean || index + 1).padStart(3, '0')}"`;
            const nama = `"${(parsed.nama_bersih || '').replace(/"/g, '""')}"`;
            const nik = parsed.nik && parsed.nik !== '-' ? `="${parsed.nik}"` : `"-"`;
            const jalur = `"${parsed.jalur_pendaftaran || 'Daring'}"`;
            const rawTelp = String(parsed.nomor_telepon || '').replace(/[^0-9]/g, '');
            const telp = rawTelp ? `="${rawTelp}"` : `"-"`;
            const kode = `"${(parsed.kode_barcode || '').replace(/"/g, '""')}"`;
            const status = `"${parsed.status_kehadiran || 'Menunggu'}"`;
            const waktuDaftar = `"${parsed.waktu_mendaftar ? new Date(parsed.waktu_mendaftar).toLocaleString('id-ID') : '-'}"`;
            const waktuHadir = `"${parsed.waktu_kehadiran ? new Date(parsed.waktu_kehadiran).toLocaleString('id-ID') : (parsed.status_kehadiran === 'Hadir' ? 'Hadir di Lokasi' : '-')}"`;
            csv += `${noUrut},${noAntrean},${nama},${nik},${jalur},${telp},${kode},${status},${waktuDaftar},${waktuHadir}\n`;
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

    // 14. Statistik Global GPM Murni dari Basis Data (Tanpa Fallback Dummy)
    async ambilStatistik() {
        const semuaAcara = await this.ambilSemuaAcara('Semua');
        const totalAntrean = semuaAcara.reduce((acc, a) => acc + (Number(a.antrean_terisi) || 0), 0);
        const totalHadir = semuaAcara.reduce((acc, a) => acc + (Number(a.total_hadir) || 0), 0);
        const gpmAktif = semuaAcara.filter((a) => !jadwalGPMService.hitungStatusOperasional(a).sudahBerakhir).length;
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

export const gpmService = new GPMApiService();
