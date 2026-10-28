# Artchology · Weetory 화면 PoC

React + TypeScript + Electron으로 구현한 협업 검토용 화면입니다. 설치된 Weetory의 비AI 메뉴와 상세 흐름을 기준으로 기존 밝은 파란색 UI를 유지했습니다.

## 작업 기록

지금까지의 요구사항 변경, 구현·커밋 이력, 현재 범위와 검증 결과는 [docs 작업 기록](./docs/README.md)에 정리했습니다.

## 실행과 검증

Node.js 22.12 이상이 필요합니다.

```sh
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm test
pnpm build:unpack
```

Apple Silicon 시연 앱: `dist/mac-arm64/artchology.app`. Windows 빌드는 `pnpm build:win`이며 Windows 환경 검증은 별도로 필요합니다.

## 화면 구성

- 홈: 오늘의 상담, 캘린더, 사례 현황, 장기 미접촉, 최근 기록, 기록물 보관, 마음 그리기(활동·캔버스·작품 보관함)
- 사례 관리: 목록/검색/필터, 생성/수정/종결/재개, 개요/사례 개념화/상담 기록/동의서, 번호 규칙/변경 이력/되돌리기, 나이스 가져오기 단계
- 학생 관리: 기본 정보, 학년도별 학적, 사례와 회기 연결, 명렬표 입력/학생 연결/졸업 검토, 정보 요청 미리보기
- 통계: 요약/상담 분류/시간 흐름/유입·종결, 조건별 상담 목록
- 보고서: 나이스 엑셀/상담관리대장/관리자 보고서 미리보기, 기록물철 작성/확정/이관
- 공지사항: 목록/필터/상세/도움말
- 설정: 기본 정보/학교 관리/교시/보안/백업·복원/자동 백업/구독·계정/문서 폴더/공공데이터 출처

AI 생성, 음성 인식 등 AI 기능은 제외했습니다. 상단 탭/앞뒤 이동/학교 선택/빠른 학생 검색/화면 잠금도 연결했습니다.

## 캘린더

`@fullcalendar/react` **7.1.3**과 `temporal-polyfill`을 사용합니다. v7의 통합 플러그인 경로, Monarch 테마, 공개 스타일 훅을 사용합니다.

- 월/주/일/목록, 오늘/이전/다음, 주말 표시와 분류 필터
- 빈 날짜 클릭 또는 범위 드래그로 등록
- 일정 드래그 이동, 시작/끝 기간 조정, 한 단계 되돌리기
- 종일 및 여러 날 일정, 제목/장소/색/미리 알림 설정, 연결 사례, 수정/삭제
- 종일 일정의 입력 화면은 마지막 날짜를 **포함**합니다. FullCalendar의 내부 종료 날짜는 **미포함** 규약으로 변환합니다.
- 일정과 상담 기록은 같은 메모리 상태를 사용합니다. 미리 알림은 설정 UI이며 실제 알림 발송은 후속 범위입니다.

공식 참고: [React](https://fullcalendar.io/docs/react), [v7 API](https://fullcalendar.io/docs/upgrading-from-v6-js), [v7 스타일 훅](https://fullcalendar.io/docs/upgrading-from-v6-css).

## 데이터와 연결 범위

현재 진입점은 `src/renderer/src/weetory/Shell.tsx`입니다. `model.ts`의 가상 자료를 `WorkspaceProvider`의 메모리 상태로 관리합니다. **앱을 재시작하면 이번 실행 중 입력한 내용은 초기화됩니다.** 로컬 DB PoC 연결은 다음 단계입니다.

계정/구독/문자·링크 발송/원격 동의 수신/알림/암호화/외부 파일 출력 등은 화면 또는 미리보기입니다. 실제 서비스 처리나 암호화 성공으로 표시하지 않습니다. 명렬표 CSV·TSV 및 나이스 TSV 입력은 메모리 등록을 지원하며, 실제 Excel 자동 분석은 연결 전입니다. 공지 내용은 시연 자료입니다.

기존 `src/main/data`와 구 renderer는 이전 시연 코드로 남아 있습니다. 그 JSON 저장 계층은 새 화면의 데이터와 연결되지 않습니다. 원본 서버에 요청하지 않습니다.

## 원본 확인과 차이

참조 대상은 `~/Downloads/Weetory-Setup-latest.exe`로 Sikarugir에 설치된 Weetory의 `resources/app.asar`입니다. 추출된 renderer/preload/main의 메뉴·화면·입력 필드·IPC 선언과 포함된 튜토리얼 화면을 확인했습니다. 원본 전체를 실시간 조작하며 모든 상태를 검증한 것은 아닙니다.

현재는 원본의 화면 구조와 비AI 업무 흐름을 재현하는 단계입니다. 픽셀 단위 동일성이나 서버 동작의 동일성을 주장하지 않습니다. 학교별 교시 독립 설정, 이관 연장 등 세부 상태와 실제 외부 문서/발송 연결은 후속 보완 범위입니다.

## 테스트

`tests/desktop.spec.ts`는 임시 사용자 폴더와 숨김 Electron 창에서 메뉴 탐색, 종일/여러 날 일정 편집·삭제, 보기 전환, 실제 마우스 이동·기간 조정·되돌리기, 학생→사례→상담→캘린더 연결을 검사합니다. 스크린샷은 Git에서 제외된 `test-results/`에 남습니다.

## 폰트

Pretendard Variable을 앱에 포함합니다. 라이선스는 `src/renderer/src/assets/fonts/LICENSE.txt` (SIL OFL 1.1)입니다.

## 공통 UI 디자인 시스템

현재 UI는 **shadcn/ui + Radix UI + Tailwind CSS v4**를 사용합니다. 공식 `new-york-v4` 레지스트리에서 가져온 컴포넌트를 `src/renderer/src/components/ui/`에 보관하고, 앱에 맞는 조합은 `form-controls.tsx`와 `weetory/ui.tsx`에서 관리합니다.

- `assets/design-system.css`: 색상·글꼴·모서리 토큰, Tailwind 설정, 기존 레이아웃 CSS의 cascade layer 경계
- `form-controls.tsx`: Radix 드롭다운/체크박스, Popover + Calendar의 한국어 날짜 선택기(날짜 직접 입력·연/월 이동·시간 입력)
- `components/ui.tsx`: 기존 화면 API를 유지하는 버튼·배지·Radix 모달 어댑터
- `components.json`: 향후 shadcn 컴포넌트 추가를 위한 경로 설정

원본 컴포넌트의 입력 높이·색상·한국어 닫기 표시를 앱에 맞게 조정했습니다. 날짜/선택 팝업은 OS 기본 UI를 사용하지 않습니다. FullCalendar는 일정 편집용으로 유지합니다. 파일 선택과 직접 숫자·시간 입력 등 필요한 기본 입력 기능은 유지합니다.

검증에는 선택기 키보드 조작과 포커스 복귀, 모달 내부 팝업, 네 가지 주요 화면 스크린샷 및 기존 일정 드래그/사례 연결 흐름이 포함됩니다.
