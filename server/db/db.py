import logging
import os

from alembic.util import CommandError
from flask_migrate import command
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def db_migrations(sqlalchemy_database_uri):
    from alembic.config import Config

    migrations_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../migrations/")
    config = Config(migrations_dir + "alembic.ini")
    config.set_main_option("sqlalchemy.url", sqlalchemy_database_uri)
    config.set_main_option("script_location", migrations_dir)
    try:
        command.upgrade(config, "head")
    except CommandError as e:
        logger = logging.getLogger("db_migrations")
        if "Can't locate revision identified by" in e.args[0]:
            logger.warning(f"Ignoring unknown revision {e}")
        else:
            raise e
