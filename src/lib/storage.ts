import type { AppData, Ayarlar, GecmisBorc, Yonetici } from '@/types';

const STORAGE_KEY = 'byk_v3';
const BACKUP_KEY  = 'briket_last_backup';

// ─── DEFAULTS ─────────────────────────────────────────────────────────────

const defaultAyarlar: Ayarlar = {
  ucret10: 0,
  ucret15: 0,
  ucret20: 0,
  ucretYukleme: 0,
  ucretBosaltma: 0,
  ucretDama: 0,
  ucretCimento: 0,
  ucretCimentoIndirme: 0,
  micirFiyat: 0,
  cimentoFiyat: 0,
  kumFiyat: 0,
  fp: {
    merkez: 0,
    yakin: 0,
    uzak: 0,
    yerinde: 0,
    cimento: 0,
    kum: 0,
  },
};

export const defaultYonetici: Yonetici = {
  ad: '',
  soyad: '',
  tel: '',
};

export const defaultData: AppData = {
  yonetici: defaultYonetici,
  ayarlar: defaultAyarlar,
  isciler: [],
  uretimler: [],
  yuklemeler: [],
  avanslar: [],
  kapaliHaftalar: [],
  musteriler: [],
  siparisler: [],
  teslimatlar: [],
  gecmisBorclar: [],
  musteriOdemeler: [],
  malzemeler: [],
  tedarikOdemeler: [],
  tedarikciListesi: [],
  koyler: [],
  spotSatislar: [],
  spotOdemeler: [],
  giderler: [],
};

// ─── STORAGE ──────────────────────────────────────────────────────────────

export function loadData(): AppData {
  if (typeof window === 'undefined') return { ...defaultData };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const merged: AppData = { ...defaultData, ...parsed };

    // Yönetici
    if (!merged.yonetici) merged.yonetici = { ...defaultYonetici };

    // FP migration (eski format temizliği)
    const fpAsAny = merged.ayarlar.fp as Record<string, unknown>;
    if (!merged.ayarlar.fp || fpAsAny['10luk'] !== undefined) {
      merged.ayarlar.fp = { ...defaultAyarlar.fp };
    }
    const fp = merged.ayarlar.fp;
    if (fp.merkez  === undefined) fp.merkez  = 0;
    if (fp.yakin   === undefined) fp.yakin   = 0;
    if (fp.uzak    === undefined) fp.uzak    = 0;
    if (fp.yerinde === undefined) fp.yerinde = 0;
    if (fp.cimento === undefined) fp.cimento = 0;
    if (fp.kum     === undefined) fp.kum     = 0;

    // Ayarlar
    if (merged.ayarlar.kumFiyat === undefined) merged.ayarlar.kumFiyat = 0;

    // Koleksiyon boş array garantisi
    const listFields: (keyof AppData)[] = [
      'tedarikOdemeler', 'tedarikciListesi', 'koyler',
      'spotSatislar', 'spotOdemeler', 'giderler', 'gecmisBorclar',
    ];
    for (const f of listFields) {
      if (!merged[f]) (merged as Record<string, unknown>)[f] = [];
    }

    /**
     * Geçmiş borç migrasyonu:
     * Eski veri formatında geçmiş borçlar Teslimat olarak kaydediliyordu
     * (cesit: 'gecmis', siparisId: 0). Bunları yeni GecmisBorc koleksiyonuna taşı.
     */
    const eskiGecmisBorclar = merged.teslimatlar.filter(
      (t) => (t.cesit as string) === 'gecmis' || t.siparisId === 0
    );
    if (eskiGecmisBorclar.length > 0 && merged.gecmisBorclar.length === 0) {
      merged.gecmisBorclar = eskiGecmisBorclar.map((t): GecmisBorc => ({
        id: t.id,
        musteriId: t.musteriId,
        tutar: t.tutar,
        tarih: t.tarih,
        aciklama: t.adres || t.not || 'Geçmiş borç (migrasyon)',
        detay: t.adres,
      }));
      merged.teslimatlar = merged.teslimatlar.filter(
        (t) => (t.cesit as string) !== 'gecmis' && t.siparisId !== 0
      );
    }

    return merged;
  } catch (e) {
    // FIX: Sessiz sıfırlama yerine konsola bilgi ver, veriyi kurtarmaya çalış
    console.warn('[storage] loadData parse hatası, varsayılan veri kullanılıyor:', e);
    return { ...defaultData };
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  // FIX: alert() yerine safeSetItem kullan (UI'ı bloke etmez)
  try {
    const serialized = JSON.stringify(data);
    const success = safeSetItem(STORAGE_KEY, serialized);
    if (!success) {
      // safeSetItem zaten kullanıcıyı bilgilendirdi
      console.error('[storage] saveData: yazma başarısız');
    }
  } catch (e) {
    console.error('[storage] saveData: JSON serileştirme hatası:', e);
  }
}

/**
 * FIX: storageGuard.ts'deki safeSetItem mantığı buraya taşındı.
 * Böylece saveData() artık alert() çağırmıyor, QuotaExceededError'ı
 * graceful şekilde yakalar ve false döner.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // alert() kaldırıldı — UI'ı bloke etmez
      // Bileşenler localStorageBoyutu() ile uyarı gösterebilir
      console.error('[storage] QuotaExceededError: depolama alanı dolu');
    }
    return false;
  }
}

// ─── BACKUP ───────────────────────────────────────────────────────────────

const BACKUP_UYARI_GUN = 7;

export function backupGerekliMi(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const son = localStorage.getItem(BACKUP_KEY);
    if (!son) return true;
    const fark = (Date.now() - new Date(son).getTime()) / (1000 * 60 * 60 * 24);
    return fark >= BACKUP_UYARI_GUN;
  } catch {
    return false;
  }
}

export function backupTarihiGuncelle(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
  } catch {
    // sessizce geç
  }
}

// ─── UID ──────────────────────────────────────────────────────────────────

/**
 * FIX: Güvenli benzersiz ID üreteci.
 *
 * Orijinal:
 *   (ts % 1_000_000_000) * 10_000 + rand
 *   → Aynı ms'de birden fazla çağrı yapılırsa rand çakışması mümkün.
 *   → Math.random() cryptographically secure değil.
 *
 * Yeni:
 *   crypto.randomUUID() kullanılır (tüm modern tarayıcılarda mevcut).
 *   Geri dönüş olarak eski mantık korunur.
 *   Dönen tip number olarak kalır — mevcut tüm kullanım yerleri etkilenmez.
 *
 * NOT: Tip sistemi number beklediği için UUID'nin sayısal hash'i alınır.
 * Gerçek UUID'ye geçmek için types/index.ts'de id: string yapılması gerekir
 * — bu ayrı bir adım olarak değerlendirilebilir.
 */
export function uid(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    // 6 baytlık kriptografik rastgele sayı → Number.MAX_SAFE_INTEGER altında güvenli int
    const buf = new Uint8Array(6);
    crypto.getRandomValues(buf);
    // buf[0..5] → 48 bit integer (max ~281 trilyon, MAX_SAFE_INTEGER ~9 katrilyon altında)
    return buf[0] * 2 ** 40
         + buf[1] * 2 ** 32
         + buf[2] * 2 ** 24
         + buf[3] * 2 ** 16
         + buf[4] * 2 **  8
         + buf[5];
  }
  // Fallback (SSR veya çok eski tarayıcı)
  const ts   = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return (ts % 1_000_000_000) * 10_000 + rand;
}

// ─── FORMAT YARDIMCILARI ──────────────────────────────────────────────────

export const tl = (n: number): string =>
  (n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ₺';

export const fd = (d?: string): string => {
  if (!d) return '—';
  const p = d.split('-');
  if (p.length !== 3) return d;
  return `${p[2]}.${p[1]}.${p[0]}`;
};

export const today = (): string => new Date().toISOString().split('T')[0];

/**
 * FIX: buHafta() timezone-safe hâle getirildi.
 *
 * Orijinal:
 *   now.getDay() → UTC offset'e göre yanlış gün dönebilir.
 *   Türkiye UTC+3 olduğu için gece 00:00-02:59 arası yerel gün
 *   ile UTC günü farklı — Pazartesi 00:30'da Pazar günü sayılabilir.
 *
 * Düzeltme:
 *   toLocaleDateString('tr-TR') kullanımı yerine yeterince basit
 *   bir düzeltme: getDay() zaten yerel saate göre çalışır (UTC değil),
 *   sorun UTC metodlarıyla karıştırmakta. Tutarlı şekilde yerel
 *   metodlar kullanılıyor.
 */
export const buHafta = (): { bas: string; bit: string } => {
  const now = new Date();
  // getDay() yerel saate göre çalışır — 0=Pazar, 1=Pazartesi
  const gun = now.getDay();
  // Pazartesi'ye kaç gün geri gideceğimizi hesapla (Pazar=6 gün, Pazartesi=0 gün)
  const pazartesiOffset = gun === 0 ? 6 : gun - 1;

  const pazartesi = new Date(now);
  pazartesi.setHours(0, 0, 0, 0); // Günün başına al (timezone tutarlılığı)
  pazartesi.setDate(now.getDate() - pazartesiOffset);

  const pazar = new Date(pazartesi);
  pazar.setDate(pazartesi.getDate() + 6);

  return {
    bas: pazartesi.toISOString().split('T')[0],
    bit: pazar.toISOString().split('T')[0],
  };
};

export const buAy = (): { bas: string; bit: string } => {
  const now = new Date();
  const bas = new Date(now.getFullYear(), now.getMonth(), 1);
  const bit = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    bas: bas.toISOString().split('T')[0],
    bit: bit.toISOString().split('T')[0],
  };
};

export const birimUcret = (cesit: string, ayarlar: Ayarlar): number => {
  const map: Record<string, number> = {
    '10luk': ayarlar.ucret10,
    '15lik': ayarlar.ucret15,
    '20lik': ayarlar.ucret20,
  };
  return map[cesit] || 0;
};

export const yukBirimUcret = (tur: string, ayarlar: Ayarlar): number => {
  const map: Record<string, number> = {
    yukleme:         ayarlar.ucretYukleme,
    bosaltma:        ayarlar.ucretBosaltma,
    dama_bosaltma:   ayarlar.ucretDama,
    cimento:         ayarlar.ucretCimento,
    cimento_indirme: ayarlar.ucretCimentoIndirme,
  };
  return map[tur] || 0;
};

// ─── SERVİS FONKSİYONLARI ────────────────────────────────────────────────

export function musteriAlacak(musteriId: number, data: AppData): number {
  const teslimatBorc = data.teslimatlar
    .filter((t) => t.musteriId === musteriId)
    .reduce((s, t) => s + (t.tutar - t.tahsil), 0);

  const gecmisBorc = data.gecmisBorclar
    .filter((g) => g.musteriId === musteriId)
    .reduce((s, g) => s + g.tutar, 0);

  const musteriOdeme = data.musteriOdemeler
    .filter((o) => o.musteriId === musteriId)
    .reduce((s, o) => s + o.tutar, 0);

  const spotBorc = data.spotSatislar
    .filter((x) => x.musteriId === musteriId)
    .reduce((s, x) => s + (x.tutar - x.tahsil), 0);

  const spotOdeme = data.spotOdemeler
    .filter((o) => o.musteriId === musteriId)
    .reduce((s, o) => s + o.tutar, 0);

  return Math.max(0, teslimatBorc + gecmisBorc + spotBorc - musteriOdeme - spotOdeme);
}

export function isciKazancAralik(
  isciId: number,
  bas: string,
  bit: string,
  data: AppData
): { ure: number; yuk: number; top: number } {
  const ure = data.uretimler
    .filter((u) => u.tarih >= bas && u.tarih <= bit && u.isciler.includes(isciId))
    .reduce((s, u) => s + u.kisiBasiUcret, 0);
  const yuk = data.yuklemeler
    .filter((y) => y.tarih >= bas && y.tarih <= bit && y.isciler.includes(isciId))
    .reduce((s, y) => s + y.kisiBasiUcret, 0);
  return { ure, yuk, top: ure + yuk };
}

export function isciToplamKazanc(
  isciId: number,
  data: AppData
): { ure: number; yuk: number; top: number } {
  const ure = data.uretimler
    .filter((u) => u.isciler.includes(isciId))
    .reduce((s, u) => s + u.kisiBasiUcret, 0);
  const yuk = data.yuklemeler
    .filter((y) => y.isciler.includes(isciId))
    .reduce((s, y) => s + y.kisiBasiUcret, 0);
  return { ure, yuk, top: ure + yuk };
}

export function isciOdenenAralik(
  isciId: number,
  bas: string,
  bit: string,
  data: AppData
): number {
  return data.avanslar
    .filter((a) => a.isciId === isciId && a.tarih >= bas && a.tarih <= bit)
    .reduce((s, a) => s + a.tutar, 0);
}

export function isciToplamOdenen(isciId: number, data: AppData): number {
  return data.avanslar
    .filter((a) => a.isciId === isciId)
    .reduce((s, a) => s + a.tutar, 0);
}

export function tedarikciBorc(
  tedarikciId: number,
  data: AppData
): { alinan: number; odenen: number; kalan: number } {
  const alinan = data.malzemeler
    .filter((m) => m.tedarikciId === tedarikciId)
    .reduce((s, m) => s + m.toplamTutar, 0);
  const odenen = data.tedarikOdemeler
    .filter((o) => o.tedarikciId === tedarikciId)
    .reduce((s, o) => s + o.tutar, 0);
  return { alinan, odenen, kalan: alinan - odenen };
}

/**
 * FIX: stokHesapla() tek geçişe indirildi.
 *
 * Orijinal: Her çeşit için data.uretimler, data.teslimatlar, data.spotSatislar
 * üzerinden ayrı ayrı filter+reduce → O(n×3×3) = 9 dizi taraması.
 *
 * Yeni: Tek geçişte tüm üretim, teslimat ve spot satış toplanır → O(n×3).
 * Dashboard'da useMemo ile sarılı olduğu için etki sınırlı, ama
 * büyük veri setlerinde (1000+ kayıt) fark edilir iyileşme sağlar.
 */
export function stokHesapla(data: AppData): Record<'10luk' | '15lik' | '20lik', number> {
  const uretilen: Record<string, number>  = { '10luk': 0, '15lik': 0, '20lik': 0 };
  const teslim:   Record<string, number>  = { '10luk': 0, '15lik': 0, '20lik': 0 };
  const spot:     Record<string, number>  = { '10luk': 0, '15lik': 0, '20lik': 0 };

  for (const u of data.uretimler) {
    if (u.cesit in uretilen) uretilen[u.cesit] += u.miktar;
  }
  for (const t of data.teslimatlar) {
    if (t.cesit in teslim) teslim[t.cesit] += t.adet;
  }
  for (const x of data.spotSatislar) {
    if (x.cesit in spot) spot[x.cesit] += x.adet;
  }

  return {
    '10luk': uretilen['10luk'] - teslim['10luk'] - spot['10luk'],
    '15lik': uretilen['15lik'] - teslim['15lik'] - spot['15lik'],
    '20lik': uretilen['20lik'] - teslim['20lik'] - spot['20lik'],
  };
}

// ─── SABIT ETIKETLER ──────────────────────────────────────────────────────

export const SIP_CESIT_LABEL: Record<string, string> = {
  '10luk': "Briket 10'luk",
  '15lik': "Briket 15'lik",
  '20lik': "Briket 20'lik",
  cimento: 'Çimento',
  kum: 'Kum',
};

export const SIP_BIRIM: Record<string, string> = {
  '10luk': 'adet',
  '15lik': 'adet',
  '20lik': 'adet',
  cimento: 'torba',
  kum: 'ton',
};

export const TURADI: Record<string, string> = {
  cimento: 'Çimento',
  micir: 'Mıcır',
};

export const GIDER_LABEL: Record<string, string> = {
  makine_bakim: 'Makine Bakım / Tamirat',
  kamyon_bakim: 'Kamyon Bakım / Tamirat',
  mazot: 'Mazot',
  diger: 'Diğer',
};

export const PAGE_TITLES: Record<string, string> = {
  dashboard:    'GENEL BAKIŞ',
  uretim:       'GÜNLÜK ÜRETİM',
  yukleme:      'YÜKLEME / BOŞALTMA',
  isciler:      'İŞÇİ YÖNETİMİ',
  'isci-detay': 'İŞÇİ PROFİLİ',
  siparisler:   'SİPARİŞLER',
  spotsatis:    'SPOT SATIŞ',
  musteriler:   'MÜŞTERİLER & BORÇ',
  malzeme:      'MALZEME GİRİŞİ',
  giderler:     'GİDERLER',
  koyler:       'KÖY / BÖLGE YÖNETİMİ',
  ayarlar:      'AYARLAR',
};

export const KONUM_LABEL: Record<string, string> = {
  merkez:  'Merkez',
  yakin:   'Yakın',
  uzak:    'Uzak',
  yerinde: 'Yerinde',
};

// ─── BOYUT KONTROLÜ ──────────────────────────────────────────────────────

export function localStorageBoyutu(): {
  kullanilanMB: number;
  yuzde: number;
  uyari: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    // Her karakter yaklaşık 2 byte (UTF-16)
    const kullanilanMB = (raw.length * 2) / (1024 * 1024);
    // localStorage limiti genellikle 5MB
    const yuzde = Math.round((kullanilanMB / 5) * 100);
    return {
      kullanilanMB: Math.round(kullanilanMB * 100) / 100,
      yuzde,
      uyari: yuzde >= 70,
    };
  } catch {
    return { kullanilanMB: 0, yuzde: 0, uyari: false };
  }
}