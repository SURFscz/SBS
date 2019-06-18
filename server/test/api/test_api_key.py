# -*- coding: future_fstrings -*-
from server.db.db import Organisation, ApiKey
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestApiKey(AbstractTest):

    def test_api_key_flow(self):
        pre_count = ApiKey.query.count()
        secret = self.get("/api/api_keys")["value"]

        organisation = self.find_entity_by_name(Organisation, uuc_name)

        api_key = self.post("/api/api_keys", body={"organisation_id": organisation.id, "hashed_secret": secret})
        self.assertIsNotNone(api_key["id"])
        self.assertEqual(organisation.id, api_key["organisation_id"])
        self.assertNotEqual(secret, api_key["hashed_secret"])

        post_count = ApiKey.query.count()
        self.assertEqual(pre_count, post_count - 1)

        organisation = self.get(f"/api/organisations/{organisation.id}")
        self.assertEqual(2, len(organisation["api_keys"]))

        secret = self.get("/api/api_keys")["value"]
        api_key["hashed_secret"] = secret

        api_key_updated = self.put("/api/api_keys", body=api_key)
        self.assertNotEqual(api_key["hashed_secret"], api_key_updated["hashed_secret"])

        self.delete("/api/api_keys", primary_key=api_key_updated["id"])
        post_count = ApiKey.query.count()
        self.assertEqual(pre_count, post_count)

    def test_api_key_invalid(self):
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        res = self.post("/api/api_keys", body={"organisation_id": organisation.id, "hashed_secret": "secret"},
                        response_status_code=400)
        self.assertEqual("minimal length of secret for API key is 43", res["message"])
