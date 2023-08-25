from flask import jsonify

from server.db.db import db
from server.db.domain import ServiceRequest, ServiceMembership
from server.test.abstract_test import AbstractTest
from server.test.seed import service_request_gpt_name


class TestServiceRequest(AbstractTest):

    def test_service_request_by_id(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        res = self.get(f"/api/service_requests/{service_request.id}")

        self.assertEqual("urn:sarah", res["requester"]["uid"])

    def test_request_service(self):
        self.login("urn:roger")
        data = {
            "name": "New Service",
            "short_name": "new_service_short",
            "comment": "pretty please",
            "providing_organisation": "cloudy",
            "privacy_policy": "https://privacy_policy.org"
        }
        with self.app.mail.record_messages() as outbox:
            res = self.post("/api/service_requests", body=data, with_basic_auth=False)
            service_request = db.session.get(ServiceRequest, res["id"])
            self.assertEqual("urn:roger", service_request.requester.uid)
            mail_msg = outbox[0]
            self.assertEqual("Request for new service New Service (local)", mail_msg.subject)

    def test_request_service_approve(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        service_request_requester_uid = service_request.requester.uid
        with self.app.mail.record_messages() as outbox:
            self.login("urn:mary")
            res = self.put(f"/api/service_requests/approve/{service_request.id}",
                           body=jsonify(service_request), with_basic_auth=False)

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
        res = self.get(f"/api/service_requests/{service_request_id}")

        self.login("urn:john")
        self.put(f"/api/service_requests/approve/{service_request_id}",
                 body={
                     "name": res["name"],
                     "logo": res["logo"],
                     "description": "new_service",
                     "short_name": res["short_name"],
                     "organisation_id": res["organisation_id"]
                 }, with_basic_auth=False)
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        raw_logo = service_request.raw_logo()
        self.assertFalse(raw_logo.startswith("http"))

    def test_request_service_deny(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)

        with self.app.mail.record_messages() as outbox:
            self.login("urn:mary")
            reason = "Prerogative of admins"
            self.put(f"/api/service_requests/deny/{service_request.id}",
                     body={"rejection_reason": reason},
                     with_basic_auth=False)

            mail_msg = outbox[0]
            self.assertEqual("Service request for service New Service has been declined (local)",
                             mail_msg.subject)
            self.assertTrue(reason in mail_msg.html)

    def test_delete(self):
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        self.login("urn:harry")
        self.delete("/api/service_requests", primary_key=service_request.id, with_basic_auth=False,
                    response_status_code=400)

    def test_delete_with_status_open(self):
        pre_count = ServiceRequest.query.count()
        service_request = self.find_entity_by_name(ServiceRequest, service_request_gpt_name)
        service_request_id = service_request.id
        self.login("urn:harry")
        self.put(f"/api/service_requests/approve/{service_request_id}",
                 body={
                     "name": service_request.name,
                     "description": "new_service",
                     "short_name": service_request.short_name,
                     "organisation_id": service_request.organisation_id
                 }, with_basic_auth=False)
        self.delete("/api/service_requests", primary_key=service_request_id, with_basic_auth=False)
        self.assertEqual(pre_count - 1, ServiceRequest.query.count())
