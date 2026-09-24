const klienBasisData = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class PenggunaModel {
    constructor() {
        this.tabel = 'pengguna';
        this.rahasia = process.env.JWT_SECRET || 'rahasia_super_aman_123';
    }

    async login(email, kata_sandi) {
        const { data, error } = await klienBasisData
            .from(this.tabel)
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) throw new Error('Email tidak ditemukan');

        const cocok = await bcrypt.compare(kata_sandi, data.kata_sandi);
        if (!cocok) throw new Error('Kata sandi salah');

        const token = jwt.sign({ id: data.id, peran: data.peran, email: data.email }, this.rahasia, { expiresIn: '1d' });
        delete data.kata_sandi; // Jangan kirim kata sandi kembali
        return { pengguna: data, token };
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
        const { data, error } = await klienBasisData
            .from(this.tabel)
            .select('id, nama, email, peran, bidang, dibuat_pada');
        
        if (error) throw error;
        return data;
    }
}

module.exports = new PenggunaModel();
