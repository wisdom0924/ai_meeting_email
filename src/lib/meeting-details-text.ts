const NO_INFO = "정보 없음";

function strPresent(v: unknown): boolean {
  return v != null && String(v).trim() !== "";
}

export type MeetingDetailsFormatResult = {
  title: string;
  text: string;
};

export function formatMeetingDetailsToText(
  details: unknown,
  defaultMeetingDate?: string
): MeetingDetailsFormatResult {
  const meetingDate = defaultMeetingDate ?? "";
  let detailsText = "";
  let meetingTitle = "회의록 상세";

  if (typeof details === "string") {
    return { title: meetingTitle, text: details };
  }

  if (!details || typeof details !== "object") {
    return { title: meetingTitle, text: "" };
  }

  const d = details as Record<string, unknown>;
  meetingTitle = (d.title as string) || "회의 상세";
  detailsText += `### ${meetingTitle}\n\n`;

  if (d.meta && typeof d.meta === "object") {
    Object.entries(d.meta as Record<string, unknown>).forEach(([key, value]) => {
      const empty = !strPresent(value);
      let displayValue: unknown = value;
      if (key === "회의 일시" && empty) {
        displayValue = meetingDate;
      } else if (empty) {
        displayValue = NO_INFO;
      }
      detailsText += `- **${key}**: ${displayValue}\n`;
    });
    detailsText += "\n";
  }

  const actionItems = Array.isArray(d.actionItems) ? d.actionItems : [];
  if (actionItems.length > 0) {
    detailsText += `### ✅ Action Items (할 일)\n\n`;
    actionItems.forEach((item: Record<string, unknown>) => {
      const task = strPresent(item.task) ? item.task : NO_INFO;
      const assignee = strPresent(item.assignee) ? item.assignee : "담당자 없음";
      const deadline = strPresent(item.deadline) ? item.deadline : "기한 없음";
      detailsText += `- [ ] **${task}** (담당: ${assignee}, 기한: ${deadline})\n`;
    });
    detailsText += "\n";
  }

  const agendas = Array.isArray(d.agendas) ? d.agendas : [];
  agendas.forEach((agenda: Record<string, unknown>, idx: number) => {
    const agendaTitle = strPresent(agenda.title) ? agenda.title : NO_INFO;
    detailsText += `#### ${idx + 1}. ${agendaTitle}\n\n`;

    detailsText += `**논의 사항:**\n`;
    if (
      agenda.discussions &&
      Array.isArray(agenda.discussions) &&
      agenda.discussions.length > 0
    ) {
      (agenda.discussions as string[]).forEach((disc) => {
        detailsText += `- ${disc}\n`;
      });
    } else {
      detailsText += `- ${NO_INFO}\n`;
    }
    detailsText += "\n";

    detailsText += `**결정 사항:**\n${
      strPresent(agenda.decisions) ? agenda.decisions : NO_INFO
    }\n\n`;
    detailsText += `**액션 아이템:**\n${
      strPresent(agenda.actions) ? agenda.actions : NO_INFO
    }\n\n`;
  });

  detailsText += `### 📌 메모 요약\n${
    strPresent(d.memoSummary) ? d.memoSummary : NO_INFO
  }\n\n`;
  detailsText += `### 🗓 다음 회의\n${
    strPresent(d.nextMeeting) ? d.nextMeeting : NO_INFO
  }\n\n`;
  detailsText += `### 📝 추가 노트\n${
    strPresent(d.additionalNotes) ? d.additionalNotes : NO_INFO
  }\n\n`;

  return { title: meetingTitle, text: detailsText };
}

export function extractMeetingTitle(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;
  const fromTitle = d.title;
  if (fromTitle != null && String(fromTitle).trim() !== "") {
    return String(fromTitle).trim();
  }
  if (d.meta && typeof d.meta === "object") {
    const metaTitle = (d.meta as Record<string, unknown>)["회의 제목"];
    if (metaTitle != null && String(metaTitle).trim() !== "") {
      return String(metaTitle).trim();
    }
  }
  return "";
}

export function extractMeetingMetaFields(details: unknown): {
  venue: string;
  attendees: string;
  organizer: string;
  meetingPurpose: string;
} {
  let venue = "";
  let attendees = "";
  let organizer = "";
  let meetingPurpose = "";

  if (
    details &&
    typeof details === "object" &&
    (details as Record<string, unknown>).meta &&
    typeof (details as Record<string, unknown>).meta === "object"
  ) {
    const meta = (details as Record<string, unknown>).meta as Record<string, unknown>;
    const metaStr = (key: string) =>
      strPresent(meta[key]) ? String(meta[key]).trim() : "";
    venue = metaStr("장소");
    attendees = metaStr("참석자");
    organizer = metaStr("주최자");
    meetingPurpose = metaStr("회의 목적");
  }

  return { venue, attendees, organizer, meetingPurpose };
}
