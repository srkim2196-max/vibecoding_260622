# 미니 게임 모음

브라우저에서 바로 즐길 수 있는 간단한 웹 게임 모음입니다.

## 배포 안내

| 방식 | 게임 | 챗봇 | 기록 저장 |
|------|------|------|-----------|
| GitHub Pages | ✅ | Vercel API | Supabase (Vercel API) |
| Vercel | ✅ | ✅ | ✅ |

### Vercel 환경 변수

| 이름 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio API 키 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (서버 전용) |

### Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. **SQL Editor**에서 `supabase/schema.sql` 실행
3. **Settings → API**에서 URL과 `service_role` 키 복사
4. Vercel 환경 변수에 추가 후 **Redeploy**

게임 기록은 `players`(통합 통계)와 `game_records`(플레이 이력) 테이블에 저장됩니다.

## 실행 방법

```bash
npm install
npx serve .          # 게임만
vercel dev           # API + Supabase 연동 테스트
```

## 주요 페이지

- `index.html` — 게임 목록
- `profile.html` — 기록 · 챌린지 · 배지 (Supabase 동기화)
- `chat.html` — AI 게임 가이드

## 게임 목록

🪜 사다리 · ⚡ 반응속도 · ✊ 가위바위보 · ⭕ 틱택토 · 🃏 기억력 · 🔢 숫자 맞추기 · 💬 가이드 봇 · 🏆 프로필
