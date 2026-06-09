"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

/** 앱 시작 시 localStorage → Zustand 스토어 동기화 */
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}
