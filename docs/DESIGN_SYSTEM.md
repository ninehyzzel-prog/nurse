# 디자인 시스템 명세 (DESIGN_SYSTEM)

> 상태: **Phase 0 확정 v0.1** · 근거: [MASTER_PROMPT.md](../MASTER_PROMPT.md) §4 · 참고 스킬: `frontend-design`, `ui-ux-pro-max`, `impeccable`

---

## 1. 디자인 철학 및 원칙

1. **차분하고 신뢰감 있는 임상 B2B 생산성 UI:**
   - 피로감이 심한 병동 환경을 고려하여 채도가 지나치게 높은 원색을 지양하고, 눈이 편안한 밝은 뉴트럴 배경과 정제된 딥 블루/슬레이트 계열을 기본으로 삼는다.
2. **색상 + 문자 레이블 병기 (접근성 최우선):**
   - 색맹/색약 사용자를 고려하여 교대 근무를 식별할 때 색상에만 의존하지 않는다. 칩 내부에는 반드시 `D`, `N` 등의 약어 코드와 텍스트 레이블을 함께 표기한다.
3. **터치 타겟 44×44px 준수:**
   - 모바일 캘린더 날짜 셀, 주요 액션 버튼 등은 최소 44×44px의 유효 터치 영역을 확보하여 오작동을 방지한다.
4. **명확한 정보 위계와 장식 배제:**
   - 과도한 그라디언트, 무의미한 일러스트는 배제하며, 테이블 보더와 여백(Whitespace)을 구조적 정보 전달 도구로 활용한다.

---

## 2. 디자인 토큰 (CSS Variables)

```css
:root {
  /* 1. Base Neutrals (차분한 임상 배경 및 텍스트) */
  --color-bg-app: #F8FAFC;         /* slate-50 */
  --color-bg-surface: #FFFFFF;     /* white */
  --color-bg-muted: #F1F5F9;       /* slate-100 */
  --color-border: #E2E8F0;         /* slate-200 */
  --color-border-strong: #CBD5E1;  /* slate-300 */
  
  --color-text-primary: #0F172A;   /* slate-900 (기본 본문) */
  --color-text-secondary: #475569; /* slate-600 (보조 레이블) */
  --color-text-muted: #94A3B8;     /* slate-400 (비활성) */

  /* 2. Brand & Semantic Colors */
  --color-brand-primary: #0284C7;  /* sky-600 (신뢰감 있는 임상 블루) */
  --color-brand-hover: #0369A1;    /* sky-700 */
  --color-brand-light: #E0F2FE;    /* sky-100 */
  
  --color-success: #16A34A;        /* green-600 */
  --color-success-bg: #DCFCE7;
  --color-warning: #D97706;        /* amber-600 */
  --color-warning-bg: #FEF3C7;
  --color-danger: #DC2626;         /* red-600 */
  --color-danger-bg: #FEE2E2;

  /* 3. Shift Template Tokens (교대별 색상 토큰) */
  --shift-day-bg: #E0F2FE;         /* 주간: 청량한 스카이 */
  --shift-day-text: #0369A1;
  --shift-day-border: #BAE6FD;

  --shift-night-bg: #EDE9FE;       /* 야간: 차분한 바이올렛 */
  --shift-night-text: #6D28D9;
  --shift-night-border: #DDD6FE;

  --shift-evening-bg: #FEF3C7;     /* 이브닝 (3교대 확장용): 웜 앰버 */
  --shift-evening-text: #B45309;
  --shift-evening-border: #FDE68A;

  --shift-off-bg: #F1F5F9;         /* 오프: 뉴트럴 슬레이트 */
  --shift-off-text: #64748B;
  --shift-off-border: #E2E8F0;

  --shift-leave-bg: #DCFCE7;       /* 연차/휴가: 세이지 그린 */
  --shift-leave-text: #15803D;
  --shift-leave-border: #BBF7D0;

  /* 4. Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* 5. Typography Scale (기본 16px, 행간 1.5) */
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  
  --line-height-normal: 1.5;
  --line-height-tight: 1.25;

  /* 6. Interaction & Accessibility */
  --min-touch-target: 44px;
  --focus-ring: 2px solid #0284C7;
  --focus-ring-offset: 2px;
}
```

---

## 3. 필수 상태 (9가지 State) 명세

모든 주요 화면과 컴포넌트는 다음 9가지 상태를 명확히 표현한다.

1. **로딩 (Loading):** 스켈레톤 UI 또는 명확한 스피너 (화면 깜빡임 없는 안정적 레이아웃).
2. **빈 상태 (Empty):** "신청 내역이 없습니다. 하단 버튼을 눌러 새 오프를 신청하세요." 등 다음 행동 유도 CTA 제공.
3. **오류 (Error):** 사과 문구 없이, 원인과 조치 방법 명시 ("최소 11시간 휴식 규칙 위반으로 배정할 수 없습니다").
4. **오프라인/네트워크 불안정 (Offline):** "네트워크 연결이 끊겼습니다. 작성 중인 내용은 임시 보관되며 재연결 시 전송됩니다."
5. **충돌 발생 (Conflict):** 날짜 셀에 앰버 배지 표시 및 `ConflictPanel` 자동 연결.
6. **접수/검토 중 (Pending):** `접수됨`, `검토 중` 상태 배지 (간호사 뷰).
7. **초안 (Draft):** 관리자 화면 상단에 "초안 (미발행)" 노출, 수동 편집 가능.
8. **확정 발행됨 (Published):** "2026년 11월 확정 근무표", 자물쇠 아이콘, 임의 변경 차단(수정 시 사유 입력 필요).
9. **보관됨 (Archived):** 과거 이력 읽기 전용 상태.
