from werkzeug.exceptions import SecurityError

from server.auth.secrets import hash_secret_key
from server.db.domain import Organisation, ApiKey
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name


class TestApiKey(AbstractTest):

    def test_api_key_flow(self):
        pre_count = ApiKey.query.count()
        secret = self.get("/api/api_keys")["value"]

        organisation = self.find_entity_by_name(Organisation, unihard_name)

        api_key = self.post("/api/api_keys",
                            body={"organisation_id": organisation.id,
                                  "hashed_secret": secret,
                                  "description": "Test",
                                  "units": [{"id": organisation.units[0].id, "organisation_id": organisation.id}]
                                  })
        self.assertIsNotNone(api_key["id"])
        self.assertIsNotNone(api_key["units"][0]["id"])
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        self.assertEqual(organisation.id, api_key["organisation_id"])
        self.assertNotEqual(secret, api_key["hashed_secret"])

        post_count = ApiKey.query.count()
        self.assertEqual(pre_count, post_count - 1)

        organisation = self.get(f"/api/organisations/{organisation.id}")
        self.assertEqual(2, len(organisation["api_keys"]))

        secret = self.get("/api/api_keys")["value"]
        api_key["hashed_secret"] = secret

        self.delete("/api/api_keys", primary_key=api_key["id"])
        post_count = ApiKey.query.count()
        self.assertEqual(pre_count, post_count)

    def test_api_key_invalid(self):
        def security_error():
            hash_secret_key({"hashed_secret": "secret"})

        self.assertRaises(SecurityError, security_error)

    def test_api_key_tampering(self):
        secret = self.get("/api/api_keys")["value"]
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        self.post("/api/api_keys", body={"organisation_id": organisation.id, "hashed_secret": secret + "nope"},
                  response_status_code=403)

    def test_api_call_invalid_auth(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": "Bearer nope"},
                                    data="",
                                    content_type="application/json")
        self.assertEqual(401, response.status_code)
