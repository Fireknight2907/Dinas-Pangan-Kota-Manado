// ===================================================================================
// Modul Layanan Pengajuan Harga Pangan Per Pasar (OOP - Website)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Mengelola alur Master-Detail Pengajuan Harga (Hybrid: Tambah Satuan ke
//         Keranjang Daftar Harga Pangan + Muat Cepat Harga Pasar), simpan Draft,
//         ajukan ke Kepala Bidang (Timpa Cerdas anti-duplikat), serta verifikasi
//         persetujuan/penolakan dengan UPSERT cerdas ke harga_pangan.
// ===================================================================================

import { supabaseClient } from './SupabaseClient.js';
import { hargaPanganService } from './HargaPanganService.js';

export class PengajuanHargaService {
    apakahTabelBelumMigrasi(err) {
        const msg = String(err?.message || '').toLowerCase();
        return (
            msg.includes('pengajuan_harga') ||
            msg.includes('item_pengajuan_harga') ||
            msg.includes('pgrst205') ||
            msg.includes('does not exist') ||
            msg.includes('could not find the table') ||
            msg.includes('status 404')
        );
    }

    formatTanggalID(isoDate) {
        if (!isoDate) {
            return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        const bersih = String(isoDate).split('T')[0];
        const d = new Date(`${bersih}T00:00:00`);
        if (Number.isNaN(d.getTime())) return String(isoDate);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Label ramah pengguna (value DB tetap 'Diverifikasi' agar 100% kompatibel dengan constraint SQL)
    formatLabelStatus(status) {
        const s = String(status || 'Diajukan').trim();
        if (s.toLowerCase() === 'diverifikasi') return 'Disetujui';
        if (s.toLowerCase() === 'draft') return 'Draft';
        if (s.toLowerCase() === 'ditolak') return 'Ditolak';
        return 'Diajukan';
    }

    kunciPasangan(namaKomoditas, namaPasar) {
        return `${String(namaKomoditas || '').trim().toLowerCase()}__${String(namaPasar || '').trim().toLowerCase()}`;
    }

    // Mengambil daftar jenis/kategori komoditas unik untuk dropdown Jenis Komoditas
    ambilDaftarJenisKomoditas(daftarMasterKomoditas = [], daftarHargaAktif = []) {
        const bawaan = ['Bahan Pokok', 'Hewani', 'Sayuran', 'Buah', 'Lainnya'];
        const setKat = new Set(bawaan);
        (Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas : []).forEach((k) => {
            const kat = String(k?.kategori || '').trim();
            if (kat) setKat.add(kat);
        });
        (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
            const kat = String(h?.kategori || '').trim();
            if (kat) setKat.add(kat);
        });
        return Array.from(setKat);
    }

    // Mencari harga Terbit terkini di pasar tertentu sebagai patokan (pembanding saat Staf input)
    cariHargaTerbitPasar(namaPasar, namaKomoditas, daftarHargaAktif = []) {
        const pasarKey = String(namaPasar || '').trim().toLowerCase();
        const komKey = String(namaKomoditas || '').trim().toLowerCase();
        if (!pasarKey || !komKey) return null;
        const kandidat = (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).filter(
            (h) =>
                String(h?.nama_pasar || '').trim().toLowerCase() === pasarKey &&
                String(h?.nama_komoditas || '').trim().toLowerCase() === komKey
        );
        if (kandidat.length === 0) return null;
        return kandidat.find((h) => String(h.status || '').toLowerCase() === 'terbit') || kandidat[0];
    }

    // Mencari dokumen pengajuan aktif (default 'Diajukan', bisa juga 'Draft') pada pasar & tanggal yang sama
    cariPengajuanAktifPasar(daftarPengajuan = [], namaPasar = '', tanggalPengambilan = '', statusTarget = 'Diajukan') {
        const pasarKey = String(namaPasar || '').trim().toLowerCase();
        const tglKey = String(tanggalPengambilan || '').split('T')[0].trim();
        const statusKey = String(statusTarget || 'Diajukan').trim().toLowerCase();
        if (!pasarKey || !tglKey) return null;
        return (Array.isArray(daftarPengajuan) ? daftarPengajuan : []).find(
            (p) =>
                String(p?.status || '').toLowerCase() === statusKey &&
                String(p?.nama_pasar || '').trim().toLowerCase() === pasarKey &&
                String(p?.tanggal_pengambilan || '').split('T')[0].trim() === tglKey
        ) || null;
    }

    // Membangun daftar keranjang cepat dari semua komoditas pasar (Fitur Hybrid "Muat Harga Pasar Ini")
    bangunDaftarInputCepatPasar(namaPasar, daftarMasterKomoditas = [], daftarHargaAktif = [], pengajuanAktif = null) {
        const pasarBersih = String(namaPasar || '').trim();
        if (!pasarBersih) return [];

        const petaHargaAktif = new Map();
        (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
            if ((h.nama_pasar || '').trim().toLowerCase() !== pasarBersih.toLowerCase()) return;
            const k = (h.nama_komoditas || '').trim().toLowerCase();
            const sudah = petaHargaAktif.get(k);
            if (!sudah || (String(h.status || '').toLowerCase() === 'terbit' && String(sudah.status || '').toLowerCase() !== 'terbit')) {
                petaHargaAktif.set(k, h);
            }
        });

        const petaDiajukan = new Map();
        if (pengajuanAktif && Array.isArray(pengajuanAktif.items)) {
            pengajuanAktif.items.forEach((it) => {
                const k = String(it?.nama_komoditas || '').trim().toLowerCase();
                if (k) petaDiajukan.set(k, it);
            });
        }

        const hasil = [];
        const kunciSudah = new Set();

        (Array.isArray(daftarMasterKomoditas) ? daftarMasterKomoditas : []).forEach((master) => {
            const namaKom = String(master.nama_komoditas || '').trim();
            if (!namaKom) return;
            const k = namaKom.toLowerCase();
            kunciSudah.add(k);
            const aktif = petaHargaAktif.get(k) || null;
            const diajukan = petaDiajukan.get(k) || null;
            const hargaLama = aktif ? Math.round(Number(aktif.harga) || 0) : null;
            const hargaAwalUsulan = diajukan
                ? String(Math.round(Number(diajukan.harga) || 0))
                : (hargaLama !== null ? String(hargaLama) : '');

            hasil.push({
                tempId: `row-${k}`,
                komoditas_id: master.id || null,
                nama_komoditas: namaKom,
                kelompok_komoditas: master.kelompok_komoditas || '',
                kategori: master.kategori || aktif?.kategori || diajukan?.kategori || 'Bahan Pokok',
                satuan: hargaPanganService.normalisasiSatuan(master.satuan_bawaan || aktif?.satuan || diajukan?.satuan || '1 KG'),
                prioritas_tampil: Number(master.prioritas_tampil) || 50,
                harga_lama: hargaLama,
                status_aktif: aktif?.status || null,
                tanggal_terakhir: aktif?.tanggal_penetapan || '-',
                harga_usulan: hargaAwalUsulan,
                sedang_diajukan: Boolean(diajukan),
                harga_diajukan: diajukan ? Math.round(Number(diajukan.harga) || 0) : null,
                dipilih: Boolean(diajukan)
            });
        });

        petaHargaAktif.forEach((aktif, k) => {
            if (kunciSudah.has(k)) return;
            kunciSudah.add(k);
            const diajukan = petaDiajukan.get(k) || null;
            const hargaLama = Math.round(Number(aktif.harga) || 0);
            hasil.push({
                tempId: `row-${k}`,
                komoditas_id: null,
                nama_komoditas: aktif.nama_komoditas,
                kelompok_komoditas: '',
                kategori: aktif.kategori || 'Bahan Pokok',
                satuan: hargaPanganService.normalisasiSatuan(aktif.satuan || '1 KG'),
                prioritas_tampil: Number(aktif.prioritas_tampil) || 50,
                harga_lama: hargaLama,
                status_aktif: aktif.status || null,
                tanggal_terakhir: aktif.tanggal_penetapan || '-',
                harga_usulan: diajukan ? String(Math.round(Number(diajukan.harga) || 0)) : String(hargaLama),
                sedang_diajukan: Boolean(diajukan),
                harga_diajukan: diajukan ? Math.round(Number(diajukan.harga) || 0) : null,
                dipilih: Boolean(diajukan)
            });
        });

        petaDiajukan.forEach((diajukan, k) => {
            if (kunciSudah.has(k)) return;
            kunciSudah.add(k);
            hasil.push({
                tempId: `row-${k}`,
                komoditas_id: diajukan.komoditas_id || null,
                nama_komoditas: diajukan.nama_komoditas,
                kelompok_komoditas: '',
                kategori: diajukan.kategori || 'Bahan Pokok',
                satuan: hargaPanganService.normalisasiSatuan(diajukan.satuan || '1 KG'),
                prioritas_tampil: Number(diajukan.prioritas_tampil) || 50,
                harga_lama: null,
                status_aktif: null,
                tanggal_terakhir: '-',
                harga_usulan: String(Math.round(Number(diajukan.harga) || 0)),
                sedang_diajukan: true,
                harga_diajukan: Math.round(Number(diajukan.harga) || 0),
                dipilih: true
            });
        });

        return hasil;
    }

    // Mengonversi dokumen pengajuan (Draft/Diajukan/Ditolak/Disetujui) menjadi daftar item keranjang Daftar Harga Pangan
    bangunKeranjangDariDokumen(pengajuan, daftarHargaAktif = []) {
        if (!pengajuan || !Array.isArray(pengajuan.items)) return [];
        const pasar = pengajuan.nama_pasar || '';
        return pengajuan.items.map((it, idx) => {
            const hargaTerbit = this.cariHargaTerbitPasar(pasar, it.nama_komoditas, daftarHargaAktif);
            const hargaLama = hargaTerbit
                ? Math.round(Number(hargaTerbit.harga) || 0)
                : (it.harga_lama !== null && it.harga_lama !== undefined ? Math.round(Number(it.harga_lama) || 0) : null);
            const namaBersih = String(it.nama_komoditas || '').trim();
            return {
                tempId: `cart-${namaBersih.toLowerCase()}-${idx}`,
                komoditas_id: it.komoditas_id || null,
                nama_komoditas: namaBersih,
                kelompok_komoditas: '',
                kategori: it.kategori || hargaTerbit?.kategori || 'Bahan Pokok',
                satuan: hargaPanganService.normalisasiSatuan(it.satuan || hargaTerbit?.satuan || '1 KG'),
                prioritas_tampil: Number(it.prioritas_tampil) || 50,
                harga_lama: hargaLama,
                tanggal_terakhir: hargaTerbit?.tanggal_penetapan || '-',
                harga_usulan: String(Math.round(Number(it.harga) || 0)),
                sedang_diajukan: pengajuan.status === 'Diajukan'
            };
        });
    }

    // Mengambil seluruh dokumen pengajuan harga beserta rincian item dari Supabase
    async ambilSemuaPengajuan() {
        try {
            const rows = await supabaseClient.getPengajuanHarga();
            if (!Array.isArray(rows)) return { belumMigrasi: false, data: [] };

            const rapi = rows.map((p) => {
                const items = Array.isArray(p.item_pengajuan_harga) ? p.item_pengajuan_harga : [];
                return {
                    id: String(p.id),
                    pasar_id: p.pasar_id || null,
                    nama_pasar: p.nama_pasar || '-',
                    tanggal_pengambilan: p.tanggal_pengambilan ? String(p.tanggal_pengambilan).split('T')[0] : '',
                    tanggal_tampil: this.formatTanggalID(p.tanggal_pengambilan),
                    petugas_id: p.petugas_id || null,
                    nama_petugas: p.nama_petugas || 'Petugas Lapangan',
                    status: p.status || 'Diajukan',
                    status_label: this.formatLabelStatus(p.status || 'Diajukan'),
                    catatan_verifikasi: p.catatan_verifikasi || '',
                    dibuat_pada: p.dibuat_pada || null,
                    diperbarui_pada: p.diperbarui_pada || null,
                    items: items.map((it) => ({
                        id: String(it.id),
                        pengajuan_id: String(it.pengajuan_id || p.id),
                        komoditas_id: it.komoditas_id || null,
                        nama_komoditas: it.nama_komoditas,
                        kategori: it.kategori || 'Bahan Pokok',
                        satuan: hargaPanganService.normalisasiSatuan(it.satuan || '1 KG'),
                        harga_lama: it.harga_lama !== null && it.harga_lama !== undefined ? Number(it.harga_lama) : null,
                        harga: Number(it.harga) || 0,
                        prioritas_tampil: Number(it.prioritas_tampil) || 50
                    }))
                };
            });

            return { belumMigrasi: false, data: rapi };
        } catch (err) {
            if (this.apakahTabelBelumMigrasi(err)) {
                return { belumMigrasi: true, data: [] };
            }
            console.warn('Gagal mengambil pengajuan_harga:', err?.message);
            return { belumMigrasi: false, data: [] };
        }
    }

    // Helper internal: ganti seluruh item detail pada 1 dokumen pengajuan dengan rollback aman
    async gantiItemPengajuanAman(targetHeaderId, itemValid, itemLamaBackup = []) {
        await supabaseClient.hapusItemPengajuanByPengajuanId(targetHeaderId);

        const detailPayload = itemValid.map((it) => ({
            pengajuan_id: targetHeaderId,
            komoditas_id: it.komoditas_id || null,
            nama_komoditas: it.nama_komoditas,
            kategori: it.kategori,
            satuan: it.satuan,
            harga: it.harga,
            harga_lama: it.harga_lama
        }));

        try {
            await supabaseClient.tambahItemPengajuanHargaBatch(detailPayload);
        } catch (errDetail) {
            const msg = String(errDetail?.message || '').toLowerCase();
            if (msg.includes('harga_lama')) {
                const tanpaHargaLama = detailPayload.map(({ harga_lama, ...rest }) => rest);
                await supabaseClient.tambahItemPengajuanHargaBatch(tanpaHargaLama);
            } else {
                if (Array.isArray(itemLamaBackup) && itemLamaBackup.length > 0) {
                    const restore = itemLamaBackup.map((old) => ({
                        pengajuan_id: targetHeaderId,
                        komoditas_id: old.komoditas_id || null,
                        nama_komoditas: old.nama_komoditas,
                        kategori: old.kategori,
                        satuan: old.satuan,
                        harga: old.harga
                    }));
                    await supabaseClient.tambahItemPengajuanHargaBatch(restore).catch(() => {});
                }
                throw errDetail;
            }
        }
    }

    // Inti transaksi Master-Detail: Simpan sebagai 'Draft' ATAU kirim sebagai 'Diajukan' (Timpa Cerdas anti-duplikat)
    async simpanPengajuanHarga({
        namaPasar,
        pasarId = null,
        tanggalPengambilan,
        petugasId = null,
        namaPetugas = 'Petugas Lapangan',
        items = [],
        daftarHargaAktif = [],
        daftarPengajuanAktif = null,
        statusTarget = 'Diajukan',
        pengajuanIdDiedit = null
    }) {
        const pasarBersih = String(namaPasar || '').trim();
        if (!pasarBersih) throw new Error('Pasar wajib dipilih terlebih dahulu!');
        if (!tanggalPengambilan) throw new Error('Tanggal pengajuan harga wajib diisi!');

        const statusFinal = String(statusTarget || 'Diajukan').toLowerCase() === 'draft' ? 'Draft' : 'Diajukan';

        const itemValid = (Array.isArray(items) ? items : [])
            .map((r) => ({
                komoditas_id: r.komoditas_id || null,
                nama_komoditas: String(r.nama_komoditas || '').trim(),
                kategori: r.kategori || 'Bahan Pokok',
                satuan: hargaPanganService.normalisasiSatuan(r.satuan || '1 KG'),
                harga: Math.round(Number(String(r.harga ?? r.harga_usulan ?? '').replace(/[^0-9]/g, '')) || 0),
                harga_lama: r.harga_lama !== null && r.harga_lama !== undefined ? Number(r.harga_lama) : null,
                prioritas_tampil: Number(r.prioritas_tampil) || 50
            }))
            .filter((r) => r.nama_komoditas && r.harga > 0);

        if (itemValid.length === 0) {
            throw new Error(
                statusFinal === 'Draft'
                    ? 'Tambahkan minimal 1 komoditas (harga > 0) ke Daftar Harga Pangan sebelum menyimpan Draft!'
                    : 'Tambahkan minimal 1 komoditas (harga > 0) ke Daftar Harga Pangan sebelum mengajukan ke Kepala Bidang!'
            );
        }

        try {
            let sumberPengajuan = Array.isArray(daftarPengajuanAktif) ? daftarPengajuanAktif : null;
            if (!sumberPengajuan) {
                const segar = await this.ambilSemuaPengajuan();
                if (segar.belumMigrasi) {
                    throw new Error('pengajuan_harga PGRST205');
                }
                sumberPengajuan = segar.data;
            }

            const paketDiedit = pengajuanIdDiedit
                ? sumberPengajuan.find((p) => String(p.id) === String(pengajuanIdDiedit))
                : null;
            const bolehTimpaDiedit =
                paketDiedit && (paketDiedit.status === 'Draft' || paketDiedit.status === 'Diajukan');

            const paketSamaStatus = this.cariPengajuanAktifPasar(
                sumberPengajuan,
                pasarBersih,
                tanggalPengambilan,
                statusFinal
            );

            let targetPaket = null;
            let draftDuplikatUntukDihapus = null;

            if (bolehTimpaDiedit) {
                // Jika Draft dipromosikan menjadi 'Diajukan', tetapi sudah ada 'Diajukan' lain di pasar+tgl yang sama -> timpa yang Diajukan & hapus Draft lama
                if (
                    statusFinal === 'Diajukan' &&
                    paketSamaStatus &&
                    String(paketSamaStatus.id) !== String(paketDiedit.id)
                ) {
                    targetPaket = paketSamaStatus;
                    if (paketDiedit.status === 'Draft') {
                        draftDuplikatUntukDihapus = paketDiedit.id;
                    }
                } else {
                    targetPaket = paketDiedit;
                }
            } else if (paketSamaStatus) {
                targetPaket = paketSamaStatus;
            }

            let targetHeaderId = null;
            let ditimpa = false;

            if (targetPaket && targetPaket.id) {
                targetHeaderId = targetPaket.id;
                ditimpa = true;

                await this.gantiItemPengajuanAman(targetHeaderId, itemValid, targetPaket.items || []);

                await supabaseClient.updatePengajuanHarga(targetHeaderId, {
                    pasar_id: pasarId || targetPaket.pasar_id || null,
                    nama_pasar: pasarBersih,
                    tanggal_pengambilan: tanggalPengambilan,
                    petugas_id: petugasId || targetPaket.petugas_id || null,
                    nama_petugas: namaPetugas || targetPaket.nama_petugas || 'Petugas Lapangan',
                    status: statusFinal,
                    catatan_verifikasi: ''
                });

                if (draftDuplikatUntukDihapus) {
                    await supabaseClient.hapusPengajuanHarga(draftDuplikatUntukDihapus).catch(() => {});
                }
            } else {
                const header = await supabaseClient.tambahPengajuanHarga({
                    pasar_id: pasarId || null,
                    nama_pasar: pasarBersih,
                    tanggal_pengambilan: tanggalPengambilan,
                    petugas_id: petugasId || null,
                    nama_petugas: namaPetugas || 'Petugas Lapangan',
                    status: statusFinal
                });

                if (!header || !header.id) {
                    throw new Error('Gagal membuat dokumen pengajuan harga.');
                }
                targetHeaderId = header.id;

                const detailPayload = itemValid.map((it) => ({
                    pengajuan_id: targetHeaderId,
                    komoditas_id: it.komoditas_id || null,
                    nama_komoditas: it.nama_komoditas,
                    kategori: it.kategori,
                    satuan: it.satuan,
                    harga: it.harga,
                    harga_lama: it.harga_lama
                }));

                try {
                    await supabaseClient.tambahItemPengajuanHargaBatch(detailPayload);
                } catch (errDetail) {
                    const msg = String(errDetail?.message || '').toLowerCase();
                    if (msg.includes('harga_lama')) {
                        const tanpaHargaLama = detailPayload.map(({ harga_lama, ...rest }) => rest);
                        await supabaseClient.tambahItemPengajuanHargaBatch(tanpaHargaLama);
                    } else {
                        throw errDetail;
                    }
                }
            }

            return {
                mode: 'pengajuan_batch',
                status: statusFinal,
                ditimpa,
                id: targetHeaderId,
                jumlahItem: itemValid.length,
                namaPasar: pasarBersih,
                tanggalTampil: this.formatTanggalID(tanggalPengambilan)
            };
        } catch (err) {
            if (!this.apakahTabelBelumMigrasi(err)) {
                throw new Error(String(err?.message || 'Gagal menyimpan pengajuan harga.').replace(/^Supabase Error:\s*/i, ''));
            }
        }

        // Fallback Aman (HANYA jika SQL migrasi_tingkat_3.sql belum dijalankan)
        const tglFormatted = this.formatTanggalID(tanggalPengambilan);
        const existingDraftMap = new Map();
        (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
            if (String(h.status || '').toLowerCase() === 'draft') {
                existingDraftMap.set(this.kunciPasangan(h.nama_komoditas, h.nama_pasar), h);
            }
        });

        for (const it of itemValid) {
            const kunci = this.kunciPasangan(it.nama_komoditas, pasarBersih);
            const draftAda = existingDraftMap.get(kunci);
            if (draftAda && draftAda.id) {
                await hargaPanganService.perbarui(draftAda.id, {
                    harga: it.harga,
                    satuan: it.satuan,
                    kategori: it.kategori,
                    tanggal_penetapan: tglFormatted,
                    prioritas_tampil: it.prioritas_tampil,
                    status: 'Draft'
                });
            } else {
                await hargaPanganService.tambah({
                    nama_komoditas: it.nama_komoditas,
                    kategori: it.kategori,
                    satuan: it.satuan,
                    harga: it.harga,
                    nama_pasar: pasarBersih,
                    tanggal_penetapan: tglFormatted,
                    prioritas_tampil: it.prioritas_tampil,
                    status: 'Draft'
                });
            }
        }

        return {
            mode: 'draft_harga_pangan',
            status: statusFinal,
            ditimpa: false,
            id: null,
            jumlahItem: itemValid.length,
            namaPasar: pasarBersih,
            tanggalTampil: tglFormatted
        };
    }

    // Staf menyimpan keranjang sebagai Draft (belum dikirim ke Kepala Bidang)
    async simpanDraftBatchHarga(params) {
        return this.simpanPengajuanHarga({ ...params, statusTarget: 'Draft' });
    }

    // Staf mengajukan keranjang harga pasar ke Kepala Bidang (Timpa cerdas jika masih ada paket 'Diajukan' di pasar & tanggal sama)
    async ajukanBatchHarga(params) {
        return this.simpanPengajuanHarga({ ...params, statusTarget: 'Diajukan' });
    }

    // Kepala Bidang menyetujui 1 batch pengajuan -> UPSERT cerdas ke harga_pangan (anti-duplikat + trigger riwayat akurat!)
    async setujuiPengajuanBatch(pengajuan, daftarHargaAktif = [], catatanVerifikasi = '') {
        if (!pengajuan || !pengajuan.id) {
            throw new Error('Dokumen pengajuan tidak valid.');
        }

        const tglFormatted = this.formatTanggalID(pengajuan.tanggal_pengambilan);
        const petaTerbit = new Map();
        const petaDraft = new Map();

        (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).forEach((h) => {
            const k = this.kunciPasangan(h.nama_komoditas, h.nama_pasar);
            if (String(h.status || '').toLowerCase() === 'terbit') {
                petaTerbit.set(k, h);
            } else if (String(h.status || '').toLowerCase() === 'draft') {
                petaDraft.set(k, h);
            }
        });

        const daftarItem = Array.isArray(pengajuan.items) ? pengajuan.items : [];
        for (const it of daftarItem) {
            const kunci = this.kunciPasangan(it.nama_komoditas, pengajuan.nama_pasar);
            const barisTerbit = petaTerbit.get(kunci);
            const barisDraft = petaDraft.get(kunci);

            const payloadHarga = {
                nama_komoditas: it.nama_komoditas,
                kategori: it.kategori || 'Bahan Pokok',
                satuan: hargaPanganService.normalisasiSatuan(it.satuan || '1 KG'),
                harga: Number(it.harga),
                nama_pasar: pengajuan.nama_pasar,
                tanggal_penetapan: tglFormatted,
                prioritas_tampil: Number(it.prioritas_tampil) || 50,
                catatan_perubahan: catatanVerifikasi || `Disetujui Kabid (${pengajuan.nama_petugas || 'Staf'})`,
                status: 'Terbit'
            };

            if (barisTerbit && barisTerbit.id) {
                await hargaPanganService.perbarui(barisTerbit.id, payloadHarga);
                if (barisDraft && barisDraft.id && barisDraft.id !== barisTerbit.id) {
                    await hargaPanganService.hapus(barisDraft.id).catch(() => {});
                }
            } else if (barisDraft && barisDraft.id) {
                await hargaPanganService.perbarui(barisDraft.id, payloadHarga);
            } else {
                await hargaPanganService.tambah(payloadHarga);
            }
        }

        await supabaseClient.updatePengajuanHarga(pengajuan.id, {
            status: 'Diverifikasi',
            catatan_verifikasi: catatanVerifikasi || 'Disetujui dan diterbitkan ke masyarakat'
        });

        return true;
    }

    // Kepala Bidang menyetujui 1 baris Draft satuan di harga_pangan dengan konsolidasi anti-duplikat
    async setujuiDraftSatuanTanpaDuplikat(itemDraft, daftarHargaAktif = []) {
        const kunci = this.kunciPasangan(itemDraft.nama_komoditas, itemDraft.nama_pasar);
        const barisTerbitLain = (Array.isArray(daftarHargaAktif) ? daftarHargaAktif : []).find(
            (h) =>
                String(h.id) !== String(itemDraft.id) &&
                String(h.status || '').toLowerCase() === 'terbit' &&
                this.kunciPasangan(h.nama_komoditas, h.nama_pasar) === kunci
        );

        if (barisTerbitLain && barisTerbitLain.id) {
            await hargaPanganService.perbarui(barisTerbitLain.id, {
                harga: Number(itemDraft.harga),
                satuan: hargaPanganService.normalisasiSatuan(itemDraft.satuan),
                kategori: itemDraft.kategori,
                tanggal_penetapan: itemDraft.tanggal_penetapan,
                prioritas_tampil: itemDraft.prioritas_tampil,
                status: 'Terbit'
            });
            await hargaPanganService.hapus(itemDraft.id);
        } else {
            await hargaPanganService.perbarui(itemDraft.id, { status: 'Terbit' });
        }
        return true;
    }

    // Kepala Bidang menolak pengajuan batch beserta catatan alasan (harga Terbit publik tetap utuh!)
    async tolakPengajuanBatch(pengajuanId, catatanAlasan = '') {
        const alasan = String(catatanAlasan || '').trim();
        await supabaseClient.updatePengajuanHarga(pengajuanId, {
            status: 'Ditolak',
            catatan_verifikasi: alasan || 'Pengajuan ditolak untuk diperbaiki kembali.'
        });
        return true;
    }

    async hapusPengajuanBatch(pengajuanId) {
        await supabaseClient.hapusPengajuanHarga(pengajuanId);
        return true;
    }
}

export const pengajuanHargaService = new PengajuanHargaService();
