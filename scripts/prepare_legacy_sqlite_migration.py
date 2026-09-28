"""Generate a PostgreSQL migration script from the legacy DormCheck SQLite DB.

The generated SQL contains private user and student data. Write it only to an
ignored local directory and run it against a current DormCheck PostgreSQL schema.
"""

import argparse
import sqlite3
from collections import defaultdict
from pathlib import Path


TABLE_COLUMNS = {
    "users": ("id", "username", "email", "email_verified", "password", "token_version", "role"),
    "students": ("stu_id", "password", "cookies", "last_login", "name"),
    "user_students": ("id", "user_id", "stu_id", "name"),
    "tasks": (
        "id", "user_id", "stu_id", "activity_id", "name", "activity_name",
        "address", "longitude", "latitude", "sign_time", "notify_email",
        "enabled", "exec_status", "retry_count", "max_retry", "last_error", "executed_at",
    ),
    "sponsor_activation_codes": ("id", "code", "used", "used_by", "used_at", "created_at"),
}
BOOL_COLUMNS = {"email_verified", "enabled", "used"}


def literal(value, column):
    if value is None or value == "":
        return "NULL" if value is None else "''"
    if column in BOOL_COLUMNS:
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if "\x00" in str(value):
        raise ValueError(f"NUL byte in {column}")
    return "'" + str(value).replace("'", "''") + "'"


def emit_rows(out, source, table, rows):
    columns = TABLE_COLUMNS[table]
    out.write(f"CREATE TEMP TABLE legacy_{table} AS SELECT {', '.join(columns)} FROM {table} WHERE FALSE;\n")
    for start in range(0, len(rows), 100):
        batch = rows[start:start + 100]
        values = ["(" + ", ".join(literal(value, column) for column, value in zip(columns, row)) + ")" for row in batch]
        out.write(f"INSERT INTO legacy_{table} ({', '.join(columns)}) VALUES\n")
        out.write(",\n".join(values) + ";\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sqlite_db", type=Path)
    parser.add_argument("output_sql", type=Path)
    parser.add_argument("--super-admin-username", required=True)
    args = parser.parse_args()
    if not args.sqlite_db.is_file():
        parser.error("SQLite database does not exist")
    if args.output_sql.exists():
        parser.error("output already exists; refusing to replace it")
    args.output_sql.parent.mkdir(parents=True, exist_ok=True)
    source = sqlite3.connect(f"file:{args.sqlite_db.as_posix()}?mode=ro", uri=True)
    source.row_factory = sqlite3.Row
    if source.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        parser.error("SQLite integrity check failed")

    rows = {}
    for table, columns in TABLE_COLUMNS.items():
        present = {row[1] for row in source.execute(f"PRAGMA table_info({table})")}
        if not set(columns) <= present:
            parser.error(f"legacy table {table} is missing required columns")
        rows[table] = [tuple(row) for row in source.execute(f"SELECT {', '.join(columns)} FROM {table}")]

    matching_super_admin = [row for row in rows["users"] if row[1] == args.super_admin_username]
    if len(matching_super_admin) != 1:
        parser.error("super-admin username must match exactly one legacy user")

    # Match the backend's shared-task migration: latest created row provides
    # configuration; latest execution supplies status, retry count and error.
    task_groups = defaultdict(list)
    for row in rows["tasks"]:
        task_groups[(row[2], row[3])].append(row)
    merged_tasks = []
    for group in task_groups.values():
        config = list(max(group, key=lambda row: row[0]))
        result = max(group, key=lambda row: (row[16] or "", row[0]))
        for index in (12, 13, 15, 16):
            config[index] = result[index]
        merged_tasks.append(tuple(config))
    rows["tasks"] = sorted(merged_tasks, key=lambda row: row[0])

    # The SQL performs conflict checks before writes and commits atomically.
    with args.output_sql.open("w", encoding="utf-8", newline="\n") as out:
        out.write("-- PRIVATE: contains password hashes, student passwords and cookies.\n")
        out.write("-- Execute against the current DormCheck PostgreSQL schema only.\n")
        out.write("BEGIN;\nSET LOCAL standard_conforming_strings = on;\n")
        out.write("SET LOCAL lock_timeout = '10s';\nSET LOCAL statement_timeout = '5min';\n")
        for table in TABLE_COLUMNS:
            emit_rows(out, source, table, rows[table])
        out.write(f"""
-- Match an existing account only when both username and email identify it.
-- Any partial collision requires manual review and rolls the transaction back.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM legacy_users l JOIN users u
      ON u.username = l.username OR u.email = l.email
    WHERE u.username <> l.username OR u.email <> l.email
  ) THEN
    RAISE EXCEPTION 'Legacy user conflicts with an existing username or email; no data imported';
  END IF;
END $$;
CREATE TEMP TABLE legacy_user_map AS
SELECT l.id AS old_id,
       COALESCE(u.id, (SELECT COALESCE(MAX(id),0) FROM users) +
         ROW_NUMBER() OVER (ORDER BY l.id)) AS new_id
FROM legacy_users l LEFT JOIN users u
  ON u.username = l.username AND u.email = l.email;

INSERT INTO users (id, username, email, email_verified, password, token_version, role)
SELECT m.new_id, l.username, l.email, l.email_verified, l.password,
       l.token_version, l.role
FROM legacy_users l JOIN legacy_user_map m ON m.old_id = l.id
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.new_id);

DO $$ DECLARE changed_rows integer; BEGIN
  UPDATE users SET role = 3
  WHERE username = {literal(args.super_admin_username, 'username')};
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one account to promote to super admin';
  END IF;
END $$;

-- Existing student login data is newer and remains authoritative.
INSERT INTO students (stu_id, password, cookies, last_login, name)
SELECT stu_id, password, cookies, last_login, name FROM legacy_students
ON CONFLICT (stu_id) DO NOTHING;

INSERT INTO user_students (user_id, stu_id, name)
SELECT m.new_id, l.stu_id, l.name
FROM legacy_user_students l JOIN legacy_user_map m ON m.old_id = l.user_id
ON CONFLICT (user_id, stu_id) DO NOTHING;

-- Old tasks lack trustworthy activity metadata. The activity auditor checks
-- current dates and mode before it resumes previously enabled tasks.
INSERT INTO tasks (
  user_id, stu_id, activity_id, name, activity_name, address,
  longitude, latitude, sign_time, notify_email, enabled, exec_status,
  retry_count, max_retry, last_error, executed_at, sign_type,
  qr_code_type, activity_state, activity_issue, activity_auto_paused
)
SELECT m.new_id, l.stu_id, l.activity_id, l.name, l.activity_name,
       l.address, l.longitude, l.latitude, l.sign_time, l.notify_email,
       FALSE, l.exec_status, l.retry_count, l.max_retry, l.last_error,
       l.executed_at, 1, 0, 'migration_pending',
       '旧库迁移后等待核对第三方活动信息', COALESCE(l.enabled,FALSE)
FROM legacy_tasks l JOIN legacy_user_map m ON m.old_id = l.user_id
ON CONFLICT (stu_id, activity_id) DO NOTHING;

INSERT INTO sponsor_activation_codes (code, used, used_by, used_at, created_at)
SELECT l.code, l.used, m.new_id, l.used_at, l.created_at
FROM legacy_sponsor_activation_codes l
LEFT JOIN legacy_user_map m ON m.old_id = l.used_by
ON CONFLICT (code) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users','id'),
              GREATEST((SELECT COALESCE(MAX(id),1) FROM users),1), TRUE);

SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'user_students', COUNT(*) FROM user_students
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'sponsor_activation_codes', COUNT(*) FROM sponsor_activation_codes;
COMMIT;
""")
    print("Generated private migration SQL:", args.output_sql)
    print("Legacy counts:", {table: len(data) for table, data in rows.items()})
    print("Merged duplicate task rows:", sum(len(group) - 1 for group in task_groups.values()))


if __name__ == "__main__":
    main()
