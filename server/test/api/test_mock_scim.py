import os

from server.api.base import application_base_url
from server.api.mock_scim import HTTP_CALLS_KEY, DATABASE_KEY
from server.db.domain import User, Collaboration, Group, Service
from server.scim import EXTERNAL_ID_POST_FIX
from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed
from server.scim.schema_template import get_scim_schema_sram_group
from server.scim.group_template import create_group_template, scim_member_object, update_group_template
from server.scim.user_template import create_user_template
from server.test.abstract_test import AbstractTest
from server.test.seed import (user_sarah_name, co_ai_computing_name, service_cloud_name,
                               co_research_name, co_research_uuid,
                               group_science_name, group_science_identifier)
from flask import current_app


class TestMockScim(AbstractTest):

    # Very lengthy flow test, but we need the ordering right
    def test_mock_scim_flow(self):
        self.delete("/api/scim_mock/clear")

        current_app.redis_client.set(HTTP_CALLS_KEY, "")
        current_app.redis_client.set(DATABASE_KEY, "")

        cloud_service_id = self.find_entity_by_name(Service, service_cloud_name).id
        self.put(f"/api/services/reset_scim_bearer_token/{cloud_service_id}",
                 {"scim_bearer_token": "secret"})

        headers = {"X-Service": str(cloud_service_id), "Authorization": "bearer secret"}
        sarah = self.find_entity_by_name(User, user_sarah_name)

        body = create_user_template(sarah)
        # Create a user
        res = self.post("/api/scim_mock/Users",
                        body=body,
                        headers=headers,
                        with_basic_auth=False)
        scim_id_user = res["id"]
        self.assertIsNotNone(scim_id_user)

        sarah = self.find_entity_by_name(User, user_sarah_name)
        sarah.email = "changed@example.com"
        body = create_user_template(sarah)
        # Update a user
        res = self.put(f"/api/scim_mock/Users/{scim_id_user}",
                       body=body,
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_user, res["id"])

        # Update a non-existent user, bad request
        self.put("/api/scim_mock/Users/nope",
                 body=body,
                 headers=headers,
                 with_basic_auth=False,
                 response_status_code=400)

        # Find by externalId
        sarah = self.find_entity_by_name(User, user_sarah_name)
        res = self.get("/api/scim_mock/Users",
                       query_data={"filter": f"externalId eq \"{sarah.external_id}{EXTERNAL_ID_POST_FIX}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_user, res["Resources"][0]["id"])
        sarah = self.find_entity_by_name(User, user_sarah_name)
        self.assertEqual(sarah.email, res["Resources"][0]["emails"][0]["value"])

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration_membership = collaboration.collaboration_memberships[0]
        member_object = scim_member_object(application_base_url(), collaboration_membership,
                                           scim_object={"id": scim_id_user})
        body = create_group_template(collaboration, [member_object])
        # Create Group with one member
        res = self.post("/api/scim_mock/Groups",
                        body=body,
                        headers=headers,
                        with_basic_auth=False)
        scim_id_group = res["id"]
        self.assertIsNotNone(scim_id_group)

        # Update the group
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration.global_urn = "Changed"
        body = update_group_template(collaboration, [member_object], scim_id_group)
        res = self.put(f"/api/scim_mock/Groups/{scim_id_group}",
                       body=body,
                       headers=headers,
                       with_basic_auth=False)
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(collaboration.global_urn, res[get_scim_schema_sram_group()]["urn"])
        self.assertEqual(scim_id_user, res["members"][0]["value"])

        # Find the group by externalId
        res = self.get("/api/scim_mock/Groups",
                       query_data={"filter": f"externalId eq \"{collaboration.identifier}{EXTERNAL_ID_POST_FIX}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_group, res["Resources"][0]["id"])
        # Find all groups
        res = self.get("/api/scim_mock/Groups",
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_group, res["Resources"][0]["id"])

        # Need to be super admin
        self.login("urn:john")

        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)
        print("debugging wonkey test")
        print(cloud_service_id)
        print(res)
        self.assertEqual(1, len(res["database"][str(cloud_service_id)]["users"]))
        self.assertEqual(1, len(res["database"][str(cloud_service_id)]["groups"]))
        self.assertEqual(8, len(res["http_calls"][str(cloud_service_id)]))

        self.delete("/api/scim_mock/Users", primary_key=scim_id_user, with_basic_auth=False, headers=headers)
        self.delete("/api/scim_mock/Groups", primary_key=scim_id_group, with_basic_auth=False, headers=headers)

        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)

        self.assertEqual(0, len(res["database"][str(cloud_service_id)]["users"]))
        self.assertEqual(0, len(res["database"][str(cloud_service_id)]["groups"]))
        self.assertEqual(10, len(res["http_calls"][str(cloud_service_id)]))

        # Now reset everything
        self.delete("/api/scim_mock/clear", with_basic_auth=False)
        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)
        self.assertEqual(0, len(res["database"]))

    def test_mock_scim_authorization(self):
        cloud_service_id = self.find_entity_by_name(Service, service_cloud_name).id
        self.put(f"/api/services/reset_scim_bearer_token/{cloud_service_id}",
                 {"scim_bearer_token": "secret"})

        self.post("/api/scim_mock/Users",
                  body={},
                  headers={"X-Service": str(cloud_service_id)},
                  with_basic_auth=False,
                  response_status_code=401)

        self.post("/api/scim_mock/Users",
                  body={},
                  headers={"X-Service": str(cloud_service_id), "Authorization": "bearer nope"},
                  with_basic_auth=False,
                  response_status_code=401)


class TestScimFifoOrdering(AbstractTest):
    """
    Verify that when broadcast_collaboration_changed and broadcast_group_changed are submitted
    to the async executor, the SCIM calls for the parent Collaboration arrive at the remote
    SCIM endpoint BEFORE the SCIM calls for its child Group (FIFO ordering).

    This relies on EXECUTOR_MAX_WORKERS=1 (set in __main__.py) so the single-worker queue
    preserves submission order end-to-end.  If max_workers > 1 this test will be flaky
    because the tasks can execute and deliver HTTP calls out of order.
    """

    @classmethod
    def setUpClass(cls):
        super(TestScimFifoOrdering, cls).setUpClass()
        # SCIM is disabled by default in the test environment; enable it for this suite.
        os.environ.pop("SCIM_DISABLED", None)

    @classmethod
    def tearDownClass(cls):
        super(TestScimFifoOrdering, cls).tearDownClass()
        os.environ["SCIM_DISABLED"] = "1"

    def setUp(self):
        super(TestScimFifoOrdering, self).setUp()
        self.add_bearer_token_to_services()

    def test_collaboration_scim_before_group_scim(self):
        # Reset the mock SCIM call log so we start with a clean slate.
        self.delete("/api/scim_mock/clear")
        current_app.redis_client.set(HTTP_CALLS_KEY, "{}")
        current_app.redis_client.set(DATABASE_KEY, "{}")

        # ufra_research (co_research_name) is connected to the Cloud (scim-enabled) service
        # and has group_science as a child group.
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        group = self.find_entity_by_name(Group, group_science_name)

        # Submit N interleaved (collab, group) pairs.
        #
        # Why multiple pairs instead of one?
        # A single pair could accidentally pass without the fix: if the longer C task happened
        # to complete before the shorter G task by chance, the ordering looks correct whether
        # or not EXECUTOR_MAX_WORKERS=1.  With N pairs the probability of ALL N G tasks
        # accidentally finishing after their paired C tasks is (1/2)^N — negligible at N=5.
        # Each G task (apply_group_change) does far fewer HTTP calls than each C task
        # (apply_collaboration_change), so without the fix G tasks reliably outrace C tasks.
        N = 5
        futures = []
        for _ in range(N):
            futures.append(broadcast_collaboration_changed(collaboration.id))
            futures.append(broadcast_group_changed(group.id))

        # Wait for all N*2 tasks before inspecting the recorded call log.
        for f in futures:
            f.result()

        self.login("urn:john")  # /api/scim_mock/statistics requires admin access
        stats = self.get("/api/scim_mock/statistics", with_basic_auth=False)

        cloud_service_id = str(self.find_entity_by_name(Service, service_cloud_name).id)
        http_calls = stats["http_calls"].get(cloud_service_id, [])

        self.assertGreater(len(http_calls), 0, "No SCIM calls were recorded — check scim_url and bearer token")

        # co_research_uuid  → appears ONLY in C tasks (collaboration processed last within each C task)
        # group_science_identifier → appears in BOTH C tasks (child group) and standalone G tasks
        collab_ext_id = f"{co_research_uuid}{EXTERNAL_ID_POST_FIX}"
        group_ext_id = f"{group_science_identifier}{EXTERNAL_ID_POST_FIX}"

        def all_call_indices(ext_id):
            return [i for i, call in enumerate(http_calls)
                    if ext_id in call.get("args", {}).get("filter", "")
                    or ext_id in call.get("body", "")]

        collab_indices = all_call_indices(collab_ext_id)
        group_indices = all_call_indices(group_ext_id)

        self.assertEqual(len(collab_indices), N * 2,
                         f"Expected exactly {N * 2} co_research_uuid calls "
                         f"({N} GET lookups + {N} POST/PUT provisions, one pair per C task), "
                         f"got {len(collab_indices)}")
        self.assertGreater(len(group_indices), 0,
                           f"No SCIM call found for group externalId {group_ext_id}")

        # FIFO invariant (why max() works across N pairs):
        #
        # With a single worker (EXECUTOR_MAX_WORKERS=1), tasks execute in submission order:
        #   C1 → G1 → C2 → G2 → ... → CN → GN
        #
        # apply_collaboration_change (C task) processes child groups FIRST, then the
        # collaboration itself — so co_research_uuid calls appear at the END of each C block.
        # apply_group_change (G task) only produces group_science calls.
        #
        # With FIFO:
        #   max(collab_indices) = last co_res call = very end of C_N
        #   max(group_indices)  = last group_sci call = very end of G_N (runs after C_N)
        #   → max(collab_indices) < max(group_indices)  ✓
        #
        # Without FIFO (multiple workers, G tasks shorter so they finish first):
        #   G_N finishes before C_N in the background
        #   → max(group_indices) < max(collab_indices)  ✗
        #
        # Across N=5 pairs this is near-certain to manifest even if one pair accidentally
        # passes in the correct order by chance.
        last_collab_call = max(collab_indices)
        last_group_call = max(group_indices)

        call_log = [(i, c["method"], c["path"]) for i, c in enumerate(http_calls)]
        self.assertLess(
            last_collab_call, last_group_call,
            f"FIFO ordering violated after {N} pairs: "
            f"last collaboration call at position {last_collab_call}, "
            f"last group call at position {last_group_call} — "
            f"a group task completed after its paired collaboration task.\n"
            f"Full call sequence: {call_log}"
        )
