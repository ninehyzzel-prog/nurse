# 스킬 적용 기록부 (SKILL_APPLICATION)

> 상태: **Phase 0 계획 및 초기 설정** · 근거: [MASTER_PROMPT.md](../MASTER_PROMPT.md) §2

본 문서는 설치된 6개 스킬의 실제 적용 내역을 단계별(Phase 0~7)로 투명하게 기록하고 추적한다.

---

## 1. 스킬별 적용 계획 매트릭스

| 스킬 명칭 | 주 적용 대상 화면/컴포넌트 | 적용 규칙 식별자 | 예상 변경/적용 내용 | 미적용/제외 사유 |
|---|---|---|---|---|
| `frontend-design` | 전역 토큰, `/me/schedule`, `/me/requests/new` | Color Token, Typography Scale, Plain Korean UX Copy | 임상 환경에 적합한 슬레이트/스카이 팔레트, 능동태 한글 문구 적용 | 화려한 비주얼/자극적인 모션은 병동 업무 특성상 배제 |
| `ui-ux-pro-max` | 모바일 캘린더, 터치 인터랙션, 차트 | Touch Target $\ge 44$px, WCAG Contrast 4.5:1, Accessibility Guidelines | 모바일 날짜 셀 터치 타겟 44px 확보, 에러 메시지 인라인 배치 | Stack 관련 Next.js 전용 규칙은 Vite SPA이므로 배제 |
| `web-design-guidelines` | `RosterGrid`, 키보드 조작, 폼 | Keyboard Nav, Focus Rings, Semantic HTML (`table`, `th`, `aria-live`) | 전체 근무표 키보드 방향키 이동, 상태 변경 스크린리더 알림 | 외부 규칙 Fetch 불가 시 로컬 기본 룰 준용 |
| `vercel-composition-patterns` | `RosterGrid`, `Calendar`, `ConflictPanel` | `architecture-compound-components`, `architecture-avoid-boolean-props` | 불리언 props 대신 명시적 Compound 컴포넌트 API 구성 | - |
| `vercel-react-best-practices` | `RosterGrid.Cell`, TanStack Query | `rerender-memo`, `js-index-maps`, `async-parallel` | 31일 x N명 셀 렌더링 최적화, O(1) Map 기반 배정 매핑 | RSC/Next.js 서버 컴포넌트 전용 규칙은 Vite 환경이므로 미적용 |
| `impeccable` | 디자인 시스템, 에러/상태 처리, 모바일 적응 | `shape`, `clarify`, `adapt`, `harden` (Operate 모드) | 9가지 필수 상태 정의, 320/390/768/1280px 반응형 뷰 검증 | 실행 파일 자동 다운로드 기능은 보안상 차단, 문서 가이드로 적용 |

---

## 2. Phase 0 실행 기록

- **적용 일자:** 2026-11-01
- **적용 화면:** Phase 0 설계 문서 전체 (`DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `USER_FLOWS.md`)
- **주요 적용 사항:**
  - `frontend-design`: AI 특유의 보라색 그라데이션/테라코타 템플릿 배제, 임상 슬레이트/스카이 블루 기반 토큰 설계.
  - `ui-ux-pro-max`: 모바일 터치 타겟 44×44px 규격 채택.
  - `vercel-composition-patterns`: `RosterGrid.Provider`, `RosterGrid.Table` 등 컴파운드 컴포넌트 아키텍처 설계.
- **미적용 및 특이 사항:**
  - `impeccable` 네이티브 바이너리 자동 다운로드는 차단하고, 스킬 리포지토리의 가이드 문서(`craft-floor.md`, `mode-operate.md`)를 직접 참조하여 적용함.
