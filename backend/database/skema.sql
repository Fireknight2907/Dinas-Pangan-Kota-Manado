-- Skema Database PostgreSQL untuk Supabase - Dinas Pangan Kota Manado

-- 1. Tabel Pengguna (Admin, Kabid, Staf, Kadis)
CREATE TABLE IF NOT EXISTS pengguna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    kata_sandi VARCHAR(255) NOT NULL,
    peran VARCHAR(50) NOT NULL CHECK (peran IN ('Admin', 'Kabid', 'Staf', 'Kadis', 'Petugas', 'Kepala_Dinas')),
    bidang VARCHAR(100),
    foto_profil TEXT,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Informasi Pangan
CREATE TABLE informasi_pangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    konten TEXT NOT NULL,
    kategori VARCHAR(100) DEFAULT 'Umum', -- Contoh: 'Berita', 'Pengumuman', 'Tips Gizi', 'Umum'
    gambar_url TEXT,                      -- URL gambar opsional
    penulis_id UUID REFERENCES pengguna(id),
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Ketersediaan Pangan
CREATE TABLE ketersediaan_pangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_pangan VARCHAR(100) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL,
    jumlah DECIMAL(10, 2) NOT NULL, -- Misal: dalam Ton atau Kg
    kondisi VARCHAR(100),
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Pemetaan Kerawanan (Status per Kecamatan)
CREATE TABLE kerawanan_pangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kecamatan VARCHAR(100) UNIQUE NOT NULL,
    status_warna VARCHAR(20) NOT NULL CHECK (status_warna IN ('Hijau', 'Oranye', 'Merah')),
    jumlah_kerawanan INT DEFAULT 0,
    keterangan TEXT,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Acara GPM (Gerakan Pangan Murah)
CREATE TABLE acara_gpm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_acara VARCHAR(255) NOT NULL,
    lokasi VARCHAR(255) NOT NULL,
    tanggal TIMESTAMP WITH TIME ZONE NOT NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Pendaftar GPM (Masyarakat)
CREATE TABLE pendaftar_gpm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acara_id UUID REFERENCES acara_gpm(id) ON DELETE CASCADE,
    nama_pendaftar VARCHAR(100) NOT NULL,
    nomor_antrean INT NOT NULL,
    kode_barcode VARCHAR(100) UNIQUE NOT NULL,
    waktu_mendaftar TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Harga Pangan (Bidang Cadangan dan Distribusi Pangan)
CREATE TABLE harga_pangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('Bahan Pokok', 'Hewani', 'Sayuran', 'Buah', 'Lainnya')),
    satuan VARCHAR(20) NOT NULL DEFAULT 'KG',
    harga NUMERIC(12, 2) NOT NULL,
    nama_pasar VARCHAR(150) NOT NULL,
    tanggal_penetapan DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan_perubahan TEXT,
    bidang VARCHAR(100) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    petugas_id UUID REFERENCES pengguna(id) ON DELETE SET NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

