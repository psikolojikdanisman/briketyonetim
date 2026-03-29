'use client';
import { useState } from 'react';
import type { AppData, SpotSatis } from '@/types';
import { tl, fd, today, uid, SIP_CESIT_LABEL, SIP_BIRIM, KONUM_LABEL } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';
import MusteriSecici from '@/components/MusteriSecici';

interface SpotSatisProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export default function SpotSatisPage({ data, onSave, showToast }: SpotSatisProps) {
  const [musteriId, setMusteriId] = useState('');
  const [tarih, setTarih] = useState(today());
  const [cesit, setCesit] = useState('20lik');
  const [adet, setAdet] = useState('');
  const [fiyat, setFiyat] = useState(() => {
    const fp = data.ayarlar.fp;
    return String(fp?.yerinde || '');
  });
  const [odeme, setOdeme] = useState('pesin');
  const [tahsil, setTahsil] = useState('');
  const [notVal, setNotVal] = useState('');

  const [opMusteri, setOpMusteri] = useState('');
  const [opTutar, setOpTutar] = useState('');
  const [opTarih, setOpTarih] = useState(today());
  const [opAciklama, setOpAciklama] = useState('');
  const [sonOdeme, setSonOdeme] = useState<{
    musteriId: number; musteriIsim: string; musteriTel: string;
    tutar: number; tarih: string; aciklama: string; no: string;
    spotBorcOncesi: number;
  } | null>(null);

  const tutar = (parseFloat(adet) || 0) * (parseFloat(fiyat) || 0);
  const tahsilTutar = odeme === 'pesin' ? tutar : odeme === 'kismi' ? (parseFloat(tahsil) || 0) : 0;

  // Çeşit değişince varsayılan fiyatı doldur
  function varsayilanFiyat(c: string): string {
    const fp = data.ayarlar.fp;
    if (!fp) return '';
    if (c === 'cimento') return String(fp.cimento || '');
    if (c === 'kum') return String(fp.kum || '');
    // briket türleri → yerinde fiyatı
    return String(fp.yerinde || '');
  }

  function handleCesitDegis(c: string) {
    setCesit(c);
    setFiyat(varsayilanFiyat(c));
  }

  function spotBorc(mid: number) {
    const sT  = data.spotSatislar.filter(s => s.musteriId === mid).reduce((s, x) => s + (x.tutar - x.tahsil), 0);
    const soT = data.spotOdemeler.filter(o => o.musteriId === mid).reduce((s, o) => s + o.tutar, 0);
    return Math.max(0, sT - soT);
  }

  function toplamSpotSatis(mid: number) {
    return data.spotSatislar.filter(s => s.musteriId === mid).reduce((s, x) => s + x.tutar, 0);
  }

  function toplamSpotTahsil(mid: number) {
    return data.spotSatislar.filter(s => s.musteriId === mid).reduce((s, x) => s + x.tahsil, 0)
         + data.spotOdemeler.filter(o => o.musteriId === mid).reduce((s, o) => s + o.tutar, 0);
  }

  function handleOpMusteriSec(val: string) {
    setOpMusteri(val);
    setSonOdeme(null);
    if (val) {
      const kalan = spotBorc(parseInt(val));
      setOpTutar(kalan > 0 ? String(kalan.toFixed(2)) : '');
    } else {
      setOpTutar('');
    }
  }

  function kaydet() {
    if (!musteriId) { showToast('Müşteri seçin', false); return; }
    const a = parseFloat(adet); const f = parseFloat(fiyat);
    if (!a || !f) { showToast('Miktar ve fiyat gerekli', false); return; }
    const yeni: SpotSatis = {
      id: uid(), musteriId: parseInt(musteriId),
      tarih, cesit, adet: a, birimFiyat: f, tutar: a * f,
      tahsil: tahsilTutar,
      konum: 'yerinde',
      koy: '', adres: '', bolge: 'yerinde',
      not: notVal, birim: SIP_BIRIM[cesit] || 'adet',
    };
    onSave({ ...data, spotSatislar: [...data.spotSatislar, yeni] });
    setAdet(''); setFiyat(varsayilanFiyat(cesit)); setTahsil(''); setNotVal('');
    showToast('Spot satış kaydedildi ✓');
  }

  function sil(id: number) { onSave({ ...data, spotSatislar: data.spotSatislar.filter(s => s.id !== id) }); }

  function odemeKaydet() {
    const mid = parseInt(opMusteri); const t = parseFloat(opTutar);
    if (!mid || !t) { showToast('Müşteri ve tutar gerekli', false); return; }
    const musteri = data.musteriler.find(m => m.id === mid);
    const eskiBorc = spotBorc(mid);
    const makbuzNo = `SS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    onSave({ ...data, spotOdemeler: [...data.spotOdemeler, { id: uid(), musteriId: mid, tutar: t, tarih: opTarih || today(), aciklama: opAciklama }] });
    setSonOdeme({
      musteriId: mid,
      musteriIsim: musteri?.isim || '?',
      musteriTel: musteri?.tel || '',
      tutar: t,
      tarih: opTarih || today(),
      aciklama: opAciklama,
      no: makbuzNo,
      spotBorcOncesi: eskiBorc,
    });
    setOpTutar(''); setOpAciklama('');
    showToast('Ödeme alındı ✓');
  }

  function spotMakbuzAc() {
    if (!sonOdeme) return;
    const mid = sonOdeme.musteriId;
    const kalanSonra = Math.max(0, sonOdeme.spotBorcOncesi - sonOdeme.tutar);
    const satisTop   = toplamSpotSatis(mid);
    const tahsilTop  = toplamSpotTahsil(mid);

    makbuzIndir({
      baslik: 'SPOT SATIS ODEME MAKBUZU',
      makbuzNo: sonOdeme.no,
      tarih: sonOdeme.tarih,
      alici: sonOdeme.musteriIsim,
      aliciTel: sonOdeme.musteriTel || undefined,
      aciklama: sonOdeme.aciklama || undefined,
      kalemler: [
        { etiket: 'Odeme Tarihi',           deger: sonOdeme.tarih.split('-').reverse().join('.') },
        { etiket: 'Toplam Spot Satis',       deger: tl(satisTop) },
        { etiket: 'Buguye Kadar Tahsil',     deger: tl(tahsilTop) },
        { etiket: 'Bu Odeme Oncesi Borc',    deger: tl(sonOdeme.spotBorcOncesi) },
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
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Spot Satış Girişi</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div><label>Müşteri</label><MusteriSecici musteriler={data.musteriler} value={musteriId} onChange={setMusteriId} placeholder="— Müşteri seç —" /></div>
              <div><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
            </div>

            <div className="frow c2">
              <div>
                <label>Ürün Çeşidi</label>
                <select value={cesit} onChange={e => handleCesitDegis(e.target.value)}>
                  <option value="10luk">Briket 10&apos;luk</option>
                  <option value="15lik">Briket 15&apos;lik</option>
                  <option value="20lik">Briket 20&apos;lik</option>
                  <option value="cimento">Çimento</option>
                  <option value="kum">Kum</option>
                </select>
              </div>
              <div><label>Miktar ({SIP_BIRIM[cesit] || 'adet'})</label><input type="number" placeholder="0" value={adet} onChange={e => setAdet(e.target.value)} /></div>
            </div>

            <div className="frow c2">
              <div>
                <label>Birim Fiyat (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={fiyat}
                  onChange={e => setFiyat(e.target.value)}
                />
                {data.ayarlar.fp && varsayilanFiyat(cesit) && fiyat !== varsayilanFiyat(cesit) && (
                  <div style={{ fontSize: 11, color: 'var(--warning, #e67e22)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✎ Değiştirildi
                    <button
                      style={{ fontSize: 10, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', textDecoration: 'underline' }}
                      onClick={() => setFiyat(varsayilanFiyat(cesit))}
                    >
                      sıfırla
                    </button>
                  </div>
                )}
                {fiyat && fiyat === varsayilanFiyat(cesit) && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                    Varsayılan fiyat
                  </div>
                )}
              </div>
              <div>
                <label>Ödeme</label>
                <select value={odeme} onChange={e => setOdeme(e.target.value)}>
                  <option value="pesin">Peşin</option>
                  <option value="kismi">Kısmi</option>
                  <option value="veresiye">Veresiye</option>
                </select>
              </div>
            </div>

            {odeme === 'kismi' && (
              <div className="frow">
                <div><label>Alınan Tutar (TL)</label><input type="number" placeholder="0.00" value={tahsil} onChange={e => setTahsil(e.target.value)} /></div>
              </div>
            )}

            {tutar > 0 && (
              <div className="calc-preview" style={{ marginBottom: 12 }}>
                <div className="calc-row"><span>Toplam tutar</span><span>{tl(tutar)}</span></div>
                <div className="calc-row total"><span>Tahsil edilen</span><span>{tl(tahsilTutar)}</span></div>
              </div>
            )}

            <div className="frow">
              <div><label>Not</label><input type="text" placeholder="İsteğe bağlı not..." value={notVal} onChange={e => setNotVal(e.target.value)} /></div>
            </div>

            <button className="btn btn-primary" onClick={kaydet}>✦ Kaydet</button>
          </div>
        </div>

        {/* ── Spot Ödemesi ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Spot Satış Ödemesi Al</div></div>
          <div className="panel-body">
            <div className="frow">
              <div><label>Müşteri</label><MusteriSecici musteriler={data.musteriler} value={opMusteri} onChange={handleOpMusteriSec} placeholder="— Müşteri seç —" /></div>
            </div>

            {opMusteri && (() => {
              const kalan = spotBorc(parseInt(opMusteri));
              return kalan > 0 ? (
                <div style={{ background: 'rgba(255,80,80,.07)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 4, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text2)' }}>
                  Spot borç: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{tl(kalan)}</span>
                </div>
              ) : (
                <div style={{ background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 4, fontSize: 12, color: 'var(--text2)' }}>
                  Bu müşterinin spot borcu yok.
                </div>
              );
            })()}

            <div className="frow c2">
              <div><label>Tutar (TL)</label><input type="number" placeholder="0.00" value={opTutar} onChange={e => setOpTutar(e.target.value)} /></div>
              <div><label>Tarih</label><input type="date" value={opTarih} onChange={e => setOpTarih(e.target.value)} /></div>
            </div>
            <div className="frow"><div><label>Açıklama</label><input type="text" placeholder="Not..." value={opAciklama} onChange={e => setOpAciklama(e.target.value)} /></div></div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={odemeKaydet}>✓ Ödeme Al</button>
              {sonOdeme && (
                <button className="btn btn-secondary" onClick={spotMakbuzAc} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  📄 Makbuz PDF
                </button>
              )}
            </div>

            {sonOdeme && (
              <div style={{ marginTop: 10, background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>
                ✓ <strong>{sonOdeme.musteriIsim}</strong> — {tl(sonOdeme.tutar)} ödeme alındı
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Spot Satış Kayıtları</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tarih</th><th>Müşteri</th><th>Ürün</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th><th>Tahsil</th><th>Kalan</th><th>Durum</th><th></th></tr>
              </thead>
              <tbody>
                {data.spotSatislar.length === 0 ? (
                  <tr><td colSpan={10} className="empty">Kayıt yok</td></tr>
                ) : [...data.spotSatislar].reverse().map(s => {
                  const m = data.musteriler.find(x => x.id === s.musteriId);
                  const k = s.tutar - s.tahsil;
                  const bd = k <= 0 ? 'b-green' : s.tahsil > 0 ? 'b-yellow' : 'b-red';
                  const bl = k <= 0 ? 'Ödendi' : s.tahsil > 0 ? 'Kısmi' : 'Borçlu';
                  return (
                    <tr key={s.id}>
                      <td>{fd(s.tarih)}</td>
                      <td className="td-bold">{m?.isim || '?'}</td>
                      <td><span className="badge b-yellow">{SIP_CESIT_LABEL[s.cesit] || s.cesit}</span></td>
                      <td className="td-mono">{s.adet.toLocaleString('tr-TR')} {s.birim || 'adet'}</td>
                      <td className="td-mono">{s.birimFiyat.toFixed(2)} TL</td>
                      <td className="td-mono">{tl(s.tutar)}</td>
                      <td className="td-mono positive">{tl(s.tahsil)}</td>
                      <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{tl(k)}</td>
                      <td><span className={`badge ${bd}`}>{bl}</span></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => sil(s.id)}>Sil</button></td>
                    </tr>
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