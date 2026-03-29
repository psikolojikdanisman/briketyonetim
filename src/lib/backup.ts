import type { AppData } from '@/types';

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export function exportJSON(data: AppData): void {
  const tarih = new Date().toISOString().split('T')[0];
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `briket-yedek-${tarih}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── IMPORT ──────────────────────────────────────────────────────────────────

export function importJSON(
  file: File,
  onBasari: (data: AppData) => void,
  onHata: (mesaj: string) => void
): void {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string) as AppData;

      // Temel alan kontrolü
      if (
        !parsed.ayarlar ||
        !Array.isArray(parsed.musteriler) ||
        !Array.isArray(parsed.isciler)
      ) {
        onHata('Bu dosya geçerli bir briket yedeği değil.');
        return;
      }

      onBasari(parsed);
    } catch {
      onHata('Dosya okunamadı. Geçerli bir JSON dosyası seçin.');
    }
  };

  reader.onerror = () => {
    onHata('Dosya okuma hatası.');
  };

  reader.readAsText(file);
}

// ─── BOYUT KONTROLÜ ──────────────────────────────────────────────────────────

export function localStorageBoyutu(): {
  kullanilanMB: number;
  yuzde: number;
  uyari: boolean;
} {
  try {
    const raw = localStorage.getItem('byk_v3') || '';
    // Her karakter yaklaşık 2 byte (UTF-16)
    const kullanilanMB = (raw.length * 2) / (1024 * 1024);
    // localStorage limiti genellikle 5MB
    const yuzde = Math.round((kullanilanMB / 5) * 100);
    return {
      kullanilanMB: Math.round(kullanilanMB * 100) / 100,
      yuzde,
      uyari: yuzde >= 70,
    };
  } catch {
    return { kullanilanMB: 0, yuzde: 0, uyari: false };
  }
}