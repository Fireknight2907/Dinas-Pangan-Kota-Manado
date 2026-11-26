// ===================================================================================
// Modul Layanan Analitik Beranda Operasional Staf (OOP - Website)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Menyusun informasi operasional harian yang actionable untuk Staf lapangan:
//         1. Progres pembaruan harga hari ini per pasar (sudah/belum/menunggu/revisi)
//         2. Ringkasan status pengajuan harga & catatan penolakan Kepala Bidang
//         3. Agenda tugas Gerakan Pangan Murah (GPM) aktif terdekat & antrean scan QR
// ===================================================================================

import { jadwalGPMService } from './JadwalGPMService.js';

export class BerandaStafService {
    ambilTanggalHariIniISO() {
        const skrg = new Date();
        const wita = new Date(skrg.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
        const y = wita.getFullYear();
        const m = String(wita.getMonth() + 1).padStart(2, '0');
        const d = String(wita.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    formatTanggalHariIniID() {
        return new Date().toLocaleDateString('id-ID', {
            timeZone: 'Asia/Makassar',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    apakahTanggalHariIni(isoAtauTeks, hariIniISO, hariIniID) {
        if (!isoAtauTeks) return false;
        const teks = String(isoAtauTeks).trim();
        if (teks.startsWith(hariIniISO)) return true;
        if (teks.toLowerCase() === hariIniID.toLowerCase()) return true;
        const parsed = new Date(teks);
        if (!Number.isNaN(parsed.getTime())) {
            const wita = new Date(parsed.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
            const iso = `${wita.getFullYear()}-${String(wita.getMonth() + 1).padStart(2, '0')}-${String(wita.getDate()).padStart(2, '0')}`;
            return iso === hariIniISO;
        }
        return false;
    }

    hitungRingkasanOperasional({
        daftarPasarLengkap = [],
        daftarHarga = [],
        daftarMasterKomoditas = [],
        daftarPengajuan = [],
        daftarAcaraGPM = [],
        waktuSekarangMs = Date.now()
    } = {}) {
        const hariIniISO = this.ambilTanggalHariIniISO();
        const hariIniID = this.formatTanggalHariIniID();
        const totalMasterKom = Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas.length : 0;

        // Gabungkan semua pasar dari Master Pasar + pasar yang sudah punya data harga
        const petaPasar = new Map();
        (Array.isArray(daftarPasarLengkap) ? daftarPasarLengkap : []).forEach((p) => {
            const nama = String(p?.nama_pasar || '').trim();
            if (!nama) return;
            petaPasar.set(nama.toLowerCase(), {
                id: p.id || null,
                nama_pasar: nama,
                kecamatan: p.kecamatan || '-'
            });
        });
        (Array.isArray(daftarHarga) ? daftarHarga : []).forEach((h) => {
            const nama = String(h?.nama_pasar || '').trim();
            if (!nama || petaPasar.has(nama.toLowerCase())) return;
            petaPasar.set(nama.toLowerCase(), {
                id: null,
                nama_pasar: nama,
                kecamatan: '-'
            });
        });

        const statusPerPasar = Array.from(petaPasar.values())
            .sort((a, b) => a.nama_pasar.localeCompare(b.nama_pasar, 'id-ID'))
            .map((pasar) => {
                const key = pasar.nama_pasar.toLowerCase();
                const hargaPasar = (Array.isArray(daftarHarga) ? daftarHarga : []).filter(
                    (h) => String(h?.nama_pasar || '').trim().toLowerCase() === key
                );
                const terbitList = hargaPasar.filter((h) => String(h.status || '').toLowerCase() === 'terbit');
                const draftList = hargaPasar.filter((h) => String(h.status || '').toLowerCase() === 'draft');

                const pengajuanPasar = (Array.isArray(daftarPengajuan) ? daftarPengajuan : []).filter(
                    (p) => String(p?.nama_pasar || '').trim().toLowerCase() === key
                );
                const pengajuanDraft = pengajuanPasar.filter((p) => p.status === 'Draft');
                const pengajuanDiajukan = pengajuanPasar.filter((p) => p.status === 'Diajukan');
                const pengajuanDitolak = pengajuanPasar.filter((p) => p.status === 'Ditolak');

                // Cek pembaruan terbaru hari ini (dari harga_pangan atau batch pengajuan yang sudah diajukan/disetujui)
                const adaUpdateHariIni =
                    terbitList.some(
                        (h) =>
                            this.apakahTanggalHariIni(h.tanggal_penetapan, hariIniISO, hariIniID) ||
                            this.apakahTanggalHariIni(h.diperbarui_pada, hariIniISO, hariIniID)
                    ) ||
                    pengajuanPasar.some(
                        (p) =>
                            p.status !== 'Ditolak' &&
                            p.status !== 'Draft' &&
                            (this.apakahTanggalHariIni(p.tanggal_pengambilan, hariIniISO, hariIniID) ||
                                this.apakahTanggalHariIni(p.dibuat_pada, hariIniISO, hariIniID))
                    );

                let tanggalTerakhir = 'Belum ada data';
                if (hargaPasar.length > 0) {
                    const terbaru = [...hargaPasar].sort(
                        (a, b) => new Date(b.diperbarui_pada || b.dibuat_pada || 0).getTime() - new Date(a.diperbarui_pada || a.dibuat_pada || 0).getTime()
                    )[0];
                    tanggalTerakhir = terbaru?.tanggal_penetapan || '-';
                }

                let kodeStatus = 'perlu_update';
                let labelStatus = 'Belum Diperbarui Hari Ini';
                let prioritasUrut = 2;

                if (pengajuanDitolak.length > 0 && pengajuanDiajukan.length === 0) {
                    kodeStatus = 'revisi';
                    labelStatus = 'Perlu Revisi (Ditolak Kabid)';
                    prioritasUrut = 0;
                } else if (pengajuanDiajukan.length > 0 || draftList.length > 0) {
                    kodeStatus = 'menunggu';
                    labelStatus = 'Menunggu Verifikasi Kabid';
                    prioritasUrut = 1;
                } else if (pengajuanDraft.length > 0) {
                    kodeStatus = 'draft';
                    labelStatus = 'Draft Tersimpan (Belum Diajukan)';
                    prioritasUrut = 1;
                } else if (adaUpdateHariIni) {
                    kodeStatus = 'terbaru';
                    labelStatus = 'Sudah Diperbarui Hari Ini';
                    prioritasUrut = 3;
                } else if (terbitList.length === 0) {
                    kodeStatus = 'kosong';
                    labelStatus = 'Belum Ada Data Harga';
                    prioritasUrut = 1;
                }

                const persenKelengkapan = totalMasterKom > 0
                    ? Math.min(100, Math.round((terbitList.length / totalMasterKom) * 100))
                    : (terbitList.length > 0 ? 100 : 0);

                return {
                    ...pasar,
                    jumlahTerbit: terbitList.length,
                    jumlahDraft: draftList.length + pengajuanDraft.length,
                    jumlahPengajuanDraft: pengajuanDraft.length,
                    jumlahPengajuanMenunggu: pengajuanDiajukan.length,
                    jumlahPengajuanDitolak: pengajuanDitolak.length,
                    catatanPenolakanTerbaru: pengajuanDitolak[0]?.catatan_verifikasi || '',
                    totalMasterKom,
                    persenKelengkapan,
                    tanggalTerakhir,
                    adaUpdateHariIni,
                    kodeStatus,
                    labelStatus,
                    prioritasUrut
                };
            })
            .sort((a, b) => a.prioritasUrut - b.prioritasUrut || a.nama_pasar.localeCompare(b.nama_pasar, 'id-ID'));

        // Hitung progres pasar hari ini & pengajuan
        const totalPasar = statusPerPasar.length;
        const pasarSelesaiHariIni = statusPerPasar.filter((p) => p.adaUpdateHariIni).length;
        const pasarPerluSurvey = statusPerPasar.filter((p) => p.kodeStatus === 'perlu_update' || p.kodeStatus === 'kosong' || p.kodeStatus === 'draft').length;

        const semuaPengajuan = Array.isArray(daftarPengajuan) ? daftarPengajuan : [];
        const pengajuanDraft = semuaPengajuan.filter((p) => p.status === 'Draft').length;
        const pengajuanMenunggu = semuaPengajuan.filter((p) => p.status === 'Diajukan').length +
            (Array.isArray(daftarHarga) ? daftarHarga.filter((h) => String(h.status || '').toLowerCase() === 'draft').length : 0);
        const pengajuanDitolak = semuaPengajuan.filter((p) => p.status === 'Ditolak').length;

        // Agenda GPM aktif terdekat (pakai JadwalGPMService)
        const acaraAktifTerurut = jadwalGPMService.urutkanAcaraAktif(daftarAcaraGPM || [], {
            modeUrutan: 'otomatis',
            kecamatan: 'Semua',
            waktuSekarangMs
        });
        const totalMenungguScanGPM = acaraAktifTerurut.reduce(
            (acc, a) => acc + (Number(a.statusOperasional?.totalMenunggu) || 0),
            0
        );

        const totalTerbit = (Array.isArray(daftarHarga) ? daftarHarga : []).filter(
            (h) => String(h.status || '').toLowerCase() === 'terbit'
        ).length;

        return {
            hariIniID,
            kpi: {
                pasarSelesaiHariIni,
                totalPasar,
                pasarPerluSurvey,
                persenProgresPasar: totalPasar > 0 ? Math.round((pasarSelesaiHariIni / totalPasar) * 100) : 0,
                pengajuanDraft,
                pengajuanMenunggu,
                pengajuanDitolak,
                totalTerbit,
                totalMasterKom,
                jumlahGPMAktif: acaraAktifTerurut.length,
                totalMenungguScanGPM
            },
            statusPerPasar,
            pengajuanTerbaru: semuaPengajuan.slice(0, 6),
            agendaGPMTerdekat: acaraAktifTerurut.slice(0, 3)
        };
    }
}

export const berandaStafService = new BerandaStafService();
