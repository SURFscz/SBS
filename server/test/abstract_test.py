# -*- coding: future_fstrings -*-
import datetime
import json
import os
import uuid
from base64 import b64encode
from time import time
from uuid import uuid4

import jwt
import pyotp
import requests
import responses
from flask import current_app
from flask_testing import TestCase

from server.auth.mfa import ACR_VALUES
from server.auth.security import secure_hash
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED
from server.db.domain import Collaboration, User, Organisation, Service, ServiceAup, UserToken, Invitation
from server.test.seed import seed
from server.tools import read_file

# See api_users in config/test_config.yml
BASIC_AUTH_HEADER = {"Authorization": f"Basic {b64encode(b'sysadmin:secret').decode('ascii')}"}
API_AUTH_HEADER = {"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"}
RESTRICTED_CO_API_AUTH_HEADER = {"Authorization": f"Basic {b64encode(b'research_cloud:secret').decode('ascii')}"}


# The database is cleared and seeded before every test
class AbstractTest(TestCase):

    def setUp(self):
        db = self.app.db
        with self.app.app_context():
            os.environ["SEEDING"] = "1"
            seed(db, self.app.app_config)
            del os.environ["SEEDING"]

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
        return cls.query.filter(cls.name == name).first()

    @responses.activate
    def login(self, uid="urn:john", schac_home_organisation=None, user_info={}):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token", "id_token": self.sign_jwt()},
                      status=200)
        json_body = {"sub": uid}
        if schac_home_organisation:
            json_body["voperson_external_id"] = f"jdoe@{schac_home_organisation}"
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint,
                      json={**json_body, **user_info}, status=200)
        responses.add(responses.GET, current_app.app_config.oidc.jwks_endpoint,
                      read_file("test/data/public.json"), status=200)
        with requests.Session():
            self.client.get("/api/users/resume-session?code=123456")

    def get(self, url, query_data={}, response_status_code=200, with_basic_auth=True, headers={}):
        with requests.Session():
            response = self.client.get(url, headers={**BASIC_AUTH_HEADER, **headers} if with_basic_auth else headers,
                                       query_string=query_data)
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            return response if response_status_code == 302 else response.json if hasattr(response, "json") else None

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

    def delete(self, url, primary_key=None, with_basic_auth=True, response_status_code=204, headers={}):
        primary_key_part = f"/{primary_key}" if primary_key else ""
        with requests.Session():
            response = self.client.delete(f"{url}{primary_key_part}",
                                          headers=BASIC_AUTH_HEADER if with_basic_auth else headers,
                                          content_type="application/json")
            self.assertEqual(response_status_code, response.status_code)

    def mark_collaboration_service_restricted(self, collaboration_id):
        db = self.app.db
        with self.app.app_context():
            collaboration = db.session.query(Collaboration).get(collaboration_id)
            collaboration.organisation.services_restricted = True
            db.session.add(collaboration.organisation)
            db.session.commit()

    def mark_organisation_service_restricted(self, organisation_id):
        db = self.app.db
        with self.app.app_context():
            organisation = db.session.query(Organisation).get(organisation_id)
            organisation.services_restricted = True
            db.session.add(organisation)
            db.session.commit()

    def mark_user_suspended(self, user_name):
        user = self.find_entity_by_name(User, user_name)
        user.suspended = True
        db.session.merge(user)
        db.session.commit()

    def expire_all_collaboration_memberships(self, user_name):
        user = self.find_entity_by_name(User, user_name)
        past = datetime.datetime.now() - datetime.timedelta(days=5)
        for cm in user.collaboration_memberships:
            cm.expiry_date = past
            cm.status = STATUS_EXPIRED
            db.session.merge(cm)
        db.session.commit()

    def sign_jwt(self, additional_payload={}):
        now = int(time())
        aud = self.app.app_config.oidc.client_id
        payload = {"aud": aud, "exp": now + (60 * 10), "iat": now, "iss": "issuer",
                   "jti": str(uuid4()), "acr": ACR_VALUES}
        private_key = read_file("test/data/jwt-private-key")
        return jwt.encode({**payload, **additional_payload}, private_key, algorithm="RS256", headers={"kid": "test"})

    @staticmethod
    def add_service_aup_to_user(user_uid, service_entity_id):
        user = User.query.filter(User.uid == user_uid).one()
        service = Service.query.filter(Service.entity_id == service_entity_id).one()
        db.session.merge(ServiceAup(aup_url=service.accepted_user_policy, user_id=user.id, service_id=service.id))
        db.session.commit()

    @staticmethod
    def expire_user_token(raw_token):
        user_token = UserToken.query.filter(UserToken.hashed_token == secure_hash(raw_token)).first()
        user_token.created_at = datetime.datetime.utcnow() - datetime.timedelta(days=500)
        db.session.merge(user_token)
        db.session.commit()

    @staticmethod
    def expire_invitation(hash):
        invitation = Invitation.query.filter(Invitation.hash == hash).first()
        invitation.expiry_date = datetime.datetime.utcnow() - datetime.timedelta(days=500)
        db.session.merge(invitation)
        db.session.commit()

    @staticmethod
    def login_user_2fa(user_uid):
        user = User.query.filter(User.uid == user_uid).one()
        user.last_login_date = datetime.datetime.now()
        db.session.merge(user)
        db.session.commit()

    @staticmethod
    def add_totp_to_user(user_uid):
        user = User.query.filter(User.uid == user_uid).one()
        secret = pyotp.random_base32()
        second_fa_uuid = str(uuid.uuid4())
        user.second_factor_auth = secret
        user.second_fa_uuid = second_fa_uuid
        db.session.merge(user)
        db.session.commit()
        return user
