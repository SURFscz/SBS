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
    display_name_nl = display_name_en = entity_id = None
    for event, element in ET.iterparse(pre, events=("start", "end")):
        if "}" in element.tag:
            element.tag = element.tag.split('}', 1)[1]
        if event == "start" and element.tag == "EntityDescriptor":
            entity_id = element.get("entityID")
        if event == "start" and element.tag == "DisplayName":
            lang = element.attrib.get('{http://www.w3.org/XML/1998/namespace}lang')
            if lang == "nl":
                display_name_nl = element.text
            elif lang == "en":
                display_name_en = element.text

        if event == "end" and element.tag == "EntityDescriptor" and (display_name_nl or display_name_en):
            results[entity_id] = {"nl": display_name_nl if display_name_nl else display_name_en,
                                  "en": display_name_en if display_name_en else display_name_nl}
            display_name_nl = display_name_en = entity_id = None

    idp_metadata = results


def idp_display_name(entity_id, lang="en"):
    if not idp_metadata:
        parse_idp_metadata(current_app)
    names = idp_metadata.get(entity_id, {"en": entity_id})
    return names[lang] if lang in names else names["en"]
