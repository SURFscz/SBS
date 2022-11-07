# -*- coding: future_fstrings -*-

from server.db.domain import Service
from server.scim.counter import atomic_increment_counter_value
from server.test.abstract_test import AbstractTest
from server.test.seed import service_cloud_name


class TestCounter(AbstractTest):

    def test_counter(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        value = atomic_increment_counter_value(cloud)
        self.assertEqual(1, value)

        value = atomic_increment_counter_value(cloud)
        self.assertEqual(2, value)
