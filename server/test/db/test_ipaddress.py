from ipaddress import IPv4Network, IPv6Network
from unittest import TestCase

from server.db.ipaddress import validate_ipv4, validate_ipv6


class TestIPAddress(TestCase):

    def test_valid_ipv4(self):
        self.assertFalse(validate_ipv4(IPv4Network("255.255.255.255/32")))
        self.assertTrue(validate_ipv4(IPv4Network("82.217.86.55")))

    def test_valid_ipv6(self):
        self.assertFalse(validate_ipv6(IPv6Network("fe80::/10")))
        self.assertTrue(validate_ipv6(IPv6Network("2001:1c02:2b16:f300:e495:1ae5:f8ea:943b")))
