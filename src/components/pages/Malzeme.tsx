'use client';
import { useState, useEffect } from 'react';
import type { AppData, Malzeme } from '@/types';
import { tl, fd, today, uid, TURADI, saveMalzeme, deleteMalzeme, saveTedarikOdeme, deleteTedarikOdeme, saveTedarikci, deleteTedarikci } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';

interface MalzemeProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

interface TirSatiri { miktar: string; fiyat: string; }

type GrafikAralik = 'haftalik' | 'aylik' | '3ay' | '6ay' | 'yillik' | 'tumu';

const ARALIK_LABEL: Record<GrafikAralik, string> = {
  haftalik: 'Haftalık',
  aylik: 'Aylık',
  '3ay': '3 Ay',
  '6ay': '6 Ay',
  yillik: 'Yıllık',
  tumu: 'Tümü',
};

function varsayilanTedarikci(data: AppData, tur: 'micir' | 'cimento'): string {
  const eslesen = data.tedarikciListesi.filter(t => t.tur === tur);
  return eslesen.length >= 1 ? String(eslesen[0].id) : '';
}

// Tarih aralığı filtresi
function aralikBaslangic(aralik: GrafikAralik): Date {
  const now = new Date();
  switch (aralik) {
    case 'haftalik': { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case 'aylik':    { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    case '3ay':      { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    case '6ay':      { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    case 'yillik':   { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    case 'tumu':     return new Date('2000-01-01');
  }
}

// Grafik verisi: tarih → toplam miktar
function grafikVerisi(malzemeler: Malzeme[], tur: 'micir' | 'cimento', aralik: GrafikAralik) {
  const bas = aralikBaslangic(aralik);
  const filtered = malzemeler
    .filter(m => m.tur === tur && new Date(m.tarih) >= bas)
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  // Günlere göre grupla
  const gruplar: Record<string, number> = {};
  for (const m of filtered) {
    gruplar[m.tarih] = (gruplar[m.tarih] || 0) + m.toplamMiktar;
  }

  // Haftalık ve üstü için hafta/ay bazında grupla
  if (aralik === 'haftalik') {
    return Object.entries(gruplar).map(([tarih, miktar]) => ({
      etiket: tarih.slice(5).replace('-', '/'), // MM/DD
      miktar,
      tarih,
    }));
  }
  if (aralik === 'aylik') {
    // Haftalar halinde grupla
    const haftalar: Record<string, number> = {};
    for (const [tarih, miktar] of Object.entries(gruplar)) {
      const d = new Date(tarih);
      const haftaNo = Math.floor((d.getDate() - 1) / 7) + 1;
      const key = `${tarih.slice(0, 7)}-H${haftaNo}`;
      haftalar[key] = (haftalar[key] || 0) + miktar;
    }
    return Object.entries(haftalar).map(([k, miktar]) => ({
      etiket: k.slice(5), tarih: k, miktar,
    }));
  }
  // 3ay, 6ay, yillik, tumu → aylık grupla
  const aylar: Record<string, number> = {};
  for (const [tarih, miktar] of Object.entries(gruplar)) {
    const ay = tarih.slice(0, 7);
    aylar[ay] = (aylar[ay] || 0) + miktar;
  }
  return Object.entries(aylar).sort().map(([ay, miktar]) => ({
    etiket: ay.slice(5) + '/' + ay.slice(2, 4), tarih: ay, miktar,
  }));
}

// Alan grafik SVG bileşeni
function AlanGrafik({ veriler, renk, birim }: {
  veriler: { etiket: string; miktar: number }[];
  renk: string;
  birim: string;
}) {
  if (!veriler.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text3)', fontSize: 13 }}>
        Bu aralıkta veri yok
      </div>
    );
  }

  const W = 580, H = 140, PAD_L = 52, PAD_R = 16, PAD_T = 14, PAD_B = 32;
  const maxVal = Math.max(...veriler.map(v => v.miktar), 1);
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const pts = veriler.map((v, i) => {
    const x = PAD_L + (veriler.length === 1 ? chartW / 2 : (i / (veriler.length - 1)) * chartW);
    const y = PAD_T + chartH - (v.miktar / maxVal) * chartH;
    return { x, y, ...v };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = [
    `M ${pts[0].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)}`,
    ...pts.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)}`,
    'Z',
  ].join(' ');

  // Y eksen etiketleri
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    val: maxVal * r,
    y: PAD_T + chartH - r * chartH,
  }));

  // X eksen: max 8 etiket göster
  const step = Math.max(1, Math.ceil(pts.length / 8));
  const xLabels = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

  const gradId = `grad-${renk.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={renk} stopOpacity="0.35" />
          <stop offset="100%" stopColor={renk} stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Grid yatay çizgiler */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={PAD_L - 6} y={t.y + 4} textAnchor="end"
            fontSize="9" fill="var(--text3)" fontFamily="IBM Plex Mono, monospace">
            {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(t.val < 10 ? 1 : 0)}
          </text>
        </g>
      ))}

      {/* Alan */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Çizgi */}
      <path d={linePath} fill="none" stroke={renk} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Nokta */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={renk} stroke="var(--surface)" strokeWidth="1.5">
          <title>{p.etiket}: {p.miktar.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {birim}</title>
        </circle>
      ))}

      {/* X etiketler */}
      {xLabels.map((p, i) => (
        <text key={i} x={p.x} y={H - 6} textAnchor="middle"
          fontSize="9" fill="var(--text3)" fontFamily="IBM Plex Mono, monospace">
          {p.etiket}
        </text>
      ))}

      {/* Birim etiketi */}
      <text x={PAD_L - 6} y={PAD_T - 4} textAnchor="end"
        fontSize="8" fill="var(--text3)" fontFamily="IBM Plex Mono, monospace">
        {birim}
      </text>
    </svg>
  );
}

export default function MalzemePage({ data, onSave, showToast }: MalzemeProps) {
  const [tur, setTur] = useState<'micir' | 'cimento'>('micir');
  const [tarih, setTarih] = useState(today());
  const [tirlar, setTirlar] = useState<TirSatiri[]>([{ miktar: '', fiyat: '' }]);
  const [tedarikci, setTedarikci] = useState(() => varsayilanTedarikci(data, 'micir'));
  const [notVal, setNotVal] = useState('');

  const [tedIsim, setTedIsim] = useState('');
  const [tedTur, setTedTur] = useState<'micir' | 'cimento'>('micir');

  const [gbTur, setGbTur] = useState<'micir' | 'cimento'>('micir');
  const [gbTedarikci, setGbTedarikci] = useState(() => varsayilanTedarikci(data, 'micir'));
  const [gbBorc, setGbBorc] = useState('');
  const [gbTarih, setGbTarih] = useState('');
  const [gbMiktar, setGbMiktar] = useState('');
  const [gbNot, setGbNot] = useState('');
  const [gbDetayAcik, setGbDetayAcik] = useState(false);

  const [tpTedarik, setTpTedarik] = useState('');
  const [tpTutar, setTpTutar] = useState('');
  const [tpTarih, setTpTarih] = useState(today());
  const [tpAciklama, setTpAciklama] = useState('');
  const [sonOdeme, setSonOdeme] = useState<{
    tedId: number; tedIsim: string; tutar: number; tarih: string; aciklama: string; no: string;
  } | null>(null);

  // Çoklu seçim & silme
  const [secili, setSecili] = useState<Set<number>>(new Set());
  const [malzemeSilOnay, setMalzemeSilOnay] = useState(false);

  // Ödeme silme onay
  const [odemeOnay, setOdemeOnay] = useState<{ acik: boolean; odemeId: number | null; bilgi: string }>({
    acik: false, odemeId: null, bilgi: '',
  });

  // Grafik
  const [micirAralik, setMicirAralik] = useState<GrafikAralik>('haftalik');
  const [cimentoAralik, setCimentoAralik] = useState<GrafikAralik>('haftalik');

  const birimLbl = tur === 'cimento' ? 'Miktar (torba)' : 'Miktar (ton)';
  const tarife = tur === 'micir' ? data.ayarlar.micirFiyat : data.ayarlar.cimentoFiyat;
  const turTedarikci   = data.tedarikciListesi.filter(t => t.tur === tur);
  const gbTurTedarikci = data.tedarikciListesi.filter(t => t.tur === gbTur);

  // Tür değişince tedarikçiyi otomatik seç
  function handleTurDegis(yeniTur: 'micir' | 'cimento') {
    setTur(yeniTur);
    setTirlar([{ miktar: '', fiyat: '' }]);
    setTedarikci(varsayilanTedarikci(data, yeniTur));
  }

  // data değişince de tedarikçiyi güncelle (yeni tedarikçi eklendiyse)
  useEffect(() => {
    setTedarikci(prev => {
      const mevcut = data.tedarikciListesi.find(t => String(t.id) === prev && t.tur === tur);
      if (mevcut) return prev;
      return varsayilanTedarikci(data, tur);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tedarikciListesi, tur]);

  function tirEkle() { setTirlar(t => [...t, { miktar: '', fiyat: String(tarife || '') }]); }
  function tirKaldir(i: number) {
    if (tirlar.length <= 1) { showToast('En az 1 tır olmalı', false); return; }
    setTirlar(t => t.filter((_, idx) => idx !== i));
  }
  function tirGuncelle(i: number, field: keyof TirSatiri, val: string) {
    setTirlar(t => t.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  }

  async function kaydet() {
    try {
      const gecerliTirlar = tirlar.map(t => ({ miktar: parseFloat(t.miktar) || 0, fiyat: parseFloat(t.fiyat) || 0 })).filter(t => t.miktar > 0);
      if (!gecerliTirlar.length) { showToast('En az 1 tır miktarı girin', false); return; }
      const toplamMiktar = gecerliTirlar.reduce((s, t) => s + t.miktar, 0);
      const toplamTutar  = gecerliTirlar.reduce((s, t) => s + t.miktar * t.fiyat, 0);
      const tedObj = data.tedarikciListesi.find(t => String(t.id) === tedarikci);
      const yeni: Malzeme = {
        id: uid(), tur, tarih, tirlar: gecerliTirlar, toplamMiktar, toplamTutar,
        tedarikci: tedObj?.isim || undefined, tedarikciId: tedObj?.id || undefined,
        not: notVal || undefined,
        };
        onSave({ ...data, malzemeler: [...data.malzemeler, yeni] });
        await saveMalzeme(yeni);
        setTirlar([{ miktar: '', fiyat: String(tarife || '') }]);
        setNotVal('');
        showToast('Malzeme girişi kaydedildi ✓');
    } catch {
      showToast('Malzeme kaydedilemedi', false);
    }
  }
  // Checkbox toggle
  function toggleSecim(id: number) {
    setSecili(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
    });
  }
  function tumunuSec(ids: number[]) {
    setSecili(prev => prev.size === ids.length ? new Set() : new Set(ids));
  }
  async function seciliSil() {
    try {
      const silinecekler = data.malzemeler.filter(m => secili.has(m.id));
      onSave({ ...data, malzemeler: data.malzemeler.filter(m => !secili.has(m.id)) });
      await Promise.all(silinecekler.map(m => deleteMalzeme(m.id)));
      setSecili(new Set());
      setMalzemeSilOnay(false);
      showToast(`${silinecekler.length} kayıt silindi`);
    } catch {
      showToast('Kayıtlar silinemedi', false);
    }
  }
  async function tedarikciEkle() {
    try {
      if (!tedIsim.trim()) { showToast('Tedarikçi adı gerekli', false); return; }
      const yeni = { id: uid(), isim: tedIsim.trim(), tur: tedTur };
      onSave({ ...data, tedarikciListesi: [...data.tedarikciListesi, yeni] });
      await saveTedarikci(yeni);
      setTedIsim('');
      showToast('Tedarikçi eklendi');
    } catch {
      showToast('Tedarikçi eklenemedi', false);
    }
  }
  async function tedarikciSil(id: number) {
    try {
      onSave({ ...data, tedarikciListesi: data.tedarikciListesi.filter(t => t.id !== id && t.tur !== 'diger') });
      await deleteTedarikci(id);
    } catch {
      showToast('Tedarikçi silinemedi', false);
    }
  }
  async function gecmisBorcKaydet() {
    try {
      if (!gbTedarikci) { showToast('Tedarikçi seçin', false); return; }
      const borc = parseFloat(gbBorc);
      if (!borc || borc <= 0) { showToast('Borç tutarı gerekli', false); return; }
      const tedObj = data.tedarikciListesi.find(t => String(t.id) === gbTedarikci);
      const birimAdi = gbTur === 'cimento' ? 'torba' : 'ton';
      const notParcalari: string[] = [];
      if (gbMiktar) notParcalari.push(`${gbMiktar} ${birimAdi}`);
      if (gbNot)    notParcalari.push(gbNot);
      const notMetni = notParcalari.length ? notParcalari.join(' | ') : 'Geçmiş borç girişi';
      const yeni: Malzeme = {
        id: uid(), tur: gbTur, tarih: gbTarih || today(),
        tirlar: [{ miktar: parseFloat(gbMiktar) || 0, fiyat: 0 }],
        toplamMiktar: parseFloat(gbMiktar) || 0, toplamTutar: borc,
        tedarikci: tedObj?.isim || undefined, tedarikciId: tedObj?.id || undefined,
        not: notMetni, gecmisBorcMu: true,
        };
        onSave({ ...data, malzemeler: [...data.malzemeler, yeni] });
        await saveMalzeme(yeni);
        setGbTedarikci(''); setGbBorc(''); setGbTarih(''); setGbMiktar(''); setGbNot('');
        setGbDetayAcik(false);
        showToast('Geçmiş borç eklendi ✓');
    } catch {
      showToast('Geçmiş borç kaydedilemedi', false);
    }
  }
  function tedarikBorc(tid: number) {
    const alinan = data.malzemeler.filter(m => m.tedarikciId === tid).reduce((s, m) => s + m.toplamTutar, 0);
    const odenen = data.tedarikOdemeler.filter(o => o.tedarikciId === tid).reduce((s, o) => s + o.tutar, 0);
    return { alinan, odenen, kalan: alinan - odenen };
  }
  function handleTpTedarikSec(val: string) {
    setTpTedarik(val);
    setSonOdeme(null);
    if (val) {
    const kalan = tedarikBorc(parseInt(val)).kalan;
    setTpTutar(kalan > 0 ? String(kalan.toFixed(2)) : '');
    } else {
    setTpTutar('');
    }
  }
  async function tedarikOdemeKaydet() {
    try {
      const tid = parseInt(tpTedarik); const t = parseFloat(tpTutar);
      if (!tid || !t) { showToast('Tedarikçi ve tutar gerekli', false); return; }
      const tedObj = data.tedarikciListesi.find(x => x.id === tid);
      const borçBilgisi = tedarikBorc(tid);
      const makbuzNo = `TO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const yeniOdeme = { id: uid(), tedarikciId: tid, tutar: t, tarih: tpTarih || today(), aciklama: tpAciklama };
      onSave({ ...data, tedarikOdemeler: [...data.tedarikOdemeler, yeniOdeme] });
      await saveTedarikOdeme(yeniOdeme);
      setSonOdeme({ tedId: tid, tedIsim: tedObj?.isim || '?', tutar: t, tarih: tpTarih || today(), aciklama: tpAciklama, no: makbuzNo });
      void borçBilgisi;
      setTpTutar(''); setTpAciklama(''); setTpTedarik('');
      showToast('Ödeme kaydedildi ✓');
    } catch {
      showToast('Ödeme kaydedilemedi', false);
    }
  }
  function tedarikMakbuzAc() {
    if (!sonOdeme) return;
    const b = tedarikBorc(sonOdeme.tedId);
    const kalanSonra = Math.max(0, b.kalan);
    const turAdi = data.tedarikciListesi.find(t => t.id === sonOdeme.tedId)?.tur;
    makbuzIndir({
    baslik: 'TEDARIKCI ODEME MAKBUZU',
    makbuzNo: sonOdeme.no,
    tarih: sonOdeme.tarih,
    alici: sonOdeme.tedIsim,
    aciklama: sonOdeme.aciklama || undefined,
    kalemler: [
      { etiket: 'Odeme Tarihi',       deger: sonOdeme.tarih.split('-').reverse().join('.') },
      { etiket: 'Malzeme Turu',       deger: TURADI[turAdi || ''] || turAdi || '—' },
      { etiket: 'Toplam Alis Tutari', deger: tl(b.alinan) },
      { etiket: 'Onceki Odenen',      deger: tl(b.odenen - sonOdeme.tutar < 0 ? 0 : b.odenen - sonOdeme.tutar) },
      ...(sonOdeme.aciklama ? [{ etiket: 'Aciklama', deger: sonOdeme.aciklama }] : []),
    ],
    odemeTutari: tl(sonOdeme.tutar),
    kalanBorc: kalanSonra > 0 ? tl(kalanSonra) : undefined,
    isletmeAdi: 'BRIKET YONETIM',
    });
  }
  function odemeOnaySil(odemeId: number) {
    const odeme = data.tedarikOdemeler.find(o => o.id === odemeId);
    if (!odeme) return;
    const ted = data.tedarikciListesi.find(t => t.id === odeme.tedarikciId);
    setOdemeOnay({ acik: true, odemeId, bilgi: `${ted?.isim || '?'} — ${tl(odeme.tutar)} (${fd(odeme.tarih)})` });
  }
  async function odemeOnaySilOnayla() {
    try {
      if (!odemeOnay.odemeId) return;
      onSave({ ...data, tedarikOdemeler: data.tedarikOdemeler.filter(o => o.id !== odemeOnay.odemeId) });
      await deleteTedarikOdeme(odemeOnay.odemeId);
      setOdemeOnay({ acik: false, odemeId: null, bilgi: '' });
      showToast('Ödeme kaydı silindi');
    } catch {
      showToast('Ödeme silinemedi', false);
    }
  }
  // Son girişler listesi (en yeni 20)
  const sonGirisler = [...data.malzemeler].reverse().slice(0, 20);
  const sonIds = sonGirisler.map(m => m.id);
  // Grafik verileri
  const micirVeriler  = grafikVerisi(data.malzemeler, 'micir', micirAralik);
  const cimentoVeriler = grafikVerisi(data.malzemeler, 'cimento', cimentoAralik);
  return (
    <div>
    {/* ── Onay: Malzeme Çoklu Silme ── */}
    {malzemeSilOnay && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Malzeme Kayıtlarını Sil</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
            Seçili <strong>{secili.size}</strong> kayıt kalıcı olarak silinecek.
          </div>
          <div style={{ background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 'var(--radius)', padding: '8px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: 'var(--danger)', marginBottom: 22 }}>
            Bu işlem geri alınamaz.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setMalzemeSilOnay(false)}>İptal</button>
            <button className="btn btn-danger" onClick={seciliSil}>Evet, Sil</button>
          </div>
        </div>
      </div>
    )}
    {/* ── Onay: Ödeme Silme ── */}
    {odemeOnay.acik && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Ödeme Kaydını Sil</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>Aşağıdaki ödeme kalıcı olarak silinecek:</div>
          <div style={{ background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 'var(--radius)', padding: '8px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: 'var(--danger)', marginBottom: 22 }}>
            {odemeOnay.bilgi}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setOdemeOnay({ acik: false, odemeId: null, bilgi: '' })}>İptal</button>
            <button className="btn btn-danger" onClick={odemeOnaySilOnayla}>Evet, Sil</button>
          </div>
        </div>
      </div>
    )}
    {/* ══ Grafikler ══ */}
    <div className="two-col" style={{ marginBottom: 0 }}>
      {/* Mıcır Grafiği */}
      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="panel-title">📦 Mıcır Alımı</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(ARALIK_LABEL) as GrafikAralik[]).map(k => (
              <button
                key={k}
                onClick={() => setMicirAralik(k)}
                style={{
                  padding: '3px 9px', fontSize: 11, borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: micirAralik === k ? 'var(--primary)' : 'var(--surface2)',
                  color: micirAralik === k ? '#fff' : 'var(--text2)',
                  fontWeight: micirAralik === k ? 700 : 400,
                }}
              >
                {ARALIK_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 8 }}>
          <AlanGrafik veriler={micirVeriler} renk="#4f8ef7" birim="ton" />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>
            Toplam: {data.malzemeler.filter(m => m.tur === 'micir' && new Date(m.tarih) >= aralikBaslangic(micirAralik)).reduce((s, m) => s + m.toplamMiktar, 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ton
          </div>
        </div>
      </div>
      {/* Çimento Grafiği */}
      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="panel-title">🏗️ Çimento Alımı</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(ARALIK_LABEL) as GrafikAralik[]).map(k => (
              <button
                key={k}
                onClick={() => setCimentoAralik(k)}
                style={{
                  padding: '3px 9px', fontSize: 11, borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: cimentoAralik === k ? '#e67e22' : 'var(--surface2)',
                  color: cimentoAralik === k ? '#fff' : 'var(--text2)',
                  fontWeight: cimentoAralik === k ? 700 : 400,
                }}
              >
                {ARALIK_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 8 }}>
          <AlanGrafik veriler={cimentoVeriler} renk="#e67e22" birim="torba" />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>
            Toplam: {data.malzemeler.filter(m => m.tur === 'cimento' && new Date(m.tarih) >= aralikBaslangic(cimentoAralik)).reduce((s, m) => s + m.toplamMiktar, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} torba
          </div>
        </div>
      </div>
    </div>
    <div className="two-col">
      {/* ── Malzeme Girişi ── */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Malzeme Girişi</div></div>
        <div className="panel-body">
          <div className="frow c2">
            <div>
              <label>Malzeme Türü</label>
              <select value={tur} onChange={e => handleTurDegis(e.target.value as 'micir' | 'cimento')}>
                <option value="micir">Mıcır</option>
                <option value="cimento">Çimento</option>
              </select>
            </div>
            <div><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginBottom: 8, display: 'block' }}>Tır Girişleri</label>
            {tirlar.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                <div style={{ paddingBottom: 9, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>{i + 1}. Tır</div>
                <div>{i === 0 && <label>{birimLbl}</label>}<input type="number" placeholder="0" value={t.miktar} onChange={e => tirGuncelle(i, 'miktar', e.target.value)} /></div>
                <div>{i === 0 && <label>Birim Fiyat (TL)</label>}<input type="number" step="0.01" placeholder={tarife ? String(tarife) : '0.00'} value={t.fiyat} onChange={e => tirGuncelle(i, 'fiyat', e.target.value)} /></div>
                <div style={{ paddingBottom: 1 }}><button className="btn btn-danger btn-sm" onClick={() => tirKaldir(i)}>✕</button></div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={tirEkle}>+ Tır Ekle</button>
            {tarife > 0 && <div className="field-hint" style={{ marginTop: 6 }}>Tarife: {tarife.toFixed(2)} TL</div>}
          </div>
          <div className="frow c2">
            <div>
              <label>Tedarikçi</label>
              <select value={tedarikci} onChange={e => setTedarikci(e.target.value)}>
                <option value="">— Seç (isteğe bağlı) —</option>
                {turTedarikci.map(t => <option key={t.id} value={t.id}>{t.isim}</option>)}
              </select>
            </div>
            <div><label>Not</label><input type="text" placeholder="İsteğe bağlı..." value={notVal} onChange={e => setNotVal(e.target.value)} /></div>
          </div>
          <button className="btn btn-primary" onClick={kaydet}>✦ Kaydet</button>
        </div>
      </div>
      {/* ── Son Girişler (checkbox + çoklu sil) ── */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Son Girişler</div>
          {secili.size > 0 && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setMalzemeSilOnay(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              🗑 {secili.size} Kaydı Sil
            </button>
          )}
        </div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={sonIds.length > 0 && secili.size === sonIds.length}
                      onChange={() => tumunuSec(sonIds)}
                      title="Tümünü seç"
                    />
                  </th>
                  <th>Tarih</th><th>Tür</th><th>Toplam Miktar</th><th>Toplam Tutar</th><th>Tedarikçi</th>
                </tr>
              </thead>
              <tbody>
                {sonGirisler.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Kayıt yok</td></tr>
                ) : sonGirisler.map(m => (
                  <tr
                    key={m.id}
                    style={{
                      background: secili.has(m.id)
                        ? 'rgba(255,80,80,0.07)'
                        : m.gecmisBorcMu ? 'rgba(255,200,0,.04)' : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSecim(m.id)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={secili.has(m.id)} onChange={() => toggleSecim(m.id)} />
                    </td>
                    <td>{fd(m.tarih)}</td>
                    <td>
                      <span className="badge b-blue">{TURADI[m.tur] || m.tur}</span>
                      {m.gecmisBorcMu && <span className="badge b-gray" style={{ marginLeft: 4, fontSize: 9 }}>Geçmiş</span>}
                    </td>
                    <td className="td-mono">{m.toplamMiktar > 0 ? `${m.toplamMiktar.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${m.tur === 'cimento' ? 'torba' : 'ton'}` : '—'}</td>
                    <td className="td-mono">{tl(m.toplamTutar)}</td>
                    <td>{m.tedarikci || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {secili.size === 0 && sonGirisler.length > 0 && (
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text3)' }}>
              Silmek için satıra tıkla veya checkbox kullan
            </div>
          )}
        </div>
      </div>
    </div>
    {/* ══ Geçmiş Borç ══ */}
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">📒 Geçmiş Borç Girişi</div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Eski defterdeki tedarikçi borçlarını buradan aktarın</span>
      </div>
      <div className="panel-body">
        <div className="frow c2">
          <div>
            <label>Malzeme Türü <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span></label>
            <select value={gbTur} onChange={e => { const t = e.target.value as 'micir' | 'cimento'; setGbTur(t); setGbTedarikci(varsayilanTedarikci(data, t)); }}>
              <option value="micir">Mıcır</option>
              <option value="cimento">Çimento</option>
            </select>
          </div>
          <div>
            <label>Tedarikçi <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span></label>
            <select value={gbTedarikci} onChange={e => setGbTedarikci(e.target.value)}>
              <option value="">— Tedarikçi seç —</option>
              {gbTurTedarikci.map(t => <option key={t.id} value={t.id}>{t.isim}</option>)}
            </select>
          </div>
        </div>
        <div className="frow"><div><label>Borç Tutarı (TL) <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span></label><input type="number" step="0.01" placeholder="0.00" value={gbBorc} onChange={e => setGbBorc(e.target.value)} /></div></div>
        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }} onClick={() => setGbDetayAcik(v => !v)}>
          {gbDetayAcik ? '▾ Detayları Kapat' : '▸ Opsiyonel Detaylar Ekle'}
        </button>
        {gbDetayAcik && (
          <div style={{ background: 'rgba(0,0,0,.025)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="frow c2">
              <div><label>Tarih</label><input type="date" value={gbTarih} onChange={e => setGbTarih(e.target.value)} /></div>
              <div><label>{gbTur === 'cimento' ? 'Miktar (torba)' : 'Miktar (ton)'}</label><input type="number" placeholder="—" value={gbMiktar} onChange={e => setGbMiktar(e.target.value)} /></div>
            </div>
            <div><label>Ek Not</label><input type="text" placeholder="Hatırladıklarınızı yazın..." value={gbNot} onChange={e => setGbNot(e.target.value)} /></div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={gecmisBorcKaydet}>📒 Geçmiş Borcu Kaydet</button>
          {gbTedarikci && gbBorc && (
            <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {data.tedarikciListesi.find(t => String(t.id) === gbTedarikci)?.isim} →{' '}
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{tl(parseFloat(gbBorc) || 0)}</span> borç eklenecek
            </span>
          )}
        </div>
      </div>
    </div>
    {/* Tedarikçi yönetimi */}
    <div className="panel">
      <div className="panel-header"><div className="panel-title">Tedarikçi Yönetimi</div></div>
      <div className="panel-body">
        <div className="frow c3">
          <div><label>Tedarikçi Adı</label><input type="text" placeholder="Tedarikçi adı" value={tedIsim} onChange={e => setTedIsim(e.target.value)} /></div>
          <div>
            <label>Malzeme Türü</label>
            <select value={tedTur} onChange={e => setTedTur(e.target.value as 'micir' | 'cimento')}>
              <option value="micir">Mıcır</option>
              <option value="cimento">Çimento</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn btn-primary" onClick={tedarikciEkle}>+ Ekle</button></div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.tedarikciListesi.filter(t => t.tur !== 'diger').map(t => (
            <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text)' }}>{t.isim}</span>
              <span className="badge b-blue" style={{ fontSize: 9 }}>{TURADI[t.tur] || t.tur}</span>
              <button className="btn btn-danger btn-sm" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => tedarikciSil(t.id)}>✕</button>
            </div>
          ))}
          {data.tedarikciListesi.filter(t => t.tur !== 'diger').length === 0 && <span style={{ color: 'var(--text3)', fontSize: 12 }}>Henüz tedarikçi eklenmedi</span>}
        </div>
      </div>
    </div>
    {/* Tedarikçi borç & ödeme */}
    <div className="two-col">
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Tedarikçi Borç Durumu</div></div>
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tedarikçi</th><th>Toplam Alış</th><th>Ödenen</th><th>Kalan Borç</th></tr></thead>
            <tbody>
              {data.tedarikciListesi.filter(t => t.tur !== 'diger').length === 0 ? (
                <tr><td colSpan={4} className="empty">Tedarikçi yok</td></tr>
              ) : data.tedarikciListesi.filter(t => t.tur !== 'diger').map(t => {
                const b = tedarikBorc(t.id);
                return (
                  <tr key={t.id}>
                    <td className="td-bold">{t.isim}</td>
                    <td className="td-mono">{tl(b.alinan)}</td>
                    <td className="td-mono positive">{tl(b.odenen)}</td>
                    <td className={`td-mono ${b.kalan > 0 ? 'negative' : ''}`}>{tl(b.kalan)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Tedarikçiye Ödeme Yap</div></div>
        <div className="panel-body">
          <div className="frow">
            <div>
              <label>Tedarikçi</label>
              <select value={tpTedarik} onChange={e => handleTpTedarikSec(e.target.value)}>
                <option value="">— Seç —</option>
                {data.tedarikciListesi.filter(t => t.tur !== 'diger').map(t => (
                  <option key={t.id} value={t.id}>{t.isim}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="frow c2">
            <div><label>Tutar (TL)</label><input type="number" step="0.01" placeholder="0.00" value={tpTutar} onChange={e => setTpTutar(e.target.value)} /></div>
            <div><label>Tarih</label><input type="date" value={tpTarih} onChange={e => setTpTarih(e.target.value)} /></div>
          </div>
          <div className="frow"><div><label>Açıklama</label><input type="text" placeholder="ör: Kasım faturası" value={tpAciklama} onChange={e => setTpAciklama(e.target.value)} /></div></div>
          {tpTedarik && (
            <div style={{ background: 'rgba(46,196,182,.08)', border: '1px solid rgba(46,196,182,.25)', borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 12, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text2)' }}>
              Kalan borç:{' '}
              <span style={{ color: tedarikBorc(parseInt(tpTedarik)).kalan > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                {tl(tedarikBorc(parseInt(tpTedarik)).kalan)}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={tedarikOdemeKaydet}>✓ Ödeme Yap</button>
            {sonOdeme && (
              <button className="btn btn-secondary" onClick={tedarikMakbuzAc} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📄 Makbuz PDF
              </button>
            )}
          </div>
          {sonOdeme && (
            <div style={{ marginTop: 10, background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>
              ✓ <strong>{sonOdeme.tedIsim}</strong> — {tl(sonOdeme.tutar)} ödeme yapıldı
            </div>
          )}
        </div>
      </div>
    </div>
    {/* Ödeme hareketleri */}
    <div className="panel">
      <div className="panel-header"><div className="panel-title">Tedarikçi Ödeme Hareketleri</div></div>
      <div className="panel-body-0">
        <table>
          <thead><tr><th>Tarih</th><th>Tedarikçi</th><th>Tutar</th><th>Açıklama</th><th></th></tr></thead>
          <tbody>
            {data.tedarikOdemeler.length === 0 ? (
              <tr><td colSpan={5} className="empty">Kayıt yok</td></tr>
            ) : [...data.tedarikOdemeler].reverse().map(o => {
              const t = data.tedarikciListesi.find(x => x.id === o.tedarikciId);
              return (
                <tr key={o.id}>
                  <td>{fd(o.tarih)}</td>
                  <td className="td-bold">{t?.isim || '?'}</td>
                  <td className="td-mono positive">{tl(o.tutar)}</td>
                  <td>{o.aciklama || '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => odemeOnaySil(o.id)}>Sil</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}