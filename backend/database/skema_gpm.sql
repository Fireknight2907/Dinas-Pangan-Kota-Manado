-- ===================================================================================
-- SKEMA BASIS DATA: GERAKAN PANGAN MURAH (GPM) & PENDAFTARAN ANTREAN
-- Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
-- ===================================================================================

-- 1. Pastikan ekstensi UUID aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabel Acara GPM (Gerakan Pangan Murah)
CREATE TABLE IF NOT EXISTS acara_gpm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_acara VARCHAR(255) NOT NULL,
    lokasi VARCHAR(255) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL DEFAULT 'Wenang',
    tanggal DATE NOT NULL,
    jam_mulai VARCHAR(10) NOT NULL DEFAULT '08:00',
    jam_selesai VARCHAR(10) NOT NULL DEFAULT '14:00',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    kuota_maksimal INT NOT NULL DEFAULT 200,
    komoditas_tersedia TEXT,
    deskripsi TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Selesai', 'Dibatalkan')),
    petugas_id UUID REFERENCES pengguna(id) ON DELETE SET NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Pendaftar GPM (Masyarakat Mengambil Antrean & Barcode)
CREATE TABLE IF NOT EXISTS pendaftar_gpm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acara_id UUID NOT NULL REFERENCES acara_gpm(id) ON DELETE CASCADE,
    nama_pendaftar VARCHAR(150) NOT NULL,
    nomor_telepon VARCHAR(30) NOT NULL,
    nomor_antrean INT NOT NULL,
    kode_barcode VARCHAR(100) UNIQUE NOT NULL,
    status_kehadiran VARCHAR(30) NOT NULL DEFAULT 'Menunggu' CHECK (status_kehadiran IN ('Menunggu', 'Hadir', 'Batal')),
    waktu_kehadiran TIMESTAMP WITH TIME ZONE,
    petugas_verifikasi UUID REFERENCES pengguna(id) ON DELETE SET NULL,
    waktu_mendaftar TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat pencarian barcode oleh petugas saat scan
CREATE INDEX IF NOT EXISTS idx_pendaftar_gpm_barcode ON pendaftar_gpm(kode_barcode);
CREATE INDEX IF NOT EXISTS idx_pendaftar_gpm_acara ON pendaftar_gpm(acara_id);

-- Data Awal / Seed Acara GPM di Kota Manado
INSERT INTO acara_gpm (nama_acara, lokasi, kecamatan, tanggal, jam_mulai, jam_selesai, latitude, longitude, kuota_maksimal, komoditas_tersedia, deskripsi, status)
VALUES
(
    'Gerakan Pangan Murah (GPM) Sparta Tikala',
    'Lapangan Sparta Tikala (Depan Kantor Walikota Manado)',
    'Tikala',
    CURRENT_DATE + INTERVAL '2 day',
    '08:00',
    '13:00',
    1.4883,
    124.8436,
    250,
    'Beras SPHP 5kg (Rp 58.000), Minyak Goreng Minyakita 1L (Rp 15.000), Gula Pasir 1kg (Rp 16.500), Bawang Merah 1kg (Rp 28.000), Cabai Rawit 1kg (Rp 35.000)',
    'GPM Khusus stabilisasi pasokan pangan menyambut akhir pekan. Terbuka untuk seluruh warga Kota Manado.',
    'Aktif'
),
(
    'Gerakan Pangan Murah Karombasan Bersehati',
    'Pelataran Pasar Bersehati Karombasan',
    'Wanea',
    CURRENT_DATE + INTERVAL '5 day',
    '07:30',
    '12:30',
    1.4674,
    124.8468,
    300,
    'Beras Premium 5kg, Minyak Goreng Kita, Telur Ayam 1 Baki (Rp 52.000), Daging Ayam Segar',
    'Penyaluran komoditas pangan murah langsung dari produsen lokal untuk menekan laju inflasi.',
    'Aktif'
),
(
    'GPM Pesisir Utara Tuminting',
    'Halaman Kantor Kecamatan Tuminting',
    'Tuminting',
    CURRENT_DATE + INTERVAL '7 day',
    '08:30',
    '14:00',
    1.5126,
    124.8488,
    200,
    'Beras SPHP, Minyak Goreng Kemasan, Gula Pasir, Ikan Laut Segar, Bumbu Dapur Lengkap',
    'Gerakan Pangan Murah serentak untuk warga pesisir utara Kota Manado.',
    'Aktif'
)
ON CONFLICT DO NOTHING;
