# -*- coding: future_fstrings -*-
import yaml

from server.test.abstract_test import AbstractTest


class TestSwagger(AbstractTest):

    def test_path(self):
        res = self.client.get("/swagger/schemas/CollaborationDetail.yaml")
        self.assertEqual(res.status_code, 200)
        self.assertEqual("max-age=3600", res.headers.get("Cache-Control"))

        parsed = yaml.load(res.data, Loader=yaml.FullLoader)
        self.assertEqual("Cumulus research group", parsed["properties"]["name"]["example"])
