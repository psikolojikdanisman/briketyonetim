'use client';
import { useState } from 'react';
import type { AppData } from '@/types';
import { tl, fd, today, uid, buHafta } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';

interface IscilerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

const TUR_LABEL: Record<string, string> = {
  yukleme: 'Yükleme', bosaltma: 'İndirme', dama_bosaltma: 'Dama İndirme',
  cimento: 'Çim. Yükleme', cimento_indirme: 'Çim. İndirme',
};
const TUR_BADGE: Record<string, string> = {
  yukleme: 'b-blue', bosaltma: 'b-green', dama_bosaltma: 'b-yellow',
  cimento: 'b-gray', cimento_indirme: 'b-gray',
};

export default function IscilerPage({ data, onSave, showToast }: IscilerProps) {
  const [isim, setIsim] = useState('');
  const [avIsci, setAvIsci] = useState('');
  const [avTutar, setAvTutar] = useState('');
  const [avTarih, setAvTarih] = useState(today());
  const [avAciklama, setAvAciklama] = useState('');
  const [sonOdeme, setSonOdeme] = useState<{
    isciId: number; isciIsim: string;
    tutar: number; tarih: string; aciklama: string; no: string;
    haftaKazanc: number; haftaOdenenOncesi: number;
    tumKazanc: number; tumOdenenOncesi: number;
  } | null>(null);

  const [profilId, setProfilId] = useState<number | null>(null);
  const { bas, bit } = buHafta();

  function isciEkle() {
    if (!isim.trim()) { showToast('İsim gerekli', false); return; }
    onSave({ ...data, isciler: [...data.isciler, { id: uid(), isim: isim.trim() }] });
    setIsim('');
    showToast('İşçi eklendi');
  }

  function isciSil(id: number) {
    onSave({ ...data, isciler: data.isciler.filter(i => i.id !== id) });
    if (profilId === id) setProfilId(null);
    showToast('İşçi silindi');
  }

  function isciKazancAralik(isciId: number, basTarih: string, bitTarih: string) {
    const ure = data.uretimler.filter(u => u.tarih >= basTarih && u.tarih <= bitTarih && u.isciler.includes(isciId)).reduce((s, u) => s + u.kisiBasiUcret, 0);
    const yuk = data.yuklemeler.filter(y => y.tarih >= basTarih && y.tarih <= bitTarih && y.isciler.includes(isciId)).reduce((s, y) => s + y.kisiBasiUcret, 0);
    return { ure, yuk, top: ure + yuk };
  }

  function isciKazanc(isciId: number) { return isciKazancAralik(isciId, bas, bit); }

  function isciOdenen(isciId: number) {
    return data.avanslar.filter(a => a.isciId === isciId && a.tarih >= bas).reduce((s, a) => s + a.tutar, 0);
  }

  function isciTumZamanKazanc(isciId: number) {
    const ure = data.uretimler.filter(u => u.isciler.includes(isciId)).reduce((s, u) => s + u.kisiBasiUcret, 0);
    const yuk = data.yuklemeler.filter(y => y.isciler.includes(isciId)).reduce((s, y) => s + y.kisiBasiUcret, 0);
    return { ure, yuk, top: ure + yuk };
  }

  function isciTumOdenen(isciId: number) {
    return data.avanslar.filter(a => a.isciId === isciId).reduce((s, a) => s + a.tutar, 0);
  }

  function isciKalan(isciId: number) {
    return isciTumZamanKazanc(isciId).top - isciTumOdenen(isciId);
  }

  function handleIsciSec(val: string) {
    setAvIsci(val);
    setSonOdeme(null);
    if (val) {
      const kalan = isciKalan(parseInt(val));
      setAvTutar(kalan > 0 ? String(kalan) : '');
    } else {
      setAvTutar('');
    }
  }

  function avansKaydet() {
    const id = parseInt(avIsci);
    const tutar = parseFloat(avTutar);
    if (!id || !tutar) { showToast('İşçi ve tutar gerekli', false); return; }
    const isci = data.isciler.find(i => i.id === id);
    const makbuzNo = `IP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const hk = isciKazanc(id);
    const ho = isciOdenen(id);
    const tk = isciTumZamanKazanc(id);
    const to = isciTumOdenen(id);

    onSave({ ...data, avanslar: [...data.avanslar, { id: uid(), isciId: id, tutar, tarih: avTarih || today(), aciklama: avAciklama }] });
    setSonOdeme({
      isciId: id,
      isciIsim: isci?.isim || '?',
      tutar,
      tarih: avTarih || today(),
      aciklama: avAciklama,
      no: makbuzNo,
      haftaKazanc: hk.top,
      haftaOdenenOncesi: ho,
      tumKazanc: tk.top,
      tumOdenenOncesi: to,
    });
    setAvTutar(''); setAvAciklama('');
    showToast('Ödeme kaydedildi ✓');
  }

  function isciMakbuzAc() {
    if (!sonOdeme) return;
    const kalanSonra = Math.max(0, sonOdeme.tumKazanc - sonOdeme.tumOdenenOncesi - sonOdeme.tutar);
    const haftaKalan = Math.max(0, sonOdeme.haftaKazanc - sonOdeme.haftaOdenenOncesi - sonOdeme.tutar);

    makbuzIndir({
      baslik: 'ISCI ODEME MAKBUZU',
      makbuzNo: sonOdeme.no,
      tarih: sonOdeme.tarih,
      alici: sonOdeme.isciIsim,
      aciklama: sonOdeme.aciklama || undefined,
      kalemler: [
        { etiket: 'Odeme Tarihi',              deger: sonOdeme.tarih.split('-').reverse().join('.') },
        { etiket: 'Bu Hafta Toplam Kazanc',    deger: tl(sonOdeme.haftaKazanc) },
        { etiket: 'Bu Hafta Onceki Odemeler',  deger: tl(sonOdeme.haftaOdenenOncesi) },
        { etiket: 'Bu Hafta Kalan (Bu Odeme Sonrasi)', deger: tl(haftaKalan) },
        { etiket: 'Tum Zamanlar Kazanc',       deger: tl(sonOdeme.tumKazanc) },
        { etiket: 'Tum Zamanlar Odenen',       deger: tl(sonOdeme.tumOdenenOncesi) },
        ...(sonOdeme.aciklama ? [{ etiket: 'Aciklama', deger: sonOdeme.aciklama }] : []),
      ],
      odemeTutari: tl(sonOdeme.tutar),
      kalanBorc: kalanSonra > 0 ? tl(kalanSonra) : undefined,
      isletmeAdi: 'BRIKET YONETIM',
    });
  }

  function avSil(id: number) { onSave({ ...data, avanslar: data.avanslar.filter(a => a.id !== id) }); }

  const profilIsci = profilId !== null ? data.isciler.find(i => i.id === profilId) : null;

  function ProfilModal() {
    if (!profilIsci) return null;
    const iid = profilIsci.id;
    const tumKazanc = isciTumZamanKazanc(iid);
    const tumOdenen = isciTumOdenen(iid);
    const tumKalan  = tumKazanc.top - tumOdenen;
    const haftaKazanc = isciKazanc(iid);
    const haftaOdenen = isciOdenen(iid);
    const haftaKalan  = haftaKazanc.top - haftaOdenen;
    const uretimler  = [...data.uretimler].filter(u => u.isciler.includes(iid)).sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 20);
    const yuklemeler = [...data.yuklemeler].filter(y => y.isciler.includes(iid)).sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 20);
    const odemeler   = [...data.avanslar].filter(a => a.isciId === iid).sort((a, b) => b.tarih.localeCompare(a.tarih));

    return (
      <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setProfilId(null); }}>
        <div className="modal" style={{ width: 820, maxWidth: '95vw', maxHeight: '90vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="modal-title" style={{ margin: 0 }}>
              {profilIsci.isim}
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace', marginLeft: 12, fontWeight: 400 }}>İŞÇİ PROFİLİ</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setProfilId(null)}>✕ Kapat</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Tüm Zamanlar Kazanç', value: tl(tumKazanc.top), color: 'var(--accent)' },
              { label: 'Toplam Ödenen',        value: tl(tumOdenen),     color: 'var(--green)'  },
              { label: 'Toplam Kalan',         value: tl(tumKalan),      color: tumKalan > 0 ? 'var(--green)' : 'var(--text3)' },
              { label: 'Bu Hafta Kalan',       value: tl(haftaKalan),    color: haftaKalan > 0 ? 'var(--green)' : 'var(--text3)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: '12px 14px' }}>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(46,196,182,.06)', border: '1px solid rgba(46,196,182,.2)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
            <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>BU HAFTA</div><div style={{ color: 'var(--text2)' }}>{fd(bas)} — {fd(bit)}</div></div>
            <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>ÜRETİMDEN</div><div style={{ color: 'var(--accent)' }}>{tl(haftaKazanc.ure)}</div></div>
            <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>YÜKLEMEDEN</div><div style={{ color: 'var(--accent)' }}>{tl(haftaKazanc.yuk)}</div></div>
            <div><div style={{ color: 'var(--text3)', marginBottom: 2 }}>ÖDENEN</div><div style={{ color: 'var(--green)' }}>{tl(haftaOdenen)}</div></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, marginBottom: 8 }}>ÜRETİM GEÇMİŞİ</div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Tarih</th><th>Çeşit</th><th>Toplam Üretim</th><th>Kişi Başı Ücret</th><th>Toplam Havuz</th></tr></thead>
                <tbody>
                  {uretimler.length === 0 ? <tr><td colSpan={5} className="empty">Üretim kaydı yok</td></tr> : uretimler.map(u => (
                    <tr key={u.id}><td>{fd(u.tarih)}</td><td><span className="badge b-yellow">{u.cesit}</span></td><td className="td-mono">{u.miktar.toLocaleString('tr-TR')} adet</td><td className="td-mono positive">{tl(u.kisiBasiUcret)}</td><td className="td-mono">{tl(u.toplamUcret)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, marginBottom: 8 }}>YÜKLEME / İNDİRME GEÇMİŞİ</div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Tarih</th><th>İşlem</th><th>Miktar</th><th>Kişi Başı Ücret</th><th>Not</th></tr></thead>
                <tbody>
                  {yuklemeler.length === 0 ? <tr><td colSpan={5} className="empty">Kayıt yok</td></tr> : yuklemeler.map(y => (
                    <tr key={y.id}><td>{fd(y.tarih)}</td><td><span className={`badge ${TUR_BADGE[y.tur] || 'b-gray'}`}>{TUR_LABEL[y.tur] || y.tur}</span></td><td className="td-mono">{y.miktar.toLocaleString('tr-TR')}</td><td className="td-mono positive">{tl(y.kisiBasiUcret)}</td><td style={{ fontSize: 11, color: 'var(--text3)' }}>{y.not || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 1, marginBottom: 8 }}>ÖDEME HAREKETLERİ</div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Tarih</th><th>Tutar</th><th>Açıklama</th><th></th></tr></thead>
                <tbody>
                  {odemeler.length === 0 ? <tr><td colSpan={4} className="empty">Ödeme kaydı yok</td></tr> : odemeler.map(o => (
                    <tr key={o.id}><td>{fd(o.tarih)}</td><td className="td-mono positive">{tl(o.tutar)}</td><td>{o.aciklama || '—'}</td><td><button className="btn btn-danger btn-sm" onClick={() => avSil(o.id)}>Sil</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isimStyle: React.CSSProperties = { cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 };

  return (
    <div>
      <ProfilModal />
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">İşçi Ekle</div></div>
          <div className="panel-body">
            <div className="frow"><div><label>Ad Soyad</label><input type="text" placeholder="İşçi adı" value={isim} onChange={e => setIsim(e.target.value)} onKeyDown={e => e.key === 'Enter' && isciEkle()} /></div></div>
            <button className="btn btn-primary" onClick={isciEkle}>+ Ekle</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">İşçiye Ödeme</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div>
                <label>İşçi</label>
                <select value={avIsci} onChange={e => handleIsciSec(e.target.value)}>
                  <option value="">— Seç —</option>
                  {data.isciler.map(i => <option key={i.id} value={i.id}>{i.isim}</option>)}
                </select>
              </div>
              <div><label>Tutar (TL)</label><input type="number" placeholder="0.00" value={avTutar} onChange={e => setAvTutar(e.target.value)} /></div>
            </div>

            {avIsci && (() => {
              const kalan = isciKalan(parseInt(avIsci));
              return kalan > 0 ? (
                <div style={{ background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 4, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text2)' }}>
                  Kalan alacak: <span style={{ color: 'var(--success)', fontWeight: 700 }}>{tl(kalan)}</span>
                </div>
              ) : null;
            })()}

            <div className="frow c2">
              <div><label>Tarih</label><input type="date" value={avTarih} onChange={e => setAvTarih(e.target.value)} /></div>
              <div><label>Açıklama</label><input type="text" placeholder="ör: bu haftanın ödemesi" value={avAciklama} onChange={e => setAvAciklama(e.target.value)} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={avansKaydet}>✓ Ödeme Yap</button>
              {sonOdeme && (
                <button className="btn btn-secondary" onClick={isciMakbuzAc} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  📄 Makbuz PDF
                </button>
              )}
            </div>

            {sonOdeme && (
              <div style={{ marginTop: 10, background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>
                ✓ <strong>{sonOdeme.isciIsim}</strong> — {tl(sonOdeme.tutar)} ödeme yapıldı
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Haftalık özet */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">İşçi Durumu (Bu Hafta)</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>{fd(bas)} — {fd(bit)}</div>
        </div>
        <div className="panel-body">
          <div className="three-col">
            {data.isciler.length === 0 ? (
              <div className="empty" style={{ gridColumn: '1/-1' }}>İşçi eklenmemiş</div>
            ) : data.isciler.map(i => {
              const k = isciKazanc(i.id);
              const odened = isciOdenen(i.id);
              const kalan  = k.top - odened;
              return (
                <div key={i.id} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setProfilId(i.id)}>
                  <div className="stat-label" style={{ color: 'var(--accent)' }}>{i.isim}</div>
                  <div style={{ fontSize: 18, fontFamily: "'Bebas Neue', sans-serif", color: 'var(--text)' }}>{tl(k.top)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Üretim: {tl(k.ure)} | Yükleme: {tl(k.yuk)}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: 'var(--green)' }}>Ödenen: {tl(odened)}</span>{'  '}
                    <span className={kalan > 0 ? 'positive' : 'negative'}>Kalan: {tl(kalan)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, fontFamily: 'IBM Plex Mono, monospace' }}>detay için tıkla →</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* İşçi listesi */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">İşçi Listesi</div></div>
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Ad Soyad</th><th>Bu Hafta Kazanç</th><th>Ödenen</th><th>Kalan Alacak</th><th></th></tr></thead>
            <tbody>
              {data.isciler.length === 0 ? (
                <tr><td colSpan={5} className="empty">İşçi yok</td></tr>
              ) : data.isciler.map(i => {
                const k = isciKazanc(i.id);
                const odened = isciOdenen(i.id);
                const kalan  = k.top - odened;
                return (
                  <tr key={i.id}>
                    <td><span style={isimStyle} onClick={() => setProfilId(i.id)}>{i.isim}</span></td>
                    <td className="td-mono">{tl(k.top)}</td>
                    <td className="td-mono positive">{tl(odened)}</td>
                    <td className={`td-mono ${kalan > 0 ? 'positive' : ''}`}>{tl(kalan)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => isciSil(i.id)}>Sil</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ödeme hareketleri */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Ödeme Hareketleri</div></div>
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tarih</th><th>İşçi</th><th>Tutar</th><th>Açıklama</th><th></th></tr></thead>
            <tbody>
              {data.avanslar.length === 0 ? (
                <tr><td colSpan={5} className="empty">Kayıt yok</td></tr>
              ) : [...data.avanslar].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(a => {
                const i = data.isciler.find(x => x.id === a.isciId);
                return (
                  <tr key={a.id}>
                    <td>{fd(a.tarih)}</td>
                    <td><span style={isimStyle} onClick={() => i && setProfilId(i.id)}>{i?.isim || '?'}</span></td>
                    <td className="td-mono positive">{tl(a.tutar)}</td>
                    <td>{a.aciklama || '—'}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => avSil(a.id)}>Sil</button></td>
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