import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MdAdd, MdCheckCircle, MdChevronLeft, MdChevronRight, MdClose, MdExpandLess, MdExpandMore, MdOutlineCalendarToday,
  MdOutlineCircle, MdOutlineContacts, MdOutlineDelete, MdOutlineMail, MdOutlineTaskAlt, MdPlace, MdSearch,
} from 'react-icons/md';
import { useIsMobile, useNow } from '../hooks';
import { composeTo, openThread } from '../lib/actions';
import { TIME, displayName } from '../lib/format';
import { navigate } from '../lib/router';
import { useMail, type Settings } from '../store/mail';
import { knownContacts } from '../store/selectors';
import { useUI } from '../store/ui';
import { Avatar, Dialog, IconButton } from './primitives';

type Panel = NonNullable<Settings['sidePanel']>;

const PANELS: { id: Panel; label: string; icon: typeof MdOutlineCalendarToday; color: string }[] = [
  { id: 'calendar', label: 'Calendar', icon: MdOutlineCalendarToday, color: '#1a73e8' },
  { id: 'tasks', label: 'Tasks', icon: MdOutlineTaskAlt, color: '#1e8e3e' },
  { id: 'contacts', label: 'Contacts', icon: MdOutlineContacts, color: '#e37400' },
];

export function AppRail() {
  const panel = useMail((s) => s.settings.sidePanel);
  const update = useMail((s) => s.updateSettings);
  const openTasks = useMail((s) => s.tasks.filter((t) => !t.done).length);
  return (
    <nav className="rail" aria-label="Side panel apps">
      {PANELS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`rail-btn ${panel === p.id ? 'is-active' : ''}`}
          aria-label={p.label}
          aria-pressed={panel === p.id}
          data-tip={p.label}
          style={{ color: p.color }}
          onClick={() => update({ sidePanel: panel === p.id ? null : p.id })}
        >
          <p.icon aria-hidden />
          {p.id === 'tasks' && openTasks > 0 && <span className="rail-badge">{openTasks}</span>}
        </button>
      ))}
      <span className="rail-sep" />
    </nav>
  );
}

export function SidePanel() {
  const panel = useMail((s) => s.settings.sidePanel);
  const update = useMail((s) => s.updateSettings);
  const mobile = useIsMobile();
  if (!panel) return null;
  const def = PANELS.find((p) => p.id === panel)!;
  return (
    <aside className={`side-panel ${mobile ? 'is-mobile' : ''}`} aria-label={def.label}>
      <div className="sp-head">
        <h2>{def.label}</h2>
        <IconButton icon={MdClose} label={`Close ${def.label}`} onClick={() => update({ sidePanel: null })} />
      </div>
      <div className="sp-body">
        {panel === 'calendar' && <CalendarPanel />}
        {panel === 'tasks' && <TasksPanel />}
        {panel === 'contacts' && <ContactsPanel />}
      </div>
    </aside>
  );
}

/* ---------------- Calendar ---------------- */

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_PX = 48;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function CalendarPanel() {
  const events = useMail((s) => s.events);
  const now = useNow(60_000);
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [draft, setDraft] = useState<{ start: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isToday = day === startOfDay(now);
  const dayEvents = events.filter((e) => e.start >= day && e.start < day + TIME.DAY).sort((a, b) => a.start - b.start);

  useEffect(() => {
    const h = isToday ? new Date(now).getHours() : 9;
    gridRef.current?.scrollTo({ top: Math.max(0, (h - START_HOUR - 1) * HOUR_PX) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const label = new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const nowTop = ((now - day) / TIME.HOUR - START_HOUR) * HOUR_PX;

  return (
    <div className="cal">
      <div className="cal-nav">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setDay(startOfDay(Date.now()))} disabled={isToday}>Today</button>
        <IconButton icon={MdChevronLeft} label="Previous day" onClick={() => setDay(day - TIME.DAY)} />
        <IconButton icon={MdChevronRight} label="Next day" onClick={() => setDay(day + TIME.DAY)} />
        <span className="cal-date">{label}</span>
      </div>
      <div className="cal-grid" ref={gridRef}>
        <div className="cal-hours" style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }}>
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
            const h = START_HOUR + i;
            return (
              <button
                key={h}
                type="button"
                className="cal-hour"
                style={{ top: i * HOUR_PX, height: HOUR_PX }}
                aria-label={`Create event at ${h}:00`}
                onClick={() => setDraft({ start: day + h * TIME.HOUR })}
              >
                <span className="cal-hour-label">{new Date(day + h * TIME.HOUR).toLocaleTimeString('en-US', { hour: 'numeric' })}</span>
              </button>
            );
          })}
          {dayEvents.map((e) => {
            const top = ((e.start - day) / TIME.HOUR - START_HOUR) * HOUR_PX;
            const height = Math.max(22, ((e.end - e.start) / TIME.HOUR) * HOUR_PX - 2);
            const past = e.end < now;
            return (
              <div key={e.id} className={`cal-event ${past ? 'is-past' : ''}`} style={{ top, height, background: e.color }} title={e.title}>
                <div className="cal-event-title">{e.title}</div>
                {height > 34 && (
                  <div className="cal-event-meta">
                    {fmtTime(e.start)} – {fmtTime(e.end)}
                    {e.location && height > 50 && <><br /><MdPlace aria-hidden /> {e.location}</>}
                  </div>
                )}
                <button
                  type="button"
                  className="cal-event-x"
                  aria-label={`Delete ${e.title}`}
                  onClick={() => {
                    useMail.getState().deleteEvent(e.id);
                    useUI.getState().showToast('Event deleted.', [{ label: 'Undo', run: () => useMail.getState().addEvent(e) }]);
                  }}
                >
                  <MdClose aria-hidden />
                </button>
              </div>
            );
          })}
          {isToday && nowTop >= 0 && nowTop <= (END_HOUR - START_HOUR) * HOUR_PX && <div className="cal-now" style={{ top: nowTop }} aria-hidden />}
        </div>
      </div>
      <button type="button" className="btn btn-tonal cal-add" onClick={() => setDraft({ start: day + (isToday ? Math.min(END_HOUR - 1, new Date(now).getHours() + 1) : 10) * TIME.HOUR })}>
        <MdAdd aria-hidden /> Create event
      </button>
      <EventDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const EVENT_COLORS = ['#039be5', '#33b679', '#e67c73', '#f6bf26', '#8e24aa', '#f4511e'];

function EventDialog({ draft, onClose }: { draft: { start: number } | null; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  useEffect(() => {
    if (!draft) return;
    const d = new Date(draft.start);
    setTitle('');
    setLocation('');
    setDuration(60);
    setTime(`${String(d.getHours()).padStart(2, '0')}:00`);
  }, [draft]);
  if (!draft) return null;
  const save = () => {
    if (!title.trim()) return;
    const [h, m] = time.split(':').map(Number);
    const start = startOfDay(draft.start) + h * TIME.HOUR + m * TIME.MIN;
    useMail.getState().addEvent({ title: title.trim(), start, end: start + duration * TIME.MIN, location: location.trim() || undefined, color });
    useUI.getState().showToast(`“${title.trim()}” added to your calendar.`);
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="New event"
      actions={
        <>
          <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!title.trim()} onClick={save}>Save</button>
        </>
      }
    >
      <form className="form-stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add title" autoFocus /></label>
        <div className="field-row">
          <label className="field"><span>{new Date(draft.start).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="field">
            <span>Duration</span>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </label>
        </div>
        <label className="field"><span>Location</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" /></label>
        <div className="swatches">
          {EVENT_COLORS.map((c) => (
            <button key={c} type="button" className={`swatch ${c === color ? 'is-on' : ''}`} style={{ background: c }} aria-label={`Color ${c}`} onClick={() => setColor(c)} />
          ))}
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/* ---------------- Tasks ---------------- */

function TasksPanel() {
  const tasks = useMail((s) => s.tasks);
  const threads = useMail((s) => s.threads);
  const [title, setTitle] = useState('');
  const [showDone, setShowDone] = useState(false);
  const now = useNow(60_000);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const add = () => {
    const clean = title.trim();
    if (!clean) return;
    useMail.getState().addTask(clean);
    setTitle('');
  };
  const dueLabel = (due: number) => {
    const d = startOfDay(due);
    const today = startOfDay(now);
    if (d === today) return { text: 'Today', late: due < now };
    if (d === today + TIME.DAY) return { text: 'Tomorrow', late: false };
    if (d < today) return { text: new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), late: true };
    return { text: new Date(due).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), late: false };
  };
  const row = (t: (typeof tasks)[number]) => {
    const thread = t.threadId ? threads[t.threadId] : undefined;
    const due = t.due ? dueLabel(t.due) : null;
    return (
      <li key={t.id} className={`task ${t.done ? 'is-done' : ''}`}>
        <button
          type="button"
          className="task-check"
          aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
          onClick={() => {
            useMail.getState().updateTask(t.id, { done: !t.done });
            if (!t.done) useUI.getState().showToast('1 task completed.', [{ label: 'Undo', run: () => useMail.getState().updateTask(t.id, { done: false }) }]);
          }}
        >
          {t.done ? <MdCheckCircle aria-hidden /> : <MdOutlineCircle aria-hidden />}
        </button>
        <div className="task-main">
          <input
            className="task-title"
            defaultValue={t.title}
            aria-label="Task title"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== t.title) useMail.getState().updateTask(t.id, { title: v });
              if (!v) e.target.value = t.title;
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <div className="task-meta">
            {due && <span className={`task-due ${due.late && !t.done ? 'is-late' : ''}`}>{due.text}</span>}
            {thread && (
              <button type="button" className="task-link" onClick={() => openThread(thread.id, { view: 'folder', folder: 'all' })}>
                <MdOutlineMail aria-hidden /> <span>{thread.subject}</span>
              </button>
            )}
          </div>
        </div>
        <IconButton icon={MdOutlineDelete} size="sm" label="Delete task" className="task-del" onClick={() => {
          useMail.getState().deleteTask(t.id);
          useUI.getState().showToast('Task deleted.', [{ label: 'Undo', run: () => useMail.setState({ tasks: [t, ...useMail.getState().tasks] }) }]);
        }} />
      </li>
    );
  };
  return (
    <div className="tasks">
      <form className="task-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <MdAdd aria-hidden />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" aria-label="Add a task" />
      </form>
      {open.length === 0 ? (
        <div className="tasks-empty">
          <MdOutlineTaskAlt aria-hidden />
          <p>All tasks complete. Nice work!</p>
        </div>
      ) : (
        <ul className="task-list">{open.map(row)}</ul>
      )}
      {done.length > 0 && (
        <>
          <button type="button" className="tasks-done-toggle" onClick={() => setShowDone(!showDone)}>
            {showDone ? <MdExpandLess aria-hidden /> : <MdExpandMore aria-hidden />} Completed ({done.length})
          </button>
          {showDone && <ul className="task-list">{done.map(row)}</ul>}
        </>
      )}
    </div>
  );
}

/* ---------------- Contacts ---------------- */

function ContactsPanel() {
  const threads = useMail((s) => s.threads);
  const [q, setQ] = useState('');
  const all = useMemo(() => knownContacts(threads).filter((c) => c.kind !== 'brand'), [threads]);
  const list = all.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <div className="contacts">
      <label className="contacts-search">
        <MdSearch aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" />
      </label>
      <div className="contacts-count">{q ? `${list.length} matches` : `Frequently contacted · ${all.length}`}</div>
      <ul className="contact-list">
        {list.map((c) => (
          <li key={c.email} className="contact-row">
            <Avatar contact={c} size={36} />
            <div className="contact-text">
              <div className="contact-name">{displayName(c)}</div>
              <div className="contact-email">{c.org ? `${c.org} · ` : ''}{c.email}</div>
            </div>
            <div className="contact-actions">
              <IconButton icon={MdOutlineMail} size="sm" label={`Email ${displayName(c)}`} onClick={() => composeTo(c)} />
              <IconButton icon={MdSearch} size="sm" label={`Find emails with ${displayName(c)}`} onClick={() => navigate({ view: 'search', query: c.email })} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
