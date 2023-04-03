
import logging
import time
import xml.etree.ElementTree as ET
from urllib import request

from flask import current_app

idp_metadata = None


def parse_idp_metadata(app):
    logger = logging.getLogger("scheduler")
    start = int(time.time() * 1000.0)
    logger.info("Start running parse_idp_metadata job")

    metadata = app.app_config.metadata
    pre = request.urlopen(metadata.idp_url)
    results = {}
    display_name_nl = display_name_en = None
    scopes = []
    for event, element in ET.iterparse(pre, events=("start", "end")):
        if "}" in element.tag:
            element.tag = element.tag.split("}", 1)[1]
        if event == "start" and element.tag == "Scope":
            scope = element.text
            if scope is not None and len(scope.strip()) > 0:
                scopes.append(scope)

        elif event == "start" and element.tag == "DisplayName":
            stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
            # better safe then sorry - namespaces can change
            lang = {**stripped_attribs, **element.attrib}.get("lang", "en")
            if lang == "nl":
                display_name_nl = element.text
            elif lang == "en":
                display_name_en = element.text

        elif event == "end" and element.tag == "EntityDescriptor" and (display_name_nl or display_name_en):
            for scope in scopes:
                results[scope] = {"nl": display_name_nl or display_name_en,
                                  "en": display_name_en or display_name_nl}
            display_name_nl = display_name_en = None
            scopes = []

    end = int(time.time() * 1000.0)
    logger.info(f"Finished running parse_idp_metadata job in {end - start} ms")

    global idp_metadata
    idp_metadata = results


def idp_display_name(schac_home_organization, lang="en", use_default=True):
    if not idp_metadata:
        parse_idp_metadata(current_app)
    names = idp_metadata.get(schac_home_organization, {"en": schac_home_organization if use_default else None})
    return names.get(lang, names["en"])
