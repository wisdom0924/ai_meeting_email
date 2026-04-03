"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { TranscriptBlock } from "@/types";
import type {
  DragPayload,
  StoredContact,
  StoredGroup,
  ZoneSlot,
} from "@/types/email-recipients";
import { DND_MIME } from "@/types/email-recipients";
import { buildSuggestedRecipients } from "@/lib/build-email-suggestions";
import { loadRecipientStore, saveRecipientStore } from "@/lib/email-recipient-storage";

export type EmailRecipientPanelHandle = {
  /** 웹훅 등에 넣을 실제 주소 목록 (그룹은 구성원으로 펼침) */
  getResolvedEmails: () => { to: string[]; cc: string[] };
};

type TabId = "suggested" | "favorites";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 그룹 폼에서 한 명씩 입력하는 줄 */
type GroupMemberDraft = { id: string; label: string; email: string };

function emptyMemberRow(): GroupMemberDraft {
  return { id: newId(), label: "", email: "" };
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function uniqLower(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const t = e.trim();
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function slotEmails(
  slot: ZoneSlot,
  groups: StoredGroup[],
  contacts: StoredContact[]
): string[] {
  if (slot.kind === "contact") return [slot.email];
  const g = groups.find((x) => x.id === slot.groupId);
  if (!g) return [];
  return g.members.map((m) => m.email).filter(Boolean);
}

function parseDrag(raw: string | undefined): DragPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

type EmailRecipientPanelProps = {
  summary: string;
  details: unknown;
  fullTranscript: TranscriptBlock[];
  transcript: string;
};

const EmailRecipientPanel = forwardRef<
  EmailRecipientPanelHandle,
  EmailRecipientPanelProps
>(function EmailRecipientPanel(
  { summary, details, fullTranscript, transcript },
  ref
) {
  const [tab, setTab] = useState<TabId>("suggested");
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [groups, setGroups] = useState<StoredGroup[]>([]);
  const [toSlots, setToSlots] = useState<ZoneSlot[]>([]);
  const [ccSlots, setCcSlots] = useState<ZoneSlot[]>([]);
  const [highlight, setHighlight] = useState<"to" | "cc" | "bank" | null>(
    null
  );
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMemberDrafts, setGroupMemberDrafts] = useState<GroupMemberDraft[]>(
    () => [emptyMemberRow()]
  );
  const [groupPasteOpen, setGroupPasteOpen] = useState(false);
  const [groupPasteText, setGroupPasteText] = useState("");
  /** null이면 새 그룹 추가, 값이 있으면 해당 id 그룹 수정 중 */
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  useEffect(() => {
    const s = loadRecipientStore();
    setContacts(s.contacts);
    setGroups(s.groups);
  }, []);

  useEffect(() => {
    saveRecipientStore({ contacts, groups });
  }, [contacts, groups]);

  const suggestions = useMemo(
    () =>
      buildSuggestedRecipients(summary, details, fullTranscript, transcript),
    [summary, details, fullTranscript, transcript]
  );

  const suggestionFiltered = useMemo(() => {
    const inTo = new Set(
      toSlots.flatMap((s) => slotEmails(s, groups, contacts).map((e) => e.toLowerCase()))
    );
    const inCc = new Set(
      ccSlots.flatMap((s) => slotEmails(s, groups, contacts).map((e) => e.toLowerCase()))
    );
    return suggestions.filter(
      (s) => !inTo.has(s.email.toLowerCase()) && !inCc.has(s.email.toLowerCase())
    );
  }, [suggestions, toSlots, ccSlots, groups, contacts]);

  const getResolvedEmails = useCallback(() => {
    const to = uniqLower(
      toSlots.flatMap((s) => slotEmails(s, groups, contacts))
    );
    const cc = uniqLower(
      ccSlots.flatMap((s) => slotEmails(s, groups, contacts))
    );
    return { to, cc };
  }, [toSlots, ccSlots, groups, contacts]);

  useImperativeHandle(ref, () => ({ getResolvedEmails }), [getResolvedEmails]);

  const addContact = useCallback(() => {
    const email = newEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const label = newLabel.trim() || email;
    setContacts((prev) => {
      if (prev.some((c) => c.email.toLowerCase() === email.toLowerCase()))
        return prev;
      return [...prev, { id: newId(), email, label }];
    });
    setNewEmail("");
    setNewLabel("");
  }, [newEmail, newLabel]);

  const parseGroupLines = useCallback((raw: string) => {
    const lines = raw
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const members = lines.map((line) => {
      const emailMatch = line.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
      const email = emailMatch ? emailMatch[1] : line;
      const rest = line.replace(emailMatch?.[1] ?? "", "").trim();
      const lbl = rest.replace(/^[,，]+/, "").trim() || email;
      return { email, label: lbl };
    });
    return members;
  }, []);

  const membersFromDrafts = useCallback((drafts: GroupMemberDraft[]) => {
    const seen = new Set<string>();
    const out: { email: string; label: string }[] = [];
    for (const d of drafts) {
      const email = d.email.trim();
      if (!email || !isValidEmail(email)) continue;
      const k = email.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const label = d.label.trim() || email;
      out.push({ email, label });
    }
    return out;
  }, []);

  const saveGroup = useCallback(() => {
    const label = groupName.trim();
    const members = membersFromDrafts(groupMemberDrafts);
    if (!label || members.length === 0) return;
    if (editingGroupId) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroupId ? { ...g, label, members } : g
        )
      );
    } else {
      setGroups((prev) => [...prev, { id: newId(), label, members }]);
    }
    setGroupName("");
    setGroupMemberDrafts([emptyMemberRow()]);
    setGroupPasteText("");
    setGroupPasteOpen(false);
    setEditingGroupId(null);
  }, [groupName, groupMemberDrafts, editingGroupId, membersFromDrafts]);

  const startEditGroup = (g: StoredGroup) => {
    setTab("favorites");
    setEditingGroupId(g.id);
    setGroupName(g.label);
    setGroupPasteText("");
    setGroupPasteOpen(false);
    setGroupMemberDrafts(
      g.members.length > 0
        ? g.members.map((m) => ({
            id: newId(),
            label: m.label === m.email ? "" : m.label,
            email: m.email,
          }))
        : [emptyMemberRow()]
    );
  };

  const cancelEditGroup = () => {
    setEditingGroupId(null);
    setGroupName("");
    setGroupMemberDrafts([emptyMemberRow()]);
    setGroupPasteText("");
    setGroupPasteOpen(false);
  };

  const updateMemberDraft = (
    id: string,
    patch: Partial<Pick<GroupMemberDraft, "label" | "email">>
  ) => {
    setGroupMemberDrafts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const addMemberRow = () => {
    setGroupMemberDrafts((prev) => [...prev, emptyMemberRow()]);
  };

  const removeMemberRow = (id: string) => {
    setGroupMemberDrafts((prev) => {
      if (prev.length <= 1) {
        return [emptyMemberRow()];
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const appendContactToGroupDrafts = (c: StoredContact) => {
    setGroupMemberDrafts((prev) => {
      if (prev.some((r) => r.email.trim().toLowerCase() === c.email.toLowerCase())) {
        return prev;
      }
      const last = prev[prev.length - 1];
      const lastEmpty =
        last &&
        !last.email.trim() &&
        !last.label.trim() &&
        prev.length === 1;
      if (lastEmpty) {
        return prev.map((r) =>
          r.id === last.id
            ? { ...r, label: c.label, email: c.email }
            : r
        );
      }
      return [...prev, { id: newId(), label: c.label, email: c.email }];
    });
  };

  const applyGroupPaste = () => {
    const parsed = parseGroupLines(groupPasteText);
    if (parsed.length === 0) return;
    setGroupMemberDrafts((prev) => {
      const seen = new Set(
        prev
          .map((r) => r.email.trim().toLowerCase())
          .filter(Boolean)
      );
      const toAdd: GroupMemberDraft[] = [];
      for (const m of parsed) {
        if (!isValidEmail(m.email)) continue;
        const k = m.email.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        toAdd.push({
          id: newId(),
          label: m.label === m.email ? "" : m.label,
          email: m.email,
        });
      }
      if (toAdd.length === 0) return prev;
      const last = prev[prev.length - 1];
      const onlyOneEmpty =
        prev.length === 1 && !last.email.trim() && !last.label.trim();
      if (onlyOneEmpty) {
        const [first, ...rest] = toAdd;
        return [
          { ...last, label: first.label || first.email, email: first.email },
          ...rest,
        ];
      }
      return [...prev, ...toAdd];
    });
    setGroupPasteText("");
  };

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setToSlots((prev) => prev.filter((s) => !(s.kind === "group" && s.groupId === id)));
    setCcSlots((prev) => prev.filter((s) => !(s.kind === "group" && s.groupId === id)));
  };

  const pushSlot = (zone: "to" | "cc", payload: DragPayload | null) => {
    if (!payload) return;

    if (payload.source === "zone") {
      if (payload.zone === zone) return;
      const slotId = payload.slotId;
      if (payload.zone === "to" && zone === "cc") {
        setToSlots((prev) => {
          const moved = prev.find((s) => s.slotId === slotId);
          if (moved) setCcSlots((cc) => [...cc, moved]);
          return prev.filter((s) => s.slotId !== slotId);
        });
        return;
      }
      if (payload.zone === "cc" && zone === "to") {
        setCcSlots((prev) => {
          const moved = prev.find((s) => s.slotId === slotId);
          if (moved) setToSlots((to) => [...to, moved]);
          return prev.filter((s) => s.slotId !== slotId);
        });
        return;
      }
      return;
    }

    if (payload.source === "palette-contact") {
      const c = contacts.find((x) => x.id === payload.contactId);
      if (!c) return;
      const slot: ZoneSlot = {
        slotId: newId(),
        kind: "contact",
        email: c.email,
        label: c.label,
      };
      if (zone === "to") setToSlots((p) => [...p, slot]);
      else setCcSlots((p) => [...p, slot]);
      return;
    }

    if (payload.source === "palette-group") {
      const g = groups.find((x) => x.id === payload.groupId);
      if (!g) return;
      const slot: ZoneSlot = {
        slotId: newId(),
        kind: "group",
        groupId: g.id,
      };
      if (zone === "to") setToSlots((p) => [...p, slot]);
      else setCcSlots((p) => [...p, slot]);
      return;
    }

    if (payload.source === "suggestion") {
      const slot: ZoneSlot = {
        slotId: newId(),
        kind: "contact",
        email: payload.email,
        label: payload.label,
      };
      if (zone === "to") setToSlots((p) => [...p, slot]);
      else setCcSlots((p) => [...p, slot]);
    }
  };

  const removeFromZone = (zone: "to" | "cc", slotId: string) => {
    if (zone === "to")
      setToSlots((prev) => prev.filter((s) => s.slotId !== slotId));
    else setCcSlots((prev) => prev.filter((s) => s.slotId !== slotId));
  };

  const explodeGroup = (zone: "to" | "cc", slot: ZoneSlot) => {
    if (slot.kind !== "group") return;
    const g = groups.find((x) => x.id === slot.groupId);
    if (!g) return;
    const newSlots: ZoneSlot[] = g.members.map((m) => ({
      slotId: newId(),
      kind: "contact" as const,
      email: m.email,
      label: m.label,
    }));
    if (zone === "to") {
      setToSlots((prev) => {
        const i = prev.findIndex((s) => s.slotId === slot.slotId);
        if (i < 0) return prev;
        const next = [...prev];
        next.splice(i, 1, ...newSlots);
        return next;
      });
    } else {
      setCcSlots((prev) => {
        const i = prev.findIndex((s) => s.slotId === slot.slotId);
        if (i < 0) return prev;
        const next = [...prev];
        next.splice(i, 1, ...newSlots);
        return next;
      });
    }
  };

  const onDragStart = (e: React.DragEvent, payload: DragPayload) => {
    const raw = JSON.stringify(payload);
    e.dataTransfer.setData(DND_MIME, raw);
    e.dataTransfer.setData("text/plain", raw);
    e.dataTransfer.effectAllowed = "move";
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const dropOnZone = (zone: "to" | "cc", e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHighlight(null);
    const payload = parseDrag(
      e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain")
    );
    if (!payload) return;
    if (payload.source === "zone" && payload.zone === zone) return;
    pushSlot(zone, payload);
  };

  const dropOnBank = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHighlight(null);
    const payload = parseDrag(
      e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain")
    );
    if (payload?.source !== "zone") return;
    removeFromZone(payload.zone, payload.slotId);
  };

  const hasDndType = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes(DND_MIME);

  const addSuggestionToZone = (
    zone: "to" | "cc",
    email: string,
    label: string
  ) => {
    const slot: ZoneSlot = {
      slotId: newId(),
      kind: "contact",
      email,
      label,
    };
    if (zone === "to") setToSlots((prev) => [...prev, slot]);
    else setCcSlots((prev) => [...prev, slot]);
  };

  const bankClass =
    highlight === "bank"
      ? "ring-2 ring-amber-300 border-amber-300 bg-amber-50/70"
      : "border-dashed border-amber-200/80 bg-amber-50/20";

  const renderZoneChip = (zone: "to" | "cc", slot: ZoneSlot) => {
    if (slot.kind === "contact") {
      return (
        <div
          key={slot.slotId}
          draggable
          onDragStart={(e) =>
            onDragStart(e, {
              source: "zone",
              zone,
              slotId: slot.slotId,
            })
          }
          className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-blue-100 text-blue-900 text-sm border border-blue-200 cursor-grab active:cursor-grabbing max-w-[240px]"
        >
          <span className="truncate" title={`${slot.label} <${slot.email}>`}>
            {slot.label}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-full p-0.5 text-blue-700 hover:bg-blue-200/80"
            aria-label="수신 목록에서 제거"
            onClick={() => removeFromZone(zone, slot.slotId)}
          >
            ×
          </button>
        </div>
      );
    }

    const g = groups.find((x) => x.id === slot.groupId);
    const memberLines = g?.members.length
      ? g.members.map((m) => `${m.label} <${m.email}>`).join("\n")
      : "구성원 정보 없음";

    return (
      <div
        key={slot.slotId}
        draggable
        onDragStart={(e) =>
          onDragStart(e, { source: "zone", zone, slotId: slot.slotId })
        }
        className="group/chip relative inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-violet-100 text-violet-900 text-sm border border-violet-200 cursor-grab active:cursor-grabbing max-w-[260px]"
      >
        <span className="truncate font-medium" title={memberLines}>
          {g?.label ?? "그룹"}
        </span>
        <span
          className="pointer-events-none absolute left-0 bottom-[calc(100%+6px)] z-20 hidden min-w-[200px] max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg group-hover/chip:block whitespace-pre-wrap"
          role="tooltip"
        >
          {memberLines}
        </span>
        <button
          type="button"
          className="shrink-0 rounded text-[10px] px-1.5 py-0.5 font-medium text-violet-800 bg-violet-200/60 hover:bg-violet-200"
          title="개별 주소 칩으로 나누기"
          onClick={(ev) => {
            ev.stopPropagation();
            explodeGroup(zone, slot);
          }}
        >
          펼침
        </button>
        <button
          type="button"
          className="shrink-0 rounded-full p-0.5 text-violet-800 hover:bg-violet-200/80"
          aria-label="목록에서 제거"
          onClick={() => removeFromZone(zone, slot.slotId)}
        >
          ×
        </button>
      </div>
    );
  };

  const inputBase =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col"
      onDragEnd={() => setHighlight(null)}
    >
      <header className="px-4 py-3.5 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">
          이메일 받는 사람
        </h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          위에서 주소를 고르거나 등록하고, 아래{" "}
          <strong className="text-gray-700">이번에 보낼 주소</strong> 칸으로
          끌어다 놓으면 됩니다. 추천은 회의록·전사·참석자에서 메일을 찾아요.
        </p>
      </header>

      {/* 상단: 탭 + 내용 */}
      <div className="bg-slate-50/80 border-b border-gray-200 px-4 py-4">
        <div
          className="inline-flex rounded-xl bg-gray-200/70 p-1 gap-0.5 shadow-inner"
          role="tablist"
          aria-label="주소 선택 방식"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "suggested"}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
              tab === "suggested"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setTab("suggested")}
          >
            추천 수신자
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "favorites"}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
              tab === "favorites"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setTab("favorites")}
          >
            자주 쓰는 주소
          </button>
        </div>

        <div
          className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          role="tabpanel"
        >
          {tab === "suggested" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    회의록에서 찾은 메일
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    클릭으로 넣거나, 칩을 끌어서 아래 수신·참조로 옮기세요.
                  </p>
                </div>
              </div>
              {suggestionFiltered.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  아직 추천할 메일이 없거나, 모두 수신·참조에 넣었어요.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 sm:gap-1.5">
                  {suggestionFiltered.map((s) => (
                    <li
                      key={s.email}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2"
                    >
                      <span
                        draggable
                        onDragStart={(e) =>
                          onDragStart(e, {
                            source: "suggestion",
                            email: s.email,
                            label: s.label,
                          })
                        }
                        className="inline-flex items-center max-w-[min(100%,280px)] truncate px-2.5 py-1 rounded-md bg-white text-gray-800 text-xs font-mono border border-gray-200 cursor-grab active:cursor-grabbing shadow-sm"
                        title="드래그해서 수신·참조 칸에 놓기"
                      >
                        {s.email}
                      </span>
                      <span className="flex flex-wrap gap-1.5 sm:ml-auto">
                        <button
                          type="button"
                          className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-md"
                          onClick={() =>
                            addSuggestionToZone("to", s.email, s.label)
                          }
                        >
                          수신에 넣기
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-md"
                          onClick={() =>
                            addSuggestionToZone("cc", s.email, s.label)
                          }
                        >
                          참조에 넣기
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "favorites" && (
            <div className="space-y-6">
              {/* ① 등록: 좌우 절반 */}
              <div>
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-800 text-xs font-bold">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      주소 등록하기
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      왼쪽은 개인 연락처, 오른쪽은 그룹을 만듭니다. 저장 후 아래
                      「끌어다 쓸 칩」에 나타나요.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* 연락처 추가 */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 h-full flex flex-col">
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                      개별 연락처
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 mb-3">
                      이메일과 표시 이름을 적고 저장하세요.
                    </p>
                    <div className="space-y-2 flex-1">
                      <input
                        className={inputBase}
                        placeholder="이메일"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                      <input
                        className={inputBase}
                        placeholder="표시 이름 (비우면 메일 주소)"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full text-sm font-medium bg-slate-800 text-white px-3 py-2.5 rounded-lg hover:bg-slate-900"
                      onClick={addContact}
                    >
                      연락처 저장
                    </button>
                  </div>

                  {/* 그룹 만들기 */}
                  <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 h-full flex flex-col max-h-[min(520px,65vh)] lg:max-h-none">
                    <h4 className="text-xs font-semibold text-violet-900 uppercase tracking-wide">
                      그룹 만들기
                    </h4>
                    <p className="text-[11px] text-violet-800/80 mt-1 mb-3">
                      {editingGroupId
                        ? "수정 중이에요. 반영 또는 취소를 눌러 주세요."
                        : "그룹 이름 → 멤버를 채운 뒤 그룹 저장."}
                    </p>
                    {editingGroupId && (
                      <p className="text-[11px] text-violet-800 bg-violet-100/80 border border-violet-200 rounded-lg px-2.5 py-1.5 mb-2">
                        「수정 반영」으로 저장, 「취소」로 그만두기.
                      </p>
                    )}
                    <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
                      <input
                        className={inputBase}
                        placeholder="그룹 이름 (예: 기획팀)"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />

                      {contacts.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-violet-900/80">
                            저장된 연락처에서 멤버로 넣기
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {contacts
                              .filter(
                                (c) =>
                                  !groupMemberDrafts.some(
                                    (d) =>
                                      d.email.trim().toLowerCase() ===
                                      c.email.toLowerCase()
                                  )
                              )
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="text-xs px-2 py-1 rounded-md border border-violet-200 bg-white text-violet-900 hover:bg-violet-100/80"
                                  onClick={() => appendContactToGroupDrafts(c)}
                                >
                                  + {c.label}
                                </button>
                              ))}
                            {contacts.every((c) =>
                              groupMemberDrafts.some(
                                (d) =>
                                  d.email.trim().toLowerCase() ===
                                  c.email.toLowerCase()
                              )
                            ) && (
                              <span className="text-xs text-violet-600/70">
                                넣을 연락처가 없거나 모두 넣었어요.
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-violet-900/80">
                          그룹 멤버 (이메일 필수)
                        </p>
                        <div className="rounded-lg border border-violet-200/80 bg-white overflow-hidden shadow-sm">
                          <p className="sm:hidden text-[11px] text-violet-700/80 px-2.5 pt-2">
                            이름·이메일 칸에 적고 삭제로 줄을 지울 수 있어요.
                          </p>
                          <div className="hidden sm:grid grid-cols-[1fr_1fr_auto] gap-1.5 text-[10px] font-semibold text-violet-900/60 uppercase tracking-wide px-2.5 pt-2 pb-1.5 border-b border-violet-100 bg-violet-50/50">
                            <span>표시 이름</span>
                            <span>이메일</span>
                            <span className="text-center">삭제</span>
                          </div>
                          <ul className="p-2 space-y-2">
                            {groupMemberDrafts.map((row) => (
                              <li
                                key={row.id}
                                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center"
                              >
                                <input
                                  className={inputBase}
                                  placeholder="홍길동"
                                  value={row.label}
                                  onChange={(e) =>
                                    updateMemberDraft(row.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  aria-label="멤버 표시 이름"
                                />
                                <input
                                  className={inputBase}
                                  placeholder="name@company.com"
                                  value={row.email}
                                  onChange={(e) =>
                                    updateMemberDraft(row.id, {
                                      email: e.target.value,
                                    })
                                  }
                                  aria-label="멤버 이메일"
                                />
                                <button
                                  type="button"
                                  className="justify-self-end sm:justify-self-center text-xs font-medium text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-md border border-transparent hover:border-red-100"
                                  aria-label="이 줄 지우기"
                                  onClick={() => removeMemberRow(row.id)}
                                >
                                  삭제
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-medium text-violet-900 bg-white border border-violet-200 px-2.5 py-1.5 rounded-lg hover:bg-violet-50 w-full sm:w-auto"
                          onClick={addMemberRow}
                        >
                          + 사람 줄 추가
                        </button>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          className="text-xs text-violet-800 underline underline-offset-2 hover:text-violet-950"
                          onClick={() => setGroupPasteOpen((o) => !o)}
                        >
                          {groupPasteOpen
                            ? "한 번에 붙여넣기 닫기"
                            : "엑셀·메일 목록 한 번에 붙여넣기"}
                        </button>
                        {groupPasteOpen && (
                          <div className="space-y-2 rounded-lg border border-dashed border-violet-300 bg-violet-50/50 p-2.5">
                            <p className="text-[11px] text-violet-900/80">
                              한 줄에 한 사람. 예:{" "}
                              <code className="text-violet-950 bg-white/80 px-1 rounded">
                                김철수 &lt;a@b.com&gt;
                              </code>{" "}
                              또는{" "}
                              <code className="text-violet-950 bg-white/80 px-1 rounded">
                                a@b.com
                              </code>
                            </p>
                            <textarea
                              className={`${inputBase} min-h-[72px]`}
                              placeholder="여기에 붙여 넣기"
                              value={groupPasteText}
                              onChange={(e) => setGroupPasteText(e.target.value)}
                            />
                            <button
                              type="button"
                              className="text-sm w-full sm:w-auto bg-violet-800 text-white px-3 py-2 rounded-lg hover:bg-violet-900"
                              onClick={applyGroupPaste}
                            >
                              붙여넣은 줄 멤버로 넣기
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 mt-1 border-t border-violet-200/60 shrink-0">
                      <button
                        type="button"
                        className="text-sm font-medium bg-violet-700 text-white px-4 py-2 rounded-lg hover:bg-violet-800"
                        onClick={saveGroup}
                      >
                        {editingGroupId ? "수정 반영" : "그룹 저장"}
                      </button>
                      {editingGroupId && (
                        <button
                          type="button"
                          className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-white bg-white/80"
                          onClick={cancelEditGroup}
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ② 드래그할 칩 */}
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/90 p-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-300/80 text-slate-900 text-xs font-bold">
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        끌어다 쓸 칩
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        여기 있는 칩을 아래{" "}
                        <strong className="text-slate-800">수신</strong>·
                        <strong className="text-slate-800">참조</strong> 칸으로
                        드래그하세요. 칩의 ×는 목록에서 지우기예요.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="h-px flex-1 max-w-8 bg-slate-300" aria-hidden />
                      개별 연락처
                    </p>
                    <div className="min-h-[44px] flex flex-wrap gap-2 p-2 rounded-lg bg-white border border-slate-200/80">
                      {contacts.length === 0 ? (
                        <span className="text-xs text-slate-400 py-1">
                          저장된 연락처가 없어요. 위에서 먼저 추가해 주세요.
                        </span>
                      ) : (
                        contacts.map((c) => (
                          <span
                            key={c.id}
                            draggable
                            onDragStart={(e) =>
                              onDragStart(e, {
                                source: "palette-contact",
                                contactId: c.id,
                              })
                            }
                            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-slate-100 text-slate-900 text-xs font-medium border border-slate-200 cursor-grab active:cursor-grabbing shadow-sm hover:border-slate-300"
                            title={c.email}
                          >
                            {c.label}
                            <button
                              type="button"
                              className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded p-0.5"
                              aria-label="연락처 삭제"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeContact(c.id);
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-[11px] font-semibold text-violet-900 mb-2 flex items-center gap-2">
                      <span className="h-px flex-1 max-w-8 bg-violet-300" aria-hidden />
                      그룹
                    </p>
                    <div className="min-h-[44px] flex flex-wrap gap-2 p-2 rounded-lg bg-white border border-violet-200/60">
                      {groups.length === 0 ? (
                        <span className="text-xs text-violet-700/70 py-1">
                          그룹이 없어요. 위에서 그룹을 저장하면 여기에 나타나요.
                        </span>
                      ) : (
                        groups.map((g) => (
                          <span
                            key={g.id}
                            draggable
                            onDragStart={(e) =>
                              onDragStart(e, {
                                source: "palette-group",
                                groupId: g.id,
                              })
                            }
                            className={`group/g relative inline-flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-lg text-xs font-medium border cursor-grab active:cursor-grabbing shadow-sm ${
                              editingGroupId === g.id
                                ? "bg-violet-200 border-violet-500 text-violet-950 ring-2 ring-violet-400"
                                : "bg-violet-50 border-violet-200 text-violet-900 hover:border-violet-300"
                            }`}
                          >
                            <span
                              title={g.members
                                .map((m) => `${m.label} <${m.email}>`)
                                .join("\n")}
                            >
                              {g.label}
                            </span>
                            <span className="pointer-events-none absolute left-0 bottom-[calc(100%+8px)] z-20 hidden min-w-[200px] max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 shadow-lg group-hover/g:block whitespace-pre-wrap">
                              {g.members
                                .map((m) => `${m.label} <${m.email}>`)
                                .join("\n")}
                            </span>
                            <button
                              type="button"
                              className="text-violet-800 hover:bg-violet-200/80 rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                              aria-label="그룹 수정"
                              title="이름·멤버 수정"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditGroup(g);
                              }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="text-violet-600 hover:text-red-600 hover:bg-red-50 rounded p-0.5 shrink-0"
                              aria-label="그룹 삭제"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editingGroupId === g.id) cancelEditGroup();
                                removeGroup(g.id);
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단: 이번에 보낼 주소 */}
      <div className="px-4 py-4 space-y-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-blue-600 shrink-0" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              이번에 보낼 주소
            </h3>
            <p className="text-[11px] text-gray-500">
              외부 전송 시 아래 목록이 함께 나갑니다. 빼려면 × 또는 위의 노란
              칸으로 드래그하세요.
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl border-2 border-dashed px-3 py-2.5 text-sm flex flex-wrap items-center gap-2 transition-colors ${bankClass}`}
          onDragOver={(e) => {
            if (!hasDndType(e)) return;
            allowDrop(e);
            setHighlight("bank");
          }}
          onDragEnter={(e) => {
            if (hasDndType(e)) setHighlight("bank");
          }}
          onDragLeave={() => setHighlight(null)}
          onDrop={dropOnBank}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-sm"
            aria-hidden
          >
            ↩
          </span>
          <span className="text-gray-600 text-xs sm:text-sm leading-snug">
            수신·참조에 넣은 칩을{" "}
            <strong className="text-gray-800">여기</strong>로 끌어오면 그 칸에서만
            빠져요. (주소록 칩은 그대로)
          </span>
        </div>

        <div className="grid gap-3">
          <div
            className={`rounded-xl border-2 px-3 py-2.5 transition-colors ${
              highlight === "to"
                ? "border-blue-500 bg-blue-50/90 ring-2 ring-blue-200/80"
                : "border-gray-200 bg-gray-50/80"
            }`}
            onDragEnter={() => setHighlight("to")}
            onDragOver={(e) => {
              if (!hasDndType(e)) return;
              allowDrop(e);
              setHighlight("to");
            }}
            onDragLeave={() => setHighlight(null)}
            onDrop={(e) => dropOnZone("to", e)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex items-center gap-2 shrink-0 sm:w-24">
                <span className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-[11px] font-bold px-2 py-1 min-w-[3rem]">
                  수신
                </span>
              </div>
              <div className="flex flex-wrap gap-2 flex-1 min-h-[36px] items-center">
                {toSlots.length === 0 && (
                  <span className="text-xs text-gray-400">
                    칩을 여기로 드래그
                  </span>
                )}
                {toSlots.map((s) => renderZoneChip("to", s))}
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl border-2 px-3 py-2.5 transition-colors ${
              highlight === "cc"
                ? "border-indigo-500 bg-indigo-50/90 ring-2 ring-indigo-200/80"
                : "border-gray-200 bg-gray-50/80"
            }`}
            onDragEnter={() => setHighlight("cc")}
            onDragOver={(e) => {
              if (!hasDndType(e)) return;
              allowDrop(e);
              setHighlight("cc");
            }}
            onDragLeave={() => setHighlight(null)}
            onDrop={(e) => dropOnZone("cc", e)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex items-center gap-2 shrink-0 sm:w-24">
                <span className="inline-flex items-center justify-center rounded-md bg-indigo-600 text-white text-[11px] font-bold px-2 py-1 min-w-[3rem]">
                  참조
                </span>
              </div>
              <div className="flex flex-wrap gap-2 flex-1 min-h-[36px] items-center">
                {ccSlots.length === 0 && (
                  <span className="text-xs text-gray-400">
                    칩을 여기로 드래그
                  </span>
                )}
                {ccSlots.map((s) => renderZoneChip("cc", s))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default EmailRecipientPanel;
