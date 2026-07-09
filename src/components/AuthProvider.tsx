"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

/** 앱 시작 시 localStorage/쿠키 → Zustand 스토어 동기화 */
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrateAsync = useAuthStore((s) => s.hydrateAsync);

  useEffect(() => {
    void hydrateAsync();
  }, [hydrateAsync]);

  return children;
}
