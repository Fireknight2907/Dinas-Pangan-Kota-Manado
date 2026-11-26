// ===================================================================================
// MODUL MODEL PENGGUNA DAN AUTENTIKASI BASIS DATA (OOP)
// Bidang: Sekretariat & Tim Administrator - Dinas Pangan Kota Manado
// Mengelola autentikasi token JWT murni berbasis basis data (tanpa akun backdoor lokal),
// pembagian peran kedinasan, serta fitur khusus administrator.
// ===================================================================================

const crypto = require('crypto');
const klienBasisData = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ambilJwtSecret } = require('../middleware/autentikasi');

const GARAM_SHA256 = 'SIPATOKAAN_MANADO_2026_SECURE_SALT';

class PenggunaModel {
    constructor() {
        this.tabel = 'pengguna';
    }

    apakahDbAktif() {
        return !!(process.env.URL_SUPABASE && process.env.KUNCI_SUPABASE && klienBasisData);
    }

    hitungHashSha256(kataSandi) {
        return crypto.createHash('sha256').update(GARAM_SHA256 + String(kataSandi)).digest('hex');
    }

    async cocokkanKataSandi(kataSandiInput, hashTersimpan) {
        if (!kataSandiInput || typeof kataSandiInput !== 'string' || !hashTersimpan) {
            return false;
        }
        const simpan = String(hashTersimpan).trim();
        if (/^\$2[aby]\$/.test(simpan)) {
            return bcrypt.compare(kataSandiInput, simpan);
        }
        if (/^[a-f0-9]{64}$/i.test(simpan)) {
            const hashInput = this.hitungHashSha256(kataSandiInput);
            const bufA = Buffer.from(hashInput, 'hex');
            const bufB = Buffer.from(simpan.toLowerCase(), 'hex');
            return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
        }
        return false;
    }

    async cariPenggunaByIdentifier(identifier) {
        const bersih = String(identifier || '').toLowerCase().trim();
        if (!bersih) return null;

        // Dua query .eq terpisah untuk menghindari injeksi filter pada .or()
        const { data: viaEmail, error: errEmail } = await klienBasisData
            .from(this.tabel)
            .select('*')
            .eq('email', bersih)
            .limit(1);

        if (!errEmail && Array.isArray(viaEmail) && viaEmail.length > 0) {
            return viaEmail[0];
        }

        const { data: viaUsername, error: errUser } = await klienBasisData
            .from(this.tabel)
            .select('*')
            .eq('username', bersih)
            .limit(1);

        if (!errUser && Array.isArray(viaUsername) && viaUsername.length > 0) {
            return viaUsername[0];
        }

        return null;
    }

    async login(email, kata_sandi) {
        const identifier = String(email || '').toLowerCase().trim();
        if (!identifier || !kata_sandi || typeof kata_sandi !== 'string') {
            throw new Error('Username/email dan kata sandi wajib diisi!');
        }

        if (!this.apakahDbAktif()) {
            throw new Error('Layanan autentikasi basis data tidak tersedia.');
        }

        const data = await this.cariPenggunaByIdentifier(identifier);
        if (!data) {
            throw new Error('Username/email atau kata sandi salah!');
        }

        const cocok = await this.cocokkanKataSandi(kata_sandi, data.kata_sandi);
        if (!cocok) {
            throw new Error('Username/email atau kata sandi salah!');
        }

        const token = jwt.sign(
            { id: data.id, peran: data.peran, email: data.email, nama: data.nama },
            ambilJwtSecret(),
            { expiresIn: '8h' }
        );
        const penggunaBersih = { ...data };
        delete penggunaBersih.kata_sandi;
        return { pengguna: penggunaBersih, token };
    }

    async gantiKataSandi(idPengguna, kataSandiLama, kataSandiBaru) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }
        if (!kataSandiLama || !kataSandiBaru || kataSandiBaru.length < 8) {
            throw new Error('Kata sandi lama wajib diisi dan kata sandi baru minimal 8 karakter.');
        }

        const { data: pengguna, error: errCek } = await klienBasisData
            .from(this.tabel)
            .select('kata_sandi')
            .eq('id', idPengguna)
            .single();

        if (errCek || !pengguna) throw new Error('Pengguna tidak ditemukan');

        const cocok = await this.cocokkanKataSandi(kataSandiLama, pengguna.kata_sandi);
        if (!cocok) throw new Error('Kata sandi lama salah');

        const salt = await bcrypt.genSalt(10);
        const hashBaru = await bcrypt.hash(kataSandiBaru, salt);

        const { error } = await klienBasisData
            .from(this.tabel)
            .update({ kata_sandi: hashBaru })
            .eq('id', idPengguna);

        if (error) throw error;
        return true;
    }

    async tambahPenggunaBaru(dataBaru) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }
        if (!dataBaru?.kata_sandi || String(dataBaru.kata_sandi).length < 8) {
            throw new Error('Kata sandi awal minimal 8 karakter!');
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(dataBaru.kata_sandi, salt);
        const payload = { ...dataBaru, kata_sandi: hashed };

        const { data, error } = await klienBasisData
            .from(this.tabel)
            .insert([payload])
            .select('id, nama, username, email, peran, bidang, dibuat_pada');

        if (error) throw error;
        return data;
    }

    async ambilSemuaPengguna() {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }
        const { data, error } = await klienBasisData
            .from(this.tabel)
            .select('id, nama, username, email, peran, bidang, dibuat_pada');

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // Hard reset kata sandi oleh Admin / Superadmin
    async adminResetKataSandi(idTarget, kataSandiBaru) {
        if (!kataSandiBaru || kataSandiBaru.length < 8) {
            throw new Error('Kata sandi baru minimal 8 karakter!');
        }
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }

        const salt = await bcrypt.genSalt(10);
        const hashBaru = await bcrypt.hash(kataSandiBaru, salt);

        const { error } = await klienBasisData
            .from(this.tabel)
            .update({ kata_sandi: hashBaru })
            .eq('id', idTarget);

        if (error) throw error;
        return true;
    }

    // Mengubah username pengguna oleh Admin / Superadmin
    async adminUbahUsername(idTarget, usernameBaru) {
        const usernameBersih = (usernameBaru || '').toLowerCase().trim();
        if (!usernameBersih || /\s/.test(usernameBersih)) {
            throw new Error('Username tidak boleh kosong atau mengandung spasi!');
        }
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }

        const { error } = await klienBasisData
            .from(this.tabel)
            .update({
                username: usernameBersih,
                email: `${usernameBersih}@manado.go.id`
            })
            .eq('id', idTarget);

        if (error) throw error;
        return true;
    }

    // Mengubah peran pengguna oleh Admin / Superadmin
    async adminUbahPeran(idTarget, peranBaru) {
        const peranValid = ['Admin', 'Kabid', 'Staf', 'Kadis', 'Superadmin'];
        if (!peranValid.includes(peranBaru)) {
            throw new Error('Peran yang dipilih tidak valid!');
        }
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }

        const { error } = await klienBasisData
            .from(this.tabel)
            .update({ peran: peranBaru })
            .eq('id', idTarget);

        if (error) throw error;
        return true;
    }

    // Menghapus akun pengguna oleh Admin / Superadmin
    async hapusPengguna(idTarget) {
        if (!this.apakahDbAktif()) {
            throw new Error('Basis data tidak tersedia.');
        }
        const { error } = await klienBasisData
            .from(this.tabel)
            .delete()
            .eq('id', idTarget);

        if (error) throw error;
        return true;
    }
}

module.exports = new PenggunaModel();
