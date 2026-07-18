import { FileCode2, FileJson2, Image, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { IconButton, NumberField, SegmentedControl } from '@/ui/primitives';
import { useFocusTrap } from '@/ui/useFocusManagement';

export type ExportFormat = 'png' | 'svg' | 'json';
export type ExportScope = 'selection' | 'document';

export interface ExportDialogProps {
  readonly hasSelection: boolean;
  readonly onClose: () => void;
  readonly onExport: (
    format: ExportFormat,
    scope: ExportScope,
    scale: number,
  ) => Promise<void> | void;
}

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
  { value: 'json', label: 'JSON' },
] as const;

export function ExportDialog({ hasSelection, onClose, onExport }: ExportDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scope, setScope] = useState<ExportScope>(hasSelection ? 'selection' : 'document');
  const [scale, setScale] = useState(2);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useFocusTrap({ enabled: true, containerRef: dialogRef });

  const exportFile = async () => {
    setIsExporting(true);
    try {
      await onExport(format, format === 'json' ? 'document' : scope, scale);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-heading"
      >
        <header className="dialog-header">
          <div>
            <h2 id="export-heading">Export</h2>
            <p>Create a portable file from the current document.</p>
          </div>
          <IconButton label="Close export" icon={<X size={16} />} onClick={onClose} />
        </header>

        <div className="export-preview-row">
          <div className="export-format-mark" data-format={format} aria-hidden="true">
            {format === 'png' ? (
              <Image size={24} />
            ) : format === 'svg' ? (
              <FileCode2 size={24} />
            ) : (
              <FileJson2 size={24} />
            )}
          </div>
          <div>
            <strong>{format.toUpperCase()}</strong>
            <span>
              {format === 'png'
                ? 'Raster image at a chosen scale'
                : format === 'svg'
                  ? 'Editable vector markup'
                  : 'Complete versioned scene document'}
            </span>
          </div>
        </div>

        <div className="dialog-field">
          <span>Format</span>
          <SegmentedControl
            ariaLabel="Export format"
            value={format}
            options={FORMAT_OPTIONS}
            onValueChange={setFormat}
            grow
          />
        </div>

        {format !== 'json' ? (
          <div className="dialog-field">
            <span>Content</span>
            <SegmentedControl
              ariaLabel="Export content"
              value={scope}
              options={[
                { value: 'selection', label: 'Selection', disabled: !hasSelection },
                { value: 'document', label: 'Document' },
              ]}
              onValueChange={setScope}
              grow
            />
          </div>
        ) : null}

        {format === 'png' ? (
          <div className="dialog-field dialog-field--inline">
            <div>
              <span>Scale</span>
              <small>Higher values create larger images.</small>
            </div>
            <NumberField
              value={scale}
              min={0.25}
              max={4}
              step={0.25}
              precision={2}
              suffix="×"
              ariaLabel="PNG export scale"
              onValueChange={setScale}
            />
          </div>
        ) : null}

        <footer className="dialog-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-action"
            disabled={isExporting}
            onClick={() => void exportFile()}
          >
            {isExporting ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          </button>
        </footer>
      </section>
    </div>
  );
}
