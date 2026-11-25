// ===================================================================================
// Modul Panel Admin Kelola Master Pasar & Titik Lokasi Peta Interaktif (Website)
// Fungsi: Memungkinkan Admin & Superadmin menambah, mengedit, dan menghapus pasar
//         resmi Kota Manado di tabel master_pasar lengkap dengan titik peta Leaflet
//         (klik peta / geser pin -> alamat & kecamatan terisi otomatis via
//         GeocodingService, pencarian nama tempat 2 arah di peta, serta input manual).
// ===================================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { masterDataService } from '../services/MasterDataService';
import { geocodingService } from '../services/GeocodingService';
import './AdminMasterPasarPanel.css';

const ikonPinTerpilih = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ikonPasarLain = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [21, 34],
  iconAnchor: [10, 34],
  popupAnchor: [1, -28],
  shadowSize: [34, 34]
});

function PenentuTitikPasar({ posisi, onPilihTitik, targetTerbang }) {
  const map = useMap();

  useEffect(() => {
    if (targetTerbang && targetTerbang.length === 2) {
      map.flyTo(targetTerbang, 16, { duration: 0.65 });
    }
  }, [targetTerbang, map]);

  useMapEvents({
    click(e) {
      onPilihTitik(e.latlng.lat, e.latlng.lng);
    }
  });

  if (!posisi) return null;

  return (
    <Marker
      position={posisi}
      icon={ikonPinTerpilih}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          onPilihTitik(latlng.lat, latlng.lng);
        }
      }}
    >
      <Popup>
        <strong>📍 Titik Lokasi Pasar</strong>
        <br />
        Lat: {posisi[0].toFixed(6)}
        <br />
        Lng: {posisi[1].toFixed(6)}
        <br />
        <small>Geser pin atau klik titik lain di peta untuk ubah</small>
      </Popup>
    </Marker>
  );
}

const FORM_AWAL = {
  nama_pasar: '',
  kecamatan: '',
  alamat: '',
  latitude: '',
  longitude: ''
};

export default function AdminMasterPasarPanel({
  daftarPasarLengkap = [],
  daftarKecamatan = [],
  onDataBerubah,
  onPesanSukses
}) {
  const [modeEditPasar, setModeEditPasar] = useState(null); // objek pasar lama atau null
  const [form, setForm] = useState(FORM_AWAL);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanError, setPesanError] = useState('');

  // State Reverse Geocode & Pencarian 2 Arah di Peta
  const [sedangAutoAlamat, setSedangAutoAlamat] = useState(false);
  const [infoGeocode, setInfoGeocode] = useState('');
  const [kataCariPeta, setKataCariPeta] = useState('');
  const [sedangCariPeta, setSedangCariPeta] = useState(false);
  const [hasilCariPeta, setHasilCariPeta] = useState([]);
  const [targetTerbang, setTargetTerbang] = useState(null);

  const posisiPin = useMemo(() => {
    if (geocodingService.punyaKoordinatValid(form.latitude, form.longitude)) {
      return [Number(form.latitude), Number(form.longitude)];
    }
    return null;
  }, [form.latitude, form.longitude]);

  const pasarLainBertitik = useMemo(() => {
    return (Array.isArray(daftarPasarLengkap) ? daftarPasarLengkap : []).filter((p) => {
      if (!p.punyaKoordinat) return false;
      if (modeEditPasar && (String(p.id) === String(modeEditPasar.id) || p.nama_pasar === modeEditPasar.nama_pasar)) {
        return false;
      }
      return true;
    });
  }, [daftarPasarLengkap, modeEditPasar]);

  const resetForm = () => {
    setModeEditPasar(null);
    setForm(FORM_AWAL);
    setPesanError('');
    setInfoGeocode('');
    setHasilCariPeta([]);
    setKataCariPeta('');
  };

  // Saat Admin klik titik atau menggeser pin di peta -> isi koordinat & auto-isi alamat + kecamatan
  const handlePilihTitikPeta = async (lat, lng) => {
    const latStr = Number(lat).toFixed(6);
    const lngStr = Number(lng).toFixed(6);
    setForm((prev) => ({
      ...prev,
      latitude: latStr,
      longitude: lngStr
    }));
    setHasilCariPeta([]);
    setSedangAutoAlamat(true);
    setInfoGeocode('⏳ Mengambil alamat otomatis dari peta...');

    const res = await geocodingService.reverseGeocode(lat, lng, daftarKecamatan);
    setSedangAutoAlamat(false);
    if (res.sukses) {
      setForm((prev) => ({
        ...prev,
        alamat: res.alamat || prev.alamat,
        kecamatan: res.kecamatan || prev.kecamatan
      }));
      setInfoGeocode('✅ Alamat otomatis terisi (tetap dapat Anda sunting manual jika perlu).');
    } else {
      setInfoGeocode(`ℹ️ ${res.pesan || 'Silakan lengkapi alamat secara manual.'}`);
    }
  };

  // Pencarian 2 arah: ketik nama pasar/jalan -> peta loncat & auto-isi alamat
  const handleCariDiPeta = async (e) => {
    if (e) e.preventDefault();
    const q = kataCariPeta.trim() || form.nama_pasar.trim();
    if (q.length < 2) {
      setInfoGeocode('Masukkan minimal 2 huruf nama pasar atau jalan untuk dicari di peta.');
      return;
    }
    setSedangCariPeta(true);
    setInfoGeocode('🔍 Mencari titik lokasi di sekitar Kota Manado...');
    const kandidat = await geocodingService.cariLokasiDiManado(q, daftarKecamatan);
    setSedangCariPeta(false);
    setHasilCariPeta(kandidat);
    if (kandidat.length === 0) {
      setInfoGeocode('Lokasi tidak ditemukan di OpenStreetMap — silakan klik langsung titik pasar di peta.');
    } else {
      setInfoGeocode(`Ditemukan ${kandidat.length} lokasi — klik salah satu hasil untuk pasang pin.`);
    }
  };

  const terapkanHasilCariPeta = (item) => {
    setForm((prev) => ({
      ...prev,
      alamat: item.alamat || prev.alamat,
      kecamatan: item.kecamatan || prev.kecamatan,
      latitude: Number(item.latitude).toFixed(6),
      longitude: Number(item.longitude).toFixed(6)
    }));
    setTargetTerbang([item.latitude, item.longitude]);
    setHasilCariPeta([]);
    setInfoGeocode(`✅ Titik dipindahkan ke "${item.nama}" & alamat otomatis terisi.`);
  };

  const gunakanGpsAdmin = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung GPS.');
      return;
    }
    setInfoGeocode('📡 Mengambil koordinat GPS perangkat...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTargetTerbang([pos.coords.latitude, pos.coords.longitude]);
        handlePilihTitikPeta(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setInfoGeocode('Gagal mengambil GPS: ' + (err.message || 'Izin lokasi ditolak.'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const mulaiEditPasar = (pasar) => {
    setModeEditPasar(pasar);
    setForm({
      nama_pasar: pasar.nama_pasar || '',
      kecamatan: pasar.kecamatan || '',
      alamat: pasar.alamat || '',
      latitude: pasar.punyaKoordinat ? String(pasar.latitude) : '',
      longitude: pasar.punyaKoordinat ? String(pasar.longitude) : ''
    });
    setPesanError('');
    setHasilCariPeta([]);
    setKataCariPeta(pasar.nama_pasar || '');
    if (pasar.punyaKoordinat) {
      setTargetTerbang([pasar.latitude, pasar.longitude]);
      setInfoGeocode(`✏️ Mode Edit "${pasar.nama_pasar}". Geser pin atau klik peta untuk ubah titik.`);
    } else {
      setInfoGeocode(`✏️ Mode Edit "${pasar.nama_pasar}". Belum ada titik peta — klik peta atau tombol Cari Lokasi untuk menentukan titik.`);
    }
  };

  const handleSimpanPasar = async (e) => {
    e.preventDefault();
    setPesanError('');
    const nama = form.nama_pasar.trim();
    if (!nama) {
      setPesanError('Nama pasar wajib diisi.');
      return;
    }

    const adaLat = String(form.latitude).trim() !== '';
    const adaLng = String(form.longitude).trim() !== '';
    if (adaLat !== adaLng) {
      setPesanError('Latitude dan Longitude harus diisi berpasangan (atau kosongkan keduanya).');
      return;
    }
    if (adaLat && adaLng && !geocodingService.punyaKoordinatValid(form.latitude, form.longitude)) {
      setPesanError('Format koordinat Latitude / Longitude tidak valid.');
      return;
    }

    setSedangSimpan(true);
    try {
      const payload = {
        nama_pasar: nama,
        kecamatan: form.kecamatan.trim(),
        alamat: form.alamat.trim(),
        latitude: adaLat ? Number(form.latitude) : null,
        longitude: adaLng ? Number(form.longitude) : null
      };

      let terbaru;
      if (modeEditPasar) {
        terbaru = await masterDataService.perbaruiPasar(
          modeEditPasar.id || modeEditPasar.nama_pasar,
          payload,
          modeEditPasar.nama_pasar
        );
        if (onPesanSukses) onPesanSukses(`✅ Pasar "${nama}" beserta titik lokasinya berhasil diperbarui & tampil di publik.`);
      } else {
        terbaru = await masterDataService.tambahPasar(payload);
        if (onPesanSukses) onPesanSukses(`✅ Pasar "${nama}" berhasil disimpan & langsung tampil di menu publik Daftar Pasar.`);
      }

      if (onDataBerubah) onDataBerubah(terbaru);
      resetForm();
    } catch (err) {
      setPesanError(err?.message || 'Gagal menyimpan data pasar ke Supabase.');
    } finally {
      setSedangSimpan(false);
    }
  };

  const handleHapusPasar = async (pasar) => {
    if (!window.confirm(`Hapus pasar "${pasar.nama_pasar}" dari Master Pasar & peta publik?`)) return;
    try {
      const terbaru = await masterDataService.hapusPasar(pasar.id || pasar.nama_pasar);
      if (modeEditPasar && (modeEditPasar.id === pasar.id || modeEditPasar.nama_pasar === pasar.nama_pasar)) {
        resetForm();
      }
      if (onDataBerubah) onDataBerubah(terbaru);
      if (onPesanSukses) onPesanSukses(`🗑️ Pasar "${pasar.nama_pasar}" berhasil dihapus dari Master Pasar.`);
    } catch (err) {
      alert(err?.message || 'Gagal menghapus pasar.');
    }
  };

  const jumlahBertitik = daftarPasarLengkap.filter((p) => p.punyaKoordinat).length;

  return (
    <div className="amp-panel-card">
      <div className="amp-panel-header">
        <div>
          <h3>🏪 Master Daftar Pasar &amp; Titik Lokasi Peta ({daftarPasarLengkap.length})</h3>
          <p>
            Admin &amp; Superadmin dapat menambah atau mengedit pasar beserta titik lokasinya. Klik titik di peta agar alamat &amp; kecamatan terisi otomatis — begitu disimpan, pasar langsung muncul di menu publik <strong>Daftar Pasar</strong>.
          </p>
        </div>
        <div className="amp-header-stats">
          <span className="amp-stat-chip ok">📍 {jumlahBertitik} Bertitik Peta</span>
          {daftarPasarLengkap.length - jumlahBertitik > 0 && (
            <span className="amp-stat-chip warn">
              ⚠️ {daftarPasarLengkap.length - jumlahBertitik} Belum Ditandai
            </span>
          )}
        </div>
      </div>

      <div className="amp-workspace-grid">
        {/* KIRI: FORM TAMBAH / EDIT + PENCARIAN PETA */}
        <div className="amp-form-col">
          <div className="amp-mode-banner">
            <strong>{modeEditPasar ? `✏️ Mengedit Pasar: ${modeEditPasar.nama_pasar}` : '➕ Tambah Pasar Baru ke Peta Publik'}</strong>
            {modeEditPasar && (
              <button type="button" className="amp-btn-cancel-edit" onClick={resetForm}>
                Batal Edit
              </button>
            )}
          </div>

          {pesanError && <div className="amp-error-box">⚠️ {pesanError}</div>}

          <form onSubmit={handleSimpanPasar} className="amp-form">
            <div className="amp-field">
              <label>Nama Pasar Resmi <span className="req">*</span></label>
              <input
                type="text"
                required
                placeholder="Contoh: Pasar Bersehati Karombasan"
                className="field-input-box"
                value={form.nama_pasar}
                onChange={(e) => setForm((prev) => ({ ...prev, nama_pasar: e.target.value }))}
              />
            </div>

            <div className="amp-field">
              <label>Kecamatan di Kota Manado</label>
              <select
                className="field-input-box"
                value={form.kecamatan}
                onChange={(e) => setForm((prev) => ({ ...prev, kecamatan: e.target.value }))}
              >
                <option value="">-- Otomatis dari Peta / Pilih Kecamatan --</option>
                {daftarKecamatan.map((kec) => (
                  <option key={kec} value={kec}>
                    Kecamatan {kec}
                  </option>
                ))}
              </select>
            </div>

            <div className="amp-field">
              <label>
                Alamat Lokasi Pasar{' '}
                {sedangAutoAlamat && <span className="amp-loading-tag">⏳ Mengisi otomatis...</span>}
              </label>
              <textarea
                rows="2"
                className="field-input-box amp-textarea"
                placeholder="Klik titik di peta untuk isi otomatis, atau ketik alamat secara manual..."
                value={form.alamat}
                onChange={(e) => setForm((prev) => ({ ...prev, alamat: e.target.value }))}
              />
            </div>

            <div className="amp-coord-row">
              <div className="amp-field">
                <label>Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="field-input-box"
                  placeholder="1.482200"
                  value={form.latitude}
                  onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                />
              </div>
              <div className="amp-field">
                <label>Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="field-input-box"
                  placeholder="124.848900"
                  value={form.longitude}
                  onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                />
              </div>
            </div>

            <div className="amp-coord-tools">
              <button type="button" className="amp-btn-tool" onClick={gunakanGpsAdmin}>
                📡 Pakai GPS Saya
              </button>
              {posisiPin && (
                <button
                  type="button"
                  className="amp-btn-tool danger"
                  onClick={() => setForm((prev) => ({ ...prev, latitude: '', longitude: '' }))}
                >
                  ✖ Kosongkan Titik
                </button>
              )}
            </div>

            <button type="submit" className="amp-btn-submit" disabled={sedangSimpan}>
              {sedangSimpan
                ? 'Menyimpan ke Supabase...'
                : modeEditPasar
                  ? '💾 Simpan Perubahan Pasar & Titik Peta'
                  : '💾 Simpan Pasar Baru ke Peta Publik'}
            </button>
          </form>
        </div>

        {/* KANAN: PETA INTERAKTIF LEAFLET + CARI NAMA LOKASI */}
        <div className="amp-map-col">
          <div className="amp-map-search-row">
            <input
              type="text"
              className="field-input-box"
              placeholder="Cari nama pasar / jalan di Manado (misal: Pasar Bahu)..."
              value={kataCariPeta}
              onChange={(e) => setKataCariPeta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCariDiPeta();
                }
              }}
            />
            <button
              type="button"
              className="amp-btn-search-map"
              disabled={sedangCariPeta}
              onClick={handleCariDiPeta}
            >
              {sedangCariPeta ? '...' : '🔍 Cari di Peta'}
            </button>
          </div>

          {hasilCariPeta.length > 0 && (
            <div className="amp-search-results">
              {hasilCariPeta.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="amp-search-result-item"
                  onClick={() => terapkanHasilCariPeta(item)}
                >
                  <strong>📍 {item.nama}</strong>
                  <span>{item.alamat || item.displayName}</span>
                </button>
              ))}
            </div>
          )}

          {infoGeocode && <div className="amp-geocode-status">{infoGeocode}</div>}

          <div className="amp-leaflet-wrap">
            <MapContainer
              center={[geocodingService.pusatManado.lat, geocodingService.pusatManado.lng]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <PenentuTitikPasar
                posisi={posisiPin}
                onPilihTitik={handlePilihTitikPeta}
                targetTerbang={targetTerbang}
              />

              {/* Tampilkan pin biru pasar lain yang sudah terdaftar sebagai referensi */}
              {pasarLainBertitik.map((p) => (
                <Marker key={p.id || p.nama_pasar} position={[p.latitude, p.longitude]} icon={ikonPasarLain}>
                  <Popup>
                    <strong>🏪 {p.nama_pasar}</strong>
                    <br />
                    <small>{p.alamat || 'Pasar terdaftar'}</small>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <p className="amp-map-caption">
            💡 <strong>Klik di mana saja pada peta</strong> (atau geser pin merah) untuk memasang titik pasar dan mengisi alamat otomatis. Pin biru adalah pasar lain yang sudah tersimpan.
          </p>
        </div>
      </div>

      {/* DAFTAR SELURUH PASAR TERDAFTAR DI SUPABASE */}
      <div className="amp-list-section">
        <h4>Daftar Pasar Terdaftar di Basis Data ({daftarPasarLengkap.length})</h4>
        {daftarPasarLengkap.length === 0 ? (
          <div className="amp-empty-list">
            Belum ada pasar di tabel master_pasar. Gunakan formulir di atas untuk menambahkan pasar pertama.
          </div>
        ) : (
          <div className="amp-market-cards">
            {daftarPasarLengkap.map((p) => {
              const sedangDiedit =
                modeEditPasar &&
                (String(modeEditPasar.id) === String(p.id) || modeEditPasar.nama_pasar === p.nama_pasar);
              return (
                <div key={p.id || p.nama_pasar} className={`amp-market-row ${sedangDiedit ? 'editing' : ''}`}>
                  <div className="amp-market-info">
                    <div className="amp-market-title-line">
                      <strong>🏪 {p.nama_pasar}</strong>
                      {p.kecamatan && <span className="amp-kec-tag">Kec. {p.kecamatan}</span>}
                      {p.punyaKoordinat ? (
                        <span className="amp-pin-ok">📍 Bertitik Peta</span>
                      ) : (
                        <span className="amp-pin-warn">⚠️ Belum Ada Titik Peta</span>
                      )}
                    </div>
                    <div className="amp-market-sub">
                      {p.alamat ? `Alamat: ${p.alamat}` : 'Alamat belum diisi — klik Edit untuk mengatur di peta.'}
                    </div>
                    {p.punyaKoordinat && (
                      <div className="amp-market-coord">
                        Koordinat: {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>

                  <div className="amp-market-actions">
                    <button
                      type="button"
                      className="amp-btn-edit"
                      onClick={() => mulaiEditPasar(p)}
                    >
                      ✏️ {p.punyaKoordinat ? 'Edit' : 'Atur Peta'}
                    </button>
                    <button
                      type="button"
                      className="amp-btn-del"
                      onClick={() => handleHapusPasar(p)}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
