# -*- coding: future_fstrings -*-
import xml.etree.ElementTree as ET
from urllib import request

from flask import current_app

idp_metadata = None


def parse_idp_metadata(app):
    global idp_metadata
    metadata = app.app_config.metadata
    pre = request.urlopen(metadata.idp_url)
    results = {}
    display_name_nl = display_name_en = None
    scopes = []
    for event, element in ET.iterparse(pre, events=("start", "end")):
        if "}" in element.tag:
            element.tag = element.tag.split("}", 1)[1]
        if event == "start" and element.tag == "Scope":
            scopes.append(element.text)

        elif event == "start" and element.tag == "DisplayName":
            lang = element.attrib.get('{http://www.w3.org/XML/1998/namespace}lang')
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

    idp_metadata = results


def idp_display_name(schac_home_organization, lang="en"):
    if not idp_metadata:
        parse_idp_metadata(current_app)
    names = idp_metadata.get(schac_home_organization, {"en": schac_home_organization})
    return names[lang] if lang in names else names["en"]
