import { type RefObject } from "react";
import { ACCOUNT, type Dialog, type View } from "../types";
import { Avatar, IconButton } from "./ui";
import {
  CalendarDays,
  CheckCheck,
  CircleHelp,
  Cloud,
  Grid2X2,
  Mail,
  Menu,
  Search,
  Settings2,
  SlidersHorizontal,
  StickyNote,
  UsersRound,
  X,
} from "lucide-react";

interface Props {
  query: string;
  setQuery: (query: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  setOpenId: (id: string | null) => void;
  sidebar: boolean;
  setSidebar: (value: boolean) => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  navigate: (view: View) => void;
  setDialog: (dialog: Dialog) => void;
  menu: string | null;
  changeMenu: (menu: string) => void;
  setMenu: (menu: string | null) => void;
  setPanel: (panel: string | null) => void;
  exportMailbox: () => void;
}

export default function Header({
  query,
  setQuery,
  searchRef,
  setOpenId,
  sidebar,
  setSidebar,
  collapsed,
  setCollapsed,
  navigate,
  setDialog,
  menu,
  changeMenu,
  setMenu,
  setPanel,
  exportMailbox,
}: Props) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <IconButton
          icon={Menu}
          label="Toggle navigation"
          className="menu-toggle"
          onClick={() => {
            if (window.innerWidth <= 850) setSidebar(!sidebar);
            else setCollapsed(!collapsed);
          }}
        />
        <a
          className="brand"
          href="#inbox"
          onClick={(e) => {
            e.preventDefault();
            navigate("inbox");
          }}
        >
          <span className="brand-mark">
            <Mail size={22} strokeWidth={1.65} />
          </span>
          <h1>GPT-6</h1>
        </a>
      </div>
      <form
        className={`global-search ${query ? "has-query" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          searchRef.current?.blur();
          setOpenId(null);
        }}
      >
        <Search size={19} />
        <input
          ref={searchRef}
          aria-label="Search mail"
          placeholder="Search your mail"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenId(null);
          }}
        />
        <kbd className="search-shortcut">/</kbd>
        {query && (
          <IconButton
            icon={X}
            label="Clear search"
            onClick={() => setQuery("")}
          />
        )}
        <IconButton
          icon={SlidersHorizontal}
          label="Advanced search"
          onClick={() => setDialog("search")}
        />
      </form>
      <div className="header-actions">
        <span className="header-date">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <IconButton
          icon={CircleHelp}
          label="Help and keyboard shortcuts"
          onClick={() => setDialog("help")}
        />
        <IconButton
          icon={Settings2}
          label="Settings"
          onClick={() => setDialog("settings")}
        />
        <div className="menu-anchor">
          <IconButton
            icon={Grid2X2}
            label="Workspace apps"
            onClick={() => changeMenu("apps")}
          />
          {menu === "apps" && (
            <div className="dropdown-menu apps-menu">
              <span className="menu-caption">YOUR WORKSPACE</span>
              {[
                { id: "calendar", icon: CalendarDays, name: "Calendar" },
                { id: "notes", icon: StickyNote, name: "Notes" },
                { id: "tasks", icon: CheckCheck, name: "Tasks" },
                { id: "contacts", icon: UsersRound, name: "Contacts" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPanel(item.id);
                    setMenu(null);
                  }}
                >
                  <item.icon size={18} />
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="menu-anchor">
          <button
            className="account-button"
            aria-label="Your account"
            onClick={() => changeMenu("account")}
          >
            <Avatar name={ACCOUNT.name} initials="AM" color="account-color" />
            <span className="account-online" />
          </button>
          {menu === "account" && (
            <div className="account-menu dropdown-menu">
              <Avatar
                name={ACCOUNT.name}
                initials="AM"
                color="account-color"
                large
              />
              <h3>Hey, Alex.</h3>
              <p>{ACCOUNT.email}</p>
              <span className="local-account-badge">
                <span />
                Your local workspace
              </span>
              <button
                onClick={() => {
                  setDialog("settings");
                  setMenu(null);
                }}
              >
                <Settings2 size={16} />
                Mailbox preferences
              </button>
              <button
                onClick={() => {
                  exportMailbox();
                  setMenu(null);
                }}
              >
                <Cloud size={16} />
                Export your mailbox
              </button>
              <small>A little space that’s entirely yours.</small>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
