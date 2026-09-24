const klienBasisData = require('../config/database');

class ModelInformasiPangan {
    constructor() {
        this.namaTabel = 'informasi_pangan';
    }

    async ambilSemuaData() {
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('*, pengguna(nama)')
            .order('dibuat_pada', { ascending: false });

        if (error) throw error;
        return data;
    }

    async ambilSatuData(id) {
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('*, pengguna(nama)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async tambahData(dataBaru) {
        // dataBaru: { judul, konten, kategori, gambar_url, penulis_id }
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .insert([dataBaru])
            .select();

        if (error) throw error;
        return data[0];
    }

    async perbaruiData(id, dataUpdate) {
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .update({ ...dataUpdate, diperbarui_pada: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    }

    async hapusData(id) {
        const { error } = await klienBasisData
            .from(this.namaTabel)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { berhasil: true };
    }
}

module.exports = new ModelInformasiPangan();
