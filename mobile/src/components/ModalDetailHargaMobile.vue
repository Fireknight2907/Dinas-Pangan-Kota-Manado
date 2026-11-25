<!--
  ===================================================================================
  Modul Modal Detail, Perbandingan Pasar & Riwayat Tren Harga Komoditas (Mobile Vue)
  Fungsi: Menampilkan perbandingan harga antar pasar (urut Termurah -> Termahal) serta
          grafik SVG tren & daftar log riwayat perubahan harga riil dari DB (7/30/90/
          Semua hari) tanpa data dummy pada aplikasi Android.
  ===================================================================================
-->
<template>
  <div v-if="grupKomoditas" class="m-detail-overlay" @click.self="emit('tutup')">
    <div class="m-detail-sheet">
      <!-- Header -->
      <div class="m-detail-header">
        <div class="m-detail-head-text">
          <div class="m-detail-badges">
            <span>{{ grupKomoditas.kategori }}</span>
            <span>{{ grupKomoditas.jumlahPasar }} Pasar</span>
            <span>Standar {{ grupKomoditas.labelStandar }}</span>
          </div>
          <h3 class="m-detail-title">{{ grupKomoditas.nama_komoditas }}</h3>
          <p class="m-detail-sub">Pembaruan: {{ grupKomoditas.tanggalPenetapanTerbaru }}</p>
        </div>
        <button type="button" class="m-detail-close" @click="emit('tutup')" aria-label="Tutup">✕</button>
      </div>

      <!-- KPI Strip 2x2 -->
      <div class="m-detail-kpi-grid">
        <div class="m-kpi-box kpi-cheap">
          <span>🟢 Termurah</span>
          <strong>{{ analisisHargaMobileService.formatRupiah(grupKomoditas.hargaMin) }}</strong>
          <small>{{ grupKomoditas.pasarTermurah?.nama_pasar }}</small>
        </div>
        <div class="m-kpi-box kpi-expensive">
          <span>🔴 Termahal</span>
          <strong>{{ analisisHargaMobileService.formatRupiah(grupKomoditas.hargaMax) }}</strong>
          <small>{{ grupKomoditas.pasarTermahal?.nama_pasar }}</small>
        </div>
        <div class="m-kpi-box kpi-avg">
          <span>⚖️ Rata-rata/{{ grupKomoditas.labelStandar }}</span>
          <strong>{{ analisisHargaMobileService.formatRupiah(grupKomoditas.hargaStandarRataRata) }}</strong>
          <small>{{ grupKomoditas.jumlahPasar }} pasar terpilih</small>
        </div>
        <div class="m-kpi-box kpi-spread">
          <span>📊 Selisih Pasar</span>
          <strong>{{ analisisHargaMobileService.formatRupiah(selisihPasar) }}</strong>
          <small>{{ selisihPasar === 0 ? 'Harga seragam' : 'Tertinggi - Terendah' }}</small>
        </div>
      </div>

      <!-- Tabs -->
      <div class="m-detail-tabs">
        <button
          type="button"
          :class="['m-detail-tab', tabAktif === 'perbandingan' ? 'active' : '']"
          @click="tabAktif = 'perbandingan'"
        >
          📍 Antar Pasar ({{ grupKomoditas.jumlahPasar }})
        </button>
        <button
          type="button"
          :class="['m-detail-tab', tabAktif === 'riwayat' ? 'active' : '']"
          @click="tabAktif = 'riwayat'"
        >
          📈 Tren & Riwayat
          <span v-if="dataRiwayat.riwayatTerbaru.length > 0" class="m-tab-badge">
            {{ dataRiwayat.riwayatTerbaru.length }}
          </span>
        </button>
      </div>

      <!-- Body Scrollable -->
      <div class="m-detail-body">
        <!-- TAB 1: PERBANDINGAN PASAR -->
        <div v-if="tabAktif === 'perbandingan'" class="m-compare-list">
          <div class="m-hint-bar">
            Diurutkan <strong>Termurah → Termahal</strong> (satuan resmi terkunci per {{ grupKomoditas.labelStandar }}).
          </div>

          <div
            v-for="(item, idx) in grupKomoditas.daftarPasarItem"
            :key="item.id || idx"
            :class="[
              'm-market-compare-card',
              grupKomoditas.adaPerbedaanHarga && idx === 0 ? 'is-cheap' : '',
              grupKomoditas.adaPerbedaanHarga && idx === grupKomoditas.daftarPasarItem.length - 1 ? 'is-expensive' : ''
            ]"
          >
            <div class="m-mc-top">
              <div class="m-mc-name-wrap">
                <span class="m-mc-rank">#{{ idx + 1 }}</span>
                <strong>{{ item.nama_pasar }}</strong>
              </div>
              <span v-if="grupKomoditas.adaPerbedaanHarga && idx === 0" class="m-pill-cheap">🏆 Termurah</span>
              <span v-else-if="grupKomoditas.adaPerbedaanHarga && idx === grupKomoditas.daftarPasarItem.length - 1" class="m-pill-exp">⬆️ Termahal</span>
            </div>

            <div class="m-mc-bottom">
              <div class="m-mc-meta">
                <span>Satuan: <strong>{{ item.satuan }}</strong></span>
                <span v-if="item.perluKonversi" class="m-mc-conv">
                  ≈ {{ analisisHargaMobileService.formatRupiah(item.hargaStandar) }}/{{ item.labelStandar }}
                </span>
                <span>Ditetapkan {{ item.tanggal_penetapan || '-' }}</span>
                <span
                  v-if="item.delta && item.delta.selisih !== 0"
                  :style="{ color: item.delta.selisih > 0 ? '#dc2626' : '#15803d', fontWeight: 700 }"
                >
                  {{ item.delta.selisih > 0 ? '▲ +' : '▼ -' }}{{ analisisHargaMobileService.formatRupiah(Math.abs(item.delta.selisih)) }} dari sebelumnya
                </span>
              </div>
              <div class="m-mc-price-box">
                <div class="m-mc-price">{{ analisisHargaMobileService.formatRupiah(item.harga) }}</div>
                <small v-if="item.hargaStandar - grupKomoditas.hargaStandarMin > 0" class="m-diff-plus">
                  +{{ analisisHargaMobileService.formatRupiah(item.hargaStandar - grupKomoditas.hargaStandarMin) }}
                </small>
                <small v-else-if="grupKomoditas.jumlahPasar > 1" class="m-diff-best">Terbaik</small>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: TREN & RIWAYAT HARGA RIIL -->
        <div v-else class="m-history-wrap">
          <div class="m-history-controls">
            <div class="m-range-pills">
              <button
                v-for="p in pilihanRentang"
                :key="p.hari"
                type="button"
                :class="['m-range-btn', rentangHari === p.hari ? 'active' : '']"
                @click="rentangHari = p.hari"
              >
                {{ p.label }}
              </button>
            </div>
            <select v-model="pasarFilterRiwayat" class="m-history-select">
              <option value="Semua">
                {{ pasarTerpilihAwal.length > 0 ? `Semua Pasar Terpilih (${pasarTerpilihAwal.length})` : 'Semua Pasar' }}
              </option>
              <option v-for="m in grupKomoditas.daftarPasarItem" :key="m.nama_pasar" :value="m.nama_pasar">
                {{ m.nama_pasar }}
              </option>
            </select>
          </div>

          <div v-if="sedangMemuatRiwayat" class="m-hist-state">
            Memuat riwayat harga riil dari basis data...
          </div>
          <div v-else-if="errorRiwayat" class="m-hist-alert is-err">
            ⚠️ {{ errorRiwayat }}
          </div>
          <div v-else-if="dataRiwayat.belumMigrasi" class="m-hist-alert is-warn">
            <strong>ℹ️ Tabel Riwayat Belum Diinisialisasi</strong>
            <p>Pastikan tabel <code>riwayat_harga_pangan</code> dari <code>setup_lengkap_supabase.sql</code> sudah tersedia agar perubahan harga resmi terekam otomatis (tanpa data dummy).</p>
          </div>
          <div v-else-if="dataRiwayat.riwayatKronologis.length === 0" class="m-hist-alert is-neutral">
            <strong>📭 Belum Ada Catatan Riwayat</strong>
            <p>Tidak ada catatan perubahan harga resmi pada rentang {{ rentangHari === 0 ? 'Semua Waktu' : `${rentangHari} hari terakhir` }}.</p>
          </div>
          <template v-else>
            <!-- Ringkasan Tren -->
            <div class="m-hist-sum-grid">
              <div class="m-hs-box">
                <span>Tren</span>
                <strong :class="'m-trend-' + dataRiwayat.ringkasan.statusTren.toLowerCase()">
                  {{ dataRiwayat.ringkasan.statusTren === 'Naik' ? `▲ +${dataRiwayat.ringkasan.persentase}%` :
                     dataRiwayat.ringkasan.statusTren === 'Turun' ? `▼ -${dataRiwayat.ringkasan.persentase}%` :
                     '• Stabil' }}
                </strong>
              </div>
              <div class="m-hs-box">
                <span>Terendah</span>
                <strong>{{ analisisHargaMobileService.formatRupiah(dataRiwayat.ringkasan.hargaTerendah) }}</strong>
              </div>
              <div class="m-hs-box">
                <span>Tertinggi</span>
                <strong>{{ analisisHargaMobileService.formatRupiah(dataRiwayat.ringkasan.hargaTertinggi) }}</strong>
              </div>
            </div>

            <div v-if="!dataRiwayat.ringkasan.adaPerubahan" class="m-stable-info">
              ℹ️ Harga tercatat <strong>stabil</strong> di {{ analisisHargaMobileService.formatRupiah(dataRiwayat.ringkasan.hargaAkhir) }} pada periode ini (belum ada perubahan di DB).
            </div>

            <!-- Grafik SVG Riil -->
            <div v-if="grafikSVG" class="m-chart-box">
              <div v-if="titikTerpilih" class="m-chart-tip">
                <div>
                  <strong>{{ analisisHargaMobileService.formatRupiah(titikTerpilih.harga_baru) }}</strong>
                  <small> / {{ analisisHargaMobileService.normalisasiSatuan(titikTerpilih.satuan) }}</small>
                </div>
                <div class="m-chart-tip-meta">
                  <span>{{ titikTerpilih.nama_pasar }}</span>
                  <span>• {{ analisisHargaMobileService.formatTanggalWaktu(titikTerpilih.dicatat_pada) }}</span>
                </div>
              </div>

              <svg :viewBox="`0 0 ${grafikSVG.lebar} ${grafikSVG.tinggi}`" class="m-svg-chart">
                <defs>
                  <linearGradient id="mAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#912222" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="#912222" stop-opacity="0.02" />
                  </linearGradient>
                </defs>
                <g v-for="(g, i) in grafikSVG.gridY" :key="i">
                  <line
                    :x1="grafikSVG.padKiri"
                    :y1="g.yPos"
                    :x2="grafikSVG.lebar - grafikSVG.padKanan"
                    :y2="g.yPos"
                    stroke="#e5e7eb"
                    stroke-dasharray="3 3"
                  />
                  <text :x="grafikSVG.padKiri - 6" :y="g.yPos + 3" text-anchor="end" font-size="9" fill="#64748b">
                    {{ analisisHargaMobileService.formatRupiah(g.nilai) }}
                  </text>
                </g>
                <path v-if="grafikSVG.pathArea" :d="grafikSVG.pathArea" fill="url(#mAreaGrad)" />
                <path
                  v-if="grafikSVG.koordinat.length > 1"
                  :d="grafikSVG.pathGaris"
                  fill="none"
                  stroke="#912222"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                <g
                  v-for="pt in grafikSVG.koordinat"
                  :key="pt.data.id || pt.idx"
                  @click="indeksTitikAktif = pt.idx"
                >
                  <circle
                    :cx="pt.x"
                    :cy="pt.y"
                    :r="pt.idx === (indeksTitikAktif ?? grafikSVG.koordinat.length - 1) ? 6 : 4"
                    :fill="pt.idx === (indeksTitikAktif ?? grafikSVG.koordinat.length - 1) ? '#912222' : '#ffffff'"
                    stroke="#912222"
                    stroke-width="2"
                  />
                  <text
                    v-if="grafikSVG.koordinat.length <= 4 || pt.idx === 0 || pt.idx === grafikSVG.koordinat.length - 1"
                    :x="pt.x"
                    :y="grafikSVG.tinggi - 8"
                    text-anchor="middle"
                    font-size="9"
                    fill="#64748b"
                  >
                    {{ analisisHargaMobileService.formatTanggalRingkas(pt.data.dicatat_pada) }}
                  </text>
                </g>
              </svg>
            </div>

            <!-- Log Perubahan Harga Resmi -->
            <div class="m-log-section">
              <h4 class="m-log-heading">📋 Log Perubahan Harga Terverifikasi</h4>
              <div v-for="(row, i) in dataRiwayat.riwayatTerbaru" :key="row.id || i" class="m-log-card">
                <div class="m-log-top">
                  <strong>{{ row.nama_pasar }}</strong>
                  <span class="m-log-time">{{ analisisHargaMobileService.formatTanggalWaktu(row.dicatat_pada) }}</span>
                </div>
                <div class="m-log-mid">
                  <span class="m-log-old">
                    {{ row.harga_lama !== null && row.harga_lama !== undefined
                        ? analisisHargaMobileService.formatRupiah(row.harga_lama)
                        : 'Awal' }}
                  </span>
                  <span>→</span>
                  <strong class="m-log-new">{{ analisisHargaMobileService.formatRupiah(row.harga_baru) }}</strong>
                  <span
                    :class="[
                      'm-log-delta',
                      Number(row.selisih) > 0 ? 'up' : Number(row.selisih) < 0 ? 'down' : 'flat'
                    ]"
                  >
                    {{ Number(row.selisih) > 0
                        ? `▲ +${analisisHargaMobileService.formatRupiah(Number(row.selisih))}`
                        : Number(row.selisih) < 0
                          ? `▼ -${analisisHargaMobileService.formatRupiah(Math.abs(Number(row.selisih)))}`
                          : '• Tetap' }}
                  </span>
                </div>
                <div v-if="row.keterangan" class="m-log-note">{{ row.keterangan }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { analisisHargaMobileService, type GrupKomoditasAnalisis } from '../services/AnalisisHargaService';
import { riwayatHargaMobileService, type HasilRiwayatKomoditas } from '../services/RiwayatHargaService';

const props = defineProps<{
  grupKomoditas: GrupKomoditasAnalisis | null;
  pasarTerpilihAwal: string[];
}>();

const emit = defineEmits<{ (e: 'tutup'): void }>();

const pilihanRentang = [
  { hari: 7, label: '7H' },
  { hari: 30, label: '30H' },
  { hari: 90, label: '90H' },
  { hari: 0, label: 'Semua' }
];

const tabAktif = ref<'perbandingan' | 'riwayat'>('perbandingan');
const rentangHari = ref<number>(30);
const pasarFilterRiwayat = ref<string>('Semua');
const sedangMemuatRiwayat = ref<boolean>(false);
const errorRiwayat = ref<string>('');
const indeksTitikAktif = ref<number | null>(null);

const dataRiwayat = ref<HasilRiwayatKomoditas>({
  belumMigrasi: false,
  riwayatKronologis: [],
  riwayatTerbaru: [],
  ringkasan: {
    jumlahCatatan: 0,
    adaPerubahan: false,
    hargaAwal: 0,
    hargaAkhir: 0,
    hargaTertinggi: 0,
    hargaTerendah: 0,
    selisihTotal: 0,
    persentase: 0,
    statusTren: 'Stabil'
  }
});

const selisihPasar = computed(() => {
  if (!props.grupKomoditas) return 0;
  return Math.max(0, (props.grupKomoditas.hargaStandarMax || 0) - (props.grupKomoditas.hargaStandarMin || 0));
});

const muatRiwayat = async () => {
  if (!props.grupKomoditas?.nama_komoditas) return;
  sedangMemuatRiwayat.value = true;
  errorRiwayat.value = '';
  try {
    const filterPasar = pasarFilterRiwayat.value !== 'Semua'
      ? [pasarFilterRiwayat.value]
      : (props.pasarTerpilihAwal || []);
    const hasil = await riwayatHargaMobileService.ambilRiwayatKomoditas(
      props.grupKomoditas.nama_komoditas,
      { pasarTerpilih: filterPasar, rentangHari: rentangHari.value }
    );
    dataRiwayat.value = hasil;
    indeksTitikAktif.value = hasil.riwayatKronologis.length > 0 ? hasil.riwayatKronologis.length - 1 : null;
  } catch (err: any) {
    errorRiwayat.value = err?.message || 'Gagal memuat riwayat harga dari basis data.';
  } finally {
    sedangMemuatRiwayat.value = false;
  }
};

watch(
  () => props.grupKomoditas,
  (baru) => {
    if (baru) {
      tabAktif.value = 'perbandingan';
      pasarFilterRiwayat.value = 'Semua';
      rentangHari.value = 30;
      riwayatHargaMobileService.catatLihatKomoditas(baru.nama_komoditas);
      muatRiwayat();
    }
  },
  { immediate: true }
);

watch([rentangHari, pasarFilterRiwayat], () => {
  if (props.grupKomoditas) muatRiwayat();
});

const titikTerpilih = computed(() => {
  const list = dataRiwayat.value.riwayatKronologis || [];
  if (list.length === 0) return null;
  if (indeksTitikAktif.value !== null && list[indeksTitikAktif.value]) {
    return list[indeksTitikAktif.value];
  }
  return list[list.length - 1];
});

const grafikSVG = computed(() => {
  const titik = dataRiwayat.value.riwayatKronologis || [];
  if (titik.length === 0) return null;

  const lebar = 380;
  const tinggi = 180;
  const padKiri = 62;
  const padKanan = 16;
  const padAtas = 18;
  const padBawah = 28;
  const areaLebar = lebar - padKiri - padKanan;
  const areaTinggi = tinggi - padAtas - padBawah;

  const daftarHarga = titik.map((t) => Number(t.harga_baru) || 0);
  const minAsli = Math.min(...daftarHarga);
  const maxAsli = Math.max(...daftarHarga);
  const rentang = maxAsli - minAsli;
  const padY = rentang === 0 ? Math.max(1000, Math.round(minAsli * 0.1)) : Math.round(rentang * 0.18);
  const yMin = Math.max(0, minAsli - padY);
  const yMax = maxAsli + padY;
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

  const gridY = [0, 0.5, 1].map((fraksi) => ({
    nilai: Math.round(yMin + spanY * (1 - fraksi)),
    yPos: padAtas + areaTinggi * fraksi
  }));

  return { lebar, tinggi, padKiri, padKanan, padAtas, padBawah, koordinat, pathGaris, pathArea, gridY };
});
</script>

<style scoped>
.m-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  z-index: 20000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.m-detail-sheet {
  background: #ffffff;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.25);
}

.m-detail-header {
  background: linear-gradient(135deg, #8b1e1e 0%, #6f1414 100%);
  color: #ffffff;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.m-detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.m-detail-badges span {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

.m-detail-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.m-detail-sub {
  margin: 3px 0 0 0;
  font-size: 0.74rem;
  opacity: 0.88;
}

.m-detail-close {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #ffffff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
}

.m-detail-kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.m-kpi-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-kpi-box.kpi-cheap { border-left: 3px solid #16a34a; }
.m-kpi-box.kpi-expensive { border-left: 3px solid #dc2626; }
.m-kpi-box.kpi-avg { border-left: 3px solid #2563eb; }
.m-kpi-box.kpi-spread { border-left: 3px solid #8b1e1e; }

.m-kpi-box span { font-size: 0.68rem; color: #64748b; font-weight: 700; }
.m-kpi-box strong { font-size: 0.92rem; color: #0f172a; font-weight: 800; }
.m-kpi-box small { font-size: 0.66rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.m-detail-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.m-detail-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 11px 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  border-bottom: 3px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.m-detail-tab.active {
  color: #8b1e1e;
  border-bottom-color: #8b1e1e;
}

.m-tab-badge {
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.68rem;
  padding: 1px 6px;
  border-radius: 999px;
}

.m-detail-body {
  padding: 14px 16px 24px 16px;
  overflow-y: auto;
  flex: 1;
}

.m-hint-bar {
  font-size: 0.76rem;
  color: #475569;
  background: #f1f5f9;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.m-compare-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-market-compare-card {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
}

.m-market-compare-card.is-cheap { border-color: #86efac; background: #f0fdf4; }
.m-market-compare-card.is-expensive { border-color: #fecaca; background: #fef2f2; }

.m-mc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.m-mc-name-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
  color: #0f172a;
}

.m-mc-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #334155;
  font-size: 0.7rem;
  font-weight: 800;
}

.is-cheap .m-mc-rank { background: #16a34a; color: #fff; }
.is-expensive .m-mc-rank { background: #dc2626; color: #fff; }

.m-pill-cheap { background: #16a34a; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
.m-pill-exp { background: #dc2626; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; }

.m-mc-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
}

.m-mc-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.72rem;
  color: #64748b;
}

.m-mc-conv { color: #0369a1; font-weight: 600; }

.m-mc-price-box { text-align: right; }
.m-mc-price { font-size: 1rem; font-weight: 800; color: #8b1e1e; }
.m-diff-plus { color: #dc2626; font-size: 0.68rem; font-weight: 700; }
.m-diff-best { color: #15803d; font-size: 0.68rem; font-weight: 700; }

/* History */
.m-history-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.m-range-pills {
  display: flex;
  gap: 6px;
}

.m-range-btn {
  flex: 1;
  padding: 7px 6px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 0.76rem;
  font-weight: 700;
}

.m-range-btn.active {
  background: #8b1e1e;
  border-color: #8b1e1e;
  color: #ffffff;
}

.m-history-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.78rem;
  font-weight: 600;
  background: #ffffff;
  color: #1e293b;
}

.m-hist-state {
  text-align: center;
  padding: 24px 12px;
  font-size: 0.82rem;
  color: #64748b;
}

.m-hist-alert {
  padding: 12px;
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.45;
}

.m-hist-alert p { margin: 4px 0 0 0; }
.m-hist-alert.is-err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.m-hist-alert.is-warn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.m-hist-alert.is-neutral { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

.m-hist-sum-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.m-hs-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-hs-box span { font-size: 0.66rem; color: #64748b; font-weight: 600; }
.m-hs-box strong { font-size: 0.8rem; color: #0f172a; font-weight: 800; }

.m-trend-naik { color: #dc2626 !important; }
.m-trend-turun { color: #16a34a !important; }
.m-trend-stabil { color: #0369a1 !important; }

.m-stable-info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 0.74rem;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.m-chart-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 14px;
}

.m-chart-tip {
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 7px 10px;
  margin-bottom: 8px;
  font-size: 0.78rem;
  color: #1f2937;
}

.m-chart-tip-meta {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.m-svg-chart {
  width: 100%;
  height: auto;
  display: block;
}

.m-log-heading {
  font-size: 0.84rem;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.m-log-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  background: #ffffff;
}

.m-log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  color: #0f172a;
}

.m-log-time { font-size: 0.68rem; color: #64748b; }

.m-log-mid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
  font-size: 0.78rem;
}

.m-log-old { color: #64748b; }
.m-log-new { color: #8b1e1e; font-weight: 800; }

.m-log-delta {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.m-log-delta.up { background: #fee2e2; color: #b91c1c; }
.m-log-delta.down { background: #dcfce7; color: #15803d; }
.m-log-delta.flat { background: #f1f5f9; color: #475569; }

.m-log-note {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 4px;
}
</style>
