from werkzeug.exceptions import BadRequest

from server.db.domain import Service


def _replace_none_values(d: dict):
    for k, v in d.items():
        if isinstance(v, dict):
            _replace_none_values(v)
        elif not v:
            del d[k]
    return d


def create_service_template(service: Service):
    if service.saml_enabled and not service.saml_metadata:
        raise BadRequest()
    assertion_consumer_service = "https://trusted.proxy.acs.location.rules"

    service_template = {
        "id": service.export_external_identifier,
        "version": service.export_external_version,
        "type": "sram",
        "data": {
            "entityid": service.entity_id,
            "state": "prodaccepted",
            "allowedall": True,
            "allowedEntities": [],
            "arp": {
                "enabled": False,
                "attributes": {}
            },
            "metaDataFields": {
                "name:en": service.name,
                "OrganizationName:en": service.providing_organisation,
                "AssertionConsumerService:0:Binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
                "AssertionConsumerService:0:Location": assertion_consumer_service,
                "NameIDFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
                "coin:signature_method": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
                "connection_type": "oidc_rp" if service.oidc_enabled else "saml_sp",
                "secret": service.oidc_client_secret,
                "redirectUrls": service.redirect_urls.split(",") if service.redirect_urls else [],
                "grants": service.grants.split(",") if service.grants else []
            }
        }
    }
    return _replace_none_values(service_template)
