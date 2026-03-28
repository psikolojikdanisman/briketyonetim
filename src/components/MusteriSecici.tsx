'use client';
import { useState, useRef, useEffect } from 'react';
import type { Musteri } from '@/types';

interface Props {
  musteriler: Musteri[];
  value: string;           // seçili musteriId (string)
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MusteriSecici({ musteriler, value, onChange, placeholder = '— Müşteri seç —', disabled }: Props) {
  const [aramaIsim, setAramaIsim] = useState('');
  const [aramaKoy,  setAramaKoy]  = useState('');
  const [acik, setAcik] = useState(false);
  const kapsayici = useRef<HTMLDivElement>(null);

  // Seçili müşteri değişince input'u güncelle
  const seciliMusteri = musteriler.find(m => String(m.id) === value);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    function kapat(e: MouseEvent) {
      if (kapsayici.current && !kapsayici.current.contains(e.target as Node)) {
        setAcik(false);
      }
    }
    document.addEventListener('mousedown', kapat);
    return () => document.removeEventListener('mousedown', kapat);
  }, []);

  // Filtre
  const filtreli = musteriler.filter(m => {
    const isimUyuyor = !aramaIsim || m.isim.toLowerCase().includes(aramaIsim.toLowerCase());
    const koyUyuyor  = !aramaKoy  || (m.koy || '').toLowerCase().includes(aramaKoy.toLowerCase())
                                  || (m.bolge || '').toLowerCase().includes(aramaKoy.toLowerCase());
    return isimUyuyor && koyUyuyor;
  });

  function sec(m: Musteri) {
    onChange(String(m.id));
    setAcik(false);
    setAramaIsim('');
    setAramaKoy('');
  }

  function temizle(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setAcik(false);
  }

  return (
    <div ref={kapsayici} style={{ position: 'relative' }}>
      {/* Seçim kutusu — tıklayınca açılır */}
      <div
        onClick={() => { if (!disabled) setAcik(v => !v); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderRadius: 'var(--radius)',
          border: `1px solid ${acik ? 'var(--accent)' : 'var(--border)'}`,
          background: disabled ? 'var(--surface)' : 'var(--bg)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: 38, transition: 'border-color .15s',
          userSelect: 'none',
        }}
      >
        {seciliMusteri ? (
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            <span style={{ fontWeight: 600 }}>{seciliMusteri.isim}</span>
            {seciliMusteri.koy && (
              <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>
                📍 {seciliMusteri.koy}
              </span>
            )}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{placeholder}</span>
        )}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {seciliMusteri && (
            <span
              onClick={temizle}
              style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
              title="Temizle"
            >✕</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{acik ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Açılır panel */}
      {acik && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,.15)',
        }}>
          {/* Arama satırı */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            padding: '8px 8px 6px',
            borderBottom: '1px solid var(--border)',
          }}>
            <input
              autoFocus
              type="text"
              placeholder="Ad ile ara..."
              value={aramaIsim}
              onChange={e => setAramaIsim(e.target.value)}
              style={{
                padding: '5px 8px', fontSize: 12,
                borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)',
              }}
            />
            <input
              type="text"
              placeholder="Köy / yer ile ara..."
              value={aramaKoy}
              onChange={e => setAramaKoy(e.target.value)}
              style={{
                padding: '5px 8px', fontSize: 12,
                borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)',
              }}
            />
          </div>

          {/* Liste */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtreli.length === 0 ? (
              <div style={{ padding: '12px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
                Eşleşen müşteri yok
              </div>
            ) : filtreli.map(m => (
              <div
                key={m.id}
                onMouseDown={() => sec(m)}
                style={{
                  padding: '9px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: String(m.id) === value ? 'rgba(46,196,182,.08)' : undefined,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(46,196,182,.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = String(m.id) === value ? 'rgba(46,196,182,.08)' : '')}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.isim}</span>
                {m.koy && (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {m.koy}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}