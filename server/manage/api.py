import logging

import requests
from requests import RequestException
from requests.auth import HTTPBasicAuth

from server.db.db import db
from server.db.domain import Service
from server.manage.service_template import create_service_template
from server.tools import dt_now


def _parse_manage_config(manage_conf):
    base_url = manage_conf.base_url[:-1] if manage_conf.base_url.endswith("/") else manage_conf.base_url
    return base_url, HTTPBasicAuth(manage_conf.user, manage_conf.password)


def service_applies_for_external_sync(service: Service):
    if service.saml_enabled and not service.saml_metadata and not service.saml_metadata_url:
        return False
    if service.oidc_enabled and (not service.grants or not service.redirect_urls):
        return False
    if not service.saml_enabled and not service.oidc_enabled:
        return False
    return True


def save_service(app, service: Service):
    _do_save_or_update(app, service)


def update_service(app, service: Service):
    _do_save_or_update(app, service)


def delete_service(app, service_export_external_identifier: str):
    with app.app_context():
        manage_base_url, manage_basic_auth = _parse_manage_config(app.app_config.manage)
        url = f"{manage_base_url}/manage/api/internal/metadata/sram/${service_export_external_identifier}"
        requests.delete(url, auth=manage_basic_auth, timeout=10)


def _do_save_or_update(app, service: Service):
    if not service_applies_for_external_sync(service):
        return

    with app.app_context():
        manage_base_url, manage_basic_auth = _parse_manage_config(app.app_config.manage)

        service_template = create_service_template(service)
        request_method = requests.put if service.export_external_identifier else requests.post
        url = f"{manage_base_url}/manage/api/internal/metadata"
        service.exported_at = dt_now()
        try:
            res = request_method(url, json=service_template,
                                 headers={"Accept": "application/json", "Content-Type": "application/son"},
                                 auth=manage_basic_auth,
                                 timeout=10)
            service_json = res.json()
            service.export_external_identifier = service_json.get("id")
            # Manage applies optimistic locking, soo we store the new version number
            service.export_external_version = service_json.get("version")
            service.export_successful = True
        except RequestException:
            logger = logging.getLogger("manage")
            logger.error("Error in manage API", exc_info=1)
            service.export_successful = False

        db.session.merge(service)
        db.session.commit()
