import responses

from server.db.db import db
from server.db.domain import ServiceRequest, ServiceMembership, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_request_gpt_name, service_request_gpt_uuid4
from server.tools import read_file

expected_metadata_dict = {"entity_id": "https://engine.test.surfconext.nl/authentication/sp/metadata",
                          "acs_locations": [
                              {"location": "https://engine.test.surfconext.nl/authentication/sp/consume-assertion",
                               "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"},
                              {"location": "https://engine.test.surfconext.nl/acs-location/1",
                               "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"}
                          ], "organization_name": "SURFconext TEST EN"}


class TestServiceRequest(AbstractTest):

    def _resolve_manage_base_url(self):
        manage_base_url = self.app.app_config.manage.base_url
        return manage_base_url[:-1] if manage_base_url.endswith("/") else manage_base_url

    def test_service_request_by_id(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        res = self.get(f"/api/service_requests/{service_request.id}")
        self.assertEqual("urn:sarah", res["requester"]["uid"])

    def test_service_requests_all(self):
        res = self.get("/api/service_requests/all")
        self.assertEqual(1, len(res))

    def test_request_service(self):
        self.login("urn:roger", add_default_attributes=False)
        data = {
            "name": "New Service",
            "abbreviation": "new_service_abbreviation",
            "providing_organisation": "cloudy",
            "privacy_policy": "https://privacy_policy.org"
        }
        with self.app.mail.record_messages() as outbox:
            res = self.post("/api/service_requests", body=data, with_basic_auth=False)
            service_request = db.session.get(ServiceRequest, res["id"])
            self.assertEqual("urn:roger", service_request.requester.uid)
            mail_msg = outbox[0]
            self.assertEqual("Request for new application New Service (local)", mail_msg.subject)
            self.assertIn("no-reply@surf.nl", mail_msg.from_email)
            self.assertIn("sram-support@surf.nl", mail_msg.to)
            self.assertIn("roger@example.org", mail_msg.cc)

    def test_request_service_approve(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        service_request_requester_uid = service_request.requester.uid
        body = {
            "name": "New Service",
            "abbreviation": "new_service_abbreviation",
            "comment": "pretty please",
            "providing_organisation": "cloudy",
            "entity_id": "https://entity_id.com",
            "privacy_policy": "https://privacy_policy.org",
            "logo": f"https://sbs/api/images/service_requests/{service_request_gpt_uuid4}",
            "id": "invalid_id"
        }
        with self.app.mail.record_messages() as outbox:
            self.login("urn:john")
            res = self.put(f"/api/service_requests/approve/{service_request.id}",
                           body=body, with_basic_auth=False)

            members = ServiceMembership.query.filter(ServiceMembership.service_id == res["id"]).all()
            self.assertEqual(1, len(members))

            membership = members[0]
            self.assertEqual("admin", membership.role)
            self.assertEqual(service_request_requester_uid, membership.user.uid)

            mail_msg = outbox[0]
            self.assertEqual("Service request for service New Service has been accepted (local)",
                             mail_msg.subject)

    def test_request_service_approve_logo_url(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        service_request_id = service_request.id
        body = {
            "name": "New Service",
            "abbreviation": "new_service_abbreviation",
            "comment": "pretty please",
            "providing_organisation": "cloudy",
            "entity_id": "https://entity_id.com",
            "privacy_policy": "https://privacy_policy.org"
        }
        self.login("urn:john")
        self.put(f"/api/service_requests/approve/{service_request_id}",
                 body=body, with_basic_auth=False)
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        raw_logo = service_request.raw_logo()
        self.assertFalse(raw_logo.startswith("http"))

        new_service = self.find_entity_by_name(Service, body["name"])
        self.assertEqual(36, len(new_service.ldap_identifier))

    def test_request_service_deny(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)

        with self.app.mail.record_messages() as outbox:
            self.login("urn:john")
            reason = "Prerogative of admins"
            self.put(f"/api/service_requests/deny/{service_request.id}",
                     body={"rejection_reason": reason},
                     with_basic_auth=False)

            mail_msg = outbox[0]
            self.assertEqual("Service request for service GPT has been denied (local)",
                             mail_msg.subject)
            self.assertTrue(reason in mail_msg.html)

    def test_delete(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        self.login("urn:john")
        self.delete("/api/service_requests", primary_key=service_request.id, with_basic_auth=False,
                    response_status_code=400)

    def test_delete_with_status_open(self):
        pre_count = ServiceRequest.query.count()
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        service_request_id = service_request.id
        self.login("urn:john")
        body = {
            "name": "New Service",
            "abbreviation": "new_service_abbreviation",
            "comment": "pretty please",
            "providing_organisation": "cloudy",
            "entity_id": "https://entity_id.com",
            "privacy_policy": "https://privacy_policy.org"
        }
        self.put(f"/api/service_requests/approve/{service_request_id}",
                 body=body, with_basic_auth=False)
        self.delete("/api/service_requests", primary_key=service_request_id, with_basic_auth=False)
        self.assertEqual(pre_count - 1, ServiceRequest.query.count())

    def test_metadata_parse_xml(self):
        self.login("urn:betty")
        xml = read_file("test/saml2/sp_meta_data.xml")
        meta_data = self.post("/api/service_requests/metadata/parse", body={"meta_data_xml": xml},
                              response_status_code=200, with_basic_auth=False)
        self.assertDictEqual(expected_metadata_dict, meta_data)

    @responses.activate
    def test_parse_metadata_url(self):
        self.login("urn:betty")
        xml = read_file("test/saml2/sp_meta_data.xml")
        url = "http://localhost:9001/metadata"
        with responses.RequestsMock(assert_all_requests_are_fired=True) as request_mocks:
            request_mocks.add(responses.GET, url, body=xml, status=200, content_type="text/xml")
            meta_data = self.post("/api/service_requests/metadata/parse", body={"meta_data_url": url},
                                  response_status_code=200, with_basic_auth=False)
            self.assertDictEqual(expected_metadata_dict, meta_data)

    def test_metadata_parse_bad_request(self):
        self.login("urn:betty")
        self.post("/api/service_requests/metadata/parse", body={}, response_status_code=400,
                  with_basic_auth=False)
