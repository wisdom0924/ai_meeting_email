"use client";

import { create } from "zustand";
import {
  clearAuthSession,
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
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  nickname: null,
  accessToken: null,
  isHydrated: false,
  isLoggedIn: false,

  hydrate: () => {
    // localStorage + 쿠키 둘 다 있을 때만 로그인 (헤더·글쓰기 버튼과 동일 기준)
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
