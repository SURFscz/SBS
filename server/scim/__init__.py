SCIM_URL_PREFIX = "/api/scim/v2"

SCIM_USERS = "Users"
SCIM_GROUPS = "Groups"


def external_id_postfix(config=None):
    """Return the @-prefixed domain suffix for SCIM externalId values."""
    if config is None:
        from flask import current_app
        config = current_app.app_config
    scope = config.eppn_scope.strip().lstrip("@")
    return f"@{scope}"


def strip_external_id_postfix(scim_external_id: str, config=None) -> str:
    return scim_external_id.replace(external_id_postfix(config), "")
