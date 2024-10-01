import datetime
import json
import os
import pathlib
import uuid
from base64 import b64encode
from time import time
from typing import Union
from urllib import parse
from uuid import uuid4

import jwt
import pyotp
import requests
import responses
from flask import current_app
from flask_testing import TestCase
from onelogin.saml2.utils import OneLogin_Saml2_Utils
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker, load_only

from server.auth.mfa import ACR_VALUES
from server.auth.secrets import secure_hash
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED, STATUS_SUSPENDED
from server.db.domain import Collaboration, User, Service, ServiceAup, UserToken, Invitation, \
    PamSSOSession, Group, CollaborationMembership, Aup
from server.test.seed import seed
from server.tools import dt_now
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
        os.environ["CONFIG"] = os.environ.get("CONFIG", "config/test_config.yml")
        os.environ["TESTING"] = "1"
        os.environ["SCIM_DISABLED"] = "1"

        from server.__main__ import app

        config = app.app_config
        config["profile"] = None
        config.test = True

        # point config to correct metadata file
        metadata_filename = pathlib.Path(__file__).parent.resolve() / "data" / "idps-metadata.xml"
        app.app_config.metadata.idp_url = f"file:///{metadata_filename}"

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

    @staticmethod
    def save_entity(entity):
        db.session.merge(entity)
        db.session.commit()

    @staticmethod
    def change_collaboration(user_name, do_change):
        user = AbstractTest.find_entity_by_name(User, user_name)
        connected_collaborations = [cm.collaboration for cm in user.collaboration_memberships]
        new_connected_collaborations = []
        for collaboration in connected_collaborations:
            changed_co = do_change(collaboration)
            new_connected_collaborations.append(changed_co)
            db.session.merge(changed_co)
            db.session.commit()
        return connected_collaborations

    @staticmethod
    def expire_collaborations(user_name):
        def do_change(collaboration):
            collaboration.expiry_date = dt_now() - datetime.timedelta(days=50)
            return collaboration

        return AbstractTest.change_collaboration(user_name, do_change)

    @staticmethod
    def suspend_collaborations(user_name):
        def do_change(collaboration):
            collaboration.status = STATUS_SUSPENDED
            return collaboration

        return AbstractTest.change_collaboration(user_name, do_change)

    @responses.activate
    def login(self, uid="urn:john", schac_home_organisation=None, user_info={}, add_default_attributes=True):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token", "id_token": self.sign_jwt()},
                      status=200)
        json_body = {"sub": uid}
        if add_default_attributes:
            json_body["name"] = "John Doe"
            json_body["email"] = "jdoe@example"
        if schac_home_organisation:
            json_body["voperson_external_id"] = f"jdoe@{schac_home_organisation}"
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint,
                      json={**json_body, **user_info}, status=200)
        responses.add(responses.GET, current_app.app_config.oidc.jwks_endpoint,
                      read_file("test/data/public.json"), status=200)
        with requests.Session():
            return self.client.get("/api/users/resume-session?code=123456")

    def get(self, url, query_data={}, response_status_code=200, with_basic_auth=True, headers={}, expected_headers={}):
        with requests.Session():
            response = self.client.get(url, headers={**BASIC_AUTH_HEADER, **headers} if with_basic_auth else headers,
                                       query_string=query_data)
            self.assertEqual(response_status_code, response.status_code, msg=str(response.json))
            for key, value in expected_headers.items():
                self.assertEqual(response.headers.get(key), value)
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

    def mark_organisation_service_restricted(self, organisation_name):
        with self.app.app_context():
            session = sessionmaker(self.app.db.engine)
            with session.begin() as s:
                sql = f"UPDATE organisations SET services_restricted = 1 where NAME = '{organisation_name}'"
                s.execute(text(sql))

    def mark_user_suspended(self, user_name):
        user = self.find_entity_by_name(User, user_name)
        user.suspended = True
        db.session.merge(user)
        db.session.commit()

    def expire_all_collaboration_memberships(self, user_name):
        user = self.find_entity_by_name(User, user_name)
        self.expire_collaboration_memberships(user.collaboration_memberships)

    def expire_collaboration_memberships(self, collaboration_memberships):
        past = dt_now() - datetime.timedelta(days=5)
        for cm in collaboration_memberships:
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
    def remove_aup_from_user(user_uid):
        user = User.query.filter(User.uid == user_uid).one()
        Aup.query.filter(Aup.user_id == user.id).delete()
        db.session.commit()

    @staticmethod
    def expire_user_token(raw_token):
        user_token = UserToken.query.filter(UserToken.hashed_token == secure_hash(raw_token)).first()
        user_token.created_at = dt_now() - datetime.timedelta(days=500)
        db.session.merge(user_token)
        db.session.commit()

    @staticmethod
    def expire_invitation(hash):
        invitation = Invitation.query.filter(Invitation.hash == hash).first()
        invitation.expiry_date = dt_now() - datetime.timedelta(days=500)
        invitation.created_by = "not_system"
        db.session.merge(invitation)
        db.session.commit()

    @staticmethod
    def login_user_2fa(user_uid):
        user = User.query.filter(User.uid == user_uid).one()
        user.last_login_date = dt_now()
        return AbstractTest._merge_user(user)

    @staticmethod
    def add_totp_to_user(user_uid):
        user = User.query.filter(User.uid == user_uid).one()
        secret = pyotp.random_base32()
        second_fa_uuid = str(uuid.uuid4())
        user.second_factor_auth = secret
        user.second_fa_uuid = second_fa_uuid
        return AbstractTest._merge_user(user)

    @staticmethod
    def add_second_fa_uuid_to_user(user_uid):
        user = User.query.filter(User.uid == user_uid).one()
        second_fa_uuid = str(uuid.uuid4())
        user.second_fa_uuid = second_fa_uuid
        return AbstractTest._merge_user(user)

    @staticmethod
    def _merge_user(user):
        db.session.merge(user)
        db.session.commit()
        return user

    @staticmethod
    def get_authn_response(file):
        xml_response = read_file(f"test/saml2/{file}")
        key = read_file("config/saml_test/certs/sp.key")
        cert = read_file("config/saml_test/certs/sp.crt")
        xml_authn_signed = OneLogin_Saml2_Utils.add_sign(xml_response, key, cert)
        return b64encode(xml_authn_signed)

    @staticmethod
    def expire_pam_session(session_id):
        pam_websso = PamSSOSession.query.filter(PamSSOSession.session_id == session_id).first()
        pam_websso.created_at = dt_now() - datetime.timedelta(days=500)
        db.session.merge(pam_websso)
        db.session.commit()

    @staticmethod
    def set_second_factor_auth(urn="urn:mary"):
        user = User.query.filter(User.uid == urn).first()
        user.second_factor_auth = pyotp.random_base32()
        db.session.merge(user)
        db.session.commit()
        return user.second_factor_auth

    @staticmethod
    def clear_group_memberships(group: Union[Group, Collaboration]):
        group.collaboration_memberships.clear()
        db.session.merge(group)
        db.session.commit()

    @staticmethod
    def find_group_membership(group_identifier, user_uid):
        return CollaborationMembership.query \
            .join(CollaborationMembership.groups) \
            .join(CollaborationMembership.user) \
            .filter(Group.identifier == group_identifier) \
            .filter(User.uid == user_uid) \
            .first()

    @staticmethod
    def find_collaboration_membership(collaboration_identifier, user_uid):
        return CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .join(CollaborationMembership.collaboration) \
            .filter(Collaboration.identifier == collaboration_identifier) \
            .filter(User.uid == user_uid) \
            .first()

    @staticmethod
    def url_to_query_dict(url):
        query_dict = dict(parse.parse_qs(parse.urlsplit(url).query))
        # Rebuild to have single values for keys
        return {k: v[0] for k, v in query_dict.items()}

    def add_bearer_token_to_services(self):
        services = Service.query.options(load_only(Service.id)) \
            .filter(Service.scim_enabled == True).all()  # noqa: E712
        service_identifiers = [s.id for s in services]
        for identifier in service_identifiers:
            self.put(f"/api/services/reset_scim_bearer_token/{identifier}",
                     {"scim_bearer_token": "secret"})
