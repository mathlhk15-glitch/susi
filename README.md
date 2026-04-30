# 모두의 생기부 분석기 Pro v13 (뀨버전)

## 파일 구조

```
project/
├── index.html
├── public/
│   └── pdf.worker.min.js
└── src/
    ├── styles/main.css
    ├── app/
    │   ├── adminAuth.js        # 관리자 인증 (SHA-256 해시, sessionStorage)
    │   ├── state.js
    │   ├── tabs.js
    │   ├── main.js
    │   └── events.js
    ├── parser/
    │   ├── lineGrouper.js
    │   ├── studentInfoParser.js
    │   ├── gradeParser.js
    │   └── coreParser.js
    ├── pdf/pdfLoader.js
    ├── analysis/
    │   ├── keywords.js
    │   ├── keywordAnalysis.js
    │   ├── analyzer.js
    │   ├── promptBuilder.js
    │   └── uniMaterialAnalyzer.js
    └── ui/
        ├── uniMaterialRenderer.js  # 대학자료 탭 (Gist 연동)
        └── ...
    └── storage/
        └── uniMaterialStore.js     # 대학자료 저장소 (localStorage + GitHub Gist)
```

## 실행 방법

```bash
npx serve . -p 3000
```

## 대학자료 공유 기능 (GitHub Gist 연동)

### 구조
- **관리자**: PDF 업로드 → 로컬 저장 + GitHub Gist에 자동 업로드
- **일반 사용자**: 페이지 로드 시 Gist에서 자동으로 자료를 가져옴

### 설정 방법 (관리자 1회 설정)
1. 사이드바 하단 **🔐 관리자 모드** 버튼 클릭 (기본 비밀번호: `123456`)
2. 대학자료 분석 탭 이동
3. GitHub Gist 설정 패널에서:
   - [GitHub Personal Access Token](https://github.com/settings/tokens/new) 발급 (`gist` 권한)
   - 토큰 입력 후 **✨ 새 Gist 생성** 클릭
4. 이후 PDF 업로드 시 자동으로 Gist에 동기화됨

### Gist ID 공유
- 생성된 Gist ID를 다른 관리자나 사용자에게 공유하면 동일 자료를 사용 가능
- 일반 사용자는 Gist ID만 입력하면 자료를 읽을 수 있음 (토큰 불필요)

## 수정 이력

### 버그 수정
- **[BUG-1]** `_processUpload`에 관리자 인증 체크 추가 → 콘솔에서 직접 호출해도 차단
- **[BUG-2]** `saveUniMaterialSummary` 반환값이 객체인데 `!== true` 비교하던 오류 수정 → `.ok` 프로퍼티 확인
- **[BUG-3]** `_currentMaterialId` 초기화 코드가 `if` 블록 안에 잘못 배치된 오류 수정
- **[BUG-4]** 관리자 로그인/로그아웃 시 대학자료 탭이 즉시 리렌더되지 않던 문제 수정
- **[BUG-5]** 오버레이(`uni-admin-lock`)와 실제 인증이 분리되어 우회 가능하던 구조 제거

### 기능 추가
- GitHub Gist를 이용한 대학자료 공유 저장소
- 페이지 로드 시 Gist 자동 동기화
- 관리자 전용 삭제 버튼 (비관리자에게는 숨김)
