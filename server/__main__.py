# -*- coding: future_fstrings -*-
import logging
import os
import sys
import time
from logging.handlers import TimedRotatingFileHandler

import yaml
from flask import Flask, jsonify, request as current_request
from flask_mail import Mail
from flask_migrate import Migrate
from munch import munchify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from server.api.api_key import api_key_api
from server.api.audit_log import audit_log_api
from server.api.aup import aup_api
from server.api.base import base_api
from server.api.collaboration import collaboration_api
from server.api.collaboration_membership import collaboration_membership_api
from server.api.collaboration_request import collaboration_request_api
from server.api.collaborations_services import collaborations_services_api
from server.api.dynamic_extended_json_encoder import DynamicExtendedJSONEncoder
from server.api.group import group_api
from server.api.group_members import group_members_api
from server.api.image import image_api
from server.api.invitation import invitations_api
from server.api.ipaddress import ipaddress_api
from server.api.join_request import join_request_api
from server.api.mfa import mfa_api
from server.api.mock_user import mock_user_api
from server.api.organisation import organisation_api
from server.api.organisation_invitation import organisation_invitations_api
from server.api.organisation_membership import organisation_membership_api
from server.api.organisations_services import organisations_services_api
from server.api.plsc import plsc_api
from server.api.service import service_api
from server.api.service_connection_request import service_connection_request_api
from server.api.service_group import service_group_api
from server.api.system import system_api
from server.api.user import user_api
from server.api.user_saml import user_saml_api
from server.cron.schedule import start_scheduling
from server.db.db import db, db_migrations
from server.db.redis import init_redis
from server.mqtt.mqtt import MqttClient
from server.templates import invitation_role
from server.tools import read_file


def _init_logging(is_test):
    if is_test:
        logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
    else:
        formatter = logging.Formatter("SBS: %(asctime)s %(name)s %(levelname)s %(message)s")

        handler = TimedRotatingFileHandler(f"{os.path.dirname(os.path.realpath(__file__))}/../log/sbs.log",
                                           when="midnight", backupCount=30)
        handler.setFormatter(formatter)
        handler.setLevel(logging.INFO)

        debug_handler = TimedRotatingFileHandler(f"{os.path.dirname(os.path.realpath(__file__))}/../log/sbs_debug.log",
                                                 when="midnight", backupCount=30)
        debug_handler.setFormatter(formatter)
        debug_handler.setLevel(logging.DEBUG)

        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

        logger = logging.getLogger()
        logger.setLevel(logging.DEBUG)

        logger.addHandler(handler)
        logger.addHandler(debug_handler)


config_file_location = os.environ.get("CONFIG", "config/config.yml")
config = munchify(yaml.load(read_file(config_file_location), Loader=yaml.FullLoader))
config.base_url = config.base_url[:-1] if config.base_url.endswith("/") else config.base_url

test = os.environ.get("TESTING")
profile = os.environ.get("PROFILE")

is_local = profile is not None and profile == "local"
is_test = test is not None and bool(int(test))

_init_logging(is_test or is_local)


def page_not_found(_):
    return jsonify({"message": f"{current_request.base_url} not found"}), 404


logger = logging.getLogger("main")
logger.info(f"Initialize server with profile {profile}")
current_path = os.path.dirname(os.path.realpath(__file__)).replace("server", "instance")
app = Flask(__name__, instance_path=current_path) if is_local else Flask(__name__)
app.secret_key = config.secret_key

app.register_blueprint(base_api)
app.register_blueprint(service_api)
app.register_blueprint(user_api)
app.register_blueprint(user_saml_api)
app.register_blueprint(mfa_api)
app.register_blueprint(collaboration_api)
app.register_blueprint(organisation_api)
app.register_blueprint(join_request_api)
app.register_blueprint(organisation_invitations_api)
app.register_blueprint(invitations_api)
app.register_blueprint(organisation_membership_api)
app.register_blueprint(collaboration_membership_api)
app.register_blueprint(collaborations_services_api)
app.register_blueprint(group_api)
app.register_blueprint(group_members_api)
app.register_blueprint(api_key_api)
app.register_blueprint(aup_api)
app.register_blueprint(collaboration_request_api)
app.register_blueprint(service_connection_request_api)
app.register_blueprint(audit_log_api)
app.register_blueprint(ipaddress_api)
app.register_blueprint(system_api)
app.register_blueprint(organisations_services_api)
app.register_blueprint(mock_user_api)
app.register_blueprint(plsc_api)
app.register_blueprint(image_api)
app.register_blueprint(service_group_api)

app.register_error_handler(404, page_not_found)

app.config["SQLALCHEMY_DATABASE_URI"] = config.database.uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ECHO"] = False  # Set to True for query debugging

app.config["TESTING"] = test
app.config["MAIL_SERVER"] = config.mail.host
app.config["MAIL_PORT"] = int(config.mail.port)
app.config["OPEN_MAIL_IN_BROWSER"] = os.environ.get("OPEN_MAIL_IN_BROWSER", 0)
app.config["LOCAL"] = is_local
app.config["SESSION_COOKIE_SECURE"] = not is_test and not is_local

app.jinja_env.globals.update({
    "invitation_role": invitation_role,
})

app.mail = Mail(app)

app.json_encoder = DynamicExtendedJSONEncoder

db.init_app(app)
app.db = db

app.redis_client = init_redis(config)

app.app_config = config
app.app_config["profile"] = profile

app.mqtt = MqttClient(app.app_config.service_bus)

Migrate(app, db)
result = None
with app.app_context():
    while result is None:
        try:
            result = db.engine.execute(text("SELECT 1"))
        except OperationalError:
            logger.info("Waiting for the database...")
            time.sleep(1)

db_migrations(config.database.uri)

from server.auth.user_claims import generate_unique_username  # noqa: E402
from server.db.domain import User  # noqa: E402

if not test:
    with app.app_context():
        users = User.query.filter(User.username == None).all()  # noqa: E711
        for user in users:
            user.username = generate_unique_username(user)
            db.session.merge(user)
        if len(users) > 0:
            db.session.commit()

if not test:
    # Start scheduling
    start_scheduling(app)

# WSGI production mode dictates that no flask app is actually running
if is_local:
    app.run(port=8080, debug=False, host="127.0.0.1", threaded=True)
