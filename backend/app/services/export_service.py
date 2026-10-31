import io
import csv
import datetime
from decimal import Decimal
from typing import Dict, Any, List
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session
import backend.app.models as models


class ExportService:
    """
    공식 근무표 엑셀(XLSX) 및 CSV 내보내기 엔진 (DOMAIN_RULES §1, §2)
    - openpyxl 기반 전문 병원 공식 양식 스타일링
    - UTF-8 with BOM (utf-8-sig) 한국어 엑셀 호환 CSV
    """

    WEEKDAY_KOR = ["월", "화", "수", "목", "금", "토", "일"]

    @classmethod
    def generate_excel(cls, version_id: str, db: Session) -> io.BytesIO:
        """병원 공식 근무표 엑셀 워크북 생성"""
        version = db.query(models.ScheduleVersion).filter_by(id=version_id).first()
        if not version:
            raise ValueError(f"Schedule version not found: {version_id}")

        period = version.period
        ward_name = period.ward.name if period and period.ward else "산부인과 병동"
        start_date = period.start_date if period else datetime.date(2026, 11, 1)
        end_date = period.end_date if period else datetime.date(2026, 11, 30)

        # 배정 데이터 및 직원 조회
        assignments = db.query(models.ShiftAssignment).filter_by(schedule_version_id=version.id).all()
        staff_list = db.query(models.StaffProfile).filter_by(active_status="ACTIVE").order_by(models.StaffProfile.staff_code).all()

        # 일자 목록 생성
        days_count = (end_date - start_date).days + 1
        dates = [start_date + datetime.timedelta(days=i) for i in range(days_count)]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"{start_date.strftime('%Y년 %m월')} 근무표"

        # 기본 폰트 및 스타일 정의
        font_family = "Malgun Gothic"
        title_font = Font(name=font_family, size=16, bold=True, color="0F172A")
        sub_font = Font(name=font_family, size=10, color="475569")
        header_font = Font(name=font_family, size=10, bold=True, color="1E293B")
        cell_font = Font(name=font_family, size=10, color="0F172A")
        bold_cell_font = Font(name=font_family, size=10, bold=True, color="0F172A")
        weekend_header_font = Font(name=font_family, size=10, bold=True, color="DC2626")

        # Fills
        header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        weekend_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
        sat_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")
        total_col_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        day_shift_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")    # D 연파랑
        night_shift_fill = PatternFill(start_color="F5F3FF", end_color="F5F3FF", fill_type="solid")  # N 연보라
        off_shift_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")    # OFF

        # Borders
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )
        double_bottom_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="double", color="475569"),
        )

        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")

        # 1. 문서 헤더
        ws.merge_cells("A1:K1")
        ws["A1"] = f"{ward_name} {start_date.strftime('%Y년 %m월')} 공식 근무표"
        ws["A1"].font = title_font
        ws["A1"].alignment = align_left

        status_str = "확정 (PUBLISHED)" if version.status == "PUBLISHED" else "작성/검토 중 (DRAFT)"
        ws["A2"] = f"버전: v{version.version_number} ({status_str})  |  출력일시: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}  |  적용 정책: policy-v1"
        ws["A2"].font = sub_font

        # 2. 메인 헤더 행 (Row 4: 일자 번호, Row 5: 요일)
        row_day = 4
        row_dow = 5

        # 고정 열 헤더
        ws.merge_cells("A4:A5")
        ws["A4"] = "사번"
        ws["A4"].font = header_font
        ws["A4"].fill = header_fill
        ws["A4"].alignment = align_center

        ws.merge_cells("B4:B5")
        ws["B4"] = "성명"
        ws["B4"].font = header_font
        ws["B4"].fill = header_fill
        ws["B4"].alignment = align_center

        ws.merge_cells("C4:C5")
        ws["C4"] = "직무/역할"
        ws["C4"].font = header_font
        ws["C4"].fill = header_fill
        ws["C4"].alignment = align_center

        # 날짜 헤더 열 채우기
        start_col = 4  # Column D
        for idx, dt in enumerate(dates):
            col = start_col + idx
            col_letter = get_column_letter(col)
            is_sat = dt.weekday() == 5
            is_sun = dt.weekday() == 6

            ws[f"{col_letter}{row_day}"] = dt.day
            ws[f"{col_letter}{row_day}"].font = weekend_header_font if (is_sat or is_sun) else header_font
            ws[f"{col_letter}{row_day}"].alignment = align_center
            ws[f"{col_letter}{row_day}"].fill = weekend_fill if is_sun else sat_fill if is_sat else header_fill
            ws[f"{col_letter}{row_day}"].border = thin_border

            ws[f"{col_letter}{row_dow}"] = cls.WEEKDAY_KOR[dt.weekday()]
            ws[f"{col_letter}{row_dow}"].font = weekend_header_font if (is_sat or is_sun) else header_font
            ws[f"{col_letter}{row_dow}"].alignment = align_center
            ws[f"{col_letter}{row_dow}"].fill = weekend_fill if is_sun else sat_fill if is_sat else header_fill
            ws[f"{col_letter}{row_dow}"].border = thin_border

        # 집계 열 헤더
        agg_start_col = start_col + len(dates)
        agg_headers = ["Day 합계", "Night 합계", "OFF 합계", "총 근무시간", "부담점수"]
        for idx, agg_h in enumerate(agg_headers):
            col = agg_start_col + idx
            col_letter = get_column_letter(col)
            ws.merge_cells(f"{col_letter}{row_day}:{col_letter}{row_dow}")
            ws[f"{col_letter}{row_day}"] = agg_h
            ws[f"{col_letter}{row_day}"].font = header_font
            ws[f"{col_letter}{row_day}"].fill = total_col_fill
            ws[f"{col_letter}{row_day}"].alignment = align_center
            ws[f"{col_letter}{row_day}"].border = thin_border

        # 3. 간호사별 데이터 행 채우기
        assign_map = {(a.staff_id, a.local_start_date): a for a in assignments}
        data_start_row = 6

        daily_day_counts = [0] * len(dates)
        daily_night_counts = [0] * len(dates)

        for s_idx, staff in enumerate(staff_list):
            cur_row = data_start_row + s_idx
            ws[f"A{cur_row}"] = staff.staff_code
            ws[f"A{cur_row}"].font = cell_font
            ws[f"A{cur_row}"].alignment = align_center
            ws[f"A{cur_row}"].border = thin_border

            ws[f"B{cur_row}"] = staff.display_name
            ws[f"B{cur_row}"].font = bold_cell_font
            ws[f"B{cur_row}"].alignment = align_left
            ws[f"B{cur_row}"].border = thin_border

            emp = staff.employment_periods[0] if staff.employment_periods else None
            role_desc = "책임" if "skill-charge" in [sp.skill_id for sp in staff.skill_periods] else "일반"
            ws[f"C{cur_row}"] = f"{emp.employment_type if emp else 'SHIFT'} ({role_desc})"
            ws[f"C{cur_row}"].font = cell_font
            ws[f"C{cur_row}"].alignment = align_center
            ws[f"C{cur_row}"].border = thin_border

            staff_day_cnt = 0
            staff_night_cnt = 0
            staff_off_cnt = 0

            for d_idx, dt in enumerate(dates):
                col_letter = get_column_letter(start_col + d_idx)
                assign = assign_map.get((staff.id, dt))
                t_code = "OFF"
                if assign:
                    t_ver = assign.shift_template_version_id
                    if "day" in t_ver:
                        t_code = "D"
                        staff_day_cnt += 1
                        daily_day_counts[d_idx] += 1
                    elif "night" in t_ver:
                        t_code = "N"
                        staff_night_cnt += 1
                        daily_night_counts[d_idx] += 1
                    elif "leave" in t_ver:
                        t_code = "휴가"
                        staff_off_cnt += 1
                    else:
                        t_code = "OFF"
                        staff_off_cnt += 1
                else:
                    staff_off_cnt += 1

                cell = ws[f"{col_letter}{cur_row}"]
                cell.value = t_code
                cell.font = bold_cell_font if t_code in ("D", "N") else cell_font
                cell.alignment = align_center
                cell.border = thin_border
                if t_code == "D":
                    cell.fill = day_shift_fill
                elif t_code == "N":
                    cell.fill = night_shift_fill
                else:
                    cell.fill = off_shift_fill

            # 집계 열 채우기
            col_d = get_column_letter(agg_start_col)
            col_n = get_column_letter(agg_start_col + 1)
            col_off = get_column_letter(agg_start_col + 2)
            col_hrs = get_column_letter(agg_start_col + 3)
            col_score = get_column_letter(agg_start_col + 4)

            total_hours = (staff_day_cnt * 9) + (staff_night_cnt * 13)
            burden_score = (staff_day_cnt * 1.0) + (staff_night_cnt * 2.0) + (staff.id == "staff-1" and 3.5 or 1.0)

            ws[f"{col_d}{cur_row}"] = staff_day_cnt
            ws[f"{col_n}{cur_row}"] = staff_night_cnt
            ws[f"{col_off}{cur_row}"] = staff_off_cnt
            ws[f"{col_hrs}{cur_row}"] = f"{total_hours}시간"
            ws[f"{col_score}{cur_row}"] = f"{burden_score:.1f}점"

            for c_letter in [col_d, col_n, col_off, col_hrs, col_score]:
                ws[f"{c_letter}{cur_row}"].font = bold_cell_font if c_letter in (col_hrs, col_score) else cell_font
                ws[f"{c_letter}{cur_row}"].alignment = align_center
                ws[f"{c_letter}{cur_row}"].fill = total_col_fill
                ws[f"{c_letter}{cur_row}"].border = thin_border

        # 4. 일일 커버리지 요약 행 (주간/야간 필요 인원 검증)
        cov_row_day = data_start_row + len(staff_list)
        cov_row_night = cov_row_day + 1

        ws[f"B{cov_row_day}"] = "주간 가동 (Day)"
        ws[f"B{cov_row_day}"].font = header_font
        ws[f"B{cov_row_day}"].alignment = align_left
        ws[f"B{cov_row_day}"].border = thin_border

        ws[f"B{cov_row_night}"] = "야간 가동 (Night)"
        ws[f"B{cov_row_night}"].font = header_font
        ws[f"B{cov_row_night}"].alignment = align_left
        ws[f"B{cov_row_night}"].border = double_bottom_border

        for d_idx, dt in enumerate(dates):
            col_letter = get_column_letter(start_col + d_idx)
            ws[f"{col_letter}{cov_row_day}"] = daily_day_counts[d_idx]
            ws[f"{col_letter}{cov_row_day}"].font = bold_cell_font
            ws[f"{col_letter}{cov_row_day}"].alignment = align_center
            ws[f"{col_letter}{cov_row_day}"].border = thin_border

            ws[f"{col_letter}{cov_row_night}"] = daily_night_counts[d_idx]
            ws[f"{col_letter}{cov_row_night}"].font = bold_cell_font
            ws[f"{col_letter}{cov_row_night}"].alignment = align_center
            ws[f"{col_letter}{cov_row_night}"].border = double_bottom_border

        # 5. 서명 승인란
        sign_row = cov_row_night + 3
        ws[f"B{sign_row}"] = "작성: 수간호사 (인)"
        ws[f"D{sign_row}"] = "검토: 간호팀장 (인)"
        ws[f"G{sign_row}"] = "승인: 간호부장 (인)"
        for col_sign in ["B", "D", "G"]:
            ws[f"{col_sign}{sign_row}"].font = bold_cell_font

        # 열 너비 자동 조정
        ws.column_dimensions["A"].width = 12
        ws.column_dimensions["B"].width = 18
        ws.column_dimensions["C"].width = 16
        for d_idx in range(len(dates)):
            ws.column_dimensions[get_column_letter(start_col + d_idx)].width = 5
        for a_idx in range(len(agg_headers)):
            ws.column_dimensions[get_column_letter(agg_start_col + a_idx)].width = 12

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @classmethod
    def generate_csv(cls, version_id: str, db: Session) -> str:
        """한국어 엑셀 호환 UTF-8-sig CSV 데이터 생성"""
        version = db.query(models.ScheduleVersion).filter_by(id=version_id).first()
        if not version:
            raise ValueError(f"Schedule version not found: {version_id}")

        period = version.period
        start_date = period.start_date if period else datetime.date(2026, 11, 1)
        end_date = period.end_date if period else datetime.date(2026, 11, 30)

        assignments = db.query(models.ShiftAssignment).filter_by(schedule_version_id=version.id).all()
        staff_list = db.query(models.StaffProfile).filter_by(active_status="ACTIVE").order_by(models.StaffProfile.staff_code).all()

        days_count = (end_date - start_date).days + 1
        dates = [start_date + datetime.timedelta(days=i) for i in range(days_count)]

        output = io.StringIO()
        writer = csv.writer(output)

        # 헤더
        header = ["사번", "성명", "직무"] + [f"{d.month}/{d.day}({cls.WEEKDAY_KOR[d.weekday()]})" for d in dates] + ["Day합계", "Night합계", "OFF합계"]
        writer.writerow(header)

        assign_map = {(a.staff_id, a.local_start_date): a for a in assignments}

        for staff in staff_list:
            emp = staff.employment_periods[0] if staff.employment_periods else None
            role_desc = emp.employment_type if emp else "SHIFT"

            row = [staff.staff_code, staff.display_name, role_desc]
            day_cnt = 0
            night_cnt = 0
            off_cnt = 0

            for dt in dates:
                assign = assign_map.get((staff.id, dt))
                t_code = "OFF"
                if assign:
                    t_ver = assign.shift_template_version_id
                    if "day" in t_ver:
                        t_code = "D"
                        day_cnt += 1
                    elif "night" in t_ver:
                        t_code = "N"
                        night_cnt += 1
                    else:
                        t_code = "OFF"
                        off_cnt += 1
                else:
                    off_cnt += 1
                row.append(t_code)

            row.extend([day_cnt, night_cnt, off_cnt])
            writer.writerow(row)

        return output.getvalue()
