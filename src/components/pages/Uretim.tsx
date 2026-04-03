'use client';
import { useState } from 'react';
import type { AppData, Uretim } from '@/types';
import { tl, fd, today, uid, birimUcret, saveUretim, deleteUretim } from '@/lib/storage';

interface UretimProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export default function UretimPage({ data, onSave, showToast }: UretimProps) {
  const [tarih, setTarih] = useState(today());
  const [cesit, setCesit] = useState<'10luk' | '15lik' | '20lik'>('20lik');
  const [miktar, setMiktar] = useState('');
  const [seciliIsciler, setSeciliIsciler] = useState<number[]>([]);
  const [not, setNot] = useState('');
  const [errors, setErrors] = useState<{ miktar?: boolean; isciler?: boolean }>({});

  const toplamUcret = birimUcret(cesit, data.ayarlar) * (parseFloat(miktar) || 0);
  const kisiBasiUcret = seciliIsciler.length > 0 ? toplamUcret / seciliIsciler.length : 0;

  function toggleIsci(id: number) {
    setSeciliIsciler(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (errors.isciler) setErrors(e => ({ ...e, isciler: false }));
  }

  async function kaydet() {
    try {
      const m = parseFloat(miktar);
      const newErrors = { miktar: !m || m <= 0, isciler: seciliIsciler.length === 0 };
      setErrors(newErrors);
      if (newErrors.miktar) { showToast('Miktar gerekli', false); return; }
      if (newErrors.isciler) { showToast('En az 1 işçi seçin', false); return; }
      const yeni: Uretim = { id: uid(), tarih, cesit, miktar: m, isciler: seciliIsciler, kisiBasiUcret, toplamUcret, not };
      const newData = { ...data, uretimler: [...data.uretimler, yeni] };
      onSave(newData);
      await saveUretim(yeni);
      setMiktar(''); setSeciliIsciler([]); setNot(''); setErrors({});
      showToast('Üretim kaydedildi ✓');
    } catch {
      showToast('Üretim kaydedilemedi', false);
    }
  }

  async function sil(id: number) {
    try {
      onSave({ ...data, uretimler: data.uretimler.filter(u => u.id !== id) });
      await deleteUretim(id);
      showToast('Kayıt silindi');
    } catch {
      showToast('Kayıt silinemedi', false);
    }
  }

  const showCalc = parseFloat(miktar) > 0 && seciliIsciler.length > 0;

  return (
    <div className="two-col">
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Günlük Üretim Girişi</div></div>
        <div className="panel-body">
          <div className="frow c2">
            <div>
              <label>Tarih</label>
              <input type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
            </div>
            <div>
              <label>Briket Çeşidi</label>
              <select value={cesit} onChange={e => setCesit(e.target.value as '10luk' | '15lik' | '20lik')}>
                <option value="10luk">10&apos;luk</option>
                <option value="15lik">15&apos;lik</option>
                <option value="20lik">20&apos;lik</option>
              </select>
            </div>
          </div>
          <div className="frow">
            <div>
              <label>Üretim Miktarı (adet)</label>
              <input type="number" min="1" placeholder="ör: 3500" value={miktar}
                onChange={e => { setMiktar(e.target.value); if (errors.miktar) setErrors(er => ({ ...er, miktar: false })); }}
                style={{ borderColor: errors.miktar ? 'var(--red)' : undefined }} />
              {errors.miktar && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>Geçerli bir miktar girin</div>}
            </div>
          </div>
          <div className="frow">
            <div>
              <label>Çalışan İşçiler</label>
              {errors.isciler && <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 4 }}>En az 1 işçi seçilmeli</div>}
              <div className="check-list" style={{ borderColor: errors.isciler ? 'var(--red)' : undefined, borderWidth: errors.isciler ? 1 : undefined, borderStyle: errors.isciler ? 'solid' : undefined, borderRadius: errors.isciler ? 'var(--radius)' : undefined, padding: errors.isciler ? 6 : undefined }}>
                {data.isciler.length === 0 ? (
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>Önce işçi ekleyin</span>
                ) : data.isciler.map(i => (
                  <div key={i.id} className={`check-item${seciliIsciler.includes(i.id) ? ' selected' : ''}`} onClick={() => toggleIsci(i.id)}>
                    <div className="dot" />{i.isim}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {showCalc && (
            <div className="calc-preview">
              <div className="calc-row"><span>Toplam üretim</span><span>{parseFloat(miktar).toLocaleString('tr-TR')} adet</span></div>
              <div className="calc-row"><span>Birim ücret (tarife)</span><span>{birimUcret(cesit, data.ayarlar).toFixed(3)} TL/adet</span></div>
              <div className="calc-row"><span>Toplam ücret havuzu</span><span>{tl(toplamUcret)}</span></div>
              <div className="calc-row"><span>Çalışan işçi sayısı</span><span>{seciliIsciler.length} kişi</span></div>
              <div className="calc-row total"><span>Kişi başı ücret</span><span>{tl(kisiBasiUcret)}</span></div>
            </div>
          )}
          <div className="frow">
            <div>
              <label>Not</label>
              <textarea placeholder="Varsa açıklama..." value={not} onChange={e => setNot(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={kaydet}>✦ Kaydet</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Üretim Kayıtları</div></div>
        <div className="panel-body-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tarih</th><th>Çeşit</th><th>Miktar</th><th>İşçi</th><th>K.Başı ₺</th><th>Toplam ₺</th><th></th></tr>
              </thead>
              <tbody>
                {data.uretimler.length === 0 ? (
                  <tr><td colSpan={7} className="empty">Kayıt yok</td></tr>
                ) : [...data.uretimler].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(u => {
                  const isciAdlari = u.isciler.map(id => data.isciler.find(i => i.id === id)?.isim || '?').join(', ');
                  return (
                    <tr key={u.id}>
                      <td>{fd(u.tarih)}</td>
                      <td><span className="badge b-yellow">{u.cesit}</span></td>
                      <td className="td-mono">{u.miktar.toLocaleString('tr-TR')}</td>
                      <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isciAdlari}</td>
                      <td className="td-mono">{tl(u.kisiBasiUcret)}</td>
                      <td className="td-mono">{tl(u.toplamUcret)}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => sil(u.id)}>Sil</button></td>
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
