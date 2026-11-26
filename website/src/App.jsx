// ===================================================================================
// MODUL APLIKASI UTAMA WEB — SIPATOKAAN MANADO
// Dinas Pangan Pemerintah Kota Manado
// Mengelola navigasi bersih antara Portal Publik, Portal Login, & Dashboard Petugas
// ===================================================================================

import { useState } from 'react';
import HargaPanganWeb from './components/HargaPanganWeb';
import LoginPortal from './components/LoginPortal';
import PetugasDashboard from './components/PetugasDashboard';
import SplashScreenWeb from './components/SplashScreenWeb';
import { hargaPanganService } from './services/HargaPanganService';
import './index.css';

function App() {
  const [activeView, setActiveView] = useState('harga-pangan'); // 'harga-pangan' | 'login' | 'petugas'
  const [penggunaAktif, setPenggunaAktif] = useState(() => hargaPanganService.ambilUser());

  const renderKontenUtama = () => {
    if (activeView === 'login') {
      return (
        <LoginPortal
          onLoginSukses={(user) => {
            setPenggunaAktif(user);
            setActiveView('petugas');
          }}
          onKembaliKePublik={() => setActiveView('harga-pangan')}
        />
      );
    }

    if (activeView === 'petugas') {
      const userSah = penggunaAktif || hargaPanganService.ambilUser();
      if (!userSah || !hargaPanganService.ambilToken()) {
        return (
          <LoginPortal
            onLoginSukses={(user) => {
              setPenggunaAktif(user);
              setActiveView('petugas');
            }}
            onKembaliKePublik={() => setActiveView('harga-pangan')}
          />
        );
      }

      return (
        <PetugasDashboard
          pengguna={userSah}
          onKeluar={() => {
            hargaPanganService.keluar();
            setPenggunaAktif(null);
            setActiveView('harga-pangan');
          }}
        />
      );
    }

    return (
      <HargaPanganWeb
        onBukaLogin={() => {
          const userSah = hargaPanganService.ambilUser();
          if (hargaPanganService.ambilToken() && userSah) {
            setPenggunaAktif(userSah);
            setActiveView('petugas');
          } else {
            setActiveView('login');
          }
        }}
      />
    );
  };

  return (
    <>
      <SplashScreenWeb />
      {renderKontenUtama()}
    </>
  );
}

export default App;
