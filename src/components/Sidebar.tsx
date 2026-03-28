'use client';
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
    items: [{ key: 'dashboard', icon: '⬛', label: 'Genel Bakış' }],
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
      { key: 'ayarlar', icon: '⚙',  label: 'Ücret Tarifeleri' },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR');

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-title">BRİKET YÖNETİM</div>
        <div className="logo-sub">// İMALAT TAKİP SİSTEMİ</div>
      </div>
      <nav>
        {NAV_ITEMS.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <div className="nav-section">{group.section}</div>
            )}
            {group.items?.map((item) => (
              <div
                key={item.key}
                className={`nav-item${activePage === item.key ? ' active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">{dateStr}</div>
    </aside>
  );
}