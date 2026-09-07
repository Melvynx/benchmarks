import React, { useState } from 'react';
import {
  ArrowLeft,
  Archive,
  Trash2,
  Mail,
  Clock,
  Tag,
  Printer,
  Star,
  Reply,
  ReplyAll,
  Forward,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Paperclip,
  Send,
  X,
  Maximize2,
  Check,
} from 'lucide-react';
import { useMail } from '../context/MailContext';
import { Attachment } from '../types/mail';

export const ThreadView: React.FC = () => {
  const {
    activeThread,
    setActiveThreadId,
    archiveThread,
    deleteThread,
    markThreadRead,
    setSnoozeTargetThreadId,
    toggleStarThread,
    removeLabelFromThread,
    applyLabelToThread,
    labels: allLabels,
    sendReply,
    openCompose,
    showToast,
  } = useMail();

  // Collapsed state for each message ID
  const [collapsedMsgIds, setCollapsedMsgIds] = useState<Record<string, boolean>>(() => {
    if (!activeThread) return {};
    const state: Record<string, boolean> = {};
    // Collapse all messages except the last one
    activeThread.messages.forEach((msg, idx) => {
      state[msg.id] = idx < activeThread.messages.length - 1;
    });
    return state;
  });

  // RFC details dropdown visibility per message
  const [showRfcDetails, setShowRfcDetails] = useState<Record<string, boolean>>({});

  // Inline Reply state
  const [inlineReplyType, setInlineReplyType] = useState<'reply' | 'replyAll' | 'forward' | null>(
    null
  );
  const [replyBody, setReplyBody] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Attachment Preview Lightbox
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Labels dropdown
  const [isLabelsMenuOpen, setIsLabelsMenuOpen] = useState(false);

  if (!activeThread) return null;

  const toggleCollapse = (id: string) => {
    setCollapsedMsgIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const state: Record<string, boolean> = {};
    activeThread.messages.forEach((m) => {
      state[m.id] = false;
    });
    setCollapsedMsgIds(state);
  };

  const collapseAll = () => {
    const state: Record<string, boolean> = {};
    activeThread.messages.forEach((m, idx) => {
      state[m.id] = idx < activeThread.messages.length - 1;
    });
    setCollapsedMsgIds(state);
  };

  const handleSendInlineReply = () => {
    if (!replyBody.trim()) return;
    setIsSendingReply(true);

    setTimeout(() => {
      sendReply(activeThread.id, replyBody, inlineReplyType || 'reply', replyAttachments);
      setReplyBody('');
      setReplyAttachments([]);
      setInlineReplyType(null);
      setIsSendingReply(false);
    }, 400);
  };

  const handleSimulateAttach = () => {
    const sampleAtts: Attachment[] = [
      { id: `att-${Date.now()}-1`, filename: 'presentation-slides.pdf', size: '1.4 MB', type: 'pdf' },
      { id: `att-${Date.now()}-2`, filename: 'screenshot-review.png', size: '640 KB', type: 'image' },
    ];
    setReplyAttachments((prev) => [...prev, sampleAtts[prev.length % sampleAtts.length]]);
    showToast('Attachment added');
  };

  const handlePrint = () => {
    window.print();
  };

  // Map thread labels to actual Label definitions
  const activeLabelObjs = activeThread.labels
    .map((id) => allLabels.find((l) => l.id === id))
    .filter(Boolean);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#1a1a1a] overflow-hidden select-text">
      {/* 1. Header Toolbar */}
      <div className="h-12 px-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-gray-700 dark:text-gray-300 shrink-0 bg-white dark:bg-[#1a1a1a] z-10">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Back button */}
          <button
            onClick={() => setActiveThreadId(null)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mr-1"
            title="Back to inbox (u)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => archiveThread(activeThread.id)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Archive (e)"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={() => deleteThread(activeThread.id)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Delete (#)"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              markThreadRead(activeThread.id, false);
              setActiveThreadId(null);
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Mark as unread"
          >
            <Mail className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSnoozeTargetThreadId(activeThread.id)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Snooze"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Labels Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLabelsMenuOpen(!isLabelsMenuOpen)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Labels"
            >
              <Tag className="w-4 h-4" />
            </button>
            {isLabelsMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                <div className="px-3 py-1 font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                  Labels
                </div>
                {allLabels.map((l) => {
                  const hasLabel = activeThread.labels.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        if (hasLabel) {
                          removeLabelFromThread(activeThread.id, l.id);
                        } else {
                          applyLabelToThread(activeThread.id, l.id);
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                        <span>{l.name}</span>
                      </div>
                      {hasLabel && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <button
            onClick={expandAll}
            className="hidden sm:inline px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
            title="Expand all"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="hidden sm:inline px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
            title="Collapse all"
          >
            Collapse all
          </button>
          <button
            onClick={handlePrint}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Print all"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Thread Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-4xl w-full mx-auto space-y-4">
        {/* Subject Header & Labels */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-normal text-gray-900 dark:text-gray-100">
              {activeThread.subject}
            </h2>

            {/* Active Labels with remove 'x' */}
            {activeLabelObjs.map((label) => (
              <span
                key={label!.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold tracking-wide border"
                style={{
                  backgroundColor: label!.bgColor,
                  color: label!.textColor,
                  borderColor: `${label!.color}40`,
                }}
              >
                {label!.name}
                <button
                  onClick={() => removeLabelFromThread(activeThread.id, label!.id)}
                  className="hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleStarThread(activeThread.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              title={activeThread.isStarred ? 'Starred' : 'Not starred'}
            >
              <Star
                className={`w-5 h-5 ${
                  activeThread.isStarred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. Messages List */}
        <div className="space-y-3">
          {activeThread.messages.map((message) => {
            const isCollapsed = collapsedMsgIds[message.id];
            const formattedDate = new Date(message.date).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={message.id}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isCollapsed
                    ? 'border-gray-200/60 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-850 hover:bg-gray-100/80 cursor-pointer'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202124] shadow-sm'
                }`}
              >
                {/* Collapsed One-Liner */}
                {isCollapsed ? (
                  <div
                    onClick={() => toggleCollapse(message.id)}
                    className="flex items-center justify-between p-3 sm:px-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {message.from.avatar ? (
                        <img
                          src={message.from.avatar}
                          alt={message.from.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                          {message.from.name[0]}
                        </div>
                      )}
                      <span className="font-semibold text-xs text-gray-800 dark:text-gray-200 truncate">
                        {message.from.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {message.snippet}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {message.attachments && message.attachments.length > 0 && (
                        <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(message.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Expanded Full Message Card */
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Message Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {message.from.avatar ? (
                          <img
                            src={message.from.avatar}
                            alt={message.from.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                            {message.from.name[0]}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              {message.from.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                              &lt;{message.from.email}&gt;
                            </span>
                          </div>

                          {/* "to me" details trigger */}
                          <div className="relative mt-0.5">
                            <button
                              onClick={() =>
                                setShowRfcDetails((prev) => ({
                                  ...prev,
                                  [message.id]: !prev[message.id],
                                }))
                              }
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              <span>to {message.to.map((t) => t.name).join(', ')}</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {/* RFC Details Popover */}
                            {showRfcDetails[message.id] && (
                              <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-30 text-xs space-y-1.5 font-normal">
                                <div>
                                  <strong className="text-gray-500">from:</strong>{' '}
                                  <span className="text-gray-800 dark:text-gray-200">
                                    {message.from.name} &lt;{message.from.email}&gt;
                                  </span>
                                </div>
                                <div>
                                  <strong className="text-gray-500">to:</strong>{' '}
                                  <span className="text-gray-800 dark:text-gray-200">
                                    {message.to.map((t) => `${t.name} <${t.email}>`).join(', ')}
                                  </span>
                                </div>
                                <div>
                                  <strong className="text-gray-500">date:</strong>{' '}
                                  <span className="text-gray-800 dark:text-gray-200">{formattedDate}</span>
                                </div>
                                <div>
                                  <strong className="text-gray-500">subject:</strong>{' '}
                                  <span className="text-gray-800 dark:text-gray-200">{message.subject}</span>
                                </div>
                                <div>
                                  <strong className="text-gray-500">security:</strong>{' '}
                                  <span className="text-green-600 dark:text-green-400">
                                    Standard TLS encryption
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header right: Timestamp & Quick Reply Icon */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                        <span className="hidden sm:inline">{formattedDate}</span>
                        <button
                          onClick={() => setInlineReplyType('reply')}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                          title="Reply"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleCollapse(message.id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                          title="Collapse"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Message Body Content */}
                    <div
                      className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none pt-2"
                      dangerouslySetInnerHTML={{ __html: message.body }}
                    />

                    {/* Attachments Section */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="font-semibold">
                            {message.attachments.length} Attachment
                            {message.attachments.length > 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => showToast('Downloading attachments...')}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download all
                          </button>
                        </div>

                        {/* Attachments Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {message.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="group border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {att.type === 'pdf' ? (
                                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                ) : att.type === 'image' ? (
                                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                ) : att.type === 'sheet' ? (
                                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet className="w-5 h-5" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                                    <Paperclip className="w-5 h-5" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-gray-800 dark:text-gray-200 truncate">
                                    {att.filename}
                                  </div>
                                  <div className="text-[11px] text-gray-500">{att.size}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => setPreviewAttachment(att)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 rounded-full"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => showToast(`Downloaded ${att.filename}`)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 rounded-full"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Bottom Reply Buttons & Inline Composer */}
        {inlineReplyType ? (
          /* Inline Reply Box */
          <div className="border border-gray-300 dark:border-gray-700 rounded-2xl shadow-sm bg-white dark:bg-[#202124] p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4 text-blue-600" />
                <span>
                  {inlineReplyType === 'reply'
                    ? `Reply to ${activeThread.messages[activeThread.messages.length - 1].from.name}`
                    : inlineReplyType === 'replyAll'
                    ? 'Reply all'
                    : 'Forward message'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openCompose({
                      to: activeThread.messages[activeThread.messages.length - 1].from.email,
                      subject: `Re: ${activeThread.subject}`,
                      body: replyBody,
                      threadId: activeThread.id,
                    });
                    setInlineReplyType(null);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Pop out to compose window"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInlineReplyType(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Discard reply"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="w-full bg-transparent resize-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              autoFocus
            />

            {/* Attached files preview */}
            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                {replyAttachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                    <span>{att.filename}</span>
                    <button
                      onClick={() =>
                        setReplyAttachments((prev) => prev.filter((a) => a.id !== att.id))
                      }
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendInlineReply}
                  disabled={isSendingReply || !replyBody.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#1a73e8] hover:bg-blue-600 disabled:opacity-50 text-white rounded-full font-medium text-xs shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingReply ? 'Sending...' : 'Send'}
                </button>

                <button
                  onClick={handleSimulateAttach}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setReplyBody('');
                  setReplyAttachments([]);
                  setInlineReplyType(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Discard draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Bottom Action Buttons */
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setInlineReplyType('reply')}
              className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-xs font-semibold transition-colors"
            >
              <Reply className="w-4 h-4 text-gray-500" />
              Reply
            </button>

            <button
              onClick={() => setInlineReplyType('replyAll')}
              className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-xs font-semibold transition-colors"
            >
              <ReplyAll className="w-4 h-4 text-gray-500" />
              Reply all
            </button>

            <button
              onClick={() => setInlineReplyType('forward')}
              className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-xs font-semibold transition-colors"
            >
              <Forward className="w-4 h-4 text-gray-500" />
              Forward
            </button>
          </div>
        )}
      </div>

      {/* Attachment Preview Modal / Lightbox */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-sm truncate">{previewAttachment.filename}</span>
                <span className="text-xs text-gray-400">({previewAttachment.size})</span>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-8 flex flex-col items-center justify-center text-center">
              {previewAttachment.previewUrl ? (
                <img
                  src={previewAttachment.previewUrl}
                  alt={previewAttachment.filename}
                  className="max-h-96 rounded-lg object-contain shadow-md"
                />
              ) : (
                <div className="p-8 rounded-2xl bg-gray-100 dark:bg-gray-800/60 max-w-md w-full">
                  <FileText className="w-16 h-16 text-blue-500 mx-auto mb-3" />
                  <div className="font-bold mb-1">{previewAttachment.filename}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Document preview ready. File format: {previewAttachment.type.toUpperCase()}
                  </div>
                  <button
                    onClick={() => {
                      showToast(`Downloaded ${previewAttachment.filename}`);
                      setPreviewAttachment(null);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow"
                  >
                    <Download className="w-4 h-4" />
                    Download File ({previewAttachment.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
