import logging

import requests
from requests import RequestException
from requests.auth import HTTPBasicAuth

from server.db.db import db
from server.db.domain import Service
from server.manage.service_template import create_service_template
from server.tools import dt_now

default_idp_matrix = {
    "data": {
        "allowedall": True,
        "allowedEntities": []
    }
}


def _parse_manage_config(manage_conf):
    base_url = manage_conf.base_url[:-1] if manage_conf.base_url.endswith("/") else manage_conf.base_url
    return base_url, HTTPBasicAuth(manage_conf.user, manage_conf.password), manage_conf.verify_peer


def service_applies_for_external_sync(service: Service):
    if service.saml_enabled and not service.saml_metadata and not service.saml_metadata_url:
        return False
    if service.oidc_enabled and (not service.grants or not service.redirect_urls):
        return False
    if not service.saml_enabled and not service.oidc_enabled:
        return False
    return True


def sync_external_service(app, service: Service):
    if not app.app_config.manage.enabled or not service_applies_for_external_sync(service):
        return None
    with app.app_context():
        logger = logging.getLogger("manage")

        manage_base_url, manage_basic_auth, verify_peer = _parse_manage_config(app.app_config.manage)
        # We need the SRAM RP to copy the IdPs that are connected to the main SRAM/SBS instance
        fetch_url = f"{manage_base_url}/manage/api/internal/search/oidc10_rp"
        try:
            entity_id = app.app_config.manage.sram_rp_entity_id
            res = requests.post(fetch_url,
                                json={"ALL_ATTRIBUTES": True, "entityid": entity_id},
                                headers={"Accept": "application/json", "Content-Type": "application/json"},
                                auth=manage_basic_auth,
                                verify=verify_peer,
                                timeout=10)
            sbs_rp_json_results = res.json()
            sbs_rp_json = sbs_rp_json_results[0] if sbs_rp_json_results else default_idp_matrix
        except RequestException:
            logger.error(f"Error in manage API retrieving {entity_id}", exc_info=1)
            sbs_rp_json = default_idp_matrix

        service_template = create_service_template(service, sbs_rp_json)
        request_method = requests.put if service.export_external_identifier else requests.post
        url = f"{manage_base_url}/manage/api/internal/metadata"
        service.exported_at = dt_now()
        try:
            res = request_method(url,
                                 json=service_template,
                                 headers={"Accept": "application/json", "Content-Type": "application/json"},
                                 auth=manage_basic_auth,
                                 verify=verify_peer,
                                 timeout=10)
            service_json = res.json()
            if str(res.status_code).startswith("2"):
                service.export_external_identifier = service_json.get("id")
                # Manage applies optimistic locking, soo we store the new version number
                service.export_external_version = service_json.get("version")
                service.export_successful = True
                logger.debug(f"Saved service {service.name} to {url}")
            else:
                service.export_successful = "No data is changed" in service_json.get("validations", "")
                if not service.export_successful:
                    logger.error(f"Error in manage API {service_json}")
        except RequestException:
            logger.error("Error in manage API", exc_info=1)
            service.export_successful = False

        db.session.merge(service)
        db.session.commit()
        return service


def delete_external_service(app, service_export_external_identifier: str):
    if not app.app_config.manage.enabled or not service_export_external_identifier:
        return None
    with app.app_context():
        manage_base_url, manage_basic_auth, verify_peer = _parse_manage_config(app.app_config.manage)
        url = f"{manage_base_url}/manage/api/internal/metadata/sram/{service_export_external_identifier}"
        logger = logging.getLogger("manage")
        try:
            res = requests.delete(url, auth=manage_basic_auth, timeout=10, verify=verify_peer)
            if str(res.status_code).startswith("2"):
                logger.debug(f"Deleted service {service_export_external_identifier} to {url}")
            else:
                logger.error(f"Error in manage API {res.status_code} for delete {service_export_external_identifier}."
                             f"Response {res.json()}")
            return res.status_code
        except RequestException:
            logger.error("Error in manage API", exc_info=1)
            return 500
