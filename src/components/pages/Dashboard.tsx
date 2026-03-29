'use client';
import { useEffect, useRef } from 'react';
import type { AppData } from '@/types';
import { tl, fd, buHafta, buAy } from '@/lib/storage';

interface DashboardProps {
  data: AppData;
}

export default function Dashboard({ data }: DashboardProps) {
  const chart1Ref = useRef<HTMLCanvasElement>(null);
  const chart2Ref = useRef<HTMLCanvasElement>(null);
  const chart4Ref = useRef<HTMLCanvasElement>(null);
  const chart5Ref = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<Record<string, unknown>>({});

  const today = new Date().toISOString().split('T')[0];
  const { bas: haftaBas } = buHafta();
  const { bas: ayBas, bit: ayBit } = buAy();

  // ── Üretim ──────────────────────────────────────────────────────────────
  const bugunUretim = data.uretimler
    .filter(u => u.tarih === today)
    .reduce((s, u) => s + u.miktar, 0);

  const haftaUretim = data.uretimler
    .filter(u => u.tarih >= haftaBas)
    .reduce((s, u) => s + u.miktar, 0);

  // ── Satış & Alacak ───────────────────────────────────────────────────────
  const acikSiparisler = data.siparisler.filter(s => s.gonderilen < s.adet).length;

  const toplamAlacak = data.musteriler.reduce((s, m) => {
    const tT = data.teslimatlar.filter(t => t.musteriId === m.id).reduce((a, t) => a + (t.tutar - t.tahsil), 0);
    const oT = data.musteriOdemeler.filter(o => o.musteriId === m.id).reduce((a, o) => a + o.tutar, 0);
    const sT = data.spotSatislar.filter(x => x.musteriId === m.id).reduce((a, x) => a + (x.tutar - x.tahsil), 0);
    const soT = data.spotOdemeler.filter(o => o.musteriId === m.id).reduce((a, o) => a + o.tutar, 0);
    return s + Math.max(0, tT + sT - oT - soT);
  }, 0);

  // ── Bu ay nakit akışı ────────────────────────────────────────────────────
  const ayTeslimatGelir = data.teslimatlar
    .filter(t => t.tarih >= ayBas && t.tarih <= ayBit)
    .reduce((s, t) => s + t.tutar, 0);
  const aySpotGelir = data.spotSatislar
    .filter(s => s.tarih >= ayBas && s.tarih <= ayBit)
    .reduce((s, x) => s + x.tutar, 0);
  const ayToplamGelir = ayTeslimatGelir + aySpotGelir;

  const ayTahsilat = [
    ...data.teslimatlar.filter(t => t.tarih >= ayBas && t.tarih <= ayBit).map(t => t.tahsil),
    ...data.musteriOdemeler.filter(o => o.tarih >= ayBas && o.tarih <= ayBit).map(o => o.tutar),
    ...data.spotSatislar.filter(s => s.tarih >= ayBas && s.tarih <= ayBit).map(s => s.tahsil),
    ...data.spotOdemeler.filter(o => o.tarih >= ayBas && o.tarih <= ayBit).map(o => o.tutar),
  ].reduce((s, x) => s + x, 0);

  const ayIsciOdeme = data.avanslar
    .filter(a => a.tarih >= ayBas && a.tarih <= ayBit)
    .reduce((s, a) => s + a.tutar, 0);

  const ayMalzemeGider = data.malzemeler
    .filter(m => m.tarih >= ayBas && m.tarih <= ayBit)
    .reduce((s, m) => s + m.toplamTutar, 0);

  const ayDigerGider = (data.giderler || [])
    .filter(g => g.tarih >= ayBas && g.tarih <= ayBit)
    .reduce((s, g) => s + g.tutar, 0);

  const ayToplamGider = ayIsciOdeme + ayMalzemeGider + ayDigerGider;
  const ayNetKar = ayTahsilat - ayToplamGider;

  // ── Bu hafta işçi ────────────────────────────────────────────────────────
  const haftaIsciBorc = data.isciler.reduce((s, i) => {
    const kazanc =
      data.uretimler.filter(u => u.tarih >= haftaBas && u.isciler.includes(i.id)).reduce((a, u) => a + u.kisiBasiUcret, 0) +
      data.yuklemeler.filter(y => y.tarih >= haftaBas && y.isciler.includes(i.id)).reduce((a, y) => a + y.kisiBasiUcret, 0);
    const odenen = data.avanslar.filter(a => a.isciId === i.id && a.tarih >= haftaBas).reduce((a, x) => a + x.tutar, 0);
    return s + Math.max(0, kazanc - odenen);
  }, 0);

  // ── Tedarikçi borcu ──────────────────────────────────────────────────────
  const tedarikBorc = data.tedarikciListesi
    .filter(t => t.tur !== 'diger')
    .map(t => {
      const alinan = data.malzemeler.filter(m => m.tedarikciId === t.id).reduce((s, m) => s + m.toplamTutar, 0);
      const odenen = data.tedarikOdemeler.filter(o => o.tedarikciId === t.id).reduce((s, o) => s + o.tutar, 0);
      return { isim: t.isim, kalan: alinan - odenen };
    })
    .filter(t => t.kalan > 0);

  const toplamTedarikBorc = tedarikBorc.reduce((s, t) => s + t.kalan, 0);

  // ── Bugün teslimatlar ────────────────────────────────────────────────────
  const bugunTeslimatlar = data.teslimatlar
    .filter(t => t.tarih === today)
    .slice(0, 5);

  // ── Borçlu müşteriler ────────────────────────────────────────────────────
  const borcluMusteriler = data.musteriler
    .map(m => {
      const tT = data.teslimatlar.filter(t => t.musteriId === m.id).reduce((a, t) => a + (t.tutar - t.tahsil), 0);
      const oT = data.musteriOdemeler.filter(o => o.musteriId === m.id).reduce((a, o) => a + o.tutar, 0);
      const sT = data.spotSatislar.filter(x => x.musteriId === m.id).reduce((a, x) => a + (x.tutar - x.tahsil), 0);
      const soT = data.spotOdemeler.filter(o => o.musteriId === m.id).reduce((a, o) => a + o.tutar, 0);
      const alacak = Math.max(0, tT + sT - oT - soT);
      const sonIslem = [...data.teslimatlar]
        .filter(t => t.musteriId === m.id)
        .sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
      return { m, alacak, sonIslem };
    })
    .filter(x => x.alacak > 0)
    .sort((a, b) => b.alacak - a.alacak)
    .slice(0, 6);

  // ── Grafikler ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = () => drawCharts();
    if ((window as Record<string, unknown>).Chart) {
      load();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      script.onload = load;
      document.head.appendChild(script);
    }
    return () => {
      Object.values(chartsRef.current).forEach((c: unknown) => {
        if (c && typeof (c as { destroy: () => void }).destroy === 'function')
          (c as { destroy: () => void }).destroy();
      });
    };
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

  // Grafik renkleri — uygulamanın CSS değişkenleriyle uyumlu
  const C_GREEN       = 'rgba(45,122,79,0.70)';
  const C_GREEN_B     = '#2d7a4f';
  const C_GREEN_LIGHT = 'rgba(58,160,99,0.45)';
  const C_AMBER       = 'rgba(217,119,6,0.65)';
  const C_BLUE        = 'rgba(37,99,235,0.55)';
  const C_BLUE_B      = '#2563eb';
  const C_RED         = 'rgba(184,60,43,0.55)';
  const C_PURPLE      = 'rgba(139,92,246,0.55)';
  const C_SLATE       = 'rgba(148,163,184,0.55)';

  // Tooltip ve eksen renkleri — uygulamanın sıcak paletinden
  const tooltipStyle = {
    backgroundColor: '#2a2118',   // --text
    titleColor:      '#fdfaf7',   // --surface
    bodyColor:       '#a0907c',   // --text3
    borderColor:     '#ddd5c8',   // --border
    borderWidth:     1,
  };

  const axisStyle = {
    grid:  { color: 'rgba(221,213,200,0.5)' },   // --border hafif
    ticks: { color: '#a0907c', font: { size: 10 } }, // --text3
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

  function drawCharts() {
    const Chart = (window as Record<string, unknown>).Chart as {
      new(ctx: HTMLCanvasElement, config: unknown): unknown;
    };
    if (!Chart) return;

    Object.values(chartsRef.current).forEach((c: unknown) => {
      if (c && typeof (c as { destroy: () => void }).destroy === 'function')
        (c as { destroy: () => void }).destroy();
    });

    const gunler = dGunler(14);

    // Chart 1 — Üretim
    if (chart1Ref.current) {
      chartsRef.current.c1 = new Chart(chart1Ref.current, {
        type: 'bar',
        data: {
          labels: gunler.map(dKisa),
          datasets: [{
            label: 'Üretim (adet)',
            data: gunler.map(g =>
              data.uretimler.filter(u => u.tarih === g).reduce((s, u) => s + u.miktar, 0)
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

    // Chart 2 — Satış
    if (chart2Ref.current) {
      chartsRef.current.c2 = new Chart(chart2Ref.current, {
        type: 'bar',
        data: {
          labels: gunler.map(dKisa),
          datasets: [
            {
              label: 'Sipariş Teslimat',
              data: gunler.map(g =>
                data.teslimatlar.filter(t => t.tarih === g).reduce((s, t) => s + t.adet, 0)
              ),
              backgroundColor: C_BLUE,
              borderRadius: 3,
            },
            {
              label: 'Spot Satış',
              data: gunler.map(g =>
                data.spotSatislar.filter(s => s.tarih === g).reduce((s, x) => s + x.adet, 0)
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
              labels: { color: '#5c4f3d', font: { size: 11 }, boxWidth: 12 }, // --text2
            },
            tooltip: tooltipStyle,
          },
        },
      });
    }

    // Chart 4 — Aylık Tahsilat vs Satış
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
          labels: aylar.map(a => a.lbl),
          datasets: [
            {
              label: 'Toplam Satış',
              data: aylar.map(a =>
                data.teslimatlar.filter(t => t.tarih.startsWith(a.str)).reduce((s, t) => s + t.tutar, 0) +
                data.spotSatislar.filter(s => s.tarih.startsWith(a.str)).reduce((s, x) => s + x.tutar, 0)
              ),
              backgroundColor: C_BLUE,
              borderColor: C_BLUE_B,
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Tahsilat',
              data: aylar.map(a =>
                data.teslimatlar.filter(t => t.tarih.startsWith(a.str)).reduce((s, t) => s + t.tahsil, 0) +
                data.musteriOdemeler.filter(o => o.tarih.startsWith(a.str)).reduce((s, o) => s + o.tutar, 0) +
                data.spotSatislar.filter(s => s.tarih.startsWith(a.str)).reduce((s, x) => s + x.tahsil, 0) +
                data.spotOdemeler.filter(o => o.tarih.startsWith(a.str)).reduce((s, o) => s + o.tutar, 0)
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

    // Chart 5 — Bu ay gider dağılımı (donut)
    if (chart5Ref.current) {
      const ayGiderler = (data.giderler || []).filter(g => g.tarih >= ayBas && g.tarih <= ayBit);
      const katLabels = ['Makine Bakım', 'Kamyon Bakım', 'Mazot', 'İşçi Ödemeleri', 'Malzeme', 'Diğer'];
      const katData = [
        ayGiderler.filter(g => g.kategori === 'makine_bakim').reduce((s, g) => s + g.tutar, 0),
        ayGiderler.filter(g => g.kategori === 'kamyon_bakim').reduce((s, g) => s + g.tutar, 0),
        ayGiderler.filter(g => g.kategori === 'mazot').reduce((s, g) => s + g.tutar, 0),
        ayIsciOdeme,
        ayMalzemeGider,
        ayGiderler.filter(g => g.kategori === 'diger').reduce((s, g) => s + g.tutar, 0),
      ];
      chartsRef.current.c5 = new Chart(chart5Ref.current, {
        type: 'doughnut',
        data: {
          labels: katLabels,
          datasets: [{
            data: katData,
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

  return (
    <div>
      {/* ── Ana Stat Kartları ── */}
      <div className="stat-grid">
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
      </div>

      {/* ── Grafikler: Üretim + Satış ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Son 14 Gün — Üretim</div>
          </div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart1Ref} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Son 14 Gün — Satış (Adet)</div>
          </div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart2Ref} />
          </div>
        </div>
      </div>

      {/* ── Bu Ay Nakit Akışı ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title">Bu Ay — Nakit Akışı</div>
        </div>
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

          {/* Gider detay satırı */}
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 12,
            padding: '10px 14px',
            background: 'var(--surface2)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span style={{ color: 'var(--text3)', marginRight: 4 }}>Gider dağılımı:</span>
            <span>İşçi <span style={{ color: 'var(--red)' }}>{tl(ayIsciOdeme)}</span></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>Malzeme <span style={{ color: 'var(--red)' }}>{tl(ayMalzemeGider)}</span></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>Diğer Giderler <span style={{ color: 'var(--red)' }}>{tl(ayDigerGider)}</span></span>
          </div>
        </div>
      </div>

      {/* ── Tahsilat Grafiği + Gider Donut ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Aylık Tahsilat vs Satış</div>
          </div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 220 }}>
            <canvas ref={chart4Ref} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Bu Ay Gider Dağılımı</div>
          </div>
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
                {data.isciler.length === 0 ? (
                  <tr><td colSpan={4} className="empty">İşçi yok</td></tr>
                ) : data.isciler.map(i => {
                  const kazanc =
                    data.uretimler
                      .filter(u => u.tarih >= haftaBas && u.isciler.includes(i.id))
                      .reduce((s, u) => s + u.kisiBasiUcret, 0) +
                    data.yuklemeler
                      .filter(y => y.tarih >= haftaBas && y.isciler.includes(i.id))
                      .reduce((s, y) => s + y.kisiBasiUcret, 0);
                  const odenen = data.avanslar
                    .filter(a => a.isciId === i.id && a.tarih >= haftaBas)
                    .reduce((s, a) => s + a.tutar, 0);
                  const kalan = kazanc - odenen;
                  return (
                    <tr key={i.id}>
                      <td className="td-bold">{i.isim}</td>
                      <td className="td-mono">{tl(kazanc)}</td>
                      <td className="td-mono positive">{tl(odenen)}</td>
                      <td className={`td-mono ${kalan > 0 ? 'positive' : ''}`}>{tl(kalan)}</td>
                    </tr>
                  );
                })}
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
              <thead>
                <tr><th>Tedarikçi</th><th>Kalan Borç</th></tr>
              </thead>
              <tbody>
                {tedarikBorc.length === 0 ? (
                  <tr><td colSpan={2} className="empty">Borç yok</td></tr>
                ) : tedarikBorc.map(t => (
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
          <div className="panel-header">
            <div className="panel-title">Bugün Teslimatlar</div>
          </div>
          <div className="panel-body-0">
            <table>
              <thead>
                <tr><th>Müşteri</th><th>Ürün</th><th>Tutar</th><th>Durum</th></tr>
              </thead>
              <tbody>
                {bugunTeslimatlar.length === 0 ? (
                  <tr><td colSpan={4} className="empty">Bugün teslimat yok</td></tr>
                ) : bugunTeslimatlar.map(t => {
                  const m = data.musteriler.find(x => x.id === t.musteriId);
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
          <div className="panel-header">
            <div className="panel-title">Borçlu Müşteriler</div>
          </div>
          <div className="panel-body-0">
            <table>
              <thead>
                <tr><th>Müşteri</th><th>Köy</th><th>Alacak</th><th>Son İşlem</th></tr>
              </thead>
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