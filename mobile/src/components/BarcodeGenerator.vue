<template>
  <!-- ===================================================================================
       KOMPONEN GENERATOR QR CODE RESMI GPM (MOBILE)
       Pustaka: qrcode (Canvas / DataURL tajam & kompatibel di semua browser/Capacitor)
       =================================================================================== -->
  <div class="mobile-qrcode-wrapper">
    <div v-if="qrUrl" class="qrcode-box">
      <img :src="qrUrl" :alt="value" class="qrcode-image" />
    </div>
    <div v-else class="qrcode-loading">
      Memuat QR Code...
    </div>
    <div class="qrcode-string-label">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = withDefaults(
  defineProps<{
    value: string;
    size?: number;
  }>(),
  {
    size: 160
  }
);

const qrUrl = ref('');

const buatQRCode = async () => {
  if (!props.value) return;
  try {
    qrUrl.value = await QRCode.toDataURL(props.value, {
      width: props.size,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#ffffff'
      }
    });
  } catch (e) {
    console.error('Gagal generate QR Code:', e);
  }
};

onMounted(() => {
  buatQRCode();
});

watch(() => props.value, () => {
  buatQRCode();
});
</script>

<style scoped>
.mobile-qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #dee2e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.qrcode-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-image {
  width: 160px;
  height: 160px;
  display: block;
  border-radius: 8px;
}

.qrcode-loading {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 0.9rem;
}

.qrcode-string-label {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: #222222;
  margin-top: 10px;
}
</style>
