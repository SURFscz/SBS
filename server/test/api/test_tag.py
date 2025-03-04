from server.db.domain import Organisation, Tag, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name, co_ai_computing_name, unifra_name


class TestTag(AbstractTest):

    def test_tags(self):
        organisation = self.find_entity_by_name(Organisation, unihard_name)

        self.login("urn:harry")
        tags = self.get("/api/tags", query_data={"organisation_id": organisation.id}, with_basic_auth=False)
        self.assertEqual(3, len(tags))

    def test_tags_not_allowed(self):
        organisation = self.find_entity_by_name(Organisation, unihard_name)

        self.login("urn:sarah")
        self.get("/api/tags", query_data={"organisation_id": organisation.id}, with_basic_auth=False,
                 response_status_code=403)

    def test_orphan_tags(self):
        self.login("urn:john")
        tags = self.get("/api/tags/orphans", with_basic_auth=False)
        self.assertEqual(1, len(tags))
        self.assertEqual("tag_orphan", tags[0]["tag_value"])

    def test_delete_tag(self):
        self.login("urn:john")
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").one()
        self.delete(f"/api/tags/{tag.collaborations[0].organisation_id}/{tag.id}")
        self.assertEqual(3, Tag.query.count())
        self.assertEqual(0, len(self.find_entity_by_name(Collaboration, co_ai_computing_name).tags))

    def test_delete_tag_forbidden(self):
        self.login("urn:john")
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").one()
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.delete(f"/api/tags/{organisation.id}/{tag.id}", response_status_code=403)

    def test_all_tags(self):
        self.login("urn:john")
        tags = self.get("/api/tags/all", with_basic_auth=False)
        self.assertEqual(4, len(tags))

    def test_usages(self):
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").one()
        self.login("urn:mary")
        res = self.get(f"/api/tags/usages/{organisation.id}/{tag.id}", with_basic_auth=False)

        self.assertListEqual([co_ai_computing_name], res["collaborations"])
