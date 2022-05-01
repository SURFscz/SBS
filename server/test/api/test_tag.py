# -*- coding: future_fstrings -*-
from server.db.domain import Organisation, Tag, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name, ai_computing_name, amsterdam_uva_name


class TestTag(AbstractTest):

    def test_tags(self):
        organisation = self.find_entity_by_name(Organisation, uuc_name)

        self.login("urn:harry")
        tags = self.get("/api/tags", query_data={"organisation_id": organisation.id}, with_basic_auth=False)
        self.assertEqual(1, len(tags))
        self.assertEqual("tag_uuc", tags[0]["tag_value"])

    def test_tags_not_allowed(self):
        organisation = self.find_entity_by_name(Organisation, uuc_name)

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
        self.assertEqual(2, Tag.query.count())
        self.assertEqual(0, len(self.find_entity_by_name(Collaboration, ai_computing_name).tags))

    def test_delete_tag_forbidden(self):
        self.login("urn:john")
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").one()
        organisation = self.find_entity_by_name(Organisation, amsterdam_uva_name)
        self.delete(f"/api/tags/{organisation.id}/{tag.id}", response_status_code=403)

    def test_all_tags(self):
        self.login("urn:john")
        tags = self.get("/api/tags/all", with_basic_auth=False)
        self.assertEqual(3, len(tags))
