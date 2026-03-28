'use client';
import { useState } from 'react';
import type { AppData, Siparis, Teslimat } from '@/types';
import { tl, fd, today, uid, SIP_BIRIM, SIP_CESIT_LABEL } from '@/lib/storage';

interface SiparislerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

interface UrunSatiri { cesit: string; adet: string; fiyat: string; }

export default function SiparislerPage({ data, onSave, showToast }: SiparislerProps) {
  const [musteri, setMusteri] = useState('');
  const [tarih, setTarih] = useState(today());
  const [koyAra, setKoyAra] = useState('');
  const [koySecili, setKoySecili] = useState('');
  const [adres, setAdres] = useState('');
  const [notVal, setNotVal] = useState('');
  const [showDd, setShowDd] = useState(false);
  const [urunler, setUrunler] = useState<UrunSatiri[]>([{ cesit: '20lik', adet: '', fiyat: '' }]);

  // Teslimat formu
  const [tSiparis, setTSiparis] = useState('');
  const [tAdet, setTAdet] = useState('');
  const [tOdeme, setTOdeme] = useState('pesin');
  const [tTahsil, setTTahsil] = useState('');
  const [tTarih, setTTarih] = useState(today());

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
    if (!gecerli.length) { showToast('En az 1 ürün ekleyin (çeşit, miktar ve fiyat girilmeli)', false); return; }
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

  function teslimatKaydet() {
    const sid = parseInt(tSiparis);
    const adet = parseFloat(tAdet);
    if (!sid || !adet) { showToast('Sipariş ve adet gerekli', false); return; }
    const sip = data.siparisler.find(s => s.id === sid);
    if (!sip) return;
    if (adet > sip.adet - sip.gonderilen) { showToast(`En fazla ${sip.adet - sip.gonderilen} gönderilebilir`, false); return; }
    const tutar = adet * sip.fiyat;
    const tahsil = tOdeme === 'pesin' ? tutar : tOdeme === 'kismi' ? (parseFloat(tTahsil) || 0) : 0;
    const yeniTes: Teslimat = {
      id: uid(), siparisId: sid, musteriId: sip.musteriId,
      cesit: sip.cesit, bolge: sip.bolge, koy: sip.koy, adres: sip.adres || '',
      birimFiyat: sip.fiyat, adet, tutar, tahsil,
      odemeDurumu: tOdeme, tarih: tTarih || today(), birim: sip.birim || 'adet',
    };
    const yeniSiparisler = data.siparisler.map(s => s.id === sid ? { ...s, gonderilen: s.gonderilen + adet } : s);
    onSave({ ...data, siparisler: yeniSiparisler, teslimatlar: [...data.teslimatlar, yeniTes] });
    setTAdet(''); setTTahsil('');
    showToast('Teslimat eklendi ✓');
  }

  const filtreKoyler = data.koyler.filter(k => !koyAra || k.isim.toLowerCase().includes(koyAra.toLowerCase()));
  const acikSiparisler = data.siparisler.filter(s => s.gonderilen < s.adet);
  const secilenSip = data.siparisler.find(s => s.id === parseInt(tSiparis));

  return (
    <div>
      <div className="two-col">
        {/* Sipariş formu */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Yeni Sipariş</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Müşteri</label>
                <select value={musteri} onChange={e => setMusteri(e.target.value)}>
                  <option value="">— Seç —</option>
                  {data.musteriler.map(m => <option key={m.id} value={m.id}>{m.isim}</option>)}
                </select>
              </div>
              <div>
                <label>Tarih</label>
                <input type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
              </div>
            </div>

            {/* Teslimat yeri */}
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
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}
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

            {/* Ürün satırları */}
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

        {/* Teslimat formu */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Teslimat Yap</div></div>
          <div className="panel-body">
            <div className="frow">
              <div>
                <label>Sipariş</label>
                <select value={tSiparis} onChange={e => setTSiparis(e.target.value)}>
                  <option value="">— Seç —</option>
                  {acikSiparisler.map(s => {
                    const m = data.musteriler.find(x => x.id === s.musteriId);
                    return <option key={s.id} value={s.id}>{m?.isim || '?'} — {SIP_CESIT_LABEL[s.cesit] || s.cesit} ({(s.adet - s.gonderilen).toLocaleString('tr-TR')} kalan)</option>;
                  })}
                </select>
              </div>
            </div>
            {secilenSip && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--text2)' }}>
                Konum: <strong style={{ color: 'var(--text)' }}>{secilenSip.koy || secilenSip.adres || '—'}</strong>
              </div>
            )}
            <div className="frow c2">
              <div>
                <label>Bu Sefer Gönderilen</label>
                <input type="number" placeholder="adet" value={tAdet} onChange={e => setTAdet(e.target.value)} />
              </div>
              <div>
                <label>Tarih</label>
                <input type="date" value={tTarih} onChange={e => setTTarih(e.target.value)} />
              </div>
            </div>
            <div className="frow">
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
            <button className="btn btn-success" onClick={teslimatKaydet}>✓ Teslimat Yap</button>
          </div>
        </div>
      </div>

      {/* Sipariş tablosu */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Siparişler</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Müşteri</th><th>Çeşit</th><th>Toplam</th><th>Gönderilen</th><th>Kalan</th><th>Durum</th><th></th></tr>
              </thead>
              <tbody>
                {data.siparisler.length === 0 ? (
                  <tr><td colSpan={7} className="empty">Sipariş yok</td></tr>
                ) : (
                  [...data.siparisler].reverse().map(s => {
                    const m = data.musteriler.find(x => x.id === s.musteriId);
                    const k = s.adet - s.gonderilen;
                    const bd = k === 0 ? 'b-green' : s.gonderilen > 0 ? 'b-yellow' : 'b-red';
                    const bl = k === 0 ? 'Tamamlandı' : s.gonderilen > 0 ? 'Kısmi' : 'Bekliyor';
                    return (
                      <tr key={s.id}>
                        <td className="td-bold">{m?.isim || '?'}</td>
                        <td><span className="badge b-yellow">{SIP_CESIT_LABEL[s.cesit] || s.cesit}</span></td>
                        <td className="td-mono">{s.adet.toLocaleString('tr-TR')}</td>
                        <td className="td-mono">{s.gonderilen.toLocaleString('tr-TR')}</td>
                        <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{k.toLocaleString('tr-TR')}</td>
                        <td><span className={`badge ${bd}`}>{bl}</span></td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => siparisSil(s.id)}>Sil</button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Teslimat tablosu */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Teslimat Geçmişi</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tarih</th><th>Müşteri</th><th>Konum</th><th>Çeşit</th><th>Miktar</th><th>Tutar</th><th>Tahsil</th><th>Kalan</th><th>Durum</th></tr>
              </thead>
              <tbody>
                {data.teslimatlar.length === 0 ? (
                  <tr><td colSpan={9} className="empty">Kayıt yok</td></tr>
                ) : (
                  [...data.teslimatlar].reverse().map(t => {
                    const m = data.musteriler.find(x => x.id === t.musteriId);
                    const k = t.tutar - t.tahsil;
                    const bd = k <= 0 ? 'b-green' : t.tahsil > 0 ? 'b-yellow' : 'b-red';
                    const bl = k <= 0 ? 'Ödendi' : t.tahsil > 0 ? 'Kısmi' : 'Borçlu';
                    return (
                      <tr key={t.id}>
                        <td>{fd(t.tarih)}</td>
                        <td className="td-bold">{m?.isim || '?'}</td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[t.koy, t.adres].filter(Boolean).join(' • ') || t.bolge || '—'}</td>
                        <td><span className="badge b-yellow">{SIP_CESIT_LABEL[t.cesit] || t.cesit}</span></td>
                        <td className="td-mono">{t.adet.toLocaleString('tr-TR')} {t.birim || 'adet'}</td>
                        <td className="td-mono">{tl(t.tutar)}</td>
                        <td className="td-mono positive">{tl(t.tahsil)}</td>
                        <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{tl(k)}</td>
                        <td><span className={`badge ${bd}`}>{bl}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
