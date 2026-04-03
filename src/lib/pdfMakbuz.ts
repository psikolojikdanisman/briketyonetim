interface MakbuzKalem {
  etiket: string;
  deger: string;
}

interface MakbuzParams {
  baslik: string;
  makbuzNo: string;
  tarih: string;
  alici: string;
  aliciTel?: string;
  aciklama?: string;
  kalemler: MakbuzKalem[];
  odemeTutari: string;
  kalanBorc?: string;
  isletmeAdi?: string;
}

export function makbuzIndir({
  baslik, makbuzNo, tarih, alici, aliciTel, aciklama,
  kalemler, odemeTutari, kalanBorc, isletmeAdi,
}: MakbuzParams) {
  const fd = (d: string) => d.split('-').reverse().join('.');

  const satirlar = kalemler.map(k => `
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;font-size:12px;color:#555;">${k.etiket}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;font-size:12px;font-family:monospace;text-align:right;">${k.deger}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>${baslik}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#111; padding:32px; max-width:600px; margin:auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #222; }
    .firma { font-size:18px; font-weight:700; letter-spacing:1px; }
    .firma-alt { font-size:11px; color:#777; margin-top:3px; }
    .makbuz-no { text-align:right; font-size:11px; color:#777; }
    .makbuz-no strong { font-size:15px; color:#111; display:block; margin-bottom:2px; }
    .alici { background:#f7f7f7; border-radius:6px; padding:12px 16px; margin-bottom:20px; }
    .alici-label { font-size:10px; color:#999; letter-spacing:1px; margin-bottom:4px; }
    .alici-isim { font-size:16px; font-weight:700; }
    .alici-tel { font-size:12px; color:#555; margin-top:3px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    .tutar-kutu { background:#111; color:#fff; border-radius:6px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .tutar-label { font-size:11px; opacity:.7; letter-spacing:1px; }
    .tutar-rakam { font-size:22px; font-weight:700; font-family:monospace; }
    .kalan { background:#fff3cd; border:1px solid #ffc107; border-radius:6px; padding:10px 14px; font-size:12px; margin-bottom:16px; display:flex; justify-content:space-between; }
    .footer { border-top:1px dashed #ccc; padding-top:12px; font-size:10px; color:#aaa; text-align:center; margin-top:8px; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="firma">🧱 ${isletmeAdi || 'BRİKET YÖNETİM'}</div>
      <div class="firma-alt">${baslik}</div>
    </div>
    <div class="makbuz-no">
      <strong>${makbuzNo}</strong>
      ${fd(tarih)}
    </div>
  </div>

  <div class="alici">
    <div class="alici-label">ALICI</div>
    <div class="alici-isim">${alici}</div>
    ${aliciTel ? `<div class="alici-tel">📞 ${aliciTel}</div>` : ''}
    ${aciklama ? `<div style="font-size:12px;color:#666;margin-top:4px;">${aciklama}</div>` : ''}
  </div>

  <table>
    <tbody>${satirlar}</tbody>
  </table>

  <div class="tutar-kutu">
    <div>
      <div class="tutar-label">ÖDEME TUTARI</div>
    </div>
    <div class="tutar-rakam">${odemeTutari}</div>
  </div>

  ${kalanBorc ? `<div class="kalan"><span>⏳ Kalan Borç</span><strong>${kalanBorc}</strong></div>` : ''}

  <div class="footer">
    Bu makbuz bilgi amaçlıdır • ${isletmeAdi || 'Briket Yönetim'} • ${new Date().toLocaleDateString('tr-TR')}
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Lütfen açılır pencere engelleyiciyi kapatın.'); return; }
  win.document.write(html);
  win.document.close();
}