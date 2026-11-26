// ===================================================================================
// MODUL LAYANAN GENERATOR EXCEL RESMI (.xlsx / OOXML — ZERO DEPENDENCY, OOP - MOBILE)
// Bidang: Cadangan dan Distribusi Pangan - Dinas Pangan Kota Manado
// Fungsi: Menghasilkan berkas Microsoft Excel asli (.xlsx / SpreadsheetML OOXML ZIP)
//         lengkap dengan Kop Surat tergabung, warna header kedinasan, border rapi,
//         lebar kolom otomatis, format Rupiah asli ("Rp "#,##0), teks aman 16-digit
//         NIK/KK (anti notasi ilmiah E+15), multi-sheet, dan bebas peringatan format.
// ===================================================================================

export interface SelExcelResmi {
  v: string | number;
  t?: 's' | 'n';
  s?: number;
}

export interface BarisExcelResmi {
  tinggi?: number;
  sel: (SelExcelResmi | null | undefined)[];
}

export interface DefinisiSheetExcel {
  namaSheet: string;
  lebarKolom?: number[];
  merges?: string[];
  baris: BarisExcelResmi[];
}

export class ExcelResmiMobileService {
  private readonly tabelCrc32: Uint32Array;

  constructor() {
    this.tabelCrc32 = this.bangunTabelCrc32();
  }

  private bangunTabelCrc32(): Uint32Array {
    const tabel = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      tabel[i] = c >>> 0;
    }
    return tabel;
  }

  private hitungCrc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = this.tabelCrc32[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private escapeXml(teks: unknown): string {
    return String(teks ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  indeksKeKolomExcel(indeks: number): string {
    let n = indeks + 1;
    let hasil = '';
    while (n > 0) {
      const sisa = (n - 1) % 26;
      hasil = String.fromCharCode(65 + sisa) + hasil;
      n = Math.floor((n - 1) / 26);
    }
    return hasil;
  }

  private bersihkanNamaSheet(nama?: string, fallback: string = 'Laporan'): string {
    const bersih = String(nama || fallback)
      .replace(/[\\/*?:\[\]]/g, ' ')
      .trim()
      .slice(0, 31);
    return bersih || fallback;
  }

  private bangunStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="&quot;Rp &quot;#,##0"/>
  </numFmts>
  <fonts count="10">
    <font><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="13"/><color rgb="FF8B1E1E"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><sz val="9"/><color rgb="FF475569"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF8B1E1E"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF8B1E1E"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF166534"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF92400E"/><name val="Calibri"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF8B1E1E"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="23">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="5" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="165" fontId="7" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="7" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="9" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;
  }

  private bangunWorksheetXml(sheet: DefinisiSheetExcel): string {
    const lebarKolom = Array.isArray(sheet.lebarKolom) ? sheet.lebarKolom : [];
    const merges = Array.isArray(sheet.merges) ? sheet.merges : [];
    const barisList = Array.isArray(sheet.baris) ? sheet.baris : [];

    const colsXml = lebarKolom.length > 0
      ? `<cols>${lebarKolom.map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${Math.max(6, Number(w) || 14)}" customWidth="1"/>`).join('')}</cols>`
      : '';

    const rowsXml = barisList.map((rowObj, rIdx) => {
      const rowNum = rIdx + 1;
      const tinggiAttr = rowObj?.tinggi ? ` ht="${rowObj.tinggi}" customHeight="1"` : '';
      const cells = Array.isArray(rowObj?.sel) ? rowObj.sel : [];
      const cellsXml = cells.map((cell, cIdx) => {
        if (cell === null || cell === undefined) return '';
        const ref = `${this.indeksKeKolomExcel(cIdx)}${rowNum}`;
        const s = Number.isInteger(cell.s) ? cell.s : 0;
        if (cell.t === 'n' && Number.isFinite(Number(cell.v))) {
          return `<c r="${ref}" s="${s}"><v>${Number(cell.v)}</v></c>`;
        }
        const teks = this.escapeXml(cell.v ?? '');
        return `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${teks}</t></is></c>`;
      }).join('');
      return `<row r="${rowNum}"${tinggiAttr}>${cellsXml}</row>`;
    }).join('');

    const mergeXml = merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
  ${mergeXml}
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  }

  private kemasZipStore(daftarBerkas: { nama: string; isi: string | Uint8Array }[]): Uint8Array {
    const encoder = new TextEncoder();
    const lokalBagian: Uint8Array[] = [];
    const direktoriBagian: Uint8Array[] = [];
    let offset = 0;

    const skrg = new Date();
    const dosTime = ((skrg.getHours() & 0x1f) << 11) | ((skrg.getMinutes() & 0x3f) << 5) | ((skrg.getSeconds() >> 1) & 0x1f);
    const dosDate = (((Math.max(1980, skrg.getFullYear()) - 1980) & 0x7f) << 9) | (((skrg.getMonth() + 1) & 0x0f) << 5) | (skrg.getDate() & 0x1f);

    daftarBerkas.forEach(({ nama, isi }) => {
      const namaBytes = encoder.encode(nama);
      const dataBytes = typeof isi === 'string' ? encoder.encode(isi) : isi;
      const crc = this.hitungCrc32(dataBytes);
      const ukuran = dataBytes.length;

      const localHeader = new Uint8Array(30 + namaBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, ukuran, true);
      lv.setUint32(22, ukuran, true);
      lv.setUint16(26, namaBytes.length, true);
      lv.setUint16(28, 0, true);
      localHeader.set(namaBytes, 30);

      lokalBagian.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + namaBytes.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, ukuran, true);
      cv.setUint32(24, ukuran, true);
      cv.setUint16(28, namaBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      centralHeader.set(namaBytes, 46);

      direktoriBagian.push(centralHeader);
      offset += localHeader.length + dataBytes.length;
    });

    const ukuranDirektori = direktoriBagian.reduce((acc, b) => acc + b.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, daftarBerkas.length, true);
    ev.setUint16(10, daftarBerkas.length, true);
    ev.setUint32(12, ukuranDirektori, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalUkuran = offset + ukuranDirektori + eocd.length;
    const hasil = new Uint8Array(totalUkuran);
    let pos = 0;
    for (const b of lokalBagian) {
      hasil.set(b, pos);
      pos += b.length;
    }
    for (const b of direktoriBagian) {
      hasil.set(b, pos);
      pos += b.length;
    }
    hasil.set(eocd, pos);
    return hasil;
  }

  buatWorkbookBytes(daftarSheet: DefinisiSheetExcel[] = []): Uint8Array {
    const sheets = daftarSheet.map((s, idx) => ({
      ...s,
      namaSheet: this.bersihkanNamaSheet(s.namaSheet, `Sheet${idx + 1}`)
    }));

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((s, i) => `<sheet name="${this.escapeXml(s.namaSheet)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n    ')}
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const berkasZip = [
      { nama: '[Content_Types].xml', isi: contentTypesXml },
      { nama: '_rels/.rels', isi: relsXml },
      { nama: 'xl/workbook.xml', isi: workbookXml },
      { nama: 'xl/_rels/workbook.xml.rels', isi: workbookRelsXml },
      { nama: 'xl/styles.xml', isi: this.bangunStylesXml() },
      ...sheets.map((s, i) => ({
        nama: `xl/worksheets/sheet${i + 1}.xml`,
        isi: this.bangunWorksheetXml(s)
      }))
    ];

    return this.kemasZipStore(berkasZip);
  }

  unduhWorkbookXlsx(namaBerkas: string, daftarSheet: DefinisiSheetExcel[] = []): boolean {
    const bytes = this.buatWorkbookBytes(daftarSheet);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const namaFinal = String(namaBerkas || 'Laporan_SIPATOKAAN.xlsx').endsWith('.xlsx')
      ? namaBerkas
      : `${namaBerkas}.xlsx`;

    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.setAttribute('href', url);
    tautan.setAttribute('download', namaFinal);
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }
}

export const excelResmiMobileService = new ExcelResmiMobileService();
