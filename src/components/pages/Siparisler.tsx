'use client';
import { useState, useMemo } from 'react';
import type { AppData, Siparis, Teslimat, Musteri } from '@/types';
import { tl, fd, today, uid, SIP_BIRIM, SIP_CESIT_LABEL } from '@/lib/storage';
import MusteriSecici from '@/components/MusteriSecici';

const LOGO_B64 = 'data:image/png;base64,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';

// ─── Fiyat tarifeleri → birim fiyat ──────────────────────────────────────────
function varsayilanFiyat(cesit: string, bolge: string, data: AppData): string {
  const fp = data.ayarlar?.fp;
  if (!fp) return '';
  const b = (bolge === 'merkez' || bolge === 'yakin') ? bolge : 'merkez';
  const row = fp[cesit as keyof typeof fp];
  if (!row) return '';
  const val = (row as Record<string, number>)[b];
  return val ? String(val) : '';
}

// ─── Makbuz baskı ─────────────────────────────────────────────────────────────
function makbuzYazdir(params: {
  musteriIsim: string;
  kalemler: Teslimat[];
  tarih: string;
  yoneticiAdSoyad: string;
  yoneticiTel: string;
}) {
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
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;">${SIP_CESIT_LABEL[t.cesit] || t.cesit}</td>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:right;">${t.adet.toLocaleString('tr-TR')}</td>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:right;">${t.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
      <td style="padding:3px 5px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:right;">${t.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('');

  const tekMakbuz = `
<div style="width:198px;padding:10px;font-family:'Segoe UI',Arial,sans-serif;box-sizing:border-box;overflow:hidden;">
  <div style="text-align:center;margin-bottom:6px;">
    <img src="${LOGO_B64}" style="width:90px;display:block;margin:0 auto 3px;" />
    ${yoneticiAdSoyad ? `<div style="font-size:10px;color:#5c4f3d;margin-top:1px;">${yoneticiAdSoyad}</div>` : ''}
    ${yoneticiTel ? `<div style="font-size:10px;color:#5c4f3d;">Tel: ${yoneticiTel}</div>` : ''}
  </div>
  <hr style="border:none;border-top:1px dashed #d1d5db;margin:5px 0;" />
  <div style="font-size:9px;color:#888;margin-bottom:2px;letter-spacing:.5px;">TESLİMAT MAKBUZU</div>
  <div style="font-size:10px;margin-bottom:1px;"><b>Teslim Alan:</b> ${musteriIsim}</div>
  <div style="font-size:10px;margin-bottom:5px;"><b>Tarih:</b> ${fd(tarih)}</div>
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
  <div style="font-size:9px;color:#5c4f3d;margin-bottom:8px;">Ödeme: ${odemeStr}</div>
  <div style="display:flex;justify-content:space-between;margin-top:10px;">
    <div style="text-align:center;width:44%;">
      <div style="border-top:1px solid #2a2118;margin-bottom:2px;"></div>
      <div style="font-size:8px;color:#888;">Teslim Eden</div>
      <div style="font-size:9px;font-weight:600;margin-top:1px;word-break:break-all;">${yoneticiAdSoyad || 'İdooğlu Briket'}</div>
    </div>
    <div style="text-align:center;width:44%;">
      <div style="border-top:1px solid #2a2118;margin-bottom:2px;"></div>
      <div style="font-size:8px;color:#888;">Teslim Alan</div>
      <div style="font-size:9px;font-weight:600;margin-top:1px;word-break:break-all;">${musteriIsim}</div>
    </div>
  </div>
</div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Makbuz - ${musteriIsim}</title>
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


// ─── Hızlı Müşteri Ekle Modal ─────────────────────────────────────────────────
interface HizliMusteriModalProps {
  onKaydet: (m: Musteri) => void;
  onKapat: () => void;
}

function HizliMusteriModal({ onKaydet, onKapat }: HizliMusteriModalProps) {
  const [isim, setIsim] = useState('');
  const [tel, setTel] = useState('');

  function kaydet() {
    if (!isim.trim()) return;
    onKaydet({ id: uid(), isim: isim.trim(), tel: tel.trim() });
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-title">Hızlı Müşteri Ekle</div>
        <div className="frow">
          <div>
            <label>Müşteri Adı *</label>
            <input
              type="text"
              placeholder="Ad Soyad veya Firma"
              value={isim}
              onChange={e => setIsim(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && kaydet()}
              autoFocus
            />
          </div>
        </div>
        <div className="frow">
          <div>
            <label>Telefon</label>
            <input
              type="tel"
              placeholder="05xx..."
              value={tel}
              onChange={e => setTel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && kaydet()}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={!isim.trim()}>✓ Ekle</button>
        </div>
      </div>
    </div>
  );
}

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
interface SiparislerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

interface UrunSatiri { cesit: string; adet: string; fiyat: string; }
interface SeciliSiparis { siparisId: number; adet: string; }

function anaUrun(kalemler: Siparis[]): string {
  const briketler = kalemler.filter(s => ['10luk','15lik','20lik'].includes(s.cesit));
  if (briketler.length > 1) return 'Briket';
  if (briketler.length === 1) return SIP_CESIT_LABEL[briketler[0].cesit] || briketler[0].cesit;
  return SIP_CESIT_LABEL[kalemler[0].cesit] || kalemler[0].cesit;
}

function anaUrunTeslimat(kalemler: Teslimat[]): string {
  const briketler = kalemler.filter(t => ['10luk','15lik','20lik'].includes(t.cesit));
  if (briketler.length > 1) return 'Briket';
  if (briketler.length === 1) return SIP_CESIT_LABEL[briketler[0].cesit] || briketler[0].cesit;
  return SIP_CESIT_LABEL[kalemler[0].cesit] || kalemler[0].cesit;
}

function yerBilgisi(t: Teslimat): string {
  return [t.koy, t.adres].filter(Boolean).join(' • ') || t.bolge || '—';
}

function gunKaydir(tarih: string, gun: number): string {
  const d = new Date(tarih);
  d.setDate(d.getDate() + gun);
  return d.toISOString().slice(0, 10);
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function SiparislerPage({ data, onSave, showToast }: SiparislerProps) {
  // Sipariş formu
  const [musteri, setMusteri]     = useState('');
  const [tarih, setTarih]         = useState(today());
  const [koyAra, setKoyAra]       = useState('');
  const [koySecili, setKoySecili] = useState('');
  const [adres, setAdres]         = useState('');
  const [notVal, setNotVal]       = useState('');
  const [showDd, setShowDd]       = useState(false);
  const [urunler, setUrunler]     = useState<UrunSatiri[]>([{ cesit: '20lik', adet: '', fiyat: varsayilanFiyat('20lik', 'merkez', data) }]);
  const [showHizliMusteri, setShowHizliMusteri] = useState(false);

  // Teslimat formu
  const [tMusteri, setTMusteri]               = useState('');
  const [seciliSiparisler, setSeciliSiparisler] = useState<SeciliSiparis[]>([]);
  const [tOdeme, setTOdeme]                   = useState('pesin');
  const [tTahsil, setTTahsil]                 = useState('');
  const [tTarih, setTTarih]                   = useState(today());

  // Tablo aç/kapa
  const [acikSipGruplari, setAcikSipGruplari] = useState<Set<number>>(new Set());
  const [acikTesGruplari, setAcikTesGruplari] = useState<Set<string>>(new Set());

  // Teslimat filtre
  const [tesSiralama, setTesSiralama]     = useState<'yeni' | 'eski'>('yeni');
  const [tesFiltremod, setTesFiltremod]   = useState<'hepsi' | 'gun' | 'aralik'>('hepsi');
  const [tesGunTarih, setTesGunTarih]     = useState(today());
  const [tesBaslangic, setTesBaslangic]   = useState('');
  const [tesBitis, setTesBitis]           = useState('');
  const [tesMusteriAra, setTesMusteriAra] = useState('');
  const [tesKoyAra, setTesKoyAra]         = useState('');

  // Son eklenen teslimatlar (makbuz için)
  const [sonTeslimatlar, setSonTeslimatlar] = useState<Teslimat[] | null>(null);

  // Yönetici bilgileri
  const yoneticiAdSoyad = [data.yonetici?.ad, data.yonetici?.soyad].filter(Boolean).join(' ');
  const yoneticiTel     = data.yonetici?.tel || '';

  // ─── Sipariş formu ────────────────────────────────────────────────────────
  function urunEkle() {
    setUrunler(u => [...u, { cesit: '20lik', adet: '', fiyat: varsayilanFiyat('20lik', 'merkez', data) }]);
  }

  function urunSil(i: number) {
    if (urunler.length <= 1) { showToast('En az 1 ürün satırı olmalı', false); return; }
    setUrunler(u => u.filter((_, idx) => idx !== i));
  }

  function urunGuncelle(i: number, field: keyof UrunSatiri, val: string) {
    setUrunler(prev => prev.map((x, idx) => {
      if (idx !== i) return x;
      const updated = { ...x, [field]: val };
      // Ürün çeşidi değiştiğinde fiyatı güncelle (eğer fiyat boşsa veya eski varsayılana eşitse)
      if (field === 'cesit') {
        const koyObj = data.koyler.find(k => k.isim === koySecili);
        const bolge  = koyObj?.bolge || 'merkez';
        const yeniFiyat = varsayilanFiyat(val, bolge, data);
        const eskiFiyat = varsayilanFiyat(x.cesit, bolge, data);
        if (!x.fiyat || x.fiyat === eskiFiyat) {
          updated.fiyat = yeniFiyat;
        }
      }
      return updated;
    }));
  }

  // Köy değişince fiyatları güncelle
  function koySecildiCallback(koyIsim: string) {
    setKoySecili(koyIsim);
    const koyObj = data.koyler.find(k => k.isim === koyIsim);
    const bolge  = koyObj?.bolge || 'merkez';
    setUrunler(prev => prev.map(u => {
      const yeniFiyat = varsayilanFiyat(u.cesit, bolge, data);
      const eskiFiyat = varsayilanFiyat(u.cesit, 'merkez', data);
      // Sadece varsayılan ya da boşsa güncelle
      if (!u.fiyat || u.fiyat === eskiFiyat) {
        return { ...u, fiyat: yeniFiyat };
      }
      return u;
    }));
  }

  function siparisKaydet() {
    if (!musteri) { showToast('Müşteri seçin', false); return; }
    const mid     = parseInt(musteri);
    const koyObj  = data.koyler.find(k => k.isim === koySecili);
    const bolge   = koyObj?.bolge || '';
    const gecerli = urunler.filter(u => u.cesit && parseFloat(u.adet) > 0 && parseFloat(u.fiyat) > 0);
    if (!gecerli.length) { showToast('En az 1 ürün ekleyin', false); return; }
    const yeniSiparisler: Siparis[] = gecerli.map(u => ({
      id: uid(), musteriId: mid,
      adet: parseFloat(u.adet), gonderilen: 0,
      cesit: u.cesit, bolge, koy: koySecili, adres,
      fiyat: parseFloat(u.fiyat),
      toplamTutar: parseFloat(u.adet) * parseFloat(u.fiyat),
      birim: SIP_BIRIM[u.cesit] || 'adet',
      tarih, not: notVal,
    }));
    onSave({ ...data, siparisler: [...data.siparisler, ...yeniSiparisler] });
    setUrunler([{ cesit: '20lik', adet: '', fiyat: varsayilanFiyat('20lik', 'merkez', data) }]);
    setNotVal(''); setAdres(''); setKoyAra(''); setKoySecili('');
    showToast(gecerli.length > 1 ? `${gecerli.length} sipariş eklendi ✓` : 'Sipariş eklendi ✓');
  }

  function siparisSil(id: number) {
    onSave({ ...data, siparisler: data.siparisler.filter(s => s.id !== id) });
    showToast('Sipariş silindi');
  }

  // ─── Hızlı müşteri ────────────────────────────────────────────────────────
  function hizliMusteriEkle(m: Musteri) {
    const yeniData = { ...data, musteriler: [...data.musteriler, m] };
    onSave(yeniData);
    setMusteri(String(m.id));
    setShowHizliMusteri(false);
    showToast(`${m.isim} eklendi ✓`);
  }

  // ─── Teslimat formu ───────────────────────────────────────────────────────
  function handleTMusteriSec(val: string) {
    setTMusteri(val);
    setSeciliSiparisler([]);
    setTTahsil('');
  }

  const tMusteriAcikSiparisler = tMusteri
    ? data.siparisler.filter(s => s.musteriId === parseInt(tMusteri) && s.gonderilen < s.adet)
    : [];

  function toggleSiparis(sipId: number) {
    setSeciliSiparisler(prev => {
      const var_ = prev.find(s => s.siparisId === sipId);
      if (var_) return prev.filter(s => s.siparisId !== sipId);
      const sip   = data.siparisler.find(s => s.id === sipId);
      const kalan = sip ? sip.adet - sip.gonderilen : 0;
      return [...prev, { siparisId: sipId, adet: String(kalan) }];
    });
  }

  function seciliAdetGuncelle(sipId: number, val: string) {
    setSeciliSiparisler(prev => prev.map(s => s.siparisId === sipId ? { ...s, adet: val } : s));
  }

  const toplamTutar = seciliSiparisler.reduce((sum, ss) => {
    const sip = data.siparisler.find(s => s.id === ss.siparisId);
    if (!sip) return sum;
    return sum + (parseFloat(ss.adet) || 0) * sip.fiyat;
  }, 0);

  function teslimatKaydet() {
    if (!tMusteri) { showToast('Müşteri seçin', false); return; }
    if (!seciliSiparisler.length) { showToast('En az 1 sipariş seçin', false); return; }
    for (const ss of seciliSiparisler) {
      const sip = data.siparisler.find(s => s.id === ss.siparisId);
      if (!sip) continue;
      const adet = parseFloat(ss.adet);
      if (!adet || adet <= 0) { showToast(`${SIP_CESIT_LABEL[sip.cesit] || sip.cesit} için geçerli adet girin`, false); return; }
      if (adet > sip.adet - sip.gonderilen) { showToast(`${SIP_CESIT_LABEL[sip.cesit] || sip.cesit}: en fazla ${sip.adet - sip.gonderilen} gönderilebilir`, false); return; }
    }
    const yeniTeslimatlar: Teslimat[] = seciliSiparisler.map(ss => {
      const sip = data.siparisler.find(s => s.id === ss.siparisId)!;
      const adet = parseFloat(ss.adet);
      const tutar = adet * sip.fiyat;
      const buTahsil = tOdeme === 'pesin' ? tutar
        : tOdeme === 'kismi' ? parseFloat(((tutar / toplamTutar) * (parseFloat(tTahsil) || 0)).toFixed(2))
        : 0;
      return {
        id: uid(), siparisId: sip.id, musteriId: sip.musteriId,
        cesit: sip.cesit, bolge: sip.bolge, koy: sip.koy, adres: sip.adres || '',
        birimFiyat: sip.fiyat, adet, tutar, tahsil: buTahsil,
        odemeDurumu: tOdeme, tarih: tTarih || today(), birim: sip.birim || 'adet',
      };
    });
    const yeniSiparisler = data.siparisler.map(s => {
      const ss = seciliSiparisler.find(x => x.siparisId === s.id);
      if (!ss) return s;
      return { ...s, gonderilen: s.gonderilen + parseFloat(ss.adet) };
    });
    onSave({ ...data, siparisler: yeniSiparisler, teslimatlar: [...data.teslimatlar, ...yeniTeslimatlar] });

    // Makbuzu hemen aç
    const m = data.musteriler.find(x => x.id === parseInt(tMusteri));
    makbuzYazdir({
      musteriIsim: m?.isim || '?',
      kalemler: yeniTeslimatlar,
      tarih: tTarih || today(),
      yoneticiAdSoyad,
      yoneticiTel,
    });

    setSeciliSiparisler([]);
    setTTahsil('');
    setSonTeslimatlar(yeniTeslimatlar);
    showToast(`${yeniTeslimatlar.length} kalem teslimat eklendi ✓`);
  }

  const filtreKoyler = data.koyler.filter(k =>
    !koyAra || k.isim.toLowerCase().includes(koyAra.toLowerCase())
  );

  const sipGruplari = useMemo(() => {
    const map = new Map<number, Siparis[]>();
    for (const s of data.siparisler) {
      if (!map.has(s.musteriId)) map.set(s.musteriId, []);
      map.get(s.musteriId)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aId = Math.max(...a[1].map(s => s.id));
      const bId = Math.max(...b[1].map(s => s.id));
      return bId - aId;
    });
  }, [data.siparisler]);

  function toggleSipGrup(musteriId: number) {
    setAcikSipGruplari(prev => {
      const next = new Set(prev);
      next.has(musteriId) ? next.delete(musteriId) : next.add(musteriId);
      return next;
    });
  }

  const filtreliTeslimatlar = useMemo(() => {
    let list = [...data.teslimatlar];
    if (tesFiltremod === 'gun') list = list.filter(t => t.tarih === tesGunTarih);
    else if (tesFiltremod === 'aralik') {
      if (tesBaslangic) list = list.filter(t => t.tarih >= tesBaslangic);
      if (tesBitis)     list = list.filter(t => t.tarih <= tesBitis);
    }
    if (tesMusteriAra.trim()) {
      const ara = tesMusteriAra.trim().toLowerCase();
      list = list.filter(t => {
        const m = data.musteriler.find(x => x.id === t.musteriId);
        return m?.isim.toLowerCase().includes(ara);
      });
    }
    if (tesKoyAra.trim()) {
      const ara = tesKoyAra.trim().toLowerCase();
      list = list.filter(t =>
        (t.koy || '').toLowerCase().includes(ara) ||
        (t.adres || '').toLowerCase().includes(ara) ||
        (t.bolge || '').toLowerCase().includes(ara)
      );
    }
    list.sort((a, b) => tesSiralama === 'yeni'
      ? b.tarih.localeCompare(a.tarih) || b.id - a.id
      : a.tarih.localeCompare(b.tarih) || a.id - b.id
    );
    return list;
  }, [data.teslimatlar, data.musteriler, tesFiltremod, tesGunTarih, tesBaslangic, tesBitis, tesSiralama, tesMusteriAra, tesKoyAra]);

  const tesGruplari = useMemo(() => {
    const map = new Map<string, Teslimat[]>();
    const keyOrder: string[] = [];
    for (const t of filtreliTeslimatlar) {
      const key = `${t.musteriId}__${t.tarih}`;
      if (!map.has(key)) { map.set(key, []); keyOrder.push(key); }
      map.get(key)!.push(t);
    }
    return keyOrder.map(k => ({ key: k, kalemler: map.get(k)! }));
  }, [filtreliTeslimatlar]);

  function toggleTesGrup(key: string) {
    setAcikTesGruplari(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function sipDurumBadge(kalemler: Siparis[]) {
    if (kalemler.every(s => s.gonderilen >= s.adet)) return { cls: 'b-green', label: 'Tamamlandı' };
    if (kalemler.every(s => s.gonderilen === 0))     return { cls: 'b-red',   label: 'Bekliyor'   };
    return { cls: 'b-yellow', label: 'Kısmi' };
  }

  function tesDurumBadge(kalemler: Teslimat[]) {
    const topTutar  = kalemler.reduce((s, t) => s + t.tutar,  0);
    const topTahsil = kalemler.reduce((s, t) => s + t.tahsil, 0);
    const k = topTutar - topTahsil;
    if (k <= 0)        return { cls: 'b-green',  label: 'Ödendi' };
    if (topTahsil > 0) return { cls: 'b-yellow', label: 'Kısmi'  };
    return { cls: 'b-red', label: 'Borçlu' };
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {showHizliMusteri && (
        <HizliMusteriModal
          onKaydet={hizliMusteriEkle}
          onKapat={() => setShowHizliMusteri(false)}
        />
      )}

      <div className="two-col">
        {/* ── Sipariş formu ── */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Yeni Sipariş</div>
          </div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Müşteri</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <MusteriSecici
                      musteriler={data.musteriler}
                      value={musteri}
                      onChange={setMusteri}
                      placeholder="— Müşteri seç —"
                    />
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowHizliMusteri(true)}
                    title="Yeni müşteri ekle"
                    style={{ padding: '8px 10px', flexShrink: 0 }}
                  >
                    + Yeni
                  </button>
                </div>
              </div>
              <div>
                <label>Tarih</label>
                <input type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
              </div>
            </div>

            <div className="frow" style={{ position: 'relative' }}>
              <div>
                <label>Teslimat Yeri (Köy / Bölge)</label>
                <input
                  type="text" placeholder="Arayın..."
                  value={koyAra}
                  onChange={e => { setKoyAra(e.target.value); setShowDd(true); }}
                  onFocus={() => setShowDd(true)}
                  onBlur={() => setTimeout(() => setShowDd(false), 200)}
                />
                {showDd && filtreKoyler.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 100, maxHeight: 160, overflowY: 'auto' }}>
                    {filtreKoyler.map(k => (
                      <div key={k.id}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                        onMouseDown={() => { setKoyAra(k.isim); koySecildiCallback(k.isim); setShowDd(false); }}>
                        {k.isim}
                        <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{k.bolge}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="frow">
              <div>
                <label>Detaylı Adres</label>
                <input type="text" placeholder="Sokak, isim..." value={adres} onChange={e => setAdres(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ marginBottom: 8, display: 'block' }}>Ürünler</label>
              {urunler.map((u, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                  <div>
                    {i === 0 && <label>Ürün Çeşidi</label>}
                    <select value={u.cesit} onChange={e => urunGuncelle(i, 'cesit', e.target.value)}>
                      <optgroup label="— Briket —">
                        <option value="10luk">Briket 10&apos;luk</option>
                        <option value="15lik">Briket 15&apos;lik</option>
                        <option value="20lik">Briket 20&apos;lik</option>
                      </optgroup>
                      <optgroup label="— Diğer —">
                        <option value="cimento">Çimento</option>
                        <option value="kum">Kum</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label>Miktar</label>}
                    <input type="number" placeholder="0" value={u.adet} onChange={e => urunGuncelle(i, 'adet', e.target.value)} />
                  </div>
                  <div>
                    {i === 0 && <label>Birim Fiyat</label>}
                    <input
                      type="number" step="0.01"
                      placeholder="0.00"
                      value={u.fiyat}
                      onChange={e => urunGuncelle(i, 'fiyat', e.target.value)}
                    />
                  </div>
                  <div style={{ paddingBottom: 1 }}>
                    <button className="btn btn-danger btn-sm" onClick={() => urunSil(i)}>✕</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={urunEkle}>+ Ürün Ekle</button>
            </div>

            <div className="frow">
              <div>
                <label>Sipariş Notu</label>
                <textarea placeholder="İsteğe bağlı not..." value={notVal} onChange={e => setNotVal(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={siparisKaydet}>✦ Sipariş Kaydet</button>
          </div>
        </div>

        {/* ── Teslimat formu ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Teslimat Yap</div></div>
          <div className="panel-body">
            <div className="frow">
              <div>
                <label>Müşteri</label>
                <MusteriSecici
                  musteriler={data.musteriler.map(m => {
                    const acik = data.siparisler.filter(s => s.musteriId === m.id && s.gonderilen < s.adet).length;
                    return { ...m, isim: m.isim + (acik > 0 ? ` (${acik} açık)` : '') };
                  })}
                  value={tMusteri} onChange={handleTMusteriSec} placeholder="— Müşteri seç —"
                />
              </div>
            </div>

            {tMusteri && tMusteriAcikSiparisler.length === 0 && (
              <div style={{ padding: '10px 0', color: 'var(--text3)', fontSize: 13 }}>Bu müşterinin açık siparişi yok.</div>
            )}

            {tMusteri && tMusteriAcikSiparisler.length > 0 && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ marginBottom: 8, display: 'block' }}>Teslim Edilecek Siparişler</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tMusteriAcikSiparisler.map(sip => {
                      const secili = seciliSiparisler.find(s => s.siparisId === sip.id);
                      const kalan  = sip.adet - sip.gonderilen;
                      return (
                        <div key={sip.id} style={{ border: `1px solid ${secili ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '10px 12px', background: secili ? 'rgba(45,122,79,.06)' : 'var(--bg)', transition: 'all .15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: secili ? 8 : 0 }}>
                            <input type="checkbox" id={`sip-${sip.id}`} checked={!!secili} onChange={() => toggleSiparis(sip.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                            <label htmlFor={`sip-${sip.id}`} style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{SIP_CESIT_LABEL[sip.cesit] || sip.cesit}</span>
                              <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>kalan: {kalan.toLocaleString('tr-TR')} {sip.birim || 'adet'} • {tl(sip.fiyat)}/{sip.birim || 'adet'}</span>
                              {sip.koy && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>📍 {sip.koy}</span>}
                            </label>
                          </div>
                          {secili && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 26 }}>
                              <div>
                                <label style={{ fontSize: 11 }}>Bu Sefer Gönderilecek</label>
                                <input type="number" placeholder={`max ${kalan}`} value={secili.adet} onChange={e => seciliAdetGuncelle(sip.id, e.target.value)} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                                <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>= {tl((parseFloat(secili.adet) || 0) * sip.fiyat)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {seciliSiparisler.length > 0 && (
                  <>
                    <div style={{ background: 'rgba(45,122,79,.08)', border: '1px solid rgba(45,122,79,.25)', borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                      <span style={{ color: 'var(--text2)' }}>{seciliSiparisler.length} kalem seçildi</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Toplam: {tl(toplamTutar)}</span>
                    </div>
                    <div className="frow c2">
                      <div>
                        <label>Tarih</label>
                        <input type="date" value={tTarih} onChange={e => setTTarih(e.target.value)} />
                      </div>
                      <div>
                        <label>Ödeme Durumu</label>
                        <select value={tOdeme} onChange={e => setTOdeme(e.target.value)}>
                          <option value="pesin">Peşin</option>
                          <option value="kismi">Kısmi</option>
                          <option value="veresiye">Veresiye</option>
                        </select>
                      </div>
                    </div>
                    {tOdeme === 'kismi' && (
                      <div className="frow">
                        <div>
                          <label>Alınan Tutar (TL)</label>
                          <input type="number" placeholder="0.00" value={tTahsil} onChange={e => setTTahsil(e.target.value)} />
                        </div>
                      </div>
                    )}
                    <button className="btn btn-success" onClick={teslimatKaydet}>
                      ✓ Teslimat Yap + Makbuz ({seciliSiparisler.length} kalem)
                    </button>
                  </>
                )}
              </>
            )}

            {!tMusteri && (
              <div style={{ padding: '20px 0', color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                Teslimat yapmak için önce müşteri seçin.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SİPARİŞLER ═══ */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Siparişler</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Müşteri</th><th>Ana Ürün</th><th>Toplam Tutar</th><th>İlerleme</th><th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sipGruplari.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Sipariş yok</td></tr>
                ) : sipGruplari.flatMap(([musteriId, kalemler]) => {
                  const m       = data.musteriler.find(x => x.id === musteriId);
                  const acik    = acikSipGruplari.has(musteriId);
                  const badge   = sipDurumBadge(kalemler);
                  const topTutar = kalemler.reduce((s, k) => s + k.toplamTutar, 0);
                  const topAdet  = kalemler.reduce((s, k) => s + k.adet, 0);
                  const topGond  = kalemler.reduce((s, k) => s + k.gonderilen, 0);
                  const rows = [
                    <tr key={`g-${musteriId}`} onClick={() => toggleSipGrup(musteriId)} style={{ cursor: 'pointer', background: acik ? 'rgba(45,122,79,.04)' : undefined }}>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', userSelect: 'none' }}>{acik ? '▾' : '▸'}</td>
                      <td className="td-bold">{m?.isim || '?'}</td>
                      <td><span className="badge b-yellow">{anaUrun(kalemler)}</span>{kalemler.length > 1 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>+{kalemler.length - 1} kalem</span>}</td>
                      <td className="td-mono">{tl(topTutar)}</td>
                      <td className="td-mono" style={{ fontSize: 12 }}>{topGond.toLocaleString('tr-TR')} / {topAdet.toLocaleString('tr-TR')}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    </tr>,
                  ];
                  if (acik) {
                    kalemler.forEach(s => {
                      const kalan  = s.adet - s.gonderilen;
                      const sBadge = kalan === 0 ? 'b-green' : s.gonderilen > 0 ? 'b-yellow' : 'b-red';
                      const sLabel = kalan === 0 ? 'Tamamlandı' : s.gonderilen > 0 ? 'Kısmi' : 'Bekliyor';
                      rows.push(
                        <tr key={`s-${s.id}`} style={{ background: 'rgba(0,0,0,.025)' }}>
                          <td></td>
                          <td colSpan={1} style={{ paddingLeft: 28, fontSize: 12, color: 'var(--text3)' }}>📍 {s.koy || s.adres || '—'}<span style={{ marginLeft: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{fd(s.tarih)}</span></td>
                          <td><span className="badge b-yellow">{SIP_CESIT_LABEL[s.cesit] || s.cesit}</span></td>
                          <td className="td-mono">{tl(s.toplamTutar)}</td>
                          <td className="td-mono" style={{ fontSize: 12 }}>{s.gonderilen.toLocaleString('tr-TR')} / {s.adet.toLocaleString('tr-TR')}</td>
                          <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className={`badge ${sBadge}`}>{sLabel}</span>
                            <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); siparisSil(s.id); }}>Sil</button>
                          </td>
                        </tr>
                      );
                    });
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ TESLİMAT GEÇMİŞİ ═══ */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Teslimat Geçmişi</div></div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['yeni','eski'] as const).map(s => (
                <button key={s} className={`btn btn-sm ${tesSiralama === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTesSiralama(s)}>
                  {s === 'yeni' ? '↓ En Yeni' : '↑ En Eski'}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
            {(['hepsi','aralik'] as const).map(val => (
              <button key={val} className={`btn btn-sm ${tesFiltremod === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTesFiltremod(val)}>
                {val === 'hepsi' ? 'Tümü' : 'Aralık'}
              </button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => { setTesGunTarih(prev => gunKaydir(prev, -1)); setTesFiltremod('gun'); }} style={{ padding: '4px 10px', fontWeight: 700 }}>‹</button>
              <div style={{ padding: '4px 12px', background: tesFiltremod === 'gun' ? 'rgba(45,122,79,.12)' : 'var(--surface)', border: `1px solid ${tesFiltremod === 'gun' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', minWidth: 100, textAlign: 'center', color: tesGunTarih === today() ? 'var(--accent)' : 'var(--text)', fontWeight: tesGunTarih === today() ? 700 : 400, cursor: 'pointer' }}
                onClick={() => { setTesGunTarih(today()); setTesFiltremod('gun'); }}>
                {tesGunTarih === today() ? 'Bugün' : fd(tesGunTarih)}
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => { setTesGunTarih(prev => gunKaydir(prev, +1)); setTesFiltremod('gun'); }} style={{ padding: '4px 10px', fontWeight: 700 }}>›</button>
            </div>
            {tesFiltremod === 'aralik' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={tesBaslangic} onChange={e => setTesBaslangic(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                <input type="date" value={tesBitis} onChange={e => setTesBitis(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{tesGruplari.length} kayıt</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
              <input type="text" placeholder="🔍 Müşteri ara..." value={tesMusteriAra} onChange={e => setTesMusteriAra(e.target.value)} style={{ width: '100%', padding: '5px 28px 5px 10px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }} />
              {tesMusteriAra && <button onClick={() => setTesMusteriAra('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>}
            </div>
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
              <input type="text" placeholder="🔍 Köy / yer ara..." value={tesKoyAra} onChange={e => setTesKoyAra(e.target.value)} style={{ width: '100%', padding: '5px 28px 5px 10px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }} />
              {tesKoyAra && <button onClick={() => setTesKoyAra('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>}
            </div>
          </div>
        </div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Tarih</th><th>Müşteri</th><th>Yer</th><th>Ana Ürün</th>
                  <th>Toplam</th><th>Tahsil</th><th>Kalan</th><th>Durum</th>
                  <th style={{ width: 60 }}>🖨️</th>
                </tr>
              </thead>
              <tbody>
                {tesGruplari.length === 0 ? (
                  <tr><td colSpan={10} className="empty">Kayıt yok</td></tr>
                ) : tesGruplari.flatMap(({ key, kalemler }) => {
                  const m         = data.musteriler.find(x => x.id === kalemler[0].musteriId);
                  const acik      = acikTesGruplari.has(key);
                  const topTutar  = kalemler.reduce((s, t) => s + t.tutar,  0);
                  const topTahsil = kalemler.reduce((s, t) => s + t.tahsil, 0);
                  const topKalan  = topTutar - topTahsil;
                  const badge     = tesDurumBadge(kalemler);
                  const coklu     = kalemler.length > 1;
                  const yerOzet   = coklu
                    ? (() => { const y = [...new Set(kalemler.map(t => t.koy || t.bolge || '').filter(Boolean))]; return y.length === 1 ? y[0] : `${y.length} yer`; })()
                    : yerBilgisi(kalemler[0]);
                  const rows = [
                    <tr key={`tg-${key}`} onClick={() => coklu && toggleTesGrup(key)} style={{ cursor: coklu ? 'pointer' : 'default', background: acik ? 'rgba(45,122,79,.04)' : undefined }}>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', userSelect: 'none' }}>{coklu ? (acik ? '▾' : '▸') : ''}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{fd(kalemler[0].tarih)}</td>
                      <td className="td-bold">{m?.isim || '?'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {yerOzet ? <span title={yerOzet}>📍 {yerOzet}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td><span className="badge b-yellow">{anaUrunTeslimat(kalemler)}</span>{coklu && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>+{kalemler.length - 1}</span>}</td>
                      <td className="td-mono">{tl(topTutar)}</td>
                      <td className="td-mono positive">{tl(topTahsil)}</td>
                      <td className={`td-mono ${topKalan > 0 ? 'negative' : ''}`}>{tl(topKalan)}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" title="Makbuz Yazdır"
                          onClick={e => { e.stopPropagation(); makbuzYazdir({ musteriIsim: m?.isim || '?', kalemler, tarih: kalemler[0].tarih, yoneticiAdSoyad, yoneticiTel }); }}>
                          🖨️
                        </button>
                      </td>
                    </tr>,
                  ];
                  if (acik) {
                    kalemler.forEach(t => {
                      const k  = t.tutar - t.tahsil;
                      const bd = k <= 0 ? 'b-green' : t.tahsil > 0 ? 'b-yellow' : 'b-red';
                      const bl = k <= 0 ? 'Ödendi'  : t.tahsil > 0 ? 'Kısmi'   : 'Borçlu';
                      rows.push(
                        <tr key={`t-${t.id}`} style={{ background: 'rgba(0,0,0,.025)' }}>
                          <td></td><td></td>
                          <td style={{ paddingLeft: 28, fontSize: 12, color: 'var(--text3)' }}>{[t.koy, t.adres].filter(Boolean).join(' • ') || t.bolge || '—'}</td>
                          <td style={{ fontSize: 12 }}>{yerBilgisi(t) !== '—' ? <span>📍 {yerBilgisi(t)}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                          <td><span className="badge b-yellow">{SIP_CESIT_LABEL[t.cesit] || t.cesit}</span><span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6, fontFamily: 'JetBrains Mono, monospace' }}>{t.adet.toLocaleString('tr-TR')} {t.birim || 'adet'}</span></td>
                          <td className="td-mono">{tl(t.tutar)}</td>
                          <td className="td-mono positive">{tl(t.tahsil)}</td>
                          <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{tl(k)}</td>
                          <td><span className={`badge ${bd}`}>{bl}</span></td>
                          <td></td>
                        </tr>
                      );
                    });
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sonuncu teslimat makbuz tekrar butonu */}
      {sonTeslimatlar && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm"
            onClick={() => {
              const m = data.musteriler.find(x => x.id === sonTeslimatlar[0].musteriId);
              makbuzYazdir({ musteriIsim: m?.isim || '?', kalemler: sonTeslimatlar, tarih: sonTeslimatlar[0].tarih, yoneticiAdSoyad, yoneticiTel });
            }}>
            🖨️ Son Makbuzu Tekrar Yazdır
          </button>
        </div>
      )}
    </div>
  );
}