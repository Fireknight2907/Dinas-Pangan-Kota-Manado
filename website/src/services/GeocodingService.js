// ===================================================================================
// Modul Layanan Geocoding & Pencarian Titik Peta OpenStreetMap (OOP - Website)
// Fungsi: Menyediakan reverse geocoding (klik/geser pin peta -> isi alamat & tebak
//         kecamatan otomatis), pencarian lokasi 2 arah di sekitar Kota Manado,
//         validasi koordinat, perhitungan jarak GPS (Haversine), serta tautan
//         navigasi Google Maps menggunakan peta Leaflet/OSM tanpa API key berbayar.
// ===================================================================================

export class GeocodingService {
    constructor() {
        this.baseUrl = 'https://nominatim.openstreetmap.org';
        this.pusatManado = { lat: 1.4822, lng: 124.8489 };
        // Kotak batas sekitar Kota Manado (left, top, right, bottom)
        this.viewboxManado = '124.70,1.65,125.05,1.35';
    }

    // Cek apakah sepasang koordinat latitude & longitude valid (bukan null/kosong/0)
    punyaKoordinatValid(lat, lng) {
        if (lat === null || lat === undefined || lat === '') return false;
        if (lng === null || lng === undefined || lng === '') return false;
        const a = Number(lat);
        const o = Number(lng);
        if (!Number.isFinite(a) || !Number.isFinite(o)) return false;
        if (a === 0 && o === 0) return false;
        return a >= -90 && a <= 90 && o >= -180 && o <= 180;
    }

    // Merangkai alamat singkat & rapi dalam bahasa Indonesia dari objek address Nominatim
    susunAlamatRapi(dataNominatim) {
        if (!dataNominatim) return '';
        const addr = dataNominatim.address || {};
        const bagian = [];

        const jalan = addr.road || addr.pedestrian || addr.footway || addr.path || addr.residential;
        const tempat = addr.amenity || addr.shop || addr.building || addr.marketplace || addr.commercial;
        const kelurahan = addr.village || addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet;
        const kecamatan = addr.city_district || addr.municipality || addr.district || addr.county;
        const kota = addr.city || addr.town || 'Kota Manado';

        if (tempat && !jalan) bagian.push(tempat);
        if (jalan) bagian.push(addr.house_number ? `${jalan} No. ${addr.house_number}` : jalan);
        if (kelurahan && !bagian.some((b) => b.toLowerCase() === kelurahan.toLowerCase())) {
            bagian.push(kelurahan);
        }
        if (kecamatan && !bagian.some((b) => b.toLowerCase().includes(kecamatan.toLowerCase()))) {
            bagian.push(kecamatan);
        }
        if (kota && !bagian.some((b) => b.toLowerCase().includes('manado'))) {
            bagian.push(kota);
        }

        if (bagian.length > 0) {
            return bagian.join(', ');
        }

        // Fallback dari display_name tanpa kode pos / nama negara berlebihan
        return String(dataNominatim.display_name || '')
            .replace(/,?\s*Indonesia$/i, '')
            .replace(/,?\s*Sulawesi Utara/i, '')
            .replace(/,?\s*\d{5}\b/g, '')
            .trim();
    }

    // Mencocokkan kecamatan hasil Nominatim terhadap daftar Master Kecamatan Kota Manado
    cocokkanKecamatan(dataNominatim, daftarKecamatan = []) {
        const daftar = Array.isArray(daftarKecamatan) ? daftarKecamatan : [];
        if (daftar.length === 0 || !dataNominatim) return '';

        const addr = dataNominatim.address || {};
        const teksGabungan = [
            addr.city_district,
            addr.suburb,
            addr.municipality,
            addr.district,
            addr.village,
            dataNominatim.display_name
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (!teksGabungan) return '';

        // Urutkan dari nama terpanjang agar "Bunaken Kepulauan" dicek sebelum "Bunaken"
        const terurut = [...daftar].sort((a, b) => b.length - a.length);
        const cocok = terurut.find((kec) => teksGabungan.includes(String(kec).toLowerCase()));
        return cocok || '';
    }

    // Reverse Geocode: klik/geser pin peta (lat, lng) -> otomatis isi alamat & kecamatan
    async reverseGeocode(lat, lng, daftarKecamatan = []) {
        if (!this.punyaKoordinatValid(lat, lng)) {
            return { sukses: false, alamat: '', kecamatan: '', pesan: 'Koordinat tidak valid.' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        try {
            const url = `${this.baseUrl}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=id`;
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) {
                throw new Error(`Layanan peta merespons status ${res.status}`);
            }
            const data = await res.json();
            const alamat = this.susunAlamatRapi(data);
            const kecamatan = this.cocokkanKecamatan(data, daftarKecamatan);
            return {
                sukses: Boolean(alamat),
                alamat,
                kecamatan,
                displayName: data?.display_name || ''
            };
        } catch (err) {
            return {
                sukses: false,
                alamat: '',
                kecamatan: '',
                pesan: err?.name === 'AbortError'
                    ? 'Pencarian alamat otomatis timeout — silakan ketik alamat manual.'
                    : 'Alamat otomatis sedang tidak tersedia — silakan ketik alamat secara manual.'
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // Forward Search: ketik nama pasar/jalan -> dapatkan daftar kandidat koordinat & alamat di Manado
    async cariLokasiDiManado(kataKunci, daftarKecamatan = []) {
        const qBersih = String(kataKunci || '').trim();
        if (qBersih.length < 2) return [];

        const queryFinal = qBersih.toLowerCase().includes('manado')
            ? qBersih
            : `${qBersih}, Manado, Sulawesi Utara`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const url = `${this.baseUrl}/search?format=jsonv2&q=${encodeURIComponent(queryFinal)}&countrycodes=id&viewbox=${this.viewboxManado}&limit=5&addressdetails=1&accept-language=id`;
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) return [];
            const rows = await res.json();
            if (!Array.isArray(rows)) return [];

            return rows
                .map((r) => ({
                    id: String(r.place_id || `${r.lat}-${r.lon}`),
                    nama: r.name || String(r.display_name || '').split(',')[0] || qBersih,
                    alamat: this.susunAlamatRapi(r),
                    kecamatan: this.cocokkanKecamatan(r, daftarKecamatan),
                    latitude: Number(r.lat),
                    longitude: Number(r.lon),
                    displayName: r.display_name || ''
                }))
                .filter((r) => this.punyaKoordinatValid(r.latitude, r.longitude));
        } catch {
            return [];
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // Membangun URL rute langsung ke Google Maps berdasarkan koordinat titik pasar
    bangunUrlGoogleMaps(lat, lng, namaTempat = '') {
        if (this.punyaKoordinatValid(lat, lng)) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(lat)},${Number(lng)}`)}`;
        }
        if (namaTempat) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${namaTempat}, Manado`)}`;
        }
        return 'https://www.google.com/maps';
    }

    // Menghitung jarak garis lurus (Haversine) dalam km dari posisi GPS pengguna ke pasar
    hitungJarakKm(lat1, lng1, lat2, lng2) {
        if (!this.punyaKoordinatValid(lat1, lng1) || !this.punyaKoordinatValid(lat2, lng2)) {
            return null;
        }
        const a1 = Number(lat1);
        const o1 = Number(lng1);
        const a2 = Number(lat2);
        const o2 = Number(lng2);
        const R = 6371;
        const dLat = ((a2 - a1) * Math.PI) / 180;
        const dLng = ((o2 - o1) * Math.PI) / 180;
        const sinLat = Math.sin(dLat / 2);
        const sinLng = Math.sin(dLng / 2);
        const h =
            sinLat * sinLat +
            Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * sinLng * sinLng;
        const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        return Math.round(R * c * 10) / 10;
    }
}

export const geocodingService = new GeocodingService();
