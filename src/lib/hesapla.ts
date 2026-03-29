import type { AppData } from '@/types';

// ─── MÜŞTERİ ────────────────────────────────────────────────────────────────

export function musteriAlacak(mid: number, data: AppData): number {
  const tT = data.teslimatlar
    .filter(t => t.musteriId === mid)
    .reduce((s, t) => s + (t.tutar - t.tahsil), 0);
  const oT = data.musteriOdemeler
    .filter(o => o.musteriId === mid)
    .reduce((s, o) => s + o.tutar, 0);
  const sT = data.spotSatislar
    .filter(x => x.musteriId === mid)
    .reduce((s, x) => s + (x.tutar - x.tahsil), 0);
  const soT = data.spotOdemeler
    .filter(o => o.musteriId === mid)
    .reduce((s, o) => s + o.tutar, 0);
  return Math.max(0, tT + sT - oT - soT);
}

export function musteriToplamSatis(mid: number, data: AppData): number {
  return (
    data.teslimatlar
      .filter(t => t.musteriId === mid)
      .reduce((s, t) => s + t.tutar, 0) +
    data.spotSatislar
      .filter(x => x.musteriId === mid)
      .reduce((s, x) => s + x.tutar, 0)
  );
}

export function musteriToplamTahsil(mid: number, data: AppData): number {
  return (
    data.teslimatlar
      .filter(t => t.musteriId === mid)
      .reduce((s, t) => s + t.tahsil, 0) +
    data.musteriOdemeler
      .filter(o => o.musteriId === mid)
      .reduce((s, o) => s + o.tutar, 0) +
    data.spotSatislar
      .filter(x => x.musteriId === mid)
      .reduce((s, x) => s + x.tahsil, 0) +
    data.spotOdemeler
      .filter(o => o.musteriId === mid)
      .reduce((s, o) => s + o.tutar, 0)
  );
}

// ─── TEDARİKÇİ ───────────────────────────────────────────────────────────────

export function tedarikKalanBorc(tid: number, data: AppData): number {
  const alinan = data.malzemeler
    .filter(m => m.tedarikciId === tid)
    .reduce((s, m) => s + m.toplamTutar, 0);
  const odenen = data.tedarikOdemeler
    .filter(o => o.tedarikciId === tid)
    .reduce((s, o) => s + o.tutar, 0);
  return alinan - odenen;
}

export function tedarikToplamAlis(tid: number, data: AppData): number {
  return data.malzemeler
    .filter(m => m.tedarikciId === tid)
    .reduce((s, m) => s + m.toplamTutar, 0);
}

export function tedarikToplamOdenen(tid: number, data: AppData): number {
  return data.tedarikOdemeler
    .filter(o => o.tedarikciId === tid)
    .reduce((s, o) => s + o.tutar, 0);
}

// ─── İŞÇİ ────────────────────────────────────────────────────────────────────

export function isciKazanc(
  isciId: number,
  bas: string,
  bit: string,
  data: AppData
): { ure: number; yuk: number; top: number } {
  const ure = data.uretimler
    .filter(u => u.tarih >= bas && u.tarih <= bit && u.isciler.includes(isciId))
    .reduce((s, u) => s + u.kisiBasiUcret, 0);
  const yuk = data.yuklemeler
    .filter(y => y.tarih >= bas && y.tarih <= bit && y.isciler.includes(isciId))
    .reduce((s, y) => s + y.kisiBasiUcret, 0);
  return { ure, yuk, top: ure + yuk };
}

export function isciToplamKazanc(
  isciId: number,
  data: AppData
): { ure: number; yuk: number; top: number } {
  const ure = data.uretimler
    .filter(u => u.isciler.includes(isciId))
    .reduce((s, u) => s + u.kisiBasiUcret, 0);
  const yuk = data.yuklemeler
    .filter(y => y.isciler.includes(isciId))
    .reduce((s, y) => s + y.kisiBasiUcret, 0);
  return { ure, yuk, top: ure + yuk };
}

export function isciOdenen(
  isciId: number,
  bas: string,
  data: AppData
): number {
  return data.avanslar
    .filter(a => a.isciId === isciId && a.tarih >= bas)
    .reduce((s, a) => s + a.tutar, 0);
}

export function isciToplamOdenen(isciId: number, data: AppData): number {
  return data.avanslar
    .filter(a => a.isciId === isciId)
    .reduce((s, a) => s + a.tutar, 0);
}

// ─── STOK ────────────────────────────────────────────────────────────────────

export function tahminiStok(data: AppData): number {
  const toplamUretim = data.uretimler.reduce((s, u) => s + u.miktar, 0);
  const toplamSatis =
    data.teslimatlar.reduce((s, t) => s + t.adet, 0) +
    data.spotSatislar.reduce((s, x) => s + x.adet, 0);
  return Math.max(0, toplamUretim - toplamSatis);
}