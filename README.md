# artchology

React + TypeScript + Electron 기반 로컬 데스크톱 시연 앱입니다.

## 개발

Node.js 22.12 이상이 필요합니다.

```sh
pnpm install
pnpm dev
```

`pnpm dev`는 브라우저 대신 Electron 앱 창을 실행하며 화면 변경을 즉시 반영합니다.

## 검증 및 패키징

```sh
pnpm lint
pnpm build
pnpm test
pnpm build:unpack
```

macOS에서 `build:unpack` 실행 시 `dist/mac-arm64/artchology.app`(Apple Silicon)이 생성됩니다.
`pnpm build:mac`으로 macOS 배포 파일을 만들 수 있습니다. 로컬 시연용이며 Apple 공증은 설정하지 않았습니다.
Windows 패키징 스크립트는 `pnpm build:win`이며 해당 환경에서 별도 검증이 필요합니다.

## 구조

- `src/main`: Electron 창, 입력 검증, 파일 기반 로컬 DB, 내보내기 처리
- `src/preload`: 화면과 Electron 간 통신 연결
- `src/renderer/src`: React 화면
- `electron.vite.config.ts`: 개발 서버·번들 설정
- `electron-builder.yml`: 앱 패키징 설정

## 시연 기능

- 홈: 날짜별 상담 일정, 최근 기록, 학생 바로가기
- 학생 관리: 등록·수정·검색·학년/주제/상태 필터·정렬, 상세의 기본 정보/상담 이력/마음 그림 탭, 목록 복귀 시 검색 조건 보존
- 상담 기록: 목록/달력 보기, 기간 검색, 상세 조회→내용/다음 계획/학생 이력/그림→수정·다음 예약. 상세 복귀 시 목록 조건 보존
- 마음 그리기: 표현 활동 3종, 캔버스·색상·붓·지우개·되돌리기, 학생별 그림/메모 저장, 작품 보관함과 확대 상세, 미저장 활동 이탈 확인
- 통계: 요약/분류/시간 흐름/학생 현황. 월·분류 집계에서 실제 상담 목록과 상세로 이동
- 보고서: 상담관리대장/학생별 기록/관리자 보고서/백업. 기간·학생·상태별 미리보기와 동일 조건의 CSV/PDF 출력 (나이스 전용 서식은 미구현)
- 설정: 기본 정보/백업·복원/앱 정보. JSON 복원 미리보기와 확인, 복원 전 자동 사본 생성, 참조가 깨진 백업 거부

첫 실행에 가상 학생 8명과 상담 예시가 생성됩니다. AI·암호화·기기 간 동기화는 포함하지 않습니다.
드로잉은 시연용 표현 활동이며 실제 아트봉봉 콘텐츠 API나 심리검사에 연결되지 않습니다.

## 로컬 저장

시연 속도와 네이티브 빌드 도구 없는 실행을 위해 **lowdb(JSON 파일)**를 사용합니다. SQLite는 아직 도입하지 않았습니다.
저장 위치는 Electron `app.getPath('userData')` 아래 `artchology-demo.json`입니다.
macOS 개발 실행의 기본 경로는 `~/Library/Application Support/artchology/artchology-demo.json`입니다.
상담/학생/그림/설정을 직렬화된 쓰기로 저장하며, 손상된 파일은 덮어쓰지 않고 오류로 표시합니다.
실제 학생 개인정보 대신 가상 데이터만 사용하세요.

## 테스트

`pnpm test`는 별도의 임시 데이터 폴더와 숨김 Electron 창을 사용합니다.
학생 등록, 상담·그림 저장, 상세 화면 이동과 필터 보존, 통계 드릴다운, 조건별 CSV/PDF 출력, 설정 변경, 백업 복원과 잘못된 참조 거부, 재시작 후 보존 및 손상 파일 보호를 확인합니다.
스크린샷과 실패 시 추적 파일은 Git에서 제외된 `test-results/`에 남습니다.
`ARTCHOLOGY_DATA_DIR`은 별도 데이터 폴더, `ARTCHOLOGY_TEST_HEADLESS=1`은 숨김 실행용입니다.

## 작업 규칙

브랜치: `feature/counseling-desktop-prototype`. 커밋 제목은 `feat: 상담 기록 화면 추가`, `fix: 저장 오류 수정`, `chore: 개발 설정 정리`처럼 Conventional Commits prefix와 한국어 메시지를 사용합니다.

## 폰트

Pretendard Variable을 앱에 포함해 오프라인에서도 사용합니다.
라이선스: `src/renderer/src/assets/fonts/LICENSE.txt` (SIL Open Font License 1.1).

## 참고 화면과 구현 범위

Sikarugir로 설치된 Weetory 1.0.10의 renderer에서 학생 상세→상담 상세, 통계 하위 메뉴, 보고서와 설정의 구성을 참고했습니다. 원본 패키지의 정적 확인이며 원본 앱 전체 실행 동작의 검증을 뜻하지 않습니다.

이번 구현은 현재 Artchology의 7개 메뉴(홈·학생 관리·상담 기록·마음 그리기·통계·보고서·설정)에 하위 화면과 로컬 저장 동작을 연결합니다. Weetory의 독립 사례 관리, 사례 개념화·동의서 발송, 나이스 전용 분류/가져오기, AI·음성 인식·구독·다중 학교 기능은 이 앱에 포함되지 않습니다. 상담 데이터의 기존 JSON 형식(version 1)은 유지합니다.

백업 복원은 선택 파일의 형식과 학생 참조/중복 ID를 검증합니다. 복원 직전 데이터는 앱 데이터 폴더의 `before-restore-<timestamp>.json`에 남으며, 필요 시 해당 파일을 다시 선택해 복원할 수 있습니다. JSON 백업과 CSV는 암호화하지 않습니다.

원본 분석 참고: REA evidence `ev_6ea7ea17ad8d73776014be203a19141949c7cc5afa157192867e981c235ef146`. 4.8MB renderer의 자동 의미 분석은 메모리 제한으로 부분 결과만 반환했으므로, 메뉴/경로/필드는 추출된 renderer의 해당 함수와 선언을 직접 확인했습니다.
