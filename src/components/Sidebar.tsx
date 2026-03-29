'use client';
import { useMemo } from 'react';
import type { PageKey } from '@/types';

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const NAV_ITEMS: {
  section?: string;
  items?: { key: PageKey; icon: string; label: string }[];
}[] = [
  {
    section: 'ANA',
    items: [{ key: 'dashboard', icon: '◼', label: 'Genel Bakış' }],
  },
  {
    section: 'ÜRETİM & İŞÇİLER',
    items: [
      { key: 'uretim',  icon: '🏭', label: 'Günlük Üretim' },
      { key: 'yukleme', icon: '🚛', label: 'Yükleme / Boşaltma' },
      { key: 'isciler', icon: '👷', label: 'İşçi Yönetimi' },
    ],
  },
  {
    section: 'SATIŞ',
    items: [
      { key: 'siparisler', icon: '📦', label: 'Siparişler' },
      { key: 'spotsatis',  icon: '🚜', label: 'Spot Satış' },
      { key: 'musteriler', icon: '👤', label: 'Müşteriler & Borç' },
    ],
  },
  {
    section: 'STOK & GİDER',
    items: [
      { key: 'malzeme',  icon: '🪨', label: 'Malzeme Girişi' },
      { key: 'giderler', icon: '💸', label: 'Giderler' },
    ],
  },
  {
    section: 'AYARLAR',
    items: [
      { key: 'koyler',  icon: '🏘', label: 'Köy / Bölge Yönetimi' },
      { key: 'ayarlar', icon: '⚙',  label: 'Ayarlar' },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  // Sadece component mount'ta hesaplanır, her render'da yeniden çalışmaz
  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );

  // isci-detay sayfasındayken isciler nav-item'ı aktif göster
  const effectivePage = activePage === 'isci-detay' ? 'isciler' : activePage;

  return (
    <aside className="sidebar">
      {/* Başlık */}
      <div className="logo">
        <div className="logo-title">İdooğlu Briket</div>
        <div className="logo-sub">İmalat Takip Sistemi</div>
      </div>

      {/* Nav */}
      <nav>
        {NAV_ITEMS.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <div className="nav-section">{group.section}</div>
            )}
            {group.items?.map((item) => {
              const isActive = effectivePage === item.key;
              return (
                <div
                  key={item.key}
                  className={`nav-item${isActive ? ' active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.key)}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">{dateStr}</div>
    </aside>
  );
}