<!-- ===================================================================================
     KOMPONEN ANIMASI SPLASH SCREEN RESMI PEMBUKA APLIKASI (MOBILE & ANDROID APK)
     Instansi: Dinas Pangan Pemerintah Kota Manado — SIPATOKAAN Manado
     Fungsi: Menampilkan animasi pembuka resmi beridentitas Logo Pemerintah Kota Manado
             saat aplikasi pertama kali dibuka, lalu memudar halus ke beranda aplikasi.
     =================================================================================== -->
<template>
  <div
    v-if="statusFase !== 'selesai'"
    :class="['m-splash-overlay', statusFase === 'keluar' ? 'is-fading-out' : '']"
    role="status"
    aria-label="Memuat SIPATOKAAN Manado"
    @click="tutupCepat"
  >
    <div class="m-splash-orb orb-top"></div>
    <div class="m-splash-orb orb-bottom"></div>

    <div class="m-splash-card">
      <div class="m-splash-logo-stage">
        <div class="m-splash-ring ring-outer"></div>
        <div class="m-splash-ring ring-inner"></div>
        <div class="m-splash-emblem">
          <img
            src="/logodinaspangan.png"
            alt="Logo Pemerintah Kota Manado"
            class="m-splash-logo"
          />
        </div>
      </div>

      <span class="m-splash-pill">PEMERINTAH KOTA MANADO</span>
      <h1 class="m-splash-title">SIPATOKAAN Manado</h1>
      <p class="m-splash-sub">
        Sistem Informasi Pangan · Dinas Pangan Kota Manado
      </p>

      <div class="m-splash-progress-track">
        <div class="m-splash-progress-fill"></div>
      </div>
      <span class="m-splash-caption">Menyiapkan data pangan resmi terkini...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{ durasiMs?: number }>(), {
  durasiMs: 1700
});

const statusFase = ref<'tampil' | 'keluar' | 'selesai'>('tampil');
let timerKeluar: ReturnType<typeof setTimeout> | null = null;
let timerSelesai: ReturnType<typeof setTimeout> | null = null;

const tutupCepat = () => {
  if (statusFase.value !== 'tampil') return;
  statusFase.value = 'keluar';
  if (timerSelesai) clearTimeout(timerSelesai);
  timerSelesai = setTimeout(() => {
    statusFase.value = 'selesai';
  }, 420);
};

onMounted(() => {
  const dur = Math.max(900, props.durasiMs);
  timerKeluar = setTimeout(() => {
    statusFase.value = 'keluar';
  }, dur);
  timerSelesai = setTimeout(() => {
    statusFase.value = 'selesai';
  }, dur + 450);
});

onBeforeUnmount(() => {
  if (timerKeluar) clearTimeout(timerKeluar);
  if (timerSelesai) clearTimeout(timerSelesai);
});
</script>

<style scoped>
.m-splash-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  padding-top: max(24px, env(safe-area-inset-top));
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  background: radial-gradient(circle at 50% 24%, #8b1e1e 0%, #5a0f0f 56%, #2f0707 100%);
  color: #ffffff;
  overflow: hidden;
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.42s ease, transform 0.42s ease;
}

.m-splash-overlay.is-fading-out {
  opacity: 0;
  transform: scale(1.03);
  pointer-events: none;
}

.m-splash-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  pointer-events: none;
  opacity: 0.28;
}

.m-splash-orb.orb-top {
  width: 260px;
  height: 260px;
  top: -90px;
  right: -70px;
  background: #f59e0b;
}

.m-splash-orb.orb-bottom {
  width: 260px;
  height: 260px;
  bottom: -100px;
  left: -70px;
  background: #ef4444;
}

.m-splash-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 340px;
}

.m-splash-logo-stage {
  position: relative;
  width: 132px;
  height: 132px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.m-splash-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(254, 243, 199, 0.36);
}

.m-splash-ring.ring-outer {
  inset: 0;
  animation: mSplashPulse 1.8s ease-out infinite;
}

.m-splash-ring.ring-inner {
  inset: 10px;
  border-color: rgba(255, 255, 255, 0.26);
  animation: mSplashPulse 1.8s ease-out 0.45s infinite;
}

.m-splash-emblem {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34), 0 0 0 5px rgba(255, 255, 255, 0.16);
  animation: mSplashPop 0.7s cubic-bezier(0.22, 1, 0.36, 1) both, mSplashFloat 2.4s ease-in-out 0.7s infinite;
}

.m-splash-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.m-splash-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 1.3px;
  color: #fde68a;
  margin-bottom: 10px;
  animation: mSplashSlideUp 0.5s ease 0.15s both;
}

.m-splash-title {
  margin: 0 0 6px 0;
  font-size: 1.65rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
  text-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  animation: mSplashSlideUp 0.5s ease 0.24s both;
}

.m-splash-sub {
  margin: 0 0 22px 0;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.45;
  animation: mSplashSlideUp 0.5s ease 0.32s both;
}

.m-splash-progress-track {
  width: 200px;
  max-width: 78%;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
  margin-bottom: 10px;
  animation: mSplashSlideUp 0.45s ease 0.36s both;
}

.m-splash-progress-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(90deg, #fde68a 0%, #ffffff 55%, #f59e0b 100%);
  animation: mSplashProgress 1.6s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}

.m-splash-caption {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  animation: mSplashSlideUp 0.45s ease 0.42s both;
}

@keyframes mSplashPop {
  0% { opacity: 0; transform: scale(0.65) translateY(14px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes mSplashFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes mSplashPulse {
  0% { transform: scale(0.82); opacity: 0.75; }
  100% { transform: scale(1.26); opacity: 0; }
}

@keyframes mSplashSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes mSplashProgress {
  0% { width: 0%; }
  45% { width: 58%; }
  100% { width: 100%; }
}
</style>
