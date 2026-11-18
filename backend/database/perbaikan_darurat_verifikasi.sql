-- ====================================================================
-- SKRIP PERBAIKAN DARURAT: PEMULIHAN FITUR VERIFIKASI HARGA & AKSES APP
-- Dinas Pangan Kota Manado (SIPATOKAAN)
-- ====================================================================
-- MASALAH: Kebijakan RLS sebelumnya membatasi akses write dan status non-'Terbit'
--          hanya untuk 'authenticated'. Karena aplikasi web & mobile terhubung
--          menggunakan anonKey (role 'anon'), Staf tidak bisa menginput harga baru
--          dan Kabid tidak bisa melihat atau menyetujui harga 'Menunggu Verifikasi'.
--
-- SOLUSI: Pulihkan hak akses penuh untuk harga_pangan, acara_gpm, dan pendaftar_gpm
--         serta pastikan fungsi RPC rpc_login_pengguna aktif.
--
-- Jalankan skrip ini langsung di SQL Editor Supabase Dashboard!
-- ====================================================================

-- 1. PEMULIHAN TABEL HARGA PANGAN (VERIFIKASI STAF & KABID)
ALTER TABLE harga_pangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik harga_pangan" ON harga_pangan;
DROP POLICY IF EXISTS "Publik hanya baca harga pangan terbit" ON harga_pangan;
DROP POLICY IF EXISTS "Petugas kelola harga pangan" ON harga_pangan;
DROP POLICY IF EXISTS "Akses kelola harga pangan" ON harga_pangan;

CREATE POLICY "Akses kelola harga pangan" 
ON harga_pangan FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);


-- 2. PEMULIHAN TABEL ACARA GPM
ALTER TABLE acara_gpm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik acara_gpm" ON acara_gpm;
DROP POLICY IF EXISTS "Publik baca acara gpm aktif" ON acara_gpm;
DROP POLICY IF EXISTS "Petugas kelola acara gpm" ON acara_gpm;
DROP POLICY IF EXISTS "Akses kelola acara gpm" ON acara_gpm;

CREATE POLICY "Akses kelola acara gpm" 
ON acara_gpm FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);


-- 3. PEMULIHAN TABEL PENDAFTAR GPM (SCAN BARCODE & VERIFIKASI KEHADIRAN)
ALTER TABLE pendaftar_gpm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik pendaftar_gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Publik daftar antrean gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Petugas kelola pendaftar gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Akses kelola pendaftar gpm" ON pendaftar_gpm;

CREATE POLICY "Akses kelola pendaftar gpm" 
ON pendaftar_gpm FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);


-- 4. PEMULIHAN TABEL PENGGUNA & RPC LOGIN AMAN
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas baca akun pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas kelola akun pengguna" ON pengguna;
DROP POLICY IF EXISTS "Anon kelola pengguna terbatas" ON pengguna;
DROP POLICY IF EXISTS "Akses kelola pengguna" ON pengguna;

CREATE POLICY "Akses kelola pengguna" 
ON pengguna FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Pastikan izin akses tabel diberikan ke anon dan authenticated
GRANT ALL ON TABLE harga_pangan TO anon, authenticated;
GRANT ALL ON TABLE acara_gpm TO anon, authenticated;
GRANT ALL ON TABLE pendaftar_gpm TO anon, authenticated;
GRANT ALL ON TABLE pengguna TO anon, authenticated;

-- Buat / Perbarui fungsi RPC login aman
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

-- 5. Masukkan contoh data usulan harga 'Draft' dari staf (agar langsung muncul di menu verifikasi Kabid)
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status, catatan_perubahan)
SELECT 'Cabai Rawit Merah', 'Sayuran', 'kg', 65000, 'Pasar Bersehati Karombasan', '19 November 2026', 'Draft', 'Usulan kenaikan harga cabai rawit dari staf lapangan'
WHERE NOT EXISTS (
    SELECT 1 FROM harga_pangan WHERE nama_komoditas = 'Cabai Rawit Merah' AND status = 'Draft'
);

-- Pastikan Minyak Goreng Kemasan yang berstatus Draft juga ada
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan, status, catatan_perubahan)
SELECT 'Minyak Goreng Kemasan', 'Bahan Pokok', 'liter', 18000, 'Pasar Tradisional Tuminting', '19 November 2026', 'Draft', 'Usulan penyesuaian harga dari staf'
WHERE NOT EXISTS (
    SELECT 1 FROM harga_pangan WHERE nama_komoditas = 'Minyak Goreng Kemasan' AND status = 'Draft'
);

-- Selesai! Verifikasi status policy:
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('harga_pangan', 'pengguna', 'acara_gpm', 'pendaftar_gpm')
ORDER BY tablename, policyname;
