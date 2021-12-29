# -*- coding: future_fstrings -*-
import yaml

from server.test.abstract_test import AbstractTest


class TestSwagger(AbstractTest):

    def test_path(self):
        res = self.client.get("/swagger/schemas/Collaboration.yaml")
        parsed = yaml.load(res.data, Loader=yaml.FullLoader)
        self.assertEqual("Researcher", parsed["properties"]["name"]["example"])
