# -*- coding: future_fstrings -*-
from server.db.domain import Collaboration, Service, ServiceConnectionRequest
from server.test.abstract_test import AbstractTest
from server.test.seed import ssh_service_connection_request_hash, sarah_name, uva_research_name, service_wiki_name, \
    ai_computing_name, service_ssh_uva_name, service_storage_name, service_cloud_name


class TestServiceConnectionRequest(AbstractTest):

    def test_service_request_connections_by_service(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        res = self.get(f"/api/service_connection_requests/by_service/{service.id}")

        self.assertEqual(1, len(res))
        self.assertListEqual(["collaboration_id", "id"], list(sorted(res[0].keys())))

    def test_delete_service_request_connection(self):
        self.login("urn:sarah")
        req = self.get(f"/api/service_connection_requests/find_by_hash/{ssh_service_connection_request_hash}")
        self.delete("/api/service_connection_requests", req["id"], with_basic_auth=False)
        self.get(f"/api/service_connection_requests/find_by_hash/{ssh_service_connection_request_hash}",
                 response_status_code=404)

    def test_service_connection_request(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        service = self.find_entity_by_name(Service, service_wiki_name)

        self.login("urn:admin")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        with self.app.mail.record_messages() as outbox:
            pre_count = ServiceConnectionRequest.query.count()
            self.post("/api/service_connection_requests", body=data, with_basic_auth=False)
            post_count = ServiceConnectionRequest.query.count()
            self.assertEqual(pre_count + 1, post_count)

            mail_msg = outbox[0]
            self.assertEqual("Request for new service Wiki connection to collaboration AI computing", mail_msg.subject)
            self.assertEqual(["help@wiki.com"], mail_msg.recipients)

    def test_service_connection_request_by_admin_email_admin(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.login("urn:admin")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        with self.app.mail.record_messages() as outbox:
            self.post("/api/service_connection_requests", body=data, with_basic_auth=False)
            mail_msg = outbox[0]
            self.assertEqual(["james@example.org"], mail_msg.recipients)

    def test_service_connection_request_by_member(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.login("urn:jane")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        with self.app.mail.record_messages() as outbox:
            pre_count = ServiceConnectionRequest.query.count()
            self.post("/api/service_connection_requests", body=data, with_basic_auth=False)
            post_count = ServiceConnectionRequest.query.count()
            self.assertEqual(pre_count + 1, post_count)

            mail_msg = outbox[0]
            self.assertTrue("You received this email because you are an admin of this collaboration" in mail_msg.html)
            req = ServiceConnectionRequest.query.filter(ServiceConnectionRequest.service_id == service.id).first()
            self.assertEqual(True, req.is_member_request)

    def test_existing_service_connection_request(self):
        collaboration = self.find_entity_by_name(Collaboration, uva_research_name)
        service = self.find_entity_by_name(Service, service_ssh_uva_name)

        self.login("urn:sarah")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        res = self.post("/api/service_connection_requests", body=data, with_basic_auth=False, response_status_code=400)
        self.assertTrue("outstanding_service_connection_request" in res["message"])

    def test_service_connection_request_by_hash(self):
        res = self.get(f"/api/service_connection_requests/find_by_hash/{ssh_service_connection_request_hash}")

        self.assertEqual(sarah_name, res["requester"]["name"])
        self.assertEqual(uva_research_name, res["collaboration"]["name"])
        self.assertEqual(service_ssh_uva_name, res["service"]["name"])

    def test_approve_service_connection_request(self):
        pre_services_count = len(self.find_entity_by_name(Collaboration, uva_research_name).services)

        with self.app.mail.record_messages() as outbox:
            self.put(f"/api/service_connection_requests/approve/{ssh_service_connection_request_hash}")
            post_services_count = len(self.find_entity_by_name(Collaboration, uva_research_name).services)

            self.assertEqual(pre_services_count + 1, post_services_count)

            mail_msg = outbox[0]
            self.assertEqual("Service SSH UvA connection request for collaboration UVA UCC research has been accepted",
                             mail_msg.subject)

    def test_deny_service_connection_request(self):
        pre_services_count = len(self.find_entity_by_name(Collaboration, uva_research_name).services)

        with self.app.mail.record_messages() as outbox:
            self.put(f"/api/service_connection_requests/deny/{ssh_service_connection_request_hash}")
            post_services_count = len(self.find_entity_by_name(Collaboration, uva_research_name).services)

            self.assertEqual(pre_services_count, post_services_count)

            mail_msg = outbox[0]
            self.assertEqual("Service SSH UvA connection request for collaboration UVA UCC research has been declined",
                             mail_msg.subject)

    def test_resend_service_connection_request(self):
        res = self.get(f"/api/service_connection_requests/find_by_hash/{ssh_service_connection_request_hash}")

        with self.app.mail.record_messages() as outbox:
            self.login("urn:john")
            self.get(f"/api/service_connection_requests/resend/{res['id']}")
            mail_msg = outbox[0]
            self.assertEqual("Request for new service SSH UvA connection to collaboration UVA UCC research",
                             mail_msg.subject)

    def test_all_service_request_connections_by_service(self):
        storage_id = self.find_entity_by_name(Service, service_storage_name).id
        self.login("urn:service_admin")
        res = self.get(f"/api/service_connection_requests/all/{storage_id}", with_basic_auth=False)
        self.assertEqual(1, len(res))
