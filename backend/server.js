const express = require('express');
const cors = require('cors');

// Impor rute
const rutePengguna = require('./routes/PenggunaRoutes');

class ServerUtama {
    constructor() {
        this.aplikasi = express();
        this.port = process.env.PORT || 3000;
        this.konfigurasi();
        this.muatRute();
    }

    konfigurasi() {
        this.aplikasi.use(cors());
        this.aplikasi.use(express.json());
        this.aplikasi.use(express.urlencoded({ extended: true }));
    }

    muatRute() {
        // Mendaftarkan rute API
        this.aplikasi.use('/api/pengguna', rutePengguna);

        this.aplikasi.get('/', (req, res) => {
            res.json({ pesan: 'Selamat datang di API Dinas Pangan' });
        });
    }

    jalankan() {
        this.aplikasi.listen(this.port, () => {
            console.log(`Server jalan di port ${this.port}`);
        });
    }
}

const server = new ServerUtama();
server.jalankan();
