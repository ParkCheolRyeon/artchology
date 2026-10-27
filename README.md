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
pnpm build:unpack
```

macOS에서 `build:unpack` 실행 시 `dist/mac-arm64/artchology.app`(Apple Silicon)이 생성됩니다.
`pnpm build:mac`으로 macOS 배포 파일을 만들 수 있습니다. 로컬 시연용이며 Apple 공증은 설정하지 않았습니다.
Windows 패키징 스크립트는 `pnpm build:win`이며 해당 환경에서 별도 검증이 필요합니다.

## 구조

- `src/main`: Electron 창과 OS·파일·향후 로컬 DB 처리
- `src/preload`: 화면과 Electron 간 통신 연결
- `src/renderer/src`: React 화면
- `electron.vite.config.ts`: 개발 서버·번들 설정
- `electron-builder.yml`: 앱 패키징 설정

현재는 초기 실행 기반만 구성했습니다. 로컬 DB는 SQLite를 사용할 예정이며 테이블·업무 화면·AI·암호화·동기화는 아직 구현하지 않았습니다.
