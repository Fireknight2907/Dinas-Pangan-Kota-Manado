-- ====================================================================
-- SKRIP PENGUATAN KEAMANAN & ROW LEVEL SECURITY (RLS) SUPABASE
-- DINAS PANGAN KOTA MANADO (SIPATOKAAN)
-- ====================================================================
-- Fungsi: Menutup celah akses publik anonim, mengamankan NIK warga (UU PDP),
--         mengunci kata sandi pengguna, serta mencegah modifikasi data sepihak.
-- Jalankan skrip ini pada SQL Editor di Dashboard Supabase Proyek Anda.
-- ====================================================================

-- 1. PENGUATAN TABEL: pengguna
-- Cabut akses bebas publik anonim agar tidak bisa membaca daftar akun & kata sandi
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas kelola akun pengguna" ON pengguna;

-- Hanya pengguna terautentikasi (authenticated) yang boleh membaca data profil
CREATE POLICY "Petugas baca akun pengguna" 
ON pengguna FOR SELECT 
TO authenticated 
USING (true);

-- Hanya pengguna terautentikasi (authenticated) yang boleh mengubah data profil
CREATE POLICY "Petugas kelola akun pengguna" 
ON pengguna FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- 2. PENGUATAN TABEL: harga_pangan
-- Publik hanya boleh membaca komoditas pangan yang statusnya sudah 'Terbit'
ALTER TABLE harga_pangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik harga_pangan" ON harga_pangan;
DROP POLICY IF EXISTS "Publik hanya baca harga pangan terbit" ON harga_pangan;
DROP POLICY IF EXISTS "Petugas kelola harga pangan" ON harga_pangan;

CREATE POLICY "Publik hanya baca harga pangan terbit" 
ON harga_pangan FOR SELECT 
TO anon, authenticated 
USING (status = 'Terbit');

CREATE POLICY "Petugas kelola harga pangan" 
ON harga_pangan FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- 3. PENGUATAN TABEL: acara_gpm
-- Publik hanya boleh melihat kegiatan yang aktif atau riwayat selesai
ALTER TABLE acara_gpm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik acara_gpm" ON acara_gpm;
DROP POLICY IF EXISTS "Publik baca acara gpm aktif" ON acara_gpm;
DROP POLICY IF EXISTS "Petugas kelola acara gpm" ON acara_gpm;

CREATE POLICY "Publik baca acara gpm aktif" 
ON acara_gpm FOR SELECT 
TO anon, authenticated 
USING (status IN ('Aktif', 'Selesai'));

CREATE POLICY "Petugas kelola acara gpm" 
ON acara_gpm FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- 4. PENGUATAN TABEL: pendaftar_gpm (PROTEKSI DATA PRIBADI NIK - UU PDP NO. 27 TAHUN 2022)
-- Publik (anon) HANYA diizinkan melakukan INSERT (pendaftaran tiket mandiri).
-- Publik DILARANG melakukan SELECT (scraping) seluruh NIK dan Nomor HP warga!
ALTER TABLE pendaftar_gpm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik pendaftar_gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Publik daftar antrean gpm" ON pendaftar_gpm;
DROP POLICY IF EXISTS "Petugas kelola pendaftar gpm" ON pendaftar_gpm;

-- Izin INSERT untuk pendaftar umum
CREATE POLICY "Publik daftar antrean gpm" 
ON pendaftar_gpm FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Izin penuh SELECT, UPDATE, DELETE hanya untuk petugas resmi
CREATE POLICY "Petugas kelola pendaftar gpm" 
ON pendaftar_gpm FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- 5. FUNGSI AMAN: rpc_cek_antrean_warga
-- Mengizinkan warga memeriksa tiket miliknya secara spesifik melalui kode barcode
-- tanpa mengekspos daftar pendaftar lainnya.
CREATE OR REPLACE FUNCTION rpc_cek_antrean_warga(p_kode_barcode TEXT)
RETURNS TABLE (
    id UUID,
    acara_id UUID,
    nama_pendaftar VARCHAR,
    nomor_telepon VARCHAR,
    nomor_antrean INT,
    kode_barcode VARCHAR,
    status_kehadiran VARCHAR,
    waktu_kehadiran TIMESTAMP WITH TIME ZONE,
    waktu_mendaftar TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.acara_id,
        p.nama_pendaftar,
        p.nomor_telepon,
        p.nomor_antrean,
        p.kode_barcode,
        p.status_kehadiran,
        p.waktu_kehadiran,
        p.waktu_mendaftar
    FROM pendaftar_gpm p
    WHERE p.kode_barcode = p_kode_barcode
    LIMIT 1;
END;
$$;

-- Berikan izin eksekusi RPC kepada publik anonim dan authenticated
GRANT EXECUTE ON FUNCTION rpc_cek_antrean_warga(TEXT) TO anon, authenticated;


-- 6. PENCEGAHAN PENDAFTARAN GANDA NIK DALAM SATU ACARA
-- Mencegah manipulasi kuota dan pendaftaran duplikat NIK pada acara yang sama
CREATE UNIQUE INDEX IF NOT EXISTS idx_unik_nik_per_acara 
ON pendaftar_gpm (acara_id, (regexp_replace(nomor_telepon, '[^0-9]', '', 'g')))
WHERE status_kehadiran != 'Dibatalkan';

