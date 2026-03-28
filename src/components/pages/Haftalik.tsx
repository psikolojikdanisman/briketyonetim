'use client';
import { useState } from 'react';
import type { AppData } from '@/types';
import { tl, fd, today, uid, buHafta } from '@/lib/storage';

interface HaftalikProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export default function HaftalikPage({ data, onSave, showToast }: HaftalikProps) {
  const { bas: haftaBas, bit: haftaBit } = buHafta();
  const [bas, setBas] = useState(haftaBas);
  const [bit, setBit] = useState(haftaBit);
  const [hesaplandi, setHesaplandi] = useState(false);

  function hesapla() {
    if (!bas || !bit) { showToast('Tarih aralığı seçin', false); return; }
    setHesaplandi(true);
  }

  function haftayiKapat() {
    if (!bas || !bit) { showToast('Tarih aralığı seçin', false); return; }
    const tU = data.uretimler.filter(u => u.tarih >= bas && u.tarih <= bit).reduce((s, u) => s + u.miktar, 0);
    const tY = data.yuklemeler.filter(y => y.tarih >= bas && y.tarih <= bit).length;
    const yeni = { id: uid(), bas, bit, topUretim: tU, topYukleme: tY, isciSayisi: data.isciler.length, kapatma: today() };
    onSave({ ...data, kapaliHaftalar: [...data.kapaliHaftalar, yeni] });
    showToast('Hafta kapatıldı ✓');
  }

  function kapaliSil(id: number) {
    onSave({ ...data, kapaliHaftalar: data.kapaliHaftalar.filter(h => h.id !== id) });
  }

  // Hesaplama satırları
  const rows = data.isciler.map(i => {
    const ureKazanc = data.uretimler
      .filter(u => u.tarih >= bas && u.tarih <= bit && u.isciler.includes(i.id))
      .reduce((s, u) => s + u.kisiBasiUcret, 0);
    const yukKazanc = data.yuklemeler
      .filter(y => y.tarih >= bas && y.tarih <= bit && y.isciler.includes(i.id))
      .reduce((s, y) => s + y.kisiBasiUcret, 0);
    const toplam = ureKazanc + yukKazanc;
    const odenen = data.avanslar
      .filter(a => a.isciId === i.id && a.tarih >= bas && a.tarih <= bit)
      .reduce((s, a) => s + a.tutar, 0);
    const kalan = toplam - odenen;
    return { i, ureKazanc, yukKazanc, toplam, odenen, kalan };
  });

  const topUretim = data.uretimler.filter(u => u.tarih >= bas && u.tarih <= bit).reduce((s, u) => s + u.miktar, 0);

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Haftalık Ücret Hesabı</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={bas} onChange={e => setBas(e.target.value)} style={{ width: 135 }} />
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
            <input type="date" value={bit} onChange={e => setBit(e.target.value)} style={{ width: 135 }} />
            <button className="btn btn-primary btn-sm" onClick={hesapla}>Hesapla</button>
            <button className="btn btn-secondary btn-sm" onClick={haftayiKapat}>Haftayı Kapat ✓</button>
          </div>
        </div>
        <div className="panel-body">
          {!hesaplandi ? (
            <div className="empty">Tarih aralığı seçip Hesapla&apos;ya basın</div>
          ) : rows.length === 0 ? (
            <div className="empty">Bu aralıkta işçi kaydı yok</div>
          ) : (
            <>
              <div className="haftalik-wrap">
                <table className="haftalik-table">
                  <thead>
                    <tr>
                      <th>İşçi</th>
                      <th>Üretimden</th>
                      <th>Yüklemeden</th>
                      <th>Toplam Kazanç</th>
                      <th>Ödenen</th>
                      <th>Kalan Alacak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.i.id}>
                        <td className="isci-col">{r.i.isim}</td>
                        <td className="td-mono">{tl(r.ureKazanc)}</td>
                        <td className="td-mono">{tl(r.yukKazanc)}</td>
                        <td className="td-mono total-col">{tl(r.toplam)}</td>
                        <td className="td-mono positive">{tl(r.odenen)}</td>
                        <td className={`td-mono total-col ${r.kalan >= 0 ? 'positive' : 'negative'}`}>{tl(r.kalan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono, monospace' }}>
                Dönem: {fd(bas)} — {fd(bit)} &nbsp;|&nbsp; Toplam üretim: {topUretim.toLocaleString('tr-TR')} adet
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kapalı haftalar */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Kapalı Haftalar</div></div>
        <div className="panel-body-0">
          <table>
            <thead>
              <tr><th>Dönem</th><th>Toplam Üretim</th><th>Yükleme İşlemi</th><th>İşçi Sayısı</th><th>Kapanış</th><th></th></tr>
            </thead>
            <tbody>
              {data.kapaliHaftalar.length === 0 ? (
                <tr><td colSpan={6} className="empty">Kayıt yok</td></tr>
              ) : (
                [...data.kapaliHaftalar].reverse().map(h => (
                  <tr key={h.id}>
                    <td>{fd(h.bas)} — {fd(h.bit)}</td>
                    <td className="td-mono">{(h.topUretim || 0).toLocaleString('tr-TR')} adet</td>
                    <td className="td-mono">{h.topYukleme} işlem</td>
                    <td>{h.isciSayisi} kişi</td>
                    <td>{fd(h.kapatma)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => kapaliSil(h.id)}>Sil</button></td>
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
