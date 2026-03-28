'use client';
import { useState } from 'react';
import type { AppData, Koy } from '@/types';
import { uid } from '@/lib/storage';

interface KoylerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

const BOLGE_ADI: Record<string, string> = { merkez: 'Merkez', yakin: 'Yakın Köy', uzak: 'Uzak Köy' };

export default function KoylerPage({ data, onSave, showToast }: KoylerProps) {
  const [bolge, setBolge] = useState<'merkez' | 'yakin' | 'uzak'>('merkez');
  const [isim, setIsim] = useState('');
  const [notVal, setNotVal] = useState('');

  function ekle() {
    if (bolge !== 'merkez' && !isim.trim()) { showToast('Köy/Bölge adı gerekli', false); return; }
    const yeniIsim = bolge === 'merkez' ? (isim.trim() || 'Merkez') : isim.trim();
    const yeni: Koy = { id: uid(), isim: yeniIsim, bolge, not: notVal.trim() || undefined };
    onSave({ ...data, koyler: [...data.koyler, yeni] });
    setIsim(''); setNotVal('');
    showToast('Köy/Bölge eklendi ✓');
  }

  function sil(id: number) {
    onSave({ ...data, koyler: data.koyler.filter(k => k.id !== id) });
  }

  // Özet
  const ozet = {
    merkez: data.koyler.filter(k => k.bolge === 'merkez').length,
    yakin: data.koyler.filter(k => k.bolge === 'yakin').length,
    uzak: data.koyler.filter(k => k.bolge === 'uzak').length,
  };

  // Teslimat sayısı
  function teslimatSayisi(koyIsim: string) {
    return data.teslimatlar.filter(t => t.koy === koyIsim).length +
      data.spotSatislar.filter(s => s.koy === koyIsim).length;
  }
  function teslimatAdet(koyIsim: string) {
    return data.teslimatlar.filter(t => t.koy === koyIsim).reduce((s, t) => s + t.adet, 0) +
      data.spotSatislar.filter(s => s.koy === koyIsim).reduce((s, x) => s + x.adet, 0);
  }

  return (
    <div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Yeni Köy / Bölge Ekle</div></div>
          <div className="panel-body">
            <div className="frow">
              <div>
                <label>Bölge Tipi</label>
                <select value={bolge} onChange={e => setBolge(e.target.value as 'merkez' | 'yakin' | 'uzak')}>
                  <option value="merkez">Merkez</option>
                  <option value="yakin">Yakın Köy</option>
                  <option value="uzak">Uzak Köy</option>
                </select>
              </div>
            </div>
            <div className="frow">
              <div>
                <label>
                  {bolge === 'merkez' ? 'Mahalle Adı' : 'Köy Adı'}
                  {bolge === 'merkez' && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> (isteğe bağlı)</span>}
                </label>
                <input
                  type="text"
                  placeholder={bolge === 'merkez' ? 'ör: Çarşı Mahallesi' : 'Köy adını girin'}
                  value={isim}
                  onChange={e => setIsim(e.target.value)}
                />
                {bolge === 'merkez' && (
                  <div className="field-hint">Merkez için mahalle adı girmek zorunlu değil</div>
                )}
              </div>
            </div>
            <div className="frow">
              <div>
                <label>Kısa Not (isteğe bağlı)</label>
                <input type="text" placeholder="ör: Akçadağ yolu 12 km" value={notVal} onChange={e => setNotVal(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={ekle}>+ Ekle</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">Bölge Özeti</div></div>
          <div className="panel-body">
            {data.koyler.length === 0 ? (
              <div className="empty">Köy ekleyince burada görünür</div>
            ) : (
              <div className="three-col">
                {(['merkez', 'yakin', 'uzak'] as const).map(b => (
                  <div key={b} className="stat-card">
                    <div className="stat-label">{BOLGE_ADI[b]}</div>
                    <div className="stat-value c-accent">{ozet[b]}</div>
                    <div className="stat-sub">kayıt</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Kayıtlı Köyler / Bölgeler</div></div>
        <div className="panel-body-0">
          <table>
            <thead>
              <tr>
                <th>Köy / Yer Adı</th>
                <th>Bölge</th>
                <th>Not</th>
                <th>Toplam Teslimat</th>
                <th>Toplam Adet</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.koyler.length === 0 ? (
                <tr><td colSpan={6} className="empty">Kayıt yok</td></tr>
              ) : (
                data.koyler.map(k => (
                  <tr key={k.id}>
                    <td className="td-bold">{k.isim}</td>
                    <td>
                      <span className={`badge ${k.bolge === 'merkez' ? 'b-blue' : k.bolge === 'yakin' ? 'b-yellow' : 'b-gray'}`}>
                        {BOLGE_ADI[k.bolge]}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text3)', fontSize: 11 }}>{k.not || '—'}</td>
                    <td className="td-mono">{teslimatSayisi(k.isim)} işlem</td>
                    <td className="td-mono">{teslimatAdet(k.isim).toLocaleString('tr-TR')}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => sil(k.id)}>Sil</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
