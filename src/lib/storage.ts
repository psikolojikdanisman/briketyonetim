import type { AppData, Ayarlar } from '@/types';

const STORAGE_KEY = 'byk_v3';

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
  fp: {
    '10luk': { merkez: 0, yakin: 0 },
    '15lik': { merkez: 0, yakin: 0 },
    '20lik': { merkez: 0, yakin: 0 },
  },
};

export const defaultData: AppData = {
  ayarlar: defaultAyarlar,
  isciler: [],
  uretimler: [],
  yuklemeler: [],
  avanslar: [],
  kapaliHaftalar: [],
  musteriler: [],
  siparisler: [],
  teslimatlar: [],
  musteriOdemeler: [],
  malzemeler: [],
  tedarikOdemeler: [],
  tedarikciListesi: [],
  koyler: [],
  spotSatislar: [],
  spotOdemeler: [],
};

export function loadData(): AppData {
  if (typeof window === 'undefined') return { ...defaultData };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    const merged: AppData = { ...defaultData, ...parsed };
    // Ensure nested defaults
    if (!merged.ayarlar.fp) merged.ayarlar.fp = defaultAyarlar.fp;
    if (!merged.tedarikOdemeler) merged.tedarikOdemeler = [];
    if (!merged.tedarikciListesi) merged.tedarikciListesi = [];
    if (!merged.koyler) merged.koyler = [];
    if (!merged.spotSatislar) merged.spotSatislar = [];
    if (!merged.spotOdemeler) merged.spotOdemeler = [];
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
    // quota exceeded veya benzeri
  }
}

// ─── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────────

export const tl = (n: number): string =>
  (n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ₺';

export const fd = (d?: string): string => {
  if (!d) return '—';
  const p = d.split('-');
  return `${p[2]}.${p[1]}.${p[0]}`;
};

export const today = (): string => new Date().toISOString().split('T')[0];

export const uid = (): number =>
  Date.now() + Math.floor(Math.random() * 9999);

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

export const birimUcret = (
  cesit: string,
  ayarlar: Ayarlar
): number => {
  const map: Record<string, number> = {
    '10luk': ayarlar.ucret10,
    '15lik': ayarlar.ucret15,
    '20lik': ayarlar.ucret20,
  };
  return map[cesit] || 0;
};

export const yukBirimUcret = (
  tur: string,
  ayarlar: Ayarlar
): number => {
  const map: Record<string, number> = {
    yukleme: ayarlar.ucretYukleme,
    bosaltma: ayarlar.ucretBosaltma,
    dama_bosaltma: ayarlar.ucretDama,
    cimento: ayarlar.ucretCimento,
    cimento_indirme: ayarlar.ucretCimentoIndirme,
  };
  return map[tur] || 0;
};

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
  diger: 'Diğer',
};

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'GENEL BAKIŞ',
  uretim: 'GÜNLÜK ÜRETİM',
  yukleme: 'YÜKLEME / BOŞALTMA',
  isciler: 'İŞÇİ YÖNETİMİ',
  haftalik: 'HAFTALIK HESAP',
  siparisler: 'SİPARİŞLER',
  spotsatis: 'SPOT SATIŞ',
  musteriler: 'MÜŞTERİLER & BORÇ',
  malzeme: 'MALZEME GİRİŞİ',
  koyler: 'KÖY / BÖLGE YÖNETİMİ',
  ayarlar: 'ÜCRET TARİFELERİ',
};
