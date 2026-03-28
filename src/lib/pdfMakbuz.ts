// src/lib/pdfMakbuz.ts
// jsPDF CDN'den dinamik olarak yüklenir — "npm install" gerekmez.
// A4 yatay sayfada iki adet yan yana A5 makbuz üretir.
// Ortada kesme çizgisi + makas işareti bulunur.
// makbuzIndir() çağrıldığında PDF yeni sekmede açılır; kullanıcı oradan indirebilir.

export interface MakbuzVeri {
  baslik: string;          // "MUSTERI ODEME MAKBUZU"
  makbuzNo: string;
  tarih: string;           // "2025-01-15"
  alici: string;
  aliciTel?: string;
  aciklama?: string;
  kalemler: { etiket: string; deger: string }[];
  odemeTutari: string;     // formatlanmış, ör: "1.500,00 TL"
  kalanBorc?: string;      // formatlanmış, ör: "500,00 TL"
  altNot?: string;
  isletmeAdi?: string;
  isletmeTel?: string;
}

// ─── jsPDF yükleyici ──────────────────────────────────────────────────────────
function loadJsPDF(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.jspdf?.jsPDF) { resolve(win.jspdf.jsPDF); return; }
    if (win.jsPDF)         { resolve(win.jsPDF);       return; }
    const s   = document.createElement('script');
    s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload  = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      resolve(w.jspdf?.jsPDF || w.jsPDF);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── Türkçe → Latin (jsPDF built-in font sınırı) ─────────────────────────────
function tr(s: string): string {
  return s
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/₺/g, 'TL');
}

// ─── Sayfa / makbuz ölçüleri (mm) ────────────────────────────────────────────
const PW   = 297;   // A4 landscape genişlik
const PH   = 210;   // A4 landscape yükseklik
const MARG =   7;   // dış kenar
const GAP  =  11;   // iki makbuz arası kesme alanı
const RW   = (PW - MARG * 2 - GAP) / 2;  // tek makbuz genişliği ≈ 137 mm
const RH   = PH - MARG * 2;               // tek makbuz yüksekliği ≈ 196 mm

// ─── Renk paleti ──────────────────────────────────────────────────────────────
const DARK   = [15,  23,  42]  as [number,number,number];
const DKBLUE = [30,  41,  59]  as [number,number,number];
const ACCENT = [14, 165, 133]  as [number,number,number];  // teal
const WHITE  = [255,255,255]  as [number,number,number];
const CREAM  = [249,250,251]  as [number,number,number];
const LGRAY  = [203,213,225]  as [number,number,number];
const MGRAY  = [100,116,139]  as [number,number,number];
const ROWALT = [241,245,249]  as [number,number,number];
const REDBG  = [254,242,242]  as [number,number,number];
const REDTXT = [185, 28, 28]  as [number,number,number];

// ─── jsPDF tip kısayolları ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any;

function tw(doc: D, text: string): number {
  return doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
}

// ─── Tek makbuz çizici ────────────────────────────────────────────────────────
function drawMakbuz(doc: D, v: MakbuzVeri, altNot: string, ox: number, oy: number) {
  const isletme  = tr(v.isletmeAdi || 'BRIKET YONETIM');
  const tarihStr = v.tarih.split('-').reverse().join('.');

  // Dış çerçeve + arka plan
  doc.setFillColor(...CREAM);
  doc.roundedRect(ox, oy, RW, RH, 1.5, 1.5, 'F');
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.3);
  doc.roundedRect(ox, oy, RW, RH, 1.5, 1.5, 'D');

  // ── ÜST BANT ──
  const BAND = 24;
  doc.setFillColor(...DARK);
  doc.roundedRect(ox, oy, RW, BAND, 1.5, 1.5, 'F');
  // Alt köşeleri düzelt (üstte rounded, altta düz)
  doc.rect(ox, oy + BAND - 3, RW, 3, 'F');

  // Accent çizgi
  doc.setFillColor(...ACCENT);
  doc.rect(ox, oy + BAND, RW, 1.5, 'F');

  // İşletme adı
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text(isletme, ox + 6, oy + 9);

  // İşletme tel
  if (v.isletmeTel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(160, 185, 210);
    doc.text(tr('Tel: ' + v.isletmeTel), ox + 6, oy + 14);
  }

  // Sağ: makbuz başlığı
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...ACCENT);
  const blbl = tr(v.baslik);
  doc.text(blbl, ox + RW - tw(doc, blbl) - 5, oy + 8);

  // Sağ: no & tarih
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(160, 185, 210);
  const noStr = tr('No: ' + v.makbuzNo);
  const trStr = tr('Tarih: ' + tarihStr);
  doc.text(noStr, ox + RW - tw(doc, noStr) - 5, oy + 14);
  doc.text(trStr, ox + RW - tw(doc, trStr) - 5, oy + 19.5);

  let cy = oy + BAND + 7;

  // ── ALICI BLOĞU ──
  const AB_H = 16;
  doc.setFillColor(230, 245, 242);
  doc.rect(ox + 4, cy, RW - 8, AB_H, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(ox + 4, cy, 2.5, AB_H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...ACCENT);
  doc.text(tr('ALICI / ILGILI'), ox + 9, cy + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(tr(v.alici), ox + 9, cy + 12);

  if (v.aliciTel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MGRAY);
    const tstr = tr('Tel: ' + v.aliciTel);
    doc.text(tstr, ox + RW - tw(doc, tstr) - 6, cy + 12);
  }

  cy += AB_H + 4;

  // ── KALEMLER TABLOSU ──
  // Başlık satırı
  const TH = 6;
  doc.setFillColor(...DKBLUE);
  doc.rect(ox + 4, cy, RW - 8, TH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...WHITE);
  doc.text(tr('ACIKLAMA / KALEM'), ox + 7, cy + 4.2);
  const dh = tr('DEGER');
  doc.text(dh, ox + RW - tw(doc, dh) - 6, cy + 4.2);
  cy += TH;

  const ROW_H = 6.5;
  v.kalemler.forEach((k, i) => {
    if (i % 2 !== 0) {
      doc.setFillColor(...ROWALT);
      doc.rect(ox + 4, cy, RW - 8, ROW_H, 'F');
    }
    // Etiket
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...DARK);
    doc.text(tr(k.etiket), ox + 7, cy + 4.6);
    // Değer (sağa hizalı, bold)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const dval = tr(k.deger);
    doc.text(dval, ox + RW - tw(doc, dval) - 6, cy + 4.6);
    // Alt çizgi
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.15);
    doc.line(ox + 4, cy + ROW_H, ox + RW - 4, cy + ROW_H);
    cy += ROW_H;
  });

  cy += 4;

  // ── TOPLAM ÖDEME KUTUSU ──
  const TOT_H = 14;
  doc.setFillColor(...DARK);
  doc.rect(ox + 4, cy, RW - 8, TOT_H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...ACCENT);
  doc.text(tr('ODENEN TUTAR'), ox + 7, cy + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  const totStr = tr(v.odemeTutari);
  doc.text(totStr, ox + RW - tw(doc, totStr) - 6, cy + 11.5);

  cy += TOT_H + 3;

  // ── KALAN BORÇ (varsa) ──
  if (v.kalanBorc) {
    const KB_H = 8;
    doc.setFillColor(...REDBG);
    doc.rect(ox + 4, cy, RW - 8, KB_H, 'F');
    doc.setFillColor(...REDTXT);
    doc.rect(ox + 4, cy, 2.5, KB_H, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...REDTXT);
    doc.text(tr('Kalan Borc:'), ox + 9, cy + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const kbStr = tr(v.kalanBorc);
    doc.text(kbStr, ox + RW - tw(doc, kbStr) - 6, cy + 5.8);
    cy += KB_H + 4;
  }

  // ── AÇIKLAMA (varsa) ──
  if (v.aciklama) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...MGRAY);
    doc.text(tr('Not: ' + v.aciklama), ox + 6, cy + 4);
    cy += 7;
  }

  // ── İMZA ALANI ──
  const imzaY = oy + RH - 18;
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(ox + 8,      imzaY, ox + RW/2 - 4, imzaY);
  doc.line(ox + RW/2 + 4, imzaY, ox + RW - 8, imzaY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...MGRAY);
  const l1 = tr('Teslim Eden');
  const l2 = tr('Teslim Alan');
  doc.text(l1, ox + 8 + (RW/2 - 12 - tw(doc, l1))/2, imzaY + 4.5);
  doc.text(l2, ox + RW/2 + 4 + (RW/2 - 12 - tw(doc, l2))/2, imzaY + 4.5);

  // ── ALT NOT / NÜSHA BİLGİSİ ──
  const footY = oy + RH - 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5);
  doc.setTextColor(...MGRAY);
  const fn = tr(altNot);
  doc.text(fn, ox + (RW - tw(doc, fn)) / 2, footY);
}

// ─── Kesme çizgisi ────────────────────────────────────────────────────────────
function drawCutLine(doc: D) {
  const cx = PW / 2;

  // Kesik çizgi
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.25);
  let y = MARG;
  const seg = 2.5;
  const gap = 1.8;
  while (y < PH - MARG) {
    const end = Math.min(y + seg, PH - MARG);
    doc.line(cx, y, cx, end);
    y += seg + gap;
  }

  // Makas etiketi (ortada)
  const midY = PH / 2;
  // Küçük beyaz kutu arka plan
  doc.setFillColor(255, 255, 255);
  doc.rect(cx - 6, midY - 4.5, 12, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  const scissorTxt = '[ KES ]';
  doc.text(scissorTxt, cx - tw(doc, scissorTxt)/2, midY + 2.5);

  // Üst ve alt ok işaretleri
  doc.setFontSize(6);
  doc.setTextColor(160, 160, 160);
  doc.text('v', cx - 1.5, MARG + 8);
  doc.text('^', cx - 1.5, PH - MARG - 4);
}

// ─── Ana dışa aktarma ─────────────────────────────────────────────────────────
export async function makbuzIndir(v: MakbuzVeri): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JsPDF = await loadJsPDF() as any;

  const doc: D = new JsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const ox1 = MARG;
  const ox2 = MARG + RW + GAP;
  const oy  = MARG;

  // Nüsha 1 — Müşteri / Tedarikçi / İşçi
  drawMakbuz(doc, v, v.altNot || 'Musteri / Ilgili Nushasi', ox1, oy);

  // Kesme çizgisi
  drawCutLine(doc);

  // Nüsha 2 — İşletme dosyası
  drawMakbuz(doc, v, 'Isletme Nushasi  —  Dosyalanacak', ox2, oy);

  // Yeni sekmede PDF blob aç
  const pdfBlob: Blob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const a   = document.createElement('a');
  a.href    = url;
  a.target  = '_blank';
  a.rel     = 'noopener noreferrer';

  // Hem yeni sekmede aç hem de indir butonunu sun
  // İndirme için: a.download = 'makbuz-' + v.makbuzNo + '.pdf'; a.click();
  // Görüntüleme için:
  window.open(url, '_blank', 'noopener,noreferrer');

  // Bellek temizliği (kısa gecikme sonra)
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}