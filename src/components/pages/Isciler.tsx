'use client';
import { useState } from 'react';
import type { AppData } from '@/types';
import {
  tl, fd, today, uid, buHafta,
  isciKazancAralik, isciToplamKazanc,
  isciOdenenAralik, isciToplamOdenen,
  saveIsci, deleteIsci, saveAvans, deleteAvans,
  saveUretim, saveYukleme,
} from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';

interface IscilerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
  onIsciDetay: (isciId: number) => void;
}

export default function IscilerPage({ data, onSave, showToast, onIsciDetay }: IscilerProps) {
  const [isim, setIsim]             = useState('');
  const [tel, setTel]               = useState('');
  const [avIsci, setAvIsci]         = useState('');
  const [avTutar, setAvTutar]       = useState('');
  const [avTarih, setAvTarih]       = useState(today());
  const [avAciklama, setAvAciklama] = useState('');
  const [sonOdeme, setSonOdeme] = useState<{
    isciId: number; isciIsim: string; tutar: number; tarih: string; aciklama: string; no: string;
    haftaKazanc: number; haftaOdenenOncesi: number; tumKazanc: number; tumOdenenOncesi: number;
  } | null>(null);
  const [silOnay, setSilOnay] = useState<{
    isciId: number; isciIsim: string; uretimSayisi: number; yuklemeSayisi: number; avansSayisi: number;
  } | null>(null);

  const { bas, bit } = buHafta();

  async function isciEkle() {
    try {
      if (!isim.trim()) { showToast('İsim gerekli', false); return; }
      const yeni = { id: uid(), isim: isim.trim(), tel: tel.trim() || undefined };
      onSave({ ...data, isciler: [...data.isciler, yeni] });
      await saveIsci(yeni);
      setIsim('');
      showToast('İşçi eklendi');
    } catch {
      showToast('İşçi eklenemedi', false);
    }
  }

  function isciSilIste(id: number) {
    const isci = data.isciler.find(i => i.id === id);
    if (!isci) return;
    const uretimSayisi  = data.uretimler.filter(u => u.isciler.includes(id)).length;
    const yuklemeSayisi = data.yuklemeler.filter(y => y.isciler.includes(id)).length;
    const avansSayisi   = data.avanslar.filter(a => a.isciId === id).length;
    if (uretimSayisi > 0 || yuklemeSayisi > 0 || avansSayisi > 0) {
      setSilOnay({ isciId: id, isciIsim: isci.isim, uretimSayisi, yuklemeSayisi, avansSayisi });
    } else {
      isciSilOnayla(id);
    }
  }

  async function isciSilOnayla(id: number) {
    try {
      const yeniUretimler  = data.uretimler.map(u => u.isciler.includes(id) ? { ...u, isciler: u.isciler.filter(x => x !== id) } : u);
      const yeniYuklemeler = data.yuklemeler.map(y => y.isciler.includes(id) ? { ...y, isciler: y.isciler.filter(x => x !== id) } : y);
      const silinecekAvanslar = data.avanslar.filter(a => a.isciId === id);
      onSave({ ...data, isciler: data.isciler.filter(i => i.id !== id), avanslar: data.avanslar.filter(a => a.isciId !== id), uretimler: yeniUretimler, yuklemeler: yeniYuklemeler });
      await deleteIsci(id);
      await Promise.all(silinecekAvanslar.map(a => deleteAvans(a.id)));
      await Promise.all(yeniUretimler.filter(u => u.isciler !== data.uretimler.find(x => x.id === u.id)?.isciler).map(saveUretim));
      await Promise.all(yeniYuklemeler.filter(y => y.isciler !== data.yuklemeler.find(x => x.id === y.id)?.isciler).map(saveYukleme));
      setSilOnay(null);
      showToast('İşçi silindi');
    } catch {
      showToast('İşçi silinemedi', false);
    }
  }

  const isciKazanc = (isciId: number) => isciKazancAralik(isciId, bas, bit, data);
  const isciOdenen = (isciId: number) => isciOdenenAralik(isciId, bas, bit, data);
  function isciKalan(isciId: number) { return isciToplamKazanc(isciId, data).top - isciToplamOdenen(isciId, data); }

  function handleIsciSec(val: string) {
    setAvIsci(val); setSonOdeme(null);
    if (val) { const kalan = isciKalan(parseInt(val)); setAvTutar(kalan > 0 ? String(kalan) : ''); }
    else setAvTutar('');
  }

  async function avansKaydet() {
    try {
      const id    = parseInt(avIsci);
      const tutar = parseFloat(avTutar);
      if (!id || !tutar) { showToast('İşçi ve tutar gerekli', false); return; }
      const isci    = data.isciler.find(i => i.id === id);
      const makbuzNo = `IP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const hk = isciKazanc(id); const ho = isciOdenen(id);
      const tk = isciToplamKazanc(id, data); const to = isciToplamOdenen(id, data);
      const yeniAvans = { id: uid(), isciId: id, tutar, tarih: avTarih || today(), aciklama: avAciklama };
      onSave({ ...data, avanslar: [...data.avanslar, yeniAvans] });
      await saveAvans(yeniAvans);
      setSonOdeme({ isciId: id, isciIsim: isci?.isim || '?', tutar, tarih: avTarih || today(), aciklama: avAciklama, no: makbuzNo, haftaKazanc: hk.top, haftaOdenenOncesi: ho, tumKazanc: tk.top, tumOdenenOncesi: to });
      setAvTutar(''); setAvAciklama('');
      showToast('Ödeme kaydedildi ✓');
    } catch {
      showToast('Ödeme kaydedilemedi', false);
    }
  }

  function whatsappGonder() {
    if (!sonOdeme) return;
    const isci = data.isciler.find(i => i.id === sonOdeme.isciId);
    const tel = isci?.tel?.replace(/\D/g, '');
    if (!tel) { alert('Bu işçinin telefon numarası kayıtlı değil. İşçi listesinden ekleyin.'); return; }
    const kalanSonra = Math.max(0, sonOdeme.tumKazanc - sonOdeme.tumOdenenOncesi - sonOdeme.tutar);
    const mesaj = `İşçi Ödeme Makbuzu
---
Sayın ${sonOdeme.isciIsim},
Tarih: ${sonOdeme.tarih.split('-').reverse().join('.')}
Bu Hafta Kazanç: ${tl(sonOdeme.haftaKazanc)}
Bu Hafta Ödenen: ${tl(sonOdeme.tutar)}
Toplam Kalan Borç: ${kalanSonra > 0 ? tl(kalanSonra) : 'Yok'}
---
İdooğlu Briket`;
    const url = `https://wa.me/90${tel.startsWith('0') ? tel.slice(1) : tel}?text=${encodeURIComponent(mesaj)}`;
    window.open(url, '_blank');
  }

  function isciMakbuzAc() {
    if (!sonOdeme) return;
    const kalanSonra  = Math.max(0, sonOdeme.tumKazanc - sonOdeme.tumOdenenOncesi - sonOdeme.tutar);
    const haftaKalan  = Math.max(0, sonOdeme.haftaKazanc - sonOdeme.haftaOdenenOncesi - sonOdeme.tutar);
    makbuzIndir({
      baslik: 'İŞÇİ ÖDEME MAKBUZU', makbuzNo: sonOdeme.no, tarih: sonOdeme.tarih,
      alici: sonOdeme.isciIsim, aciklama: sonOdeme.aciklama || undefined,
      kalemler: [
        { etiket: 'Bu Hafta Toplam Kazanç', deger: tl(sonOdeme.haftaKazanc) },
        { etiket: 'Bu Hafta Önceki Ödemeler', deger: tl(sonOdeme.haftaOdenenOncesi) },
        { etiket: 'Bu Hafta Kalan (Bu Ödeme Sonrası)', deger: tl(haftaKalan) },
        { etiket: 'Tüm Zamanlar Kazanç', deger: tl(sonOdeme.tumKazanc) },
        { etiket: 'Tüm Zamanlar Ödenen', deger: tl(sonOdeme.tumOdenenOncesi) },
      ],
      odemeTutari: tl(sonOdeme.tutar),
      kalanBorc: kalanSonra > 0 ? tl(kalanSonra) : undefined,
      isletmeAdi: 'BRIKET YONETIM',
    });
  }

  async function avSil(id: number) {
    try {
      onSave({ ...data, avanslar: data.avanslar.filter(a => a.id !== id) });
      await deleteAvans(id);
    } catch {
      showToast('Ödeme silinemedi', false);
    }
  }

  const isimStyle: React.CSSProperties = { cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 };

  return (
    <div>
      {silOnay && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-title" style={{ color: 'var(--red)' }}>⚠️ İşçiyi Sil</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}><strong>{silOnay.isciIsim}</strong> adlı işçinin silinmesi halinde aşağıdaki kayıtlar etkilenecektir:</p>
            <div style={{ background: 'rgba(184,60,43,0.06)', border: '1px solid rgba(184,60,43,0.18)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {silOnay.uretimSayisi > 0 && <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>📦 Üretim: <strong style={{ color: 'var(--red)' }}>{silOnay.uretimSayisi}</strong> <span style={{ fontSize: 11, color: 'var(--text3)' }}>(kayıt silinmez, işçi çıkarılır)</span></div>}
              {silOnay.yuklemeSayisi > 0 && <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>🚛 Yükleme: <strong style={{ color: 'var(--red)' }}>{silOnay.yuklemeSayisi}</strong> <span style={{ fontSize: 11, color: 'var(--text3)' }}>(kayıt silinmez, işçi çıkarılır)</span></div>}
              {silOnay.avansSayisi > 0 && <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>💰 Ödeme: <strong style={{ color: 'var(--red)' }}>{silOnay.avansSayisi}</strong> <span style={{ fontSize: 11, color: 'var(--text3)' }}>(kalıcı olarak silinir)</span></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSilOnay(null)}>İptal</button>
              <button className="btn btn-danger" onClick={() => isciSilOnayla(silOnay.isciId)}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">İşçi Ekle</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div><label>Ad Soyad</label><input type="text" placeholder="İşçi adı" value={isim} onChange={e => setIsim(e.target.value)} onKeyDown={e => e.key === 'Enter' && isciEkle()} /></div>
              <div><label>Telefon</label><input type="tel" placeholder="05xx..." value={tel} onChange={e => setTel(e.target.value)} /></div>
            </div>
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
            {avIsci && (() => { const kalan = isciKalan(parseInt(avIsci)); return kalan > 0 ? (
              <div style={{ background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 4, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text2)' }}>
                Kalan alacak: <span style={{ color: 'var(--success)', fontWeight: 700 }}>{tl(kalan)}</span>
              </div>
            ) : null; })()}
            <div className="frow c2">
              <div><label>Tarih</label><input type="date" value={avTarih} onChange={e => setAvTarih(e.target.value)} /></div>
              <div><label>Açıklama</label><input type="text" placeholder="ör: bu haftanın ödemesi" value={avAciklama} onChange={e => setAvAciklama(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={avansKaydet}>✓ Ödeme Yap</button>
              {sonOdeme && <button className="btn btn-secondary" onClick={isciMakbuzAc}>📄 Makbuz PDF</button>}
              {sonOdeme && <button className="btn btn-success" onClick={whatsappGonder}>📱 WhatsApp</button>}
            </div>
            {sonOdeme && (
              <div style={{ marginTop: 10, background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>
                ✓ <strong>{sonOdeme.isciIsim}</strong> — {tl(sonOdeme.tutar)} ödeme yapıldı
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">İşçi Durumu (Bu Hafta)</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>{fd(bas)} — {fd(bit)}</div>
        </div>
        <div className="panel-body">
          <div className="three-col">
            {data.isciler.length === 0 ? <div className="empty" style={{ gridColumn: '1/-1' }}>İşçi eklenmemiş</div> : data.isciler.map(i => {
              const k = isciKazanc(i.id); const odened = isciOdenen(i.id); const kalan = k.top - odened;
              return (
                <div key={i.id} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onIsciDetay(i.id)}>
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

      <div className="panel">
        <div className="panel-header"><div className="panel-title">İşçi Listesi</div></div>
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Ad Soyad</th><th>Bu Hafta Kazanç</th><th>Ödenen</th><th>Kalan Alacak</th><th></th></tr></thead>
            <tbody>
              {data.isciler.length === 0 ? <tr><td colSpan={5} className="empty">İşçi yok</td></tr>
              : data.isciler.map(i => {
                const k = isciKazanc(i.id); const odened = isciOdenen(i.id); const kalan = k.top - odened;
                return (
                  <tr key={i.id}>
                    <td><span style={isimStyle} onClick={() => onIsciDetay(i.id)}>{i.isim}</span></td>
                    <td className="td-mono">{tl(k.top)}</td>
                    <td className="td-mono positive">{tl(odened)}</td>
                    <td className={`td-mono ${kalan > 0 ? 'positive' : ''}`}>{tl(kalan)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => isciSilIste(i.id)}>Sil</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Ödeme Hareketleri</div></div>
        <div className="panel-body-0">
          <table>
            <thead><tr><th>Tarih</th><th>İşçi</th><th>Tutar</th><th>Açıklama</th><th></th></tr></thead>
            <tbody>
              {data.avanslar.length === 0 ? <tr><td colSpan={5} className="empty">Kayıt yok</td></tr>
              : [...data.avanslar].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(a => {
                const i = data.isciler.find(x => x.id === a.isciId);
                return (
                  <tr key={a.id}>
                    <td>{fd(a.tarih)}</td>
                    <td><span style={isimStyle} onClick={() => i && onIsciDetay(i.id)}>{i?.isim || '?'}</span></td>
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
