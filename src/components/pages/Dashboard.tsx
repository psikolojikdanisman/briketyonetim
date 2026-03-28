'use client';
import { useEffect, useRef } from 'react';
import type { AppData } from '@/types';
import { tl, fd } from '@/lib/storage';

interface DashboardProps {
  data: AppData;
}

export default function Dashboard({ data }: DashboardProps) {
  const chart1Ref = useRef<HTMLCanvasElement>(null);
  const chart2Ref = useRef<HTMLCanvasElement>(null);
  const chart3Ref = useRef<HTMLCanvasElement>(null);
  const chart4Ref = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<Record<string, unknown>>({});

  const today = new Date().toISOString().split('T')[0];
  const haftaBas = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().split('T')[0];
  })();

  const bugunUretim = data.uretimler
    .filter((u) => u.tarih === today)
    .reduce((s, u) => s + u.miktar, 0);

  const haftaUretim = data.uretimler
    .filter((u) => u.tarih >= haftaBas)
    .reduce((s, u) => s + u.miktar, 0);

  const acikSiparisler = data.siparisler.filter(
    (s) => s.gonderilen < s.adet
  ).length;

  const toplamAlacak = data.musteriler.reduce((s, m) => {
    const tT = data.teslimatlar
      .filter((t) => t.musteriId === m.id)
      .reduce((a, t) => a + (t.tutar - t.tahsil), 0);
    const oT = data.musteriOdemeler
      .filter((o) => o.musteriId === m.id)
      .reduce((a, o) => a + o.tutar, 0);
    return s + Math.max(0, tT - oT);
  }, 0);

  // Son üretimler (5 adet)
  const sonUretimler = [...data.uretimler]
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, 5);

  // Bekleyen siparişler
  const bekleyenSiparisler = data.siparisler
    .filter((s) => s.gonderilen < s.adet)
    .slice(0, 5);

  // Borçlu müşteriler
  const borcluMusteriler = data.musteriler
    .map((m) => {
      const tT = data.teslimatlar
        .filter((t) => t.musteriId === m.id)
        .reduce((a, t) => a + (t.tutar - t.tahsil), 0);
      const oT = data.musteriOdemeler
        .filter((o) => o.musteriId === m.id)
        .reduce((a, o) => a + o.tutar, 0);
      const alacak = Math.max(0, tT - oT);
      const sonIslem = [...data.teslimatlar]
        .filter((t) => t.musteriId === m.id)
        .sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
      return { m, alacak, sonIslem };
    })
    .filter((x) => x.alacak > 0)
    .sort((a, b) => b.alacak - a.alacak)
    .slice(0, 6);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = () => drawCharts();
    if ((window as Record<string, unknown>).Chart) {
      drawCharts();
    } else {
      document.head.appendChild(script);
    }
    return () => {
      Object.values(chartsRef.current).forEach((c: unknown) => {
        if (c && typeof (c as { destroy: () => void }).destroy === 'function') {
          (c as { destroy: () => void }).destroy();
        }
      });
    };
  }, [data]);

  function dGunler(n: number): string[] {
    const arr = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  }

  function dKisaTarih(d: string): string {
    const p = d.split('-');
    return p[2] + '.' + p[1];
  }

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e3235',
        titleColor: '#d0f0ee',
        bodyColor: '#7abcba',
        borderColor: '#2a4a4e',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(42,74,78,.4)' },
        ticks: { color: '#3d7070', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(42,74,78,.4)' },
        ticks: { color: '#7abcba', font: { size: 10 } },
        beginAtZero: true,
      },
    },
  };

  function drawCharts() {
    const Chart = (window as Record<string, unknown>).Chart as {
      new (ctx: HTMLCanvasElement, config: unknown): unknown;
    };
    if (!Chart) return;

    Object.values(chartsRef.current).forEach((c: unknown) => {
      if (c && typeof (c as { destroy: () => void }).destroy === 'function') {
        (c as { destroy: () => void }).destroy();
      }
    });

    const gunler = dGunler(14);

    // Chart 1 - Üretim
    if (chart1Ref.current) {
      chartsRef.current.c1 = new Chart(chart1Ref.current, {
        type: 'bar',
        data: {
          labels: gunler.map(dKisaTarih),
          datasets: [
            {
              label: 'Üretim (adet)',
              data: gunler.map((g) =>
                data.uretimler
                  .filter((u) => u.tarih === g)
                  .reduce((s, u) => s + u.miktar, 0)
              ),
              backgroundColor: 'rgba(46,196,182,.55)',
              borderColor: '#2ec4b6',
              borderWidth: 0,
              borderRadius: 4,
            },
          ],
        },
        options: { ...chartDefaults },
      });
    }

    // Chart 2 - Satış
    if (chart2Ref.current) {
      chartsRef.current.c2 = new Chart(chart2Ref.current, {
        type: 'bar',
        data: {
          labels: gunler.map(dKisaTarih),
          datasets: [
            {
              label: 'Sipariş Teslimat',
              data: gunler.map((g) =>
                data.teslimatlar
                  .filter((t) => t.tarih === g)
                  .reduce((s, t) => s + t.adet, 0)
              ),
              backgroundColor: 'rgba(106,176,216,.6)',
              borderRadius: 3,
            },
            {
              label: 'Spot Satış',
              data: gunler.map((g) =>
                data.spotSatislar
                  .filter((s) => s.tarih === g)
                  .reduce((s, x) => s + x.adet, 0)
              ),
              backgroundColor: 'rgba(77,217,172,.6)',
              borderRadius: 3,
            },
          ],
        },
        options: {
          ...chartDefaults,
          plugins: {
            legend: {
              display: true,
              labels: { color: '#7abcba', font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: chartDefaults.plugins.tooltip,
          },
        },
      });
    }

    // Chart 3 - Çeşit
    if (chart3Ref.current) {
      const sinir = new Date();
      sinir.setDate(sinir.getDate() - 29);
      const sinirStr = sinir.toISOString().split('T')[0];
      chartsRef.current.c3 = new Chart(chart3Ref.current, {
        type: 'bar',
        data: {
          labels: ["10'luk", "15'lik", "20'lik"],
          datasets: [
            {
              data: ['10luk', '15lik', '20lik'].map((c) =>
                data.uretimler
                  .filter((u) => u.tarih >= sinirStr && u.cesit === c)
                  .reduce((s, u) => s + u.miktar, 0)
              ),
              backgroundColor: [
                'rgba(106,176,216,.7)',
                'rgba(46,196,182,.7)',
                'rgba(77,217,172,.7)',
              ],
              borderColor: ['#6ab0d8', '#2ec4b6', '#4dd9ac'],
              borderWidth: 1,
              borderRadius: 5,
            },
          ],
        },
        options: {
          ...chartDefaults,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: chartDefaults.plugins.tooltip,
          },
        },
      });
    }

    // Chart 4 - Tahsilat
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
                data.teslimatlar
                  .filter((t) => t.tarih.startsWith(a.str))
                  .reduce((s, t) => s + t.tutar, 0) +
                data.spotSatislar
                  .filter((s) => s.tarih.startsWith(a.str))
                  .reduce((s, x) => s + x.tutar, 0)
              ),
              backgroundColor: 'rgba(106,176,216,.5)',
              borderColor: '#6ab0d8',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Tahsilat',
              data: aylar.map((a) =>
                data.teslimatlar
                  .filter((t) => t.tarih.startsWith(a.str))
                  .reduce((s, t) => s + t.tahsil, 0) +
                data.musteriOdemeler
                  .filter((o) => o.tarih.startsWith(a.str))
                  .reduce((s, o) => s + o.tutar, 0)
              ),
              backgroundColor: 'rgba(77,217,172,.6)',
              borderColor: '#4dd9ac',
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
              labels: { color: '#7abcba', font: { size: 11 }, boxWidth: 12 },
            },
            tooltip: chartDefaults.plugins.tooltip,
          },
        },
      });
    }
  }

  return (
    <div>
      {/* Stat Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Bugün Üretim</div>
          <div className="stat-value c-accent">
            {bugunUretim.toLocaleString('tr-TR')}
          </div>
          <div className="stat-sub">adet briket</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bu Hafta Üretim</div>
          <div className="stat-value">
            {haftaUretim.toLocaleString('tr-TR')}
          </div>
          <div className="stat-sub">adet</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Açık Siparişler</div>
          <div className="stat-value c-blue">{acikSiparisler}</div>
          <div className="stat-sub">bekleyen</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Toplam Alacak</div>
          <div className="stat-value c-red">
            {Math.round(toplamAlacak).toLocaleString('tr-TR')}
          </div>
          <div className="stat-sub">TL</div>
        </div>
      </div>

      {/* Grafikler */}
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

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Briket Çeşidine Göre (Son 30 Gün)</div>
          </div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 200 }}>
            <canvas ref={chart3Ref} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Aylık Tahsilat vs Alacak</div>
          </div>
          <div className="panel-body" style={{ padding: '14px 18px', height: 200 }}>
            <canvas ref={chart4Ref} />
          </div>
        </div>
      </div>

      {/* Tablolar */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Son Üretimler</div>
          </div>
          <div className="panel-body-0">
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Miktar</th>
                  <th>Çeşit</th>
                  <th>K.Başı ₺</th>
                </tr>
              </thead>
              <tbody>
                {sonUretimler.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      Kayıt yok
                    </td>
                  </tr>
                ) : (
                  sonUretimler.map((u) => (
                    <tr key={u.id}>
                      <td>{fd(u.tarih)}</td>
                      <td className="td-mono">
                        {u.miktar.toLocaleString('tr-TR')}
                      </td>
                      <td>
                        <span className="badge b-yellow">{u.cesit}</span>
                      </td>
                      <td className="td-mono">{tl(u.kisiBasiUcret)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Bekleyen Siparişler</div>
          </div>
          <div className="panel-body-0">
            <table>
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Çeşit</th>
                  <th>Kalan</th>
                  <th>Bölge</th>
                </tr>
              </thead>
              <tbody>
                {bekleyenSiparisler.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      Bekleyen sipariş yok
                    </td>
                  </tr>
                ) : (
                  bekleyenSiparisler.map((s) => {
                    const m = data.musteriler.find(
                      (x) => x.id === s.musteriId
                    );
                    return (
                      <tr key={s.id}>
                        <td className="td-bold">{m?.isim || '?'}</td>
                        <td>
                          <span className="badge b-yellow">{s.cesit}</span>
                        </td>
                        <td className="td-mono">
                          {(s.adet - s.gonderilen).toLocaleString('tr-TR')}
                        </td>
                        <td>{s.bolge || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Borçlu Müşteriler */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Borçlu Müşteriler</div>
        </div>
        <div className="panel-body-0">
          <table>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Bölge</th>
                <th>Alacak</th>
                <th>Son İşlem</th>
              </tr>
            </thead>
            <tbody>
              {borcluMusteriler.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Borçlu müşteri yok
                  </td>
                </tr>
              ) : (
                borcluMusteriler.map(({ m, alacak, sonIslem }) => (
                  <tr key={m.id}>
                    <td className="td-bold">{m.isim}</td>
                    <td>{m.bolge || '—'}</td>
                    <td className="td-mono negative">{tl(alacak)}</td>
                    <td>{sonIslem ? fd(sonIslem.tarih) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
