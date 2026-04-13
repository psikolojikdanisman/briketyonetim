'use client';
import React from 'react';
import { useState } from 'react';
import type { AppData, Yukleme } from '@/types';
import { tl, fd, today, uid, saveYukleme, deleteYukleme } from '@/lib/storage';

interface YuklemeProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

type Adim = 'yukleme' | 'indirme';
type IndirmeTur = 'normal' | 'dama';

interface IndirmeNokta {
  id: number;
  miktar: string;
  tur: IndirmeTur;
  isciler: number[];
  not: string;
}

const TUR_LABEL: Record<string, string> = {
  yukleme: 'Briket Yükleme', bosaltma: 'Briket İndirme',
  dama_bosaltma: 'Dama / Çatı İndirme', cimento: 'Çimento Yükleme', cimento_indirme: 'Çimento İndirme',
};
const TUR_BADGE: Record<string, string> = {
  yukleme: 'b-blue', bosaltma: 'b-green', dama_bosaltma: 'b-yellow', cimento: 'b-gray', cimento_indirme: 'b-gray',
};

function yeniNokta(isciler: number[] = [], miktar = ''): IndirmeNokta {
  return { id: Date.now() + Math.random(), miktar, tur: 'normal', isciler, not: '' };
}

export default function YuklemePage({ data, onSave, showToast }: YuklemeProps) {
  const [adim, setAdim] = useState<Adim>('yukleme');
  const [tarih, setTarih] = useState(today());
  const [yukMiktar, setYukMiktar] = useState('');
  const [yukNot, setYukNot] = useState('');
  const [yukIsciler, setYukIsciler] = useState<number[]>([]);
  const [noktalar, setNoktalar] = useState<IndirmeNokta[]>([yeniNokta()]);
  const [acikYukleme, setAcikYukleme] = useState<number | null>(null);
  const [yukErrors, setYukErrors] = useState<{ miktar?: boolean; isciler?: boolean }>({});
  const [noktaErrors, setNoktaErrors] = useState<Record<number, { miktar?: boolean; isciler?: boolean }>>({});

  // Cimento yukleme
  const [cimentoVar, setCimentoVar] = useState(false);
  const [cimentoMiktar, setCimentoMiktar] = useState('');
  const [cimentoYukIsciler, setCimentoYukIsciler] = useState<number[]>([]);

  // Cimento indirme
  const [cimentoIndirmeIsciler, setCimentoIndirmeIsciler] = useState<number[]>([]);

  const a = data.ayarlar;
  const ucretYukleme    = a.ucretYukleme    || 0;
  const ucretBosaltma   = a.ucretBosaltma   || 0;
  const ucretDama       = a.ucretDama       || 0;
  const ucretCimento    = a.ucretCimento    || 0;
  const ucretCimentoInd = a.ucretCimentoIndirme || 0;

  const yukM = parseFloat(yukMiktar) || 0;
  const yukToplamUcret   = yukM * ucretYukleme;
  const yukKisiBasiUcret = yukIsciler.length > 0 ? yukToplamUcret / yukIsciler.length : 0;

  const cimentoM      = parseFloat(cimentoMiktar) || 0;
  const cimentoYukTop = cimentoM * ucretCimento;
  const cimentoYukKbp = cimentoYukIsciler.length > 0 ? cimentoYukTop / cimentoYukIsciler.length : 0;
  const cimentoIndTop = cimentoM * ucretCimentoInd;
  const cimentoIndKbp = cimentoIndirmeIsciler.length > 0 ? cimentoIndTop / cimentoIndirmeIsciler.length : 0;

  function noktaHesap(n: IndirmeNokta) {
    const m   = parseFloat(n.miktar) || 0;
    const biu = n.tur === 'dama' ? ucretDama : ucretBosaltma;
    const top = m * biu;
    const kbp = n.isciler.length > 0 ? top / n.isciler.length : 0;
    return { m, biu, top, kbp };
  }

  const indToplamUcret  = noktalar.reduce((s, n) => s + noktaHesap(n).top, 0);
  const toplamIndMiktar = noktalar.reduce((s, n) => s + (parseFloat(n.miktar) || 0), 0);

  function toggleYuk(id: number) {
    setYukIsciler(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    if (yukErrors.isciler) setYukErrors(e => ({ ...e, isciler: false }));
  }
  function toggleCimentoYukIsci(id: number) {
    setCimentoYukIsciler(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function toggleCimentoIndIsci(id: number) {
    setCimentoIndirmeIsciler(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function toggleNoktaIsci(nid: number, isciId: number) {
    setNoktalar(prev => prev.map(n => n.id !== nid ? n : { ...n, isciler: n.isciler.includes(isciId) ? n.isciler.filter(x => x !== isciId) : [...n.isciler, isciId] }));
    setNoktaErrors(prev => ({ ...prev, [nid]: { ...prev[nid], isciler: false } }));
  }
  function noktaGuncelle<K extends keyof IndirmeNokta>(nid: number, key: K, val: IndirmeNokta[K]) {
    setNoktalar(prev => prev.map(n => n.id !== nid ? n : { ...n, [key]: val }));
    if (key === 'miktar') setNoktaErrors(prev => ({ ...prev, [nid]: { ...prev[nid], miktar: false } }));
  }
  function noktaEkle() { setNoktalar(prev => [...prev, yeniNokta([...yukIsciler], yukMiktar)]); }
  function noktaSil(nid: number) {
    if (noktalar.length <= 1) { showToast('En az 1 indirme noktasi olmali', false); return; }
    setNoktalar(prev => prev.filter(n => n.id !== nid));
    setNoktaErrors(prev => { const next = { ...prev }; delete next[nid]; return next; });
  }

  function adim1Ileri() {
    const newErrors = { miktar: !yukM || yukM <= 0, isciler: yukIsciler.length === 0 };
    setYukErrors(newErrors);
    if (newErrors.miktar) { showToast('Miktar gerekli', false); return; }
    if (newErrors.isciler) { showToast('En az 1 yukleme iscisi secin', false); return; }
    if (cimentoVar && cimentoM <= 0) { showToast('Cimento miktari gerekli', false); return; }
    if (cimentoVar && cimentoYukIsciler.length === 0) { showToast('Cimento yukleme icin en az 1 isci secin', false); return; }
    setNoktalar(prev => prev.map((n, i) => i === 0 ? { ...n, miktar: yukMiktar, isciler: [...yukIsciler] } : n));
    setAdim('indirme');
  }

  async function sadecYuklemeKaydet() {
    try {
      const newErrors = { miktar: !yukM || yukM <= 0, isciler: yukIsciler.length === 0 };
      setYukErrors(newErrors);
      if (newErrors.miktar) { showToast('Miktar gerekli', false); return; }
      if (newErrors.isciler) { showToast('En az 1 isci secin', false); return; }
      if (cimentoVar && cimentoM <= 0) { showToast('Cimento miktari gerekli', false); return; }
      if (cimentoVar && cimentoYukIsciler.length === 0) { showToast('Cimento yukleme icin en az 1 isci secin', false); return; }
      const kayit: Yukleme = { id: uid(), tarih, tur: 'yukleme', miktar: yukM, isciler: yukIsciler, kisiBasiUcret: yukKisiBasiUcret, toplamUcret: yukToplamUcret, not: yukNot };
      const yeniKayitlar: Yukleme[] = [kayit];
      if (cimentoVar && cimentoM > 0 && cimentoYukIsciler.length > 0) {
        yeniKayitlar.push({ id: uid(), tarih, tur: 'cimento', miktar: cimentoM, isciler: cimentoYukIsciler, kisiBasiUcret: cimentoYukKbp, toplamUcret: cimentoYukTop, not: yukNot });
      }
      onSave({ ...data, yuklemeler: [...data.yuklemeler, ...yeniKayitlar] });
      await Promise.all(yeniKayitlar.map(saveYukleme));
      resetForm();
      showToast('Yukleme kaydedildi');
    } catch {
      showToast('Yukleme kaydedilemedi', false);
    }
  }

  async function kaydet() {
    try {
      const newNoktaErrors: Record<number, { miktar?: boolean; isciler?: boolean }> = {};
      let hasError = false;
      for (const n of noktalar) {
        const m = parseFloat(n.miktar);
        const err: { miktar?: boolean; isciler?: boolean } = {};
        if (!m || m <= 0) { err.miktar = true; hasError = true; }
        if (n.isciler.length === 0) { err.isciler = true; hasError = true; }
        if (Object.keys(err).length) newNoktaErrors[n.id] = err;
      }
      setNoktaErrors(newNoktaErrors);
      if (hasError) { showToast('Tum indirme noktalarini doldurun', false); return; }
      if (cimentoVar && cimentoIndirmeIsciler.length === 0) { showToast('Cimento indirme icin en az 1 isci secin', false); return; }

      const yukId = uid();
      const yukKayit: Yukleme = { id: yukId, tarih, tur: 'yukleme', miktar: yukM, isciler: yukIsciler, kisiBasiUcret: yukKisiBasiUcret, toplamUcret: yukToplamUcret, not: yukNot };
      const indKayitlar: Yukleme[] = noktalar.map(n => {
        const h = noktaHesap(n);
        return { id: uid(), tarih, tur: n.tur === 'dama' ? 'dama_bosaltma' : 'bosaltma', miktar: h.m, isciler: n.isciler, kisiBasiUcret: h.kbp, toplamUcret: h.top, not: n.not || yukNot, yuklemeId: yukId } as Yukleme;
      });
      const tumKayitlar: Yukleme[] = [yukKayit, ...indKayitlar];
      if (cimentoVar && cimentoM > 0 && cimentoYukIsciler.length > 0) {
        tumKayitlar.push({ id: uid(), tarih, tur: 'cimento', miktar: cimentoM, isciler: cimentoYukIsciler, kisiBasiUcret: cimentoYukKbp, toplamUcret: cimentoYukTop, not: yukNot, yuklemeId: yukId } as Yukleme);
      }
      if (cimentoVar && cimentoM > 0 && cimentoIndirmeIsciler.length > 0) {
        tumKayitlar.push({ id: uid(), tarih, tur: 'cimento_indirme', miktar: cimentoM, isciler: cimentoIndirmeIsciler, kisiBasiUcret: cimentoIndKbp, toplamUcret: cimentoIndTop, not: yukNot, yuklemeId: yukId } as Yukleme);
      }
      onSave({ ...data, yuklemeler: [...data.yuklemeler, ...tumKayitlar] });
      await Promise.all(tumKayitlar.map(saveYukleme));
      resetForm();
      showToast('Yukleme + ' + indKayitlar.length + ' indirme noktasi kaydedildi');
    } catch {
      showToast('Kayit kaydedilemedi', false);
    }
  }

  function resetForm() {
    setAdim('yukleme'); setYukMiktar(''); setYukNot(''); setYukIsciler([]);
    setNoktalar([yeniNokta()]); setYukErrors({}); setNoktaErrors({});
    setCimentoVar(false); setCimentoMiktar(''); setCimentoYukIsciler([]); setCimentoIndirmeIsciler([]);
  }

  async function silYukleme(yukId: number) {
    try {
      const silinecekler = data.yuklemeler.filter(y => {
        if (y.id === yukId) return true;
        const asExt = y as Yukleme & { yuklemeId?: number };
        return asExt.yuklemeId === yukId;
      });
      const filtered = data.yuklemeler.filter(y => {
        if (y.id === yukId) return false;
        const asExt = y as Yukleme & { yuklemeId?: number };
        return asExt.yuklemeId !== yukId;
      });
      onSave({ ...data, yuklemeler: filtered });
      await Promise.all(silinecekler.map(y => deleteYukleme(y.id)));
      setAcikYukleme(null);
      showToast('Kayit silindi');
    } catch {
      showToast('Kayit silinemedi', false);
    }
  }

  const adimRenk = (hedef: Adim) => adim === hedef ? 'var(--accent)' : adim === 'indirme' && hedef === 'yukleme' ? 'var(--green)' : 'var(--text3)';
  const sadecYuklemeler = [...data.yuklemeler].filter(y => y.tur === 'yukleme').sort((a, b) => b.tarih.localeCompare(a.tarih));
  function indirmeleriGetir(yukId: number) {
    return data.yuklemeler.filter(y => { if (y.tur === 'yukleme') return false; return (y as Yukleme & { yuklemeId?: number }).yuklemeId === yukId; });
  }

  return (
    <div>
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-header">
        <div className="panel-title">{adim === 'yukleme' ? '① Yükleme Girişi' : '② İndirme Girişi'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: adimRenk('yukleme'), fontWeight: adim === 'yukleme' ? 700 : 400 }}>{adim === 'indirme' ? '✓' : '①'} Yükleme</span>
          <span style={{ color: 'var(--border)' }}>──</span>
          <span style={{ color: adimRenk('indirme'), fontWeight: adim === 'indirme' ? 700 : 400 }}>② İndirme</span>
        </div>
      </div>
      <div className="panel-body">
        {adim === 'yukleme' && (
          <>
            <div className="frow c2">
              <div><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
              <div>
                <label>Briket Miktarı (adet)</label>
                <input type="number" min="1" placeholder="ör: 5000" value={yukMiktar} onChange={e => { setYukMiktar(e.target.value); if (yukErrors.miktar) setYukErrors(er => ({ ...er, miktar: false })); }} style={{ borderColor: yukErrors.miktar ? 'var(--red)' : undefined }} />
                {yukErrors.miktar && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>Geçerli bir miktar girin</div>}
              </div>
            </div>
            <div className="frow">
              <div>
                <label>Yükleme İşçileri</label>
                <div className="field-hint" style={{ marginBottom: 8 }}>Birim ücret: {ucretYukleme > 0 ? <strong style={{ color: 'var(--accent)' }}>{ucretYukleme.toFixed(3)} TL/adet</strong> : <span style={{ color: 'var(--red)' }}>Ayarlar sayfasından girin</span>}</div>
                {yukErrors.isciler && <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 4 }}>En az 1 işçi seçilmeli</div>}
                <div className="check-list" style={{ borderColor: yukErrors.isciler ? 'var(--red)' : undefined, borderWidth: yukErrors.isciler ? 1 : undefined, borderStyle: yukErrors.isciler ? 'solid' : undefined, borderRadius: yukErrors.isciler ? 'var(--radius)' : undefined, padding: yukErrors.isciler ? 6 : undefined }}>
                  {data.isciler.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 12 }}>Önce işçi ekleyin</span> : data.isciler.map(i => (
                    <div key={i.id} className={'check-item' + (yukIsciler.includes(i.id) ? ' selected' : '')} onClick={() => toggleYuk(i.id)}><div className="dot" />{i.isim}</div>
                  ))}
                </div>
              </div>
            </div>
            {yukM > 0 && yukIsciler.length > 0 && (
              <div className="calc-preview">
                <div className="calc-row"><span>Yükleme miktarı</span><span>{yukM.toLocaleString('tr-TR')} adet</span></div>
                <div className="calc-row"><span>Birim ücret</span><span>{ucretYukleme.toFixed(3)} TL/adet</span></div>
                <div className="calc-row"><span>Toplam ücret havuzu</span><span>{tl(yukToplamUcret)}</span></div>
                <div className="calc-row"><span>İşçi sayısı</span><span>{yukIsciler.length} kişi</span></div>
                <div className="calc-row total"><span>Kişi başı ücret</span><span>{tl(yukKisiBasiUcret)}</span></div>
              </div>
            )}

            {/* Cimento Secenegi */}
            <div style={{ marginBottom: 12 }}>
              <div
                className={'check-item' + (cimentoVar ? ' selected' : '')}
                style={{ display: 'inline-flex', marginBottom: 8 }}
                onClick={() => { setCimentoVar(v => !v); setCimentoMiktar(''); setCimentoYukIsciler([]); setCimentoIndirmeIsciler([]); }}
              >
                <div className="dot" /> Bu seferde çimento da var
              </div>
              {cimentoVar && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'var(--surface2)', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                  <div>
                    <label>Çimento Miktarı (torba)</label>
                    <input type="number" min="1" placeholder="ör: 100" value={cimentoMiktar} onChange={e => setCimentoMiktar(e.target.value)} />
                  </div>
                  <div>
                    <label>Çimento Yükleyen İşçiler</label>
                    <div className="field-hint" style={{ marginBottom: 6 }}>
                      Birim ücret: {ucretCimento > 0 ? <strong style={{ color: 'var(--accent)' }}>{ucretCimento.toFixed(3)} TL/torba</strong> : <span style={{ color: 'var(--red)' }}>Ayarlar sayfasından girin</span>}
                    </div>
                    <div className="check-list">
                      {data.isciler.map(i => (
                        <div key={i.id} className={'check-item' + (cimentoYukIsciler.includes(i.id) ? ' selected' : '')} onClick={() => toggleCimentoYukIsci(i.id)}>
                          <div className="dot" />{i.isim}
                        </div>
                      ))}
                    </div>
                  </div>
                  {cimentoM > 0 && cimentoYukIsciler.length > 0 && (
                    <div className="calc-preview" style={{ marginBottom: 0 }}>
                      <div className="calc-row"><span>Çimento miktarı</span><span>{cimentoM.toLocaleString('tr-TR')} torba</span></div>
                      <div className="calc-row"><span>Birim ücret (yükleme)</span><span>{ucretCimento.toFixed(3)} TL/torba</span></div>
                      <div className="calc-row"><span>Toplam havuz</span><span>{tl(cimentoYukTop)}</span></div>
                      <div className="calc-row"><span>İşçi sayısı</span><span>{cimentoYukIsciler.length} kişi</span></div>
                      <div className="calc-row total"><span>Kişi başı ücret</span><span>{tl(cimentoYukKbp)}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="frow"><div><label>Araç / Not</label><input type="text" placeholder="Plaka, şoför, müşteri..." value={yukNot} onChange={e => setYukNot(e.target.value)} /></div></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={adim1Ileri}>İndirme Adımına Geç →</button>
              <button className="btn btn-secondary" onClick={sadecYuklemeKaydet}>Sadece Yükleme Kaydet</button>
            </div>
          </>
        )}
        {adim === 'indirme' && (
          <>
            <div style={{ background: 'rgba(46,196,182,.06)', border: '1px solid rgba(46,196,182,.2)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text3)' }}>
              YUKLEME &nbsp;<span style={{ color: 'var(--accent)' }}>{yukM.toLocaleString('tr-TR')} adet</span>&nbsp;·&nbsp;
              <span style={{ color: 'var(--green)' }}>{tl(yukToplamUcret)}</span>&nbsp;·&nbsp;
              <span style={{ color: 'var(--text2)' }}>{yukIsciler.map(id => data.isciler.find(i => i.id === id)?.isim || '?').join(', ')}</span>
              {cimentoVar && cimentoM > 0 && (
                <span style={{ marginLeft: 12, color: 'var(--amber)' }}>+ Cimento: {cimentoM} torba</span>
              )}
            </div>

            {noktalar.map((n, idx) => {
              const h = noktaHesap(n);
              const nm = parseFloat(n.miktar) || 0;
              const nErr = noktaErrors[n.id] || {};
              return (
                <div key={n.id} style={{ border: '1px solid ' + ((nErr.miktar || nErr.isciler) ? 'var(--red)' : 'var(--border)'), borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 12, background: 'var(--surface2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{idx + 1}. BRİKET İNDİRME NOKTASI</div>
                    {noktalar.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => noktaSil(n.id)}>✕ Kaldır</button>}
                  </div>
                  <div className="frow c2" style={{ marginBottom: 10 }}>
                    <div>
                      <label>Miktar (adet)</label>
                      <input type="number" min="1" placeholder="ör: 800" value={n.miktar} onChange={e => noktaGuncelle(n.id, 'miktar', e.target.value)} style={{ borderColor: nErr.miktar ? 'var(--red)' : undefined }} />
                      {nErr.miktar && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>Geçerli miktar girin</div>}
                    </div>
                    <div>
                      <label>İndirme Türü</label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {(['normal', 'dama'] as IndirmeTur[]).map(t => (
                          <div key={t} className={'check-item' + (n.tur === t ? ' selected' : '')} style={{ flex: 1, justifyContent: 'center', padding: '7px 8px' }} onClick={() => noktaGuncelle(n.id, 'tur', t)}>
                            <div className="dot" />{t === 'normal' ? 'Normal' : 'Dama / Çatı'}
                          </div>
                        ))}
                      </div>
                      <div className="field-hint" style={{ marginTop: 5 }}>Birim: {h.biu > 0 ? <strong style={{ color: 'var(--accent)' }}>{h.biu.toFixed(3)} TL/adet</strong> : <span style={{ color: 'var(--red)' }}>Ayarlardan girin</span>}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label>İndirme İşçileri</label>
                    <div className="field-hint" style={{ marginBottom: 6, color: 'var(--text2)' }}>Yükleme işçileri varsayılan — değiştirilebilir</div>
                    {nErr.isciler && <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 4 }}>En az 1 işçi seçilmeli</div>}
                    <div className="check-list" style={{ borderColor: nErr.isciler ? 'var(--red)' : undefined, borderWidth: nErr.isciler ? 1 : undefined, borderStyle: nErr.isciler ? 'solid' : undefined, borderRadius: nErr.isciler ? 'var(--radius)' : undefined, padding: nErr.isciler ? 6 : undefined }}>
                      {data.isciler.length === 0 ? <span style={{ color: 'var(--text3)', fontSize: 12 }}>Önce işçi ekleyin</span> : data.isciler.map(i => (
                        <div key={i.id} className={'check-item' + (n.isciler.includes(i.id) ? ' selected' : '')} onClick={() => toggleNoktaIsci(n.id, i.id)}><div className="dot" />{i.isim}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}><label>Not (isteğe bağlı)</label><input type="text" placeholder="ör: Ahmet Bey'in evi..." value={n.not} onChange={e => noktaGuncelle(n.id, 'not', e.target.value)} /></div>
                  {nm > 0 && n.isciler.length > 0 && (
                    <div className="calc-preview" style={{ marginBottom: 0 }}>
                      <div className="calc-row"><span>Miktar</span><span>{nm.toLocaleString('tr-TR')} adet</span></div>
                      <div className="calc-row"><span>Birim ücret ({n.tur === 'dama' ? 'Dama' : 'Normal'})</span><span>{h.biu.toFixed(3)} TL/adet</span></div>
                      <div className="calc-row"><span>Toplam havuz</span><span>{tl(h.top)}</span></div>
                      <div className="calc-row"><span>İşçi sayısı</span><span>{n.isciler.length} kişi</span></div>
                      <div className="calc-row total"><span>Kişi başı ücret</span><span>{tl(h.kbp)}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
            <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={noktaEkle}>+ Briket İndirme Noktası Ekle</button>

            {cimentoVar && cimentoM > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 12, background: 'var(--surface2)' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber)', fontWeight: 700, marginBottom: 12 }}>ÇİMENTO İNDİRME</div>
                <div style={{ marginBottom: 10 }}>
                  <label>Çimento İndiren İşçiler</label>
                  <div className="field-hint" style={{ marginBottom: 6 }}>
                    {cimentoM} torba · Birim ücret: {ucretCimentoInd > 0 ? <strong style={{ color: 'var(--accent)' }}>{ucretCimentoInd.toFixed(3)} TL/torba</strong> : <span style={{ color: 'var(--red)' }}>Ayarlardan girin</span>}
                  </div>
                  <div className="check-list">
                    {data.isciler.map(i => (
                      <div key={i.id} className={'check-item' + (cimentoIndirmeIsciler.includes(i.id) ? ' selected' : '')} onClick={() => toggleCimentoIndIsci(i.id)}>
                        <div className="dot" />{i.isim}
                      </div>
                    ))}
                  </div>
                </div>
                {cimentoM > 0 && cimentoIndirmeIsciler.length > 0 && (
                  <div className="calc-preview" style={{ marginBottom: 0 }}>
                    <div className="calc-row"><span>Çimento miktarı</span><span>{cimentoM.toLocaleString('tr-TR')} torba</span></div>
                    <div className="calc-row"><span>Birim ücret (indirme)</span><span>{ucretCimentoInd.toFixed(3)} TL/torba</span></div>
                    <div className="calc-row"><span>Toplam havuz</span><span>{tl(cimentoIndTop)}</span></div>
                    <div className="calc-row"><span>İşçi sayısı</span><span>{cimentoIndirmeIsciler.length} kişi</span></div>
                    <div className="calc-row total"><span>Kişi başı ücret</span><span>{tl(cimentoIndKbp)}</span></div>
                  </div>
                )}
              </div>
            )}

            {toplamIndMiktar > 0 && (
              <div style={{ background: toplamIndMiktar > yukM ? 'rgba(224,112,112,.08)' : toplamIndMiktar < yukM ? 'rgba(106,176,216,.08)' : 'rgba(77,217,172,.08)', border: '1px solid ' + (toplamIndMiktar > yukM ? 'rgba(224,112,112,.3)' : toplamIndMiktar < yukM ? 'rgba(106,176,216,.3)' : 'rgba(77,217,172,.3)'), borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
                <span style={{ color: 'var(--text3)' }}>Toplam indirilen: </span>
                <strong style={{ color: toplamIndMiktar > yukM ? 'var(--red)' : toplamIndMiktar < yukM ? 'var(--blue)' : 'var(--green)' }}>{toplamIndMiktar.toLocaleString('tr-TR')} / {yukM.toLocaleString('tr-TR')} adet</strong>
                {toplamIndMiktar > yukM && <span style={{ color: 'var(--red)', marginLeft: 8 }}>⚠ Yükleme miktarını aştı</span>}
                {toplamIndMiktar < yukM && <span style={{ color: 'var(--blue)', marginLeft: 8 }}>— {(yukM - toplamIndMiktar).toLocaleString('tr-TR')} adet eksik</span>}
                {toplamIndMiktar === yukM && <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ Tam eşleşme</span>}
              </div>
            )}
            {indToplamUcret > 0 && (
              <div style={{ background: 'rgba(77,217,172,.07)', border: '1px solid rgba(77,217,172,.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                <div><div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>YÜKLEME TOPLAM</div><div style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600 }}>{tl(yukToplamUcret)}</div></div>
                <div><div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>İNDİRME TOPLAM ({noktalar.length} nokta)</div><div style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600 }}>{tl(indToplamUcret)}</div></div>
                <div><div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>GENEL TOPLAM</div><div style={{ color: 'var(--green)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700 }}>{tl(yukToplamUcret + indToplamUcret)}</div></div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={kaydet}>✦ Tümünü Kaydet ({1 + noktalar.length} işlem)</button>
              <button className="btn btn-secondary" onClick={() => setAdim('yukleme')}>← Geri</button>
            </div>
          </>
        )}
      </div>
    </div>
    <div className="panel">
      <div className="panel-header"><div className="panel-title">Yükleme Kayıtları</div></div>
      <div className="panel-body-0">
        <div className="table-wrap">
          <table>
            <thead><tr><th></th><th>Tarih</th><th>Miktar</th><th>İşçiler</th><th>K.Başı ₺</th><th>Toplam ₺</th><th>Not</th><th></th></tr></thead>
            <tbody>
              {sadecYuklemeler.length === 0 ? (
                <tr><td colSpan={8} className="empty">Kayıt yok</td></tr>
              ) : sadecYuklemeler.map(y => {
                const isciAdlari = y.isciler.map(id => data.isciler.find(i => i.id === id)?.isim || '?').join(', ');
                const indirmeler = indirmeleriGetir(y.id);
                const acik = acikYukleme === y.id;
                return (
                  <React.Fragment key={y.id}>
                    <tr style={{ cursor: indirmeler.length > 0 ? 'pointer' : 'default' }} onClick={() => indirmeler.length > 0 && setAcikYukleme(acik ? null : y.id)}>
                      <td style={{ width: 28, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>{indirmeler.length > 0 ? <span style={{ color: acik ? 'var(--accent)' : 'var(--text3)' }}>{acik ? '▾' : '▸'}</span> : ''}</td>
                      <td>{fd(y.tarih)}</td>
                      <td className="td-mono">{y.miktar.toLocaleString('tr-TR')}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{isciAdlari}</td>
                      <td className="td-mono">{tl(y.kisiBasiUcret)}</td>
                      <td className="td-mono">{tl(y.toplamUcret)}</td>
                      <td style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{y.not || '—'}</td>
                      <td onClick={e => e.stopPropagation()}><button className="btn btn-danger btn-sm" onClick={() => silYukleme(y.id)}>Sil</button></td>
                    </tr>
                    {acik && indirmeler.map((ind, idx) => {
                      const indIsci = ind.isciler.map(id => data.isciler.find(i => i.id === id)?.isim || '?').join(', ');
                      return (
                        <tr key={ind.id} style={{ background: 'rgba(46,196,182,.04)' }}>
                          <td style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10, color: 'var(--text3)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>└ {idx + 1}</td>
                          <td><span className={'badge ' + (TUR_BADGE[ind.tur] || 'b-gray')} style={{ fontSize: 9 }}>{TUR_LABEL[ind.tur] || ind.tur}</span></td>
                          <td className="td-mono" style={{ fontSize: 11 }}>{ind.miktar.toLocaleString('tr-TR')}</td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{indIsci}</td>
                          <td className="td-mono" style={{ fontSize: 11 }}>{tl(ind.kisiBasiUcret)}</td>
                          <td className="td-mono" style={{ fontSize: 11 }}>{tl(ind.toplamUcret)}</td>
                          <td style={{ fontSize: 11, color: 'var(--text3)' }}>{ind.not || '—'}</td>
                          <td></td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}