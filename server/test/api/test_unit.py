from server.db.domain import Organisation, Unit
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name, unihard_unit_support_name, ai_computing_name


class TestUnit(AbstractTest):

    def test_usages(self):
        uuc = self.find_entity_by_name(Organisation, unihard_name)
        uuc_unit_support = self.find_entity_by_name(Unit, unihard_unit_support_name)
        self.login("urn:mary")
        res = self.get(f"/api/units/usages/{uuc.id}/{uuc_unit_support.id}", with_basic_auth=False)

        self.assertListEqual([ai_computing_name], res["collaborations"])
        self.assertEqual(0, len(res["collaboration_requests"]))
        self.assertEqual(0, len(res["invitations"]))
        self.assertListEqual([f"Harry Doe - {unihard_name}"], res["organisation_memberships"])
