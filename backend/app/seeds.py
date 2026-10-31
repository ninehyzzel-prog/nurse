import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
import backend.app.models  # 모든 모델 등록

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. 병동 생성
        ward = db.query(backend.app.models.Ward).filter_by(id="ward-obgyn").first()
        if not ward:
            ward = backend.app.models.Ward(
                id="ward-obgyn",
                name="산부인과 병동",
                timezone="Asia/Seoul",
                status="ACTIVE",
            )
            db.add(ward)

        # 2. 역량 태그 생성
        skills_data = [
            ("skill-charge", "CHARGE_CAPABLE", "책임간호사 가능"),
            ("skill-delivery", "DELIVERY_ROOM", "분만실 대응"),
            ("skill-resus", "NEONATAL_RESUS", "신생아 소생술 이수"),
            ("skill-grad", "NEW_GRAD", "신규 (감독 필요)"),
        ]
        for sid, code, label in skills_data:
            if not db.query(backend.app.models.Skill).filter_by(id=sid).first():
                db.add(backend.app.models.Skill(id=sid, code=code, label=label))

        # 3. 휴게 정책
        bp = db.query(backend.app.models.BreakPolicy).filter_by(id="bp-standard").first()
        if not bp:
            bp = backend.app.models.BreakPolicy(
                id="bp-standard",
                ward_id="ward-obgyn",
                default_break_minutes=60,
                verification_status="UNVERIFIED",
                effective_from=datetime.date(2026, 1, 1),
            )
            db.add(bp)

        # 4. 교대 템플릿 마스터 & 버전
        templates_data = [
            ("shift-day", "DAY", "데이 (D)", "shift-day", "08:00", "18:00", 0, Decimal("1.00"), 1),
            ("shift-night", "NIGHT", "나이트 (N)", "shift-night", "18:00", "08:00", 1, Decimal("2.00"), 2),
            ("shift-off", "OFF", "오프 (OFF)", "shift-off", "00:00", "00:00", 0, Decimal("0.00"), 3),
            ("shift-leave", "LEAVE", "연차/휴가", "shift-leave", "00:00", "00:00", 0, Decimal("0.00"), 4),
        ]
        for tid, code, label, color, start, end, day_offset, pts, order in templates_data:
            tmpl = db.query(backend.app.models.ShiftTemplate).filter_by(id=tid).first()
            if not tmpl:
                tmpl = backend.app.models.ShiftTemplate(
                    id=tid,
                    ward_id="ward-obgyn",
                    code=code,
                    label=label,
                    color_token=color,
                    sort_order=order,
                    is_assignable=True,
                    is_active=True,
                )
                db.add(tmpl)
                db.flush()

                tmpl_ver = backend.app.models.ShiftTemplateVersion(
                    id=f"{tid}-v1",
                    shift_template_id=tid,
                    starts_at_local=start,
                    ends_at_local=end,
                    end_day_offset=day_offset,
                    break_policy_id="bp-standard",
                    base_burden_points=pts,
                    version=1,
                    effective_from=datetime.date(2026, 1, 1),
                )
                db.add(tmpl_ver)

        # 5. 정책 버전 v1 & 규칙
        pv = db.query(backend.app.models.PolicyVersion).filter_by(id="policy-v1").first()
        if not pv:
            # 수간호사 관리자 계정 먼저
            admin_user = backend.app.models.User(
                id="user-headnurse",
                login_id="headnurse",
                password_hash="argon2_demo_hash",
                role="SCHEDULER",
            )
            db.add(admin_user)
            db.flush()

            pv = backend.app.models.PolicyVersion(
                id="policy-v1",
                ward_id="ward-obgyn",
                version=1,
                status="PUBLISHED",
                created_by=admin_user.id,
                published_at=datetime.datetime.utcnow(),
                effective_from=datetime.date(2026, 1, 1),
            )
            db.add(pv)
            db.flush()

            # 하드 규칙 (Legal floor 포함)
            rules = [
                ("rule-rest", "H-REST", '{"min_rest_minutes": 660}', "HARD", Decimal("0.00"), True, "근무 간 최소 11시간 휴식"),
                ("rule-week", "H-WEEK", '{"max_weekly_minutes": 3120}', "HARD", Decimal("0.00"), True, "주 52시간 상한"),
                ("rule-consec", "H-CONSEC", '{"max_consecutive_days": 5}', "HARD", Decimal("0.00"), False, "최대 연속근무 5일"),
                ("rule-off-min", "H-OFF-MIN", '{"min_monthly_off": 8}', "HARD", Decimal("0.00"), False, "월 최소 8일 오프"),
            ]
            for rid, rtype, param, hs, w, lf, just in rules:
                db.add(backend.app.models.PolicyRule(
                    id=rid,
                    policy_version_id=pv.id,
                    rule_type=rtype,
                    parameter_json=param,
                    hard_soft=hs,
                    weight=w,
                    legal_floor=lf,
                    justification=just,
                ))

            # 점수 가중치 규칙 (QA-SCORE-01, 02 기준)
            weights = [
                ("weight-weekend-deficit", "weekend_off_deficit", Decimal("10.00"), Decimal("40.00"), "MAX"),
                ("weight-ungranted", "ungranted_preferences", Decimal("8.00"), Decimal("24.00"), "MAX"),
                ("weight-burden-excess", "recent_burden_excess", Decimal("1.00"), Decimal("20.00"), "MAX"),
                ("weight-importance", "requested_importance", Decimal("10.00"), Decimal("10.00"), "MAX"),
                ("weight-weekend-shift", "weekend_shift_bonus", Decimal("1.00"), None, "MAX"),
                ("weight-holiday-shift", "holiday_shift_bonus", Decimal("1.50"), None, "MAX"),
            ]
            for wid, mtype, wv, cap, sm in weights:
                db.add(backend.app.models.FairnessWeightRule(
                    id=wid,
                    policy_version_id=pv.id,
                    metric_type=mtype,
                    weight_value=wv,
                    cap_value=cap,
                    stack_mode=sm,
                ))

        # 6. 휴가 종류
        leave_types_data = [
            ("leave-pref", "PREFERENCE_OFF", "일반 희망 OFF", "PREFERENCE"),
            ("leave-annual", "ANNUAL_LEAVE", "법정 연차 휴가", "STATUTORY_LEAVE"),
            ("leave-protect", "PROTECTED_LEAVE", "모성보호/법정보호 휴가", "PROTECTED"),
            ("leave-unavail", "UNAVAILABLE", "근무불가", "STATUTORY_LEAVE"),
        ]
        for lid, code, name, cat in leave_types_data:
            if not db.query(backend.app.models.LeaveType).filter_by(id=lid).first():
                db.add(backend.app.models.LeaveType(id=lid, ward_id="ward-obgyn", code=code, name=name, category=cat))

        # 7. 가상 간호사 6인 등록
        staff_data = [
            ("staff-1", "user-nurse1", "nurse1", "김간호사 (책임)", "RN-001", "FULL_TIME", 9600, True, ["skill-charge", "skill-delivery"]),
            ("staff-2", "user-nurse2", "nurse2", "이간호사 (선임)", "RN-002", "FULL_TIME", 9600, True, ["skill-charge"]),
            ("staff-3", "user-nurse3", "nurse3", "박간호사", "RN-003", "SHIFT", 9600, True, ["skill-delivery"]),
            ("staff-4", "user-nurse4", "nurse4", "최간호사", "RN-004", "SHIFT", 9600, True, []),
            ("staff-5", "user-nurse5", "nurse5", "정간호사 (신규)", "RN-005", "SHIFT", 9600, True, ["skill-grad"]),
            ("staff-6", "user-nurse6", "nurse6", "강간호사 (단시간)", "RN-006", "PART_TIME", 4800, False, []),
        ]
        for sid, uid, login, name, code, emp_type, mins, can_n, s_skills in staff_data:
            if not db.query(backend.app.models.StaffProfile).filter_by(id=sid).first():
                user = backend.app.models.User(
                    id=uid,
                    login_id=login,
                    password_hash="argon2_hash",
                    role="NURSE",
                )
                db.add(user)
                db.flush()

                staff = backend.app.models.StaffProfile(
                    id=sid,
                    user_id=uid,
                    display_name=name,
                    staff_code=code,
                    active_status="ACTIVE",
                    joined_on=datetime.date(2025, 1, 1),
                )
                db.add(staff)
                db.flush()

                db.add(backend.app.models.WardMembership(
                    id=f"mem-{sid}",
                    ward_id="ward-obgyn",
                    user_id=uid,
                    role="NURSE",
                    effective_from=datetime.date(2025, 1, 1),
                ))

                db.add(backend.app.models.StaffEmploymentPeriod(
                    id=f"emp-{sid}",
                    staff_id=sid,
                    ward_id="ward-obgyn",
                    employment_type=emp_type,
                    target_work_minutes_per_period=mins,
                    can_work_night=can_n,
                    effective_from=datetime.date(2025, 1, 1),
                ))

                for sk_id in s_skills:
                    db.add(backend.app.models.StaffSkillPeriod(
                        id=f"sp-{sid}-{sk_id}",
                        staff_id=sid,
                        skill_id=sk_id,
                        proficiency_level="COMPETENT",
                        valid_from=datetime.date(2025, 1, 1),
                    ))

        # 8. 2026년 11월 편성 기간 & 초기 배정
        period = db.query(backend.app.models.SchedulePeriod).filter_by(id="period-2026-11").first()
        if not period:
            period = backend.app.models.SchedulePeriod(
                id="period-2026-11",
                ward_id="ward-obgyn",
                start_date=datetime.date(2026, 11, 1),
                end_date=datetime.date(2026, 11, 30),
                status="PLANNING",
                policy_version_id="policy-v1",
                version=1,
            )
            db.add(period)
            db.flush()

            sched_ver = backend.app.models.ScheduleVersion(
                id="version-2026-11-v1",
                schedule_period_id=period.id,
                version_number=1,
                status="DRAFT",
                created_by="user-headnurse",
            )
            db.add(sched_ver)
            db.flush()

            # 30일치 시뮬레이션 배정 추가
            days_in_month = 30
            for s_idx, (sid, *_) in enumerate(staff_data):
                can_night = staff_data[s_idx][7]
                for day in range(1, days_in_month + 1):
                    dt = datetime.date(2026, 11, day)
                    if can_night:
                        cycle = (day + s_idx) % 6
                        t_ver_id = "shift-day-v1" if cycle in (0, 1) else "shift-night-v1" if cycle == 2 else "shift-off-v1"
                    else:
                        dow = (day + 6) % 7
                        t_ver_id = "shift-day-v1" if dow in (1, 2, 3) else "shift-off-v1"

                    is_pinned = (day == 15 and sid == "staff-1")
                    db.add(backend.app.models.ShiftAssignment(
                        id=f"assign-{sid}-{day}",
                        schedule_version_id=sched_ver.id,
                        staff_id=sid,
                        shift_template_version_id=t_ver_id,
                        local_start_date=dt,
                        start_at_utc=datetime.datetime.combine(dt, datetime.time(8, 0)),
                        end_at_utc=datetime.datetime.combine(dt, datetime.time(18, 0)),
                        paid_work_minutes=540 if "day" in t_ver_id else 780 if "night" in t_ver_id else 0,
                        break_minutes=60 if "day" in t_ver_id or "night" in t_ver_id else 0,
                        source="PINNED" if is_pinned else "AUTO",
                        is_pinned=is_pinned,
                    ))

        # 9. 오프 신청 3건 (QA-SCORE-02 경합 포함)
        req1 = db.query(backend.app.models.TimeOffRequest).filter_by(id="req-1").first()
        if not req1:
            req1 = backend.app.models.TimeOffRequest(
                id="req-1",
                staff_id="staff-1",
                ward_id="ward-obgyn",
                leave_type_id="leave-pref",
                status="UNDER_REVIEW",
                is_important=False,
                reason_note="개인 사정",
            )
            db.add(req1)
            db.flush()
            db.add(backend.app.models.TimeOffRequestDate(
                id="req-date-1",
                request_id=req1.id,
                local_date=datetime.date(2026, 11, 14),
            ))
            db.add(backend.app.models.OffRequestPriorityEvaluation(
                id="eval-1",
                request_id=req1.id,
                policy_version_id="policy-v1",
                weekend_off_deficit_points=Decimal("20.00"),
                ungranted_points=Decimal("8.00"),
                burden_excess_points=Decimal("7.00"),
                importance_points=Decimal("0.00"),
                total_priority_points=Decimal("35.00"),
            ))

            req2 = backend.app.models.TimeOffRequest(
                id="req-2",
                staff_id="staff-2",
                ward_id="ward-obgyn",
                leave_type_id="leave-pref",
                status="UNDER_REVIEW",
                is_important=True,
                reason_note="가족 행사",
            )
            db.add(req2)
            db.flush()
            db.add(backend.app.models.TimeOffRequestDate(
                id="req-date-2",
                request_id=req2.id,
                local_date=datetime.date(2026, 11, 14),
            ))
            db.add(backend.app.models.OffRequestPriorityEvaluation(
                id="eval-2",
                request_id=req2.id,
                policy_version_id="policy-v1",
                weekend_off_deficit_points=Decimal("0.00"),
                ungranted_points=Decimal("16.00"),
                burden_excess_points=Decimal("0.00"),
                importance_points=Decimal("10.00"),
                total_priority_points=Decimal("26.00"),
            ))

            req3 = backend.app.models.TimeOffRequest(
                id="req-3",
                staff_id="staff-3",
                ward_id="ward-obgyn",
                leave_type_id="leave-annual",
                status="APPROVED",
                is_important=False,
                reason_note="법정 연차 휴가",
            )
            db.add(req3)
            db.flush()
            db.add(backend.app.models.TimeOffRequestDate(
                id="req-date-3",
                request_id=req3.id,
                local_date=datetime.date(2026, 11, 5),
            ))

        db.commit()
        print("Database seeded successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
