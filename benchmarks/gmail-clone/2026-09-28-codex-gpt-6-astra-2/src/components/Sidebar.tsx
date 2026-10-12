import {
  type LucideIcon,
  Inbox,
  Star,
  Clock3,
  Send,
  FilePenLine,
  Trash2,
  ChevronDown,
  Cloud,
  Mail,
  Pencil,
  Plus,
} from "lucide-react";
import { ACCOUNT, type Dialog, type Mailbox, type View } from "../types";
import { Avatar, IconButton } from "./ui";
const navItems: { id: View; name: string; icon: LucideIcon }[] = [
  { id: "inbox", name: "Inbox", icon: Inbox },
  { id: "starred", name: "Starred", icon: Star },
  { id: "snoozed", name: "Snoozed", icon: Clock3 },
  { id: "sent", name: "Sent", icon: Send },
  { id: "drafts", name: "Drafts", icon: FilePenLine },
  { id: "trash", name: "Trash", icon: Trash2 },
];

interface Props {
  sidebar: boolean;
  newCompose: () => void;
  view: View;
  query: string;
  navigate: (view: View) => void;
  navCount: (view: View) => number;
  moreFolders: boolean;
  setMoreFolders: (value: boolean) => void;
  mailbox: Mailbox;
  setDialog: (dialog: Dialog) => void;
}

export default function Sidebar({
  sidebar,
  newCompose,
  view,
  query,
  navigate,
  navCount,
  moreFolders,
  setMoreFolders,
  mailbox,
  setDialog,
}: Props) {
  return (
    <aside className={`sidebar ${sidebar ? "mobile-open" : ""}`}>
      <button className="compose-button" onClick={() => newCompose()}>
        <Pencil size={19} strokeWidth={1.7} />
        <span>Compose</span>
        <kbd>C</kbd>
      </button>
      <nav className="mail-navigation" aria-label="Mailboxes">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id && !query ? "active" : ""}`}
            title={item.name}
            onClick={() => navigate(item.id)}
          >
            <item.icon size={18} strokeWidth={1.65} />
            <span>{item.name}</span>
            {navCount(item.id) > 0 && (
              <span className="nav-count">{navCount(item.id)}</span>
            )}
          </button>
        ))}
        <button
          className="nav-item more-folders"
          title="More folders"
          onClick={() => setMoreFolders(!moreFolders)}
        >
          <ChevronDown size={17} className={moreFolders ? "rotate" : ""} />
          <span>{moreFolders ? "Less" : "More"}</span>
        </button>
        {moreFolders && (
          <button
            className={`nav-item ${view === "all" ? "active" : ""}`}
            title="All mail"
            onClick={() => navigate("all")}
          >
            <Mail size={18} />
            <span>All mail</span>
          </button>
        )}
      </nav>
      <div className="sidebar-labels">
        <div className="sidebar-section-title">
          <span>Labels</span>
          <IconButton
            icon={Plus}
            label="Create label"
            onClick={() => setDialog("create-label")}
          />
        </div>
        {mailbox.labels.map((label) => (
          <button
            key={label.id}
            title={label.name}
            className={`nav-item label-nav ${view === `label:${label.id}` ? "active" : ""}`}
            onClick={() => navigate(`label:${label.id}`)}
          >
            <span className="label-dot" style={{ background: label.color }} />
            <span>{label.name}</span>
            {mailbox.threads.filter(
              (t) =>
                t.labels.includes(label.id) && t.unread && t.folder !== "trash",
            ).length > 0 && (
              <span
                className="label-unread-dot"
                style={{ background: label.color }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="storage-card">
          <div>
            <Cloud size={16} />
            <span>Your space, in sync</span>
            <span className="status-dot" />
          </div>
          <div className="storage-track">
            <span
              style={{
                width: `${Math.max(1, Math.min(100, (JSON.stringify(mailbox).length * 2 / (5 * 1024 * 1024)) * 100))}%`,
              }}
            />
          </div>
          <p>
            {Math.max(
              0.1,
              (JSON.stringify(mailbox).length * 2) / 1024 / 1024,
            ).toFixed(1)}{" "}
            MB of 5 MB used<span>Saved locally</span>
          </p>
        </div>
        <button
          className="sidebar-profile"
          onClick={() => setDialog("settings")}
        >
          <Avatar name={ACCOUNT.name} initials="AM" color="account-color" />
          <span>
            <b>Alex Morgan</b>
            <small>Personal workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
    </aside>
  );
}
