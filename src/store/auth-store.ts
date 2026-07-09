"use client";

import { create } from "zustand";
import {
  clearAuthSession,
  getAuthCookieToken,
  hasAuthCookie,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from "@/lib/auth-session";

type AuthState = {
  userId: number | null;
  email: string | null;
  nickname: string | null;
  accessToken: string | null;
  isHydrated: boolean;
  isLoggedIn: boolean;
  hydrate: () => void;
  hydrateAsync: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  nickname: null,
  accessToken: null,
  isHydrated: false,
  isLoggedIn: false,

  hydrate: () => {
    // 동기 복구: localStorage + 쿠키가 둘 다 있을 때
    const session = readAuthSession();
    if (session && hasAuthCookie()) {
      set({
        userId: session.userId,
        email: session.email,
        nickname: session.nickname,
        accessToken: session.accessToken,
        isLoggedIn: true,
        isHydrated: true,
      });
    } else {
      set({
        userId: null,
        email: null,
        nickname: null,
        accessToken: null,
        isLoggedIn: false,
        isHydrated: true,
      });
    }
  },

  hydrateAsync: async () => {
    const session = readAuthSession();
    if (session && hasAuthCookie()) {
      set({
        userId: session.userId,
        email: session.email,
        nickname: session.nickname,
        accessToken: session.accessToken,
        isLoggedIn: true,
        isHydrated: true,
      });
      return;
    }

    // 서버(HTTPS)에서 쿠키만 남은 경우: /api/me 로 닉네임·이메일을 다시 채움
    const cookieToken = getAuthCookieToken();
    if (!cookieToken) {
      set({
        userId: null,
        email: null,
        nickname: null,
        accessToken: null,
        isLoggedIn: false,
        isHydrated: true,
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/me`, {
        headers: { Authorization: `Bearer ${cookieToken}` },
      });
      if (!res.ok) {
        clearAuthSession();
        set({
          userId: null,
          email: null,
          nickname: null,
          accessToken: null,
          isLoggedIn: false,
          isHydrated: true,
        });
        return;
      }

      const data = (await res.json()) as {
        user_id: number;
        email: string;
        nickname?: string | null;
      };

      const restored: AuthSession = {
        accessToken: cookieToken,
        userId: data.user_id,
        email: data.email,
        nickname: data.nickname ?? null,
      };
      saveAuthSession(restored);
      set({
        userId: restored.userId,
        email: restored.email,
        nickname: restored.nickname,
        accessToken: restored.accessToken,
        isLoggedIn: true,
        isHydrated: true,
      });
    } catch {
      set({
        userId: null,
        email: null,
        nickname: null,
        accessToken: null,
        isLoggedIn: false,
        isHydrated: true,
      });
    }
  },

  setSession: (session) => {
    saveAuthSession(session);
    set({
      userId: session.userId,
      email: session.email,
      nickname: session.nickname,
      accessToken: session.accessToken,
      isLoggedIn: true,
      isHydrated: true,
    });
  },

  clearSession: () => {
    clearAuthSession();
    set({
      userId: null,
      email: null,
      nickname: null,
      accessToken: null,
      isLoggedIn: false,
      isHydrated: true,
    });
  },
}));
