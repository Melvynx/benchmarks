import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { Attachment } from '../lib/types';
import { useUI } from '../lib/ui';
import { formatSize } from '../lib/date';
import { artDataUri } from '../lib/art';
import { downloadAttachment, imageVariantFor } from '../lib/download';
import { AttachmentIcon, KIND_COLOR } from './AttachmentIcon';
import { IconButton } from './primitives';

function ext(name: string): string {
  return (name.split('.').pop() ?? '').slice(0, 4).toUpperCase();
}

function Thumb({ att }: { att: Attachment }) {
  if (att.kind === 'image') {
    const src = att.dataUrl ?? artDataUri(imageVariantFor(att), att.art ?? 1, 360, 240);
    return <img src={src} alt="" loading="lazy" />;
  }
  const color = KIND_COLOR[att.kind];
  return (
    <div className="thumb-doc" style={{ '--doc': color } as React.CSSProperties}>
      <div className="thumb-doc__bar">{ext(att.name)}</div>
      <div className="thumb-doc__lines">
        <span style={{ width: '70%' }} />
        <span style={{ width: '90%' }} />
        <span style={{ width: '55%' }} />
        <span style={{ width: '82%' }} />
      </div>
    </div>
  );
}

export function AttachmentGrid({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="att-section">
      <div className="att-section__title">
        {attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'}
      </div>
      <div className="att-grid">
        {attachments.map((a, i) => (
          <div
            key={a.id}
            className="att-card"
            role="button"
            tabIndex={0}
            aria-label={`Preview ${a.name}`}
            onClick={() => useUI.getState().set({ preview: { attachments, index: i } })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                useUI.getState().set({ preview: { attachments, index: i } });
              }
            }}
          >
            <div className="att-card__thumb">
              <Thumb att={a} />
            </div>
            <div className="att-card__meta">
              <AttachmentIcon kind={a.kind} size={18} />
              <div className="att-card__text">
                <div className="att-card__name">{a.name}</div>
                <div className="att-card__size">{formatSize(a.size)}</div>
              </div>
              <IconButton
                label={`Download ${a.name}`}
                size="sm"
                className="att-card__dl"
                onClick={(e) => {
                  e.stopPropagation();
                  void downloadAttachment(a);
                }}
              >
                <Download size={18} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewBody({ att }: { att: Attachment }) {
  if (att.kind === 'image') {
    const src = att.dataUrl ?? artDataUri(imageVariantFor(att), att.art ?? 1, 1200, 800);
    return <img className="lightbox__img" src={src} alt={att.name} />;
  }
  const lines = att.lines ?? [];
  return (
    <div className="doc-page" style={{ '--doc': KIND_COLOR[att.kind] } as React.CSSProperties}>
      <div className="doc-page__head">
        <AttachmentIcon kind={att.kind} size={22} />
        <span>{att.title ?? att.name}</span>
      </div>
      {att.kind === 'sheet' ? (
        <table className="doc-page__table">
          <tbody>
            {[...lines, 'Total'].map((l, i) => (
              <tr key={i}>
                <td>{l}</td>
                <td>{(1200 + i * 337) % 9000}</td>
                <td>{(i * 71 + 15) % 100}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="doc-page__body">
          {lines.map((l, i) => (
            <p key={i} className={i === 0 ? 'is-strong' : ''}>
              {l}
            </p>
          ))}
          {[88, 96, 72, 92, 60, 84, 78, 90, 52].map((w, i) => (
            <span key={i} className="skeleton-line" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AttachmentPreview() {
  const preview = useUI((s) => s.preview);
  const close = () => useUI.getState().set({ preview: null });

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!preview) return null;
  const { attachments, index } = preview;
  const att = attachments[index];
  function step(d: number) {
    const p = useUI.getState().preview;
    if (!p) return;
    const i = (p.index + d + p.attachments.length) % p.attachments.length;
    useUI.getState().set({ preview: { ...p, index: i } });
  }
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Preview of ${att.name}`} onClick={close}>
      <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
        <IconButton label="Close preview" onClick={close} className="lightbox__btn">
          <X size={22} />
        </IconButton>
        <AttachmentIcon kind={att.kind} size={20} />
        <span className="lightbox__name">{att.name}</span>
        <span className="lightbox__size">{formatSize(att.size)}</span>
        <div className="lightbox__spacer" />
        <IconButton label="Download" onClick={() => void downloadAttachment(att)} className="lightbox__btn">
          <Download size={20} />
        </IconButton>
      </div>
      <div className="lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <PreviewBody att={att} />
      </div>
      {attachments.length > 1 ? (
        <>
          <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label="Previous attachment" onClick={(e) => (e.stopPropagation(), step(-1))}>
            <ChevronLeft size={28} />
          </button>
          <button type="button" className="lightbox__nav lightbox__nav--next" aria-label="Next attachment" onClick={(e) => (e.stopPropagation(), step(1))}>
            <ChevronRight size={28} />
          </button>
          <div className="lightbox__count">
            {index + 1} / {attachments.length}
          </div>
        </>
      ) : null}
    </div>
  );
}
