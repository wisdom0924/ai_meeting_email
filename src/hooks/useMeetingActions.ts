"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TranscriptBlock, Memo } from "@/types";
import type { EmailRecipientPanelHandle } from "@/components/EmailRecipientPanel";
import {
  deepStripBasicMarkdown,
  stripBasicMarkdown,
} from "@/lib/strip-markdown";
import {
  buildMeetingMemoFileName,
  encodeUtf8Base64,
  getDefaultMeetingDate,
} from "@/lib/meeting-file-utils";
import {
  extractMeetingMetaFields,
  extractMeetingTitle,
  formatMeetingDetailsToText,
} from "@/lib/meeting-details-text";

type UseMeetingActionsOptions = {
  memos: Memo[];
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  fullTranscript: TranscriptBlock[];
  transcript: string;
  summary: string;
  details: unknown;
  emailRecipientsRef: React.RefObject<EmailRecipientPanelHandle | null>;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useMeetingActions({
  memos,
  setMemos,
  fullTranscript,
  transcript,
  summary,
  details,
  emailRecipientsRef,
  setIsSending,
}: UseMeetingActionsOptions) {
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    if (window.confirm("정말 새로고침 하시겠습니까? 모든 기록이 초기화됩니다.")) {
      window.location.reload();
    }
  }, []);

  const handleAddMemo = useCallback(
    (text: string) => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const newMemo: Memo = {
        id: Date.now(),
        text,
        time: timeString,
        type: "text",
      };

      setMemos((prev) => [...prev, newMemo]);
    },
    [setMemos]
  );

  const handleShareToBoard = useCallback(() => {
    if (!details) {
      alert("공유할 상세 회의록이 없습니다.");
      return;
    }

    const { title: meetingTitle, text: detailsText } = formatMeetingDetailsToText(
      details,
      getDefaultMeetingDate()
    );

    const boardData = {
      title: meetingTitle,
      content: detailsText,
    };

    sessionStorage.setItem("share_board_data", JSON.stringify(boardData));
    router.push("/board/write");
  }, [details, router]);

  const handleSendExternal = useCallback(async () => {
    const hasUserMemos = memos.some((m) => m.type !== "system");
    const hasTranscript = fullTranscript.length > 0;
    if (!summary && !details && !hasUserMemos && !hasTranscript) {
      alert("전송할 데이터가 없습니다.");
      return;
    }

    setIsSending(true);

    try {
      const defaultMeetingDate = getDefaultMeetingDate();

      const transcriptPlain = fullTranscript
        .map((b) => b.text)
        .join("\n\n")
        .trim();
      const transcriptWithTime = fullTranscript
        .map((b) => `[${b.time}] ${b.text}`)
        .join("\n\n")
        .trim();
      const transcriptBlocks = fullTranscript.map(({ time, text }) => ({
        time,
        text,
      }));
      const userMemosPayload = memos
        .filter((m) => m.type !== "system")
        .map((m) => ({ time: m.time, text: m.text }));

      let markdownContent = `# 회의록 요약 및 상세 내용\n\n`;

      if (summary) {
        markdownContent += `## 📝 요약\n\n${summary}\n\n`;
      }

      let detailsText = "";
      if (details) {
        const formatted = formatMeetingDetailsToText(details, defaultMeetingDate);
        detailsText = formatted.text;
        markdownContent += `## 📋 상세 회의록\n\n${detailsText}\n\n`;
      }

      if (transcriptWithTime) {
        markdownContent += `## 🎙 전체 전사\n\n${transcriptWithTime}\n\n`;
      }

      if (userMemosPayload.length > 0) {
        markdownContent += `## 📌 메모\n\n`;
        userMemosPayload.forEach((m) => {
          markdownContent += `- [${m.time}] ${m.text}\n`;
        });
        markdownContent += "\n";
      }

      const meetingTitle = extractMeetingTitle(details);
      const { venue, attendees, organizer, meetingPurpose } =
        extractMeetingMetaFields(details);

      let meetingDetailsForWebhook: unknown = null;
      if (details && typeof details === "object") {
        try {
          meetingDetailsForWebhook = JSON.parse(JSON.stringify(details));
        } catch {
          meetingDetailsForWebhook = details;
        }
      } else if (details && typeof details === "string") {
        meetingDetailsForWebhook = { _format: "text", content: details };
      }

      if (meetingDetailsForWebhook != null) {
        meetingDetailsForWebhook = deepStripBasicMarkdown(
          meetingDetailsForWebhook
        );
      }

      const transcriptionForWebhook = [
        transcriptPlain,
        transcript.trim() ? transcript.trim() : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { to: emailTo, cc: emailCc } =
        emailRecipientsRef.current?.getResolvedEmails() ?? {
          to: [] as string[],
          cc: [] as string[],
        };

      const summaryForEmailBody = stripBasicMarkdown(summary || "").trim();
      const normalizedSummaryForEmailBody =
        summaryForEmailBody || "요약 내용이 없습니다.";
      const memoAttachmentText = stripBasicMarkdown(markdownContent).trim();
      const memoAttachmentContent =
        memoAttachmentText || "회의 메모 내용이 없습니다.";
      const memoAttachmentFileName = buildMeetingMemoFileName(
        meetingTitle || "meeting",
        defaultMeetingDate
      );
      const memoAttachmentBase64 = encodeUtf8Base64(memoAttachmentContent);

      const payload = {
        transcription: stripBasicMarkdown(transcriptionForWebhook),
        transcriptBlocks: transcriptBlocks.map(({ time, text }) => ({
          time,
          text: stripBasicMarkdown(text),
        })),
        summary: stripBasicMarkdown(summary || ""),
        detail: stripBasicMarkdown(detailsText || ""),
        script: stripBasicMarkdown(markdownContent),
        meetingDateTime: defaultMeetingDate,
        title: stripBasicMarkdown(meetingTitle),
        venue: stripBasicMarkdown(venue),
        attendees: stripBasicMarkdown(attendees),
        organizer: stripBasicMarkdown(organizer),
        meetingPurpose: stripBasicMarkdown(meetingPurpose),
        meetingDetails: meetingDetailsForWebhook,
        memos: userMemosPayload.map((m) => ({
          time: m.time,
          text: stripBasicMarkdown(m.text),
        })),
        emailTo,
        emailCc,
        emailBodySummary: normalizedSummaryForEmailBody,
        emailMemoAttachment: {
          fileName: memoAttachmentFileName,
          mimeType: "text/plain; charset=utf-8",
          contentBase64: memoAttachmentBase64,
          contentText: memoAttachmentContent,
        },
      };

      const response = await fetch("/api/meeting-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("데이터가 성공적으로 전송되었습니다.");
        emailRecipientsRef.current?.refreshEmailFavorites();
      } else {
        alert("데이터 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("웹훅 전송 에러:", error);
      alert("데이터 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  }, [
    details,
    emailRecipientsRef,
    fullTranscript,
    memos,
    setIsSending,
    summary,
    transcript,
  ]);

  return {
    handleRefresh,
    handleAddMemo,
    handleShareToBoard,
    handleSendExternal,
  };
}
