import React from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { Attachment, ThemeMode } from '../types/mail';

interface AttachmentPreviewModalProps {
  attachment: Attachment | null;
  onClose: () => void;
  onDownload: (att: Attachment) => void;
  theme: ThemeMode;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  onClose,
  onDownload,
  theme,
}) => {
  if (!attachment) return null;
  const isDark = theme === 'dark';

  const getIcon = () => {
    switch (attachment.type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-[#D93025]" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-5 h-5 text-[#188038]" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-[#0B57D0]" />;
      default:
        return <FileText className="w-5 h-5 text-[#EA4335]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Attachment preview: ${attachment.name}`}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[86vh] ${
          isDark
            ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
            : 'bg-white border-[#DADCE0] text-[#1F1F1F]'
        }`}
      >
        {/* Top Bar */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#282A2C] border-[#444746]' : 'bg-[#F8FAFD] border-[#E8EAED]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {getIcon()}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{attachment.name}</div>
              <div className="text-[11px] opacity-65 flex items-center gap-2">
                <span className="uppercase">{attachment.type}</span>
                <span>·</span>
                <span className="tabular-nums">{attachment.size}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-[#188038] dark:text-[#81C995]">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Safe
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(attachment)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 rounded-full hover:bg-current/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Content Preview Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {attachment.previewTitle && (
            <h3 className="text-base font-semibold tracking-tight">{attachment.previewTitle}</h3>
          )}

          {attachment.previewMeta && (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-xl border text-xs ${
                isDark
                  ? 'bg-[#282A2C] border-[#444746]'
                  : 'bg-[#F8FAFD] border-[#E0E2E0]'
              }`}
            >
              {Object.entries(attachment.previewMeta).map(([k, v]) => (
                <div key={k}>
                  <span className="opacity-65 block text-[11px]">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          )}

          {attachment.type === 'image' && (
            <div className="rounded-xl overflow-hidden border border-current/10 bg-[#141619] p-4 text-white">
              <div className="text-xs font-mono opacity-75 mb-3">
                raft-fra-04 Flamegraph Capture (99Hz · 300s · 96 Cores)
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="bg-[#D93025] px-3 py-1.5 rounded w-full">
                  all_cpus (100.0% · 29,700 samples)
                </div>
                <div className="flex gap-1">
                  <div className="bg-[#E37400] px-2.5 py-1.5 rounded w-[62%] truncate">
                    raft::consensus::Replicator::append_entries_batch (38.2%)
                  </div>
                  <div className="bg-[#F9AB00] text-black px-2.5 py-1.5 rounded w-[38%] truncate">
                    rocksdb::DBImpl::WriteImplWALOnly (24.6%)
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="bg-[#188038] px-2.5 py-1.5 rounded w-[45%] truncate">
                    zstd::compress_frame_mt (14.1%)
                  </div>
                  <div className="bg-[#0B57D0] px-2.5 py-1.5 rounded w-[35%] truncate">
                    kernel::io_uring_enter (11.4%)
                  </div>
                  <div className="bg-[#9334E6] px-2.5 py-1.5 rounded w-[20%] truncate">
                    grpc::AsyncNext (11.7%)
                  </div>
                </div>
              </div>
            </div>
          )}

          <pre
            className={`p-4 rounded-xl border text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto ${
              isDark
                ? 'bg-[#141619] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-[#F8FAFD] border-[#E0E2E0] text-[#1F1F1F]'
            }`}
          >
            {attachment.previewContent || `Previewing ${attachment.name} (${attachment.size})`}
          </pre>
        </div>
      </div>
    </div>
  );
};
