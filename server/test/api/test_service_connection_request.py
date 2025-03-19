import uuid

from server.db.db import db
from server.db.domain import Collaboration, Service, ServiceConnectionRequest
from server.test.abstract_test import AbstractTest
from server.test.seed import service_connection_request_ssh_hash, co_research_name, service_wiki_name, \
    co_ai_computing_name, service_ssh_name, service_storage_name, service_cloud_name, \
    co_robotics_disabled_join_request_name, service_connection_request_storage_hash


class TestServiceConnectionRequest(AbstractTest):

    def test_service_request_connections_by_service(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        res = self.get(f"/api/service_connection_requests/by_service/{service.id}")

        self.assertEqual(1, len(res))
        self.assertListEqual(["collaboration_id", "id"], list(sorted(res[0].keys())))

    def test_delete_service_request_connection(self):
        self.login("urn:sarah")
        request = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one()

        self.delete("/api/service_connection_requests", request.id, with_basic_auth=False)
        count = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.hash == service_connection_request_ssh_hash).count()
        self.assertEqual(0, count)

    def test_service_connection_request(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
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
            self.assertEqual("Request for new service Wiki connection to collaboration AI computing (local)",
                             mail_msg.subject)
            self.assertEqual(["service_admin@ucc.org"], mail_msg.to)

    def test_service_connection_request_with_no_admins(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        service = self.find_entity_by_name(Service, service_wiki_name)
        service.contact_email = None
        service.service_memberships = []
        db.session.merge(service)
        db.session.commit()

        self.login("urn:admin")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        with self.app.mail.record_messages() as outbox:
            self.post("/api/service_connection_requests", body=data, with_basic_auth=False)
            mail_msg = outbox[0]
            self.assertEqual(["john@example.org"], mail_msg.to)
            self.assertEqual(0, len(mail_msg.cc))

    def test_service_connection_request_by_admin_email_admin(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
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
            self.assertListEqual(["betty@uuc.org", "james@example.org"], sorted(mail_msg.to))

    def test_service_connection_request_by_member(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        service = self.find_entity_by_name(Service, service_cloud_name)
        service_id = service.id
        self.login("urn:jane")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service_id,
            "message": "Pretty please"
        }
        self.post("/api/service_connection_requests", body=data, with_basic_auth=False, response_status_code=403)

    def test_existing_service_connection_request(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_ssh_name)

        self.login("urn:sarah")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        res = self.post("/api/service_connection_requests", body=data, with_basic_auth=False, response_status_code=400)
        self.assertTrue("outstanding_service_connection_request" in res["message"])

    def test_approve_service_connection_request_not_allowed(self):
        service = self.find_entity_by_name(Service, service_ssh_name)
        service.override_access_allowed_all_connections = 0
        self.save_entity(service)

        request_id = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one().id
        # CO admin not allowed to approve
        self.login("urn:sarah")
        self.put("/api/service_connection_requests/approve",
                 body={"id": request_id},
                 response_status_code=403)

    def test_approve_service_connection_request_allowed_for_org_manager(self):
        request_id = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one().id
        # ORG manager allowed to approve
        self.login("urn:paul")
        self.put("/api/service_connection_requests/approve",
                 body={"id": request_id},
                 response_status_code=201)

    def test_approve_service_connection_request_pending_org(self):
        service = self.find_entity_by_name(Service, service_ssh_name)
        service.override_access_allowed_all_connections = 0
        self.save_entity(service)

        service_connection_request = ServiceConnectionRequest.query.filter(
            ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one()
        self.assertTrue(service_connection_request.pending_organisation_approval)
        request_id = service_connection_request.id
        with self.app.mail.record_messages() as outbox:
            # Org admin is allowed to approve
            self.login("urn:jane")
            self.put("/api/service_connection_requests/approve",
                     body={"id": request_id})

            service_connection_request = ServiceConnectionRequest.query.filter(
                ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one()
            self.assertFalse(service_connection_request.pending_organisation_approval)
            mail_msg = outbox[0]
            self.assertTrue(f"Request for new service {service_ssh_name} "
                            f"connection to collaboration {co_research_name}" in mail_msg.subject)

    def test_approve_service_connection(self):
        service = self.find_entity_by_name(Service, service_ssh_name)
        service.override_access_allowed_all_connections = 0
        self.save_entity(service)

        pre_services_count = len(self.find_entity_by_name(Collaboration, co_research_name).services)
        service_connection_request = ServiceConnectionRequest.query.filter(
            ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one()
        service_connection_request.pending_organisation_approval = False
        self.save_entity(service_connection_request)
        with self.app.mail.record_messages() as outbox:
            # Service admin is allowed to approve
            self.login("urn:betty")
            self.put("/api/service_connection_requests/approve/",
                     body={"id": service_connection_request.id})
            post_services_count = len(self.find_entity_by_name(Collaboration, co_research_name).services)

            self.assertEqual(pre_services_count + 1, post_services_count)

            mail_msg = outbox[0]
            self.assertEqual(f"Service {service_ssh_name} connection request for collaboration {co_research_name} "
                             f"has been accepted (local)", mail_msg.subject)

    def test_approve_service_connection_request_with_no_email_requester(self):
        service = self.find_entity_by_name(Service, service_ssh_name)
        service.override_access_allowed_all_connections = 0
        self.save_entity(service)

        request = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one()
        request_id = request.id
        request.requester.email = None
        request.pending_organisation_approval = False
        self.save_entity(request.requester)
        with self.app.mail.record_messages() as outbox:
            # Service admin is allowed to approve
            self.login("urn:betty")
            self.put("/api/service_connection_requests/approve", body={"id": request_id})

            mail_msg = outbox[0]
            self.assertListEqual(["sram-beheer@surf.nl"], mail_msg.to)

    def test_deny_service_connection_request(self):
        pre_services_count = len(self.find_entity_by_name(Collaboration, co_research_name).services)
        request_id = ServiceConnectionRequest.query.filter(
            ServiceConnectionRequest.hash == service_connection_request_ssh_hash).one().id
        with self.app.mail.record_messages() as outbox:
            # CO admin not allowed to deny
            self.login("urn:sarah")
            self.put("/api/service_connection_requests/deny",
                     body={"id": request_id, "rejection_reason": "Because..."},
                     response_status_code=403)

            # Service admin is allowed to deny
            self.login("urn:betty")
            self.put("/api/service_connection_requests/deny",
                     body={"id": request_id, "rejection_reason": "Because..."})
            post_services_count = len(self.find_entity_by_name(Collaboration, co_research_name).services)

            self.assertEqual(pre_services_count, post_services_count)

            mail_msg = outbox[0]
            self.assertEqual(f"Service {service_ssh_name} connection request for collaboration "
                             f"{co_research_name} has been declined (local)", mail_msg.subject)

    def test_all_service_request_connections_by_service(self):
        storage_id = self.find_entity_by_name(Service, service_storage_name).id
        self.login("urn:service_admin")
        res = self.get(f"/api/service_connection_requests/all/{storage_id}", with_basic_auth=False)
        self.assertEqual(1, len(res))

    def test_service_approve_with_service_groups(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        wiki_service = self.find_entity_by_name(Service, service_wiki_name)

        self.login("urn:admin", user_info={"email": "jdoe@ex.com"})
        message = str(uuid.uuid4())
        self.post("/api/service_connection_requests",
                  body={"collaboration_id": collaboration.id,
                        "service_id": wiki_service.id,
                        "message": message
                        }, with_basic_auth=False)
        service_connection_request = ServiceConnectionRequest.query.filter(
            ServiceConnectionRequest.message == message).one()

        self.login("urn:service_admin")
        self.put("/api/service_connection_requests/approve",
                 body={"id": service_connection_request.id})

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)

        groups = collaboration.groups
        group = list(filter(lambda group: group.global_urn == "uniharderwijk:ai_computing:wiki-wiki2", groups))[0]
        self.assertEqual(1, len(group.invitations))

    def test_delete_service_request_connection_by_service_manager(self):
        request = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.hash == service_connection_request_storage_hash).one()

        self.login("urn:service_admin")
        self.delete("/api/service_connection_requests", request.id, with_basic_auth=False)

    def test_service_connection_request_pending_organisation(self):
        collaboration = self.find_entity_by_name(Collaboration, co_robotics_disabled_join_request_name)
        service = self.find_entity_by_name(Service, service_ssh_name)

        self.login("urn:jane")
        data = {
            "collaboration_id": collaboration.id,
            "service_id": service.id,
            "message": "Pretty please"
        }
        with self.app.mail.record_messages() as outbox:
            self.post("/api/service_connection_requests", body=data, with_basic_auth=False)

            mail_msg = outbox[0]
            # Admin of the organisation
            self.assertEqual(["jdoe@example"], mail_msg.to)
