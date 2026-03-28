'use client';
import { useState, useEffect, useCallback } from 'react';
import type { AppData, PageKey } from '@/types';
import { loadData, saveData, PAGE_TITLES } from '@/lib/storage';
import Sidebar from './Sidebar';
import Toast, { type ToastState } from './Toast';
import Dashboard from './pages/Dashboard';
import UretimPage from './pages/Uretim';
import YuklemePage from './pages/Yukleme';
import IscilerPage from './pages/Isciler';
import SiparislerPage from './pages/Siparisler';
import SpotSatisPage from './pages/SpotSatis';
import MusterilerPage from './pages/Musteriler';
import MalzemePage from './pages/Malzeme';
import GiderlerPage from './pages/Giderler';
import KoylerPage from './pages/Koyler';
import AyarlarPage from './pages/Ayarlar';

export default function BriketApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [toast, setToast] = useState<ToastState>({ message: '', ok: true, visible: false });
  const [dateStr, setDateStr] = useState('');

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

  return (
    <div className="layout">
      <Sidebar activePage={page} onNavigate={setPage} />

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{PAGE_TITLES[page] || page}</div>
          <div className="date-badge">{dateStr}</div>
        </div>

        <div className="content">
          {page === 'dashboard'  && <Dashboard data={data} />}
          {page === 'uretim'     && <UretimPage {...pageProps} />}
          {page === 'yukleme'    && <YuklemePage {...pageProps} />}
          {page === 'isciler'    && <IscilerPage {...pageProps} />}
          {page === 'siparisler' && <SiparislerPage {...pageProps} />}
          {page === 'spotsatis'  && <SpotSatisPage {...pageProps} />}
          {page === 'musteriler' && <MusterilerPage {...pageProps} />}
          {page === 'malzeme'    && <MalzemePage {...pageProps} />}
          {page === 'giderler'   && <GiderlerPage {...pageProps} />}
          {page === 'koyler'     && <KoylerPage {...pageProps} />}
          {page === 'ayarlar'    && <AyarlarPage {...pageProps} />}
        </div>
      </div>

      <Toast state={toast} />
    </div>
  );
}