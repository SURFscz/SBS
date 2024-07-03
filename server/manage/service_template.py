from server.db.domain import Service
from server.manage.arp import arp_attributes
from server.saml.sp_metadata_parser import parse_metadata_xml, parse_metadata_url


def _get_assertion_consumer_url(s: Service):
    assertion_consumer_service = "https://trusted.proxy.acs.location.rules"
    if s.saml_enabled:
        metadata = parse_metadata_xml(s.saml_metadata) if s.saml_metadata else parse_metadata_url(s.saml_metadata_url)
        if not s.saml_metadata:
            # Should not be required, mainly for corner-cases and tests
            s.saml_metadata = metadata["xml"]
        assertion_consumer_service = metadata["result"]["acs_location"]
    return assertion_consumer_service


def _add_contacts(service: Service, service_template):
    contact_index = 0
    contacts = {"administrative": service.contact_email,
                "support": service.support_email,
                "technical": service.security_email}
    for contact_type, email in {k: v for k, v in contacts.items() if v is not None}.items():
        service_template["data"]["metaDataFields"][f"contacts:{contact_index}:contactType"] = contact_type
        service_template["data"]["metaDataFields"][f"contacts:{contact_index}:emailAddress"] = email
        contact_index += 1


def _replace_none_values(d: dict):
    for k in list(d.keys()):
        if isinstance(d[k], dict):
            _replace_none_values(d[k])
        elif not d[k]:
            del d[k]
    return d


def create_service_template(service: Service):
    assertion_consumer_service = _get_assertion_consumer_url(service)

    service_template = {
        "id": service.export_external_identifier,
        "version": service.export_external_version,
        "type": "sram",
        "data": {
            "allowedall": True,
            "allowedEntities": [],
            "arp": {
                "enabled": True,
                "attributes": arp_attributes()
            },
            "description:en": service.description,
            "entityid": service.entity_id,
            "metadataurl": service.saml_metadata_url,
            "state": "prodaccepted",
            "metaDataFields": {
                "AssertionConsumerService:0:Binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
                "AssertionConsumerService:0:Location": assertion_consumer_service,
                "coin:application_url": service.uri,
                "coin:privacy:privacy_policy": bool(service.privacy_policy),
                "coin:privacy:privacy_policy_url": service.privacy_policy,
                "coin:signature_method": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
                "connection_type": "oidc_rp" if service.oidc_enabled else "saml_sp",
                "grants": service.grants.split(",") if service.grants else [],
                "isPublicClient": service.is_public_client,
                "logo:0:url": service.logo,
                "logo:0:width": 480,
                "logo:0:height": 348,
                "NameIDFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
                "name:en": service.name,
                "OrganizationName:en": service.providing_organisation,
                "redirectUrls": service.redirect_urls.split(",") if service.redirect_urls else [],
                "accessTokenValidity": 3600,
                "refreshTokenValidity": 3600,
                "secret": service.oidc_client_secret,
                "url:nl": service.uri_info
            }
        }
    }
    _add_contacts(service, service_template)

    return _replace_none_values(service_template)
