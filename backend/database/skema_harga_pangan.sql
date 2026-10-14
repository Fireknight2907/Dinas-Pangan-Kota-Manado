-- ====================================================================
-- SKEMA BASIS DATA: BIDANG CADANGAN DAN DISTRIBUSI PANGAN
-- Dinas Pangan Kota Manado - Sistem Informasi SIPATOKAAN
-- ====================================================================

-- 1. Membuat tabel harga_pangan untuk pemantauan harga komoditas
CREATE TABLE IF NOT EXISTS harga_pangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_komoditas VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('Bahan Pokok', 'Hewani', 'Sayuran', 'Buah', 'Lainnya')),
    satuan VARCHAR(20) NOT NULL DEFAULT 'KG', -- Contoh: 'KG', 'LITER'
    harga NUMERIC(12, 2) NOT NULL,
    nama_pasar VARCHAR(150) NOT NULL,        -- Contoh: 'Pasar Bersehati Karombasan', 'Pasar Tradisional Tuminting'
    tanggal_penetapan DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan_perubahan TEXT,
    bidang VARCHAR(100) DEFAULT 'Bidang Cadangan dan Distribusi Pangan',
    petugas_id UUID REFERENCES pengguna(id) ON DELETE SET NULL,
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat pencarian berdasarkan kategori, nama pasar, dan tanggal
CREATE INDEX IF NOT EXISTS idx_harga_pangan_kategori ON harga_pangan(kategori);
CREATE INDEX IF NOT EXISTS idx_harga_pangan_pasar ON harga_pangan(nama_pasar);
CREATE INDEX IF NOT EXISTS idx_harga_pangan_tanggal ON harga_pangan(tanggal_penetapan);

-- 2. Data Awal (Dummy/Seed Data Sesuai Tampilan Desain SIPATOKAAN)
INSERT INTO harga_pangan (nama_komoditas, kategori, satuan, harga, nama_pasar, tanggal_penetapan) VALUES
('Beras Medium', 'Bahan Pokok', 'KG', 13500, 'Pasar Bersehati Karombasan', '2026-10-08'),
('Beras Premium', 'Bahan Pokok', 'KG', 15500, 'Pasar Bersehati Karombasan', '2026-10-08'),
('Minyak Goreng Kemasan', 'Bahan Pokok', 'LITER', 18000, 'Pasar Tradisional Tuminting', '2026-10-08'),
('Gula Pasir', 'Bahan Pokok', 'KG', 16000, 'Pasar Tradisional Tuminting', '2026-10-08'),
('Telur Ayam', 'Hewani', 'KG', 28000, 'Pasar Bersehati Sario', '2026-10-08'),
('Daging Ayam', 'Hewani', 'KG', 38000, 'Pasar Bersehati Sario', '2026-10-08'),
('Daging Sapi', 'Hewani', 'KG', 135000, 'Pasar Tradisional Bahu', '2026-10-08'),
('Bawang Merah', 'Sayuran', 'KG', 32000, 'Pasar Tradisional Bahu', '2026-10-08'),
('Bawang Putih', 'Sayuran', 'KG', 35000, 'Pasar Bersehati Karombasan', '2026-10-08');
