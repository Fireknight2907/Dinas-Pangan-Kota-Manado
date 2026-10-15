<template>
  <!-- ===================================================================================
       KOMPONEN GENERATOR BARCODE SVG (MOBILE RESPONSIVE)
       Modul: Barcode Generator Mandiri Berbasis SVG Tajam (Capacitor & Web Ready)
       =================================================================================== -->
  <div class="mobile-barcode-wrapper">
    <svg 
      class="barcode-svg" 
      :viewBox="`0 0 ${svgWidth} ${height}`" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <g fill="#111111">
        <rect
          v-for="(bar, idx) in barsList"
          :key="idx"
          :x="bar.x"
          :y="bar.y"
          :width="bar.w"
          :height="bar.h"
        />
      </g>
    </svg>
    <div class="barcode-string-label">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: string;
    height?: number;
  }>(),
  {
    height: 70
  }
);

// Algoritma deterministik pembuatan pola barcode visual yang tajam & terbaca
const barsList = computed(() => {
  const text = props.value || 'GPM-MND-001';
  const bars: { x: number; y: number; w: number; h: number }[] = [];
  let currentX = 15;
  const barHeight = props.height - 15;

  // Pola pembuka (start code)
  bars.push({ x: currentX, y: 5, w: 3, h: barHeight }); currentX += 5;
  bars.push({ x: currentX, y: 5, w: 2, h: barHeight }); currentX += 4;
  bars.push({ x: currentX, y: 5, w: 1, h: barHeight }); currentX += 3;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Pola 3 bar per karakter
    const w1 = (charCode % 3) + 1;
    const s1 = ((charCode >> 1) % 2) + 2;
    const w2 = ((charCode >> 2) % 3) + 1;
    const s2 = ((charCode >> 3) % 2) + 2;
    const w3 = ((charCode >> 4) % 2) + 1;
    const s3 = 2;

    bars.push({ x: currentX, y: 5, w: w1, h: barHeight });
    currentX += w1 + s1;
    bars.push({ x: currentX, y: 5, w: w2, h: barHeight });
    currentX += w2 + s2;
    bars.push({ x: currentX, y: 5, w: w3, h: barHeight });
    currentX += w3 + s3;
  }

  // Pola penutup (stop code)
  bars.push({ x: currentX, y: 5, w: 3, h: barHeight }); currentX += 5;
  bars.push({ x: currentX, y: 5, w: 1, h: barHeight }); currentX += 3;
  bars.push({ x: currentX, y: 5, w: 4, h: barHeight }); currentX += 15;

  return bars;
});

const svgWidth = computed(() => {
  if (barsList.value.length === 0) return 200;
  const lastBar = barsList.value[barsList.value.length - 1];
  return lastBar.x + lastBar.w + 15;
});
</script>

<style scoped>
.mobile-barcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #dee2e6;
}

.barcode-svg {
  width: 100%;
  max-width: 280px;
  height: auto;
}

.barcode-string-label {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: #222222;
  margin-top: 6px;
}
</style>
