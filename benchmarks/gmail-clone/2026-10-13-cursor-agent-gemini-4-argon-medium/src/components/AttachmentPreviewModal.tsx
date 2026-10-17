import React from 'react';
import {
  X,
  Download,
  FileText,
  Table,
  Image as ImageIcon,
  Calendar,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { Attachment, ThemeMode } from '../types/mail';

interface AttachmentPreviewModalProps {
  theme: ThemeMode;
  attachment: Attachment | null;
  onClose: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  theme,
  attachment,
  onClose,
}) => {
  if (!attachment) return null;

  const isDark = theme === 'dark';

  const handleDownload = () => {
    const content =
      attachment.previewContent ||
      `Attachment: ${attachment.name} (${attachment.size})`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderIcon = () => {
    switch (attachment.type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-[#ea4335]" />;
      case 'spreadsheet':
        return <Table className="w-5 h-5 text-[#188038]" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-[#e37400]" />;
      case 'calendar':
        return <Calendar className="w-5 h-5 text-[#1a73e8]" />;
      case 'code':
        return <Code className="w-5 h-5 text-[#9334e6]" />;
      default:
        return <FileText className="w-5 h-5 text-[#1a73e8]" />;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-[#1e1f23] border-white/15 text-[#e3e3e3]'
            : 'bg-white border-gray-200 text-[#1f1f1f]'
        }`}
      >
        {/* Top Bar */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            isDark ? 'border-white/10 bg-[#282a2c]' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {renderIcon()}
            <div className="min-w-0">
              <div className="font-display font-medium text-sm truncate">
                {attachment.name}
              </div>
              <div className="text-xs opacity-65 flex items-center gap-2">
                <span>{attachment.size}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified safe
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Preview Area */}
        <div className="p-6 space-y-4">
          {attachment.previewTitle && (
            <h4 className="font-display text-base font-semibold">
              {attachment.previewTitle}
            </h4>
          )}

          {attachment.previewMeta && (
            <div
              className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl border text-xs ${
                isDark
                  ? 'bg-[#282a2c] border-white/10'
                  : 'bg-[#f8fafd] border-gray-200/80'
              }`}
            >
              {Object.entries(attachment.previewMeta).map(([k, v]) => (
                <div key={k}>
                  <div className="opacity-55 uppercase text-[10px] font-semibold">
                    {k}
                  </div>
                  <div className="font-medium mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          )}

          <pre
            className={`p-4 rounded-2xl border font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap ${
              isDark
                ? 'bg-[#111318] border-white/10 text-gray-200'
                : 'bg-gray-900 border-gray-800 text-gray-100'
            }`}
          >
            {attachment.previewContent ||
              `Previewing ${attachment.name} (${attachment.size})`}
          </pre>
        </div>
      </div>
    </div>
  );
};
