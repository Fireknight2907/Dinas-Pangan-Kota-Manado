// ===================================================================================
// KOMPONEN LOGIN PETUGAS: PORTAL UTAMA SI PATOKAAN (DESKTOP & RESPONSIVE)
// Sesuai Gambar 4: Background Ilustrasi Pangan + Card Glassy Maroon
// ===================================================================================

import React, { useState } from 'react';
import { hargaPanganService } from '../services/HargaPanganService';
import './LoginPortal.css';

export default function LoginPortal({ onLoginSukses, onKembaliKePublik }) {
  const [emailUsername, setEmailUsername] = useState('roni@manado.go.id');
  const [password, setPassword] = useState('password123');
  const [ingatSaya, setIngatSaya] = useState(true);
  const [lihatPassword, setLihatPassword] = useState(false);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState('');

  // Handler pengiriman form login
  const handleLogin = async (e) => {
    e.preventDefault();
    setSedangMemuat(true);
    setPesanError('');

    try {
      const hasil = await hargaPanganService.login(emailUsername, password);
      if (onLoginSukses) {
        onLoginSukses(hasil.pengguna);
      }
    } catch (err) {
      setPesanError(err.message || 'Login gagal. Periksa kembali akun Anda.');
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

      {/* Kartu Login di Tengah (Sesuai Gambar 4) */}
      <div className="login-portal-card">
        {/* Logo Bibit & Judul SI PATOKAAN */}
        <div className="login-header-section">
          <div className="login-logo-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
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

        {/* Form Login */}
        <form onSubmit={handleLogin} className="login-form-body">
          {/* Input Email / Username */}
          <div className="login-input-group">
            <label className="login-input-label">EMAIL / USERNAME</label>
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
                placeholder="Masukkan email atau username"
                value={emailUsername}
                onChange={(e) => setEmailUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="login-input-group">
            <label className="login-input-label">PASSWORD</label>
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
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="btn-toggle-eye"
                onClick={() => setLihatPassword(!lihatPassword)}
              >
                {lihatPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Opsi Ingat Saya & Lupa Password */}
          <div className="login-options-row">
            <label className="checkbox-remember-me">
              <input
                type="checkbox"
                checked={ingatSaya}
                onChange={(e) => setIngatSaya(e.target.checked)}
              />
              <span>Ingat saya</span>
            </label>
            <a href="#lupa" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert('Silakan hubungi administrator Dinas Pangan untuk reset kata sandi.'); }}>
              Lupa password?
            </a>
          </div>

          {/* Tombol Submit Masuk Sekarang */}
          <button 
            type="submit" 
            className="btn-login-submit"
            disabled={sedangMemuat}
          >
            {sedangMemuat ? 'Memproses Masuk...' : 'Masuk Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
