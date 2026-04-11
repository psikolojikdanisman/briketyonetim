'use client';
import { useState } from 'react';
import type { AppData, Ayarlar, Yonetici } from '@/types';
import { backupTarihiGuncelle, saveAyarlar, saveYonetici, topluGeriYukle } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

interface AyarlarProps {
  data: AppData;
  onSave: (data: AppData) => void;
  showToast: (msg: string, ok?: boolean) => void;
  onBackupAlindi?: () => void;
}

type Sekme = 'yonetici' | 'ucretler' | 'fiyatlar' | 'malzeme' | 'veri';

export default function AyarlarPage({ data, onSave, showToast, onBackupAlindi }: AyarlarProps) {
  const [sekme, setSekme] = useState<Sekme>('yonetici');
  const [yon, setYon] = useState<Yonetici>({ ...data.yonetici });

  async function yoneticiKaydet() {
    try {
      if (!yon.ad.trim() || !yon.soyad.trim()) { showToast('Ad ve soyad zorunludur', false); return; }
      onSave({ ...data, yonetici: { ...yon } });
      await saveYonetici(yon);
      showToast('Yönetici bilgileri kaydedildi ✓');
    } catch {
      showToast('Yönetici bilgileri kaydedilemedi', false);
    }
  }

  const ay = data.ayarlar;
  const [ucretUretim, setUcretUretim]                 = useState(String(ay.ucret20));
  const [ucret10, setUcret10]                         = useState(String(ay.ucret20));
  const [ucret15, setUcret15]                         = useState(String(ay.ucret20));
  const [ucret20, setUcret20]                         = useState(String(ay.ucret20));
  const [ucretYukleme, setUcretYukleme]               = useState(String(ay.ucretYukleme));
  const [ucretBosaltma, setUcretBosaltma]             = useState(String(ay.ucretBosaltma));
  const [ucretDama, setUcretDama]                     = useState(String(ay.ucretDama));
  const [ucretCimento, setUcretCimento]               = useState(String(ay.ucretCimento));
  const [ucretCimentoIndirme, setUcretCimentoIndirme] = useState(String(ay.ucretCimentoIndirme));

  async function ucretKaydet() {
    try {
      const yeniAyarlar: Ayarlar = { ...ay, ucret10: parseFloat(ucretUretim)||0, ucret15: parseFloat(ucretUretim)||0, ucret20: parseFloat(ucretUretim)||0, ucretYukleme: parseFloat(ucretYukleme)||0, ucretBosaltma: parseFloat(ucretBosaltma)||0, ucretDama: parseFloat(ucretDama)||0, ucretCimento: parseFloat(ucretCimento)||0, ucretCimentoIndirme: parseFloat(ucretCimentoIndirme)||0 };
      onSave({ ...data, ayarlar: yeniAyarlar });
      await saveAyarlar(yeniAyarlar);
      showToast('Ücret tarifeleri kaydedildi ✓');
    } catch {
      showToast('Ücretler kaydedilemedi', false);
    }
  }

  const fp = ay.fp;
  const [fpMerkez, setFpMerkez]   = useState(String(fp.merkez  ?? 0));
  const [fpYakin, setFpYakin]     = useState(String(fp.yakin   ?? 0));
  const [fpUzak, setFpUzak]       = useState(String(fp.uzak    ?? 0));
  const [fpYerinde, setFpYerinde] = useState(String(fp.yerinde ?? 0));
  const [fpCimento, setFpCimento] = useState(String(fp.cimento ?? 0));
  const [fpKum, setFpKum]         = useState(String(fp.kum     ?? 0));

  async function fiyatKaydet() {
    try {
      const yeniAyarlar: Ayarlar = { ...ay, fp: { merkez: parseFloat(fpMerkez)||0, yakin: parseFloat(fpYakin)||0, uzak: parseFloat(fpUzak)||0, yerinde: parseFloat(fpYerinde)||0, cimento: parseFloat(fpCimento)||0, kum: parseFloat(fpKum)||0 } };
      onSave({ ...data, ayarlar: yeniAyarlar });
      await saveAyarlar(yeniAyarlar);
      showToast('Satış fiyatları kaydedildi ✓');
    } catch {
      showToast('Fiyatlar kaydedilemedi', false);
    }
  }

  const [micirFiyat, setMicirFiyat]     = useState(String(ay.micirFiyat));
  const [cimentoFiyat, setCimentoFiyat] = useState(String(ay.cimentoFiyat));
  const [kumFiyat, setKumFiyat]         = useState(String(ay.kumFiyat ?? 0));

  async function malzemeKaydet() {
    try {
      const yeniAyarlar: Ayarlar = { ...ay, micirFiyat: parseFloat(micirFiyat)||0, cimentoFiyat: parseFloat(cimentoFiyat)||0, kumFiyat: parseFloat(kumFiyat)||0 };
      onSave({ ...data, ayarlar: yeniAyarlar });
      await saveAyarlar(yeniAyarlar);
      showToast('Malzeme alış fiyatları kaydedildi ✓');
    } catch {
      showToast('Fiyatlar kaydedilemedi', false);
    }
  }

  function jsonYedekAl() {
    try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `briket-yedek-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    backupTarihiGuncelle(); onBackupAlindi?.();
    showToast('Yedek alındı ✓');
    } catch { showToast('Yedek alınamadı', false); }
  }

  function jsonGeriYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.ayarlar || !parsed.isciler) throw new Error('Geçersiz yedek dosyası');
        onSave(parsed);
        await topluGeriYukle(parsed);
        showToast('Veri geri yüklendi ve Supabase\'e yazıldı ✓');
      } catch {
        showToast('Yedek dosyası hatalı veya yazılamadı', false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function tumVeriSil() {
    if (!confirm('TÜM VERİ SİLİNECEK. Bu işlem geri alınamaz. Emin misiniz?')) return;
    if (!confirm('Son kez onay: Tüm kayıtlar, müşteriler, işçiler silinecek. Devam?')) return;
    try {
      const tablolar = [
        'uretimler', 'yuklemeler', 'avanslar', 'kapali_haftalar',
        'siparisler', 'teslimatlar', 'gecmis_borclar', 'musteri_odemeler',
        'musteriler', 'malzemeler', 'tedarik_odemeler', 'tedarikci_listesi',
        'koyler', 'spot_satislar', 'spot_odemeler', 'giderler', 'isciler',
      ];
      await Promise.all(tablolar.map(t => supabase.from(t).delete().neq('id', -999999)));
      localStorage.removeItem('byk_v3');
      window.location.reload();
    } catch {
      showToast('Veriler silinemedi, tekrar deneyin', false);
    }
  }

  const sekmeler: { key: Sekme; label: string; icon: string }[] = [
    { key: 'yonetici', label: 'Yönetici Bilgileri',    icon: '👤' },
    { key: 'ucretler', label: 'İşçi Ücret Tarifeleri', icon: '👷' },
    { key: 'fiyatlar', label: 'Satış Fiyatları',       icon: '💰' },
    { key: 'malzeme',  label: 'Malzeme Alış Fiyatları', icon: '🧱' },
    { key: 'veri',     label: 'Yedek / Veri',           icon: '💾' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {sekmeler.map(s => (
          <button key={s.key} className={`btn ${sekme === s.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSekme(s.key)}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {sekme === 'yonetici' && (
        <div className="panel" style={{ maxWidth: 520 }}>
          <div className="panel-header"><div className="panel-title">👤 Yönetici Bilgileri</div></div>
          <div className="panel-body">
            <div className="warn-box" style={{ marginBottom: 16 }}>Bu bilgiler makbuzlarda otomatik olarak kullanılır.</div>
            <div className="frow c2">
              <div><label>Ad</label><input type="text" placeholder="Örn: Ahmet" value={yon.ad} onChange={e => setYon(y => ({ ...y, ad: e.target.value }))} /></div>
              <div><label>Soyad</label><input type="text" placeholder="Örn: Yılmaz" value={yon.soyad} onChange={e => setYon(y => ({ ...y, soyad: e.target.value }))} /></div>
            </div>
            <div className="frow"><div><label>Telefon</label><input type="tel" placeholder="Örn: 0532 123 45 67" value={yon.tel} onChange={e => setYon(y => ({ ...y, tel: e.target.value }))} /></div></div>
            <button className="btn btn-primary" onClick={yoneticiKaydet}>✓ Kaydet</button>
          </div>
        </div>
      )}

      {sekme === 'ucretler' && (
        <div>
          <div className="panel" style={{ maxWidth: 560 }}>
            <div className="panel-header"><div className="panel-title">Üretim Ücretleri (adet başı ₺)</div></div>
            <div className="panel-body">
              <div className="frow">
                <div><label>Adet Başı Ücret (TL)</label><input type="number" step="0.01" value={ucretUretim} onChange={e => setUcretUretim(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="panel" style={{ maxWidth: 560 }}>
            <div className="panel-header"><div className="panel-title">Yükleme / Boşaltma Ücretleri (adet başı ₺)</div></div>
            <div className="panel-body">
              <div className="frow c2">
                <div><label>Yükleme</label><input type="number" step="0.01" value={ucretYukleme} onChange={e => setUcretYukleme(e.target.value)} /></div>
                <div><label>Boşaltma</label><input type="number" step="0.01" value={ucretBosaltma} onChange={e => setUcretBosaltma(e.target.value)} /></div>
                <div><label>Dama Boşaltma</label><input type="number" step="0.01" value={ucretDama} onChange={e => setUcretDama(e.target.value)} /></div>
                <div><label>Çimento Yükleme</label><input type="number" step="0.01" value={ucretCimento} onChange={e => setUcretCimento(e.target.value)} /></div>
                <div><label>Çimento İndirme</label><input type="number" step="0.01" value={ucretCimentoIndirme} onChange={e => setUcretCimentoIndirme(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={ucretKaydet}>✓ Ücretleri Kaydet</button>
        </div>
      )}

      {sekme === 'fiyatlar' && (
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="panel-header"><div className="panel-title">Satış Fiyat Tarifeleri</div></div>
          <div className="panel-body">
            <div className="warn-box" style={{ marginBottom: 16 }}>Briket fiyatları tür fark etmeksizin konuma göre belirlenir.</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>BRİKET SATIŞ FİYATLARI (adet başı ₺)</div>
            <div className="frow c2" style={{ marginBottom: 20 }}>
              <div><label>Yerinde (fabrikadan alıyor)</label><input type="number" step="0.01" value={fpYerinde} onChange={e => setFpYerinde(e.target.value)} /></div>
              <div><label>Merkez</label><input type="number" step="0.01" value={fpMerkez} onChange={e => setFpMerkez(e.target.value)} /></div>
              <div><label>Yakın</label><input type="number" step="0.01" value={fpYakin} onChange={e => setFpYakin(e.target.value)} /></div>
              <div><label>Uzak</label><input type="number" step="0.01" value={fpUzak} onChange={e => setFpUzak(e.target.value)} /></div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>DİĞER ÜRÜN SATIŞ FİYATLARI</div>
            <div className="frow c2">
              <div><label>Çimento (torba başı ₺)</label><input type="number" step="0.01" value={fpCimento} onChange={e => setFpCimento(e.target.value)} /></div>
              <div><label>Kum (ton başı ₺)</label><input type="number" step="0.01" value={fpKum} onChange={e => setFpKum(e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={fiyatKaydet}>✓ Fiyatları Kaydet</button>
          </div>
        </div>
      )}

      {sekme === 'malzeme' && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <div className="panel-header"><div className="panel-title">🧱 Malzeme Alış Fiyatları</div></div>
          <div className="panel-body">
            <div className="warn-box" style={{ marginBottom: 16 }}>Bu fiyatlar malzeme girişlerinde varsayılan olarak kullanılır.</div>
            <div className="frow c2">
              <div><label>Mıcır Fiyatı (ton başı ₺)</label><input type="number" step="0.01" value={micirFiyat} onChange={e => setMicirFiyat(e.target.value)} /></div>
              <div><label>Çimento Fiyatı (torba başı ₺)</label><input type="number" step="0.01" value={cimentoFiyat} onChange={e => setCimentoFiyat(e.target.value)} /></div>
              <div><label>Kum Fiyatı (ton başı ₺)</label><input type="number" step="0.01" value={kumFiyat} onChange={e => setKumFiyat(e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={malzemeKaydet}>✓ Kaydet</button>
          </div>
        </div>
      )}

      {sekme === 'veri' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
          <div className="panel">
            <div className="panel-header"><div className="panel-title">💾 JSON Yedek Al</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>Tüm verilerinizi JSON formatında indirin.</p>
              <button className="btn btn-primary" onClick={jsonYedekAl}>⬇ Yedek İndir (JSON)</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><div className="panel-title">📂 Yedekten Geri Yükle</div></div>
            <div className="panel-body">
              <div className="warn-box" style={{ marginBottom: 14 }}>⚠️ Bu işlem mevcut tüm verilerin üzerine yazar!</div>
              <label style={{ textTransform: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer' }}>
                <input type="file" accept=".json" onChange={jsonGeriYukle} style={{ display: 'none' }} />
                <span className="btn btn-secondary">📂 JSON Dosyası Seç</span>
              </label>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><div className="panel-title" style={{ color: 'var(--red)' }}>🗑 Tüm Veriyi Sil</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>Dikkat: Bu işlem geri alınamaz.</p>
              <button className="btn btn-danger" onClick={tumVeriSil}>⚠ Tüm Veriyi Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
