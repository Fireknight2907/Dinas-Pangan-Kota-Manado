// ===================================================================================
// Modul Tampilan Publik Daftar Pasar & Peta Sebaran Pasar Kota Manado (Website)
// Fungsi: Menampilkan seluruh pasar resmi Kota Manado yang diinput Admin/Superadmin
//         di tabel master_pasar (100% data riil Supabase, tanpa data dummy) lengkap
//         dengan peta interaktif Leaflet + OpenStreetMap (sama dengan modul GPM),
//         filter kecamatan, pencarian, pengurutan GPS terdekat, tautan rute Google
//         Maps, serta pintasan langsung melihat daftar harga komoditas di pasar tsb.
// ===================================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { masterDataService } from '../services/MasterDataService';
import { geocodingService } from '../services/GeocodingService';
import './DaftarPasarWeb.css';

const ikonPasarAktif = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ikonPasarTerpilih = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [1, -38],
  shadowSize: [41, 41]
});

function PengarahPetaPasar({ targetKoordinat, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (targetKoordinat && targetKoordinat.length === 2) {
      map.flyTo(targetKoordinat, zoom || 15, { duration: 0.7 });
    }
  }, [targetKoordinat, zoom, map]);
  return null;
}

export default function DaftarPasarWeb({ daftarHargaTerbit = [], onLihatHargaPasar }) {
  const [daftarPasar, setDaftarPasar] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState('');

  const [pencarian, setPencarian] = useState('');
  const [kecamatanFilter, setKecamatanFilter] = useState('Semua');
  const [posisiUser, setPosisiUser] = useState(null);
  const [sedangCariGPS, setSedangCariGPS] = useState(false);

  const [pasarTerpilihId, setPasarTerpilihId] = useState(null);
  const [targetPeta, setTargetPeta] = useState(null);

  const muatDaftarPasar = async () => {
    setSedangMemuat(true);
    setErrorMuat('');
    try {
      const data = await masterDataService.ambilDaftarPasarLengkap();
      setDaftarPasar(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMuat(err?.message || 'Gagal memuat daftar pasar resmi dari basis data Supabase.');
      setDaftarPasar([]);
    } finally {
      setSedangMemuat(false);
    }
  };

  useEffect(() => {
    muatDaftarPasar();
  }, []);

  // Hitung jumlah komoditas terbit riil per pasar dari daftarHargaTerbit
  const petaJumlahKomoditas = useMemo(() => {
    const peta = new Map();
    (Array.isArray(daftarHargaTerbit) ? daftarHargaTerbit : []).forEach((item) => {
      const kunci = String(item?.nama_pasar || '').toLowerCase().trim();
      if (!kunci) return;
      peta.set(kunci, (peta.get(kunci) || 0) + 1);
    });
    return peta;
  }, [daftarHargaTerbit]);

  // Ekstrak daftar kecamatan unik yang muncul di data pasar
  const daftarKecamatanUnik = useMemo(() => {
    const set = new Set();
    daftarPasar.forEach((p) => {
      if (p.kecamatan) set.add(p.kecamatan);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
  }, [daftarPasar]);

  // Gabungkan info jarak GPS + jumlah komoditas + penyaringan
  const daftarPasarTampil = useMemo(() => {
    const q = pencarian.trim().toLowerCase();
    const kec = kecamatanFilter.toLowerCase();

    const diperkaya = daftarPasar
      .map((p) => {
        const jarakKm =
          posisiUser && p.punyaKoordinat
            ? geocodingService.hitungJarakKm(posisiUser.lat, posisiUser.lng, p.latitude, p.longitude)
            : null;
        const jumlahKomoditas = petaJumlahKomoditas.get(p.nama_pasar.toLowerCase().trim()) || 0;
        return { ...p, jarakKm, jumlahKomoditas };
      })
      .filter((p) => {
        if (kec !== 'semua' && String(p.kecamatan || '').toLowerCase() !== kec) return false;
        if (q) {
          const teks = `${p.nama_pasar} ${p.alamat} ${p.kecamatan}`.toLowerCase();
          if (!teks.includes(q)) return false;
        }
        return true;
      });

    if (posisiUser) {
      diperkaya.sort((a, b) => {
        if (a.jarakKm !== null && b.jarakKm !== null && a.jarakKm !== b.jarakKm) {
          return a.jarakKm - b.jarakKm;
        }
        if (a.jarakKm !== null) return -1;
        if (b.jarakKm !== null) return 1;
        return a.nama_pasar.localeCompare(b.nama_pasar, 'id-ID');
      });
    }

    return diperkaya;
  }, [daftarPasar, pencarian, kecamatanFilter, posisiUser, petaJumlahKomoditas]);

  const pasarBertitikPeta = useMemo(
    () => daftarPasarTampil.filter((p) => p.punyaKoordinat),
    [daftarPasarTampil]
  );

  const totalBertitikSemua = useMemo(
    () => daftarPasar.filter((p) => p.punyaKoordinat).length,
    [daftarPasar]
  );

  const pusatPetaAwal = useMemo(() => {
    if (pasarBertitikPeta.length > 0) {
      return [pasarBertitikPeta[0].latitude, pasarBertitikPeta[0].longitude];
    }
    return [geocodingService.pusatManado.lat, geocodingService.pusatManado.lng];
  }, [pasarBertitikPeta]);

  const pilihPasar = (pasar) => {
    setPasarTerpilihId(pasar.id || pasar.nama_pasar);
    if (pasar.punyaKoordinat) {
      setTargetPeta([pasar.latitude, pasar.longitude]);
    }
  };

  const cariLokasiGPS = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung layanan GPS.');
      return;
    }
    setSedangCariGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosisiUser({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSedangCariGPS(false);
      },
      (err) => {
        setSedangCariGPS(false);
        alert('Gagal mendeteksi lokasi GPS: ' + (err.message || 'Pastikan izin lokasi aktif.'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="dp-page-wrap">
      {/* HERO BANNER DAFTAR PASAR */}
      <section className="hero-banner-maroon dp-hero">
        <div className="hero-content">
          <div className="hero-tag-badge">
            <span>🏪</span>
            <span>Direktori Pasar Tradisional Resmi</span>
          </div>
          <h2 className="hero-headline">Daftar Pasar Kota Manado</h2>
          <p className="hero-description">
            Temukan titik lokasi pasar tradisional resmi yang dipantau oleh Dinas Pangan Kota Manado, lihat alamat lengkap pada peta interaktif, dan cek langsung harga pangan di tiap pasar.
          </p>
          <div className="hero-meta-row">
            <div className="hero-date-badge">
              <span>🏪 <strong>{daftarPasar.length}</strong> Pasar Terdaftar</span>
            </div>
            <div className="hero-date-badge">
              <span>📍 <strong>{totalBertitikSemua}</strong> Titik Peta Aktif</span>
            </div>
          </div>
        </div>
      </section>

      <main className="sipatokaan-main-container dp-main">
        {/* BAR FILTER PENCARIAN, KECAMATAN & GPS TERDEKAT */}
        <div className="dp-filter-bar">
          <div className="dp-search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Cari nama pasar, alamat, atau kecamatan..."
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
            />
            {pencarian && (
              <button type="button" className="dp-clear-btn" onClick={() => setPencarian('')}>
                ✕
              </button>
            )}
          </div>

          <select
            className="dp-kec-select"
            value={kecamatanFilter}
            onChange={(e) => setKecamatanFilter(e.target.value)}
            aria-label="Filter kecamatan pasar"
          >
            <option value="Semua">🏘️ Semua Kecamatan</option>
            {daftarKecamatanUnik.map((kec) => (
              <option key={kec} value={kec}>
                Kec. {kec}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`dp-gps-btn ${posisiUser ? 'active' : ''}`}
            disabled={sedangCariGPS}
            onClick={cariLokasiGPS}
          >
            {sedangCariGPS ? '📡 Mencari GPS...' : posisiUser ? '📍 Urut Terdekat (GPS Aktif)' : '📍 Cari Pasar Terdekat'}
          </button>
        </div>

        {/* STATUS MEMUAT / ERROR / KOSONG / PETA + DAFTAR */}
        {sedangMemuat ? (
          <div className="loading-state-box">
            <div className="spinner-loader"></div>
            <p>Memuat daftar pasar & titik lokasi resmi dari basis data...</p>
          </div>
        ) : errorMuat ? (
          <div className="empty-state-box error-state-box">
            <p>⚠️ <strong>Gagal memuat daftar pasar:</strong> {errorMuat}</p>
            <button type="button" className="btn-reset-filter" onClick={muatDaftarPasar}>
              🔄 Coba Muat Ulang
            </button>
          </div>
        ) : daftarPasar.length === 0 ? (
          <div className="empty-state-box dp-empty-box">
            <div className="dp-empty-ico">🏪</div>
            <h3>Belum Ada Data Pasar Terdaftar</h3>
            <p>Pasar yang ditambahkan dan disimpan oleh Admin Dinas Pangan akan tampil otomatis di halaman ini beserta titik lokasinya.</p>
          </div>
        ) : (
          <div className="dp-content-grid">
            {/* KOLOM KIRI / ATAS: PETA INTERAKTIF LEAFLET */}
            <div className="dp-map-panel">
              <div className="dp-map-header">
                <div>
                  <strong>🗺️ Peta Titik Lokasi Pasar Kota Manado</strong>
                  <small>
                    Menampilkan {pasarBertitikPeta.length} dari {daftarPasarTampil.length} pasar yang sudah memiliki titik koordinat
                  </small>
                </div>
                <span className="dp-map-hint">Klik pin atau kartu pasar</span>
              </div>

              <div className="dp-leaflet-container">
                <MapContainer
                  center={pusatPetaAwal}
                  zoom={13}
                  scrollWheelZoom={true}
                  style={{ width: '100%', height: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {targetPeta && <PengarahPetaPasar targetKoordinat={targetPeta} zoom={16} />}

                  {pasarBertitikPeta.map((pasar) => {
                    const keyId = pasar.id || pasar.nama_pasar;
                    const terpilih = pasarTerpilihId === keyId;
                    return (
                      <Marker
                        key={keyId}
                        position={[pasar.latitude, pasar.longitude]}
                        icon={terpilih ? ikonPasarTerpilih : ikonPasarAktif}
                        eventHandlers={{
                          click: () => setPasarTerpilihId(keyId)
                        }}
                      >
                        <Popup>
                          <div className="dp-map-popup">
                            <strong>🏪 {pasar.nama_pasar}</strong>
                            {pasar.kecamatan && <div className="dp-pop-kec">Kec. {pasar.kecamatan}</div>}
                            <div className="dp-pop-addr">
                              {pasar.alamat || 'Alamat belum dilengkapi Admin'}
                            </div>
                            <div className="dp-pop-actions">
                              <a
                                href={geocodingService.bangunUrlGoogleMaps(pasar.latitude, pasar.longitude, pasar.nama_pasar)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dp-pop-link"
                              >
                                🧭 Google Maps
                              </a>
                              {onLihatHargaPasar && (
                                <button
                                  type="button"
                                  className="dp-pop-btn"
                                  onClick={() => onLihatHargaPasar(pasar.nama_pasar)}
                                >
                                  🛒 Lihat Harga ({pasar.jumlahKomoditas})
                                </button>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>

              {pasarBertitikPeta.length === 0 && (
                <div className="dp-map-unpinned-note">
                  ℹ️ Belum ada pasar pada filter ini yang diatur titik koordinatnya oleh Admin. Titik pin akan otomatis muncul setelah Admin menyimpan lokasi pada panel Master Pasar.
                </div>
              )}
            </div>

            {/* KOLOM KANAN / BAWAH: DAFTAR KARTU PASAR */}
            <div className="dp-list-panel">
              <div className="dp-list-head">
                <strong>Daftar Pasar ({daftarPasarTampil.length})</strong>
                {(pencarian || kecamatanFilter !== 'Semua') && (
                  <button
                    type="button"
                    className="dp-reset-link"
                    onClick={() => {
                      setPencarian('');
                      setKecamatanFilter('Semua');
                    }}
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {daftarPasarTampil.length === 0 ? (
                <div className="dp-no-match">
                  Tidak ada pasar yang cocok dengan pencarian "{pencarian}".
                </div>
              ) : (
                <div className="dp-cards-stack">
                  {daftarPasarTampil.map((pasar) => {
                    const keyId = pasar.id || pasar.nama_pasar;
                    const terpilih = pasarTerpilihId === keyId;
                    return (
                      <article
                        key={keyId}
                        className={`dp-market-card ${terpilih ? 'active' : ''}`}
                        onClick={() => pilihPasar(pasar)}
                      >
                        <div className="dp-card-top">
                          <h3 className="dp-card-title">🏪 {pasar.nama_pasar}</h3>
                          <div className="dp-card-badges">
                            {pasar.kecamatan && (
                              <span className="dp-kec-pill">Kec. {pasar.kecamatan}</span>
                            )}
                            {pasar.jarakKm !== null && (
                              <span className="dp-dist-pill">🧭 {pasar.jarakKm} km</span>
                            )}
                          </div>
                        </div>

                        <p className="dp-card-addr">
                          📍 {pasar.alamat || 'Alamat lengkap belum diatur Admin'}
                        </p>

                        <div className="dp-card-coord-row">
                          {pasar.punyaKoordinat ? (
                            <span className="dp-coord-ok">
                              ✓ Titik Peta: {pasar.latitude.toFixed(5)}, {pasar.longitude.toFixed(5)}
                            </span>
                          ) : (
                            <span className="dp-coord-missing">
                              ⚠️ Titik lokasi peta belum diatur Admin
                            </span>
                          )}
                        </div>

                        <div className="dp-card-actions" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={geocodingService.bangunUrlGoogleMaps(pasar.latitude, pasar.longitude, pasar.nama_pasar)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dp-btn-gmaps"
                          >
                            🧭 Buka Google Maps
                          </a>
                          {onLihatHargaPasar && (
                            <button
                              type="button"
                              className="dp-btn-harga"
                              onClick={() => onLihatHargaPasar(pasar.nama_pasar)}
                            >
                              🛒 Lihat Harga ({pasar.jumlahKomoditas})
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
