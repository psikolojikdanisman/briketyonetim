'use client';
import { useState, useEffect } from 'react';
import type { AppData } from '@/types';

interface AyarlarProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export default function AyarlarPage({ data, onSave, showToast }: AyarlarProps) {
  const a = data.ayarlar;
  const [u10, setU10] = useState(String(a.ucret10 || ''));
  const [u15, setU15] = useState(String(a.ucret15 || ''));
  const [u20, setU20] = useState(String(a.ucret20 || ''));
  const [uYuk, setUYuk] = useState(String(a.ucretYukleme || ''));
  const [uBos, setUBos] = useState(String(a.ucretBosaltma || ''));
  const [uDama, setUDama] = useState(String(a.ucretDama || ''));
  const [uCim, setUCim] = useState(String(a.ucretCimento || ''));
  const [uCimInd, setUCimInd] = useState(String(a.ucretCimentoIndirme || ''));
  const [micirFiyat, setMicirFiyat] = useState(String(a.micirFiyat || ''));
  const [cimentoFiyat, setCimentoFiyat] = useState(String(a.cimentoFiyat || ''));
  const fp = a.fp || { '10luk': { merkez: 0, yakin: 0 }, '15lik': { merkez: 0, yakin: 0 }, '20lik': { merkez: 0, yakin: 0 } };
  const [fp10m, setFp10m] = useState(String(fp['10luk']?.merkez || ''));
  const [fp10y, setFp10y] = useState(String(fp['10luk']?.yakin || ''));
  const [fp15m, setFp15m] = useState(String(fp['15lik']?.merkez || ''));
  const [fp15y, setFp15y] = useState(String(fp['15lik']?.yakin || ''));
  const [fp20m, setFp20m] = useState(String(fp['20lik']?.merkez || ''));
  const [fp20y, setFp20y] = useState(String(fp['20lik']?.yakin || ''));

  function kaydet() {
    const g = (v: string) => parseFloat(v) || 0;
    const newData = {
      ...data,
      ayarlar: {
        ucret10: g(u10), ucret15: g(u15), ucret20: g(u20),
        ucretYukleme: g(uYuk), ucretBosaltma: g(uBos), ucretDama: g(uDama),
        ucretCimento: g(uCim), ucretCimentoIndirme: g(uCimInd),
        micirFiyat: g(micirFiyat), cimentoFiyat: g(cimentoFiyat),
        fp: {
          '10luk': { merkez: g(fp10m), yakin: g(fp10y) },
          '15lik': { merkez: g(fp15m), yakin: g(fp15y) },
          '20lik': { merkez: g(fp20m), yakin: g(fp20y) },
        },
      },
    };
    onSave(newData);
    showToast('Ayarlar kaydedildi ✓');
  }

  const inp = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div>
      <label>{label}</label>
      <input type="number" step="0.001" placeholder={placeholder || 'ör: 0.00'} value={value}
        onChange={e => onChange(e.target.value)} />
    </div>
  );

  return (
    <div>
      <div className="warn-box">
        ⚠ Bu sayfadaki değerler tüm ücret hesaplamalarında kullanılır. Değiştirdiğinizde eski kayıtlar etkilenmez — yeni girişler için geçerli olur.
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Üretim — İşçi Birim Ücretleri</div></div>
          <div className="panel-body">
            <div className="frow c3">
              {inp("10'LUK (TL/adet)", u10, setU10, 'ör: 0.12')}
              {inp("15'LİK (TL/adet)", u15, setU15, 'ör: 0.15')}
              {inp("20'LİK (TL/adet)", u20, setU20, 'ör: 0.18')}
            </div>
            <div className="field-hint">Örnek: 3000 adet × 0.12 TL = 360 TL toplam → 3 işçiye = 120 TL / kişi</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">Yükleme / Boşaltma Birim Ücretleri</div></div>
          <div className="panel-body">
            <div className="frow c2">
              {inp('BRİKET YÜKLEME (TL/adet)', uYuk, setUYuk, 'ör: 0.05')}
              {inp('BRİKET BOŞALTMA (TL/adet)', uBos, setUBos, 'ör: 0.05')}
            </div>
            <div className="frow c2">
              {inp('DAMA BOŞALTMA (TL/adet)', uDama, setUDama, 'ör: 0.07')}
            </div>
            <div className="frow c2">
              {inp('ÇİMENTO YÜKLEME (TL/torba)', uCim, setUCim, 'ör: 0.30')}
              {inp('ÇİMENTO İNDİRME (TL/torba)', uCimInd, setUCimInd, 'ör: 0.30')}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Briket Satış Fiyatları (Bölgeye Göre)</div></div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <div></div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--blue)', textAlign: 'center' }}>📍 MERKEZ</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--accent)', textAlign: 'center' }}>🌿 YAKIN KÖY</div>
          </div>
          {[
            ["10'luk", fp10m, setFp10m, fp10y, setFp10y],
            ["15'lik", fp15m, setFp15m, fp15y, setFp15y],
            ["20'lik", fp20m, setFp20m, fp20y, setFp20y],
          ].map(([label, vm, setM, vy, setY]) => (
            <div key={label as string} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{label as string}</div>
              <input type="number" step="0.01" placeholder="TL/adet" value={vm as string} onChange={e => (setM as (v: string) => void)(e.target.value)} />
              <input type="number" step="0.01" placeholder="TL/adet" value={vy as string} onChange={e => (setY as (v: string) => void)(e.target.value)} />
            </div>
          ))}
          <div className="field-hint" style={{ marginTop: 10 }}>Uzak köy fiyatı sipariş sırasında manuel girilir — mesafeye göre değişir</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Malzeme Alış Fiyatları</div></div>
        <div className="panel-body">
          <div className="frow c3">
            {inp('MICI​R BİRİM FİYATI (TL/ton)', micirFiyat, setMicirFiyat, 'ör: 450.00')}
            {inp('ÇİMENTO BİRİM FİYATI (TL/torba)', cimentoFiyat, setCimentoFiyat, 'ör: 35.00')}
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={kaydet}>✦ Ayarları Kaydet</button>
    </div>
  );
}
