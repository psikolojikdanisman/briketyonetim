'use client';
import { useState, useMemo } from 'react';
import type { AppData, Gider, GiderKategori } from '@/types';
import { tl, fd, today, uid, GIDER_LABEL, saveGider, deleteGider } from '@/lib/storage';

interface GiderlerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

const SABIT_KATEGORILER: GiderKategori[] = ['makine_bakim', 'kamyon_bakim', 'mazot'];

function giderEtiket(g: Gider): string {
  if (g.kategori === 'diger') return g.kategoriIsim || 'Diğer';
  return GIDER_LABEL[g.kategori] || g.kategori;
}

function ozelKategoriler(giderler: Gider[]): string[] {
  const isimler = giderler.filter(g => g.kategori === 'diger' && g.kategoriIsim).map(g => g.kategoriIsim!);
  return [...new Set(isimler)];
}

export default function GiderlerPage({ data, onSave, showToast }: GiderlerProps) {
  const [tarih, setTarih] = useState(today());
  const [kategori, setKategori] = useState<GiderKategori>('mazot');
  const [digerIsim, setDigerIsim] = useState('');
  const [digerSecili, setDigerSecili] = useState('');
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [filtreKategori, setFiltreKategori] = useState('hepsi');
  const [filtreBaslangic, setFiltreBaslangic] = useState('');
  const [filtreBitis, setFiltreBitis] = useState('');

  const ozelKats = useMemo(() => ozelKategoriler(data.giderler), [data.giderler]);

  async function kaydet() {
    const t = parseFloat(tutar);
    if (!t || t <= 0) { showToast('Tutar gerekli', false); return; }
    let kategoriIsim: string | undefined;
    if (kategori === 'diger') {
      const isim = digerSecili || digerIsim.trim();
      if (!isim) { showToast("'Diğer' için kategori adı girin", false); return; }
      kategoriIsim = isim;
    }
    const yeni: Gider = { id: uid(), tarih, kategori, kategoriIsim, tutar: t, aciklama: aciklama.trim() || undefined };
    onSave({ ...data, giderler: [...data.giderler, yeni] });
    await saveGider(yeni);
    setTutar(''); setAciklama(''); setDigerIsim(''); setDigerSecili('');
    showToast('Gider kaydedildi ✓');
  }

  async function sil(id: number) {
    onSave({ ...data, giderler: data.giderler.filter(g => g.id !== id) });
    await deleteGider(id);
    showToast('Gider silindi');
  }

  const filtrelenmis = useMemo(() => {
    let list = [...data.giderler].sort((a, b) => b.tarih.localeCompare(a.tarih));
    if (filtreKategori !== 'hepsi') {
      if (SABIT_KATEGORILER.includes(filtreKategori as GiderKategori)) {
        list = list.filter(g => g.kategori === filtreKategori);
      } else {
        list = list.filter(g => g.kategori === 'diger' && g.kategoriIsim === filtreKategori);
      }
    }
    if (filtreBaslangic) list = list.filter(g => g.tarih >= filtreBaslangic);
    if (filtreBitis)     list = list.filter(g => g.tarih <= filtreBitis);
    return list;
  }, [data.giderler, filtreKategori, filtreBaslangic, filtreBitis]);

  const toplamFiltre = filtrelenmis.reduce((s, g) => s + g.tutar, 0);
  const now = new Date();
  const ayBas = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const buAyGiderler = data.giderler.filter(g => g.tarih >= ayBas);
  const buAyToplam = buAyGiderler.reduce((s, g) => s + g.tutar, 0);
  const buAyKatToplam = SABIT_KATEGORILER.map(kat => ({ isim: GIDER_LABEL[kat], toplam: buAyGiderler.filter(g => g.kategori === kat).reduce((s, g) => s + g.tutar, 0) }));
  const buAyDigerToplam = buAyGiderler.filter(g => g.kategori === 'diger').reduce((s, g) => s + g.tutar, 0);

  return (
    <div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Gider Girişi</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div><label>Tarih</label><input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></div>
              <div><label>Tutar (TL)</label><input type="number" step="0.01" placeholder="0.00" value={tutar} onChange={e => setTutar(e.target.value)} /></div>
            </div>
            <div className="frow">
              <div>
                <label>Kategori</label>
                <select value={kategori} onChange={e => { setKategori(e.target.value as GiderKategori); setDigerIsim(''); setDigerSecili(''); }}>
                  <optgroup label="— Sabit —">
                    {SABIT_KATEGORILER.map(k => <option key={k} value={k}>{GIDER_LABEL[k]}</option>)}
                  </optgroup>
                  <optgroup label="— Diğer —">
                    <option value="diger">Diğer (yeni ekle)</option>
                  </optgroup>
                </select>
              </div>
            </div>
            {kategori === 'diger' && (
              <div style={{ background: 'rgba(0,0,0,.025)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ozelKats.length > 0 && (
                  <div>
                    <label style={{ fontSize: 12 }}>Daha önce eklenen kategoriler</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {ozelKats.map(k => (
                        <button key={k} className={`btn btn-sm ${digerSecili === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setDigerSecili(k); setDigerIsim(''); }}>{k}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12 }}>Ya da yeni kategori adı gir</label>
                  <input type="text" placeholder="ör: Elektrik, Kira..." value={digerIsim} onChange={e => { setDigerIsim(e.target.value); setDigerSecili(''); }} />
                </div>
              </div>
            )}
            <div className="frow">
              <div><label>Açıklama (opsiyonel)</label><input type="text" placeholder="Detay not..." value={aciklama} onChange={e => setAciklama(e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" onClick={kaydet}>✦ Gider Kaydet</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">Bu Ay Özet</div></div>
          <div className="panel-body">
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card"><div className="stat-label">Bu Ay Toplam Gider</div><div className="stat-value c-red" style={{ fontSize: 22 }}>{tl(buAyToplam)}</div></div>
              <div className="stat-card"><div className="stat-label">Kayıt Sayısı</div><div className="stat-value" style={{ fontSize: 22 }}>{buAyGiderler.length}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {buAyKatToplam.map(k => (
                <div key={k.isim} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{k.isim}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: k.toplam > 0 ? 'var(--danger)' : 'var(--text3)' }}>{tl(k.toplam)}</span>
                </div>
              ))}
              {buAyDigerToplam > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Diğer</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: 'var(--danger)' }}>{tl(buAyDigerToplam)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Gider Kayıtları</div></div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <select value={filtreKategori} onChange={e => setFiltreKategori(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="hepsi">Tüm Kategoriler</option>
            {SABIT_KATEGORILER.map(k => <option key={k} value={k}>{GIDER_LABEL[k]}</option>)}
            {ozelKats.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="date" value={filtreBaslangic} onChange={e => setFiltreBaslangic(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
          <input type="date" value={filtreBitis} onChange={e => setFiltreBitis(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          {(filtreBaslangic || filtreBitis || filtreKategori !== 'hepsi') && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFiltreKategori('hepsi'); setFiltreBaslangic(''); setFiltreBitis(''); }}>✕ Temizle</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>
            {filtrelenmis.length} kayıt — Toplam: <strong style={{ color: 'var(--danger)' }}>{tl(toplamFiltre)}</strong>
          </span>
        </div>
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tarih</th><th>Kategori</th><th>Tutar</th><th>Açıklama</th><th></th></tr></thead>
            <tbody>
              {filtrelenmis.length === 0 ? (
                <tr><td colSpan={5} className="empty">Kayıt yok</td></tr>
              ) : filtrelenmis.map(g => (
                <tr key={g.id}>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fd(g.tarih)}</td>
                  <td><span className={`badge ${g.kategori === 'mazot' ? 'b-blue' : g.kategori === 'makine_bakim' ? 'b-yellow' : g.kategori === 'kamyon_bakim' ? 'b-green' : 'b-gray'}`}>{giderEtiket(g)}</span></td>
                  <td className="td-mono negative">{tl(g.tutar)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{g.aciklama || '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => sil(g.id)}>Sil</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
