'use client';
import { useEffect, useRef, useMemo } from 'react';
import type { AppData } from '@/types';
import {
  tl,
  fd,
  buHafta,
  buAy,
  musteriAlacak,
  isciKazancAralik,
  isciToplamOdenen,
  tedarikciBorc,
  stokHesapla,
} from '@/lib/storage';

interface DashboardProps {
  data: AppData;
}

// Chart.js CDN — modül düzeyinde tek sefer yüklenir
let chartJsLoaded = false;
let chartJsLoading = false;
const chartJsCallbacks: (() => void)[] = [];

function loadChartJs(cb: () => void) {
  if (chartJsLoaded) { cb(); return; }
  chartJsCallbacks.push(cb);
  if (chartJsLoading) return;
  chartJsLoading = true;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  script.onload = () => {
    chartJsLoaded = true;
    chartJsLoading = false;
    chartJsCallbacks.forEach((fn) => fn());
    chartJsCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

type ChartInstance = { destroy: () => void };

export default function Dashboard({ data }: DashboardProps) {
  const chart1Ref = useRef<HTMLCanvasElement>(null);
  const chart2Ref = useRef<HTMLCanvasElement>(null);
  const chart4Ref = useRef<HTMLCanvasElement>(null);
  const chart5Ref = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<Record<string, ChartInstance>>({});

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { bas: haftaBas }          = useMemo(() => buHafta(), []);
  const { bas: ayBas, bit: ayBit } = useMemo(() => buAy(), []);

  // ── Üretim ────────────────────────────────────────────────────────────────
  const bugunUretim = useMemo(
    () => data.uretimler.filter((u) => u.tarih === todayStr).reduce((s, u) => s + u.miktar, 0),
    [data.uretimler, todayStr]
  );
  const haftaUretim = useMemo(
    () => data.uretimler.filter((u) => u.tarih >= haftaBas).reduce((s, u) => s + u.miktar, 0),
    [data.uretimler, haftaBas]
  );

  // ── Stok ─────────────────────────────────────────────────────────────────
  const stok = useMemo(() => stokHesapla(data), [data]);
  const toplamStok = useMemo(
    () => Object.values(stok).reduce((s, v) => s + v, 0),
    [stok]
  );

  // ── Açık siparişler ───────────────────────────────────────────────────────
  const acikSiparisler = useMemo(
    () => data.siparisler.filter((s) => s.gonderilen < s.adet).length,
    [data.siparisler]
  );

  // ── Müşteri alacakları — O(n) önceden hesaplanmış map kullanılıyor ────────
  const musteriAlacakMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of data.musteriler) {
      map.set(m.id, musteriAlacak(m.id, data));
    }
    return map;
  }, [data]);

  const toplamAlacak = useMemo(
    () => Array.from(musteriAlacakMap.values()).reduce((s, v) => s + v, 0),
    [musteriAlacakMap]
  );

  // ── Bu ay nakit akışı ─────────────────────────────────────────────────────
  const ayHesap = useMemo(() => {
    const ayTes = data.teslimatlar.filter((t) => t.tarih >= ayBas && t.tarih <= ayBit);
    const aySpot = data.spotSatislar.filter((s) => s.tarih >= ayBas && s.tarih <= ayBit);

    const ayToplamGelir = ayTes.reduce((s, t) => s + t.tutar, 0)
      + aySpot.reduce((s, x) => s + x.tutar, 0);

    const ayTahsilat =
      ayTes.reduce((s, t) => s + t.tahsil, 0)
      + data.musteriOdemeler.filter((o) => o.tarih >= ayBas && o.tarih <= ayBit).reduce((s, o) => s + o.tutar, 0)
      + aySpot.reduce((s, x) => s + x.tahsil, 0)
      + data.spotOdemeler.filter((o) => o.tarih >= ayBas && o.tarih <= ayBit).reduce((s, o) => s + o.tutar, 0);

    const ayIsciOdeme = data.avanslar
      .filter((a) => a.tarih >= ayBas && a.tarih <= ayBit)
      .reduce((s, a) => s + a.tutar, 0);

    const ayMalzemeGider = data.malzemeler
      .filter((m) => m.tarih >= ayBas && m.tarih <= ayBit)
      .reduce((s, m) => s + m.toplamTutar, 0);

    const ayDigerGider = (data.giderler || [])
      .filter((g) => g.tarih >= ayBas && g.tarih <= ayBit)
      .reduce((s, g) => s + g.tutar, 0);

    const ayToplamGider = ayIsciOdeme + ayMalzemeGider + ayDigerGider;

    return {
      ayToplamGelir,
      ayTahsilat,
      ayIsciOdeme,
      ayMalzemeGider,
      ayDigerGider,
      ayToplamGider,
      ayNetKar: ayTahsilat - ayToplamGider,
    };
  }, [data, ayBas, ayBit]);

  // ── Bu hafta işçi borcu ───────────────────────────────────────────────────
  const haftaIsciBorc = useMemo(
    () =>
      data.isciler.reduce((s, i) => {
        const k = isciKazancAralik(i.id, haftaBas, new Date().toISOString().split('T')[0], data);
        const o = data.avanslar
          .filter((a) => a.isciId === i.id && a.tarih >= haftaBas)
          .reduce((x, a) => x + a.tutar, 0);
        return s + Math.max(0, k.top - o);
      }, 0),
    [data, haftaBas]
  );

  // ── İşçi tablo satırları ──────────────────────────────────────────────────
  const isciSatirlar = useMemo(() => {
    const bit = new Date().toISOString().split('T')[0];
    return data.isciler.map((i) => {
      const k = isciKazancAralik(i.id, haftaBas, bit, data);
      const o = data.avanslar
        .filter((a) => a.isciId === i.id && a.tarih >= haftaBas)
        .reduce((s, a) => s + a.tutar, 0);
      return { i, kazanc: k.top, odenen: o, kalan: k.top - o };
    });
  }, [data, haftaBas]);

  // ── Tedarikçi borcu ───────────────────────────────────────────────────────
  const tedarikBorclar = useMemo(
    () =>
      data.tedarikciListesi
        .filter((t) => t.tur !== 'diger')
        .map((t) => ({ isim: t.isim, kalan: tedarikciBorc(t.id, data).kalan }))
        .filter((t) => t.kalan > 0),
    [data]
  );
  const toplamTedarikBorc = useMemo(
    () => tedarikBorclar.reduce((s, t) => s + t.kalan, 0),
    [tedarikBorclar]
  );

  // ── Bugün teslimatlar ─────────────────────────────────────────────────────
  const bugunTeslimatlar = useMemo(
    () => data.teslimatlar.filter((t) => t.tarih === todayStr).slice(0, 5),
    [data.teslimatlar, todayStr]
  );

  // ── Borçlu müşteriler — önceden hesaplanan map kullanılıyor ───────────────
  const borcluMusteriler = useMemo(() => {
    return data.musteriler
      .map((m) => {
        const alacak = musteriAlacakMap.get(m.id) ?? 0;
        const sonIslem = [...data.teslimatlar]
          .filter((t) => t.musteriId === m.id)
          .sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
        return { m, alacak, sonIslem };
      })
      .filter((x) => x.alacak > 0)
      .sort((a, b) => b.alacak - a.alacak)
      .slice(0, 6);
  }, [data.musteriler, data.teslimatlar, musteriAlacakMap]);

  // ── Grafikler ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadChartJs(drawCharts);
    return () => {
      Object.values(chartsRef.current).forEach((c) => c.destroy());
      chartsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function dGunler(n: number): string[] {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return d.toISOString().split('T')[0];
    });
  }
  function dKisa(d: string): string {
    const p = d.split('-');
    return p[2] + '.' + p[1];
  }

  const C_GREEN       = 'rgba(45,122,79,0.70)';
  const C_GREEN_B     = '#2d7a4f';
  const C_GREEN_LIGHT = 'rgba(58,160,99,0.45)';
  const C_AMBER       = 'rgba(217,119,6,0.65)';
  const C_BLUE        = 'rgba(37,99,235,0.55)';
  const C_BLUE_B      = '#2563eb';
  const C_PURPLE      = 'rgba(139,92,246,0.55)';
  const C_SLATE       = 'rgba(148,163,184,0.55)';

  const tooltipStyle = {
    backgroundColor: '#2a2118',
    titleColor:      '#fdfaf7',
    bodyColor:       '#a0907c',
    borderColor:     '#ddd5c8',
    borderWidth:     1,
  };

  const axisStyle = {
    grid:  { color: 'rgba(221,213,200,0.5)' },
    ticks: { color: '#a0907c', font: { size: 10 } },
  };

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipStyle,
    },
    scales: {
      x: { grid: axisStyle.grid, ticks: axisStyle.ticks },
      y: { grid: axisStyle.grid, ticks: axisStyle.ticks, beginAtZero: true },
    },
  };

  type ChartConstructor = new (ctx: HTMLCanvasElement, config: unknown) => ChartInstance;

  function drawCharts() {
    const Chart = (window as unknown as Record<string, unknown>).Chart as ChartConstructor | undefined;
    if (!Chart) return;

    // Destroy existing
    Object.values(chartsRef.current).forEach((c) => c.destroy());
    chartsRef.current = {};

    const gunler = dGunler(14);

    if (chart1Ref.current) {
      chartsRef.current.c1 = new Chart(chart1Ref.current, {
        type: 'bar',
        data: {
          labels: gunler.map(dKisa),
          datasets: [{
            label: 'Üretim (adet)',
            data: gunler.map((g) =>
              data.uretimler.filter((u) => u.tarih === g).reduce((s, u) => s + u.miktar, 0)
            ),
            backgroundColor: C_GREEN,
            borderColor: C_GREEN_B,
            borderWidth: 0,
            borderRadius: 4,
          }],
        },
        options: { ...chartDefaults },
      });
    }

    if (chart2Ref.current) {
      chartsRef.current.c2 = new Chart(chart2Ref.current, {
        type: 'bar',
        data: {
          labels: gunler.map(dKisa),
          datasets: [
            {
              label: 'Sipariş Teslimat',
              data: gunler.map((g) =>
                data.teslimatlar.filter((t) => t.tarih === g).reduce((s, t) => s + t.adet, 0)
              ),
              backgroundColor: C_BLUE,
              borderRadius: 3,
            },
            {
              label: 'Spot Satış',
              data: gunler.map((g) =>
                data.spotSatislar.filter((x) => x.tarih === g).reduce((s, x) => s + x.adet, 0)
              ),
              backgroundColor: C_GREEN_LIGHT,
              borderRadius: 3,
            },
          ],
        },
        options: {
          ...chartDefaults,
          plugins: {
            legend: {
              display: true,
              labels: { color: '#5c4f3d', font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: tooltipStyle,
          },
        },
      });
    }

    if (chart4Ref.current) {
      const ayAd = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
      const now2 = new Date();
      const aylar = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now2.getFullYear(), now2.getMonth() - (5 - i), 1);
        return {
          str: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
          lbl: ayAd[d.getMonth()],
        };
      });
      chartsRef.current.c4 = new Chart(chart4Ref.current, {
        type: 'bar',
        data: {
          labels: aylar.map((a) => a.lbl),
          datasets: [
            {
              label: 'Toplam Satış',
              data: aylar.map((a) =>
                data.teslimatlar.filter((t) => t.tarih.startsWith(a.str)).reduce((s, t) => s + t.tutar, 0)
                + data.spotSatislar.filter((x) => x.tarih.startsWith(a.str)).reduce((s, x) => s + x.tutar, 0)
              ),
              backgroundColor: C_BLUE,
              borderColor: C_BLUE_B,
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Tahsilat',
              data: aylar.map((a) =>
                data.teslimatlar.filter((t) => t.tarih.startsWith(a.str)).reduce((s, t) => s + t.tahsil, 0)
                + data.musteriOdemeler.filter((o) => o.tarih.startsWith(a.str)).reduce((s, o) => s + o.tutar, 0)
                + data.spotSatislar.filter((x) => x.tarih.startsWith(a.str)).reduce((s, x) => s + x.tahsil, 0)
                + data.spotOdemeler.filter((o) => o.tarih.startsWith(a.str)).reduce((s, o) => s + o.tutar, 0)
              ),
              backgroundColor: C_GREEN,
              borderColor: C_GREEN_B,
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          ...chartDefaults,
          plugins: {
            legend: {
              display: true,
              labels: { color: '#5c4f3d', font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: tooltipStyle,
          },
        },
      });
    }

    if (chart5Ref.current) {
      const { ayIsciOdeme, ayMalzemeGider } = ayHesap;
      const ayGiderler = (data.giderler || []).filter(
        (g) => g.tarih >= ayBas && g.tarih <= ayBit
      );
      chartsRef.current.c5 = new Chart(chart5Ref.current, {
        type: 'doughnut',
        data: {
          labels: ['Makine Bakım', 'Kamyon Bakım', 'Mazot', 'İşçi Ödemeleri', 'Malzeme', 'Diğer'],
          datasets: [{
            data: [
              ayGiderler.filter((g) => g.kategori === 'makine_bakim').reduce((s, g) => s + g.tutar, 0),
              ayGiderler.filter((g) => g.kategori === 'kamyon_bakim').reduce((s, g) => s + g.tutar, 0),
              ayGiderler.filter((g) => g.kategori === 'mazot').reduce((s, g) => s + g.tutar, 0),
              ayIsciOdeme,
              ayMalzemeGider,
              ayGiderler.filter((g) => g.kategori === 'diger').reduce((s, g) => s + g.tutar, 0),
            ],
            backgroundColor: [C_AMBER, C_GREEN, C_GREEN_LIGHT, C_BLUE, C_PURPLE, C_SLATE],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: { color: '#5c4f3d', font: { size: 10 }, boxWidth: 10 },
            },
            tooltip: tooltipStyle,
          },
        },
      });
    }
  }

  const { ayToplamGelir, ayTahsilat, ayToplamGider, ayNetKar, ayIsciOdeme, ayMalzemeGider, ayDigerGider } = ayHesap;

  return (
    <div>
      {/* ── Ana Stat Kartları ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-label">Bugün Üretim</div>
          <div className="stat-value c-accent">{bugunUretim.toLocaleString('tr-TR')}</div>
          <div className="stat-sub">adet briket</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bu Hafta Üretim</div>
          <div className="stat-value">{haftaUretim.toLocaleString('tr-TR')}</div>
          <div className="stat-sub">adet</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Açık Siparişler</div>
          <div className="stat-value c-blue">{acikSiparisler}</div>
          <div className="stat-sub">bekleyen</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Müşteri Alacağı</div>
          <div className="stat-value c-red">{Math.round(toplamAlacak).toLocaleString('tr-TR')}</div>
          <div className="stat-sub">TL</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mevcut Stok</div>
          <div className={`stat-value ${toplamStok > 0 ? 'c-accent' : 'c-red'}`}>
            {toplamStok.toLocaleString('tr-TR')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
            {(['10luk', '15lik', '20lik'] as const).map((c) => (
              <span key={c} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text3)' }}>
                {c}:{' '}
                <span style={{ color: stok[c] > 0 ? 'var(--accent)' : 'var(--red)', fontWeight: 600 }}>
                  {stok[c].toLocaleString('tr-TR')}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grafikler: Üretim + Satış ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Son 14 Gün — Üretim</div></div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart1Ref} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Son 14 Gün — Satış (Adet)</div></div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart2Ref} />
          </div>
        </div>
      </div>

      {/* ── Bu Ay Nakit Akışı ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header"><div className="panel-title">Bu Ay — Nakit Akışı</div></div>
        <div className="panel-body">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Toplam Satış</div>
              <div className="stat-value c-accent" style={{ fontSize: 20 }}>{tl(ayToplamGelir)}</div>
              <div className="stat-sub">faturalanan</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tahsilat</div>
              <div className="stat-value c-green" style={{ fontSize: 20 }}>{tl(ayTahsilat)}</div>
              <div className="stat-sub">nakit giren</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Toplam Gider</div>
              <div className="stat-value c-red" style={{ fontSize: 20 }}>{tl(ayToplamGider)}</div>
              <div className="stat-sub">işçi + malzeme + diğer</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net (Tahsilat − Gider)</div>
              <div className={`stat-value ${ayNetKar >= 0 ? 'c-green' : 'c-red'}`} style={{ fontSize: 20 }}>
                {tl(ayNetKar)}
              </div>
              <div className="stat-sub">tahmini</div>
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12,
            padding: '10px 14px', background: 'var(--surface2)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span style={{ color: 'var(--text3)', marginRight: 4 }}>Gider dağılımı:</span>
            <span>İşçi <span style={{ color: 'var(--red)' }}>{tl(ayIsciOdeme)}</span></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>Malzeme <span style={{ color: 'var(--red)' }}>{tl(ayMalzemeGider)}</span></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>Diğer <span style={{ color: 'var(--red)' }}>{tl(ayDigerGider)}</span></span>
          </div>
        </div>
      </div>

      {/* ── Tahsilat Grafiği + Gider Donut ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Aylık Tahsilat vs Satış</div></div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart4Ref} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Bu Ay Gider Dağılımı</div></div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart5Ref} />
          </div>
        </div>
      </div>

      {/* ── İşçi + Tedarikçi Borç ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Bu Hafta İşçi Durumu</div>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
              Toplam borç: <strong style={{ color: 'var(--red)' }}>{tl(haftaIsciBorc)}</strong>
            </span>
          </div>
          <div className="panel-body-0">
            <table>
              <thead>
                <tr><th>İşçi</th><th>Kazanç</th><th>Ödenen</th><th>Kalan</th></tr>
              </thead>
              <tbody>
                {isciSatirlar.length === 0 ? (
                  <tr><td colSpan={4} className="empty">İşçi yok</td></tr>
                ) : isciSatirlar.map(({ i, kazanc, odenen, kalan }) => (
                  <tr key={i.id}>
                    <td className="td-bold">{i.isim}</td>
                    <td className="td-mono">{tl(kazanc)}</td>
                    <td className="td-mono positive">{tl(odenen)}</td>
                    <td className={`td-mono ${kalan > 0 ? 'positive' : ''}`}>{tl(kalan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Tedarikçi Borç Durumu</div>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
              Toplam: <strong style={{ color: 'var(--red)' }}>{tl(toplamTedarikBorc)}</strong>
            </span>
          </div>
          <div className="panel-body-0">
            <table>
              <thead><tr><th>Tedarikçi</th><th>Kalan Borç</th></tr></thead>
              <tbody>
                {tedarikBorclar.length === 0 ? (
                  <tr><td colSpan={2} className="empty">Borç yok</td></tr>
                ) : tedarikBorclar.map((t) => (
                  <tr key={t.isim}>
                    <td className="td-bold">{t.isim}</td>
                    <td className="td-mono negative">{tl(t.kalan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Bugün Teslimatlar + Borçlu Müşteriler ── */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Bugün Teslimatlar</div></div>
          <div className="panel-body-0">
            <table>
              <thead><tr><th>Müşteri</th><th>Ürün</th><th>Tutar</th><th>Durum</th></tr></thead>
              <tbody>
                {bugunTeslimatlar.length === 0 ? (
                  <tr><td colSpan={4} className="empty">Bugün teslimat yok</td></tr>
                ) : bugunTeslimatlar.map((t) => {
                  const m = data.musteriler.find((x) => x.id === t.musteriId);
                  const k = t.tutar - t.tahsil;
                  return (
                    <tr key={t.id}>
                      <td className="td-bold">{m?.isim || '?'}</td>
                      <td><span className="badge b-yellow">{t.cesit}</span></td>
                      <td className="td-mono">{tl(t.tutar)}</td>
                      <td>
                        <span className={`badge ${k <= 0 ? 'b-green' : t.tahsil > 0 ? 'b-yellow' : 'b-red'}`}>
                          {k <= 0 ? 'Ödendi' : t.tahsil > 0 ? 'Kısmi' : 'Borçlu'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">Borçlu Müşteriler</div></div>
          <div className="panel-body-0">
            <table>
              <thead><tr><th>Müşteri</th><th>Köy</th><th>Alacak</th><th>Son İşlem</th></tr></thead>
              <tbody>
                {borcluMusteriler.length === 0 ? (
                  <tr><td colSpan={4} className="empty">Borçlu müşteri yok</td></tr>
                ) : borcluMusteriler.map(({ m, alacak, sonIslem }) => (
                  <tr key={m.id}>
                    <td className="td-bold">{m.isim}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{m.koy || m.bolge || '—'}</td>
                    <td className="td-mono negative">{tl(alacak)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {sonIslem ? fd(sonIslem.tarih) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}