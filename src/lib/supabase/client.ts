// Supabase 클라이언트를 더 이상 사용하지 않으므로, 빈 객체를 반환하거나 에러를 방지하는 가짜 함수로 바꿉니다.
export function createClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    }
  } as any;
}
