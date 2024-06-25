secret_attributes = ["ldap_password", "hashed_token", "hashed_secret", "scim_bearer_token", "oidc_client_secret"]


class SecretMixin(object):

    def __getattribute__(self, name):
        if name in secret_attributes:
            return None
        return object.__getattribute__(self, name)
