import re

from server.test.abstract_test import AbstractTest
from server.test.auth_endpoints.endpoints import endpoints, Roles


class TestEndPoints(AbstractTest):

    @classmethod
    def setUpClass(cls):
        super(TestEndPoints, cls).setUpClass()
        cls.roles = {
            # Use the uid, as pre-fetching is useless because of session closed, it will be fetched anyway during login
            Roles.APPLICATION_PLATFORM.name: "urn:john",
            Roles.ORGANISATION_ADMIN.name: "urn:jane",
            Roles.ORGANISATION_MANAGER.name: "urn:paul",
            Roles.COLLABORATION_ADMIN.name: "urn:sarah",
            Roles.COLLABORATION_MEMBER.name: "urn:peter",
            Roles.SERVICE_ADMIN.name: "urn:james",
            Roles.SERVICE_MANAGER.name: "urn:betty"
        }

    def do_access(self, endpoint, path, response_status_code):
        method = endpoint["method"]
        args = {"with_basic_auth": False,
                "response_status_code": response_status_code,
                "headers": endpoint.get("headers", {})}
        if method in ["GET"]:
            args["query_data"] = endpoint.get("query_data", {})
        if method in ["POST", "PUT"]:
            args["body"] = endpoint.get("body", {})
        getattr(self, method.lower())(path, **args)

    def unauthorized_access(self, endpoint, failures):
        response_status_code = endpoint.get("status_code", 401)
        try:
            path = re.sub(r'<int:.*?>', '0', endpoint["path"])
            self.logout()
            self.do_access(endpoint, path, response_status_code)
        except Exception as e:
            failures.append({**endpoint, "error": str(e)})

    def authorized_access(self, endpoint, failures):
        roles = endpoint.get("access_role").lower_authority_roles()
        response_status_code = endpoint.get("status_code", 403)
        for role in roles:
            try:
                uid = self.roles[role.name]
                self.login(uid)
                # TODO how to get meaningfully query params and bodies
                path = re.sub(r'<int:.*?>', '0', endpoint["path"])
                self.do_access(endpoint, path, response_status_code)
            except Exception as e:
                failures.append({**endpoint, "error": str(e)})

    def check_for_missing_endpoints(self):
        url_map = self.app.url_map
        paths = [rule.rule for rule in url_map.iter_rules()]
        missing_endpoints = [endpoint for endpoint in endpoints if
                             endpoint["path"] not in paths and "<filename>" not in endpoint["path"]]
        self.assertEqual(0, len(missing_endpoints))

    def test_unauthorized_access(self):
        self.check_for_missing_endpoints()
        self.maxDiff = None

        failures = []
        for endpoint in endpoints:
            self.unauthorized_access(endpoint, failures)
            if "access_role" in endpoint:
                self.authorized_access(endpoint, failures)

        self.assertListEqual([], failures)
