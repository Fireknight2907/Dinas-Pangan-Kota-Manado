-- ===================================================================================
-- DATA AWAL (SEED) PENGGUNA SISTEM SIPATOKAAN
-- Dinas Pangan Kota Manado — Mendukung Peran Admin, Kabid, Staf, dan Kadis
-- ===================================================================================

-- Catatan: Kata sandi awal seluruh akun bawaan adalah '12345678'
-- Hash bcrypt di bawah ini di-generate untuk kata sandi: 12345678 ($2b$10$w09Zk.P...)

INSERT INTO pengguna (nama, username, email, kata_sandi, peran, bidang)
VALUES 
-- 1. Akun Staf (effrend)
('Effrend', 'effrend', 'effrend@manado.go.id', '$2b$10$k1Gg7QYh8Wp3nQWf5uRkE.6PZz4z7o/P9Ew4D3J0q.F2LgH8k4z.S', 'Staf', 'Bidang Cadangan dan Distribusi Pangan'),

-- 2. Akun Administrator (regina & edrick)
('Regina', 'regina', 'regina@manado.go.id', '$2b$10$k1Gg7QYh8Wp3nQWf5uRkE.6PZz4z7o/P9Ew4D3J0q.F2LgH8k4z.S', 'Admin', 'Administrator Sistem (Superadmin)'),
('Edrick', 'edrick', 'edrick@manado.go.id', '$2b$10$k1Gg7QYh8Wp3nQWf5uRkE.6PZz4z7o/P9Ew4D3J0q.F2LgH8k4z.S', 'Admin', 'Administrator Sistem (Superadmin)'),

-- 3. Akun Kepala Bidang (mareta)
('Mareta', 'mareta', 'mareta@manado.go.id', '$2b$10$k1Gg7QYh8Wp3nQWf5uRkE.6PZz4z7o/P9Ew4D3J0q.F2LgH8k4z.S', 'Kabid', 'Kepala Bidang Cadangan & Distribusi Pangan'),

-- 4. Akun Kepala Dinas (kadis)
('Kepala Dinas Pangan', 'kadis', 'kadis@manado.go.id', '$2b$10$k1Gg7QYh8Wp3nQWf5uRkE.6PZz4z7o/P9Ew4D3J0q.F2LgH8k4z.S', 'Kadis', 'Pimpinan Dinas Pangan Kota Manado')
ON CONFLICT (username) DO UPDATE 
SET peran = EXCLUDED.peran,
    bidang = EXCLUDED.bidang;
