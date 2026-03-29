import { fd } from '@/lib/storage';
import type { Teslimat } from '@/types';
import { SIP_CESIT_LABEL } from '@/lib/storage';

// ─── HTML escape (XSS koruması) ───────────────────────────────────────────────
function esc(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Makbuz baskı ─────────────────────────────────────────────────────────────
export function makbuzYazdir(params: {
  musteriIsim: string;
  kalemler: Teslimat[];
  tarih: string;
  yoneticiAdSoyad: string;
  yoneticiTel: string;
}): void {
  const { musteriIsim, kalemler, tarih, yoneticiAdSoyad, yoneticiTel } = params;

  const toplamTutar  = kalemler.reduce((s, t) => s + t.tutar, 0);
  const toplamTahsil = kalemler.reduce((s, t) => s + t.tahsil, 0);
  const toplamKalan  = toplamTutar - toplamTahsil;
  const odemeStr     = toplamKalan <= 0
    ? 'Peşin Ödendi'
    : toplamTahsil > 0
      ? `Kısmi - Kalan: ${toplamKalan.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`
      : 'Veresiye';

  const satirlar = kalemler.map(t => `
    <tr>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;">${esc(SIP_CESIT_LABEL[t.cesit] || t.cesit)}</td>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:right;">${t.adet.toLocaleString('tr-TR')}</td>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:right;">${t.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:right;">${t.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('');

  const header = `
    <div style="font-size:13px;font-weight:700;color:#2a2118;letter-spacing:.5px;">İdooğlu Briket</div>
    ${yoneticiAdSoyad ? `<div style="font-size:10px;color:#5c4f3d;margin-top:1px;">${esc(yoneticiAdSoyad)}</div>` : ''}
    ${yoneticiTel     ? `<div style="font-size:10px;color:#5c4f3d;">Tel: ${esc(yoneticiTel)}</div>`               : ''}
  `;

  const body = `
    <div style="font-size:9px;color:#888;margin-bottom:2px;letter-spacing:.5px;">TESLİMAT MAKBUZU</div>
    <div style="font-size:10px;margin-bottom:1px;"><b>Teslim Alan:</b> ${esc(musteriIsim)}</div>
    <div style="font-size:10px;margin-bottom:5px;"><b>Tarih:</b> ${esc(fd(tarih))}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:5px;">
      <thead>
        <tr style="background:#f0f4f0;">
          <th style="padding:2px 5px;font-size:8.5px;text-align:left;font-weight:600;white-space:nowrap;">ÜRÜN</th>
          <th style="padding:2px 5px;font-size:8.5px;text-align:right;font-weight:600;">MİKT.</th>
          <th style="padding:2px 5px;font-size:8.5px;text-align:right;font-weight:600;">FİYAT</th>
          <th style="padding:2px 5px;font-size:8.5px;text-align:right;font-weight:600;">TUTAR</th>
        </tr>
      </thead>
      <tbody>${satirlar}</tbody>
    </table>
  `;

  const footer = `
    <div style="background:#f7faf7;border-radius:3px;padding:5px 7px;margin-bottom:5px;">
      <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px;">
        <span style="color:#5c4f3d;">Toplam</span>
        <span style="font-weight:600;">${toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px;">
        <span style="color:#5c4f3d;">Tahsil</span>
        <span style="font-weight:600;color:#2d7a4f;">${toplamTahsil.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
      </div>
      <div style="border-top:1px solid #d4e4d4;padding-top:3px;display:flex;justify-content:space-between;font-size:11px;">
        <span style="font-weight:700;">Kalan</span>
        <span style="font-weight:700;color:${toplamKalan > 0 ? '#b83c2b' : '#2d7a4f'};">${toplamKalan.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
      </div>
    </div>
    <div style="font-size:9px;color:#5c4f3d;margin-bottom:8px;">Ödeme: ${esc(odemeStr)}</div>
    <div style="display:flex;justify-content:space-between;margin-top:10px;">
      <div style="text-align:center;width:44%;">
        <div style="border-top:1px solid #2a2118;margin-bottom:2px;"></div>
        <div style="font-size:8px;color:#888;">Teslim Eden</div>
        <div style="font-size:9px;font-weight:600;margin-top:1px;word-break:break-all;">${esc(yoneticiAdSoyad) || 'İdooğlu Briket'}</div>
      </div>
      <div style="text-align:center;width:44%;">
        <div style="border-top:1px solid #2a2118;margin-bottom:2px;"></div>
        <div style="font-size:8px;color:#888;">Teslim Alan</div>
        <div style="font-size:9px;font-weight:600;margin-top:1px;word-break:break-all;">${esc(musteriIsim)}</div>
      </div>
    </div>
  `;

  const tekMakbuz = `
<div style="width:198px;padding:10px;font-family:'Segoe UI',Arial,sans-serif;box-sizing:border-box;overflow:hidden;">
  <div style="text-align:center;margin-bottom:6px;">${header}</div>
  <hr style="border:none;border-top:1px dashed #d1d5db;margin:5px 0;" />
  ${body}
  ${footer}
</div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Makbuz - ${esc(musteriIsim)}</title>
  <style>
    @media print {
      body { margin: 0; background: white; }
      @page { size: A5 landscape; margin: 6mm; }
      .btn-yazdir { display: none !important; }
    }
    body {
      margin: 0; padding: 16px; background: #f5f0eb;
      display: flex; flex-direction: column; align-items: center;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .btn-yazdir {
      background: #2d7a4f; color: white; border: none;
      padding: 9px 20px; border-radius: 7px; font-size: 14px;
      font-weight: 600; cursor: pointer; margin-bottom: 14px;
      box-shadow: 0 2px 8px rgba(45,122,79,.3);
    }
    .sayfa {
      display: flex; gap: 0; background: white;
      padding: 10px; border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,.1);
      max-width: 100%; overflow: hidden;
    }
    .ayirici {
      width: 1px; flex-shrink: 0;
      background: repeating-linear-gradient(to bottom,#d1d5db 0,#d1d5db 5px,transparent 5px,transparent 9px);
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <button class="btn-yazdir" onclick="window.print()">🖨️ Yazdır (A5 Yatay)</button>
  <div class="sayfa">
    ${tekMakbuz}
    <div class="ayirici"></div>
    ${tekMakbuz}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) setTimeout(() => URL.revokeObjectURL(url), 60000);
}