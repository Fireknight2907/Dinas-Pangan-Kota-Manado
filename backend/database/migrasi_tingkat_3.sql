-- ============================================================================
-- MIGRASI TINGKAT 3 — SIPATOKAAN DINAS PANGAN KOTA MANADO (IDEMPOTENT & AMAN)
-- Cakupan:
--   1. Normalisasi 3NF Master Data (master_kategori, master_komoditas_induk & FK)
--   2. Tabel Pengajuan Harga Batch per Pasar (pengajuan_harga & item_pengajuan_harga)
--      untuk alur Input/Edit Cepat Staf -> Verifikasi Kepala Bidang (tanpa arsip paksa)
--   3. Skema Mode Pendaftaran, Mode Penerima (Individu/Keluarga KK), & Status
--      Pengambilan Pangan pada modul Gerakan Pangan Murah (GPM)
--   4. Row Level Security (RLS), Policy, & GRANT lengkap untuk semua tabel baru
--   5. Pembaruan RPC Atomik (DROP FUNCTION IF EXISTS -> anti-ERROR 42P13) + GRANT EXECUTE
--
-- CARA JALANKAN: Salin seluruh isi berkas ini dan jalankan SEKALI di Supabase SQL Editor.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ENTITAS MASTER KATEGORI & KOMODITAS INDUK (NORMALISASI 3NF — SIAP ERD)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_kategori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori VARCHAR(100) UNIQUE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO master_kategori (nama_kategori)
VALUES ('Bahan Pokok'), ('Hewani'), ('Sayuran'), ('Buah'), ('Lainnya')
ON CONFLICT (nama_kategori) DO NOTHING;

CREATE TABLE IF NOT EXISTS master_komoditas_induk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_induk VARCHAR(100) UNIQUE NOT NULL,
    kategori_id UUID REFERENCES master_kategori(id) ON DELETE SET NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. FOREIGN KEY RELASIONAL PADA TABEL EXISTING (NULLABLE + BACKFILL AMAN)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE master_komoditas
    ADD COLUMN IF NOT EXISTS satuan_id UUID REFERENCES master_satuan(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kategori_id UUID REFERENCES master_kategori(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS induk_id UUID REFERENCES master_komoditas_induk(id) ON DELETE SET NULL;

ALTER TABLE master_pasar
    ADD COLUMN IF NOT EXISTS kecamatan_id UUID REFERENCES master_kecamatan(id) ON DELETE SET NULL;

ALTER TABLE harga_pangan
    ADD COLUMN IF NOT EXISTS is_terkini BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pasar_id UUID REFERENCES master_pasar(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS komoditas_id UUID REFERENCES master_komoditas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS satuan_id UUID REFERENCES master_satuan(id) ON DELETE SET NULL;

-- Backfill master_komoditas_induk dari kelompok_komoditas yang sudah ada
INSERT INTO master_komoditas_induk (nama_induk, kategori_id)
SELECT DISTINCT TRIM(mk.kelompok_komoditas), k.id
FROM master_komoditas mk
LEFT JOIN master_kategori k ON LOWER(TRIM(k.nama_kategori)) = LOWER(TRIM(mk.kategori))
WHERE COALESCE(TRIM(mk.kelompok_komoditas), '') <> ''
ON CONFLICT (nama_induk) DO NOTHING;

-- Backfill FK secara aman pada master_komoditas, master_pasar, dan harga_pangan
UPDATE master_komoditas mk
SET satuan_id = ms.id
FROM master_satuan ms
WHERE mk.satuan_id IS NULL AND LOWER(TRIM(mk.satuan_bawaan)) = LOWER(TRIM(ms.nama_satuan));

UPDATE master_komoditas mk
SET kategori_id = k.id
FROM master_kategori k
WHERE mk.kategori_id IS NULL AND LOWER(TRIM(mk.kategori)) = LOWER(TRIM(k.nama_kategori));

UPDATE master_komoditas mk
SET induk_id = mi.id
FROM master_komoditas_induk mi
WHERE mk.induk_id IS NULL AND LOWER(TRIM(mk.kelompok_komoditas)) = LOWER(TRIM(mi.nama_induk));

UPDATE master_pasar mp
SET kecamatan_id = kc.id
FROM master_kecamatan kc
WHERE mp.kecamatan_id IS NULL AND LOWER(TRIM(mp.kecamatan)) = LOWER(TRIM(kc.nama_kecamatan));

UPDATE harga_pangan hp
SET pasar_id = mp.id
FROM master_pasar mp
WHERE hp.pasar_id IS NULL AND LOWER(TRIM(hp.nama_pasar)) = LOWER(TRIM(mp.nama_pasar));

UPDATE harga_pangan hp
SET komoditas_id = mk.id
FROM master_komoditas mk
WHERE hp.komoditas_id IS NULL AND LOWER(TRIM(hp.nama_komoditas)) = LOWER(TRIM(mk.nama_komoditas));

UPDATE harga_pangan hp
SET satuan_id = ms.id
FROM master_satuan ms
WHERE hp.satuan_id IS NULL AND LOWER(TRIM(hp.satuan)) = LOWER(TRIM(ms.nama_satuan));

-- ────────────────────────────────────────────────────────────────────────────
-- 3. TABEL PENGAJUAN HARGA PER PASAR (ALUR STAF -> VERIFIKASI KEPALA BIDANG)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pengajuan_harga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pasar_id UUID REFERENCES master_pasar(id) ON DELETE SET NULL,
    nama_pasar VARCHAR(150) NOT NULL,
    tanggal_pengambilan DATE NOT NULL DEFAULT CURRENT_DATE,
    petugas_id UUID REFERENCES pengguna(id) ON DELETE SET NULL,
    nama_petugas VARCHAR(150) NOT NULL DEFAULT 'Petugas Lapangan',
    status VARCHAR(30) NOT NULL DEFAULT 'Diajukan',
    catatan_verifikasi TEXT DEFAULT '',
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pengajuan_harga_status CHECK (status IN ('Draft', 'Diajukan', 'Diverifikasi', 'Ditolak'))
);

CREATE TABLE IF NOT EXISTS item_pengajuan_harga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengajuan_id UUID NOT NULL REFERENCES pengajuan_harga(id) ON DELETE CASCADE,
    komoditas_id UUID REFERENCES master_komoditas(id) ON DELETE SET NULL,
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Bahan Pokok',
    satuan VARCHAR(50) NOT NULL DEFAULT '1 KG',
    harga_lama NUMERIC(12, 2),
    harga NUMERIC(12, 2) NOT NULL CHECK (harga > 0),
    prioritas_tampil INT NOT NULL DEFAULT 50,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pastikan kolom tambahan tersedia jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE item_pengajuan_harga
    ADD COLUMN IF NOT EXISTS harga_lama NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS prioritas_tampil INT NOT NULL DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_pengajuan_harga_status_waktu
    ON pengajuan_harga (status, dibuat_pada DESC);
CREATE INDEX IF NOT EXISTS idx_pengajuan_harga_pasar_tgl
    ON pengajuan_harga (pasar_id, tanggal_pengambilan DESC);
CREATE INDEX IF NOT EXISTS idx_item_pengajuan_harga_parent
    ON item_pengajuan_harga (pengajuan_id);

-- Trigger otomatis perbarui stempel waktu pengajuan_harga
CREATE OR REPLACE FUNCTION fn_set_diperbarui_pada_pengajuan()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.diperbarui_pada := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_diperbarui_pada_pengajuan ON pengajuan_harga;
CREATE TRIGGER trg_set_diperbarui_pada_pengajuan
    BEFORE UPDATE ON pengajuan_harga
    FOR EACH ROW EXECUTE FUNCTION fn_set_diperbarui_pada_pengajuan();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. PEMBARUAN SKEMA GPM & PENDAFTAR (MODE PENDAFTARAN, KK, & AMBIL PANGAN)
--    (Menggunakan kolom petugas_verifikasi yang sudah ada — tanpa duplikasi kolom)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE acara_gpm
    ADD COLUMN IF NOT EXISTS mode_pendaftaran VARCHAR(20) NOT NULL DEFAULT 'online',
    ADD COLUMN IF NOT EXISTS mode_penerima VARCHAR(20) NOT NULL DEFAULT 'individu';

ALTER TABLE pendaftar_gpm
    ADD COLUMN IF NOT EXISTS status_pengambilan VARCHAR(30) NOT NULL DEFAULT 'Belum Diambil',
    ADD COLUMN IF NOT EXISTS waktu_pengambilan TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS petugas_verifikasi UUID,
    ADD COLUMN IF NOT EXISTS no_kk VARCHAR(16),
    ADD COLUMN IF NOT EXISTS nama_kepala_keluarga VARCHAR(150),
    ADD COLUMN IF NOT EXISTS jumlah_anggota INT DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pendaftar_gpm_acara_kk_unik
    ON pendaftar_gpm (acara_id, no_kk)
    WHERE no_kk IS NOT NULL AND TRIM(no_kk) <> '';

-- ────────────────────────────────────────────────────────────────────────────
-- 5. KEAMANAN ROW LEVEL SECURITY (RLS), POLICY & GRANT UNTUK SEMUA TABEL BARU
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE master_kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_komoditas_induk ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_harga ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_pengajuan_harga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses kelola master kategori" ON master_kategori;
CREATE POLICY "Akses kelola master kategori"
    ON master_kategori FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola master komoditas induk" ON master_komoditas_induk;
CREATE POLICY "Akses kelola master komoditas induk"
    ON master_komoditas_induk FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola pengajuan harga" ON pengajuan_harga;
CREATE POLICY "Akses kelola pengajuan harga"
    ON pengajuan_harga FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses kelola item pengajuan harga" ON item_pengajuan_harga;
CREATE POLICY "Akses kelola item pengajuan harga"
    ON item_pengajuan_harga FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE master_kategori TO anon, authenticated;
GRANT ALL ON TABLE master_komoditas_induk TO anon, authenticated;
GRANT ALL ON TABLE pengajuan_harga TO anon, authenticated;
GRANT ALL ON TABLE item_pengajuan_harga TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. PEMBARUAN RPC ATOMIK GPM (DROP FUNCTION IF EXISTS -> ANTI ERROR 42P13!)
-- ────────────────────────────────────────────────────────────────────────────

-- 6A. RPC Pendaftaran Antrean GPM (Mendukung mode_pendaftaran & mode_penerima KK)
DROP FUNCTION IF EXISTS rpc_daftar_antrean_gpm(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS rpc_daftar_antrean_gpm(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, INT);

CREATE OR REPLACE FUNCTION rpc_daftar_antrean_gpm(
    p_acara_id UUID,
    p_nama_pendaftar TEXT,
    p_nomor_telepon TEXT DEFAULT '-',
    p_nik TEXT DEFAULT '',
    p_jalur_pendaftaran TEXT DEFAULT 'Daring',
    p_prefix_kode TEXT DEFAULT 'GPM-MND',
    p_langsung_hadir BOOLEAN DEFAULT FALSE,
    p_no_kk TEXT DEFAULT NULL,
    p_nama_kepala_keluarga TEXT DEFAULT NULL,
    p_jumlah_anggota INT DEFAULT 1
)
RETURNS TABLE (
    id UUID, acara_id UUID, nama_pendaftar VARCHAR, nomor_telepon VARCHAR,
    nik VARCHAR, jalur_pendaftaran VARCHAR, nomor_antrean INT, kode_barcode VARCHAR,
    status_kehadiran VARCHAR, waktu_kehadiran TIMESTAMP WITH TIME ZONE, waktu_mendaftar TIMESTAMP WITH TIME ZONE,
    status_pengambilan VARCHAR, waktu_pengambilan TIMESTAMP WITH TIME ZONE,
    no_kk VARCHAR, nama_kepala_keluarga VARCHAR, jumlah_anggota INT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_acara RECORD;
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_waktu_selesai TIMESTAMP;
    v_terisi INT;
    v_nomor_baru INT;
    v_nik_bersih TEXT := REGEXP_REPLACE(COALESCE(p_nik, ''), '[^0-9]', '', 'g');
    v_kk_bersih TEXT := REGEXP_REPLACE(COALESCE(p_no_kk, ''), '[^0-9]', '', 'g');
    v_nama_bersih TEXT := TRIM(COALESCE(p_nama_pendaftar, ''));
    v_telp_bersih TEXT := COALESCE(NULLIF(TRIM(COALESCE(p_nomor_telepon, '')), ''), '-');
    v_jalur_bersih TEXT := CASE WHEN LOWER(COALESCE(p_jalur_pendaftaran, '')) = 'langsung' THEN 'Langsung' ELSE 'Daring' END;
    v_prefix TEXT := UPPER(COALESCE(NULLIF(TRIM(p_prefix_kode), ''), 'GPM-MND'));
    v_jml_anggota INT := GREATEST(1, COALESCE(p_jumlah_anggota, 1));
    v_kode_barcode TEXT;
BEGIN
    IF LENGTH(v_nik_bersih) <> 16 THEN
        RAISE EXCEPTION 'NIK wajib terdiri dari tepat 16 digit angka!';
    END IF;
    IF LENGTH(v_nama_bersih) < 3 THEN
        RAISE EXCEPTION 'Nama lengkap pendaftar minimal 3 karakter!';
    END IF;

    SELECT * INTO v_acara FROM acara_gpm a WHERE a.id = p_acara_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal acara GPM tidak ditemukan di basis data.';
    END IF;

    -- Validasi mode pendaftaran (jika khusus langsung, tolak jalur Daring)
    IF v_jalur_bersih = 'Daring' AND LOWER(COALESCE(v_acara.mode_pendaftaran, 'online')) = 'langsung' THEN
        RAISE EXCEPTION 'Kegiatan GPM "%" hanya melayani pendaftaran langsung di lokasi acara (tanpa pendaftaran daring).', v_acara.nama_acara;
    END IF;

    -- Validasi waktu auto-close WITA
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

    -- Validasi anti-NIK ganda
    IF EXISTS (SELECT 1 FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id AND pg.nik = v_nik_bersih) THEN
        RAISE EXCEPTION 'Pendaftaran ditolak: NIK (%) sudah terdaftar pada kegiatan GPM ini! Satu NIK hanya berlaku untuk 1 nomor antrean.', v_nik_bersih;
    END IF;

    -- Validasi mode penerima Keluarga (1 KK = 1 Antrean)
    IF LOWER(COALESCE(v_acara.mode_penerima, 'individu')) = 'keluarga' THEN
        IF v_jalur_bersih = 'Daring' AND LENGTH(v_kk_bersih) <> 16 THEN
            RAISE EXCEPTION 'Kegiatan GPM ini berbasis Keluarga (1 KK = 1 Antrean). Nomor Kartu Keluarga (KK) wajib tepat 16 digit!';
        END IF;
        IF LENGTH(v_kk_bersih) > 0 AND LENGTH(v_kk_bersih) <> 16 THEN
            RAISE EXCEPTION 'Nomor Kartu Keluarga (KK) harus tepat 16 digit angka!';
        END IF;
        IF LENGTH(v_kk_bersih) = 16 AND EXISTS (SELECT 1 FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id AND pg.no_kk = v_kk_bersih) THEN
            RAISE EXCEPTION 'Pendaftaran ditolak: Nomor KK (%) sudah terdaftar pada kegiatan GPM ini! Satu keluarga hanya berlaku untuk 1 nomor antrean.', v_kk_bersih;
        END IF;
    END IF;

    -- Validasi kuota maksimal atomik
    SELECT COUNT(*)::INT INTO v_terisi FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id;
    IF v_terisi >= COALESCE(v_acara.kuota_maksimal, 0) THEN
        RAISE EXCEPTION 'Kuota antrean telah habis (% / % kuota terisi). Silakan pilih lokasi GPM lain atau hubungi Kepala Bidang untuk penambahan kuota.', v_terisi, COALESCE(v_acara.kuota_maksimal, 0);
    END IF;

    SELECT COALESCE(MAX(pg.nomor_antrean), 0) + 1 INTO v_nomor_baru FROM pendaftar_gpm pg WHERE pg.acara_id = p_acara_id;
    v_kode_barcode := v_prefix || '-' || LPAD(v_nomor_baru::TEXT, 3, '0') || '-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT) FROM 1 FOR 4));

    RETURN QUERY
    INSERT INTO pendaftar_gpm (
        acara_id, nama_pendaftar, nomor_telepon, nik, jalur_pendaftaran,
        nomor_antrean, kode_barcode, status_kehadiran, waktu_kehadiran,
        no_kk, nama_kepala_keluarga, jumlah_anggota
    )
    VALUES (
        p_acara_id, v_nama_bersih, v_telp_bersih, v_nik_bersih, v_jalur_bersih,
        v_nomor_baru, v_kode_barcode,
        CASE WHEN p_langsung_hadir THEN 'Hadir' ELSE 'Menunggu' END,
        CASE WHEN p_langsung_hadir THEN CURRENT_TIMESTAMP ELSE NULL END,
        NULLIF(v_kk_bersih, ''),
        COALESCE(NULLIF(TRIM(COALESCE(p_nama_kepala_keluarga, '')), ''), CASE WHEN v_kk_bersih <> '' THEN v_nama_bersih ELSE NULL END),
        v_jml_anggota
    )
    RETURNING
        pendaftar_gpm.id, pendaftar_gpm.acara_id, pendaftar_gpm.nama_pendaftar, pendaftar_gpm.nomor_telepon,
        pendaftar_gpm.nik, pendaftar_gpm.jalur_pendaftaran, pendaftar_gpm.nomor_antrean, pendaftar_gpm.kode_barcode,
        pendaftar_gpm.status_kehadiran, pendaftar_gpm.waktu_kehadiran, pendaftar_gpm.waktu_mendaftar,
        pendaftar_gpm.status_pengambilan, pendaftar_gpm.waktu_pengambilan,
        pendaftar_gpm.no_kk, pendaftar_gpm.nama_kepala_keluarga, pendaftar_gpm.jumlah_anggota;
END;
$$;

-- 6B. RPC Verifikasi Kehadiran QR (Anti-Scan Ganda & Kunci Otomatis Saat Acara Berakhir)
DROP FUNCTION IF EXISTS rpc_verifikasi_kehadiran_gpm(TEXT, TEXT);
DROP FUNCTION IF EXISTS rpc_verifikasi_kehadiran_gpm(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION rpc_verifikasi_kehadiran_gpm(
    p_kode_barcode TEXT,
    p_status_baru TEXT DEFAULT 'Hadir',
    p_petugas_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID, acara_id UUID, nama_pendaftar VARCHAR, nomor_telepon VARCHAR,
    nik VARCHAR, jalur_pendaftaran VARCHAR, nomor_antrean INT, kode_barcode VARCHAR,
    status_kehadiran VARCHAR, waktu_kehadiran TIMESTAMP WITH TIME ZONE, waktu_mendaftar TIMESTAMP WITH TIME ZONE,
    status_pengambilan VARCHAR, waktu_pengambilan TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_pendaftar RECORD;
    v_acara RECORD;
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_waktu_selesai TIMESTAMP;
    v_status_final TEXT := CASE WHEN LOWER(COALESCE(p_status_baru, '')) = 'menunggu' THEN 'Menunggu' ELSE 'Hadir' END;
BEGIN
    SELECT * INTO v_pendaftar
      FROM pendaftar_gpm pg
     WHERE UPPER(TRIM(pg.kode_barcode)) = UPPER(TRIM(COALESCE(p_kode_barcode, '')))
     LIMIT 1
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tiket dengan kode QR "%" tidak ditemukan di basis data.', p_kode_barcode;
    END IF;

    IF v_status_final = 'Hadir' AND LOWER(COALESCE(v_pendaftar.status_kehadiran, '')) = 'hadir' THEN
        RAISE EXCEPTION 'Tiket antrean #% atas nama "%" sudah pernah diverifikasi Hadir sebelumnya.', v_pendaftar.nomor_antrean, v_pendaftar.nama_pendaftar;
    END IF;

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
           waktu_kehadiran = CASE WHEN v_status_final = 'Hadir' THEN CURRENT_TIMESTAMP ELSE NULL END,
           petugas_verifikasi = COALESCE(p_petugas_id, pg.petugas_verifikasi)
     WHERE pg.id = v_pendaftar.id
    RETURNING
        pg.id, pg.acara_id, pg.nama_pendaftar, pg.nomor_telepon, pg.nik, pg.jalur_pendaftaran,
        pg.nomor_antrean, pg.kode_barcode, pg.status_kehadiran, pg.waktu_kehadiran, pg.waktu_mendaftar,
        pg.status_pengambilan, pg.waktu_pengambilan;
END;
$$;

-- 6C. RPC Konfirmasi Pengambilan Bahan Pangan (Setelah Hadir & Anti-Pengambilan Ganda)
DROP FUNCTION IF EXISTS rpc_konfirmasi_pengambilan_gpm(UUID, UUID);

CREATE OR REPLACE FUNCTION rpc_konfirmasi_pengambilan_gpm(
    p_pendaftar_id UUID,
    p_petugas_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    status_kehadiran VARCHAR,
    status_pengambilan VARCHAR,
    waktu_pengambilan TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_pendaftar RECORD;
    v_acara RECORD;
    v_wita_sekarang TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Makassar');
    v_waktu_selesai TIMESTAMP;
BEGIN
    SELECT * INTO v_pendaftar FROM pendaftar_gpm pg WHERE pg.id = p_pendaftar_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data pendaftar GPM tidak ditemukan di basis data.';
    END IF;

    IF LOWER(COALESCE(v_pendaftar.status_kehadiran, '')) <> 'hadir' THEN
        RAISE EXCEPTION 'Warga atas nama "%" belum diverifikasi Hadir. Verifikasi kehadiran terlebih dahulu sebelum konfirmasi pengambilan pangan.', v_pendaftar.nama_pendaftar;
    END IF;

    IF LOWER(COALESCE(v_pendaftar.status_pengambilan, '')) = 'sudah diambil' THEN
        RAISE EXCEPTION 'Bahan pangan untuk antrean #% (%) sudah pernah dikonfirmasi diambil sebelumnya.', v_pendaftar.nomor_antrean, v_pendaftar.nama_pendaftar;
    END IF;

    SELECT * INTO v_acara FROM acara_gpm a WHERE a.id = v_pendaftar.acara_id FOR UPDATE;
    IF FOUND THEN
        v_waktu_selesai := v_acara.tanggal + fn_parse_jam_gpm(v_acara.jam_selesai, TIME '23:59:00');
        IF v_waktu_selesai <= v_wita_sekarang OR LOWER(COALESCE(v_acara.status, '')) <> 'aktif' THEN
            RAISE EXCEPTION 'Konfirmasi pengambilan dikunci: Kegiatan GPM "%" telah berakhir/selesai.', v_acara.nama_acara;
        END IF;
    END IF;

    RETURN QUERY
    UPDATE pendaftar_gpm pg
       SET status_pengambilan = 'Sudah Diambil',
           waktu_pengambilan = CURRENT_TIMESTAMP,
           petugas_verifikasi = COALESCE(p_petugas_id, pg.petugas_verifikasi)
     WHERE pg.id = p_pendaftar_id
    RETURNING pg.id, pg.status_kehadiran, pg.status_pengambilan, pg.waktu_pengambilan;
END;
$$;

-- Hak eksekusi RPC untuk REST API (anon & authenticated)
GRANT EXECUTE ON FUNCTION rpc_daftar_antrean_gpm(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_verifikasi_kehadiran_gpm(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_konfirmasi_pengambilan_gpm(UUID, UUID) TO anon, authenticated;
