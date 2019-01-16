from flask import g as request_context
from munch import munchify

from server.db.db import Collaboration
from server.db.models import transform_json, add_audit_trail_data
from server.test.abstract_test import AbstractTest


class TestModels(AbstractTest):

    def test_nested_audit_trail(self):
        collaboration_json = {'name': 'new_collaboration', 'organisation_id': 315,
                              'collaboration_memberships': [{'role': 'admin', 'user_id': 616}]}
        with self.app.test_client():
            request_context.api_user = munchify({"name": "system"})

            cls = Collaboration
            add_audit_trail_data(cls, collaboration_json)
            json_dict = transform_json(collaboration_json)
            collaboration = cls(**json_dict)
            self.assertEqual(collaboration.collaboration_memberships[0].created_by, "system")
