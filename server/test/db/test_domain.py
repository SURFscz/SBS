# -*- coding: future_fstrings -*-

from server.db.domain import Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name


class TestModels(AbstractTest):

    def test_collaboration(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(False, collaboration.is_admin(999))
