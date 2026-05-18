import os

from flask_migrate import command
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def resolve_config_path() -> str:
    """Absolute path for CONFIG (Alembic data migrations use open(), not read_file())."""
    config_file = os.environ.get("CONFIG", "config/config.yml")
    if config_file.startswith("/"):
        return config_file
    server_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    return os.path.join(server_dir, config_file)


def db_migrations(sqlalchemy_database_uri):
    os.environ["CONFIG"] = resolve_config_path()

    from alembic.config import Config

    migrations_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../migrations/")
    config = Config(migrations_dir + "alembic.ini")
    config.set_main_option("sqlalchemy.url", sqlalchemy_database_uri)
    config.set_main_option("script_location", migrations_dir)
    command.upgrade(config, "head")
