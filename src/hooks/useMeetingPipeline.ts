"use client";

import { useState, useRef, useCallback } from "react";
import type { TranscriptBlock, Memo } from "@/types";
import { withDefaultMeetingDateTime } from "@/lib/meeting-details-defaults";
import { MAX_AUDIO_UPLOAD_BYTES } from "@/lib/audio-upload-limits";
import { buildTranscriptBlocksFromText } from "@/lib/transcript-blocks";
import { API_URL, apiFetch } from "@/lib/api-client";
import { isUsableRecordingClientKey } from "@/lib/recording-client-key";
import { createPrompt, shouldSkipAutoPromptSnapshot } from "@/lib/prompts-api";
import { toIsoFromFileLastModified } from "@/lib/meeting-file-utils";

export type AudioJobOptions = {
  blob: Blob;
  filename: string;
  systemMemoText: string;
  promptsName: string;
  promptSource: "recording_end" | "user";
  recordedAtIso?: string | null;
};

type AnalyzeRetryContext = {
  text: string;
  recordedAtIso: string | null;
  transcriptBlocks: TranscriptBlock[];
  filename: string;
};

export type PipelineFailureKind = "transcribe" | "analyze" | "network";

type UseMeetingPipelineOptions = {
  userId: number | null;
  accessToken: string | null;
  recordingClientKeyRef: React.RefObject<string>;
  memosRef: React.RefObject<Memo[]>;
  isRecordingRef: React.RefObject<boolean>;
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  setServerListVersion: React.Dispatch<React.SetStateAction<number>>;
  setPromptListVersion: React.Dispatch<React.SetStateAction<number>>;
};

export function useMeetingPipeline({
  userId,
  accessToken,
  recordingClientKeyRef,
  memosRef,
  isRecordingRef,
  setMemos,
  setServerListVersion,
  setPromptListVersion,
}: UseMeetingPipelineOptions) {
  const [transcript, setTranscript] = useState("");
  const [fullTranscript, setFullTranscript] = useState<TranscriptBlock[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineFailureKind, setPipelineFailureKind] =
    useState<PipelineFailureKind | null>(null);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState<unknown>(null);

  const lastAudioJobRef = useRef<AudioJobOptions | null>(null);
  const analyzeRetryContextRef = useRef<AnalyzeRetryContext | null>(null);

  const runMeetingAnalysis = useCallback(
    async (ctx: AnalyzeRetryContext) => {
      const summaryPrompt = localStorage.getItem("summaryPrompt");
      const detailsPrompt = localStorage.getItem("detailsPrompt");
      const userMemos = memosRef.current
        .filter((m) => m.type !== "system")
        .map((m) => `[${m.time}] ${m.text}`)
        .join("\n");

      const analyzeResponse = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: ctx.text,
          memos: userMemos,
          summaryPrompt,
          detailsPrompt,
        }),
      });

      if (analyzeResponse.status === 401 || analyzeResponse.status === 503) {
        const errJson = (await analyzeResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errJson.error ?? "요약을 만들려면 로그인이 필요해요."
        );
      }

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.error) {
        throw new Error(analyzeData.error);
      }

      if (analyzeData.summary) setSummary(analyzeData.summary);
      if (analyzeData.details) {
        setDetails(
          withDefaultMeetingDateTime(
            analyzeData.details,
            ctx.recordedAtIso ?? null
          )
        );
      }
      setTranscript("");
      setPipelineError(null);
      setPipelineFailureKind(null);
      analyzeRetryContextRef.current = null;

      if (userId && accessToken) {
        const detailsToSave =
          analyzeData.details != null
            ? withDefaultMeetingDateTime(
                analyzeData.details,
                ctx.recordedAtIso ?? null
              )
            : null;

        const fullTranscriptText = ctx.transcriptBlocks
          .map((b) => `[${b.time}] ${b.text}`)
          .join("\n");

        void apiFetch(`${API_URL}/api/users/${userId}/meetings`, {
          method: "POST",
          body: JSON.stringify({
            title: ctx.filename || "새 회의록",
            transcript: fullTranscriptText,
            summary: analyzeData.summary ?? "",
            details: detailsToSave ? JSON.stringify(detailsToSave) : null,
          }),
        })
          .then((res) => {
            if (res.ok) setServerListVersion((v) => v + 1);
          })
          .catch((err) => console.error("FastAPI 저장 에러:", err));
      }
    },
    [accessToken, memosRef, setServerListVersion, userId]
  );

  const processAudioBlob = useCallback(
    async (
      opts: AudioJobOptions,
      retryOpts?: { skipPrep?: boolean }
    ) => {
      const {
        blob,
        filename,
        systemMemoText,
        promptsName,
        promptSource,
        recordedAtIso,
      } = opts;
      lastAudioJobRef.current = opts;
      analyzeRetryContextRef.current = null;
      setPipelineError(null);
      setPipelineFailureKind(null);

      const audioUrl = URL.createObjectURL(blob);
      const clientKeyForServer = recordingClientKeyRef.current;

      if (isUsableRecordingClientKey(clientKeyForServer, Boolean(userId)) && !retryOpts?.skipPrep) {
        try {
          const uploadForm = new FormData();
          uploadForm.append("audio", blob, filename);
          uploadForm.append("client_key", clientKeyForServer);
          uploadForm.append("original_filename", filename);
          if (recordedAtIso) {
            uploadForm.append("recorded_at", recordedAtIso);
          }
          const uploadRes = await fetch("/api/recordings", {
            method: "POST",
            body: uploadForm,
          });
          if (uploadRes.ok) {
            setServerListVersion((v) => v + 1);
          } else {
            const text = await uploadRes.text();
            let parsed: Record<string, unknown> = {};
            try {
              parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
            } catch {
              parsed = { raw: text };
            }
            console.error("[서버 녹음] 업로드 실패:", uploadRes.status, parsed);
          }
        } catch (e) {
          console.error("[서버 녹음] 업로드 요청 오류:", e);
        }

        const snapSummary = localStorage.getItem("summaryPrompt") ?? "";
        const snapDetails = localStorage.getItem("detailsPrompt") ?? "";
        const skipAutoSave = await shouldSkipAutoPromptSnapshot(
          clientKeyForServer,
          snapSummary,
          snapDetails
        );
        if (!skipAutoSave) {
          void createPrompt({
            name: promptsName,
            summary_prompt: snapSummary,
            details_prompt: snapDetails,
            client_key: clientKeyForServer,
            source: promptSource,
          })
            .then(() => setPromptListVersion((v) => v + 1))
            .catch(() => {});
        }
      }

      if (!retryOpts?.skipPrep) {
        const now = new Date();
        setMemos((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: systemMemoText,
            time: now.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            audioUrl,
            type: "system",
          },
        ]);
      }

      try {
        setIsTranscribing(true);
        setTranscript(
          "AI가 녹음된 목소리를 열심히 듣고 글자로 바꾸고 있어요! (약 10~30초 소요)"
        );

        const formData = new FormData();
        formData.append("audio", blob, filename);

        const response = await fetch("/api/assemblyai/transcribe", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (response.status === 401 || response.status === 503) {
          const errJson = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setTranscript("");
          setPipelineError(
            errJson.error ?? "이 기능을 쓰려면 로그인이 필요해요."
          );
          setPipelineFailureKind("transcribe");
          setIsTranscribing(false);
          return;
        }

        const data = await response.json();

        if (data.error) {
          setTranscript("");
          setPipelineError(
            "앗, 글자로 바꾸는 중에 문제가 생겼어요: " + data.error
          );
          setPipelineFailureKind("transcribe");
          setIsTranscribing(false);
          return;
        }

        const newBlocks = buildTranscriptBlocksFromText(
          data.text,
          recordedAtIso ?? null,
          data.words
        );

        setFullTranscript((prev) =>
          retryOpts?.skipPrep ? newBlocks : [...prev, ...newBlocks]
        );
        setTranscript(
          "회의 내용을 바탕으로 요약본과 상세 회의록을 만들고 있어요! (약 10초 소요)"
        );

        const analyzeContext: AnalyzeRetryContext = {
          text: data.text,
          recordedAtIso: recordedAtIso ?? null,
          transcriptBlocks: newBlocks,
          filename,
        };
        analyzeRetryContextRef.current = analyzeContext;

        try {
          await runMeetingAnalysis(analyzeContext);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "회의록을 분석하고 요약하는 중 문제가 발생했습니다.";
          setTranscript("");
          setPipelineError(`요약본을 만드는 중에 문제가 생겼어요: ${message}`);
          setPipelineFailureKind("analyze");
        }
      } catch (error) {
        console.error("변환 요청 실패:", error);
        setTranscript("");
        setPipelineError("서버와 통신하는 데 실패했어요.");
        setPipelineFailureKind("network");
      } finally {
        setIsTranscribing(false);
      }
    },
    [
      recordingClientKeyRef,
      runMeetingAnalysis,
      setMemos,
      setPromptListVersion,
      setServerListVersion,
      userId,
    ]
  );

  const handleRetryPipeline = useCallback(async () => {
    if (isTranscribing) return;

    if (pipelineFailureKind === "analyze") {
      const ctx = analyzeRetryContextRef.current;
      if (!ctx) return;

      setPipelineError(null);
      setTranscript(
        "회의 내용을 바탕으로 요약본과 상세 회의록을 만들고 있어요! (약 10초 소요)"
      );
      setIsTranscribing(true);
      try {
        await runMeetingAnalysis(ctx);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "회의록을 분석하고 요약하는 중 문제가 발생했습니다.";
        setTranscript("");
        setPipelineError(`요약본을 만드는 중에 문제가 생겼어요: ${message}`);
        setPipelineFailureKind("analyze");
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    const job = lastAudioJobRef.current;
    if (!job) return;

    setPipelineError(null);
    setTranscript("");
    setSummary("");
    setDetails(null);
    setFullTranscript([]);
    await processAudioBlob(job, { skipPrep: true });
  }, [
    isTranscribing,
    pipelineFailureKind,
    processAudioBlob,
    runMeetingAnalysis,
  ]);

  const retryPipelineLabel =
    pipelineFailureKind === "analyze"
      ? "요약 다시 만들기"
      : "음성 변환 다시 시도";

  const handleAudioFileSelected = useCallback(
    async (file: File) => {
      if (isRecordingRef.current) {
        alert(
          "녹음 중에는 파일을 올릴 수 없어요. 녹음을 멈춘 뒤 다시 시도해 주세요."
        );
        return;
      }
      if (isTranscribing) {
        alert("지금 다른 음성을 처리 중이에요. 잠시만 기다려 주세요.");
        return;
      }
      if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
        alert("파일이 너무 커요. 1GB 이하로 줄여 주세요.");
        return;
      }
      if (file.size === 0) {
        alert("빈 파일이에요.");
        return;
      }
      const label = file.name?.trim() || "audio";
      setTranscript("");
      setPipelineError(null);
      setPipelineFailureKind(null);
      setSummary("");
      setDetails(null);
      await processAudioBlob({
        blob: file,
        filename: label,
        systemMemoText:
          "📁 오디오 파일을 불러왔습니다. AI가 회의록을 작성 중입니다...",
        promptsName: `파일 ${label} · ${new Date().toLocaleString("ko-KR")}`,
        promptSource: "user",
        recordedAtIso: toIsoFromFileLastModified(file.lastModified),
      });
    },
    [isRecordingRef, isTranscribing, processAudioBlob]
  );

  const resetPipelineState = useCallback(() => {
    setTranscript("");
    setPipelineError(null);
    setPipelineFailureKind(null);
  }, []);

  return {
    transcript,
    setTranscript,
    fullTranscript,
    setFullTranscript,
    isTranscribing,
    pipelineError,
    pipelineFailureKind,
    summary,
    setSummary,
    details,
    setDetails,
    processAudioBlob,
    handleRetryPipeline,
    retryPipelineLabel,
    handleAudioFileSelected,
    resetPipelineState,
  };
}
