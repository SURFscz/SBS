import logging
import os
from logging.handlers import TimedRotatingFileHandler
from flask_mail import Mail
import yaml
from flask import Flask, jsonify, request as current_request
from flask_migrate import Migrate
from munch import munchify

from server.api.base import base_api, DynamicExtendedJSONEncoder
from server.api.collaboration import collaboration_api
from server.api.service import service_api
from server.api.user import user_api
from server.db.db import db, db_migrations


def read_file(file_name):
    file = f"{os.path.dirname(os.path.realpath(__file__))}/{file_name}"
    with open(file) as f:
        return f.read()


def _init_logging(local):
    if local:
        logging.basicConfig(level=logging.INFO)
    else:
        handler = TimedRotatingFileHandler(f"{os.path.dirname(os.path.realpath(__file__))}/../log/stats.log",
                                           when="midnight", backupCount=30)
        formatter = logging.Formatter("SBS: %(asctime)s %(name)s %(levelname)s %(message)s")
        handler.setFormatter(formatter)

        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)


def page_not_found(_):
    return jsonify({"message": f"{current_request.base_url} not found"}), 404


config_file_location = os.environ.get("CONFIG", "config/config.yml")
config = munchify(yaml.load(read_file(config_file_location)))

test = os.environ.get("TEST")
profile = os.environ.get("PROFILE")

is_local = profile is not None and profile == "local"
is_test = test is not None and bool(int(test))

_init_logging(is_local or is_test)

logger = logging.getLogger("main")
logger.info(f"Initialize server with profile {profile}")

app = Flask(__name__)
app.secret_key = config.secret_key

app.register_blueprint(base_api)
app.register_blueprint(user_api)
app.register_blueprint(service_api)
app.register_blueprint(collaboration_api)

app.register_error_handler(404, page_not_found)

app.config["SQLALCHEMY_DATABASE_URI"] = config.database.uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ECHO"] = is_local or is_test

app.config["MAIL_SERVER"] = config.mail.host
app.config["MAIL_PORT"] = int(config.mail.port)
app.mail = Mail(app)

app.json_encoder = DynamicExtendedJSONEncoder

db.init_app(app)
app.db = db

app.app_config = config
app.app_config["profile"] = profile

Migrate(app, db)
db_migrations(config.database.uri)

# WSGI production mode dictates that no flask app is actually running
if is_local:
    app.run(port=8080, debug=False, host="0.0.0.0", threaded=True)
