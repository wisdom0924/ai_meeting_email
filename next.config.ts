import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 미들웨어가 있는 요청은 기본 10MB까지만 본문을 넘깁니다.
  // 큰 녹음/오디오 업로드 시 FormData 파싱 오류를 막기 위해 상한을 올립니다.
  // 배포 환경(Vercel 등)은 플랫폼별로 별도 제한이 있을 수 있음.
  experimental: {
    proxyClientMaxBodySize: "1gb",
  },
};

export default nextConfig;
