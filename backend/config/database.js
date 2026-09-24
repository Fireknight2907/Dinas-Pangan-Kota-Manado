require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class BasisData {
    constructor() {
        this.supabaseUrl = process.env.URL_SUPABASE || '';
        this.supabaseKey = process.env.KUNCI_SUPABASE || '';
        this.klien = null;
    }

    koneksikan() {
        if (!this.klien) {
            try {
                this.klien = createClient(this.supabaseUrl, this.supabaseKey);
                console.log('Berhasil terhubung ke Supabase');
            } catch (error) {
                console.error('Gagal terhubung ke Supabase:', error.message);
            }
        }
        return this.klien;
    }
}

const db = new BasisData();
module.exports = db.koneksikan();
