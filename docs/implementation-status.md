# 현재 구현과 후속 작업

기준: 2026-10-28, `da180ef`.

## 화면 구성

| 메뉴        | 구현된 주요 화면·흐름                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| 홈          | 오늘의 상담, 캘린더, 사례 현황, 장기 미접촉, 최근 기록, 기록물 보관, 마음 그리기 진입 카드                  |
| 마음 그리기 | 홈 하위 메뉴, 활동 3종, 드로잉 도구, 학생·메모 연결, 작품 보관함·상세                                       |
| 사례 관리   | 검색·필터, 생성·수정·종결·재개, 개요·사례개념화·상담 기록·동의서, 번호 정리·규칙·변경 이력, 나이스 가져오기 |
| 학생 관리   | 목록·상세·등록·수정, 학년도별 학적, 사례·회기 연결, 명렬표 단계, 학생 정보 요청 미리보기                    |
| 통계        | 요약·상담 분류·시간 흐름·유입 및 종결, 조건별 목록                                                          |
| 보고서      | 나이스 엑셀·상담관리대장·관리자 보고서 미리보기, 기록물철 작성·확정·이관 상태                               |
| 공지사항    | 검색·분류·상세·도움말, 시연용 내용                                                                          |
| 설정        | 기본 정보·학교·교시·보안·백업·구독·문서 폴더·출처 화면                                                      |

공통으로 상단 화면 탭, 앞뒤 이동, 학교 선택, 빠른 학생 검색, 하위 메뉴 접기·펼치기, 화면 잠금이 연결되어 있다.

## 데이터 범위

현재 화면은 Zustand `store.ts`의 메모리 상태를 사용하며 `WorkspaceProvider`가 기존 화면 API와 탐색 정보를 제공한다. 학생·사례·상담·일정·그림의 연결은 현재 실행 중에 유지된다. **앱 종료 후 영구 보존되지 않는다.**

이전 프로토타입의 `src/main/data` 로컬 JSON 저장 코드와 `src/renderer/src/pages`는 남아 있지만 새 위토리 상태와 자동 연결되지 않는다. 저장 계층이 저장소에 존재한다는 이유로 현재 화면의 영속 저장이 구현됐다고 해석하면 안 된다.

- 서버 API·원본 서버 요청은 연결하지 않았다.
- 계정·구독·문자·링크 발송·원격 동의 수신·알림·암호화 등은 화면 또는 미리보기 범위다.
- 보고서의 실제 외부 파일 출력과 Excel 자동 분석은 후속 연결 범위다. 일부 CSV/TSV 입력·내보내기 흐름과 구분한다.
- 공지와 학생·상담 기본 자료는 시연 데이터다.
- AI 생성·음성 인식·그림의 AI 심리 분석은 구현하지 않았다.

## 주요 코드 위치

| 경로                                            | 역할                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| `src/renderer/src/main.tsx`                     | 실제 renderer 진입점                                    |
| `src/renderer/src/weetory/Shell.tsx`            | 메뉴, 화면 탭·이력, 학교 선택, 잠금, 사이드바·화면 전환 |
| `src/renderer/src/weetory/context.tsx`          | 현재 화면의 공유 메모리 상태                            |
| `src/renderer/src/weetory/model.ts`             | 시연 데이터, 학생·사례·상담 등 타입                     |
| `src/renderer/src/weetory/Home.tsx`             | 홈, 최근 기록, 마음 그리기 진입                         |
| `src/renderer/src/weetory/Calendar.tsx`         | FullCalendar와 일정 편집                                |
| `src/renderer/src/weetory/Cases.tsx`            | 사례·상담 기록·동의서·번호·가져오기                     |
| `src/renderer/src/weetory/Students.tsx`         | 학생·학적·명렬표                                        |
| `src/renderer/src/weetory/WorkspacePages.tsx`   | 통계·보고서·설정·공지                                   |
| `src/renderer/src/weetory/ArtStudio.tsx`        | 복원된 드로잉 화면·작품 보관함                          |
| `src/renderer/src/components/ui/`               | 저장소에 포함한 shadcn 컴포넌트                         |
| `src/renderer/src/components/form-controls.tsx` | 선택·체크박스·날짜 입력 어댑터                          |
| `src/renderer/src/components/ui.tsx`            | 공통 버튼·필드·모달 등                                  |
| `src/renderer/src/weetory/ui.tsx`               | Surface·하위 탭·목록 행 등 화면 조합                    |
| `src/renderer/src/components/BrandIcon.tsx`     | 화면 로고                                               |
| `src/renderer/src/components/TabIndicator.tsx`  | 선택 탭을 따라 이동하는 표시                            |
| `src/renderer/src/assets/design-system.css`     | Tailwind 토큰, CSS layer, 간격·정렬·애니메이션          |
| `tests/desktop.spec.ts`                         | 숨김 Electron 통합 테스트                               |

## 디자인·구현 기준

- shadcn/ui의 `new-york-v4` 기반 컴포넌트와 Radix primitives를 사용한다.
- Tailwind CSS v4를 사용하며 기존 `main.css`, `weetory.css`는 legacy layer에 둔다.
- 파란색 `#2589ee`, 배경 `#f8fafc`, 흰색 카드, Pretendard 글꼴을 중심으로 구성한다.
- 필드 내부 라벨 간격과 필드 그룹 간격을 구분한다. 중첩 입력 그룹은 `.wt-form-fields`의 24px gap을 사용한다.
- 최근 기록처럼 열이 있는 목록에는 공통 grid 열을 사용한다.
- 움직임은 짧게 유지하고 `prefers-reduced-motion`을 존중한다.
- 선택 표시의 움직임을 위해 키보드 포커스 표시를 제거하지 않는다.

주요 선언 버전은 `@fullcalendar/react ^7.1.3`, `radix-ui ^1.8.1`, `tailwindcss ^4.3.3`, React `^19.3.0`이다. 실제 설치 버전은 `pnpm-lock.yaml`을 기준으로 확인한다.

## 후속 작업

1. 로컬 DB PoC 범위 결정 및 현재 공유 상태와 영속 저장 계층 연결.
2. 앱 재실행 시 학생·사례·상담·작품 복원, 스키마 변경과 백업·복원 방식 검증.
3. 협업 후 제공받는 API에 맞춰 계정·구독·발송·동의 수신·알림 연결.
4. 실제 Excel 입출력·보고서 출력 및 기관별 기록물 관리 규칙 보완.
5. 원본의 세부 상태 재검토: 학교별 교시 독립 설정, 이관 연장 등.
6. 아트봉봉 콘텐츠·미술심리 콘텐츠의 정식 구성과 적용 범위 결정.
7. 운영 배포 전 Windows 검증, macOS 서명·공증과 배포 정책 수립.

원본의 모든 서버 동작과 예외 상태까지 동일하게 구현 완료했다는 의미는 아니다. 범위 확장 시 이 문서와 검증 목록을 함께 갱신한다.

## 계정·동의·학교 생활 프로토타입 추가

원본 renderer의 `LoginDialog`, `SubscriptionSettingsSection`, `RedeemDialog`, `ConsentPanel`, `ConsentPanelUnlocked`, `TimetableSettingsSection`을 정적으로 확인해 구조와 진행 순서를 반영했다. 원본 서버 동작을 실행 검증한 것은 아니다.

- `AccountPanel.tsx`: 구글/이메일 인증 코드 로그인, 구독 코드 등록, 플랜 표시, 로그아웃, 이메일 재입력으로 계정 삭제 시연. PIN은 계정 로그인과 별도의 앱 잠금으로 유지한다.
- `Consents.tsx`: 구독 접근 안내, 양식 관리, 학생별/일괄 발송, 복수 양식, 링크/SMS 선택, 요청·응답 목록, 이전 링크 만료와 응답 보존, 처리 기록. 외부 통신 없이 학부모 화면을 앱에서 체험한다.
- `TimetableSettings.tsx`: 학교별 시간표, 학교급별 기본값·점심, 유연한 시간 입력·소요 수정·후속 교시 이동, 빈 시간표 저장.
- `PeriodButtons.tsx`: 상담 기록·캘린더에서 선택한 학교의 교시로 시간을 입력한다.
- `SchoolLife.tsx`: 학교 시간표와 날짜별 예시 점심 메뉴. 원본 renderer에서 급식 화면은 확인하지 못했으며 이번 사용자 요청으로 추가했다. 실제 급식 API 연결은 후속 작업이다.
- `store.ts`: 새로고침 전까지 공통 업무 상태를 유지하는 Zustand store. persist·DB 저장은 사용하지 않는다.

위 후속 작업 중 학교별 교시 독립 설정은 이번 변경에서 구현했다. 실제 서비스 연결과 영속 저장은 계속 후속 범위다.

## 첫 진입 인증 추가

- `auth.ts`: 기기별 PIN/복구 코드 해시·초기 프로필 보관, 1시간짜리 앱 잠금 해제 세션, PIN 변경·복구. 인증 시간은 활동으로 연장하지 않는다.
- `AuthGate.tsx`: 신규 PIN → 복구 코드 → 기본 정보, 재사용 PIN 입력, 초기 흐름 독립 체험. 미인증/만료 시 업무 화면과 열린 모달은 렌더링하지 않는다.
- `PinSettings.tsx`: 잠금과 같은 인증 정보를 사용하는 PIN 변경·복구 코드 재생성.
- 앱 재실행은 PIN 필요, 같은 창 새로고침은 유효한 세션의 남은 시간만 유지한다. PIN 등록 상태만 업무용 Zustand 메모리와 별도로 보관하며, 계정 로그인·구독은 별도 시연 상태다.
