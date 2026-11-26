// ===================================================================================
// KOMPONEN ANIMASI SPLASH SCREEN RESMI PEMBUKA PORTAL (WEBSITE)
// Instansi: Dinas Pangan Pemerintah Kota Manado — SIPATOKAAN Manado
// Fungsi: Menampilkan animasi pembuka beridentitas Logo Pemerintah Kota Manado
//         saat halaman web pertama kali dimuat (responsif desktop & mobile-web),
//         lalu memudar halus secara otomatis ke tampilan utama.
// ===================================================================================

import React, { useEffect, useState } from 'react';
import './SplashScreenWeb.css';

export default function SplashScreenWeb({ durasiMs = 1750 }) {
  const [statusFase, setStatusFase] = useState('tampil'); // 'tampil' | 'keluar' | 'selesai'

  useEffect(() => {
    const timerKeluar = setTimeout(() => {
      setStatusFase('keluar');
    }, Math.max(900, durasiMs));

    const timerSelesai = setTimeout(() => {
      setStatusFase('selesai');
    }, Math.max(900, durasiMs) + 460);

    return () => {
      clearTimeout(timerKeluar);
      clearTimeout(timerSelesai);
    };
  }, [durasiMs]);

  if (statusFase === 'selesai') return null;

  return (
    <div
      className={`sipatokaan-splash-overlay ${statusFase === 'keluar' ? 'is-fading-out' : ''}`}
      role="status"
      aria-label="Memuat SIPATOKAAN Manado"
      onClick={() => setStatusFase('keluar')}
    >
      <div className="splash-ambient-orb orb-top" />
      <div className="splash-ambient-orb orb-bottom" />

      <div className="splash-center-card">
        <div className="splash-logo-stage">
          <div className="splash-pulse-ring ring-outer" />
          <div className="splash-pulse-ring ring-inner" />
          <div className="splash-emblem-circle">
            <img
              src="/logodinaspangan.png"
              alt="Logo Pemerintah Kota Manado"
              className="splash-pemkot-logo"
            />
          </div>
        </div>

        <span className="splash-pemkot-pill">PEMERINTAH KOTA MANADO</span>
        <h1 className="splash-brand-title">SIPATOKAAN Manado</h1>
        <p className="splash-brand-sub">
          Sistem Informasi Pangan · Dinas Pangan Kota Manado
        </p>

        <div className="splash-progress-track">
          <div className="splash-progress-fill" />
        </div>
        <span className="splash-loading-caption">Menyiapkan data pangan resmi terkini...</span>
      </div>
    </div>
  );
}
