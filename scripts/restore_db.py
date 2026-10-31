#!/usr/bin/env python3
"""
데이터베이스 복원 스크립트
사용법: python scripts/restore_db.py [--file backups/nurse_YYYYMMDD_HHMMSS.db]
"""
import os
import sys
import shutil
import sqlite3
import argparse
from pathlib import Path


def restore_database(backup_file: str = None, target_db: str = "nurse.db"):
    dest = Path(target_db)
    backup_dir = Path("backups")

    if backup_file:
        src = Path(backup_file)
    else:
        # 최신 백업 파일 탐색
        candidates = sorted(backup_dir.glob("nurse_*.db"), key=os.path.getmtime, reverse=True)
        if not candidates:
            print("Error: No backup files found in backups/ directory.", file=sys.stderr)
            sys.exit(1)
        src = candidates[0]

    if not src.exists():
        print(f"Error: Backup file '{src}' does not exist.", file=sys.stderr)
        sys.exit(1)

    # 기존 DB가 있으면 임시 .bak 생성 후 교체
    if dest.exists():
        tmp_bak = dest.with_suffix(".pre_restore.bak")
        shutil.copy2(dest, tmp_bak)
        print(f"📦 Pre-restore safety copy created: {tmp_bak}")

    try:
        # SQLite 온라인 백업 API를 통한 안전한 복원
        src_conn = sqlite3.connect(str(src))
        dest_conn = sqlite3.connect(str(dest))
        with dest_conn:
            src_conn.backup(dest_conn)
        dest_conn.close()
        src_conn.close()
        print(f"✅ Database successfully restored from '{src}' -> '{dest.resolve()}'")
    except Exception as e:
        print(f"❌ Restore failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass
    parser = argparse.ArgumentParser(description="Restore SQLite database from backup.")
    parser.add_argument("--file", default=None, help="Specific backup file to restore (defaults to latest)")
    parser.add_argument("--target", default="nurse.db", help="Target db path (default: nurse.db)")
    args = parser.parse_args()

    restore_database(args.file, args.target)
