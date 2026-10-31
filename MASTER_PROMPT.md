# 산부인과 병동 근무 스케줄러 — Antigravity 마스터 프롬프트

> 문서 목적: 이 문서를 Antigravity 프로젝트 루트에 `MASTER_PROMPT.md`로 저장하고, 단계별 구현 지시서 및 검수 기준으로 사용한다.
> 개발 언어 및 화면 언어: UI/서비스 모두 한국어. 소스 코드 식별자는 영문.
> 상태: 실제 병원 규정 검토 전의 제품/기술 설계안. 의료현장 운영·근로규정 준수는 병원 측 검토 후 확정한다.

## 0. 너의 역할과 최상위 원칙

너는 시니어 프로덕트 디자이너, UX 리서처, 프론트엔드 아키텍트, 백엔드 엔지니어, 데이터 모델러, 최적화 엔지니어, QA 리드로 구성된 팀처럼 행동한다.

목표는 약 6명 규모의 산부인과 병동에서 누구나 배우기 쉬운 웹 기반 근무 스케줄러를 만드는 것이다. **실제로 작동하는 소프트웨어**를 구현한다. 가짜 버튼, 하드코딩된 차트, 저장되지 않는 모의 데이터, 동작하지 않는 일정 생성기는 허용하지 않는다.

필수 원칙:
1. 6명은 초기 예시일 뿐 인원수의 상한이 아니다. 인원 증감과 복수 병동, 겸직에 대비하되 MVP는 단일 병동에 집중한다.
2. 현재 근무는 D 08:00~18:00, N 18:00~익일 08:00의 2교대이다. 이는 **기본 템플릿**일 뿐 **고정 규칙이 아니다**. 시간, 명칭, 색상, 자격 조건, 휴게시간, 시간대별 필요 인원, 3교대와 기타 교대 패턴을 UI에서 바꿀 수 있어야 한다.
3. 근무 가능성과 인력·안전·법령/내규 등 **필수 제약(hard constraints)**을 최우선으로 처리한다. 편성 불가를 감추기 위해 필수 제약을 임의로 완화하지 않는다.
4. **점수제는 핵심 기능이며 필수 구현 대상이다.** 병동이 점수 기준 설정 → 개인별 누적 점수 계산 → 제약을 지킨 자동 편성 → 배정·오프 충돌 이유 설명 → 익월 이월 보정하는 5단계 파이프라인을 구현한다. 단일 불투명 점수는 금지하며 세부 점수와 계산식을 공개한다.
5. 승인된 법정 휴가·보호 휴가/병가를 기계적인 벌점으로 취급하지 않는다. 법적 성격이 다른 휴가와 단순 희망 OFF는 다른 워크플로로 취급한다.
6. AI 언어모델은 **설명·질의 인터페이스**만 보조한다. 실제 배정과 수학적 검증은 결정론적인 제약 최적화 엔진이 수행한다. LLM 출력은 공식적인 검증/감사 근거가 아니다.
7. 사용자 구성: 간호사, 근무표 작성자(수간호사 등), 시스템 관리자. 최소권한 원칙, 개인정보 최소수집, 변경 이력 감사 로그 적용.
8. 우선순위: 정확성·안전 > 이해가능한 UX > 기능 범위 > 시각적 장식.
9. 모바일 간호사 화면은 개인 일정 확인/오프 신청에 최적화하고, PC 관리자 화면은 전체 편성/검증에 최적화한다.
10. 모르는 병동 규칙은 추측하여 하드코딩하지 말고 `미확정 정책`으로 표시하고 관리자 설정에서 수정하게 한다.

## 1. 작업 방법: 단계별 게이트

- 최초 실행에 기존 리포지토리/기술스택/설치된 스킬/환경을 **읽기 전용으로 조사**한다. 사용자가 만든 파일과 설정을 보존한다.
- 먼저 `docs/PRODUCT_BRIEF.md`, `docs/USER_FLOWS.md`, `docs/SCREEN_MAP.md`, `docs/DESIGN_SYSTEM.md`, `docs/DOMAIN_RULES.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/QA_CHECKLIST.md`를 만든다.
- 작업은 Phase 0~7로 나눈다. 한 Phase에서 구현→유닛/통합 테스트→브라우저 시각 검수→수정→결과 보고를 완료한 뒤 다음 Phase로 간다.
- 임의로 디자인 전체를 한 번에 완성한 척하지 않는다. 먼저 컴포넌트/핵심 화면, 다음으로 데이터, 다음으로 스케줄러.
- 가능한 경우 에이전트가 코드 작성 및 테스트를 직접 수행한다. 실행 못한 테스트는 `미실행`이라고 명확히 표시한다.
- 코드 수정 전후 `git status` 확인. 파괴적 조작·프로덕션 데이터 삭제·실제 직원에게 알림 발송은 승인 없이 실행하지 않는다.
- 개발 데이터는 가상 간호사 6명, 가상 병동, 가상 신청 이력만 사용한다.
- 각 단계 종료 시 변경 파일, 구현 기능, 미완료, 테스트 결과, 실행 방법, 다음 단계를 보고한다.

## 2. 스킬 사용 규칙 (필수)

다음 여섯 스킬을 단계별로 **실제로 읽고 적용**하라. 이름만 나열하고 적용했다고 주장하지 마라. 에이전트 환경에 설치된 경로를 우선 탐색하고, 미설치 스킬은 존재하는 척하지 말고 설치 필요성을 보고하거나 사용자가 제공한 공식/원본 문서를 확인하라. 출처가 모호한 스킬 파일을 무검증 실행하지 마라.

- **Frontend Design (`frontend-design`)**: 기계적인 대시보드 템플릿에서 벗어나 강한 정보 위계, 정교한 타이포그래피, 실사용자 중심의 차분한 의료 업무 UI를 설계. 페이지 설계·시각 검수 시 적용.
- **UI UX Pro Max (`ui-ux-pro-max`)**: 디자인 시스템, 접근성, 터치 타겟, 폼, 정보 구조, 데이터 시각화, 모바일 UX 점검.
- **Web Design Guidelines (`web-design-guidelines`)**: 키보드 접근성, 포커스, 의미론적 요소, 상태 안내, 반응형·에러 처리, 표 접근성 검사.
- **Impeccable (`impeccable`)**: 완성도 있는 미세 인터랙션, 간격·타이포·시각적 일관성, 리뷰/개선. 장식보다 명료함 우선.
- **Vercel Composition Patterns (`vercel-composition-patterns`)**: `RosterGrid`, `Calendar`, `ShiftCell`, `RequestCard`, `ConflictPanel` 등을 재사용 가능한 조합형 API로 설계. boolean props 남발 금지.
- **Vercel React Best Practices (`vercel-react-best-practices`)**: 데이터 워터폴 방지, 불필요한 리렌더 최소화, 날짜 그리드 렌더링 최적화, bundle 관리, 안정적 서버/클라이언트 경계.

스킬 중첩 시 우선순위: 사용자 안전/접근성/업무 정확성 > 컴포넌트 구조/성능 > 미학. 현재 React 버전에 맞지 않는 지침은 무조건 적용하지 말고 근거를 남겨라.

`docs/SKILL_APPLICATION.md`에 스킬별 적용 화면, 사용한 규칙, 변경 사항, 미적용 사유를 기록한다.

## 3. 제품 정보구조 (IA)

### 공통
- 로그인/로그아웃, 비밀번호 재설정(또는 내부 관리자가 초기화), 프로필, 알림, 접근 권한 표시.
- 병동 공지: 신청 시작/마감, 근무표 초안/확정/변경 안내.
- 월 선택, 날짜 선택, 오늘로 이동, 범례, 설정에 맞춘 근무명 표시.

### 간호사 메뉴 (모바일 우선)
1. **내 근무표**: 월간 캘린더 기본, 주간/목록 모드, 당일/다음 근무 강조, 실제 시작·종료시각, 야간은 익일 종료 표기. D/N/OFF/연차/교육 등 의미 구분. 월간 횟수/예상 근무시간 요약. 근무표 초안·확정 상태 표시.
2. **오프·휴가 신청**: 달력에서 여러 날짜 선택, 신청 유형/사유(선택/필수 구분)/우선 희망 순위, 중복 신청 및 정원 정보, 접수·수정·취소, 마감일, 승인/미반영/검토 상태, 결과 설명.
3. **신청 내역**: 접수 순서, 개인 누적 반영률, 미반영 사유, 재신청 및 교환 요청(후속).
4. **알림**: 신청 결과, 근무 변경, 확정 공지.
5. **내 정보**: 개인 근무 가능 조건·자격(직접 변경 권한 제한), 선호 설정, 접근성 옵션.

### 근무표 작성자 메뉴 (PC 우선)
1. **운영 홈**: 다음 달 마감일까지 남은 작업, 요청 건수, 날짜별 부족 인력, 초안 여부, 마지막 확정본, 빠른 행동.
2. **전체 근무표**: 세로=간호사, 가로=날짜인 월간 매트릭스; 고정 첫 열/날짜 헤더, 요일·공휴일 구분, 주말 강조, 하루 최소 인원/필수 자격 충족 배지, 셀 선택/키보드/드래그 편집, 복사/붙여넣기(검증 포함), 자동저장 상태, Undo/Redo, 편성 잠금.
3. **자동 편성**: 편성 기간·직원 선택, 필수 조건 사전검사, 최적화 실행, 진행 상태, 후보안 2~3개 비교(공정성/희망 반영/연속근무/근로시간), 미해결 제약, 부분 재생성, 저장/확정.
4. **오프·휴가 신청 관리**: 월별 신청 캘린더, 날짜별 요청 겹침, 신청 종류/법적 처리 상태, 영향 인원, 판단 근거, 승인/반려/대안 제안, 변경 이력.
5. **인력관리**: 간호사 등록/활성/휴직/퇴사, 사번 대체 식별자, 직무/직급/숙련도/필수 자격/교육 상태/팀/고용 형태/근무 가능 시간/월 기준 근로시간/야간 가능 여부. 주민번호·건강정보·환자정보 저장 금지.
6. **공정성·통계**: 개인별 근무 부담/실근로시간/야간시간/주말 근무/완전한 주말 OFF/연속근무/희망 반영률(적용 가능한 신청만)/최근 3·6개월 누적, 병동 평균·편차, 점수 계산 근거 및 예외 설명.
7. **근무 정책 관리**: 교대 템플릿, 커버리지, 가중치, 근무 간 휴식, 연속 근무/야간 상한, 최소 숙련 인원, 공휴일 캘린더, 신청 마감일, 점수 가중치, 월간/기간별 정책 버전 관리.
8. **감사/내보내기**: 초안·확정·재확정 버전, 변경 사용자·시각·사유, CSV/XLSX/PDF/인쇄 중 MVP는 CSV/XLSX 우선. 접근 로그.

### 시스템 관리자
- 사용자 권한, 병동 설정, 데이터 백업 및 복원, 접근 정책, 보안/로그 보존, 장애 대응.

## 4. 화면 디자인 방향 — 첨부 캘린더의 장점만 계승

참고 이미지에는 한 달 달력, 근무별 색상 칩, 날짜별 빠른 확인, 아래쪽 근무 코드 버튼들이 보인다. **이미지를 픽셀 단위로 복제하지 않는다**. 기존 앱의 광고, 혼동을 주는 중복 근무 코드, 작은 텍스트, 항상 노출되는 큰 입력 버튼 영역은 계승하지 않는다.

디자인 원칙:
- 스타일: 차분하고 신뢰감 있는 임상용 생산성 제품, 고품질 B2B SaaS. 가벼운 뉴트럴 배경, 절제된 청록/블루 포인트, 우수한 한글 가독성.
- IBM Carbon 계열의 정보 구조·토큰 철학을 참고하되 실제 배포 라이선스/컴포넌트 호환성 확인. Tailwind가 필수는 아니다. 가급적 CSS variables + CSS modules 또는 명시적인 토큰 기반 스타일 시스템을 우선한다.
- 근무를 **색상+문자 레이블**로 함께 표시. 색맹 사용자를 고려해 색상만으로 식별하지 않는다. 사용자 정의 근무가 추가되어도 고정색 매핑에 의존하지 않는다.
- 모바일 내 근무표: 상단 월 전환/요약 → 월간 달력 → 선택 날짜의 상세 Bottom Sheet → 신청 CTA. 날짜 셀에는 1개 핵심 코드, 추가 배정/메모는 보조 표시. 390px부터 실사용 가능.
- OFF 신청: 날짜를 선택하고 하단 고정 버튼으로 신청 완료. 날짜 선택 후 신청 유형을 고르는 2단계 흐름. 시스템에서 제출 전 다른 요청 수와 확정 여부는 볼 수 있지만 다른 사람의 민감 사유는 볼 수 없다.
- 관리자 전체 근무표: 가로 스크롤 가능한 **표 컨테이너 내부**에 날짜 28~31개가 들어가는 월간 그리드. 페이지 전체 가로 스크롤 금지. 고정 헤더/첫 열, 날짜 범위 점프. 편집 모드/보기 모드 분리.
- 입력은 원칙적으로 클릭 1~3회 내 완료. 저장 상태 명확히 표시, 취소·되돌리기 제공. 키보드 Tab/방향키 지원.
- 상태: loading/empty/error/offline/conflict/pending/draft/published/archived를 디자인하고 테스트.
- 44x44px 수준의 터치 영역(가능한 범위), 명확한 포커스 링, WCAG 대비 준수, 최소 기본 본문 14~16px, 줌 200%, reduced motion 지원.
- 그래프는 설명 가능한 데이터만. 예: 간호사별 야간 시간 막대, 주말 근무 배분 범위, 승인률 추세. 과도한 원형 그래프 지양.
- PC 1280px, 태블릿 768px, 모바일 390px과 320px 최소 시나리오를 테스트.
- 가짜/임의의 환자 기록, 개인정보, 인기 서비스와 유사한 마크 사용 금지.

### 우선 구현 화면 6개
1. 간호사 모바일 내 근무표
2. 날짜 선택→오프/휴가 신청 플로우
3. 관리자 전체 근무표 편집기
4. 오프 충돌 해결 화면
5. 자동 편성 비교 및 근거 패널
6. 근무 템플릿/인력관리 설정 화면

## 5. 도메인: 근무 모델은 하드코딩 금지

### 5-1. 기본 샘플 템플릿
- `DAY`: 08:00 ~ 당일 18:00 (체류 10시간)
- `NIGHT`: 18:00 ~ 익일 08:00 (체류 14시간)
- `OFF`: 근무 배정 없음 (휴가와 구분)
- `LEAVE`: 승인된 연차 등 휴가 상태, 실제 유형은 별도 엔터티
- `TRAINING`: 교육/특수업무는 별도 배정 유형

**실근로시간은 근무시간 길이와 같지 않다**. 휴게시간은 별도 모델로 기록하고 법·정책 검증에 사용한다. 14시간을 곧바로 14시간 실근로로 간주하지 말고 관리자 설정상 유효한 휴게시간·가용성을 검증하라. 야간근로 시간대와 수당 산정 또한 법률/병원 정책을 확인해 별도 계산한다.

### 5-2. 유연한 템플릿
- 템플릿 필드: `id, ward_id, code, label, start_local_time, end_local_time, ends_next_day, timezone, break_policy_id, paid_hours_formula, color_token, required_skill_tags, active_from, active_to, display_order, is_assignable`.
- 3교대 전환 시 예를 들어 D/E/N 추가·수정만 하면, DB·API·캘린더·통계·최적화가 그 정의를 읽어 동작해야 한다. **D/E/N이라는 코드의 존재도 전제로 하지 않는다**.
- 교대 전환은 정책 버전을 새로 발행하고 `effective_from` 이후에만 적용. 과거 확정 근무표·통계는 당시 템플릿 스냅샷으로 해석.
- 야간처럼 자정 넘는 근무는 시작 일자와 종료 일자를 분리해 저장. 날짜 경계·월 경계·연속근무 계산 주의. 기본 시간대는 `Asia/Seoul`, 저장은 UTC instant + 현지 표시 컨텍스트.
- 직원별 병동 이동 및 자격의 유효기간을 지원.

## 6. 제약 최적화 엔진 설계

### 6-1. 권장 구조
- 최적화 서버: Python FastAPI + Google OR-Tools CP-SAT. 프론트엔드 React + TypeScript + Vite(새 프로젝트 기본), DB PostgreSQL(실운영) / SQLite(로컬 개발).
- 사용자가 이미 선택한 기술스택이 있으면 충돌 없는 범위에서 존중하고 변경 이유를 보고.
- API 서버가 데이터 및 권한의 단일 진실 공급원. 브라우저 localStorage는 근무표 원본 저장소가 아니다.
- 'AI' 미연결 상태에서도 점수 계산·규칙·근무표 편성·설명 기능 모두 정상 동작해야 한다.

### 6-2. 필수 조건 (하드)
- 지정 날짜·시간 슬롯별 최소 인원 수, 역량별 최소 인원 수; 인원수는 교대별·요일별·공휴일별·유효 기간별 상이 가능.
- 교대 겹침 금지, 직원 재직·소속·자격 유효성, 승인된 휴가/근무 불가일 반영.
- 법령/단체협약/병동 내규에 따른 총 근로시간·휴게·휴식·연속근무·야간근무 제한. **확정 전 병원 담당자 검토 필요**. 정책 엔진에서 출처/적용 범위/설정한 사용자/버전을 관리.
- 선택 정책을 strict/conditional/advisory로 표현하되 **법적 필수 요건을 soft로 낮출 수 없도록 보호**.
- 사용자 고정 배정(핀)과 이전 달 말부터 이어지는 교대·휴식 상태 반영. 다음 달 첫 주까지 경계 검사.
- 병동 인원 부족시 가상의 직원 생성·중복 배정 금지. `INFEASIBLE` 상태로 진단한다.

### 6-3. 최적화 목표 (소프트)
1. 유효한 희망 OFF 반영률 최대화(동등한 권리 보장 및 가중치 기준 공개)
2. 야간 총시간 및 야간 횟수의 적절한 분배
3. 주말/공휴일 근로시간, 완전한 토·일 OFF 주말의 분배
4. 개인별 표준 근로시간 대비 초과·부족 편차 최소화
5. 피로 부담이 큰 근무 연결·장기 연속근무 감소
6. 최근 3개월/6개월 이력에 대한 누적 공정성 보정
7. 공표된 근무표 변경 최소화

**중요:** 절대 점수 합산만으로 비교하지 않는다. 직원별 계약 형태·가능 근로시간·야간전담 여부·휴직/입퇴사 등은 기대값 산정에 반영한다. 소수의 긴 야간근무와 다수의 짧은 주간근무는 별도 지표가 필요하다.

### 6-4. 공정성 지표 샘플
- `scheduled_work_minutes`, `paid_work_minutes`, `night_work_minutes`, `weekend_work_minutes`, `holiday_work_minutes`, `shift_counts_by_template`.
- `full_weekend_off_count` (토/일 모두 근무 없음; 연차와 단순 OFF를 필요 시 분리), `consecutive_work_days_max`, `rest_gap_min_minutes`.
- `request_eligible_count`, `request_granted_count`, `request_grant_rate` (분모 0이면 N/A).
- `fairness_deviation`: 동종 고용형태/가능시간 그룹 내 **기대 부담 대비 정규화 편차**. 계산식·가중치·모집단·기간을 UI에서 공개.
- `burden_score`: 정책별 시간 가중치로 설명 가능한 보조 지표. 점수가 높다는 이유만으로 휴가 승인권리 차별 금지.
- 정규화·표본 수를 고려해 6명 규모에서 단일 퍼센트가 오해를 낳지 않도록 원시 횟수와 함께 표시.

### 6-4A. 필수 점수제 명세 — 구현자가 임의의 산식을 만들지 말 것

**점수의 용도 및 우선순위**
1. 필수 제약(인력 커버리지/휴식/승인된 법정 휴가/자격/법령 등)은 점수보다 절대 우선이다. 점수가 높아도 필수 제약 위반 배정은 불가.
2. `work_burden_points`(근무 부담), `off_priority_points`(희망 OFF 경합 우선순위), `fairness_score`(전체 편성안 균형 품질)를 **서로 다른 값**으로 관리한다. 전혀 다른 의미의 점수를 한 숫자로 혼합하지 말 것.
3. 점수는 병동의 합의 가능한 **초기 시드값**이며 임의의 법적 기준이나 의학적 안전 지표가 아니다. 설정 UI에서 가중치, 조회기간, 적용 조건을 편집하고 정책 버전으로 저장한다. 변경 시 과거 확정 근무표와 과거 계산 스냅샷은 변조하지 않는다.

**A. 근무 부담 점수 기본값 (버전 v1 샘플 정책)**
- 기본 D 한 번 = 1.0점, E 한 번 = 1.3점, N 한 번 = 2.0점. 현재 2교대에는 D/N만 적용한다. 새로운 교대 유형은 관리자 화면에서 기준 점수를 필수 입력. 기본점수는 해당 근무 구간의 **근무 부담을 설명하기 위한 편성 점수**이며 법정 근로시간이나 임금이 아니다.
- 토요일/일요일에 실제 근무한 배정 = +1.0점 **해당 날짜/배정당**(정책에서 날짜별 또는 근무당 중복 계산 방식을 명확히 설정); 공휴일 근무 = +1.5점. 동일한 날이 주말이자 공휴일일 때는 **기본값: 둘 중 큰 추가점수 1개만 적용**, 관리자 설정에서 중첩 방식 변경 가능.
- 5일째 연속 근무에 도달한 경우 해당 5일 연속 블록당 +1.0점 (가상 설정. 최대 연속근무 금지 규칙과 혼동 금지). 희망과 다르게 배정된 교대 = +0.5점(요청에 명시된 선호이며 승인된 휴가를 침해하지 않은 경우에만). 중복 부과되지 않도록 이벤트 ID별 1회 적용.
- **근무 1회에 걸친 자정/월말**: 시작일 기준으로 근무 배정을 한 번만 집계하되, 실제 근로시간과 22~06 야간시간, 주말·공휴일의 시간 교집합은 달력 일자별로 분할 집계한다. 정책에서 `weekend_point_method=shift_start_day` 또는 `overlap_minutes`를 명시하고 화면에서 계산 기준 공개. 기본 부담 점수의 주말 추가는 **시작일 기준**으로 통일.
- `scheduled_duration_minutes = end_at - start_at`, `actual_work_minutes = scheduled_duration_minutes - verified_break_minutes`. 데이 10시간/나이트 14시간을 전부 실근로시간이라고 단정하지 않는다. 시간 계산은 휴게의 실제 보장 여부를 확인한 유효한 설정값을 이용. 한국 표준시간대 및 서머타임 없는 현지 처리라도 UTC 타임스탬프를 함께 저장.
- 예: 평일 D 8회, 평일 N 5회, 주말 시작 N 2회, 공휴일 시작 D 1회(모두 중복 없는 배정)의 점수 = 8×1 + 5×2 + 2×(2+1) + (1+1.5) = **26.5점**. 이는 16회 배정의 단순 예시이며 최소 근로시간·휴식 충족을 의미하지 않는다.
- UI는 전체 점수 외에 `base_shift_points`, `weekend_bonus_points`, `holiday_bonus_points`, `consecutive_bonus_points`, `preference_mismatch_points`를 분리해서 보여주고 계산식, 날짜별 이벤트, 적용 정책 버전을 확인 가능해야 한다.

**B. 직원 간 비교를 위한 정규화 및 형평성**
- 직원별 `availability_ratio = eligible_target_work_minutes / comparable_group_target_minutes`를 계산한다. 계약상 가능 시간, 고용 형태, 재직 기간, 사전에 승인된 근무불가 기간을 고려하고 0인 직원은 비교 대상에서 제외(`N/A`).
- 기본 `expected_burden_i = total_group_burden × availability_ratio_i / Σavailability_ratio`. 정규화 부담 편차 `normalized_deviation_i = (actual_burden_i - expected_burden_i) / max(expected_burden_i, epsilon)`을 별도로 기록한다. 비교 대상 그룹이 동일한 고용조건이 아니면 별도 그룹을 구성하거나 설명 가능한 기대값 산정이 필요하며 전체 병동 평균으로 강제 비교하지 않는다.
- 배정 횟수와 부담점수만으로 단정하지 않는다. **실근로시간, 야간 시간/횟수, 주말 실제 근무일/시간, 완전 주말 OFF 횟수, 공휴일, 3개월·6개월 누적 분포**를 독립 지표로 유지한다.
- 간호사 개인에게 '나쁜 직원 점수'를 부여하지 않는다. 낮은 부담 점수를 이유로 다음 달 특정 직원에게 무조건 야간을 몰아주지 않는다. 근무 시간·역량·안전을 우선한다.

**C. 일반 희망 OFF 경합 점수 기본값 (법정/보호 휴가는 대상 아님)**
- 최적화가 모든 유효 요청을 만족할 수 있는지 **먼저 검사**한다. 요청이 겹쳤다는 사실만으로 경쟁/반려시키지 않는다.
- 일부 희망 OFF를 함께 충족할 수 없는 상황에서만 `off_priority_points`를 계산하며 아래 기본 가중치로 시작한다.
  - `weekend_off_deficit`: 동종 근무형태의 기대 주말 OFF 대비 최근 3개월 부족 횟수 × 10점(0~40점 상한).
  - `previous_ungranted_preferences`: 최근 3개월간 **적격 일반 희망 OFF** 미반영 횟수 × 8점(0~24점 상한). 과거 승인된 법정휴가를 '미반영'으로 계산하지 않음.
  - `recent_burden_excess`: 최근 3개월 정규화 근무 부담이 그룹 기대값보다 높은 정도에 따라 0~20점(편차 0~20%를 선형 매핑, 이후 상한).
  - `requested_importance`: 신청자가 선택한 일반 희망 우선도(일반=0점, 중요=+10점); 월 중요 요청 개수 한도(기본 1개)로 남용 방지. 민감한 개인 사유를 점수 근거로 요구하지 않는다.
- `off_priority_points = min(40,10×weekend_off_deficit_count) + min(24,8×ungranted_count) + clamp(normalized_excess_pct,0,20) + importance_points`. 최대 94점(40+24+20+10), **백분율이 아니며 100점 만점이라 표기하지 않는다**. 추가 점수 소스는 없음. 0점은 불이익 또는 신청 금지가 아니다.
- 동점 시 ① 최근 3개월 적격 희망 미반영 시점이 오래된 순 ② 이전 동률 배정에서 양보한 순 ③ 재현 가능한 회전 순번으로 처리. 경합 결과와 근거는 담당자에게만 자세히 공개하며 신청자에게 다른 직원의 개별 점수·사유는 공개하지 않는다.
- '점수가 높은 사람은 무조건 승인' 금지. 대안 배정의 하드 제약과 전체 소프트 목표를 함께 만족시키는 **후보안의 평가 입력**으로 사용한다.
- 샘플: A 부족 주말 OFF 2회/미반영 1회/부담 초과 7%/중요 아님 → 20+8+7+0 = **35점**; B 부족 0회/미반영 2회/부담 초과 0%/중요 요청 → 0+16+0+10 = **26점**. 둘 다 가능한 상황에만 A 우선 고려; 실제 선택은 전체 가능 배정을 검증한 후 확정.

**D. 자동 편성 최적화 목표 및 편성안 품질 점수**
- 1순위: 모든 hard constraints 충족. 불가능하면 `INFEASIBLE`로 진단하고 점수/가중치를 조절해 강제로 통과시키지 않는다.
- hard 제약 충족 후보에 한해 목적 함수를 계층형으로 평가한다: (1) 적격 일반 희망 OFF 반영(경합 우선순위 가중) (2) 직원별 정규화 부담 편차 최소화 (3) 야간/주말/공휴일 개별 편차 최소화 (4) 피로 패턴 최소화 (5) 근로시간 목표 편차 최소화 (6) 확정본 수정 최소화. 각 단계 안의 기준/가중치는 설정 버전과 목적 함수 breakdown으로 공개. 단순 우선순위가 극단적 불평등을 만들면 상한/최대 불이익 제한을 적용.
- UI의 `fairness_score`는 가시성을 위한 **0~100 품질 지수**이며 최적화 솔버의 목적 함수값과 구분. 후보안 집합의 최악/최선에 따라 임의로 점수를 조작하지 말고, 고정된 정책별 기준치를 이용해 `100 - weighted_normalized_penalties`를 0~100으로 clamp한다. 각 감점 구성요소를 공개하고 미설정 기준치는 `N/A` 처리한다. 초기 목표 가중치 예시: 부담편차 35%, 희망미반영 25%, 야간·주말 불균형 25%, 피로패턴 15%. 필수 조건 위반 후보에는 종합점수를 표시하지 않는다.
- 후보 2~3개 비교 시 '공정성 점수 91/100' 같은 숫자만 보여주지 않고 반드시 원시 측정값, 기준 기간, 편차 및 가중치 내역을 함께 제공한다.

**E. 5단계 데이터 처리 파이프라인 (반드시 코드와 UI 흐름에 일치)**
1. **정책 설정**: 수간호사가 교대·휴게·인원·자격·휴식의 필수 규칙 및 부담·OFF 점수 가중치 설정 → 미리보기/유효성 검사 → `policy_version` 발행. 병원 검토 전 법정 요건을 임의로 수정할 수 없도록 잠금.
2. **이력 계산**: 확정 근무표·유효 신청 결과를 집계하여 직원별 월별 부담 구성요소/정규화 지표/주말 OFF/미반영 횟수를 생성. 최근 3개월 기본, 6개월 선택. 실적이 없는 신규 직원은 `insufficient_history`로 표시하고 중립 기대값 사용.
3. **자동 편성**: 현재 월 신청·가용성·커버리지·역량·경계월 조건을 반영해 제약 충족 후보를 만들고 위 공정성/경합 우선순위를 최적화. 정책 이외의 숨은 AI 의사결정 금지.
4. **이유 설명**: 배정마다 필수 조건, 상대적 부담, 희망 반영 영향, 반영 가능한 대안, 신청 충돌 이유를 `reason_codes + underlying_facts + policy_version`으로 제공. 수동 변경의 이유와 변경자를 저장.
5. **익월 보정**: 확정 결과를 실제 근무 기록과 구분해 월 마감 시 누적 지표를 갱신. 전월 미반영 일반 희망 OFF, 주말/야간 편차를 익월 소프트 목표에 반영. 소멸·상한 정책 버전 관리(기본 3개월 rolling), 보호 휴가/법정 휴가에는 불이익 점수 이월 금지. 월 경계 수정/교환 발생 시 영향을 받는 지표와 설명을 재계산하고 역사 스냅샷 보존.

**DB·API 구현 계약 추가**
- `fairness_policy_versions`(병동, 유효 시작/끝, 승인자, JSON 설정 스냅샷/검증된 스키마), `fairness_weight_rules`(유형·가중치·상한·대상·중복규칙), `staff_monthly_fairness_metrics`(staff, period, policy version, 세부 계산값, 계산 시각, 입력 snapshot hash), `off_request_priority_evaluations`(request, policy version, 구성 항목, 비교 그룹, 공개 범위), `schedule_candidate_score_breakdowns`(run/candidate, 세부 지표, 종합 점수, 충족 여부), `monthly_carryover_balances`(staff, period, 미반영 횟수, 만료, 영향값, 원천 이벤트)를 ERD 및 마이그레이션에 반영한다. 기존 테이블의 정규화/버전 구조와 충돌하면 중복 엔터티 없이 통합하되 정보는 빠뜨리지 않는다.
- `GET /api/wards/:id/fairness/policies`, `POST /api/wards/:id/fairness/policies/preview`, `POST /api/wards/:id/fairness/policies/publish`, `GET /api/staff/:id/fairness-breakdown?period=...`, `GET /api/time-off-requests/:id/priority-explanation`, `GET /api/schedule-candidates/:id/score-breakdown`, `POST /api/wards/:id/fairness/recalculate?period=...`를 기존 API 컨벤션에 맞춰 지원한다. 재계산 권한과 감사 로그 필수.
- 금액/시간/가중치 계산 시 부동소수점 누적 오류를 피하도록 Decimal 또는 정수 기반 fixed point를 사용하고 반올림 정책을 고정한다. 정책 버전·입력 데이터가 같으면 동일한 구성 요소 점수가 나와야 한다.

### 6-5. 편성 불가 및 충돌 설명 (최중요)
- 사용자에게 `왜 불가능한지`를 읽기 쉬운 언어로 보여준다.
- 예: "11월 14일 야간에 2명 필요하지만, 자격·승인 휴가·최소 휴식 규정을 지키면 배정 가능한 직원이 1명뿐입니다."
- 가능한 원인 목록: 인원 부족, 특정 숙련도 부족, 연속근무 상한, 최소 휴식, 고정근무, 승인 휴가, 월 총시간 제약, 주말 희망 중복.
- 진단은 실제 규칙 검사 결과에서 추출한다. LLM이 만들어낸 근거 금지. 완전한 최소 불만족 핵(unsat core) 분석이 불가능할 땐 '가능성 있는 충돌 원인'으로 구분 표시.
- **완화 가능한 것은 오직 soft 조건**. 수정 제안: 해당 날짜 다른 지원 가능자 검토, 희망 OFF 대안 날짜, 추가 인력 필요, 조건 변경(권한 있는 담당자+감사 로그).
- 모든 자동 생성 결과에 `schedule_run_id`, 입력 스냅샷 해시, 규칙 버전, solver 버전, 시드, objective breakdown, 제약 검사 결과, 이유 코드 저장.

## 7. 오프 신청 충돌 처리 정책

### 분류
- `PREFERENCE_OFF`: 일반 희망 OFF (경합 점수 가능)
- `ANNUAL_LEAVE`: 법정 연차/휴가 (권리와 법적 절차에 따라 별도 처리)
- `PROTECTED_LEAVE`: 법정 보호 휴가 등 (보호 처리, 사유 최소 수집)
- `UNAVAILABLE`: 근무불가(근거/승인 절차 별도)
- `PREFERRED_SHIFT`: 선호 근무/비선호 근무

### 신청 상태
`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/NOT_GRANTED/WITHDRAWN`; 휴가별로 법적/정책적 상태 구분. 제출·수정·철회는 마감/권한에 따라 처리. 사용자에게 신청과 근무표 반영은 구별해 표시.

### 충돌 표시·설명
- 동일 날짜 요청 n명, 가용 인원, 필요 커버리지, 숙련 가능 인원, 최근 주말 OFF 분배, 이전 요청 미반영, 희망 우선순위 등 보여주기.
- '신청이 겹쳤다 = 자동 반려' 금지. 전체 근무표의 가능한 배치를 먼저 평가.
- 경합 예시: A/B 둘 다 토요일 OFF 희망, 한 명만 가능 → 각자의 과거 주말 OFF, 요청 미반영 이력, 이미 승인된 휴가, 숙련/휴식 조건을 공개 가능한 범위에서 비교하여 담당자에게 설명.
- 점수가 동률일 때는 사전에 합의된 타이브레이커(최근 미반영 순, 순환 우선권, 공개 추첨 시드 등) 적용. *신청을 먼저 클릭한 사람만 무조건 이득* 같은 불투명 편향 금지.
- **개인정보 보호**: 본인에게는 자신의 요청 결과와 일반적인 편성 이유만 공개하고 타인의 휴가 사유·민감정보·개인별 점수는 열람 불가. 담당자 화면에는 업무상 필요한 최소 근거만 제공.
- 승인된 휴가의 취소/변경은 일반 희망 OFF와 동일한 자동 처리 대상이 아니다.

## 8. 인력관리

- 직원 추가/수정/비활성화, 계정 초대, 역할 및 병동 배정, 입/퇴사·휴직 유효일, 자격 태그, 근무 형태(상근/교대/야간전담/시간제), 개인 가능 일/시간, 계약기준 시간(정책적으로 민감한 정보 취급).
- 초보 사용자에게 '기본 정보 → 근무 가능 조건 → 자격/숙련 → 확인' 단계형 마법사 제공.
- Excel/CSV 일괄 입력은 미리보기/검증/취소 및 오류 행 표시 후 확정. 가져오기 파일에 민감정보가 섞여 있으면 차단·경고.
- 직원 삭제 대신 `inactive` 및 이력 보존; 근무표 외래 키 깨지지 않게.
- 숙련도는 단일 점수보다 `skill_tags`, `credential_validity`, `can_lead_night`, `requires_supervision` 같은 명확한 역량 조건.

## 9. 데이터베이스 설계 — 변경·확장에 강한 정규화 모델

원칙: 실제 업무 엔터티는 명확한 테이블과 FK를 사용한다. **근무 유형, 근무시간, 커버리지, 휴가 정책, 공정성 가중치를 하드코딩 또는 직원 테이블의 열로 늘리지 않는다**. 설정값은 버전/유효기간 관리. 자유 JSONB는 확장 메타데이터에만 제한적으로 사용하고 핵심 쿼리 필드는 정규화한다.

### 권장 테이블
- `wards(id, name, timezone, status, created_at, updated_at)`
- `users(id, login_id, password_hash_or_external_auth_id, status, created_at)`
- `ward_memberships(id, ward_id, user_id, role, effective_from, effective_to)`
- `staff_profiles(id, user_id, display_name, staff_code, active_status, joined_on, left_on)`
- `staff_employment_periods(id, staff_id, ward_id, employment_type, target_work_minutes_per_period, effective_from, effective_to)`
- `skills(id, code, label)`
- `staff_skill_periods(id, staff_id, skill_id, valid_from, valid_to, proficiency_level)`
- `shift_templates(id, ward_id, code, label, color_token, sort_order, is_active)`
- `shift_template_versions(id, shift_template_id, starts_at_local, ends_at_local, end_day_offset, break_policy_id, effective_from, effective_to, version)`
- `break_policies(id, ward_id, definition, version, effective_from, effective_to)` — definition 구조와 검증은 스키마 및 코드에서 명시; 무검증 JSON 금지
- `coverage_requirements(id, ward_id, shift_template_id, weekday_or_holiday_scope, minimum_staff, effective_from, effective_to)`
- `coverage_skill_requirements(id, coverage_requirement_id, skill_id, minimum_staff)`
- `policy_versions(id, ward_id, version, effective_from, created_by, published_at, status)`
- `policy_rules(id, policy_version_id, rule_type, parameter_json, hard_soft, weight, justification, source_reference)` — 지원하는 rule_type별 스키마 검증, 유형별 API 계약
- `leave_types(id, ward_id, code, category, name, enabled, approval_policy_id)`
- `time_off_requests(id, staff_id, ward_id, request_type, status, created_at, submitted_at, reviewed_by, reviewed_at, revision)`
- `time_off_request_dates(id, request_id, local_date, optional_rank, preferred_shift_template_id)`
- `request_decisions(id, request_id, decision, reason_codes, explanation_snapshot, decided_by, decided_at)`
- `staff_availability(id, staff_id, local_date, availability_kind, start_local, end_local, reason_code, valid_from, valid_to)`
- `schedule_periods(id, ward_id, start_date, end_date, status, policy_version_id, created_by, version)`
- `schedule_versions(id, schedule_period_id, version_number, status, created_at, published_at, created_by, parent_version_id, change_reason)`
- `shift_assignments(id, schedule_version_id, staff_id, shift_template_version_id, start_at_utc, end_at_utc, local_start_date, paid_work_minutes, break_minutes, source, lock_status, note)`
- `schedule_runs(id, schedule_period_id, policy_version_id, solver_version, status, seed, input_snapshot_hash, objective_json, diagnostics_json, created_by, created_at)`
- `run_candidates(id, schedule_run_id, rank, total_score, fairness_metrics_json, coverage_metrics_json, constraint_check_json)`
- `run_candidate_assignments(id, run_candidate_id, staff_id, shift_template_version_id, start_at_utc, end_at_utc)`
- `explanation_facts(id, schedule_run_id, subject_type, subject_id, reason_code, rule_version, fact_json, explanation_text)`
- `audit_logs(id, actor_id, action, entity_type, entity_id, before_json, after_json, at_utc, request_id)`
- `notifications(id, user_id, type, payload_json, read_at, created_at)`

### 데이터 설계 검증 사항
- 모든 FK, unique, check constraint, 이력 보존 및 인덱스(ward, staff, month, start datetime) 설계.
- 교대 버전의 시점 충돌 금지, 유효 기간 중복 방지, soft delete 또는 상태 전이 활용.
- API 변경에 강하도록 DTO/Domain/Repository 분리. DB migration 필수(Alembic 등).
- `updated_at` / optimistic concurrency `version`을 사용해 동시 편집 충돌 해결.
- 날짜는 현지 일자(`local_date`)와 실제 UTC 인스턴트를 혼동하지 않는다.
- 일정 확정은 버전 스냅샷으로 보존; 최신 정책 수정이 과거 근무표를 자동 변경해서는 안 된다.
- DB 관리 화면에서 사람이 스키마를 직접 수정하게 하지 말 것. **근무 유형/휴게/인원/가중치/직원 변경은 설정 UI를 통해** 수행하도록.
- 내보내기/백업 및 복구 시나리오, 데이터 보존 정책, 권한별 필드 반환 필터 필수.

## 10. API 설계 기본

- `GET /api/me`, `GET /api/wards/:id/staff`, `POST /api/wards/:id/staff`, `PATCH /api/staff/:id`
- `GET/POST/PATCH /api/wards/:id/shift-templates`
- `GET/POST /api/wards/:id/policies`, `POST /api/wards/:id/policies/:version/publish`
- `GET/POST /api/wards/:id/coverage-requirements`
- `GET/POST/PATCH /api/wards/:id/time-off-requests`, `POST /api/time-off-requests/:id/decision`
- `GET /api/wards/:id/schedule-periods/:periodId`, `POST /api/schedule-periods/:id/generate`
- `GET /api/schedule-runs/:runId`, `GET /api/schedule-runs/:runId/candidates`, `GET /api/schedule-runs/:runId/explanations`
- `POST /api/schedule-periods/:id/apply-candidate`, `PATCH /api/schedule-versions/:versionId/assignments/:id`, `POST /api/schedule-versions/:versionId/publish`
- `GET /api/wards/:id/fairness?from=...&to=...`, `GET /api/wards/:id/audit-logs`

필수: 실제 OpenAPI 스키마 자동 생성, 서버 측 스키마 검증, role/ward scope 검사, 입력 검증, 오류 코드, 페이지네이션, 쓰기 트랜잭션, 비공개 정보 마스킹. URL은 초안이므로 구현 중 라우팅 일관성에 맞게 조정 가능.

## 11. '왜 이렇게 편성됐나요?' 설명 기능 — 제품의 차별점

각 배정에는 설명 버튼 또는 정보 패널. 다음 항목을 구분:
1. **필수 근거**: 왜 이 시간에 최소 인원이 필요한가, 이 사람이 어떤 필수 역량을 충족했는가.
2. **개인별 배정 근거**: 지난달 배정 분포, 요청 사항, 최소 휴식, 선호 충족, 대안 존재 여부.
3. **공정성 기여**: 이 배정 후 야간/주말 부담의 그룹 내 편차가 어떻게 바뀌었는지.
4. **희망 OFF 미반영 근거**: 동일 날짜 신청자 수, 가용 인원 수, 필요한 자격·역할 수, 반영 우선순위와 대안 날짜.
5. **수동 변경 설명**: 담당자의 변경·승인 사유 및 시각.

설명은 `reason_codes + underlying facts + policy_version`으로 재현 가능해야 한다. 자연어 템플릿 우선. LLM 요약을 사용할 경우 원문 팩트를 변경할 수 없도록 근거 포함 구조화 입력 및 결과 검증. 설명 근거가 불충분한 경우 "정확한 단일 원인을 확정할 수 없음"이라고 말하고 후보 요인을 제시.

예시 (가상):
- "10월 23일 나이트는 최소 1명 필요하며, 직원 A가 해당 날짜에 필요한 자격을 보유하고 있습니다. 직원 B는 승인 휴가, 직원 C는 이전 근무 종료 후 최소 휴식 조건 때문에 배정할 수 없었습니다."
- "10월 24일 주말 OFF 신청이 3건으로 겹쳤습니다. 해당 날짜에 필요 인력을 유지하면서 1건을 반영할 수 있었고, 동일한 고용 조건 내 최근 3개월 주말 OFF 배분과 이전 미반영 이력을 반영하여 A의 희망을 우선 검토했습니다."

**불가능한 설명 금지**: CP-SAT이 어떤 배정을 선택한 유일한 인과적 이유를 보장하지 않는 경우 '선택 근거/목표 기여'와 '가능했던 대안'으로 구분하고, 사후 분석을 통해 검증된 내용만 표시.

## 12. 핵심 업무 흐름

### 월간 근무표 생성
1. 관리자 → 다음 달 만들기.
2. 기간과 정책 버전, 최소 인원, 직원 가용성, 승인 휴가, 신청 마감 여부를 사전 확인.
3. 입력 데이터 품질 검사(누락, 중복, 자격 만료, 누적 이전 달 상태 등).
4. 자동 편성 실행. 불가능하면 진단 화면과 해결 가능한 선택지 표시.
5. 후보 근무표 비교 및 선택 → 전체 근무표 편집 화면.
6. 개별 셀 수정 시 즉시 서버 검증; 경고와 필수 오류를 구분.
7. 초안 저장 → 관리자 검토 → 확정 발행. 확정 근무표는 이력으로 보존.
8. 이후 근무 교환/변경은 변경 요청 워크플로 및 재검증 후 재확정.

### 간호사 OFF 신청
1. 내 캘린더 → 날짜 다중 선택 → 종류 선택 → 신청(마감·중복·기존 신청 확인).
2. 결과는 `접수됨`, `검토 중`, `확정 반영`, `미반영` 등 알기 쉬운 한국어 상태.
3. 미반영의 근거와 다음 가능한 선택(대체일 신청, 담당자 문의)을 표시.
4. 다른 간호사의 민감한 신청 내역은 노출하지 않는다.

## 13. 필수 테스트 세트 — 보이는 데모가 아닌 기능 검증

### 데이터/근무시간
- 자정 넘는 근무 `18:00 → 익일 08:00`의 시작·종료·근무시간/휴게시간 계산.
- 월말 나이트(10월 31일 시작 → 11월 1일 종료), 지난달/다음달 경계 연속근무·휴식.
- 2교대에서 3교대로 정책 전환 후 과거 근무표가 변경되지 않음.
- 근무 유형 추가/삭제(사용중인 템플릿은 비활성화), 색·명칭 변경과 통계 정합성.

### 자동 편성
- 주어진 인원·숙련·휴식·허가 휴가를 모두 준수하는 경우만 `FEASIBLE`.
- 6명 + 근무 인원 수요가 과다해 물리적으로 불가능한 경우 `INFEASIBLE`과 구체적 진단 반환.
- 동일 직원에게 겹치는 근무 배정 불가.
- 필수 제약 임의 완화 없음. 희망 OFF가 겹칠 때 하드 커버리지 우선.
- 시드/정책/입력 스냅샷 재현 가능성, 공정성 점수 근거/지표 검증.
- 위 6-4A의 부담 점수 예제 26.5점, OFF 경합 A=35/B=26점, 주말+공휴일 중복 방지, 3개월 이월 상한/만료 및 신규 직원 중립값 자동 테스트.
- 2교대→3교대 전환 시 정책 버전별 점수 변동 적용, 과거 확정 점수 스냅샷 불변 및 수동 변경 후 재계산 검증.
- 후속 월 경계를 고려한 휴식. 편성 후보의 자격 충족 검증.

### 신청·설명
- 2인 이상 같은 토요일 OFF 신청 시 승인 가능량 및 충돌 표시.
- 연차/보호휴가와 희망 OFF가 다른 정책 경로를 탐.
- 직원 본인은 타인의 휴가 사유/개별 점수 볼 수 없음.
- 설명에 없는 수치·근거를 LLM이 생성하지 않음.
- 근무표 수동 수정 후 기존 설명을 무효화하거나 재계산.

### UX/보안
- 모바일 390px, 320px; PC 1280px; 태블릿 768px.
- 키보드/스크린리더, 큰 글자/200% 확대, 명확한 상태 표시.
- 권한 없는 관리자 API 접근 차단, 타 병동 데이터 접근 차단.
- 두 관리자가 동시에 같은 셀 변경 시 버전 충돌 처리.
- 네트워크/서버 오류 시 저장했다고 거짓 표시하지 않음.
- 백업/복구 연습 및 이력 정확성.

## 14. 구현 단계 및 완료 기준

### Phase 0 — 요구사항/기술점검
- 기존 프로젝트 조사, 세부 PRD/IA/UX flow/ERD/정책 규칙표/테스트 계획 및 결정 로그 생성.
- 6명, D 08~18, N 18~08로 시작하되 인력수요·휴게·계약조건·안전규칙은 미확정 설정으로 처리.
- 완료 조건: 정책 미확정 항목이 코드가 아닌 설정 스키마와 문서로 명시됨.

### Phase 1 — 디자인 시스템 및 클릭 가능한 화면
- 토큰, 공통 내비게이션, 개인 월간 달력, 신청 폼, 관리자 전체 그리드, 인력관리, 설정 화면 구성.
- 이 단계는 가상 데이터로 가능하나 실제 API와 연결 가능한 데이터 계약 준수. 모의 동작은 '데모'라고 표시.
- 완료 조건: 390/768/1280에서 가독성, 주요 클릭 흐름 확인, 스크린샷/시각 테스트 보고.

### Phase 2 — DB/인증/API
- 마이그레이션, 직원/근무 템플릿/버전/정책/신청/일정 CRUD, 권한, 백업.
- 완료 조건: 실제 DB에 저장·재조회, 자동 테스트 및 API 계약 통과.

### Phase 3 — 수동 근무표/휴가 신청
- 근무표 편집, 오프 신청/검토, 상태 전이, 변경 이력, 사용자별 일정 조회.
- 완료 조건: 6명 월간 편성 데이터를 입력/수정/저장/권한 분리 가능.

### Phase 4 — 최적화 엔진
- 커버리지/휴식/역량/직원 가용성 및 6-4A의 OFF 우선순위·정규화 공정성 목표를 실제 솔버에 연결. 실행 결과/실패 진단·점수 세부내역 저장.
- 완료 조건: 타당/불가능 시나리오 테스트 및 실제 그리드 후보 적용.

### Phase 5 — 공정성/설명 엔진
- 6-4A의 5단계 점수제 파이프라인, 정책 편집 UI, 정량 지표, 3개월 이월 보정, 요청 충돌 근거, 조정 사유, 대안 탐색, 개인용 정보 마스킹.
- 완료 조건: 설명 수치가 계산 원본과 일치하는 자동 테스트 통과.

### Phase 6 — 통계/내보내기/운영 보강
- 공정성 비교 차트, 검색, Excel 내보내기, 변경 통계, 알림, 오프라인 장애 UX.
- 완료 조건: 병동 담당자가 데모 데이터로 한 달 편성→확정→내보내기 완수.

### Phase 7 — 실사용 검수 준비
- 병원 내부 법무/인사/보안/병동 책임자와 정책 점검 필요 항목 목록 작성. 개인정보 처리 및 보존정책 검토.
- 완료 조건: 미해결 규정·보안 이슈를 숨기지 않고 출시 차단 체크리스트로 정리.

## 15. 에이전트의 첫 응답 형식

지금 당장 다음 작업을 시작하라. 질문을 이유로 멈추지 말고 미확정 정보를 설정 가능한 기본값과 TODO로 남겨라.
1. 프로젝트 구조 조사 요약
2. 구현하려는 스택 및 선택 이유
3. 우선순위가 반영된 화면/라우트 맵
4. 근무 템플릿/정책/DB 아키텍처 핵심 결정
5. 스킬 6개 탐색 결과(발견·미설치·적용 계획)
6. Phase 0 문서 작성 및 Phase 1 디자인 시스템/핵심 화면 착수
7. 완료 후 증거(테스트·스크린샷·파일 경로) 보고

사용자 확인이 꼭 필요한 법/병동 운영 설정은 '실운영 전에 확인 필요' 목록으로 모으되 개발을 진행한다. 사용자 승인 없이 실제 병원 운영 데이터에 적용하거나 알림을 발송하지 않는다.

---

## 부록 A. 초기 병동 설정에서 꼭 확인할 질문 (제품 내 설정 마법사로 수집)

1. 실제 인원 6명 각각의 고용 형태/월 기준 근무시간/자격 및 근무 가능 범위는?
2. D/N 각 시간대에 간호사 몇 명씩 필수이며, 분만/수술 대응에 특정 자격이 필요한가?
3. D 10시간/N 14시간 중 실제 휴게/실근로시간은 얼마이며 휴게가 실질적으로 보장되는가?
4. 월 OFF/연차/야간 상한/야간 후 OFF/연속근무/근무 간 최소 휴식에 대한 병원 규정은?
5. 희망 OFF 신청 마감일과 승인자는? 연차와 단순 희망 OFF의 절차는?
6. 병원 외부에서 스마트폰으로 접속할 필요가 있는가? 내부망만 쓸 것인가?
7. 병원 공식 근무표 양식과 직원 정보 수집/보관 승인 요건은?

### 실현가능성 사전 검사 예시

- 24시간을 2교대로 커버하면 D는 10시간, N은 14시간의 **체류 시간**을 차지한다.
- 근무별 최소 1명이라면 1주일 168시간의 **근무 커버리지**가 필요하므로 6명에게 평균 28시간 커버리지가 요구된다(휴게/근무시간 산정 별도).
- D와 N에 각각 최소 2명이라면 1주일 336 인시 커버리지가 필요하고 6명당 평균 56시간이 요구된다(휴게/근무시간 산정 별도). 운영 규정상 불가능할 수 있다.
- 따라서 **필요 인원 설정과 실근로시간·계약 조건 확인 없이 자동 스케줄을 '성공'이라고 보여주지 말 것**.

## 부록 B. 추천 참고 자료

- Google OR-Tools Nurse Scheduling 공식 문서: https://developers.google.com/optimization/scheduling/employee_scheduling
- Vercel React Best Practices: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Vercel Composition Patterns: https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
- UI UX Pro Max 예시 원본: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- 근로기준법 최신 조문은 국가법령정보센터 https://www.law.go.kr/ 에서 병원 상황별로 확인할 것.
