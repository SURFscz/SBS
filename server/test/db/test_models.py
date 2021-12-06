# -*- coding: future_fstrings -*-
import datetime

from flask import g as request_context
from munch import munchify

from server.db.domain import Collaboration
from server.db.models import transform_json, add_audit_trail_data, parse_date_fields
from server.test.abstract_test import AbstractTest


class TestModels(AbstractTest):

    def test_nested_audit_trail(self):
        collaboration_json = {"name": "new_collaboration", "organisation_id": 315,
                              "bogus": "will_be_removed",
                              "collaboration_memberships": [{"role": "admin", "user_id": 616}]}
        with self.app.test_client():
            request_context.api_user = munchify({"name": "system"})

            cls = Collaboration
            add_audit_trail_data(cls, collaboration_json)
            json_dict = transform_json(cls, collaboration_json)
            collaboration = cls(**json_dict)
            self.assertEqual(collaboration.collaboration_memberships[0].created_by, "system")

    def test_validation_error(self):
        self.post("/api/services", body={"abbreviation": "abb"}, response_status_code=400)

    def test_parse_date_fields(self):
        json_dict = {"updated_at": 1549367857 * 1000}
        parse_date_fields(json_dict)
        self.assertTrue(isinstance(json_dict["updated_at"], datetime.datetime))

    def test_update_not_found(self):
        self.login("urn:john")
        self.put("/api/services", body={"id": -1, "entity_id": "some", "name": "some", "abbreviation": "abbreviation"},
                 response_status_code=404)
