'use client';
import dynamic from 'next/dynamic';

// Client-only - localStorage kullandığı için SSR devre dışı
const BriketApp = dynamic(() => import('@/components/BriketApp'), { ssr: false });

export default function Home() {
  return <BriketApp />;
}
