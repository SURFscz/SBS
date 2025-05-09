import uuid

from sqlalchemy.orm import joinedload

from server.db.db import db
from server.db.defaults import STATUS_DENIED, STATUS_APPROVED
from server.db.domain import JoinRequest, User, Collaboration, OrganisationAup
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_uuid, co_robotics_disabled_join_request_name, co_research_name, \
    co_ai_computing_name


class TestJoinRequest(AbstractTest):

    @staticmethod
    def _join_request_by_user(uid):
        return User.query.options(joinedload(User.join_requests)).filter(User.uid == uid).one().join_requests[0]

    def test_new_join_request(self):
        collaboration = Collaboration.query \
            .filter(Collaboration.identifier == co_ai_computing_uuid).one()
        organisation_id = collaboration.organisation_id
        collaboration_id = collaboration.id
        self.login("urn:james")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            pre_count = JoinRequest.query.count()
            self.post("/api/join_requests",
                      body={"collaborationId": collaboration_id, "motivation": "please"},
                      with_basic_auth=False)
            post_count = JoinRequest.query.count()
            self.assertEqual(pre_count + 1, post_count)
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]

            self.assertListEqual(["boss@example.org"], mail_msg.to)
            link = f"{self.app.app_config.base_url}/collaborations/{collaboration_id}/joinrequests"
            self.assertTrue(link in mail_msg.html)
            org_aup = OrganisationAup.query \
                .filter(OrganisationAup.organisation_id == organisation_id).one()
            self.assertIsNotNone(org_aup)

    def test_new_join_request_already_member(self):
        collaboration_id = Collaboration.query \
            .filter(Collaboration.identifier == co_ai_computing_uuid).one().id
        self.login("urn:jane")
        self.post("/api/join_requests",
                  response_status_code=409,
                  body={"collaborationId": collaboration_id, "motivation": "please"},
                  with_basic_auth=False)

    def test_new_join_request_with_existing(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        user_id = self.find_entity_by_name(User, "Peter Doe").id
        join_request = JoinRequest(user_id=user_id, collaboration_id=collaboration.id, hash=str(uuid.uuid4()),
                                   status="open")
        db.session.merge(join_request)
        db.session.commit()

        self.login("urn:peter")
        self.post("/api/join_requests",
                  body={"collaborationId": collaboration.id, "motivation": "please"},
                  with_basic_auth=False)
        self.assertEqual(1, JoinRequest.query.filter(JoinRequest.user_id == user_id).count())

    def test_disabled_join_requests(self):
        collaboration = self.find_entity_by_name(Collaboration, co_robotics_disabled_join_request_name)
        self.login("urn:jane")
        self.post("/api/join_requests",
                  response_status_code=409,
                  body={"collaborationId": collaboration.id, "motivation": "please"},
                  with_basic_auth=False)

    def test_join_request_already_member(self):
        self._do_test_join_request_already_member("urn:jane", True)

    def test_join_request_no_member(self):
        self._do_test_join_request_already_member("urn:mary", False)

    def _do_test_join_request_already_member(self, user_urn, result):
        collaboration_id = Collaboration.query \
            .filter(Collaboration.identifier == co_ai_computing_uuid).one().id
        self.login(user_urn)
        res = self.post("/api/join_requests/already-member",
                        response_status_code=200,
                        body={"collaborationId": collaboration_id},
                        with_basic_auth=False)
        self.assertEqual(result, res)

    def test_accept_join_request(self):
        self.assertEqual(4, JoinRequest.query.count())
        join_request = self._join_request_by_user("urn:peter")
        join_request_hash = join_request.hash
        join_request_id = join_request.id
        self.login("urn:admin")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/join_requests/accept", body={"hash": join_request_hash})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["peter@example.org"], mail_msg.to)
            self.assertTrue("accepted" in mail_msg.html)
            join_request = db.session.get(JoinRequest, join_request_id)
            self.assertEqual(STATUS_APPROVED, join_request.status)

    def test_accept_join_request_already_member(self):
        join_request_hash = self._join_request_by_user("urn:john").hash
        self.login("urn:admin")
        self.put("/api/join_requests/accept", body={"hash": join_request_hash}, response_status_code=409)

    def test_decline_join_request(self):
        join_request = self._join_request_by_user("urn:peter")
        join_request_id = join_request.id
        join_request_hash = join_request.hash
        self.login("urn:admin")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            rejection_reason = "Prerogative of admins"
            self.put("/api/join_requests/decline", body={"hash": join_request_hash,
                                                         "rejection_reason": rejection_reason})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["peter@example.org"], mail_msg.to)
            self.assertTrue("denied" in mail_msg.html)
            self.assertTrue(rejection_reason in mail_msg.html)

            join_request = db.session.get(JoinRequest, join_request_id)
            self.assertEqual(STATUS_DENIED, join_request.status)
            self.assertEqual(rejection_reason, join_request.rejection_reason)

    def test_delete_join_request(self):
        pre_count = JoinRequest.query.count()
        join_request = self._join_request_by_user("urn:peter")
        join_request_id = join_request.id
        join_request_hash = join_request.hash
        self.login("urn:admin")
        self.put("/api/join_requests/accept", body={"hash": join_request_hash})
        self.delete("/api/join_requests", primary_key=join_request_id, with_basic_auth=False)
        self.assertEqual(pre_count - 1, JoinRequest.query.count())

    def test_delete_join_request_with_open_status(self):
        pre_count = JoinRequest.query.count()
        join_request_id = self._join_request_by_user("urn:john").id
        self.login("urn:admin")
        self.delete("/api/join_requests", primary_key=join_request_id, with_basic_auth=False,
                    response_status_code=400)
        self.assertEqual(pre_count, JoinRequest.query.count())

    def test_join_request_auto_provisioning_groups(self):
        join_request_hash = self._join_request_by_user("urn:james").hash
        self.login("urn:john")
        self.put("/api/join_requests/accept", body={"hash": join_request_hash})
        coll = self.find_entity_by_name(Collaboration, co_research_name)
        is_james_member = [m.user for m in coll.groups[0].collaboration_memberships if m.user.uid == "urn:james"]
        self.assertTrue(is_james_member)
