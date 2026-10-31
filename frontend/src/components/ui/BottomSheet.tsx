import React from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <div className="drag-handle" />
          <div className="header-row">
            <h3 className="title">{title}</h3>
            <button className="close-btn" onClick={onClose} aria-label="닫기">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="bottom-sheet-body">{children}</div>
      </div>

      <style>{`
        .bottom-sheet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .bottom-sheet-content {
          width: 100%;
          max-width: 480px;
          background: var(--color-bg-surface);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: var(--space-4);
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 80vh;
          overflow-y: auto;
        }
        .drag-handle {
          width: 36px;
          height: 4px;
          background-color: var(--color-border-strong);
          border-radius: var(--radius-full);
          margin: 0 auto var(--space-3);
        }
        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .title {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
