'use client';
import { useState } from 'react';
import type { AppData, Ayarlar, Yonetici } from '@/types';

interface AyarlarProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

type Sekme = 'yonetici' | 'ucretler' | 'fiyatlar';

export default function AyarlarPage({ data, onSave, showToast }: AyarlarProps) {
  const [sekme, setSekme] = useState<Sekme>('yonetici');

  // ─── Yönetici formu ───────────────────────────────────────────────────────
  const [yon, setYon] = useState<Yonetici>({ ...data.yonetici });

  function yoneticiKaydet() {
    if (!yon.ad.trim() || !yon.soyad.trim()) {
      showToast('Ad ve soyad zorunludur', false);
      return;
    }
    onSave({ ...data, yonetici: { ...yon } });
    showToast('Yönetici bilgileri kaydedildi ✓');
  }

  // ─── Ücret tarifeleri formu ───────────────────────────────────────────────
  const ay = data.ayarlar;
  const [ucret10, setUcret10] = useState(String(ay.ucret10));
  const [ucret15, setUcret15] = useState(String(ay.ucret15));
  const [ucret20, setUcret20] = useState(String(ay.ucret20));
  const [ucretYukleme, setUcretYukleme] = useState(String(ay.ucretYukleme));
  const [ucretBosaltma, setUcretBosaltma] = useState(String(ay.ucretBosaltma));
  const [ucretDama, setUcretDama] = useState(String(ay.ucretDama));
  const [ucretCimento, setUcretCimento] = useState(String(ay.ucretCimento));
  const [ucretCimentoIndirme, setUcretCimentoIndirme] = useState(String(ay.ucretCimentoIndirme));
  const [micirFiyat, setMicirFiyat] = useState(String(ay.micirFiyat));
  const [cimentoFiyat, setCimentoFiyat] = useState(String(ay.cimentoFiyat));

  function ucretKaydet() {
    const yeniAyarlar: Ayarlar = {
      ...ay,
      ucret10: parseFloat(ucret10) || 0,
      ucret15: parseFloat(ucret15) || 0,
      ucret20: parseFloat(ucret20) || 0,
      ucretYukleme: parseFloat(ucretYukleme) || 0,
      ucretBosaltma: parseFloat(ucretBosaltma) || 0,
      ucretDama: parseFloat(ucretDama) || 0,
      ucretCimento: parseFloat(ucretCimento) || 0,
      ucretCimentoIndirme: parseFloat(ucretCimentoIndirme) || 0,
      micirFiyat: parseFloat(micirFiyat) || 0,
      cimentoFiyat: parseFloat(cimentoFiyat) || 0,
    };
    onSave({ ...data, ayarlar: yeniAyarlar });
    showToast('Ücret tarifeleri kaydedildi ✓');
  }

  // ─── Satış fiyatları formu ────────────────────────────────────────────────
  const fp = ay.fp;
  const [fp10m, setFp10m] = useState(String(fp['10luk'].merkez));
  const [fp10y, setFp10y] = useState(String(fp['10luk'].yakin));
  const [fp15m, setFp15m] = useState(String(fp['15lik'].merkez));
  const [fp15y, setFp15y] = useState(String(fp['15lik'].yakin));
  const [fp20m, setFp20m] = useState(String(fp['20lik'].merkez));
  const [fp20y, setFp20y] = useState(String(fp['20lik'].yakin));

  function fiyatKaydet() {
    const yeniFp = {
      '10luk': { merkez: parseFloat(fp10m) || 0, yakin: parseFloat(fp10y) || 0 },
      '15lik': { merkez: parseFloat(fp15m) || 0, yakin: parseFloat(fp15y) || 0 },
      '20lik': { merkez: parseFloat(fp20m) || 0, yakin: parseFloat(fp20y) || 0 },
    };
    onSave({ ...data, ayarlar: { ...ay, fp: yeniFp } });
    showToast('Satış fiyatları kaydedildi ✓');
  }

  // ─── Sekme butonları ──────────────────────────────────────────────────────
  const sekmeler: { key: Sekme; label: string; icon: string }[] = [
    { key: 'yonetici', label: 'Yönetici Bilgileri', icon: '👤' },
    { key: 'ucretler', label: 'İşçi Ücret Tarifeleri', icon: '👷' },
    { key: 'fiyatlar', label: 'Satış Fiyatları', icon: '💰' },
  ];

  return (
    <div>
      {/* Sekme çubuğu */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {sekmeler.map(s => (
          <button
            key={s.key}
            className={`btn ${sekme === s.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSekme(s.key)}
            style={{ gap: 6 }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* ── YÖNETİCİ BİLGİLERİ ── */}
      {sekme === 'yonetici' && (
        <div className="panel" style={{ maxWidth: 520 }}>
          <div className="panel-header">
            <div className="panel-title">👤 Yönetici Bilgileri</div>
          </div>
          <div className="panel-body">
            <div className="warn-box" style={{ marginBottom: 16 }}>
              Bu bilgiler makbuzlarda otomatik olarak kullanılır.
            </div>

            <div className="frow c2">
              <div>
                <label>Ad</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet"
                  value={yon.ad}
                  onChange={e => setYon(y => ({ ...y, ad: e.target.value }))}
                />
              </div>
              <div>
                <label>Soyad</label>
                <input
                  type="text"
                  placeholder="Örn: Yılmaz"
                  value={yon.soyad}
                  onChange={e => setYon(y => ({ ...y, soyad: e.target.value }))}
                />
              </div>
            </div>

            <div className="frow">
              <div>
                <label>Telefon</label>
                <input
                  type="tel"
                  placeholder="Örn: 0532 123 45 67"
                  value={yon.tel}
                  onChange={e => setYon(y => ({ ...y, tel: e.target.value }))}
                />
              </div>
            </div>

            {/* Önizleme */}
            {(yon.ad || yon.soyad || yon.tel) && (
              <div style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                marginBottom: 16,
                fontSize: 13,
              }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                  MAKBUZLARDA GÖRÜNECEK
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  İdooğlu Briket
                </div>
                {(yon.ad || yon.soyad) && (
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                    {[yon.ad, yon.soyad].filter(Boolean).join(' ')}
                  </div>
                )}
                {yon.tel && (
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                    {yon.tel}
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-primary" onClick={yoneticiKaydet}>
              ✓ Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ── İŞÇİ ÜCRET TARİFELERİ ── */}
      {sekme === 'ucretler' && (
        <div>
          <div className="panel" style={{ maxWidth: 560 }}>
            <div className="panel-header">
              <div className="panel-title">Üretim Ücretleri (adet başı ₺)</div>
            </div>
            <div className="panel-body">
              <div className="frow c3">
                <div>
                  <label>10&apos;luk Briket</label>
                  <input type="number" step="0.01" value={ucret10} onChange={e => setUcret10(e.target.value)} />
                </div>
                <div>
                  <label>15&apos;lik Briket</label>
                  <input type="number" step="0.01" value={ucret15} onChange={e => setUcret15(e.target.value)} />
                </div>
                <div>
                  <label>20&apos;lik Briket</label>
                  <input type="number" step="0.01" value={ucret20} onChange={e => setUcret20(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ maxWidth: 560 }}>
            <div className="panel-header">
              <div className="panel-title">Yükleme / Boşaltma Ücretleri (adet başı ₺)</div>
            </div>
            <div className="panel-body">
              <div className="frow c2">
                <div>
                  <label>Yükleme</label>
                  <input type="number" step="0.01" value={ucretYukleme} onChange={e => setUcretYukleme(e.target.value)} />
                </div>
                <div>
                  <label>Boşaltma</label>
                  <input type="number" step="0.01" value={ucretBosaltma} onChange={e => setUcretBosaltma(e.target.value)} />
                </div>
                <div>
                  <label>Dama Boşaltma</label>
                  <input type="number" step="0.01" value={ucretDama} onChange={e => setUcretDama(e.target.value)} />
                </div>
                <div>
                  <label>Çimento Yükleme</label>
                  <input type="number" step="0.01" value={ucretCimento} onChange={e => setUcretCimento(e.target.value)} />
                </div>
                <div>
                  <label>Çimento İndirme</label>
                  <input type="number" step="0.01" value={ucretCimentoIndirme} onChange={e => setUcretCimentoIndirme(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ maxWidth: 560 }}>
            <div className="panel-header">
              <div className="panel-title">Malzeme Alış Fiyatları (ton başı ₺)</div>
            </div>
            <div className="panel-body">
              <div className="frow c2">
                <div>
                  <label>Mıcır Fiyatı</label>
                  <input type="number" step="0.01" value={micirFiyat} onChange={e => setMicirFiyat(e.target.value)} />
                </div>
                <div>
                  <label>Çimento Fiyatı (torba)</label>
                  <input type="number" step="0.01" value={cimentoFiyat} onChange={e => setCimentoFiyat(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={ucretKaydet}>✓ Ücretleri Kaydet</button>
        </div>
      )}

      {/* ── SATIŞ FİYATLARI ── */}
      {sekme === 'fiyatlar' && (
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="panel-header">
            <div className="panel-title">Satış Fiyat Tarifeleri (adet başı ₺)</div>
          </div>
          <div className="panel-body">
            <div className="warn-box">
              Merkez: yakın mesafe köyler · Yakın: orta mesafe köyler
            </div>

            {(['10luk', '15lik', '20lik'] as const).map(cesit => {
              const labels: Record<string, string> = { '10luk': "10'luk", '15lik': "15'lik", '20lik': "20'lik" };
              const vals = {
                '10luk': { m: fp10m, setM: setFp10m, y: fp10y, setY: setFp10y },
                '15lik': { m: fp15m, setM: setFp15m, y: fp15y, setY: setFp15y },
                '20lik': { m: fp20m, setM: setFp20m, y: fp20y, setY: setFp20y },
              }[cesit];
              return (
                <div key={cesit} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                    Briket {labels[cesit]}
                  </div>
                  <div className="frow c2" style={{ marginBottom: 0 }}>
                    <div>
                      <label>Merkez</label>
                      <input type="number" step="0.01" value={vals.m} onChange={e => vals.setM(e.target.value)} />
                    </div>
                    <div>
                      <label>Yakın</label>
                      <input type="number" step="0.01" value={vals.y} onChange={e => vals.setY(e.target.value)} />
                    </div>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-primary" onClick={fiyatKaydet}>✓ Fiyatları Kaydet</button>
          </div>
        </div>
      )}
    </div>
  );
}