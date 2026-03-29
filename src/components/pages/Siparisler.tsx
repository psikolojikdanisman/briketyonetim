'use client';
import { useState, useMemo, useRef } from 'react';
import type { AppData, Siparis, Teslimat, Musteri } from '@/types';
import { tl, fd, today, uid, SIP_BIRIM, SIP_CESIT_LABEL } from '@/lib/storage';
import MusteriSecici from '@/components/MusteriSecici';
import { makbuzYazdir } from '@/lib/makbuzYazdir';

// ─── Fiyat tarifeleri → birim fiyat ──────────────────────────────────────────
function varsayilanFiyat(cesit: string, bolge: string, data: AppData): string {
  const fp = data.ayarlar?.fp;
  if (!fp) return '';
  const b = (bolge === 'merkez' || bolge === 'yakin') ? bolge : 'merkez';
  const fpAsAny = fp as Record<string, number>;
  const val = fpAsAny[b];
  return val ? String(val) : '';
}

// ─── Hızlı Müşteri Ekle Modal ─────────────────────────────────────────────────
interface HizliMusteriModalProps {
  koyler: AppData['koyler'];
  onKaydet: (m: Musteri, yeniKoy?: { isim: string; bolge: 'yakin' | 'uzak' }) => void;
  onKapat: () => void;
}

function HizliMusteriModal({ koyler, onKaydet, onKapat }: HizliMusteriModalProps) {
  const [isim, setIsim] = useState('');
  const [tel, setTel] = useState('');
  const [koyAra, setKoyAra] = useState('');
  const [koySecili, setKoySecili] = useState('');
  const [showDd, setShowDd] = useState(false);
  const [yeniKoyBolge, setYeniKoyBolge] = useState<'yakin' | 'uzak' | null>(null);

  const filtreKoyler = koyler.filter(k =>
    !koyAra || k.isim.toLowerCase().includes(koyAra.toLowerCase())
  );

  const koyListedeYok = koyAra.trim() !== '' && !koyler.find(k => k.isim.toLowerCase() === koyAra.trim().toLowerCase());

  function handleKoyAraChange(val: string) {
    setKoyAra(val);
    setKoySecili('');
    setYeniKoyBolge(null);
    setShowDd(true);
  }

  function kaydet() {
    if (!isim.trim()) return;
    const koyObj = koyler.find(k => k.isim === koySecili);
    const bolge  = koyObj?.bolge || (koySecili && yeniKoyBolge ? yeniKoyBolge : '');
    const koyIsim = koySecili || (koyAra.trim() && yeniKoyBolge ? koyAra.trim() : '');
    const yeniKoy = koyIsim && yeniKoyBolge ? { isim: koyIsim, bolge: yeniKoyBolge } : undefined;
    onKaydet(
      { id: uid(), isim: isim.trim(), tel: tel.trim(), koy: koyIsim, bolge },
      yeniKoy
    );
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-title">Hızlı Müşteri Ekle</div>
        <div className="frow">
          <div>
            <label>Müşteri Adı *</label>
            <input
              type="text"
              placeholder="Ad Soyad veya Firma"
              value={isim}
              onChange={e => setIsim(e.target.value)}
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
            />
          </div>
        </div>
        <div className="frow" style={{ position: 'relative' }}>
          <div style={{ width: '100%' }}>
            <label>Köy / Bölge</label>
            <input
              type="text"
              placeholder="Arayın veya yazın..."
              value={koyAra}
              onChange={e => handleKoyAraChange(e.target.value)}
              onFocus={() => setShowDd(true)}
              onBlur={() => setTimeout(() => setShowDd(false), 200)}
            />
            {showDd && filtreKoyler.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 200, maxHeight: 160, overflowY: 'auto' }}>
                {filtreKoyler.map(k => (
                  <div
                    key={k.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}
                    onMouseDown={() => { setKoyAra(k.isim); setKoySecili(k.isim); setYeniKoyBolge(null); setShowDd(false); }}
                  >
                    {k.isim}
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{k.bolge}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {koyListedeYok && !koySecili && (
          <div style={{ background: 'rgba(246,201,14,.08)', border: '1px solid rgba(246,201,14,.35)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
              <strong>&ldquo;{koyAra.trim()}&rdquo;</strong> listede yok. Köy listesine eklenecek — uzaklığı nedir?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${yeniKoyBolge === 'yakin' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setYeniKoyBolge('yakin')}
              >
                📍 Yakın Köy
              </button>
              <button
                type="button"
                className={`btn btn-sm ${yeniKoyBolge === 'uzak' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setYeniKoyBolge('uzak')}
              >
                🛣️ Uzak Köy
              </button>
            </div>
            {yeniKoyBolge && (
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>
                ✓ &ldquo;{koyAra.trim()}&rdquo; köy listesine <strong>{yeniKoyBolge === 'yakin' ? 'Yakın Köy' : 'Uzak Köy'}</strong> olarak eklenecek
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onKapat}>İptal</button>
          <button
            className="btn btn-primary"
            onClick={kaydet}
            disabled={!isim.trim() || (koyListedeYok && !koySecili && !yeniKoyBolge && koyAra.trim() !== '')}
          >
            ✓ Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sipariş Düzenleme Modal ───────────────────────────────────────────────────
interface DuzenleModalProps {
  siparis: Siparis;
  onKaydet: (guncellendi: Siparis) => void;
  onKapat: () => void;
}

function SiparisDuzenleModal({ siparis, onKaydet, onKapat }: DuzenleModalProps) {
  const [adet, setAdet]   = useState(String(siparis.adet));
  const [fiyat, setFiyat] = useState(String(siparis.fiyat));
  const [not, setNot]     = useState(siparis.not || '');

  function kaydet() {
    const yeniAdet  = parseFloat(adet);
    const yeniFiyat = parseFloat(fiyat);
    if (!yeniAdet || yeniAdet <= 0)  return;
    if (!yeniFiyat || yeniFiyat <= 0) return;
    const yeniGonderilen = Math.min(siparis.gonderilen, yeniAdet);
    onKaydet({
      ...siparis,
      adet: yeniAdet,
      fiyat: yeniFiyat,
      toplamTutar: yeniAdet * yeniFiyat,
      gonderilen: yeniGonderilen,
      not,
    });
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="modal" style={{ width: 400 }}>
        <div className="modal-title">Sipariş Düzenle</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, padding: '0 4px' }}>
          <strong>{SIP_CESIT_LABEL[siparis.cesit] || siparis.cesit}</strong>
          {siparis.koy && <span style={{ marginLeft: 8, color: 'var(--text3)' }}>📍 {siparis.koy}</span>}
        </div>
        {siparis.gonderilen > 0 && (
          <div style={{ background: 'rgba(246,201,14,.1)', border: '1px solid rgba(246,201,14,.4)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--text2)' }}>
            ⚠️ Bu siparişten <strong>{siparis.gonderilen.toLocaleString('tr-TR')}</strong> adet zaten gönderildi.
            Miktarı bunun altına düşüremezsiniz.
          </div>
        )}
        <div className="frow c2">
          <div>
            <label>Miktar ({siparis.birim || 'adet'})</label>
            <input
              type="number"
              value={adet}
              min={siparis.gonderilen || 1}
              onChange={e => setAdet(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label>Birim Fiyat (TL)</label>
            <input
              type="number"
              step="0.01"
              value={fiyat}
              onChange={e => setFiyat(e.target.value)}
            />
          </div>
        </div>
        {parseFloat(adet) > 0 && parseFloat(fiyat) > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10, paddingLeft: 2 }}>
            Toplam: {tl(parseFloat(adet) * parseFloat(fiyat))}
          </div>
        )}
        <div className="frow">
          <div>
            <label>Not</label>
            <textarea value={not} onChange={e => setNot(e.target.value)} placeholder="İsteğe bağlı..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onKapat}>İptal</button>
          <button
            className="btn btn-primary"
            onClick={kaydet}
            disabled={
              !parseFloat(adet) || parseFloat(adet) <= 0 ||
              !parseFloat(fiyat) || parseFloat(fiyat) <= 0 ||
              parseFloat(adet) < siparis.gonderilen
            }
          >
            ✓ Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Onay Modal ───────────────────────────────────────────────────────────────
interface OnayModalProps {
  mesaj: string;
  onOnayla: () => void;
  onIptal: () => void;
}

function OnayModal({ mesaj, onOnayla, onIptal }: OnayModalProps) {
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onIptal(); }}>
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-title">Silme Onayı</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
          {mesaj}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onIptal}>İptal</button>
          <button className="btn btn-danger" onClick={onOnayla}>Sil</button>
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
  const [oncelik, setOncelik]     = useState<'normal' | 'acil'>('normal');
  const [showHizliMusteri, setShowHizliMusteri] = useState(false);

  // Düzenleme ve silme modalleri
  const [duzenlenecek, setDuzenlenecek]   = useState<Siparis | null>(null);
  const [silinecekId, setSilinecekId]     = useState<number | null>(null);
  const [silinecekMesaj, setSilinecekMesaj] = useState('');

  // Teslimat formu
  const teslimatFormRef = useRef<HTMLDivElement>(null);
  const [tMusteri, setTMusteri]               = useState('');
  const [seciliSiparisler, setSeciliSiparisler] = useState<SeciliSiparis[]>([]);
  const [tOdeme, setTOdeme]                   = useState('pesin');
  const [tTahsil, setTTahsil]                 = useState('');
  const [tTarih, setTTarih]                   = useState(today());

  // Tablo aç/kapa
  const [acikSipGruplari, setAcikSipGruplari] = useState<Set<number>>(new Set());
  const [acikTesGruplari, setAcikTesGruplari] = useState<Set<string>>(new Set());
  const [sipSiralama, setSipSiralama] = useState<'yeni' | 'eski' | null>(null);

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

  function koySecildiCallback(koyIsim: string) {
    setKoySecili(koyIsim);
    const koyObj = data.koyler.find(k => k.isim === koyIsim);
    const bolge  = koyObj?.bolge || 'merkez';
    setUrunler(prev => prev.map(u => {
      const yeniFiyat = varsayilanFiyat(u.cesit, bolge, data);
      const eskiFiyat = varsayilanFiyat(u.cesit, 'merkez', data);
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
      oncelik,
    }));
    onSave({ ...data, siparisler: [...data.siparisler, ...yeniSiparisler] });
    setUrunler([{ cesit: '20lik', adet: '', fiyat: varsayilanFiyat('20lik', 'merkez', data) }]);
    setNotVal(''); setAdres(''); setKoyAra(''); setKoySecili(''); setOncelik('normal');
    showToast(gecerli.length > 1 ? `${gecerli.length} sipariş eklendi ✓` : 'Sipariş eklendi ✓');
  }

  // ─── Silme (onaylı) ───────────────────────────────────────────────────────
  function siparisSilOnay(s: Siparis, musteriIsim: string) {
    setSilinecekId(s.id);
    setSilinecekMesaj(
      `"${musteriIsim}" müşterisine ait ${SIP_CESIT_LABEL[s.cesit] || s.cesit} siparişi (${s.adet.toLocaleString('tr-TR')} ${s.birim || 'adet'}) silinecek. Bu işlem geri alınamaz.`
    );
  }

  function siparisSilOnayla() {
    if (silinecekId === null) return;
    onSave({ ...data, siparisler: data.siparisler.filter(s => s.id !== silinecekId) });
    setSilinecekId(null);
    setSilinecekMesaj('');
    showToast('Sipariş silindi');
  }

  // ─── Düzenleme ────────────────────────────────────────────────────────────
  function siparisDuzenleKaydet(guncellendi: Siparis) {
    onSave({
      ...data,
      siparisler: data.siparisler.map(s => s.id === guncellendi.id ? guncellendi : s),
    });
    setDuzenlenecek(null);
    showToast('Sipariş güncellendi ✓');
  }

  // ─── Hızlı müşteri ────────────────────────────────────────────────────────
  function hizliMusteriEkle(m: Musteri, yeniKoy?: { isim: string; bolge: 'yakin' | 'uzak' }) {
    const yeniKoyler = yeniKoy
      ? [...data.koyler, { id: uid(), isim: yeniKoy.isim, bolge: yeniKoy.bolge }]
      : data.koyler;
    const yeniData = { ...data, musteriler: [...data.musteriler, m], koyler: yeniKoyler };
    onSave(yeniData);
    setMusteri(String(m.id));
    setShowHizliMusteri(false);
    const extra = yeniKoy ? ` · "${yeniKoy.isim}" köy listesine eklendi` : '';
    showToast(`${m.isim} eklendi ✓${extra}`);
  }

  // ─── Tablodan hızlı teslimat yap ─────────────────────────────────────────
  function hizliTeslimatYap(musteriId: number) {
    const acikSiparisler = data.siparisler.filter(
      s => s.musteriId === musteriId && s.gonderilen < s.adet
    );
    setTMusteri(String(musteriId));
    setSeciliSiparisler(
      acikSiparisler.map(s => ({ siparisId: s.id, adet: String(s.adet - s.gonderilen) }))
    );
    setTTahsil('');
    setTimeout(() => {
      teslimatFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

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
    return Array.from(map.entries())
      .filter(([, kalemler]) => kalemler.some(s => s.gonderilen < s.adet))
      .sort((a, b) => {
        const aAcil = a[1].some(s => (s as Siparis & { oncelik?: string }).oncelik === 'acil') ? 0 : 1;
        const bAcil = b[1].some(s => (s as Siparis & { oncelik?: string }).oncelik === 'acil') ? 0 : 1;
        if (aAcil !== bAcil) return aAcil - bAcil;
        const aId = Math.max(...a[1].map(s => s.id));
        const bId = Math.max(...b[1].map(s => s.id));
        if (sipSiralama === 'eski') return aId - bId;
        return bId - aId;
      });
  }, [data.siparisler, sipSiralama]);

  const toplamAcikKalem = useMemo(
    () => data.siparisler.filter(s => s.gonderilen < s.adet).length,
    [data.siparisler]
  );

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
      {/* Modaller */}
      {showHizliMusteri && (
        <HizliMusteriModal
          koyler={data.koyler}
          onKaydet={(m, yeniKoy) => hizliMusteriEkle(m, yeniKoy)}
          onKapat={() => setShowHizliMusteri(false)}
        />
      )}
      {duzenlenecek && (
        <SiparisDuzenleModal
          siparis={duzenlenecek}
          onKaydet={siparisDuzenleKaydet}
          onKapat={() => setDuzenlenecek(null)}
        />
      )}
      {silinecekId !== null && (
        <OnayModal
          mesaj={silinecekMesaj}
          onOnayla={siparisSilOnayla}
          onIptal={() => { setSilinecekId(null); setSilinecekMesaj(''); }}
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

            <div className="frow c2">
              <div>
                <label>Sipariş Notu</label>
                <textarea placeholder="İsteğe bağlı not..." value={notVal} onChange={e => setNotVal(e.target.value)} />
              </div>
              <div>
                <label>Öncelik</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  {(['normal', 'acil'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOncelik(p)}
                      className={`btn btn-sm ${oncelik === p ? (p === 'acil' ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}`}
                      style={{ flex: 1, fontWeight: oncelik === p ? 700 : 400 }}
                    >
                      {p === 'acil' ? '🔴 Acil' : '🟢 Normal'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={siparisKaydet}>✦ Sipariş Kaydet</button>
          </div>
        </div>

        {/* ── Teslimat formu ── */}
        <div className="panel" ref={teslimatFormRef}>
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

      {/* ═══ SİPARİŞLER (AÇIK) ═══ */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Siparişler</div>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {toplamAcikKalem} açık kalem
          </span>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['yeni', 'eski'] as const).map(s => (
              <button
                key={s}
                className={`btn btn-sm ${sipSiralama === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSipSiralama(prev => prev === s ? null : s)}
              >
                {s === 'yeni' ? '↓ En Yeni' : '↑ En Eski'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
            {sipGruplari.length} müşteri
          </span>
        </div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Tarih</th>
                  <th>Müşteri</th>
                  <th>Yer</th>
                  <th>Ana Ürün</th>
                  <th>Toplam Tutar</th>
                  <th>İlerleme</th>
                  <th>Durum</th>
                  <th style={{ width: 140 }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {sipGruplari.length === 0 ? (
                  <tr><td colSpan={9} className="empty">Tüm siparişler tamamlandı 🎉</td></tr>
                ) : sipGruplari.flatMap(([musteriId, tumKalemler]) => {
                  const acikKalemler = tumKalemler.filter(s => s.gonderilen < s.adet);
                  const m        = data.musteriler.find(x => x.id === musteriId);
                  const badge    = sipDurumBadge(acikKalemler);
                  const topTutar = acikKalemler.reduce((s, k) => s + k.toplamTutar, 0);
                  const topAdet  = acikKalemler.reduce((s, k) => s + k.adet, 0);
                  const topGond  = acikKalemler.reduce((s, k) => s + k.gonderilen, 0);
                  const cokKalem = acikKalemler.length > 1;
                  const acik     = acikSipGruplari.has(musteriId);
                  const isAcil   = acikKalemler.some(s => (s as Siparis & { oncelik?: string }).oncelik === 'acil');
                  const yerler   = [...new Set(acikKalemler.map(s => s.koy || s.adres || '').filter(Boolean))];
                  const yerOzet  = yerler.length === 0 ? '—' : yerler.length === 1 ? yerler[0] : `${yerler.length} yer`;
                  const sonTarih = acikKalemler.reduce((en, s) => s.tarih > en ? s.tarih : en, acikKalemler[0].tarih);

                  const rows = [
                    <tr
                      key={`g-${musteriId}`}
                      onClick={() => cokKalem && toggleSipGrup(musteriId)}
                      style={{ cursor: cokKalem ? 'pointer' : 'default', background: isAcil ? 'rgba(220,50,50,.06)' : acik ? 'rgba(45,122,79,.04)' : undefined }}
                    >
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', userSelect: 'none' }}>
                        {cokKalem ? (acik ? '▾' : '▸') : ''}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{fd(sonTarih)}</td>
                      <td className="td-bold">
                        {m?.isim || '?'}
                        {isAcil && <span className="badge b-red" style={{ marginLeft: 6, fontSize: 10 }}>🔴 ACİL</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {yerOzet !== '—' ? <span title={yerler.join(', ')}>📍 {yerOzet}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td>
                        <span className="badge b-yellow">{anaUrun(acikKalemler)}</span>
                        {cokKalem && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>+{acikKalemler.length - 1} kalem</span>}
                      </td>
                      <td className="td-mono">{tl(topTutar)}</td>
                      <td className="td-mono" style={{ fontSize: 12 }}>{topGond.toLocaleString('tr-TR')} / {topAdet.toLocaleString('tr-TR')}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={e => { e.stopPropagation(); hizliTeslimatYap(musteriId); }}
                          >
                            🚛 Teslimat
                          </button>
                          {!cokKalem && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={e => { e.stopPropagation(); setDuzenlenecek(acikKalemler[0]); }}
                                title="Düzenle"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={e => { e.stopPropagation(); siparisSilOnay(acikKalemler[0], m?.isim || '?'); }}
                                title="Sil"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>,
                  ];

                  if (cokKalem && acik) {
                    acikKalemler.forEach(s => {
                      const kalan  = s.adet - s.gonderilen;
                      const sBadge = kalan === 0 ? 'b-green' : s.gonderilen > 0 ? 'b-yellow' : 'b-red';
                      const sLabel = kalan === 0 ? 'Tamamlandı' : s.gonderilen > 0 ? 'Kısmi' : 'Bekliyor';
                      rows.push(
                        <tr key={`s-${s.id}`} style={{ background: 'rgba(0,0,0,.025)' }}>
                          <td></td>
                          <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>{fd(s.tarih)}</td>
                          <td></td>
                          <td style={{ paddingLeft: 8, fontSize: 12, color: 'var(--text3)' }}>
                            {s.koy || s.adres ? <span>📍 {s.koy || s.adres}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                          <td><span className="badge b-yellow">{SIP_CESIT_LABEL[s.cesit] || s.cesit}</span></td>
                          <td className="td-mono">{tl(s.toplamTutar)}</td>
                          <td className="td-mono" style={{ fontSize: 12 }}>{s.gonderilen.toLocaleString('tr-TR')} / {s.adet.toLocaleString('tr-TR')}</td>
                          <td>
                            <span className={`badge ${sBadge}`}>{sLabel}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={e => { e.stopPropagation(); setDuzenlenecek(s); }}
                                title="Düzenle"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={e => { e.stopPropagation(); siparisSilOnay(s, m?.isim || '?'); }}
                                title="Sil"
                              >
                                🗑️
                              </button>
                            </div>
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
                <button
                  key={s}
                  className={`btn btn-sm ${tesSiralama === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTesSiralama(prev => prev === s ? 'yeni' : s)}
                >
                  {s === 'yeni' ? '↓ En Yeni' : '↑ En Eski'}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
            <button
              className={`btn btn-sm ${tesFiltremod === 'hepsi' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTesFiltremod('hepsi')}
            >Tümü</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => { setTesGunTarih(prev => gunKaydir(prev, -1)); setTesFiltremod('gun'); }} style={{ padding: '4px 10px', fontWeight: 700 }}>‹</button>
              <div
                style={{ padding: '4px 12px', background: tesFiltremod === 'gun' ? 'rgba(45,122,79,.12)' : 'var(--surface)', border: `1px solid ${tesFiltremod === 'gun' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', minWidth: 100, textAlign: 'center', color: tesGunTarih === today() ? 'var(--accent)' : 'var(--text)', fontWeight: tesGunTarih === today() ? 700 : 400, cursor: 'pointer' }}
                onClick={() => { setTesGunTarih(today()); setTesFiltremod('gun'); }}
              >
                {tesFiltremod === 'gun' ? (tesGunTarih === today() ? 'Bugün' : fd(tesGunTarih)) : 'Bugün'}
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => { setTesGunTarih(prev => gunKaydir(prev, +1)); setTesFiltremod('gun'); }} style={{ padding: '4px 10px', fontWeight: 700 }}>›</button>
            </div>
            <button
              className={`btn btn-sm ${tesFiltremod === 'aralik' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTesFiltremod(prev => prev === 'aralik' ? 'hepsi' : 'aralik')}
            >Aralık</button>
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