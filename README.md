# Timebox Flow (타임박스 플로우) ⏳

**"나만의 데이터가 쌓이는 즐거움"**
Timebox Flow는 Apple의 깔끔한 디자인 감성을 담은 **몰입형 타임박싱 PWA(Progressive Web App)**입니다.
복잡한 로그인 없이 '동기화 ID' 하나로 기기 간 데이터를 연동하고, GitHub 스타일의 **잔디(Heatmap)**로 매일의 성취를 시각화합니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-Cloudflare_Pages_%2B_KV-orange.svg)

---

## ✨ 주요 기능

1.  **Apple-Style UI**: `#f2f2f7` 배경과 `#007aff` 포인트 컬러로 네이티브 앱 같은 경험 제공.
2.  **생산성 히트맵 (Heatmap)**: 매일의 활동량을 초록색 잔디로 시각화하여 동기 부여.
3.  **5단계 몰입 워크플로우**:
    - 🧠 **Brain Dump**: 머릿속 생각 쏟아내기.
    - ⭐ **Top 3 Priorities**: 가장 중요한 3가지 선정.
    - ⏰ **Timeboxing**: 시간대별 계획 수립.
4.  **Zero-Login Sync**: 회원가입 없이 ID만 입력하면 PC와 모바일 자동 동기화.
5.  **PWA 지원**: 스마트폰 홈 화면에 추가하여 네이티브 앱처럼 실행 (오프라인 지원).

---

## 🛠 기술 스택 (The Simple Stack)

-   **Frontend**: HTML5, [Pico.css](https://picocss.com/) (v2), Day.js
-   **Backend**: Cloudflare Pages Functions (Serverless)
-   **Database**: Cloudflare KV (Key-Value Store)
-   **Icons**: Lucide Icons

---

## 🚀 배포 가이드 (Cloudflare Pages)

이 프로젝트는 **Cloudflare Pages**와 **KV(Key-Value)** 저장소를 사용하여 무료로 배포할 수 있습니다.

### 1단계: Cloudflare Pages 프로젝트 생성
1.  [Cloudflare Dashboard](https://dash.cloudflare.com/)에 로그인합니다.
2.  **Workers & Pages** > **Overview**로 이동합니다.
3.  **Create application** > **Pages** > **Upload assets**를 선택합니다.
4.  프로젝트 이름(예: `timebox-flow`)을 입력하고 **Create project**를 클릭합니다.
5.  이 프로젝트 폴더(`c:/Project/timebox`) 전체를 업로드하거나, GitHub 리포지토리에 올린 후 연동합니다.

### 2단계: KV Namespace 생성
데이터 저장을 위해 KV 공간이 필요합니다.
1.  대시보드 왼쪽 메뉴에서 **Workers & Pages** > **KV**를 클릭합니다.
2.  **Create a namespace**를 클릭하고 이름을 `TIMEBOX_KV`로 입력 후 **Add**를 누릅니다.
3.  생성된 Namespace의 **ID**를 기억해둘 필요는 없으나, 이름은 기억해두세요.

### 3단계: KV 바인딩 (가장 중요 ⭐)
Pages 프로젝트와 KV를 연결해야 데이터가 저장됩니다.
1.  생성한 Pages 프로젝트의 **Settings** 탭으로 이동합니다.
2.  **Functions** 메뉴를 클릭합니다.
3.  스크롤을 내려 **KV Namespace Bindings** 섹션을 찾습니다.
4.  **Add binding**을 클릭합니다.
    -   **Variable name**: `TIMEBOX_KV` (정확히 입력해야 합니다!)
    -   **KV Namespace**: 방금 생성한 `TIMEBOX_KV`를 선택합니다.
5.  **Save**를 클릭하여 저장합니다.

### 4단계: 재배포 (Redeploy)
바인딩 설정은 **다음 배포부터 적용**되므로, 반드시 다시 배포해야 합니다.
1.  **Deployments** 탭으로 이동합니다.
2.  **Create new deployment**를 눌러 다시 파일을 업로드하거나, GitHub 연동 시 커밋을 푸시합니다.
3.  배포가 완료되면 제공된 URL(예: `https://timebox-egg.pages.dev`)로 접속합니다.

---

## 📱 스마트폰 앱으로 설치하기 (PWA)

웹사이트에 접속한 뒤 앱처럼 설치할 수 있습니다.

-   **iPhone (Safari)**: 하단 `공유` 버튼 → `홈 화면에 추가` 선택.
-   **Android (Chrome)**: 상단 `⋮` 메뉴 → `앱 설치` 또는 `홈 화면에 추가` 선택.

이제 배경화면에 생긴 아이콘을 누르면, 주소창 없는 **완전한 앱**으로 실행됩니다!

---

## 📁 파일 구조

```
/
├── index.html          # 메인 앱 UI
├── manifest.json       # 앱 설치 정보 (아이콘, 이름 등)
├── sw.js               # 오프라인 지원 (Service Worker)
├── css/
│   └── style.css       # Apple 스타일 커스텀 CSS
├── js/
│   └── app.js          # 앱 로직 (상태 관리, 동기화, UI)
└── functions/
    └── api/
        ├── data.js     # 데이터 저장/로드 API (GET, PUT)
        └── stats.js    # 히트맵 데이터 조회 API (GET)
```
