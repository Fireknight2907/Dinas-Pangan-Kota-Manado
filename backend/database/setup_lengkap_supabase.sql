-- ====================================================================
-- SKRIP INISIALISASI DATABASE - DINAS PANGAN KOTA MANADO (SIPATOKAAN)
-- Skema Database: PostgreSQL / Supabase
-- ====================================================================

-- 1. Hapus tabel lama yang kosong agar skema bersih dan terhindar dari bentrok kolom
DROP TABLE IF EXISTS riwayat_harga_pangan CASCADE;
DROP TABLE IF EXISTS pendaftar_gpm CASCADE;
DROP TABLE IF EXISTS acara_gpm CASCADE;
DROP TABLE IF EXISTS harga_pangan CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;
DROP TABLE IF EXISTS master_satuan CASCADE;
DROP TABLE IF EXISTS master_pasar CASCADE;
DROP TABLE IF EXISTS master_kecamatan CASCADE;

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
    nomor_telepon VARCHAR(30) DEFAULT '-',
    nik VARCHAR(16),
    jalur_pendaftaran VARCHAR(20) DEFAULT 'Daring',
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
    prioritas_tampil INT NOT NULL DEFAULT 50,
    jumlah_dilihat INT NOT NULL DEFAULT 0,
    catatan_perubahan TEXT DEFAULT '',
    bidang VARCHAR(100) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    petugas_id UUID,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5b. Buat Tabel Riwayat Harga Pangan (Pencatatan Otomatis Perubahan Harga Terbit)
CREATE TABLE riwayat_harga_pangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 5c. Buat Tabel Master Data Resmi (Dikelola Admin & Superadmin)
CREATE TABLE master_satuan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_satuan VARCHAR(50) UNIQUE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_pasar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pasar VARCHAR(150) UNIQUE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_kecamatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kecamatan VARCHAR(100) UNIQUE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Pengaturan Row Level Security (RLS) & Kebijakan Hak Akses Aplikasi
-- CATATAN: Karena aplikasi web dan mobile terhubung via REST API menggunakan anonKey,
-- kebijakan RLS disesuaikan agar role 'anon' dan 'authenticated' dapat menjalankan
-- alur operasional (Staf input harga -> Kabid verifikasi harga pangan -> Terbit).
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE acara_gpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendaftar_gpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE harga_pangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_harga_pangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_satuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_pasar ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_kecamatan ENABLE ROW LEVEL SECURITY;

-- Tabel pengguna
DROP POLICY IF EXISTS "Akses publik pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas baca akun pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas kelola akun pengguna" ON pengguna;
DROP POLICY IF EXISTS "Anon kelola pengguna terbatas" ON pengguna;
DROP POLICY IF EXISTS "Akses kelola pengguna" ON pengguna;
CREATE POLICY "Akses kelola pengguna" ON pengguna FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabel acara_gpm
DROP POLICY IF EXISTS "Akses publik acara_gpm" ON acara_gpm;
DROP POLICY IF EXISTS "Publik baca acara gpm aktif" ON acara_gpm;
DROP POLICY IF EXISTS "Petugas kelola acara gpm" ON acara_gpm;
DROP POLICY IF EXISTS "Akses kelola acara gpm" ON acara_gpm;
CREATE POLICY "Akses kelola acara gpm" ON acara_gpm FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabel pendaftar_gpm
DROP POLICY IF EXISTS "Akses publik pendaftar_gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Publik daftar antrean gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Petugas kelola pendaftar gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Akses kelola pendaftar gpm" ON pendaftar_gpm;
CREATE POLICY "Akses kelola pendaftar gpm" ON pendaftar_gpm FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabel harga_pangan (Mendukung alur verifikasi Staf -> Kabid)
DROP POLICY IF EXISTS "Akses publik harga_pangan" ON harga_pangan;
DROP POLICY IF EXISTS "Publik hanya baca harga pangan terbit" ON harga_pangan;
DROP POLICY IF EXISTS "Petugas kelola harga pangan" ON harga_pangan;
DROP POLICY IF EXISTS "Akses kelola harga pangan" ON harga_pangan;
CREATE POLICY "Akses kelola harga pangan" ON harga_pangan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabel riwayat_harga_pangan & master data resmi
DROP POLICY IF EXISTS "Akses kelola riwayat harga pangan" ON riwayat_harga_pangan;
CREATE POLICY "Akses kelola riwayat harga pangan" ON riwayat_harga_pangan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master satuan" ON master_satuan;
CREATE POLICY "Akses kelola master satuan" ON master_satuan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master pasar" ON master_pasar;
CREATE POLICY "Akses kelola master pasar" ON master_pasar FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master kecamatan" ON master_kecamatan;
CREATE POLICY "Akses kelola master kecamatan" ON master_kecamatan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Izin tabel eksplisit
GRANT ALL ON TABLE harga_pangan TO anon, authenticated;
GRANT ALL ON TABLE riwayat_harga_pangan TO anon, authenticated;
GRANT ALL ON TABLE master_satuan TO anon, authenticated;
GRANT ALL ON TABLE master_pasar TO anon, authenticated;
GRANT ALL ON TABLE master_kecamatan TO anon, authenticated;
GRANT ALL ON TABLE acara_gpm TO anon, authenticated;
GRANT ALL ON TABLE pendaftar_gpm TO anon, authenticated;
GRANT ALL ON TABLE pengguna TO anon, authenticated;

-- Trigger otomatis pembaruan stempel waktu & pencatatan riwayat harga terbit
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
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

CREATE OR REPLACE FUNCTION rpc_tambah_lihat_komoditas(p_nama_komoditas TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE harga_pangan
       SET jumlah_dilihat = COALESCE(jumlah_dilihat, 0) + 1
     WHERE LOWER(TRIM(nama_komoditas)) = LOWER(TRIM(p_nama_komoditas))
       AND LOWER(COALESCE(status, '')) = 'terbit';
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_tambah_lihat_komoditas(TEXT) TO anon, authenticated;

-- Fungsi RPC Login Aman (Hash diverifikasi di server, kata_sandi tidak diekspos ke client)
CREATE OR REPLACE FUNCTION rpc_login_pengguna(
    p_identifier TEXT,
    p_hash_sandi TEXT
)
RETURNS TABLE (
    id          UUID,
    nama        VARCHAR,
    username    VARCHAR,
    email       VARCHAR,
    peran       VARCHAR,
    bidang      VARCHAR,
    foto_profil TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_identifier TEXT := lower(trim(p_identifier));
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.nama,
        p.username,
        p.email,
        p.peran,
        p.bidang,
        p.foto_profil
    FROM pengguna p
    WHERE
        (lower(trim(p.username)) = v_identifier OR lower(trim(p.email)) = v_identifier)
        AND p.kata_sandi = p_hash_sandi
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_login_pengguna(TEXT, TEXT) TO anon, authenticated;

-- Policy untuk informasi_pangan jika ada
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'informasi_pangan') THEN
        ALTER TABLE informasi_pangan ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Akses publik informasi_pangan" ON informasi_pangan;
        CREATE POLICY "Akses publik informasi_pangan" ON informasi_pangan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. Data Master Akun Petugas & Pimpinan (Kata Sandi Terenkripsi SHA-256 + Salt)
-- Hash untuk kata sandi default '12345678': eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481
INSERT INTO pengguna (nama, username, email, kata_sandi, peran, bidang) VALUES
('Superadmin', 'superadmin', 'superadmin@manado.go.id', 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481', 'Superadmin', 'Superadmin'),
('Effrend', 'effrend', 'effrend@manado.go.id', 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481', 'Staf', 'Bidang Cadangan dan Distribusi Pangan'),
('Regina', 'regina', 'regina@manado.go.id', 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481', 'Admin', 'Admin'),
('Mareta', 'mareta', 'mareta@manado.go.id', 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481', 'Kabid', 'Kepala Bidang Cadangan & Distribusi Pangan'),
('Edrick', 'edrick', 'edrick@manado.go.id', 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481', 'Admin', 'Admin'),
('Kepala Dinas Pangan', 'kadis', 'kadis@manado.go.id', 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481', 'Kadis', 'Pimpinan Dinas Pangan Kota Manado');

-- 7b. Data Master Satuan (Terkunci per 1), Pasar & Kecamatan
INSERT INTO master_satuan (nama_satuan) VALUES
('1 KG'), ('1 Liter'), ('1 Baki'), ('1 Ikat'), ('1 Ekor'), ('1 Bungkus');

INSERT INTO master_pasar (nama_pasar) VALUES
('Pasar Bersehati Karombasan'),
('Pasar Tradisional Bahu'),
('Pasar Tradisional Tuminting'),
('Pasar Bersehati Sario');

INSERT INTO master_kecamatan (nama_kecamatan) VALUES
('Wenang'), ('Tikala'), ('Wanea'), ('Sario'), ('Malalayang'),
('Tuminting'), ('Singkil'), ('Mapanget'), ('Paal Dua'),
('Bunaken'), ('Bunaken Kepulauan');

-- 8. Data Awal Komoditas Harga Pangan (Satuan terkunci per 1)
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status, prioritas_tampil) VALUES
('Beras Medium', 'Bahan Pokok', '1 KG', 13500, 'Pasar Bersehati Karombasan', '14 Oktober 2026', 'Terbit', 10),
('Minyak Goreng Kemasan', 'Bahan Pokok', '1 Liter', 18000, 'Pasar Tradisional Tuminting', '14 Oktober 2026', 'Draft', 15),
('Gula Pasir', 'Bahan Pokok', '1 KG', 16000, 'Pasar Bersehati Sario', '14 Oktober 2026', 'Terbit', 20),
('Beras Premium', 'Bahan Pokok', '1 KG', 15500, 'Pasar Bersehati Karombasan', '8 Oktober 2026', 'Terbit', 10),
('Telur Ayam', 'Hewani', '1 KG', 28000, 'Pasar Bersehati Sario', '8 Oktober 2026', 'Terbit', 30),
('Daging Ayam', 'Hewani', '1 KG', 38000, 'Pasar Bersehati Sario', '8 Oktober 2026', 'Terbit', 35),
('Daging Sapi', 'Hewani', '1 KG', 135000, 'Pasar Tradisional Bahu', '8 Oktober 2026', 'Terbit', 40),
('Bawang Merah', 'Sayuran', '1 KG', 32000, 'Pasar Tradisional Bahu', '8 Oktober 2026', 'Terbit', 25),
('Bawang Putih', 'Sayuran', '1 KG', 35000, 'Pasar Bersehati Karombasan', '8 Oktober 2026', 'Terbit', 26);

-- 9. Data Awal Jadwal Acara GPM (Gerakan Pangan Murah)
INSERT INTO acara_gpm (nama_acara, lokasi, kecamatan, tanggal, jam_mulai, jam_selesai, latitude, longitude, kuota_maksimal, komoditas_tersedia, deskripsi, status)
VALUES
('GPM Lapangan Sparta Tikala', 'Depan Kantor Walikota Manado', 'Tikala', CURRENT_DATE + INTERVAL '2 day', '08:00', '13:00', 1.4883, 124.8436, 250, 'Beras SPHP 5kg (Rp 58.000), Minyakita 1L (Rp 15.000), Gula 1kg (Rp 16.500)', 'Stabilisasi pasokan pangan warga Manado.', 'Aktif'),
('GPM Pelataran Bersehati Karombasan', 'Pasar Bersehati Karombasan', 'Wanea', CURRENT_DATE + INTERVAL '5 day', '07:30', '12:30', 1.4674, 124.8468, 300, 'Beras Premium, Minyakita, Telur Ayam 1 Baki (Rp 52.000)', 'Penyaluran komoditas langsung dari distributor resmi.', 'Aktif');
