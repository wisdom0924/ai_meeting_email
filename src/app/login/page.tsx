import { Suspense } from "react";
import AuthPanel from "@/components/AuthPanel";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Suspense
        fallback={
          <div className="h-48 w-full max-w-md animate-pulse rounded-2xl bg-gray-200" />
        }
      >
        <AuthPanel />
      </Suspense>
      <p className="mt-8 max-w-md text-center text-xs text-gray-400">
        로그인하면 회의 녹음·요약 기능을 이용할 수 있어요.
      </p>
    </div>
  );
}
