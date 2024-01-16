import uuid

from server.db.domain import Group
from server.scim.group_template import find_group_by_id_template
from server.test.abstract_test import AbstractTest
from server.tools import dt_now


class TestGroupTemplate(AbstractTest):

    def test_find_group_by_id_template(self):
        now = dt_now()
        group = Group(identifier=uuid.uuid4(), created_at=now, updated_at=now)
        result = find_group_by_id_template(group)

        self.assertListEqual([], result["members"])
