'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppData, PageKey } from '@/types';
import { loadData, saveData, PAGE_TITLES } from '@/lib/storage';
import Sidebar from './Sidebar';
import Toast, { type ToastState } from './Toast';
import Dashboard from './pages/Dashboard';
import UretimPage from './pages/Uretim';
import YuklemePage from './pages/Yukleme';
import IscilerPage from './pages/Isciler';
import IsciDetay from './pages/IsciDetay';
import SiparislerPage from './pages/Siparisler';
import SpotSatisPage from './pages/SpotSatis';
import MusterilerPage from './pages/Musteriler';
import MalzemePage from './pages/Malzeme';
import GiderlerPage from './pages/Giderler';
import KoylerPage from './pages/Koyler';
import AyarlarPage from './pages/Ayarlar';

const BACKUP_KEY = 'briket_last_backup';
const BACKUP_UYARI_GUN = 7;

export default function BriketApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [aktifIsciId, setAktifIsciId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: '', ok: true, visible: false });
  const [dateStr, setDateStr] = useState('');
  const [backupBannerKapali, setBackupBannerKapali] = useState(false);

  useEffect(() => {
    setData(loadData());
    const now = new Date();
    setDateStr(
      now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  const handleSave = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ message: msg, ok, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }, []);

  // ── Yedek hatırlatıcı ──────────────────────────────────────────────────────
  const backupUyariGoster = useMemo(() => {
    if (backupBannerKapali) return false;
    try {
      const son = localStorage.getItem(BACKUP_KEY);
      if (!son) return true; // Hiç yedek alınmamış
      const fark = (Date.now() - new Date(son).getTime()) / (1000 * 60 * 60 * 24);
      return fark >= BACKUP_UYARI_GUN;
    } catch {
      return false;
    }
  }, [backupBannerKapali]);

  // ── İşçi detay navigasyon ──────────────────────────────────────────────────
  const isciDetayGit = useCallback((isciId: number) => {
    setAktifIsciId(isciId);
    setPage('isci-detay');
  }, []);

  const isciDetayGeri = useCallback(() => {
    setAktifIsciId(null);
    setPage('isciler');
  }, []);

  const handleNavigate = useCallback((newPage: PageKey) => {
    if (newPage !== 'isci-detay') {
      setAktifIsciId(null);
    }
    setPage(newPage);
  }, []);

  if (!data) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{
          color: 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          letterSpacing: 1,
        }}>
          YÜKLENİYOR
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const pageProps = { data, onSave: handleSave, showToast };

  const topbarTitle = page === 'isci-detay' && aktifIsciId
    ? (data.isciler.find(i => i.id === aktifIsciId)?.isim?.toUpperCase() || 'İŞÇİ PROFİLİ')
    : (PAGE_TITLES[page] || page);

  return (
    <div className="layout">
      <Sidebar activePage={page} onNavigate={handleNavigate} />

      <div className="main">
        {/* ── Yedek Uyarı Banner ── */}
        {backupUyariGoster && (
          <div style={{
            background: 'rgba(217,119,6,0.12)',
            borderBottom: '1px solid rgba(217,119,6,0.35)',
            padding: '9px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: '#d97706',
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ flex: 1 }}>
              <strong>Veri yedeği alınmadı.</strong>
              {' '}Son {BACKUP_UYARI_GUN} günde yedek bulunamadı — veri kaybını önlemek için Ayarlar sayfasından JSON yedeği alın.
            </span>
            <button
              onClick={() => {
                handleNavigate('ayarlar');
                setBackupBannerKapali(true);
              }}
              style={{
                background: '#d97706',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Yedek Al →
            </button>
            <button
              onClick={() => setBackupBannerKapali(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#d97706',
                fontSize: 18,
                lineHeight: 1,
                padding: '0 4px',
                opacity: 0.7,
              }}
              title="Kapat"
            >
              ✕
            </button>
          </div>
        )}

        <div className="topbar">
          <div className="topbar-title">{topbarTitle}</div>
          <div className="date-badge">{dateStr}</div>
        </div>

        <div className="content">
          {page === 'dashboard'   && <Dashboard data={data} />}
          {page === 'uretim'      && <UretimPage {...pageProps} />}
          {page === 'yukleme'     && <YuklemePage {...pageProps} />}
          {page === 'isciler'     && <IscilerPage {...pageProps} onIsciDetay={isciDetayGit} />}
          {page === 'isci-detay'  && aktifIsciId !== null && (
            <IsciDetay
              {...pageProps}
              isciId={aktifIsciId}
              onGeri={isciDetayGeri}
            />
          )}
          {page === 'siparisler'  && <SiparislerPage {...pageProps} />}
          {page === 'spotsatis'   && <SpotSatisPage {...pageProps} />}
          {page === 'musteriler'  && <MusterilerPage {...pageProps} />}
          {page === 'malzeme'     && <MalzemePage {...pageProps} />}
          {page === 'giderler'    && <GiderlerPage {...pageProps} />}
          {page === 'koyler'      && <KoylerPage {...pageProps} />}
          {page === 'ayarlar'     && <AyarlarPage {...pageProps} />}
        </div>
      </div>

      <Toast state={toast} />
    </div>
  );
}