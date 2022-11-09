import os

from flask_migrate import command
from flask_sqlalchemy import SQLAlchemy


class SQLAlchemyPrePing(SQLAlchemy):
    def apply_pool_defaults(self, app, options):
        options["pool_pre_ping"] = True
        options["echo"] = app.config["SQLALCHEMY_ECHO"]
        return super().apply_pool_defaults(app, options)


db = SQLAlchemyPrePing()


def db_migrations(sqlalchemy_database_uri):
    migrations_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../migrations/")
    from alembic.config import Config
    config = Config(migrations_dir + "alembic.ini")
    config.set_main_option("sqlalchemy.url", sqlalchemy_database_uri)
    config.set_main_option("script_location", migrations_dir)
    command.upgrade(config, "head")
