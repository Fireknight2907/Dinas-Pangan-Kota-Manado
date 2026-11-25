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
DROP TABLE IF EXISTS master_komoditas CASCADE;
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
    mode_pendaftaran VARCHAR(20) NOT NULL DEFAULT 'online',
    mode_penerima VARCHAR(20) NOT NULL DEFAULT 'individu',
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
    status_pengambilan VARCHAR(30) NOT NULL DEFAULT 'Belum Diambil',
    waktu_pengambilan TIMESTAMP WITH TIME ZONE,
    no_kk VARCHAR(16),
    nama_kepala_keluarga VARCHAR(150),
    jumlah_anggota INT DEFAULT 1,
    petugas_verifikasi UUID,
    petugas_id_verifikasi UUID,
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
    tanggal_penetapan VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'Terbit',
    is_terkini BOOLEAN NOT NULL DEFAULT TRUE,
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
CREATE TABLE master_komoditas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelompok_komoditas VARCHAR(100) NOT NULL,
    nama_komoditas VARCHAR(150) UNIQUE NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Bahan Pokok',
    satuan_bawaan VARCHAR(50) NOT NULL DEFAULT '1 KG',
    kata_kunci TEXT DEFAULT '',
    prioritas_tampil INT NOT NULL DEFAULT 50,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_master_komoditas_kelompok ON master_komoditas (prioritas_tampil ASC, LOWER(kelompok_komoditas), LOWER(nama_komoditas));

CREATE TABLE master_satuan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_satuan VARCHAR(50) UNIQUE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_pasar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pasar VARCHAR(150) UNIQUE NOT NULL,
    alamat TEXT DEFAULT '',
    kecamatan VARCHAR(100) DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_master_pasar_nama ON master_pasar (LOWER(nama_pasar));

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
ALTER TABLE master_komoditas ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "Akses kelola master komoditas" ON master_komoditas;
CREATE POLICY "Akses kelola master komoditas" ON master_komoditas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master satuan" ON master_satuan;
CREATE POLICY "Akses kelola master satuan" ON master_satuan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master pasar" ON master_pasar;
CREATE POLICY "Akses kelola master pasar" ON master_pasar FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master kecamatan" ON master_kecamatan;
CREATE POLICY "Akses kelola master kecamatan" ON master_kecamatan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Izin tabel eksplisit
GRANT ALL ON TABLE harga_pangan TO anon, authenticated;
GRANT ALL ON TABLE riwayat_harga_pangan TO anon, authenticated;
GRANT ALL ON TABLE master_komoditas TO anon, authenticated;
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

-- Indeks & RPC GPM Otomatis (Auto-Close WITA, Kunci Kuota Atomik, Kunci QR, Ubah Kuota Kabid)
CREATE INDEX idx_acara_gpm_jadwal ON acara_gpm (status, tanggal ASC, jam_mulai ASC, dibuat_pada ASC);
CREATE INDEX idx_pendaftar_gpm_acara_status ON pendaftar_gpm (acara_id, status_kehadiran);
CREATE UNIQUE INDEX idx_pendaftar_gpm_acara_nik_unik
    ON pendaftar_gpm (acara_id, nik) WHERE nik IS NOT NULL AND TRIM(nik) <> '';

CREATE OR REPLACE FUNCTION fn_parse_jam_gpm(p_jam TEXT, p_default TIME DEFAULT TIME '23:59:00')
RETURNS TIME LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_bersih TEXT := REPLACE(TRIM(COALESCE(p_jam, '')), '.', ':');
    v_match  TEXT[];
    v_jam    INT;
    v_menit  INT;
BEGIN
    v_match := REGEXP_MATCH(v_bersih, '(\d{1,2}):(\d{2})');
    IF v_match IS NULL THEN RETURN p_default; END IF;
    v_jam := v_match[1]::INT;
    v_menit := v_match[2]::INT;
    IF v_jam < 0 OR v_jam > 23 OR v_menit < 0 OR v_menit > 59 THEN RETURN p_default; END IF;
    RETURN MAKE_TIME(v_jam, v_menit, 0);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_sinkron_status_gpm_otomatis()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_jumlah_tutup  INT := 0;
BEGIN
    UPDATE acara_gpm
       SET status = 'Selesai', diperbarui_pada = CURRENT_TIMESTAMP
     WHERE LOWER(COALESCE(status, '')) = 'aktif'
       AND (tanggal + fn_parse_jam_gpm(jam_selesai, TIME '23:59:00')) <= v_wita_sekarang;
    GET DIAGNOSTICS v_jumlah_tutup = ROW_COUNT;
    RETURN JSONB_BUILD_OBJECT(
        'jumlah_ditutup', v_jumlah_tutup,
        'waktu_server_wita', TO_CHAR(v_wita_sekarang, 'YYYY-MM-DD"T"HH24:MI:SS"+08:00"')
    );
END;
$$;

CREATE OR REPLACE FUNCTION rpc_ringkasan_pendaftar_gpm()
RETURNS TABLE (acara_id UUID, total_terdaftar INT, total_hadir INT, total_menunggu INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    PERFORM rpc_sinkron_status_gpm_otomatis();
    RETURN QUERY
    SELECT p.acara_id,
           COUNT(*)::INT,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(p.status_kehadiran, '')) = 'hadir')::INT,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(p.status_kehadiran, '')) <> 'hadir')::INT
      FROM pendaftar_gpm p
     GROUP BY p.acara_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_daftar_antrean_gpm(
    p_acara_id UUID, p_nama_pendaftar TEXT, p_nomor_telepon TEXT DEFAULT '-',
    p_nik TEXT DEFAULT '', p_jalur_pendaftaran TEXT DEFAULT 'Daring',
    p_prefix_kode TEXT DEFAULT 'GPM-MND', p_langsung_hadir BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID, acara_id UUID, nama_pendaftar VARCHAR, nomor_telepon VARCHAR,
    nik VARCHAR, jalur_pendaftaran VARCHAR, nomor_antrean INT, kode_barcode VARCHAR,
    status_kehadiran VARCHAR, waktu_kehadiran TIMESTAMP WITH TIME ZONE, waktu_mendaftar TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_acara RECORD;
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_waktu_selesai TIMESTAMP;
    v_terisi INT;
    v_nomor_baru INT;
    v_nik_bersih TEXT := REGEXP_REPLACE(COALESCE(p_nik, ''), '[^0-9]', '', 'g');
    v_nama_bersih TEXT := TRIM(COALESCE(p_nama_pendaftar, ''));
    v_telp_bersih TEXT := COALESCE(NULLIF(TRIM(COALESCE(p_nomor_telepon, '')), ''), '-');
    v_jalur_bersih TEXT := CASE WHEN LOWER(COALESCE(p_jalur_pendaftaran, '')) = 'langsung' THEN 'Langsung' ELSE 'Daring' END;
    v_prefix TEXT := UPPER(COALESCE(NULLIF(TRIM(p_prefix_kode), ''), 'GPM-MND'));
    v_kode_barcode TEXT;
BEGIN
    IF LENGTH(v_nik_bersih) <> 16 THEN RAISE EXCEPTION 'NIK wajib terdiri dari tepat 16 digit angka!'; END IF;
    IF LENGTH(v_nama_bersih) < 3 THEN RAISE EXCEPTION 'Nama lengkap pendaftar minimal 3 karakter!'; END IF;

    SELECT * INTO v_acara FROM acara_gpm a WHERE a.id = p_acara_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Jadwal acara GPM tidak ditemukan di basis data.'; END IF;

    v_waktu_selesai := v_acara.tanggal + fn_parse_jam_gpm(v_acara.jam_selesai, TIME '23:59:00');
    IF v_waktu_selesai <= v_wita_sekarang THEN
        IF LOWER(COALESCE(v_acara.status, '')) = 'aktif' THEN
            UPDATE acara_gpm SET status = 'Selesai', diperbarui_pada = CURRENT_TIMESTAMP WHERE acara_gpm.id = p_acara_id;
        END IF;
        RAISE EXCEPTION 'Pendaftaran ditutup: Kegiatan GPM "%" telah berakhir sesuai jadwal (% WITA).', v_acara.nama_acara, v_acara.jam_selesai;
    END IF;
    IF LOWER(COALESCE(v_acara.status, '')) <> 'aktif' THEN
        RAISE EXCEPTION 'Pendaftaran ditutup: Kegiatan GPM "%" sudah berstatus Selesai/Terkunci.', v_acara.nama_acara;
    END IF;
    IF EXISTS (SELECT 1 FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id AND pg.nik = v_nik_bersih) THEN
        RAISE EXCEPTION 'Pendaftaran ditolak: NIK (%) sudah terdaftar pada kegiatan GPM ini! Satu NIK hanya berlaku untuk 1 nomor antrean.', v_nik_bersih;
    END IF;

    SELECT COUNT(*)::INT INTO v_terisi FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id;
    IF v_terisi >= COALESCE(v_acara.kuota_maksimal, 0) THEN
        RAISE EXCEPTION 'Kuota antrean telah habis (% / % kuota terisi). Silakan pilih lokasi GPM lain atau hubungi Kepala Bidang untuk penambahan kuota.', v_terisi, COALESCE(v_acara.kuota_maksimal, 0);
    END IF;

    SELECT COALESCE(MAX(pg.nomor_antrean), 0) + 1 INTO v_nomor_baru FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id;
    v_kode_barcode := v_prefix || '-' || LPAD(v_nomor_baru::TEXT, 3, '0') || '-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT) FROM 1 FOR 4));

    RETURN QUERY
    INSERT INTO pendaftar_gpm (acara_id, nama_pendaftar, nomor_telepon, nik, jalur_pendaftaran, nomor_antrean, kode_barcode, status_kehadiran, waktu_kehadiran)
    VALUES (p_acara_id, v_nama_bersih, v_telp_bersih, v_nik_bersih, v_jalur_bersih, v_nomor_baru, v_kode_barcode, CASE WHEN p_langsung_hadir THEN 'Hadir' ELSE 'Menunggu' END, CASE WHEN p_langsung_hadir THEN CURRENT_TIMESTAMP ELSE NULL END)
    RETURNING pendaftar_gpm.id, pendaftar_gpm.acara_id, pendaftar_gpm.nama_pendaftar, pendaftar_gpm.nomor_telepon, pendaftar_gpm.nik, pendaftar_gpm.jalur_pendaftaran, pendaftar_gpm.nomor_antrean, pendaftar_gpm.kode_barcode, pendaftar_gpm.status_kehadiran, pendaftar_gpm.waktu_kehadiran, pendaftar_gpm.waktu_mendaftar;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_verifikasi_kehadiran_gpm(p_kode_barcode TEXT, p_status_baru TEXT DEFAULT 'Hadir')
RETURNS TABLE (
    id UUID, acara_id UUID, nama_pendaftar VARCHAR, nomor_telepon VARCHAR,
    nik VARCHAR, jalur_pendaftaran VARCHAR, nomor_antrean INT, kode_barcode VARCHAR,
    status_kehadiran VARCHAR, waktu_kehadiran TIMESTAMP WITH TIME ZONE, waktu_mendaftar TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_pendaftar RECORD;
    v_acara RECORD;
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_waktu_selesai TIMESTAMP;
    v_status_final TEXT := CASE WHEN LOWER(COALESCE(p_status_baru, '')) = 'menunggu' THEN 'Menunggu' ELSE 'Hadir' END;
BEGIN
    SELECT * INTO v_pendaftar FROM pendaftar_gpm pg WHERE UPPER(TRIM(pg.kode_barcode)) = UPPER(TRIM(COALESCE(p_kode_barcode, ''))) LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tiket dengan kode QR "%" tidak ditemukan di basis data.', p_kode_barcode; END IF;

    SELECT * INTO v_acara FROM acara_gpm a WHERE a.id = v_pendaftar.acara_id FOR UPDATE;
    IF FOUND THEN
        v_waktu_selesai := v_acara.tanggal + fn_parse_jam_gpm(v_acara.jam_selesai, TIME '23:59:00');
        IF v_waktu_selesai <= v_wita_sekarang THEN
            IF LOWER(COALESCE(v_acara.status, '')) = 'aktif' THEN
                UPDATE acara_gpm SET status = 'Selesai', diperbarui_pada = CURRENT_TIMESTAMP WHERE acara_gpm.id = v_acara.id;
            END IF;
            RAISE EXCEPTION 'Verifikasi QR dikunci: Jadwal kegiatan GPM "%" telah berakhir (% WITA).', v_acara.nama_acara, v_acara.jam_selesai;
        END IF;
        IF LOWER(COALESCE(v_acara.status, '')) <> 'aktif' THEN
            RAISE EXCEPTION 'Verifikasi QR dikunci: Kegiatan GPM "%" sudah ditutup/selesai.', v_acara.nama_acara;
        END IF;
    END IF;

    RETURN QUERY
    UPDATE pendaftar_gpm pg
       SET status_kehadiran = v_status_final,
           waktu_kehadiran = CASE WHEN v_status_final = 'Hadir' THEN CURRENT_TIMESTAMP ELSE NULL END
     WHERE pg.id = v_pendaftar.id
    RETURNING pg.id, pg.acara_id, pg.nama_pendaftar, pg.nomor_telepon, pg.nik, pg.jalur_pendaftaran, pg.nomor_antrean, pg.kode_barcode, pg.status_kehadiran, pg.waktu_kehadiran, pg.waktu_mendaftar;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_ubah_kuota_acara_gpm(p_acara_id UUID, p_kuota_baru INT)
RETURNS TABLE (id UUID, nama_acara VARCHAR, kuota_maksimal INT, status VARCHAR)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_acara RECORD;
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_waktu_selesai TIMESTAMP;
    v_terisi INT;
BEGIN
    IF p_kuota_baru IS NULL OR p_kuota_baru < 1 THEN RAISE EXCEPTION 'Kuota maksimal harus berupa angka minimal 1.'; END IF;
    SELECT * INTO v_acara FROM acara_gpm a WHERE a.id = p_acara_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Acara GPM tidak ditemukan.'; END IF;
    v_waktu_selesai := v_acara.tanggal + fn_parse_jam_gpm(v_acara.jam_selesai, TIME '23:59:00');
    IF v_waktu_selesai <= v_wita_sekarang OR LOWER(COALESCE(v_acara.status, '')) <> 'aktif' THEN
        IF LOWER(COALESCE(v_acara.status, '')) = 'aktif' THEN
            UPDATE acara_gpm SET status = 'Selesai', diperbarui_pada = CURRENT_TIMESTAMP WHERE acara_gpm.id = p_acara_id;
        END IF;
        RAISE EXCEPTION 'Kuota tidak dapat diubah karena kegiatan GPM sudah berakhir/selesai.';
    END IF;
    SELECT COUNT(*)::INT INTO v_terisi FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id;
    IF p_kuota_baru < v_terisi THEN
        RAISE EXCEPTION 'Kuota baru (%) tidak boleh lebih kecil dari jumlah warga yang sudah terdaftar saat ini (%).', p_kuota_baru, v_terisi;
    END IF;
    RETURN QUERY
    UPDATE acara_gpm a SET kuota_maksimal = p_kuota_baru, diperbarui_pada = CURRENT_TIMESTAMP WHERE a.id = p_acara_id
    RETURNING a.id, a.nama_acara, a.kuota_maksimal, a.status;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_sinkron_status_gpm_otomatis() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_ringkasan_pendaftar_gpm() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_daftar_antrean_gpm(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_verifikasi_kehadiran_gpm(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_ubah_kuota_acara_gpm(UUID, INT) TO anon, authenticated;

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

-- 7b. Data Master Komoditas (Induk + Varian + Sinonim), Satuan (Per 1), Pasar & Kecamatan
INSERT INTO master_komoditas (kelompok_komoditas, nama_komoditas, kategori, satuan_bawaan, kata_kunci, prioritas_tampil) VALUES
('Beras', 'Beras SPHP', 'Bahan Pokok', '1 KG', 'beras bulog, beras murah, beras subsidi, beras biasa', 10),
('Beras', 'Beras Medium', 'Bahan Pokok', '1 KG', 'beras biasa, beras standar, beras lokal, beras harian', 11),
('Beras', 'Beras Premium', 'Bahan Pokok', '1 KG', 'beras super, beras pulen, beras kepala, beras bagus', 12),
('Minyak Goreng', 'Minyakita', 'Bahan Pokok', '1 Liter', 'minyak subsidi, minyak pemerintah, minyak murah', 15),
('Minyak Goreng', 'Minyak Goreng Kemasan', 'Bahan Pokok', '1 Liter', 'minyak goreng, minyak kemasan, minyak premium', 16),
('Gula', 'Gula Pasir', 'Bahan Pokok', '1 KG', 'gula putih, gula kristal, gula konsumsi', 20),
('Cabai', 'Cabai Rawit Merah', 'Sayuran', '1 KG', 'rica, rica merah, lombok, cabai setan', 22),
('Cabai', 'Cabai Keriting', 'Sayuran', '1 KG', 'rica keriting, cabai merah keriting', 23),
('Bawang', 'Bawang Merah', 'Sayuran', '1 KG', 'bawang merah lokal, rempah', 25),
('Bawang', 'Bawang Putih', 'Sayuran', '1 KG', 'bawang putih honan, bawang putih kating', 26),
('Telur', 'Telur Ayam', 'Hewani', '1 KG', 'telur ayam ras, telur biasa, telur baki', 30),
('Daging', 'Daging Ayam', 'Hewani', '1 KG', 'ayam ras, ayam potong, daging ayam segar', 35),
('Ikan', 'Ikan Tongkol', 'Hewani', '1 KG', 'ikan laut, ikan segar, cakalang, deho', 36),
('Daging', 'Daging Sapi', 'Hewani', '1 KG', 'daging sapi segar, paha belakang, sapi murni', 40);

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
