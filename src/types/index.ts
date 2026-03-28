// ═══ CORE TYPES ═══

export interface Yonetici {
  ad: string;
  soyad: string;
  tel: string;
}

export interface Isci {
  id: number;
  isim: string;
}

export interface Uretim {
  id: number;
  tarih: string;
  cesit: '10luk' | '15lik' | '20lik';
  miktar: number;
  isciler: number[];
  kisiBasiUcret: number;
  toplamUcret: number;
  not?: string;
}

export interface Yukleme {
  id: number;
  tarih: string;
  tur: string;
  miktar: number;
  isciler: number[];
  kisiBasiUcret: number;
  toplamUcret: number;
  not?: string;
}

export interface Avans {
  id: number;
  isciId: number;
  tutar: number;
  tarih: string;
  aciklama?: string;
}

export interface KapaliHafta {
  id: number;
  bas: string;
  bit: string;
  topUretim: number;
  topYukleme: number;
  isciSayisi: number;
  kapatma: string;
}

export interface Musteri {
  id: number;
  isim: string;
  tel?: string;
  bolge?: string;
  koy?: string;
  adres?: string;
}

export interface Siparis {
  id: number;
  musteriId: number;
  adet: number;
  gonderilen: number;
  cesit: string;
  bolge?: string;
  koy?: string;
  adres?: string;
  fiyat: number;
  toplamTutar: number;
  birim: string;
  tarih: string;
  not?: string;
}

export interface Teslimat {
  id: number;
  siparisId: number;
  musteriId: number;
  cesit: string;
  bolge?: string;
  koy?: string;
  adres?: string;
  birimFiyat: number;
  adet: number;
  tutar: number;
  tahsil: number;
  odemeDurumu: string;
  tarih: string;
  not?: string;
  birim?: string;
}

export interface MusteriOdeme {
  id: number;
  musteriId: number;
  tutar: number;
  tarih: string;
  aciklama?: string;
}

export interface Malzeme {
  id: number;
  tur: 'micir' | 'cimento';
  tarih: string;
  tirlar: { miktar: number; fiyat: number }[];
  toplamMiktar: number;
  toplamTutar: number;
  tedarikci?: string;
  tedarikciId?: number;
  gecmisBorcMu?: boolean;
  not?: string;
}

export interface TedarikOdeme {
  id: number;
  tedarikciId: number;
  tutar: number;
  tarih: string;
  aciklama?: string;
}

export interface Tedarikci {
  id: number;
  isim: string;
  tur: 'micir' | 'cimento' | 'diger';
}

export interface Koy {
  id: number;
  isim: string;
  bolge: 'merkez' | 'yakin' | 'uzak';
  not?: string;
}

export interface SpotSatis {
  id: number;
  musteriId: number;
  tarih: string;
  cesit: string;
  adet: number;
  birimFiyat: number;
  tutar: number;
  tahsil: number;
  koy?: string;
  adres?: string;
  bolge?: string;
  not?: string;
  birim?: string;
}

export interface SpotOdeme {
  id: number;
  musteriId: number;
  tutar: number;
  tarih: string;
  aciklama?: string;
}

export type GiderKategori =
  | 'makine_bakim'
  | 'kamyon_bakim'
  | 'mazot'
  | 'diger';

export interface Gider {
  id: number;
  tarih: string;
  kategori: GiderKategori;
  kategoriIsim?: string;
  tutar: number;
  aciklama?: string;
}

export interface FiyatTarifeleri {
  '10luk': { merkez: number; yakin: number };
  '15lik': { merkez: number; yakin: number };
  '20lik': { merkez: number; yakin: number };
}

export interface Ayarlar {
  ucret10: number;
  ucret15: number;
  ucret20: number;
  ucretYukleme: number;
  ucretBosaltma: number;
  ucretDama: number;
  ucretCimento: number;
  ucretCimentoIndirme: number;
  micirFiyat: number;
  cimentoFiyat: number;
  fp: FiyatTarifeleri;
}

export interface AppData {
  yonetici: Yonetici;
  ayarlar: Ayarlar;
  isciler: Isci[];
  uretimler: Uretim[];
  yuklemeler: Yukleme[];
  avanslar: Avans[];
  kapaliHaftalar: KapaliHafta[];
  musteriler: Musteri[];
  siparisler: Siparis[];
  teslimatlar: Teslimat[];
  musteriOdemeler: MusteriOdeme[];
  malzemeler: Malzeme[];
  tedarikOdemeler: TedarikOdeme[];
  tedarikciListesi: Tedarikci[];
  koyler: Koy[];
  spotSatislar: SpotSatis[];
  spotOdemeler: SpotOdeme[];
  giderler: Gider[];
}

export type PageKey =
  | 'dashboard'
  | 'uretim'
  | 'yukleme'
  | 'isciler'
  | 'siparisler'
  | 'spotsatis'
  | 'musteriler'
  | 'malzeme'
  | 'giderler'
  | 'koyler'
  | 'ayarlar';