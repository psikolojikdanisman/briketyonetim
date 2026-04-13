const fs = require('fs');
const b64 = fs.readFileSync('public/logo.png').toString('base64');
const logoSrc = 'data:image/png;base64,' + b64;

const ts = `interface MakbuzKalem {
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
  baslik, tarih, alici, aliciTel, aciklama,
  kalemler, odemeTutari, kalanBorc,
}: MakbuzParams) {
  const fd = (d: string) => d.split('-').reverse().join('.');

  const satirlar = kalemler.map(k => \`
    <tr>
      <td style="padding:5px 8px;border-bottom:1px solid #ccc;font-size:11px;color:#000;">\${k.etiket}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #ccc;font-size:11px;color:#000;font-weight:700;text-align:right;">\${k.deger}</td>
    </tr>
  \`).join('');

  const html = \`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>\${baslik}</title>
  <style>
    @page { size: A6; margin: 5mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; color:#000; background:#fff; width:105mm; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  </style>
</head>
<body>
  <div style="border:3px solid #2d7a4f;padding:10px;text-align:center;margin-bottom:8px;">
    <img src="${logoSrc}" style="height:55px;display:block;margin:0 auto 6px auto;" />
    <div style="font-size:13px;font-weight:900;color:#000;">FAİK KARADENİZ</div>
    <div style="font-size:10px;color:#333;margin-top:2px;">0542 368 62 74</div>
    <div style="font-size:10px;color:#333;margin-top:1px;">\${fd(tarih)}</div>
  </div>

  <div style="text-align:center;font-size:10px;font-weight:700;letter-spacing:2px;color:#2d7a4f;margin-bottom:6px;text-transform:uppercase;">\${baslik}</div>

  <div style="border-left:4px solid #2d7a4f;padding:6px 8px;margin-bottom:8px;background:#f9f9f9;">
    <div style="font-size:9px;color:#555;margin-bottom:2px;text-transform:uppercase;letter-spacing:1px;">Alıcı</div>
    <div style="font-size:14px;font-weight:900;color:#000;">\${alici}</div>
    \${aliciTel ? '<div style="font-size:10px;color:#333;margin-top:1px;">Tel: ' + aliciTel + '</div>' : ''}
    \${aciklama ? '<div style="font-size:10px;color:#333;margin-top:2px;">' + aciklama + '</div>' : ''}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tbody>\${satirlar}</tbody>
  </table>

  <div style="border:2px solid #2d7a4f;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:\${kalanBorc ? '5px' : '8px'};">
    <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#2d7a4f;text-transform:uppercase;">ÖDEME TUTARI</div>
    <div style="font-size:20px;font-weight:900;color:#000;">\${odemeTutari}</div>
  </div>

  \${kalanBorc ? '<div style="border:2px solid #e0a000;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:10px;font-weight:700;color:#b07000;">Kalan Borç</span><span style="font-size:14px;font-weight:900;color:#b07000;">' + kalanBorc + '</span></div>' : ''}

  <div style="border-top:1px solid #ccc;padding-top:5px;text-align:center;font-size:9px;color:#555;">
    İdooğlu Briket - \${new Date().toLocaleDateString('tr-TR')}
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>\`;

  const win = window.open('', '_blank');
  if (!win) { alert('Lutfen acilir pencere engelleyiciyi kapatin.'); return; }
  win.document.write(html);
  win.document.close();
}
`;

fs.writeFileSync('src/lib/pdfMakbuz.ts', ts);
console.log('Tamam.');