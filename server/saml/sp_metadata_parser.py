import string
import xml.etree.ElementTree as ET
from io import BytesIO

import requests


def parse_metadata_xml(xml: string):
    return _do_parse(BytesIO(xml.encode("UTF-8")), xml)


def parse_metadata_url(metadata_url):
    raw_xml = requests.get(metadata_url).text
    return _do_parse(BytesIO(raw_xml.encode("UTF-8")), raw_xml)


def _do_parse(xml: BytesIO, raw_xml: str):
    result = {}
    acs_locations = []
    for event, element in ET.iterparse(xml, events=("start", "end")):
        if "}" in element.tag:
            element.tag = element.tag.split("}", 1)[1]
        if event == "start" and element.tag == "EntityDescriptor":
            stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
            result["entity_id"] = {**stripped_attribs, **element.attrib}.get("entityID")

        elif event == "start" and element.tag == "AssertionConsumerService":
            stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
            attrib_ = {**stripped_attribs, **element.attrib}
            acs_locations.append({
                "location": attrib_.get("Location"),
                "binding": attrib_.get("Binding")
            })

        elif event == "end" and element.tag == "OrganizationName":
            stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
            lang = {**stripped_attribs, **element.attrib}.get("lang")
            if lang == "en":
                result["organization_name"] = element.text
    result["acs_locations"] = acs_locations
    result["xml"] = raw_xml
    return result
