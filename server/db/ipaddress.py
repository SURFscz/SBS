import os
from ipaddress import IPv4Network, IPv6Network

special_ipv4_addresses = []
special_ipv6_addresses = []


def _read_lines(file_name):
    file = f"{os.path.dirname(os.path.realpath(__file__))}/{file_name}"
    with open(file) as f:
        return f.readlines()


def validate_ipv4(ipv4_network: IPv4Network):
    global special_ipv4_addresses
    if not special_ipv4_addresses:
        ipv4_csv_lines = _read_lines("ipaddress/iana-ipv4-special-registry.csv")
        for ipv4_line in ipv4_csv_lines[1:]:
            special_ipv4_addresses.append(IPv4Network(ipv4_line.split(",")[0].strip()))
    return not ipv4_network.is_private and all(not ipa.overlaps(ipv4_network) for ipa in special_ipv4_addresses)


def validate_ipv6(ipv6_network: IPv6Network):
    global special_ipv6_addresses
    if not special_ipv6_addresses:
        ipv6_csv_lines = _read_lines("ipaddress/iana-ipv6-special-registry.csv")
        for ipv6_line in ipv6_csv_lines[1:]:
            special_ipv6_addresses.append(IPv6Network(ipv6_line.split(",")[0].strip()))
    return not ipv6_network.is_private and all(not ipa.overlaps(ipv6_network) for ipa in special_ipv6_addresses)
