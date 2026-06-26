# 프론트엔드(Next.js) 포장 설명서
# pnpm 11.3.0 이상은 Node.js 22.13 이상이 필요하므로 node 버전을 22로 올립니다.
FROM node:22-alpine

# pnpm 설치
RUN corepack enable pnpm

# 작업할 폴더 만들기
WORKDIR /app

# 환경 변수 설정 (pnpm 모듈 삭제 시 TTY 오류 방지)
ENV CI=true

# 필요한 도구 목록 복사하고 설치하기
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-scripts

# 나머지 코드 모두 복사하기
COPY . .

# 배포 시 API 주소 (빌드 시점에 Next.js에 박힘)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 빌드하고 실행하기
RUN pnpm run build
CMD ["pnpm", "run", "start"]
