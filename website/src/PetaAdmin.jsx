import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Perbaiki icon default leaflet di React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function PetaAdmin() {
  const [titikBaru, setTitikBaru] = useState(null);
  const [namaLokasi, setNamaLokasi] = useState('');

  const handlePetaKlik = (latlng) => {
    setTitikBaru(latlng);
    setNamaLokasi(''); // reset nama saat klik tempat baru
  };

  const handleSimpanTitik = () => {
    if (!namaLokasi.trim()) {
      alert('Tolong masukkan nama daerah/lokasi terlebih dahulu!');
      return;
    }
    // Simulasi simpan ke database
    alert(`Berhasil menyimpan koordinat untuk: ${namaLokasi}\nLat: ${titikBaru.lat}\nLng: ${titikBaru.lng}\n\n(Nantinya data ini akan dikirim ke Backend/Supabase)`);
    setTitikBaru(null); // Tutup form setelah simpan
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <p style={{marginBottom: '10px', color: '#666'}}>Instruksi: Klik area mana saja di dalam peta untuk meletakkan pin baru, lalu isi nama lokasinya.</p>
      
      <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ccc', position: 'relative' }}>
        <MapContainer center={[1.4931, 124.8413]} zoom={11.5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onMapClick={handlePetaKlik} />
          
          {titikBaru && (
            <Marker position={titikBaru}>
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2a5298' }}>Tambah Titik Baru</h4>
                  <input 
                    type="text" 
                    placeholder="Nama Kecamatan/Daerah"
                    value={namaLokasi}
                    onChange={(e) => setNamaLokasi(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 10px 0' }}>
                    Lat: {titikBaru.lat.toFixed(4)}<br/>
                    Lng: {titikBaru.lng.toFixed(4)}
                  </p>
                  <button 
                    onClick={handleSimpanTitik}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Simpan Titik Ini
                  </button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
