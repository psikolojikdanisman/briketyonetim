import type { AppData, Ayarlar, Isci, Uretim, Yukleme, Avans, KapaliHafta, Musteri, Siparis, Teslimat, GecmisBorc, MusteriOdeme, Malzeme, TedarikOdeme, Tedarikci, Koy, SpotSatis, SpotOdeme, Gider, Yonetici } from '@/types';
import { supabase } from './supabase';

const STORAGE_KEY = 'byk_v3';
const BACKUP_KEY  = 'briket_last_backup';

// ─── DEFAULTS ─────────────────────────────────────────────────────────────

const defaultAyarlar: Ayarlar = {
  ucret10: 0, ucret15: 0, ucret20: 0,
  ucretYukleme: 0, ucretBosaltma: 0, ucretDama: 0,
  ucretCimento: 0, ucretCimentoIndirme: 0,
  micirFiyat: 0, cimentoFiyat: 0, kumFiyat: 0,
  fp: { merkez: 0, yakin: 0, uzak: 0, yerinde: 0, cimento: 0, kum: 0 },
};

export const defaultYonetici: Yonetici = { ad: '', soyad: '', tel: '' };

export const defaultData: AppData = {
  yonetici: defaultYonetici,
  ayarlar: defaultAyarlar,
  isciler: [], uretimler: [], yuklemeler: [], avanslar: [],
  kapaliHaftalar: [], musteriler: [], siparisler: [], teslimatlar: [],
  gecmisBorclar: [], musteriOdemeler: [], malzemeler: [], tedarikOdemeler: [],
  tedarikciListesi: [], koyler: [], spotSatislar: [], spotOdemeler: [], giderler: [],
};

// ─── SUPABASE OKUMA ───────────────────────────────────────────────────────

export async function loadDataFromSupabase(): Promise<AppData> {
  try {
    const [
      ayarlarRes, yoneticiRes, iscilerRes, uretimlerRes, yuklemelerRes,
      avanslarRes, kapaliRes, musterilerRes, siparislerRes, teslimatlarRes,
      gecmisRes, musteriOdRes, malzemeRes, tedarikOdRes, tedarikciRes,
      koylerRes, spotSatisRes, spotOdRes, giderlerRes,
    ] = await Promise.all([
      supabase.from('ayarlar').select('data').eq('id', 'main').single(),
      supabase.from('yonetici').select('ad, soyad, tel').eq('id', 'main').single(),
      supabase.from('isciler').select('*'),
      supabase.from('uretimler').select('*'),
      supabase.from('yuklemeler').select('*'),
      supabase.from('avanslar').select('*'),
      supabase.from('kapali_haftalar').select('*'),
      supabase.from('musteriler').select('*'),
      supabase.from('siparisler').select('*'),
      supabase.from('teslimatlar').select('*'),
      supabase.from('gecmis_borclar').select('*'),
      supabase.from('musteri_odemeler').select('*'),
      supabase.from('malzemeler').select('*'),
      supabase.from('tedarik_odemeler').select('*'),
      supabase.from('tedarikci_listesi').select('*'),
      supabase.from('koyler').select('*'),
      supabase.from('spot_satislar').select('*'),
      supabase.from('spot_odemeler').select('*'),
      supabase.from('giderler').select('*'),
    ]);

    let ayarlar = { ...defaultAyarlar };
    if (ayarlarRes.data?.data) {
      const a = ayarlarRes.data.data as Partial<Ayarlar>;
      ayarlar = { ...defaultAyarlar, ...a };
      if (!ayarlar.fp) ayarlar.fp = { ...defaultAyarlar.fp };
    }

    const yonetici: Yonetici = {
      ad:    yoneticiRes.data?.ad    || '',
      soyad: yoneticiRes.data?.soyad || '',
      tel:   yoneticiRes.data?.tel   || '',
    };

    return {
      yonetici,
      ayarlar,
      isciler:          (iscilerRes.data    || []).map(mapIsci),
      uretimler:        (uretimlerRes.data  || []).map(mapUretim),
      yuklemeler:       (yuklemelerRes.data || []).map(mapYukleme),
      avanslar:         (avanslarRes.data   || []).map(mapAvans),
      kapaliHaftalar:   (kapaliRes.data     || []).map(mapKapaliHafta),
      musteriler:       (musterilerRes.data || []).map(mapMusteri),
      siparisler:       (siparislerRes.data || []).map(mapSiparis),
      teslimatlar:      (teslimatlarRes.data|| []).map(mapTeslimat),
      gecmisBorclar:    (gecmisRes.data     || []).map(mapGecmisBorc),
      musteriOdemeler:  (musteriOdRes.data  || []).map(mapMusteriOdeme),
      malzemeler:       (malzemeRes.data    || []).map(mapMalzeme),
      tedarikOdemeler:  (tedarikOdRes.data  || []).map(mapTedarikOdeme),
      tedarikciListesi: (tedarikciRes.data  || []).map(mapTedarikci),
      koyler:           (koylerRes.data     || []).map(mapKoy),
      spotSatislar:     (spotSatisRes.data  || []).map(mapSpotSatis),
      spotOdemeler:     (spotOdRes.data     || []).map(mapSpotOdeme),
      giderler:         (giderlerRes.data   || []).map(mapGider),
    };
  } catch (e) {
    console.warn('[storage] Supabase loadData hatası:', e);
    return { ...defaultData };
  }
}

// ─── SUPABASE YAZMA (TABLO BAZLI) ─────────────────────────────────────────

export async function saveAyarlar(ayarlar: Ayarlar): Promise<void> {
  await supabase.from('ayarlar').upsert({ id: 'main', data: ayarlar, updated_at: new Date().toISOString() });
}

export async function saveYonetici(y: Yonetici): Promise<void> {
  await supabase.from('yonetici').upsert({ id: 'main', ad: y.ad, soyad: y.soyad, tel: y.tel, updated_at: new Date().toISOString() });
}

/**
 * JSON yedekten geri yükleme — tüm tabloları Supabase'e toplu yazar.
 */
export async function topluGeriYukle(d: AppData): Promise<void> {
  await saveAyarlar(d.ayarlar);
  await saveYonetici(d.yonetici);

  if (d.isciler.length)
    await supabase.from('isciler').upsert(d.isciler.map(x => ({ id: x.id, isim: x.isim })));

  if (d.uretimler.length)
    await supabase.from('uretimler').upsert(d.uretimler.map(x => ({
      id: x.id, tarih: x.tarih, cesit: x.cesit, miktar: x.miktar,
      isciler: x.isciler, kisi_basi_ucret: x.kisiBasiUcret,
      toplam_ucret: x.toplamUcret, not_: x.not,
    })));

  if (d.yuklemeler.length)
    await supabase.from('yuklemeler').upsert(d.yuklemeler.map(x => ({
      id: x.id, tarih: x.tarih, tur: x.tur, miktar: x.miktar,
      isciler: x.isciler, kisi_basi_ucret: x.kisiBasiUcret,
      toplam_ucret: x.toplamUcret, not_: x.not, yukleme_id: x.yuklemeId,
    })));

  if (d.avanslar.length)
    await supabase.from('avanslar').upsert(d.avanslar.map(x => ({
      id: x.id, isci_id: x.isciId, tutar: x.tutar, tarih: x.tarih, aciklama: x.aciklama,
    })));

  if (d.kapaliHaftalar.length)
    await supabase.from('kapali_haftalar').upsert(d.kapaliHaftalar.map(x => ({
      id: x.id, bas: x.bas, bit: x.bit, top_uretim: x.topUretim,
      top_yukleme: x.topYukleme, isci_sayisi: x.isciSayisi, kapatma: x.kapatma,
    })));

  if (d.musteriler.length)
    await supabase.from('musteriler').upsert(d.musteriler.map(x => ({
      id: x.id, isim: x.isim, tel: x.tel, bolge: x.bolge, koy: x.koy, adres: x.adres,
    })));

  if (d.siparisler.length)
    await supabase.from('siparisler').upsert(d.siparisler.map(x => ({
      id: x.id, musteri_id: x.musteriId, adet: x.adet, gonderilen: x.gonderilen,
      cesit: x.cesit, bolge: x.bolge, koy: x.koy, adres: x.adres,
      fiyat: x.fiyat, toplam_tutar: x.toplamTutar, birim: x.birim,
      tarih: x.tarih, not_: x.not, oncelik: x.oncelik,
    })));

  if (d.teslimatlar.length)
    await supabase.from('teslimatlar').upsert(d.teslimatlar.map(x => ({
      id: x.id, siparis_id: x.siparisId, musteri_id: x.musteriId,
      cesit: x.cesit, bolge: x.bolge, koy: x.koy, adres: x.adres,
      birim_fiyat: x.birimFiyat, adet: x.adet, tutar: x.tutar,
      tahsil: x.tahsil, odeme_durumu: x.odemeDurumu, tarih: x.tarih,
      not_: x.not, birim: x.birim,
    })));

  if (d.gecmisBorclar?.length)
    await supabase.from('gecmis_borclar').upsert(d.gecmisBorclar.map(x => ({
      id: x.id, musteri_id: x.musteriId, tutar: x.tutar,
      tarih: x.tarih, aciklama: x.aciklama, detay: x.detay,
    })));

  if (d.musteriOdemeler.length)
    await supabase.from('musteri_odemeler').upsert(d.musteriOdemeler.map(x => ({
      id: x.id, musteri_id: x.musteriId, tutar: x.tutar, tarih: x.tarih, aciklama: x.aciklama,
    })));

  if (d.malzemeler.length)
    await supabase.from('malzemeler').upsert(d.malzemeler.map(x => ({
      id: x.id, tur: x.tur, tarih: x.tarih, tirlar: x.tirlar,
      toplam_miktar: x.toplamMiktar, toplam_tutar: x.toplamTutar,
      tedarikci: x.tedarikci, tedarikci_id: x.tedarikciId,
      gecmis_borc_mu: x.gecmisBorcMu, not_: x.not,
    })));

  if (d.tedarikOdemeler.length)
    await supabase.from('tedarik_odemeler').upsert(d.tedarikOdemeler.map(x => ({
      id: x.id, tedarikci_id: x.tedarikciId, tutar: x.tutar, tarih: x.tarih, aciklama: x.aciklama,
    })));

  if (d.tedarikciListesi.length)
    await supabase.from('tedarikci_listesi').upsert(d.tedarikciListesi.map(x => ({
      id: x.id, isim: x.isim, tur: x.tur,
    })));

  if (d.koyler.length)
    await supabase.from('koyler').upsert(d.koyler.map(x => ({
      id: x.id, isim: x.isim, bolge: x.bolge, not_: x.not,
    })));

  if (d.spotSatislar.length)
    await supabase.from('spot_satislar').upsert(d.spotSatislar.map(x => ({
      id: x.id, musteri_id: x.musteriId, tarih: x.tarih, cesit: x.cesit,
      adet: x.adet, birim_fiyat: x.birimFiyat, tutar: x.tutar, tahsil: x.tahsil,
      konum: x.konum, koy: x.koy, adres: x.adres, bolge: x.bolge, not_: x.not, birim: x.birim,
    })));

  if (d.spotOdemeler.length)
    await supabase.from('spot_odemeler').upsert(d.spotOdemeler.map(x => ({
      id: x.id, musteri_id: x.musteriId, tutar: x.tutar, tarih: x.tarih, aciklama: x.aciklama,
    })));

  if (d.giderler.length)
    await supabase.from('giderler').upsert(d.giderler.map(x => ({
      id: x.id, tarih: x.tarih, kategori: x.kategori,
      kategori_isim: x.kategoriIsim, tutar: x.tutar, aciklama: x.aciklama,
    })));
}


export async function saveIsci(isci: Isci): Promise<void> {
  await supabase.from('isciler').upsert({ id: isci.id, isim: isci.isim });
}
export async function deleteIsci(id: number): Promise<void> {
  await supabase.from('isciler').delete().eq('id', id);
}

export async function saveUretim(u: Uretim): Promise<void> {
  await supabase.from('uretimler').upsert({
    id: u.id, tarih: u.tarih, cesit: u.cesit, miktar: u.miktar,
    isciler: u.isciler, kisi_basi_ucret: u.kisiBasiUcret,
    toplam_ucret: u.toplamUcret, not_: u.not,
  });
}
export async function deleteUretim(id: number): Promise<void> {
  await supabase.from('uretimler').delete().eq('id', id);
}

export async function saveYukleme(y: Yukleme): Promise<void> {
  await supabase.from('yuklemeler').upsert({
    id: y.id, tarih: y.tarih, tur: y.tur, miktar: y.miktar,
    isciler: y.isciler, kisi_basi_ucret: y.kisiBasiUcret,
    toplam_ucret: y.toplamUcret, not_: y.not, yukleme_id: y.yuklemeId,
  });
}
export async function deleteYukleme(id: number): Promise<void> {
  await supabase.from('yuklemeler').delete().eq('id', id);
}

export async function saveAvans(a: Avans): Promise<void> {
  await supabase.from('avanslar').upsert({
    id: a.id, isci_id: a.isciId, tutar: a.tutar, tarih: a.tarih, aciklama: a.aciklama,
  });
}
export async function deleteAvans(id: number): Promise<void> {
  await supabase.from('avanslar').delete().eq('id', id);
}

export async function saveKapaliHafta(k: KapaliHafta): Promise<void> {
  await supabase.from('kapali_haftalar').upsert({
    id: k.id, bas: k.bas, bit: k.bit, top_uretim: k.topUretim,
    top_yukleme: k.topYukleme, isci_sayisi: k.isciSayisi, kapatma: k.kapatma,
  });
}

export async function saveMusteri(m: Musteri): Promise<void> {
  await supabase.from('musteriler').upsert({
    id: m.id, isim: m.isim, tel: m.tel, bolge: m.bolge, koy: m.koy, adres: m.adres,
  });
}
export async function deleteMusteri(id: number): Promise<void> {
  await supabase.from('musteriler').delete().eq('id', id);
}

export async function saveSiparis(s: Siparis): Promise<void> {
  await supabase.from('siparisler').upsert({
    id: s.id, musteri_id: s.musteriId, adet: s.adet, gonderilen: s.gonderilen,
    cesit: s.cesit, bolge: s.bolge, koy: s.koy, adres: s.adres,
    fiyat: s.fiyat, toplam_tutar: s.toplamTutar, birim: s.birim,
    tarih: s.tarih, not_: s.not, oncelik: s.oncelik,
  });
}
export async function deleteSiparis(id: number): Promise<void> {
  await supabase.from('siparisler').delete().eq('id', id);
}

export async function saveTeslimat(t: Teslimat): Promise<void> {
  await supabase.from('teslimatlar').upsert({
    id: t.id, siparis_id: t.siparisId, musteri_id: t.musteriId,
    cesit: t.cesit, bolge: t.bolge, koy: t.koy, adres: t.adres,
    birim_fiyat: t.birimFiyat, adet: t.adet, tutar: t.tutar,
    tahsil: t.tahsil, odeme_durumu: t.odemeDurumu, tarih: t.tarih,
    not_: t.not, birim: t.birim,
  });
}
export async function deleteTeslimat(id: number): Promise<void> {
  await supabase.from('teslimatlar').delete().eq('id', id);
}

export async function saveGecmisBorc(g: GecmisBorc): Promise<void> {
  await supabase.from('gecmis_borclar').upsert({
    id: g.id, musteri_id: g.musteriId, tutar: g.tutar,
    tarih: g.tarih, aciklama: g.aciklama, detay: g.detay,
  });
}
export async function deleteGecmisBorc(id: number): Promise<void> {
  await supabase.from('gecmis_borclar').delete().eq('id', id);
}

export async function saveMusteriOdeme(o: MusteriOdeme): Promise<void> {
  await supabase.from('musteri_odemeler').upsert({
    id: o.id, musteri_id: o.musteriId, tutar: o.tutar, tarih: o.tarih, aciklama: o.aciklama,
  });
}
export async function deleteMusteriOdeme(id: number): Promise<void> {
  await supabase.from('musteri_odemeler').delete().eq('id', id);
}

export async function saveMalzeme(m: Malzeme): Promise<void> {
  await supabase.from('malzemeler').upsert({
    id: m.id, tur: m.tur, tarih: m.tarih, tirlar: m.tirlar,
    toplam_miktar: m.toplamMiktar, toplam_tutar: m.toplamTutar,
    tedarikci: m.tedarikci, tedarikci_id: m.tedarikciId,
    gecmis_borc_mu: m.gecmisBorcMu, not_: m.not,
  });
}
export async function deleteMalzeme(id: number): Promise<void> {
  await supabase.from('malzemeler').delete().eq('id', id);
}

export async function saveTedarikOdeme(o: TedarikOdeme): Promise<void> {
  await supabase.from('tedarik_odemeler').upsert({
    id: o.id, tedarikci_id: o.tedarikciId, tutar: o.tutar, tarih: o.tarih, aciklama: o.aciklama,
  });
}
export async function deleteTedarikOdeme(id: number): Promise<void> {
  await supabase.from('tedarik_odemeler').delete().eq('id', id);
}

export async function saveTedarikci(t: Tedarikci): Promise<void> {
  await supabase.from('tedarikci_listesi').upsert({ id: t.id, isim: t.isim, tur: t.tur });
}
export async function deleteTedarikci(id: number): Promise<void> {
  await supabase.from('tedarikci_listesi').delete().eq('id', id);
}

export async function saveKoy(k: Koy): Promise<void> {
  await supabase.from('koyler').upsert({ id: k.id, isim: k.isim, bolge: k.bolge, not_: k.not });
}
export async function deleteKoy(id: number): Promise<void> {
  await supabase.from('koyler').delete().eq('id', id);
}

export async function saveSpotSatis(s: SpotSatis): Promise<void> {
  await supabase.from('spot_satislar').upsert({
    id: s.id, musteri_id: s.musteriId, tarih: s.tarih, cesit: s.cesit,
    adet: s.adet, birim_fiyat: s.birimFiyat, tutar: s.tutar, tahsil: s.tahsil,
    konum: s.konum, koy: s.koy, adres: s.adres, bolge: s.bolge, not_: s.not, birim: s.birim,
  });
}
export async function deleteSpotSatis(id: number): Promise<void> {
  await supabase.from('spot_satislar').delete().eq('id', id);
}

export async function saveSpotOdeme(o: SpotOdeme): Promise<void> {
  await supabase.from('spot_odemeler').upsert({
    id: o.id, musteri_id: o.musteriId, tutar: o.tutar, tarih: o.tarih, aciklama: o.aciklama,
  });
}
export async function deleteSpotOdeme(id: number): Promise<void> {
  await supabase.from('spot_odemeler').delete().eq('id', id);
}

export async function saveGider(g: Gider): Promise<void> {
  await supabase.from('giderler').upsert({
    id: g.id, tarih: g.tarih, kategori: g.kategori,
    kategori_isim: g.kategoriIsim, tutar: g.tutar, aciklama: g.aciklama,
  });
}
export async function deleteGider(id: number): Promise<void> {
  await supabase.from('giderler').delete().eq('id', id);
}

// ─── MAPPER FONKSİYONLARI ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIsci(r: any): Isci { return { id: r.id, isim: r.isim }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUretim(r: any): Uretim {
  return { id: r.id, tarih: r.tarih, cesit: r.cesit, miktar: r.miktar, isciler: r.isciler || [], kisiBasiUcret: r.kisi_basi_ucret, toplamUcret: r.toplam_ucret, not: r.not_ };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapYukleme(r: any): Yukleme {
  return { id: r.id, tarih: r.tarih, tur: r.tur, miktar: r.miktar, isciler: r.isciler || [], kisiBasiUcret: r.kisi_basi_ucret, toplamUcret: r.toplam_ucret, not: r.not_, yuklemeId: r.yukleme_id };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAvans(r: any): Avans {
  return { id: r.id, isciId: r.isci_id, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapKapaliHafta(r: any): KapaliHafta {
  return { id: r.id, bas: r.bas, bit: r.bit, topUretim: r.top_uretim, topYukleme: r.top_yukleme, isciSayisi: r.isci_sayisi, kapatma: r.kapatma };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMusteri(r: any): Musteri {
  return { id: r.id, isim: r.isim, tel: r.tel, bolge: r.bolge, koy: r.koy, adres: r.adres };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSiparis(r: any): Siparis {
  return { id: r.id, musteriId: r.musteri_id, adet: r.adet, gonderilen: r.gonderilen, cesit: r.cesit, bolge: r.bolge, koy: r.koy, adres: r.adres, fiyat: r.fiyat, toplamTutar: r.toplam_tutar, birim: r.birim, tarih: r.tarih, not: r.not_, oncelik: r.oncelik };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeslimat(r: any): Teslimat {
  return { id: r.id, siparisId: r.siparis_id, musteriId: r.musteri_id, cesit: r.cesit, bolge: r.bolge, koy: r.koy, adres: r.adres, birimFiyat: r.birim_fiyat, adet: r.adet, tutar: r.tutar, tahsil: r.tahsil, odemeDurumu: r.odeme_durumu, tarih: r.tarih, not: r.not_, birim: r.birim };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGecmisBorc(r: any): GecmisBorc {
  return { id: r.id, musteriId: r.musteri_id, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama, detay: r.detay };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMusteriOdeme(r: any): MusteriOdeme {
  return { id: r.id, musteriId: r.musteri_id, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMalzeme(r: any): Malzeme {
  return { id: r.id, tur: r.tur, tarih: r.tarih, tirlar: r.tirlar || [], toplamMiktar: r.toplam_miktar, toplamTutar: r.toplam_tutar, tedarikci: r.tedarikci, tedarikciId: r.tedarikci_id, gecmisBorcMu: r.gecmis_borc_mu, not: r.not_ };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTedarikOdeme(r: any): TedarikOdeme {
  return { id: r.id, tedarikciId: r.tedarikci_id, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTedarikci(r: any): Tedarikci { return { id: r.id, isim: r.isim, tur: r.tur }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapKoy(r: any): Koy { return { id: r.id, isim: r.isim, bolge: r.bolge, not: r.not_ }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSpotSatis(r: any): SpotSatis {
  return { id: r.id, musteriId: r.musteri_id, tarih: r.tarih, cesit: r.cesit, adet: r.adet, birimFiyat: r.birim_fiyat, tutar: r.tutar, tahsil: r.tahsil, konum: r.konum, koy: r.koy, adres: r.adres, bolge: r.bolge, not: r.not_, birim: r.birim };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSpotOdeme(r: any): SpotOdeme {
  return { id: r.id, musteriId: r.musteri_id, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGider(r: any): Gider {
  return { id: r.id, tarih: r.tarih, kategori: r.kategori, kategoriIsim: r.kategori_isim, tutar: r.tutar, aciklama: r.aciklama };
}

// ─── LOCALSTORAGE (YEDEK) ─────────────────────────────────────────────────

export function loadData(): AppData {
  if (typeof window === 'undefined') return { ...defaultData };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    return { ...defaultData, ...JSON.parse(raw) };
  } catch { return { ...defaultData }; }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* sessiz */ }
}

// ─── BACKUP ───────────────────────────────────────────────────────────────

const BACKUP_UYARI_GUN = 7;

export function backupGerekliMi(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const son = localStorage.getItem(BACKUP_KEY);
    if (!son) return true;
    return (Date.now() - new Date(son).getTime()) / (1000 * 60 * 60 * 24) >= BACKUP_UYARI_GUN;
  } catch { return false; }
}

export function backupTarihiGuncelle(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch { /* sessiz */ }
}

// ─── UID ──────────────────────────────────────────────────────────────────

export function uid(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(6);
    crypto.getRandomValues(buf);
    return buf[0]*2**40 + buf[1]*2**32 + buf[2]*2**24 + buf[3]*2**16 + buf[4]*2**8 + buf[5];
  }
  return (Date.now() % 1_000_000_000) * 10_000 + Math.floor(Math.random() * 9000) + 1000;
}

// ─── FORMAT YARDIMCILARI ──────────────────────────────────────────────────

export const tl = (n: number): string =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

export const fd = (d?: string): string => {
  if (!d) return '—';
  const p = d.split('-');
  return p.length !== 3 ? d : `${p[2]}.${p[1]}.${p[0]}`;
};

export const today = (): string => new Date().toISOString().split('T')[0];

export const buHafta = (): { bas: string; bit: string } => {
  const now = new Date();
  const gun = now.getDay();
  const offset = gun === 0 ? 6 : gun - 1;
  const paz = new Date(now);
  paz.setHours(0, 0, 0, 0);
  paz.setDate(now.getDate() - offset);
  const pazar = new Date(paz);
  pazar.setDate(paz.getDate() + 6);
  return { bas: paz.toISOString().split('T')[0], bit: pazar.toISOString().split('T')[0] };
};

export const buAy = (): { bas: string; bit: string } => {
  const now = new Date();
  return {
    bas: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    bit: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
  };
};

export const birimUcret = (cesit: string, ayarlar: Ayarlar): number =>
  ({ '10luk': ayarlar.ucret10, '15lik': ayarlar.ucret15, '20lik': ayarlar.ucret20 } as Record<string,number>)[cesit] || 0;

export const yukBirimUcret = (tur: string, ayarlar: Ayarlar): number =>
  ({ yukleme: ayarlar.ucretYukleme, bosaltma: ayarlar.ucretBosaltma, dama_bosaltma: ayarlar.ucretDama, cimento: ayarlar.ucretCimento, cimento_indirme: ayarlar.ucretCimentoIndirme } as Record<string,number>)[tur] || 0;

// ─── SERVİS FONKSİYONLARI ────────────────────────────────────────────────

export function musteriAlacak(musteriId: number, data: AppData): number {
  const teslimatBorc = data.teslimatlar.filter(t => t.musteriId === musteriId).reduce((s, t) => s + (t.tutar - t.tahsil), 0);
  const gecmisBorc   = data.gecmisBorclar.filter(g => g.musteriId === musteriId).reduce((s, g) => s + g.tutar, 0);
  const musteriOdeme = data.musteriOdemeler.filter(o => o.musteriId === musteriId).reduce((s, o) => s + o.tutar, 0);
  const spotBorc     = data.spotSatislar.filter(x => x.musteriId === musteriId).reduce((s, x) => s + (x.tutar - x.tahsil), 0);
  const spotOdeme    = data.spotOdemeler.filter(o => o.musteriId === musteriId).reduce((s, o) => s + o.tutar, 0);
  return Math.max(0, teslimatBorc + gecmisBorc + spotBorc - musteriOdeme - spotOdeme);
}

export function isciKazancAralik(isciId: number, bas: string, bit: string, data: AppData): { ure: number; yuk: number; top: number } {
  const ure = data.uretimler.filter(u => u.tarih >= bas && u.tarih <= bit && u.isciler.includes(isciId)).reduce((s, u) => s + u.kisiBasiUcret, 0);
  const yuk = data.yuklemeler.filter(y => y.tarih >= bas && y.tarih <= bit && y.isciler.includes(isciId)).reduce((s, y) => s + y.kisiBasiUcret, 0);
  return { ure, yuk, top: ure + yuk };
}

export function isciToplamKazanc(isciId: number, data: AppData): { ure: number; yuk: number; top: number } {
  const ure = data.uretimler.filter(u => u.isciler.includes(isciId)).reduce((s, u) => s + u.kisiBasiUcret, 0);
  const yuk = data.yuklemeler.filter(y => y.isciler.includes(isciId)).reduce((s, y) => s + y.kisiBasiUcret, 0);
  return { ure, yuk, top: ure + yuk };
}

export function isciOdenenAralik(isciId: number, bas: string, bit: string, data: AppData): number {
  return data.avanslar.filter(a => a.isciId === isciId && a.tarih >= bas && a.tarih <= bit).reduce((s, a) => s + a.tutar, 0);
}

export function isciToplamOdenen(isciId: number, data: AppData): number {
  return data.avanslar.filter(a => a.isciId === isciId).reduce((s, a) => s + a.tutar, 0);
}

export function tedarikciBorc(tedarikciId: number, data: AppData): { alinan: number; odenen: number; kalan: number } {
  const alinan = data.malzemeler.filter(m => m.tedarikciId === tedarikciId).reduce((s, m) => s + m.toplamTutar, 0);
  const odenen = data.tedarikOdemeler.filter(o => o.tedarikciId === tedarikciId).reduce((s, o) => s + o.tutar, 0);
  return { alinan, odenen, kalan: alinan - odenen };
}

export function stokHesapla(data: AppData): Record<'10luk' | '15lik' | '20lik', number> {
  const u: Record<string, number> = { '10luk': 0, '15lik': 0, '20lik': 0 };
  const t: Record<string, number> = { '10luk': 0, '15lik': 0, '20lik': 0 };
  const s: Record<string, number> = { '10luk': 0, '15lik': 0, '20lik': 0 };
  for (const x of data.uretimler)   { if (x.cesit in u) u[x.cesit] += x.miktar; }
  for (const x of data.teslimatlar) { if (x.cesit in t) t[x.cesit] += x.adet; }
  for (const x of data.spotSatislar){ if (x.cesit in s) s[x.cesit] += x.adet; }
  return { '10luk': u['10luk']-t['10luk']-s['10luk'], '15lik': u['15lik']-t['15lik']-s['15lik'], '20lik': u['20lik']-t['20lik']-s['20lik'] };
}

export function localStorageBoyutu(): { kullanilanMB: number; yuzde: number; uyari: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const kullanilanMB = (raw.length * 2) / (1024 * 1024);
    const yuzde = Math.round((kullanilanMB / 5) * 100);
    return { kullanilanMB: Math.round(kullanilanMB * 100) / 100, yuzde, uyari: yuzde >= 70 };
  } catch { return { kullanilanMB: 0, yuzde: 0, uyari: false }; }
}

// ─── SABİT ETİKETLER ──────────────────────────────────────────────────────

export const SIP_CESIT_LABEL: Record<string, string> = { '10luk': "Briket 10'luk", '15lik': "Briket 15'lik", '20lik': "Briket 20'lik", cimento: 'Çimento', kum: 'Kum' };
export const SIP_BIRIM: Record<string, string> = { '10luk': 'adet', '15lik': 'adet', '20lik': 'adet', cimento: 'torba', kum: 'ton' };
export const TURADI: Record<string, string> = { cimento: 'Çimento', micir: 'Mıcır' };
export const GIDER_LABEL: Record<string, string> = { makine_bakim: 'Makine Bakım / Tamirat', kamyon_bakim: 'Kamyon Bakım / Tamirat', mazot: 'Mazot', diger: 'Diğer' };
export const PAGE_TITLES: Record<string, string> = { dashboard: 'GENEL BAKIŞ', uretim: 'GÜNLÜK ÜRETİM', yukleme: 'YÜKLEME / BOŞALTMA', isciler: 'İŞÇİ YÖNETİMİ', 'isci-detay': 'İŞÇİ PROFİLİ', siparisler: 'SİPARİŞLER', spotsatis: 'SPOT SATIŞ', musteriler: 'MÜŞTERİLER & BORÇ', malzeme: 'MALZEME GİRİŞİ', giderler: 'GİDERLER', koyler: 'KÖY / BÖLGE YÖNETİMİ', ayarlar: 'AYARLAR' };
export const KONUM_LABEL: Record<string, string> = { merkez: 'Merkez', yakin: 'Yakın', uzak: 'Uzak', yerinde: 'Yerinde' };
