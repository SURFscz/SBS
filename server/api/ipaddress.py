# -*- coding: future_fstrings -*-

import ipaddress

from flask import Blueprint

from server.api.base import json_endpoint, query_param

ipaddress_api = Blueprint("ipaddress_api", __name__, url_prefix="/api/ipaddress")

max_allowed_ipv4_sub_mask = 24
max_allowed_ipv6_prefix = 64


def validate_ip_networks(data):
    ip_networks = data.get("ip_networks", None)
    if ip_networks:
        for ip_network in ip_networks:
            ipaddress.ip_network(ip_network["network_value"], False)


@ipaddress_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    address = query_param("address")
    id = query_param("id", required=False)

    try:
        ip_network = ipaddress.ip_network(address, False)
    except ValueError:
        return {
                   "error": True,
                   "network_value": address,
                   "syntax": True,
                   "id": id
               }, 200

    _is4 = ip_network.version == 4
    prefix = ip_network.prefixlen
    if (_is4 and prefix < max_allowed_ipv4_sub_mask) or (not _is4 and prefix < max_allowed_ipv6_prefix):
        return {
                   "error": True,
                   "version": ip_network.version,
                   "max": max_allowed_ipv4_sub_mask if _is4 else max_allowed_ipv6_prefix,
                   "network_value": address,
                   "prefix": prefix,
                   "id": id
               }, 200

    return {
               "version": ip_network.version,
               "num_addresses": ip_network.num_addresses,
               "network_value": str(ip_network),
               "lower": str(ip_network[0]),
               "higher": str(ip_network[-1]),
               "id": id
           }, 200
