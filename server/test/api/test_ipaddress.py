# -*- coding: future_fstrings -*-
from server.test.abstract_test import AbstractTest


class TestIpaddress(AbstractTest):

    def test_info_ipv4(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "198.51.100.12"})

        self.assertEqual(res["network_value"], "198.51.100.12/32")
        self.assertEqual(res["num_addresses"], 1)

    def test_info_ipv4_coerce_bits(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "192.0.2.1/24"})

        self.assertEqual(res["network_value"], "192.0.2.0/24")
        self.assertEqual(res["num_addresses"], 256)
        self.assertEqual(res["lower"], "192.0.2.0")
        self.assertEqual(res["higher"], "192.0.2.255")

    def test_max_ipv(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "192.0.2.1/12"})

        self.assertTrue(res["error"])
        self.assertEqual(res["max"], 24)
        self.assertEqual(res["prefix"], 12)

    def test_info_ipv6(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:db8:f00f:bab::/64"})

        self.assertEqual(res["network_value"], "2001:db8:f00f:bab::/64")
        self.assertEqual(res["num_addresses"], 18446744073709551616)

    def test_info_ipv6_coerce_bits(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:db8:f00f:bab::"})

        self.assertEqual(res["network_value"], "2001:db8:f00f:bab::/128")
        self.assertEqual(res["num_addresses"], 1)

    def test_max_ipv6(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:db8:f00f:bab::/32"})

        self.assertTrue(res["error"])
        self.assertEqual(res["max"], 64)

    def test_value_error(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "bogus"})

        self.assertEqual(res["network_value"], "bogus")
        self.assertTrue(res["error"])
        self.assertTrue(res["syntax"])
