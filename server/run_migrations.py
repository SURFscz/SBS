"""
Run Alembic upgrades in a clean interpreter.

Gunicorn workers import server.__main__ after eventlet.monkey_patch(); running
SQLAlchemy/Alembic against MySQL in that process can hang. This module is
invoked via ``python -m server.run_migrations`` before the patched runtime
continues serving.
"""
from __future__ import annotations

import os
import sys


def main() -> None:
    uri = os.environ.get("DATABASE_URI")
    if not uri:
        print("run_migrations: DATABASE_URI is not set", file=sys.stderr)
        raise SystemExit(1)
    from server.db.db import db_migrations

    db_migrations(uri)


if __name__ == "__main__":
    main()
