// ===================================================================================
// Modul Modal Detail, Perbandingan Pasar & Riwayat Tren Harga Komoditas (Website)
// Fungsi: Menampilkan perbandingan harga antar pasar (urut Termurah -> Termahal) serta
//         grafik SVG tren & tabel log riwayat perubahan harga riil dari DB (7/30/90/Semua
//         hari) tanpa data dummy.
// ===================================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { analisisHargaService } from '../services/AnalisisHargaService';
import { riwayatHargaService } from '../services/RiwayatHargaService';
import './ModalDetailHargaWeb.css';

const PILIHAN_RENTANG = [
  { hari: 7, label: '7 Hari' },
  { hari: 30, label: '30 Hari' },
  { hari: 90, label: '90 Hari' },
  { hari: 0, label: 'Semua' }
];

export default function ModalDetailHargaWeb({ grupKomoditas, pasarTerpilihAwal = [], onTutup }) {
  const [tabAktif, setTabAktif] = useState('perbandingan'); // 'perbandingan' | 'riwayat'
  const [rentangHari, setRentangHari] = useState(30);
  const [pasarFilterRiwayat, setPasarFilterRiwayat] = useState('Semua');
  const [sedangMemuatRiwayat, setSedangMemuatRiwayat] = useState(false);
  const [errorRiwayat, setErrorRiwayat] = useState('');
  const [dataRiwayat, setDataRiwayat] = useState({
    belumMigrasi: false,
    riwayatKronologis: [],
    riwayatTerbaru: [],
    ringkasan: null
  });
  const [indeksTitikAktif, setIndeksTitikAktif] = useState(null);

  // Catat klik lihat ke basis data saat modal detail dibuka (non-blocking)
  useEffect(() => {
    if (grupKomoditas?.nama_komoditas) {
      riwayatHargaService.catatLihatKomoditas(grupKomoditas.nama_komoditas);
    }
  }, [grupKomoditas?.nama_komoditas]);

  // Muat riwayat harga riil dari basis data setiap rentang atau filter pasar berubah
  useEffect(() => {
    let aktif = true;
    const muat = async () => {
      if (!grupKomoditas?.nama_komoditas) return;
      setSedangMemuatRiwayat(true);
      setErrorRiwayat('');
      try {
        const filterPasar = pasarFilterRiwayat !== 'Semua'
          ? [pasarFilterRiwayat]
          : (Array.isArray(pasarTerpilihAwal) ? pasarTerpilihAwal : []);

        const hasil = await riwayatHargaService.ambilRiwayatKomoditas(
          grupKomoditas.nama_komoditas,
          { pasarTerpilih: filterPasar, rentangHari }
        );
        if (aktif) {
          setDataRiwayat(hasil);
          setIndeksTitikAktif(
            hasil.riwayatKronologis.length > 0 ? hasil.riwayatKronologis.length - 1 : null
          );
        }
      } catch (err) {
        if (aktif) {
          setErrorRiwayat(err?.message || 'Gagal memuat riwayat harga dari basis data.');
        }
      } finally {
        if (aktif) setSedangMemuatRiwayat(false);
      }
    };
    muat();
    return () => { aktif = false; };
  }, [grupKomoditas?.nama_komoditas, rentangHari, pasarFilterRiwayat, pasarTerpilihAwal]);

  // Tutup modal saat tombol Escape ditekan
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTutup]);

  const daftarPasarKomoditas = useMemo(
    () => grupKomoditas?.daftarPasarItem || [],
    [grupKomoditas]
  );

  const selisihPasar = useMemo(() => {
    if (!grupKomoditas) return 0;
    return Math.max(0, (grupKomoditas.hargaStandarMax || 0) - (grupKomoditas.hargaStandarMin || 0));
  }, [grupKomoditas]);

  // Kalkulasi geometri grafik SVG riil (tanpa data buatan)
  const grafikSVG = useMemo(() => {
    const titik = dataRiwayat.riwayatKronologis || [];
    if (titik.length === 0) return null;

    const lebar = 640;
    const tinggi = 230;
    const padKiri = 68;
    const padKanan = 24;
    const padAtas = 22;
    const padBawah = 36;
    const areaLebar = lebar - padKiri - padKanan;
    const areaTinggi = tinggi - padAtas - padBawah;

    const daftarHarga = titik.map((t) => Number(t.harga_baru) || 0);
    const minAsli = Math.min(...daftarHarga);
    const maxAsli = Math.max(...daftarHarga);
    const rentang = maxAsli - minAsli;
    const paddingY = rentang === 0 ? Math.max(1000, Math.round(minAsli * 0.1)) : Math.round(rentang * 0.18);
    const yMin = Math.max(0, minAsli - paddingY);
    const yMax = maxAsli + paddingY;
    const spanY = Math.max(1, yMax - yMin);

    const koordinat = titik.map((t, idx) => {
      const x = titik.length === 1
        ? padKiri + areaLebar / 2
        : padKiri + (idx / (titik.length - 1)) * areaLebar;
      const y = padAtas + areaTinggi - (((Number(t.harga_baru) || 0) - yMin) / spanY) * areaTinggi;
      return { x, y, data: t, idx };
    });

    const pathGaris = koordinat.map((k, i) => `${i === 0 ? 'M' : 'L'} ${k.x.toFixed(1)} ${k.y.toFixed(1)}`).join(' ');
    const pathArea = koordinat.length > 1
      ? `${pathGaris} L ${koordinat[koordinat.length - 1].x.toFixed(1)} ${(padAtas + areaTinggi).toFixed(1)} L ${koordinat[0].x.toFixed(1)} ${(padAtas + areaTinggi).toFixed(1)} Z`
      : '';

    const gridY = [0, 0.25, 0.5, 0.75, 1].map((fraksi) => {
      const nilai = Math.round(yMin + spanY * (1 - fraksi));
      const yPos = padAtas + areaTinggi * fraksi;
      return { nilai, yPos };
    });

    return { lebar, tinggi, padKiri, padKanan, padAtas, padBawah, areaLebar, areaTinggi, koordinat, pathGaris, pathArea, gridY };
  }, [dataRiwayat.riwayatKronologis]);

  if (!grupKomoditas) return null;

  const titikTerpilih =
    indeksTitikAktif !== null && dataRiwayat.riwayatKronologis[indeksTitikAktif]
      ? dataRiwayat.riwayatKronologis[indeksTitikAktif]
      : dataRiwayat.riwayatKronologis[dataRiwayat.riwayatKronologis.length - 1] || null;

  return (
    <div className="detail-modal-overlay" onClick={onTutup} role="dialog" aria-modal="true">
      <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="detail-modal-header">
          <div>
            <div className="detail-modal-badges">
              <span className="detail-badge-kat">{grupKomoditas.kategori}</span>
              <span className="detail-badge-unit">Satuan Standar: {grupKomoditas.labelStandar}</span>
              <span className="detail-badge-market">{grupKomoditas.jumlahPasar} Pasar Pantauan</span>
            </div>
            <h2 className="detail-modal-title">{grupKomoditas.nama_komoditas}</h2>
            <p className="detail-modal-sub">
              Data resmi terverifikasi Dinas Pangan Kota Manado • Pembaruan: {grupKomoditas.tanggalPenetapanTerbaru}
            </p>
          </div>
          <button type="button" className="detail-modal-close" onClick={onTutup} aria-label="Tutup">
            ✕
          </button>
        </div>

        {/* Ringkasan KPI Komoditas */}
        <div className="detail-kpi-strip">
          <div className="detail-kpi-box kpi-cheap">
            <span className="kpi-label">🟢 Termurah</span>
            <strong className="kpi-value">{analisisHargaService.formatRupiah(grupKomoditas.hargaMin)}</strong>
            <small className="kpi-meta">{grupKomoditas.pasarTermurah?.nama_pasar}</small>
          </div>
          <div className="detail-kpi-box kpi-avg">
            <span className="kpi-label">⚖️ Rata-rata ({grupKomoditas.labelStandar})</span>
            <strong className="kpi-value">{analisisHargaService.formatRupiah(grupKomoditas.hargaStandarRataRata)}</strong>
            <small className="kpi-meta">Dari {grupKomoditas.jumlahPasar} pasar terpilih</small>
          </div>
          <div className="detail-kpi-box kpi-expensive">
            <span className="kpi-label">🔴 Termahal</span>
            <strong className="kpi-value">{analisisHargaService.formatRupiah(grupKomoditas.hargaMax)}</strong>
            <small className="kpi-meta">{grupKomoditas.pasarTermahal?.nama_pasar}</small>
          </div>
          <div className="detail-kpi-box kpi-spread">
            <span className="kpi-label">📊 Selisih Pasar</span>
            <strong className="kpi-value">{analisisHargaService.formatRupiah(selisihPasar)}</strong>
            <small className="kpi-meta">{selisihPasar === 0 ? 'Harga seragam antar pasar' : `Rentang per ${grupKomoditas.labelStandar}`}</small>
          </div>
        </div>

        {/* Navigasi Tab Detail */}
        <div className="detail-tabs-bar">
          <button
            type="button"
            className={`detail-tab-btn ${tabAktif === 'perbandingan' ? 'active' : ''}`}
            onClick={() => setTabAktif('perbandingan')}
          >
            📍 Perbandingan Antar Pasar ({grupKomoditas.jumlahPasar})
          </button>
          <button
            type="button"
            className={`detail-tab-btn ${tabAktif === 'riwayat' ? 'active' : ''}`}
            onClick={() => setTabAktif('riwayat')}
          >
            📈 Tren & Riwayat Perubahan Harga
            {dataRiwayat.riwayatTerbaru.length > 0 && (
              <span className="detail-tab-count">{dataRiwayat.riwayatTerbaru.length}</span>
            )}
          </button>
        </div>

        {/* Isi Modal */}
        <div className="detail-modal-body">
          {/* TAB 1: PERBANDINGAN ANTAR PASAR */}
          {tabAktif === 'perbandingan' && (
            <div className="detail-compare-section">
              <div className="detail-section-hint">
                Diurutkan otomatis dari <strong>Pasar Termurah → Termahal</strong> (satuan resmi terkunci per {grupKomoditas.labelStandar}).
              </div>

              <div className="detail-market-list">
                {daftarPasarKomoditas.map((item, idx) => {
                  const selisihDariTermurah = item.hargaStandar - grupKomoditas.hargaStandarMin;
                  const isTermurah = grupKomoditas.adaPerbedaanHarga && idx === 0;
                  const isTermahal = grupKomoditas.adaPerbedaanHarga && idx === daftarPasarKomoditas.length - 1;
                  const delta = item.delta;

                  return (
                    <div
                      key={item.id || `${item.nama_pasar}-${idx}`}
                      className={`detail-market-row ${isTermurah ? 'row-cheapest' : isTermahal ? 'row-expensive' : ''}`}
                    >
                      <div className="market-rank-col">
                        <span className="market-rank-num">#{idx + 1}</span>
                      </div>
                      <div className="market-info-col">
                        <div className="market-name-line">
                          <strong>{item.nama_pasar}</strong>
                          {isTermurah && <span className="pill-cheapest">🏆 Termurah</span>}
                          {isTermahal && <span className="pill-expensive">⬆️ Termahal</span>}
                          {!grupKomoditas.adaPerbedaanHarga && grupKomoditas.jumlahPasar > 1 && (
                            <span className="pill-equal">Harga Sama</span>
                          )}
                        </div>
                        <div className="market-meta-line">
                          <span>Satuan: <strong>{item.satuan}</strong></span>
                          {item.perluKonversi && (
                            <span className="market-conv-hint">
                              (Setara {analisisHargaService.formatRupiah(item.hargaStandar)} / {item.labelStandar})
                            </span>
                          )}
                          <span>• Ditetapkan {item.tanggal_penetapan || '-'}</span>
                        </div>
                      </div>
                      <div className="market-price-col">
                        <div className="market-price-main">{analisisHargaService.formatRupiah(item.harga)}</div>
                        <div className="market-price-sub">
                          {selisihDariTermurah > 0 ? (
                            <span className="diff-plus">+{analisisHargaService.formatRupiah(selisihDariTermurah)} dari termurah</span>
                          ) : grupKomoditas.jumlahPasar > 1 ? (
                            <span className="diff-best">Harga terbaik di pasar terpilih</span>
                          ) : (
                            <span className="diff-neutral">1 pasar terpilih</span>
                          )}
                        </div>
                        {delta && delta.selisih !== 0 && (
                          <span className={`delta-mini ${delta.selisih > 0 ? 'delta-up' : 'delta-down'}`}>
                            {delta.selisih > 0 ? '▲' : '▼'} {analisisHargaService.formatRupiah(Math.abs(delta.selisih))} dari sebelumnya
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TREN & RIWAYAT PERUBAHAN HARGA RIIL */}
          {tabAktif === 'riwayat' && (
            <div className="detail-history-section">
              {/* Filter Rentang Hari & Pasar */}
              <div className="history-controls-row">
                <div className="history-range-group">
                  {PILIHAN_RENTANG.map((p) => (
                    <button
                      key={p.hari}
                      type="button"
                      className={`history-range-btn ${rentangHari === p.hari ? 'active' : ''}`}
                      onClick={() => setRentangHari(p.hari)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <select
                  className="history-market-select"
                  value={pasarFilterRiwayat}
                  onChange={(e) => setPasarFilterRiwayat(e.target.value)}
                >
                  <option value="Semua">
                    {pasarTerpilihAwal.length > 0
                      ? `Semua Pasar Terpilih (${pasarTerpilihAwal.length})`
                      : 'Semua Pasar'}
                  </option>
                  {daftarPasarKomoditas.map((m) => (
                    <option key={m.nama_pasar} value={m.nama_pasar}>
                      {m.nama_pasar}
                    </option>
                  ))}
                </select>
              </div>

              {sedangMemuatRiwayat ? (
                <div className="history-loading-box">
                  <div className="spinner-loader"></div>
                  <p>Mengambil catatan riwayat harga riil dari basis data...</p>
                </div>
              ) : errorRiwayat ? (
                <div className="history-alert-box is-error">
                  ⚠️ {errorRiwayat}
                </div>
              ) : dataRiwayat.belumMigrasi ? (
                <div className="history-alert-box is-warning">
                  <strong>ℹ️ Tabel Riwayat Harga Belum Diinisialisasi di Database</strong>
                  <p>
                    Jalankan skema <code>backend/database/setup_lengkap_supabase.sql</code> agar setiap perubahan harga resmi yang diverifikasi Kepala Bidang otomatis terekam dan tampil di grafik ini (tanpa data dummy).
                  </p>
                </div>
              ) : dataRiwayat.riwayatKronologis.length === 0 ? (
                <div className="history-alert-box is-neutral">
                  <strong>📭 Belum Ada Catatan Riwayat pada Rentang {rentangHari === 0 ? 'Semua Waktu' : `${rentangHari} Hari Terakhir`}</strong>
                  <p>
                    Tidak ada perubahan harga resmi yang tercatat di basis data pada rentang ini. Coba pilih rentang <strong>Semua</strong> atau tunggu pembaruan harga terverifikasi berikutnya.
                  </p>
                </div>
              ) : (
                <>
                  {/* Ringkasan Tren Periode */}
                  {dataRiwayat.ringkasan && (
                    <div className="history-summary-grid">
                      <div className="h-sum-item">
                        <span>Status Tren</span>
                        <strong className={`trend-text-${dataRiwayat.ringkasan.statusTren.toLowerCase()}`}>
                          {dataRiwayat.ringkasan.statusTren === 'Naik' && `▲ Naik ${dataRiwayat.ringkasan.persentase}%`}
                          {dataRiwayat.ringkasan.statusTren === 'Turun' && `▼ Turun ${dataRiwayat.ringkasan.persentase}%`}
                          {dataRiwayat.ringkasan.statusTren === 'Stabil' && '• Harga Stabil'}
                        </strong>
                      </div>
                      <div className="h-sum-item">
                        <span>Terendah Periode</span>
                        <strong>{analisisHargaService.formatRupiah(dataRiwayat.ringkasan.hargaTerendah)}</strong>
                      </div>
                      <div className="h-sum-item">
                        <span>Tertinggi Periode</span>
                        <strong>{analisisHargaService.formatRupiah(dataRiwayat.ringkasan.hargaTertinggi)}</strong>
                      </div>
                      <div className="h-sum-item">
                        <span>Total Catatan DB</span>
                        <strong>{dataRiwayat.ringkasan.jumlahCatatan} pencatatan resmi</strong>
                      </div>
                    </div>
                  )}

                  {/* Keterangan Jujur jika Harga Belum Pernah Berubah */}
                  {dataRiwayat.ringkasan && !dataRiwayat.ringkasan.adaPerubahan && (
                    <div className="history-stable-banner">
                      ℹ️ Harga tercatat <strong>stabil</strong> di {analisisHargaService.formatRupiah(dataRiwayat.ringkasan.hargaAkhir)} pada periode ini — belum ada perubahan harga resmi di basis data.
                    </div>
                  )}

                  {/* Grafik Garis SVG Riil */}
                  {grafikSVG && (
                    <div className="history-chart-card">
                      {titikTerpilih && (
                        <div className="chart-active-tooltip">
                          <div>
                            <strong>{analisisHargaService.formatRupiah(titikTerpilih.harga_baru)}</strong>
                            <span> / {analisisHargaService.normalisasiSatuan(titikTerpilih.satuan)}</span>
                            <span className="chart-dot-sep">•</span>
                            <span>{titikTerpilih.nama_pasar}</span>
                          </div>
                          <div className="chart-tooltip-right">
                            <span>{analisisHargaService.formatTanggalWaktu(titikTerpilih.dicatat_pada)}</span>
                            {Number(titikTerpilih.selisih) !== 0 && (
                              <span className={`delta-mini ${Number(titikTerpilih.selisih) > 0 ? 'delta-up' : 'delta-down'}`}>
                                {Number(titikTerpilih.selisih) > 0 ? '▲ +' : '▼ -'}
                                {analisisHargaService.formatRupiah(Math.abs(Number(titikTerpilih.selisih)))}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <svg
                        viewBox={`0 0 ${grafikSVG.lebar} ${grafikSVG.tinggi}`}
                        className="history-svg-chart"
                        role="img"
                        aria-label={`Grafik riwayat harga ${grupKomoditas.nama_komoditas}`}
                      >
                        <defs>
                          <linearGradient id="sipatokaanAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#912222" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#912222" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {/* Grid Horizontal & Label Harga Y */}
                        {grafikSVG.gridY.map((g, i) => (
                          <g key={i}>
                            <line
                              x1={grafikSVG.padKiri}
                              y1={g.yPos}
                              x2={grafikSVG.lebar - grafikSVG.padKanan}
                              y2={g.yPos}
                              stroke="#e5e7eb"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={grafikSVG.padKiri - 8}
                              y={g.yPos + 4}
                              textAnchor="end"
                              fontSize="10"
                              fill="#6b7280"
                            >
                              {analisisHargaService.formatRupiah(g.nilai)}
                            </text>
                          </g>
                        ))}

                        {/* Area Bawah Garis */}
                        {grafikSVG.pathArea && (
                          <path d={grafikSVG.pathArea} fill="url(#sipatokaanAreaGrad)" />
                        )}

                        {/* Garis Tren Riil */}
                        {grafikSVG.koordinat.length > 1 && (
                          <path
                            d={grafikSVG.pathGaris}
                            fill="none"
                            stroke="#912222"
                            strokeWidth="2.8"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Titik-titik Data Riil Interaktif */}
                        {grafikSVG.koordinat.map((pt) => {
                          const aktif = pt.idx === (indeksTitikAktif ?? grafikSVG.koordinat.length - 1);
                          const tampilLabelX =
                            grafikSVG.koordinat.length <= 6 ||
                            pt.idx === 0 ||
                            pt.idx === grafikSVG.koordinat.length - 1 ||
                            pt.idx === Math.floor(grafikSVG.koordinat.length / 2);

                          return (
                            <g
                              key={pt.data.id || pt.idx}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setIndeksTitikAktif(pt.idx)}
                              onClick={() => setIndeksTitikAktif(pt.idx)}
                            >
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={aktif ? 6.5 : 4.5}
                                fill={aktif ? '#912222' : '#ffffff'}
                                stroke="#912222"
                                strokeWidth="2.5"
                              />
                              {tampilLabelX && (
                                <text
                                  x={pt.x}
                                  y={grafikSVG.tinggi - 10}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#6b7280"
                                >
                                  {analisisHargaService.formatTanggalRingkas(pt.data.dicatat_pada)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}

                  {/* Tabel Log Perubahan Harga Resmi */}
                  <div className="history-table-wrapper">
                    <h4 className="history-table-heading">📋 Log Perubahan Harga Terverifikasi (Terbaru di Atas)</h4>
                    <div className="history-table-scroll">
                      <table className="history-log-table">
                        <thead>
                          <tr>
                            <th>Waktu Dicatat</th>
                            <th>Pasar</th>
                            <th>Harga Sebelumnya</th>
                            <th>Harga Baru</th>
                            <th>Selisih</th>
                            <th>Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataRiwayat.riwayatTerbaru.map((row, i) => {
                            const selisih = Number(row.selisih) || 0;
                            return (
                              <tr key={row.id || i}>
                                <td>{analisisHargaService.formatTanggalWaktu(row.dicatat_pada)}</td>
                                <td><strong>{row.nama_pasar}</strong></td>
                                <td>
                                  {row.harga_lama !== null && row.harga_lama !== undefined
                                    ? analisisHargaService.formatRupiah(row.harga_lama)
                                    : <span className="muted-dash">Penetapan Awal</span>}
                                </td>
                                <td className="price-cell-bold">
                                  {analisisHargaService.formatRupiah(row.harga_baru)}
                                  <small> / {analisisHargaService.normalisasiSatuan(row.satuan)}</small>
                                </td>
                                <td>
                                  {selisih > 0 ? (
                                    <span className="delta-mini delta-up">▲ +{analisisHargaService.formatRupiah(selisih)}</span>
                                  ) : selisih < 0 ? (
                                    <span className="delta-mini delta-down">▼ -{analisisHargaService.formatRupiah(Math.abs(selisih))}</span>
                                  ) : (
                                    <span className="delta-mini delta-flat">• Awal / Tetap</span>
                                  )}
                                </td>
                                <td className="note-cell">{row.keterangan || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
