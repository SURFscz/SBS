from server.db.domain import Service
from server.manage.arp import arp_attributes

BINDINGS_HTTP_POST = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"


def _add_assertion_consumer_url(s: Service, service_template):
    meta_data_fields = service_template["data"]["metaDataFields"]
    if s.saml_enabled:
        acs_index = 0

        for acs_location in s.acs_locations:
            meta_data_fields[f"AssertionConsumerService:{acs_index}:Binding"] = BINDINGS_HTTP_POST
            meta_data_fields[f"AssertionConsumerService:{acs_index}:Location"] = acs_location
            acs_index += 1
    else:
        acs_location = "https://trusted.proxy.acs.location.rules"
        meta_data_fields["AssertionConsumerService:0:Binding"] = BINDINGS_HTTP_POST
        meta_data_fields["AssertionConsumerService:0:Location"] = acs_location


def _add_contacts(service: Service, service_template):
    contact_index = 0
    contacts = {"administrative": service.contact_email,
                "support": service.support_email,
                "technical": service.security_email}
    for contact_type, email in {k: v for k, v in contacts.items() if v is not None}.items():
        service_template["data"]["metaDataFields"][f"contacts:{contact_index}:contactType"] = contact_type
        service_template["data"]["metaDataFields"][f"contacts:{contact_index}:emailAddress"] = email
        contact_index += 1


# Quick fix, story created https://github.com/SURFscz/SBS/issues/1903
def _providing_organisation(service):
    return service.providing_organisation if service.providing_organisation else "SURFconext"


allowed_bool_false_fields = ["version"]


def _replace_none_values(d: dict):
    for k in list(d.keys()):
        if isinstance(d[k], dict):
            _replace_none_values(d[k])
        elif not d[k] and k not in allowed_bool_false_fields:
            del d[k]
    return d


def create_service_template(service: Service, sbs_rp_json: dict):
    # We need to copy the IdPs that are connected to the main SRAM/SBS instance
    sbs_rp_data = sbs_rp_json["data"]

    service_template = {
        "type": "sram",
        "data": {
            "allowedall": sbs_rp_data["allowedall"],
            "allowedEntities": sbs_rp_data["allowedEntities"],
            "arp": {
                "enabled": True,
                "attributes": arp_attributes()
            },
            "entityid": service.entity_id,
            "state": "prodaccepted",
            "metaDataFields": {
                "coin:application_url": service.uri,
                "coin:privacy:privacy_policy": bool(service.privacy_policy),
                "coin:privacy:privacy_policy_url": service.privacy_policy,
                "coin:signature_method": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
                "coin:collab_enabled": True,
                "connection_type": "oidc_rp" if service.oidc_enabled else "saml_sp",
                "grants": [grant.strip() for grant in service.grants.split(",")] if service.grants else [],
                "isPublicClient": service.is_public_client,
                "logo:0:url": service.logo,
                "logo:0:width": 480,
                "logo:0:height": 348,
                "NameIDFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
                "name:en": service.name,
                "description:en": service.description,
                "OrganizationName:en": _providing_organisation(service),
                "redirectUrls": [u.strip() for u in service.redirect_urls.split(",")] if service.redirect_urls else [],
                "accessTokenValidity": 3600,
                "secret": service.oidc_client_secret_db_value() if not service.is_public_client else None,
                "url:nl": service.uri_info
            }
        }
    }
    if service.oidc_enabled and "refresh_token" in service.grants:
        service_template["data"]["metaDataFields"]["refreshTokenValidity"] = 3600

    _add_contacts(service, service_template)
    _add_assertion_consumer_url(service, service_template)

    if service.export_external_identifier:
        service_template["id"] = service.export_external_identifier
        service_template["version"] = service.export_external_version

    return _replace_none_values(service_template)
