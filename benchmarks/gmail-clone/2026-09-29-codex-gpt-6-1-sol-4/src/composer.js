import { CONTACTS, USER } from './data.ts';
import { recipientsValid } from './domain.ts';
import { icon } from './icons.js';
import { escape, safeHtml, avatar } from './view.js';

export class Composer {
  constructor(callbacks) { this.callbacks = callbacks; this.root = document.getElementById('composer-root'); this.state = null; this.timer = null; }
  open(initial = {}) {
    if (this.state) this.save();
    this.state = { id: initial.id ?? `local-${crypto.randomUUID()}`, to: '', cc: '', bcc: '', subject: '', body: '', bodyHtml: '', attachments: [], ...initial };
    if (!initial.body && this.callbacks.signature()) this.state.body = '\n\nBest,\nAlex';
    this.minimized = false; this.maximized = false;
    this.render();
    requestAnimationFrame(() => this.root.querySelector(initial.to ? '[name="subject"]' : '[name="to"]')?.focus());
  }
  render() {
    const s = this.state;
    if (!s) { this.root.innerHTML = ''; return; }
    this.root.innerHTML = `<section class="composer ${this.maximized ? 'maximized' : ''} ${this.minimized ? 'minimized' : ''}" aria-label="Compose message">
      <header class="compose-header"><span>${s.replyTo ? 'Reply' : 'New message'}</span><div>
      <button class="compose-window-button" data-caction="minimize" title="${this.minimized ? 'Expand' : 'Minimize'}" aria-label="${this.minimized ? 'Expand compose' : 'Minimize compose'}">${icon(this.minimized ? 'up' : 'minimize')}</button>
      <button class="compose-window-button" data-caction="maximize" title="Full screen" aria-label="Maximize compose">${icon('maximize')}</button>
      <button class="compose-window-button" data-caction="close" title="Save and close" aria-label="Save and close compose">${icon('close')}</button></div></header>
      <div class="compose-content">
        <div class="recipient-row"><label for="compose-to">To</label><input id="compose-to" name="to" value="${escape(s.to)}" placeholder="Recipients" autocomplete="off" spellcheck="false"><button data-caction="cc" class="text-button">Cc</button><button data-caction="bcc" class="text-button">Bcc</button><div class="contact-suggestions"></div></div>
        <div class="recipient-row optional-recipient ${s.cc ? '' : 'hidden'}" data-recipient="cc"><label for="compose-cc">Cc</label><input id="compose-cc" name="cc" value="${escape(s.cc)}" autocomplete="off" placeholder="Add Cc recipients"></div>
        <div class="recipient-row optional-recipient ${s.bcc ? '' : 'hidden'}" data-recipient="bcc"><label for="compose-bcc">Bcc</label><input id="compose-bcc" name="bcc" value="${escape(s.bcc)}" autocomplete="off" placeholder="Add Bcc recipients"></div>
        <input class="compose-subject" name="subject" aria-label="Subject" value="${escape(s.subject)}" placeholder="Subject">
        <div class="compose-editor" contenteditable="true" role="textbox" aria-label="Message body" aria-multiline="true" data-placeholder="Write something thoughtful…">${s.bodyHtml ? safeHtml(s.bodyHtml) : escape(s.body).replace(/\n/g, '<br>')}</div>
        <div class="compose-attachments"></div>
        <div class="compose-error" role="alert"></div>
        <div class="formatting-bar hidden"><button data-caction="format" data-command="bold" aria-label="Bold">${icon('bold')}</button><button data-caction="format" data-command="italic" aria-label="Italic">${icon('italic')}</button><button data-caction="format" data-command="underline" aria-label="Underline">${icon('underline')}</button><span class="formatting-divider"></span><button data-caction="format" data-command="insertUnorderedList" aria-label="Bulleted list">• List</button><button data-caction="format" data-command="removeFormat" aria-label="Clear formatting">Clear</button></div>
        <footer class="compose-footer"><div class="send-buttons"><button class="send-button" data-caction="send">Send ${icon('send')}</button><button class="schedule-button" data-caction="schedule" title="Schedule send" aria-label="Schedule send">${icon('down')}</button></div>
          <button class="icon-button" data-caction="formatting" title="Formatting options" aria-label="Formatting options"><span class="formatting-a">A</span></button>
          <button class="icon-button" data-caction="attach" title="Attach files" aria-label="Attach files">${icon('attachment')}</button>
          <button class="icon-button" data-caction="link" title="Insert link" aria-label="Insert link">${icon('link')}</button>
          <button class="icon-button" data-caction="emoji" title="Insert emoji" aria-label="Insert emoji">${icon('smile')}</button>
          <span class="draft-status">Draft saved</span>
          <button class="icon-button" data-caction="discard" title="Discard draft" aria-label="Discard draft">${icon('trash')}</button>
        </footer>
      </div><input class="hidden" type="file" multiple id="compose-files">
    </section>`;
    this.root.onclick = event => {
      const target = event.target.closest('[data-caction]');
      if (!target) return;
      event.stopPropagation();
      this.action(target.dataset.caction, target);
    };
    this.root.oninput = event => {
      const target = event.target;
      if (['to', 'cc', 'bcc', 'subject'].includes(target.name)) this.state[target.name] = target.value;
      if (target.classList.contains('compose-editor')) { this.state.body = target.innerText; this.state.bodyHtml = safeHtml(target.innerHTML); }
      if (target.name === 'to') this.suggestions(target.value);
      this.root.querySelector('.compose-error').textContent = '';
      this.root.querySelector('.draft-status').textContent = 'Saving…';
      clearTimeout(this.timer); this.timer = setTimeout(() => this.save(), 500);
    };
    this.root.querySelector('.compose-editor').onpaste = event => {
      event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    };
    this.root.querySelector('#compose-files').onchange = event => this.attach(event.target.files);
    this.root.querySelectorAll('[data-command]').forEach(el => el.onmousedown = event => event.preventDefault());
    this.renderAttachments();
  }
  save() {
    clearTimeout(this.timer);
    if (!this.state) return;
    if (![this.state.to, this.state.subject, this.state.body].some(x => x.trim()) && !this.state.attachments.length) { this.callbacks.empty(this.state.id); return; }
    this.callbacks.save(this.state);
    const status = this.root.querySelector('.draft-status'); if (status) status.textContent = 'Draft saved';
  }
  close() { this.save(); this.state = null; this.render(); }
  suggestions(value) {
    const term = value.split(/[,;]/).pop().trim().toLowerCase();
    const matches = term && !term.includes('@') ? CONTACTS.filter(c => `${c.name} ${c.email}`.toLowerCase().includes(term)).slice(0, 4) : [];
    this.root.querySelector('.contact-suggestions').innerHTML = matches.map(c => `<button data-caction="contact" data-email="${escape(c.email)}">${avatar(c.name.split(' ').map(x => x[0]).join(''), c.color)}<span><strong>${escape(c.name)}</strong><small>${escape(c.email)}</small></span></button>`).join('');
  }
  validate() {
    let error = '';
    if (!recipientsValid(this.state.to)) error = 'Add a valid email address in the To field.';
    else if (this.state.cc && !recipientsValid(this.state.cc)) error = 'Please check the Cc email addresses.';
    else if (this.state.bcc && !recipientsValid(this.state.bcc)) error = 'Please check the Bcc email addresses.';
    this.root.querySelector('.compose-error').textContent = error;
    if (error) this.root.querySelector('[name="to"]').focus();
    return !error;
  }
  send(folder = 'sent', wakeAt) {
    if (!this.state || !this.validate()) return;
    clearTimeout(this.timer);
    const outgoing = { ...this.state };
    this.state = null; this.render();
    this.callbacks.send(outgoing, folder, wakeAt);
  }
  async attach(files) {
    for (const file of [...files]) {
      if (file.size > 1024 * 1024 || this.state.attachments.filter(a => a.data).length >= 2) {
        this.callbacks.toast('Local attachments support up to 2 files, 1 MB each.'); continue;
      }
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      if (!this.state) return;
      this.state.attachments.push({ name: file.name, size: file.size > 1024 ? `${Math.round(file.size / 1024)} KB` : `${file.size} B`, kind: file.type.startsWith('image/') ? 'image' : file.name.split('.').pop(), data });
    }
    this.renderAttachments(); this.save();
  }
  renderAttachments() {
    this.root.querySelector('.compose-attachments').innerHTML = this.state.attachments.map((a, i) => `<div class="compose-file">${icon('attachment')}<span>${escape(a.name)}</span><small>${escape(a.size)}</small><button data-caction="remove-file" data-index="${i}" aria-label="Remove ${escape(a.name)}">${icon('close')}</button></div>`).join('');
  }
  action(action, target) {
    const editor = this.root.querySelector('.compose-editor');
    switch (action) {
      case 'close': this.close(); break;
      case 'discard': clearTimeout(this.timer); this.callbacks.discard(this.state.id); this.state = null; this.render(); break;
      case 'minimize': this.minimized = !this.minimized; this.root.querySelector('.composer').classList.toggle('minimized', this.minimized); target.innerHTML = icon(this.minimized ? 'up' : 'minimize'); target.setAttribute('aria-label', this.minimized ? 'Expand compose' : 'Minimize compose'); break;
      case 'maximize': this.maximized = !this.maximized; this.minimized = false; this.root.querySelector('.composer').classList.toggle('maximized', this.maximized); this.root.querySelector('.composer').classList.remove('minimized'); break;
      case 'cc': case 'bcc': this.root.querySelector(`[data-recipient="${action}"]`).classList.toggle('hidden'); this.root.querySelector(`[name="${action}"]`).focus(); break;
      case 'contact': {
        const parts = this.state.to.split(/[,;]/); parts.pop(); parts.push(target.dataset.email); this.state.to = parts.join(', ') + ', ';
        this.root.querySelector('[name="to"]').value = this.state.to; this.suggestions(''); this.save(); break;
      }
      case 'send': this.send(); break;
      case 'schedule': {
        if (!this.validate()) break;
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(8, 0, 0, 0);
        const afternoon = new Date(Date.now() + 3 * 3600000);
        this.callbacks.menu(target, `<div class="menu-heading">Schedule send</div><button data-action="schedule-send" data-date="${tomorrow.toISOString()}">${icon('sun')}Tomorrow morning <small>8:00 AM</small></button><button data-action="schedule-send" data-date="${afternoon.toISOString()}">${icon('clock')}In 3 hours</button>`); break;
      }
      case 'formatting': this.root.querySelector('.formatting-bar').classList.toggle('hidden'); break;
      case 'format': editor.focus(); document.execCommand(target.dataset.command, false); this.state.body = editor.innerText; this.state.bodyHtml = safeHtml(editor.innerHTML); this.save(); break;
      case 'attach': this.root.querySelector('#compose-files').click(); break;
      case 'remove-file': this.state.attachments.splice(Number(target.dataset.index), 1); this.renderAttachments(); this.save(); break;
      case 'emoji': this.callbacks.menu(target, `<div class="emoji-menu">${['😊', '✨', '🙌', '☕', '❤️', '🎉', '👍', '👋', '💡', '🌿', '📎', '🚀'].map(emoji => `<button data-action="compose-emoji" data-emoji="${emoji}" aria-label="${emoji}">${emoji}</button>`).join('')}</div>`); break;
      case 'link': this.callbacks.linkDialog(); break;
    }
  }
  insert(text) {
    const editor = this.root.querySelector('.compose-editor'); editor.focus(); document.execCommand('insertText', false, text);
    this.state.body = editor.innerText; this.state.bodyHtml = safeHtml(editor.innerHTML); this.save();
  }
}
