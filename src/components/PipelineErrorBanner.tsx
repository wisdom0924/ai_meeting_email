"use client";

type PipelineErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
};

export default function PipelineErrorBanner({
  message,
  onRetry,
  retryLabel = "다시 시도",
  retrying = false,
}: PipelineErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
    >
      <p className="leading-relaxed">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {retrying ? "처리 중…" : retryLabel}
        </button>
      ) : null}
    </div>
  );
}
