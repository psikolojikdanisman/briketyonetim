'use client';
import { useState, useMemo } from 'react';
import type { AppData, Siparis, Teslimat } from '@/types';
import { tl, fd, today, uid, SIP_BIRIM, SIP_CESIT_LABEL } from '@/lib/storage';
import MusteriSecici from '@/components/MusteriSecici';

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

export default function SiparislerPage({ data, onSave, showToast }: SiparislerProps) {
  // ─── Sipariş formu ────────────────────────────────────────────────────────
  const [musteri, setMusteri] = useState('');
  const [tarih, setTarih] = useState(today());
  const [koyAra, setKoyAra] = useState('');
  const [koySecili, setKoySecili] = useState('');
  const [adres, setAdres] = useState('');
  const [notVal, setNotVal] = useState('');
  const [showDd, setShowDd] = useState(false);
  const [urunler, setUrunler] = useState<UrunSatiri[]>([{ cesit: '20lik', adet: '', fiyat: '' }]);

  // ─── Teslimat formu ───────────────────────────────────────────────────────
  const [tMusteri, setTMusteri] = useState('');
  const [seciliSiparisler, setSeciliSiparisler] = useState<SeciliSiparis[]>([]);
  const [tOdeme, setTOdeme] = useState('pesin');
  const [tTahsil, setTTahsil] = useState('');
  const [tTarih, setTTarih] = useState(today());

  // ─── Tablo açma/kapama ────────────────────────────────────────────────────
  const [acikSipGruplari, setAcikSipGruplari] = useState<Set<number>>(new Set());
  const [acikTesGruplari, setAcikTesGruplari] = useState<Set<string>>(new Set());

  // ─── Teslimat filtre ──────────────────────────────────────────────────────
  const [tesSiralama, setTesSiralama] = useState<'yeni' | 'eski'>('yeni');
  const [tesFiltremod, setTesFiltremod] = useState<'hepsi' | 'gun' | 'aralik'>('hepsi');
  const [tesGunTarih, setTesGunTarih] = useState(today());
  const [tesBaslangic, setTesBaslangic] = useState('');
  const [tesBitis, setTesBitis] = useState('');
  const [tesMusteriAra, setTesMusteriAra] = useState('');
  const [tesKoyAra, setTesKoyAra] = useState('');

  // ─── Sipariş formu yardımcıları ───────────────────────────────────────────
  function urunEkle() { setUrunler(u => [...u, { cesit: '20lik', adet: '', fiyat: '' }]); }
  function urunSil(i: number) {
    if (urunler.length <= 1) { showToast('En az 1 ürün satırı olmalı', false); return; }
    setUrunler(u => u.filter((_, idx) => idx !== i));
  }
  function urunGuncelle(i: number, field: keyof UrunSatiri, val: string) {
    setUrunler(u => u.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  }

  function siparisKaydet() {
    if (!musteri) { showToast('Müşteri seçin', false); return; }
    const mid = parseInt(musteri);
    const koyObj = data.koyler.find(k => k.isim === koySecili);
    const bolge = koyObj?.bolge || '';
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
    setUrunler([{ cesit: '20lik', adet: '', fiyat: '' }]);
    setNotVal(''); setAdres(''); setKoyAra(''); setKoySecili('');
    showToast(gecerli.length > 1 ? `${gecerli.length} sipariş eklendi ✓` : 'Sipariş eklendi ✓');
  }

  function siparisSil(id: number) {
    onSave({ ...data, siparisler: data.siparisler.filter(s => s.id !== id) });
    showToast('Sipariş silindi');
  }

  // ─── Teslimat formu yardımcıları ──────────────────────────────────────────
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
      const sip = data.siparisler.find(s => s.id === sipId);
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
    setSeciliSiparisler([]);
    setTTahsil('');
    showToast(`${yeniTeslimatlar.length} kalem teslimat eklendi ✓`);
  }

  const filtreKoyler = data.koyler.filter(k =>
    !koyAra || k.isim.toLowerCase().includes(koyAra.toLowerCase())
  );

  // ─── Sipariş grupları: müşteriye göre ─────────────────────────────────────
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

  // ─── Teslimat: filtre + sırala + grupla ───────────────────────────────────
  const filtreliTeslimatlar = useMemo(() => {
    let list = [...data.teslimatlar];

    // Tarih filtresi
    if (tesFiltremod === 'gun') {
      list = list.filter(t => t.tarih === tesGunTarih);
    } else if (tesFiltremod === 'aralik') {
      if (tesBaslangic) list = list.filter(t => t.tarih >= tesBaslangic);
      if (tesBitis)     list = list.filter(t => t.tarih <= tesBitis);
    }

    // Müşteri adı araması
    if (tesMusteriAra.trim()) {
      const ara = tesMusteriAra.trim().toLowerCase();
      list = list.filter(t => {
        const m = data.musteriler.find(x => x.id === t.musteriId);
        return m?.isim.toLowerCase().includes(ara);
      });
    }

    // Köy araması
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

  // ─── Durum badge yardımcıları ─────────────────────────────────────────────
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
      <div className="two-col">

        {/* ── Sipariş formu ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Yeni Sipariş</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Müşteri</label>
                <MusteriSecici
                  musteriler={data.musteriler}
                  value={musteri}
                  onChange={setMusteri}
                  placeholder="— Müşteri seç —"
                />
              </div>
              <div>
                <label>Tarih</label>
                <input type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
              </div>
            </div>
            <div className="frow" style={{ position: 'relative' }}>
              <div>
                <label>Teslimat Yeri (Köy / Bölge)</label>
                <input type="text" placeholder="Arayın..."
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
                        onMouseDown={() => { setKoyAra(k.isim); setKoySecili(k.isim); setShowDd(false); }}>
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
                <label>Detaylı Adres / Not</label>
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
                    <input type="number" step="0.01" placeholder="0.00" value={u.fiyat} onChange={e => urunGuncelle(i, 'fiyat', e.target.value)} />
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
                  value={tMusteri}
                  onChange={handleTMusteriSec}
                  placeholder="— Müşteri seç —"
                />
              </div>
            </div>

            {tMusteri && tMusteriAcikSiparisler.length === 0 && (
              <div style={{ padding: '10px 0', color: 'var(--text3)', fontSize: 13 }}>
                Bu müşterinin açık siparişi yok.
              </div>
            )}

            {tMusteri && tMusteriAcikSiparisler.length > 0 && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ marginBottom: 8, display: 'block' }}>Teslim Edilecek Siparişler</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tMusteriAcikSiparisler.map(sip => {
                      const secili = seciliSiparisler.find(s => s.siparisId === sip.id);
                      const kalan = sip.adet - sip.gonderilen;
                      return (
                        <div key={sip.id} style={{
                          border: `1px solid ${secili ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius)', padding: '10px 12px',
                          background: secili ? 'rgba(46,196,182,.06)' : 'var(--bg)',
                          transition: 'all .15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: secili ? 8 : 0 }}>
                            <input type="checkbox" id={`sip-${sip.id}`} checked={!!secili}
                              onChange={() => toggleSiparis(sip.id)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                            <label htmlFor={`sip-${sip.id}`} style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                {SIP_CESIT_LABEL[sip.cesit] || sip.cesit}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
                                kalan: {kalan.toLocaleString('tr-TR')} {sip.birim || 'adet'} • {tl(sip.fiyat)}/{sip.birim || 'adet'}
                              </span>
                              {sip.koy && (
                                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>📍 {sip.koy}</span>
                              )}
                            </label>
                          </div>
                          {secili && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 26 }}>
                              <div>
                                <label style={{ fontSize: 11 }}>Bu Sefer Gönderilecek</label>
                                <input type="number" placeholder={`max ${kalan}`} value={secili.adet}
                                  onChange={e => seciliAdetGuncelle(sip.id, e.target.value)} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                                <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'IBM Plex Mono, monospace' }}>
                                  = {tl((parseFloat(secili.adet) || 0) * sip.fiyat)}
                                </span>
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
                    <div style={{
                      background: 'rgba(46,196,182,.08)', border: '1px solid rgba(46,196,182,.25)',
                      borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 12,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 13, fontFamily: 'IBM Plex Mono, monospace',
                    }}>
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
                      ✓ Teslimat Yap ({seciliSiparisler.length} kalem)
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

      {/* ═══ SİPARİŞLER TABLOSU ═══ */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Siparişler</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Müşteri</th>
                  <th>Ana Ürün</th>
                  <th>Toplam Tutar</th>
                  <th>İlerleme</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sipGruplari.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Sipariş yok</td></tr>
                ) : sipGruplari.flatMap(([musteriId, kalemler]) => {
                  const m    = data.musteriler.find(x => x.id === musteriId);
                  const acik = acikSipGruplari.has(musteriId);
                  const badge      = sipDurumBadge(kalemler);
                  const topTutar   = kalemler.reduce((s, k) => s + k.toplamTutar, 0);
                  const topAdet    = kalemler.reduce((s, k) => s + k.adet, 0);
                  const topGond    = kalemler.reduce((s, k) => s + k.gonderilen, 0);

                  const rows = [
                    <tr key={`g-${musteriId}`}
                      onClick={() => toggleSipGrup(musteriId)}
                      style={{ cursor: 'pointer', background: acik ? 'rgba(46,196,182,.04)' : undefined }}
                    >
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', userSelect: 'none' }}>
                        {acik ? '▾' : '▸'}
                      </td>
                      <td className="td-bold">{m?.isim || '?'}</td>
                      <td>
                        <span className="badge b-yellow">{anaUrun(kalemler)}</span>
                        {kalemler.length > 1 && (
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
                            +{kalemler.length - 1} kalem
                          </span>
                        )}
                      </td>
                      <td className="td-mono">{tl(topTutar)}</td>
                      <td className="td-mono" style={{ fontSize: 12 }}>
                        {topGond.toLocaleString('tr-TR')} / {topAdet.toLocaleString('tr-TR')}
                      </td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    </tr>,
                  ];

                  if (acik) {
                    kalemler.forEach(s => {
                      const kalan = s.adet - s.gonderilen;
                      const sBadge = kalan === 0 ? 'b-green' : s.gonderilen > 0 ? 'b-yellow' : 'b-red';
                      const sLabel = kalan === 0 ? 'Tamamlandı' : s.gonderilen > 0 ? 'Kısmi' : 'Bekliyor';
                      rows.push(
                        <tr key={`s-${s.id}`} style={{ background: 'rgba(0,0,0,.025)' }}>
                          <td></td>
                          <td colSpan={1} style={{ paddingLeft: 28, fontSize: 12, color: 'var(--text3)' }}>
                            📍 {s.koy || s.adres || '—'}
                            <span style={{ marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{fd(s.tarih)}</span>
                          </td>
                          <td><span className="badge b-yellow">{SIP_CESIT_LABEL[s.cesit] || s.cesit}</span></td>
                          <td className="td-mono">{tl(s.toplamTutar)}</td>
                          <td className="td-mono" style={{ fontSize: 12 }}>
                            {s.gonderilen.toLocaleString('tr-TR')} / {s.adet.toLocaleString('tr-TR')}
                          </td>
                          <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className={`badge ${sBadge}`}>{sLabel}</span>
                            <button className="btn btn-danger btn-sm"
                              onClick={e => { e.stopPropagation(); siparisSil(s.id); }}>Sil</button>
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

        {/* Filtre çubuğu */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>

          {/* Üst satır: sıralama + tarih mod butonları */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

            {/* Sıralama */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['yeni','eski'] as const).map(s => (
                <button key={s}
                  className={`btn btn-sm ${tesSiralama === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTesSiralama(s)}
                >
                  {s === 'yeni' ? '↓ En Yeni' : '↑ En Eski'}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

            {/* Filtre modu: Tümü / Aralık */}
            {(['hepsi','aralik'] as const).map((val) => {
              const label = val === 'hepsi' ? 'Tümü' : 'Aralık';
              return (
                <button key={val}
                  className={`btn btn-sm ${tesFiltremod === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTesFiltremod(val)}
                >
                  {label}
                </button>
              );
            })}

            {/* Gün navigatörü — her zaman görünür */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setTesGunTarih(prev => gunKaydir(prev, -1)); setTesFiltremod('gun'); }}
                style={{ padding: '4px 10px', fontWeight: 700 }}
              >‹</button>
              <div style={{
                padding: '4px 12px',
                background: tesFiltremod === 'gun' ? 'rgba(46,196,182,.12)' : 'var(--surface)',
                border: `1px solid ${tesFiltremod === 'gun' ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                fontSize: 13,
                fontFamily: 'IBM Plex Mono, monospace',
                minWidth: 100,
                textAlign: 'center',
                color: tesGunTarih === today() ? 'var(--accent)' : 'var(--text)',
                fontWeight: tesGunTarih === today() ? 700 : 400,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
                onClick={() => {
                  setTesGunTarih(today());
                  setTesFiltremod('gun');
                }}
                title="Bugüne dön / gün filtresini aç"
              >
                {tesGunTarih === today() ? 'Bugün' : fd(tesGunTarih)}
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setTesGunTarih(prev => gunKaydir(prev, +1)); setTesFiltremod('gun'); }}
                style={{ padding: '4px 10px', fontWeight: 700 }}
                >›</button>
            </div>

            {/* Aralık modu */}
            {tesFiltremod === 'aralik' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={tesBaslangic} onChange={e => setTesBaslangic(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                <input type="date" value={tesBitis} onChange={e => setTesBitis(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
            )}

            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {tesGruplari.length} kayıt
            </span>
          </div>

          {/* Alt satır: müşteri + köy arama */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
              <input
                type="text"
                placeholder="🔍 Müşteri ara..."
                value={tesMusteriAra}
                onChange={e => setTesMusteriAra(e.target.value)}
                style={{
                  width: '100%', padding: '5px 28px 5px 10px', fontSize: 13,
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
                }}
              />
              {tesMusteriAra && (
                <button onClick={() => setTesMusteriAra('')}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
              <input
                type="text"
                placeholder="🔍 Köy / yer ara..."
                value={tesKoyAra}
                onChange={e => setTesKoyAra(e.target.value)}
                style={{
                  width: '100%', padding: '5px 28px 5px 10px', fontSize: 13,
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
                }}
              />
              {tesKoyAra && (
                <button onClick={() => setTesKoyAra('')}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>
          </div>
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
                  <th>Tahsil</th>
                  <th>Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {tesGruplari.length === 0 ? (
                  <tr><td colSpan={9} className="empty">Kayıt yok</td></tr>
                ) : tesGruplari.flatMap(({ key, kalemler }) => {
                  const m         = data.musteriler.find(x => x.id === kalemler[0].musteriId);
                  const acik      = acikTesGruplari.has(key);
                  const topTutar  = kalemler.reduce((s, t) => s + t.tutar,  0);
                  const topTahsil = kalemler.reduce((s, t) => s + t.tahsil, 0);
                  const topKalan  = topTutar - topTahsil;
                  const badge     = tesDurumBadge(kalemler);
                  const coklu     = kalemler.length > 1;

                  // Yer: tek kalemde direkt göster, çokluda "N yer" özeti
                  const yerOzet = coklu
                    ? (() => {
                        const yerler = [...new Set(kalemler.map(t => t.koy || t.bolge || '').filter(Boolean))];
                        return yerler.length === 1 ? yerler[0] : `${yerler.length} yer`;
                      })()
                    : yerBilgisi(kalemler[0]);

                  const rows = [
                    <tr key={`tg-${key}`}
                      onClick={() => coklu && toggleTesGrup(key)}
                      style={{ cursor: coklu ? 'pointer' : 'default', background: acik ? 'rgba(46,196,182,.04)' : undefined }}
                    >
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', userSelect: 'none' }}>
                        {coklu ? (acik ? '▾' : '▸') : ''}
                      </td>
                      <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fd(kalemler[0].tarih)}</td>
                      <td className="td-bold">{m?.isim || '?'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {yerOzet ? <span title={yerOzet}>📍 {yerOzet}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td>
                        <span className="badge b-yellow">{anaUrunTeslimat(kalemler)}</span>
                        {coklu && (
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
                            +{kalemler.length - 1} kalem
                          </span>
                        )}
                      </td>
                      <td className="td-mono">{tl(topTutar)}</td>
                      <td className="td-mono positive">{tl(topTahsil)}</td>
                      <td className={`td-mono ${topKalan > 0 ? 'negative' : ''}`}>{tl(topKalan)}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    </tr>,
                  ];

                  if (acik) {
                    kalemler.forEach(t => {
                      const k  = t.tutar - t.tahsil;
                      const bd = k <= 0 ? 'b-green' : t.tahsil > 0 ? 'b-yellow' : 'b-red';
                      const bl = k <= 0 ? 'Ödendi'  : t.tahsil > 0 ? 'Kısmi'   : 'Borçlu';
                      rows.push(
                        <tr key={`t-${t.id}`} style={{ background: 'rgba(0,0,0,.025)' }}>
                          <td></td>
                          <td></td>
                          <td style={{ paddingLeft: 28, fontSize: 12, color: 'var(--text3)' }}>
                            {[t.koy, t.adres].filter(Boolean).join(' • ') || t.bolge || '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                            {yerBilgisi(t) !== '—' ? <span>📍 {yerBilgisi(t)}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                          <td>
                            <span className="badge b-yellow">{SIP_CESIT_LABEL[t.cesit] || t.cesit}</span>
                            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6, fontFamily: 'IBM Plex Mono, monospace' }}>
                              {t.adet.toLocaleString('tr-TR')} {t.birim || 'adet'}
                            </span>
                          </td>
                          <td className="td-mono">{tl(t.tutar)}</td>
                          <td className="td-mono positive">{tl(t.tahsil)}</td>
                          <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{tl(k)}</td>
                          <td><span className={`badge ${bd}`}>{bl}</span></td>
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
    </div>
  );
}