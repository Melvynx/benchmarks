import React, { useState, useRef } from 'react';
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  Send,
  ChevronDown,
  Paperclip,
  Trash2,
  Bold,
  Italic,
  List,
  Code,
  Link2,
  Sparkles,
  Check,
  Clock,
} from 'lucide-react';
import { Attachment, ComposeDraft, Contact, ThemeMode } from '../types/mail';

interface ComposeDockProps {
  draft: ComposeDraft;
  contacts: Contact[];
  onUpdateDraft: (updated: ComposeDraft) => void;
  onSendDraft: (draft: ComposeDraft, scheduledFor?: string) => void;
  onDiscardDraft: (draftId: string) => void;
  onCloseAndSaveDraft: (draft: ComposeDraft) => void;
  theme: ThemeMode;
}

const CANNED_TEMPLATES = [
  {
    label: 'Approve Production Cutover',
    subject: 'Sign-off: Production Raft Cutover Approved',
    body: `Hi team,\n\nI reviewed the Jepsen linearizability report and SPIRE mTLS rotation results. Everything meets our P99 < 10ms SLA.\n\nYou have my sign-off to proceed with the Thursday 02:00 UTC maintenance window.\n\nBest,\nAlex`,
  },
  {
    label: 'Schedule Architecture Review',
    subject: 'Architecture Sync: Q4 Distributed Storage Roadmap',
    body: `Hey Elena, Marcus,\n\nCan we grab 30 minutes tomorrow afternoon to lock the Q4 NVMe tiering and deterministic simulation milestones?\n\nThanks,\nAlex`,
  },
  {
    label: 'Board Metrics Sign-Off',
    subject: 'Re: Q3 Infrastructure Unit Economics Verified',
    body: `Hi Sarah,\n\nVerified Slide 14 against our production Prometheus & billing ledger. The 81.6% gross margin and 71% cross-AZ egress reduction numbers are 100% accurate.\n\nBest,\nAlex`,
  },
];

export const ComposeDock: React.FC<ComposeDockProps> = ({
  draft,
  contacts,
  onUpdateDraft,
  onSendDraft,
  onDiscardDraft,
  onCloseAndSaveDraft,
  theme,
}) => {
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(draft.cc.length > 0);
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const commitRecipient = (
    field: 'to' | 'cc' | 'bcc',
    rawVal: string,
    clearFn: (v: string) => void
  ) => {
    const trimmed = rawVal.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (!draft[field].includes(trimmed)) {
      onUpdateDraft({
        ...draft,
        [field]: [...draft[field], trimmed],
        lastSaved: 'Saved',
      });
    }
    clearFn('');
    setShowToSuggestions(false);
  };

  const removeRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    onUpdateDraft({
      ...draft,
      [field]: draft[field].filter((x) => x !== email),
      lastSaved: 'Saved',
    });
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.id !== 'user-me' &&
      !draft.to.includes(c.email) &&
      (c.name.toLowerCase().includes(toInput.toLowerCase()) ||
        c.email.toLowerCase().includes(toInput.toLowerCase()))
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added: Attachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      type: file.name.endsWith('.pdf')
        ? 'pdf'
        : file.name.match(/\.(png|jpg|jpeg|webp|gif)$/i)
        ? 'image'
        : file.name.match(/\.(xlsx|csv)$/i)
        ? 'spreadsheet'
        : 'doc',
      previewTitle: file.name,
      previewContent: `Local file attached (${file.name}, ${file.type || 'application/octet-stream'})`,
    }));

    onUpdateDraft({
      ...draft,
      attachments: [...draft.attachments, ...added],
      lastSaved: 'Saved',
    });
    e.target.value = '';
  };

  const handleAttachSampleSpec = () => {
    const sample: Attachment = {
      id: `att-spec-${Date.now()}`,
      name: 'q4-storage-architecture-spec.pdf',
      size: '940 KB',
      type: 'pdf',
      previewTitle: 'Q4 Storage Architecture Specification',
      previewContent:
        'Detailed technical specification for NVMe tiering, Raft pre-vote consensus, and zero-copy gRPC streaming.',
    };
    onUpdateDraft({
      ...draft,
      attachments: [...draft.attachments, sample],
      lastSaved: 'Saved',
    });
  };

  const handleTriggerSend = (scheduledFor?: string) => {
    // Commit any pending text in the `toInput` box first
    let finalDraft = { ...draft };
    if (toInput.trim()) {
      finalDraft = {
        ...finalDraft,
        to: [...finalDraft.to, toInput.trim().replace(/,$/, '')],
      };
      setToInput('');
    }
    if (finalDraft.to.length === 0) {
      // Default to Elena if user didn't pick a recipient yet so sending is frictionless
      finalDraft = {
        ...finalDraft,
        to: ['elena.rostova@acme.dev'],
      };
    }
    onSendDraft(finalDraft, scheduledFor);
  };

  // Minimized Dock Bar
  if (draft.isMinimized) {
    return (
      <div
        className={`fixed bottom-0 right-4 md:right-14 z-40 w-[280px] rounded-t-xl shadow-2xl border overflow-hidden select-none ${
          isDark
            ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
            : 'bg-[#F2F6FC] border-[#D3E3FD] text-[#1F1F1F]'
        }`}
      >
        <div
          onClick={() => onUpdateDraft({ ...draft, isMinimized: false })}
          className="h-10 px-3.5 flex items-center justify-between cursor-pointer"
        >
          <span className="text-xs font-semibold truncate">
            {draft.subject.trim() || 'New Message'}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onUpdateDraft({ ...draft, isMinimized: false })}
              aria-label="Restore compose window"
              className="p-1 rounded hover:bg-black/10 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onCloseAndSaveDraft(draft)}
              aria-label="Save and close compose window"
              className="p-1 rounded hover:bg-black/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const containerLayout = draft.isMaximized
    ? 'fixed inset-4 md:inset-10 z-50 rounded-2xl'
    : 'fixed bottom-0 right-2 md:right-14 z-40 w-[calc(100vw-16px)] sm:w-[540px] h-[520px] max-h-[85vh] rounded-t-2xl';

  return (
    <>
      {draft.isMaximized && (
        <div
          className="fixed inset-0 bg-black/45 z-40 backdrop-blur-[1px]"
          onClick={() => onUpdateDraft({ ...draft, isMaximized: false })}
        />
      )}

      <div
        role="dialog"
        aria-label="Compose message"
        className={`${containerLayout} flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.22)] border overflow-hidden transition-all ${
          isDark
            ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
            : 'bg-white border-[#DADCE0] text-[#1F1F1F]'
        }`}
      >
        {/* Title Bar */}
        <div
          onClick={() => onUpdateDraft({ ...draft, isMinimized: true })}
          className={`h-10 px-4 flex items-center justify-between cursor-pointer select-none shrink-0 ${
            isDark ? 'bg-[#282A2C] text-[#E3E3E3]' : 'bg-[#F2F6FC] text-[#1F1F1F]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold truncate">
              {draft.subject.trim() || 'New Message'}
            </span>
            {draft.lastSaved && (
              <span className="text-[11px] opacity-60 inline-flex items-center gap-1">
                <Check className="w-3 h-3" />
                {draft.lastSaved}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onUpdateDraft({ ...draft, isMinimized: true })}
              aria-label="Minimize"
              title="Minimize"
              className="p-1 rounded hover:bg-current/10 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateDraft({ ...draft, isMaximized: !draft.isMaximized })}
              aria-label={draft.isMaximized ? 'Exit full screen' : 'Full screen'}
              title={draft.isMaximized ? 'Exit full screen' : 'Full screen'}
              className="p-1 rounded hover:bg-current/10 cursor-pointer"
            >
              {draft.isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onCloseAndSaveDraft(draft)}
              aria-label="Save and close"
              title="Save and close"
              className="p-1 rounded hover:bg-current/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recipients Row (To) */}
        <div className="px-4 py-1.5 border-b border-current/10 relative">
          <div className="flex items-center flex-wrap gap-1.5 min-h-[32px]">
            <span className="text-xs opacity-65 font-medium mr-1">To</span>

            {draft.to.map((email) => {
              const contactObj = contacts.find((c) => c.email === email);
              return (
                <span
                  key={email}
                  className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-full text-xs font-medium border ${
                    isDark
                      ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                      : 'bg-[#F2F6FC] border-[#D3E3FD] text-[#1F1F1F]'
                  }`}
                >
                  <span>{contactObj ? contactObj.name : email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient('to', email)}
                    aria-label={`Remove ${email}`}
                    className="opacity-65 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            <input
              type="text"
              value={toInput}
              onFocus={() => setShowToSuggestions(true)}
              onBlur={() => setTimeout(() => setShowToSuggestions(false), 180)}
              onChange={(e) => {
                setToInput(e.target.value);
                setShowToSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                  if (toInput.trim()) {
                    e.preventDefault();
                    commitRecipient('to', toInput, setToInput);
                  }
                } else if (e.key === 'Backspace' && !toInput && draft.to.length > 0) {
                  removeRecipient('to', draft.to[draft.to.length - 1]);
                }
              }}
              placeholder={draft.to.length === 0 ? 'Recipients (type name or email)' : ''}
              aria-label="To recipients"
              className="flex-1 min-w-[140px] bg-transparent text-xs outline-none py-1"
            />

            <div className="flex items-center gap-2 text-xs opacity-70 ml-auto">
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
          </div>

          {/* Contact Autocomplete Dropdown */}
          {showToSuggestions && filteredContacts.length > 0 && (
            <div
              className={`absolute left-4 right-4 top-10 z-30 rounded-xl shadow-xl border py-1 max-h-44 overflow-y-auto ${
                isDark
                  ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                  : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
              }`}
            >
              {filteredContacts.slice(0, 5).map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitRecipient('to', person.email, setToInput);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                    style={{ backgroundColor: person.avatarColor }}
                  >
                    {person.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{person.name}</span>
                    <span className="opacity-65 ml-1.5">&lt;{person.email}&gt;</span>
                  </div>
                  {person.role && (
                    <span className="text-[10px] opacity-55 truncate">{person.role}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional Cc Row */}
        {showCc && (
          <div className="px-4 py-1 border-b border-current/10 flex items-center flex-wrap gap-1.5 text-xs">
            <span className="opacity-65 font-medium mr-1">Cc</span>
            {draft.cc.map((email) => (
              <span
                key={email}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-[#282A2C] border-[#444746]' : 'bg-[#F2F6FC] border-[#D3E3FD]'
                }`}
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient('cc', email)}
                  className="opacity-65 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  commitRecipient('cc', ccInput, setCcInput);
                }
              }}
              placeholder="Cc recipients..."
              className="flex-1 bg-transparent outline-none py-1"
            />
          </div>
        )}

        {/* Optional Bcc Row */}
        {showBcc && (
          <div className="px-4 py-1 border-b border-current/10 flex items-center flex-wrap gap-1.5 text-xs">
            <span className="opacity-65 font-medium mr-1">Bcc</span>
            {draft.bcc.map((email) => (
              <span
                key={email}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-[#282A2C] border-[#444746]' : 'bg-[#F2F6FC] border-[#D3E3FD]'
                }`}
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient('bcc', email)}
                  className="opacity-65 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={bccInput}
              onChange={(e) => setBccInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  commitRecipient('bcc', bccInput, setBccInput);
                }
              }}
              placeholder="Bcc recipients..."
              className="flex-1 bg-transparent outline-none py-1"
            />
          </div>
        )}

        {/* Subject Input */}
        <div className="px-4 py-2 border-b border-current/10 flex items-center justify-between gap-2">
          <input
            type="text"
            value={draft.subject}
            onChange={(e) =>
              onUpdateDraft({
                ...draft,
                subject: e.target.value,
                lastSaved: 'Saved',
              })
            }
            placeholder="Subject"
            aria-label="Subject"
            className="w-full bg-transparent text-sm font-medium outline-none"
          />

          {/* Quick Templates / Canned Responses */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowTemplatesMenu((p) => !p)}
              title="Insert template"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#444746] hover:bg-[#282A2C] text-[#A8C7FA]'
                  : 'border-[#D3E3FD] hover:bg-[#EAF1FB] text-[#0B57D0]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Templates
            </button>

            {showTemplatesMenu && (
              <div
                className={`absolute right-0 top-8 z-30 w-60 rounded-xl shadow-xl border py-1 text-xs ${
                  isDark
                    ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                    : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
                }`}
              >
                <div className="px-3 py-1 font-semibold opacity-65">Canned Responses</div>
                {CANNED_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      onUpdateDraft({
                        ...draft,
                        subject: draft.subject || tpl.subject,
                        body: tpl.body,
                        lastSaved: 'Saved',
                      });
                      setShowTemplatesMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <div className="font-medium">{tpl.label}</div>
                    <div className="text-[11px] opacity-65 truncate">{tpl.subject}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Body Editor */}
        <div className="flex-1 p-4 flex flex-col overflow-y-auto">
          <textarea
            value={draft.body}
            onChange={(e) =>
              onUpdateDraft({
                ...draft,
                body: e.target.value,
                lastSaved: 'Saved',
              })
            }
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleTriggerSend();
              }
            }}
            placeholder="Write your message... (Press Cmd/Ctrl + Enter to send)"
            aria-label="Message body"
            className="w-full flex-1 bg-transparent text-sm leading-relaxed outline-none resize-none"
          />

          {/* Attached Files List */}
          {draft.attachments.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-current/10 flex flex-wrap gap-2">
              {draft.attachments.map((att) => (
                <div
                  key={att.id}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs border ${
                    isDark
                      ? 'bg-[#282A2C] border-[#444746]'
                      : 'bg-[#F2F6FC] border-[#D3E3FD]'
                  }`}
                >
                  <Paperclip className="w-3 h-3 text-[#0B57D0] dark:text-[#A8C7FA]" />
                  <span className="font-medium truncate max-w-[180px]">{att.name}</span>
                  <span className="opacity-60 tabular-nums">({att.size})</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDraft({
                        ...draft,
                        attachments: draft.attachments.filter((x) => x.id !== att.id),
                      })
                    }
                    className="opacity-65 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formatting Ribbon + Bottom Action Bar */}
        <div
          className={`px-4 py-2.5 border-t border-current/10 flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'bg-[#282A2C]/60' : 'bg-[#F8FAFD]'
          }`}
        >
          <div className="flex items-center gap-1.5 relative">
            {/* Send + Schedule Send Split Pill */}
            <div className="inline-flex rounded-full bg-[#0B57D0] text-white shadow-xs">
              <button
                type="button"
                onClick={() => handleTriggerSend()}
                className="px-4 py-1.5 rounded-l-full text-xs font-semibold hover:bg-[#0842A0] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleMenu((p) => !p)}
                aria-label="Schedule send options"
                title="Schedule send"
                className="px-2 py-1.5 rounded-r-full border-l border-white/25 hover:bg-[#0842A0] transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showScheduleMenu && (
              <div
                className={`absolute left-0 bottom-10 z-30 w-60 rounded-xl shadow-xl border py-1.5 text-xs ${
                  isDark
                    ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                    : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
                }`}
              >
                <div className="px-3.5 py-1 font-semibold opacity-70 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Schedule send
                </div>
                {[
                  { label: 'Tomorrow morning', time: 'Thu, Oct 15, 8:00 AM' },
                  { label: 'Tomorrow afternoon', time: 'Thu, Oct 15, 1:00 PM' },
                  { label: 'Monday morning', time: 'Mon, Oct 19, 8:00 AM' },
                ].map((slot) => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => {
                      setShowScheduleMenu(false);
                      handleTriggerSend(slot.time);
                    }}
                    className={`w-full px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <span>{slot.label}</span>
                    <span className="opacity-65 tabular-nums">{slot.time}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Rich Text Quick Formatters */}
            <button
              type="button"
              onClick={() =>
                onUpdateDraft({ ...draft, body: `${draft.body} **bold**`, lastSaved: 'Saved' })
              }
              title="Bold"
              className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateDraft({ ...draft, body: `${draft.body} *italic*`, lastSaved: 'Saved' })
              }
              title="Italic"
              className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateDraft({ ...draft, body: `${draft.body}\n• `, lastSaved: 'Saved' })
              }
              title="Bulleted list"
              className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateDraft({ ...draft, body: `${draft.body} \`code\``, lastSaved: 'Saved' })
              }
              title="Code"
              className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
            >
              <Code className="w-4 h-4" />
            </button>

            {/* Hidden File Input + Attach Trigger */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach local files"
              className="p-1.5 rounded hover:bg-current/10 opacity-75 cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAttachSampleSpec}
              title="Attach sample PDF spec"
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#3C4043] text-[#A8C7FA]' : 'hover:bg-[#EAF1FB] text-[#0B57D0]'
              }`}
            >
              + Sample PDF
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDiscardDraft(draft.id)}
            aria-label="Discard draft"
            title="Discard draft"
            className="p-1.5 rounded hover:bg-current/10 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
