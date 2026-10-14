const express = require('express');
const cors = require('cors');

// Impor rute
const rutePengguna = require('./routes/PenggunaRoutes');
const ruteInformasiPangan = require('./routes/InformasiPanganRoutes');
// Rute Bidang Cadangan dan Distribusi Pangan (Harga Pangan & Pemantauan Pasar)
const ruteHargaPangan = require('./routes/HargaPanganRoutes');

class ServerUtama {
    constructor() {
        this.aplikasi = express();
        this.port = process.env.PORT || 3000;
        this.konfigurasi();
        this.muatRute();
    }

    konfigurasi() {
        // Mengaktifkan CORS agar dapat diakses oleh Website dan Mobile (Ionic/Capacitor)
        this.aplikasi.use(cors());
        // Middleware parsing JSON body
        this.aplikasi.use(express.json());
        // Middleware parsing URL-encoded body
        this.aplikasi.use(express.urlencoded({ extended: true }));
    }

    muatRute() {
        // Mendaftarkan rute API Pengguna & Autentikasi
        this.aplikasi.use('/api/pengguna', rutePengguna);
        // Mendaftarkan rute Informasi Pangan
        this.aplikasi.use('/api/informasi-pangan', ruteInformasiPangan);
        // Mendaftarkan rute Harga Pangan (Bidang Cadangan dan Distribusi Pangan)
        this.aplikasi.use('/api/harga-pangan', ruteHargaPangan);

        this.aplikasi.get('/', (req, res) => {
            res.json({ 
                pesan: 'Selamat datang di API Dinas Pangan Kota Manado - SIPATOKAAN',
                bidang_aktif: 'Bidang Cadangan dan Distribusi Pangan'
            });
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
