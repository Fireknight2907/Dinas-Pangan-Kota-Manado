// ===================================================================================
// KONFIGURASI KONEKSI SERVER BACKEND & WEBSITE (MOBILE)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Berfungsi untuk sinkronisasi otomatis antara Aplikasi Mobile dan Website
// ===================================================================================

const KUNCI_STORAGE_SERVER = 'sipatokean_server_url';
export const DEFAULT_HOST_LAN = '192.168.0.201'; // IP Komputer Anda saat ini
export const DEFAULT_PORT = '3000';
export const VERCEL_HOST = 'https://dinas-pangan-kota-manado.vercel.app';

// Kredensial Resmi Supabase Dinas Pangan Kota Manado
export const SUPABASE_CONFIG = {
  url: 'https://mvwfjbebwidovnwacstm.supabase.co',
  anonKey: 'sb_publishable__BWMfOhP5y_g5LVrK8KWQg_BHu4__VT'
};

// Cek apakah aplikasi berjalan di platform native Capacitor (Android/iOS)
export const isCapacitorNative = (): boolean => {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.Capacitor && typeof win.Capacitor.isNativePlatform === 'function') {
      return win.Capacitor.isNativePlatform();
    }
  }
  return false;
};

// Bersihkan format URL masukan pengguna
export const normalisasiUrl = (input: string): string => {
  if (!input || !input.trim()) return `http://${DEFAULT_HOST_LAN}:${DEFAULT_PORT}`;
  let url = input.trim();
  // Hilangkan trailing slash
  url = url.replace(/\/+$/, '');
  // Jika pengguna tidak menyertakan protokol http:// atau https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url);
    const isLocal = url.startsWith('localhost') || url.startsWith('10.0.2.2');
    if (!isIp && !isLocal) {
      url = `https://${url}`;
    } else {
      url = `http://${url}`;
    }
  }
  // Hilangkan akhiran /api jika ada, agar konsisten menjadi base host
  if (url.endsWith('/api')) {
    url = url.substring(0, url.length - 4);
  }
  return url;
};

// Ambil URL Server aktif
export const getServerBaseUrl = (): string => {
  // 1. Prioritas utama: pengaturan yang disimpan pengguna di HP
  const tersimpan = localStorage.getItem(KUNCI_STORAGE_SERVER);
  if (tersimpan && tersimpan.trim()) {
    return normalisasiUrl(tersimpan);
  }

  // 2. Variabel environment build jika tersedia
  const envApi = (import.meta as any).env?.VITE_API_ROOT;
  if (envApi && typeof envApi === 'string' && envApi.trim()) {
    return normalisasiUrl(envApi);
  }

  // 3. Jika di Android native (HP fisik / APK)
  if (isCapacitorNative()) {
    return `http://${DEFAULT_HOST_LAN}:${DEFAULT_PORT}`;
  }

  // 4. Jika dijalankan di browser
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:${DEFAULT_PORT}`;
    }
  }

  // 5. Default fallback
  return `http://${DEFAULT_HOST_LAN}:${DEFAULT_PORT}`;
};

// Ambil API Root lengkap (/api)
export const getApiRoot = (): string => {
  return `${getServerBaseUrl()}/api`;
};

// Simpan URL Server baru dan beri tahu listener
type CallbackPerubahan = (baruApiRoot: string) => void;
const listeners: CallbackPerubahan[] = [];

export const onServerUrlChanged = (callback: CallbackPerubahan) => {
  listeners.push(callback);
};

export const setServerBaseUrl = (url: string) => {
  const normal = normalisasiUrl(url);
  localStorage.setItem(KUNCI_STORAGE_SERVER, normal);
  const baruApi = `${normal}/api`;
  listeners.forEach(cb => {
    try { cb(baruApi); } catch (e) { console.error(e); }
  });
};

// Uji koneksi langsung ke backend atau Supabase Cloud
export const ujiKoneksiBackend = async (targetUrl?: string): Promise<{ sukses: boolean; pesan: string; status?: number; latencyMs?: number }> => {
  const mulai = performance.now();

  // 1. Cek Supabase Cloud
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/harga_pangan?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - mulai);

    if (res.ok) {
      return {
        sukses: true,
        pesan: `Cloud Database Supabase Aktif (${latency}ms) - HP & Web Sinkron!`,
        status: res.status,
        latencyMs: latency
      };
    }
  } catch (e) {
    // Abaikan dan coba server lokal jika ada
  }

  // 2. Coba endpoint local/custom jika Supabase belum aktif
  const base = targetUrl ? normalisasiUrl(targetUrl) : getServerBaseUrl();
  const testEndpoint = `${base}/api/harga-pangan`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(testEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - mulai);

    if (res.ok) {
      return {
        sukses: true,
        pesan: `Terhubung ke server lokal! (${latency}ms)`,
        status: res.status,
        latencyMs: latency
      };
    } else {
      return {
        sukses: false,
        pesan: `Server merespon dengan status ${res.status}`,
        status: res.status,
        latencyMs: latency
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - mulai);
    return {
      sukses: false,
      pesan: 'Offline - Data tetap aman tersimpan di penyimpanan lokal HP.',
      latencyMs: latency
    };
  }
};

