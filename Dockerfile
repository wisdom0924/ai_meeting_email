# 프론트엔드(Next.js) 포장 설명서
FROM node:20-alpine

# pnpm 설치
RUN corepack enable pnpm

# 작업할 폴더 만들기
WORKDIR /app

# 필요한 도구 목록 복사하고 설치하기
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 나머지 코드 모두 복사하기
COPY . .

# 빌드하고 실행하기
RUN pnpm run build
CMD ["pnpm", "run", "start"]
