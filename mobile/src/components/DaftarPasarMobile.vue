<template>
  <!-- ===================================================================================
       Modul Tampilan Publik Daftar Pasar & Peta Sebaran Pasar Kota Manado (Mobile)
       Fungsi: Menampilkan seluruh pasar resmi yang diinput Admin di tabel master_pasar
               (100% data riil Supabase, tanpa dummy) dengan peta interaktif Leaflet/OSM,
               filter kecamatan, pencarian, GPS terdekat, rute Google Maps, dan pintasan
               lihat harga pangan per pasar.
       =================================================================================== -->
  <div class="m-dp-wrap">
    <!-- Hero Daftar Pasar Mobile -->
    <div class="mobile-hero-card m-dp-hero">
      <div class="hero-badge-tag">
        <span>🏪</span>
        <span>Direktori Pasar Resmi Manado</span>
      </div>
      <h2 class="hero-title-text">Daftar Pasar Kota Manado</h2>
      <p class="hero-desc-text">
        Lihat lokasi titik pasar tradisional resmi yang dipantau Dinas Pangan Kota Manado pada peta interaktif dan cek langsung daftar harga di tiap pasar.
      </p>
      <div class="hero-update-date" style="display: flex; gap: 10px; flex-wrap: wrap;">
        <span>🏪 {{ daftarPasar.length }} Pasar Terdaftar</span>
        <span>•</span>
        <span>📍 {{ totalBertitikSemua }} Bertitik Peta</span>
      </div>
    </div>

    <!-- Bar Filter Pencarian, Kecamatan & GPS Terdekat -->
    <div class="m-dp-filter-card">
      <div class="m-dp-search-row">
        <span>🔍</span>
        <input
          type="text"
          v-model="pencarian"
          placeholder="Cari nama pasar, alamat, atau kecamatan..."
        />
        <button v-if="pencarian" type="button" class="m-dp-clear" @click="pencarian = ''">✕</button>
      </div>
      <div class="m-dp-filter-row2">
        <select v-model="kecamatanFilter" class="m-dp-select">
          <option value="Semua">🏘️ Semua Kecamatan</option>
          <option v-for="kec in daftarKecamatanUnik" :key="kec" :value="kec">Kec. {{ kec }}</option>
        </select>
        <button
          type="button"
          :class="['m-dp-gps-btn', posisiUser ? 'active' : '']"
          :disabled="sedangCariGPS"
          @click="cariLokasiGPS"
        >
          {{ sedangCariGPS ? '📡 GPS...' : (posisiUser ? '📍 Terdekat ✓' : '📍 Terdekat') }}
        </button>
      </div>
    </div>

    <!-- Error / Loading / Kosong / Peta + Daftar -->
    <div v-if="sedangMemuat" class="m-dp-state-box">
      ⏳ Memuat data pasar & titik lokasi resmi dari basis data...
    </div>

    <div v-else-if="errorMuat" class="m-dp-error-box">
      <p>⚠️ {{ errorMuat }}</p>
      <button type="button" @click="muatData">🔄 Muat Ulang</button>
    </div>

    <div v-else-if="daftarPasar.length === 0" class="m-dp-state-box">
      <div style="font-size: 2rem; margin-bottom: 6px;">🏪</div>
      <strong>Belum Ada Data Pasar Terdaftar</strong>
      <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: #64748b;">
        Pasar yang ditambahkan &amp; disimpan Admin akan otomatis tampil di sini beserta titik petanya.
      </p>
    </div>

    <template v-else>
      <!-- Peta Leaflet Interaktif -->
      <div class="m-dp-map-card">
        <div class="m-dp-map-head">
          <span>🗺️ Peta Titik Lokasi Pasar ({{ pasarBertitikPeta.length }}/{{ daftarPasarTampil.length }})</span>
          <span class="m-dp-map-tag">Interaktif</span>
        </div>
        <div id="petaDaftarPasarMobile" class="m-dp-leaflet-box"></div>
        <div v-if="pasarBertitikPeta.length === 0" class="m-dp-map-note">
          ℹ️ Belum ada titik koordinat pada pasar di filter ini. Pin peta akan otomatis muncul setelah Admin mengatur lokasi di Master Pasar.
        </div>
      </div>

      <!-- Daftar Kartu Pasar -->
      <div v-if="daftarPasarTampil.length === 0" class="m-dp-state-box">
        Tidak ditemukan pasar yang cocok dengan pencarian "{{ pencarian }}".
      </div>

      <div v-else class="m-dp-cards-stack">
        <div
          v-for="pasar in daftarPasarTampil"
          :key="pasar.id || pasar.nama_pasar"
          :class="['m-dp-card', pasarTerpilihId === (pasar.id || pasar.nama_pasar) ? 'active' : '']"
          @click="pilihPasar(pasar)"
        >
          <div class="m-dp-card-top">
            <h4>🏪 {{ pasar.nama_pasar }}</h4>
            <div class="m-dp-pills">
              <span v-if="pasar.kecamatan" class="m-dp-kec-pill">Kec. {{ pasar.kecamatan }}</span>
              <span v-if="pasar.jarakKm !== null" class="m-dp-dist-pill">🧭 {{ pasar.jarakKm }} km</span>
            </div>
          </div>

          <p class="m-dp-addr">📍 {{ pasar.alamat || 'Alamat lengkap belum diatur Admin' }}</p>

          <div class="m-dp-coord-row">
            <span v-if="pasar.punyaKoordinat" class="m-dp-coord-ok">
              ✓ {{ pasar.latitude?.toFixed(5) }}, {{ pasar.longitude?.toFixed(5) }}
            </span>
            <span v-else class="m-dp-coord-warn">
              ⚠️ Titik lokasi peta belum diatur Admin
            </span>
          </div>

          <div class="m-dp-actions" @click.stop>
            <a
              :href="geocodingMobileService.bangunUrlGoogleMaps(pasar.latitude, pasar.longitude, pasar.nama_pasar)"
              target="_blank"
              rel="noopener noreferrer"
              class="m-dp-btn-gmaps"
            >
              🧭 Google Maps
            </a>
            <button
              type="button"
              class="m-dp-btn-harga"
              @click="emit('lihat-harga-pasar', pasar.nama_pasar)"
            >
              🛒 Lihat Harga ({{ pasar.jumlahKomoditas }})
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// ===================================================================================
// LOGIKA KOMPONEN DAFTAR PASAR PUBLIK (MOBILE - VUE 3 + LEAFLET + OOP SERVICE)
// ===================================================================================
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import { masterDataMobileService, type ItemMasterPasar } from '../services/MasterDataService';
import { geocodingMobileService } from '../services/GeocodingService';
import type { ItemHargaPangan } from '../services/HargaPanganService';

const props = defineProps<{
  daftarHargaTerbit: ItemHargaPangan[];
}>();

const emit = defineEmits<{
  (e: 'lihat-harga-pasar', namaPasar: string): void;
}>();

const daftarPasar = ref<ItemMasterPasar[]>([]);
const sedangMemuat = ref(true);
const errorMuat = ref('');
const pencarian = ref('');
const kecamatanFilter = ref('Semua');
const posisiUser = ref<{ lat: number; lng: number } | null>(null);
const sedangCariGPS = ref(false);
const pasarTerpilihId = ref<string | null>(null);

let mapPasar: L.Map | null = null;

const muatData = async () => {
  sedangMemuat.value = true;
  errorMuat.value = '';
  try {
    const rows = await masterDataMobileService.ambilDaftarPasarLengkap();
    daftarPasar.value = Array.isArray(rows) ? rows : [];
  } catch (err: any) {
    errorMuat.value = err?.message || 'Gagal memuat daftar pasar dari Supabase.';
    daftarPasar.value = [];
  } finally {
    sedangMemuat.value = false;
  }
};

const petaJumlahKomoditas = computed(() => {
  const peta = new Map<string, number>();
  (props.daftarHargaTerbit || []).forEach((item) => {
    const k = String(item?.nama_pasar || '').toLowerCase().trim();
    if (k) peta.set(k, (peta.get(k) || 0) + 1);
  });
  return peta;
});

const daftarKecamatanUnik = computed(() => {
  const set = new Set<string>();
  daftarPasar.value.forEach((p) => {
    if (p.kecamatan) set.add(p.kecamatan);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
});

const daftarPasarTampil = computed(() => {
  const q = pencarian.value.trim().toLowerCase();
  const kec = kecamatanFilter.value.toLowerCase();

  const list = daftarPasar.value
    .map((p) => {
      const jarakKm =
        posisiUser.value && p.punyaKoordinat
          ? geocodingMobileService.hitungJarakKm(posisiUser.value.lat, posisiUser.value.lng, p.latitude, p.longitude)
          : null;
      const jumlahKomoditas = petaJumlahKomoditas.value.get(p.nama_pasar.toLowerCase().trim()) || 0;
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

  if (posisiUser.value) {
    list.sort((a, b) => {
      if (a.jarakKm !== null && b.jarakKm !== null && a.jarakKm !== b.jarakKm) return a.jarakKm - b.jarakKm;
      if (a.jarakKm !== null) return -1;
      if (b.jarakKm !== null) return 1;
      return a.nama_pasar.localeCompare(b.nama_pasar, 'id-ID');
    });
  }

  return list;
});

const pasarBertitikPeta = computed(() => daftarPasarTampil.value.filter((p) => p.punyaKoordinat));
const totalBertitikSemua = computed(() => daftarPasar.value.filter((p) => p.punyaKoordinat).length);

const renderPetaPasar = () => {
  nextTick(() => {
    const el = document.getElementById('petaDaftarPasarMobile');
    if (!el) return;

    if (mapPasar) {
      try { mapPasar.remove(); } catch { /* abaikan */ }
      mapPasar = null;
    }
    if ((el as any)._leaflet_id) {
      delete (el as any)._leaflet_id;
    }

    try {
      const pusat = pasarBertitikPeta.value.length > 0
        ? [pasarBertitikPeta.value[0].latitude!, pasarBertitikPeta.value[0].longitude!] as [number, number]
        : [geocodingMobileService.pusatManado.lat, geocodingMobileService.pusatManado.lng] as [number, number];

      mapPasar = L.map(el, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false
      }).setView(pusat, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapPasar);

      pasarBertitikPeta.value.forEach((pasar) => {
        const keyId = pasar.id || pasar.nama_pasar;
        const aktif = pasarTerpilihId.value === keyId;
        const bg = aktif ? '#15803d' : '#8b1e1e';
        const label = pasar.nama_pasar.replace(/^Pasar\s+/i, '').slice(0, 18);

        const icon = L.divIcon({
          className: 'm-dp-pin',
          html: `<div style="background:${bg};color:#ffffff;border-radius:18px;padding:4px 9px;font-size:11px;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;white-space:nowrap;">🏪 ${label}</div>`,
          iconSize: [140, 28],
          iconAnchor: [70, 14]
        });

        const marker = L.marker([pasar.latitude!, pasar.longitude!], { icon }).addTo(mapPasar!);
        marker.bindPopup(
          `<b>🏪 ${pasar.nama_pasar}</b>` +
          (pasar.kecamatan ? `<br>Kec. ${pasar.kecamatan}` : '') +
          `<br>${pasar.alamat || 'Alamat belum diatur Admin'}`
        );
        marker.on('click', () => {
          pasarTerpilihId.value = keyId;
        });
      });

      setTimeout(() => mapPasar?.invalidateSize(), 260);
      setTimeout(() => mapPasar?.invalidateSize(), 650);
    } catch (err) {
      console.warn('Gagal memuat peta Daftar Pasar Mobile:', err);
    }
  });
};

const pilihPasar = (pasar: ItemMasterPasar) => {
  pasarTerpilihId.value = pasar.id || pasar.nama_pasar;
  if (pasar.punyaKoordinat && mapPasar) {
    try {
      mapPasar.setView([pasar.latitude!, pasar.longitude!], 16, { animate: true });
    } catch { /* abaikan */ }
  }
};

const cariLokasiGPS = () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    alert('Perangkat Anda tidak mendukung layanan GPS.');
    return;
  }
  sedangCariGPS.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      posisiUser.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      sedangCariGPS.value = false;
    },
    (err) => {
      sedangCariGPS.value = false;
      alert('Gagal mendeteksi lokasi GPS: ' + (err.message || 'Pastikan izin lokasi aktif.'));
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

watch([pasarBertitikPeta, sedangMemuat], () => {
  if (!sedangMemuat.value && daftarPasar.value.length > 0) {
    renderPetaPasar();
  }
});

onMounted(async () => {
  await muatData();
  if (daftarPasar.value.length > 0) {
    renderPetaPasar();
  }
});

onUnmounted(() => {
  if (mapPasar) {
    try { mapPasar.remove(); } catch { /* abaikan */ }
    mapPasar = null;
  }
});

defineExpose({ muatData });
</script>

<style scoped>
.m-dp-wrap {
  padding: 0 12px 24px 12px;
}

.m-dp-hero {
  margin-bottom: 12px;
}

.m-dp-filter-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-dp-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
}

.m-dp-search-row input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 0.84rem;
  color: #0f172a;
}

.m-dp-clear {
  background: none;
  border: none;
  color: #94a3b8;
  font-weight: 700;
}

.m-dp-filter-row2 {
  display: flex;
  gap: 8px;
}

.m-dp-select {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  color: #1e293b;
}

.m-dp-gps-btn {
  padding: 8px 11px;
  border-radius: 8px;
  border: 1.5px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.m-dp-gps-btn.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
}

.m-dp-state-box {
  background: #ffffff;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  font-size: 0.84rem;
  color: #475569;
}

.m-dp-error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  color: #991b1b;
  font-size: 0.82rem;
}

.m-dp-error-box button {
  margin-top: 8px;
  background: #8b1e1e;
  color: #ffffff;
  border: none;
  padding: 7px 14px;
  border-radius: 8px;
  font-weight: 700;
}

.m-dp-map-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.m-dp-map-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.8rem;
  font-weight: 800;
  color: #0f172a;
}

.m-dp-map-tag {
  background: #fee2e2;
  color: #8b1e1e;
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 999px;
}

.m-dp-leaflet-box {
  width: 100%;
  height: 250px;
  position: relative;
  z-index: 1;
}

.m-dp-map-note {
  padding: 8px 11px;
  background: #fffbeb;
  border-top: 1px solid #fde68a;
  color: #92400e;
  font-size: 0.72rem;
  line-height: 1.4;
}

.m-dp-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-dp-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.m-dp-card.active {
  border-color: #16a34a;
  background: #f0fdf4;
}

.m-dp-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}

.m-dp-card-top h4 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
}

.m-dp-pills {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.m-dp-kec-pill {
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.m-dp-dist-pill {
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.m-dp-addr {
  margin: 6px 0 5px 0;
  font-size: 0.78rem;
  color: #475569;
  line-height: 1.4;
}

.m-dp-coord-row {
  margin-bottom: 9px;
  font-size: 0.7rem;
}

.m-dp-coord-ok {
  background: #dcfce7;
  color: #166534;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
}

.m-dp-coord-warn {
  background: #fef3c7;
  color: #92400e;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
}

.m-dp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.m-dp-btn-gmaps,
.m-dp-btn-harga {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 6px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
}

.m-dp-btn-gmaps {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1.5px solid #bfdbfe;
}

.m-dp-btn-harga {
  background: #8b1e1e;
  color: #ffffff;
  border: 1.5px solid #8b1e1e;
}
</style>
