import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Koordinat dummy untuk beberapa kecamatan di Manado
const KECAMATAN_MANADO = [
  { nama: 'Mapanget', posisi: [1.5369, 124.9126], status: 'Merah', keterangan: 'Rawan Pangan' },
  { nama: 'Malalayang', posisi: [1.4641, 124.8252], status: 'Hijau', keterangan: 'Aman' },
  { nama: 'Bunaken', posisi: [1.6221, 124.7601], status: 'Oranye', keterangan: 'Waspada' },
  { nama: 'Tikala', posisi: [1.4889, 124.8587], status: 'Hijau', keterangan: 'Aman' }
];

export default function PetaKerawanan() {
  const [dataPeta, setDataPeta] = useState(KECAMATAN_MANADO);

  // Nanti ini bisa di-fetch dari backend Supabase
  /*
  useEffect(() => {
    fetch('http://localhost:3000/api/peta')
      .then(res => res.json())
      .then(data => setDataPeta(data))
  }, [])
  */

  const getWarna = (status) => {
    switch(status) {
      case 'Hijau': return 'green';
      case 'Oranye': return 'orange';
      case 'Merah': return 'red';
      default: return 'blue';
    }
  };

  return (
    <div style={{ height: '400px', width: '100%', marginTop: '20px', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer center={[1.4931, 124.8413]} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {dataPeta.map((kecamatan, index) => (
          <CircleMarker 
            key={index}
            center={kecamatan.posisi}
            pathOptions={{ fillColor: getWarna(kecamatan.status), color: getWarna(kecamatan.status) }}
            radius={15}
          >
            <Popup>
              <strong>Kecamatan {kecamatan.nama}</strong><br />
              Status: <span style={{ color: getWarna(kecamatan.status), fontWeight: 'bold' }}>{kecamatan.status}</span><br />
              Keterangan: {kecamatan.keterangan}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
