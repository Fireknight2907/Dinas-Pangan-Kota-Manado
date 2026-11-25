// Modul Klien Supabase - Akses Basis Data Cloud SIPATOKAAN
// Dinas Pangan Kota Manado
// Mengelola integrasi langsung dengan basis data Cloud Supabase REST API

// [CEK-03 FIX] Key dibaca dari .env — tidak di-hardcode di source code
// File .env tidak masuk ke git (ada di .gitignore)
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://mvwfjbebwidovnwacstm.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__BWMfOhP5y_g5LVrK8KWQg_BHu4__VT'
};

class SupabaseRestClient {
  constructor() {
    this.baseUrl = `${SUPABASE_CONFIG.url}/rest/v1`;
    this.apikey = SUPABASE_CONFIG.anonKey;
  }

  getHeaders() {
    return {
      'apikey': this.apikey,
      'Authorization': `Bearer ${this.apikey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async request(endpoint, method = 'GET', body = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const options = {
      method,
      headers: this.getHeaders(),
      signal: controller.signal
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(body);
    }

    try {
      const url = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
      const res = await fetch(url, options);
      clearTimeout(timeout);

      if (!res.ok) {
        let errDetail = `Status ${res.status}`;
        try {
          const errJson = await res.json();
          errDetail = errJson.message || errJson.error || errDetail;
        } catch (_) { }
        throw new Error(`Supabase Error: ${errDetail}`);
      }

      if (res.status === 204) return [];
      const data = await res.json();
      return data;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // --- HARGA PANGAN ---
  async getHargaPangan() {
    return this.request('harga_pangan?order=diperbarui_pada.desc');
  }

  async tambahHargaPangan(item) {
    const payload = {
      nama_komoditas: item.nama_komoditas,
      kategori: item.kategori || 'Bahan Pokok',
      satuan: item.satuan || 'kg',
      harga: Number(item.harga) || 0,
      nama_pasar: item.nama_pasar,
      tanggal_penetapan: item.tanggal_penetapan || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      status: item.status || 'Terbit',
      catatan_perubahan: item.catatan_perubahan || '',
      bidang: item.bidang || 'Bidang Cadangan dan Distribusi Pangan'
    };
    if (item.prioritas_tampil !== undefined) payload.prioritas_tampil = Number(item.prioritas_tampil);
    const res = await this.request('harga_pangan', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updateHargaPangan(id, data) {
    const payload = {
      diperbarui_pada: new Date().toISOString()
    };
    if (data.nama_komoditas !== undefined) payload.nama_komoditas = data.nama_komoditas;
    if (data.kategori !== undefined) payload.kategori = data.kategori;
    if (data.satuan !== undefined) payload.satuan = data.satuan;
    if (data.harga !== undefined) payload.harga = Number(data.harga);
    if (data.nama_pasar !== undefined) payload.nama_pasar = data.nama_pasar;
    if (data.tanggal_penetapan !== undefined) payload.tanggal_penetapan = data.tanggal_penetapan;
    if (data.status !== undefined) payload.status = data.status;
    if (data.catatan_perubahan !== undefined) payload.catatan_perubahan = data.catatan_perubahan;
    if (data.prioritas_tampil !== undefined) payload.prioritas_tampil = Number(data.prioritas_tampil);

    const res = await this.request(`harga_pangan?id=eq.${encodeURIComponent(id)}`, 'PATCH', payload);
    if (Array.isArray(res)) {
      return res.length > 0 ? res[0] : null;
    }
    return res;
  }

  async hapusHargaPangan(id) {
    await this.request(`harga_pangan?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  // --- RIWAYAT HARGA PANGAN & METRIK PUBLIK (DATA RIIL DB) ---
  async getRiwayatHarga({ namaKomoditas = '', rentangHari = 30, batas = 500 } = {}) {
    const params = ['order=dicatat_pada.asc'];
    if (namaKomoditas && namaKomoditas.trim() !== '') {
      params.push(`nama_komoditas=ilike.${encodeURIComponent(namaKomoditas.trim())}`);
    }
    const hariAngka = Number(rentangHari);
    if (hariAngka > 0) {
      const batasTanggal = new Date();
      batasTanggal.setDate(batasTanggal.getDate() - hariAngka);
      params.push(`dicatat_pada=gte.${encodeURIComponent(batasTanggal.toISOString())}`);
    }
    if (batas > 0) {
      params.push(`limit=${Number(batas)}`);
    }
    return this.request(`riwayat_harga_pangan?${params.join('&')}`);
  }

  async getRiwayatHargaTerbaru(batas = 400) {
    return this.request(`riwayat_harga_pangan?order=dicatat_pada.desc&limit=${Number(batas)}`);
  }

  async tambahJumlahDilihat(namaKomoditas) {
    if (!namaKomoditas || !String(namaKomoditas).trim()) return false;
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/rpc_tambah_lihat_komoditas`, {
        method: 'POST',
        headers: {
          'apikey': this.apikey,
          'Authorization': `Bearer ${this.apikey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_nama_komoditas: String(namaKomoditas).trim() })
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  // --- MASTER DATA RESMI (SATUAN TERKUNCI PER 1, PASAR, KECAMATAN) ---
  async getMasterSatuan() {
    return this.request('master_satuan?order=dibuat_pada.asc');
  }

  async tambahMasterSatuan(namaSatuan) {
    const res = await this.request('master_satuan', 'POST', { nama_satuan: namaSatuan });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusMasterSatuan(namaSatuan) {
    await this.request(`master_satuan?nama_satuan=eq.${encodeURIComponent(namaSatuan)}`, 'DELETE');
    return true;
  }

  async getMasterPasar() {
    return this.request('master_pasar?order=nama_pasar.asc');
  }

  async tambahMasterPasar(dataPasar) {
    const payload = typeof dataPasar === 'string'
      ? { nama_pasar: dataPasar }
      : {
          nama_pasar: dataPasar.nama_pasar,
          alamat: dataPasar.alamat || '',
          kecamatan: dataPasar.kecamatan || '',
          latitude:
            dataPasar.latitude !== null && dataPasar.latitude !== undefined && dataPasar.latitude !== ''
              ? Number(dataPasar.latitude)
              : null,
          longitude:
            dataPasar.longitude !== null && dataPasar.longitude !== undefined && dataPasar.longitude !== ''
              ? Number(dataPasar.longitude)
              : null
        };
    const res = await this.request('master_pasar', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updateMasterPasar(idAtauNamaLama, dataPasar) {
    const payload = {
      nama_pasar: dataPasar.nama_pasar,
      alamat: dataPasar.alamat || '',
      kecamatan: dataPasar.kecamatan || '',
      latitude:
        dataPasar.latitude !== null && dataPasar.latitude !== undefined && dataPasar.latitude !== ''
          ? Number(dataPasar.latitude)
          : null,
      longitude:
        dataPasar.longitude !== null && dataPasar.longitude !== undefined && dataPasar.longitude !== ''
          ? Number(dataPasar.longitude)
          : null,
      diperbarui_pada: new Date().toISOString()
    };
    const adalahUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idAtauNamaLama || ''));
    const filter = adalahUuid
      ? `id=eq.${encodeURIComponent(idAtauNamaLama)}`
      : `nama_pasar=eq.${encodeURIComponent(idAtauNamaLama)}`;
    const res = await this.request(`master_pasar?${filter}`, 'PATCH', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async sinkronNamaPasarDiHarga(namaLama, namaBaru) {
    if (!namaLama || !namaBaru || namaLama === namaBaru) return true;
    try {
      await this.request(`harga_pangan?nama_pasar=eq.${encodeURIComponent(namaLama)}`, 'PATCH', {
        nama_pasar: namaBaru
      });
    } catch (_) {}
    return true;
  }

  async hapusMasterPasar(idAtauNama) {
    const adalahUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idAtauNama || ''));
    const filter = adalahUuid
      ? `id=eq.${encodeURIComponent(idAtauNama)}`
      : `nama_pasar=eq.${encodeURIComponent(idAtauNama)}`;
    await this.request(`master_pasar?${filter}`, 'DELETE');
    return true;
  }

  async getMasterKecamatan() {
    return this.request('master_kecamatan?order=nama_kecamatan.asc');
  }

  async tambahMasterKecamatan(namaKecamatan) {
    const res = await this.request('master_kecamatan', 'POST', { nama_kecamatan: namaKecamatan });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusMasterKecamatan(namaKecamatan) {
    await this.request(`master_kecamatan?nama_kecamatan=eq.${encodeURIComponent(namaKecamatan)}`, 'DELETE');
    return true;
  }

  // --- MASTER KOMODITAS RESMI (INDUK, VARIAN, SINONIM, SATUAN BAWAAN) ---
  async getMasterKomoditas() {
    return this.request('master_komoditas?order=prioritas_tampil.asc,kelompok_komoditas.asc,nama_komoditas.asc');
  }

  async tambahMasterKomoditas(item) {
    const payload = {
      kelompok_komoditas: item.kelompok_komoditas,
      nama_komoditas: item.nama_komoditas,
      kategori: item.kategori || 'Bahan Pokok',
      satuan_bawaan: item.satuan_bawaan || '1 KG',
      kata_kunci: item.kata_kunci || '',
      prioritas_tampil: Number(item.prioritas_tampil) || 50
    };
    const res = await this.request('master_komoditas', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusMasterKomoditas(namaKomoditas) {
    await this.request(`master_komoditas?nama_komoditas=eq.${encodeURIComponent(namaKomoditas)}`, 'DELETE');
    return true;
  }

  // --- ACARA GPM ---
  async getAcaraGPM() {
    return this.request('acara_gpm?order=tanggal.asc,jam_mulai.asc,dibuat_pada.asc');
  }

  // [GPM AUTO-CLOSE WITA] Panggil RPC server untuk otomatis menutup acara yang sudah lewat jadwal WITA
  async sinkronStatusGPMOtomatis() {
    try {
      const res = await this.request('rpc/rpc_sinkron_status_gpm_otomatis', 'POST', {});
      return res || null;
    } catch (_) {
      return null;
    }
  }

  // [UU PDP SAFE] Ringkasan jumlah pendaftar & hadir per acara (NOL data pribadi warga)
  async getRingkasanPendaftarGPM() {
    try {
      const rows = await this.request('rpc/rpc_ringkasan_pendaftar_gpm', 'POST', {});
      if (Array.isArray(rows)) return rows;
    } catch (_) {}

    // Fallback aman jika migrasi RPC belum dijalankan: hanya tarik acara_id & status_kehadiran (tanpa NIK/nama/HP)
    try {
      const raw = await this.request('pendaftar_gpm?select=acara_id,status_kehadiran');
      if (!Array.isArray(raw)) return [];
      const peta = new Map();
      raw.forEach((r) => {
        const aid = String(r.acara_id || '');
        if (!aid) return;
        if (!peta.has(aid)) {
          peta.set(aid, { acara_id: aid, total_terdaftar: 0, total_hadir: 0, total_menunggu: 0 });
        }
        const entri = peta.get(aid);
        entri.total_terdaftar += 1;
        if (String(r.status_kehadiran || '').toLowerCase() === 'hadir') entri.total_hadir += 1;
        else entri.total_menunggu += 1;
      });
      return Array.from(peta.values());
    } catch (_) {
      return [];
    }
  }

  // [GPM ATOMIK] Daftar antrean melalui PostgreSQL RPC (Row Lock kuota, waktu WITA, NIK unik)
  async daftarAntreanGPMViaRPC({
    acara_id,
    nama_pendaftar,
    nomor_telepon = '-',
    nik,
    jalur_pendaftaran = 'Daring',
    prefix_kode = 'GPM-MND',
    langsung_hadir = false
  }) {
    const res = await this.request('rpc/rpc_daftar_antrean_gpm', 'POST', {
      p_acara_id: acara_id,
      p_nama_pendaftar: nama_pendaftar,
      p_nomor_telepon: nomor_telepon || '-',
      p_nik: nik,
      p_jalur_pendaftaran: jalur_pendaftaran,
      p_prefix_kode: prefix_kode,
      p_langsung_hadir: Boolean(langsung_hadir)
    });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  // [GPM QR LOCK] Verifikasi / Batalkan kehadiran via RPC (terkunci otomatis jika acara lewat jam / Selesai)
  async verifikasiPendaftarGPMViaRPC(kodeBarcode, statusBaru = 'Hadir') {
    const res = await this.request('rpc/rpc_verifikasi_kehadiran_gpm', 'POST', {
      p_kode_barcode: kodeBarcode,
      p_status_baru: statusBaru
    });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  // [KABID / SUPERADMIN] Ubah / tambah kuota acara GPM secara atomik
  async ubahKuotaAcaraGPMViaRPC(acaraId, kuotaBaru) {
    const res = await this.request('rpc/rpc_ubah_kuota_acara_gpm', 'POST', {
      p_acara_id: acaraId,
      p_kuota_baru: Number(kuotaBaru)
    });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async tambahAcaraGPM(item) {
    const payload = {
      nama_acara: item.nama_acara,
      lokasi: item.lokasi,
      kecamatan: item.kecamatan || 'Wenang',
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      jam_mulai: item.jam_mulai || '08:00',
      jam_selesai: item.jam_selesai || '14:00',
      latitude: Number(item.latitude) || 1.4883,
      longitude: Number(item.longitude) || 124.8436,
      kuota_maksimal: Number(item.kuota_maksimal) || 250,
      komoditas_tersedia: item.komoditas_tersedia || '',
      deskripsi: item.deskripsi || '',
      status: item.status || 'Aktif'
    };
    const res = await this.request('acara_gpm', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updateAcaraGPM(id, data) {
    const res = await this.request(`acara_gpm?id=eq.${encodeURIComponent(id)}`, 'PATCH', data);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusAcaraGPM(id) {
    await this.request(`acara_gpm?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  // --- PENDAFTAR GPM ---
  async getPendaftarGPM(acaraId = null) {
    const endpoint = acaraId
      ? `pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&order=nomor_antrean.asc`
      : 'pendaftar_gpm?order=waktu_mendaftar.desc';
    return this.request(endpoint);
  }

  // [UU PDP FIX] Hitung pendaftar untuk publik hanya menarik acara_id (TIDAK ADA NIK, NAMA, atau HP)
  async getHitungPendaftarGPM() {
    try {
      const res = await this.request('pendaftar_gpm?select=acara_id');
      return Array.isArray(res) ? res : [];
    } catch (_) {
      return [];
    }
  }

  async daftarAntreanGPM(data) {
    const payload = {
      acara_id: data.acara_id,
      nama_pendaftar: data.nama_pendaftar,
      nomor_telepon: data.nomor_telepon,
      nomor_antrean: Number(data.nomor_antrean) || 1,
      kode_barcode: data.kode_barcode,
      status_kehadiran: data.status_kehadiran || 'Menunggu'
    };
    if (data.nik) payload.nik = data.nik;
    if (data.jalur_pendaftaran) payload.jalur_pendaftaran = data.jalur_pendaftaran;
    const res = await this.request('pendaftar_gpm', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async cariPendaftarByBarcode(kodeBarcode) {
    const res = await this.request(`pendaftar_gpm?kode_barcode=eq.${encodeURIComponent(kodeBarcode)}&limit=1`);
    return Array.isArray(res) && res.length > 0 ? res[0] : null;
  }

  async verifikasiPendaftarGPM(kodeBarcode, status = 'Hadir') {
    const payload = {
      status_kehadiran: status,
      waktu_kehadiran: new Date().toISOString()
    };
    const res = await this.request(`pendaftar_gpm?kode_barcode=eq.${encodeURIComponent(kodeBarcode)}`, 'PATCH', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusPendaftarGPM(id) {
    await this.request(`pendaftar_gpm?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  // [UU PDP & PRIVACY FIX] Hanya cek NIK tunggal tanpa menarik data pendaftar lain
  async cekNikTerdaftar(acaraId, nik) {
    try {
      const res = await this.request(`pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&nik=eq.${encodeURIComponent(nik)}&select=id&limit=1`);
      return Array.isArray(res) && res.length > 0;
    } catch (_) {
      return false;
    }
  }

  // [UU PDP & PRIVACY FIX] Hanya mengambil nomor antrean terbesar saat ini tanpa menarik data warga
  async getNomorAntreanTerakhir(acaraId) {
    try {
      const res = await this.request(`pendaftar_gpm?acara_id=eq.${encodeURIComponent(acaraId)}&select=nomor_antrean&order=nomor_antrean.desc&limit=1`);
      if (Array.isArray(res) && res.length > 0 && res[0].nomor_antrean) {
        return Number(res[0].nomor_antrean);
      }
    } catch (_) {}
    return 0;
  }

  // Fungsi Kriptografi SHA-256 untuk Keamanan Kata Sandi
  async hitungHashSandi(kataSandi) {
    if (!kataSandi) return '';
    if (/^[a-f0-9]{64}$/i.test(kataSandi)) return kataSandi.toLowerCase();
    const garam = 'SIPATOKAAN_MANADO_2026_SECURE_SALT';
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(garam + kataSandi);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) { }
    return kataSandi;
  }

  // --- PENGGUNA ---
  async getPengguna() {
    return this.request('pengguna?select=id,nama,username,email,peran,bidang,foto_profil,dibuat_pada&order=nama.asc');
  }

  async tambahPengguna(item) {
    const hash = item.kata_sandi ? await this.hitungHashSandi(item.kata_sandi) : 'eac2df603310203df1681272475908a04214f8b9900347fc1982d4a7b10ca481';
    const payload = {
      nama: item.nama ? item.nama.trim() : '',
      username: item.username ? item.username.trim().toLowerCase() : '',
      email: item.email || `${(item.username || '').trim().toLowerCase()}@manado.go.id`,
      kata_sandi: hash,
      peran: item.peran || 'Staf',
      bidang: item.bidang || 'Dinas Pangan Kota Manado',
      foto_profil: item.foto_profil || ''
    };
    const res = await this.request('pengguna', 'POST', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async updatePengguna(id, data, fallbackUsername) {
    const payload = {};
    if (data.nama !== undefined) payload.nama = data.nama;
    if (data.username !== undefined) payload.username = data.username.toLowerCase().trim();
    if (data.email !== undefined) payload.email = data.email;
    if (data.peran !== undefined) payload.peran = data.peran;
    if (data.bidang !== undefined) payload.bidang = data.bidang;
    if (data.foto_profil !== undefined) payload.foto_profil = data.foto_profil;
    if (data.kata_sandi !== undefined) {
      payload.kata_sandi = await this.hitungHashSandi(data.kata_sandi);
    }

    let filter = `id=eq.${encodeURIComponent(id)}`;
    if (fallbackUsername) {
      filter = `or=(id.eq.${encodeURIComponent(id)},username.eq.${encodeURIComponent(fallbackUsername)})`;
    }
    const res = await this.request(`pengguna?${filter}`, 'PATCH', payload);
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async ubahPasswordPengguna(id, kataSandiBaru, fallbackUsername) {
    const hash = await this.hitungHashSandi(kataSandiBaru);
    let filter = `id=eq.${encodeURIComponent(id)}`;
    if (fallbackUsername) {
      filter = `or=(id.eq.${encodeURIComponent(id)},username.eq.${encodeURIComponent(fallbackUsername)})`;
    }
    const res = await this.request(`pengguna?${filter}`, 'PATCH', { kata_sandi: hash });
    return Array.isArray(res) && res.length > 0 ? res[0] : res;
  }

  async hapusPengguna(id, fallbackUsername) {
    let filter = `id=eq.${encodeURIComponent(id)}`;
    if (fallbackUsername) {
      filter = `or=(id.eq.${encodeURIComponent(id)},username.eq.${encodeURIComponent(fallbackUsername)})`;
    }
    await this.request(`pengguna?${filter}`, 'DELETE');
    return true;
  }

  async loginPengguna(identifier, kata_sandi) {
    // [CEK-08 FIX] Gunakan RPC server-side — anon tidak perlu SELECT langsung dari tabel pengguna.
    // Hash dihitung di client lalu dikirim ke RPC; RPC mencocokkan di server dan hanya
    // mengembalikan data user TANPA kolom kata_sandi jika cocok.
    const idClean = (identifier || '').toLowerCase().trim();
    const hashInput = await this.hitungHashSandi(kata_sandi);

    // Panggil RPC rpc_login_pengguna via POST ke /rest/v1/rpc/
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/rpc_login_pengguna`, {
      method: 'POST',
      headers: {
        'apikey': this.apikey,
        'Authorization': `Bearer ${this.apikey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_identifier: idClean,
        p_hash_sandi: hashInput
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Login error: ${res.status}`);
    }

    const data = await res.json();
    // RPC mengembalikan array; kosong = sandi salah/user tidak ada
    if (!data || data.length === 0) return null;
    // kata_sandi TIDAK ADA dalam respons (RPC tidak return kolom itu)
    return data[0];
  }
}

export const supabaseClient = new SupabaseRestClient();

