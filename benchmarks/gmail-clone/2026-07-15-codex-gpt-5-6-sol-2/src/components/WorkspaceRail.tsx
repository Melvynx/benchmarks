import {
  CalendarDays,
  CheckSquare2,
  Plus,
  StickyNote,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { Contact } from '../domain/mail';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';

export type WorkspaceTool = 'calendar' | 'notes' | 'tasks' | 'contacts';

interface WorkspaceRailProps {
  activeTool: WorkspaceTool | null;
  contacts: Contact[];
  onOpenTool: (tool: WorkspaceTool) => void;
  onClose: () => void;
  onComposeTo: (email: string) => void;
}

const TOOLS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare2 },
  { id: 'contacts', label: 'Contacts', icon: Users },
] as const;

const INITIAL_TASKS = [
  { id: 'task-1', label: 'Reply to Maya', isDone: false },
  { id: 'task-2', label: 'Review Q3 brief', isDone: true },
  { id: 'task-3', label: 'Send travel receipts', isDone: false },
];

export function WorkspaceRail({
  activeTool,
  contacts,
  onOpenTool,
  onClose,
  onComposeTo,
}: WorkspaceRailProps) {
  const [note, setNote] = useState('Follow up on the launch checklist after lunch.');
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const toggleTask = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, isDone: !task.isDone } : task,
      ),
    );
  };

  return (
    <>
      <aside className="workspace-rail" aria-label="Workspace tools">
        {TOOLS.map(({ id, label, icon: ToolIcon }) => (
          <IconButton
            key={id}
            label={label}
            className={activeTool === id ? `workspace-rail__${id} workspace-rail__active` : `workspace-rail__${id}`}
            aria-pressed={activeTool === id}
            onClick={() => onOpenTool(id)}
          >
            <ToolIcon aria-hidden="true" />
          </IconButton>
        ))}
        <span className="workspace-rail__divider" />
        <IconButton label="Add workspace tool" onClick={() => onOpenTool('tasks')}>
          <Plus aria-hidden="true" />
        </IconButton>
      </aside>

      {activeTool ? (
        <aside className="workspace-panel" aria-label={`${activeTool} panel`}>
          <header>
            <h2>{activeTool.charAt(0).toLocaleUpperCase() + activeTool.slice(1)}</h2>
            <IconButton label={`Close ${activeTool}`} onClick={onClose}>
              <X aria-hidden="true" />
            </IconButton>
          </header>

          {activeTool === 'calendar' ? (
            <div className="agenda">
              <div className="agenda__date">
                <span>WED</span>
                <strong>15</strong>
                <span>JUL</span>
              </div>
              <div className="agenda__items">
                <article>
                  <time>10:00</time>
                  <div><strong>Design review</strong><span>Product room</span></div>
                </article>
                <article>
                  <time>14:30</time>
                  <div><strong>Launch sync</strong><span>Video call</span></div>
                </article>
                <article>
                  <time>17:00</time>
                  <div><strong>Focus block</strong><span>Quiet time</span></div>
                </article>
              </div>
            </div>
          ) : null}

          {activeTool === 'notes' ? (
            <label className="notes-pad">
              <span>Quick note</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} />
              <small>Saved in this session</small>
            </label>
          ) : null}

          {activeTool === 'tasks' ? (
            <div className="task-list">
              <p>{tasks.filter((task) => !task.isDone).length} tasks remaining</p>
              {tasks.map((task) => (
                <label key={task.id} className={task.isDone ? 'task-item task-item--done' : 'task-item'}>
                  <input
                    type="checkbox"
                    checked={task.isDone}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span>{task.label}</span>
                </label>
              ))}
            </div>
          ) : null}

          {activeTool === 'contacts' ? (
            <div className="contact-list">
              {contacts.slice(0, 8).map((contact) => (
                <button type="button" key={contact.email} onClick={() => onComposeTo(contact.email)}>
                  <Avatar contact={contact} size="small" />
                  <span><strong>{contact.name}</strong><small>{contact.email}</small></span>
                </button>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
