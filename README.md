# 미니 게임 모음

브라우저에서 바로 즐길 수 있는 간단한 웹 게임 모음입니다.

## 배포 안내 (중요)

| 방식 | 게임 | 챗봇 |
|------|------|------|
| GitHub Pages | ✅ | Vercel API 연동 필요 |
| Vercel | ✅ | ✅ (API 키 설정 시) |

### GitHub Pages

1. GitHub 저장소 → **Settings → Pages**
2. **Source**를 **GitHub Actions**로 선택
3. `main` 브랜치 push 시 자동 배포
4. 주소: `https://srkim2196-max.github.io/vibecoding_260622/`

> GitHub Pages는 정적 파일만 제공합니다. 챗봇 API는 Vercel에서 실행됩니다.

### Vercel (챗봇 API)

1. [Vercel](https://vercel.com)에서 GitHub 저장소 연결
2. **Settings → Environment Variables** → `GEMINI_API_KEY` 추가
3. **Deployments → Redeploy** (환경 변수 추가 후 필수!)
4. 주소: `https://vibecoding-260622.vercel.app`

GitHub Pages에서 챗봇을 쓰려면 Vercel에 `GEMINI_API_KEY`가 설정되어 있어야 합니다.

## 실행 방법

```bash
# 게임만 (로컬)
npx serve .

# 게임 + 챗봇 (로컬)
npm i -g vercel
vercel dev
```

## 게임 목록

### 🪜 사다리 타기 (`ladder.html`)
### ⚡ 반응속도 테스트 (`reaction.html`)
### ✊ 가위바위보 (`rps.html`)
### ⭕ 틱택토 (`ttt.html`)
### 🃏 기억력 카드 (`memory.html`)
### 💬 게임 가이드 봇 (`chat.html`)

챗봇은 Gemini 2.5 Flash를 사용하며, API 키는 Vercel 서버에만 저장됩니다.
