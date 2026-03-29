'use client';
import { useState } from 'react';
import type { AppData, Ayarlar, Yonetici } from '@/types';

interface AyarlarProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

type Sekme = 'yonetici' | 'ucretler' | 'fiyatlar' | 'malzeme';

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
    };
    onSave({ ...data, ayarlar: yeniAyarlar });
    showToast('Ücret tarifeleri kaydedildi ✓');
  }

  // ─── Satış fiyatları formu ────────────────────────────────────────────────
  const fp = ay.fp;
  const [fpMerkez, setFpMerkez] = useState(String(fp.merkez ?? 0));
  const [fpYakin, setFpYakin] = useState(String(fp.yakin ?? 0));
  const [fpUzak, setFpUzak] = useState(String(fp.uzak ?? 0));
  const [fpYerinde, setFpYerinde] = useState(String(fp.yerinde ?? 0));
  const [fpCimento, setFpCimento] = useState(String(fp.cimento ?? 0));
  const [fpKum, setFpKum] = useState(String(fp.kum ?? 0));

  function fiyatKaydet() {
    const yeniFp = {
      merkez: parseFloat(fpMerkez) || 0,
      yakin: parseFloat(fpYakin) || 0,
      uzak: parseFloat(fpUzak) || 0,
      yerinde: parseFloat(fpYerinde) || 0,
      cimento: parseFloat(fpCimento) || 0,
      kum: parseFloat(fpKum) || 0,
    };
    onSave({ ...data, ayarlar: { ...ay, fp: yeniFp } });
    showToast('Satış fiyatları kaydedildi ✓');
  }

  // ─── Malzeme alış fiyatları formu ─────────────────────────────────────────
  const [micirFiyat, setMicirFiyat] = useState(String(ay.micirFiyat));
  const [cimentoFiyat, setCimentoFiyat] = useState(String(ay.cimentoFiyat));
  const [kumFiyat, setKumFiyat] = useState(String(ay.kumFiyat ?? 0));

  function malzemeKaydet() {
    onSave({
      ...data,
      ayarlar: {
        ...ay,
        micirFiyat: parseFloat(micirFiyat) || 0,
        cimentoFiyat: parseFloat(cimentoFiyat) || 0,
        kumFiyat: parseFloat(kumFiyat) || 0,
      },
    });
    showToast('Malzeme alış fiyatları kaydedildi ✓');
  }

  // ─── Sekme butonları ──────────────────────────────────────────────────────
  const sekmeler: { key: Sekme; label: string; icon: string }[] = [
    { key: 'yonetici', label: 'Yönetici Bilgileri', icon: '👤' },
    { key: 'ucretler', label: 'İşçi Ücret Tarifeleri', icon: '👷' },
    { key: 'fiyatlar', label: 'Satış Fiyatları', icon: '💰' },
    { key: 'malzeme', label: 'Malzeme Alış Fiyatları', icon: '🧱' },
  ];

  return (
    <div>
      {/* Sekme çubuğu */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
                <input type="text" placeholder="Örn: Ahmet" value={yon.ad} onChange={e => setYon(y => ({ ...y, ad: e.target.value }))} />
              </div>
              <div>
                <label>Soyad</label>
                <input type="text" placeholder="Örn: Yılmaz" value={yon.soyad} onChange={e => setYon(y => ({ ...y, soyad: e.target.value }))} />
              </div>
            </div>
            <div className="frow">
              <div>
                <label>Telefon</label>
                <input type="tel" placeholder="Örn: 0532 123 45 67" value={yon.tel} onChange={e => setYon(y => ({ ...y, tel: e.target.value }))} />
              </div>
            </div>
            {(yon.ad || yon.soyad || yon.tel) && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                  MAKBUZLARDA GÖRÜNECEK
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>İdooğlu Briket</div>
                {(yon.ad || yon.soyad) && (
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                    {[yon.ad, yon.soyad].filter(Boolean).join(' ')}
                  </div>
                )}
                {yon.tel && (
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{yon.tel}</div>
                )}
              </div>
            )}
            <button className="btn btn-primary" onClick={yoneticiKaydet}>✓ Kaydet</button>
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

          <button className="btn btn-primary" onClick={ucretKaydet}>✓ Ücretleri Kaydet</button>
        </div>
      )}

      {/* ── SATIŞ FİYATLARI ── */}
      {sekme === 'fiyatlar' && (
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="panel-header">
            <div className="panel-title">Satış Fiyat Tarifeleri</div>
          </div>
          <div className="panel-body">
            <div className="warn-box" style={{ marginBottom: 16 }}>
              Briket fiyatları tür fark etmeksizin konuma göre belirlenir. Spot satışta seçilen konuma göre fiyat otomatik gelir.
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
              BRİKET SATIŞ FİYATLARI (adet başı ₺)
            </div>
            <div className="frow c2" style={{ marginBottom: 20 }}>
              <div>
                <label>Yerinde (fabrikadan alıyor)</label>
                <input type="number" step="0.01" value={fpYerinde} onChange={e => setFpYerinde(e.target.value)} />
              </div>
              <div>
                <label>Merkez</label>
                <input type="number" step="0.01" value={fpMerkez} onChange={e => setFpMerkez(e.target.value)} />
              </div>
              <div>
                <label>Yakın</label>
                <input type="number" step="0.01" value={fpYakin} onChange={e => setFpYakin(e.target.value)} />
              </div>
              <div>
                <label>Uzak</label>
                <input type="number" step="0.01" value={fpUzak} onChange={e => setFpUzak(e.target.value)} />
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
              DİĞER ÜRÜN SATIŞ FİYATLARI
            </div>
            <div className="frow c2">
              <div>
                <label>Çimento (torba başı ₺)</label>
                <input type="number" step="0.01" value={fpCimento} onChange={e => setFpCimento(e.target.value)} />
              </div>
              <div>
                <label>Kum (ton başı ₺)</label>
                <input type="number" step="0.01" value={fpKum} onChange={e => setFpKum(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={fiyatKaydet}>✓ Fiyatları Kaydet</button>
          </div>
        </div>
      )}

      {/* ── MALZEME ALIŞ FİYATLARI ── */}
      {sekme === 'malzeme' && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <div className="panel-header">
            <div className="panel-title">🧱 Malzeme Alış Fiyatları</div>
          </div>
          <div className="panel-body">
            <div className="warn-box" style={{ marginBottom: 16 }}>
              Bu fiyatlar malzeme girişlerinde varsayılan olarak kullanılır.
            </div>
            <div className="frow c2">
              <div>
                <label>Mıcır Fiyatı (ton başı ₺)</label>
                <input type="number" step="0.01" value={micirFiyat} onChange={e => setMicirFiyat(e.target.value)} />
              </div>
              <div>
                <label>Çimento Fiyatı (torba başı ₺)</label>
                <input type="number" step="0.01" value={cimentoFiyat} onChange={e => setCimentoFiyat(e.target.value)} />
              </div>
              <div>
                <label>Kum Fiyatı (ton başı ₺)</label>
                <input type="number" step="0.01" value={kumFiyat} onChange={e => setKumFiyat(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={malzemeKaydet}>✓ Kaydet</button>
          </div>
        </div>
      )}
    </div>
  );
}