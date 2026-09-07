import React from 'react';
import {
  Star,
  Tag,
  Paperclip,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
} from 'lucide-react';
import { Thread, DensityMode } from '../types/mail';
import { useMail } from '../context/MailContext';

interface MailRowProps {
  thread: Thread;
  density: DensityMode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const MailRow: React.FC<MailRowProps> = ({
  thread,
  density,
  isSelected,
  onSelect,
  onClick,
}) => {
  const {
    toggleStarThread,
    toggleImportantThread,
    archiveThread,
    deleteThread,
    markThreadRead,
    setSnoozeTargetThreadId,
    labels: allLabels,
  } = useMail();

  const isUnread = thread.unreadCount > 0;
  const numMessages = thread.messages.length;

  // Format participant names
  const participantNames = React.useMemo(() => {
    if (thread.folder === 'sent' && thread.messages[0]?.to?.length) {
      return `To: ${thread.messages[0].to.map((t) => t.name).join(', ')}`;
    }
    const names = Array.from(new Set(thread.participants.map((p) => p.name)));
    if (names.length <= 2) return names.join(', ');
    return `${names[0]}, ${names[1]} (+${names.length - 2})`;
  }, [thread]);

  // Format friendly timestamp
  const formattedTime = React.useMemo(() => {
    const d = new Date(thread.lastMessageDate);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }

    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, [thread.lastMessageDate]);

  // Height and padding based on density
  const densityStyles = {
    compact: 'py-1 text-xs',
    comfortable: 'py-2.5 text-sm',
    default: 'py-2.5 sm:py-3 text-sm',
  }[density];

  // Map thread labels to custom label objects
  const threadLabelObjs = React.useMemo(() => {
    return thread.labels
      .map((lid) => allLabels.find((l) => l.id === lid))
      .filter(Boolean);
  }, [thread.labels, allLabels]);

  const allAttachments = React.useMemo(() => {
    const list: any[] = [];
    thread.messages.forEach((m) => {
      if (m.attachments) {
        m.attachments.forEach((att) => {
          if (!list.some((existing) => existing.id === att.id)) {
            list.push(att);
          }
        });
      }
    });
    return list;
  }, [thread.messages]);

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center border-b border-gray-100 dark:border-gray-800/80 cursor-pointer transition-colors px-2 sm:px-4 ${densityStyles} ${
        isSelected
          ? 'bg-[#c2e7ff]/40 dark:bg-[#004a77]/30'
          : isUnread
          ? 'bg-white dark:bg-[#1f1f1f] hover:bg-gray-50 dark:hover:bg-gray-800/40 shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]'
          : 'bg-[#f8fafd]/80 dark:bg-[#181818] hover:bg-gray-100/70 dark:hover:bg-gray-800/40 opacity-90'
      }`}
    >
      {/* Selection border indicator on left */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
      )}

      {/* Left controls: Checkbox, Star, Important marker */}
      <div
        className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e as any)}
          className="w-4 h-4 rounded text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer"
        />

        {/* Star Button */}
        <button
          onClick={(e) => toggleStarThread(thread.id, e)}
          className="p-1 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-full transition-colors"
          title={thread.isStarred ? 'Starred' : 'Not starred'}
        >
          <Star
            className={`w-4 h-4 ${
              thread.isStarred
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
            }`}
          />
        </button>

        {/* Important Tag */}
        <button
          onClick={(e) => toggleImportantThread(thread.id, e)}
          className="hidden sm:block p-1 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-full transition-colors"
          title={thread.isImportant ? 'Marked as important' : 'Not important'}
        >
          <Tag
            className={`w-4 h-4 ${
              thread.isImportant
                ? 'fill-amber-500 text-amber-500'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Sender / Participants */}
      <div
        className={`w-36 sm:w-48 shrink-0 truncate mr-3 ${
          isUnread
            ? 'font-bold text-gray-900 dark:text-white'
            : 'font-normal text-gray-700 dark:text-gray-300'
        }`}
      >
        <span className="truncate">{participantNames}</span>
        {numMessages > 1 && (
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
            ({numMessages})
          </span>
        )}
      </div>

      {/* Subject, Label Chips, Snippet & Attachment Badges */}
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
        <div className="flex items-center gap-1.5 truncate">
          {/* Custom Labels Chips */}
          {threadLabelObjs.map((label) => (
            <span
              key={label!.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide shrink-0 border"
              style={{
                backgroundColor: label!.bgColor,
                color: label!.textColor,
                borderColor: `${label!.color}40`,
              }}
            >
              {label!.name}
            </span>
          ))}

          {/* Subject */}
          <span
            className={`truncate ${
              isUnread
                ? 'font-bold text-gray-900 dark:text-gray-100'
                : 'font-normal text-gray-700 dark:text-gray-300'
            }`}
          >
            {thread.subject}
          </span>

          <span className="text-gray-400 dark:text-gray-500 shrink-0 mx-1">-</span>

          {/* Snippet */}
          <span className="text-gray-500 dark:text-gray-400 truncate font-normal">
            {thread.snippet}
          </span>
        </div>

        {/* Attachment chips in default density view */}
        {density === 'default' && allAttachments.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar">
            {allAttachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 transition-colors shrink-0"
              >
                {att.type === 'pdf' ? (
                  <FileText className="w-3 h-3 text-red-500" />
                ) : att.type === 'image' ? (
                  <ImageIcon className="w-3 h-3 text-blue-500" />
                ) : att.type === 'sheet' ? (
                  <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Paperclip className="w-3 h-3 text-gray-500" />
                )}
                <span className="max-w-[120px] truncate">{att.filename}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Timestamp OR Quick Actions on Hover */}
      <div className="relative shrink-0 ml-3 min-w-[80px] flex justify-end items-center">
        {/* Normal state: Date / Time */}
        <div className="group-hover:hidden text-xs text-gray-500 dark:text-gray-400 font-medium">
          {formattedTime}
        </div>

        {/* Hover state: Instant Quick Actions Bar */}
        <div
          className="hidden group-hover:flex items-center gap-1 text-gray-600 dark:text-gray-300 bg-white/95 dark:bg-[#1f1f1f]/95 py-0.5 px-1 rounded-md shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => archiveThread(thread.id)}
            className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteThread(thread.id)}
            className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => markThreadRead(thread.id, !isUnread)}
            className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded transition-colors"
            title={isUnread ? 'Mark as read' : 'Mark as unread'}
          >
            {isUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSnoozeTargetThreadId(thread.id)}
            className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded transition-colors"
            title="Snooze"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
