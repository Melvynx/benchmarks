import {
  List,
  ListOrdered,
  Maximize2,
  Minus,
  Minimize2,
  Paperclip,
  SendHorizontal,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Attachment, ComposeDraft, Contact } from '../domain/mail';

export interface ComposeWindowProps {
  draft: ComposeDraft;
  suggestions: Contact[];
  onChange: (patch: Partial<ComposeDraft>) => void;
  onMinimize: () => void;
  onClose: () => void;
  onDiscard: () => void;
  onSend: () => void;
}

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeAttachmentId(file: File, index: number): string {
  return `${Date.now()}-${file.name}-${file.size}-${file.lastModified}-${index}`;
}

function getAttachmentKind(file: File): Attachment['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (/\.(xlsx?|csv)$/i.test(file.name)) return 'sheet';
  if (/\.(zip|rar|7z)$/i.test(file.name)) return 'archive';
  if (/\.pdf$/i.test(file.name)) return 'pdf';
  return 'document';
}

function getAttachmentAccent(kind: Attachment['kind']): string {
  const accents: Record<Attachment['kind'], string> = {
    pdf: 'oklch(0.59 0.18 24)',
    image: 'oklch(0.58 0.15 305)',
    document: 'oklch(0.58 0.17 255)',
    sheet: 'oklch(0.55 0.14 150)',
    archive: 'oklch(0.62 0.11 75)',
  };
  return accents[kind];
}

export function ComposeWindow({
  draft,
  suggestions,
  onChange,
  onMinimize,
  onClose,
  onDiscard,
  onSend,
}: ComposeWindowProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCarbonCopy, setShowCarbonCopy] = useState(
    Boolean(draft.cc || draft.bcc),
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [discardPending, setDiscardPending] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [attachmentNotice, setAttachmentNotice] = useState('');

  useEffect(() => {
    if (draft.cc || draft.bcc) setShowCarbonCopy(true);
  }, [draft.bcc, draft.cc]);

  const recipientParts = draft.to.split(',');
  const recipientQuery =
    recipientParts[recipientParts.length - 1]?.trim().toLocaleLowerCase() ?? '';

  const matchingSuggestions = useMemo(() => {
    const currentValue = draft.to.toLocaleLowerCase();

    return suggestions
      .filter((contact) => !currentValue.includes(contact.email.toLocaleLowerCase()))
      .filter((contact) => {
        if (!recipientQuery) return true;
        return `${contact.name} ${contact.email}`
          .toLocaleLowerCase()
          .includes(recipientQuery);
      })
      .slice(0, 6);
  }, [draft.to, recipientQuery, suggestions]);

  useEffect(() => {
    setActiveSuggestion((current) =>
      Math.min(current, Math.max(matchingSuggestions.length - 1, 0)),
    );
  }, [matchingSuggestions.length]);

  const updateField =
    (field: 'to' | 'cc' | 'bcc' | 'subject' | 'body') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: event.target.value });
      setDiscardPending(false);
      if (field === 'to') setRecipientError('');
    };

  const selectContact = (contact: Contact) => {
    const existing = recipientParts
      .slice(0, -1)
      .map((part) => part.trim())
      .filter(Boolean);
    onChange({ to: [...existing, contact.email].join(', ') });
    setShowSuggestions(false);
    setActiveSuggestion(0);
    setRecipientError('');
  };

  const handleRecipientKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || matchingSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestion((current) =>
        Math.min(current + 1, matchingSuggestions.length - 1),
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectContact(matchingSuggestions[activeSuggestion]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setShowSuggestions(false);
    }
  };

  const replaceBodySelection = (
    createText: (selected: string) => { text: string; selectStart: number; selectEnd: number },
  ) => {
    const input = bodyRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selection = draft.body.slice(start, end);
    const replacement = createText(selection);
    const nextBody = `${draft.body.slice(0, start)}${replacement.text}${draft.body.slice(end)}`;

    onChange({ body: nextBody });
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(
        start + replacement.selectStart,
        start + replacement.selectEnd,
      );
    });
  };

  const insertText = (text: string) => {
    replaceBodySelection(() => ({
      text,
      selectStart: text.length,
      selectEnd: text.length,
    }));
  };

  const insertList = (ordered: boolean) => {
    replaceBodySelection((selected) => {
      const content = selected || 'List item';
      const text = content
        .split('\n')
        .map((line, index) => `${ordered ? `${index + 1}.` : '•'} ${line}`)
        .join('\n');
      return { text, selectStart: 0, selectEnd: text.length };
    });
  };

  const handleAttachments = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const accepted = files.filter((file) => file.size <= MAX_ATTACHMENT_SIZE);
    const rejectedCount = files.length - accepted.length;

    const newAttachments = accepted.map((file, index) => {
      const kind = getAttachmentKind(file);
      return {
        id: makeAttachmentId(file, index),
        name: file.name,
        size: formatFileSize(file.size),
        kind,
        accent: getAttachmentAccent(kind),
      } satisfies Attachment;
    });
    onChange({ attachments: [...draft.attachments, ...newAttachments] });
    setAttachmentNotice(
      rejectedCount > 0
        ? `${rejectedCount} attachment${rejectedCount === 1 ? '' : 's'} exceeded 25 MB.`
        : accepted.length > 0
          ? `${accepted.length} attachment${accepted.length === 1 ? '' : 's'} added.`
          : '',
    );
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    onChange({
      attachments: draft.attachments.filter((attachment) => attachment.id !== id),
    });
    setAttachmentNotice('Attachment removed.');
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.to.trim()) {
      setRecipientError('Add at least one recipient before sending.');
      return;
    }
    onSend();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  if (draft.isMinimized) {
    return (
      <aside className="compose-minimized" aria-label="Minimized draft">
        <button
          type="button"
          className="compose-minimized__restore"
          onClick={() => onChange({ isMinimized: false })}
          aria-label="Restore draft"
        >
          <span className="compose-minimized__title">
            {draft.subject.trim() || 'New message'}
          </span>
        </button>
        <button
          type="button"
          className="compose-icon-button"
          onClick={onClose}
          aria-label="Save and close draft"
          title="Save and close"
        >
          <X aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`compose-window${isFullscreen ? ' compose-window--fullscreen' : ''}`}
      aria-label="Compose new message"
    >
      <header className="compose-header">
        <h2 className="compose-header__title">New message</h2>
        <div className="compose-header__actions">
          <button
            type="button"
            className="compose-header__button"
            onClick={onMinimize}
            aria-label="Minimize draft"
            title="Minimize"
          >
            <Minus aria-hidden="true" />
          </button>
          <button
            type="button"
            className="compose-header__button"
            onClick={() => setIsFullscreen((current) => !current)}
            aria-label={isFullscreen ? 'Exit fullscreen compose' : 'Fullscreen compose'}
            aria-pressed={isFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" />
            ) : (
              <Maximize2 aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="compose-header__button"
            onClick={onClose}
            aria-label="Save and close draft"
            title="Save and close"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <form
        className="compose-form"
        onSubmit={submitMessage}
        onKeyDown={handleComposerKeyDown}
      >
        <div className="compose-fields">
          <div className="compose-field compose-field--recipients">
            <label className="compose-field__label" htmlFor={`compose-to-${draft.id}`}>
              To
            </label>
            <div className="compose-recipient-input">
              <input
                id={`compose-to-${draft.id}`}
                className="compose-field__input"
                value={draft.to}
                onChange={updateField('to')}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setShowSuggestions(false)}
                onKeyDown={handleRecipientKeyDown}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={`compose-suggestions-${draft.id}`}
                aria-expanded={showSuggestions && matchingSuggestions.length > 0}
                aria-activedescendant={
                  showSuggestions && matchingSuggestions.length > 0
                    ? `compose-suggestion-${draft.id}-${activeSuggestion}`
                    : undefined
                }
                aria-invalid={Boolean(recipientError)}
                aria-describedby={recipientError ? `compose-to-error-${draft.id}` : undefined}
              />
              {showSuggestions && matchingSuggestions.length > 0 ? (
                <div
                  className="compose-suggestions"
                  id={`compose-suggestions-${draft.id}`}
                  role="listbox"
                  aria-label="Contact suggestions"
                >
                  {matchingSuggestions.map((contact, index) => (
                    <button
                      key={contact.email}
                      id={`compose-suggestion-${draft.id}-${index}`}
                      type="button"
                      className={`compose-suggestion${
                        activeSuggestion === index ? ' compose-suggestion--active' : ''
                      }`}
                      role="option"
                      aria-selected={activeSuggestion === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectContact(contact)}
                    >
                      <span className="compose-suggestion__avatar" aria-hidden="true">
                        {contact.name.slice(0, 1).toLocaleUpperCase()}
                      </span>
                      <span className="compose-suggestion__identity">
                        <span className="compose-suggestion__name">{contact.name}</span>
                        <span className="compose-suggestion__email">{contact.email}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="compose-field__reveal"
              onClick={() => setShowCarbonCopy((current) => !current)}
              aria-expanded={showCarbonCopy}
              aria-controls={`compose-carbon-copy-${draft.id}`}
            >
              Cc/Bcc
            </button>
          </div>
          {recipientError ? (
            <p
              className="compose-field__error"
              id={`compose-to-error-${draft.id}`}
              role="alert"
            >
              {recipientError}
            </p>
          ) : null}

          {showCarbonCopy ? (
            <div
              className="compose-carbon-copy"
              id={`compose-carbon-copy-${draft.id}`}
            >
              <div className="compose-field">
                <label className="compose-field__label" htmlFor={`compose-cc-${draft.id}`}>
                  Cc
                </label>
                <input
                  id={`compose-cc-${draft.id}`}
                  className="compose-field__input"
                  value={draft.cc}
                  onChange={updateField('cc')}
                  autoComplete="email"
                />
              </div>
              <div className="compose-field">
                <label className="compose-field__label" htmlFor={`compose-bcc-${draft.id}`}>
                  Bcc
                </label>
                <input
                  id={`compose-bcc-${draft.id}`}
                  className="compose-field__input"
                  value={draft.bcc}
                  onChange={updateField('bcc')}
                  autoComplete="email"
                />
              </div>
            </div>
          ) : null}

          <div className="compose-field compose-field--subject">
            <label className="compose-field__label" htmlFor={`compose-subject-${draft.id}`}>
              Subject
            </label>
            <input
              id={`compose-subject-${draft.id}`}
              className="compose-field__input"
              value={draft.subject}
              onChange={updateField('subject')}
            />
          </div>
        </div>

        <label className="compose-body-label" htmlFor={`compose-body-${draft.id}`}>
          Message body
        </label>
        <textarea
          ref={bodyRef}
          id={`compose-body-${draft.id}`}
          className="compose-body"
          value={draft.body}
          onChange={updateField('body')}
          spellCheck="true"
        />

        {draft.attachments.length > 0 ? (
          <ul className="compose-attachments" aria-label="Attachments">
            {draft.attachments.map((attachment) => (
              <li className="compose-attachment" key={attachment.id}>
                <Paperclip aria-hidden="true" />
                <span className="compose-attachment__name">{attachment.name}</span>
                <span className="compose-attachment__size">{attachment.size}</span>
                <button
                  type="button"
                  className="compose-attachment__remove"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.name}`}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="compose-status" aria-live="polite">
          {attachmentNotice}
        </p>

        {discardPending ? (
          <div className="compose-discard-confirmation" role="alert">
            <span>
              <strong>Discard this draft?</strong> You can undo this for a few seconds.
            </span>
            <div className="compose-discard-confirmation__actions">
              <button
                type="button"
                className="compose-text-button"
                onClick={() => setDiscardPending(false)}
              >
                Keep writing
              </button>
              <button
                type="button"
                className="compose-text-button compose-text-button--danger"
                onClick={onDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        <footer className="compose-footer">
          <div className="compose-send-group">
            <button type="submit" className="compose-send-button">
              <SendHorizontal aria-hidden="true" />
              <span>Send</span>
            </button>
          </div>

          <div className="compose-toolbar" role="toolbar" aria-label="Message insert options">
            <button
              type="button"
              className="compose-toolbar__button"
              onClick={() => insertList(false)}
              aria-label="Bulleted list"
              title="Bulleted list"
            >
              <List aria-hidden="true" />
            </button>
            <button
              type="button"
              className="compose-toolbar__button"
              onClick={() => insertList(true)}
              aria-label="Numbered list"
              title="Numbered list"
            >
              <ListOrdered aria-hidden="true" />
            </button>
            <button
              type="button"
              className="compose-toolbar__button"
              onClick={() => insertText('🙂')}
              aria-label="Insert emoji"
              title="Insert emoji"
            >
              <Smile aria-hidden="true" />
            </button>
            <button
              type="button"
              className="compose-toolbar__button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              title="Attach files"
            >
              <Paperclip aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              className="compose-file-input"
              type="file"
              multiple
              onChange={handleAttachments}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            className="compose-discard-button"
            onClick={() => setDiscardPending(true)}
            aria-label="Discard draft"
            aria-expanded={discardPending}
            title="Discard draft"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </footer>
      </form>
    </aside>
  );
}
