'use client';
import { useState } from 'react';
import type { AppData, SpotSatis, Musteri } from '@/types';
import { tl, fd, today, uid, SIP_CESIT_LABEL, SIP_BIRIM } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';
import MusteriSecici from '@/components/MusteriSecici';

interface SpotSatisProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

const GENEL_MUSTERI_ID = -1;
const GENEL_MUSTERI_ISIM = 'Genel Müşteri';

export default function SpotSatisPage({ data, onSave, showToast }: SpotSatisProps) {
  const [musteriId, setMusteriId] = useState('');
  const [tarih, setTarih] = useState(today());
  const [cesit, setCesit] = useState('20lik');
  const [adet, setAdet] = useState('');
  const [fiyat, setFiyat] = useState(() => String(data.ayarlar.fp?.yerinde || ''));
  const [odeme, setOdeme] = useState('pesin');
  const [tahsil, setTahsil] = useState('');
  const [notVal, setNotVal] = useState('');

  // Kısmi/veresiye + Genel Müşteri → ad girme alanı
  const [yeniMusteriIsim, setYeniMusteriIsim] = useState('');
  const [yeniMusteriTel, setYeniMusteriTel] = useState('');

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

  // Genel müşteri dahil liste (yalnızca giriş formu için)
  const musteriListesi: Musteri[] = [
    { id: GENEL_MUSTERI_ID, isim: GENEL_MUSTERI_ISIM },
    ...data.musteriler,
  ];

  const secilenGenelMi = musteriId === String(GENEL_MUSTERI_ID);
  // Kısmi veya veresiyede genel müşteri seçildiyse ad zorunlu
  const adGirisiGerekli = secilenGenelMi && (odeme === 'kismi' || odeme === 'veresiye');

  function varsayilanFiyat(c: string): string {
    const fp = data.ayarlar.fp;
    if (!fp) return '';
    if (c === 'cimento') return String(fp.cimento || '');
    if (c === 'kum') return String(fp.kum || '');
    return String(fp.yerinde || '');
  }

  function handleCesitDegis(c: string) {
    setCesit(c);
    setFiyat(varsayilanFiyat(c));
  }

  function handleMusteriDegis(id: string) {
    setMusteriId(id);
    setYeniMusteriIsim('');
    setYeniMusteriTel('');
  }

  function handleOdemeDegis(o: string) {
    setOdeme(o);
    if (o === 'pesin') {
      setYeniMusteriIsim('');
      setYeniMusteriTel('');
    }
  }

  function musteriIsimById(mid: number): string {
    if (mid === GENEL_MUSTERI_ID) return GENEL_MUSTERI_ISIM;
    return data.musteriler.find(m => m.id === mid)?.isim || '?';
  }

  function musteriTelById(mid: number): string {
    if (mid === GENEL_MUSTERI_ID) return '';
    return data.musteriler.find(m => m.id === mid)?.tel || '';
  }

  function spotBorc(mid: number) {
    if (mid === GENEL_MUSTERI_ID) return 0;
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
      const mid = parseInt(val);
      const kalan = spotBorc(mid);
      setOpTutar(kalan > 0 ? String(kalan.toFixed(2)) : '');
    } else {
      setOpTutar('');
    }
  }

  function spotSatisMakbuz(satis: SpotSatis, makbuzNo: string, isimOverride?: string, telOverride?: string) {
    const mid = satis.musteriId;
    const alici = isimOverride || musteriIsimById(mid);
    const aliciTel = telOverride || musteriTelById(mid) || undefined;
    makbuzIndir({
      baslik: 'SPOT SATIS MAKBUZU',
      makbuzNo,
      tarih: satis.tarih,
      alici,
      aliciTel,
      aciklama: satis.not || undefined,
      kalemler: [
        { etiket: 'Urun',         deger: SIP_CESIT_LABEL[satis.cesit] || satis.cesit },
        { etiket: 'Miktar',       deger: `${satis.adet.toLocaleString('tr-TR')} ${satis.birim || 'adet'}` },
        { etiket: 'Birim Fiyat',  deger: `${satis.birimFiyat.toFixed(2)} TL` },
        { etiket: 'Toplam Tutar', deger: tl(satis.tutar) },
        { etiket: 'Odeme',        deger: odeme === 'pesin' ? 'Pesin' : odeme === 'kismi' ? 'Kismi' : 'Veresiye' },
        ...(satis.not ? [{ etiket: 'Not', deger: satis.not }] : []),
      ],
      odemeTutari: tl(satis.tahsil),
      kalanBorc: satis.tutar - satis.tahsil > 0 ? tl(satis.tutar - satis.tahsil) : undefined,
      isletmeAdi: 'BRIKET YONETIM',
    });
  }

  function kaydet() {
    if (!musteriId) { showToast('Müşteri seçin', false); return; }
    const a = parseFloat(adet); const f = parseFloat(fiyat);
    if (!a || !f) { showToast('Miktar ve fiyat gerekli', false); return; }

    if (adGirisiGerekli && !yeniMusteriIsim.trim()) {
      showToast('Veresiye / kısmi satış için müşteri adı girin', false);
      return;
    }

    const makbuzNo = `SP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    let gercekMusteriId = parseInt(musteriId);
    let yeniData = data;
    let kayitliIsim: string | undefined;
    let kayitliTel: string | undefined;

    // Genel müşteri + kısmi/veresiye → otomatik müşteri oluştur
    if (adGirisiGerekli && yeniMusteriIsim.trim()) {
      const yeniM: Musteri = {
        id: uid(),
        isim: yeniMusteriIsim.trim(),
        tel: yeniMusteriTel.trim() || undefined,
      };
      gercekMusteriId = yeniM.id;
      kayitliIsim = yeniM.isim;
      kayitliTel = yeniM.tel;
      yeniData = { ...data, musteriler: [...data.musteriler, yeniM] };
    }

    const yeni: SpotSatis = {
      id: uid(),
      musteriId: gercekMusteriId,
      tarih, cesit, adet: a, birimFiyat: f, tutar: a * f,
      tahsil: tahsilTutar,
      konum: 'yerinde',
      koy: '', adres: '', bolge: 'yerinde',
      not: notVal,
      birim: SIP_BIRIM[cesit] || 'adet',
    };

    onSave({ ...yeniData, spotSatislar: [...yeniData.spotSatislar, yeni] });
    spotSatisMakbuz(yeni, makbuzNo, kayitliIsim, kayitliTel);

    setAdet(''); setFiyat(varsayilanFiyat(cesit)); setTahsil(''); setNotVal('');
    setYeniMusteriIsim(''); setYeniMusteriTel('');

    const ekMesaj = adGirisiGerekli ? ` · ${yeniMusteriIsim.trim()} müşteri listesine eklendi` : '';
    showToast(`Spot satış kaydedildi + makbuz açıldı ✓${ekMesaj}`);
  }

  function sil(id: number) {
    onSave({ ...data, spotSatislar: data.spotSatislar.filter(s => s.id !== id) });
  }

  function odemeKaydet() {
    const mid = parseInt(opMusteri); const t = parseFloat(opTutar);
    if (!mid || !t) { showToast('Müşteri ve tutar gerekli', false); return; }
    const eskiBorc = spotBorc(mid);
    const makbuzNo = `SS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    onSave({ ...data, spotOdemeler: [...data.spotOdemeler, { id: uid(), musteriId: mid, tutar: t, tarih: opTarih || today(), aciklama: opAciklama }] });
    setSonOdeme({
      musteriId: mid,
      musteriIsim: musteriIsimById(mid),
      musteriTel: musteriTelById(mid),
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
        { etiket: 'Odeme Tarihi',         deger: sonOdeme.tarih.split('-').reverse().join('.') },
        { etiket: 'Toplam Spot Satis',    deger: tl(satisTop) },
        { etiket: 'Buguye Kadar Tahsil',  deger: tl(tahsilTop) },
        { etiket: 'Bu Odeme Oncesi Borc', deger: tl(sonOdeme.spotBorcOncesi) },
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

        {/* ── Spot Satış Girişi ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Spot Satış Girişi</div></div>
          <div className="panel-body">

            {/* Ödeme ÖNCE — müşteri alanını etkiliyor */}
            <div className="frow c2">
              <div>
                <label>Ödeme</label>
                <select value={odeme} onChange={e => handleOdemeDegis(e.target.value)}>
                  <option value="pesin">Peşin</option>
                  <option value="kismi">Kısmi</option>
                  <option value="veresiye">Veresiye</option>
                </select>
              </div>
              <div><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
            </div>

            {/* Müşteri */}
            <div className="frow">
              <div>
                <label>Müşteri</label>
                <MusteriSecici
                  musteriler={musteriListesi}
                  value={musteriId}
                  onChange={handleMusteriDegis}
                  placeholder="— Müşteri seç —"
                />
              </div>
            </div>

            {/* Peşin + Genel → bilgi notu */}
            {secilenGenelMi && odeme === 'pesin' && (
              <div style={{ background: 'rgba(246,201,14,.08)', border: '1px solid rgba(246,201,14,.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                📋 Peşin genel satış — borç takibi yapılmaz, kayıt tutulur.
              </div>
            )}

            {/* Kısmi/Veresiye + Genel → ad giriş alanı */}
            {adGirisiGerekli && (
              <div style={{ background: 'rgba(220,53,69,.05)', border: '1px solid rgba(220,53,69,.3)', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger, #c0392b)', marginBottom: 8 }}>
                  ⚠️ Veresiye / kısmi satış — müşteri adı zorunlu
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11 }}>Müşteri Adı *</label>
                    <input
                      type="text"
                      placeholder="Ad Soyad / Firma"
                      value={yeniMusteriIsim}
                      onChange={e => setYeniMusteriIsim(e.target.value)}
                      autoFocus
                      style={{ borderColor: !yeniMusteriIsim.trim() ? 'rgba(220,53,69,.6)' : undefined }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11 }}>Telefon</label>
                    <input
                      type="tel"
                      placeholder="05xx... (isteğe bağlı)"
                      value={yeniMusteriTel}
                      onChange={e => setYeniMusteriTel(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Bu kişi müşteri listesine otomatik eklenecek ve borç takibi başlayacak.
                </div>
              </div>
            )}

            {/* Ürün */}
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
              <div>
                <label>Miktar ({SIP_BIRIM[cesit] || 'adet'})</label>
                <input type="number" placeholder="0" value={adet} onChange={e => setAdet(e.target.value)} />
              </div>
            </div>

            <div className="frow c2">
              <div>
                <label>Birim Fiyat (TL)</label>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={fiyat}
                  onChange={e => setFiyat(e.target.value)}
                />
                {data.ayarlar.fp && varsayilanFiyat(cesit) && fiyat !== varsayilanFiyat(cesit) && (
                  <div style={{ fontSize: 11, color: 'var(--warning, #e67e22)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✎ Değiştirildi
                    <button style={{ fontSize: 10, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', textDecoration: 'underline' }}
                      onClick={() => setFiyat(varsayilanFiyat(cesit))}>sıfırla</button>
                  </div>
                )}
                {fiyat && fiyat === varsayilanFiyat(cesit) && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Varsayılan fiyat</div>
                )}
              </div>
              <div>
                {odeme === 'kismi' ? (
                  <>
                    <label>Alınan Tutar (TL)</label>
                    <input type="number" placeholder="0.00" value={tahsil} onChange={e => setTahsil(e.target.value)} />
                  </>
                ) : <div />}
              </div>
            </div>

            {tutar > 0 && (
              <div className="calc-preview" style={{ marginBottom: 12 }}>
                <div className="calc-row"><span>Toplam tutar</span><span>{tl(tutar)}</span></div>
                <div className="calc-row total"><span>Tahsil edilen</span><span>{tl(tahsilTutar)}</span></div>
                {tutar - tahsilTutar > 0 && (
                  <div className="calc-row" style={{ color: 'var(--danger, #e74c3c)' }}>
                    <span>Kalan borç</span><span>{tl(tutar - tahsilTutar)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="frow">
              <div><label>Not</label><input type="text" placeholder="İsteğe bağlı not..." value={notVal} onChange={e => setNotVal(e.target.value)} /></div>
            </div>

            <button
              className="btn btn-primary"
              onClick={kaydet}
              disabled={adGirisiGerekli && !yeniMusteriIsim.trim()}
            >
              ✦ Kaydet + Makbuz PDF
            </button>
          </div>
        </div>

        {/* ── Spot Ödemesi Al ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Spot Satış Ödemesi Al</div></div>
          <div className="panel-body">
            <div className="frow">
              <div>
                <label>Müşteri</label>
                {/* Ödeme panelinde Genel Müşteri yok — sadece borç takipli gerçek müşteriler */}
                <MusteriSecici
                  musteriler={data.musteriler}
                  value={opMusteri}
                  onChange={handleOpMusteriSec}
                  placeholder="— Müşteri seç —"
                />
              </div>
            </div>

            {opMusteri && (() => {
              const mid = parseInt(opMusteri);
              const kalan = spotBorc(mid);
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
            <div className="frow">
              <div><label>Açıklama</label><input type="text" placeholder="Not..." value={opAciklama} onChange={e => setOpAciklama(e.target.value)} /></div>
            </div>

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

      {/* ── Kayıtlar ── */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Spot Satış Kayıtları</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tarih</th><th>Müşteri</th><th>Ürün</th><th>Miktar</th>
                  <th>Birim Fiyat</th><th>Tutar</th><th>Tahsil</th><th>Kalan</th><th>Durum</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.spotSatislar.length === 0 ? (
                  <tr><td colSpan={10} className="empty">Kayıt yok</td></tr>
                ) : [...data.spotSatislar].reverse().map(s => {
                  const isGenelMus = s.musteriId === GENEL_MUSTERI_ID;
                  const isim = isGenelMus
                    ? GENEL_MUSTERI_ISIM
                    : (data.musteriler.find(x => x.id === s.musteriId)?.isim || '?');
                  const k = s.tutar - s.tahsil;
                  const bd = k <= 0 ? 'b-green' : s.tahsil > 0 ? 'b-yellow' : 'b-red';
                  const bl = k <= 0 ? 'Ödendi' : s.tahsil > 0 ? 'Kısmi' : 'Borçlu';
                  return (
                    <tr key={s.id}>
                      <td>{fd(s.tarih)}</td>
                      <td className="td-bold">
                        {isim}
                        {isGenelMus && (
                          <span className="badge b-yellow" style={{ marginLeft: 6, fontSize: 10 }}>Genel</span>
                        )}
                      </td>
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