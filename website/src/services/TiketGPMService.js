// ===================================================================================
// MODUL LAYANAN UNDUH E-TIKET GPM FORMAT GAMBAR PNG (OOP - WEBSITE)
// Instansi: Dinas Pangan Pemerintah Kota Manado
// Fungsi: Merender kartu tiket antrean resmi GPM beresolusi tinggi (Canvas + QR Code)
//         hanya menampilkan Nomor Antrean, QR Code (token unik), Nama Pendaftar,
//         Lokasi GPM, dan Waktu Pelaksanaan untuk diunduh langsung sebagai berkas PNG.
// ===================================================================================

import QRCode from 'qrcode';

export class TiketGPMService {
  bungkusTeks(ctx, teks, maksLebar) {
    const kataList = String(teks || '-').trim().split(/\s+/);
    const baris = [];
    let saatIni = '';

    for (const kata of kataList) {
      const uji = saatIni ? `${saatIni} ${kata}` : kata;
      if (ctx.measureText(uji).width <= maksLebar) {
        saatIni = uji;
      } else {
        if (saatIni) baris.push(saatIni);
        saatIni = kata;
      }
    }
    if (saatIni) baris.push(saatIni);
    return baris.length > 0 ? baris : ['-'];
  }

  gambarPersegiBulat(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  async unduhTiketPNG(tiketHasil) {
    if (!tiketHasil || !tiketHasil.tiket) {
      throw new Error('Data tiket tidak tersedia untuk diunduh.');
    }

    const tiket = tiketHasil.tiket;
    const acara = tiketHasil.acara || {};
    const nomorStr = `#${String(tiket.nomor_antrean || 1).padStart(3, '0')}`;
    const namaBersih = String(tiket.nama_bersih || tiket.nama_pendaftar || '-').replace(/\s*\[NIK:.*?\]/gi, '').trim();
    const kodeQR = String(tiket.kode_barcode || '').trim();
    const lokasiGabung = [acara.nama_acara, acara.lokasi].filter(Boolean).join(' — ') || 'Gerakan Pangan Murah Kota Manado';
    const waktuGabung = `${acara.tanggal || '-'}${acara.jam ? ` (${acara.jam})` : ''}`;

    // Buat QR Code resolusi tinggi langsung ke DataURL
    const qrDataUrl = await QRCode.toDataURL(kodeQR || nomorStr, {
      width: 340,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' }
    });

    const qrImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar QR Code.'));
      img.src = qrDataUrl;
    });

    const W = 760;
    const padX = 48;
    const innerW = W - padX * 2;

    // Hitung tinggi dinamis agar teks panjang tidak terpotong
    const ukurCanvas = document.createElement('canvas');
    const uCtx = ukurCanvas.getContext('2d');
    uCtx.font = '700 24px "Segoe UI", Arial, sans-serif';
    const barisNama = this.bungkusTeks(uCtx, namaBersih, innerW - 40);
    const barisLokasi = this.bungkusTeks(uCtx, lokasiGabung, innerW - 40);
    const barisWaktu = this.bungkusTeks(uCtx, waktuGabung, innerW - 40);

    const tinggiDetail =
      36 +
      (28 + barisNama.length * 32 + 18) +
      (28 + barisLokasi.length * 32 + 18) +
      (28 + barisWaktu.length * 32 + 12);
    const H = 148 + 168 + 380 + tinggiDetail + 132;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Latar belakang
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    // Kartu utama putih
    this.gambarPersegiBulat(ctx, 20, 20, W - 40, H - 40, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    // Header Maroon
    ctx.save();
    this.gambarPersegiBulat(ctx, 20, 20, W - 40, 124, 24);
    ctx.clip();
    const grad = ctx.createLinearGradient(20, 20, W - 20, 144);
    grad.addColorStop(0, '#5a0f0f');
    grad.addColorStop(1, '#8b1e1e');
    ctx.fillStyle = grad;
    ctx.fillRect(20, 20, W - 40, 124);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '800 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('TIKET ANTREAN RESMI GPM', W / 2, 74);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '600 18px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Dinas Pangan Pemerintah Kota Manado • SIPATOKAAN', W / 2, 110);

    // Kotak Nomor Antrean
    let y = 170;
    this.gambarPersegiBulat(ctx, padX, y, innerW, 134, 18);
    ctx.fillStyle = '#fef2f2';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fecaca';
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    ctx.font = '700 17px "Segoe UI", Arial, sans-serif';
    ctx.fillText('NOMOR ANTREAN ANDA', W / 2, y + 36);

    ctx.fillStyle = '#8b1e1e';
    ctx.font = '900 66px "Segoe UI", Arial, sans-serif';
    ctx.fillText(nomorStr, W / 2, y + 108);

    // QR Code Box
    y += 160;
    const qrSize = 276;
    const qrBoxSize = qrSize + 28;
    this.gambarPersegiBulat(ctx, (W - qrBoxSize) / 2, y, qrBoxSize, qrBoxSize, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();
    ctx.drawImage(qrImg, (W - qrSize) / 2, y + 14, qrSize, qrSize);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px Consolas, "Courier New", monospace';
    ctx.fillText(kodeQR, W / 2, y + qrBoxSize + 36);

    // Garis putus-putus
    y += qrBoxSize + 60;
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(W - padX, y);
    ctx.stroke();
    ctx.restore();

    // Detail Ringkas (Nama, Lokasi GPM, Waktu Pelaksanaan)
    y += 26;
    this.gambarPersegiBulat(ctx, padX, y, innerW, tinggiDetail, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.textAlign = 'left';
    let dy = y + 36;
    const drawField = (label, lines) => {
      ctx.fillStyle = '#64748b';
      ctx.font = '700 16px "Segoe UI", Arial, sans-serif';
      ctx.fillText(label, padX + 22, dy);
      dy += 28;
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 23px "Segoe UI", Arial, sans-serif';
      lines.forEach((line) => {
        ctx.fillText(line, padX + 22, dy);
        dy += 32;
      });
      dy += 14;
    };

    drawField('NAMA PENDAFTAR', barisNama);
    drawField('LOKASI GPM', barisLokasi);
    drawField('WAKTU PELAKSANAAN', barisWaktu);

    // Petunjuk Bawah
    y += tinggiDetail + 24;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '600 17px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Tunjukkan Kode QR ini bersama KTP fisik kepada petugas', W / 2, y + 18);
    ctx.fillText('di lokasi GPM sebelum jam pelaksanaan berakhir.', W / 2, y + 44);

    // Unduh sebagai PNG (Blob URL agar lebih stabil di desktop & mobile browser)
    const slugNama = namaBersih.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'Warga';
    const namaFile = `Tiket_GPM_${String(tiket.nomor_antrean || 1).padStart(3, '0')}_${slugNama}.png`;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = namaFile;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = namaFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}

export const tiketGPMService = new TiketGPMService();
