-- ====================================================================
-- SKRIP INISIALISASI BASIS DATA MANDIRI (POSTGRESQL ON-PREMISE)
-- SISTEM INFORMASI PANGAN KOTA MANADO (SIPATOKAAN)
-- DINAS PANGAN PEMERINTAH KOTA MANADO
-- ====================================================================
-- Skrip ini digunakan jika klien / dinas ingin melakukan hosting mandiri
-- di luar Supabase (menggunakan server PostgreSQL lokal / VPS / Docker).
-- ====================================================================

-- 1. Ekstensi UUID & Kriptografi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Bersihkan tabel lama jika ada
DROP TABLE IF EXISTS pendaftar_gpm CASCADE;
DROP TABLE IF EXISTS acara_gpm CASCADE;
DROP TABLE IF EXISTS harga_pangan CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;
DROP TABLE IF EXISTS master_pasar CASCADE;
DROP TABLE IF EXISTS master_kecamatan CASCADE;

-- 3. Tabel Pengguna (Petugas & Pejabat Kedinasan)
CREATE TABLE pengguna (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(150) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    kata_sandi VARCHAR(255) NOT NULL,
    peran VARCHAR(50) NOT NULL,
    bidang VARCHAR(150) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    foto_profil TEXT DEFAULT '',
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Acara GPM (Gerakan Pangan Murah)
CREATE TABLE acara_gpm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_acara VARCHAR(255) NOT NULL,
    lokasi VARCHAR(255) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL DEFAULT 'Wenang',
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_mulai VARCHAR(10) NOT NULL DEFAULT '08:00',
    jam_selesai VARCHAR(10) NOT NULL DEFAULT '14:00',
    latitude DOUBLE PRECISION NOT NULL DEFAULT 1.4883,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 124.8436,
    kuota_maksimal INT NOT NULL DEFAULT 250,
    komoditas_tersedia TEXT,
    deskripsi TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Aktif',
    petugas_id UUID,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Pendaftar GPM (Antrean Warga & Barcode)
CREATE TABLE pendaftar_gpm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acara_id UUID NOT NULL REFERENCES acara_gpm(id) ON DELETE CASCADE,
    nama_pendaftar VARCHAR(150) NOT NULL,
    nomor_telepon VARCHAR(30),
    nik VARCHAR(20),
    nomor_antrean INT NOT NULL,
    kode_barcode VARCHAR(100) UNIQUE NOT NULL,
    jalur_pendaftaran VARCHAR(30) DEFAULT 'Daring',
    status_kehadiran VARCHAR(30) NOT NULL DEFAULT 'Menunggu',
    waktu_kehadiran TIMESTAMP WITH TIME ZONE,
    petugas_verifikasi UUID,
    waktu_mendaftar TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pendaftar_acara ON pendaftar_gpm(acara_id);
CREATE INDEX idx_pendaftar_barcode ON pendaftar_gpm(kode_barcode);

-- 6. Tabel Harga Pangan (Pemantauan Pasar)
CREATE TABLE harga_pangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Bahan Pokok',
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    harga NUMERIC(12, 2) NOT NULL,
    nama_pasar VARCHAR(150) NOT NULL,
    tanggal_penetapan VARCHAR(50) NOT NULL DEFAULT '18 November 2026',
    status VARCHAR(30) NOT NULL DEFAULT 'Terbit',
    catatan_perubahan TEXT DEFAULT '',
    bidang VARCHAR(100) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    petugas_id UUID,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Master Wilayah & Pasar
CREATE TABLE master_kecamatan (
    id SERIAL PRIMARY KEY,
    nama_kecamatan VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE master_pasar (
    id SERIAL PRIMARY KEY,
    nama_pasar VARCHAR(150) UNIQUE NOT NULL,
    kecamatan VARCHAR(100) NOT NULL
);

-- ====================================================================
-- DATA AWAL RESMI (SEED DATA)
-- ====================================================================

-- Data Pengguna Utama (Akun Tunggal Administrator Bawaan - Username: admin / Password: admin)
-- Salt: SIPATOKAAN_MANADO_2026_SECURE_SALT
INSERT INTO pengguna (nama, username, email, kata_sandi, peran, bidang) VALUES
('Administrator', 'admin', 'admin@manado.go.id', 'bfdbf1ca1799b68e56f988a0c60fe4dfebcc377c4f3d21680bcc1eaca9b587c3', 'Superadmin', 'Administrator Sistem');

-- Master Kecamatan Kota Manado
INSERT INTO master_kecamatan (nama_kecamatan) VALUES
('Wenang'), ('Sario'), ('Malalayang'), ('Tikala'), ('Wanea'), 
('Mapanget'), ('Singkil'), ('Tuminting'), ('Bunaken'), ('Bunaken Kepulauan'), ('Paal Dua');

-- Master Pasar Resmi Kota Manado
INSERT INTO master_pasar (nama_pasar, kecamatan) VALUES
('Pasar Bersehati', 'Wenang'),
('Pasar Pinasungkulan Karombasan', 'Wanea'),
('Pasar Tuminting', 'Tuminting');

-- Data Harga Pangan Awal (15 Komoditas Terbit)
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status) VALUES
('Beras Premium', 'Bahan Pokok', 'kg', 16500, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Beras Medium SPHP', 'Bahan Pokok', 'kg', 12500, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Bawang Merah', 'Bumbu Dapur', 'kg', 42000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Bawang Putih Honan', 'Bumbu Dapur', 'kg', 38000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Cabai Rawit Merah (Rica)', 'Bumbu Dapur', 'kg', 55000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Cabai Keriting', 'Bumbu Dapur', 'kg', 40000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Daging Sapi Paha Belakang', 'Daging & Unggas', 'kg', 135000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Daging Ayam Ras Segar', 'Daging & Unggas', 'kg', 36000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Telur Ayam Ras', 'Bahan Pokok', 'kg', 32000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Gula Pasir Kristal Putih', 'Bahan Pokok', 'kg', 17500, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Minyak Goreng Curah', 'Bahan Pokok', 'liter', 16000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Minyakita Botol', 'Bahan Pokok', 'liter', 15500, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Tepung Terigu Segitiga', 'Bahan Pokok', 'kg', 12000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Kedelai Impor', 'Bahan Pokok', 'kg', 14000, 'Pasar Bersehati', '18 November 2026', 'Terbit'),
('Ikan Tongkol Segar', 'Ikan & Hasil Laut', 'kg', 30000, 'Pasar Bersehati', '18 November 2026', 'Terbit');

-- Data Acara GPM Awal
INSERT INTO acara_gpm (nama_acara, lokasi, kecamatan, tanggal, jam_mulai, jam_selesai, kuota_maksimal, komoditas_tersedia, status) VALUES
('GPM Lapangan Sparta Tikala', 'Depan Kantor Walikota Manado', 'Tikala', CURRENT_DATE + INTERVAL '1 day', '08:00', '13:00', 300, 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg, Telur Ayam', 'Aktif'),
('GPM Kantor Camat Sario', 'Halaman Parkir Kantor Camat Sario', 'Sario', CURRENT_DATE + INTERVAL '3 day', '08:30', '14:00', 250, 'Beras SPHP 5kg, Minyakita 1L, Bawang Merah, Bawang Putih', 'Aktif');

