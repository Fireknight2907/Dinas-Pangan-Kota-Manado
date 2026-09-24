const klienBasisData = require('../config/database');

class ModelInformasiPangan {
    constructor() {
        this.namaTabel = 'informasi_pangan';
    }

    async ambilSemuaData() {
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .select('*')
            .order('dibuat_pada', { ascending: false });

        if (error) throw error;
        return data;
    }

    async tambahData(dataBaru) {
        // dataBaru berisi: { judul, konten, penulis_id }
        const { data, error } = await klienBasisData
            .from(this.namaTabel)
            .insert([dataBaru])
            .select();

        if (error) throw error;
        return data;
    }
}

module.exports = new ModelInformasiPangan();
