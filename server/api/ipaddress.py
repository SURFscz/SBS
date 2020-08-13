# -*- coding: future_fstrings -*-

import ipaddress

from flask import Blueprint

from server.api.base import json_endpoint, query_param

ipaddress_api = Blueprint("ipaddress_api", __name__, url_prefix="/api/ipaddress")

max_allowed_ipv4_sub_mask = 24
max_allowed_ipv6_prefix = 64


@ipaddress_api.route("/info", strict_slashes=False)
@json_endpoint
def info():
    address = query_param("address")
    # Any not valid address will throw ValueException
    ip_network = ipaddress.ip_network(address, False)
    _is4 = ip_network.version == 4

    if "/" in address:
        index = address.index("/")
        prefix = int(address[index + 1:])
        if (_is4 and prefix < max_allowed_ipv4_sub_mask) or (not _is4 and prefix < max_allowed_ipv6_prefix):
            return {
                       "error": True,
                       "version": ip_network.version,
                       "max": max_allowed_ipv4_sub_mask if _is4 else max_allowed_ipv6_prefix
                   }, 200

    return {
               "version": ip_network.version,
               "num_addresses": ip_network.num_addresses,
               "address": str(ip_network),
               "lower": str(ip_network[0]),
               "higher": str(ip_network[-1]),
           }, 200
