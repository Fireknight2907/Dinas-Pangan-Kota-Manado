-- Skema Database PostgreSQL untuk Supabase - Dinas Pangan Kota Manado

-- 1. Tabel Pengguna (Admin, Petugas Bidang, Kepala Dinas)
CREATE TABLE pengguna (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    kata_sandi VARCHAR(255) NOT NULL, -- Di-hash jika tidak menggunakan Auth bawaan Supabase
    peran VARCHAR(50) NOT NULL CHECK (peran IN ('Admin', 'Petugas', 'Kepala_Dinas')),
    bidang VARCHAR(100), -- Contoh: 'Ketersediaan', 'Kerawanan', dll. (Null untuk Admin/Kepala Dinas)
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
