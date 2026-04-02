'use client';
import { useState, useMemo } from 'react';
import type { AppData } from '@/types';
import { tl, fd, buHafta, uid, saveAvans, deleteAvans } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';

interface IsciDetayProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
  isciId: number;
  onGeri: () => void;
}

const TUR_LABEL: Record<string, string> = { yukleme: 'Yükleme', bosaltma: 'İndirme', dama_bosaltma: 'Dama İndirme', cimento: 'Çim. Yükleme', cimento_indirme: 'Çim. İndirme' };
const TUR_BADGE: Record<string, string> = { yukleme: 'b-blue', bosaltma: 'b-green', dama_bosaltma: 'b-yellow', cimento: 'b-gray', cimento_indirme: 'b-gray' };

function todayStr(): string { return new Date().toISOString().split('T')[0]; }
function gunKaydir(tarih: string, gun: number): string { const d = new Date(tarih); d.setDate(d.getDate() + gun); return d.toISOString().slice(0, 10); }

interface FiltreToolbarProps {
  siralama: 'yeni' | 'eski'; setSiralama: (v: 'yeni' | 'eski') => void;
  filtremod: 'hepsi' | 'gun' | 'aralik'; setFiltremod: (v: 'hepsi' | 'gun' | 'aralik') => void;
  gunTarih: string; setGunTarih: (v: string) => void;
  baslangic: string; setBaslangic: (v: string) => void;
  bitis: string; setBitis: (v: string) => void;
  kayitSayisi: number;
}

function FiltreToolbar({ siralama, setSiralama, filtremod, setFiltremod, gunTarih, setGunTarih, baslangic, setBaslangic, bitis, setBitis, kayitSayisi }: FiltreToolbarProps) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['yeni', 'eski'] as const).map(s => (
          <button key={s} className={`btn btn-sm ${siralama === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSiralama(s)}>{s === 'yeni' ? '↓ En Yeni' : '↑ En Eski'}</button>
        ))}
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
      <button className={`btn btn-sm ${filtremod === 'hepsi' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltremod('hepsi')}>Tümü</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn btn-sm btn-secondary" onClick={() => { setGunTarih(gunKaydir(gunTarih, -1)); setFiltremod('gun'); }} style={{ padding: '4px 10px', fontWeight: 700 }}>‹</button>
        <div style={{ padding: '4px 12px', background: filtremod === 'gun' ? 'rgba(45,122,79,.12)' : 'var(--surface)', border: `1px solid ${filtremod === 'gun' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', minWidth: 100, textAlign: 'center', color: gunTarih === todayStr() ? 'var(--accent)' : 'var(--text)', fontWeight: gunTarih === todayStr() ? 700 : 400, cursor: 'pointer' }} onClick={() => { setGunTarih(todayStr()); setFiltremod('gun'); }}>
          {filtremod === 'gun' ? (gunTarih === todayStr() ? 'Bugün' : fd(gunTarih)) : 'Bugün'}
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => { setGunTarih(gunKaydir(gunTarih, +1)); setFiltremod('gun'); }} style={{ padding: '4px 10px', fontWeight: 700 }}>›</button>
      </div>
      <button className={`btn btn-sm ${filtremod === 'aralik' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltremod(filtremod === 'aralik' ? 'hepsi' : 'aralik')}>Aralık</button>
      {filtremod === 'aralik' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="date" value={baslangic} onChange={e => setBaslangic(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
          <input type="date" value={bitis} onChange={e => setBitis(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
        </div>
      )}
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>{kayitSayisi} kayıt</span>
    </div>
  );
}

export default function IsciDetay({ data, onSave, showToast, isciId, onGeri }: IsciDetayProps) {
  const [avTutar, setAvTutar]       = useState('');
  const [avTarih, setAvTarih]       = useState(todayStr());
  const [avAciklama, setAvAciklama] = useState('');
  const [sonOdeme, setSonOdeme] = useState<{ isciIsim: string; tutar: number; tarih: string; aciklama: string; no: string; haftaKazanc: number; haftaOdenenOncesi: number; tumKazanc: number; tumOdenenOncesi: number; } | null>(null);

  const [ureSiralama, setUreSiralama]     = useState<'yeni' | 'eski'>('yeni');
  const [ureFiltremod, setUreFiltremod]   = useState<'hepsi' | 'gun' | 'aralik'>('hepsi');
  const [ureGunTarih, setUreGunTarih]     = useState(todayStr());
  const [ureBaslangic, setUreBaslangic]   = useState('');
  const [ureBitis, setUreBitis]           = useState('');
  const [yukSiralama, setYukSiralama]     = useState<'yeni' | 'eski'>('yeni');
  const [yukFiltremod, setYukFiltremod]   = useState<'hepsi' | 'gun' | 'aralik'>('hepsi');
  const [yukGunTarih, setYukGunTarih]     = useState(todayStr());
  const [yukBaslangic, setYukBaslangic]   = useState('');
  const [yukBitis, setYukBitis]           = useState('');
  const [odeSiralama, setOdeSiralama]     = useState<'yeni' | 'eski'>('yeni');
  const [odeFiltremod, setOdeFiltremod]   = useState<'hepsi' | 'gun' | 'aralik'>('hepsi');
  const [odeGunTarih, setOdeGunTarih]     = useState(todayStr());
  const [odeBaslangic, setOdeBaslangic]   = useState('');
  const [odeBitis, setOdeBitis]           = useState('');

  const { bas, bit } = buHafta();
  const isci = data.isciler.find(i => i.id === isciId);

  if (!isci) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <div>İşçi bulunamadı.</div>
      <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={onGeri}>← Geri Dön</button>
    </div>
  );

  const tk = useMemo(() => {
    const ure = data.uretimler.filter(u => u.isciler.includes(isciId)).reduce((s, u) => s + u.kisiBasiUcret, 0);
    const yuk = data.yuklemeler.filter(y => y.isciler.includes(isciId)).reduce((s, y) => s + y.kisiBasiUcret, 0);
    return { ure, yuk, top: ure + yuk };
  }, [data.uretimler, data.yuklemeler, isciId]);

  const to = useMemo(() => data.avanslar.filter(a => a.isciId === isciId).reduce((s, a) => s + a.tutar, 0), [data.avanslar, isciId]);

  const hk = useMemo(() => {
    const ure = data.uretimler.filter(u => u.tarih >= bas && u.tarih <= bit && u.isciler.includes(isciId)).reduce((s, u) => s + u.kisiBasiUcret, 0);
    const yuk = data.yuklemeler.filter(y => y.tarih >= bas && y.tarih <= bit && y.isciler.includes(isciId)).reduce((s, y) => s + y.kisiBasiUcret, 0);
    return { ure, yuk, top: ure + yuk };
  }, [data.uretimler, data.yuklemeler, isciId, bas, bit]);

  const ho = useMemo(() => data.avanslar.filter(a => a.isciId === isciId && a.tarih >= bas).reduce((s, a) => s + a.tutar, 0), [data.avanslar, isciId, bas]);

  const tumKalan    = tk.top - to;
  const haftaKalanVal = hk.top - ho;

  const filtreliUretimler = useMemo(() => {
    let list = data.uretimler.filter(u => u.isciler.includes(isciId));
    if (ureFiltremod === 'gun') list = list.filter(u => u.tarih === ureGunTarih);
    else if (ureFiltremod === 'aralik') { if (ureBaslangic) list = list.filter(u => u.tarih >= ureBaslangic); if (ureBitis) list = list.filter(u => u.tarih <= ureBitis); }
    return [...list].sort((a, b) => ureSiralama === 'yeni' ? b.tarih.localeCompare(a.tarih) : a.tarih.localeCompare(b.tarih));
  }, [data.uretimler, isciId, ureFiltremod, ureGunTarih, ureBaslangic, ureBitis, ureSiralama]);

  const filtreliYuklemeler = useMemo(() => {
    let list = data.yuklemeler.filter(y => y.isciler.includes(isciId));
    if (yukFiltremod === 'gun') list = list.filter(y => y.tarih === yukGunTarih);
    else if (yukFiltremod === 'aralik') { if (yukBaslangic) list = list.filter(y => y.tarih >= yukBaslangic); if (yukBitis) list = list.filter(y => y.tarih <= yukBitis); }
    return [...list].sort((a, b) => yukSiralama === 'yeni' ? b.tarih.localeCompare(a.tarih) : a.tarih.localeCompare(b.tarih));
  }, [data.yuklemeler, isciId, yukFiltremod, yukGunTarih, yukBaslangic, yukBitis, yukSiralama]);

  const filtreliOdemeler = useMemo(() => {
    let list = data.avanslar.filter(a => a.isciId === isciId);
    if (odeFiltremod === 'gun') list = list.filter(a => a.tarih === odeGunTarih);
    else if (odeFiltremod === 'aralik') { if (odeBaslangic) list = list.filter(a => a.tarih >= odeBaslangic); if (odeBitis) list = list.filter(a => a.tarih <= odeBitis); }
    return [...list].sort((a, b) => odeSiralama === 'yeni' ? b.tarih.localeCompare(a.tarih) : a.tarih.localeCompare(b.tarih));
  }, [data.avanslar, isciId, odeFiltremod, odeGunTarih, odeBaslangic, odeBitis, odeSiralama]);

  async function odemeKaydet() {
    const tutar = parseFloat(avTutar);
    if (!tutar) { showToast('Tutar gerekli', false); return; }
    const makbuzNo = `IP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const yeniAvans = { id: uid(), isciId, tutar, tarih: avTarih, aciklama: avAciklama };
    onSave({ ...data, avanslar: [...data.avanslar, yeniAvans] });
    await saveAvans(yeniAvans);
    setSonOdeme({ isciIsim: isci.isim, tutar, tarih: avTarih, aciklama: avAciklama, no: makbuzNo, haftaKazanc: hk.top, haftaOdenenOncesi: ho, tumKazanc: tk.top, tumOdenenOncesi: to });
    setAvTutar(''); setAvAciklama('');
    showToast('Ödeme kaydedildi ✓');
  }

  function makbuzAc() {
    if (!sonOdeme) return;
    const kalanSonra     = Math.max(0, sonOdeme.tumKazanc - sonOdeme.tumOdenenOncesi - sonOdeme.tutar);
    const haftaKalanSonra = Math.max(0, sonOdeme.haftaKazanc - sonOdeme.haftaOdenenOncesi - sonOdeme.tutar);
    makbuzIndir({
      baslik: 'ISCI ODEME MAKBUZU', makbuzNo: sonOdeme.no, tarih: sonOdeme.tarih,
      alici: sonOdeme.isciIsim, aciklama: sonOdeme.aciklama || undefined,
      kalemler: [
        { etiket: 'Bu Hafta Toplam Kazanc', deger: tl(sonOdeme.haftaKazanc) },
        { etiket: 'Bu Hafta Onceki Odemeler', deger: tl(sonOdeme.haftaOdenenOncesi) },
        { etiket: 'Bu Hafta Kalan (Bu Odeme Sonrasi)', deger: tl(haftaKalanSonra) },
        { etiket: 'Tum Zamanlar Kazanc', deger: tl(sonOdeme.tumKazanc) },
        { etiket: 'Tum Zamanlar Odenen', deger: tl(sonOdeme.tumOdenenOncesi) },
      ],
      odemeTutari: tl(sonOdeme.tutar),
      kalanBorc: kalanSonra > 0 ? tl(kalanSonra) : undefined,
      isletmeAdi: 'BRIKET YONETIM',
    });
  }

  async function odemeSil(id: number) {
    onSave({ ...data, avanslar: data.avanslar.filter(a => a.id !== id) });
    await deleteAvans(id);
    showToast('Ödeme silindi');
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={onGeri} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>← Geri</button>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, color: 'var(--text)' }}>{isci.isim}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>İŞÇİ PROFİLİ</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Tüm Zamanlar Kazanç', value: tl(tk.top), color: 'var(--accent)' },
          { label: 'Toplam Ödenen',        value: tl(to),     color: 'var(--green)' },
          { label: 'Toplam Kalan',         value: tl(tumKalan), color: tumKalan > 0 ? 'var(--green)' : 'var(--text3)' },
          { label: 'Bu Hafta Kalan',       value: tl(haftaKalanVal), color: haftaKalanVal > 0 ? 'var(--green)' : 'var(--text3)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(46,196,182,.06)', border: '1px solid rgba(46,196,182,.2)', borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
        <div><div style={{ color: 'var(--text3)', marginBottom: 3 }}>BU HAFTA</div><div style={{ color: 'var(--text2)' }}>{fd(bas)} — {fd(bit)}</div></div>
        <div><div style={{ color: 'var(--text3)', marginBottom: 3 }}>ÜRETİMDEN</div><div style={{ color: 'var(--accent)' }}>{tl(hk.ure)}</div></div>
        <div><div style={{ color: 'var(--text3)', marginBottom: 3 }}>YÜKLEMEDEN</div><div style={{ color: 'var(--accent)' }}>{tl(hk.yuk)}</div></div>
        <div><div style={{ color: 'var(--text3)', marginBottom: 3 }}>ÖDENEN</div><div style={{ color: 'var(--green)' }}>{tl(ho)}</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><div className="panel-title">Ödeme Yap</div></div>
        <div className="panel-body">
          <div className="frow c2">
            <div><label>Tutar (TL)</label><input type="number" placeholder="0.00" value={avTutar} onChange={e => setAvTutar(e.target.value)} /></div>
            <div><label>Tarih</label><input type="date" value={avTarih} onChange={e => setAvTarih(e.target.value)} /></div>
          </div>
          {tumKalan > 0 && (
            <div style={{ background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 8, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text2)' }}>
              Kalan alacak: <span style={{ color: 'var(--success)', fontWeight: 700 }}>{tl(tumKalan)}</span>
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={() => setAvTutar(String(tumKalan))}>Tamamını Öde</button>
            </div>
          )}
          <div><label>Açıklama</label><input type="text" placeholder="ör: bu haftanın ödemesi" value={avAciklama} onChange={e => setAvAciklama(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <button className="btn btn-success" onClick={odemeKaydet}>✓ Ödeme Yap</button>
            {sonOdeme && <button className="btn btn-secondary" onClick={makbuzAc}>📄 Makbuz PDF</button>}
          </div>
          {sonOdeme && (
            <div style={{ marginTop: 10, background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>
              ✓ <strong>{sonOdeme.isciIsim}</strong> — {tl(sonOdeme.tutar)} ödeme yapıldı
            </div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><div className="panel-title">Üretim Geçmişi</div></div>
        <FiltreToolbar siralama={ureSiralama} setSiralama={setUreSiralama} filtremod={ureFiltremod} setFiltremod={setUreFiltremod} gunTarih={ureGunTarih} setGunTarih={setUreGunTarih} baslangic={ureBaslangic} setBaslangic={setUreBaslangic} bitis={ureBitis} setBitis={setUreBitis} kayitSayisi={filtreliUretimler.length} />
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tarih</th><th>Çeşit</th><th>Toplam Üretim</th><th>Kişi Başı Ücret</th><th>Toplam Havuz</th></tr></thead>
            <tbody>
              {filtreliUretimler.length === 0 ? <tr><td colSpan={5} className="empty">Kayıt yok</td></tr>
              : filtreliUretimler.map(u => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fd(u.tarih)}</td>
                  <td><span className="badge b-yellow">{u.cesit}</span></td>
                  <td className="td-mono">{u.miktar.toLocaleString('tr-TR')} adet</td>
                  <td className="td-mono positive">{tl(u.kisiBasiUcret)}</td>
                  <td className="td-mono">{tl(u.toplamUcret)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><div className="panel-title">Yükleme / İndirme Geçmişi</div></div>
        <FiltreToolbar siralama={yukSiralama} setSiralama={setYukSiralama} filtremod={yukFiltremod} setFiltremod={setYukFiltremod} gunTarih={yukGunTarih} setGunTarih={setYukGunTarih} baslangic={yukBaslangic} setBaslangic={setYukBaslangic} bitis={yukBitis} setBitis={setYukBitis} kayitSayisi={filtreliYuklemeler.length} />
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tarih</th><th>İşlem</th><th>Miktar</th><th>Kişi Başı Ücret</th><th>Not</th></tr></thead>
            <tbody>
              {filtreliYuklemeler.length === 0 ? <tr><td colSpan={5} className="empty">Kayıt yok</td></tr>
              : filtreliYuklemeler.map(y => (
                <tr key={y.id}>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fd(y.tarih)}</td>
                  <td><span className={`badge ${TUR_BADGE[y.tur] || 'b-gray'}`}>{TUR_LABEL[y.tur] || y.tur}</span></td>
                  <td className="td-mono">{y.miktar.toLocaleString('tr-TR')}</td>
                  <td className="td-mono positive">{tl(y.kisiBasiUcret)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{y.not || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Ödeme Hareketleri</div></div>
        <FiltreToolbar siralama={odeSiralama} setSiralama={setOdeSiralama} filtremod={odeFiltremod} setFiltremod={setOdeFiltremod} gunTarih={odeGunTarih} setGunTarih={setOdeGunTarih} baslangic={odeBaslangic} setBaslangic={setOdeBaslangic} bitis={odeBitis} setBitis={setOdeBitis} kayitSayisi={filtreliOdemeler.length} />
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tarih</th><th>Tutar</th><th>Açıklama</th><th></th></tr></thead>
            <tbody>
              {filtreliOdemeler.length === 0 ? <tr><td colSpan={4} className="empty">Kayıt yok</td></tr>
              : filtreliOdemeler.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fd(o.tarih)}</td>
                  <td className="td-mono positive">{tl(o.tutar)}</td>
                  <td>{o.aciklama || '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => odemeSil(o.id)}>Sil</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
