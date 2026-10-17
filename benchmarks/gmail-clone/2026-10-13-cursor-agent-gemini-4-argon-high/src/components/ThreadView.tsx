import React, { useState, useEffect } from 'react';
import {
  Star,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Printer,
  ChevronsUpDown,
  ChevronDown,
  Paperclip,
  Download,
  Eye,
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  Plus,
  Send,
  Trash2,
  Bold,
  Italic,
  List,
  Code,
  Maximize2,
  Clock,
  ShieldCheck,
  Bookmark,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import {
  Attachment,
  Contact,
  CustomLabel,
  EmailMessage,
  EmailThread,
  ThemeMode,
} from '../types/mail';
import { SMART_REPLIES_BY_THREAD } from '../data/seedData';

interface ThreadViewProps {
  thread: EmailThread;
  labels: CustomLabel[];
  currentUser: Contact;
  onToggleStarThread: (threadId: string) => void;
  onToggleImportantThread: (threadId: string) => void;
  onToggleLabelOnThread: (threadId: string, labelId: string) => void;
  onRemoveFromInbox: (threadId: string) => void;
  onUnsnoozeThread: (threadId: string) => void;
  onCancelScheduledSend: (thread: EmailThread) => void;
  onSendReply: (
    threadId: string,
    bodyHtml: string,
    toContacts: Contact[],
    attachments: Attachment[],
    scheduledFor?: string
  ) => void;
  onPopOutReply: (
    thread: EmailThread,
    mode: 'reply' | 'replyAll' | 'forward',
    draftBody: string
  ) => void;
  onUpdateRsvp: (
    threadId: string,
    messageId: string,
    status: 'yes' | 'maybe' | 'no'
  ) => void;
  onPreviewAttachment: (att: Attachment) => void;
  onDownloadAttachment: (att: Attachment) => void;
  onClosePane?: () => void;
  theme: ThemeMode;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  labels,
  currentUser,
  onToggleStarThread,
  onToggleImportantThread,
  onToggleLabelOnThread,
  onRemoveFromInbox,
  onUnsnoozeThread,
  onCancelScheduledSend,
  onSendReply,
  onPopOutReply,
  onUpdateRsvp,
  onPreviewAttachment,
  onDownloadAttachment,
  onClosePane,
  theme,
}) => {
  const [expandedMsgIds, setExpandedMsgIds] = useState<Set<string>>(new Set());
  const [headerDetailsMsgIds, setHeaderDetailsMsgIds] = useState<Set<string>>(new Set());
  const [showAddLabelPopover, setShowAddLabelPopover] = useState(false);

  // Inline composer state
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [forwardToEmail, setForwardToEmail] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [showScheduleReplyMenu, setShowScheduleReplyMenu] = useState(false);

  // Whenever the active thread changes, expand the last message (and any unread messages) by default
  useEffect(() => {
    const initialExpanded = new Set<string>();
    if (thread.messages.length > 0) {
      initialExpanded.add(thread.messages[thread.messages.length - 1].id);
      if (thread.messages.length <= 2) {
        thread.messages.forEach((m) => initialExpanded.add(m.id));
      }
    }
    setExpandedMsgIds(initialExpanded);
    setHeaderDetailsMsgIds(new Set());
    setReplyMode(null);
    setReplyBody('');
    setReplyAttachments([]);
  }, [thread.id, thread.messages.length]);

  const isDark = theme === 'dark';
  const lastMsg = thread.messages[thread.messages.length - 1];
  const smartReplies = SMART_REPLIES_BY_THREAD[thread.id] || [
    'Sounds good, thank you!',
    'Got it — I will review and follow up shortly.',
    'Let’s sync on this later today.',
  ];

  const allExpanded = thread.messages.every((m) => expandedMsgIds.has(m.id));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedMsgIds(new Set([lastMsg.id]));
    } else {
      setExpandedMsgIds(new Set(thread.messages.map((m) => m.id)));
    }
  };

  const toggleMessageExpanded = (msgId: string) => {
    setExpandedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        if (next.size > 1) next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const toggleHeaderDetails = (msgId: string) => {
    setHeaderDetailsMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const startInlineCompose = (mode: 'reply' | 'replyAll' | 'forward', prefill = '') => {
    setReplyMode(mode);
    if (prefill) {
      setReplyBody(prefill);
    } else if (mode === 'forward' && !replyBody) {
      setReplyBody(
        `---------- Forwarded message ---------\nFrom: ${lastMsg.sender.name} <${lastMsg.sender.email}>\nDate: ${lastMsg.fullDateStr}\nSubject: ${thread.subject}\n\n${lastMsg.snippet}\n\n`
      );
      if (lastMsg.attachments) {
        setReplyAttachments([...lastMsg.attachments]);
      }
    }
  };

  const handleSendInline = (scheduledFor?: string) => {
    if (!replyBody.trim()) return;
    const html = replyBody
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    let recipients: Contact[] = [];
    if (replyMode === 'forward' && forwardToEmail.trim()) {
      recipients = [
        {
          id: `c-${Date.now()}`,
          name: forwardToEmail.split('@')[0],
          email: forwardToEmail.trim(),
          avatarColor: '#0B57D0',
        },
      ];
    } else if (replyMode === 'replyAll') {
      const allParticipants = [lastMsg.sender, ...lastMsg.to, ...(lastMsg.cc || [])].filter(
        (p) => p.id !== currentUser.id
      );
      recipients = allParticipants.length > 0 ? allParticipants : [lastMsg.sender];
    } else {
      recipients =
        lastMsg.sender.id === currentUser.id ? lastMsg.to : [lastMsg.sender];
    }

    onSendReply(thread.id, html, recipients, replyAttachments, scheduledFor);
    setReplyMode(null);
    setReplyBody('');
    setReplyAttachments([]);
    setShowScheduleReplyMenu(false);
  };

  const handleAddSampleAttachment = () => {
    const newAtt: Attachment = {
      id: `att-reply-${Date.now()}`,
      name: 'verification-metrics-signoff.pdf',
      size: '420 KB',
      type: 'pdf',
      previewTitle: 'Verification Metrics Sign-off',
      previewContent: 'Attached verification benchmark logs and latency sign-off sheet.',
    };
    setReplyAttachments((prev) => [...prev, newAtt]);
  };

  const getAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-[#D93025] shrink-0" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-4 h-4 text-[#188038] shrink-0" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-[#0B57D0] shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-[#EA4335] shrink-0" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-7 py-5 select-text">
      {/* Subject Header & Label Strip */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-current/10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-[20px] md:text-[22px] font-normal leading-snug tracking-[-0.01em]"
              style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
            >
              {thread.subject || '(no subject)'}
            </h2>

            <button
              type="button"
              onClick={() => onToggleImportantThread(thread.id)}
              title={thread.isImportant ? 'Important' : 'Mark as important'}
              className={`p-1 rounded transition-colors cursor-pointer ${
                thread.isImportant ? 'text-[#F4B400]' : 'opacity-35 hover:opacity-80'
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                fill={thread.isImportant ? '#F4B400' : 'none'}
              />
            </button>

            {/* Folder Badge */}
            {thread.folder === 'inbox' && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  isDark ? 'bg-[#282A2C] text-[#C4C7C5]' : 'bg-[#EAEBEF] text-[#444746]'
                }`}
              >
                Inbox
                <button
                  type="button"
                  onClick={() => onRemoveFromInbox(thread.id)}
                  title="Remove label Inbox (Archive)"
                  className="hover:opacity-100 opacity-65 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Custom Labels */}
            {thread.labels.map((lblId) => {
              const lbl = labels.find((l) => l.id === lblId);
              if (!lbl) return null;
              return (
                <span
                  key={lbl.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: isDark ? lbl.darkBgColor : lbl.color,
                    color: isDark ? lbl.darkTextColor : lbl.textColor,
                  }}
                >
                  {lbl.name}
                  <button
                    type="button"
                    onClick={() => onToggleLabelOnThread(thread.id, lbl.id)}
                    title={`Remove label ${lbl.name}`}
                    className="hover:opacity-100 opacity-70 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Add Label Inline Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddLabelPopover((p) => !p)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-dashed transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#5F6368] text-[#C4C7C5] hover:bg-[#282A2C]'
                    : 'border-[#C4C7C5] text-[#5F6368] hover:bg-[#F2F6FC]'
                }`}
              >
                <Plus className="w-3 h-3" />
                Label
              </button>

              {showAddLabelPopover && (
                <div
                  className={`absolute left-0 top-7 z-30 w-48 rounded-xl shadow-xl border p-1.5 text-xs ${
                    isDark
                      ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                      : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
                  }`}
                >
                  {labels.map((lbl) => {
                    const active = thread.labels.includes(lbl.id);
                    return (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => {
                          onToggleLabelOnThread(thread.id, lbl.id);
                          setShowAddLabelPopover(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: isDark ? lbl.darkTextColor : lbl.textColor,
                            }}
                          />
                          {lbl.name}
                        </span>
                        {active && <Check className="w-3.5 h-3.5 text-[#0B57D0]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {thread.messages.length > 1 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              title={allExpanded ? 'Collapse all' : 'Expand all'}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
              }`}
            >
              <ChevronsUpDown className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            title="Print all"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
            }`}
          >
            <Printer className="w-4 h-4" />
          </button>
          {onClosePane && (
            <button
              type="button"
              onClick={onClosePane}
              title="Close reading pane"
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Snoozed / Scheduled Status Banner */}
      {thread.snoozedUntil && (
        <div
          className={`mt-3 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs border ${
            isDark
              ? 'bg-[#3C2F1E] border-[#E37400]/40 text-[#FDD663]'
              : 'bg-[#FEF7E0] border-[#FDE293] text-[#7A4F01]'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-[#E37400]" />
            Snoozed until {thread.snoozedUntil}
          </span>
          <button
            type="button"
            onClick={() => onUnsnoozeThread(thread.id)}
            className="font-semibold underline cursor-pointer"
          >
            Unsnooze
          </button>
        </div>
      )}

      {thread.scheduledFor && (
        <div
          className={`mt-3 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs border ${
            isDark
              ? 'bg-[#004A77]/40 border-[#A8C7FA]/30 text-[#C2E7FF]'
              : 'bg-[#EAF1FB] border-[#D3E3FD] text-[#041E49]'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
            Send scheduled for {thread.scheduledFor}
          </span>
          <button
            type="button"
            onClick={() => onCancelScheduledSend(thread)}
            className="px-3 py-1 rounded-md font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] transition-colors cursor-pointer"
          >
            Cancel send
          </button>
        </div>
      )}

      {/* Messages Accordion Stack */}
      <div className="divide-y divide-current/10 mt-2">
        {thread.messages.map((msg, idx) => {
          const isExpanded = expandedMsgIds.has(msg.id);
          const showHeaders = headerDetailsMsgIds.has(msg.id);
          const isLast = idx === thread.messages.length - 1;
          const initials = msg.sender.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          if (!isExpanded) {
            return (
              <div
                key={msg.id}
                onClick={() => toggleMessageExpanded(msg.id)}
                className={`py-3 px-2 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-lg ${
                  isDark ? 'hover:bg-[#282A2C]' : 'hover:bg-[#F8FAFD]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ backgroundColor: msg.sender.avatarColor }}
                  >
                    {initials}
                  </div>
                  <span className="text-sm font-semibold shrink-0">{msg.sender.name}</span>
                  <span className="text-xs opacity-65 truncate">{msg.snippet}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs opacity-70 tabular-nums">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <Paperclip className="w-3.5 h-3.5" />
                  )}
                  <span>{msg.displayTime}</span>
                </div>
              </div>
            );
          }

          return (
            <article key={msg.id} className="py-5">
              {/* Message Header */}
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => !isLast && toggleMessageExpanded(msg.id)}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 mt-0.5 shadow-xs"
                    style={{ backgroundColor: msg.sender.avatarColor }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[14px] font-semibold">{msg.sender.name}</span>
                      <span className="text-xs opacity-65">&lt;{msg.sender.email}&gt;</span>
                      {msg.sender.role && (
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded ${
                            isDark
                              ? 'bg-[#282A2C] text-[#A8C7FA]'
                              : 'bg-[#EAF1FB] text-[#0B57D0]'
                          }`}
                        >
                          {msg.sender.role}
                        </span>
                      )}
                    </div>

                    {/* Recipient subline + Header details toggle */}
                    <div className="flex items-center gap-1 text-xs opacity-70 mt-0.5">
                      <span>
                        to{' '}
                        {msg.to
                          .map((r) => (r.id === currentUser.id ? 'me' : r.name.split(' ')[0]))
                          .join(', ')}
                        {msg.cc && msg.cc.length > 0
                          ? `, cc: ${msg.cc.map((c) => c.name.split(' ')[0]).join(', ')}`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHeaderDetails(msg.id);
                        }}
                        aria-label="Show message details"
                        title="Show details"
                        className="p-0.5 rounded hover:bg-current/10 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Timestamp + Message Quick Controls */}
                <div className="flex items-center gap-1 shrink-0 text-xs">
                  <span className="opacity-70 tabular-nums mr-1 hidden sm:inline">
                    {msg.displayTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleStarThread(thread.id)}
                    aria-label="Star message"
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      thread.isStarred
                        ? 'text-[#F4B400]'
                        : isDark
                        ? 'hover:bg-[#282A2C] opacity-65'
                        : 'hover:bg-[#E8EAED] opacity-65'
                    }`}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={thread.isStarred ? '#F4B400' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => startInlineCompose('reply')}
                    aria-label="Reply"
                    title="Reply (r)"
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#282A2C] opacity-75' : 'hover:bg-[#E8EAED] opacity-75'
                    }`}
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startInlineCompose('forward')}
                    aria-label="Forward"
                    title="Forward (f)"
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#282A2C] opacity-75' : 'hover:bg-[#E8EAED] opacity-75'
                    }`}
                  >
                    <Forward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Full Header Metadata Popover Box */}
              {showHeaders && (
                <div
                  className={`mt-3 ml-0 sm:ml-13 p-3.5 rounded-xl border text-xs space-y-1 font-normal ${
                    isDark
                      ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                      : 'bg-[#F8FAFD] border-[#E0E2E0] text-[#444746]'
                  }`}
                >
                  <div className="grid grid-cols-[85px_1fr] gap-1">
                    <span className="opacity-65 text-right pr-2">from:</span>
                    <span className="font-medium">
                      {msg.sender.name} &lt;{msg.sender.email}&gt;
                    </span>
                    <span className="opacity-65 text-right pr-2">to:</span>
                    <span>
                      {msg.to.map((r) => `${r.name} <${r.email}>`).join(', ')}
                    </span>
                    {msg.cc && msg.cc.length > 0 && (
                      <>
                        <span className="opacity-65 text-right pr-2">cc:</span>
                        <span>
                          {msg.cc.map((r) => `${r.name} <${r.email}>`).join(', ')}
                        </span>
                      </>
                    )}
                    <span className="opacity-65 text-right pr-2">date:</span>
                    <span className="tabular-nums">{msg.fullDateStr}</span>
                    <span className="opacity-65 text-right pr-2">subject:</span>
                    <span>{thread.subject}</span>
                    <span className="opacity-65 text-right pr-2">mailed-by:</span>
                    <span>{msg.sender.email.split('@')[1]}</span>
                    <span className="opacity-65 text-right pr-2">security:</span>
                    <span className="inline-flex items-center gap-1 text-[#188038] dark:text-[#81C995]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Standard encryption (TLS 1.3 · DKIM/SPF Verified)
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Calendar Invite Widget (if present) */}
              {msg.calendarInvite && (
                <div
                  className={`mt-4 ml-0 sm:ml-13 rounded-2xl border p-4 max-w-2xl ${
                    isDark
                      ? 'bg-[#25272A] border-[#444746]'
                      : 'bg-[#F8FAFD] border-[#D3E3FD]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#0B57D0] text-white flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider">OCT</span>
                        <span className="text-sm font-bold leading-none">14</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{msg.calendarInvite.title}</div>
                        <div className="text-xs opacity-80 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
                            {msg.calendarInvite.dateStr} · {msg.calendarInvite.timeStr}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#188038]" />
                            {msg.calendarInvite.location}
                          </span>
                        </div>
                        <div className="text-[11px] opacity-65 mt-1 inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Attendees: {msg.calendarInvite.attendees.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive RSVP Buttons */}
                  <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-medium opacity-80">Going?</span>
                    <div className="flex items-center gap-1.5">
                      {(['yes', 'maybe', 'no'] as const).map((choice) => {
                        const isChosen = msg.calendarInvite?.rsvpStatus === choice;
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => onUpdateRsvp(thread.id, msg.id, choice)}
                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors cursor-pointer ${
                              isChosen
                                ? 'bg-[#0B57D0] border-[#0B57D0] text-white'
                                : isDark
                                ? 'border-[#5F6368] hover:bg-[#3C4043]'
                                : 'border-[#C4C7C5] bg-white hover:bg-[#EAF1FB]'
                            }`}
                          >
                            {isChosen && <Check className="w-3 h-3 inline mr-1" />}
                            {choice}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div
                className={`mt-4 ml-0 sm:ml-13 max-w-[74ch] text-[14.5px] leading-[1.62] space-y-3 message-body ${
                  isDark ? 'text-[#E3E3E3]' : 'text-[#1F1F1F]'
                }`}
                dangerouslySetInnerHTML={{ __html: msg.body }}
              />

              {/* Message Attachments Grid */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-5 ml-0 sm:ml-13 pt-3 border-t border-current/10">
                  <div className="text-xs font-semibold opacity-75 mb-2.5 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>
                      {msg.attachments.length} Attachment
                      {msg.attachments.length > 1 ? 's' : ''}
                    </span>
                    <span className="opacity-60 font-normal">
                      · Scanned by Workspace Security
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        onClick={() => onPreviewAttachment(att)}
                        className={`group/att w-60 rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer ${
                          isDark
                            ? 'bg-[#282A2C] border-[#444746] hover:border-[#A8C7FA]'
                            : 'bg-[#F8FAFD] border-[#DADCE0] hover:border-[#0B57D0] hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-[#1E1F20]' : 'bg-white shadow-2xs'
                            }`}
                          >
                            {getAttachmentIcon(att.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate" title={att.name}>
                              {att.name}
                            </div>
                            <div className="text-[11px] opacity-60 tabular-nums mt-0.5 uppercase">
                              {att.type} · {att.size}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-current/10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewAttachment(att);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#EAF1FB]'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadAttachment(att);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#EAF1FB]'
                            }`}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Smart Reply Suggestions + Action Footer */}
      {!replyMode ? (
        <div className="mt-4 ml-0 sm:ml-13 space-y-4 pb-8">
          {/* Smart Reply Chips */}
          <div className="flex flex-wrap gap-2">
            {smartReplies.map((replyText) => (
              <button
                key={replyText}
                type="button"
                onClick={() => startInlineCompose('reply', replyText)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isDark
                    ? 'border-[#5F6368] text-[#A8C7FA] hover:bg-[#004A77]/40'
                    : 'border-[#DADCE0] text-[#0B57D0] hover:bg-[#EAF1FB] hover:border-[#0B57D0]/40'
                }`}
              >
                {replyText}
              </button>
            ))}
          </div>

          {/* Primary Reply / Reply All / Forward Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => startInlineCompose('reply')}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#5F6368] text-[#E3E3E3] hover:bg-[#282A2C]'
                  : 'border-[#747775] text-[#444746] hover:bg-[#F2F6FC]'
              }`}
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            <button
              type="button"
              onClick={() => startInlineCompose('replyAll')}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#5F6368] text-[#E3E3E3] hover:bg-[#282A2C]'
                  : 'border-[#747775] text-[#444746] hover:bg-[#F2F6FC]'
              }`}
            >
              <ReplyAll className="w-4 h-4" />
              Reply all
            </button>
            <button
              type="button"
              onClick={() => startInlineCompose('forward')}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#5F6368] text-[#E3E3E3] hover:bg-[#282A2C]'
                  : 'border-[#747775] text-[#444746] hover:bg-[#F2F6FC]'
              }`}
            >
              <Forward className="w-4 h-4" />
              Forward
            </button>
          </div>
        </div>
      ) : (
        /* Inline Reply / Forward Composer Box */
        <div
          className={`mt-4 ml-0 sm:ml-13 mb-8 rounded-2xl border shadow-md overflow-hidden ${
            isDark
              ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
              : 'bg-white border-[#DADCE0] text-[#1F1F1F]'
          }`}
        >
          {/* Composer Top Bar */}
          <div className="px-4 py-2.5 border-b border-current/10 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <select
                value={replyMode}
                onChange={(e) =>
                  setReplyMode(e.target.value as 'reply' | 'replyAll' | 'forward')
                }
                aria-label="Reply mode"
                className={`px-2 py-1 rounded font-medium outline-none cursor-pointer ${
                  isDark ? 'bg-[#1E1F20] text-[#E3E3E3]' : 'bg-[#F2F6FC] text-[#1F1F1F]'
                }`}
              >
                <option value="reply">Reply</option>
                <option value="replyAll">Reply all</option>
                <option value="forward">Forward</option>
              </select>

              {replyMode === 'forward' ? (
                <input
                  type="email"
                  value={forwardToEmail}
                  onChange={(e) => setForwardToEmail(e.target.value)}
                  placeholder="Enter recipient email (e.g. team@acme.dev)..."
                  className="flex-1 bg-transparent outline-none px-1"
                  autoFocus
                />
              ) : (
                <span className="truncate opacity-80">
                  To:{' '}
                  <strong>
                    {lastMsg.sender.id === currentUser.id
                      ? lastMsg.to.map((r) => r.name).join(', ')
                      : lastMsg.sender.name}
                  </strong>{' '}
                  &lt;
                  {lastMsg.sender.id === currentUser.id
                    ? lastMsg.to[0]?.email
                    : lastMsg.sender.email}
                  &gt;
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onPopOutReply(thread, replyMode, replyBody);
                setReplyMode(null);
              }}
              title="Pop out reply to floating compose window"
              className="p-1 rounded hover:bg-current/10 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Textarea */}
          <div className="p-4">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={5}
              placeholder="Write your reply..."
              autoFocus={replyMode !== 'forward'}
              className="w-full bg-transparent outline-none text-sm resize-y leading-relaxed"
            />

            {/* Attached Files in Reply */}
            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-current/10">
                {replyAttachments.map((att) => (
                  <span
                    key={att.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                      isDark ? 'bg-[#1E1F20]' : 'bg-[#F2F6FC]'
                    }`}
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>{att.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyAttachments((prev) => prev.filter((x) => x.id !== att.id))
                      }
                      className="opacity-65 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Composer Bottom Toolbar */}
          <div
            className={`px-4 py-2.5 border-t border-current/10 flex items-center justify-between ${
              isDark ? 'bg-[#1E1F20]/60' : 'bg-[#F8FAFD]'
            }`}
          >
            <div className="flex items-center gap-2 relative">
              <div className="inline-flex rounded-full bg-[#0B57D0] text-white shadow-xs">
                <button
                  type="button"
                  onClick={() => handleSendInline()}
                  className="px-4 py-1.5 rounded-l-full text-xs font-semibold hover:bg-[#0842A0] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleReplyMenu((p) => !p)}
                  aria-label="Schedule send"
                  title="Schedule send"
                  className="px-2 py-1.5 rounded-r-full border-l border-white/20 hover:bg-[#0842A0] transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {showScheduleReplyMenu && (
                <div
                  className={`absolute left-0 bottom-10 z-30 w-56 rounded-xl shadow-xl border py-1.5 text-xs ${
                    isDark
                      ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                      : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
                  }`}
                >
                  <div className="px-3 py-1 font-semibold opacity-70">Schedule send</div>
                  {[
                    'Tomorrow, 8:00 AM',
                    'Tomorrow, 1:00 PM',
                    'Mon, Oct 19, 8:00 AM',
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleSendInline(slot)}
                      className={`w-full px-3 py-1.5 text-left transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}

              {/* Formatting & Attach Buttons */}
              <button
                type="button"
                onClick={() => setReplyBody((b) => `${b} **bold**`)}
                title="Bold"
                className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setReplyBody((b) => `${b} *italic*`)}
                title="Italic"
                className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setReplyBody((b) => `${b}\n- `)}
                title="Bulleted list"
                className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setReplyBody((b) => `${b} \`code\``)}
                title="Inline code"
                className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAddSampleAttachment}
                title="Attach file"
                className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setReplyMode(null);
                setReplyBody('');
                setReplyAttachments([]);
              }}
              aria-label="Discard draft"
              title="Discard draft"
              className="p-1.5 rounded hover:bg-current/10 opacity-75 hover:opacity-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
