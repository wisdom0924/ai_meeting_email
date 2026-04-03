import type { StoredContact, StoredGroup } from "@/types/email-recipients";

const STORAGE_KEY = "ai_meeting_email_recipients_v1";

export type RecipientStore = {
  contacts: StoredContact[];
  groups: StoredGroup[];
};

const empty: RecipientStore = { contacts: [], groups: [] };

export function loadRecipientStore(): RecipientStore {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return empty;
    const o = parsed as Record<string, unknown>;
    const contacts = Array.isArray(o.contacts) ? o.contacts : [];
    const groups = Array.isArray(o.groups) ? o.groups : [];
    return {
      contacts: contacts.filter(
        (c): c is StoredContact =>
          c != null &&
          typeof c === "object" &&
          typeof (c as StoredContact).id === "string" &&
          typeof (c as StoredContact).email === "string" &&
          typeof (c as StoredContact).label === "string"
      ),
      groups: groups.filter(
        (g): g is StoredGroup =>
          g != null &&
          typeof g === "object" &&
          typeof (g as StoredGroup).id === "string" &&
          typeof (g as StoredGroup).label === "string" &&
          Array.isArray((g as StoredGroup).members)
      ),
    };
  } catch {
    return empty;
  }
}

export function saveRecipientStore(data: RecipientStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}
