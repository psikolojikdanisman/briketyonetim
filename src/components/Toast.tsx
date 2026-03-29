'use client';
import { useEffect, useRef, useState } from 'react';

export interface ToastState {
  message: string;
  ok: boolean;
  visible: boolean;
}

interface ToastProps {
  state: ToastState;
}

export default function Toast({ state }: ToastProps) {
  const [rendered, setRendered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (state.visible && state.message) {
      setRendered(true);
    } else {
      // Çıkış animasyonu bittikten sonra DOM'dan kaldır
      timerRef.current = setTimeout(() => setRendered(false), 250);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.visible, state.message]);

  if (!rendered) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'toast',
        state.ok ? 'toast--success' : 'toast--error',
        state.visible ? 'toast--in' : 'toast--out',
      ].join(' ')}
    >
      <span className="toast-icon">{state.ok ? '✓' : '✕'}</span>
      <span>{state.message}</span>
    </div>
  );
}