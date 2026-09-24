import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Perbaiki icon default leaflet di React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Data Dummy Ketersediaan Pangan di Manado (dengan detail)
const DATA_KETERSEDIAAN = [
  { 
    nama: 'Mapanget', posisi: [1.5369, 124.9126], kondisiUmum: 'Aman', 
    detail: [
      { komoditas: 'Beras', status: 'Aman', stok: '50 Ton' },
      { komoditas: 'Jagung', status: 'Aman', stok: '15 Ton' },
      { komoditas: 'Cabai', status: 'Menipis', stok: '500 Kg' }
    ]
  },
  { 
    nama: 'Malalayang', posisi: [1.4641, 124.8252], kondisiUmum: 'Waspada',
    detail: [
      { komoditas: 'Bawang Merah', status: 'Menipis', stok: '2 Ton' },
      { komoditas: 'Cabai', status: 'Rawan', stok: '100 Kg' }
    ]
  },
  { 
    nama: 'Bunaken', posisi: [1.6221, 124.7601], kondisiUmum: 'Aman',
    detail: [
      { komoditas: 'Ikan Laut', status: 'Melimpah', stok: '25 Ton' }
    ]
  },
];

export default function PetaKetersediaan({ onMarkerClick }) {
  const [dataPeta] = useState(DATA_KETERSEDIAAN);

  return (
    <div style={{ height: '450px', width: '100%', marginTop: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ccc' }}>
      <MapContainer center={[1.4931, 124.8413]} zoom={11.5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {dataPeta.map((wilayah, index) => (
          <Marker 
            key={index} 
            position={wilayah.posisi}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) onMarkerClick(wilayah);
              },
            }}
          >
            <Popup>
              <div style={{minWidth: '150px', textAlign: 'center'}}>
                <h3 style={{margin: '0 0 5px 0', color: '#2a5298'}}>Kec. {wilayah.nama}</h3>
                <p style={{margin: '5px 0', fontWeight: 'bold'}}>Status Rata-Rata: {wilayah.kondisiUmum}</p>
                <p style={{margin: '5px 0', fontSize: '0.9rem', color: '#666'}}>(Lihat detail di bawah peta)</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
