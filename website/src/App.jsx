import { useState, useEffect } from 'react'
import PetaKerawanan from './PetaKerawanan'
import PetaKetersediaan from './PetaKetersediaan'
import PetaAdmin from './PetaAdmin'
import Barcode from 'react-barcode'
import './index.css'

function App() {
  const [dataPesan, setDataPesan] = useState('');
  const [activeView, setActiveView] = useState('home'); // home, peta, gpm, data, admin
  
  // State untuk GPM
  const [namaPendaftar, setNamaPendaftar] = useState('');
  const [tiketGPM, setTiketGPM] = useState(null);

  // State untuk Detail Peta Ketersediaan
  const [detailWilayah, setDetailWilayah] = useState(null);

  // State untuk Panel Admin
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminMenu, setAdminMenu] = useState('dashboard'); // dashboard, ketersediaan, kerawanan, gpm, pengguna

  // Cek koneksi ke backend
  useEffect(() => {
    fetch('http://localhost:3000/')
      .then(res => res.json())
      .then(data => setDataPesan(data.pesan))
      .catch(err => setDataPesan('Gagal terhubung ke server Backend. Pastikan backend sudah berjalan.'));
  }, []);

  const handleDaftarGPM = () => {
    if(!namaPendaftar.trim()) {
      alert('Tolong masukkan nama Anda terlebih dahulu!');
      return;
    }
    const nomorAntrean = Math.floor(Math.random() * 100) + 1;
    const kodeBarcode = `GPM-MND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    setTiketGPM({
      nama: namaPendaftar,
      antrean: nomorAntrean,
      kode: kodeBarcode
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Dinas Pangan Kota Manado</h1>
        <p>Sistem Informasi dan Ketahanan Pangan</p>
        {activeView !== 'home' && (
          <button className="btn" style={{marginTop: '15px'}} onClick={() => { setActiveView('home'); setTiketGPM(null); setNamaPendaftar(''); setDetailWilayah(null); }}>Kembali ke Beranda</button>
        )}
      </header>
      
      <main className="main-content">
        {activeView === 'home' && (
          <>
            <div className="card">
              <h2>Status Sistem</h2>
              <div className={`status-badge ${dataPesan.includes('Selamat datang') ? 'success' : 'error'}`}>
                {dataPesan || 'Menghubungkan ke backend...'}
              </div>
            </div>

            <div className="grid">
              <div className="card feature">
                <h3>Peta Kerawanan</h3>
                <p>Lihat status kerawanan pangan perkecamatan berdasarkan indikator warna (Hijau, Oranye, Merah).</p>
                <button className="btn" onClick={() => setActiveView('peta')}>Buka Peta</button>
              </div>
              <div className="card feature">
                <h3>Gerakan Pangan Murah (GPM)</h3>
                <p>Daftarkan diri Anda untuk mendapatkan nomor antrean dan barcode acara GPM.</p>
                <button className="btn" onClick={() => setActiveView('gpm')}>Daftar Sekarang</button>
              </div>
              <div className="card feature">
                <h3>Informasi Ketersediaan</h3>
                <p>Pantau jumlah dan kondisi stok pangan di setiap wilayah Kota Manado.</p>
                <button className="btn" onClick={() => setActiveView('data')}>Lihat Data</button>
              </div>
              <div className="card feature admin-panel">
                <h3>Panel Admin & Petugas</h3>
                <p>Login khusus pengurus untuk mengelola data dan mendaftarkan pengguna baru.</p>
                <button className="btn btn-admin" onClick={() => setActiveView('admin')}>Masuk ke Panel</button>
              </div>
            </div>
          </>
        )}

        {activeView === 'peta' && (
          <div className="card">
            <h2>Peta Pemetaan Kerawanan Pangan</h2>
            <PetaKerawanan />
          </div>
        )}

        {activeView === 'gpm' && (
          <div className="card">
            <h2>Pendaftaran Gerakan Pangan Murah (GPM)</h2>
            {!tiketGPM ? (
              <>
                <p>Silakan isi nama Anda untuk mendapatkan nomor antrean dan Barcode.</p>
                <input 
                  type="text" 
                  placeholder="Masukkan Nama Lengkap Anda" 
                  value={namaPendaftar}
                  onChange={(e) => setNamaPendaftar(e.target.value)}
                  style={{padding: '10px', width: '100%', marginTop: '10px'}} 
                />
                <button className="btn" style={{marginTop: '15px'}} onClick={handleDaftarGPM}>Dapatkan Antrean</button>
              </>
            ) : (
              <div style={{textAlign: 'center', marginTop: '20px', padding: '20px', border: '2px dashed #2a5298', borderRadius: '10px'}}>
                <h3 style={{color: '#2a5298'}}>Pendaftaran Berhasil!</h3>
                <p style={{margin: '10px 0'}}>Atas Nama: <strong>{tiketGPM.nama}</strong></p>
                <h1 style={{fontSize: '3rem', margin: '10px 0', color: '#e74c3c'}}>Antrean: {tiketGPM.antrean}</h1>
                <div style={{display: 'flex', justifyContent: 'center', marginTop: '20px'}}>
                  <Barcode value={tiketGPM.kode} width={2} height={80} />
                </div>
                <p style={{marginTop: '10px', fontSize: '0.9rem', color: '#666'}}>Simpan (Screenshot) barcode ini untuk ditunjukkan ke petugas di lokasi GPM.</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'data' && (
          <div className="card">
            <h2>Peta Ketersediaan Pangan (Manado)</h2>
            <p>Klik pada ikon (Pin) di peta untuk melihat ringkasan. Detail komoditas akan muncul di bawah peta.</p>
            <PetaKetersediaan onMarkerClick={(wilayah) => setDetailWilayah(wilayah)} />

            {detailWilayah && (
              <div style={{marginTop: '25px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '5px solid #2a5298'}}>
                <h3 style={{color: '#2a5298', marginBottom: '10px'}}>Detail Kecamatan {detailWilayah.nama}</h3>
                <p>Status Rata-Rata Wilayah: <strong>{detailWilayah.kondisiUmum}</strong></p>
                
                <table style={{width: '100%', marginTop: '15px', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                  <thead>
                    <tr style={{textAlign: 'left', borderBottom: '2px solid #ccc', backgroundColor: '#e9ecef'}}>
                      <th style={{padding: '12px'}}>Komoditas</th>
                      <th style={{padding: '12px'}}>Status Kondisi</th>
                      <th style={{padding: '12px'}}>Jumlah / Sisa Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailWilayah.detail.map((item, idx) => (
                      <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                        <td style={{padding: '12px'}}>{item.komoditas}</td>
                        <td style={{padding: '12px', fontWeight: 'bold', color: item.status === 'Aman' || item.status === 'Melimpah' ? '#27ae60' : item.status === 'Menipis' ? '#f39c12' : '#c0392b'}}>
                          {item.status}
                        </td>
                        <td style={{padding: '12px'}}>{item.stok}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeView === 'admin' && (
          <div className="card">
            {!isLoggedIn ? (
              <>
                <h2>Login Panel Admin / Petugas</h2>
                <input type="email" placeholder="Email (contoh: admin@dinaspangan.com)" style={{padding: '10px', width: '100%', marginTop: '10px', display: 'block'}} />
                <input type="password" placeholder="Kata Sandi (contoh: 12345678)" style={{padding: '10px', width: '100%', marginTop: '10px', display: 'block'}} />
                <button className="btn btn-admin" style={{marginTop: '15px'}} onClick={() => setIsLoggedIn(true)}>Login (Simulasi)</button>
              </>
            ) : (
              <div style={{ display: 'flex', minHeight: '600px' }}>
                {/* Sidebar Admin */}
                <div style={{ width: '250px', borderRight: '2px solid #eee', paddingRight: '20px', marginRight: '20px' }}>
                  <h3 style={{color: '#2a5298', marginBottom: '20px'}}>Menu Pengurus</h3>
                  <button onClick={() => setAdminMenu('dashboard')} style={{...adminBtnStyle, backgroundColor: adminMenu === 'dashboard' ? '#2a5298' : '#f4f4f4', color: adminMenu === 'dashboard' ? 'white' : 'black'}}>🏠 Dashboard</button>
                  <button onClick={() => setAdminMenu('ketersediaan')} style={{...adminBtnStyle, backgroundColor: adminMenu === 'ketersediaan' ? '#2a5298' : '#f4f4f4', color: adminMenu === 'ketersediaan' ? 'white' : 'black'}}>📦 Ketersediaan Pangan</button>
                  <button onClick={() => setAdminMenu('kerawanan')} style={{...adminBtnStyle, backgroundColor: adminMenu === 'kerawanan' ? '#2a5298' : '#f4f4f4', color: adminMenu === 'kerawanan' ? 'white' : 'black'}}>🗺️ Kerawanan Pangan</button>
                  <button onClick={() => setAdminMenu('gpm')} style={{...adminBtnStyle, backgroundColor: adminMenu === 'gpm' ? '#2a5298' : '#f4f4f4', color: adminMenu === 'gpm' ? 'white' : 'black'}}>🎟️ Kelola Acara GPM</button>
                  <button onClick={() => setAdminMenu('pengguna')} style={{...adminBtnStyle, backgroundColor: adminMenu === 'pengguna' ? '#2a5298' : '#f4f4f4', color: adminMenu === 'pengguna' ? 'white' : 'black'}}>👥 Kelola Pengguna</button>
                  
                  <button onClick={() => setIsLoggedIn(false)} style={{...adminBtnStyle, backgroundColor: '#e74c3c', color: 'white', marginTop: '50px'}}>🚪 Keluar (Logout)</button>
                </div>

                {/* Konten Admin */}
                <div style={{ flex: 1 }}>
                  {adminMenu === 'dashboard' && (
                    <>
                      <h2>Selamat Datang di Panel Admin</h2>
                      <p>Silakan pilih menu di samping kiri untuk mengelola sistem Dinas Pangan.</p>
                      <div className="grid" style={{marginTop: '20px'}}>
                        <div style={{padding: '15px', background: '#e9ecef', borderRadius: '8px'}}>
                          <h4>Total Pendaftar GPM</h4>
                          <h2 style={{color: '#2a5298'}}>142 Orang</h2>
                        </div>
                        <div style={{padding: '15px', background: '#e9ecef', borderRadius: '8px'}}>
                          <h4>Status Kota Manado</h4>
                          <h2 style={{color: '#27ae60'}}>Aman Tahan Pangan</h2>
                        </div>
                      </div>
                    </>
                  )}

                  {adminMenu === 'ketersediaan' && (
                    <>
                      <h2>Kelola Ketersediaan Pangan</h2>
                      <p style={{marginBottom: '10px'}}>Tambahkan titik lokasi dan rincian komoditas (Beras, Jagung, dll).</p>
                      <PetaAdmin />
                    </>
                  )}

                  {adminMenu === 'kerawanan' && (
                    <>
                      <h2>Kelola Kerawanan Pangan</h2>
                      <p>Atur status warna (Hijau/Oranye/Merah) untuk setiap wilayah kecamatan di Manado.</p>
                      {/* UI Form Dummy */}
                      <div style={{padding: '20px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', marginTop: '15px'}}>
                        <input type="text" placeholder="Nama Kecamatan" style={{width: '100%', padding: '8px', marginBottom: '10px'}}/>
                        <select style={{width: '100%', padding: '8px', marginBottom: '10px'}}>
                          <option>Hijau - Aman</option>
                          <option>Oranye - Waspada</option>
                          <option>Merah - Rawan</option>
                        </select>
                        <button className="btn" style={{backgroundColor: '#27ae60'}}>Simpan Status</button>
                      </div>
                    </>
                  )}

                  {adminMenu === 'gpm' && (
                    <>
                      <h2>Kelola Acara Gerakan Pangan Murah</h2>
                      <p>Buat jadwal acara baru agar masyarakat bisa mendaftar dan mendapatkan barcode.</p>
                      <button className="btn" style={{marginTop: '10px'}}>+ Buat Acara GPM Baru</button>
                    </>
                  )}

                  {adminMenu === 'pengguna' && (
                    <>
                      <h2>Kelola Hak Akses Pengguna</h2>
                      <p>Tambahkan akun untuk Petugas Bidang atau Kepala Dinas.</p>
                      <button className="btn" style={{marginTop: '10px'}}>+ Tambah Pengguna Baru</button>
                      
                      <table style={{width: '100%', marginTop: '20px', borderCollapse: 'collapse', textAlign: 'left'}}>
                        <thead>
                          <tr style={{borderBottom: '2px solid #ccc'}}>
                            <th style={{padding: '10px'}}>Nama</th>
                            <th style={{padding: '10px'}}>Peran</th>
                            <th style={{padding: '10px'}}>Bidang</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '10px'}}>Administrator Utama</td>
                            <td style={{padding: '10px'}}>Admin</td>
                            <td style={{padding: '10px'}}>-</td>
                          </tr>
                          <tr style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '10px'}}>Budi (Petugas)</td>
                            <td style={{padding: '10px'}}>Petugas</td>
                            <td style={{padding: '10px'}}>Ketersediaan</td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// Styling khusus untuk tombol menu admin
const adminBtnStyle = {
  display: 'block', 
  width: '100%', 
  padding: '12px', 
  marginBottom: '10px', 
  border: 'none', 
  borderRadius: '6px', 
  textAlign: 'left',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'background-color 0.2s'
}

export default App
