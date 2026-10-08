import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icons } from '../icons';

// ---------- Modal ----------
export function Modal({ title, children, footer, onClose, wide }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <Icons.close />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Confirm ----------
interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  danger?: boolean;
}
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn>(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmCtx);

// ---------- Toasts ----------
interface Toast {
  id: number;
  kind: 'info' | 'error' | 'success';
  text: string;
}
type ToastFn = (text: string, kind?: Toast['kind']) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback<ToastFn>((text, kind = 'info') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), []);
  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastCtx.Provider value={value}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        {confirmState && (
          <Modal
            title={confirmState.title}
            onClose={() => closeConfirm(false)}
            footer={
              <>
                <button className="btn btn-outline" onClick={() => closeConfirm(false)}>
                  Отмена
                </button>
                <button className={`btn ${confirmState.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => closeConfirm(true)} autoFocus>
                  {confirmState.confirmText ?? 'Подтвердить'}
                </button>
              </>
            }
          >
            <p style={{ margin: 0, lineHeight: 1.5 }}>{confirmState.message}</p>
          </Modal>
        )}
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind}`}>
              {t.kind === 'error' ? <Icons.alert /> : t.kind === 'success' ? <Icons.check /> : null}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

// ---------- Dropdown menu ----------
export function CardMenu({ items }: { items: { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="btn-icon menu-btn" aria-label="Действия" onClick={() => setOpen((o) => !o)}>
        <Icons.dots />
      </button>
      {open && (
        <div className="menu">
          {items.map((it) => (
            <button
              key={it.label}
              className={it.danger ? 'danger' : ''}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
