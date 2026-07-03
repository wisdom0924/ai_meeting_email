"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { TranscriptBlock, Memo } from "@/types";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import RecordPanel from "@/components/RecordPanel";
import RecordingHistoryModal from "@/components/RecordingHistoryModal";
import TranscriptPanel from "@/components/TranscriptPanel";
import EmailRecipientPanel, {
  type EmailRecipientPanelHandle,
} from "@/components/EmailRecipientPanel";
import { withDefaultMeetingDateTime } from "@/lib/meeting-details-defaults";
import {
  deepStripBasicMarkdown,
  stripBasicMarkdown,
} from "@/lib/strip-markdown";
import { MAX_AUDIO_UPLOAD_BYTES } from "@/lib/audio-upload-limits";
import { buildTranscriptBlocksFromText } from "@/lib/transcript-blocks";
import { useAuthStore } from "@/store/auth-store";
import { API_URL, apiFetch } from "@/lib/api-client";
import { isUsableRecordingClientKey } from "@/lib/recording-client-key";
import { createPrompt, shouldSkipAutoPromptSnapshot } from "@/lib/prompts-api";

function toSafeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

function buildMeetingMemoFileName(title: string, meetingDate: string): string {
  const safeTitle = toSafeFileNamePart(title);
  const safeDate = toSafeFileNamePart(meetingDate);
  if (safeTitle) {
    return `${safeTitle}_${safeDate}_회의메모.txt`;
  }
  return `${safeDate}_회의메모.txt`;
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function toIsoFromFileLastModified(lastModified: number): string | null {
  if (!Number.isFinite(lastModified) || lastModified <= 0) return null;
  const d = new Date(lastModified);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type AudioJobOptions = {
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

type PipelineFailureKind = "transcribe" | "analyze" | "network";

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const memosRef = useRef<Memo[]>([]);
  useEffect(() => {
    memosRef.current = memos;
  }, [memos]);

  // 녹음 중인지 아닌지(상태)와 몇 초가 지났는지(진행 시간) 기억하는 공간이에요.
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 실시간 음성 인식 결과를 저장하는 공간이에요.
  const [transcript, setTranscript] = useState(""); // 변환 중인 상태 메시지
  const [fullTranscript, setFullTranscript] = useState<TranscriptBlock[]>([]); // 완전히 끝난 문장들 모음
  const [isTranscribing, setIsTranscribing] = useState(false); // AI가 글자로 바꾸고 있는지 확인하는 마크
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineFailureKind, setPipelineFailureKind] =
    useState<PipelineFailureKind | null>(null);
  const [summary, setSummary] = useState(""); // 500자 요약 데이터 상태 저장공간 추가
  const [details, setDetails] = useState<any>(null); // 상세 회의록 데이터 상태 추가
  const [isSending, setIsSending] = useState(false); // 웹훅 전송 상태 추가

  /** SSR 시에는 비어 있다가, 클라이언트에서만 localStorage 기반 키로 채움 */
  const [recordingClientKey, setRecordingClientKey] = useState("");
  const [serverListVersion, setServerListVersion] = useState(0);
  const [promptListVersion, setPromptListVersion] = useState(0);
  const [promptSnapshot, setPromptSnapshot] = useState<{
    summary: string | null;
    details: string | null;
  }>({ summary: null, details: null });
  const [serverProcessing, setServerProcessing] = useState(false);
  const [recordingHistoryOpen, setRecordingHistoryOpen] = useState(false);

  const router = useRouter();
  const { userId, accessToken, isHydrated } = useAuthStore();

  const handleActivePromptsChange = useCallback(
    (summary: string | null, details: string | null) => {
      setPromptSnapshot({ summary, details });
    },
    []
  );

  const recordingClientKeyRef = useRef("");
  const recordingStartedAtRef = useRef<string | null>(null);
  const lastAudioJobRef = useRef<AudioJobOptions | null>(null);
  const analyzeRetryContextRef = useRef<AnalyzeRetryContext | null>(null);
  useEffect(() => {
    recordingClientKeyRef.current = recordingClientKey;
  }, [recordingClientKey]);

  // FastAPI 서버와 연결하기 위해 사용자 ID 가져오기
  useEffect(() => {
    if (!isHydrated || !userId) return;
    setRecordingClientKey(String(userId));
    setServerListVersion((v) => v + 1);
  }, [isHydrated, userId]);

  useEffect(() => {
    setPromptSnapshot({
      summary: localStorage.getItem("summaryPrompt"),
      details: localStorage.getItem("detailsPrompt"),
    });
  }, []);

  const memosForAi = useMemo(
    () =>
      memos
        .filter((m) => m.type !== "system")
        .map((m) => `[${m.time}] ${m.text}`)
        .join("\n"),
    [memos]
  );

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
    [accessToken, userId]
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
      let serverRecordingId: string | null = null;

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
            const uploadData = (await uploadRes.json()) as {
              recording?: { id?: string };
            };
            if (uploadData.recording?.id) {
              serverRecordingId = uploadData.recording.id;
            }
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
            audioUrl: audioUrl,
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
    [runMeetingAnalysis, setServerListVersion, setPromptListVersion, userId]
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
      if (isRecording) {
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
    [isRecording, isTranscribing, processAudioBlob]
  );

  const emailRecipientsRef = useRef<EmailRecipientPanelHandle>(null);

  // 오디오 녹음과 웹소켓 통신을 위한 도구들이에요.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // 마이크 소리 크기를 감지하기 위한 도구들이에요.
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 녹음 버튼을 누를 때 실행되는 함수예요.
  const handleToggleRecord = async () => {
    if (!isRecording) {
      try {
        // 1. 마이크 권한을 허락받고 소리를 가져옵니다.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordingStartedAtRef.current = new Date().toISOString();

        // --- 마이크 소리 크기를 측정하는 부분 시작 ---
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastUpdateTime = 0;

        const updateAudioLevel = (time: number) => {
          if (!analyserRef.current) return;
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

          // 너무 자주 업데이트하면 컴퓨터가 힘들어하니, 1초에 10번 정도만 업데이트해요. (100ms 간격)
          if (time - lastUpdateTime < 100) return;
          lastUpdateTime = time;

          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setAudioLevel(average);
        };
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        // --- 마이크 소리 크기를 측정하는 부분 끝 ---

        // 4. 원래 있던 녹음 파일(WebM) 저장용 마법사(MediaRecorder)를 켭니다.
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const mimeType = mediaRecorder.mimeType || "audio/webm";
          const fileExtension = mimeType.includes("mp4") ? "mp4" : "webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const recName = `recording.${fileExtension}`;
          await processAudioBlob({
            blob: audioBlob,
            filename: recName,
            systemMemoText:
              "⏹️ 녹음이 종료되었습니다. AI가 회의록을 작성 중입니다...",
            promptsName: `녹음 ${new Date().toLocaleString("ko-KR")}`,
            promptSource: "recording_end",
            recordedAtIso: recordingStartedAtRef.current,
          });
          recordingStartedAtRef.current = null;
        };

        mediaRecorder.start();
        setIsRecording(true);
        setTranscript("");
        setSummary("");
        setDetails(null);

        const now = new Date();
        setMemos((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "🔴 녹음이 시작되었습니다.",
            time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
          }
        ]);
      } catch (error) {
        recordingStartedAtRef.current = null;
        console.error("마이크 접근 실패:", error);
        setTranscript("마이크를 사용할 수 없거나 접근 권한이 없습니다.");
      }
    } else {
      // 녹음을 멈출 때, 소리 크기 측정도 함께 멈춥니다.
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(0);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  };

  // 녹음이 시작되면 1초마다 시간을 1씩 올려주는 마법(타이머)입니다.
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    
    return () => clearInterval(interval);
  }, [isRecording]);

  // '전송' 버튼을 누르면 실행되는 함수입니다. (메모 추가하기)
  const handleAddMemo = (text: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newMemo: Memo = {
      id: Date.now(),
      text: text,
      time: timeString,
      type: 'text'
    };

    setMemos((prev) => [...prev, newMemo]);
  };

  const handleRefresh = () => {
    if (window.confirm("정말 새로고침 하시겠습니까? 모든 기록이 초기화됩니다.")) {
      window.location.reload();
    }
  };

  const handleShareToBoard = () => {
    if (!details) {
      alert("공유할 상세 회의록이 없습니다.");
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultMeetingDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const NO_INFO = "정보 없음";
    const strPresent = (v: unknown) => v != null && String(v).trim() !== "";

    let detailsText = '';
    let meetingTitle = "회의록 상세";

    if (typeof details === 'string') {
      detailsText = details;
    } else {
      meetingTitle = details.title || '회의 상세';
      detailsText += `### ${meetingTitle}\n\n`;
      
      if (details.meta) {
        Object.entries(details.meta).forEach(([key, value]) => {
          const empty = !strPresent(value);
          let displayValue: unknown = value;
          if (key === "회의 일시" && empty) {
            displayValue = defaultMeetingDate;
          } else if (empty) {
            displayValue = NO_INFO;
          }
          detailsText += `- **${key}**: ${displayValue}\n`;
        });
        detailsText += '\n';
      }
      
      if (details.actionItems && Array.isArray(details.actionItems) && details.actionItems.length > 0) {
        detailsText += `### ✅ Action Items (할 일)\n\n`;
        details.actionItems.forEach((item: any) => {
          const task = strPresent(item.task) ? item.task : NO_INFO;
          const assignee = strPresent(item.assignee) ? item.assignee : "담당자 없음";
          const deadline = strPresent(item.deadline) ? item.deadline : "기한 없음";
          detailsText += `- [ ] **${task}** (담당: ${assignee}, 기한: ${deadline})\n`;
        });
        detailsText += '\n';
      }
      
      if (details.agendas && Array.isArray(details.agendas)) {
        details.agendas.forEach((agenda: any, idx: number) => {
          const agendaTitle = strPresent(agenda.title)
            ? agenda.title
            : NO_INFO;
          detailsText += `#### ${idx + 1}. ${agendaTitle}\n\n`;

          detailsText += `**논의 사항:**\n`;
          if (
            agenda.discussions &&
            Array.isArray(agenda.discussions) &&
            agenda.discussions.length > 0
          ) {
            agenda.discussions.forEach((d: string) => {
              detailsText += `- ${d}\n`;
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
      }

      detailsText += `### 📌 메모 요약\n${
        strPresent(details.memoSummary) ? details.memoSummary : NO_INFO
      }\n\n`;
      detailsText += `### 🗓 다음 회의\n${
        strPresent(details.nextMeeting) ? details.nextMeeting : NO_INFO
      }\n\n`;
      detailsText += `### 📝 추가 노트\n${
        strPresent(details.additionalNotes)
          ? details.additionalNotes
          : NO_INFO
      }\n\n`;
    }

    const boardData = {
      title: meetingTitle,
      content: detailsText,
    };
    
    sessionStorage.setItem("share_board_data", JSON.stringify(boardData));
    router.push("/board/write");
  };

  const handleSendExternal = async () => {
    const hasUserMemos = memos.some((m) => m.type !== "system");
    const hasTranscript = fullTranscript.length > 0;
    if (!summary && !details && !hasUserMemos && !hasTranscript) {
      alert("전송할 데이터가 없습니다.");
      return;
    }
    
    setIsSending(true);
    
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const defaultMeetingDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const NO_INFO = "정보 없음";
      const strPresent = (v: unknown) => v != null && String(v).trim() !== "";

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
      
      let detailsText = '';
      if (details) {
        if (typeof details === 'string') {
          detailsText = details;
        } else {
          detailsText += `### ${details.title || '회의 상세'}\n\n`;
          
          if (details.meta) {
            Object.entries(details.meta).forEach(([key, value]) => {
              const empty = !strPresent(value);
              let displayValue: unknown = value;
              if (key === "회의 일시" && empty) {
                displayValue = defaultMeetingDate;
              } else if (empty) {
                displayValue = NO_INFO;
              }
              detailsText += `- **${key}**: ${displayValue}\n`;
            });
            detailsText += '\n';
          }
          
          if (details.actionItems && Array.isArray(details.actionItems) && details.actionItems.length > 0) {
            detailsText += `### ✅ Action Items (할 일)\n\n`;
            details.actionItems.forEach((item: any) => {
              const task = strPresent(item.task) ? item.task : NO_INFO;
              const assignee = strPresent(item.assignee) ? item.assignee : "담당자 없음";
              const deadline = strPresent(item.deadline) ? item.deadline : "기한 없음";
              detailsText += `- [ ] **${task}** (담당: ${assignee}, 기한: ${deadline})\n`;
            });
            detailsText += '\n';
          }
          
          if (details.agendas && Array.isArray(details.agendas)) {
            details.agendas.forEach((agenda: any, idx: number) => {
              const agendaTitle = strPresent(agenda.title)
                ? agenda.title
                : NO_INFO;
              detailsText += `#### ${idx + 1}. ${agendaTitle}\n\n`;

              detailsText += `**논의 사항:**\n`;
              if (
                agenda.discussions &&
                Array.isArray(agenda.discussions) &&
                agenda.discussions.length > 0
              ) {
                agenda.discussions.forEach((d: string) => {
                  detailsText += `- ${d}\n`;
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
          }

          detailsText += `### 📌 메모 요약\n${
            strPresent(details.memoSummary) ? details.memoSummary : NO_INFO
          }\n\n`;
          detailsText += `### 🗓 다음 회의\n${
            strPresent(details.nextMeeting) ? details.nextMeeting : NO_INFO
          }\n\n`;
          detailsText += `### 📝 추가 노트\n${
            strPresent(details.additionalNotes)
              ? details.additionalNotes
              : NO_INFO
          }\n\n`;
        }
        
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
      
      let meetingTitle = "";
      if (details && typeof details === "object") {
        const fromTitle = details.title;
        if (fromTitle != null && String(fromTitle).trim() !== "") {
          meetingTitle = String(fromTitle).trim();
        } else if (details.meta && typeof details.meta === "object") {
          const metaTitle = (details.meta as Record<string, unknown>)["회의 제목"];
          if (metaTitle != null && String(metaTitle).trim() !== "") {
            meetingTitle = String(metaTitle).trim();
          }
        }
      }

      let venue = "";
      let attendees = "";
      let organizer = "";
      let meetingPurpose = "";
      if (
        details &&
        typeof details === "object" &&
        details.meta &&
        typeof details.meta === "object"
      ) {
        const meta = details.meta as Record<string, unknown>;
        const metaStr = (key: string) =>
          strPresent(meta[key]) ? String(meta[key]).trim() : "";
        venue = metaStr("장소");
        attendees = metaStr("참석자");
        organizer = metaStr("주최자");
        meetingPurpose = metaStr("회의 목적");
      }

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
        strPresent(transcript) ? String(transcript).trim() : "",
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
        // FastAPI 서버에 자주 쓰는 이메일 저장하는 기능은 나중에 추가할 예정입니다.
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
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-gray-50 text-gray-900 font-sans">
      {/* 1. 상단 제목 부분 */}
      <Header
        onRefresh={handleRefresh}
        onSendExternal={handleSendExternal}
        isSending={isSending}
        onRecordingHistory={() => setRecordingHistoryOpen(true)}
        clientKey={recordingClientKey}
        promptsRefreshVersion={promptListVersion}
        onActivePromptsChange={handleActivePromptsChange}
      />

      <RecordingHistoryModal
        open={recordingHistoryOpen}
        onClose={() => setRecordingHistoryOpen(false)}
        clientKey={recordingClientKey}
        refreshVersion={serverListVersion}
        memosForAi={memosForAi}
        summaryPrompt={promptSnapshot.summary}
        detailsPrompt={promptSnapshot.details}
        onBusyChange={setServerProcessing}
        onProcessed={({ transcriptBlocks, summary: nextSummary, details: nextDetails }) => {
          setRecordingHistoryOpen(false);
          setFullTranscript(transcriptBlocks);
          setSummary(nextSummary || "");
          setDetails(
            nextDetails != null
              ? withDefaultMeetingDateTime(nextDetails)
              : null
          );
          setTranscript("");
          setPipelineError(null);
          setPipelineFailureKind(null);
        }}
      />

      <main className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden p-4 md:p-6 gap-6">
        {/* 2. 왼쪽: 녹음 버튼과 메모장 부분 */}
        <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <RecordPanel 
              isRecording={isRecording}
              recordingTime={recordingTime}
              onToggleRecord={handleToggleRecord}
              memos={memos}
              onAddMemo={handleAddMemo}
              audioLevel={audioLevel}
              onAudioFileSelected={handleAudioFileSelected}
              uploadBusy={isTranscribing}
            />
            <div className="p-4 border-t border-gray-100 shrink-0">
              <p className="text-xs text-gray-500 leading-relaxed">
                녹음을 끝내거나 파일을 올리면 음성이 서버에 저장돼요. 과거
                녹음은 오른쪽 위
                <span className="font-medium text-gray-700"> 히스토리 </span>
                버튼에서 볼 수 있어요.
              </p>
            </div>
          </div>
        </div>

        {/* 3. 오른쪽: 분석(회의록) + 그 아래 이메일 */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-4">
          <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <TranscriptPanel 
              isRecording={isRecording}
              isTranscribing={isTranscribing || serverProcessing}
              transcript={transcript}
              fullTranscript={fullTranscript}
              summary={summary}
              onSummaryChange={setSummary}
              details={details}
              onDetailsChange={setDetails}
              onShareToBoard={handleShareToBoard}
              pipelineError={pipelineError}
              onRetryPipeline={
                pipelineError && pipelineFailureKind ? handleRetryPipeline : undefined
              }
              retryPipelineLabel={retryPipelineLabel}
            />
          </div>
          <div className="shrink-0 w-full">
            <EmailRecipientPanel ref={emailRecipientsRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
