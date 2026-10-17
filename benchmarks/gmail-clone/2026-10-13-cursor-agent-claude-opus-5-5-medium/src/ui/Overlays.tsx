import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMail } from "../store/mail";
import { IconButton } from "./Icon";

export function ToastHost() {
  const { toast, dismissToast } = useMail();
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, toast.duration);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      <span className="toast-msg">{toast.message}</span>
      {toast.actions?.map((a) => (
        <button
          key={a.label}
          className="toast-action"
          onClick={() => {
            dismissToast();
            a.run();
          }}
        >
          {a.label}
        </button>
      ))}
      <IconButton icon="close" label="Dismiss" size={18} className="toast-close" onClick={dismissToast} />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 440,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", on, true);
    return () => document.removeEventListener("keydown", on, true);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal " + (className ?? "")} style={{ width }} role="dialog" aria-modal="true">
        {title && (
          <div className="modal-head">
            <h2>{title}</h2>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmHost() {
  const { pendingConfirm, resolveConfirm } = useMail();
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pendingConfirm) setTimeout(() => btn.current?.focus(), 0);
  }, [pendingConfirm]);
  return (
    <Modal
      open={!!pendingConfirm}
      onClose={() => resolveConfirm(false)}
      title={pendingConfirm?.title}
      width={420}
      footer={
        <>
          <button className="btn text" onClick={() => resolveConfirm(false)}>
            Cancel
          </button>
          <button ref={btn} className={"btn " + (pendingConfirm?.danger ? "danger" : "primary")} onClick={() => resolveConfirm(true)}>
            {pendingConfirm?.confirmLabel ?? "OK"}
          </button>
        </>
      }
    >
      {pendingConfirm?.body && <p className="muted">{pendingConfirm.body}</p>}
    </Modal>
  );
}

/** Global tooltip driven by `data-tip` attributes. */
export function TooltipHost() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  useEffect(() => {
    let timer = 0;
    let current: Element | null = null;
    const over = (e: MouseEvent) => {
      const el = (e.target as Element)?.closest?.("[data-tip]");
      if (el === current) return;
      current = el;
      clearTimeout(timer);
      setTip(null);
      if (!el) return;
      timer = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const below = r.bottom + 40 < window.innerHeight;
        setTip({ text: el.getAttribute("data-tip") ?? "", x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below });
      }, 450);
    };
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip(null);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mousedown", hide);
    document.addEventListener("keydown", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mousedown", hide);
      document.removeEventListener("keydown", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);
  if (!tip || !tip.text) return null;
  return createPortal(
    <div className={"tooltip" + (tip.below ? "" : " above")} style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>,
    document.body,
  );
}
