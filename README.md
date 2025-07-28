# 타이포 블루 - 기여자 가이드

**타이포 블루**는 Next.js로 구축된 현대적인 블로그 플랫폼으로, 한국 사용자를 위해 설계되었습니다. 다중 테넌트 블로그 관리, 리치 텍스트 편집, 이메일 구독, 깔끔한 관리자 인터페이스를 제공합니다.

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [개발 가이드](#개발-가이드)
- [기여하기](#기여하기)
- [코드 스타일](#코드-스타일)
- [테스트](#테스트)
- [배포](#배포)

## 프로젝트 개요

타이포 블루는 사용자가 다음과 같은 기능을 사용할 수 있는 완전한 기능의 블로그 플랫폼입니다:

- 여러 블로그 생성 및 관리 (사용자당 최대 3개)
- 리치 텍스트 편집기로 블로그 포스트 작성 및 발행
- 메일링 리스트 관리 및 이메일 알림 발송
- 블로그 설정 및 모양 사용자 정의
- Atom 피드로 블로그 콘텐츠 내보내기
- 블로그 관리를 위한 관리자 대시보드

### 주요 기능

- **다중 테넌트 아키텍처**: 각 사용자가 여러 블로그를 가질 수 있음
- **리치 텍스트 편집기**: 포맷팅 도구가 있는 TipTap 기반 편집기
- **이메일 시스템**: 구독 및 알림을 위한 Mailgun 통합
- **세션 기반 인증**: 이메일 인증을 통한 안전한 로그인
- **관리자 인터페이스**: 블로그 관리를 위한 전용 관리자 패널
- **반응형 디자인**: 다크 모드를 지원하는 모바일 친화적 인터페이스
- **한국어 지원**: 한국어 기본 인터페이스

## 기술 스택

### 프론트엔드
- **Next.js 15** - App Router를 사용한 React 프레임워크
- **TypeScript** - 타입 안정성과 향상된 개발 경험
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **shadcn/ui** - Radix UI 기반의 현대적인 UI 컴포넌트
- **TipTap** - 리치 텍스트 편집기
- **Lucide React** - 아이콘 라이브러리

### 백엔드
- **Next.js Server Actions** - API 레이어
- **PostgreSQL** - 주 데이터베이스
- **Drizzle ORM** - 타입 안전 데이터베이스 쿼리
- **Argon2** - 비밀번호 해싱
- **Mailgun** - 이메일 서비스 통합

### 개발 도구
- **TypeScript** - 타입 체크
- **ESLint** - 코드 린팅
- **Tailwind CSS** - 스타일링
- **Drizzle Kit** - 데이터베이스 마이그레이션

## 시작하기

### 필수 조건

- Node.js 18+ 
- npm 또는 yarn
- PostgreSQL 데이터베이스
- Mailgun 계정 (이메일 기능용)

### 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/yangnaru/typo-blue.git
   cd typo-blue
   ```

2. **종속성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   
   루트 디렉터리에 `.env.local` 파일을 생성하세요:
   ```env
   # 데이터베이스
   DATABASE_URL="postgresql://username:password@localhost:5432/typo_blue"
   
   # 이메일 서비스 (Mailgun)
   MAILGUN_API_KEY="your-mailgun-api-key"
   MAILGUN_DOMAIN="your-mailgun-domain"
   EMAIL_FROM="noreply@yourdomain.com"
   
   # 애플리케이션
   NEXT_PUBLIC_URL="http://localhost:3000"
   SESSION_COOKIE_DOMAIN="localhost"
   
   # 관리자
   ADMIN_USER_ID="admin-user-uuid"
   ```

4. **데이터베이스 설정**
   ```bash
   # 마이그레이션 생성 및 실행
   npm run db:generate
   npm run db:migrate
   ```

5. **개발 서버 시작**
   ```bash
   npm run dev
   ```

6. **브라우저에서 확인**
   
   [http://localhost:3000](http://localhost:3000)을 방문하여 애플리케이션을 확인하세요.

### 데이터베이스 명령어

```bash
# 새 마이그레이션 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate

# Drizzle Studio 열기 (데이터베이스 GUI)
npm run db:studio
```

## 프로젝트 구조

```
typo-blue/
├── app/                    # Next.js App Router
│   ├── (admin)/           # 관리자 대시보드 라우트
│   ├── (embed)/           # 임베드 가능한 콘텐츠
│   ├── (main)/            # 메인 애플리케이션 라우트
│   └── admin/             # 슈퍼 관리자 기능
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── PostEditor.tsx    # 블로그 포스트 편집기
│   ├── Tiptap.tsx        # 리치 텍스트 편집기
│   └── ...
├── lib/                   # 핵심 비즈니스 로직
│   ├── actions/          # 서버 액션
│   ├── auth.ts           # 인증 시스템
│   ├── db.ts             # 데이터베이스 설정
│   ├── paths.ts          # 라우트 정의
│   └── utils.ts          # 유틸리티 함수
├── drizzle/              # 데이터베이스 스키마 및 마이그레이션
│   ├── schema.ts         # 데이터베이스 스키마
│   ├── relations.ts      # ORM 관계
│   └── migrations/       # SQL 마이그레이션
└── public/               # 정적 자산
```

### 주요 디렉터리

- **`/app`** - 다양한 레이아웃을 위한 라우트 그룹이 있는 Next.js App Router
- **`/components`** - 재사용 가능한 React 컴포넌트와 UI 요소
- **`/lib`** - 비즈니스 로직, 유틸리티, 서버 액션
- **`/drizzle`** - 데이터베이스 스키마, 관계, 마이그레이션

## 데이터베이스 스키마

애플리케이션은 다음 핵심 테이블을 가진 PostgreSQL을 사용합니다:

### 핵심 테이블
- **`user`** - 사용자 계정 및 인증
- **`blog`** - 개별 블로그 (사용자당 최대 3개)
- **`post`** - 발행 상태가 있는 블로그 포스트
- **`session`** - 사용자 세션
- **`mailingListSubscription`** - 이메일 구독
- **`postEmailSent`** - 이메일 발송 추적
- **`emailVerificationChallenge`** - 이메일 인증 코드

### 주요 관계
- 사용자 → 블로그 (1:다, 최대 3개)
- 블로그 → 포스트 (1:다)
- 블로그 → 메일링 리스트 구독 (1:다)
- 포스트 → 이메일 발송 기록 (1:1)

## 개발 가이드

### 서버 액션

애플리케이션은 전통적인 API 라우트 대신 Next.js Server Actions를 사용합니다. 주요 액션은 `/lib/actions/`에 위치합니다:

- **`blog.ts`** - 블로그 및 포스트 관리
- **`account.ts`** - 사용자 인증 및 계정 관리
- **`mailing-list.ts`** - 이메일 구독 관리
- **`admin.ts`** - 관리자 기능

### 인증

앱은 다음과 같은 세션 기반 인증을 사용합니다:
- 비밀번호 없는 로그인을 위한 이메일 인증
- 데이터베이스에 저장된 세션 토큰
- 자동 갱신이 있는 30일 세션 만료
- Origin 헤더 검증을 통한 CSRF 보호

### 이메일 시스템

이메일 기능은 Mailgun을 통해 처리됩니다:
- **구독**: 사용자는 블로그 업데이트를 구독할 수 있음
- **수동 발송**: 작성자가 수동으로 이메일 발송을 트리거
- **템플릿**: HTML 및 텍스트 버전의 이메일
- **구독 해지**: 토큰 기반 구독 해지 시스템

### 리치 텍스트 편집

포스트는 다음 기능을 가진 TipTap 편집기를 사용합니다:
- 타이포그래피 확장
- 링크 관리
- HTML 새니타이제이션
- 확장 가능한 도구모음

## 기여하기

기여를 환영합니다! 다음 가이드라인을 따라주세요:

### 시작하기

1. **저장소 포크**
2. **기능 브랜치 생성**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **변경사항 적용**
4. **변경사항 테스트**
5. **풀 리퀘스트 제출**

### 풀 리퀘스트 프로세스

1. **코드가 스타일 가이드를 따르는지 확인**
2. **새로운 기능에 대한 테스트 추가**
3. **필요한 경우 문서 업데이트**
4. **모든 테스트 통과 확인**
5. **명확한 설명과 함께 PR 제출**

### 커밋 메시지 형식

명확하고 설명적인 커밋 메시지를 사용하세요:
```
feat: 이메일 구독 관리 기능 추가
fix: 포스트 발행 문제 해결
docs: 설치 가이드로 README 업데이트
refactor: 데이터베이스 쿼리 성능 개선
```

## 코드 스타일

### TypeScript

- 엄격한 TypeScript 설정 사용
- 모든 함수와 컴포넌트에 적절한 타입 정의
- 절대 필요한 경우가 아니면 `any` 타입 사용 금지
- 객체 타입에는 interface, 유니온에는 type 사용

### React 컴포넌트

- 훅을 사용한 함수형 컴포넌트 사용
- 적절한 에러 바운더리 구현
- prop 타입에 TypeScript 사용
- React 베스트 프랙티스 준수

### 스타일링

- 스타일링에 Tailwind CSS 사용
- 기존 컴포넌트 패턴 준수
- 가능한 경우 shadcn/ui 컴포넌트 사용
- 반응형 디자인 원칙 유지

### 데이터베이스

- 모든 데이터베이스 작업에 Drizzle ORM 사용
- TypeScript 타입으로 적절한 스키마 정의
- 다단계 작업에 트랜잭션 사용
- 데이터베이스 네이밍 컨벤션 준수

## 테스트

### 테스트 실행

```bash
# 린팅 실행
npm run lint

# 타입 체크
npm run build

# 개발 서버
npm run dev
```

### 테스트 가이드라인

- 모든 서버 액션 테스트
- 컴포넌트 렌더링 테스트
- 인증 플로우 테스트
- 데이터베이스 작업 테스트
- 이메일 기능 테스트 (모킹 사용)

## 배포

### 환경 설정

1. **데이터베이스**: PostgreSQL 데이터베이스 설정
2. **이메일 서비스**: Mailgun 계정 설정
3. **환경 변수**: 모든 필수 변수 설정
4. **마이그레이션**: 데이터베이스 마이그레이션 실행

### 빌드 프로세스

```bash
# 애플리케이션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

### 배포 플랫폼

다음 플랫폼에 애플리케이션을 배포할 수 있습니다:
- **Vercel** (Next.js 권장)
- **Railway** (PostgreSQL 포함)
- **Docker** (컨테이너화된 배포)
- **VPS** (pm2 또는 유사 도구 사용)

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | 예 |
| `MAILGUN_API_KEY` | Mailgun API 키 | 예 |
| `MAILGUN_DOMAIN` | Mailgun 도메인 | 예 |
| `EMAIL_FROM` | 발신 이메일 주소 | 예 |
| `NEXT_PUBLIC_URL` | 애플리케이션 공개 URL | 예 |
| `SESSION_COOKIE_DOMAIN` | 세션용 쿠키 도메인 | 예 |
| `ADMIN_USER_ID` | 관리자 사용자 ID | 선택 |

## 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm run build` | 프로덕션용 빌드 |
| `npm run start` | 프로덕션 서버 시작 |
| `npm run lint` | ESLint 실행 |

## 지원

문제가 발생하거나 질문이 있으면:

1. **GitHub 저장소**에서 기존 이슈 확인
2. **문서 검색**으로 일반적인 문제 해결
3. **상세한 설명과 함께 이슈 생성**
4. **커뮤니티 토론 참여**

## 라이선스

이 프로젝트는 AGPLv3 라이선스 하에 라이선스가 부여됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.

---

**즐거운 코딩!** 🚀

자세한 정보는 [프로젝트 저장소](https://github.com/yangnaru/typo-blue)를 방문하세요.