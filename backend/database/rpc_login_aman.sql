-- ====================================================================
-- SKRIP RPC LOGIN AMAN & PROTEKSI KATA SANDI - SIPATOKAAN
-- Dinas Pangan Kota Manado
-- ====================================================================
-- 1. Buat fungsi RPC login: pencocokan hash sandi dilakukan di sisi server
--    dan kata_sandi TIDAK PERNAH dikirim balik ke client.
-- 2. Terapkan Column-Level Security agar role 'anon' tidak bisa membaca
--    kolom 'kata_sandi' meskipun melakukan query tabel pengguna.
-- ====================================================================
-- Jalankan skrip ini pada SQL Editor di Supabase Dashboard.
-- ====================================================================

-- 1. Hapus fungsi lama jika ada
DROP FUNCTION IF EXISTS rpc_login_pengguna(TEXT, TEXT);

-- 2. Buat fungsi RPC login aman
CREATE OR REPLACE FUNCTION rpc_login_pengguna(
    p_identifier TEXT,   -- username atau email
    p_hash_sandi TEXT    -- SHA-256 hash kata sandi dari client
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
SECURITY DEFINER  -- Berjalan dengan hak akses pembuat (postgres), bypass RLS
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

-- 3. Berikan izin eksekusi RPC kepada publik anonim dan authenticated
GRANT EXECUTE ON FUNCTION rpc_login_pengguna(TEXT, TEXT) TO anon, authenticated;


-- 4. Cabut hak akses langsung membaca kolom kata_sandi untuk anon (Column-Level Security)
REVOKE ALL ON TABLE pengguna FROM anon;
GRANT SELECT (id, nama, username, email, peran, bidang, foto_profil, dibuat_pada) ON TABLE pengguna TO anon;
GRANT INSERT, UPDATE, DELETE ON TABLE pengguna TO anon;

-- 5. Kebijakan Row Level Security (RLS)
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas baca akun pengguna" ON pengguna;
DROP POLICY IF EXISTS "Petugas kelola akun pengguna" ON pengguna;
DROP POLICY IF EXISTS "Anon kelola pengguna terbatas" ON pengguna;

-- Izin SELECT bagi anon & authenticated (kolom kata_sandi tetap diblokir oleh GRANT di atas)
CREATE POLICY "Petugas baca akun pengguna"
ON pengguna FOR SELECT
TO anon, authenticated
USING (true);

-- Izin kelola (INSERT, UPDATE, DELETE) untuk operasional aplikasi
CREATE POLICY "Petugas kelola akun pengguna"
ON pengguna FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Verifikasi pengaturan RLS & Hak Akses
SELECT grantee, table_name, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_name = 'pengguna' AND grantee = 'anon';

SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'pengguna';
