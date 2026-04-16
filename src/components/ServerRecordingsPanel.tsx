"use client";

import { useCallback, useEffect, useState } from "react";
import type { TranscriptBlock } from "@/types";

export type ServerRecordingRow = {
  id: string;
  created_at: string;
  recorded_at: string | null;
  original_filename: string | null;
  mime_type: string | null;
  storage_path: string;
  /** 저장된 AI 결과가 있으면 시각 (없으면 null) */
  ai_processed_at: string | null;
};

type ServerRecordingsPanelProps = {
  clientKey: string;
  refreshVersion: number;
  memosForAi: string;
  summaryPrompt: string | null;
  detailsPrompt: string | null;
  onProcessed: (payload: {
    transcriptBlocks: TranscriptBlock[];
    summary: string;
    details: unknown;
  }) => void;
  onBusyChange?: (busy: boolean) => void;
  /** dialog: 헤더 히스토리 모달용 — 목록 영역을 넓게 */
  variant?: "inline" | "dialog";
};

export default function ServerRecordingsPanel({
  clientKey,
  refreshVersion,
  memosForAi,
  summaryPrompt,
  detailsPrompt,
  onProcessed,
  onBusyChange,
  variant = "inline",
}: ServerRecordingsPanelProps) {
  const [items, setItems] = useState<ServerRecordingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [processing, setProcessing] = useState<{
    id: string;
    kind: "load" | "analyze" | "delete";
  } | null>(null);
  /** 서버에서 받은 임시 재생 URL (같은 항목에서 '닫기'로 끔) */
  const [audioPreview, setAudioPreview] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/recordings?client_key=${encodeURIComponent(clientKey)}`
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          setDisabledReason(
            "녹음을 서버에 모아 두는 기능을 쓰려면, 먼저 서버 연결 설정이 필요해요."
          );
          setItems([]);
          return;
        }
        setError(data.error || "목록을 불러오지 못했어요.");
        return;
      }
      setDisabledReason(null);
      setItems(data.recordings || []);
    } catch {
      setError("네트워크 오류로 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [clientKey]);

  useEffect(() => {
    void load();
  }, [load, refreshVersion]);

  const handleProcess = async (id: string) => {
    setProcessing({ id, kind: "analyze" });
    onBusyChange?.(true);
    try {
      const res = await fetch(`/api/recordings/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_key: clientKey,
          memos: memosForAi,
          summaryPrompt,
          detailsPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "다시 분석하지 못했어요.");
        return;
      }
      onProcessed({
        transcriptBlocks: data.transcriptBlocks || [],
        summary: data.summary || "",
        details: data.details ?? null,
      });
      if (data.persisted === false) {
        alert(
          typeof data.persistMessage === "string"
            ? data.persistMessage
            : "분석 결과를 서버에 저장하지 못했어요. 그래서 「AI 분석 불러오기」 버튼이 켜지지 않을 수 있어요."
        );
      }
      void load();
    } catch {
      alert("다시 분석 중 오류가 났어요.");
    } finally {
      setProcessing(null);
      onBusyChange?.(false);
    }
  };

  const handleLoadCached = async (id: string) => {
    setProcessing({ id, kind: "load" });
    onBusyChange?.(true);
    try {
      const res = await fetch(
        `/api/recordings/${encodeURIComponent(id)}/result?client_key=${encodeURIComponent(clientKey)}`
      );
      const data = await res.json();
      if (!res.ok) {
        alert(
          typeof data.error === "string"
            ? data.error
            : "저장본을 불러오지 못했어요."
        );
        return;
      }
      onProcessed({
        transcriptBlocks: data.transcriptBlocks || [],
        summary: data.summary || "",
        details: data.details ?? null,
      });
    } catch {
      alert("저장해 둔 AI 분석을 불러오는 중에 오류가 났어요.");
    } finally {
      setProcessing(null);
      onBusyChange?.(false);
    }
  };

  const handleDelete = async (r: ServerRecordingRow) => {
    if (
      !confirm(
        `이 녹음을 삭제할까요?\n${r.original_filename || "녹음 파일"}\n삭제하면 복구할 수 없어요.`
      )
    ) {
      return;
    }
    setProcessing({ id: r.id, kind: "delete" });
    onBusyChange?.(true);
    try {
      const res = await fetch(
        `/api/recordings/${encodeURIComponent(r.id)}?client_key=${encodeURIComponent(clientKey)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          typeof data.error === "string"
            ? data.error
            : "삭제하지 못했어요."
        );
        return;
      }
      if (audioPreview?.id === r.id) {
        setAudioPreview(null);
      }
      void load();
    } catch {
      alert("삭제 중 오류가 났어요.");
    } finally {
      setProcessing(null);
      onBusyChange?.(false);
    }
  };

  const toggleListen = async (r: ServerRecordingRow) => {
    if (audioPreview?.id === r.id) {
      setAudioPreview(null);
      return;
    }
    setAudioLoadingId(r.id);
    try {
      const res = await fetch(
        `/api/recordings/${encodeURIComponent(r.id)}/audio?client_key=${encodeURIComponent(clientKey)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          typeof data.error === "string"
            ? data.error
            : "재생 주소를 가져오지 못했어요."
        );
        return;
      }
      if (typeof data.url !== "string" || !data.url) {
        alert("재생 주소 형식이 올바르지 않아요.");
        return;
      }
      setAudioPreview({ id: r.id, url: data.url });
    } catch {
      alert("재생 준비 중 오류가 났어요.");
    } finally {
      setAudioLoadingId(null);
    }
  };

  if (!clientKey) {
    return (
      <p className="text-xs text-gray-500">
        이 브라우저용 키를 준비하는 중이에요. 잠시 후 다시 열어 보세요.
      </p>
    );
  }

  if (disabledReason) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        {disabledReason}
      </div>
    );
  }

  const listMaxClass =
    variant === "dialog"
      ? "max-h-[min(55vh,420px)]"
      : "max-h-40";

  const shellClass =
    variant === "dialog"
      ? "rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-3"
      : "rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm";

  return (
    <div className={shellClass}>
      <div className="pb-3 border-b border-gray-200/90">
        <div className="flex items-center justify-between gap-2 mb-2">
          {variant === "inline" ? (
            <h3 className="text-sm font-medium text-gray-800">서버에 저장된 녹음</h3>
          ) : (
            <p className="text-xs text-gray-500">
              서버로 올린 녹음만 여기에 나와요.
            </p>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-gray-500 hover:text-gray-800 underline shrink-0"
            disabled={loading}
          >
            새로고침
          </button>
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">
          「AI 분석 불러오기」는{" "}
          <strong className="font-medium text-gray-700">이미 한 번 분석해서 결과가 저장된 뒤</strong>에만
          눌 수 있어요. 처음이면 같은 줄의 「AI로 분석」을 먼저 눌러 주세요.
        </p>
      </div>

      <div className="pt-3">
        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}
        {loading && items.length === 0 ? (
          <p className="text-xs text-gray-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50/90 space-y-2">
            <p className="text-xs font-medium text-gray-700">아직 여기에 보이는 녹음이 없어요.</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              여기에는 <strong className="font-medium text-gray-600">서버에 잘 올라간 녹음</strong>만
              보여요. 녹음은 끝냈는데도 비어 있으면, 올리는 도중에 문제가 난 경우가 많아요.
              확인하려면 키보드에서 <strong className="font-medium text-gray-600">F12</strong>를 눌러 개발자
              창을 연 다음, <strong className="font-medium text-gray-600">콘솔</strong> 탭에 빨간색 오류
              글씨가 있는지 봐 주세요.
            </p>
          </div>
        ) : (
        <ul className={`space-y-2 overflow-y-auto ${listMaxClass}`}>
          {items.map((r) => (
            <li
              key={r.id}
              className="border-b border-gray-100 pb-2 text-xs text-gray-700 last:border-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="min-w-0 flex-1 truncate"
                  title={r.original_filename || r.storage_path}
                >
                  {r.original_filename || "녹음 파일"}{" "}
                  <span className="text-gray-400">
                    ({new Date(r.recorded_at || r.created_at).toLocaleString("ko-KR")})
                  </span>
                </span>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    disabled={audioLoadingId === r.id}
                    onClick={() => void toggleListen(r)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    aria-expanded={audioPreview?.id === r.id}
                    aria-label={
                      audioPreview?.id === r.id
                        ? "재생 닫기"
                        : "녹음 다시 듣기"
                    }
                  >
                    {audioLoadingId === r.id
                      ? "준비 중…"
                      : audioPreview?.id === r.id
                        ? "닫기"
                        : "듣기"}
                  </button>
                  <button
                    type="button"
                    disabled={processing !== null || !r.ai_processed_at}
                    onClick={() => void handleLoadCached(r.id)}
                    title={
                      r.ai_processed_at
                        ? "저장해 둔 AI 요약·회의록을 이 화면에 다시 불러옵니다"
                        : "먼저 오른쪽 「AI로 분석」을 끝내면, 다음부터 여기서 저장된 결과를 불러올 수 있어요"
                    }
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium disabled:opacity-50 ${
                      r.ai_processed_at
                        ? "bg-gray-900 text-white"
                        : "border border-dashed border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {processing?.id === r.id && processing.kind === "load"
                      ? "불러오는 중…"
                      : "AI 분석 불러오기"}
                  </button>
                  <button
                    type="button"
                    disabled={processing !== null}
                    onClick={() => void handleProcess(r.id)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium disabled:opacity-50 ${
                      r.ai_processed_at
                        ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {processing?.id === r.id && processing.kind === "analyze"
                      ? "분석 중…"
                      : r.ai_processed_at
                        ? "다시 분석"
                        : "AI로 분석"}
                  </button>
                  <button
                    type="button"
                    disabled={processing !== null}
                    onClick={() => void handleDelete(r)}
                    title="이 녹음과 서버에 올린 파일을 삭제합니다"
                    className="rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {processing?.id === r.id && processing.kind === "delete"
                      ? "삭제 중…"
                      : "삭제"}
                  </button>
                </div>
              </div>
              {audioPreview?.id === r.id ? (
                <audio
                  key={audioPreview.url}
                  controls
                  preload="metadata"
                  className="mt-2 h-9 w-full"
                  src={audioPreview.url}
                >
                  이 브라우저에서는 오디오를 재생할 수 없어요.
                </audio>
              ) : null}
            </li>
          ))}
        </ul>
        )}
      </div>
    </div>
  );
}
