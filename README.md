# 나만의 AI 회의록 에이전트 (AI Meeting Minutes)

## 1. 프로젝트 소개

회의할 때 **마이크로 말한 내용을 글자로 바꾸고**, AI가 **짧은 요약**과 **자세한 회의록**까지 만들어 주는 웹사이트입니다.

긴 회의를 다시 듣거나 정리하는 시간을 줄이고, 회의 중에는 **메모**도 같이 남길 수 있어서 “회의 내용 + 내가 적은 메모”를 한꺼번에 AI에게 넘길 수 있습니다. 
**회원가입/로그인**을 지원하여 사용자별로 데이터를 안전하게 저장하고 다시 볼 수 있으며, **오디오 파일 업로드** 및 요약된 회의록의 **이메일 전송** 기능도 추가되었습니다.

👉 처음 보는 사람이 “이거 뭐야?”를 해결합니다.

---

## 2. 사용 방법 안내

### 필요한 것

- **Node.js**가 설치된 컴퓨터
- **pnpm** (패키지 설치 도구)
- **AssemblyAI** API 키 (음성 → 글자)
- **Google Gemini** API 키 (요약·회의록)
- **MySQL** 데이터베이스 (로컬 설치 또는 클라우드)
- **Python 3.9+** (백엔드 실행용)

### 설치

프로젝트 폴더에서 아래를 실행합니다.

```bash
pnpm install
```

### 환경 변수 (.env) — 로컬 vs 서버

**같은 코드**를 쓰고, **`.env`만 환경마다 다르게** 두면 됩니다.  
`.env` 파일은 GitHub에 올리지 마세요.

#### 로컬용 — 프로젝트 맨 위 `.env`

프로젝트 최상위 폴더에 `.env` 파일을 만듭니다.

```env
# AI API
ASSEMBLY_API_KEY=여기에_AssemblyAI_키
GEMINI_API_KEY=여기에_Gemini_키

# 로컬 API 주소 (반드시 localhost)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Docker Compose로 한 번에 실행할 때 (방법 A)
MYSQL_ROOT_PASSWORD=로컬_DB_비밀번호
JWT_SECRET_KEY=아무도_모르는_긴_문자열

# 이메일 인증 (Gmail + 앱 비밀번호 16자리)
SMTP_EMAIL=본인@gmail.com
SMTP_PASSWORD=구글_앱_비밀번호
```

#### 로컬용 — `backend/.env` (방법 B: 백엔드만 따로 켤 때)

```env
DATABASE_URL=mysql+pymysql://root:로컬_DB_비밀번호@localhost:3306/ai_meeting
SMTP_EMAIL=본인@gmail.com
SMTP_PASSWORD=구글_앱_비밀번호
```

#### 서버용 — Oracle 서버 `~/ai_meeting_email/.env`

로컬 `.env`와 **거의 같지만**, API 주소만 **서버 IP**로 바꿉니다.

```env
NEXT_PUBLIC_API_URL=http://서버공인IP:8000
```

> ⚠️ 서버 IP(예: `132.145.122.224`)를 **집 PC `.env`에 넣으면** 로컬 테스트가 깨집니다.

---

### 실행 방법 비교

| | **로컬 (내 PC)** | **서버 (Oracle Cloud)** |
|--|------------------|-------------------------|
| **목적** | 개발·테스트 | 과제 제출·24시간 공개 |
| **접속 주소** | http://localhost:3000 | http://서버IP:3000 |
| **API 문서** | http://localhost:8000/docs | http://서버IP:8000/docs |
| **`.env` API URL** | `http://localhost:8000` | `http://서버IP:8000` |
| **DB 확인** | DBeaver → localhost | DBeaver → SSH 터널 또는 포트 3306 |

---

### 🏠 로컬에서 실행하기

#### 로컬 동작 확인 체크리스트

```
[ ] pnpm install 완료
[ ] .env 파일 준비 (위 내용)
[ ] Docker Desktop 실행 (방법 A·B 공통)
[ ] http://localhost:3000 접속
[ ] http://localhost:8000/docs 접속
[ ] 회원가입 → 이메일 인증 → 로그인
```

#### 방법 A: Docker로 한 번에 실행 (로컬 테스트 추천)

코드 수정 없이 **서버와 같은 방식**으로 돌려볼 때 좋습니다.

1. **Docker Desktop** 실행
2. 프로젝트 맨 위 `.env`에 `NEXT_PUBLIC_API_URL=http://localhost:8000` 확인
3. 터미널(프로젝트 최상위):

```bash
pnpm install
docker compose up -d --build
```

4. 브라우저: **http://localhost:3000**  
5. API 문서: **http://localhost:8000/docs**  
6. 종료: `docker compose down`

#### 방법 B: 개발용 — 프론트·백엔드 따로 실행

화면 코드를 수정하면서 **바로바로** 볼 때 사용합니다.

**0. MySQL만 Docker로 켜기** (로컬에 MySQL이 없을 때)

```bash
docker compose up -d db
```

**1. 백엔드 (첫 번째 터미널)**

```bash
cd backend
# Windows Git Bash
source venv/Scripts/activate
# Mac/Linux
# source venv/bin/activate

uvicorn main:app --reload
```

→ http://localhost:8000/docs

**2. 프론트엔드 (두 번째 터미널, 프로젝트 최상위)**

```bash
pnpm run dev
```

→ http://localhost:3000

> 서버는 사용자 PC에서 직접 실행해 주세요. (Cursor가 대신 켜지 않습니다.)

#### 로컬 DB 확인 (DBeaver)

| 항목 | 값 |
|------|-----|
| Host | `localhost` |
| Port | `3306` |
| Database | `ai_meeting` |
| User | `root` |
| Password | `.env`의 `MYSQL_ROOT_PASSWORD` 또는 `backend/.env`의 DB 비밀번호 |

`users` 테이블에서 `is_active=1`이면 이메일 인증 완료입니다.

---

### ☁️ 서버(Oracle Cloud)에서 실행하기

#### 사전 준비 (최초 1회)

1. Oracle Cloud VM 생성 + Public IP
2. Security List: 포트 **22, 3000, 8000** 개방
3. SSH 키 저장 후 서버 접속
4. Docker 설치, `git clone`, 서버 `.env` 작성
5. (권장) swap 2G 추가 — 무료 서버는 빌드가 느림

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 서버 배포 명령 (SSH 접속 후)

```bash
cd ~/ai_meeting_email

# 백엔드·프론트를 나눠 빌드 (동시 빌드는 서버가 멈출 수 있음)
docker compose build backend
docker compose build frontend
docker compose up -d

docker compose ps
```

#### 서버 접속 주소 (예시)

| 용도 | URL |
|------|-----|
| 웹사이트 | http://132.145.122.224:3000 |
| Swagger | http://132.145.122.224:8000/docs |

#### 서버 `.env` 수정 후 반영

```bash
nano ~/ai_meeting_email/.env
docker compose up -d --build backend   # 백엔드 설정 변경 시
docker compose build frontend && docker compose up -d frontend  # API URL 변경 시
```

#### 서버 DB 확인 (DBeaver, SSH 터널 추천)

- **SSH**: Host `서버IP`, User `ubuntu`, Private Key `.key` 파일  
- **MySQL**: Host `127.0.0.1`, Port `3306`, DB `ai_meeting`, User `root`  
- Password: 서버 `.env`의 `MYSQL_ROOT_PASSWORD`

---

### 이메일 인증 참고

- Gmail **앱 비밀번호**(16자리)가 없으면 메일이 안 갑니다.
- SMTP 실패 시 서버 로그: `docker compose logs backend --tail 30`
- 인증 링크는 `.env`의 `NEXT_PUBLIC_API_URL` 기준으로 생성됩니다.
  - 로컬: `http://localhost:8000/api/verify-email?token=...`
  - 서버: `http://서버IP:8000/api/verify-email?token=...`

👉 “어떻게 실행하지?”를 해결합니다.

---

## 3. 기능 설명

| 기능 | 설명 |
|------|------|
| **회원가입/로그인 및 이메일 인증** | 자체 데이터베이스(MySQL)를 이용해 안전하게 가입하고 로그인할 수 있습니다. 가입 시 **이메일 인증**을 거쳐야만 로그인이 가능하여 보안이 강화되었습니다. |
| **녹음 및 파일 업로드** | 브라우저 마이크로 직접 녹음하거나, 기존의 오디오 파일을 업로드하여 AI 분석을 할 수 있습니다. |
| **라이브 메모** | 회의 중 짧은 메모를 적고 전송할 수 있습니다. **Enter**로 보내고, **Shift+Enter**는 줄 바꿈입니다. |
| **음성 → 글자 (STT)** | 녹음을 **멈춘 뒤** AssemblyAI로 한국어 인식합니다. |
| **요약 및 상세 회의록** | Gemini를 통해 전사본과 메모를 바탕으로 짧은 요약과 상세한 회의록 구조를 생성합니다. 직접 수정도 가능합니다. |
| **클라우드 히스토리** | 완성된 회의록과 녹음 파일은 자체 서버(FastAPI)와 데이터베이스에 안전하게 저장되며, 언제든 다시 불러올 수 있습니다. |
| **이메일 및 외부 전송** | 이메일로 요약 내용을 간편하게 공유할 수 있으며 (자주 쓰는 메일 자동완성), Make.com 웹훅 연동도 지원합니다. |
| **AI 프롬프트 설정** | 상단 톱니바퀴에서 요약 및 상세 지시문을 변경하고 저장할 수 있습니다. |

👉 “뭘 할 수 있지?”를 해결합니다.

---

## 4. 개발자용 정보

### 기술 스택

- **프론트엔드 (화면)**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **백엔드 (서버)**: FastAPI (Python)
- **데이터베이스 (창고)**: MySQL
- **인프라 및 배포**: Docker, Oracle Cloud, GitHub Actions
- **AI API**: AssemblyAI (음성 인식), Google Gemini (요약)

### 주요 폴더 구조 (요약)

```
src/
  app/
    page.tsx                 # 메인 화면·녹음·업로드 로직
    layout.tsx
    api/
      assemblyai/transcribe/ # 오디오 → 텍스트
      gemini/analyze/        # 텍스트+메모 → 요약·상세 JSON
  components/
    Header.tsx               # 프롬프트 설정, 외부 전송 등
    RecordPanel.tsx          # 녹음·메모 UI
    TranscriptPanel.tsx      # 전사 / 요약 / 상세 화면
  lib/prompts.ts             # 기본 AI 프롬프트
```

### 환경 변수 파일 정리

| 파일 | 어디서 쓰나 |
|------|-------------|
| 프로젝트 맨 위 `.env` | 로컬 Docker / `pnpm run dev` (AI 키, API URL) |
| `backend/.env` | 로컬에서 백엔드만 `uvicorn` 실행할 때 |
| 서버 `~/ai_meeting_email/.env` | Oracle 배포 (Git에 올리지 않음) |

### 배포

로컬·서버 모두 **Docker Compose**를 사용합니다. 자세한 순서는 **「2. 사용 방법 안내」** 를 참고하세요.

```bash
# 로컬 또는 서버 (프로젝트 최상위)
docker compose up -d --build
```

서버(Oracle Cloud)는 RAM이 작아 **`docker compose build backend` → `build frontend` → `up -d`** 순서를 권장합니다.

### API 문서 (API 설명서 📖)

백엔드 서버(FastAPI)가 켜진 상태에서 아래 주소로 들어가면, 서버가 어떤 기능들을 제공하는지 한눈에 볼 수 있는 **API 설명서(Swagger)** 가 나옵니다.
어떤 주소로 요청을 보내야 하는지, 어떤 데이터를 주고받는지 마우스로 클릭해가며 쉽게 테스트해 볼 수 있어요! (마치 식당 메뉴판 같아요 🍔)

- **설명서 주소**: [http://localhost:8000/docs](http://localhost:8000/docs)
- (서버를 켠 상태에서 브라우저 주소창에 위 주소를 붙여넣으시면 됩니다!)

👉 협업할 때 필수 정보입니다.

---

## 5. 기여 방법 (옵션)

- 이슈·PR은 프로젝트 규칙에 맞게 제목과 설명을 명확히 적어 주세요.
- 브랜치 전략은 팀에 맞게 정하면 됩니다.

---

## 6. 기타

- **라이선스**: 저장소 정책에 따릅니다.
- **문의**: 저장소 관리자 또는 이슈 트래커를 이용해 주세요.
- **업데이트 로그**
  - **v1.4.0**: 로컬/서버 실행 가이드 정리, `.env` 환경별 분리, 배포용 API URL·DB 연결 보완
  - **v1.3.0**: 회원가입 시 이메일 인증 프로세스 추가 및 로딩 UI(모래시계) 개선
  - **v1.2.0**: 아키텍처 전면 개편 (Next.js 풀스택 → Next.js + FastAPI + MySQL + Docker)
  - 자체 데이터베이스(MySQL) 구축 및 연동
  - Docker Compose를 이용한 원클릭 실행 환경 구성
