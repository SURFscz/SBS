import base64
import os
from functools import wraps

from flask import current_app
from lxml import etree
from signxml import XMLVerifier

from server.auth.surf_conext import surf_public_signing_certificate
from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestMockUser(AbstractTest):

    def allow_for_mock_user_api(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                os.environ["ALLOW_MOCK_USER_API"] = "1"
                fn(*args, **kwargs)
            finally:
                del os.environ["ALLOW_MOCK_USER_API"]

        return wrapper

    def test_login_user_forbidden(self):
        self.put("/api/mock", body={}, with_basic_auth=False, response_status_code=403)

    @allow_for_mock_user_api
    def test_login_user(self):
        self.put("/api/mock", body={"sub": "urn:peter", "name": "Doe Ba", "email": "peter@example.org"},
                 with_basic_auth=False)

        user = self.find_entity_by_name(User, "Doe Ba")
        self.assertEqual("peter@example.org", user.email)

    @allow_for_mock_user_api
    def test_login_new_user(self):
        self.put("/api/mock", body={"sub": "urn:boa", "name": "Boa Dee", "email": "boa@example.org"},
                 with_basic_auth=False)

        user = self.find_entity_by_name(User, "Boa Dee")
        self.assertEqual("boa@example.org", user.email)

    @allow_for_mock_user_api
    def test_eb_interrupt_data(self):
        self.login()
        res = self.get("/api/mock/interrupt_data", query_data={"user_uid": "urn:sarah"}, with_basic_auth=False)
        base64_encoded_xml = res["signed_user"]
        xml = base64.b64decode(base64_encoded_xml).decode()
        doc = etree.fromstring(xml)
        cert = surf_public_signing_certificate(current_app)
        verified_data = XMLVerifier().verify(doc, x509_cert=cert).signed_xml
        user_uid = verified_data.attrib.get("user_id")
        self.assertEqual("urn:sarah", user_uid)
