#!/usr/bin/env python3
"""
데이터베이스 백업 스크립트 (SQLite VACUUM INTO / 파일 스냅샷)
사용법: python scripts/backup_db.py [--target PATH]
"""
import os
import sys
import sqlite3
import datetime
import argparse
from pathlib import Path


def backup_database(db_path: str = "nurse.db", backup_dir: str = "backups") -> Path:
    src = Path(db_path)
    if not src.exists():
        print(f"Error: Source database '{src}' does not exist.", file=sys.stderr)
        sys.exit(1)

    dest_dir = Path(backup_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = dest_dir / f"nurse_{timestamp}.db"

    # SQLite 안전한 온라인 백업 API 사용
    try:
        conn = sqlite3.connect(str(src))
        dest_conn = sqlite3.connect(str(backup_file))
        with dest_conn:
            conn.backup(dest_conn)
        dest_conn.close()
        conn.close()
        print(f"✅ Database successfully backed up to: {backup_file.resolve()}")
        return backup_file
    except Exception as e:
        print(f"❌ Backup failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass
    parser = argparse.ArgumentParser(description="Backup SQLite database safely.")
    parser.add_argument("--db", default="nurse.db", help="Path to source db (default: nurse.db)")
    parser.add_argument("--out", default="backups", help="Target backup folder (default: backups)")
    args = parser.parse_args()

    backup_database(args.db, args.out)
