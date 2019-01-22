from flask.json import jsonify

from server.db.db import Collaboration, CollaborationMembership
from server.test.abstract_test import AbstractTest


class TestDynamicExtendedJSONEncoder(AbstractTest):

    def test_encoding_circular_reference(self):
        collaboration = Collaboration(name="collaboration")
        member = CollaborationMembership(role="admin", collaboration=collaboration)
        collaboration.collaboration_memberships = [member]
        res = jsonify(collaboration)
        membership = res.json["collaboration_memberships"][0]
        self.assertTrue("collaboration" not in membership)
        self.assertEqual("admin", membership["role"])
