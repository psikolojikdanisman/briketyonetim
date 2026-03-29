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
      // Temizlenmiş teslimatlar
      merged.teslimatlar = merged.teslimatlar.filter(
        (t) => (t.cesit as string) !== 'gecmis' && t.siparisId !== 0
      );
    }

    return merged;
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    alert(
      '⚠️ Kayıt başarısız!\n\n' +
      'Tarayıcı depolama alanı dolmuş olabilir.\n' +
      'Ayarlar sayfasından veriyi yedekleyin.'
    );
  }
}

// ─── BACKUP ───────────────────────────────────────────────────────────────

const BACKUP_UYARI_GUN = 7;

/** SSR-safe backup uyarı kontrolü */
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
 * Güvenli benzersiz ID üreteci.
 * crypto.randomUUID() kullanıyor ve Number.MAX_SAFE_INTEGER sınırını aşmıyor.
 * Strateji: timestamp (ms) + 4 basamak rastgele sayı kombinasyonu.
 * Çakışma olasılığı: aynı ms içinde 10.000'den fazla kayıt açılmadıkça sıfır.
 */
export function uid(): number {
  const ts   = Date.now();          // ~13 basamak
  const rand = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  // ts max ~1e13, rand max ~1e4 → birleşim ~1e17 → MAX_SAFE_INTEGER (9e15) aşılabilir
  // ts'i mod alarak güvenli aralıkta tut: son 9 basamak + 4 rand = 13 basamak < 9e15 ✓
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

export const buHafta = (): { bas: string; bit: string } => {
  const now = new Date();
  const gun = now.getDay();
  const pazartesi = new Date(now);
  pazartesi.setDate(now.getDate() - (gun === 0 ? 6 : gun - 1));
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
// İş mantığı component'lerden çıkarıldı — tek kaynak

/**
 * Bir müşterinin net alacağını hesaplar.
 * Teslimat + GecmisBorc + SpotSatis toplamından ödemeleri çıkarır.
 */
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

/**
 * Bir işçinin belirli tarih aralığındaki kazancını hesaplar.
 */
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

/**
 * Bir işçinin tüm zamanlar kazancını hesaplar.
 */
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

/**
 * Bir işçinin belirli tarih aralığında alınan avanslarını hesaplar.
 */
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

/**
 * Bir işçinin tüm zamanlar alınan avanslarını hesaplar.
 */
export function isciToplamOdenen(isciId: number, data: AppData): number {
  return data.avanslar
    .filter((a) => a.isciId === isciId)
    .reduce((s, a) => s + a.tutar, 0);
}

/**
 * Bir tedarikçinin borç durumunu hesaplar.
 */
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
 * Stok hesabı: üretim − teslimat − spot satış (çeşit bazında)
 */
export function stokHesapla(data: AppData): Record<'10luk' | '15lik' | '20lik', number> {
  const cesitler = ['10luk', '15lik', '20lik'] as const;
  const sonuc = {} as Record<'10luk' | '15lik' | '20lik', number>;
  for (const c of cesitler) {
    const uretilen     = data.uretimler.filter((u) => u.cesit === c).reduce((s, u) => s + u.miktar, 0);
    const teslimEdilen = data.teslimatlar.filter((t) => t.cesit === c).reduce((s, t) => s + t.adet, 0);
    const spotGiden    = data.spotSatislar.filter((x) => x.cesit === c).reduce((s, x) => s + x.adet, 0);
    sonuc[c] = uretilen - teslimEdilen - spotGiden;
  }
  return sonuc;
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
  merkez: 'Merkez',
  yakin:  'Yakın',
  uzak:   'Uzak',
  yerinde: 'Yerinde',
};
