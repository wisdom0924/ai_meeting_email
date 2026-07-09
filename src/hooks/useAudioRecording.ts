"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Memo } from "@/types";
import type { AudioJobOptions } from "@/hooks/useMeetingPipeline";

type UseAudioRecordingOptions = {
  processAudioBlob: (opts: AudioJobOptions) => Promise<void>;
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  onRecordingStart: () => void;
  onMicError?: (message: string) => void;
};

export function useAudioRecording({
  processAudioBlob,
  setMemos,
  onRecordingStart,
  onMicError,
}: UseAudioRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<string | null>(null);

  const handleToggleRecord = useCallback(async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordingStartedAtRef.current = new Date().toISOString();

        const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
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
        onRecordingStart();

        const now = new Date();
        setMemos((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "🔴 녹음이 시작되었습니다.",
            time: now.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: "system",
          },
        ]);
      } catch (error) {
        recordingStartedAtRef.current = null;
        console.error("마이크 접근 실패:", error);

        // 브라우저는 localhost / HTTPS 에서만 마이크를 허용합니다.
        // http://IP주소 로 접속하면 보안상 막힙니다.
        if (
          typeof window !== "undefined" &&
          (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        ) {
          onMicError?.(
            "이 주소에서는 마이크를 쓸 수 없어요. 브라우저는 안전한 연결(HTTPS) 또는 내 컴퓨터(localhost)에서만 녹음을 허용합니다. 지금은 http://IP주소 로 접속 중이라 막혀 있어요. HTTPS로 접속하거나, 로컬에서 쓰거나, 이미 녹음한 파일을 올려 주세요."
          );
          return;
        }

        onMicError?.(
          "마이크를 사용할 수 없거나 접근 권한이 없습니다. 브라우저 주소창 왼쪽의 자물쇠/사이트 설정에서 마이크 권한을 허용해 주세요."
        );
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(0);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
    }
  }, [isRecording, onMicError, onRecordingStart, processAudioBlob, setMemos]);

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

  return {
    isRecording,
    recordingTime,
    audioLevel,
    handleToggleRecord,
  };
}
