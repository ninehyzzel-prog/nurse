# 단계별 구현 계획 (IMPLEMENTATION_PLAN)

> 상태: **Phase 0 ~ Phase 7 전체 구현 및 검증 완료 v1.0 (100%)** · 근거: [MASTER_PROMPT.md](../MASTER_PROMPT.md) §1, §14

---

## 1. 개요 및 진행 원칙

각 단계(Phase 0~7)는 **구현 $\rightarrow$ 테스트 $\rightarrow$ 시각 검수 $\rightarrow$ 결과 보고**를 완료하였다.

```mermaid
flowchart LR
    P0["Phase 0 (완료)<br/>문서·아키텍처"] --> P1["Phase 1 (완료)<br/>디자인시스템·화면"]
    P1 --> P2["Phase 2 (완료)<br/>DB·인증·API"]
    P2 --> P3["Phase 3 (완료)<br/>수동근무표·신청"]
    P3 --> P4["Phase 4 (완료)<br/>CP-SAT 솔버"]
    P4 --> P5["Phase 5 (완료)<br/>점수제·설명엔진"]
    P5 --> P6["Phase 6 (완료)<br/>통계·내보내기"]
    P6 --> P7["Phase 7 (완료)<br/>실사용검수"]
```

---

## 2. Phase별 상세 작업 및 완료 결과

### Phase 0 — 요구사항 및 아키텍처 문서화 (완료)
- **작업 결과:** `docs/` 필수 문서 13종 전체 작성 (규칙, 모델, 아키텍처, QA 기준, 디자인 시스템 등). Git 저장소 초기화.

### Phase 1 — 디자인 시스템 및 클릭 가능한 핵심 화면 (완료)
- **작업 결과:** Vite + React 19 + TypeScript 셋업, Linear 스타일 단일 목적 리팩토링, 토스페이스 3D 이모지 및 Lucide 듀얼 아이콘 전략 수립, 최소 12px 폰트 규격 적용.

### Phase 2 — 데이터베이스, 인증 및 백엔드 API (완료)
- **작업 결과:** FastAPI 백엔드, SQLAlchemy 2.0 모델, 산부인과 병동 6인 간호사 가상 시드 데이터, 교대 템플릿/정책/신청/근무표 CRUD 엔드포인트 완비.

### Phase 3 — 수동 근무표 편집 및 오프 신청 워크플로 (완료)
- **작업 결과:** `RosterEditorPage` 캘린더 드로어 연동, 실시간 서버 측 제약 검증(하드 에러 vs 소프트 경고), 오프 신청 2단계 플로우 및 상태 전이.

### Phase 4 — 제약 최적화 엔진 (OR-Tools CP-SAT) (완료)
- **작업 결과:** CP-SAT 모델링 (H-COV, H-REST 11h, H-CONSEC 5d, H-WEEK 52h, H-LEAVE), 인력 부족 사전 진단기 및 `INFEASIBLE` 진단 패널, 3종 다중 목적 후보안(균형형, 희망형, 피로최소형) 동적 생성 및 원클릭 근무표 반영.

### Phase 5 — 5단계 점수제 및 설명 엔진 (완료)
- **작업 결과:** `Decimal` 기반 5단계 점수 계산 파이프라인(`scoring_service.py`), 근무부담점수 26.50점 검증(QA-SCORE-01), OFF 경합 A=35.0점 vs B=26.0점 검증(QA-SCORE-02), MAX vs SUM 중복 가산(QA-SCORE-03), 94점 상한 및 3개월 만료(QA-SCORE-04), 신규 입사자 중립값(QA-SCORE-05), 규정 기반 설명 팩트 생성(`explanation_facts`).

### Phase 6 — 통계, 내보내기 및 운영 보강 (완료)
- **작업 결과:** `openpyxl` 기반 병원 공식 결재란 내장 엑셀(.xlsx) 내보내기, 한국어 엑셀 호환 UTF-8-BOM CSV 다운로드 엔드포인트 및 툴바 버튼, 병동 공정성 통계 차트(야간 분배, 주말 완전 OFF).

### Phase 7 — 실사용 검수 준비 (완료)
- **작업 결과:** `PRE_PRODUCTION_CHECKLIST.md` 병원 법무/인사/간호부 사전 확인 패키지 완비, 27개 단위/통합 테스트 100% 통과, 프로덕션 빌드 0 errors 완료.
