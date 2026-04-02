'use client';
import { useState } from 'react';
import type { AppData, GecmisBorc } from '@/types';
import { tl, fd, today, uid, musteriAlacak, SIP_CESIT_LABEL, saveMusteri, deleteMusteri, saveMusteriOdeme, deleteMusteriOdeme, saveGecmisBorc, deleteGecmisBorc } from '@/lib/storage';
import { makbuzIndir } from '@/lib/pdfMakbuz';
import MusteriSecici from '@/components/MusteriSecici';

interface MusterilerProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export default function MusterilerPage({ data, onSave, showToast }: MusterilerProps) {
  const [isim, setIsim]           = useState('');
  const [tel, setTel]             = useState('');
  const [koyAra, setKoyAra]       = useState('');
  const [koySecili, setKoySecili] = useState('');
  const [adres, setAdres]         = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [detaySec, setDetaySec]   = useState('');

  const [opMusteri, setOpMusteri]   = useState('');
  const [opTutar, setOpTutar]       = useState('');
  const [opTarih, setOpTarih]       = useState(today());
  const [opAciklama, setOpAciklama] = useState('');
  const [sonOdeme, setSonOdeme] = useState<{
    musteriId: number; musteriIsim: string; musteriTel: string;
    tutar: number; tarih: string; aciklama: string; no: string;
    toplamBorc: number;
  } | null>(null);

  // Geçmiş borç formu
  const [gbMusteri, setGbMusteri]       = useState('');
  const [gbBorc, setGbBorc]             = useState('');
  const [gbTarih, setGbTarih]           = useState('');
  const [gbKoy, setGbKoy]               = useState('');
  const [gbNot, setGbNot]               = useState('');
  const [gbBriket10, setGbBriket10]     = useState('');
  const [gbBriket15, setGbBriket15]     = useState('');
  const [gbBriket20, setGbBriket20]     = useState('');
  const [gbCimento, setGbCimento]       = useState('');
  const [gbKum, setGbKum]               = useState('');
  const [gbSeferSayisi, setGbSeferSayisi] = useState('');
  const [gbDetayAcik, setGbDetayAcik]   = useState(false);

  const [silOnay, setSilOnay] = useState<{
    musteriId: number; musteriIsim: string;
    siparisCount: number; teslimatCount: number;
    odemeCount: number; spotCount: number; toplamBorc: number;
  } | null>(null);

  // ── Yardımcılar ───────────────────────────────────────────────────────────

  function toplamSatisTutari(mid: number) {
    return data.teslimatlar.filter((t) => t.musteriId === mid).reduce((s, t) => s + t.tutar, 0)
      + data.spotSatislar.filter((s) => s.musteriId === mid).reduce((s, x) => s + x.tutar, 0)
      + (data.gecmisBorclar || []).filter((g) => g.musteriId === mid).reduce((s, g) => s + g.tutar, 0);
  }

  function toplamTahsil(mid: number) {
    return data.teslimatlar.filter((t) => t.musteriId === mid).reduce((s, t) => s + t.tahsil, 0)
      + data.musteriOdemeler.filter((o) => o.musteriId === mid).reduce((s, o) => s + o.tutar, 0)
      + data.spotSatislar.filter((s) => s.musteriId === mid).reduce((s, x) => s + x.tahsil, 0)
      + data.spotOdemeler.filter((o) => o.musteriId === mid).reduce((s, o) => s + o.tutar, 0);
  }

  function handleOpMusteriSec(val: string) {
    setOpMusteri(val);
    setSonOdeme(null);
    if (val) {
      const kalan = musteriAlacak(parseInt(val), data);
      setOpTutar(kalan > 0 ? String(kalan.toFixed(2)) : '');
    } else {
      setOpTutar('');
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function musteriEkle() {
    if (!isim.trim()) { showToast('İsim gerekli', false); return; }
    const koyObj = data.koyler.find((k) => k.isim === koySecili);
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

  function musteriSilIste(id: number) {
    const musteri = data.musteriler.find((m) => m.id === id);
    if (!musteri) return;
    const siparisCount  = data.siparisler.filter((s) => s.musteriId === id).length;
    const teslimatCount = data.teslimatlar.filter((t) => t.musteriId === id).length;
    const odemeCount    = data.musteriOdemeler.filter((o) => o.musteriId === id).length;
    const spotCount     = data.spotSatislar.filter((s) => s.musteriId === id).length;
    const toplamBorc    = musteriAlacak(id, data);

    if (siparisCount > 0 || teslimatCount > 0 || odemeCount > 0 || spotCount > 0) {
      setSilOnay({ musteriId: id, musteriIsim: musteri.isim, siparisCount, teslimatCount, odemeCount, spotCount, toplamBorc });
    } else {
      musteriSilOnayla(id);
    }
  }

  function musteriSilOnayla(id: number) {
    // Tüm ilişkili kayıtlar siliniyor (spot dahil — önceki versiyonda eksikti)
    onSave({
      ...data,
      musteriler:       data.musteriler.filter((m) => m.id !== id),
      siparisler:       data.siparisler.filter((s) => s.musteriId !== id),
      teslimatlar:      data.teslimatlar.filter((t) => t.musteriId !== id),
      musteriOdemeler:  data.musteriOdemeler.filter((o) => o.musteriId !== id),
      spotSatislar:     data.spotSatislar.filter((s) => s.musteriId !== id),
      spotOdemeler:     data.spotOdemeler.filter((o) => o.musteriId !== id),
      gecmisBorclar:    (data.gecmisBorclar || []).filter((g) => g.musteriId !== id),
    });
    setSilOnay(null);
    showToast('Müşteri silindi');
  }

  function odemeKaydet() {
    const mid   = parseInt(opMusteri);
    const tutar = parseFloat(opTutar);
    if (!mid || !tutar) { showToast('Müşteri ve tutar gerekli', false); return; }
    const musteri  = data.musteriler.find((m) => m.id === mid);
    const eskiBorc = musteriAlacak(mid, data);
    const makbuzNo = `MO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    onSave({
      ...data,
      musteriOdemeler: [...data.musteriOdemeler, {
        id: uid(), musteriId: mid, tutar, tarih: opTarih || today(), aciklama: opAciklama,
      }],
    });
    setSonOdeme({
      musteriId: mid,
      musteriIsim: musteri?.isim || '?',
      musteriTel: musteri?.tel || '',
      tutar,
      tarih: opTarih || today(),
      aciklama: opAciklama,
      no: makbuzNo,
      toplamBorc: eskiBorc,
    });
    setOpTutar(''); setOpAciklama('');
    showToast('Ödeme alındı ✓');
  }

  function musteriMakbuzAc() {
    if (!sonOdeme) return;
    const mid        = sonOdeme.musteriId;
    const kalanSonra = Math.max(0, sonOdeme.toplamBorc - sonOdeme.tutar);
    const satisTop   = toplamSatisTutari(mid);
    const tahsilTop  = toplamTahsil(mid);
    makbuzIndir({
      baslik: 'MUSTERI ODEME MAKBUZU',
      makbuzNo: sonOdeme.no,
      tarih: sonOdeme.tarih,
      alici: sonOdeme.musteriIsim,
      aliciTel: sonOdeme.musteriTel || undefined,
      aciklama: sonOdeme.aciklama || undefined,
      kalemler: [
        { etiket: 'Odeme Tarihi',         deger: sonOdeme.tarih.split('-').reverse().join('.') },
        { etiket: 'Toplam Satis Tutari',  deger: tl(satisTop) },
        { etiket: 'Buguye Kadar Odenen',  deger: tl(tahsilTop) },
        { etiket: 'Bu Odeme Oncesi Borc', deger: tl(sonOdeme.toplamBorc) },
        ...(sonOdeme.aciklama ? [{ etiket: 'Aciklama', deger: sonOdeme.aciklama }] : []),
      ],
      odemeTutari: tl(sonOdeme.tutar),
      kalanBorc: kalanSonra > 0 ? tl(kalanSonra) : undefined,
      isletmeAdi: 'BRIKET YONETIM',
    });
  }

  /**
   * Geçmiş borç — artık Teslimat'a değil GecmisBorc koleksiyonuna yazılıyor.
   */
  function gecmisBorcKaydet() {
    const mid  = parseInt(gbMusteri);
    const borc = parseFloat(gbBorc);
    if (!mid)               { showToast('Müşteri seçin', false); return; }
    if (!borc || borc <= 0) { showToast('Borç tutarı girilmeli', false); return; }

    const notParcalari: string[] = [];
    if (gbBriket10)    notParcalari.push(`10'luk briket: ${gbBriket10} adet`);
    if (gbBriket15)    notParcalari.push(`15'lik briket: ${gbBriket15} adet`);
    if (gbBriket20)    notParcalari.push(`20'lik briket: ${gbBriket20} adet`);
    if (gbCimento)     notParcalari.push(`Çimento: ${gbCimento} adet`);
    if (gbKum)         notParcalari.push(`Kum: ${gbKum} m³`);
    if (gbSeferSayisi) notParcalari.push(`Sefer: ${gbSeferSayisi}`);
    if (gbNot)         notParcalari.push(gbNot);

    const yeni: GecmisBorc = {
      id: uid(),
      musteriId: mid,
      tutar: borc,
      tarih: gbTarih || today(),
      aciklama: notParcalari.length ? notParcalari.join(' | ') : 'Geçmiş borç girişi',
      detay: gbKoy || undefined,
    };

    onSave({ ...data, gecmisBorclar: [...(data.gecmisBorclar || []), yeni] });

    setGbMusteri(''); setGbBorc(''); setGbTarih(''); setGbKoy('');
    setGbNot(''); setGbBriket10(''); setGbBriket15(''); setGbBriket20('');
    setGbCimento(''); setGbKum(''); setGbSeferSayisi('');
    setGbDetayAcik(false);
    showToast('Geçmiş borç eklendi ✓');
  }

  const filtreKoyler     = data.koyler.filter((k) => !koyAra || k.isim.toLowerCase().includes(koyAra.toLowerCase()));
  const siraliMusteriler = [...data.musteriler].sort((a, b) => musteriAlacak(b.id, data) - musteriAlacak(a.id, data));

  const detayMid     = parseInt(detaySec) || 0;
  const detayMusteri = data.musteriler.find((m) => m.id === detayMid);
  const detayTes     = data.teslimatlar.filter((t) => t.musteriId === detayMid);
  const detayGecmis  = (data.gecmisBorclar || []).filter((g) => g.musteriId === detayMid);
  const detayOde     = data.musteriOdemeler.filter((o) => o.musteriId === detayMid);
  const topTutar     = detayTes.reduce((s, t) => s + t.tutar, 0)
    + detayGecmis.reduce((s, g) => s + g.tutar, 0);
  const topTahsil    = detayTes.reduce((s, t) => s + t.tahsil, 0)
    + detayOde.reduce((s, o) => s + o.tutar, 0);
  const detayBorc    = topTutar - topTahsil;

  return (
    <div>
      {/* ── Cascade Silme Onay Modalı ── */}
      {silOnay && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-title" style={{ color: 'var(--red)' }}>⚠️ Müşteriyi Sil</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              <strong>{silOnay.musteriIsim}</strong> silinirse aşağıdaki tüm kayıtlar <strong>kalıcı olarak silinecektir:</strong>
            </p>
            <div style={{ background: 'rgba(184,60,43,0.06)', border: '1px solid rgba(184,60,43,0.18)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {silOnay.siparisCount > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                  📋 Sipariş: <strong style={{ color: 'var(--red)' }}>{silOnay.siparisCount} kayıt</strong>
                </div>
              )}
              {silOnay.teslimatCount > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                  🚛 Teslimat: <strong style={{ color: 'var(--red)' }}>{silOnay.teslimatCount} kayıt</strong>
                </div>
              )}
              {silOnay.odemeCount > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                  💰 Ödeme: <strong style={{ color: 'var(--red)' }}>{silOnay.odemeCount} kayıt</strong>
                </div>
              )}
              {silOnay.spotCount > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ⚡ Spot satış: <strong style={{ color: 'var(--red)' }}>{silOnay.spotCount} kayıt</strong>
                </div>
              )}
            </div>
            {silOnay.toplamBorc > 0 && (
              <div style={{ background: 'rgba(184,60,43,0.08)', border: '1px solid rgba(184,60,43,0.25)', borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 14, fontSize: 13, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
                ⚠️ Bu müşterinin <strong>{tl(silOnay.toplamBorc)}</strong> borcu var!
              </div>
            )}
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
              Bu işlem geri alınamaz.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSilOnay(null)}>İptal</button>
              <button className="btn btn-danger" onClick={() => musteriSilOnayla(silOnay.musteriId)}>Evet, Kalıcı Sil</button>
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* ── Müşteri ekle ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Yeni Müşteri Ekle</div></div>
          <div className="panel-body">
            <div className="frow c2">
              <div><label>Ad Soyad</label><input type="text" placeholder="Müşteri adı" value={isim} onChange={(e) => setIsim(e.target.value)} /></div>
              <div><label>Telefon</label><input type="text" placeholder="05xx..." value={tel} onChange={(e) => setTel(e.target.value)} /></div>
            </div>
            <div className="frow" style={{ position: 'relative' }}>
              <div>
                <label>Köy / Bölge</label>
                <input
                  type="text" placeholder="Arayın veya yazın..." value={koyAra}
                  onChange={(e) => { setKoyAra(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && filtreKoyler.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 100, maxHeight: 180, overflowY: 'auto' }}>
                    {filtreKoyler.map((k) => (
                      <div key={k.id}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}
                        onMouseDown={() => { setKoyAra(k.isim); setKoySecili(k.isim); setShowDropdown(false); }}>
                        {k.isim}<span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{k.bolge}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="frow">
              <div>
                <label>Adres / Not</label>
                <input type="text" placeholder="Detaylı adres..." value={adres} onChange={(e) => setAdres(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={musteriEkle}>+ Müşteri Ekle</button>
          </div>
        </div>

        {/* ── Ödeme alma ── */}
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Müşteriden Ödeme Al</div></div>
          <div className="panel-body">
            <div className="frow">
              <div>
                <label>Müşteri</label>
                <MusteriSecici musteriler={data.musteriler} value={opMusteri} onChange={handleOpMusteriSec} placeholder="— Müşteri seç —" />
              </div>
            </div>

            {opMusteri && (() => {
              const kalan = musteriAlacak(parseInt(opMusteri), data);
              return kalan > 0 ? (
                <div style={{ background: 'rgba(255,80,80,.07)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 4, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text2)' }}>
                  Mevcut borç: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{tl(kalan)}</span>
                </div>
              ) : (
                <div style={{ background: 'rgba(46,196,182,.07)', border: '1px solid rgba(46,196,182,.25)', borderRadius: 'var(--radius)', padding: '7px 12px', marginBottom: 4, fontSize: 12, color: 'var(--text2)' }}>
                  Bu müşterinin borcu yok.
                </div>
              );
            })()}

            <div className="frow c2">
              <div><label>Tutar (TL)</label><input type="number" placeholder="0.00" value={opTutar} onChange={(e) => setOpTutar(e.target.value)} /></div>
              <div><label>Tarih</label><input type="date" value={opTarih} onChange={(e) => setOpTarih(e.target.value)} /></div>
            </div>
            <div className="frow">
              <div><label>Açıklama</label><input type="text" placeholder="ör: kasım ödemesi" value={opAciklama} onChange={(e) => setOpAciklama(e.target.value)} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={odemeKaydet}>✓ Ödeme Al</button>
              {sonOdeme && (
                <button className="btn btn-secondary" onClick={musteriMakbuzAc}>
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

      {/* ══ Geçmiş Borç Girişi ══ */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">📒 Geçmiş Borç Girişi</div>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Eski defter verilerini buradan aktarın</span>
        </div>
        <div className="panel-body">
          <div className="frow c2">
            <div>
              <label>Müşteri <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span></label>
              <MusteriSecici musteriler={data.musteriler} value={gbMusteri} onChange={setGbMusteri} placeholder="— Müşteri seç —" />
            </div>
            <div>
              <label>Borç Tutarı (TL) <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span></label>
              <input type="number" step="0.01" placeholder="0.00" value={gbBorc} onChange={(e) => setGbBorc(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }} onClick={() => setGbDetayAcik((v) => !v)}>
            {gbDetayAcik ? '▾ Detayları Kapat' : '▸ Opsiyonel Detaylar Ekle'}
          </button>
          {gbDetayAcik && (
            <div style={{ background: 'rgba(0,0,0,.025)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="frow c2">
                <div><label>Tarih</label><input type="date" value={gbTarih} onChange={(e) => setGbTarih(e.target.value)} /></div>
                <div><label>Köy / Yer</label><input type="text" placeholder="Teslimat yeri..." value={gbKoy} onChange={(e) => setGbKoy(e.target.value)} /></div>
              </div>
              <div>
                <label style={{ marginBottom: 6, display: 'block', fontSize: 12, color: 'var(--text2)' }}>Ürün Miktarları</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  <div><label style={{ fontSize: 11 }}>10&apos;luk Briket</label><input type="number" placeholder="—" value={gbBriket10} onChange={(e) => setGbBriket10(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11 }}>15&apos;lik Briket</label><input type="number" placeholder="—" value={gbBriket15} onChange={(e) => setGbBriket15(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11 }}>20&apos;lik Briket</label><input type="number" placeholder="—" value={gbBriket20} onChange={(e) => setGbBriket20(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11 }}>Çimento (adet)</label><input type="number" placeholder="—" value={gbCimento} onChange={(e) => setGbCimento(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11 }}>Kum (m³)</label><input type="number" placeholder="—" value={gbKum} onChange={(e) => setGbKum(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11 }}>Sefer Sayısı</label><input type="number" placeholder="—" value={gbSeferSayisi} onChange={(e) => setGbSeferSayisi(e.target.value)} /></div>
                </div>
              </div>
              <div><label>Ek Not</label><input type="text" placeholder="Hatırladıklarınızı yazın..." value={gbNot} onChange={(e) => setGbNot(e.target.value)} /></div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={gecmisBorcKaydet}>📒 Geçmiş Borcu Kaydet</button>
            {gbMusteri && gbBorc && (
              <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {data.musteriler.find((m) => m.id === parseInt(gbMusteri))?.isim} →{' '}
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{tl(parseFloat(gbBorc) || 0)}</span> borç eklenecek
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ Müşteri Borç Tablosu ══ */}
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
              ) : siraliMusteriler.map((m) => {
                const b   = musteriAlacak(m.id, data);
                const son = [...data.teslimatlar].filter((t) => t.musteriId === m.id).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
                return (
                  <tr key={m.id}>
                    <td className="td-bold">{m.isim}</td>
                    <td>{m.tel || '—'}</td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{m.koy || '—'}</span>
                      {m.bolge && (
                        <span className={`badge ${m.bolge === 'merkez' ? 'b-blue' : m.bolge === 'yakin' ? 'b-yellow' : 'b-gray'}`} style={{ marginLeft: 4, fontSize: 9 }}>
                          {m.bolge}
                        </span>
                      )}
                    </td>
                    <td className={`td-mono ${b > 0 ? 'negative' : ''}`}>{b > 0 ? tl(b) : '—'}</td>
                    <td>{son ? fd(son.tarih) : '—'}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => setDetaySec(String(m.id))}>Detay</button></td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => musteriSilIste(m.id)}>Sil</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Müşteri Detayı ══ */}
      <div className="panel">
        <div className="panel-header" style={{ gap: 12 }}>
          <div className="panel-title">Müşteri Detayı</div>
          <div style={{ width: 260 }}>
            <MusteriSecici musteriler={data.musteriler} value={detaySec} onChange={setDetaySec} placeholder="— Müşteri seçin —" />
          </div>
        </div>
        <div className="panel-body">
          {!detayMusteri ? (
            <div className="empty">Müşteri seçin</div>
          ) : (
            <>
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-label">Toplam Satılan</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>
                    {detayTes.reduce((s, t) => s + t.adet, 0).toLocaleString('tr-TR')}
                  </div>
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
                  <div className={`stat-value ${detayBorc > 0 ? 'c-red' : 'c-green'}`} style={{ fontSize: 20 }}>
                    {tl(detayBorc)}
                  </div>
                </div>
              </div>

              {/* Teslimatlar */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Tarih</th><th>Yer</th><th>Çeşit</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th><th>Tahsil</th><th>Kalan</th></tr>
                  </thead>
                  <tbody>
                    {[...detayTes].reverse().map((t) => {
                      const k = t.tutar - t.tahsil;
                      return (
                        <tr key={t.id}>
                          <td>{fd(t.tarih)}</td>
                          <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.koy || t.bolge || '—'}</td>
                          <td><span className="badge b-yellow">{SIP_CESIT_LABEL?.[t.cesit] ?? t.cesit}</span></td>
                          <td className="td-mono">{t.adet.toLocaleString('tr-TR')}</td>
                          <td className="td-mono">{(t.birimFiyat || 0).toFixed(2)} TL</td>
                          <td className="td-mono">{tl(t.tutar)}</td>
                          <td className="td-mono positive">{tl(t.tahsil)}</td>
                          <td className={`td-mono ${k > 0 ? 'negative' : ''}`}>{tl(k)}</td>
                        </tr>
                      );
                    })}

                    {/* Geçmiş borçlar ayrı satır olarak */}
                    {detayGecmis.map((g) => (
                      <tr key={`gb-${g.id}`} style={{ background: 'rgba(255,200,0,.04)' }}>
                        <td>{fd(g.tarih)}</td>
                        <td style={{ fontSize: 11, color: 'var(--text3)' }}>{g.detay || '—'}</td>
                        <td><span className="badge b-gray">Geçmiş</span></td>
                        <td style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.aciklama}
                        </td>
                        <td className="td-mono">—</td>
                        <td className="td-mono">{tl(g.tutar)}</td>
                        <td className="td-mono positive">—</td>
                        <td className="td-mono negative">{tl(g.tutar)}</td>
                      </tr>
                    ))}

                    {detayTes.length === 0 && detayGecmis.length === 0 && (
                      <tr><td colSpan={8} className="empty">Teslimat yok</td></tr>
                    )}
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
