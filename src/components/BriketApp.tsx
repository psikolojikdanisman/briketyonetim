'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppData, PageKey } from '@/types';
import {
  loadDataFromSupabase,
  saveData,
  PAGE_TITLES,
  backupGerekliMi,
  backupTarihiGuncelle,
  SupabaseYuklemeHatasi,
} from '@/lib/storage';
import { supabase, cikisYap, mevcutOturum } from '@/lib/supabase';
import Sidebar from './Sidebar';
import Toast, { type ToastState } from './Toast';
import LoginPage from './LoginPage';
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

const BACKUP_UYARI_GUN_LABEL = 7;

type AuthDurum = 'kontrol' | 'girilmedi' | 'girildi';
type VeriDurum = 'yukleniyor' | 'yuklendi' | 'hata';

export default function BriketApp() {
  const [authDurum, setAuthDurum]         = useState<AuthDurum>('kontrol');
  const [veriDurum, setVeriDurum]         = useState<VeriDurum>('yukleniyor');
  const [yuklemeHata, setYuklemeHata]     = useState<string | null>(null);
  const [data, setData]                   = useState<AppData | null>(null);
  const [page, setPage]                   = useState<PageKey>('dashboard');
  const [aktifIsciId, setAktifIsciId]     = useState<number | null>(null);
  const [toast, setToast]                 = useState<ToastState>({ message: '', ok: true, visible: false });
  const [dateStr, setDateStr]             = useState('');
  const [backupUyari, setBackupUyari]               = useState(false);
  const [backupBannerKapali, setBackupBannerKapali] = useState(false);

  // ── Auth durumunu kontrol et ──────────────────────────────────────────────
  useEffect(() => {
    mevcutOturum().then(session => {
      setAuthDurum(session ? 'girildi' : 'girilmedi');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthDurum(session ? 'girildi' : 'girilmedi');
      if (!session) {
        setData(null);
        setVeriDurum('yukleniyor');
        setYuklemeHata(null);
        setPage('dashboard');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Oturum açıldıktan sonra veri yükle ───────────────────────────────────
  useEffect(() => {
    if (authDurum !== 'girildi') return;

    setVeriDurum('yukleniyor');
    setYuklemeHata(null);

    loadDataFromSupabase()
      .then(yuklenenData => {
        setData(yuklenenData);
        setVeriDurum('yuklendi');
        setDateStr(
          new Date().toLocaleDateString('tr-TR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })
        );
        setBackupUyari(backupGerekliMi());
      })
      .catch((hata: unknown) => {
        setVeriDurum('hata');
        if (hata instanceof SupabaseYuklemeHatasi) {
          setYuklemeHata(hata.message);
        } else {
          setYuklemeHata('Veriler yüklenirken beklenmedik bir hata oluştu. Sayfayı yenileyin.');
        }
        console.error('[BriketApp] Veri yükleme hatası:', hata);
      });
  }, [authDurum]);

  const handleSave = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ message: msg, ok, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  }, []);

  async function handleCikis() {
    await cikisYap();
  }

  function handleYenile() {
    setVeriDurum('yukleniyor');
    setYuklemeHata(null);
    loadDataFromSupabase()
      .then(yuklenenData => {
        setData(yuklenenData);
        setVeriDurum('yuklendi');
      })
      .catch((hata: unknown) => {
        setVeriDurum('hata');
        if (hata instanceof SupabaseYuklemeHatasi) {
          setYuklemeHata(hata.message);
        } else {
          setYuklemeHata('Veriler yüklenirken beklenmedik bir hata oluştu. Sayfayı yenileyin.');
        }
      });
  }

  const backupUyariGoster = useMemo(
    () => backupUyari && !backupBannerKapali,
    [backupUyari, backupBannerKapali]
  );

  const isciDetayGit  = useCallback((isciId: number) => { setAktifIsciId(isciId); setPage('isci-detay'); }, []);
  const isciDetayGeri = useCallback(() => { setAktifIsciId(null); setPage('isciler'); }, []);
  const handleNavigate = useCallback((newPage: PageKey) => {
    if (newPage !== 'isci-detay') setAktifIsciId(null);
    setPage(newPage);
  }, []);

  // ── Yükleme ekranı (auth kontrol ediliyor) ───────────────────────────────
  if (authDurum === 'kontrol') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: 1 }}>
          KONTROL EDİLİYOR
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Giriş ekranı ─────────────────────────────────────────────────────────
  if (authDurum === 'girilmedi') {
    return <LoginPage onGiris={() => setAuthDurum('girildi')} />;
  }

  // ── Veri yükleme hatası ───────────────────────────────────────────────────
  if (veriDurum === 'hata') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: '16px',
        padding: '24px',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
          letterSpacing: 2, color: 'var(--red)',
        }}>
          VERİ YÜKLENEMEDİ
        </div>
        <div style={{
          maxWidth: 420, textAlign: 'center', fontSize: 13,
          color: 'var(--text2)', lineHeight: 1.7,
          background: 'rgba(184,60,43,0.07)',
          border: '1px solid rgba(184,60,43,0.22)',
          borderRadius: 'var(--radius)',
          padding: '14px 20px',
        }}>
          {yuklemeHata}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={handleYenile}
            className="btn btn-primary"
          >
            ↻ Tekrar Dene
          </button>
          <button
            onClick={handleCikis}
            className="btn btn-secondary"
          >
            ⎋ Çıkış Yap
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Veri yükleniyor ───────────────────────────────────────────────────────
  if (veriDurum === 'yukleniyor' || !data) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: 1 }}>
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

        {/* Backup uyarı banner */}
        {backupUyariGoster && (
          <div style={{
            background: 'rgba(217,119,6,0.12)', borderBottom: '1px solid rgba(217,119,6,0.35)',
            padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 13, color: '#d97706',
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ flex: 1 }}>
              <strong>Veri yedeği alınmadı.</strong>{' '}
              Son {BACKUP_UYARI_GUN_LABEL} günde yedek bulunamadı — Ayarlar sayfasından JSON yedeği alın.
            </span>
            <button
              onClick={() => { handleNavigate('ayarlar'); setBackupBannerKapali(true); }}
              style={{
                background: '#d97706', color: 'white', border: 'none', borderRadius: 6,
                padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Yedek Al →
            </button>
            <button
              onClick={() => setBackupBannerKapali(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#d97706', fontSize: 18, lineHeight: 1, padding: '0 4px', opacity: 0.7,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">{topbarTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="date-badge">{dateStr}</div>
            <button
              onClick={handleCikis}
              title="Çıkış Yap"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '4px 10px',
                fontSize: 12,
                color: 'var(--text3)',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                transition: 'color .15s, border-color .15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              }}
            >
              ⎋ Çıkış
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="content">
          {page === 'dashboard'  && <Dashboard data={data} />}
          {page === 'uretim'     && <UretimPage {...pageProps} />}
          {page === 'yukleme'    && <YuklemePage {...pageProps} />}
          {page === 'isciler'    && <IscilerPage {...pageProps} onIsciDetay={isciDetayGit} />}
          {page === 'isci-detay' && aktifIsciId !== null && (
            <IsciDetay {...pageProps} isciId={aktifIsciId} onGeri={isciDetayGeri} />
          )}
          {page === 'siparisler' && <SiparislerPage {...pageProps} />}
          {page === 'spotsatis'  && <SpotSatisPage {...pageProps} />}
          {page === 'musteriler' && <MusterilerPage {...pageProps} />}
          {page === 'malzeme'    && <MalzemePage {...pageProps} />}
          {page === 'giderler'   && <GiderlerPage {...pageProps} />}
          {page === 'koyler'     && <KoylerPage {...pageProps} />}
          {page === 'ayarlar'    && (
            <AyarlarPage
              {...pageProps}
              onBackupAlindi={() => {
                backupTarihiGuncelle();
                setBackupUyari(false);
                setBackupBannerKapali(false);
              }}
            />
          )}
        </div>
      </div>
      <Toast state={toast} />
    </div>
  );
}