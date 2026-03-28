'use client';
import { useState } from 'react';
import type { AppData, Malzeme, Tedarikci } from '@/types';
import { tl, fd, today, uid, TURADI } from '@/lib/storage';

interface MalzemeProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

interface TirSatiri { miktar: string; fiyat: string; }

export default function MalzemePage({ data, onSave, showToast }: MalzemeProps) {
  const [tur, setTur] = useState<'micir' | 'cimento' | 'diger'>('micir');
  const [tarih, setTarih] = useState(today());
  const [tirlar, setTirlar] = useState<TirSatiri[]>([{ miktar: '', fiyat: '' }]);
  const [tedarikci, setTedarikci] = useState('');
  const [notVal, setNotVal] = useState('');

  // Tedarikçi ekleme
  const [tedIsim, setTedIsim] = useState('');
  const [tedTur, setTedTur] = useState<'micir' | 'cimento' | 'diger'>('micir');

  // Tedarikçi ödeme
  const [tpTedarik, setTpTedarik] = useState('');
  const [tpTutar, setTpTutar] = useState('');
  const [tpTarih, setTpTarih] = useState(today());
  const [tpAciklama, setTpAciklama] = useState('');

  const birimLbl = tur === 'cimento' ? 'Miktar (torba)' : tur === 'micir' ? 'Miktar (ton)' : 'Miktar';
  const tarife = tur === 'micir' ? data.ayarlar.micirFiyat : tur === 'cimento' ? data.ayarlar.cimentoFiyat : 0;

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
    const toplamTutar = gecerliTirlar.reduce((s, t) => s + t.miktar * t.fiyat, 0);
    const yeni: Malzeme = {
      id: uid(), tur, tarih, tirlar: gecerliTirlar,
      toplamMiktar, toplamTutar,
      tedarikci: tedarikci || undefined, not: notVal || undefined,
    };
    onSave({ ...data, malzemeler: [...data.malzemeler, yeni] });
    setTirlar([{ miktar: '', fiyat: String(tarife || '') }]);
    setTedarikci(''); setNotVal('');
    showToast('Malzeme girişi kaydedildi ✓');
  }

  function malzemeSil(id: number) {
    onSave({ ...data, malzemeler: data.malzemeler.filter(m => m.id !== id) });
  }

  function tedarikciEkle() {
    if (!tedIsim.trim()) { showToast('Tedarikçi adı gerekli', false); return; }
    onSave({ ...data, tedarikciListesi: [...data.tedarikciListesi, { id: uid(), isim: tedIsim.trim(), tur: tedTur }] });
    setTedIsim('');
    showToast('Tedarikçi eklendi');
  }

  function tedarikciSil(id: number) {
    onSave({ ...data, tedarikciListesi: data.tedarikciListesi.filter(t => t.id !== id) });
  }

  function tedarikOdemeKaydet() {
    const tid = parseInt(tpTedarik); const t = parseFloat(tpTutar);
    if (!tid || !t) { showToast('Tedarikçi ve tutar gerekli', false); return; }
    onSave({ ...data, tedarikOdemeler: [...data.tedarikOdemeler, { id: uid(), tedarikciId: tid, tutar: t, tarih: tpTarih || today(), aciklama: tpAciklama }] });
    setTpTutar(''); setTpAciklama('');
    showToast('Ödeme kaydedildi ✓');
  }

  // Tedarikçi borç hesabı
  function tedarikBorc(tid: number) {
    const alinan = data.malzemeler.filter(m => {
      const ted = data.tedarikciListesi.find(t => t.id === tid);
      return ted && m.tedarikci === ted.isim;
    }).reduce((s, m) => s + m.toplamTutar, 0);
    const odenen = data.tedarikOdemeler.filter(o => o.tedarikciId === tid).reduce((s, o) => s + o.tutar, 0);
    return { alinan, odenen, kalan: alinan - odenen };
  }

  const filtreTedarik = data.tedarikciListesi.filter(t => t.tur === tur || tur === 'diger');

  return (
    <div>
      <div className="two-col">
        {/* Giriş formu */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Malzeme Girişi</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Malzeme Türü</label>
                <select value={tur} onChange={e => { setTur(e.target.value as 'micir' | 'cimento' | 'diger'); setTirlar([{ miktar: '', fiyat: '' }]); }}>
                  <option value="micir">Mıcır</option>
                  <option value="cimento">Çimento</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
              <div>
                <label>Tarih</label>
                <input type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
              </div>
            </div>

            {/* Tır satırları */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ marginBottom: 8, display: 'block' }}>Tır Girişleri</label>
              {tirlar.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                  <div style={{ paddingBottom: 9, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>{i + 1}. Tır</div>
                  <div>
                    {i === 0 && <label>{birimLbl}</label>}
                    <input type="number" placeholder="0" value={t.miktar} onChange={e => tirGuncelle(i, 'miktar', e.target.value)} />
                  </div>
                  <div>
                    {i === 0 && <label>Birim Fiyat (TL)</label>}
                    <input type="number" step="0.01" placeholder={tarife ? String(tarife) : '0.00'} value={t.fiyat} onChange={e => tirGuncelle(i, 'fiyat', e.target.value)} />
                  </div>
                  <div style={{ paddingBottom: 1 }}>
                    <button className="btn btn-danger btn-sm" onClick={() => tirKaldir(i)}>✕</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={tirEkle}>+ Tır Ekle</button>
              {tarife > 0 && <div className="field-hint" style={{ marginTop: 6 }}>Tarife: {tarife.toFixed(2)} TL</div>}
            </div>

            <div className="frow">
              <div>
                <label>Tedarikçi</label>
                <select value={tedarikci} onChange={e => setTedarikci(e.target.value)}>
                  <option value="">— Seç (isteğe bağlı) —</option>
                  {data.tedarikciListesi.map(t => <option key={t.id} value={t.isim}>{t.isim}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={kaydet}>✦ Kaydet</button>
          </div>
        </div>

        {/* Giriş özeti */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Son Girişler</div></div>
          <div className="panel-body-0">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tarih</th><th>Tür</th><th>Toplam Miktar</th><th>Toplam Tutar</th><th>Tedarikçi</th><th></th></tr>
                </thead>
                <tbody>
                  {data.malzemeler.length === 0 ? (
                    <tr><td colSpan={6} className="empty">Kayıt yok</td></tr>
                  ) : (
                    [...data.malzemeler].reverse().slice(0, 20).map(m => (
                      <tr key={m.id}>
                        <td>{fd(m.tarih)}</td>
                        <td><span className="badge b-blue">{TURADI[m.tur] || m.tur}</span></td>
                        <td className="td-mono">{m.toplamMiktar.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {m.tur === 'cimento' ? 'torba' : m.tur === 'micir' ? 'ton' : ''}</td>
                        <td className="td-mono">{tl(m.toplamTutar)}</td>
                        <td>{m.tedarikci || '—'}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => malzemeSil(m.id)}>Sil</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Tedarikçi yönetimi */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Tedarikçi Yönetimi</div></div>
        <div className="panel-body">
          <div className="frow c3">
            <div>
              <label>Tedarikçi Adı</label>
              <input type="text" placeholder="Tedarikçi adı" value={tedIsim} onChange={e => setTedIsim(e.target.value)} />
            </div>
            <div>
              <label>Malzeme Türü</label>
              <select value={tedTur} onChange={e => setTedTur(e.target.value as 'micir' | 'cimento' | 'diger')}>
                <option value="micir">Mıcır</option>
                <option value="cimento">Çimento</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={tedarikciEkle}>+ Ekle</button>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.tedarikciListesi.map(t => (
              <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text)' }}>{t.isim}</span>
                <span className="badge b-blue" style={{ fontSize: 9 }}>{TURADI[t.tur]}</span>
                <button className="btn btn-danger btn-sm" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => tedarikciSil(t.id)}>✕</button>
              </div>
            ))}
            {data.tedarikciListesi.length === 0 && <span style={{ color: 'var(--text3)', fontSize: 12 }}>Henüz tedarikçi eklenmedi</span>}
          </div>
        </div>
      </div>

      {/* Tedarikçi borç & ödeme */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Tedarikçi Borç Durumu</div></div>
          <div className="panel-body-0">
            <table>
              <thead>
                <tr><th>Tedarikçi</th><th>Toplam Alış</th><th>Ödenen</th><th>Kalan Borç</th></tr>
              </thead>
              <tbody>
                {data.tedarikciListesi.length === 0 ? (
                  <tr><td colSpan={4} className="empty">Tedarikçi yok</td></tr>
                ) : (
                  data.tedarikciListesi.map(t => {
                    const b = tedarikBorc(t.id);
                    return (
                      <tr key={t.id}>
                        <td className="td-bold">{t.isim}</td>
                        <td className="td-mono">{tl(b.alinan)}</td>
                        <td className="td-mono positive">{tl(b.odenen)}</td>
                        <td className={`td-mono ${b.kalan > 0 ? 'negative' : ''}`}>{tl(b.kalan)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Tedarikçiye Ödeme Yap</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>Tedarikçi</label>
                <select value={tpTedarik} onChange={e => setTpTedarik(e.target.value)}>
                  <option value="">— Seç —</option>
                  {data.tedarikciListesi.map(t => <option key={t.id} value={t.id}>{t.isim}</option>)}
                </select>
              </div>
              <div>
                <label>Tutar (TL)</label>
                <input type="number" placeholder="0.00" value={tpTutar} onChange={e => setTpTutar(e.target.value)} />
              </div>
            </div>
            <div className="frow c2">
              <div>
                <label>Tarih</label>
                <input type="date" value={tpTarih} onChange={e => setTpTarih(e.target.value)} />
              </div>
              <div>
                <label>Açıklama</label>
                <input type="text" placeholder="ör: Kasım faturası" value={tpAciklama} onChange={e => setTpAciklama(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-success" onClick={tedarikOdemeKaydet}>✓ Ödeme Yap</button>
          </div>
        </div>
      </div>

      {/* Ödeme hareketleri */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Tedarikçi Ödeme Hareketleri</div></div>
        <div className="panel-body-0">
          <table>
            <thead>
              <tr><th>Tarih</th><th>Tedarikçi</th><th>Tutar</th><th>Açıklama</th></tr>
            </thead>
            <tbody>
              {data.tedarikOdemeler.length === 0 ? (
                <tr><td colSpan={4} className="empty">Kayıt yok</td></tr>
              ) : (
                [...data.tedarikOdemeler].reverse().map(o => {
                  const t = data.tedarikciListesi.find(x => x.id === o.tedarikciId);
                  return (
                    <tr key={o.id}>
                      <td>{fd(o.tarih)}</td>
                      <td className="td-bold">{t?.isim || '?'}</td>
                      <td className="td-mono positive">{tl(o.tutar)}</td>
                      <td>{o.aciklama || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
