'use client';

interface OnayModalProps {
  acik: boolean;
  mesaj: string;
  onOnayla: () => void;
  onIptal: () => void;
}

export default function OnayModal({
  acik,
  mesaj,
  onOnayla,
  onIptal,
}: OnayModalProps) {
  if (!acik) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onIptal();
      }}
    >
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-title">Emin misiniz?</div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--text2)',
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          {mesaj}
        </div>
        <div
          style={{
            background: 'rgba(255,80,80,0.07)',
            border: '1px solid rgba(255,80,80,0.2)',
            borderRadius: 'var(--radius)',
            padding: '8px 14px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: 'var(--danger)',
            marginBottom: 22,
          }}
        >
          Bu işlem geri alınamaz.
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onIptal}>
            İptal
          </button>
          <button className="btn btn-danger" onClick={onOnayla}>
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}