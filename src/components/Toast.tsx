'use client';
import { useEffect, useRef } from 'react';

export interface ToastState {
  message: string;
  ok: boolean;
  visible: boolean;
}

interface ToastProps {
  state: ToastState;
}

export default function Toast({ state }: ToastProps) {
  const style: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    background: 'var(--surface)',
    border: `1px solid ${state.ok ? 'var(--green)' : 'var(--red)'}`,
    borderRadius: 'var(--radius)',
    padding: '11px 18px',
    color: 'var(--text)',
    fontSize: 13,
    zIndex: 9999,
    display: state.visible ? 'block' : 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,.3)',
  };
  return <div style={style}>{state.message}</div>;
}
