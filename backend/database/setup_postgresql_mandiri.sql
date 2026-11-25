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
DROP TABLE IF EXISTS riwayat_harga_pangan CASCADE;
DROP TABLE IF EXISTS pendaftar_gpm CASCADE;
DROP TABLE IF EXISTS acara_gpm CASCADE;
DROP TABLE IF EXISTS harga_pangan CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;
DROP TABLE IF EXISTS master_satuan CASCADE;
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
    prioritas_tampil INT NOT NULL DEFAULT 50,
    jumlah_dilihat INT NOT NULL DEFAULT 0,
    catatan_perubahan TEXT DEFAULT '',
    bidang VARCHAR(100) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    petugas_id UUID,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6b. Tabel Riwayat Harga Pangan (Pencatatan Otomatis Perubahan Harga Terbit)
CREATE TABLE riwayat_harga_pangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    harga_pangan_id UUID REFERENCES harga_pangan(id) ON DELETE CASCADE,
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Bahan Pokok',
    nama_pasar VARCHAR(150) NOT NULL,
    satuan VARCHAR(30) NOT NULL DEFAULT '1 KG',
    harga_lama NUMERIC(12, 2),
    harga_baru NUMERIC(12, 2) NOT NULL,
    selisih NUMERIC(12, 2) NOT NULL DEFAULT 0,
    keterangan TEXT DEFAULT '',
    dicatat_pada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_harga_pangan_prioritas ON harga_pangan (prioritas_tampil ASC, jumlah_dilihat DESC, diperbarui_pada DESC);
CREATE INDEX idx_riwayat_harga_komoditas_waktu ON riwayat_harga_pangan (LOWER(TRIM(nama_komoditas)), dicatat_pada DESC);
CREATE INDEX idx_riwayat_harga_id ON riwayat_harga_pangan (harga_pangan_id, dicatat_pada DESC);

CREATE OR REPLACE FUNCTION fn_set_diperbarui_pada_harga()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.nama_komoditas IS DISTINCT FROM OLD.nama_komoditas)
       OR (NEW.kategori IS DISTINCT FROM OLD.kategori)
       OR (NEW.satuan IS DISTINCT FROM OLD.satuan)
       OR (NEW.harga IS DISTINCT FROM OLD.harga)
       OR (NEW.nama_pasar IS DISTINCT FROM OLD.nama_pasar)
       OR (NEW.status IS DISTINCT FROM OLD.status)
       OR (NEW.tanggal_penetapan IS DISTINCT FROM OLD.tanggal_penetapan) THEN
        NEW.diperbarui_pada := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_diperbarui_pada_harga
    BEFORE UPDATE ON harga_pangan
    FOR EACH ROW EXECUTE FUNCTION fn_set_diperbarui_pada_harga();

CREATE OR REPLACE FUNCTION fn_catat_riwayat_harga_terbit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_harga_lama NUMERIC(12, 2);
    v_selisih    NUMERIC(12, 2);
    v_ket        TEXT;
BEGIN
    IF LOWER(COALESCE(NEW.status, '')) <> 'terbit' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO riwayat_harga_pangan (
            harga_pangan_id, nama_komoditas, kategori, nama_pasar, satuan,
            harga_lama, harga_baru, selisih, keterangan, dicatat_pada
        ) VALUES (
            NEW.id, NEW.nama_komoditas, COALESCE(NEW.kategori, 'Bahan Pokok'),
            NEW.nama_pasar, COALESCE(NEW.satuan, '1 KG'),
            NULL, NEW.harga, 0,
            COALESCE(NULLIF(TRIM(NEW.catatan_perubahan), ''), 'Penetapan harga resmi awal'),
            COALESCE(NEW.diperbarui_pada, NEW.dibuat_pada, CURRENT_TIMESTAMP)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF LOWER(COALESCE(OLD.status, '')) <> 'terbit' THEN
            SELECT r.harga_baru INTO v_harga_lama
              FROM riwayat_harga_pangan r
             WHERE r.harga_pangan_id = NEW.id
                OR (LOWER(TRIM(r.nama_komoditas)) = LOWER(TRIM(NEW.nama_komoditas))
                    AND LOWER(TRIM(r.nama_pasar)) = LOWER(TRIM(NEW.nama_pasar)))
             ORDER BY r.dicatat_pada DESC LIMIT 1;

            IF v_harga_lama IS NULL OR v_harga_lama IS DISTINCT FROM NEW.harga THEN
                v_selisih := CASE WHEN v_harga_lama IS NULL THEN 0 ELSE NEW.harga - v_harga_lama END;
                v_ket := CASE
                    WHEN v_harga_lama IS NULL THEN 'Diterbitkan pertama kali (Terverifikasi Kabid)'
                    ELSE COALESCE(NULLIF(TRIM(NEW.catatan_perubahan), ''), 'Perubahan harga terverifikasi Kabid')
                END;
                INSERT INTO riwayat_harga_pangan (
                    harga_pangan_id, nama_komoditas, kategori, nama_pasar, satuan,
                    harga_lama, harga_baru, selisih, keterangan, dicatat_pada
                ) VALUES (
                    NEW.id, NEW.nama_komoditas, COALESCE(NEW.kategori, 'Bahan Pokok'),
                    NEW.nama_pasar, COALESCE(NEW.satuan, '1 KG'),
                    v_harga_lama, NEW.harga, v_selisih, v_ket, CURRENT_TIMESTAMP
                );
            END IF;
        ELSIF NEW.harga IS DISTINCT FROM OLD.harga THEN
            INSERT INTO riwayat_harga_pangan (
                harga_pangan_id, nama_komoditas, kategori, nama_pasar, satuan,
                harga_lama, harga_baru, selisih, keterangan, dicatat_pada
            ) VALUES (
                NEW.id, NEW.nama_komoditas, COALESCE(NEW.kategori, 'Bahan Pokok'),
                NEW.nama_pasar, COALESCE(NEW.satuan, '1 KG'),
                OLD.harga, NEW.harga, NEW.harga - OLD.harga,
                COALESCE(NULLIF(TRIM(NEW.catatan_perubahan), ''), 'Penyesuaian harga resmi'),
                CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_catat_riwayat_harga_terbit
    AFTER INSERT OR UPDATE ON harga_pangan
    FOR EACH ROW EXECUTE FUNCTION fn_catat_riwayat_harga_terbit();

-- 7. Tabel Master Wilayah, Pasar & Satuan (Terkunci per 1)
CREATE TABLE master_satuan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_satuan VARCHAR(50) UNIQUE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_kecamatan (
    id SERIAL PRIMARY KEY,
    nama_kecamatan VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE master_pasar (
    id SERIAL PRIMARY KEY,
    nama_pasar VARCHAR(150) UNIQUE NOT NULL,
    kecamatan VARCHAR(100) DEFAULT 'Manado'
);

-- ====================================================================
-- DATA AWAL RESMI (SEED DATA)
-- ====================================================================

-- Data Pengguna Utama (Akun Tunggal Bawaan - Username: admin / Password: admin)
-- Salt: SIPATOKAAN_MANADO_2026_SECURE_SALT
INSERT INTO pengguna (nama, username, email, kata_sandi, peran, bidang) VALUES
('Admin', 'admin', 'admin@manado.go.id', 'bfdbf1ca1799b68e56f988a0c60fe4dfebcc377c4f3d21680bcc1eaca9b587c3', 'Admin', 'Admin');

-- Master Satuan Resmi (Terkunci per 1)
INSERT INTO master_satuan (nama_satuan) VALUES
('1 KG'), ('1 Liter'), ('1 Baki'), ('1 Ikat'), ('1 Ekor'), ('1 Bungkus');

-- Master Kecamatan Kota Manado
INSERT INTO master_kecamatan (nama_kecamatan) VALUES
('Wenang'), ('Sario'), ('Malalayang'), ('Tikala'), ('Wanea'), 
('Mapanget'), ('Singkil'), ('Tuminting'), ('Bunaken'), ('Bunaken Kepulauan'), ('Paal Dua');

-- Master Pasar Resmi Kota Manado
INSERT INTO master_pasar (nama_pasar, kecamatan) VALUES
('Pasar Bersehati', 'Wenang'),
('Pasar Pinasungkulan Karombasan', 'Wanea'),
('Pasar Tuminting', 'Tuminting');

-- Data Harga Pangan Awal (15 Komoditas Terbit - Satuan terkunci per 1)
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status, prioritas_tampil) VALUES
('Beras Premium', 'Bahan Pokok', '1 KG', 16500, 'Pasar Bersehati', '18 November 2026', 'Terbit', 10),
('Beras Medium SPHP', 'Bahan Pokok', '1 KG', 12500, 'Pasar Bersehati', '18 November 2026', 'Terbit', 10),
('Bawang Merah', 'Sayuran', '1 KG', 42000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 25),
('Bawang Putih Honan', 'Sayuran', '1 KG', 38000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 26),
('Cabai Rawit Merah (Rica)', 'Sayuran', '1 KG', 55000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 22),
('Cabai Keriting', 'Sayuran', '1 KG', 40000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 23),
('Daging Sapi Paha Belakang', 'Hewani', '1 KG', 135000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 40),
('Daging Ayam Ras Segar', 'Hewani', '1 KG', 36000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 35),
('Telur Ayam Ras', 'Hewani', '1 KG', 32000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 30),
('Gula Pasir Kristal Putih', 'Bahan Pokok', '1 KG', 17500, 'Pasar Bersehati', '18 November 2026', 'Terbit', 20),
('Minyak Goreng Curah', 'Bahan Pokok', '1 Liter', 16000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 15),
('Minyakita Botol', 'Bahan Pokok', '1 Liter', 15500, 'Pasar Bersehati', '18 November 2026', 'Terbit', 15),
('Tepung Terigu Segitiga', 'Bahan Pokok', '1 KG', 12000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 42),
('Kedelai Impor', 'Bahan Pokok', '1 KG', 14000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 44),
('Ikan Tongkol Segar', 'Hewani', '1 KG', 30000, 'Pasar Bersehati', '18 November 2026', 'Terbit', 36);

-- Data Acara GPM Awal
INSERT INTO acara_gpm (nama_acara, lokasi, kecamatan, tanggal, jam_mulai, jam_selesai, kuota_maksimal, komoditas_tersedia, status) VALUES
('GPM Lapangan Sparta Tikala', 'Depan Kantor Walikota Manado', 'Tikala', CURRENT_DATE + INTERVAL '1 day', '08:00', '13:00', 300, 'Beras SPHP 5kg, Minyakita 1L, Gula Pasir 1kg, Telur Ayam', 'Aktif'),
('GPM Kantor Camat Sario', 'Halaman Parkir Kantor Camat Sario', 'Sario', CURRENT_DATE + INTERVAL '3 day', '08:30', '14:00', 250, 'Beras SPHP 5kg, Minyakita 1L, Bawang Merah, Bawang Putih', 'Aktif');

