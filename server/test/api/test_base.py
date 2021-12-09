# -*- coding: future_fstrings -*-
import json
import os
from pathlib import Path

from server.api.base import white_listing
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_user_token, network_cloud_token


class TestBase(AbstractTest):

    def test_health(self):
        res = self.client.get("/health")
        self.assertDictEqual({"status": "UP"}, res.json)

    def test_config(self):
        res = self.client.get("/config").json
        self.assertEqual("http://localhost:3000", res["base_url"])
        self.assertEqual(False, res["local"])
        self.assertTrue(len(res["organisation_categories"]) > 0)

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

    def test_white_listing(self):
        self.assertEqual(19, len(white_listing))

    def test_introspect(self):
        res = self.client.post("/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], True)
        self.assertEqual(res.json["user"]["uid"], "urn:sarah")

    def test_introspect_invalid_bearer_token(self):
        res = self.client.post("/introspect", headers={"Authorization": "bearer nope"},
                               data={"token": "does-not-matter"}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(401, res.status_code)

    def test_introspect_invalid_user_token(self):
        res = self.client.post("/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": "nope"}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["status"], "token-unknown")
        self.assertEqual(res.json["active"], False)

    def test_introspect_expired_user_token(self):
        self.expire_user_token(sarah_user_token)
        res = self.client.post("/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["status"], "token-expired")
        self.assertEqual(res.json["active"], False)
