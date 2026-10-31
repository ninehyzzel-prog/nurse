# 화면 및 라우트 맵 (SCREEN_MAP)

> 상태: **Phase 0 확정 v0.1** · 근거: [MASTER_PROMPT.md](../MASTER_PROMPT.md) §3, §4

---

## 1. 전체 라우트 구조

```
/
├── login                          # 공통 로그인
├── me/                            # [간호사 전용] 모바일 퍼스트 레이아웃
│   ├── schedule                   # ★ [우선화면 1] 내 근무표 (월간/주간/일간)
│   ├── requests                   # 오프/휴가 신청 내역
│   │   └── new                    # ★ [우선화면 2] 오프/휴가 신청 플로우 (2단계)
│   ├── notifications              # 확정/변경/신청결과 알림
│   └── profile                    # 내 정보 및 가용 조건 확인
│
├── admin/                         # [근무표 작성자 전용] PC 퍼스트 대시보드 레이아웃
│   ├── (dashboard)                # 운영 홈 (현황, 부족인력, 빠른 행동)
│   ├── roster/
│   │   └── :periodId              # ★ [우선화면 3] 전체 근무표 편집기 (월간 31일 매트릭스)
│   ├── requests/
│   │   └── :periodId              # ★ [우선화면 4] 오프 충돌 해결 및 승인 관리
│   ├── auto-schedule/
│   │   └── :periodId              # ★ [우선화면 5] 자동 편성 실행 및 후보안 비교 패널
│   ├── staff                      # ★ [우선화면 6] 인력 관리 (직원/자격/마법사/CSV)
│   ├── policy                     # ★ [우선화면 6] 근무 정책 관리 (교대 템플릿/가중치/버전)
│   ├── fairness                   # 공정성 통계 및 3·6개월 누적 지표
│   └── audit                      # 감사 로그 및 CSV/XLSX 내보내기
│
└── system/                        # [시스템 관리자 전용]
    ├── users                      # 계정 및 병동 권한 관리
    └── backup                     # 데이터베이스 백업 및 복구
```

---

## 2. 우선 구현 6개 화면 상세 명세

| 번호 | 화면 명칭 | 라우트 | 주요 컴포넌트 | 핵심 기능 |
|---|---|---|---|---|
| **1** | **간호사 모바일 내 근무표** | `/me/schedule` | `Calendar.Root`, `Calendar.Grid`, `ShiftCell`, `BottomSheet` | • 월간 캘린더<br/>• 일자 탭 시 근무 상세/익일종료 시간 바텀시트<br/>• 월간 D/N/OFF 요약 배지 |
| **2** | **날짜 선택 $\rightarrow$ 오프 신청 플로우** | `/me/requests/new` | `MultiDateSelector`, `RequestTypeSelector`, `StickyFooterCTA` | • 달력에서 다중 날짜 선택<br/>• 유형(희망OFF/연차/보호휴가) 2단계 선택<br/>• 중요 요청 1건 지정<br/>• 하단 고정 신청 버튼 |
| **3** | **관리자 전체 근무표 편집기** | `/admin/roster/:id` | `RosterGrid.Table`, `DateHeader`, `StaffRows`, `ShiftPalette` | • 세로=간호사, 가로=31일 매트릭스<br/>• 좌측/상단 Sticky 고정<br/>• 셀 선택/키보드 이동/복사/붙여넣기<br/>• 실시간 서버 검증 및 하단 커버리지 충족 배지 |
| **4** | **오프 충돌 해결 화면** | `/admin/requests/:id` | `ConflictDateList`, `ConflictPanel`, `ScoreBreakdownCard` | • 일자별 신청 겹침 시각화<br/>• 경합 점수(주말부족/미반영/부담초과) 투명 공개<br/>• 시스템 권고 및 수동 승인/반려 |
| **5** | **자동 편성 비교 및 근거 패널** | `/admin/auto-schedule/:id` | `PreCheckWizard`, `CandidateCompareTable`, `DiagnosisPanel` | • 실현가능성 사전 검사<br/>• INFEASIBLE 시 구체적 원인 진단<br/>• 후보 1~3안 공정성/희망반영 지표 비교 채택 |
| **6** | **근무 템플릿 & 인력관리 설정** | `/admin/policy`, `/admin/staff` | `ShiftTemplateEditor`, `StaffWizard`, `PolicyVersionCard` | • D/N 시간, 휴게, 색상, 점수 편집<br/>• 3교대 전환 지원<br/>• 정책 버전(v1, v2) 발행 및 이력 보존 |
