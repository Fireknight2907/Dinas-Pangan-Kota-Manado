<template>
  <!-- ===================================================================================
       Modul Panel Admin Kelola Master Pasar & Titik Lokasi Peta Interaktif (Mobile)
       Fungsi: Memungkinkan Admin & Superadmin menambah, mengedit, dan menghapus pasar
               resmi di tabel master_pasar lengkap dengan peta Leaflet (klik peta /
               geser pin -> auto-isi alamat & kecamatan, cari nama tempat 2 arah di
               peta, GPS perangkat, serta input manual).
       =================================================================================== -->
  <div class="staff-form-panel m-amp-panel">
    <div class="panel-title-row" style="justify-content: space-between; flex-wrap: wrap; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="plus-icon-red">🏪</span>
        <h3 style="margin: 0;">Master Pasar &amp; Titik Peta ({{ daftarPasarLengkap.length }})</h3>
      </div>
      <span class="m-amp-badge-ok">📍 {{ jumlahBertitik }} Bertitik</span>
    </div>
    <p class="m-amp-desc">
      Ketuk titik di peta (atau cari nama pasar) agar alamat &amp; kecamatan terisi otomatis. Begitu disimpan, pasar langsung tampil di menu publik <strong>Daftar Pasar</strong>.
    </p>

    <div class="m-amp-mode-row">
      <strong>{{ modeEditPasar ? `✏️ Edit: ${modeEditPasar.nama_pasar}` : '➕ Tambah Pasar Baru' }}</strong>
      <button v-if="modeEditPasar" type="button" class="m-amp-btn-cancel" @click="resetForm">
        Batal Edit
      </button>
    </div>

    <div v-if="pesanError" class="m-amp-error">⚠️ {{ pesanError }}</div>

    <!-- Pencarian Lokasi 2 Arah di Peta -->
    <div class="m-amp-search-row">
      <input
        type="text"
        v-model="kataCariPeta"
        placeholder="Cari lokasi pasar di Manado (mis: Pasar Bahu)..."
        @keyup.enter="cariDiPeta"
      />
      <button type="button" :disabled="sedangCariPeta" @click="cariDiPeta">
        {{ sedangCariPeta ? '...' : '🔍 Cari' }}
      </button>
    </div>

    <div v-if="hasilCariPeta.length > 0" class="m-amp-results">
      <button
        v-for="item in hasilCariPeta"
        :key="item.id"
        type="button"
        class="m-amp-result-item"
        @click="terapkanHasilCari(item)"
      >
        <strong>📍 {{ item.nama }}</strong>
        <span>{{ item.alamat || item.displayName }}</span>
      </button>
    </div>

    <div v-if="infoGeocode" class="m-amp-info">{{ infoGeocode }}</div>

    <!-- Peta Leaflet Interaktif Admin -->
    <div id="petaAdminPasarMobile" class="m-amp-leaflet"></div>
    <p class="m-amp-map-hint">💡 Ketuk peta (atau seret pin) untuk menentukan titik &amp; isi alamat otomatis.</p>

    <!-- Formulir Data Pasar -->
    <form @submit.prevent="simpanPasar" class="m-amp-form">
      <div class="s-field">
        <label>Nama Pasar Resmi *</label>
        <input type="text" required v-model="form.nama_pasar" placeholder="Contoh: Pasar Bersehati Karombasan" />
      </div>

      <div class="s-field">
        <label>Kecamatan di Manado</label>
        <select v-model="form.kecamatan" class="s-select-market">
          <option value="">-- Otomatis dari Peta / Pilih Kecamatan --</option>
          <option v-for="kec in daftarKecamatan" :key="kec" :value="kec">Kecamatan {{ kec }}</option>
        </select>
      </div>

      <div class="s-field">
        <label>Alamat Lokasi {{ sedangAutoAlamat ? '(⏳ Mengisi otomatis...)' : '' }}</label>
        <textarea
          rows="2"
          v-model="form.alamat"
          class="m-amp-textarea"
          placeholder="Ketuk peta untuk isi otomatis, atau ketik alamat manual..."
        ></textarea>
      </div>

      <div class="s-row-two">
        <div class="s-field">
          <label>Latitude</label>
          <input type="number" step="0.000001" v-model="form.latitude" placeholder="1.482200" />
        </div>
        <div class="s-field">
          <label>Longitude</label>
          <input type="number" step="0.000001" v-model="form.longitude" placeholder="124.848900" />
        </div>
      </div>

      <div class="m-amp-tools-row">
        <button type="button" class="m-amp-tool" @click="gunakanGps">📡 Pakai GPS Saya</button>
        <button
          v-if="form.latitude || form.longitude"
          type="button"
          class="m-amp-tool danger"
          @click="kosongkanTitik"
        >
          ✖ Kosongkan Titik
        </button>
      </div>

      <button type="submit" class="btn-publish-action" :disabled="sedangSimpan">
        {{ sedangSimpan ? 'Menyimpan...' : (modeEditPasar ? '💾 Simpan Perubahan Pasar' : '💾 Simpan Pasar ke Peta Publik') }}
      </button>
    </form>

    <!-- Daftar Pasar Terdaftar -->
    <div class="m-amp-list-wrap">
      <h4>Daftar Pasar Terdaftar ({{ daftarPasarLengkap.length }})</h4>
      <div v-if="daftarPasarLengkap.length === 0" class="m-amp-empty">
        Belum ada pasar tersimpan di tabel master_pasar.
      </div>
      <div v-else class="m-amp-cards">
        <div
          v-for="p in daftarPasarLengkap"
          :key="p.id || p.nama_pasar"
          :class="['m-amp-card', modeEditPasar && (modeEditPasar.id === p.id || modeEditPasar.nama_pasar === p.nama_pasar) ? 'editing' : '']"
        >
          <div class="m-amp-card-head">
            <strong>🏪 {{ p.nama_pasar }}</strong>
            <span v-if="p.punyaKoordinat" class="m-amp-pin-ok">📍 Bertitik</span>
            <span v-else class="m-amp-pin-warn">⚠️ Belum Ada Titik</span>
          </div>
          <div class="m-amp-card-sub">
            <span v-if="p.kecamatan">Kec. {{ p.kecamatan }} · </span>
            {{ p.alamat || 'Alamat belum diatur — ketuk Edit untuk atur di peta.' }}
          </div>
          <div class="m-amp-card-btns">
            <button type="button" class="m-amp-edit-btn" @click="mulaiEdit(p)">
              ✏️ {{ p.punyaKoordinat ? 'Edit' : 'Atur Peta' }}
            </button>
            <button type="button" class="m-amp-del-btn" @click="hapusPasarItem(p)">
              🗑️ Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ===================================================================================
// LOGIKA PANEL ADMIN MASTER PASAR & PETA LEAFLET (MOBILE - VUE 3 + OOP)
// ===================================================================================
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import { masterDataMobileService, type ItemMasterPasar } from '../services/MasterDataService';
import { geocodingMobileService, type KandidatLokasiPeta } from '../services/GeocodingService';

const props = defineProps<{
  daftarPasarLengkap: ItemMasterPasar[];
  daftarKecamatan: string[];
}>();

const emit = defineEmits<{
  (e: 'data-berubah', daftarBaru: ItemMasterPasar[]): void;
  (e: 'pesan-sukses', pesan: string): void;
}>();

const modeEditPasar = ref<ItemMasterPasar | null>(null);
const form = ref({
  nama_pasar: '',
  kecamatan: '',
  alamat: '',
  latitude: '',
  longitude: ''
});

const sedangSimpan = ref(false);
const pesanError = ref('');
const sedangAutoAlamat = ref(false);
const infoGeocode = ref('');
const kataCariPeta = ref('');
const sedangCariPeta = ref(false);
const hasilCariPeta = ref<KandidatLokasiPeta[]>([]);

let mapAdmin: L.Map | null = null;
let markerAktif: L.Marker | null = null;
let markerLain: L.Marker[] = [];

const jumlahBertitik = computed(() => (props.daftarPasarLengkap || []).filter((p) => p.punyaKoordinat).length);

const pasangPinAktif = (lat: number, lng: number, panKeTitik = false) => {
  if (!mapAdmin) return;
  if (markerAktif) {
    try { mapAdmin.removeLayer(markerAktif); } catch { /* abaikan */ }
    markerAktif = null;
  }
  const icon = L.divIcon({
    className: 'm-amp-pin-active',
    html: '<div style="background:#dc2626;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35);">📍</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  markerAktif = L.marker([lat, lng], { icon, draggable: true }).addTo(mapAdmin);
  markerAktif.on('dragend', () => {
    const pos = markerAktif?.getLatLng();
    if (pos) pilihTitikDiPeta(pos.lat, pos.lng);
  });

  if (panKeTitik) {
    try { mapAdmin.setView([lat, lng], 16, { animate: true }); } catch { /* abaikan */ }
  }
};

const renderPinPasarLain = () => {
  if (!mapAdmin) return;
  markerLain.forEach((m) => {
    try { mapAdmin?.removeLayer(m); } catch { /* abaikan */ }
  });
  markerLain = [];

  (props.daftarPasarLengkap || []).forEach((p) => {
    if (!p.punyaKoordinat) return;
    if (modeEditPasar.value && (modeEditPasar.value.id === p.id || modeEditPasar.value.nama_pasar === p.nama_pasar)) {
      return;
    }
    const icon = L.divIcon({
      className: 'm-amp-pin-other',
      html: `<div style="background:#1d4ed8;color:#fff;border-radius:14px;padding:2px 7px;font-size:10px;font-weight:700;border:1.5px solid #fff;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">🏪 ${p.nama_pasar.replace(/^Pasar\s+/i, '').slice(0, 14)}</div>`,
      iconSize: [110, 22],
      iconAnchor: [55, 11]
    });
    const m = L.marker([p.latitude!, p.longitude!], { icon }).addTo(mapAdmin!);
    m.bindPopup(`<b>${p.nama_pasar}</b><br>${p.alamat || ''}`);
    markerLain.push(m);
  });
};

const inisialisasiPetaAdmin = () => {
  nextTick(() => {
    const el = document.getElementById('petaAdminPasarMobile');
    if (!el) return;

    if (mapAdmin) {
      try { mapAdmin.remove(); } catch { /* abaikan */ }
      mapAdmin = null;
      markerAktif = null;
      markerLain = [];
    }
    if ((el as any)._leaflet_id) {
      delete (el as any)._leaflet_id;
    }

    try {
      mapAdmin = L.map(el, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false
      }).setView([geocodingMobileService.pusatManado.lat, geocodingMobileService.pusatManado.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapAdmin);

      mapAdmin.on('click', (e: L.LeafletMouseEvent) => {
        pilihTitikDiPeta(e.latlng.lat, e.latlng.lng);
      });

      renderPinPasarLain();

      if (geocodingMobileService.punyaKoordinatValid(form.value.latitude, form.value.longitude)) {
        pasangPinAktif(Number(form.value.latitude), Number(form.value.longitude), true);
      }

      setTimeout(() => mapAdmin?.invalidateSize(), 260);
      setTimeout(() => mapAdmin?.invalidateSize(), 650);
    } catch (err) {
      console.warn('Gagal memuat peta Admin Master Pasar Mobile:', err);
    }
  });
};

const pilihTitikDiPeta = async (lat: number, lng: number) => {
  form.value.latitude = Number(lat).toFixed(6);
  form.value.longitude = Number(lng).toFixed(6);
  pasangPinAktif(lat, lng, false);
  hasilCariPeta.value = [];

  sedangAutoAlamat.value = true;
  infoGeocode.value = '⏳ Mengambil alamat otomatis dari peta...';
  const res = await geocodingMobileService.reverseGeocode(lat, lng, props.daftarKecamatan);
  sedangAutoAlamat.value = false;

  if (res.sukses) {
    if (res.alamat) form.value.alamat = res.alamat;
    if (res.kecamatan) form.value.kecamatan = res.kecamatan;
    infoGeocode.value = '✅ Alamat otomatis terisi (tetap bisa diedit manual).';
  } else {
    infoGeocode.value = `ℹ️ ${res.pesan || 'Silakan ketik alamat secara manual.'}`;
  }
};

const cariDiPeta = async () => {
  const q = kataCariPeta.value.trim() || form.value.nama_pasar.trim();
  if (q.length < 2) {
    infoGeocode.value = 'Ketik minimal 2 huruf nama pasar atau jalan di Manado.';
    return;
  }
  sedangCariPeta.value = true;
  infoGeocode.value = '🔍 Mencari lokasi di Kota Manado...';
  const kandidat = await geocodingMobileService.cariLokasiDiManado(q, props.daftarKecamatan);
  sedangCariPeta.value = false;
  hasilCariPeta.value = kandidat;
  infoGeocode.value = kandidat.length > 0
    ? `Ditemukan ${kandidat.length} lokasi — ketuk salah satu untuk pasang pin.`
    : 'Tidak ditemukan — silakan ketuk langsung titik pasar pada peta.';
};

const terapkanHasilCari = (item: KandidatLokasiPeta) => {
  form.value.alamat = item.alamat || form.value.alamat;
  form.value.kecamatan = item.kecamatan || form.value.kecamatan;
  form.value.latitude = Number(item.latitude).toFixed(6);
  form.value.longitude = Number(item.longitude).toFixed(6);
  hasilCariPeta.value = [];
  pasangPinAktif(item.latitude, item.longitude, true);
  infoGeocode.value = `✅ Titik dipindahkan ke "${item.nama}" & alamat terisi otomatis.`;
};

const gunakanGps = () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    alert('Perangkat tidak mendukung GPS.');
    return;
  }
  infoGeocode.value = '📡 Mengambil lokasi GPS perangkat...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pasangPinAktif(pos.coords.latitude, pos.coords.longitude, true);
      pilihTitikDiPeta(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      infoGeocode.value = 'Gagal GPS: ' + (err.message || 'Pastikan izin lokasi aktif.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

const kosongkanTitik = () => {
  form.value.latitude = '';
  form.value.longitude = '';
  if (markerAktif && mapAdmin) {
    try { mapAdmin.removeLayer(markerAktif); } catch { /* abaikan */ }
    markerAktif = null;
  }
};

const resetForm = () => {
  modeEditPasar.value = null;
  form.value = { nama_pasar: '', kecamatan: '', alamat: '', latitude: '', longitude: '' };
  pesanError.value = '';
  infoGeocode.value = '';
  kataCariPeta.value = '';
  hasilCariPeta.value = [];
  kosongkanTitik();
  renderPinPasarLain();
};

const mulaiEdit = (pasar: ItemMasterPasar) => {
  modeEditPasar.value = pasar;
  form.value = {
    nama_pasar: pasar.nama_pasar || '',
    kecamatan: pasar.kecamatan || '',
    alamat: pasar.alamat || '',
    latitude: pasar.punyaKoordinat ? String(pasar.latitude) : '',
    longitude: pasar.punyaKoordinat ? String(pasar.longitude) : ''
  };
  pesanError.value = '';
  hasilCariPeta.value = [];
  kataCariPeta.value = pasar.nama_pasar || '';
  renderPinPasarLain();
  if (pasar.punyaKoordinat) {
    pasangPinAktif(pasar.latitude!, pasar.longitude!, true);
    infoGeocode.value = `✏️ Edit "${pasar.nama_pasar}". Ketuk peta atau seret pin untuk ubah lokasi.`;
  } else {
    kosongkanTitik();
    infoGeocode.value = `✏️ Edit "${pasar.nama_pasar}". Ketuk peta atau Cari Lokasi untuk memasang titik pasar.`;
  }
};

const simpanPasar = async () => {
  pesanError.value = '';
  const nama = form.value.nama_pasar.trim();
  if (!nama) {
    pesanError.value = 'Nama pasar wajib diisi.';
    return;
  }
  const adaLat = String(form.value.latitude).trim() !== '';
  const adaLng = String(form.value.longitude).trim() !== '';
  if (adaLat !== adaLng) {
    pesanError.value = 'Latitude dan Longitude harus diisi berpasangan.';
    return;
  }
  if (adaLat && adaLng && !geocodingMobileService.punyaKoordinatValid(form.value.latitude, form.value.longitude)) {
    pesanError.value = 'Koordinat Latitude / Longitude tidak valid.';
    return;
  }

  sedangSimpan.value = true;
  try {
    const payload = {
      nama_pasar: nama,
      kecamatan: form.value.kecamatan.trim(),
      alamat: form.value.alamat.trim(),
      latitude: adaLat ? Number(form.value.latitude) : null,
      longitude: adaLng ? Number(form.value.longitude) : null
    };

    let terbaru: ItemMasterPasar[];
    if (modeEditPasar.value) {
      terbaru = await masterDataMobileService.perbaruiPasar(
        modeEditPasar.value.id || modeEditPasar.value.nama_pasar,
        payload,
        modeEditPasar.value.nama_pasar
      );
      emit('pesan-sukses', `✅ Pasar "${nama}" beserta titik lokasinya diperbarui.`);
    } else {
      terbaru = await masterDataMobileService.tambahPasar(payload);
      emit('pesan-sukses', `✅ Pasar "${nama}" berhasil disimpan ke peta publik.`);
    }
    emit('data-berubah', terbaru);
    resetForm();
  } catch (err: any) {
    pesanError.value = err?.message || 'Gagal menyimpan pasar ke Supabase.';
  } finally {
    sedangSimpan.value = false;
  }
};

const hapusPasarItem = async (pasar: ItemMasterPasar) => {
  if (!confirm(`Hapus pasar "${pasar.nama_pasar}" dari Master Pasar & peta publik?`)) return;
  try {
    const terbaru = await masterDataMobileService.hapusPasar(pasar.id || pasar.nama_pasar);
    if (modeEditPasar.value && (modeEditPasar.value.id === pasar.id || modeEditPasar.value.nama_pasar === pasar.nama_pasar)) {
      resetForm();
    }
    emit('data-berubah', terbaru);
    emit('pesan-sukses', `🗑️ Pasar "${pasar.nama_pasar}" dihapus.`);
  } catch (err: any) {
    alert(err?.message || 'Gagal menghapus pasar.');
  }
};

watch(() => props.daftarPasarLengkap, () => {
  renderPinPasarLain();
}, { deep: true });

onMounted(() => {
  setTimeout(inisialisasiPetaAdmin, 180);
});

onUnmounted(() => {
  if (mapAdmin) {
    try { mapAdmin.remove(); } catch { /* abaikan */ }
    mapAdmin = null;
  }
});
</script>

<style scoped>
.m-amp-panel { margin-top: 16px; }
.m-amp-badge-ok { background: #dcfce7; color: #166534; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
.m-amp-desc { font-size: 0.74rem; color: #64748b; margin: 4px 0 10px 0; line-height: 1.4; }
.m-amp-mode-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.8rem; margin-bottom: 10px; }
.m-amp-btn-cancel { background: #fee2e2; color: #b91c1c; border: none; padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; }
.m-amp-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 8px 10px; border-radius: 8px; font-size: 0.76rem; margin-bottom: 10px; }
.m-amp-search-row { display: flex; gap: 6px; margin-bottom: 8px; }
.m-amp-search-row input { flex: 1; min-width: 0; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 0.8rem; }
.m-amp-search-row button { background: #1d4ed8; color: #fff; border: none; border-radius: 8px; padding: 0 12px; font-size: 0.76rem; font-weight: 700; white-space: nowrap; }
.m-amp-results { display: flex; flex-direction: column; gap: 5px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 7px; margin-bottom: 8px; max-height: 150px; overflow-y: auto; }
.m-amp-result-item { text-align: left; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
.m-amp-result-item strong { font-size: 0.76rem; color: #0f172a; }
.m-amp-result-item span { font-size: 0.68rem; color: #64748b; }
.m-amp-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 6px 9px; border-radius: 7px; font-size: 0.72rem; margin-bottom: 8px; }
.m-amp-leaflet { width: 100%; height: 220px; border-radius: 10px; overflow: hidden; border: 1.5px solid #cbd5e1; position: relative; z-index: 1; }
.m-amp-map-hint { font-size: 0.7rem; color: #64748b; margin: 5px 0 10px 0; }
.m-amp-form { display: flex; flex-direction: column; gap: 9px; }
.m-amp-textarea { width: 100%; border: 1.5px solid #d1d5db; border-radius: 8px; padding: 8px 10px; font-size: 0.82rem; font-family: inherit; }
.m-amp-tools-row { display: flex; gap: 8px; flex-wrap: wrap; }
.m-amp-tool { flex: 1; padding: 7px 10px; border-radius: 7px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 0.74rem; font-weight: 700; }
.m-amp-tool.danger { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.m-amp-list-wrap { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.m-amp-list-wrap h4 { margin: 0 0 8px 0; font-size: 0.84rem; color: #1e293b; }
.m-amp-empty { text-align: center; padding: 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 0.78rem; color: #64748b; }
.m-amp-cards { display: flex; flex-direction: column; gap: 8px; }
.m-amp-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 10px; }
.m-amp-card.editing { background: #fef2f2; border-color: #8b1e1e; }
.m-amp-card-head { display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 0.82rem; color: #0f172a; }
.m-amp-pin-ok { background: #dcfce7; color: #166534; font-size: 0.66rem; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
.m-amp-pin-warn { background: #fef3c7; color: #92400e; font-size: 0.66rem; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
.m-amp-card-sub { font-size: 0.72rem; color: #475569; margin: 4px 0 8px 0; line-height: 1.35; }
.m-amp-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.m-amp-edit-btn { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px; font-size: 0.74rem; font-weight: 700; }
.m-amp-del-btn { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; padding: 6px; font-size: 0.74rem; font-weight: 700; }
</style>
