-- ============================================================================
-- MIGRASI TINGKAT 3 (PK-14 s.d. PK-20) — SIPATOKAAN DINAS PANGAN KOTA MANADO
-- Jalankan skrip ini pada Supabase SQL Editor untuk memperbarui database aktif
-- secara aman (idempotent / IF NOT EXISTS).
-- ============================================================================

-- 1. PK-17: Entitas Kategori & Komoditas Induk Terpisah
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

-- 2. PK-16: Tambahkan Foreign Key Relasional (Nullable + Backfill)
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

-- Backfill master_komoditas_induk dari kolom kelompok_komoditas yang ada
INSERT INTO master_komoditas_induk (nama_induk, kategori_id)
SELECT DISTINCT mk.kelompok_komoditas, k.id
FROM master_komoditas mk
LEFT JOIN master_kategori k ON LOWER(k.nama_kategori) = LOWER(mk.kategori)
WHERE COALESCE(TRIM(mk.kelompok_komoditas), '') <> ''
ON CONFLICT (nama_induk) DO NOTHING;

-- Backfill FK pada master_komoditas, master_pasar, dan harga_pangan
UPDATE master_komoditas mk
SET satuan_id = ms.id
FROM master_satuan ms
WHERE mk.satuan_id IS NULL AND LOWER(mk.satuan_bawaan) = LOWER(ms.nama_satuan);

UPDATE master_komoditas mk
SET kategori_id = k.id
FROM master_kategori k
WHERE mk.kategori_id IS NULL AND LOWER(mk.kategori) = LOWER(k.nama_kategori);

UPDATE master_komoditas mk
SET induk_id = mi.id
FROM master_komoditas_induk mi
WHERE mk.induk_id IS NULL AND LOWER(mk.kelompok_komoditas) = LOWER(mi.nama_induk);

UPDATE master_pasar mp
SET kecamatan_id = kc.id
FROM master_kecamatan kc
WHERE mp.kecamatan_id IS NULL AND LOWER(mp.kecamatan) = LOWER(kc.nama_kecamatan);

UPDATE harga_pangan hp
SET pasar_id = mp.id
FROM master_pasar mp
WHERE hp.pasar_id IS NULL AND LOWER(hp.nama_pasar) = LOWER(mp.nama_pasar);

UPDATE harga_pangan hp
SET komoditas_id = mk.id
FROM master_komoditas mk
WHERE hp.komoditas_id IS NULL AND LOWER(hp.nama_komoditas) = LOWER(mk.nama_komoditas);

UPDATE harga_pangan hp
SET satuan_id = ms.id
FROM master_satuan ms
WHERE hp.satuan_id IS NULL AND LOWER(hp.satuan) = LOWER(ms.nama_satuan);

-- 3. PK-15: Tabel Pengajuan Harga & Detail Item Pengajuan
CREATE TABLE IF NOT EXISTS pengajuan_harga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pasar_id UUID REFERENCES master_pasar(id) ON DELETE SET NULL,
    nama_pasar VARCHAR(150) NOT NULL,
    tanggal_pengambilan DATE NOT NULL DEFAULT CURRENT_DATE,
    petugas_id UUID,
    nama_petugas VARCHAR(150) DEFAULT 'Petugas Lapangan',
    status VARCHAR(30) NOT NULL DEFAULT 'Diajukan', -- 'Draft' | 'Diajukan' | 'Diverifikasi' | 'Ditolak'
    catatan_verifikasi TEXT DEFAULT '',
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_pengajuan_harga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengajuan_id UUID NOT NULL REFERENCES pengajuan_harga(id) ON DELETE CASCADE,
    komoditas_id UUID REFERENCES master_komoditas(id) ON DELETE SET NULL,
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Bahan Pokok',
    satuan VARCHAR(50) NOT NULL DEFAULT '1 KG',
    harga NUMERIC(12, 2) NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PK-18, PK-19, PK-20: Pembaruan Skema GPM & Pendaftar GPM
ALTER TABLE acara_gpm
    ADD COLUMN IF NOT EXISTS mode_pendaftaran VARCHAR(20) NOT NULL DEFAULT 'online',
    ADD COLUMN IF NOT EXISTS mode_penerima VARCHAR(20) NOT NULL DEFAULT 'individu';

ALTER TABLE pendaftar_gpm
    ADD COLUMN IF NOT EXISTS status_pengambilan VARCHAR(30) NOT NULL DEFAULT 'Belum Diambil',
    ADD COLUMN IF NOT EXISTS waktu_pengambilan TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS petugas_id_verifikasi UUID,
    ADD COLUMN IF NOT EXISTS no_kk VARCHAR(16),
    ADD COLUMN IF NOT EXISTS nama_kepala_keluarga VARCHAR(150),
    ADD COLUMN IF NOT EXISTS jumlah_anggota INT DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pendaftar_gpm_acara_kk_unik
    ON pendaftar_gpm (acara_id, no_kk)
    WHERE no_kk IS NOT NULL AND TRIM(no_kk) <> '';

-- Perbarui RPC verifikasi kehadiran untuk mencegah scan ganda jika sudah Hadir
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
    SELECT * INTO v_pendaftar FROM pendaftar_gpm pg WHERE UPPER(TRIM(pg.kode_barcode)) = UPPER(TRIM(COALESCE(p_kode_barcode, ''))) LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tiket dengan kode QR "%" tidak ditemukan di basis data.', p_kode_barcode; END IF;

    IF v_status_final = 'Hadir' AND v_pendaftar.status_kehadiran = 'Hadir' THEN
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
           petugas_verifikasi = COALESCE(p_petugas_id, pg.petugas_verifikasi),
           petugas_id_verifikasi = COALESCE(p_petugas_id, pg.petugas_id_verifikasi)
     WHERE pg.id = v_pendaftar.id
    RETURNING pg.id, pg.acara_id, pg.nama_pendaftar, pg.nomor_telepon, pg.nik, pg.jalur_pendaftaran, pg.nomor_antrean, pg.kode_barcode, pg.status_kehadiran, pg.waktu_kehadiran, pg.waktu_mendaftar, pg.status_pengambilan, pg.waktu_pengambilan;
END;
$$;
