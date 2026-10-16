import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeComponent({ value, size = 180, className = '' }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(String(value), {
      width: size,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#ffffff'
      }
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('[QRCodeComponent] Gagal membuat QR Code:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div 
        style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#f8f9fa', 
          borderRadius: '8px', 
          color: '#666',
          fontSize: '0.85rem'
        }}
      >
        Memuat QR...
      </div>
    );
  }

  return (
    <div className={`qr-code-container ${className}`} style={{ display: 'inline-block', textAlign: 'center' }}>
      <img
        src={dataUrl}
        alt={`QR Code ${value}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'block',
          margin: '0 auto',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          background: '#ffffff',
          padding: '4px'
        }}
      />
    </div>
  );
}
