from server.db.db import db
from server.db.defaults import (generate_short_name)
from server.db.domain import Service
from server.test.abstract_test import AbstractTest


# Only add tests here that interact with the database and rely on AbstractTest.app
class TestDefaults(AbstractTest):

    def test_generate_short_name_fallback(self):
        # first generate service with abbreviation entity1..entity999
        db.session.merge(Service(entity_id="entity", name="entity", created_by="test", updated_by="test",
                                 abbreviation="entity"))
        for i in range(1, 1000):
            db.session.merge(Service(entity_id=f"entity{i}", name=f"entity{i}", created_by="test", updated_by="test",
                                     abbreviation=f"entity{i}"))
        db.session.commit()

        # adding a new entity should now result in a random abbreviation
        abbr = generate_short_name(Service, "entity", "abbreviation")
        # we expect a random string of 16 characters
        self.assertNotIn("entity", abbr)
        self.assertEqual(16, len(abbr))
