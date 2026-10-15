// ===================================================================================
// MODEL PENDAFTAR GPM (ANTREAN & BARCODE) - OOP
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Modul: Basis Data Pengelolaan Antrean, Nomor Urut, Barcode & Verifikasi Kehadiran
// ===================================================================================

const klienBasisData = require('../config/database');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

class ModelPendaftarGPM {
    constructor() {
        // Nama tabel di basis data Supabase
        this.namaTabel = 'pendaftar_gpm';

        // Data cadangan lokal (in-memory fallback)
        this.dataCadangan = [
            {
                id: 'antrean-001',
                acara_id: 'gpm-001-sparta-tikala',
                nama_pendaftar: 'Meity Rondonuwu',
                nomor_telepon: '081234567890',
                nomor_antrean: 1,
                kode_barcode: 'GPM-TIKA-A001',
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
                kode_barcode: 'GPM-TIKA-A002',
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
                kode_barcode: 'GPM-TIKA-A003',
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
                kode_barcode: 'GPM-BERSE-B001',
                status_kehadiran: 'Menunggu',
                waktu_kehadiran: null,
                waktu_mendaftar: '2026-10-15T10:00:00Z'
            }
        ];
    }

    // [Modul Model] 1. Mengambil semua pendaftar untuk satu acara GPM tertentu (Menu Petugas)
    async ambilSemuaPendaftar(acara_id) {
        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .select('*')
                    .eq('acara_id', acara_id)
                    .order('nomor_antrean', { ascending: true });

                if (!error && data && data.length > 0) {
                    return data;
                }
            }
        } catch (error) {
            console.warn('[ModelPendaftarGPM] Basis data utama gagal/offline, beralih ke cadangan:', error.message);
        }

        return this.dataCadangan
            .filter(item => !acara_id || item.acara_id === acara_id)
            .sort((a, b) => a.nomor_antrean - b.nomor_antrean);
    }

    // [Modul Model] 2. Mengambil semua pendaftar global / lintas acara untuk monitoring
    async ambilSemuaGlobal() {
        return this.dataCadangan;
    }

    // [Modul Model] 3. Masyarakat Mendaftar & Mengambil Nomor Antrean (Tanpa Login)
    async daftarAcara(acara_id, nama_pendaftar, nomor_telepon) {
        if (!acara_id || !nama_pendaftar || !nomor_telepon) {
            throw new Error('Data tidak lengkap. Acara, Nama Lengkap, dan Nomor Telepon wajib diisi.');
        }

        // Cari nomor antrean terakhir untuk acara ini
        let nomor_antrean_baru = 1;
        try {
            if (klienBasisData) {
                const { data: antreanTerakhir } = await klienBasisData
                    .from(this.namaTabel)
                    .select('nomor_antrean')
                    .eq('acara_id', acara_id)
                    .order('nomor_antrean', { ascending: false })
                    .limit(1);

                if (antreanTerakhir && antreanTerakhir.length > 0) {
                    nomor_antrean_baru = antreanTerakhir[0].nomor_antrean + 1;
                }
            } else {
                const daftarLokal = this.dataCadangan.filter(item => item.acara_id === acara_id);
                if (daftarLokal.length > 0) {
                    const antreanMaks = Math.max(...daftarLokal.map(d => d.nomor_antrean));
                    nomor_antrean_baru = antreanMaks + 1;
                }
            }
        } catch (e) {
            const daftarLokal = this.dataCadangan.filter(item => item.acara_id === acara_id);
            if (daftarLokal.length > 0) {
                const antreanMaks = Math.max(...daftarLokal.map(d => d.nomor_antrean));
                nomor_antrean_baru = antreanMaks + 1;
            }
        }

        // Format kode barcode: GPM-{ID Singkat}-{No Urut Tiga Digit}-{Random 4 Huruf}
        // Contoh: GPM-TIKA-004-K7M9
        const kodePrefix = acara_id.length > 8 ? acara_id.substring(4, 8).toUpperCase() : 'MND';
        const urutPadded = String(nomor_antrean_baru).padStart(3, '0');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const kode_barcode = `GPM-${kodePrefix}-${urutPadded}-${randomStr}`;

        const pendaftarBaru = {
            id: uuidv4(),
            acara_id,
            nama_pendaftar: nama_pendaftar.trim(),
            nomor_telepon: nomor_telepon.trim(),
            nomor_antrean: nomor_antrean_baru,
            kode_barcode,
            status_kehadiran: 'Menunggu',
            waktu_kehadiran: null,
            waktu_mendaftar: new Date().toISOString()
        };

        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .insert([pendaftarBaru])
                    .select();

                if (!error && data && data.length > 0) {
                    this.dataCadangan.push(data[0]);
                    return data[0];
                }
            }
        } catch (error) {
            console.warn('[ModelPendaftarGPM] Insert DB gagal, menyimpan ke memori cadangan:', error.message);
        }

        this.dataCadangan.push(pendaftarBaru);
        return pendaftarBaru;
    }

    // [Modul Model] 4. Cari Data Pendaftar Berdasarkan Kode Barcode (Menu Scan Petugas)
    async cariBerdasarkanBarcode(kode_barcode) {
        if (!kode_barcode) throw new Error('Kode barcode wajib disertakan');
        const kodeBersih = kode_barcode.trim().toUpperCase();

        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .select('*, acara_gpm(*)')
                    .eq('kode_barcode', kodeBersih)
                    .single();

                if (!error && data) return data;
            }
        } catch (error) {
            console.warn('[ModelPendaftarGPM] DB scan error, beralih ke memori:', error.message);
        }

        const pendaftar = this.dataCadangan.find(
            item => item.kode_barcode.toUpperCase() === kodeBersih
        );

        if (!pendaftar) {
            throw new Error(`Data antrean dengan barcode "${kode_barcode}" tidak ditemukan.`);
        }
        return pendaftar;
    }

    // [Modul Model] 5. Verifikasi Kehadiran Pendaftar saat Barcode Di-Scan oleh Petugas
    async verifikasiKehadiran(kode_barcode, petugas_id = null) {
        if (!kode_barcode) throw new Error('Kode barcode wajib disertakan untuk verifikasi');
        const kodeBersih = kode_barcode.trim().toUpperCase();
        const waktuSekarang = new Date().toISOString();

        try {
            if (klienBasisData) {
                const { data, error } = await klienBasisData
                    .from(this.namaTabel)
                    .update({
                        status_kehadiran: 'Hadir',
                        waktu_kehadiran: waktuSekarang,
                        petugas_verifikasi: petugas_id
                    })
                    .eq('kode_barcode', kodeBersih)
                    .select();

                if (!error && data && data.length > 0) {
                    const idx = this.dataCadangan.findIndex(i => i.kode_barcode.toUpperCase() === kodeBersih);
                    if (idx !== -1) this.dataCadangan[idx] = data[0];
                    return data[0];
                }
            }
        } catch (error) {
            console.warn('[ModelPendaftarGPM] Update DB kehadiran gagal:', error.message);
        }

        const idx = this.dataCadangan.findIndex(i => i.kode_barcode.toUpperCase() === kodeBersih);
        if (idx === -1) {
            throw new Error(`Data antrean dengan barcode "${kode_barcode}" tidak ditemukan.`);
        }

        this.dataCadangan[idx].status_kehadiran = 'Hadir';
        this.dataCadangan[idx].waktu_kehadiran = waktuSekarang;
        return this.dataCadangan[idx];
    }

    // [Modul Model] 6. Ambil Statistik Antrean (Total Antrean Dibuat & Jumlah Hadir)
    async ambilStatistikAntrian(acara_id = null) {
        const daftar = acara_id 
            ? this.dataCadangan.filter(item => item.acara_id === acara_id)
            : this.dataCadangan;

        const totalDibuat = daftar.length;
        const totalHadir = daftar.filter(item => item.status_kehadiran === 'Hadir').length;
        const totalMenunggu = daftar.filter(item => item.status_kehadiran === 'Menunggu').length;

        return {
            total_antrean: totalDibuat,
            total_hadir: totalHadir,
            total_menunggu: totalMenunggu
        };
    }
}

module.exports = new ModelPendaftarGPM();
