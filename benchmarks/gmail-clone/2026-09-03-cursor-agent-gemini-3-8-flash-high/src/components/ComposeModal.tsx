import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Trash2,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link,
  Smile,
  ImageIcon,
  Send,
  Type,
} from 'lucide-react';
import { useMail } from '../context/MailContext';
import { Attachment } from '../types/mail';

export const ComposeModal: React.FC = () => {
  const {
    isComposeOpen,
    composeState,
    composeData,
    closeCompose,
    minimizeCompose,
    maximizeCompose,
    restoreCompose,
    updateComposeData,
    sendEmail,
    scheduleEmail,
    discardDraft,
    showToast,
  } = useMail();

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showFormatting, setShowFormatting] = useState(true);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<
    { name: string; email: string }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scheduleMenuRef = useRef<HTMLDivElement>(null);

  const contacts = [
    { name: 'Sarah Lin', email: 'sarah.lin@techcorp.io' },
    { name: 'Alex Chen', email: 'alex.chen@techcorp.io' },
    { name: 'Maya Patel', email: 'maya.patel@designstudio.co' },
    { name: 'Emily Zhao', email: 'emily.zhao@gmail.com' },
    { name: 'David Miller', email: 'david.miller@clientcorp.com' },
  ];

  // Auto-close schedule menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scheduleMenuRef.current && !scheduleMenuRef.current.contains(e.target as Node)) {
        setShowScheduleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isComposeOpen) return null;

  // Contact Autocomplete
  const handleToChange = (val: string) => {
    updateComposeData({ to: val });
    if (val.trim().length > 0) {
      const filtered = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(val.toLowerCase()) ||
          c.email.toLowerCase().includes(val.toLowerCase())
      );
      setContactSuggestions(filtered);
    } else {
      setContactSuggestions([]);
    }
  };

  const selectContact = (c: { name: string; email: string }) => {
    updateComposeData({ to: c.email });
    setContactSuggestions([]);
  };

  // Real File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = Array.from(files).map((file) => {
      const sizeKB = Math.round(file.size / 1024);
      const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type.includes('pdf');
      const isSheet = file.type.includes('sheet') || file.name.endsWith('.xlsx');

      return {
        id: `att-upload-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        filename: file.name,
        size: sizeStr,
        type: isPdf ? 'pdf' : isImg ? 'image' : isSheet ? 'sheet' : 'other',
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      };
    });

    updateComposeData({
      attachments: [...(composeData.attachments || []), ...newAttachments],
    });
    showToast(`Added ${newAttachments.length} attachment(s)`);
  };

  const removeAttachment = (id: string) => {
    updateComposeData({
      attachments: composeData.attachments.filter((a) => a.id !== id),
    });
  };

  // Text formatting helpers (applies markdown/html tags around selection)
  const applyFormat = (tag: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || 'text';

    let replacement = '';
    if (tag === 'b') replacement = `<b>${selected}</b>`;
    else if (tag === 'i') replacement = `<i>${selected}</i>`;
    else if (tag === 'u') replacement = `<u>${selected}</u>`;
    else if (tag === 's') replacement = `<s>${selected}</s>`;
    else if (tag === 'ul') replacement = `\n- ${selected}\n`;
    else if (tag === 'ol') replacement = `\n1. ${selected}\n`;
    else if (tag === 'link') replacement = `<a href="https://">${selected}</a>`;

    const newVal =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    updateComposeData({ body: newVal });
  };

  const insertEmoji = (emoji: string) => {
    updateComposeData({ body: `${composeData.body} ${emoji} ` });
    setShowEmojiPicker(false);
  };

  const handleSend = () => {
    sendEmail(composeData);
  };

  const handleScheduleOption = (type: 'tomorrow_morning' | 'tomorrow_afternoon' | 'next_week') => {
    const target = new Date();
    if (type === 'tomorrow_morning') {
      target.setDate(target.getDate() + 1);
      target.setHours(8, 0, 0, 0);
    } else if (type === 'tomorrow_afternoon') {
      target.setDate(target.getDate() + 1);
      target.setHours(13, 0, 0, 0);
    } else {
      target.setDate(target.getDate() + 4);
      target.setHours(8, 0, 0, 0);
    }
    setShowScheduleMenu(false);
    scheduleEmail(composeData, target.getTime());
  };

  // Minimized state dock bar
  if (composeState === 'minimized') {
    return (
      <div className="fixed bottom-0 right-10 w-72 h-10 bg-gray-900 text-white rounded-t-lg shadow-2xl flex items-center justify-between px-4 z-50 cursor-pointer">
        <span
          onClick={restoreCompose}
          className="font-medium text-xs truncate flex-1 hover:underline"
        >
          {composeData.subject || 'New Message'}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={restoreCompose} className="hover:text-blue-300">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={closeCompose} className="hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Full or Docked Card Container
  const containerClasses =
    composeState === 'maximized'
      ? 'fixed inset-4 sm:inset-12 z-50 rounded-2xl shadow-2xl'
      : 'fixed bottom-0 right-2 sm:right-12 w-full sm:w-[560px] h-[540px] z-50 rounded-t-2xl shadow-compose';

  return (
    <div
      className={`${containerClasses} flex flex-col bg-white dark:bg-[#202124] border border-gray-300 dark:border-gray-700 overflow-hidden text-gray-800 dark:text-gray-100 transition-all select-none`}
    >
      {/* 1. Header Bar */}
      <div className="h-10 px-4 bg-[#f2f6fc] dark:bg-[#2d2e30] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs font-semibold shrink-0">
        <span className="truncate">{composeData.subject || 'New Message'}</span>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <button
            onClick={minimizeCompose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={maximizeCompose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title={composeState === 'maximized' ? 'Exit full screen' : 'Full screen'}
          >
            {composeState === 'maximized' ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={closeCompose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500 rounded transition-colors"
            title="Save and close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Recipients Section */}
      <div className="border-b border-gray-100 dark:border-gray-800 text-xs shrink-0 relative">
        {/* TO Input */}
        <div className="flex items-center px-4 py-2 gap-2">
          <span className="text-gray-400 shrink-0 w-8 font-medium">To</span>
          <input
            type="text"
            value={composeData.to}
            onChange={(e) => handleToChange(e.target.value)}
            placeholder="Recipients"
            className="flex-1 bg-transparent focus:outline-none text-xs text-gray-800 dark:text-gray-100"
            autoFocus
          />
          <div className="flex items-center gap-2 text-gray-400">
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
              >
                Cc
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                className="hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
              >
                Bcc
              </button>
            )}
          </div>
        </div>

        {/* Contact Autocomplete Suggestions */}
        {contactSuggestions.length > 0 && (
          <div className="absolute top-full left-12 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
            {contactSuggestions.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => selectContact(c)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-gray-400 text-[11px]">&lt;{c.email}&gt;</span>
              </button>
            ))}
          </div>
        )}

        {/* CC Field */}
        {showCc && (
          <div className="flex items-center px-4 py-1.5 gap-2 border-t border-gray-100 dark:border-gray-800/60">
            <span className="text-gray-400 shrink-0 w-8 font-medium">Cc</span>
            <input
              type="text"
              value={composeData.cc}
              onChange={(e) => updateComposeData({ cc: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none text-xs text-gray-800 dark:text-gray-100"
            />
          </div>
        )}

        {/* BCC Field */}
        {showBcc && (
          <div className="flex items-center px-4 py-1.5 gap-2 border-t border-gray-100 dark:border-gray-800/60">
            <span className="text-gray-400 shrink-0 w-8 font-medium">Bcc</span>
            <input
              type="text"
              value={composeData.bcc}
              onChange={(e) => updateComposeData({ bcc: e.target.value })}
              className="flex-1 bg-transparent focus:outline-none text-xs text-gray-800 dark:text-gray-100"
            />
          </div>
        )}

        {/* Subject Field */}
        <div className="flex items-center px-4 py-2 border-t border-gray-100 dark:border-gray-800/80">
          <input
            type="text"
            value={composeData.subject}
            onChange={(e) => updateComposeData({ subject: e.target.value })}
            placeholder="Subject"
            className="w-full bg-transparent focus:outline-none text-sm font-medium text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
      </div>

      {/* 3. Body Textarea */}
      <div className="flex-1 p-4 flex flex-col min-h-0 relative select-text">
        <textarea
          ref={bodyTextareaRef}
          value={composeData.body}
          onChange={(e) => updateComposeData({ body: e.target.value })}
          placeholder="Compose an email..."
          className="flex-1 w-full bg-transparent resize-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none font-sans leading-relaxed"
        />

        {/* Attachments List */}
        {composeData.attachments && composeData.attachments.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 select-none">
            {composeData.attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm"
              >
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                <span className="max-w-[140px] truncate">{att.filename}</span>
                <span className="text-gray-400 text-[10px]">({att.size})</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="hover:text-red-500 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-12 left-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl p-3 z-50 grid grid-cols-6 gap-2 text-lg">
            {['😀', '🎉', '👍', '🔥', '🚀', '✨', '💡', '❤️', '🙌', '📅', '🤝', '💯'].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => insertEmoji(em)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-transform hover:scale-110"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Rich Formatting Toolbar (Optional Toggle) */}
      {showFormatting && (
        <div className="px-4 py-1.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-850 flex items-center gap-1 text-gray-600 dark:text-gray-300 text-xs shrink-0 select-none">
          <button
            type="button"
            onClick={() => applyFormat('b')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('i')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('u')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('s')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
          <button
            type="button"
            onClick={() => applyFormat('ul')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bulleted list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('ol')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Numbered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('link')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Insert link"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Bottom Action Bar */}
      <div className="h-14 px-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#202124] select-none">
        {/* Send Split Button */}
        <div className="flex items-center gap-2">
          <div className="relative inline-flex rounded-full shadow-sm" ref={scheduleMenuRef}>
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#1a73e8] hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-xs rounded-l-full transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
            <button
              onClick={() => setShowScheduleMenu(!showScheduleMenu)}
              className="px-2 py-2 bg-[#1a73e8] hover:bg-blue-600 active:bg-blue-700 text-white rounded-r-full border-l border-blue-400 transition-colors"
              title="More send options"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Schedule Send Dropdown Menu */}
            {showScheduleMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                  Schedule send
                </div>
                <button
                  type="button"
                  onClick={() => handleScheduleOption('tomorrow_morning')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center text-gray-800 dark:text-gray-200"
                >
                  <span>Tomorrow morning</span>
                  <span className="text-gray-400 text-[11px]">8:00 AM</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleOption('tomorrow_afternoon')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center text-gray-800 dark:text-gray-200"
                >
                  <span>Tomorrow afternoon</span>
                  <span className="text-gray-400 text-[11px]">1:00 PM</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleOption('next_week')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center text-gray-800 dark:text-gray-200"
                >
                  <span>Monday morning</span>
                  <span className="text-gray-400 text-[11px]">8:00 AM</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            {/* Formatting Toggle */}
            <button
              type="button"
              onClick={() => setShowFormatting(!showFormatting)}
              className={`p-2 rounded-full transition-colors ${
                showFormatting
                  ? 'bg-gray-200 dark:bg-gray-700 text-blue-600'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title="Formatting options"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Real File Input Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors"
              title="Attach files from device"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Emoji */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors"
              title="Insert emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Quick Demo Attachment Sample */}
            <button
              type="button"
              onClick={() => {
                const sampleAtt: Attachment = {
                  id: `sample-${Date.now()}`,
                  filename: 'Project-Proposal-2026.pdf',
                  size: '1.9 MB',
                  type: 'pdf',
                };
                updateComposeData({
                  attachments: [...(composeData.attachments || []), sampleAtt],
                });
                showToast('Attached sample document');
              }}
              className="hidden sm:inline-flex p-2 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors"
              title="Add sample PDF attachment"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Discard Draft Trash Button */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 hidden sm:inline">Saved in Drafts</span>
          <button
            type="button"
            onClick={discardDraft}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Discard draft"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
