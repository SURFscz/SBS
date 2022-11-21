from server.api.ipaddress import validate_ip_networks
from server.test.abstract_test import AbstractTest


class TestIpaddress(AbstractTest):

    def test_info_ipv4(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "82.217.86.55"})

        self.assertEqual(res["network_value"], "82.217.86.55/32")
        self.assertEqual(res["num_addresses"], 1)

    def test_info_ipv4_coerce_bits(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "82.217.86.55/24"})

        self.assertEqual(res["network_value"], "82.217.86.0/24")
        self.assertEqual(res["num_addresses"], 256)
        self.assertEqual(res["lower"], "82.217.86.0")
        self.assertEqual(res["higher"], "82.217.86.255")

    def test_max_ipv(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "82.217.86.55/12"})

        self.assertTrue(res["error"])
        self.assertEqual(res["max"], 24)
        self.assertEqual(res["prefix"], 12)

    def test_info_ipv6(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:1c02:2b16:f300:e495:1ae5:f8ea:943b/64"})

        self.assertEqual(res["network_value"], "2001:1c02:2b16:f300::/64")
        self.assertEqual(res["num_addresses"], 18446744073709551616)

    def test_info_global_unicast_addresses(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16"})

        self.assertEqual(res["network_value"], "2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16/128")
        self.assertEqual(res["global"], True)

    def test_info_ipv6_coerce_bits(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:1c02:2b16:f300::"})

        self.assertEqual(res["network_value"], "2001:1c02:2b16:f300::/128")
        self.assertEqual(res["num_addresses"], 1)

    def test_max_ipv6(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "2001:1c02:2b16:f300::/32"})

        self.assertTrue(res["error"])
        self.assertEqual(res["max"], 64)

    def test_value_error(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "bogus"})

        self.assertEqual(res["network_value"], "bogus")
        self.assertTrue(res["error"])
        self.assertTrue(res["syntax"])

    def test_reserved_ipv4_info(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "255.255.255.255/32"})

        self.assertTrue(res["error"])
        self.assertTrue(res["reserved"])

    def test_reserved_ipv6_info(self):
        res = self.get("/api/ipaddress/info", query_data={"address": "fe80::/10"})

        self.assertTrue(res["error"])
        self.assertTrue(res["reserved"])

    def test_validate_max_ipv6(self):
        with self.assertRaises(ValueError) as cm:
            validate_ip_networks({"ip_networks": [
                {"network_value": "2001:1c02:2b16:f300::/32"}
            ]})
        self.assertEqual("IP network 2001:1c02::/32 exceeds size", cm.exception.args[0])

    def test_validate_max_ipv4(self):
        with self.assertRaises(ValueError) as cm:
            validate_ip_networks({"ip_networks": [
                {"network_value": "82.217.86.55/12"}
            ]})
        self.assertEqual("IP network 82.208.0.0/12 exceeds size", cm.exception.args[0])

    def test_reserved_ipv4(self):
        with self.assertRaises(ValueError) as cm:
            validate_ip_networks({"ip_networks": [
                {"network_value": "255.255.255.255/32"}
            ]})
        self.assertEqual("IP network 255.255.255.255/32 is reserved", cm.exception.args[0])

    def test_reserved_ipv6(self):
        with self.assertRaises(ValueError) as cm:
            validate_ip_networks({"ip_networks": [
                {"network_value": "fe80::/10"}
            ]})
        self.assertEqual("IP network fe80::/10 is reserved", cm.exception.args[0])
