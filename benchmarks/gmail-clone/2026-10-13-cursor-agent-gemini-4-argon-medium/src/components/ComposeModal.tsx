import React, { useState, useRef } from 'react';
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  Paperclip,
  Trash2,
  Sparkles,
  Bold,
  Italic,
  List,
  Code,
  CalendarClock,
  Check,
  FileText,
} from 'lucide-react';
import {
  Attachment,
  ComposeDraftState,
  Contact,
  ThemeMode,
} from '../types/mail';
import { EMAIL_TEMPLATES, SAMPLE_ATTACHABLE_FILES } from '../data/seedData';

interface ComposeModalProps {
  theme: ThemeMode;
  draft: ComposeDraftState;
  contacts: Contact[];
  onUpdateDraft: (updater: (prev: ComposeDraftState) => ComposeDraftState) => void;
  onSend: (scheduledFor?: string) => void;
  onCloseAndSave: () => void;
  onDiscardDraft: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  theme,
  draft,
  contacts,
  onUpdateDraft,
  onSend,
  onCloseAndSave,
  onDiscardDraft,
}) => {
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(draft.cc.length > 0);
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showSampleFilesMenu, setShowSampleFilesMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === 'dark';

  const filteredContacts = toInput.trim()
    ? contacts
        .filter(
          (c) =>
            !draft.to.includes(c.email) &&
            (c.name.toLowerCase().includes(toInput.toLowerCase()) ||
              c.email.toLowerCase().includes(toInput.toLowerCase()))
        )
        .slice(0, 5)
    : contacts.filter((c) => !draft.to.includes(c.email)).slice(0, 4);

  const addRecipient = (field: 'to' | 'cc' | 'bcc', rawValue: string) => {
    const val = rawValue.trim().replace(/,$/, '');
    if (!val) return;
    onUpdateDraft((prev) => ({
      ...prev,
      [field]: prev[field].includes(val) ? prev[field] : [...prev[field], val],
      lastSavedAt: 'Saved',
    }));
    if (field === 'to') setToInput('');
    if (field === 'cc') setCcInput('');
    if (field === 'bcc') setBccInput('');
    setShowContactSuggestions(false);
  };

  const removeRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    onUpdateDraft((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== email),
      lastSavedAt: 'Saved',
    }));
  };

  const insertFormatting = (prefix: string, suffix = prefix) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draft.body.slice(start, end) || 'text';
    const nextBody =
      draft.body.slice(0, start) +
      prefix +
      selected +
      suffix +
      draft.body.slice(end);
    onUpdateDraft((prev) => ({
      ...prev,
      body: nextBody,
      lastSavedAt: 'Saved',
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added: Attachment[] = Array.from(files).map((f) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
      type: f.name.endsWith('.pdf')
        ? 'pdf'
        : f.name.match(/\.(xlsx|csv)$/i)
          ? 'spreadsheet'
          : f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i)
            ? 'image'
            : 'doc',
      previewTitle: `Uploaded File: ${f.name}`,
      previewContent: `Local file attached via Compose (${f.name}, ${f.size} bytes).`,
    }));

    onUpdateDraft((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...added],
      lastSavedAt: 'Saved',
    }));
    e.target.value = '';
  };

  const handleFinalSend = (scheduledFor?: string) => {
    // Commit any pending typed recipient in the input box
    const finalRecipients = [...draft.to];
    if (toInput.trim()) {
      finalRecipients.push(toInput.trim());
    }
    if (finalRecipients.length === 0) {
      // Default to Elena Rostova if user clicks Send rapidly without typing recipient
      onUpdateDraft((prev) => ({
        ...prev,
        to: ['elena.rostova@argonlabs.io'],
      }));
    } else if (toInput.trim()) {
      onUpdateDraft((prev) => ({
        ...prev,
        to: finalRecipients,
      }));
      setToInput('');
    }
    setTimeout(() => onSend(scheduledFor), 10);
  };

  // Minimized pill at bottom right
  if (draft.isMinimized) {
    return (
      <div
        onClick={() =>
          onUpdateDraft((prev) => ({ ...prev, isMinimized: false }))
        }
        className={`fixed bottom-0 right-6 z-50 w-72 h-11 px-4 rounded-t-xl shadow-2xl border flex items-center justify-between cursor-pointer ${
          isDark
            ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
            : 'bg-[#f2f6fc] border-gray-300 text-[#1f1f1f]'
        }`}
      >
        <span className="text-sm font-medium truncate">
          {draft.subject.trim() || 'New Message'}
        </span>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          <button
            onClick={() =>
              onUpdateDraft((prev) => ({ ...prev, isMinimized: false }))
            }
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCloseAndSave}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const containerClasses = draft.isMaximized
    ? 'fixed inset-4 md:inset-10 z-50 flex flex-col rounded-2xl shadow-2xl border overflow-hidden'
    : 'fixed bottom-0 right-2 md:right-6 z-50 w-[96vw] sm:w-[540px] h-[540px] max-h-[85vh] flex flex-col rounded-t-2xl shadow-2xl border overflow-hidden';

  return (
    <>
      {draft.isMaximized && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
          onClick={() =>
            onUpdateDraft((prev) => ({ ...prev, isMaximized: false }))
          }
        />
      )}

      <div
        className={`${containerClasses} ${
          isDark
            ? 'bg-[#1e1f23] border-white/15 text-[#e3e3e3]'
            : 'bg-white border-gray-300 text-[#1f1f1f]'
        }`}
      >
        {/* Top Compose Title Bar */}
        <div
          onClick={() =>
            onUpdateDraft((prev) => ({
              ...prev,
              isMinimized: !prev.isMinimized,
            }))
          }
          className={`h-10 px-4 flex items-center justify-between shrink-0 cursor-pointer select-none ${
            isDark ? 'bg-[#282a2c]' : 'bg-[#f2f6fc]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">
              {draft.subject.trim() || 'New Message'}
            </span>
            {draft.lastSavedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] opacity-60">
                <Check className="w-3 h-3" />
                {draft.lastSavedAt}
              </span>
            )}
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              onClick={() =>
                onUpdateDraft((prev) => ({ ...prev, isMinimized: true }))
              }
              title="Minimize"
              aria-label="Minimize compose window"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateDraft((prev) => ({
                  ...prev,
                  isMaximized: !prev.isMaximized,
                }))
              }
              title={draft.isMaximized ? 'Exit full screen' : 'Full screen'}
              aria-label="Toggle full screen compose"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              {draft.isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onCloseAndSave}
              title="Save & close"
              aria-label="Save and close"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recipients Section */}
        <div className="px-4 divide-y divide-gray-200/70 dark:divide-white/10 text-sm shrink-0">
          {/* To Field */}
          <div className="relative py-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs opacity-65 mr-1">To</span>
            {draft.to.map((email) => (
              <span
                key={email}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isDark
                    ? 'bg-white/10 border-white/15 text-gray-200'
                    : 'bg-gray-100 border-gray-300 text-gray-800'
                }`}
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient('to', email)}
                  className="hover:opacity-75 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <input
              type="text"
              value={toInput}
              onFocus={() => setShowContactSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowContactSuggestions(false), 180);
                if (toInput.trim()) addRecipient('to', toInput);
              }}
              onChange={(e) => {
                setToInput(e.target.value);
                setShowContactSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                  if (toInput.trim()) {
                    e.preventDefault();
                    addRecipient('to', toInput);
                  }
                }
              }}
              placeholder={draft.to.length === 0 ? 'Recipients' : ''}
              aria-label="Recipients"
              className="flex-1 min-w-[140px] bg-transparent outline-none text-sm"
            />

            <div className="flex items-center gap-2 text-xs opacity-65 ml-auto">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="hover:underline cursor-pointer"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="hover:underline cursor-pointer"
                >
                  Bcc
                </button>
              )}
            </div>

            {/* Contact Suggestions Autocomplete */}
            {showContactSuggestions && filteredContacts.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-1 rounded-xl shadow-xl border py-1.5 z-50 ${
                  isDark
                    ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                    : 'bg-white border-gray-200 text-[#1f1f1f]'
                }`}
              >
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addRecipient('to', c.email);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <div
                      className="w-6 h-6 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.avatarColor }}
                    >
                      {c.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{c.name}</div>
                      <div className="text-[11px] opacity-60 truncate">{c.email}</div>
                    </div>
                    {c.role && (
                      <span className="text-[10px] opacity-55 shrink-0">{c.role}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cc Field */}
          {showCc && (
            <div className="py-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs opacity-65 mr-1">Cc</span>
              {draft.cc.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/5 dark:bg-white/10"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient('cc', email)}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onBlur={() => ccInput.trim() && addRecipient('cc', ccInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addRecipient('cc', ccInput);
                  }
                }}
                placeholder="Cc recipients"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className="py-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs opacity-65 mr-1">Bcc</span>
              {draft.bcc.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/5 dark:bg-white/10"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient('bcc', email)}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                onBlur={() => bccInput.trim() && addRecipient('bcc', bccInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addRecipient('bcc', bccInput);
                  }
                }}
                placeholder="Bcc recipients"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          )}

          {/* Subject Input */}
          <div className="py-2">
            <input
              type="text"
              value={draft.subject}
              onChange={(e) =>
                onUpdateDraft((prev) => ({
                  ...prev,
                  subject: e.target.value,
                  lastSavedAt: 'Saved',
                }))
              }
              placeholder="Subject"
              aria-label="Subject"
              className="w-full bg-transparent outline-none text-sm font-medium"
            />
          </div>
        </div>

        {/* Message Body Editor */}
        <div className="flex-1 px-4 py-2 flex flex-col min-h-0">
          <textarea
            ref={bodyRef}
            value={draft.body}
            onChange={(e) =>
              onUpdateDraft((prev) => ({
                ...prev,
                body: e.target.value,
                lastSavedAt: 'Saved',
              }))
            }
            placeholder="Compose email..."
            aria-label="Email body"
            className="flex-1 w-full bg-transparent outline-none text-sm leading-relaxed resize-none"
          />

          {/* Attached Files Pills */}
          {draft.attachments.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {draft.attachments.map((att) => (
                <div
                  key={att.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border ${
                    isDark
                      ? 'bg-[#282a2c] border-white/15 text-gray-200'
                      : 'bg-[#f8fafd] border-gray-200 text-gray-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span className="font-medium truncate max-w-[180px]">
                    {att.name}
                  </span>
                  <span className="opacity-60">({att.size})</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDraft((prev) => ({
                        ...prev,
                        attachments: prev.attachments.filter(
                          (a) => a.id !== att.id
                        ),
                      }))
                    }
                    className="hover:opacity-75 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formatting & Templates Mini-Bar */}
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-between text-xs shrink-0 ${
            isDark ? 'border-white/10 bg-[#16181c]' : 'border-gray-100 bg-gray-50/70'
          }`}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              title="Bold"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('_', '_')}
              title="Italic"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n• ', '')}
              title="Bulleted list"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`')}
              title="Inline code"
              className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Canned Templates Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTemplatesMenu((v) => !v);
                setShowSampleFilesMenu(false);
                setShowScheduleMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[#1a73e8] hover:bg-[#1a73e8]/10 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Insert template</span>
            </button>

            {showTemplatesMenu && (
              <div
                className={`absolute right-0 bottom-8 w-64 py-1.5 rounded-xl shadow-xl border z-50 text-xs ${
                  isDark
                    ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                    : 'bg-white border-gray-200 text-[#1f1f1f]'
                }`}
              >
                <div className="px-3 py-1 font-semibold opacity-60">
                  Quick Templates
                </div>
                {EMAIL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onUpdateDraft((prev) => ({
                        ...prev,
                        subject: prev.subject || tpl.subject,
                        body: tpl.body,
                        lastSavedAt: 'Saved',
                      }));
                      setShowTemplatesMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <div className="font-medium">{tpl.name}</div>
                    <div className="text-[11px] opacity-60 truncate">
                      {tpl.subject}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer: Send + Schedule Send + Attach + Discard */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200/70 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {/* Split Send + Schedule Send Button */}
            <div className="relative inline-flex items-center rounded-full bg-[#0b57d0] text-white shadow-xs">
              <button
                type="button"
                onClick={() => handleFinalSend()}
                className="pl-5 pr-3.5 py-2 text-sm font-medium hover:bg-[#0842a0] rounded-l-full cursor-pointer"
              >
                Send
              </button>
              <div className="h-5 w-[1px] bg-white/25" />
              <button
                type="button"
                onClick={() => {
                  setShowScheduleMenu((v) => !v);
                  setShowSampleFilesMenu(false);
                  setShowTemplatesMenu(false);
                }}
                title="More send options (Schedule send)"
                aria-label="Schedule send options"
                className="px-2.5 py-2 hover:bg-[#0842a0] rounded-r-full cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {showScheduleMenu && (
                <div
                  className={`absolute left-0 bottom-11 w-64 py-2 rounded-xl shadow-2xl border z-50 text-xs ${
                    isDark
                      ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                      : 'bg-white border-gray-200 text-[#1f1f1f]'
                  }`}
                >
                  <div className="px-3.5 py-1.5 flex items-center gap-2 font-semibold text-[#1a73e8]">
                    <CalendarClock className="w-4 h-4" />
                    <span>Schedule send</span>
                  </div>
                  {[
                    ['Tomorrow morning', 'Thu, Oct 15, 8:00 AM'],
                    ['Tomorrow afternoon', 'Thu, Oct 15, 1:00 PM'],
                    ['Monday morning', 'Mon, Oct 19, 8:00 AM'],
                  ].map(([label, time]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setShowScheduleMenu(false);
                        handleFinalSend(time);
                      }}
                      className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <span>{label}</span>
                      <span className="opacity-60">{time}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* File Input + Sample Attachment Picker */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSampleFilesMenu((v) => !v);
                  setShowScheduleMenu(false);
                  setShowTemplatesMenu(false);
                }}
                title="Attach files"
                aria-label="Attach files"
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {showSampleFilesMenu && (
                <div
                  className={`absolute left-0 bottom-10 w-72 py-2 rounded-xl shadow-xl border z-50 text-xs ${
                    isDark
                      ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                      : 'bg-white border-gray-200 text-[#1f1f1f]'
                  }`}
                >
                  <div className="px-3 py-1 font-semibold opacity-60">
                    Attach Workspace Document
                  </div>
                  {SAMPLE_ATTACHABLE_FILES.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        if (!draft.attachments.some((a) => a.id === file.id)) {
                          onUpdateDraft((prev) => ({
                            ...prev,
                            attachments: [...prev.attachments, file],
                            lastSavedAt: 'Saved',
                          }));
                        }
                        setShowSampleFilesMenu(false);
                      }}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="opacity-60 shrink-0 ml-2">{file.size}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-200/50 dark:border-white/10 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSampleFilesMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 text-left text-[#1a73e8] font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      Browse computer files...
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onDiscardDraft}
            title="Discard draft"
            aria-label="Discard draft"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
