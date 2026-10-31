# 사용자 경험 흐름도 (USER_FLOWS)

> 상태: **Phase 0 확정 v0.1** · 근거: [MASTER_PROMPT.md](../MASTER_PROMPT.md) §3, §12

---

## 1. 간호사 핵심 흐름: 모바일 내 근무 확인 및 오프 신청

### 1-1. 내 근무표 조회 및 상세 확인 (모바일)
```mermaid
flowchart TD
    Login[로그인 /me/schedule] --> CalView[월간 캘린더 뷰 로드]
    CalView --> SummaryBadge[상단 월 요약: D n회, N n회, OFF n회]
    CalView --> TapDate[특정 날짜 탭 (44px 터치 타겟)]
    TapDate --> BottomSheet[하단 상세 바텀시트 오픈]
    BottomSheet --> Details[근무명, 실제 체류/휴게시간, 동료 근무자(필수정보만), 익일 종료 안내]
    BottomSheet --> ActionBtn[해당 일자 오프 신청 바로가기 CTA]
```

### 1-2. 오프 및 휴가 2단계 신청 플로우
```mermaid
flowchart TD
    StartReq[신청 시작 /me/requests/new] --> Step1[1단계: 신청 달력에서 일자 다중 선택]
    Step1 --> CheckDeadline{신청 마감일 경과 여부}
    CheckDeadline -- 마감됨 --> BlockAlert[마감 안내 및 신청 차단]
    CheckDeadline -- 신청 가능 --> Step2[2단계: 신청 유형 및 옵션 선택]
    Step2 --> SelectType{유형 선택}
    SelectType -- 일반 희망 OFF --> PrefOpt[중요 요청 체크박스 (월 1건 한도) & 일반 사유]
    SelectType -- 법정 연차 LEAVE --> AnnualOpt[사유 선택 (연차 관리 규정 연동)]
    SelectType -- 보호 휴가 PROTECTED --> ProtOpt[유형만 선택 (사유 수집 최소화 안내)]
    PrefOpt --> Submit[신청서 제출 완료]
    AnnualOpt --> Submit
    ProtOpt --> Submit
    Submit --> Toast[상태 안내: '접수됨(SUBMITTED)' 토스트]
    Toast --> MyReqList[/me/requests 신청 내역으로 이동]
```

---

## 2. 근무표 작성자(수간호사) 핵심 흐름: 월간 편성부터 확정까지

```mermaid
flowchart TD
    AdminHome[운영 홈 /admin] --> NewMonth[다음 달 편성 시작]
    NewMonth --> PreCheck[1단계: 실현가능성 사전 검사]
    PreCheck --> CheckResult{사전 검사 결과}
    CheckResult -- 인원/규칙 충돌 --> PreWarn[경고: 요구 인시 대비 가용인력 부족 경고 & 조정 제안]
    CheckResult -- 통과 --> RunSolver[2단계: 자동 편성 실행 (CP-SAT)]
    RunSolver --> SolverStatus{솔버 결과}
    SolverStatus -- INFEASIBLE --> DiagReport[불가 진단 리포트 출력: 원인 규칙 및 대안 제시]
    SolverStatus -- FEASIBLE --> CompareView[3단계: 후보안 2~3개 비교 화면]
    CompareView --> InspectCandidate[공정성 점수, 희망 반영률, 야간/주말 편차, 미해결 소프트 제약 비교]
    InspectCandidate --> SelectCandidate[최적 후보안 채택 $\rightarrow$ 그리드 편집기 반영]
    SelectCandidate --> GridEditor[4단계: 전체 근무표 매트릭스 편집기]
    GridEditor --> ManualEdit[셀 선택 / 키보드 편집 / 복사붙여넣기]
    ManualEdit --> RealtimeValidation[서버 즉시 유효성 검사 (하드 에러 vs 소프트 경고)]
    GridEditor --> DraftSave[초안 저장 (DRAFT)]
    DraftSave --> FinalPublish[5단계: 최종 확정 발행 (PUBLISH)]
    FinalPublish --> CarryoverUpdate[익월 이월 지표 자동 갱신 & 간호사 캘린더 공개]
```

---

## 3. 오프 경합 및 충돌 해결 흐름

```mermaid
flowchart TD
    ConflictList[충돌 관리 /admin/requests] --> SelectDate[경합 발생 일자 선택 (예: 11월 14일 토요일)]
    SelectDate --> ConflictPanel[ConflictPanel 오픈: 신청 3인 / 반영 가능 1인]
    ConflictPanel --> ViewBreakdown[점수 Breakdown 확인: A=35점, B=26점, C=15점]
    ViewBreakdown --> AutoSuggest[시스템 권고: 간호사 A 우선 반영 제안]
    AutoSuggest --> Decision{작성자 결정}
    Decision -- 시스템 권고 수용 --> ApproveA[간호사 A 승인, B/C 미반영 처리]
    Decision -- 수동 조정 (예: B 승인) --> OverrideInput[수동 변경 사유 필수 입력 (감사로그 기록)]
    OverrideInput --> ApproveB[간호사 B 승인 처리]
    ApproveA --> UpdateExplanation[사유 팩트 저장 및 개인별 알림 발송]
    ApproveB --> UpdateExplanation
```
