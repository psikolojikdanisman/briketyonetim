import type { Teslimat } from '@/types';
import { tl, fd, SIP_CESIT_LABEL } from '@/lib/storage';

interface MakbuzParams {
  musteriIsim: string;
  kalemler: Teslimat[];
  tarih: string;
  yoneticiAdSoyad: string;
  yoneticiTel: string;
}

export function makbuzYazdir({ musteriIsim, kalemler, tarih, yoneticiAdSoyad, yoneticiTel }: MakbuzParams) {
  const toplamTutar  = kalemler.reduce((s, t) => s + t.tutar,  0);
  const toplamTahsil = kalemler.reduce((s, t) => s + t.tahsil, 0);
  const toplamKalan  = toplamTutar - toplamTahsil;

  const odemeLabel = (t: Teslimat) => {
    if (t.tahsil >= t.tutar) return 'Peşin';
    if (t.tahsil > 0)        return 'Kısmi';
    return 'Veresiye';
  };

  const satirlar = kalemler.map(t => `
    <tr>
      <td>${SIP_CESIT_LABEL[t.cesit] || t.cesit}</td>
      <td class="r">${t.adet.toLocaleString('tr-TR')} ${t.birim || 'adet'}</td>
      <td class="r">${tl(t.birimFiyat)}</td>
      <td class="r">${tl(t.tutar)}</td>
      <td class="r">${tl(t.tahsil)}</td>
      <td class="r">${odemeLabel(t)}</td>
    </tr>
  `).join('');

  const yerBilgisi = [...new Set(kalemler.map(t => [t.koy, t.adres].filter(Boolean).join(' - ')).filter(Boolean))].join(', ');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>Teslimat Makbuzu — ${musteriIsim}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A6; margin: 8mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #000; padding: 0; max-width: 105mm; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #222; }
    .firma { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
    .firma-alt { font-size: 12px; color: #555; margin-top: 4px; }
    .makbuz-no { text-align: right; font-size: 12px; color: #555; }
    .makbuz-no strong { font-size: 16px; color: #111; display: block; }
    .bilgi { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 14px 16px; background: #f7f7f7; border-radius: 6px; }
    .bilgi-satir label { font-size: 10px; color: #333; display: block; margin-bottom: 2px; font-weight: 700; }
    .bilgi-satir span { font-size: 11px; font-weight: 700; color: #000; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #222; color: #fff; padding: 8px 10px; font-size: 12px; text-align: left; }
    th.r, td.r { text-align: right; }
    td { padding: 5px 8px; border-bottom: 1px solid #ccc; font-size: 10px; color: #000; }
    tr:last-child td { border-bottom: none; }
    .ozet { margin-left: auto; width: 260px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-bottom: 24px; }
    .ozet-satir { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 13px; border-bottom: 1px solid #eee; }
    .ozet-satir:last-child { border-bottom: none; background: #f0f0f0; font-weight: 700; }
    .ozet-satir.kalan { color: ${toplamKalan > 0 ? '#c0392b' : '#27ae60'}; }
    .footer { border-top: 1px dashed #666; padding-top: 8px; font-size: 9px; color: #333; text-align: center; margin-top: 6px; }
    @media print {
      body { padding: 16px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="firma" style="font-size:13px;font-weight:900;color:#000;letter-spacing:1px;">İDOOĞLU BRİKET</div>
      <div class="firma-alt" style="font-size:10px;color:#333;margin-top:2px;">${yoneticiAdSoyad}${yoneticiTel ? ' · ' + yoneticiTel : ''}</div>
    </div>
    <div class="makbuz-no">
      <strong>TESLİMAT MAKBUZU</strong>
      Tarih: ${fd(tarih)}
    </div>
  </div>

  <div class="bilgi">
    <div class="bilgi-satir">
      <label>Müşteri</label>
      <span>${musteriIsim}</span>
    </div>
    <div class="bilgi-satir">
      <label>Teslimat Yeri</label>
      <span>${yerBilgisi || '—'}</span>
    </div>
    <div class="bilgi-satir">
      <label>Kalem Sayısı</label>
      <span>${kalemler.length} kalem</span>
    </div>
    <div class="bilgi-satir">
      <label>Ödeme Durumu</label>
      <span>${toplamKalan <= 0 ? '✓ Tahsil Edildi' : toplamTahsil > 0 ? '⚡ Kısmi Ödeme' : '⏳ Veresiye'}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Ürün</th>
        <th class="r">Miktar</th>
        <th class="r">Birim Fiyat</th>
        <th class="r">Tutar</th>
        <th class="r">Tahsil</th>
        <th class="r">Ödeme</th>
      </tr>
    </thead>
    <tbody>
      ${satirlar}
    </tbody>
  </table>

  <div class="ozet">
    <div class="ozet-satir">
      <span>Toplam Tutar</span>
      <span>${tl(toplamTutar)}</span>
    </div>
    <div class="ozet-satir">
      <span>Tahsil Edilen</span>
      <span>${tl(toplamTahsil)}</span>
    </div>
    <div class="ozet-satir kalan">
      <span>Kalan Borç</span>
      <span>${tl(toplamKalan)}</span>
    </div>
  </div>

  <div class="footer">
    Bu makbuz bilgi amaçlıdır. ${yoneticiAdSoyad} — ${new Date().toLocaleDateString('tr-TR')}
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Lütfen açılır pencere engelleyiciyi kapatın.'); return; }
  win.document.write(html);
  win.document.close();
}
