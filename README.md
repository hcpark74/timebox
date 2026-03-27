# Timebox Flow

간단한 타임박싱 방식으로 하루 일정을 정리하는 스케줄 관리 PWA입니다.
Vanilla HTML, CSS, JavaScript만으로 구성된 정적 웹앱이며, 로컬 저장소를 기본으로 사용하고 Cloudflare Pages Functions + KV를 붙이면 기기 간 동기화도 가능합니다.

## 목차

- [주요 기능](#주요-기능)
- [현재 구현 범위](#현재-구현-범위)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [로컬 실행](#로컬-실행)
- [Cloudflare Pages 배포](#cloudflare-pages-배포)
- [PWA 설치](#pwa-설치)
- [데이터 저장 방식](#데이터-저장-방식)
- [라이선스](#라이선스)

## 주요 기능

- 주간 캘린더에서 날짜 선택
- 선택한 날짜 기준 일정 목록 확인
- `오늘의 핵심` / `할 일 목록`으로 태스크 분류
- 새 태스크 추가 및 삭제
- 드래그 앤 드롭으로 우선순위 이동
- 시간 슬롯에 태스크를 드롭해 일정 배정
- 타임라인에서 완료 상태 토글
- 프로필 화면에서 카테고리별 태스크 수 확인
- 서비스 워커 기반 기본 오프라인 셸 지원

## 현재 구현 범위

현재 앱에 실제로 구현된 화면은 다음과 같습니다.

- `오늘 일정`: 하루 타임라인과 완료 체크
- `캘린더`: 주간 날짜 선택과 일정 목록
- `할 일 정리`: 오늘의 핵심/할 일 목록 관리, 태스크 추가
- `시간 배치`: 드래그 앤 드롭 스케줄링
- `내 정보`: 동기화 ID 표시, 카테고리별 태스크 수

참고:

- 하단 탭의 `검색 예정` 영역은 UI만 있으며 기능은 아직 구현되지 않았습니다.
- 통계용 API는 존재하지만, 프런트 화면에서 별도 대시보드로 표시되지는 않습니다.

## 기술 스택

- Frontend: Vanilla HTML5, CSS3, JavaScript (ES6+)
- Drag & Drop: SortableJS CDN
- Icons: Font Awesome 6
- Fonts: Inter
- Storage: Local Storage
- Optional backend: Cloudflare Pages Functions + KV

## 프로젝트 구조

```text
/
|- index.html                # SPA 형태의 메인 마크업
|- manifest.json             # PWA 설정
|- sw.js                     # 서비스 워커
|- README.md
|- assets/
|  |- favicon.svg
|  `- profile.svg
|- css/
|  `- style.css              # 메인 스타일
|- docs/
|  |- MANUAL.md              # 사용자용 안내 문서
|  |- TERMS.md               # 표준 용어집
|  |- PRD.md                 # 제품 요구사항 문서
|  |- MVP.md                 # MVP 범위 정의
|  `- BackLog.md             # 우선순위 기반 백로그
|- js/
|  `- app.js                 # 상태, 렌더링, 상호작용 로직
`- functions/
   `- api/
      |- data.js             # 태스크 동기화 API
      `- stats.js            # 활동 통계 API
```

## 로컬 실행

정적 파일 프로젝트이므로 별도 빌드 과정은 없습니다.

1. 프로젝트 폴더를 엽니다.
2. `index.html`을 브라우저에서 열거나 Live Server로 실행합니다.

Cloudflare Functions 연동 없이 실행하면 데이터는 브라우저의 `localStorage`에 저장됩니다.

## Cloudflare Pages 배포

정적 배포만 하면 기본 앱은 동작합니다.
기기 간 동기화까지 사용하려면 `functions/api/*`가 함께 배포되고, Cloudflare KV 바인딩 `TIMEBOX_KV`가 설정되어 있어야 합니다.

기본 배포 흐름:

1. Cloudflare Dashboard에서 Pages 프로젝트를 생성합니다.
2. 이 저장소를 연결하거나 파일을 업로드합니다.
3. 필요 시 Pages Functions가 포함되도록 배포합니다.
4. KV 네임스페이스를 만들고 `TIMEBOX_KV` 바인딩을 연결합니다.

## PWA 설치

- iPhone (Safari): `공유` -> `홈 화면에 추가`
- Android (Chrome): 메뉴 -> `앱 설치` 또는 `홈 화면에 추가`

설치 후에는 독립 실행형 앱처럼 사용할 수 있습니다.

## 데이터 저장 방식

- 기본 저장: `localStorage`
- 선택 동기화: 동기화 ID 기반 Cloudflare KV 저장
- 오프라인: 서비스 워커가 앱 셸 파일을 캐시

주의:

- 브라우저 저장소를 지우면 로컬 데이터가 삭제됩니다.
- 동기화 기능은 Cloudflare KV가 설정된 환경에서만 동작합니다.

## 라이선스

MIT
