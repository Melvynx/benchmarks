import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  Clock,
  Tag,
  ChevronLeft,
  ChevronRight,
  Printer,
  Star,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Send,
  X,
  Plus,
  Bookmark,
  Minimize2,
  Maximize2,
  CalendarClock,
  FileText,
  Table,
  Image as ImageIcon,
  Calendar,
  Code,
} from 'lucide-react';
import {
  Attachment,
  CustomLabel,
  EmailMessage,
  EmailThread,
  ThemeMode,
} from '../types/mail';
import { CURRENT_USER, SAMPLE_ATTACHABLE_FILES } from '../data/seedData';

interface ThreadViewProps {
  theme: ThemeMode;
  thread: EmailThread;
  labels: CustomLabel[];
  threadIndex: number;
  totalThreads: number;
  isSplitPane: boolean;
  onBack: () => void;
  onNavigateThread: (direction: 'prev' | 'next') => void;
  onArchive: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onSpam: (threadId: string) => void;
  onMarkUnread: (threadId: string) => void;
  onSnooze: (threadId: string, until: string | null) => void;
  onToggleStar: (threadId: string) => void;
  onToggleImportant: (threadId: string) => void;
  onToggleLabel: (threadId: string, labelId: string) => void;
  onSendReply: (
    threadId: string,
    bodyHtml: string,
    to: { name: string; email: string }[],
    attachments: Attachment[]
  ) => void;
  onEditDraftOrScheduled: (thread: EmailThread) => void;
  onPreviewAttachment: (att: Attachment) => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  theme,
  thread,
  labels,
  threadIndex,
  totalThreads,
  isSplitPane,
  onBack,
  onNavigateThread,
  onArchive,
  onDelete,
  onSpam,
  onMarkUnread,
  onSnooze,
  onToggleStar,
  onToggleImportant,
  onToggleLabel,
  onSendReply,
  onEditDraftOrScheduled,
  onPreviewAttachment,
}) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());
  const [detailsMessageId, setDetailsMessageId] = useState<string | null>(null);
  const [showLabelPopover, setShowLabelPopover] = useState(false);
  const [showSnoozePopover, setShowSnoozePopover] = useState(false);

  // Inline Reply State
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(
    null
  );
  const [replyText, setReplyText] = useState('');
  const [replyRecipientInput, setReplyRecipientInput] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);

  // Reset expanded messages when switching threads (expand the last message by default, or all if <= 2)
  useEffect(() => {
    const initialSet = new Set<string>();
    if (thread.messages.length <= 2) {
      thread.messages.forEach((m) => initialSet.add(m.id));
    } else {
      initialSet.add(thread.messages[thread.messages.length - 1].id);
    }
    setExpandedMessageIds(initialSet);
    setDetailsMessageId(null);
    setReplyMode(null);
    setReplyText('');
    setReplyAttachments([]);
  }, [thread.id, thread.messages.length]);

  const isDark = theme === 'dark';
  const lastMessage = thread.messages[thread.messages.length - 1];
  const allExpanded = expandedMessageIds.size === thread.messages.length;

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedMessageIds(new Set([lastMessage.id]));
    } else {
      setExpandedMessageIds(new Set(thread.messages.map((m) => m.id)));
    }
  };

  const toggleMessageExpand = (msgId: string) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId) && next.size > 1) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const startReply = (
    mode: 'reply' | 'replyAll' | 'forward',
    prefillText = ''
  ) => {
    setReplyMode(mode);
    if (prefillText) {
      setReplyText(prefillText);
    }
    if (mode === 'forward') {
      setReplyRecipientInput('');
      if (!prefillText) {
        setReplyText(
          `\n\n---------- Forwarded message ---------\nFrom: ${lastMessage.sender.name} <${lastMessage.sender.email}>\nDate: ${lastMessage.fullDate}\nSubject: ${thread.subject}\n\n`
        );
      }
    } else {
      const targetEmail =
        lastMessage.sender.email === CURRENT_USER.email
          ? lastMessage.to[0]?.email || ''
          : lastMessage.sender.email;
      setReplyRecipientInput(targetEmail);
    }
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const htmlBody = replyText
      .split('\n\n')
      .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const recipients = replyRecipientInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((email) => ({
        name: email.split('@')[0],
        email,
      }));

    onSendReply(
      thread.id,
      htmlBody,
      recipients.length > 0
        ? recipients
        : [{ name: lastMessage.sender.name, email: lastMessage.sender.email }],
      replyAttachments
    );

    setReplyMode(null);
    setReplyText('');
    setReplyAttachments([]);
  };

  const handleDownloadAttachment = (att: Attachment) => {
    const content =
      att.previewContent ||
      `Attachment: ${att.name}\nSize: ${att.size}\nDownloaded from Gemini 4 Argon`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
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
        return <Paperclip className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div
      className={`flex flex-col h-full min-w-0 overflow-hidden select-text ${
        isDark ? 'bg-[#1e1f23] text-[#e3e3e3]' : 'bg-white text-[#1f1f1f]'
      }`}
    >
      {/* Top Sticky Action Bar */}
      <div
        className={`h-12 px-2 md:px-4 flex items-center justify-between border-b shrink-0 select-none ${
          isDark ? 'border-white/10 bg-[#1e1f23]' : 'border-gray-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-0.5 md:gap-1">
          <button
            onClick={onBack}
            title={isSplitPane ? 'Close reading pane (u)' : 'Back to list (u)'}
            aria-label="Back to thread list"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 mr-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onArchive(thread.id)}
            title="Archive (e)"
            aria-label="Archive conversation"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSpam(thread.id)}
            title="Report spam"
            aria-label="Report spam"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(thread.id)}
            title="Delete (#)"
            aria-label="Delete conversation"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-gray-300 dark:bg-white/15 mx-1" />

          <button
            onClick={() => onMarkUnread(thread.id)}
            title="Mark as unread (Shift+U)"
            aria-label="Mark as unread"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <Mail className="w-4 h-4" />
          </button>

          {/* Snooze Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSnoozePopover((v) => !v);
                setShowLabelPopover(false);
              }}
              title="Snooze"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
            </button>
            {showSnoozePopover && (
              <div
                className={`absolute left-0 top-9 w-48 py-1.5 rounded-xl shadow-xl border z-40 text-xs ${
                  isDark
                    ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                    : 'bg-white border-gray-200 text-[#1f1f1f]'
                }`}
              >
                <div className="px-3 py-1 font-semibold opacity-60">Snooze until...</div>
                {['Later today, 6:00 PM', 'Tomorrow, 9:00 AM', 'Next week, Mon 9:00 AM'].map(
                  (opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onSnooze(thread.id, opt);
                        setShowSnoozePopover(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      {opt}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Labels Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLabelPopover((v) => !v);
                setShowSnoozePopover(false);
              }}
              title="Labels"
              aria-label="Labels"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <Tag className="w-4 h-4" />
            </button>
            {showLabelPopover && (
              <div
                className={`absolute left-0 top-9 w-48 py-2 rounded-xl shadow-xl border z-40 text-xs ${
                  isDark
                    ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                    : 'bg-white border-gray-200 text-[#1f1f1f]'
                }`}
              >
                <div className="px-3 py-1 font-semibold opacity-60">Apply labels:</div>
                {labels.map((lbl) => {
                  const active = thread.labels.includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      onClick={() => onToggleLabel(thread.id, lbl.id)}
                      className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={active}
                        className="rounded accent-[#1a73e8] pointer-events-none"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: lbl.color }}
                      />
                      <span>{lbl.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Expand/Collapse All, Print, Prev/Next */}
        <div className="flex items-center gap-1">
          {thread.messages.length > 1 && (
            <button
              onClick={toggleExpandAll}
              title={allExpanded ? 'Collapse all messages' : 'Expand all messages'}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              {allExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={() => window.print()}
            title="Print all"
            className="hidden sm:inline-flex p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>

          {totalThreads > 0 && (
            <>
              <span className="text-xs opacity-65 mx-1.5">
                {threadIndex + 1} of {totalThreads}
              </span>
              <button
                disabled={threadIndex <= 0}
                onClick={() => onNavigateThread('prev')}
                title="Newer (k)"
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={threadIndex >= totalThreads - 1}
                onClick={() => onNavigateThread('next')}
                title="Older (j)"
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Scrollable Thread Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 space-y-5">
        {/* Scheduled or Snoozed Banner */}
        {(thread.folder === 'scheduled' ||
          thread.folder === 'drafts' ||
          thread.isSnoozed) && (
          <div
            className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
              isDark
                ? 'bg-[#282a2c] border-white/10 text-gray-200'
                : 'bg-[#f2f6fc] border-blue-200/70 text-[#1f1f1f]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs md:text-sm">
              <CalendarClock className="w-4 h-4 text-[#1a73e8] shrink-0" />
              <span>
                {thread.folder === 'scheduled'
                  ? `Send scheduled for ${thread.scheduledFor || 'Fri, Oct 16, 9:00 AM'}`
                  : thread.folder === 'drafts'
                    ? 'This conversation is saved as a draft.'
                    : `Snoozed until ${thread.snoozedUntil}`}
              </span>
            </div>
            {thread.isSnoozed ? (
              <button
                onClick={() => onSnooze(thread.id, null)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] cursor-pointer"
              >
                Unsnooze
              </button>
            ) : (
              <button
                onClick={() => onEditDraftOrScheduled(thread)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] cursor-pointer"
              >
                {thread.folder === 'scheduled' ? 'Cancel send & edit' : 'Resume draft'}
              </button>
            )}
          </div>
        )}

        {/* Subject Line + Labels Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <h2 className="font-display text-lg md:text-[22px] font-normal leading-snug break-words">
              {thread.subject || '(no subject)'}
            </h2>

            <button
              onClick={() => onToggleImportant(thread.id)}
              title={thread.isImportant ? 'Marked as important' : 'Mark as important'}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <Bookmark
                className={`w-4 h-4 rotate-90 ${
                  thread.isImportant
                    ? 'text-[#f4b400] fill-[#f4b400]'
                    : 'opacity-35 hover:opacity-75'
                }`}
              />
            </button>

            {/* Folder Badge */}
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200/80 text-gray-700'
              }`}
            >
              {thread.folder}
            </span>

            {/* Applied Labels */}
            {thread.labels.map((lid) => {
              const lbl = labels.find((l) => l.id === lid);
              if (!lbl) return null;
              return (
                <span
                  key={lid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${lbl.color}22`,
                    color: isDark ? '#e3e3e3' : lbl.color,
                    border: `1px solid ${lbl.color}45`,
                  }}
                >
                  <span>{lbl.name}</span>
                  <button
                    onClick={() => onToggleLabel(thread.id, lid)}
                    title={`Remove ${lbl.name} label`}
                    className="hover:opacity-75 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Message Stack */}
        <div className="space-y-3">
          {thread.messages.map((msg, idx) => {
            const isExpanded = expandedMessageIds.has(msg.id);
            const isLast = idx === thread.messages.length - 1;
            const showDetails = detailsMessageId === msg.id;

            if (!isExpanded && !isLast) {
              // Collapsed earlier message header row
              return (
                <div
                  key={msg.id}
                  onClick={() => toggleMessageExpand(msg.id)}
                  className={`px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-[#16181c] border-white/10 hover:bg-[#222429]'
                      : 'bg-[#f8fafd] border-gray-200/80 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: msg.sender.avatarColor }}
                    >
                      {msg.sender.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <span className="font-semibold text-sm shrink-0">
                      {msg.sender.name}
                    </span>
                    <span className="text-xs opacity-65 truncate">
                      — {msg.body.replace(/<[^>]*>/g, ' ').slice(0, 120)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs opacity-65">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <Paperclip className="w-3.5 h-3.5" />
                    )}
                    <span>{msg.displayTime}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#1e1f23] border-white/10'
                    : 'bg-white border-gray-200/90 shadow-2xs'
                }`}
              >
                {/* Message Header */}
                <div
                  onClick={() => {
                    if (thread.messages.length > 1) toggleMessageExpand(msg.id);
                  }}
                  className={`px-4 pt-4 pb-2 flex items-start justify-between gap-3 ${
                    thread.messages.length > 1 ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full text-white text-sm font-semibold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: msg.sender.avatarColor }}
                    >
                      {msg.sender.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm">{msg.sender.name}</span>
                        <span className="text-xs opacity-60 truncate">
                          &lt;{msg.sender.email}&gt;
                        </span>
                        {msg.sender.role && (
                          <span
                            className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] ${
                              isDark
                                ? 'bg-white/5 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {msg.sender.role}
                          </span>
                        )}
                      </div>

                      {/* Recipient + Security Metadata Trigger */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsMessageId(showDetails ? null : msg.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100 mt-0.5 cursor-pointer"
                      >
                        <span>
                          to{' '}
                          {msg.to
                            .map((r) =>
                              r.email === CURRENT_USER.email ? 'me' : r.name
                            )
                            .join(', ')}
                        </span>
                        {showDetails ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {showDetails && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`mt-2 p-3 rounded-xl border text-xs space-y-1 ${
                            isDark
                              ? 'bg-[#282a2c] border-white/15 text-gray-300'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div>
                            <span className="opacity-60 inline-block w-20">from:</span>
                            <strong className="font-medium">{msg.sender.name}</strong> &lt;
                            {msg.sender.email}&gt;
                          </div>
                          <div>
                            <span className="opacity-60 inline-block w-20">to:</span>
                            {msg.to.map((r) => `${r.name} <${r.email}>`).join(', ')}
                          </div>
                          {msg.cc && msg.cc.length > 0 && (
                            <div>
                              <span className="opacity-60 inline-block w-20">cc:</span>
                              {msg.cc.map((r) => `${r.name} <${r.email}>`).join(', ')}
                            </div>
                          )}
                          <div>
                            <span className="opacity-60 inline-block w-20">date:</span>
                            {msg.fullDate}
                          </div>
                          <div>
                            <span className="opacity-60 inline-block w-20">subject:</span>
                            {thread.subject}
                          </div>
                          <div className="flex items-center gap-1 pt-0.5 text-emerald-600 dark:text-emerald-400">
                            <Lock className="w-3 h-3" />
                            <span>Standard encryption (TLS 1.3 Verified)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side of Message Header */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <span className="text-xs opacity-65 mr-1">{msg.displayTime}</span>
                    <button
                      onClick={() => onToggleStar(thread.id)}
                      title="Star conversation"
                      className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          thread.isStarred
                            ? 'text-[#f4b400] fill-[#f4b400]'
                            : 'opacity-45'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => startReply('reply')}
                      title="Reply"
                      className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <Reply className="w-4 h-4 opacity-70" />
                    </button>
                  </div>
                </div>

                {/* Message Body Content */}
                <div className="px-4 md:px-14 pb-5 pt-2">
                  <div
                    className={`prose prose-sm max-w-none text-[14.5px] leading-relaxed space-y-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic ${
                      isDark
                        ? 'text-gray-200 [&_code]:bg-white/10 [&_blockquote]:border-white/20'
                        : 'text-[#1f1f1f] [&_code]:bg-gray-100 [&_blockquote]:border-gray-300'
                    }`}
                    dangerouslySetInnerHTML={{ __html: msg.body }}
                  />

                  {/* Attachments Grid */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-200/70 dark:border-white/10">
                      <div className="text-xs font-semibold opacity-70 mb-2.5">
                        {msg.attachments.length}{' '}
                        {msg.attachments.length === 1 ? 'Attachment' : 'Attachments'} •
                        Scanned by Argon Threat Shield
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            onClick={() => onPreviewAttachment(att)}
                            className={`group w-64 rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isDark
                                ? 'bg-[#282a2c] border-white/10 hover:border-[#a8c7fa]/50'
                                : 'bg-[#f8fafd] border-gray-200 hover:border-[#1a73e8]/50 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                  isDark ? 'bg-[#1e1f23]' : 'bg-white shadow-2xs'
                                }`}
                              >
                                {renderAttachmentIcon(att.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">
                                  {att.name}
                                </div>
                                <div className="text-[11px] opacity-60">{att.size}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreviewAttachment(att);
                                }}
                                title="Preview attachment"
                                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadAttachment(att);
                                }}
                                title="Download attachment"
                                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Smart Reply Chips */}
        {!replyMode && thread.smartReplies && thread.smartReplies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {thread.smartReplies.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => startReply('reply', suggestion)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isDark
                    ? 'border-[#a8c7fa]/40 text-[#a8c7fa] hover:bg-[#a8c7fa]/10'
                    : 'border-gray-300 text-[#1a73e8] hover:bg-[#e8f0fe] hover:border-[#1a73e8]/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply / Reply All / Forward Buttons OR Inline Composer */}
        {!replyMode ? (
          <div className="flex flex-wrap items-center gap-2.5 pt-1 pb-6">
            <button
              type="button"
              onClick={() => startReply('reply')}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/20 hover:bg-white/10 text-gray-200'
                  : 'border-gray-400/80 hover:bg-gray-100 text-[#444746]'
              }`}
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>

            <button
              type="button"
              onClick={() => startReply('replyAll')}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/20 hover:bg-white/10 text-gray-200'
                  : 'border-gray-400/80 hover:bg-gray-100 text-[#444746]'
              }`}
            >
              <ReplyAll className="w-4 h-4" />
              <span>Reply all</span>
            </button>

            <button
              type="button"
              onClick={() => startReply('forward')}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/20 hover:bg-white/10 text-gray-200'
                  : 'border-gray-400/80 hover:bg-gray-100 text-[#444746]'
              }`}
            >
              <Forward className="w-4 h-4" />
              <span>Forward</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitReply}
            className={`rounded-2xl border p-4 shadow-md mb-6 ${
              isDark
                ? 'bg-[#282a2c] border-white/15'
                : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-gray-200/60 dark:border-white/10">
              <div className="flex items-center gap-2 text-xs flex-1">
                <span className="font-semibold uppercase opacity-60">
                  {replyMode === 'forward' ? 'Forward to:' : 'To:'}
                </span>
                <input
                  type="text"
                  value={replyRecipientInput}
                  onChange={(e) => setReplyRecipientInput(e.target.value)}
                  placeholder="Recipient email address..."
                  className="bg-transparent outline-none flex-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setReplyMode(null)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={5}
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full bg-transparent outline-none text-sm resize-y leading-relaxed"
            />

            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 my-2">
                {replyAttachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-black/5 dark:bg-white/10"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>{att.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyAttachments((prev) =>
                          prev.filter((a) => a.id !== att.id)
                        )
                      }
                      className="cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-[#0b57d0] hover:bg-[#0842a0] text-white cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextSample =
                      SAMPLE_ATTACHABLE_FILES[
                        replyAttachments.length % SAMPLE_ATTACHABLE_FILES.length
                      ];
                    if (!replyAttachments.some((a) => a.id === nextSample.id)) {
                      setReplyAttachments((prev) => [...prev, nextSample]);
                    }
                  }}
                  title="Attach file"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach report</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReplyMode(null);
                  setReplyText('');
                }}
                title="Discard draft"
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
