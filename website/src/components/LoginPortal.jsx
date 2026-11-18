// ===================================================================================
// MODUL ANTARMUKA AUTENTIKASI: PORTAL LOGIN PETUGAS SI PATOKAAN
// Dinas Pangan Kota Manado — Mendukung multi-role (Admin, Kabid, Staf, Kadis)
// ===================================================================================

import React, { useState, useEffect } from 'react';
import { penggunaService } from '../services/PenggunaService';
import { hargaPanganService } from '../services/HargaPanganService';
import './LoginPortal.css';

// [CEK-06 FIX] Brute-force protection — maks 5 percobaan, lockout 5 menit
const MAKS_PERCOBAAN = 5;
const DURASI_LOCKOUT_MS = 5 * 60 * 1000; // 5 menit
const KUNCI_LOCKOUT = 'sipatokaan_login_lockout';

function bacaStatusLockout() {
  try {
    const raw = sessionStorage.getItem(KUNCI_LOCKOUT);
    if (!raw) return { percobaan: 0, lockoutSampai: null };
    return JSON.parse(raw);
  } catch { return { percobaan: 0, lockoutSampai: null }; }
}
function simpanStatusLockout(data) {
  sessionStorage.setItem(KUNCI_LOCKOUT, JSON.stringify(data));
}

export default function LoginPortal({ onLoginSukses, onKembaliKePublik }) {
  const [emailUsername, setEmailUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ingatSaya, setIngatSaya] = useState(false); // Default: Centang MATI sesuai instruksi pimpinan
  const [lihatPassword, setLihatPassword] = useState(false);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState('');
  const [sisaWaktuLockout, setSisaWaktuLockout] = useState(0);

  // Countdown timer saat lockout aktif
  useEffect(() => {
    const status = bacaStatusLockout();
    if (status.lockoutSampai && Date.now() < status.lockoutSampai) {
      const interval = setInterval(() => {
        const sisa = Math.ceil((status.lockoutSampai - Date.now()) / 1000);
        if (sisa <= 0) {
          simpanStatusLockout({ percobaan: 0, lockoutSampai: null });
          setSisaWaktuLockout(0);
          clearInterval(interval);
        } else {
          setSisaWaktuLockout(sisa);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sisaWaktuLockout]);

  // Handler pengiriman form login
  const handleLogin = async (e) => {
    e.preventDefault();

    // [CEK-06] Cek lockout sebelum proses login
    const status = bacaStatusLockout();
    if (status.lockoutSampai && Date.now() < status.lockoutSampai) {
      const sisa = Math.ceil((status.lockoutSampai - Date.now()) / 1000);
      setSisaWaktuLockout(sisa);
      setPesanError(`Terlalu banyak percobaan gagal. Coba lagi dalam ${sisa} detik.`);
      return;
    }

    setSedangMemuat(true);
    setPesanError('');

    try {
      const hasil = await penggunaService.login(emailUsername, password, ingatSaya);
      // Reset lockout counter saat berhasil login
      simpanStatusLockout({ percobaan: 0, lockoutSampai: null });
      hargaPanganService.simpanSesi(hasil.token, hasil.pengguna, ingatSaya);
      if (onLoginSukses) {
        onLoginSukses(hasil.pengguna);
      }
    } catch (err) {
      // [CEK-06] Tambah hitungan percobaan gagal
      const st = bacaStatusLockout();
      const percobaan = (st.percobaan || 0) + 1;
      if (percobaan >= MAKS_PERCOBAAN) {
        const lockoutSampai = Date.now() + DURASI_LOCKOUT_MS;
        simpanStatusLockout({ percobaan, lockoutSampai });
        const sisaMenit = Math.ceil(DURASI_LOCKOUT_MS / 60000);
        setPesanError(`Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenit} menit.`);
        setSisaWaktuLockout(DURASI_LOCKOUT_MS / 1000);
      } else {
        simpanStatusLockout({ percobaan, lockoutSampai: null });
        const sisa = MAKS_PERCOBAAN - percobaan;
        setPesanError((err.message || 'Gagal masuk.') + ` (${sisa} percobaan tersisa)`);
      }
    } finally {
      setSedangMemuat(false);
    }
  };

  return (
    <div className="login-portal-backdrop">
      {/* Tombol Kembali ke Halaman Publik */}
      <button 
        className="btn-kembali-publik" 
        onClick={onKembaliKePublik}
        title="Kembali ke Beranda Publik"
      >
        ← Kembali ke Beranda
      </button>

      {/* Kartu Login di Tengah */}
      <div className="login-portal-card">
        {/* Logo Bibit & Judul SI PATOKAAN */}
        <div className="login-header-section">
          <div className="login-logo-box">
            <img src="/logodinaspangan.png" alt="Logo SIPATOKAAN" className="login-logo-img" />
          </div>
          <div className="login-title-group">
            <h2 className="portal-brand-title">SI PATOKAAN</h2>
            <p className="portal-sub-title">PORTAL UTAMA</p>
          </div>
        </div>

        {/* Heading Sambutan */}
        <div className="login-welcome-text">
          <h3>Selamat Datang</h3>
          <p>Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Alert Error jika gagal login */}
        {pesanError && (
          <div className="login-error-alert">
            ⚠️ {pesanError}
          </div>
        )}

        {/* Peringatan lockout aktif */}
        {sisaWaktuLockout > 0 && (
          <div className="login-error-alert" style={{ background: '#7f1d1d', borderColor: '#dc2626' }}>
            🔒 Akses dikunci. Coba lagi dalam: <strong>{Math.floor(sisaWaktuLockout / 60)}:{String(sisaWaktuLockout % 60).padStart(2, '0')}</strong>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="login-form-body">
          {/* Input Nama Pengguna / Email */}
          <div className="login-input-group">
            <label className="login-input-label">NAMA PENGGUNA / EMAIL</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                required
                className="login-input-field"
                placeholder="Nama pengguna atau email"
                value={emailUsername}
                onChange={(e) => setEmailUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Input Kata Sandi */}
          <div className="login-input-group">
            <label className="login-input-label">KATA SANDI</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={lihatPassword ? "text" : "password"}
                required
                className="login-input-field"
                placeholder="Masukan kata sandi (minimal 8 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="btn-toggle-eye"
                onClick={() => setLihatPassword(!lihatPassword)}
                title={lihatPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {lihatPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Opsi Ingat Saya & Lupa Kata Sandi */}
          <div className="login-options-row">
            <label className="checkbox-remember-me">
              <input
                type="checkbox"
                checked={ingatSaya}
                onChange={(e) => setIngatSaya(e.target.checked)}
              />
              <span>Ingat saya</span>
            </label>
            <a href="#lupa" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert('Silakan hubungi administrator Dinas Pangan untuk mengatur ulang kata sandi.'); }}>
              Lupa kata sandi?
            </a>
          </div>

          {/* Tombol Submit Masuk Sekarang */}
          <button 
            type="submit" 
            className="btn-login-submit"
            disabled={sedangMemuat || sisaWaktuLockout > 0}
          >
            {sedangMemuat ? 'Memproses Masuk...' : (sisaWaktuLockout > 0 ? '🔒 Dikunci' : 'Masuk Sekarang')}
          </button>
        </form>
      </div>
    </div>
  );
}
