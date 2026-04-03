'use client';
import { useState } from 'react';
import { girisYap } from '@/lib/supabase';

interface LoginPageProps {
  onGiris: () => void;
}

export default function LoginPage({ onGiris }: LoginPageProps) {
  const [email, setEmail]   = useState('');
  const [sifre, setSifre]   = useState('');
  const [hata, setHata]     = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function handleGiris() {
    if (!email.trim() || !sifre) { setHata('E-posta ve şifre gereklidir.'); return; }
    setYukleniyor(true);
    setHata('');
    const sonuc = await girisYap(email.trim(), sifre);
    setYukleniyor(false);
    if (sonuc.hata) { setHata(sonuc.hata); return; }
    onGiris();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleGiris();
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        padding: '0 16px',
      }}>
        {/* Logo / Başlık */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 28,
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: 2,
            color: 'var(--text)',
          }}>
            İDOOĞLU BRİKET
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text3)',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 1,
            marginTop: 4,
          }}>
            İMALAT TAKİP SİSTEMİ
          </div>
        </div>

        {/* Giriş Kartı */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">🔐 Yönetici Girişi</div>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setHata(''); }}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label>Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={sifre}
                onChange={e => { setSifre(e.target.value); setHata(''); }}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
            </div>

            {hata && (
              <div style={{
                background: 'rgba(184,60,43,0.08)',
                border: '1px solid rgba(184,60,43,0.25)',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--red)',
              }}>
                ⚠️ {hata}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGiris}
              disabled={yukleniyor}
              style={{ marginTop: 4 }}
            >
              {yukleniyor ? '⏳ Giriş yapılıyor...' : '→ Giriş Yap'}
            </button>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 11,
          color: 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          Hesap oluşturma kapalıdır. Erişim için yöneticiye başvurun.
        </div>
      </div>
    </div>
  );
}
