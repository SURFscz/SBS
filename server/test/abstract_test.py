# -*- coding: future_fstrings -*-
import json
import os
from base64 import b64encode

import requests
from flask import current_app
from flask_testing import TestCase

from server.test.seed import seed

# See api_users in config/test_config.yml
BASIC_AUTH_HEADER = {"Authorization": f"Basic {b64encode(b'sysadmin:secret').decode('ascii')}"}
API_AUTH_HEADER = {"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"}


# The database is cleared and seeded before every test
class AbstractTest(TestCase):

    def setUp(self):
        db = self.app.db
        with self.app.app_context():
            seed(db)

    def create_app(self):
        return AbstractTest.app

    @classmethod
    def setUpClass(cls):
        os.environ["CONFIG"] = "config/test_config.yml"
        os.environ["TESTING"] = "1"

        from server.__main__ import app

        config = app.app_config
        config["profile"] = None
        config.test = True
        AbstractTest.app = app

    @staticmethod
    def find_by_name(coll, name):
        res = list(filter(lambda item: item["name"] == name, coll))
        return res[0] if len(res) > 0 else None

    @staticmethod
    def read_file(file_name):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/data/{file_name}"
        with open(file) as f:
            return f.read()

    @staticmethod
    def find_entity_by_name(cls, name):
        return cls.query.filter(cls.name == name).one()

    @staticmethod
    def uid_header_name():
        return current_app.app_config.oidc_prefix + current_app.app_config.oidc_id

    def login(self, uid="urn:john", schac_home_organisation=None):
        with requests.Session():
            headers = {self.uid_header_name(): uid}
            if schac_home_organisation:
                headers["OIDC_CLAIM_SCHAC_HOME_ORGANISATION"] = schac_home_organisation
            self.client.get("/api/users/me",
                            environ_overrides=headers,
                            headers=headers)

    def get(self, url, query_data={}, response_status_code=200, with_basic_auth=True, headers={}):
        with requests.Session():
            response = self.client.get(url, headers={**BASIC_AUTH_HEADER, **headers} if with_basic_auth else headers,
                                       query_string=query_data)
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            return response.json if hasattr(response, "json") else None

    def post(self, url, body={}, headers={}, response_status_code=201, with_basic_auth=True):
        return self._do_call(body, self.client.post, headers, response_status_code, url, with_basic_auth)

    def put(self, url, body={}, headers={}, response_status_code=201, with_basic_auth=True):
        return self._do_call(body, self.client.put, headers, response_status_code, url, with_basic_auth)

    def _do_call(self, body, call, headers, response_status_code, url, with_basic_auth):
        with requests.Session():
            response = call(url, headers={**BASIC_AUTH_HEADER, **headers} if with_basic_auth else headers,
                            data=json.dumps(body),
                            content_type="application/json")
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            return response.json

    def delete(self, url, primary_key, with_basic_auth=True, response_status_code=204):
        with requests.Session():
            response = self.client.delete(f"{url}/{primary_key}", headers=BASIC_AUTH_HEADER if with_basic_auth else {},
                                          content_type="application/json")
            self.assertEqual(response_status_code, response.status_code)
