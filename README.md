# 🧱 Briket Yönetim Sistemi

Next.js 15 ile geliştirilmiş briket imalat takip sistemi.

## Proje Yapısı (VS Code Sol Panel)

```
briket-yonetim/
├── src/
│   ├── app/
│   │   ├── globals.css          ← Tüm stiller (CSS değişkenleri, layout)
│   │   ├── layout.tsx           ← Root layout
│   │   └── page.tsx             ← Ana sayfa girişi
│   ├── components/
│   │   ├── BriketApp.tsx        ← Ana orkestratör (sayfa yönetimi)
│   │   ├── Sidebar.tsx          ← Sol navigasyon paneli
│   │   ├── Toast.tsx            ← Bildirim bileşeni
│   │   └── pages/
│   │       ├── Dashboard.tsx    ← Genel bakış + grafikler
│   │       ├── Uretim.tsx       ← Günlük üretim girişi
│   │       ├── Yukleme.tsx      ← Yükleme / boşaltma
│   │       ├── Isciler.tsx      ← İşçi yönetimi + ödemeler
│   │       ├── Haftalik.tsx     ← Haftalık hesap
│   │       ├── Siparisler.tsx   ← Sipariş + teslimat
│   │       ├── SpotSatis.tsx    ← Spot satış
│   │       ├── Musteriler.tsx   ← Müşteri & borç takibi
│   │       ├── Malzeme.tsx      ← Malzeme girişi + tedarikçi
│   │       ├── Koyler.tsx       ← Köy / bölge yönetimi
│   │       └── Ayarlar.tsx      ← Ücret tarifeleri
│   ├── lib/
│   │   └── storage.ts           ← localStorage + yardımcı fonksiyonlar
│   └── types/
│       └── index.ts             ← TypeScript tip tanımları
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Geliştirme sunucusunu başlat
npm run dev

# 3. Tarayıcıda aç
# http://localhost:3000
```

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TypeScript |
| Stil | CSS Değişkenleri (globals.css) |
| Grafikler | Chart.js 4.4 (CDN) |
| Veri | localStorage (şimdilik) |
| Deployment | Vercel (önerilen) |

## İleride Supabase'e Geçiş

Şu anda tüm veri `localStorage`'da saklanıyor (`byk_v3` anahtarı).

Supabase'e geçiş için:
1. `src/lib/storage.ts` dosyasındaki `loadData()` ve `saveData()` fonksiyonlarını Supabase client ile değiştirin
2. `src/types/index.ts` zaten veritabanı şemasına uygun

## Deployment

```bash
# Vercel'e deploy
npm run build
vercel --prod
```
