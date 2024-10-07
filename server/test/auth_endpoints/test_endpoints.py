import re

from auth_endpoints.endpoints import endpoints
from server.test.abstract_test import AbstractTest


class TestEndPoints(AbstractTest):

    def method_call(self, endpoint, failures):
        response_status_code = endpoint.get("status_code", 401)
        try:
            path = re.sub(r'<int:.*?>', '0', endpoint["path"])
            method = endpoint["method"]
            args = {"with_basic_auth": False,
                    "response_status_code": response_status_code,
                    "headers": endpoint.get("headers", {})}
            if method in ["GET"]:
                args["query_data"] = endpoint.get("query_data", {})
            if method in ["POST", "PUT"]:
                args["body"] = endpoint.get("body", {})
            getattr(self, method.lower())(path, **args)
        except Exception as e:
            failures.append({**endpoint, "error": str(e)})

    def test_unauthorized_access(self):
        self.maxDiff = None

        failures = []
        for endpoint in endpoints:
            self.method_call(endpoint, failures)
        self.assertListEqual([], failures)
