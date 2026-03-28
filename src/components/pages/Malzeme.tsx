'use client';
import { useState } from 'react';
import type { AppData, Malzeme } from '@/types';
import { tl, fd, today, uid, TURADI } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';

interface MalzemeProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

interface TirSatiri { miktar: string; fiyat: string; }

function varsayilanTedarikci(data: AppData, tur: 'micir' | 'cimento'): string {
  const eslesen = data.tedarikciListesi.filter(t => t.tur === tur);
  return eslesen.length === 1 ? String(eslesen[0].id) : '';
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

  const birimLbl = tur === 'cimento' ? 'Miktar (torba)' : 'Miktar (ton)';
  const tarife = tur === 'micir' ? data.ayarlar.micirFiyat : data.ayarlar.cimentoFiyat;
  const turTedarikci   = data.tedarikciListesi.filter(t => t.tur === tur);
  const gbTurTedarikci = data.tedarikciListesi.filter(t => t.tur === gbTur);

  function handleTurDegis(yeniTur: 'micir' | 'cimento') {
    setTur(yeniTur);
    setTirlar([{ miktar: '', fiyat: '' }]);
    setTedarikci(varsayilanTedarikci(data, yeniTur));
  }

  function tirEkle() { setTirlar(t => [...t, { miktar: '', fiyat: String(tarife || '') }]); }
  function tirKaldir(i: number) {
    if (tirlar.length <= 1) { showToast('En az 1 tır olmalı', false); return; }
    setTirlar(t => t.filter((_, idx) => idx !== i));
  }
  function tirGuncelle(i: number, field: keyof TirSatiri, val: string) {
    setTirlar(t => t.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  }

  function kaydet() {
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
    setTirlar([{ miktar: '', fiyat: String(tarife || '') }]);
    setNotVal('');
    showToast('Malzeme girişi kaydedildi ✓');
  }

  function malzemeSil(id: number) { onSave({ ...data, malzemeler: data.malzemeler.filter(m => m.id !== id) }); }

  function tedarikciEkle() {
    if (!tedIsim.trim()) { showToast('Tedarikçi adı gerekli', false); return; }
    onSave({ ...data, tedarikciListesi: [...data.tedarikciListesi, { id: uid(), isim: tedIsim.trim(), tur: tedTur }] });
    setTedIsim('');
    showToast('Tedarikçi eklendi');
  }

  function tedarikciSil(id: number) {
    onSave({ ...data, tedarikciListesi: data.tedarikciListesi.filter(t => t.id !== id && t.tur !== 'diger') });
  }

  function gecmisBorcKaydet() {
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
    setGbTedarikci(''); setGbBorc(''); setGbTarih(''); setGbMiktar(''); setGbNot('');
    setGbDetayAcik(false);
    showToast('Geçmiş borç eklendi ✓');
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

  function tedarikOdemeKaydet() {
    const tid = parseInt(tpTedarik); const t = parseFloat(tpTutar);
    if (!tid || !t) { showToast('Tedarikçi ve tutar gerekli', false); return; }
    const tedObj = data.tedarikciListesi.find(x => x.id === tid);
    const borçBilgisi = tedarikBorc(tid);
    const makbuzNo = `TO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    onSave({
      ...data,
      tedarikOdemeler: [...data.tedarikOdemeler, {
        id: uid(), tedarikciId: tid, tutar: t,
        tarih: tpTarih || today(), aciklama: tpAciklama,
      }],
    });
    setSonOdeme({
      tedId: tid,
      tedIsim: tedObj?.isim || '?',
      tutar: t,
      tarih: tpTarih || today(),
      aciklama: tpAciklama,
      no: makbuzNo,
    });
    // borçBilgisi'ni makbuz için kullan
    void borçBilgisi;
    setTpTutar(''); setTpAciklama(''); setTpTedarik('');
    showToast('Ödeme kaydedildi ✓');
  }

  function tedarikMakbuzAc() {
    if (!sonOdeme) return;
    const b = tedarikBorc(sonOdeme.tedId);
    const kalanSonra = Math.max(0, b.kalan); // kalan, ödeme sonrası hesaplanmış
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

  return (
    <div>
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

        {/* ── Son Girişler ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Son Girişler</div></div>
          <div className="panel-body-0">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tarih</th><th>Tür</th><th>Toplam Miktar</th><th>Toplam Tutar</th><th>Tedarikçi</th><th></th></tr></thead>
                <tbody>
                  {data.malzemeler.length === 0 ? (
                    <tr><td colSpan={6} className="empty">Kayıt yok</td></tr>
                  ) : [...data.malzemeler].reverse().slice(0, 20).map(m => (
                    <tr key={m.id} style={m.gecmisBorcMu ? { background: 'rgba(255,200,0,.04)' } : undefined}>
                      <td>{fd(m.tarih)}</td>
                      <td>
                        <span className="badge b-blue">{TURADI[m.tur] || m.tur}</span>
                        {m.gecmisBorcMu && <span className="badge b-gray" style={{ marginLeft: 4, fontSize: 9 }}>Geçmiş</span>}
                      </td>
                      <td className="td-mono">{m.toplamMiktar > 0 ? `${m.toplamMiktar.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${m.tur === 'cimento' ? 'torba' : 'ton'}` : '—'}</td>
                      <td className="td-mono">{tl(m.toplamTutar)}</td>
                      <td>{m.tedarikci || '—'}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => malzemeSil(m.id)}>Sil</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <thead><tr><th>Tarih</th><th>Tedarikçi</th><th>Tutar</th><th>Açıklama</th></tr></thead>
            <tbody>
              {data.tedarikOdemeler.length === 0 ? (
                <tr><td colSpan={4} className="empty">Kayıt yok</td></tr>
              ) : [...data.tedarikOdemeler].reverse().map(o => {
                const t = data.tedarikciListesi.find(x => x.id === o.tedarikciId);
                return (
                  <tr key={o.id}>
                    <td>{fd(o.tarih)}</td>
                    <td className="td-bold">{t?.isim || '?'}</td>
                    <td className="td-mono positive">{tl(o.tutar)}</td>
                    <td>{o.aciklama || '—'}</td>
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