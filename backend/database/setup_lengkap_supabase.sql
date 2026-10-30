-- ====================================================================
-- SKRIP SETUP RESMI SUPABASE - DINAS PANGAN KOTA MANADO (SIPATOKAAN)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Hapus tabel lama yang kosong agar skema bersih dan terhindar dari bentrok kolom
DROP TABLE IF EXISTS pendaftar_gpm CASCADE;
DROP TABLE IF EXISTS acara_gpm CASCADE;
DROP TABLE IF EXISTS harga_pangan CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;

-- 2. Buat Tabel Pengguna (Admin, Kadis, Kabid, Staf)
CREATE TABLE pengguna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(150) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    kata_sandi VARCHAR(255) NOT NULL,
    peran VARCHAR(50) NOT NULL,
    bidang VARCHAR(150) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    foto_profil TEXT DEFAULT '',
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Buat Tabel Acara GPM (Gerakan Pangan Murah)
CREATE TABLE acara_gpm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 4. Buat Tabel Pendaftar GPM (Antrean & Barcode Warga)
CREATE TABLE pendaftar_gpm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acara_id UUID NOT NULL REFERENCES acara_gpm(id) ON DELETE CASCADE,
    nama_pendaftar VARCHAR(150) NOT NULL,
    nomor_telepon VARCHAR(30) NOT NULL,
    nomor_antrean INT NOT NULL,
    kode_barcode VARCHAR(100) UNIQUE NOT NULL,
    status_kehadiran VARCHAR(30) NOT NULL DEFAULT 'Menunggu',
    waktu_kehadiran TIMESTAMP WITH TIME ZONE,
    petugas_verifikasi UUID,
    waktu_mendaftar TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Buat Tabel Harga Pangan
CREATE TABLE harga_pangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Bahan Pokok',
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    harga NUMERIC(12, 2) NOT NULL,
    nama_pasar VARCHAR(150) NOT NULL,
    tanggal_penetapan VARCHAR(50) NOT NULL DEFAULT '14 Oktober 2026',
    status VARCHAR(30) NOT NULL DEFAULT 'Terbit',
    catatan_perubahan TEXT DEFAULT '',
    bidang VARCHAR(100) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    petugas_id UUID,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Aktifkan RLS dan Berikan Hak Akses Penuh untuk Web & Mobile (Anon & Auth)
-- Menghilangkan dialog "Potential issue detected" di Supabase
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE acara_gpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendaftar_gpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE harga_pangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik pengguna" ON pengguna;
CREATE POLICY "Akses publik pengguna" ON pengguna FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik acara_gpm" ON acara_gpm;
CREATE POLICY "Akses publik acara_gpm" ON acara_gpm FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik pendaftar_gpm" ON pendaftar_gpm;
CREATE POLICY "Akses publik pendaftar_gpm" ON pendaftar_gpm FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik harga_pangan" ON harga_pangan;
CREATE POLICY "Akses publik harga_pangan" ON harga_pangan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy untuk informasi_pangan jika ada
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'informasi_pangan') THEN
        ALTER TABLE informasi_pangan ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Akses publik informasi_pangan" ON informasi_pangan;
        CREATE POLICY "Akses publik informasi_pangan" ON informasi_pangan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. Data Master Akun Petugas & Pimpinan
INSERT INTO pengguna (nama, username, email, kata_sandi, peran, bidang) VALUES
('Effrend', 'effrend', 'effrend@manado.go.id', '12345678', 'Staf', 'Bidang Cadangan dan Distribusi Pangan'),
('Regina', 'regina', 'regina@manado.go.id', '12345678', 'Admin', 'Administrator Sistem (Superadmin)'),
('Mareta', 'mareta', 'mareta@manado.go.id', '12345678', 'Kabid', 'Kepala Bidang Cadangan & Distribusi Pangan'),
('Edrick', 'edrick', 'edrick@manado.go.id', '12345678', 'Admin', 'Administrator Sistem (Superadmin)'),
('Roni Tilaar', 'roni', 'roni@manado.go.id', '12345678', 'Petugas', 'Bidang Cadangan dan Distribusi Pangan'),
('Kepala Dinas Pangan', 'kadis', 'kadis@manado.go.id', '12345678', 'Kadis', 'Pimpinan Dinas Pangan Kota Manado');

-- 8. Data Awal Komoditas Harga Pangan
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status) VALUES
('Beras Medium', 'Bahan Pokok', 'kg', 13500, 'Pasar Bersehati Karombasan', '14 Oktober 2026', 'Terbit'),
('Minyak Goreng Kemasan', 'Bahan Pokok', 'liter', 18000, 'Pasar Tradisional Tuminting', '14 Oktober 2026', 'Draft'),
('Gula Pasir', 'Bahan Pokok', 'kg', 16000, 'Pasar Bersehati Sario', '14 Oktober 2026', 'Terbit'),
('Beras Premium', 'Bahan Pokok', 'kg', 15500, 'Pasar Bersehati Karombasan', '8 Oktober 2026', 'Terbit'),
('Telur Ayam', 'Hewani', 'kg', 28000, 'Pasar Bersehati Sario', '8 Oktober 2026', 'Terbit'),
('Daging Ayam', 'Hewani', 'kg', 38000, 'Pasar Bersehati Sario', '8 Oktober 2026', 'Terbit'),
('Daging Sapi', 'Hewani', 'kg', 135000, 'Pasar Tradisional Bahu', '8 Oktober 2026', 'Terbit'),
('Bawang Merah', 'Sayuran', 'kg', 32000, 'Pasar Tradisional Bahu', '8 Oktober 2026', 'Terbit'),
('Bawang Putih', 'Sayuran', 'kg', 35000, 'Pasar Bersehati Karombasan', '8 Oktober 2026', 'Terbit');

-- 9. Data Awal Jadwal Acara GPM (Gerakan Pangan Murah)
INSERT INTO acara_gpm (nama_acara, lokasi, kecamatan, tanggal, jam_mulai, jam_selesai, latitude, longitude, kuota_maksimal, komoditas_tersedia, deskripsi, status)
VALUES
('GPM Lapangan Sparta Tikala', 'Depan Kantor Walikota Manado', 'Tikala', CURRENT_DATE + INTERVAL '2 day', '08:00', '13:00', 1.4883, 124.8436, 250, 'Beras SPHP 5kg (Rp 58.000), Minyakita 1L (Rp 15.000), Gula 1kg (Rp 16.500)', 'Stabilisasi pasokan pangan warga Manado.', 'Aktif'),
('GPM Pelataran Bersehati Karombasan', 'Pasar Bersehati Karombasan', 'Wanea', CURRENT_DATE + INTERVAL '5 day', '07:30', '12:30', 1.4674, 124.8468, 300, 'Beras Premium, Minyakita, Telur Ayam 1 Baki (Rp 52.000)', 'Penyaluran komoditas langsung dari distributor resmi.', 'Aktif');
