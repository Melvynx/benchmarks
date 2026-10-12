import { ME_EMAIL, mePerson } from "../identity";
import type { MailData, Message } from "../types";
import { applySignature, deliver, LOCATIONS, restoredLabels, unique } from "./mail";

export type MailAction =
  | { type: "star"; threadIds: string[] }
  | { type: "important"; threadIds: string[] }
  | { type: "mark-read"; threadIds: string[]; read: boolean }
  | { type: "archive"; threadIds: string[] }
  | { type: "trash"; threadIds: string[] }
  | { type: "spam"; threadIds: string[] }
  | { type: "to-inbox"; threadIds: string[] }
  | { type: "delete-forever"; threadIds: string[] }
  | { type: "empty-trash" }
  | { type: "snooze"; threadIds: string[]; until: number }
  | { type: "label"; threadIds: string[]; labelId: string; on: boolean }
  | { type: "create-label"; name: string; color: string }
  | { type: "rename-label"; id: string; name: string }
  | { type: "delete-label"; id: string }
  | { type: "upsert"; message: Message }
  | { type: "patch"; id: string; patch: Partial<Message>; touch?: boolean }
  | { type: "discard"; id: string }
  | { type: "send"; id: string; sendAt?: number | null }
  | { type: "tick" }
  | { type: "settings"; patch: Partial<MailData["settings"]> }
  | { type: "remember-search"; query: string }
  | { type: "sign-in" }
  | { type: "sign-out" }
  | { type: "reset" };

function mapThreads(messages: Message[], threadIds: string[], fn: (message: Message) => Message): Message[] {
  const ids = new Set(threadIds);
  return messages.map((message) => (ids.has(message.threadId) ? fn(message) : message));
}

export function reduceMail(data: MailData, action: MailAction, now = Date.now()): MailData {
  switch (action.type) {
    case "star": {
      const ids = new Set(action.threadIds);
      const related = data.messages.filter((message) => ids.has(message.threadId));
      const value = !related.every((message) => message.starred);
      return { ...data, messages: mapThreads(data.messages, action.threadIds, (message) => ({ ...message, starred: value })) };
    }
    case "important": {
      const ids = new Set(action.threadIds);
      const related = data.messages.filter((message) => ids.has(message.threadId));
      const value = !related.every((message) => message.important);
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => ({ ...message, important: value })),
      };
    }
    case "mark-read":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => ({ ...message, read: action.read })),
      };
    case "archive":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) =>
          message.labels.includes("inbox") ? { ...message, labels: message.labels.filter((label) => label !== "inbox") } : message,
        ),
      };
    case "trash":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => ({
          ...message,
          snoozedUntil: null,
          sendAt: null,
          labels: unique([...message.labels.filter((label) => !LOCATIONS.has(label)), "trash"]),
        })),
      };
    case "spam":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => ({
          ...message,
          snoozedUntil: null,
          sendAt: null,
          labels: unique([...message.labels.filter((label) => !LOCATIONS.has(label)), "spam"]),
        })),
      };
    case "to-inbox":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => {
          if (message.labels.includes("draft") || message.labels.includes("scheduled")) return message;
          if (message.labels.includes("trash") || message.labels.includes("spam")) {
            return { ...message, snoozedUntil: null, labels: restoredLabels(message, ME_EMAIL) };
          }
          return {
            ...message,
            snoozedUntil: null,
            labels: unique([...message.labels.filter((label) => label !== "snoozed"), "inbox"]),
          };
        }),
      };
    case "delete-forever": {
      const ids = new Set(action.threadIds);
      return { ...data, messages: data.messages.filter((message) => !ids.has(message.threadId)) };
    }
    case "empty-trash":
      return { ...data, messages: data.messages.filter((message) => !message.labels.includes("trash")) };
    case "snooze":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => {
          if (!message.labels.includes("inbox") && !message.labels.includes("snoozed")) return message;
          return {
            ...message,
            snoozedUntil: action.until,
            labels: unique([...message.labels.filter((label) => label !== "inbox" && label !== "snoozed"), "snoozed"]),
          };
        }),
      };
    case "label":
      return {
        ...data,
        messages: mapThreads(data.messages, action.threadIds, (message) => {
          const has = message.labels.includes(action.labelId);
          if (action.on && !has) return { ...message, labels: [...message.labels, action.labelId] };
          if (!action.on && has) return { ...message, labels: message.labels.filter((label) => label !== action.labelId) };
          return message;
        }),
      };
    case "create-label": {
      const name = action.name.trim();
      if (!name) return data;
      if (data.labels.some((label) => label.name.toLowerCase() === name.toLowerCase())) return data;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "label";
      let id = slug;
      if (data.labels.some((label) => label.id === id)) id = `${slug}-${now.toString(36).slice(-4)}`;
      return { ...data, labels: [...data.labels, { id, name, color: action.color }] };
    }
    case "rename-label":
      return {
        ...data,
        labels: data.labels.map((label) => (label.id === action.id ? { ...label, name: action.name.trim() || label.name } : label)),
      };
    case "delete-label":
      return {
        ...data,
        labels: data.labels.filter((label) => label.id !== action.id),
        messages: data.messages.map((message) => ({
          ...message,
          labels: message.labels.filter((label) => label !== action.id),
        })),
      };
    case "upsert": {
      const index = data.messages.findIndex((message) => message.id === action.message.id);
      if (index === -1) return { ...data, messages: [...data.messages, action.message] };
      const messages = data.messages.slice();
      messages[index] = action.message;
      return { ...data, messages };
    }
    case "patch":
      return {
        ...data,
        messages: data.messages.map((message) =>
          message.id === action.id ? { ...message, ...action.patch, date: action.touch ? now : message.date } : message,
        ),
      };
    case "discard":
      return { ...data, messages: data.messages.filter((message) => message.id !== action.id) };
    case "send": {
      return {
        ...data,
        messages: data.messages.map((message) => {
          if (message.id !== action.id) return message;
          if (message.to.length === 0) return message;
          const next: Message = {
            ...message,
            body: applySignature(message.body, data.settings),
            from: mePerson(data.settings.displayName),
            date: now,
          };
          if (action.sendAt && action.sendAt > now) {
            return {
              ...next,
              sendAt: action.sendAt,
              read: true,
              labels: unique([...next.labels.filter((label) => !LOCATIONS.has(label)), "scheduled"]),
            };
          }
          return deliver({ ...next, sendAt: null }, ME_EMAIL);
        }),
      };
    }
    case "tick": {
      let changed = false;
      const messages = data.messages.map((message) => {
        if (message.labels.includes("snoozed") && message.snoozedUntil && message.snoozedUntil <= now) {
          changed = true;
          return {
            ...message,
            snoozedUntil: null,
            read: false,
            labels: unique([...message.labels.filter((label) => label !== "snoozed"), "inbox"]),
          };
        }
        if (message.labels.includes("scheduled") && message.sendAt && message.sendAt <= now) {
          changed = true;
          return deliver({ ...message, date: message.sendAt }, ME_EMAIL);
        }
        return message;
      });
      return changed ? { ...data, messages } : data;
    }
    case "settings":
      return { ...data, settings: { ...data.settings, ...action.patch } };
    case "remember-search": {
      const query = action.query.trim();
      if (!query) return data;
      return { ...data, recentSearches: [query, ...data.recentSearches.filter((item) => item !== query)].slice(0, 8) };
    }
    case "sign-in":
      return { ...data, signedIn: true };
    case "sign-out":
      return { ...data, signedIn: false };
    case "reset":
      return data;
    default:
      return data;
  }
}
