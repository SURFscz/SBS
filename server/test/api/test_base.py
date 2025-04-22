import json
import os
from pathlib import Path
from unittest import mock

import MySQLdb
import redis
import sqlalchemy
from flask import g as request_context
from munch import munchify

from server.api.base import send_error_mail
from server.db.domain import Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name


class TestBase(AbstractTest):

    def test_send_error_mail_with_external_api_user(self):
        try:
            self.app.app_config.mail.send_exceptions = True
            with self.app.app_context():
                mail = self.app.mail
                with mail.record_messages() as outbox:
                    request_context.is_authorized_api_call = True
                    request_context.api_user = munchify({"name": "api_user"})
                    send_error_mail("tb")
                    html = outbox[0].html
                    self.assertTrue("api_user" in html)

        finally:
            self.app.app_config.mail.send_exceptions = False

    def test_send_error_mail_with_no_user(self):
        try:
            self.app.app_config.mail.send_exceptions = True
            with self.app.app_context():
                mail = self.app.mail
                with mail.record_messages() as outbox:
                    request_context.is_authorized_api_call = False
                    send_error_mail("tb")
                    html = outbox[0].html
                    self.assertTrue("unknown" in html)

        finally:
            self.app.app_config.mail.send_exceptions = False

    def test_send_error_mail_with_external_api_organisation(self):
        try:
            self.app.app_config.mail.send_exceptions = True
            with self.app.app_context():
                mail = self.app.mail
                with mail.record_messages() as outbox:
                    request_context.external_api_organisation = munchify({"name": "external_organisation"})
                    send_error_mail("tb")
                    html = outbox[0].html
                    self.assertTrue("external_organisation" in html)

        finally:
            self.app.app_config.mail.send_exceptions = False

    def test_health(self):
        res = self.client.get("/health")
        self.assertDictEqual({"components": {"database": "UP", "redis": "UP"}, "status": "UP"}, res.json)

    def test_health_mysql_down(self):
        with mock.patch("sqlalchemy.engine.base.Connection.execute",
                        side_effect=sqlalchemy.exc.OperationalError("failed", "failed", "failed")):
            res = self.client.get("/health")
            self.assertDictEqual({"components": {"database": "DOWN", "redis": "UP"}, "status": "DOWN"}, res.json)

    def test_health_mysql_error_nomail(self):
        with self.app.mail.record_messages() as outbox:
            with mock.patch("sqlalchemy.engine.base.Connection.execute",
                            side_effect=MySQLdb.IntegrityError("error: an error occured")):
                res = self.client.get("/health")
                self.assert500(res)

            self.assertEqual(0, len(outbox))

    def test_health_redis_down(self):
        with mock.patch.object(self.app.redis_client, "set", return_value=False):
            res = self.client.get("/health")
            self.assertDictEqual({"components": {"database": "UP", "redis": "DOWN"}, "status": "DOWN"}, res.json)

    def test_health_redis_error(self):
        with mock.patch.object(self.app.redis_client, "set", side_effect=redis.exceptions.ConnectionError):
            res = self.client.get("/health")
            self.assertDictEqual({"components": {"database": "UP", "redis": "DOWN"}, "status": "DOWN"}, res.json)

    def test_config(self):
        res = self.client.get("/config").json
        self.assertEqual(self.app.app_config.base_url, res["base_url"])
        self.assertEqual(False, res["local"])
        self.assertTrue(len(res["organisation_categories"]) > 0)
        self.assertEqual("http://localhost:9002", res["manage_base_url"])

    def test_info(self):
        git_info = self.client.get("/info").json["git"]
        self.assertTrue("nope" in git_info)

    def test_info_stub(self):
        file = str(Path(f"{os.path.dirname(os.path.realpath(__file__))}/../../api/git.info"))
        with open(file, "w+") as f:
            f.write(json.dumps({"git": "some info"}))
        git_info = self.client.get("/info").json["git"]
        self.assertTrue("some" in git_info)
        os.remove(file)

    def test_404(self):
        res = self.get("/api/nope", response_status_code=404)
        self.assertDictEqual({"message": "http://localhost/api/nope not found"}, res)

    def test_401(self):
        self.get("/api/users/search", with_basic_auth=False, response_status_code=401)

    def test_invalid_csrf(self):
        try:
            os.environ["TESTING"] = ""

            organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
            self.login("urn:mary")
            secret = self.get("/api/api_keys", with_basic_auth=False)["value"]
            self.post("/api/api_keys",
                      body={"organisation_id": organisation_id, "hashed_secret": secret,
                            "description": "Test"},
                      response_status_code=401,
                      with_basic_auth=False)

        finally:
            os.environ["TESTING"] = "1"
