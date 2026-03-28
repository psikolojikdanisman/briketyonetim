'use client';
import { useState } from 'react';
import type { AppData } from '@/types';
import { tl, fd, today, uid } from '@/lib/storage';

interface MusterilerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export default function MusterilerPage({ data, onSave, showToast }: MusterilerProps) {
  const [isim, setIsim] = useState('');
  const [tel, setTel] = useState('');
  const [koyAra, setKoyAra] = useState('');
  const [koySecili, setKoySecili] = useState('');
  const [adres, setAdres] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [detaySec, setDetaySec] = useState('');

  // Ödeme formu
  const [opMusteri, setOpMusteri] = useState('');
  const [opTutar, setOpTutar] = useState('');
  const [opTarih, setOpTarih] = useState(today());
  const [opAciklama, setOpAciklama] = useState('');

  function mbHesapla(mid: number) {
    const tT = data.teslimatlar.filter(t => t.musteriId === mid).reduce((s, t) => s + (t.tutar - t.tahsil), 0);
    const oT = data.musteriOdemeler.filter(o => o.musteriId === mid).reduce((s, o) => s + o.tutar, 0);
    const sT = data.spotSatislar.filter(s => s.musteriId === mid).reduce((s, x) => s + (x.tutar - x.tahsil), 0);
    const soT = data.spotOdemeler.filter(o => o.musteriId === mid).reduce((s, o) => s + o.tutar, 0);
    return Math.max(0, tT + sT - oT - soT);
  }

  function musteriEkle() {
    if (!isim.trim()) { showToast('İsim gerekli', false); return; }
    const koyObj = data.koyler.find(k => k.isim === koySecili);
    onSave({
      ...data,
      musteriler: [...data.musteriler, {
        id: uid(), isim: isim.trim(), tel: tel.trim(),
        bolge: koyObj?.bolge || '', koy: koySecili, adres: adres.trim(),
      }],
    });
    setIsim(''); setTel(''); setKoyAra(''); setKoySecili(''); setAdres('');
    showToast('Müşteri eklendi');
  }

  function musteriSil(id: number) {
    onSave({
      ...data,
      musteriler: data.musteriler.filter(m => m.id !== id),
      siparisler: data.siparisler.filter(s => s.musteriId !== id),
      teslimatlar: data.teslimatlar.filter(t => t.musteriId !== id),
      musteriOdemeler: data.musteriOdemeler.filter(o => o.musteriId !== id),
    });
    showToast('Müşteri silindi');
  }

  function odemeKaydet() {
    const mid = parseInt(opMusteri);
    const tutar = parseFloat(opTutar);
    if (!mid || !tutar) { showToast('Müşteri ve tutar gerekli', false); return; }
    onSave({
      ...data,
      musteriOdemeler: [...data.musteriOdemeler, {
        id: uid(), musteriId: mid, tutar, tarih: opTarih || today(), aciklama: opAciklama,
      }],
    });
    setOpTutar(''); setOpAciklama('');
    showToast('Ödeme alındı ✓');
  }

  const filtreKoyler = data.koyler.filter(k => !koyAra || k.isim.toLowerCase().includes(koyAra.toLowerCase()));
  const siraliMusteriler = [...data.musteriler].sort((a, b) => mbHesapla(b.id) - mbHesapla(a.id));

  // Detay
  const detayMid = parseInt(detaySec) || 0;
  const detayMusteri = data.musteriler.find(m => m.id === detayMid);
  const detayTes = data.teslimatlar.filter(t => t.musteriId === detayMid);
  const detayOde = data.musteriOdemeler.filter(o => o.musteriId === detayMid);
  const topTutar = detayTes.reduce((s, t) => s + t.tutar, 0);
  const topTahsil = detayTes.reduce((s, t) => s + t.tahsil, 0) + detayOde.reduce((s, o) => s + o.tutar, 0);
  const detayBorc = topTutar - topTahsil;

  return (
    <div>
      <div className="two-col">
        {/* Müşteri ekle */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Yeni Müşteri Ekle</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Ad Soyad</label>
                <input type="text" placeholder="Müşteri adı" value={isim} onChange={e => setIsim(e.target.value)} />
              </div>
              <div>
                <label>Telefon</label>
                <input type="text" placeholder="05xx..." value={tel} onChange={e => setTel(e.target.value)} />
              </div>
            </div>
            <div className="frow" style={{ position: 'relative' }}>
              <div>
                <label>Köy / Bölge</label>
                <input type="text" placeholder="Arayın veya yazın..."
                  value={koyAra}
                  onChange={e => { setKoyAra(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && filtreKoyler.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 100, maxHeight: 180, overflowY: 'auto' }}>
                    {filtreKoyler.map(k => (
                      <div key={k.id}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}
                        onMouseDown={() => { setKoyAra(k.isim); setKoySecili(k.isim); setShowDropdown(false); }}>
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
                <label>Adres / Not</label>
                <input type="text" placeholder="Detaylı adres..." value={adres} onChange={e => setAdres(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={musteriEkle}>+ Müşteri Ekle</button>
          </div>
        </div>

        {/* Ödeme alma */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Müşteriden Ödeme Al</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Müşteri</label>
                <select value={opMusteri} onChange={e => setOpMusteri(e.target.value)}>
                  <option value="">— Seç —</option>
                  {data.musteriler.map(m => <option key={m.id} value={m.id}>{m.isim}</option>)}
                </select>
              </div>
              <div>
                <label>Tutar (TL)</label>
                <input type="number" placeholder="0.00" value={opTutar} onChange={e => setOpTutar(e.target.value)} />
              </div>
            </div>
            <div className="frow c2">
              <div>
                <label>Tarih</label>
                <input type="date" value={opTarih} onChange={e => setOpTarih(e.target.value)} />
              </div>
              <div>
                <label>Açıklama</label>
                <input type="text" placeholder="ör: kasım ödemesi" value={opAciklama} onChange={e => setOpAciklama(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-success" onClick={odemeKaydet}>✓ Ödeme Al</button>
          </div>
        </div>
      </div>

      {/* Müşteri borç tablosu */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Müşteri Borç Durumu</div></div>
        <div className="panel-body-0">
          <table>
            <thead>
              <tr><th>Ad Soyad</th><th>Tel</th><th>Köy / Bölge</th><th>Alacak</th><th>Son İşlem</th><th></th><th></th></tr>
            </thead>
            <tbody>
              {siraliMusteriler.length === 0 ? (
                <tr><td colSpan={7} className="empty">Müşteri yok</td></tr>
              ) : (
                siraliMusteriler.map(m => {
                  const b = mbHesapla(m.id);
                  const son = [...data.teslimatlar].filter(t => t.musteriId === m.id).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
                  return (
                    <tr key={m.id}>
                      <td className="td-bold">{m.isim}</td>
                      <td>{m.tel || '—'}</td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{m.koy || '—'}</span>
                        {m.bolge && <span className={`badge ${m.bolge === 'merkez' ? 'b-blue' : m.bolge === 'yakin' ? 'b-yellow' : 'b-gray'}`} style={{ marginLeft: 4, fontSize: 9 }}>{m.bolge}</span>}
                      </td>
                      <td className={`td-mono ${b > 0 ? 'negative' : ''}`}>{b > 0 ? tl(b) : '—'}</td>
                      <td>{son ? fd(son.tarih) : '—'}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDetaySec(String(m.id))}>Detay</button>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => musteriSil(m.id)}>Sil</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Müşteri detay */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Müşteri Detayı</div>
          <select value={detaySec} onChange={e => setDetaySec(e.target.value)} style={{ width: 200 }}>
            <option value="">— Müşteri seçin —</option>
            {data.musteriler.map(m => <option key={m.id} value={m.id}>{m.isim}</option>)}
          </select>
        </div>
        <div className="panel-body">
          {!detayMusteri ? (
            <div className="empty">Müşteri seçin</div>
          ) : (
            <>
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-label">Toplam Satılan</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{detayTes.reduce((s, t) => s + t.adet, 0).toLocaleString('tr-TR')}</div>
                  <div className="stat-sub">adet</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Toplam Tutar</div>
                  <div className="stat-value c-accent" style={{ fontSize: 20 }}>{tl(topTutar)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Tahsil Edilen</div>
                  <div className="stat-value c-green" style={{ fontSize: 20 }}>{tl(topTahsil)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Kalan Borç</div>
                  <div className={`stat-value ${detayBorc > 0 ? 'c-red' : 'c-green'}`} style={{ fontSize: 20 }}>{tl(detayBorc)}</div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Tarih</th><th>Yer</th><th>Çeşit</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th><th>Tahsil</th><th>Kalan</th></tr>
                  </thead>
                  <tbody>
                    {[...detayTes].reverse().map(t => {
                      const k = t.tutar - t.tahsil;
                      return (
                        <tr key={t.id}>
                          <td>{fd(t.tarih)}</td>
                          <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.koy || t.adres || t.bolge || '—'}</td>
                          <td><span className="badge b-yellow">{t.cesit}</span></td>
                          <td className="td-mono">{t.adet.toLocaleString('tr-TR')}</td>
                          <td className="td-mono">{(t.birimFiyat || 0).toFixed(2)} TL</td>
                          <td className="td-mono">{tl(t.tutar)}</td>
                          <td className="td-mono positive">{tl(t.tahsil)}</td>
                          <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{tl(k)}</td>
                        </tr>
                      );
                    })}
                    {detayTes.length === 0 && <tr><td colSpan={8} className="empty">Teslimat yok</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
