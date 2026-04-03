/** 자주 쓰는 연락처 */
export type StoredContact = {
  id: string;
  email: string;
  label: string;
};

/** 자주 쓰는 그룹 */
export type StoredGroup = {
  id: string;
  label: string;
  members: { email: string; label: string }[];
};

/** 수신·참조 칸에 올라간 한 칩 */
export type ZoneSlot =
  | {
      slotId: string;
      kind: "contact";
      email: string;
      label: string;
    }
  | {
      slotId: string;
      kind: "group";
      groupId: string;
    };

export type DragPayload =
  | { source: "palette-contact"; contactId: string }
  | { source: "palette-group"; groupId: string }
  | { source: "suggestion"; email: string; label: string }
  | { source: "zone"; zone: "to" | "cc"; slotId: string };

export const DND_MIME = "application/x-ai-meeting-recipient";
