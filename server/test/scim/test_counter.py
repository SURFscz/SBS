# -*- coding: future_fstrings -*-
import json

import responses

from server.db.domain import User, Collaboration, Service
from server.scim.counter import atomic_increment_counter_value
from server.scim.scim import apply_user_change, apply_group_change
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, uva_research_name, service_cloud_name
from server.tools import read_file


class TestCounter(AbstractTest):

    def test_counter(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        value = atomic_increment_counter_value(cloud)
        self.assertEqual(1, value)

        value = atomic_increment_counter_value(cloud)
        self.assertEqual(2, value)
