// ===================================================================================
// MODUL MODEL PENGGUNA DAN AUTENTIKASI BASIS DATA (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Mengelola autentikasi token JWT, pembagian peran kedinasan,
// serta fitur khusus administrator untuk hard reset password dan peremajaan akun.
// ===================================================================================

const klienBasisData = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class PenggunaModel {
    constructor() {
        this.tabel = 'pengguna';
        this.rahasia = process.env.JWT_SECRET || 'rahasia_super_aman_123';
    }

    async login(email, kata_sandi) {
        // Cek jika Supabase aktif dan terkoneksi
        if (process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData) {
            try {
                const { data, error } = await klienBasisData
                    .from(this.tabel)
                    .select('*')
                    .or(`email.eq.${email},username.eq.${email}`)
                    .single();

                if (!error && data) {
                    const cocok = await bcrypt.compare(kata_sandi, data.kata_sandi);
                    if (cocok) {
                        const token = jwt.sign({ id: data.id, peran: data.peran, email: data.email, nama: data.nama }, this.rahasia, { expiresIn: '1d' });
                        delete data.kata_sandi;
                        return { pengguna: data, token };
                    }
                }
            } catch (err) {
                console.warn('Gagal login via Supabase, beralih ke validasi lokal:', err.message);
            }
        }

        // Akun Resmi Sesuai Struktur Organisasi Dinas Pangan
        const akunBawaan = [
            { id: 'usr-effrend', nama: 'Effrend', email: 'effrend@manado.go.id', username: 'effrend', kata_sandi: '12345678', peran: 'Staf', bidang: 'Bidang Cadangan dan Distribusi Pangan', foto_profil: '' },
            { id: 'usr-regina', nama: 'Regina', email: 'regina@manado.go.id', username: 'regina', kata_sandi: '12345678', peran: 'Admin', bidang: 'Administrator Sistem (Superadmin)', foto_profil: '' },
            { id: 'usr-mareta', nama: 'Mareta', email: 'mareta@manado.go.id', username: 'mareta', kata_sandi: '12345678', peran: 'Kabid', bidang: 'Kepala Bidang Cadangan & Distribusi Pangan', foto_profil: '' },
            { id: 'usr-edrick', nama: 'Edrick', email: 'edrick@manado.go.id', username: 'edrick', kata_sandi: '12345678', peran: 'Admin', bidang: 'Administrator Sistem (Superadmin)', foto_profil: '' },
            { id: 'usr-kadis', nama: 'Kepala Dinas Pangan', email: 'kadis@manado.go.id', username: 'kadis', kata_sandi: '12345678', peran: 'Kadis', bidang: 'Pimpinan Dinas Pangan Kota Manado', foto_profil: '' }
        ];

        const normalisasi = (email || '').toLowerCase().trim();
        const userCocok = akunBawaan.find(u => u.email === normalisasi || u.username === normalisasi);

        if (userCocok) {
            if (kata_sandi && kata_sandi !== userCocok.kata_sandi) {
                throw new Error('Kata sandi yang Anda masukkan salah!');
            }
            const dataPengguna = { ...userCocok };
            delete dataPengguna.kata_sandi;
            const token = jwt.sign({ id: userCocok.id, peran: userCocok.peran, email: userCocok.email, nama: userCocok.nama }, this.rahasia, { expiresIn: '1d' });
            return { pengguna: dataPengguna, token };
        }

        throw new Error('Username atau email tidak terdaftar di sistem!');
    }

    async gantiKataSandi(idPengguna, kataSandiLama, kataSandiBaru) {
        // Cek kata sandi lama
        const { data: pengguna, error: errCek } = await klienBasisData
            .from(this.tabel)
            .select('kata_sandi')
            .eq('id', idPengguna)
            .single();

        if (errCek || !pengguna) throw new Error('Pengguna tidak ditemukan');

        const cocok = await bcrypt.compare(kataSandiLama, pengguna.kata_sandi);
        if (!cocok) throw new Error('Kata sandi lama salah');

        const salt = await bcrypt.genSalt(10);
        const hashBaru = await bcrypt.hash(kataSandiBaru, salt);

        const { data, error } = await klienBasisData
            .from(this.tabel)
            .update({ kata_sandi: hashBaru })
            .eq('id', idPengguna);

        if (error) throw error;
        return true;
    }

    async tambahPenggunaBaru(dataBaru) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(dataBaru.kata_sandi, salt);
        dataBaru.kata_sandi = hashed;

        const { data, error } = await klienBasisData
            .from(this.tabel)
            .insert([dataBaru])
            .select();

        if (error) throw error;
        return data;
    }
    
    async ambilSemuaPengguna() {
        if (process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData) {
            const { data, error } = await klienBasisData
                .from(this.tabel)
                .select('id, nama, email, peran, bidang, dibuat_pada');
            
            if (error) throw error;
            return data;
        }

        return [
            { id: 'usr-effrend', nama: 'Effrend', email: 'effrend@manado.go.id', username: 'effrend', peran: 'Staf', bidang: 'Bidang Cadangan dan Distribusi Pangan' },
            { id: 'usr-regina', nama: 'Regina', email: 'regina@manado.go.id', username: 'regina', peran: 'Admin', bidang: 'Administrator Sistem (Superadmin)' },
            { id: 'usr-mareta', nama: 'Mareta', email: 'mareta@manado.go.id', username: 'mareta', peran: 'Kabid', bidang: 'Kepala Bidang Cadangan & Distribusi Pangan' },
            { id: 'usr-edrick', nama: 'Edrick', email: 'edrick@manado.go.id', username: 'edrick', peran: 'Admin', bidang: 'Administrator Sistem (Superadmin)' },
            { id: 'usr-kadis', nama: 'Kepala Dinas Pangan', email: 'kadis@manado.go.id', username: 'kadis', peran: 'Kadis', bidang: 'Pimpinan Dinas Pangan Kota Manado' }
        ];
    }

    // Hard reset kata sandi oleh Admin (tanpa melihat kata sandi lama pengguna)
    async adminResetKataSandi(idTarget, kataSandiBaru) {
        if (!kataSandiBaru || kataSandiBaru.length < 8) {
            throw new Error('Kata sandi baru minimal 8 karakter!');
        }

        if (process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData) {
            const salt = await bcrypt.genSalt(10);
            const hashBaru = await bcrypt.hash(kataSandiBaru, salt);

            const { data, error } = await klienBasisData
                .from(this.tabel)
                .update({ kata_sandi: hashBaru })
                .eq('id', idTarget);

            if (error) throw error;
        }

        return true;
    }

    // Mengubah username pengguna oleh Admin
    async adminUbahUsername(idTarget, usernameBaru) {
        const usernameBersih = (usernameBaru || '').toLowerCase().trim();
        if (!usernameBersih) {
            throw new Error('Username tidak boleh kosong!');
        }

        if (process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData) {
            const { data, error } = await klienBasisData
                .from(this.tabel)
                .update({ 
                    username: usernameBersih,
                    email: `${usernameBersih}@manado.go.id`
                })
                .eq('id', idTarget);

            if (error) throw error;
        }

        return true;
    }

    // Mengubah peran pengguna oleh Admin
    async adminUbahPeran(idTarget, peranBaru) {
        const peranValid = ['Admin', 'Kabid', 'Staf', 'Kadis'];
        if (!peranValid.includes(peranBaru)) {
            throw new Error('Peran yang dipilih tidak valid!');
        }

        if (process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData) {
            const { data, error } = await klienBasisData
                .from(this.tabel)
                .update({ peran: peranBaru })
                .eq('id', idTarget);

            if (error) throw error;
        }

        return true;
    }

    // Menghapus akun pengguna oleh Admin
    async hapusPengguna(idTarget) {
        if (process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData) {
            const { error } = await klienBasisData
                .from(this.tabel)
                .delete()
                .eq('id', idTarget);

            if (error) throw error;
        }

        return true;
    }
}

module.exports = new PenggunaModel();
