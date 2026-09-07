import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Bookmark,
  Users,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Clock,
} from 'lucide-react';
import { useMail } from '../context/MailContext';

export const RightSidebar: React.FC = () => {
  const { activeRightPanel, setActiveRightPanel } = useMail();

  // Local state for Keep notes and Tasks
  const [tasks, setTasks] = useState([
    { id: 't-1', text: 'Review Q3 strategy presentation deck', completed: false, due: 'Today' },
    { id: 't-2', text: 'Confirm offsite rental car pickup with Alex', completed: true, due: 'Yesterday' },
    { id: 't-3', text: 'Submit hotel expense receipt to Finance', completed: false, due: 'Tomorrow' },
    { id: 't-4', text: 'Reply to Emily regarding dinner reservation', completed: false, due: 'Friday' },
  ]);
  const [newTaskText, setNewTaskText] = useState('');

  const [notes, setNotes] = useState([
    { id: 'n-1', title: 'Lake Tahoe Offsite', content: 'Cabin address: 421 Pioneer Trail. Code for lockbox: 8492. Check-in after 3 PM.' },
    { id: 'n-2', title: 'Benchmark Ideas', content: 'Compare token consumption vs execution time across flash-high and reasoning models.' },
  ]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const togglePanel = (panel: 'calendar' | 'keep' | 'tasks' | 'contacts') => {
    setActiveRightPanel(activeRightPanel === panel ? null : panel);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([
      {
        id: `t-${Date.now()}`,
        text: newTaskText.trim(),
        completed: false,
        due: 'Today',
      },
      ...tasks,
    ]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;
    setNotes([
      {
        id: `n-${Date.now()}`,
        title: newNoteTitle.trim() || 'Untitled',
        content: newNoteContent.trim(),
      },
      ...notes,
    ]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex h-full shrink-0 z-20">
      {/* Expanded Sliding Panel */}
      {activeRightPanel && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] flex flex-col h-full shadow-lg animate-in slide-in-from-right duration-200 text-sm">
          {/* Header */}
          <div className="h-12 px-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 font-medium text-gray-800 dark:text-gray-100">
            <span className="capitalize">{activeRightPanel}</span>
            <button
              onClick={() => setActiveRightPanel(null)}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
              title="Close panel"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. CALENDAR PANEL */}
            {activeRightPanel === 'calendar' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-xs">
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    Thursday, Sep 3, 2026
                  </div>
                  <div className="text-blue-700 dark:text-blue-300 mt-0.5">3 events scheduled today</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50 flex gap-3">
                    <div className="w-1 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        Daily Engineering Standup
                      </div>
                      <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        09:30 AM – 10:00 AM
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50 flex gap-3">
                    <div className="w-1 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        Design Sync: Mailbox V2
                      </div>
                      <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        01:30 PM – 02:15 PM
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50 flex gap-3">
                    <div className="w-1 rounded-full bg-purple-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        Lake Tahoe Offsite Prep
                      </div>
                      <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        04:00 PM – 05:00 PM
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TASKS PANEL */}
            {activeRightPanel === 'tasks' && (
              <div className="space-y-3">
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a task..."
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                    title="Add task"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-start justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                    >
                      <label className="flex items-start gap-2 cursor-pointer flex-1">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 ${
                            task.completed
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-400 dark:border-gray-600'
                          }`}
                        >
                          {task.completed && <Check className="w-3 h-3" />}
                        </button>
                        <div>
                          <div
                            className={`text-gray-800 dark:text-gray-200 ${
                              task.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
                            }`}
                          >
                            {task.text}
                          </div>
                          <span className="text-[10px] text-gray-400">{task.due}</span>
                        </div>
                      </label>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. KEEP NOTES PANEL */}
            {activeRightPanel === 'keep' && (
              <div className="space-y-3">
                {isAddingNote ? (
                  <form onSubmit={handleAddNote} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2 text-xs">
                    <input
                      type="text"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full font-bold bg-transparent focus:outline-none"
                    />
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Take a note..."
                      rows={3}
                      className="w-full bg-transparent resize-none focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(false)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium"
                      >
                        Done
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="w-full py-2 px-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-500 hover:border-gray-400 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Take a note...
                  </button>
                )}

                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="group p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/60 bg-yellow-50/50 dark:bg-yellow-950/20 text-xs relative"
                    >
                      <div className="font-bold text-gray-800 dark:text-gray-200 mb-1">
                        {note.title}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {note.content}
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CONTACTS PANEL */}
            {activeRightPanel === 'contacts' && (
              <div className="space-y-2 text-xs">
                <div className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold mb-2">
                  Frequent Collaborators
                </div>
                {[
                  { name: 'Sarah Lin', email: 'sarah.lin@techcorp.io', role: 'Product Lead' },
                  { name: 'Alex Chen', email: 'alex.chen@techcorp.io', role: 'Senior Architect' },
                  { name: 'Maya Patel', email: 'maya.patel@designstudio.co', role: 'Staff Designer' },
                  { name: 'Emily Zhao', email: 'emily.zhao@gmail.com', role: 'Friend' },
                  { name: 'David Miller', email: 'david.miller@clientcorp.com', role: 'Client' },
                ].map((c) => (
                  <div
                    key={c.email}
                    className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {c.name}
                      </div>
                      <div className="text-gray-400 truncate text-[11px]">{c.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thin Icon Rail */}
      <div className="w-14 border-l border-gray-200/80 dark:border-gray-800 bg-[#f6f8fc] dark:bg-[#1f1f1f] flex flex-col items-center py-3 gap-3 select-none">
        <button
          onClick={() => togglePanel('calendar')}
          className={`p-2.5 rounded-full transition-colors ${
            activeRightPanel === 'calendar'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800'
          }`}
          title="Google Calendar"
        >
          <Calendar className="w-5 h-5 text-blue-500" />
        </button>

        <button
          onClick={() => togglePanel('keep')}
          className={`p-2.5 rounded-full transition-colors ${
            activeRightPanel === 'keep'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800'
          }`}
          title="Google Keep"
        >
          <Bookmark className="w-5 h-5 text-amber-500" />
        </button>

        <button
          onClick={() => togglePanel('tasks')}
          className={`p-2.5 rounded-full transition-colors ${
            activeRightPanel === 'tasks'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800'
          }`}
          title="Google Tasks"
        >
          <CheckSquare className="w-5 h-5 text-blue-600" />
        </button>

        <button
          onClick={() => togglePanel('contacts')}
          className={`p-2.5 rounded-full transition-colors ${
            activeRightPanel === 'contacts'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800'
          }`}
          title="Contacts"
        >
          <Users className="w-5 h-5 text-indigo-500" />
        </button>
      </div>
    </div>
  );
};
