import os
from typing import Any

from flask_migrate import command
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.ext.declarative import declarative_base
from flask_jsontools.formatting import JsonSerializableBase

Base = declarative_base(cls=(JsonSerializableBase,))


class SQLAlchemyPrePing(SQLAlchemy):
    def apply_pool_defaults(self, app, options):
        options["pool_pre_ping"] = True
        options["echo"] = app.config["SQLALCHEMY_ECHO"]
        super().apply_pool_defaults(app, options)


# Any because: https://github.com/python/mypy/issues/2477
db: Any = SQLAlchemyPrePing()


def db_migrations(sqlalchemy_database_uri):
    migrations_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../migrations/")
    from alembic.config import Config
    config = Config(migrations_dir + "alembic.ini")
    config.set_main_option("sqlalchemy.url", sqlalchemy_database_uri)
    config.set_main_option("script_location", migrations_dir)
    command.upgrade(config, "head")


class User(Base, db.Model):
    __tablename__ = "users"
    id = db.Column("id", db.Integer(), primary_key=True, nullable=False, autoincrement=True)
    uid = db.Column("uid", db.String(length=512), nullable=False)
    name = db.Column("name", db.String(length=255), nullable=True)
    email = db.Column("email", db.String(length=255), nullable=True)
