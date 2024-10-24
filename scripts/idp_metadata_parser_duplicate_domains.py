import json
import logging
import os.path
import re
import time
import xml.etree.ElementTree as ET
from urllib import request

from flask import current_app

from server.cron.shared import obtain_lock

from server.test.abstract_test import AbstractTest


metadata_url = "https://metadata.surfconext.nl/signed/2023/edugain-downstream-idp.xml"

pre = request.urlopen(metadata_url)
scopes = []
scopes_per_entity_id = []
duplicates_scopes = {}
current_entity_id = None
for event, element in ET.iterparse(pre, events=("start", "end")):
    if "}" in element.tag:
        element.tag = element.tag.split("}", 1)[1]
    if event == "start" and element.tag == "EntityDescriptor":
        stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
        # better safe than sorry - namespaces can change
        current_entity_id = {**stripped_attribs, **element.attrib}.get("entityID")
    elif event == "start" and element.tag == "Scope":
        scope = element.text
        if scope is not None and len(scope.strip()) > 0:
            scope_strip = scope.strip()
            if scope_strip in scopes:
                entity_identifiers = [e[1] for e in scopes_per_entity_id if e[0] == scope_strip]
                if current_entity_id not in entity_identifiers:
                    entities = duplicates_scopes.get(scope_strip, set())
                    entities.add(current_entity_id)
                    entities.update(entity_identifiers)
                    duplicates_scopes[scope_strip] = entities
            scopes.append(scope_strip)
            scopes_per_entity_id.append((scope_strip, current_entity_id))

# Print duplicates
for k,v in duplicates_scopes.items():
    print(k + ": "+ str(v))