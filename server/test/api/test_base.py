# -*- coding: future_fstrings -*-
import json
import os
from pathlib import Path

from server.test.abstract_test import AbstractTest


class TestBase(AbstractTest):

    def test_health(self):
        res = self.client.get("/health")
        self.assertDictEqual({"status": "UP"}, res.json)

    def test_config(self):
        res = self.client.get("/config")
        self.assertDictEqual({"base_url": "http://localhost:3000", "local": False}, res.json)

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
