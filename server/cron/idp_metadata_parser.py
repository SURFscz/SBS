import json
import logging
import os.path
import re
import time
import xml.etree.ElementTree as ET
from urllib import request

from flask import current_app

from server.cron.shared import obtain_lock

idp_metadata = None

idp_metadata_lock_name = "idp_metadata_lock"
idp_metadata_file: str = "/tmp/idp_metadata.json"


def _compile_valid(rx):
    try:
        re.compile(rx)
        return True
    except re.error:
        return False


def _do_parse_idp_metadata(app, write_result_to_file=True):
    logger = logging.getLogger("scheduler")
    global idp_metadata
    if not write_result_to_file and not idp_metadata and os.path.isfile(idp_metadata_file):
        with open(idp_metadata_file) as f:
            idp_metadata = json.loads(f.read())
            logger.info(f"Read idp_metadata from {os.path.realpath(f.name)}")
            return

    with app.app_context():
        start = int(time.time() * 1000.0)
        metadata = app.app_config.metadata

        logger.info(f"Start running parse_idp_metadata job from {metadata.idp_url}")

        pre = request.urlopen(metadata.idp_url)
        results_by_scope = {}
        results_by_reg_exp_scope = {}
        display_name_nl = None
        display_name_en = None
        scopes = []
        reg_exp_scopes = []
        stripped_attribs = {}
        for event, element in ET.iterparse(pre, events=("start", "end")):
            if "}" in element.tag:
                element.tag = element.tag.split("}", 1)[1]
            if event == "start" and element.tag == "EntityDescriptor":
                stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
            elif event == "start" and element.tag == "Scope":
                scope = element.text
                if scope is not None and len(scope.strip()) > 0:
                    regexp = {**stripped_attribs, **element.attrib}.get("regexp", "false")
                    if regexp == "1" or regexp == "true":
                        reg_exp_scopes.append(scope.strip())
                    else:
                        scopes.append(scope.strip())

            elif event == "start" and element.tag == "DisplayName":
                stripped_attribs = {k.split("}", 1)[1]: v for k, v in element.attrib.items() if "}" in k}
                # better safe than sorry - namespaces can change
                lang = {**stripped_attribs, **element.attrib}.get("lang", "en")
                if lang == "nl":
                    display_name_nl = element.text.strip() if element.text else None
                elif lang == "en":
                    display_name_en = element.text.strip() if element.text else None

            elif event == "end" and element.tag == "EntityDescriptor" and (display_name_nl or display_name_en):
                for scope in scopes:
                    if display_name_nl or display_name_en:
                        results_by_scope[scope] = {"nl": display_name_nl or display_name_en,
                                                   "en": display_name_en or display_name_nl}
                for reg_exp_scope in reg_exp_scopes:
                    if (display_name_nl or display_name_en) and _compile_valid(reg_exp_scope):
                        results_by_reg_exp_scope[reg_exp_scope] = {"nl": display_name_nl or display_name_en,
                                                                   "en": display_name_en or display_name_nl}
                display_name_nl = display_name_en = None
                scopes = []
                reg_exp_scopes = []

        end = int(time.time() * 1000.0)
        idp_metadata = {
            "reg_exp_schac_home_organizations": results_by_reg_exp_scope,
            "schac_home_organizations": results_by_scope
        }

        logger.info(f"Finished running parse_idp_metadata job in {end - start} ms")

        with open(idp_metadata_file, "w") as f:
            f.write(json.dumps(idp_metadata))
            logger.info(f"Wrote idp_metadata to {os.path.realpath(f.name)}")

        return idp_metadata


def _reset_idp_meta_data():
    logger = logging.getLogger("scheduler")
    logger.info("Resetting idp_metadata as no lock could be obtained ")
    global idp_metadata
    idp_metadata = None
    return None


def parse_idp_metadata(app):
    return obtain_lock(app,
                       idp_metadata_lock_name,
                       _do_parse_idp_metadata,
                       _reset_idp_meta_data)


def idp_display_name(schac_home, lang="en", use_default=True):
    # First check the override config
    override_name = current_app.app_config.metadata.scope_override.get(schac_home)
    if override_name:
        return override_name

    if not idp_metadata:
        _do_parse_idp_metadata(current_app, False)
    names = idp_metadata["schac_home_organizations"].get(schac_home)
    if not names:
        # Fallback to the regular expressions in the scopes of the metadata feed
        names = next((names for rx, names in idp_metadata["reg_exp_schac_home_organizations"].items() if
                      schac_home and re.compile(rx).match(schac_home)), {"en": schac_home if use_default else None})
    return names.get(lang, names["en"])
